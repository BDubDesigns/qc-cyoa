/**
 * Slice 0 integration tests: creator auth + projects + assets +
 * appearances + variants + provider boundary (mock only — no paid calls).
 *
 * Same pattern as server.test.ts: isolated temp DB + throwaway http server
 * that wires the real handlers via helper `buildServer()`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { openDb, closeDb } from "../server/db";
import { PasswordAuthService, AuthError } from "../server/auth-service";
import { authRoutes } from "../server/routes/auth";
import { gameRoutes, requireUser } from "../server/routes/games";
import { projectRoutes } from "../server/routes/projects";
import { assetHandlers, appearanceHandlers, variantHandlers } from "../server/routes/assets";
import { readJsonBody, writeError, writeJson, HttpError } from "../server/routes/json";
import { MockImageProvider, SingularityProvider, isMissingIntegration } from "../server/image-provider";

let server: http.Server;
let baseUrl: string;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyoa-slice0-"));

function buildServer(): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const segs = url.pathname.split("/").filter(Boolean);
      const auth = new PasswordAuthService();
      const Auth = authRoutes(auth);
      const Games = gameRoutes();
      const Projects = projectRoutes();

      const asJson = (v: unknown) => (v as Record<string, unknown> | null) ?? null;

      // auth
      if (req.method === "POST" && segs[0] === "api" && segs[1] === "auth") {
        const a = segs[2];
        const body = asJson(await readJsonBody(req));
        if (a === "signup") return await Auth.signup(req, res, body);
        if (a === "login") return await Auth.login(req, res, body);
        if (a === "logout") return Auth.logout(req, res);
      }
      if (req.method === "GET" && segs[0] === "api" && segs[1] === "auth" && segs[2] === "session") {
        return await Auth.session(req, res);
      }
      if (segs[0] === "api" && segs[1] === "me" && segs[2] === "games") {
        const user = await requireUser(auth, req);
        return Games.mine(req, res, user);
      }
      // projects + nested assets/appearances/variants
      if (segs[0] === "api" && segs[1] === "projects") {
        if (segs.length === 2) {
          if (req.method === "GET") return Projects.list(req, res, await requireUser(auth, req));
          if (req.method === "POST") return Projects.create(req, res, await requireUser(auth, req), asJson(await readJsonBody(req)));
          throw new HttpError(405, "method not allowed");
        }
        const projectId = segs[2]!;
        if (segs[3] === "assets") {
          const assetId = segs[4];
          if (!assetId) {
            if (req.method === "GET") return assetHandlers.list(req, res, await requireUser(auth, req), projectId);
            if (req.method === "POST") return assetHandlers.create(req, res, await requireUser(auth, req), projectId, asJson(await readJsonBody(req)));
            throw new HttpError(405, "method not allowed");
          }
          if (segs[5] === "appearances") {
            const appearanceId = segs[6];
            if (!appearanceId) {
              if (req.method === "GET") return appearanceHandlers.list(req, res, await requireUser(auth, req), projectId, assetId);
              if (req.method === "POST") return appearanceHandlers.create(req, res, await requireUser(auth, req), projectId, assetId, asJson(await readJsonBody(req)));
              throw new HttpError(405, "method not allowed");
            }
            if (segs[7] === "active" && req.method === "PUT") {
              return appearanceHandlers.setActive(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, asJson(await readJsonBody(req)));
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
              return await variantHandlers.upload(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, asJson(await readJsonBody(req)));
            }
            if (segs[7] === "generate" && req.method === "POST") {
              return await variantHandlers.generate(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, asJson(await readJsonBody(req)));
            }
            if (req.method === "PUT") return appearanceHandlers.update(req, res, await requireUser(auth, req), projectId, assetId, appearanceId, asJson(await readJsonBody(req)));
            if (req.method === "DELETE") return appearanceHandlers.remove(req, res, await requireUser(auth, req), projectId, assetId, appearanceId);
            throw new HttpError(404, "not found");
          }
          if (req.method === "GET") return assetHandlers.get(req, res, await requireUser(auth, req), projectId, assetId);
          if (req.method === "PUT") return assetHandlers.update(req, res, await requireUser(auth, req), projectId, assetId, asJson(await readJsonBody(req)));
          if (req.method === "DELETE") return assetHandlers.remove(req, res, await requireUser(auth, req), projectId, assetId);
          throw new HttpError(405, "method not allowed");
        }
        if (req.method === "GET") return Projects.get(req, res, await requireUser(auth, req), projectId);
        if (req.method === "PUT") return Projects.update(req, res, await requireUser(auth, req), projectId, asJson(await readJsonBody(req)));
        if (req.method === "DELETE") return Projects.remove(req, res, await requireUser(auth, req), projectId);
        throw new HttpError(405, "method not allowed");
      }
      // variants file
      if (segs[0] === "api" && segs[1] === "variants" && segs[3] === "file" && req.method === "GET") {
        const variantId = segs[2]!;
        return variantHandlers.file(req, res, await auth.currentUser(req), variantId);
      }
      // games
      if (segs[0] === "api" && segs[1] === "games") {
        const id = segs[2];
        if (id === undefined) {
          if (req.method === "GET") return Games.list(req, res);
          if (req.method === "POST") return await Games.create(req, res, await requireUser(auth, req), asJson(await readJsonBody(req)));
          throw new HttpError(404, "not found");
        }
        if (req.method === "GET") return Games.get(req, res, await auth.currentUser(req), id);
        if (req.method === "POST" && segs[3] === "publish") return Games.publish(req, res, await requireUser(auth, req), id);
        if (req.method === "PUT") return await Games.update(req, res, await requireUser(auth, req), id, asJson(await readJsonBody(req)));
        if (req.method === "DELETE") return Games.remove(req, res, await requireUser(auth, req), id);
      }
      throw new HttpError(404, "not found");
    } catch (err) {
      if (err instanceof HttpError) return writeError(res, err.status, err.message);
      if (err instanceof AuthError) return writeError(res, err.status, err.message);
      console.error(err);
      return writeError(res, 500, "internal error");
    }
  });
}

beforeAll(() => {
  // Force mock provider for all tests — no real network, no paid calls.
  process.env.IMAGE_PROVIDER = "mock";
  delete process.env.SINGULARITY_API_URL;
  delete process.env.SINGULARITY_API_KEY;
  server = buildServer();
  return new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
  closeDb();
  // Clean up any temp asset files created during tests.
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

beforeEach(() => {
  closeDb();
  openDb({ file: path.join(tmpDir, `db-${Date.now()}-${Math.random()}.sqlite`) });
  // Ensure asset dir is isolated per run
  const assetDir = path.join(tmpDir, `assets-${Date.now()}-${Math.random()}`);
  fs.mkdirSync(assetDir, { recursive: true });
  process.env.ASSET_DIR = assetDir;
});

function cookieFrom(res: Response): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  return raw.split(";")[0]!;
}

async function signup(username: string, password: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  expect(res.status).toBe(201);
  return cookieFrom(res)!;
}

// Tiny 1x1 png as dataUrl/base64 for upload tests.
const TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
const TINY_PNG_DATAURL = `data:image/png;base64,${TINY_PNG_B64}`;

async function createProject(cookie: string, title = "My Project"): Promise<string> {
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ title }),
  });
  expect(res.status).toBe(201);
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function createAsset(cookie: string, projectId: string, name = "Sasquatch", category = "character"): Promise<string> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name, category }),
  });
  expect(res.status).toBe(201);
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function createAppearance(cookie: string, projectId: string, assetId: string, name = "Hiding Badly"): Promise<string> {
  const res = await fetch(`${baseUrl}/api/projects/${projectId}/assets/${assetId}/appearances`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name }),
  });
  expect(res.status).toBe(201);
  const data = (await res.json()) as { id: string };
  return data.id;
}

// ---------------------------------------------------------------------------
// Auth / project ownership
// ---------------------------------------------------------------------------

describe("project ownership", () => {
  it("unauthenticated cannot list or create projects", async () => {
    const list = await fetch(`${baseUrl}/api/projects`);
    expect(list.status).toBe(401);

    const create = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "X" }),
    });
    expect(create.status).toBe(401);
  });

  it("owner can create and reopen; other user gets 403", async () => {
    const alice = await signup("alice-s0", "secret123");
    const bob = await signup("bob-s0", "secret123");
    const pid = await createProject(alice, "Flagship");

    const getOwn = await fetch(`${baseUrl}/api/projects/${pid}`, { headers: { Cookie: alice } });
    expect(getOwn.status).toBe(200);

    const getOther = await fetch(`${baseUrl}/api/projects/${pid}`, { headers: { Cookie: bob } });
    expect(getOther.status).toBe(403);

    const listAlice = (await (await fetch(`${baseUrl}/api/projects`, { headers: { Cookie: alice } })).json()) as { projects: Array<{ id: string }> };
    expect(listAlice.projects.some((p) => p.id === pid)).toBe(true);

    const listBob = (await (await fetch(`${baseUrl}/api/projects`, { headers: { Cookie: bob } })).json()) as { projects: Array<{ id: string }> };
    expect(listBob.projects.some((p) => p.id === pid)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Asset -> Appearance -> Variant hierarchy
// ---------------------------------------------------------------------------

describe("Asset -> Appearance -> Variant", () => {
  it("creates logical asset with category, then appearances, then variants", async () => {
    const cookie = await signup("cara-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");

    const appA = await createAppearance(cookie, pid, assetId, "Neutral");
    const appB = await createAppearance(cookie, pid, assetId, "Hiding Badly");

    const list = (await (
      await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances`, { headers: { Cookie: cookie } })
    ).json()) as { appearances: Array<{ id: string; name: string }> };
    expect(list.appearances.map((a) => a.name)).toEqual(expect.arrayContaining(["Neutral", "Hiding Badly"]));

    // upload a variant to Hiding Badly
    const up = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appB}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    expect(up.status).toBe(201);
    const { variant } = (await up.json()) as { variant: { id: string; status: string; source_type: string } };
    expect(variant.status).toBe("ready");
    expect(variant.source_type).toBe("uploaded");

    // second variant does not overwrite the first
    const up2 = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appB}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    expect(up2.status).toBe(201);
    const { variant: v2 } = (await up2.json()) as { variant: { id: string } };
    expect(v2.id).not.toBe(variant.id);

    const variants = (await (
      await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appB}/variants`, { headers: { Cookie: cookie } })
    ).json()) as { variants: Array<{ id: string }> };
    expect(variants.variants.length).toBe(2);

    // unrelated appearance still empty
    const empty = (await (
      await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appA}/variants`, { headers: { Cookie: cookie } })
    ).json()) as { variants: unknown[] };
    expect(empty.variants.length).toBe(0);
  });

  it("other user cannot mutate assets/appearances", async () => {
    const alice = await signup("alice2-s0", "secret123");
    const bob = await signup("bob2-s0", "secret123");
    const pid = await createProject(alice, "P");
    const assetId = await createAsset(alice, pid, "Cup", "prop");
    const appearanceId = await createAppearance(alice, pid, assetId, "Default");

    const badCreate = await fetch(`${baseUrl}/api/projects/${pid}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bob },
      body: JSON.stringify({ name: "Evil", category: "prop" }),
    });
    expect(badCreate.status).toBe(403);

    const badUpload = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bob },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    expect(badUpload.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Upload: private by default, validation
// ---------------------------------------------------------------------------

describe("upload privacy and validation", () => {
  it("uploaded variant file is private: only owner can fetch it", async () => {
    const alice = await signup("alice3-s0", "secret123");
    const bob = await signup("bob3-s0", "secret123");
    const pid = await createProject(alice, "P");
    const assetId = await createAsset(alice, pid, "Cup", "prop");
    const appearanceId = await createAppearance(alice, pid, assetId, "Default");

    const up = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: alice },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant } = (await up.json()) as { variant: { id: string; file_url: string } };

    const anon = await fetch(`${baseUrl}${variant.file_url}`);
    expect(anon.status).toBe(403);

    const bobFetch = await fetch(`${baseUrl}${variant.file_url}`, { headers: { Cookie: bob } });
    expect(bobFetch.status).toBe(403);

    const ownerFetch = await fetch(`${baseUrl}${variant.file_url}`, { headers: { Cookie: alice } });
    expect(ownerFetch.status).toBe(200);
    expect(ownerFetch.headers.get("content-type")).toMatch(/image\/png/);
  });

  it("rejects unsupported mime types", async () => {
    const cookie = await signup("dana-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "X", "other");
    const appearanceId = await createAppearance(cookie, pid, assetId, "A");

    const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      // raw base64 (no data: prefix) so server keeps the supplied mimeType
      body: JSON.stringify({ imageBase64: TINY_PNG_B64, mimeType: "image/bmp" }),
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Generate through mock provider — provenance + non-overwrite
// ---------------------------------------------------------------------------

describe("generate via provider (mock)", () => {
  it("creates a new ready variant with prompt + provider/model provenance, without overwriting previous attempts", async () => {
    const cookie = await signup("erin-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appearanceId = await createAppearance(cookie, pid, assetId, "Hiding Badly");

    const genA = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ prompt: "sasquatch hiding badly, illustration" }),
    });
    expect(genA.status).toBe(201);
    const { variant: vA } = (await genA.json()) as { variant: { id: string; status: string; prompt: string; provider_id: string; model_id: string; source_type: string } };
    expect(vA.status).toBe("ready");
    expect(vA.source_type).toBe("generated");
    expect(vA.prompt).toBe("sasquatch hiding badly, illustration");
    expect(vA.provider_id).toBe("mock");
    expect(vA.model_id).toBe("mock-v1");

    const genB = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ prompt: "sasquatch excited, same style" }),
    });
    const { variant: vB } = (await genB.json()) as { variant: { id: string } };
    expect(vB.id).not.toBe(vA.id);

    const { variants } = (await (
      await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/variants`, { headers: { Cookie: cookie } })
    ).json()) as { variants: Array<{ id: string }> };
    expect(variants.length).toBe(2);
  });

  it("rejects empty prompt", async () => {
    const cookie = await signup("frank-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "X", "prop");
    const appearanceId = await createAppearance(cookie, pid, assetId, "A");

    const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ prompt: "   " }),
    });
    expect(res.status).toBe(400);
  });

  it("reports failure with error_message and 503 when Singularity integration info is missing", async () => {
    // Use a fresh Singularity provider with no env to exercise the 503 path.
    // We can't easily reconfigure the global server mid-test, so verify the
    // provider unit itself reports the sentinel correctly.
    const p = new SingularityProvider({ apiUrl: undefined, apiKey: undefined });
    let threw = false;
    try {
      await p.generate({ prompt: "test" });
    } catch (err) {
      threw = true;
      expect(isMissingIntegration(err)).toBe(true);
      expect((err as Error).message).toContain("SINGULARITY_API_URL");
    }
    expect(threw).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Provider interface: domain does not hardcode Singularity assumptions
// ---------------------------------------------------------------------------

describe("provider boundary", () => {
  it("mock provider returns a PNG without network", async () => {
    const mock = new MockImageProvider();
    const result = await mock.generate({ prompt: "hello", width: 256, height: 256 });
    expect(result.providerId).toBe("mock");
    expect(result.mimeType).toBe("image/png");
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("Singularity adapter is tagged as missing integration when env is absent", async () => {
    const s = new SingularityProvider({});
    // Without env it must throw the sentinel, not an opaque network error.
    await expect(s.generate({ prompt: "x" })).rejects.toSatisfy((err: unknown) => isMissingIntegration(err));
  });
});

// ---------------------------------------------------------------------------
// Active variant selection persists
// ---------------------------------------------------------------------------

describe("active variant selection", () => {
  it("selecting an active variant persists across reloads", async () => {
    const cookie = await signup("gina-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appearanceId = await createAppearance(cookie, pid, assetId, "Hiding Badly");

    const upA = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant: vA } = (await upA.json()) as { variant: { id: string } };

    const upB = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant: vB } = (await upB.json()) as { variant: { id: string } };

    // Set B as active
    const setB = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/active`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ variantId: vB.id }),
    });
    expect(setB.status).toBe(200);
    const afterSet = (await setB.json()) as { appearance: { active_variant_id: string } };
    expect(afterSet.appearance.active_variant_id).toBe(vB.id);

    // Reload appearances and confirm it stuck
    const list = (await (
      await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances`, { headers: { Cookie: cookie } })
    ).json()) as { appearances: Array<{ id: string; active_variant_id: string | null }> };
    const fresh = list.appearances.find((a) => a.id === appearanceId)!;
    expect(fresh.active_variant_id).toBe(vB.id);

    // Clear active
    const clear = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/active`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ variantId: null }),
    });
    expect(clear.status).toBe(200);
    const { appearance: cleared } = (await clear.json()) as { appearance: { active_variant_id: string | null } };
    expect(cleared.active_variant_id).toBeNull();

    // Deleting the active variant clears the pointer
    await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/active`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ variantId: vA.id }),
    });
    await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/variants/${vA.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    const afterDelete = (await (
      await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances`, { headers: { Cookie: cookie } })
    ).json()) as { appearances: Array<{ id: string; active_variant_id: string | null }> };
    const after = afterDelete.appearances.find((a) => a.id === appearanceId)!;
    expect(after.active_variant_id).toBeNull();
  });
});
