from __future__ import annotations

import copy
import math
import uuid
from argparse import Namespace
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")

from pichemist.api import pichemist_from_dict
from peptools.io import generate_input, generate_parameter_set
from peptools.io.fasta import configure_fasta_input
from peptools.io.params import IOParameters
from peptools.io.structure import configure_smi_input
from peptools.wrapper.adapters import modify_fasta_according_to_cys_keys_mec
from peptools.wrapper.adapters import modify_fasta_according_to_cys_keys_pichemist
from peptools.wrapper.descriptors import calculate_descriptors
from peptools.wrapper.ec import calculate_extinction_coefficient
from peptools.wrapper.liabilities import calculate_liabilities

from .models import SubmitRequest
from .settings import CHART_DIR, MAX_FASTA_RESIDUES, MAX_SMILES_CHARS, MAX_STRUCTURE_ATOMS
from .storage import resolve_upload_token


class CalculationError(Exception):
    """A safe, user-facing calculation error."""


FASTA_ALPHABET = frozenset("ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy")


def _fasta_sequence(value: str) -> str:
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    if not lines:
        raise CalculationError("The FASTA sequence is empty.")
    headers = [line for line in lines if line.startswith((">", ";"))]
    if len(headers) > 1:
        raise CalculationError("Exactly one FASTA record is accepted per calculation.")
    sequence = "".join(line for line in lines if not line.startswith((">", ";")))
    if not sequence or any(char not in FASTA_ALPHABET for char in sequence):
        raise CalculationError("The FASTA sequence contains unsupported residue symbols.")
    if len(sequence) > MAX_FASTA_RESIDUES:
        raise CalculationError(
            f"FASTA input is limited to {MAX_FASTA_RESIDUES} residues per calculation."
        )
    return sequence


def _prepare_input(request: SubmitRequest) -> tuple[dict, IOParameters]:
    input_value = request.input.replace("ENDOFLINE", "\n").strip()
    uploaded_path = resolve_upload_token(input_value)
    if uploaded_path is not None:
        molecules, io_params = generate_input(uploaded_path.as_posix())
    elif request.input_type == "file":
        raise CalculationError("The uploaded file reference is invalid or expired.")
    else:
        io_params = IOParameters()
        input_type = request.input_type
        compact = "".join(input_value.split())
        if input_type == "auto":
            first_line = next(
                (line.strip() for line in input_value.splitlines() if line.strip()), ""
            )
            looks_like_fasta = first_line.startswith((">", ";")) or (
                compact and all(char in FASTA_ALPHABET for char in compact)
            )
            input_type = "fasta" if looks_like_fasta else "smiles"
        if input_type == "fasta":
            molecules = configure_fasta_input(_fasta_sequence(input_value), io_params)
        elif input_type == "smiles":
            if len(input_value) > MAX_SMILES_CHARS:
                raise CalculationError(
                    f"SMILES input is limited to {MAX_SMILES_CHARS} characters."
                )
            molecules = configure_smi_input(input_value, io_params)
        else:
            raise CalculationError("Unsupported input type.")

    if len(molecules) != 1:
        raise CalculationError("Exactly one peptide is accepted per calculation.")
    entry = next(iter(molecules.values()))
    molecule = entry.get("mol_obj")
    fasta = entry.get("fasta")
    if molecule is not None and molecule.GetNumAtoms() > MAX_STRUCTURE_ATOMS:
        raise CalculationError(
            f"Structures are limited to {MAX_STRUCTURE_ATOMS} atoms per calculation."
        )
    if fasta is not None and len(fasta) > MAX_FASTA_RESIDUES:
        raise CalculationError(
            f"FASTA input is limited to {MAX_FASTA_RESIDUES} residues per calculation."
        )
    return molecules, io_params


def _modified_fasta_copy(molecules: dict, modifier, request: SubmitRequest) -> dict:
    data = copy.deepcopy(molecules)
    for entry in data.values():
        if entry.get("mol_obj") is None:
            entry["fasta"] = modifier(
                entry["fasta"],
                request.no_free_cys_thiols,
                request.n_disulfide_bonds,
            )
    return data


def _normalise_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _normalise_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_normalise_json(item) for item in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def calculate(request: SubmitRequest) -> dict:
    args = Namespace(
        print_fragment_pkas=request.print_fragment_pkas,
        generate_fragment_images=request.generate_fragment_images,
        ionizable_cterm=request.ionizable_cterm,
        ionizable_nterm=request.ionizable_nterm,
        no_free_cys_thiols=request.no_free_cys_thiols,
        n_disulfide_bonds=request.n_disulfide_bonds,
    )

    try:
        molecules, io_params = _prepare_input(request)
        params = generate_parameter_set(args, io_params)

        descriptors = calculate_descriptors(molecules)

        pichemist_input = _modified_fasta_copy(
            molecules, modify_fasta_according_to_cys_keys_pichemist, request
        )
        chart_id = uuid.uuid4().hex
        chart_prefix = str(CHART_DIR / chart_id)
        pichemist = pichemist_from_dict(
            pichemist_input,
            method="pkamatcher",
            ph_q_curve_file_prefix=chart_prefix,
            plot_ph_q_curve=True,
            print_fragments=request.print_fragment_pkas,
            ionizable_nterm=request.ionizable_nterm,
            ionizable_cterm=request.ionizable_cterm,
            generate_fragment_images=request.generate_fragment_images,
        )

        mec_input = _modified_fasta_copy(
            molecules, modify_fasta_according_to_cys_keys_mec, request
        )
        extinction = calculate_extinction_coefficient(mec_input, params.run)
        liabilities = calculate_liabilities(mec_input)

        first_pi = next(iter(pichemist.values()))
        generated_chart = Path(first_pi["plot_filename"])
        filename = generated_chart.name
        first_pi["plot_filename"] = filename

        result = {
            "output_descriptors": descriptors,
            "output_extn_coeff": extinction,
            "output_pIChemiSt": pichemist,
            "output_liabilities": liabilities,
            "filename": filename,
        }
        return _normalise_json(result)
    except CalculationError:
        raise
    except Exception as exc:
        raise CalculationError(
            "The input could not be processed as a supported FASTA, SMILES, SMI, or SDF structure."
        ) from exc
