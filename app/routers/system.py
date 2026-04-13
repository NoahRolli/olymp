from fastapi import APIRouter, Depends
from services.system_service import get_system_info
from services.inventory_service import get_inventory
from models.schemas import HealthResponse
from config import API_VERSION
from middleware.auth import require_dashboard

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    return {"status": "olymp alive", "version": API_VERSION}


@router.get("/system", dependencies=[Depends(require_dashboard)])
def system_info():
    return get_system_info()


@router.get("/inventory", dependencies=[Depends(require_dashboard)])
def inventory():
    return get_inventory()
