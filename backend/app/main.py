from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from .body_limit import BodySizeLimitMiddleware
from .calculator import CalculationError
from .models import HealthResponse, SubmitRequest
from .settings import (
    MAX_INPUT_CHARS,
    MAX_UPLOAD_BYTES,
    SERVICE_VERSION,
    UPSTREAM_COMMIT,
    allowed_origins,
    ensure_data_directories,
)
from .storage import chart_path, cleanup_expired_artifacts, save_upload
from .worker import calculate_isolated


logger = logging.getLogger("peptide-tools-api")
calculation_slot = asyncio.Semaphore(1)


@asynccontextmanager
async def lifespan(application: FastAPI):
    del application
    ensure_data_directories()
    cleanup_expired_artifacts()
    yield


app = FastAPI(
    title="Peptide Tools API",
    version=SERVICE_VERSION,
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.add_middleware(
    BodySizeLimitMiddleware,
    limits={
        "/upload": MAX_UPLOAD_BYTES + 128 * 1024,
        "/submitJob": MAX_INPUT_CHARS * 4 + 4096,
    },
)


@app.middleware("http")
async def response_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith(("/submitJob", "/upload")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok", service_version=SERVICE_VERSION, upstream_commit=UPSTREAM_COMMIT
    )


@app.get("/version")
async def version() -> dict[str, str]:
    return {"version": SERVICE_VERSION, "upstream_commit": UPSTREAM_COMMIT}


@app.post("/upload")
async def upload(
    request: Request,
    uploads: list[UploadFile] = File(alias="uploads[]"),
) -> list[dict[str, str]]:
    del request
    cleanup_expired_artifacts()
    if len(uploads) != 1:
        raise HTTPException(status_code=422, detail="Upload exactly one file.")
    token = await save_upload(uploads[0])
    return [{"filename": token}]


@app.post("/submitJob")
async def submit_job(request: Request, payload: SubmitRequest) -> JSONResponse:
    del request
    cleanup_expired_artifacts()
    acquired = False
    try:
        try:
            await asyncio.wait_for(calculation_slot.acquire(), timeout=0.1)
            acquired = True
        except TimeoutError as exc:
            raise HTTPException(
                status_code=503,
                detail="The calculation worker is busy. Retry in a few seconds.",
                headers={"Retry-After": "3"},
            ) from exc
        result = await asyncio.to_thread(calculate_isolated, payload.model_dump())
        return JSONResponse({"result": result})
    except CalculationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    finally:
        if acquired:
            calculation_slot.release()


@app.get("/image/{filename}", response_class=FileResponse)
async def image(filename: str) -> FileResponse:
    path = chart_path(filename)
    if path is None:
        raise HTTPException(status_code=404, detail="Chart not found or expired.")
    return FileResponse(
        path,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600"},
    )
