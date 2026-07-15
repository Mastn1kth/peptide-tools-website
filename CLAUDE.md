# Project notes

## Known pitfalls

### The legacy chart endpoint may not finish through the development proxy

- Symptom: the calculation JSON loads, but the charge-vs-pH image remains incomplete in a browser.
- Cause: the legacy image response can keep its stream open when it is forwarded by the Vite development proxy.
- Current solution: the new FastAPI backend returns a finite `FileResponse`; frontend images use the same configurable API base as JSON requests.
- Verification: check both `img.complete` and the image's natural dimensions in a real browser; a successful chart is 800 × 600 at the time of this implementation.

### Matplotlib must use a non-interactive backend in the API

- Symptom: calculations launched through `asyncio.to_thread` can crash on Windows with Tkinter finalizer errors.
- Cause: Matplotlib may auto-select the Tk GUI backend even though the service only writes PNG files.
- Current solution: call `matplotlib.use("Agg")` in `backend/app/calculator.py` before importing pIChemiSt; Docker also sets `MPLBACKEND=Agg`.
- Verification: run the real FASTA calculation and image endpoint through the FastAPI test suite, not only direct library calls.

### Pass uploaded files to upstream with forward slashes

- Symptom: uploaded files fail only on Windows with a `unicodeescape` decoding error around the `uploads` directory.
- Cause: upstream `generate_input()` applies `decode("unicode_escape")`, so a Windows `\uploads` path is parsed as an incomplete `\u` escape.
- Current solution: convert resolved upload paths with `Path.as_posix()` before calling upstream.
- Verification: the API test suite uploads and calculates a real `.fasta` file.

### Run each chemistry calculation in a disposable process

- Symptom: malformed or unusually large structures can terminate native RDKit code instead of raising a normal Python exception.
- Cause: RDKit and the upstream calculation packages contain native extensions, so a thread timeout cannot contain a process-level crash.
- Current solution: validate conservative input bounds first, run one calculation at a time in a spawned child process, and terminate it on the wall-clock deadline. Keep exactly one API worker and one service instance while chart files use local storage.
- Verification: test the explicit FASTA/SMILES paths, oversized inputs, a real calculation, and service health after rejection.

### The Linux RDKit wheel needs X rendering libraries even for headless PNG output

- Symptom: the Docker container restarts before health checks with `ImportError: libXrender.so.1` while importing `rdkit.Chem.Draw`.
- Cause: the pip RDKit wheel links its drawing extension against Xrender/Xext even when Matplotlib uses the non-interactive Agg backend.
- Current solution: install `libxrender1` and `libxext6` in the runtime image.
- Verification: start the built Linux container, call `/health`, run a real FASTA calculation, and download the generated PNG.
