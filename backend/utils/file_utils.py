from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Tuple

from fastapi import UploadFile, HTTPException, status

UPLOAD_ROOT = Path(os.getenv("SAMAAN_UPLOADS_DIR", os.getenv("SAMAAN_UPLOAD_DIR", "/data/uploads")))


def ensure_upload_root() -> Path:
    for candidate in [UPLOAD_ROOT, Path("/tmp/samaan-uploads"), Path(__file__).resolve().parents[1] / "data" / "uploads"]:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate
        except PermissionError:
            continue
    raise PermissionError("Unable to create an upload directory")


def save_uploaded_file(file: UploadFile) -> Tuple[str, str, str]:
    root = ensure_upload_root()
    suffix = Path(file.filename or "").suffix.lower()
    if not suffix:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must have an extension")

    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = root / filename
    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    dest.write_bytes(contents)

    content_type = file.content_type or "application/octet-stream"
    file_type = "video" if content_type.startswith("video") else "photo"
    return str(dest), file_type, file.filename or filename


def read_file_bytes(path: str) -> bytes:
    return Path(path).read_bytes()
