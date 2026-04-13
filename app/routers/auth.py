"""
Olymp Auth Router – Login & Tresor-Entsperrung
================================================
POST /api/auth/login       → Dashboard-Login (Stufe 1)
POST /api/auth/tresor      → Tresor entsperren (Stufe 2)
POST /api/auth/logout      → Logout (beide Sessions)
GET  /api/auth/status      → Aktueller Auth-Status
"""

from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from services.auth_service import (
    login_dashboard,
    unlock_tresor,
    verify_dashboard_token,
    verify_tresor_token,
    get_tresor_remaining_seconds,
    AuthError,
    AccountLockedError,
    InvalidCredentialsError,
)
from middleware.auth import require_dashboard

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- Request/Response Models ---

class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1)


class TresorUnlockRequest(BaseModel):
    password: str = Field(..., min_length=1)


class AuthStatusResponse(BaseModel):
    authenticated: bool
    tresor_unlocked: bool
    tresor_remaining_seconds: Optional[int] = None


class LoginResponse(BaseModel):
    success: bool
    message: str


# --- Cookie-Konfiguration (Bank-Niveau) ---

COOKIE_SETTINGS = {
    "httponly": True,       # Nicht per JavaScript auslesbar (XSS-Schutz)
    "samesite": "strict",   # Kein Cross-Site (CSRF-Schutz)
    "secure": False,        # False weil HTTP im LAN (kein HTTPS nötig hinter VPN)
    "path": "/",
}


def _get_client_ip(request: Request) -> str:
    """Extrahiert die Client-IP für Rate Limiting."""
    # X-Forwarded-For für Reverse-Proxy, sonst direkte IP
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# --- Endpoints ---

@router.post("/login", response_model=LoginResponse)
async def api_login(body: LoginRequest, request: Request, response: Response):
    """
    Dashboard-Login (Stufe 1).
    Setzt httponly Cookie mit JWT-Token.
    """
    client_ip = _get_client_ip(request)

    try:
        token = login_dashboard(body.password, client_ip)

        # Token als httponly Cookie setzen (nicht per JS auslesbar)
        response.set_cookie(
            key="olymp_token",
            value=token,
            max_age=8 * 60 * 60,  # 8 Stunden
            **COOKIE_SETTINGS,
        )

        return LoginResponse(success=True, message="Willkommen auf dem Olymp.")

    except AccountLockedError as e:
        raise HTTPException(
            status_code=429,
            detail=f"Zu viele Fehlversuche. Gesperrt für {e.remaining_minutes} Minuten.",
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
        )
    except AuthError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.post("/tresor", response_model=LoginResponse, dependencies=[Depends(require_dashboard)])
async def api_unlock_tresor(body: TresorUnlockRequest, request: Request, response: Response):
    """
    Tresor-Entsperrung (Stufe 2).
    Erfordert aktive Dashboard-Session.
    Setzt separaten httponly Cookie (15 Min Timeout).
    """
    client_ip = _get_client_ip(request)

    try:
        token = unlock_tresor(body.password, client_ip)

        response.set_cookie(
            key="olymp_tresor",
            value=token,
            max_age=15 * 60,  # 15 Minuten
            **COOKIE_SETTINGS,
        )

        return LoginResponse(success=True, message="Tresor entsperrt.")

    except AccountLockedError as e:
        raise HTTPException(
            status_code=429,
            detail=f"Tresor gesperrt für {e.remaining_minutes} Minuten.",
        )
    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
        )
    except AuthError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.post("/logout")
async def api_logout(response: Response):
    """Logout: Löscht beide Session-Cookies."""
    response.delete_cookie("olymp_token", path="/")
    response.delete_cookie("olymp_tresor", path="/")
    return {"success": True, "message": "Abgemeldet."}


@router.get("/status", response_model=AuthStatusResponse)
async def api_auth_status(request: Request):
    """
    Gibt den aktuellen Auth-Status zurück.
    Wird vom Frontend gepollt um Login-State zu prüfen.
    """
    # Dashboard-Status
    dashboard_token = request.cookies.get("olymp_token")
    authenticated = False
    if dashboard_token:
        try:
            verify_dashboard_token(dashboard_token)
            authenticated = True
        except AuthError:
            pass

    # Tresor-Status
    tresor_token = request.cookies.get("olymp_tresor")
    tresor_unlocked = False
    tresor_remaining = None
    if tresor_token and authenticated:
        try:
            verify_tresor_token(tresor_token)
            tresor_unlocked = True
            tresor_remaining = get_tresor_remaining_seconds(tresor_token)
        except AuthError:
            pass

    return AuthStatusResponse(
        authenticated=authenticated,
        tresor_unlocked=tresor_unlocked,
        tresor_remaining_seconds=tresor_remaining,
    )
