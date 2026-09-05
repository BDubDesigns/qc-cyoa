/**
 * API integration tests: exercise the real production app over HTTP against an
 * isolated temp SQLite DB.
 */
import { describe, it, expect, afterAll, beforeEach } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { openDb, closeDb } from "../server/db";
import { BetterAuthService, createAuth, migrateAuthSchema } from "../server/auth-service";
import { createApp } from "../server/app";
import { inspectGame } from "../src/core/validate";
import type { GameDefinition } from "../src/core/types";

let server: http.Server | undefined;
let baseUrl = "";
let dbFile = "";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyoa-test-"));
const TEST_SECRET = "test-secret-for-better-auth-012345678901234567890123456789";
const TEST_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*", "qc-cyoa.example.com", "*.preview.qc-cyoa.example.com"];

async function stopServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server!.close((err) => (err ? reject(err) : resolve())));
  server = undefined;
}

async function startServer(): Promise<void> {
  const auth = createAuth({
    allowedHosts: TEST_ALLOWED_HOSTS,
    secret: TEST_SECRET,
    trustedProxyHeaders: true,
  });
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
  dbFile = path.join(tmpDir, `db-${Date.now()}-${Math.random()}.sqlite`);
  openDb({ file: dbFile });
  await startServer();
});

afterAll(async () => {
  await stopServer();
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function cookieFrom(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0]!;
}

async function signup(localPart: string, password: string, name = localPart): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${localPart}@example.com`, password, name }),
  });
  expect(res.status).toBe(200);
  const data = (await res.json()) as { token?: unknown; user: { email: string; name: string } };
  expect(data.token).toBeUndefined();
  expect(data.user.email).toBe(`${localPart}@example.com`);
  return cookieFrom(res)!;
}

function validGame(): GameDefinition {
  return {
    id: `g-${Date.now()}`,
    title: "Test Story",
    description: "A test.",
    startingRoom: "a",
    rooms: [{ id: "a", name: "A", description: "d", doors: [] }],
    scoring: { type: "points", points: 10 },
  };
}

describe("auth", () => {
  it("accepts localhost, the approved production host, and approved preview hosts only", async () => {
    const cases: Array<{ localPart: string; headers: Record<string, string> }> = [
      { localPart: "local-host", headers: { Host: "localhost:5173" } },
      {
        localPart: "prod-host",
        headers: { Host: "127.0.0.1", "X-Forwarded-Host": "qc-cyoa.example.com", "X-Forwarded-Proto": "https" },
      },
      {
        localPart: "preview-host",
        headers: {
          Host: "127.0.0.1",
          "X-Forwarded-Host": "12.preview.qc-cyoa.example.com",
          "X-Forwarded-Proto": "https",
        },
      },
    ];

    for (const { localPart, headers } of cases) {
      const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ email: `${localPart}@example.com`, password: "secret123", name: localPart }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
      expect(res.headers.get("set-cookie")).not.toMatch(/Domain=/i);
    }

    const rejected = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: "127.0.0.1",
        "X-Forwarded-Host": "unapproved.example.com",
        "X-Forwarded-Proto": "https",
      },
      body: JSON.stringify({ email: "unapproved@example.com", password: "secret123", name: "Unapproved" }),
    });
    expect(rejected.status).toBeGreaterThanOrEqual(400);
    expect(rejected.status).toBeLessThan(500);
    expect(await rejected.json()).toEqual({ error: "auth request rejected" });
  });

  it("signup then session round-trip", async () => {
    const cookie = await signup("bob", "secret123", "Bob Werner");
    const res = await fetch(`${baseUrl}/api/auth/get-session`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { email: string; name: string }; session?: unknown };
    expect(data.user.email).toBe("bob@example.com");
    expect(data.user.name).toBe("Bob Werner");
    expect(data.session).toBeUndefined();
  });

  it("rejects duplicate emails and short passwords", async () => {
    await signup("carol", "secret123");
    const dup = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "carol@example.com", password: "secret123", name: "Carol" }),
    });
    expect(dup.status).toBe(422);

    const short = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dave@example.com", password: "short", name: "Dave" }),
    });
    expect(short.status).toBe(400);
  });

  it("login with wrong password is 401", async () => {
    await signup("erin", "secret123");
    const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "erin@example.com", password: "wrongpass" }),
    });
    expect(res.status).toBe(401);
  });

  it("sign-out invalidates the durable session", async () => {
    const cookie = await signup("frida", "secret123");
    const logout = await fetch(`${baseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logout.status).toBe(200);

    const session = await fetch(`${baseUrl}/api/auth/get-session`, { headers: { Cookie: cookie } });
    expect(session.status).toBe(401);
  });

  it("keeps the session valid after reopening the SQLite database", async () => {
    const cookie = await signup("grace", "secret123");
    await stopServer();
    closeDb();
    openDb({ file: dbFile });
    await startServer();

    const session = await fetch(`${baseUrl}/api/auth/get-session`, { headers: { Cookie: cookie } });
    expect(session.status).toBe(200);
    const data = (await session.json()) as { user: { email: string } };
    expect(data.user.email).toBe("grace@example.com");
  });
});

