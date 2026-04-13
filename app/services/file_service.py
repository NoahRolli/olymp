from pathlib import Path
import shutil
from config import TRESOR_ROOT


def safe_path(rel: str) -> Path:
    """Verhindert Path-Traversal ausserhalb des Tresors"""
    clean = Path(rel.lstrip("/"))
    full = (TRESOR_ROOT / clean).resolve()
    if not str(full).startswith(str(TRESOR_ROOT.resolve())):
        raise ValueError("Zugriff ausserhalb des Tresors nicht erlaubt")
    return full


def list_directory(path: str = "") -> dict:
    target = safe_path(path)
    if not target.exists():
        raise FileNotFoundError("Pfad nicht gefunden")
    if not target.is_dir():
        raise NotADirectoryError("Kein Verzeichnis")

    items = []
    for item in sorted(target.iterdir()):
        if item.name.startswith(".") or item.name == "lost+found":
            continue
        stat = item.stat()
        items.append({
            "name": item.name,
            "type": "folder" if item.is_dir() else "file",
            "size": stat.st_size if item.is_file() else None,
            "modified": stat.st_mtime,
            "path": str(item.relative_to(TRESOR_ROOT)),
        })
    return {
        "current_path": path or "/",
        "items": items,
    }


def create_folder(path: str) -> dict:
    target = safe_path(path)
    if target.exists():
        raise FileExistsError("Ordner existiert bereits")
    target.mkdir(parents=True, exist_ok=False)
    return {"success": True, "path": path}


def move_item(source: str, destination: str) -> dict:
    src = safe_path(source)
    dst = safe_path(destination)
    if not src.exists():
        raise FileNotFoundError("Quelle nicht gefunden")
    if dst.exists() and dst.is_file():
        raise FileExistsError("Ziel existiert bereits")
    if dst.is_dir():
        dst = dst / src.name
    shutil.move(str(src), str(dst))
    return {"success": True}


def delete_item(path: str) -> dict:
    target = safe_path(path)
    if not target.exists():
        raise FileNotFoundError("Nicht gefunden")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return {"success": True}


def save_upload(filename: str, content: bytes, path: str = "") -> dict:
    target_dir = safe_path(path)
    if not target_dir.exists():
        target_dir.mkdir(parents=True)
    file_path = target_dir / filename
    with open(file_path, "wb") as f:
        f.write(content)
    return {"success": True, "name": filename}


def rename_item(path: str, new_name: str) -> dict:
    target = safe_path(path)
    if not target.exists():
        raise FileNotFoundError("Nicht gefunden")
    if "/" in new_name or "\\" in new_name:
        raise ValueError("Ungültiger Name")
    new_path = target.parent / new_name
    if new_path.exists():
        raise FileExistsError("Name existiert bereits")
    target.rename(new_path)
    return {"success": True, "new_name": new_name}


def get_file_path(path: str) -> Path:
    """Gibt den sicheren Pfad zu einer Datei zurück (für Download)."""
    target = safe_path(path)
    if not target.exists():
        raise FileNotFoundError("Nicht gefunden")
    if not target.is_file():
        raise ValueError("Kein Download für Ordner")
    return target


def get_file_preview(path: str) -> dict:
    """Gibt Vorschau-Daten für eine Datei zurück."""
    target = safe_path(path)
    if not target.exists():
        raise FileNotFoundError("Nicht gefunden")
    if not target.is_file():
        raise ValueError("Kein Vorschau für Ordner")

    suffix = target.suffix.lower()
    name = target.name

    # Bilder
    image_types = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"}
    if suffix in image_types:
        return {"type": "image", "name": name, "path": path}

    # Text-Dateien
    text_types = {".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".tsx",
                  ".html", ".css", ".yml", ".yaml", ".toml", ".cfg", ".conf",
                  ".sh", ".bash", ".log", ".env", ".xml", ".sql", ".ini"}
    if suffix in text_types:
        try:
            content = target.read_text(encoding="utf-8", errors="replace")
            # Max 50KB für Vorschau
            if len(content) > 50000:
                content = content[:50000] + "\n\n--- (abgeschnitten, Datei zu gross) ---"
            return {"type": "text", "name": name, "content": content}
        except Exception:
            return {"type": "unknown", "name": name}

    return {"type": "unknown", "name": name}
