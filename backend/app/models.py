from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .settings import MAX_INPUT_CHARS


class SubmitRequest(BaseModel):
    input: str = Field(min_length=1, max_length=MAX_INPUT_CHARS)
    input_type: Literal["auto", "fasta", "smiles", "file"] = "auto"
    print_fragment_pkas: bool = True
    generate_fragment_images: bool = False
    ionizable_cterm: bool = False
    ionizable_nterm: bool = True
    no_free_cys_thiols: bool = True
    n_disulfide_bonds: str = Field(default="max", max_length=16)

    @field_validator("input")
    @classmethod
    def strip_input(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Input cannot be empty.")
        return value

    @field_validator("n_disulfide_bonds")
    @classmethod
    def validate_disulfide_bonds(cls, value: str) -> str:
        value = value.strip().lower()
        if value == "max":
            return value
        try:
            number = int(value)
        except ValueError as exc:
            raise ValueError("Use 'max' or a non-negative integer.") from exc
        if number < 0 or number > 10000:
            raise ValueError("Disulfide bond count is outside the accepted range.")
        return str(number)


class HealthResponse(BaseModel):
    status: str
    service_version: str
    upstream_commit: str
