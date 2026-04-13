"""
Olymp Auth Service – Kern-Authentifizierung
============================================
- bcrypt Passwort-Verifikation
- JWT Token-Management (Access + Tresor-Tokens)
- Rate Limiting (Brute-Force-Schutz auf App-Level)
- Tresor-Session mit 15-Min-Timeout
"""

import json
import time
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import bcrypt
import jwt

# --- Konfiguration ---
AUTH_FILE = Path("/etc/olymp/auth.json")

# Token-Laufzeiten
DASHBOARD_TOKEN_HOURS = 8       # Dashboard-Session: 8 Stunden
TRESOR_TOKEN_MINUTES = 15       # Tresor-Session: 15 Minuten (Bank-Standard)

# Rate Limiting (in-memory, resets bei Container-Restart)
_failed_attempts: dict[str, list[float]] = {}


class AuthError(Exception):
    """Basis-Exception für Auth-Fehler."""
    pass


class AccountLockedError(AuthError):
    """Account ist temporär gesperrt."""
    def __init__(self, remaining_minutes: int):
        self.remaining_minutes = remaining_minutes
        super().__init__(f"Account gesperrt für {remaining_minutes} Minuten")


class InvalidCredentialsError(AuthError):
    """Falsches Passwort."""
    pass


def _load_auth_config() -> dict:
    """Lädt die Auth-Konfiguration aus /etc/olymp/auth.json."""
    if not AUTH_FILE.exists():
        raise AuthError(
            "Auth nicht konfiguriert. Bitte 'sudo python3 scripts/setup_auth.py' ausführen."
        )
    with open(AUTH_FILE, "r") as f:
        return json.load(f)


def _check_rate_limit(client_ip: str) -> None:
    """
    Prüft ob eine IP zu viele Fehlversuche hat.
    Wirft AccountLockedError wenn gesperrt.
    """
    config = _load_auth_config()
    max_attempts = config.get("rate_limit", {}).get("max_attempts", 5)
    lockout_minutes = config.get("rate_limit", {}).get("lockout_minutes", 15)

    if client_ip not in _failed_attempts:
        return

    # Alte Einträge aufräumen (älter als Lockout-Zeitraum)
    cutoff = time.time() - (lockout_minutes * 60)
    _failed_attempts[client_ip] = [
        t for t in _failed_attempts[client_ip] if t > cutoff
    ]

    if len(_failed_attempts[client_ip]) >= max_attempts:
        # Berechne verbleibende Sperrzeit
        oldest = min(_failed_attempts[client_ip])
        unlock_time = oldest + (lockout_minutes * 60)
        remaining = int((unlock_time - time.time()) / 60) + 1
        raise AccountLockedError(remaining)


def _record_failed_attempt(client_ip: str) -> None:
    """Zeichnet einen fehlgeschlagenen Login-Versuch auf."""
    if client_ip not in _failed_attempts:
        _failed_attempts[client_ip] = []
    _failed_attempts[client_ip].append(time.time())


def _clear_failed_attempts(client_ip: str) -> None:
    """Löscht Fehlversuche nach erfolgreichem Login."""
    _failed_attempts.pop(client_ip, None)


def _verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vergleicht Klartext-Passwort mit bcrypt-Hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def _create_token(payload: dict, expires_delta: timedelta) -> str:
    """Erstellt einen JWT-Token."""
    config = _load_auth_config()
    expire = datetime.now(timezone.utc) + expires_delta
    token_data = {
        **payload,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": secrets.token_hex(16),  # Unique Token ID
    }
    return jwt.encode(token_data, config["jwt_secret"], algorithm="HS256")


def _decode_token(token: str) -> dict:
    """Dekodiert und validiert einen JWT-Token."""
    config = _load_auth_config()
    try:
        return jwt.decode(token, config["jwt_secret"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise AuthError("Session abgelaufen. Bitte erneut einloggen.")
    except jwt.InvalidTokenError:
        raise AuthError("Ungültiger Token.")


# --- Öffentliche API ---

def login_dashboard(password: str, client_ip: str) -> str:
    """
    Dashboard-Login (Stufe 1).
    Returns: JWT Access-Token
    Raises: AccountLockedError, InvalidCredentialsError
    """
    _check_rate_limit(client_ip)

    config = _load_auth_config()
    stored_hash = config["dashboard"]["password_hash"]

    if not _verify_password(password, stored_hash):
        _record_failed_attempt(client_ip)
        remaining = config["rate_limit"]["max_attempts"] - len(
            _failed_attempts.get(client_ip, [])
        )
        raise InvalidCredentialsError(
            f"Falsches Passwort. Noch {max(remaining, 0)} Versuche."
        )

    _clear_failed_attempts(client_ip)

    return _create_token(
        {"type": "dashboard", "scope": "dashboard"},
        timedelta(hours=DASHBOARD_TOKEN_HOURS),
    )


def unlock_tresor(password: str, client_ip: str) -> str:
    """
    Tresor-Entsperrung (Stufe 2).
    Erfordert bereits authentifizierte Dashboard-Session.
    Returns: JWT Tresor-Token (15 Min)
    Raises: AccountLockedError, InvalidCredentialsError
    """
    _check_rate_limit(client_ip)

    config = _load_auth_config()
    stored_hash = config["tresor"]["password_hash"]

    if not _verify_password(password, stored_hash):
        _record_failed_attempt(client_ip)
        remaining = config["rate_limit"]["max_attempts"] - len(
            _failed_attempts.get(client_ip, [])
        )
        raise InvalidCredentialsError(
            f"Falsches Tresor-Passwort. Noch {max(remaining, 0)} Versuche."
        )

    _clear_failed_attempts(client_ip)

    timeout = config.get("tresor", {}).get("session_timeout_minutes", TRESOR_TOKEN_MINUTES)

    return _create_token(
        {"type": "tresor", "scope": "tresor"},
        timedelta(minutes=timeout),
    )


def verify_dashboard_token(token: str) -> dict:
    """Prüft ob ein Dashboard-Token gültig ist."""
    payload = _decode_token(token)
    if payload.get("type") != "dashboard":
        raise AuthError("Kein gültiger Dashboard-Token.")
    return payload


def verify_tresor_token(token: str) -> dict:
    """Prüft ob ein Tresor-Token gültig ist."""
    payload = _decode_token(token)
    if payload.get("type") != "tresor":
        raise AuthError("Kein gültiger Tresor-Token.")
    return payload


def get_tresor_remaining_seconds(token: str) -> int:
    """Gibt die verbleibenden Sekunden der Tresor-Session zurück."""
    payload = _decode_token(token)
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    remaining = (exp - datetime.now(timezone.utc)).total_seconds()
    return max(int(remaining), 0)
