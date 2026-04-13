#!/usr/bin/env python3
"""
Olymp Auth Setup – Passwörter sicher setzen
==========================================
Dieses Script läuft EINMALIG auf dem Server (Olymp-Agent).
Es fragt interaktiv nach Passwörtern und speichert NUR die bcrypt-Hashes.
Klartext-Passwörter werden NIEMALS auf Disk geschrieben.

Nutzung:
    ssh olymp
    cd ~/olymp-dashboard
    python3 scripts/setup_auth.py

Sicherheitsmerkmale:
    - Passwort-Eingabe über getpass (kein Echo, nicht in Shell-History)
    - bcrypt mit Cost-Factor 12 (Bank-Standard)
    - Hash-Datei mit Permissions 600 (nur Owner lesen/schreiben)
    - Verzeichnis mit Permissions 700
"""

import json
import os
import sys
import getpass
import hashlib
import secrets
from pathlib import Path

# --- Dependency Check ---
try:
    import bcrypt
except ImportError:
    print("\n[!] bcrypt ist nicht installiert.")
    print("    Installiere es mit: pip install bcrypt --break-system-packages")
    sys.exit(1)

# --- Konfiguration ---
AUTH_DIR = Path("/etc/olymp")
AUTH_FILE = AUTH_DIR / "auth.json"
BACKUP_FILE = AUTH_DIR / "auth.json.bak"

# Passwort-Anforderungen
MIN_LENGTH = 12
BCRYPT_ROUNDS = 12  # 2^12 = 4096 Iterationen, ~250ms pro Hash


def validate_password(password: str, name: str) -> bool:
    """Prüft Passwort-Stärke (Bank/Militär-Niveau)."""
    errors = []

    if len(password) < MIN_LENGTH:
        errors.append(f"  - Mindestens {MIN_LENGTH} Zeichen (aktuell: {len(password)})")

    if not any(c.isupper() for c in password):
        errors.append("  - Mindestens ein Grossbuchstabe")

    if not any(c.islower() for c in password):
        errors.append("  - Mindestens ein Kleinbuchstabe")

    if not any(c.isdigit() for c in password):
        errors.append("  - Mindestens eine Zahl")

    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("  - Mindestens ein Sonderzeichen (!@#$%^&*...)")

    if errors:
        print(f"\n[✗] {name} erfüllt die Anforderungen nicht:")
        for e in errors:
            print(e)
        return False

    return True


def hash_password(password: str) -> str:
    """Hasht ein Passwort mit bcrypt (Cost-Factor 12)."""
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def prompt_password(name: str) -> str:
    """Fragt sicher nach einem Passwort mit Bestätigung."""
    while True:
        print(f"\n{'='*50}")
        print(f"  {name}")
        print(f"{'='*50}")
        print(f"  Anforderungen: min. {MIN_LENGTH} Zeichen,")
        print(f"  Gross-/Kleinbuchstaben, Zahl, Sonderzeichen")
        print()

        password = getpass.getpass(f"  {name} eingeben: ")

        if not validate_password(password, name):
            print("\n  Bitte erneut versuchen.")
            continue

        confirm = getpass.getpass(f"  {name} bestätigen: ")

        if password != confirm:
            print("\n[✗] Passwörter stimmen nicht überein. Erneut versuchen.")
            continue

        print(f"\n[✓] {name} akzeptiert.")
        return password


def main():
    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║         OLYMP AUTH SETUP – SICHER                ║")
    print("║                                                  ║")
    print("║  Passwörter werden NIEMALS im Klartext           ║")
    print("║  gespeichert. Nur bcrypt-Hashes auf Disk.        ║")
    print("║                                                  ║")
    print("║  Stufe 1: Dashboard-Login                        ║")
    print("║  Stufe 2: Tresor-Zugang (separates Passwort)     ║")
    print("╚══════════════════════════════════════════════════╝")

    # Prüfe ob schon Konfiguration existiert
    if AUTH_FILE.exists():
        print(f"\n[!] {AUTH_FILE} existiert bereits.")
        response = input("    Überschreiben? (ja/nein): ").strip().lower()
        if response != "ja":
            print("    Abgebrochen.")
            sys.exit(0)
        # Backup erstellen
        import shutil
        shutil.copy2(AUTH_FILE, BACKUP_FILE)
        os.chmod(str(BACKUP_FILE), 0o600)
        print(f"    Backup erstellt: {BACKUP_FILE}")

    # --- Passwörter abfragen ---
    dashboard_pw = prompt_password("DASHBOARD-PASSWORT (Stufe 1)")
    tresor_pw = prompt_password("TRESOR-PASSWORT (Stufe 2)")

    # Sicherstellen dass die Passwörter unterschiedlich sind
    if dashboard_pw == tresor_pw:
        print("\n[✗] Dashboard- und Tresor-Passwort müssen UNTERSCHIEDLICH sein!")
        print("    (Zwei-Stufen-Sicherheit erfordert zwei verschiedene Passwörter)")
        sys.exit(1)

    # --- Hashes generieren ---
    print("\n[...] Generiere bcrypt-Hashes (das dauert ein paar Sekunden)...")

    # JWT Secret generieren (256-bit, kryptographisch sicher)
    jwt_secret = secrets.token_hex(32)

    auth_data = {
        "_comment": "OLYMP AUTH – NUR HASHES, KEIN KLARTEXT. NICHT EDITIEREN.",
        "version": 1,
        "bcrypt_rounds": BCRYPT_ROUNDS,
        "dashboard": {
            "password_hash": hash_password(dashboard_pw)
        },
        "tresor": {
            "password_hash": hash_password(tresor_pw),
            "session_timeout_minutes": 15
        },
        "jwt_secret": jwt_secret,
        "rate_limit": {
            "max_attempts": 5,
            "lockout_minutes": 15
        }
    }

    # --- Sicher speichern ---
    print("[...] Speichere Konfiguration...")

    # Verzeichnis erstellen mit restriktiven Rechten
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(str(AUTH_DIR), 0o700)

    # Datei schreiben
    with open(AUTH_FILE, "w") as f:
        json.dump(auth_data, f, indent=2)

    # Restriktive Permissions setzen (nur Owner lesen/schreiben)
    os.chmod(str(AUTH_FILE), 0o600)

    # --- Passwörter aus dem Speicher löschen ---
    dashboard_pw = None
    tresor_pw = None

    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║  [✓] SETUP ABGESCHLOSSEN                        ║")
    print("║                                                  ║")
    print(f"║  Hash-Datei: {str(AUTH_FILE):<36} ║")
    print(f"║  Permissions: 600 (nur Owner)                    ║")
    print(f"║  Verzeichnis: 700 (nur Owner)                    ║")
    print("║                                                  ║")
    print("║  Nächster Schritt:                                ║")
    print("║  Dashboard neu bauen:                             ║")
    print("║  cd ~/olymp-dashboard                             ║")
    print("║  docker compose up -d --build                     ║")
    print("╚══════════════════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    # Muss als root laufen (für /etc/olymp)
    if os.geteuid() != 0:
        print("[!] Dieses Script muss als root laufen:")
        print("    sudo python3 scripts/setup_auth.py")
        sys.exit(1)

    main()
