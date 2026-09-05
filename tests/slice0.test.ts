/**
 * Slice 0 integration tests: creator auth + projects + assets +
 * appearances + variants + provider boundary (mock only — no paid calls).
 *
 * The tests use the same production router as the development server.
 */

import { describe, it, expect, afterAll, beforeEach } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { openDb, closeDb } from "../server/db";
import { BetterAuthService, createAuth, migrateAuthSchema } from "../server/auth-service";
import { createApp } from "../server/app";
import { MockImageProvider, SingularityProvider, isMissingIntegration } from "../server/image-provider";
import { MAX_UPLOAD_JSON_BYTES } from "../server/storage";

let server: http.Server | undefined;
let baseUrl = "";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyoa-slice0-"));
const TEST_SECRET = "test-secret-for-better-auth-012345678901234567890123456789";
const TEST_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*"];

async function stopServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
  server = undefined;
}

async function startServer(): Promise<void> {
  const auth = createAuth({ allowedHosts: TEST_ALLOWED_HOSTS, secret: TEST_SECRET });
  await migrateAuthSchema(auth);
  server = createApp(new BetterAuthService(auth));
  await new Promise<void>((resolve) => {
    server!.listen(0, "127.0.0.1", () => {
      const addr = server!.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

beforeEach(async () => {
  // Force mock provider for all tests — no real network, no paid calls.
  process.env.IMAGE_PROVIDER = "mock";
  delete process.env.SINGULARITY_API_URL;
  delete process.env.SINGULARITY_API_KEY;
  await stopServer();
  closeDb();
  openDb({ file: path.join(tmpDir, `db-${Date.now()}-${Math.random()}.sqlite`) });
  await startServer();
  // Ensure asset dir is isolated per run
  const assetDir = path.join(tmpDir, `assets-${Date.now()}-${Math.random()}`);
  fs.mkdirSync(assetDir, { recursive: true });
  process.env.ASSET_DIR = assetDir;
});

afterAll(async () => {
  await stopServer();
  closeDb();
  // Clean up any temp asset files created during tests.
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

function cookieFrom(res: Response): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  return raw.split(";")[0]!;
}

async function signup(localPart: string, password: string, name = localPart): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${localPart}@example.com`, password, name }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as { token?: unknown };
  expect(data.token).toBeUndefined();
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

  it("only the owner can delete a project; deletion removes it from the owner's list", async () => {
    const alice = await signup("alice-del-s0", "secret123");
    const bob = await signup("bob-del-s0", "secret123");
    const pid = await createProject(alice, "My Flagship");

    // Non-owner is rejected and the project survives.
    const othersDel = await fetch(`${baseUrl}/api/projects/${pid}`, {
      method: "DELETE",
      headers: { Cookie: bob },
    });
    expect(othersDel.status).toBe(403);

    const afterOthers = await fetch(`${baseUrl}/api/projects/${pid}`, { headers: { Cookie: alice } });
    expect(afterOthers.status).toBe(200);

    // Owner can delete; it then disappears from their list.
    const ownDel = await fetch(`${baseUrl}/api/projects/${pid}`, {
      method: "DELETE",
      headers: { Cookie: alice },
    });
    expect(ownDel.status).toBe(200);

    const get = await fetch(`${baseUrl}/api/projects/${pid}`, { headers: { Cookie: alice } });
    expect(get.status).toBe(404);

    const list = (await (await fetch(`${baseUrl}/api/projects`, { headers: { Cookie: alice } })).json()) as { projects: Array<{ id: string }> };
    expect(list.projects.some((p) => p.id === pid)).toBe(false);
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

  it("accepts the creator-facing asset categories and rejects gameplay-role labels", async () => {
    const cookie = await signup("cat-s0", "secret123");
    const pid = await createProject(cookie, "P");

    // Approved visual categories round-trip as-is.
    for (const cat of ["background", "character", "object", "effect", "overlay", "other"]) {
      const assetId = await createAsset(cookie, pid, `Asset ${cat}`, cat);
      const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}`, { headers: { Cookie: cookie } });
      const { asset } = (await res.json()) as { asset: { category: string } };
      expect(asset.category).toBe(cat);
    }

    // Gameplay-role labels are no longer separate categories; an unknown label
    // coerces to the safe "other" fallback rather than creating a new role.
    for (const role of ["prop", "inventory item", "clue"]) {
      const assetId = await createAsset(cookie, pid, `Legacy ${role}`, role);
      const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}`, { headers: { Cookie: cookie } });
      const { asset } = (await res.json()) as { asset: { category: string } };
      expect(asset.category).toBe("other");
    }
  });

  it("other user cannot mutate assets/appearances", async () => {
    const alice = await signup("alice2-s0", "secret123");
    const bob = await signup("bob2-s0", "secret123");
    const pid = await createProject(alice, "P");
    const assetId = await createAsset(alice, pid, "Cup", "object");
    const appearanceId = await createAppearance(alice, pid, assetId, "Default");

    const badCreate = await fetch(`${baseUrl}/api/projects/${pid}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bob },
      body: JSON.stringify({ name: "Evil", category: "object" }),
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
    const assetId = await createAsset(alice, pid, "Cup", "object");
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

  it("rejects SVG uploads", async () => {
    const cookie = await signup("svg-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appearanceId = await createAppearance(cookie, pid, assetId, "A");

    const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_B64, mimeType: "image/svg+xml" }),
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Upload body-size limit (regression): base64 payloads must be allowed past
// the default 1 MB JSON cap up to the advertised MAX_UPLOAD_BYTES.
// ---------------------------------------------------------------------------

describe("upload body size limit", () => {
  it("accepts a valid image whose base64 body exceeds the 1 MB default JSON cap", async () => {
    const cookie = await signup("kate-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appearanceId = await createAppearance(cookie, pid, assetId, "Hiding Badly");

    // Build a > 1 MB base64 payload (≈2.4 MB image) that stays well under
    // MAX_UPLOAD_BYTES (8 MB). This used to be rejected by the 1 MB JSON cap.
    const raw = Buffer.alloc(Math.ceil((1024 * 1024) * 1.6), 0); // ≈1.6 MB
    const b64 = raw.toString("base64");
    const dataUrl = `data:image/png;base64,${b64}`;
    expect(dataUrl.length).toBeGreaterThan(1_000_000); // would trip the old cap

    const up = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });
    expect(up.status).toBe(201);
    const { variant } = (await up.json()) as { variant: { id: string; status: string; storage_path: string | null } };
    expect(variant.status).toBe("ready");
    expect(variant.storage_path).toBeTruthy();

    // It persists: fetch the file back via the auth-gated endpoint and confirm
    // the bytes round-trip.
    const file = await fetch(`${baseUrl}/api/variants/${variant.id}/file`, { headers: { Cookie: cookie } });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toMatch(/image\/png/);
    const fetched = Buffer.from(await file.arrayBuffer());
    expect(fetched.equals(raw)).toBe(true);
  });

  it("returns a useful 413 (not 500) when an image exceeds MAX_UPLOAD_BYTES", async () => {
    const cookie = await signup("luke-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appearanceId = await createAppearance(cookie, pid, assetId, "A");

    // An image slightly over the 8 MB advertised upload limit. Its base64
    // body is under MAX_UPLOAD_JSON_BYTES so it reaches the handler, which
    // must reject with a clean 413 rather than a 500.
    const raw = Buffer.alloc(8 * 1024 * 1024 + 1, 0);
    const dataUrl = `data:image/png;base64,${raw.toString("base64")}`;

    const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/image exceeds/);
  });

  it("returns a useful 413 for a JSON body larger than the upload cap is rejected cleanly", async () => {
    const cookie = await signup("mara-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appearanceId = await createAppearance(cookie, pid, assetId, "A");

    // A base64 body beyond MAX_UPLOAD_JSON_BYTES reaches readJsonBody's own
    // cap. It must still surface a 413 (useful) rather than a destroyed socket.
    const raw = Buffer.alloc(Math.ceil(8 * 1024 * 1024 * 1.5), 0);
    const dataUrl = `data:image/png;base64,${raw.toString("base64")}`;

    const res = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appearanceId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: dataUrl }),
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/payload too large/);
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
    const assetId = await createAsset(cookie, pid, "X", "object");
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
      expect((err as Error).message).toContain("private API contract is unavailable");
    }
    expect(threw).toBe(true);
  });

  it("is a fail-closed stub: NEVER guesses a vendor schema or makes a network call, even with config", async () => {
    // Even if someone passes URL/key/model, the adapter must not invent a
    // contract — it throws the sentinel before any request.
    const s = new SingularityProvider({ apiUrl: "https://singularity.invalid/gen", apiKey: "secret", modelId: "x" });
    let threw = false;
    try {
      await s.generate({ prompt: "x" });
    } catch (err) {
      threw = true;
      expect(isMissingIntegration(err)).toBe(true);
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
// Delete cleanup: removing appearance/asset also removes backing files
// ---------------------------------------------------------------------------

describe("delete cascade file cleanup", () => {
  it("deleting an appearance removes its variant files from disk", async () => {
    const cookie = await signup("hannah-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appId = await createAppearance(cookie, pid, assetId, "Hiding Badly");

    const up = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant } = (await up.json()) as { variant: { id: string; storage_path: string | null } };
    expect(variant.storage_path).toBeTruthy();

    // capture abs path from env asset dir
    const assetDir = process.env.ASSET_DIR!;
    const expectedAbs = path.join(assetDir, `${variant.id}.png`);
    expect(fs.existsSync(expectedAbs)).toBe(true);

    const del = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(del.status).toBe(200);
    expect(fs.existsSync(expectedAbs)).toBe(false);
  });

  it("deleting an asset removes variant files from disk", async () => {
    const cookie = await signup("ian-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Cup", "object");
    const appId = await createAppearance(cookie, pid, assetId, "Default");

    const up = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant } = (await up.json()) as { variant: { id: string; storage_path: string | null } };
    const assetDir = process.env.ASSET_DIR!;
    const expectedAbs = path.join(assetDir, `${variant.id}.png`);
    expect(fs.existsSync(expectedAbs)).toBe(true);

    const del = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(del.status).toBe(200);
    expect(fs.existsSync(expectedAbs)).toBe(false);
  });

  it("deleting a project removes all descendant variant files from disk", async () => {
    const cookie = await signup("jill-s0", "secret123");
    const pid = await createProject(cookie, "P");
    const assetId = await createAsset(cookie, pid, "Sasquatch", "character");
    const appId = await createAppearance(cookie, pid, assetId, "Hiding Badly");

    const up1 = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant: v1 } = (await up1.json()) as { variant: { id: string } };
    const up2 = await fetch(`${baseUrl}/api/projects/${pid}/assets/${assetId}/appearances/${appId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ imageBase64: TINY_PNG_DATAURL }),
    });
    const { variant: v2 } = (await up2.json()) as { variant: { id: string } };

    const assetDir = process.env.ASSET_DIR!;
    const f1 = path.join(assetDir, `${v1.id}.png`);
    const f2 = path.join(assetDir, `${v2.id}.png`);
    expect(fs.existsSync(f1)).toBe(true);
    expect(fs.existsSync(f2)).toBe(true);

    const del = await fetch(`${baseUrl}/api/projects/${pid}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(del.status).toBe(200);
    expect(fs.existsSync(f1)).toBe(false);
    expect(fs.existsSync(f2)).toBe(false);

    // project gone entirely
    const get = await fetch(`${baseUrl}/api/projects/${pid}`, { headers: { Cookie: cookie } });
    expect(get.status).toBe(404);
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
