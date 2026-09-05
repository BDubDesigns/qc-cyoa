/**
 * Production static-file serving for the one-process runtime.
 *
 * In production (`pnpm start`) the same bare `node:http` server that handles
 * `/api/*` also serves the Vite-built frontend from `dist/`. Unknown
 * non-API paths fall back to `dist/index.html` so SPA routes work when
 * opened or refreshed directly. Unknown `/api/*` paths NEVER fall through
 * here — `app.ts` keeps those as API-style 404s.
 *
 * `DIST_DIR` is read at call time (same pattern as `ASSET_DIR` in
 * `storage.ts`) so tests can point at fixture directories.
 */
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

const DEFAULT_DIST_DIR = "dist";

export function distDir(): string {
  return path.resolve(process.env.DIST_DIR ?? DEFAULT_DIST_DIR);
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

export function contentTypeForPathname(pathname: string): string {
  return CONTENT_TYPES[path.extname(pathname).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Resolve a request pathname to a real file inside the dist dir.
 * Returns null when the path escapes dist, names a directory, or is missing.
 */
export function resolveStaticFile(pathname: string): string | null {
  const root = distDir();
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const abs = path.normalize(path.join(root, decoded.replace(/^[/\\]+/, "")));
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  return abs;
}

/**
 * Serve a built frontend file for GET/HEAD requests to non-API paths.
 * Returns true when the response was handled (caller must return).
 */
export function tryServeStatic(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return false;
  const file = resolveStaticFile(url.pathname);
  if (!file) return false;
  let buf: Buffer;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return false;
  }
  // Vite emits content-hashed files under /assets/; those are immutable.
  // Everything else (notably index.html) must revalidate.
  const cacheControl = url.pathname.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "no-cache";
  res.writeHead(200, {
    "Content-Type": contentTypeForPathname(file),
    "Content-Length": buf.length,
    "Cache-Control": cacheControl,
  });
  if (req.method === "GET") res.end(buf);
  else res.end();
  return true;
}

/**
 * Serve `dist/index.html` for GET/HEAD requests to non-API paths that are
 * not real files (SPA fallback). Returns false when there is no built
 * bundle (e.g. dev without `pnpm build`) so the caller can 404.
 */
export function tryServeSpaFallback(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return false;
  const index = path.join(distDir(), "index.html");
  let buf: Buffer;
  try {
    if (!fs.statSync(index).isFile()) return false;
    buf = fs.readFileSync(index);
  } catch {
    return false;
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": buf.length,
    "Cache-Control": "no-cache",
  });
  if (req.method === "GET") res.end(buf);
  else res.end();
  return true;
}
