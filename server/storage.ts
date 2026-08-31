/**
 * Asset file storage helper.
 *
 * Keeps on-disk storage very simple: one file per ready variant at
 * `server/data/assets/<variantId>.<ext>`. The DB holds `storage_path`
 * relative to the project root so a later move to S3/R2 only changes this file.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_ASSET_DIR = "server/data/assets";

export function assetDir(): string {
  // Read env at call time so tests can redirect per-case.
  return path.resolve(process.env.ASSET_DIR ?? DEFAULT_ASSET_DIR);
}

export function ensureAssetDir(): void {
  fs.mkdirSync(assetDir(), { recursive: true });
}

/** Derive extension from mime type, falling back to png. */
export function extForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg";
  return "png";
}

/** Absolute path for a variant's stored file. */
export function variantFilePath(variantId: string, mimeType: string): string {
  return path.join(assetDir(), `${variantId}.${extForMime(mimeType)}`);
}

/** Relative path persisted to asset_variants.storage_path. */
export function variantStoragePath(variantId: string, mimeType: string): string {
  // Store relative to repo root for portability.
  const abs = variantFilePath(variantId, mimeType);
  const rel = path.relative(path.resolve("."), abs);
  return rel;
}

/** Write a variant's buffer to disk and return its persisted storage_path. */
export function writeVariantFile(variantId: string, buffer: Buffer, mimeType: string): string {
  ensureAssetDir();
  const abs = variantFilePath(variantId, mimeType);
  fs.writeFileSync(abs, buffer);
  return variantStoragePath(variantId, mimeType);
}

/** MIME from stored path (by extension). */
export function mimeForPath(storagePath: string | null): string {
  if (!storagePath) return "application/octet-stream";
  const ext = path.extname(storagePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".png":
    default:
      return "image/png";
  }
}

/** Allowed upload mimes — SVG excluded for now (see review: unsanitized SVG can carry active content). */
export const ALLOWED_UPLOAD_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
