/**
 * Small JSON body parsing + response helpers shared by all routes.
 */
import * as http from "node:http";

/** A JSON object body (as parsed from the request) or null for an empty body. */
export type JsonBody = Record<string, unknown> | null;

/** Read and JSON.parse the request body, guarded against malformed/large input. */
export function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 1_000_000; // 1 MB cap
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new HttpError(413, "payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
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