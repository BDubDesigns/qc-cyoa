/**
 * CYOA API server — bare `node:http` + tiny router.
 *
 * Run with:  pnpm run dev:api   (tsx server/index.ts)
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
import { projectRoutes } from "./routes/projects";
import { assetHandlers, appearanceHandlers, variantHandlers } from "./routes/assets";
import { HttpError, readJsonBody, writeError, writeJson, type JsonBody } from "./routes/json";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.DB_FILE ?? "server/data/cyoa.sqlite";

openDb({ file: DB_FILE });

const auth = new PasswordAuthService();
const Auth = authRoutes(auth);
const Games = gameRoutes();
const Projects = projectRoutes();

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter((p) => p.length > 0);
}

async function handleJsonBody(req: http.IncomingMessage): Promise<JsonBody> {
  const raw = await readJsonBody(req);
  return (raw as JsonBody) ?? null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const segs = splitPath(url.pathname);

    // Health check
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

    // ---- /api/projects/* ----
    if (segs[0] === "api" && segs[1] === "projects") {
      // /api/projects
      if (segs.length === 2) {
        if (req.method === "GET") {
          const user = await requireUser(auth, req);
          return Projects.list(req, res, user);
        }
        if (req.method === "POST") {
          const user = await requireUser(auth, req);
          return Projects.create(req, res, user, await handleJsonBody(req));
        }
        throw new HttpError(405, "method not allowed");
      }

      const projectId = segs[2]!;

      // /api/projects/:projectId/assets ...
      if (segs[3] === "assets") {
        const assetId = segs[4];
        // LIST or CREATE assets: /api/projects/:projectId/assets
        if (!assetId) {
          if (req.method === "GET") {
            const user = await requireUser(auth, req);
            return assetHandlers.list(req, res, user, projectId);
          }
          if (req.method === "POST") {
            const user = await requireUser(auth, req);
            return assetHandlers.create(req, res, user, projectId, await handleJsonBody(req));
          }
          throw new HttpError(405, "method not allowed");
        }

        // appearances under an asset
        if (segs[5] === "appearances") {
          const appearanceId = segs[6];
          if (!appearanceId) {
            if (req.method === "GET") {
              const user = await requireUser(auth, req);
              return appearanceHandlers.list(req, res, user, projectId, assetId);
            }
            if (req.method === "POST") {
              const user = await requireUser(auth, req);
              return appearanceHandlers.create(req, res, user, projectId, assetId, await handleJsonBody(req));
            }
            throw new HttpError(405, "method not allowed");
          }

          // /.../appearances/:appearanceId/active
          if (segs[7] === "active" && req.method === "PUT") {
            const user = await requireUser(auth, req);
            return appearanceHandlers.setActive(req, res, user, projectId, assetId, appearanceId, await handleJsonBody(req));
          }

          // /.../appearances/:appearanceId/variants ...
          if (segs[7] === "variants") {
            const variantId = segs[8];
            // upload / generate are siblings of variant id
            // but POST .../upload and POST .../generate live directly under appearance:
            // we handle them below before this block, so if we reach here with segs[7]==variants,
            // it's the variants collection or single.
            if (!variantId) {
              if (req.method === "GET") {
                const user = await requireUser(auth, req);
                return variantHandlers.list(req, res, user, projectId, assetId, appearanceId);
              }
              throw new HttpError(405, "method not allowed");
            }
            if (req.method === "GET") {
              const user = await requireUser(auth, req);
              return variantHandlers.get(req, res, user, projectId, assetId, appearanceId, variantId);
            }
            if (req.method === "DELETE") {
              const user = await requireUser(auth, req);
              return variantHandlers.remove(req, res, user, projectId, assetId, appearanceId, variantId);
            }
            throw new HttpError(405, "method not allowed");
          }

          // POST /.../appearances/:appearanceId/upload
          if (segs[7] === "upload" && req.method === "POST") {
            const user = await requireUser(auth, req);
            return await variantHandlers.upload(req, res, user, projectId, assetId, appearanceId, await handleJsonBody(req));
          }
          // POST /.../appearances/:appearanceId/generate
          if (segs[7] === "generate" && req.method === "POST") {
            const user = await requireUser(auth, req);
            return await variantHandlers.generate(req, res, user, projectId, assetId, appearanceId, await handleJsonBody(req));
          }

          // PUT /.../appearances/:appearanceId  or DELETE
          if (req.method === "PUT") {
            const user = await requireUser(auth, req);
            return appearanceHandlers.update(req, res, user, projectId, assetId, appearanceId, await handleJsonBody(req));
          }
          if (req.method === "DELETE") {
            const user = await requireUser(auth, req);
            return appearanceHandlers.remove(req, res, user, projectId, assetId, appearanceId);
          }
          throw new HttpError(404, "not found");
        }

        // single asset: /api/projects/:projectId/assets/:assetId
        if (req.method === "GET") {
          const user = await requireUser(auth, req);
          return assetHandlers.get(req, res, user, projectId, assetId);
        }
        if (req.method === "PUT") {
          const user = await requireUser(auth, req);
          return assetHandlers.update(req, res, user, projectId, assetId, await handleJsonBody(req));
        }
        if (req.method === "DELETE") {
          const user = await requireUser(auth, req);
          return assetHandlers.remove(req, res, user, projectId, assetId);
        }
        throw new HttpError(405, "method not allowed");
      }

      // /api/projects/:id (project itself)
      if (req.method === "GET") {
        const user = await requireUser(auth, req);
        return Projects.get(req, res, user, projectId);
      }
      if (req.method === "PUT") {
        const user = await requireUser(auth, req);
        return Projects.update(req, res, user, projectId, await handleJsonBody(req));
      }
      if (req.method === "DELETE") {
        const user = await requireUser(auth, req);
        return Projects.remove(req, res, user, projectId);
      }
      throw new HttpError(405, "method not allowed");
    }

    // ---- /api/variants/:variantId/file ----
    if (segs[0] === "api" && segs[1] === "variants" && segs[3] === "file" && req.method === "GET") {
      const variantId = segs[2]!;
      // file is private by default: requires auth, ownership enforced
      const user = await auth.currentUser(req);
      // variantHandlers.file will throw 403 if user is null or not owner
      return variantHandlers.file(req, res, user, variantId);
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
