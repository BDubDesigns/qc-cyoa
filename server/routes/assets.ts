/**
 * /api/projects/:projectId/assets + appearances + variants + generate/upload
 *
 * Enforces project ownership on every write, keeps secrets server-side,
 * and stores provenance. Upload and generation both create a new
 * `asset_variants` row — never overwrite previous attempts.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import { getDb } from "../db";
import { HttpError, writeJson, type JsonBody } from "./json";
import type { UserLike } from "./games";
import { loadProjectOrThrow } from "./projects";
import {
  ALLOWED_UPLOAD_MIMES,
  MAX_UPLOAD_BYTES,
  extForMime,
  variantFilePath,
  writeVariantFile,
  assetDir,
} from "../storage";
import { resolveProvider, isMissingIntegration } from "../image-provider";
import * as path from "node:path";

export const ASSET_CATEGORIES = new Set(["background", "character", "prop", "inventory item", "clue", "effect", "overlay", "other"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertOwnerForAsset(projectId: string, assetId: string, user: UserLike): { assetId: string; projectId: string } {
  const db = getDb();
  // project check first for proper 403/404
  loadProjectOrThrow(projectId, user);
  const row = db.prepare("SELECT id, project_id FROM assets WHERE id = ?").get(assetId) as
    | { id: string; project_id: string }
    | undefined;
  if (!row) throw new HttpError(404, "asset not found");
  if (row.project_id !== projectId) throw new HttpError(404, "asset not found");
  return { assetId: row.id, projectId };
}

/** Best-effort unlink of a stored variant file, contained to the asset dir. */
function unlinkVariantFile(storagePath: string | null): void {
  if (!storagePath) return;
  try {
    const abs = path.resolve(storagePath);
    if (abs.startsWith(assetDir())) fs.unlinkSync(abs);
  } catch {
    // ignore
  }
}

/**
 * Collect every variant storage_path under a given appearance or asset and
 * unlink those files best-effort. Used before DELETE so DB cascade doesn't
 * orphan files on disk.
 */
function unlinkVariantsFor(query: string, param: string): void {
  const rows = getDb()
    .prepare(`SELECT storage_path FROM asset_variants WHERE appearance_id IN (${query})`)
    .all(param) as Array<{ storage_path: string | null }>;
  for (const r of rows) unlinkVariantFile(r.storage_path);
}

function assertOwnerForAppearance(
  projectId: string,
  assetId: string,
  appearanceId: string,
  user: UserLike,
) {
  assertOwnerForAsset(projectId, assetId, user);
  const db = getDb();
  const row = db
    .prepare("SELECT id, asset_id FROM asset_appearances WHERE id = ?")
    .get(appearanceId) as { id: string; asset_id: string } | undefined;
  if (!row) throw new HttpError(404, "appearance not found");
  if (row.asset_id !== assetId) throw new HttpError(404, "appearance not found");
  return row;
}

// ---------------------------------------------------------------------------
// Asset catalog helpers (used by inline handlers below)
// ---------------------------------------------------------------------------

function readAssetBody(body: JsonBody): { name: string; category: string; description: string } {
  if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
  const name = typeof body["name"] === "string" ? (body["name"] as string).trim() : "";
  if (!name) throw new HttpError(400, "name is required");
  if (name.length > 200) throw new HttpError(400, "name must be 200 characters or fewer");
  const rawCat = typeof body["category"] === "string" ? (body["category"] as string).trim().toLowerCase() : "other";
  const category = ASSET_CATEGORIES.has(rawCat) ? rawCat : "other";
  const description = typeof body["description"] === "string" ? ((body["description"] as string).trim().slice(0, 5000)) : "";
  return { name, category, description };
}

function readAppearanceBody(body: JsonBody): { name: string; description: string; sortOrder?: number } {
  if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
  const name = typeof body["name"] === "string" ? (body["name"] as string).trim() : "";
  if (!name) throw new HttpError(400, "appearance name is required");
  if (name.length > 200) throw new HttpError(400, "appearance name must be 200 characters or fewer");
  const description = typeof body["description"] === "string" ? ((body["description"] as string).trim().slice(0, 5000)) : "";
  let sortOrder: number | undefined;
  if (body["sortOrder"] !== undefined) {
    const n = Number(body["sortOrder"]);
    if (!Number.isFinite(n)) throw new HttpError(400, "sortOrder must be a number");
    sortOrder = Math.trunc(n);
  }
  return { name, description, sortOrder };
}

