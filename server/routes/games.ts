/**
 * /api/games CRUD. Every write validates the submitted GameDefinition with the
 * SAME `validateGame` the frontend uses, so invalid content never persists.
 * Ownership: only the author may update/publish/delete a game.
 */
import * as http from "node:http";
import { getDb, type GameRow } from "../db";
import { inspectGame } from "../../src/core/validate";
import type { GameDefinition } from "../../src/core/types";
import { HttpError, writeJson, type JsonBody } from "./json";
import type { AuthService } from "../auth-service";

const MAX_GAME_BYTES = 1_000_000;

export interface GameHandlers {
  list: (req: http.IncomingMessage, res: http.ServerResponse) => void;
  get: (req: http.IncomingMessage, res: http.ServerResponse, user: UserLike | null, id: string) => void;
  create: (req: http.IncomingMessage, res: http.ServerResponse, user: UserLike, body: JsonBody) => Promise<void>;
  update: (req: http.IncomingMessage, res: http.ServerResponse, user: UserLike, id: string, body: JsonBody) => Promise<void>;
  publish: (req: http.IncomingMessage, res: http.ServerResponse, user: UserLike, id: string) => void;
  remove: (req: http.IncomingMessage, res: http.ServerResponse, user: UserLike, id: string) => void;
  mine: (req: http.IncomingMessage, res: http.ServerResponse, user: UserLike) => void;
}

export interface UserLike {
  id: string;
  username: string;
}

export function gameRoutes(): GameHandlers {
  return {
    /** GET /api/games?published=1 -> public published list. */
    list(_req, res) {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT id, author_id, title, description, tags, is_published, created_at, updated_at
           FROM games WHERE is_published = 1 ORDER BY updated_at DESC`,
        )
        .all() as Array<
        Pick<GameRow, "id" | "author_id" | "title" | "description" | "tags" | "is_published" | "created_at" | "updated_at">
      >;
      writeJson(res, 200, { games: rows.map(toSummary) });
    },

    /** GET /api/games/:id -> one game (published, or own draft). */
    get(_req, res, user, id) {
      const db = getDb();
      const row = db.prepare("SELECT * FROM games WHERE id = ?").get(id) as GameRow | undefined;
      if (!row) throw new HttpError(404, "game not found");
      if (row.is_published === 0 && row.author_id !== user?.id) {
        throw new HttpError(403, "this draft is not public");
      }
      writeJson(res, 200, toGame(row, user));
    },

    /** POST /api/games -> create a draft (auth). */
    async create(_req, res, user, body) {
      const game = readGameDefinition(body);
      const db = getDb();
      const existing = db.prepare("SELECT id FROM games WHERE id = ?").get(game.id);
      if (existing) throw new HttpError(409, `game id "${game.id}" already exists`);
      const now = Date.now();
      db.prepare(
        `INSERT INTO games (id, author_id, title, description, tags, json, is_published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).run(
        game.id,
        user.id,
        game.title,
        game.description ?? "",
        JSON.stringify(game.tags ?? []),
        JSON.stringify(game),
        now,
        now,
      );
      writeJson(res, 201, { id: game.id });
    },

    /** PUT /api/games/:id -> update (own only). */
    async update(_req, res, user, id, body) {
      const game = readGameDefinition(body);
      const db = getDb();
      const row = db.prepare("SELECT id, author_id FROM games WHERE id = ?").get(id) as
        | { id: string; author_id: string }
        | undefined;
      if (!row) throw new HttpError(404, "game not found");
      if (row.author_id !== user.id) throw new HttpError(403, "you can only edit your own game");
      const now = Date.now();
      db.prepare(
        `UPDATE games SET json = ?, title = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?`,
      ).run(
        JSON.stringify(game),
        game.title,
        game.description ?? "",
        JSON.stringify(game.tags ?? []),
        now,
        id,
      );
      writeJson(res, 200, { ok: true });
    },

    /** POST /api/games/:id/publish -> own only. */
    publish(_req, res, user, id) {
      const db = getDb();
      const row = db.prepare("SELECT id, author_id, json FROM games WHERE id = ?").get(id) as
        | { id: string; author_id: string; json: string }
        | undefined;
      if (!row) throw new HttpError(404, "game not found");
      if (row.author_id !== user.id) throw new HttpError(403, "you can only publish your own game");
      // Re-validate before publishing so a stale/invalid stored draft can't be
      // flipped public.
      const game = JSON.parse(row.json) as GameDefinition;
      if (!isValidDefinition(game)) {
        throw new HttpError(400, "game is not valid; fix validation errors before publishing");
      }
      db.prepare("UPDATE games SET is_published = 1, updated_at = ? WHERE id = ?").run(Date.now(), id);
      writeJson(res, 200, { ok: true });
    },

    /** DELETE /api/games/:id -> own only. */
    remove(_req, res, user, id) {
      const db = getDb();
      const row = db.prepare("SELECT id, author_id FROM games WHERE id = ?").get(id) as
        | { id: string; author_id: string }
        | undefined;
      if (!row) throw new HttpError(404, "game not found");
      if (row.author_id !== user.id) throw new HttpError(403, "you can only delete your own game");
      db.prepare("DELETE FROM games WHERE id = ?").run(id);
      writeJson(res, 200, { ok: true });
    },

    /** GET /api/me/games -> my drafts + published (auth). */
    mine(_req, res, user) {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT id, author_id, title, description, tags, is_published, created_at, updated_at
           FROM games WHERE author_id = ? ORDER BY updated_at DESC`,
        )
        .all(user.id) as Array<
        Pick<GameRow, "id" | "author_id" | "title" | "description" | "tags" | "is_published" | "created_at" | "updated_at">
      >;
      writeJson(res, 200, { games: rows.map(toSummary) });
    },
  };
}

function readGameDefinition(body: JsonBody): GameDefinition {
  if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
  const candidate = body as unknown as GameDefinition;
  // Shape guard before validation to keep inspectGame from crashing on garbage.
  if (!candidate || typeof candidate !== "object") {
    throw new HttpError(400, "expected game to be an object");
  }
  const bytes = Buffer.byteLength(JSON.stringify(candidate));
  if (bytes > MAX_GAME_BYTES) throw new HttpError(413, "game exceeds 1 MB limit");
  const issues = inspectGame(candidate);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    throw new HttpError(400, errors.map((e) => e.message).join("; "));
  }
  return candidate;
}

function isValidDefinition(game: GameDefinition): boolean {
  try {
    return inspectGame(game).every((i) => i.level !== "error");
  } catch {
    return false;
  }
}

function toSummary(row: Pick<GameRow, "id" | "author_id" | "title" | "description" | "tags" | "is_published" | "created_at" | "updated_at">) {
  return {
    id: row.id,
    author_id: row.author_id,
    title: row.title,
    description: row.description,
    tags: safeParseArray(row.tags),
    is_published: row.is_published === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toGame(row: GameRow, user: UserLike | null) {
  return {
    id: row.id,
    author_id: row.author_id,
    is_published: row.is_published === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    definition: JSON.parse(row.json) as GameDefinition,
    editable: user?.id === row.author_id,
  };
}

function safeParseArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export async function requireUser(auth: AuthService, req: http.IncomingMessage): Promise<UserLike> {
  const user = await auth.currentUser(req);
  if (!user) throw new HttpError(401, "authentication required");
  return user;
}