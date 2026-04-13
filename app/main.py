from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import API_TITLE, API_VERSION
from routers import system, docker, network, files, auth

app = FastAPI(title=API_TITLE, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.0.10:8000",
        "http://192.168.2.0:8000",
    ],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Tresor-Token"],
    allow_credentials=True,
)

# Auth-Router (OHNE Protection – muss erreichbar sein zum Einloggen)
app.include_router(auth.router)

# Geschützte Router
app.include_router(system.router)
app.include_router(docker.router)
app.include_router(network.router)
app.include_router(files.router)

# Frontend servieren
app.mount("/assets", StaticFiles(directory="/frontend/assets"), name="assets")


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    return FileResponse("/frontend/index.html")
