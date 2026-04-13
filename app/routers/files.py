from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import FileResponse
from services.file_service import (
    list_directory, create_folder, move_item, delete_item, save_upload,
    rename_item, get_file_path, get_file_preview
)
from models.schemas import MoveRequest, FolderRequest
from middleware.auth import require_tresor
from pydantic import BaseModel

router = APIRouter(prefix="/api/files", tags=["files"])


class RenameRequest(BaseModel):
    path: str
    new_name: str


@router.get("", dependencies=[Depends(require_tresor)])
def list_files(path: str = ""):
    try:
        return list_directory(path)
    except (FileNotFoundError, NotADirectoryError) as e:
        return {"error": str(e)}


@router.get("/download", dependencies=[Depends(require_tresor)])
def download_file(path: str):
    try:
        file_path = get_file_path(path)
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/octet-stream",
        )
    except (FileNotFoundError, ValueError) as e:
        return {"error": str(e)}


@router.get("/preview", dependencies=[Depends(require_tresor)])
def preview_file(path: str):
    try:
        preview = get_file_preview(path)
        if preview["type"] == "image":
            file_path = get_file_path(path)
            return FileResponse(path=str(file_path))
        return preview
    except (FileNotFoundError, ValueError) as e:
        return {"error": str(e)}


@router.post("/mkdir", dependencies=[Depends(require_tresor)])
def mkdir(req: FolderRequest):
    try:
        return create_folder(req.path)
    except FileExistsError as e:
        return {"error": str(e)}


@router.post("/move", dependencies=[Depends(require_tresor)])
def move(req: MoveRequest):
    try:
        return move_item(req.source, req.destination)
    except (FileNotFoundError, FileExistsError) as e:
        return {"error": str(e)}


@router.post("/rename", dependencies=[Depends(require_tresor)])
def rename(req: RenameRequest):
    try:
        return rename_item(req.path, req.new_name)
    except (FileNotFoundError, FileExistsError, ValueError) as e:
        return {"error": str(e)}


@router.delete("", dependencies=[Depends(require_tresor)])
def delete(path: str):
    try:
        return delete_item(path)
    except FileNotFoundError as e:
        return {"error": str(e)}


@router.post("/upload", dependencies=[Depends(require_tresor)])
async def upload(file: UploadFile = File(...), path: str = ""):
    content = await file.read()
    return save_upload(file.filename, content, path)
