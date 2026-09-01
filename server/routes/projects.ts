/**
 * /api/projects — project CRUD with ownership.
 *
 * Minimal fields per Issue #5: id, owner_id, title, created_at, updated_at.
 * Optional description kept for UX. Only owner may read/update/delete.
 */
import * as crypto from "node:crypto";
import { getDb } from "../db";
import { HttpError, writeJson, type JsonBody } from "./json";
import type { UserLike } from "./games";
import { unlinkVariantsFor } from "../storage";

export interface ProjectHandlers {
  list: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike) => void;
  get: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, id: string) => void;
  create: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, body: JsonBody) => void;
  update: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, id: string, body: JsonBody) => void;
  remove: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, id: string) => void;
}

export function projectRoutes(): ProjectHandlers {
  return {
    list(_req, res, user) {
      const db = getDb();
      const rows = db
        .prepare("SELECT id, owner_id, title, description, created_at, updated_at FROM projects WHERE owner_id = ? ORDER BY updated_at DESC")
        .all(user.id) as Array<{ id: string; owner_id: string; title: string; description: string; created_at: number; updated_at: number }>;
      writeJson(res, 200, { projects: rows.map(toProject) });
    },

    get(_req, res, user, id) {
      const row = loadProjectOrThrow(id, user);
      writeJson(res, 200, { project: toProject(row) });
    },

    create(_req, res, user, body) {
      const { title, description } = readProjectBody(body);
      const id = crypto.randomUUID();
      const now = Date.now();
      getDb()
        .prepare("INSERT INTO projects (id, owner_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, user.id, title, description, now, now);
      writeJson(res, 201, { id, project: { id, owner_id: user.id, title, description, created_at: now, updated_at: now } });
    },

    update(_req, res, user, id, body) {
      loadProjectOrThrow(id, user);
      const { title, description } = readProjectBody(body);
      const now = Date.now();
      getDb().prepare("UPDATE projects SET title = ?, description = ?, updated_at = ? WHERE id = ?").run(title, description, now, id);
      const row = getDb().prepare("SELECT id, owner_id, title, description, created_at, updated_at FROM projects WHERE id = ?").get(id) as {
        id: string; owner_id: string; title: string; description: string; created_at: number; updated_at: number;
      };
      writeJson(res, 200, { project: toProject(row) });
    },

    remove(_req, res, user, id) {
      loadProjectOrThrow(id, user);
      // unlink every descendant variant file before the DB cascade removes rows
      unlinkVariantsFor(
        "SELECT id FROM asset_appearances WHERE asset_id IN (SELECT id FROM assets WHERE project_id = ?)",
        id,
      );
      getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
      writeJson(res, 200, { ok: true });
    },
  };
}

export function loadProjectOrThrow(projectId: string, user: UserLike): { id: string; owner_id: string; title: string; description: string; created_at: number; updated_at: number } {
  const db = getDb();
  const row = db.prepare("SELECT id, owner_id, title, description, created_at, updated_at FROM projects WHERE id = ?").get(projectId) as
    | { id: string; owner_id: string; title: string; description: string; created_at: number; updated_at: number }
    | undefined;
  if (!row) throw new HttpError(404, "project not found");
  if (row.owner_id !== user.id) throw new HttpError(403, "you can only access your own project");
  return row;
}

function readProjectBody(body: JsonBody): { title: string; description: string } {
  if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
  const title = typeof body["title"] === "string" ? (body["title"] as string).trim() : "";
  if (!title) throw new HttpError(400, "title is required");
  if (title.length > 200) throw new HttpError(400, "title must be 200 characters or fewer");
  const description = typeof body["description"] === "string" ? (body["description"] as string).trim() : "";
  if (description.length > 5000) throw new HttpError(400, "description must be 5000 characters or fewer");
  return { title, description };
}

function toProject(r: { id: string; owner_id: string; title: string; description: string; created_at: number; updated_at: number }) {
  return {
    id: r.id,
    owner_id: r.owner_id,
    title: r.title,
    description: r.description,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}
