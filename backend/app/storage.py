from __future__ import annotations

import os
import time
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from .settings import ARTIFACT_TTL_SECONDS, CHART_DIR, JOB_DIR, MAX_UPLOAD_BYTES, UPLOAD_DIR


ALLOWED_UPLOAD_SUFFIXES = {".smi", ".sdf", ".fasta"}


def cleanup_expired_artifacts() -> None:
    cutoff = time.time() - ARTIFACT_TTL_SECONDS
    for directory in (UPLOAD_DIR, CHART_DIR, JOB_DIR):
        directory.mkdir(parents=True, exist_ok=True)
        for path in directory.iterdir():
            try:
                if path.is_file() and path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
            except OSError:
                continue


async def save_upload(upload: UploadFile) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only .smi, .sdf, and .fasta files are supported.",
        )

    token = f"{uuid.uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / token
    size = 0
    try:
        with destination.open("wb") as output:
            while chunk := await upload.read(64 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Uploaded file is too large.",
                    )
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    if size == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    return token


def resolve_upload_token(token: str) -> Path | None:
    if Path(token).name != token:
        return None
    candidate = (UPLOAD_DIR / token).resolve()
    try:
        candidate.relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def chart_path(filename: str) -> Path | None:
    if Path(filename).name != filename or not filename.endswith(".png"):
        return None
    candidate = (CHART_DIR / filename).resolve()
    try:
        candidate.relative_to(CHART_DIR.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None
