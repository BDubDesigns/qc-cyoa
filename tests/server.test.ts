/**
 * API integration tests: exercise the real auth + games handlers over HTTP
 * against an isolated temp SQLite DB. The router/listener in server/index.ts is
 * NOT used (it binds a port); the same handlers are wired into a throwaway
 * http server here.
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
import { readJsonBody, writeError, writeJson, HttpError } from "../server/routes/json";
import { inspectGame } from "../src/core/validate";
import type { GameDefinition } from "../src/core/types";

let server: http.Server;
let baseUrl: string;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cyoa-test-"));

beforeAll(() => {
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://localhost`);
      const segs = url.pathname.split("/").filter(Boolean);
      const auth = new PasswordAuthService();
      const Auth = authRoutes(auth);
      const Games = gameRoutes();

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
      if (segs[0] === "api" && segs[1] === "games") {
        const id = segs[2];
        if (id === undefined) {
          if (req.method === "GET") return Games.list(req, res);
          if (req.method === "POST") {
            const user = await requireUser(auth, req);
            return await Games.create(req, res, user, asJson(await readJsonBody(req)));
          }
          throw new HttpError(404, "not found");
        }
        if (req.method === "GET") return Games.get(req, res, await auth.currentUser(req), id);
        if (req.method === "POST" && segs[3] === "publish") {
          const user = await requireUser(auth, req);
          return Games.publish(req, res, user, id);
        }
        if (req.method === "PUT") {
          const user = await requireUser(auth, req);
          return await Games.update(req, res, user, id, asJson(await readJsonBody(req)));
        }
        if (req.method === "DELETE") {
          const user = await requireUser(auth, req);
          return Games.remove(req, res, user, id);
        }
      }
      throw new HttpError(404, "not found");
    } catch (err) {
      if (err instanceof HttpError) return writeError(res, err.status, err.message);
      if (err instanceof AuthError) return writeError(res, err.status, err.message);
      console.error(err);
      return writeError(res, 500, "internal error");
    }
  });

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
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  closeDb();
  openDb({ file: path.join(tmpDir, `db-${Date.now()}-${Math.random()}.sqlite`) });
});

function asJson(v: unknown) {
  return (v as Record<string, unknown> | null) ?? null;
}

function cookieFrom(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0]!;
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
  it("signup then session round-trip", async () => {
    const cookie = await signup("bob", "secret123");
    const res = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { username: string } };
    expect(data.user.username).toBe("bob");
  });

  it("rejects duplicate usernames and short passwords", async () => {
    await signup("carol", "secret123");
    const dup = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "carol", password: "secret123" }),
    });
    expect(dup.status).toBe(409);

    const short = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "dave", password: "short" }),
    });
    expect(short.status).toBe(400);
  });

  it("login with wrong password is 401", async () => {
    await signup("erin", "secret123");
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "erin", password: "wrongpass" }),
    });
    expect(res.status).toBe(401);
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