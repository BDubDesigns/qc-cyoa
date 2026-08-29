/**
 * FE API client — the ONLY place the browser talks to the /api backend.
 * A future better-auth swap touches here (and server/auth-service) only.
 *
 * All requests include credentials so the httpOnly session cookie is sent.
 */
import type { GameDefinition } from "../core/types";

export interface User {
  id: string;
  username: string;
}

export interface GameSummary {
  id: string;
  author_id: string;
  title: string;
  description: string;
  tags: string[];
  is_published: boolean;
  created_at: number;
  updated_at: number;
}

export interface GameDetail {
  id: string;
  author_id: string;
  is_published: boolean;
  created_at: number;
  updated_at: number;
  definition: GameDefinition;
  editable: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  // auth
  signup: (username: string, password: string) =>
    request<{ user: User }>("POST", "/auth/signup", { username, password }),
  login: (username: string, password: string) =>
    request<{ user: User }>("POST", "/auth/login", { username, password }),
  logout: () => request<{ ok: boolean }>("POST", "/auth/logout"),
  session: () => request<{ user: User }>("GET", "/auth/session"),

  // games
  listPublished: () => request<{ games: GameSummary[] }>("GET", "/games?published=1"),
  getGame: (id: string) => request<GameDetail>("GET", `/games/${id}`),
  createGame: (game: GameDefinition) => request<{ id: string }>("POST", "/games", game),
  updateGame: (id: string, game: GameDefinition) => request<{ ok: boolean }>("PUT", `/games/${id}`, game),
  publishGame: (id: string) => request<{ ok: boolean }>("POST", `/games/${id}/publish`),
  deleteGame: (id: string) => request<{ ok: boolean }>("DELETE", `/games/${id}`),
  myGames: () => request<{ games: GameSummary[] }>("GET", "/me/games"),
};

/** True when a 401 means the session is absent (not a server outage). */
export function isUnauthenticated(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}