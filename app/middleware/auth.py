"""
Olymp Auth Middleware – FastAPI Dependencies
=============================================
Schützt Routen mit JWT-Token-Verifikation.

Nutzung in Routen:
    from app.middleware.auth import require_dashboard, require_tresor

    @router.get("/api/system", dependencies=[Depends(require_dashboard)])
    async def get_system(): ...

    @router.get("/api/files", dependencies=[Depends(require_tresor)])
    async def get_files(): ...
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from services.auth_service import (
    verify_dashboard_token,
    verify_tresor_token,
    AuthError,
)

# Bearer Token aus Authorization Header
_bearer_scheme = HTTPBearer(auto_error=False)


def _get_token_from_request(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """
    Extrahiert Token aus:
    1. Authorization: Bearer <token> Header
    2. Cookie: olymp_token=<token>
    Priorität: Header > Cookie
    """
    # 1. Authorization Header
    if credentials and credentials.credentials:
        return credentials.credentials

    # 2. Cookie
    token = request.cookies.get("olymp_token")
    if token:
        return token

    return None


def _get_tresor_token_from_request(request: Request) -> Optional[str]:
    """
    Extrahiert Tresor-Token aus:
    1. Authorization: Bearer <token> Header (mit X-Token-Type: tresor)
    2. Cookie: olymp_tresor=<token>
    """
    # 1. Custom Header
    tresor_token = request.headers.get("X-Tresor-Token")
    if tresor_token:
        return tresor_token

    # 2. Cookie
    token = request.cookies.get("olymp_tresor")
    if token:
        return token

    return None


async def require_dashboard(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> dict:
    """
    Dependency: Erfordert gültigen Dashboard-Login.
    Schützt alle Dashboard-Routen (System, Docker, Network).
    """
    token = _get_token_from_request(request, credentials)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Nicht authentifiziert. Bitte einloggen.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = verify_dashboard_token(token)
        return payload
    except AuthError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_tresor(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> dict:
    """
    Dependency: Erfordert Dashboard-Login UND Tresor-Entsperrung.
    Schützt alle Tresor/File-Manager-Routen.
    Zweistufig: Erst Dashboard-Token prüfen, dann Tresor-Token.
    """
    # Stufe 1: Dashboard muss aktiv sein
    dashboard_token = _get_token_from_request(request, credentials)
    if not dashboard_token:
        raise HTTPException(
            status_code=401,
            detail="Nicht authentifiziert.",
        )

    try:
        verify_dashboard_token(dashboard_token)
    except AuthError:
        raise HTTPException(
            status_code=401,
            detail="Dashboard-Session abgelaufen.",
        )

    # Stufe 2: Tresor muss entsperrt sein
    tresor_token = _get_tresor_token_from_request(request)
    if not tresor_token:
        raise HTTPException(
            status_code=403,
            detail="Tresor ist gesperrt. Bitte Tresor-Passwort eingeben.",
        )

    try:
        payload = verify_tresor_token(tresor_token)
        return payload
    except AuthError as e:
        raise HTTPException(
            status_code=403,
            detail=f"Tresor-Zugang abgelaufen: {str(e)}",
        )