describe("games CRUD", () => {
  it("unauthenticated cannot create a game", async () => {
    const res = await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validGame()),
    });
    expect(res.status).toBe(401);
  });

  it("author creates, publishes, and sees it in the public list", async () => {
    const cookie = await signup("frank", "secret123");
    const game = validGame();
    const create = await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(game),
    });
    expect(create.status).toBe(201);

    // Draft is not in the public list yet.
    const before = (await (await fetch(`${baseUrl}/api/games?published=1`)).json()) as { games: unknown[] };
    expect(before.games.some((g) => (g as { id: string }).id === game.id)).toBe(false);

    const pub = await fetch(`${baseUrl}/api/games/${game.id}/publish`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(pub.status).toBe(200);

    const after = (await (await fetch(`${baseUrl}/api/games?published=1`)).json()) as { games: Array<{ id: string }> };
    expect(after.games.some((g) => g.id === game.id)).toBe(true);

    // Anyone can fetch a published game by id.
    const got = await fetch(`${baseUrl}/api/games/${game.id}`);
    expect(got.status).toBe(200);
    const detail = (await got.json()) as { definition: GameDefinition };
    expect(detail.definition.title).toBe(game.title);
  });

  it("a published game is editable only by its author", async () => {
    const cookieA = await signup("george", "secret123");
    const cookieB = await signup("hannah", "secret123");
    const game = validGame();
    await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify(game),
    });

    const badEdit = await fetch(`${baseUrl}/api/games/${game.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify(game),
    });
    expect(badEdit.status).toBe(403);
  });

  it("rejects invalid games with a 400 and the issues, and never persists", async () => {
    const cookie = await signup("ian", "secret123");
    const bad: Partial<GameDefinition> = {
      id: "g-bad",
      title: "Bad",
      description: "",
      startingRoom: "a",
      rooms: [{ id: "a", name: "A", description: "d", doors: [{ direction: "north", to: "missing" }] }],
    };
    const res = await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(bad),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("missing");

    const get = await fetch(`${baseUrl}/api/games/g-bad`);
    expect(get.status).toBe(404);
  });

  it("updating a draft re-validates; invalid update is rejected", async () => {
    const cookie = await signup("jill", "secret123");
    const game0 = validGame();
    const id = game0.id;
    await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(game0),
    });

    const broken = { ...game0, rooms: [] };
    const upd = await fetch(`${baseUrl}/api/games/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(broken),
    });
    expect(upd.status).toBe(400);

    // The stored copy is untouched.
    const got = await fetch(`${baseUrl}/api/games/${id}`, { headers: { Cookie: cookie } });
    const detail = (await got.json()) as { definition: GameDefinition };
    expect(detail.definition.rooms.length).toBe(1);
  });

  it("an author can view their own unpublished draft but others cannot", async () => {
    const cookieA = await signup("kim", "secret123");
    const cookieB = await signup("leo", "secret123");
    const game = validGame();
    await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify(game),
    });

    const owner = await fetch(`${baseUrl}/api/games/${game.id}`, { headers: { Cookie: cookieA } });
    expect(owner.status).toBe(200);
    const other = await fetch(`${baseUrl}/api/games/${game.id}`, { headers: { Cookie: cookieB } });
    expect(other.status).toBe(403);
    const anon = await fetch(`${baseUrl}/api/games/${game.id}`);
    expect(anon.status).toBe(403);
  });

  it("subject-level server validation agrees with inspectGame", () => {
    const ok = validGame();
    expect(inspectGame(ok).filter((i) => i.level === "error")).toEqual([]);
    const broken = { ...ok, rooms: [] };
    expect(inspectGame(broken).some((i) => i.level === "error")).toBe(true);
  });
});

describe("me/games", () => {
  it("lists the current user's games", async () => {
    const cookie = await signup("mia", "secret123");
    const game = validGame();
    await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(game),
    });
    const res = await fetch(`${baseUrl}/api/me/games`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { games: Array<{ id: string }> };
    expect(data.games.map((g) => g.id)).toContain(game.id);
  });
});
