from fastapi import APIRouter, Depends
from services.network_service import get_interfaces
from middleware.auth import require_dashboard

router = APIRouter(prefix="/api", tags=["network"])


@router.get("/network", dependencies=[Depends(require_dashboard)])
def network_info():
    return {"interfaces": get_interfaces()}
