/**
 * FE API client — the ONLY place the browser talks to the /api backend.
 * Better Auth remains behind this small application API adapter.
 *
 * All requests include credentials so the httpOnly session cookie is sent.
 */
import type { GameDefinition } from "../core/types";

export interface User {
  id: string;
  email: string;
  name: string;
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

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface Asset {
  id: string;
  project_id: string;
  name: string;
  category: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface Appearance {
  id: string;
  asset_id: string;
  name: string;
  description: string;
  sort_order: number;
  active_variant_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Variant {
  id: string;
  appearance_id: string;
  source_type: "generated" | "uploaded";
  status: "pending" | "ready" | "failed";
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  prompt: string | null;
  provider_id: string | null;
  model_id: string | null;
  generation_settings: unknown;
  error_message: string | null;
  created_at: number;
  updated_at: number;
  file_url: string | null;
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
        : data && typeof data === "object" && "message" in data
          ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  // auth
  signup: (email: string, password: string, name: string) =>
    request<{ user: User }>("POST", "/auth/sign-up/email", { email, password, name }),
  login: (email: string, password: string) =>
    request<{ user: User }>("POST", "/auth/sign-in/email", { email, password }),
  logout: () => request<{ ok: boolean }>("POST", "/auth/sign-out"),
  session: () => request<{ user: User }>("GET", "/auth/get-session"),

  // games
  listPublished: () => request<{ games: GameSummary[] }>("GET", "/games?published=1"),
  getGame: (id: string) => request<GameDetail>("GET", `/games/${id}`),
  createGame: (game: GameDefinition) => request<{ id: string }>("POST", "/games", game),
  updateGame: (id: string, game: GameDefinition) => request<{ ok: boolean }>("PUT", `/games/${id}`, game),
  publishGame: (id: string) => request<{ ok: boolean }>("POST", `/games/${id}/publish`),
  deleteGame: (id: string) => request<{ ok: boolean }>("DELETE", `/games/${id}`),
  myGames: () => request<{ games: GameSummary[] }>("GET", "/me/games"),

  // projects
  listProjects: () => request<{ projects: Project[] }>("GET", "/projects"),
  getProject: (id: string) => request<{ project: Project }>("GET", `/projects/${id}`),
  createProject: (title: string, description?: string) =>
    request<{ id: string; project: Project }>("POST", "/projects", { title, description: description ?? "" }),
  updateProject: (id: string, title: string, description?: string) =>
    request<{ project: Project }>("PUT", `/projects/${id}`, { title, description: description ?? "" }),
  deleteProject: (id: string) => request<{ ok: boolean }>("DELETE", `/projects/${id}`),

  // assets
  listAssets: (projectId: string) => request<{ assets: Asset[] }>("GET", `/projects/${projectId}/assets`),
  createAsset: (projectId: string, name: string, category: string, description?: string) =>
    request<{ id: string; asset: Asset }>("POST", `/projects/${projectId}/assets`, { name, category, description: description ?? "" }),
  getAsset: (projectId: string, assetId: string) =>
    request<{ asset: Asset }>("GET", `/projects/${projectId}/assets/${assetId}`),
  updateAsset: (projectId: string, assetId: string, name: string, category: string, description?: string) =>
    request<{ asset: Asset }>("PUT", `/projects/${projectId}/assets/${assetId}`, { name, category, description: description ?? "" }),
  deleteAsset: (projectId: string, assetId: string) =>
    request<{ ok: boolean }>("DELETE", `/projects/${projectId}/assets/${assetId}`),

  // appearances
  listAppearances: (projectId: string, assetId: string) =>
    request<{ appearances: Appearance[] }>("GET", `/projects/${projectId}/assets/${assetId}/appearances`),
  createAppearance: (projectId: string, assetId: string, name: string, description?: string) =>
    request<{ id: string; appearance: Appearance }>("POST", `/projects/${projectId}/assets/${assetId}/appearances`, { name, description: description ?? "" }),
  updateAppearance: (projectId: string, assetId: string, appearanceId: string, name: string, description?: string) =>
    request<{ appearance: Appearance }>("PUT", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}`, { name, description: description ?? "" }),
  deleteAppearance: (projectId: string, assetId: string, appearanceId: string) =>
    request<{ ok: boolean }>("DELETE", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}`),
  setActiveVariant: (projectId: string, assetId: string, appearanceId: string, variantId: string | null) =>
    request<{ appearance: Appearance }>("PUT", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}/active`, { variantId }),

  // variants
  listVariants: (projectId: string, assetId: string, appearanceId: string) =>
    request<{ variants: Variant[] }>("GET", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}/variants`),
  getVariant: (projectId: string, assetId: string, appearanceId: string, variantId: string) =>
    request<{ variant: Variant }>("GET", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}/variants/${variantId}`),
  deleteVariant: (projectId: string, assetId: string, appearanceId: string, variantId: string) =>
    request<{ ok: boolean }>("DELETE", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}/variants/${variantId}`),
  uploadVariant: (projectId: string, assetId: string, appearanceId: string, imageBase64: string, mimeType?: string) =>
    request<{ variant: Variant }>("POST", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}/upload`, { imageBase64, mimeType }),
  generateVariant: (projectId: string, assetId: string, appearanceId: string, prompt: string, width?: number, height?: number) =>
    request<{ variant: Variant; error?: string }>("POST", `/projects/${projectId}/assets/${assetId}/appearances/${appearanceId}/generate`, { prompt, width, height }),
};

/** True when a 401 means the session is absent (not a server outage). */
export function isUnauthenticated(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
