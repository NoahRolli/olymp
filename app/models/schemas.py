from pydantic import BaseModel


class MoveRequest(BaseModel):
    source: str
    destination: str


class FolderRequest(BaseModel):
    path: str


class HealthResponse(BaseModel):
    status: str
    version: str