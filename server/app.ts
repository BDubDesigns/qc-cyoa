/**
 * The API application without a listener. Keeping the router separate from
 * server startup lets integration tests use the real production routing and
 * simulate a restart with a reopened SQLite database.
 */
import * as http from "node:http";
import type { AuthService } from "./auth-service";
import { authRoutes } from "./routes/auth";
import { assetHandlers, appearanceHandlers, variantHandlers } from "./routes/assets";
import { gameRoutes, requireUser } from "./routes/games";
import { HttpError, readJsonBody, writeError, writeJson, type JsonBody } from "./routes/json";
import { projectRoutes } from "./routes/projects";
import { MAX_UPLOAD_JSON_BYTES } from "./storage";
import { tryServeSpaFallback, tryServeStatic } from "./static";

export function createApp(auth: AuthService): http.Server {
  const Auth = authRoutes(auth);
  const Games = gameRoutes();
  const Projects = projectRoutes();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const segs = splitPath(url.pathname);

      if (req.method === "GET" && url.pathname === "/api/health") {
        writeJson(res, 200, { ok: true });
        return;
      }

      // Better Auth's credential/session endpoints are exposed through the
      // project's small cookie-only response adapter.
      if (segs[0] === "api" && segs[1] === "auth") {
        const action = segs.slice(2).join("/");
        if (req.method === "POST" && action === "sign-up/email") {
          return await Auth.signupEmail(req, res, await handleJsonBody(req));
        }
        if (req.method === "POST" && action === "sign-in/email") {
          return await Auth.signinEmail(req, res, await handleJsonBody(req));
        }
        if (req.method === "POST" && action === "sign-out") {
          return await Auth.signout(req, res);
        }
        if ((req.method === "GET" || req.method === "POST") && action === "get-session") {
          return await Auth.session(req, res);
        }
      }

      if (segs[0] === "api" && segs[1] === "me" && segs[2] === "games" && req.method === "GET") {
        const user = await requireUser(auth, req);
        return Games.mine(req, res, user);
      }

      if (segs[0] === "api" && segs[1] === "projects") {
        if (segs.length === 2) {
          if (req.method === "GET") return Projects.list(req, res, await requireUser(auth, req));
          if (req.method === "POST") return Projects.create(req, res, await requireUser(auth, req), await handleJsonBody(req));
          throw new HttpError(405, "method not allowed");
        }

        const projectId = segs[2]!;
        if (segs[3] === "assets") {
          const assetId = segs[4];
          if (!assetId) {
            if (req.method === "GET") return assetHandlers.list(req, res, await requireUser(auth, req), projectId);
            if (req.method === "POST") return assetHandlers.create(req, res, await requireUser(auth, req), projectId, await handleJsonBody(req));
            throw new HttpError(405, "method not allowed");
          }

          if (segs[5] === "appearances") {
            const appearanceId = segs[6];
            if (!appearanceId) {
              if (req.method === "GET") return appearanceHandlers.list(req, res, await requireUser(auth, req), projectId, assetId);
              if (req.method === "POST") return appearanceHandlers.create(req, res, await requireUser(auth, req), projectId, assetId, await handleJsonBody(req));
              throw new HttpError(405, "method not allowed");
            }

            if (segs[7] === "active" && req.method === "PUT") {
              return appearanceHandlers.setActive(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, await handleJsonBody(req));
            }

            if (segs[7] === "variants") {
              const variantId = segs[8];
              if (!variantId) {
                if (req.method === "GET") return variantHandlers.list(req, res, await requireUser(auth, req), projectId, assetId, appearanceId);
                throw new HttpError(405, "method not allowed");
              }
              if (req.method === "GET") return variantHandlers.get(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, variantId);
              if (req.method === "DELETE") return variantHandlers.remove(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, variantId);
              throw new HttpError(405, "method not allowed");
            }

            if (segs[7] === "upload" && req.method === "POST") {
              return await variantHandlers.upload(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, await handleJsonBody(req, MAX_UPLOAD_JSON_BYTES));
            }
            if (segs[7] === "generate" && req.method === "POST") {
              return await variantHandlers.generate(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, await handleJsonBody(req));
            }
            if (req.method === "PUT") return appearanceHandlers.update(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, await handleJsonBody(req));
            if (req.method === "DELETE") return appearanceHandlers.remove(req, res, await requireUser(auth, req), projectId, assetId, appearanceId);
            throw new HttpError(404, "not found");
          }

          if (req.method === "GET") return assetHandlers.get(req, res, await requireUser(auth, req), projectId, assetId);
          if (req.method === "PUT") return assetHandlers.update(req, res, await requireUser(auth, req), projectId, assetId, await handleJsonBody(req));
          if (req.method === "DELETE") return assetHandlers.remove(req, res, await requireUser(auth, req), projectId, assetId);
          throw new HttpError(405, "method not allowed");
        }

        if (req.method === "GET") return Projects.get(req, res, await requireUser(auth, req), projectId);
        if (req.method === "PUT") return Projects.update(req, res, await requireUser(auth, req), projectId, await handleJsonBody(req));
        if (req.method === "DELETE") return Projects.remove(req, res, await requireUser(auth, req), projectId);
        throw new HttpError(405, "method not allowed");
      }

      if (segs[0] === "api" && segs[1] === "variants" && segs[3] === "file" && req.method === "GET") {
        const variantId = segs[2]!;
        return variantHandlers.file(req, res, await auth.currentUser(req), variantId);
      }

      if (segs[0] === "api" && segs[1] === "games") {
        const resourceId = segs[2];
        if (resourceId === undefined) {
          if (req.method === "GET") return Games.list(req, res);
          if (req.method === "POST") return await Games.create(req, res, await requireUser(auth, req), await handleJsonBody(req));
          throw new HttpError(405, "method not allowed");
        }
        if (resourceId === "health") {
          writeJson(res, 200, { ok: true });
          return;
        }
        if (req.method === "GET") return Games.get(req, res, await auth.currentUser(req), resourceId);
        if (req.method === "POST") {
          if (segs[3] === "publish") return Games.publish(req, res, await requireUser(auth, req), resourceId);
          throw new HttpError(404, "not found");
        }
        if (req.method === "PUT") return await Games.update(req, res, await requireUser(auth, req), resourceId, await handleJsonBody(req));
        if (req.method === "DELETE") return Games.remove(req, res, await requireUser(auth, req), resourceId);
        throw new HttpError(405, "method not allowed");
      }

      // Unknown /api/* paths stay API-JSON 404s — never the SPA fallback.
      if (segs[0] === "api") throw new HttpError(404, "not found");

      // Production runtime: serve the Vite-built frontend from dist/ and fall
      // back to index.html for SPA routes. Disabled implicitly when there is
      // no built bundle (e.g. API-only test/dev contexts).
      if (tryServeStatic(req, res)) return;
      if (tryServeSpaFallback(req, res)) return;

      throw new HttpError(404, "not found");
    } catch (err) {
      if (err instanceof HttpError) {
        writeError(res, err.status, err.message);
        return;
      }
      console.error("[api] unhandled error:", err);
      writeError(res, 500, "internal error");
    }
  });
}

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter((part) => part.length > 0);
}

async function handleJsonBody(req: http.IncomingMessage, maxBytes?: number): Promise<JsonBody> {
  return ((await readJsonBody(req, maxBytes)) as JsonBody) ?? null;
}
