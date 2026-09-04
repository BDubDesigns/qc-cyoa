/**
 * Small JSON body parsing + response helpers shared by all routes.
 */
import * as http from "node:http";

/** A JSON object body (as parsed from the request) or null for an empty body. */
export type JsonBody = Record<string, unknown> | null;

/** Default cap for ordinary JSON request bodies (auth, metadata, game defs). */
export const DEFAULT_MAX_BODY_BYTES = 1_000_000; // 1 MB

/**
 * Read and JSON.parse the request body, guarded against malformed/large input.
 * Pass a larger `maxBytes` for routes that legitimately carry big payloads
 * (e.g. base64 image uploads) without raising the default for every route.
 */
export function readJsonBody(req: http.IncomingMessage, maxBytes: number = DEFAULT_MAX_BODY_BYTES): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return; // drain but stop buffering
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        // Reject but do NOT destroy the socket: destroying would prevent the
        // 413 response from reaching the client (the client saw a generic
        // "Internal Server Error" proxy/reset). Draining lets the response
        // still be written. The body is safely discarded.
        reject(new HttpError(413, "payload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) return;
      if (chunks.length === 0) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export function writeJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function writeError(res: http.ServerResponse, status: number, message: string): void {
  writeJson(res, status, { error: message });
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}