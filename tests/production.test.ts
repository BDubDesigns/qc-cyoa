/**
 * Production serving tests (Issue #11): the one-process runtime serves the
 * Vite-built `dist/` frontend, falls back to `index.html` for SPA routes,
 * keeps unknown `/api/*` paths as API-JSON 404s, and keeps `/api/health`.
 *
 * Uses a fixture dist dir plus the real production router — no build needed.
 */
import { describe, it, expect, afterAll, beforeEach } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { openDb, closeDb } from "../server/db";
import { BetterAuthService, createAuth, migrateAuthSchema } from "../server/auth-service";
import { createApp } from "../server/app";

let server: http.Server | undefined;
let baseUrl = "";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyoa-prod-"));
const distDir = path.join(tmpDir, "dist");
const TEST_SECRET = "test-secret-for-production-serving-01234567890123456789012345";
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
  await stopServer();
  closeDb();
  openDb({ file: path.join(tmpDir, `db-${Date.now()}-${Math.random()}.sqlite`) });

  // Minimal fake production bundle: index + one hashed asset.
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body><div id=root></div></body></html>");
  fs.writeFileSync(path.join(distDir, "assets", "app-abc123.js"), "console.log('app');");
  fs.writeFileSync(path.join(distDir, "assets", "styles-def456.css"), "body{color:red}");
  process.env.DIST_DIR = distDir;

  await startServer();
});

afterAll(async () => {
  await stopServer();
  closeDb();
  delete process.env.DIST_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("production one-process serving", () => {
  it("serves /api/health alongside the frontend", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("serves the built index.html at /", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain('<div id=root>');
  });

  it("serves hashed assets with immutable caching", async () => {
    const js = await fetch(`${baseUrl}/assets/app-abc123.js`);
    expect(js.status).toBe(200);
    expect(js.headers.get("content-type")).toContain("javascript");
    expect(js.headers.get("cache-control")).toContain("immutable");
    expect(await js.text()).toContain("console.log");

    const css = await fetch(`${baseUrl}/assets/styles-def456.css`);
    expect(css.status).toBe(200);
    expect(css.headers.get("content-type")).toContain("text/css");
  });

  it("falls back to index.html for SPA routes so refresh works", async () => {
    for (const route of ["/project?project=x", "/projects", "/studio/game/abc"]) {
      const res = await fetch(`${baseUrl}${route}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain('<div id=root>');
    }
  });

  it("keeps unknown /api/* paths as API-JSON 404s, not the SPA", async () => {
    for (const p of ["/api/nope", "/api/definitely-missing", "/api/v1/health"]) {
      const res = await fetch(`${baseUrl}${p}`);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toEqual({ error: "not found" });
    }
    // Existing resource routes keep their own API-JSON errors (also never the SPA).
    const game404 = await fetch(`${baseUrl}/api/games/no-such-game`);
    expect(game404.status).toBe(404);
    expect(game404.headers.get("content-type")).toContain("application/json");
    const body = (await game404.json()) as { error: string };
    expect(typeof body.error).toBe("string");
  });

  it("never serves files outside dist (traversal resolves inside, never leaks)", async () => {
    const res = await fetch(`${baseUrl}/..%2f..%2fetc%2fpasswd`);
    const text = await res.text();
    // Either a 404 or the SPA fallback — but never /etc/passwd bytes.
    expect(text).not.toContain("root:x:0:0");
    expect(text).not.toContain("root:");
    if (res.status === 200) expect(text).toContain("<div id=root>");
    else expect(res.status).toBe(404);
  });

  it("returns a plain 404 (not the SPA) when no bundle is built", async () => {
    fs.rmSync(distDir, { recursive: true, force: true });
    const res = await fetch(`${baseUrl}/projects`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });
});
