from __future__ import annotations

import json
import multiprocessing
import os
import uuid
from pathlib import Path

from .calculator import CalculationError, calculate
from .models import SubmitRequest
from .settings import (
    CALCULATION_CPU_SECONDS,
    CALCULATION_MEMORY_MB,
    CALCULATION_TIMEOUT_SECONDS,
    JOB_DIR,
)


def _apply_process_limits() -> None:
    if os.name != "posix":
        return
    import resource

    memory_bytes = CALCULATION_MEMORY_MB * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
    resource.setrlimit(
        resource.RLIMIT_CPU, (CALCULATION_CPU_SECONDS, CALCULATION_CPU_SECONDS + 1)
    )


def _calculation_child(payload: dict, output_path: str) -> None:
    _apply_process_limits()
    destination = Path(output_path)
    temporary = destination.with_suffix(".tmp")
    try:
        result = calculate(SubmitRequest.model_validate(payload))
        document = {"ok": True, "result": result}
    except CalculationError as exc:
        document = {"ok": False, "error": str(exc)}
    except BaseException:
        document = {"ok": False, "error": "The calculation engine stopped unexpectedly."}
    temporary.write_text(json.dumps(document, allow_nan=False), encoding="utf-8")
    temporary.replace(destination)


def calculate_isolated(payload: dict) -> dict:
    JOB_DIR.mkdir(parents=True, exist_ok=True)
    output_path = JOB_DIR / f"{uuid.uuid4().hex}.json"
    context = multiprocessing.get_context("spawn")
    process = context.Process(
        target=_calculation_child, args=(payload, str(output_path)), daemon=True
    )
    process.start()
    process.join(CALCULATION_TIMEOUT_SECONDS)

    if process.is_alive():
        process.terminate()
        process.join(5)
        if process.is_alive():
            process.kill()
            process.join(2)
        output_path.unlink(missing_ok=True)
        raise CalculationError("The calculation exceeded the allowed execution time.")

    try:
        if process.exitcode != 0 or not output_path.is_file():
            raise CalculationError("The calculation engine stopped unexpectedly.")
        document = json.loads(output_path.read_text(encoding="utf-8"))
    finally:
        output_path.unlink(missing_ok=True)

    if not document.get("ok"):
        raise CalculationError(document.get("error") or "The calculation failed.")
    return document["result"]
