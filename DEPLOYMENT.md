# Peptide Tools deployment handoff

The project is split into two independently deployed services:

- `peptide-tools.com` and `www.peptide-tools.com`: static Vite frontend on Netlify.
- `api.peptide-tools.com`: Docker API on Render.

No VPS is required by this deployment design.

## 1. Repository

Use a dedicated repository for this project. Do not deploy from the historical
`frolov-pchem/unitconv` repository.

## 2. Backend on Render

Create a Render Blueprint from the repository. `render.yaml` provisions exactly
one Standard web service. The single-instance restriction is intentional because
generated chart images use temporary local storage.

After the first successful deploy, verify:

```text
https://<render-service-host>/health
https://<render-service-host>/docs
```

Then add `api.peptide-tools.com` as the service custom domain. Do not change DNS
until the temporary Render hostname passes a real calculation and image test.

## 3. Frontend on Netlify

Import the same repository into Netlify. `netlify.toml` builds `dist/` and embeds
the production API base URL. Verify the temporary Netlify hostname on all three
routes before attaching the domain:

```text
/home
/documentation
/contacts
```

## 4. Edge protection

Before exposing the calculation API, put `api.peptide-tools.com` behind a trusted
edge such as Cloudflare and add a per-client rate-limiting rule for `/submitJob`
and `/upload`. The API itself enforces body, input, time, memory, and concurrency
limits, but only the edge can reliably identify a visitor behind Render's proxy.

## 5. Domain cutover

Record the existing DNS values before changing anything. Use the exact DNS
targets shown by Netlify and Render; do not guess them. Lower DNS TTL in advance,
attach and validate the custom domains, then switch traffic. Keep the old hosting
available until the new frontend and API have both been verified through the
public domain.

## 6. Smoke test

After cutover, verify:

1. `https://peptide-tools.com/home` loads without console errors.
2. `https://peptide-tools.com/documentation` and `/contacts` load directly.
3. FASTA `ADWAK` returns molecular weight about `589.6` and pI about `9.2`.
4. The charge-vs-pH image finishes loading with natural size `800x600`.
5. Oversized and invalid inputs return safe `4xx` responses without traceback.
