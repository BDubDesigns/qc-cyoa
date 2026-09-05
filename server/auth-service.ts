/**
 * Better Auth integration for the bare node:http API.
 *
 * Better Auth owns creator identities, credential accounts, and durable
 * sessions. The rest of the API only depends on this small request-oriented
 * seam and never reads auth tables or cookies directly.
 */
import * as http from "node:http";
import { betterAuth, type Auth, type BetterAuthOptions } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { getMigrations } from "better-auth/db/migration";
import { getDb } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface SigninInput {
  email: string;
  password: string;
}

export type BetterAuth = Auth<BetterAuthOptions>;

export interface AuthService {
  signUpEmail(req: http.IncomingMessage, body: SignupInput): Promise<Response>;
  signInEmail(req: http.IncomingMessage, body: SigninInput): Promise<Response>;
  signOut(req: http.IncomingMessage): Promise<Response>;
  sessionResponse(req: http.IncomingMessage): Promise<Response>;
  /** Resolves the current user from the Better Auth cookie, or null. */
  currentUser(req: http.IncomingMessage): Promise<User | null>;
}

export interface AuthConfig {
  /** Test callers may supply an isolated secret without mutating process env. */
  secret?: string;
  /** Exact hosts and Better Auth wildcard host patterns accepted by the app. */
  allowedHosts?: string[];
  /** How Better Auth constructs each request-specific URL. */
  protocol?: "http" | "https" | "auto";
  /** Only enable when every request reaches the app through a trusted proxy. */
  trustedProxyHeaders?: boolean;
  /** Test/deployment override for the cookie Secure attribute. */
  useSecureCookies?: boolean;
}

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

/**
 * Build the one Better Auth instance for the current SQLite handle.
 * Secrets and hostnames are configuration, never source-controlled values.
 * Better Auth resolves the request-specific base URL only from this explicit
 * allowlist; no arbitrary Host header is accepted.
 */
export function createAuth(config: AuthConfig = {}): BetterAuth {
  const secret = config.secret ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required; configure it in the environment");
  }

  const allowedHosts = config.allowedHosts ?? parseList(process.env.BETTER_AUTH_ALLOWED_HOSTS);
  if (allowedHosts.length === 0) {
    throw new Error("BETTER_AUTH_ALLOWED_HOSTS is required; configure exact and preview host patterns");
  }
  rejectCatchAll("BETTER_AUTH_ALLOWED_HOSTS", allowedHosts);

  const trustedOrigins = parseList(process.env.BETTER_AUTH_TRUSTED_ORIGINS);
  rejectCatchAll("BETTER_AUTH_TRUSTED_ORIGINS", trustedOrigins);
  const trustedProxyHeaders = config.trustedProxyHeaders ?? process.env.BETTER_AUTH_TRUSTED_PROXY_HEADERS === "1";
  const useSecureCookies = config.useSecureCookies ?? (
    process.env.NODE_ENV === "production" || process.env.BETTER_AUTH_USE_SECURE_COOKIES === "1"
  );

  const options: BetterAuthOptions = {
    appName: "qc-cyoa",
    database: getDb(),
    baseURL: {
      allowedHosts,
      protocol: config.protocol ?? "auto",
    },
    basePath: "/api/auth",
    secret,
    ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    // Local HTTP remains usable; production HTTPS or an explicitly TLS-
    // terminated deployment receives Secure cookies.
    advanced: {
      trustedProxyHeaders,
      useSecureCookies,
    },
  };
  return betterAuth(options);
}

/** Ensure Better Auth's durable schema exists on the already-open SQLite DB. */
export async function migrateAuthSchema(auth: BetterAuth): Promise<void> {
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
}

export class BetterAuthService implements AuthService {
  constructor(public readonly auth: BetterAuth) {}

  signUpEmail(req: http.IncomingMessage, body: SignupInput): Promise<Response> {
    return this.auth.api.signUpEmail({
      body,
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });
  }

  signInEmail(req: http.IncomingMessage, body: SigninInput): Promise<Response> {
    return this.auth.api.signInEmail({
      body,
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });
  }

  signOut(req: http.IncomingMessage): Promise<Response> {
    return this.auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });
  }

  sessionResponse(req: http.IncomingMessage): Promise<Response> {
    return this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });
  }

  async currentUser(req: http.IncomingMessage): Promise<User | null> {
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true },
    });
    if (!session) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  ];
}

function rejectCatchAll(setting: string, values: string[]): void {
  if (values.some((value) => value === "*" || value === "*:*" || value === "http://*" || value === "https://*")) {
    throw new Error(`${setting} must not contain a catch-all wildcard`);
  }
}
