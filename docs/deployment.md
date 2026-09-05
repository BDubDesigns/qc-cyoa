# qc-cyoa deployment contract (Issue #11)

The project-specific contract Coolify needs. Coolify/DNS/host specifics are
deployment configuration done by Brandon — this file only states what the app
expects so the Coolify screens can be filled in without guessing.

## Runtime

- Node **22** (`engines: { node: ">=22" }` — `node:sqlite` is required).
- pnpm **10.33.3** (`packageManager` field).
- Build command: `pnpm build` → Vite emits the browser bundle to `dist/`.
- Start command: `pnpm start` → one Node process (`tsx server/index.ts` with
  `NODE_ENV=production`) that serves **both**:
  - `/api/*` — the existing API routes (incl. `/api/health` → `{ ok: true }`),
  - `dist/*` — the built frontend,
  - everything else non-API → `dist/index.html` (SPA fallback so Studio
    routes open/refreshed directly keep working).
- Unknown `/api/*` paths return API-JSON 404s and never the SPA.
- Local dev is unchanged two-process: `pnpm run dev:api` + `pnpm run dev`.

`tsx` ships in `dependencies` (not devDependencies) precisely so `pnpm start`
works from a production install. `NODE_ENV=production` also flips Better Auth
to Secure cookies automatically (see below).

## Health check

- Path: `/api/health` (cheap, no auth, no DB write).
- Use it as the Coolify health check.

## Persistent storage (production)

Coolify must mount a persistent volume at **`/data`** inside the container:

| Env | Production value | Purpose |
| --- | --- | --- |
| `DB_FILE` | `/data/qc-cyoa.sqlite` | SQLite DB (accounts, projects, assets) |
| `ASSET_DIR` | `/data/assets` | Uploaded/generated image bytes |

The server creates parent directories on boot (`openDb`, `ensureAssetDir`),
so an empty volume works on first deploy. The process needs read/write on
`/data`. Nothing under `/data` is committed or baked into the image.

## Auth environment (production)

`BETTER_AUTH_SECRET` (long random, e.g. `openssl rand -base64 32`) —
**unique per environment**, stored in Coolify env, never in the repo.

`BETTER_AUTH_ALLOWED_HOSTS` — comma-separated exact host + wildcard preview
patterns. Shape (real domain filled in by Brandon at deploy time):

```bash
BETTER_AUTH_ALLOWED_HOSTS="<prod-host>,*.<preview-host-suffix>"
```

- Never `*` — the server throws on catch-all values.
- `BETTER_AUTH_TRUSTED_PROXY_HEADERS=1` — only because Coolify's reverse
  proxy overwrites `X-Forwarded-Host`/`X-Forwarded-Proto` and the app is not
  directly reachable. Leave unset for direct/non-proxied setups.
- `BETTER_AUTH_USE_SECURE_COOKIES=1` — normally unnecessary: `NODE_ENV=production`
  (set by `pnpm start`) already enables Secure cookies. Set explicitly only if
  a proxy terminates TLS in a way the app cannot detect.
- Cookies carry no `Domain` attribute: localhost, production, and each preview
  keep independent sessions by default.

## Preview deployments (after production is stable)

- Enable PR previews for trusted repo PRs only; keep untrusted-fork PR
  execution **disabled**.
- URL template uses the PR id (platform placeholder, e.g. `{{pr_id}}`):
  `<pr_id>.<preview-suffix>` resolving via the wildcard DNS record.
- Per-preview environment (never production values):
  - own `BETTER_AUTH_SECRET`,
  - own `BETTER_AUTH_ALLOWED_HOSTS` entry for that preview host (or the
    shared `*.<preview-suffix>` pattern),
  - own disposable/isolated storage (`DB_FILE` + `ASSET_DIR` must not point
    at `/data` production paths),
  - **`IMAGE_PROVIDER=mock`** — previews never receive production
    Singularity/image-generation credentials.
- Closing/merging the PR must stop/remove the preview; preview deletion must
  never touch production data.

## DNS (Brandon, manual)

Application code reads hosts from the environment — no domain is hard-coded.
Create in the DNS provider:

1. Production record (A/AAAA or CNAME) → Hetzner/Coolify for the production
   host chosen at deploy time.
2. Wildcard preview record `*.<preview-suffix>` → Hetzner/Coolify.

## Pre-launch operational check (not blocking preview setup)

The Hetzner host already has nightly full-server backups (7-day rolling).
Before public launch, verify once that the backup actually contains the
host-side data backing `/data` and can be restored. Do not add a second
backup platform in this issue.
