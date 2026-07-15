# Peptide Tools API

Production HTTP wrapper around the calculation code from
[`AstraZeneca/peptide-tools`](https://github.com/AstraZeneca/peptide-tools).
The upstream source is pinned to commit
`e639de3c08ee701a1ad9c25f70c6d26a7589af8c`.

## Endpoints

- `GET /health` — health and calculation-source version
- `GET /version` — service version
- `POST /submitJob` — one FASTA sequence or SMILES structure
- `POST /upload` — one `.smi`, `.sdf`, or `.fasta` file under the `uploads[]` field
- `GET /image/{filename}` — generated charge-vs-pH plot
- `GET /docs` — OpenAPI interface

## Run with Docker

From the repository root:

```bash
docker build -f backend/Dockerfile -t peptide-tools-api .
docker run --rm -p 8000:8000 \
  -e ALLOWED_ORIGINS=https://peptide-tools.com,https://www.peptide-tools.com \
  peptide-tools-api
```

Open `http://127.0.0.1:8000/health`.

## Production topology

Deploy this container as `api.peptide-tools.com` and the Vite frontend as
`peptide-tools.com`. Set the frontend build variable:

```text
VITE_API_BASE=https://api.peptide-tools.com
VITE_IMAGE_BASE=https://api.peptide-tools.com
```

The included Render blueprint selects one paid Standard instance (2 GB RAM) and
a 1 GB child-process ceiling. Run exactly one Uvicorn worker and one hosting
instance. Generated plots are kept
on that instance's temporary disk, so horizontal scaling requires shared object
storage before adding more instances.

Generated uploads and charts are temporary and removed after one hour. They do
not require a persistent disk.

## Important limitations

- This is a research prediction service, not experimental validation.
- Only the open `pkamatcher` method is used. The commercial ACD/Labs method is not included.
- Exactly one peptide is accepted per request.
- FASTA is limited to 200 residues; SMILES is limited to 12,000 characters and 3,000 atoms.
- Every calculation runs in a disposable child process with CPU, memory, and wall-clock limits.
- Request bodies and calculation concurrency are bounded in the API. Before making the service public, configure per-client rate limiting at a trusted edge/WAF such as Cloudflare; a proxy-safe per-client IP cannot be derived inside this container without provider-specific trust configuration.
- The upstream project has inconsistent MIT/Apache metadata. Its original license files and copyright must remain available when redistributing the calculation code.
