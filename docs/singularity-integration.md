# Singularity Integration — Missing Information

This document records the concrete integration details that are **not yet available** in-repo, so the provider boundary is built and tested but `SingularityProvider` cannot be dog-food-verified end-to-end until the private API contract is supplied.

## What is implemented and tested

- `server/image-provider.ts` — small `ImageProvider` interface with `generate({ prompt, width?, height? })`.
- `MockImageProvider` — no-network mock used by all automated tests (no paid calls).
- `SingularityProvider` — server-side adapter that reads `SINGULARITY_API_KEY` / `SINGULARITY_API_URL` from environment, never leaks them to the client, stores provenance (`providerId`, `modelId`, optional `providerRequestId`) on `asset_variants`.

Swapping providers touches only `resolveProvider()` + the adapter file; asset / appearance / variant concepts are provider-agnostic.

## What is missing (needed to complete live verification)

Brandon, once you have the private Singularity image-generation docs or a sample curl, paste/provide:

1. **Endpoint** — the full HTTPS URL for image generation (stored as `SINGULARITY_API_URL`). Example shape: `https://api.singularity.example/v1/images/generate`.
2. **Auth header** — confirmation that `Authorization: Bearer <SINGULARITY_API_KEY>` is correct, or the actual header name/value format.
3. **Request JSON** — field names for prompt / dimensions / model / count (our adapter currently sends `{ prompt, width, height, model }` as a starting guess).
4. **Response JSON** — field names for the returned image bytes (we handle `imageBase64`, `data[0].b64_json`, and `b64_json` already; anything else is a one-line fix in `SingularityProvider.generate`).
5. **Model ids** — the model strings to put in `SINGULARITY_MODEL_ID` and to surface in the Studio selector (e.g. `singularity-raster-v1`, `singularity-svg-v1`).

With those 5 items, the remaining integration is a few-line patch in `server/image-provider.ts` — no asset-model redesign — then we can run a real `POST /api/projects/:id/assets/:assetId/appearances/:appearanceId/generate` and see the produced `AssetVariant` with `status=ready`.

## Env

```
SINGULARITY_API_KEY=...        # never committed
SINGULARITY_API_URL=https://... # provided privately
SINGULARITY_MODEL_ID=...        # optional, defaults to "singularity-default"
IMAGE_PROVIDER=singularity      # optional; omit to auto-detect
```

All three are server-side only. The API never returns them.

## Verification checklist (run once secrets are wired)

- `SINGULARITY_API_URL` + `SINGULARITY_API_KEY` set in shell, then `npm run dev:api`.
- In Studio: create project → asset → appearance → enter prompt → Generate.
- A new `asset_variants` row appears with `status=ready`, `provider_id=singularity`, `model_id=<env>`, `prompt` snapshot, and `storage_path` pointing at `server/data/assets/<id>.png` served via `GET /api/variants/:id/file`.
