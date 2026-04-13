from fastapi import APIRouter, Depends
from services.docker_service import get_containers
from config import DOCKER_SOCKET
from middleware.auth import require_dashboard

router = APIRouter(prefix="/api", tags=["docker"])


@router.get("/docker", dependencies=[Depends(require_dashboard)])
def docker_info():
    try:
        return {"containers": get_containers(DOCKER_SOCKET)}
    except Exception as e:
        return {"error": str(e)}
