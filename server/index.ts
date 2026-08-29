/**
 * CYOA API server — bare `node:http` + tiny router.
 *
 * Run with:  npm run dev:api   (tsx server/index.ts)
 * Listens on PORT (default 8787). The Vite dev server proxies /api here so the
 * browser talks same-origin and the httpOnly session cookie is accepted.
 *
 * Dependency-free on purpose: better-auth (auth) and a real ORM (data) can be
 * swapped in later without touching studio or game code.
 */
import * as http from "node:http";
import { openDb } from "./db";
import { PasswordAuthService, AuthError } from "./auth-service";
import { authRoutes } from "./routes/auth";
import { gameRoutes, requireUser } from "./routes/games";
import { HttpError, readJsonBody, writeError, writeJson, type JsonBody } from "./routes/json";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.DB_FILE ?? "server/data/cyoa.sqlite";

openDb({ file: DB_FILE });

const auth = new PasswordAuthService();
const Auth = authRoutes(auth);
const Games = gameRoutes();

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter((p) => p.length > 0);
}

async function handleJsonBody(
  req: http.IncomingMessage,
): Promise<JsonBody> {
  const raw = await readJsonBody(req);
  return (raw as JsonBody) ?? null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const segs = splitPath(url.pathname);

    // Health check (used by dev/CI to confirm the API is up).
    if (req.method === "GET" && req.url === "/api/health") {
      writeJson(res, 200, { ok: true });
      return;
    }

    // ---- /api/auth/* ----
    if (req.method === "POST" && segs[0] === "api" && segs[1] === "auth") {
      const action = segs[2];
      if (action === "signup") return await Auth.signup(req, res, await handleJsonBody(req));
      if (action === "login") return await Auth.login(req, res, await handleJsonBody(req));
      if (action === "logout") return Auth.logout(req, res);
    }
    if (req.method === "GET" && segs[0] === "api" && segs[1] === "auth" && segs[2] === "session") {
      return await Auth.session(req, res);
    }

    // ---- /api/me/* ----
    if (segs[0] === "api" && segs[1] === "me" && segs[2] === "games" && req.method === "GET") {
      const user = await requireUser(auth, req);
      return Games.mine(req, res, user);
    }

    // ---- /api/games/* ----
    if (segs[0] === "api" && segs[1] === "games") {
      const resourceId = segs[2];
      if (resourceId === undefined) {
        if (req.method === "GET") return Games.list(req, res);
        if (req.method === "POST") {
          const user = await requireUser(auth, req);
          return await Games.create(req, res, user, await handleJsonBody(req));
        }
        throw new HttpError(405, "method not allowed");
      }
      if (resourceId === "health") {
        writeJson(res, 200, { ok: true });
        return;
      }
      if (req.method === "GET") return Games.get(req, res, await auth.currentUser(req), resourceId);
      if (req.method === "POST") {
        // POST /api/games/:id/publish
        if (segs[3] === "publish") {
          const user = await requireUser(auth, req);
          return Games.publish(req, res, user, resourceId);
        }
        throw new HttpError(404, "not found");
      }
      if (req.method === "PUT") {
        const user = await requireUser(auth, req);
        return await Games.update(req, res, user, resourceId, await handleJsonBody(req));
      }
      if (req.method === "DELETE") {
        const user = await requireUser(auth, req);
        return Games.remove(req, res, user, resourceId);
      }
      throw new HttpError(405, "method not allowed");
    }

    throw new HttpError(404, "not found");
  } catch (err) {
    if (err instanceof AuthError || err instanceof HttpError) {
      writeError(res, err.status, err.message);
      return;
    }
    console.error("[api] unhandled error:", err);
    writeError(res, 500, "internal error");
  }
});

server.listen(PORT, () => {
  console.log(`CYOA API listening on http://127.0.0.1:${PORT} (db: ${DB_FILE})`);
});