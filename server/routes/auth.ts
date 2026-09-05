/**
 * Project auth API adapter.
 *
 * Better Auth remains responsible for credential validation, password hashing,
 * session persistence, cookie creation, and error semantics. This thin layer
 * keeps the frontend's response shape small and prevents session tokens from
 * being returned in JSON to browser code.
 */
import * as http from "node:http";
import { isAPIError } from "better-auth/api";
import type { AuthService, SigninInput, SignupInput } from "../auth-service";
import { HttpError, writeError, writeJson, type JsonBody } from "./json";

export interface AuthHandlers {
  signupEmail: (req: http.IncomingMessage, res: http.ServerResponse, body: JsonBody) => Promise<void>;
  signinEmail: (req: http.IncomingMessage, res: http.ServerResponse, body: JsonBody) => Promise<void>;
  signout: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
  session: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
}

export function authRoutes(auth: AuthService): AuthHandlers {
  return {
    async signupEmail(req, res, body) {
      return forwardAuthResponse(res, "signup", () => auth.signUpEmail(req, readSignup(body)));
    },

    async signinEmail(req, res, body) {
      return forwardAuthResponse(res, "signin", () => auth.signInEmail(req, readSignin(body)));
    },

    async signout(req, res) {
      return forwardAuthResponse(res, "signout", () => auth.signOut(req));
    },

    async session(req, res) {
      return forwardAuthResponse(res, "session", () => auth.sessionResponse(req));
    },
  };
}

function readSignup(body: JsonBody): SignupInput {
  if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
  return {
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}

function readSignin(body: JsonBody): SigninInput {
  if (!body || typeof body !== "object") throw new HttpError(400, "expected a JSON body");
  return {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}

type ResponseKind = "signup" | "signin" | "signout" | "session";

async function forwardAuthResponse(
  res: http.ServerResponse,
  kind: ResponseKind,
  operation: () => Promise<Response>,
): Promise<void> {
  try {
    await writeBetterAuthResponse(res, await operation(), kind);
  } catch (err) {
    // Dynamic host resolution happens before Better Auth can produce a
    // Response. Keep rejected-host failures client-visible as a 4xx while
    // avoiding disclosure of the configured allowlist.
    if (!isAPIError(err) || !isHostResolutionError(err.message)) throw err;
    const status = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 400;
    writeError(res, status, "auth request rejected");
  }
}

function isHostResolutionError(message: string): boolean {
  return message.includes("is not in the allowed hosts list") || message.includes("Could not determine host");
}

async function writeBetterAuthResponse(
  res: http.ServerResponse,
  response: Response,
  kind: ResponseKind,
): Promise<void> {
  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  let body = rawBody;
  let status = response.status;

  if (contentType.includes("application/json") && rawBody.length > 0) {
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = rawBody;
    }

    if (kind === "signup" || kind === "signin") {
      // Better Auth includes a token for non-cookie clients. This application
      // is cookie-only, so never pass that credential through the JSON API.
      body = JSON.stringify(stripToken(payload));
    } else if (kind === "session") {
      if (payload === null) {
        status = 401;
        body = JSON.stringify({ error: "not authenticated" });
      } else {
        // The session object also contains its opaque token. The frontend only
        // needs the canonical creator identity.
        body = JSON.stringify(stripSession(payload));
      }
    } else if (kind === "signout") {
      body = JSON.stringify({ ok: response.ok });
    }
  }

  response.headers.forEach((value, key) => {
    if (key !== "set-cookie" && key !== "content-length") res.setHeader(key, value);
  });
  const setCookies = getSetCookies(response.headers);
  if (setCookies.length > 0) res.setHeader("Set-Cookie", setCookies);
  res.statusCode = status;
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

function stripToken(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const { token: _token, ...withoutToken } = payload as Record<string, unknown>;
  return withoutToken;
}

function stripSession(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const record = payload as Record<string, unknown>;
  const user = record.user;
  return user && typeof user === "object" ? { user } : { error: "not authenticated" };
}

function getSetCookies(headers: Headers): string[] {
  const nodeHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof nodeHeaders.getSetCookie === "function") return nodeHeaders.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}