// ---------------------------------------------------------------------------
// Variant helpers
// ---------------------------------------------------------------------------

function variantToJson(row: Record<string, unknown>) {
  return {
    id: row["id"],
    appearance_id: row["appearance_id"],
    source_type: row["source_type"],
    status: row["status"],
    storage_path: row["storage_path"],
    mime_type: row["mime_type"],
    width: row["width"],
    height: row["height"],
    prompt: row["prompt"],
    provider_id: row["provider_id"],
    model_id: row["model_id"],
    generation_settings: row["generation_settings"] ? safeParse(row["generation_settings"] as string) : null,
    error_message: row["error_message"],
    created_at: row["created_at"],
    updated_at: row["updated_at"],
    // convenience URL for the browser to fetch the file
    file_url: row["storage_path"] ? `/api/variants/${row["id"]}/file` : null,
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

// ---------------------------------------------------------------------------
// Exported handlers — mounted in server/index.ts
// ---------------------------------------------------------------------------

export const assetHandlers = {
  // GET /api/projects/:projectId/assets
  list(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, projectId: string) {
    loadProjectOrThrow(projectId, user);
    const rows = getDb()
      .prepare("SELECT id, project_id, name, category, description, created_at, updated_at FROM assets WHERE project_id = ? ORDER BY updated_at DESC")
      .all(projectId) as Array<Record<string, unknown>>;
    writeJson(res, 200, { assets: rows });
  },

  // POST /api/projects/:projectId/assets
  create(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    body: JsonBody,
  ) {
    loadProjectOrThrow(projectId, user);
    const { name, category, description } = readAssetBody(body);
    const id = crypto.randomUUID();
    const now = Date.now();
    getDb()
      .prepare("INSERT INTO assets (id, project_id, name, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, projectId, name, category, description, now, now);
    getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);
    writeJson(res, 201, { id, asset: { id, project_id: projectId, name, category, description, created_at: now, updated_at: now } });
  },

  // GET /api/projects/:projectId/assets/:assetId
  get(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, projectId: string, assetId: string) {
    assertOwnerForAsset(projectId, assetId, user);
    const row = getDb().prepare("SELECT id, project_id, name, category, description, created_at, updated_at FROM assets WHERE id = ?").get(assetId) as
      | Record<string, unknown>
      | undefined;
    if (!row) throw new HttpError(404, "asset not found");
    writeJson(res, 200, { asset: row });
  },

  // PUT /api/projects/:projectId/assets/:assetId
  update(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    body: JsonBody,
  ) {
    assertOwnerForAsset(projectId, assetId, user);
    const { name, category, description } = readAssetBody(body);
    const now = Date.now();
    getDb().prepare("UPDATE assets SET name = ?, category = ?, description = ?, updated_at = ? WHERE id = ?").run(name, category, description, now, assetId);
    getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);
    const row = getDb().prepare("SELECT id, project_id, name, category, description, created_at, updated_at FROM assets WHERE id = ?").get(assetId) as Record<string, unknown>;
    writeJson(res, 200, { asset: row });
  },

  // DELETE /api/projects/:projectId/assets/:assetId
  remove(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, projectId: string, assetId: string) {
    assertOwnerForAsset(projectId, assetId, user);
    // unlink descendant variant files before cascade delete (all appearances under this asset)
    unlinkVariantsFor("SELECT id FROM asset_appearances WHERE asset_id = ?", assetId);
    getDb().prepare("DELETE FROM assets WHERE id = ?").run(assetId);
    getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(Date.now(), projectId);
    writeJson(res, 200, { ok: true });
  },
};

export const appearanceHandlers = {
  // GET /api/projects/:projectId/assets/:assetId/appearances
  list(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, projectId: string, assetId: string) {
    assertOwnerForAsset(projectId, assetId, user);
    const rows = getDb()
      .prepare(
        "SELECT id, asset_id, name, description, sort_order, active_variant_id, created_at, updated_at FROM asset_appearances WHERE asset_id = ? ORDER BY sort_order ASC, created_at ASC",
      )
      .all(assetId) as Array<Record<string, unknown>>;
    writeJson(res, 200, { appearances: rows });
  },

  // POST /api/projects/:projectId/assets/:assetId/appearances
  create(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    body: JsonBody,
  ) {
    assertOwnerForAsset(projectId, assetId, user);
    const { name, description, sortOrder } = readAppearanceBody(body);
    const db = getDb();
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM asset_appearances WHERE asset_id = ?").get(assetId) as { m: number };
    const order = sortOrder ?? (maxOrder.m + 1);
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare(
      "INSERT INTO asset_appearances (id, asset_id, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, assetId, name, description, order, now, now);
    db.prepare("UPDATE assets SET updated_at = ? WHERE id = ?").run(now, assetId);
    writeJson(res, 201, {
      id,
      appearance: { id, asset_id: assetId, name, description, sort_order: order, active_variant_id: null, created_at: now, updated_at: now },
    });
  },

  // PUT /api/projects/:projectId/assets/:assetId/appearances/:appearanceId
  update(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
    body: JsonBody,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    const { name, description, sortOrder } = readAppearanceBody(body);
    const now = Date.now();
    if (sortOrder !== undefined) {
      getDb()
        .prepare("UPDATE asset_appearances SET name = ?, description = ?, sort_order = ?, updated_at = ? WHERE id = ?")
        .run(name, description, sortOrder, now, appearanceId);
    } else {
      getDb().prepare("UPDATE asset_appearances SET name = ?, description = ?, updated_at = ? WHERE id = ?").run(name, description, now, appearanceId);
    }
    const row = getDb()
      .prepare("SELECT id, asset_id, name, description, sort_order, active_variant_id, created_at, updated_at FROM asset_appearances WHERE id = ?")
      .get(appearanceId) as Record<string, unknown>;
    writeJson(res, 200, { appearance: row });
  },

  // DELETE /api/projects/:projectId/assets/:assetId/appearances/:appearanceId
  remove(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    // unlink descendant variant files before cascade delete
    unlinkVariantsFor("SELECT id FROM asset_appearances WHERE id = ?", appearanceId);
    getDb().prepare("DELETE FROM asset_appearances WHERE id = ?").run(appearanceId);
    writeJson(res, 200, { ok: true });
  },

  // PUT /api/projects/:projectId/assets/:assetId/appearances/:appearanceId/active  { variantId }
  setActive(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
    body: JsonBody,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    if (!body || typeof body !== "object") throw new HttpError(400, "expected JSON body");
    const variantId = typeof body["variantId"] === "string" ? (body["variantId"] as string) : null;
    if (variantId) {
      const v = getDb().prepare("SELECT id FROM asset_variants WHERE id = ? AND appearance_id = ?").get(variantId, appearanceId) as
        | { id: string }
        | undefined;
      if (!v) throw new HttpError(404, "variant not found for this appearance");
    }
    const now = Date.now();
    getDb().prepare("UPDATE asset_appearances SET active_variant_id = ?, updated_at = ? WHERE id = ?").run(variantId, now, appearanceId);
    const row = getDb()
      .prepare("SELECT id, asset_id, name, description, sort_order, active_variant_id, created_at, updated_at FROM asset_appearances WHERE id = ?")
      .get(appearanceId) as Record<string, unknown>;
    writeJson(res, 200, { appearance: row });
  },
};

export const variantHandlers = {
  // GET /api/projects/:projectId/assets/:assetId/appearances/:appearanceId/variants
  list(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike, projectId: string, assetId: string, appearanceId: string) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    const rows = getDb()
      .prepare(
        "SELECT id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, error_message, created_at, updated_at FROM asset_variants WHERE appearance_id = ? ORDER BY created_at ASC",
      )
      .all(appearanceId) as Array<Record<string, unknown>>;
    writeJson(res, 200, { variants: rows.map(variantToJson) });
  },

  // GET /api/projects/:projectId/assets/:assetId/appearances/:appearanceId/variants/:variantId — or file handled separately
  get(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
    variantId: string,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    const row = getDb()
      .prepare(
        "SELECT id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, error_message, created_at, updated_at FROM asset_variants WHERE id = ? AND appearance_id = ?",
      )
      .get(variantId, appearanceId) as Record<string, unknown> | undefined;
    if (!row) throw new HttpError(404, "variant not found");
    writeJson(res, 200, { variant: variantToJson(row) });
  },

  // DELETE /api/projects/:projectId/assets/:assetId/appearances/:appearanceId/variants/:variantId
  remove(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
    variantId: string,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    const row = getDb()
      .prepare("SELECT id, storage_path FROM asset_variants WHERE id = ? AND appearance_id = ?")
      .get(variantId, appearanceId) as { id: string; storage_path: string | null } | undefined;
    if (!row) throw new HttpError(404, "variant not found");
    getDb().prepare("DELETE FROM asset_variants WHERE id = ?").run(variantId);
    // clear active if it pointed here
    getDb().prepare("UPDATE asset_appearances SET active_variant_id = NULL WHERE id = ? AND active_variant_id = ?").run(appearanceId, variantId);
    // best-effort remove file
    unlinkVariantFile(row.storage_path);
    writeJson(res, 200, { ok: true });
  },

  // POST /api/projects/:projectId/assets/:assetId/appearances/:appearanceId/upload  { imageBase64, mimeType }
  async upload(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
    body: JsonBody,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");

    // Accept either { imageBase64 } or { dataUrl }
    let b64: string | null = null;
    let mimeType = (typeof body["mimeType"] === "string" ? (body["mimeType"] as string) : "") || "image/png";

    if (typeof body["imageBase64"] === "string" && (body["imageBase64"] as string).length > 0) {
      b64 = body["imageBase64"] as string;
      // strip data-url prefix if present
      const comma = b64.indexOf(",");
      if (b64.startsWith("data:")) {
        const meta = b64.slice(0, comma);
        const m = meta.match(/data:([^;]+)/);
        if (m) mimeType = m[1]!;
        b64 = b64.slice(comma + 1);
      }
    } else if (typeof body["dataUrl"] === "string" && (body["dataUrl"] as string).length > 0) {
      const dataUrl = body["dataUrl"] as string;
      const comma = dataUrl.indexOf(",");
      const meta = dataUrl.slice(0, comma);
      const m = meta.match(/data:([^;]+)/);
      if (m) mimeType = m[1]!;
      b64 = dataUrl.slice(comma + 1);
    }

    if (!b64) throw new HttpError(400, "imageBase64 or dataUrl is required");

    if (!ALLOWED_UPLOAD_MIMES.has(mimeType)) {
      throw new HttpError(400, `unsupported image type: ${mimeType}`);
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(b64, "base64");
    } catch {
      throw new HttpError(400, "imageBase64 is not valid base64");
    }
    if (buffer.length === 0) throw new HttpError(400, "image is empty");
    if (buffer.length > MAX_UPLOAD_BYTES) throw new HttpError(413, `image exceeds ${MAX_UPLOAD_BYTES} bytes`);

    const id = crypto.randomUUID();
    const now = Date.now();
    const storagePath = writeVariantFile(id, buffer, mimeType);

    // Try to sniff dimensions later — store as provided width/height null for now
    getDb()
      .prepare(
        `INSERT INTO asset_variants (id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, created_at, updated_at)
         VALUES (?, ?, 'uploaded', 'ready', ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      )
      .run(id, appearanceId, storagePath, mimeType, now, now);

    const row = getDb()
      .prepare(
        "SELECT id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, error_message, created_at, updated_at FROM asset_variants WHERE id = ?",
      )
      .get(id) as Record<string, unknown>;
    writeJson(res, 201, { variant: variantToJson(row) });
  },

  // POST /api/projects/:projectId/assets/:assetId/appearances/:appearanceId/generate  { prompt, width?, height? }
  async generate(
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    user: UserLike,
    projectId: string,
    assetId: string,
    appearanceId: string,
    body: JsonBody,
  ) {
    assertOwnerForAppearance(projectId, assetId, appearanceId, user);
    if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
    const prompt = typeof body["prompt"] === "string" ? (body["prompt"] as string).trim() : "";
    if (!prompt) throw new HttpError(400, "prompt is required");
    if (prompt.length > 4000) throw new HttpError(400, "prompt is too long (4000 chars max)");
    const width = body["width"] !== undefined ? Math.trunc(Number(body["width"])) : undefined;
    const height = body["height"] !== undefined ? Math.trunc(Number(body["height"])) : undefined;
    if (width !== undefined && (!Number.isFinite(width) || width < 64 || width > 2048)) {
      throw new HttpError(400, "width must be between 64 and 2048");
    }
    if (height !== undefined && (!Number.isFinite(height) || height < 64 || height > 2048)) {
      throw new HttpError(400, "height must be between 64 and 2048");
    }

    const variantId = crypto.randomUUID();
    const now = Date.now();

    // Insert as pending, then attempt generation, then update to ready/failed.
    // This ensures the pending state is visible even if it takes a bit.
    getDb()
      .prepare(
        `INSERT INTO asset_variants (id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, created_at, updated_at)
         VALUES (?, ?, 'generated', 'pending', NULL, NULL, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
      )
      .run(
        variantId,
        appearanceId,
        width ?? null,
        height ?? null,
        prompt,
        JSON.stringify({ width: width ?? null, height: height ?? null }),
        now,
        now,
      );

    let result;
    try {
      const provider = resolveProvider();
      result = await provider.generate({ prompt, width, height });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isMissing = isMissingIntegration(err);
      getDb()
        .prepare("UPDATE asset_variants SET status = 'failed', error_message = ?, provider_id = ?, model_id = ?, updated_at = ? WHERE id = ?")
        .run(message.slice(0, 2000), resolveProvider().id, resolveProvider().defaultModelId, Date.now(), variantId);
      const row = getDb()
        .prepare(
          "SELECT id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, error_message, created_at, updated_at FROM asset_variants WHERE id = ?",
        )
        .get(variantId) as Record<string, unknown>;
      // Missing integration is 503 so the UI can show a helpful message + doc link.
      if (isMissing) {
        writeJson(res, 503, { variant: variantToJson(row), error: message });
        return;
      }
      writeJson(res, 200, { variant: variantToJson(row) });
      return;
    }

    const storagePath = writeVariantFile(variantId, result.buffer, result.mimeType);
    const genSettings = JSON.stringify({
      width: result.width ?? width ?? null,
      height: result.height ?? height ?? null,
      providerRequestId: result.providerRequestId ?? null,
    });
    getDb()
      .prepare(
        "UPDATE asset_variants SET status = 'ready', storage_path = ?, mime_type = ?, width = ?, height = ?, provider_id = ?, model_id = ?, generation_settings = ?, updated_at = ? WHERE id = ?",
      )
      .run(
        storagePath,
        result.mimeType,
        result.width ?? width ?? null,
        result.height ?? height ?? null,
        result.providerId,
        result.modelId,
        genSettings,
        Date.now(),
        variantId,
      );

    const row = getDb()
      .prepare(
        "SELECT id, appearance_id, source_type, status, storage_path, mime_type, width, height, prompt, provider_id, model_id, generation_settings, error_message, created_at, updated_at FROM asset_variants WHERE id = ?",
      )
      .get(variantId) as Record<string, unknown>;
    writeJson(res, 201, { variant: variantToJson(row) });
  },

  // GET /api/variants/:variantId/file — ownership-checked image bytes
  file(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, user: UserLike | null, variantId: string) {
    const db = getDb();
    const v = db
      .prepare(
        `SELECT v.id, v.storage_path, v.mime_type, a.project_id, p.owner_id
         FROM asset_variants v
         JOIN asset_appearances ap ON ap.id = v.appearance_id
         JOIN assets a ON a.id = ap.asset_id
         JOIN projects p ON p.id = a.project_id
         WHERE v.id = ?`,
      )
      .get(variantId) as
      | { id: string; storage_path: string | null; mime_type: string | null; project_id: string; owner_id: string }
      | undefined;
    if (!v) throw new HttpError(404, "variant not found");
    // Private by default: only owner may fetch. Tests rely on ownership checks.
    if (!user || v.owner_id !== user.id) throw new HttpError(403, "you can only access your own assets");
    if (!v.storage_path) throw new HttpError(404, "variant has no stored file");

    let abs: string;
    try {
      abs = path.resolve(v.storage_path);
    } catch {
      throw new HttpError(404, "variant has no stored file");
    }
    // Contain within assetDir for safety.
    if (!abs.startsWith(assetDir())) throw new HttpError(404, "not found");
    let buf: Buffer;
    try {
      buf = fs.readFileSync(abs);
    } catch {
      throw new HttpError(404, "variant file not found on disk");
    }
    const mime = v.mime_type ?? "image/png";
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": buf.length,
      "Cache-Control": "private, max-age=86400",
    });
    res.end(buf);
  },
};

export function validateUploadContentType(mime: string): void {
  if (!ALLOWED_UPLOAD_MIMES.has(mime)) throw new HttpError(400, `unsupported image type: ${mime}`);
}
