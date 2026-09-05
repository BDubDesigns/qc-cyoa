/**
 * qc-cyoa API server entrypoint.
 *
 * The listener is kept separate from `app.ts` so tests can exercise the same
 * router without binding the development port.
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
  console.log(`qc-cyoa API listening on http://127.0.0.1:${PORT} (db: ${DB_FILE})`);
});
