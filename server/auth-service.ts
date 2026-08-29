/**
 * AuthService abstraction + a thin username/password implementation.
 *
 * This is THE seam the plan calls out: game/save code never touches sessions or
 * cookies directly — they go through `AuthService`. When we swap in better-auth,
 * only this file (and the cookie name here) changes.
 */
import * as crypto from "node:crypto";
import * as http from "node:http";
import { getDb, type UserRow } from "./db";
import { hashPassword, normalizeUsername, validatePassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "cyoa_sid";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface User {
  id: string;
  username: string;
}

export interface AuthService {
  signup(username: string, password: string): Promise<User>;
  login(username: string, password: string): Promise<User>;
  logout(req: http.IncomingMessage, res: http.ServerResponse): void;
  /** Resolves the current user from the request cookie, or null. */
  currentUser(req: http.IncomingMessage): Promise<User | null>;
}

/** Cookie parsing: minimal split on "; " → {name: value}. */
function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    out[name] = value;
  }
  return out;
}

function readToken(req: http.IncomingMessage): string | null {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] ?? null;
}

/** Should the session cookie be marked Secure? Only when TLS is terminated. */
export function secure(): boolean {
  return process.env.TRUST_TLS === "1";
}

/** Builds the session `Set-Cookie` header value for the given raw token. */
export function sessionCookie(token: string): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(secure() ? ["Secure"] : []),
  ];
  return parts.join("; ");
}

function setCookie(res: http.ServerResponse, token: string): void {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(secure() ? ["Secure"] : []),
  ];
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearCookie(res: http.ServerResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Temporary username/password auth backed by the SQLite `users`/`sessions` tables. */
export class PasswordAuthService implements AuthService {
  async signup(username: string, password: string): Promise<User> {
    const norm = normalizeUsername(username);
    const pwErr = validatePassword(password);
    if (pwErr) throw new AuthError(400, pwErr);
    if (!norm) throw new AuthError(400, "username is required");

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(norm) as
      | { id: string }
      | undefined;
    if (existing) throw new AuthError(409, "username already taken");

    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare("INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      norm,
      hashPassword(password),
      now,
    );
    return { id, username: norm };
  }

  async login(username: string, password: string): Promise<User> {
    const norm = normalizeUsername(username);
    if (!norm) return Promise.reject(new AuthError(400, "username is required"));

    const db = getDb();
    const row = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(norm) as
      | UserRow
      | undefined;
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new AuthError(401, "invalid username or password");
    }
    return { id: row.id, username: row.username };
  }

  async logout(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    clearCookie(res);
  }

  async currentUser(req: http.IncomingMessage): Promise<User | null> {
    const token = readToken(req);
    if (!token) return null;
    const db = getDb();
    const row = db
      .prepare(
        `SELECT s.user_id AS user_id, u.username AS username
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .get(tokenHash(token), Date.now()) as { user_id: string; username: string } | undefined;
    if (!row) return null;
    return { id: row.user_id, username: row.username };
  }

  /** Create a session row for the given user; returns the browser token. */
  createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString("base64url");
    const db = getDb();
    db.prepare(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    ).run(crypto.randomUUID(), userId, tokenHash(token), Date.now() + SESSION_TTL_MS);
    return token;
  }
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}