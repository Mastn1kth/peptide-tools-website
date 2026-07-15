from __future__ import annotations

import os
import tempfile
from pathlib import Path


SERVICE_VERSION = "1.0.0"
UPSTREAM_COMMIT = os.getenv(
    "PEPTIDE_TOOLS_COMMIT", "e639de3c08ee701a1ad9c25f70c6d26a7589af8c"
)
DATA_DIR = Path(
    os.getenv("PEPTIDE_TOOLS_DATA_DIR", str(Path(tempfile.gettempdir()) / "peptide-tools"))
).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
CHART_DIR = DATA_DIR / "charts"
JOB_DIR = DATA_DIR / "jobs"
MAX_INPUT_CHARS = int(os.getenv("MAX_INPUT_CHARS", "20000"))
MAX_FASTA_RESIDUES = int(os.getenv("MAX_FASTA_RESIDUES", "200"))
MAX_SMILES_CHARS = int(os.getenv("MAX_SMILES_CHARS", "12000"))
MAX_STRUCTURE_ATOMS = int(os.getenv("MAX_STRUCTURE_ATOMS", "3000"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
ARTIFACT_TTL_SECONDS = int(os.getenv("ARTIFACT_TTL_SECONDS", "3600"))
CALCULATION_TIMEOUT_SECONDS = int(os.getenv("CALCULATION_TIMEOUT_SECONDS", "60"))
CALCULATION_CPU_SECONDS = int(os.getenv("CALCULATION_CPU_SECONDS", "45"))
CALCULATION_MEMORY_MB = int(os.getenv("CALCULATION_MEMORY_MB", "1024"))


def allowed_origins() -> list[str]:
    raw = os.getenv(
        "ALLOWED_ORIGINS",
        "https://peptide-tools.com,https://www.peptide-tools.com,"
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


def ensure_data_directories() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    JOB_DIR.mkdir(parents=True, exist_ok=True)
