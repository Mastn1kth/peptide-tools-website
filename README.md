# Peptide Tools visual refresh

A responsive visual redesign of the Peptide Tools web interface. It includes the analyser, a full scientific documentation page, and the original project contacts in one consistent design system.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/home`.

## Production build

```bash
npm run build
npm run preview
```

The independent calculation API is included in `backend/` and is built with Docker. Start it on port `8000` before running the frontend, or set `VITE_API_BASE` and `VITE_IMAGE_BASE` to the deployed API URL.

See `backend/README.md` for Docker and production deployment instructions.

The complete release order and post-deploy smoke test are in `DEPLOYMENT.md`.
