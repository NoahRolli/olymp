from pathlib import Path
import os

TRESOR_ROOT = Path(os.getenv("TRESOR_ROOT", "/mnt/tresor"))
DOCKER_SOCKET = os.getenv("DOCKER_SOCKET", "/var/run/docker.sock")
API_TITLE = "Olymp Dashboard API"
API_VERSION = "1.0.0"