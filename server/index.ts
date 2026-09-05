/**
 * qc-cyoa server entrypoint — dev API and production one-process runtime.
 *
 * The listener is kept separate from `app.ts` so tests can exercise the same
 * router without binding a port.
 *
 * - `pnpm run dev:api` — two-process dev: API only (Vite serves the frontend).
 * - `pnpm start` (NODE_ENV=production) — one-process production: the same
 *   `node:http` server handles `/api/*` AND serves the Vite-built `dist/`
 *   frontend with SPA fallback (see `server/static.ts`).
 */
import { openDb } from "./db";
import { createApp } from "./app";
import { BetterAuthService, createAuth, migrateAuthSchema } from "./auth-service";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.DB_FILE ?? "server/data/cyoa.sqlite";

openDb({ file: DB_FILE });
const auth = createAuth();
await migrateAuthSchema(auth);

const server = createApp(new BetterAuthService(auth));
server.listen(PORT, () => {
  const mode = process.env.NODE_ENV === "production" ? "production (api + dist/)" : "dev (api only)";
  console.log(`qc-cyoa ${mode} listening on http://127.0.0.1:${PORT} (db: ${DB_FILE})`);
});
