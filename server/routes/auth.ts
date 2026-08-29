/**
 * Auth request handlers. The concrete AuthService is injected so a swap to
 * better-auth only replaces the factory, never these handlers' callers.
 */
import * as http from "node:http";
import type { AuthService } from "../auth-service";
import { sessionCookie } from "../auth-service";
import { HttpError, writeJson, type JsonBody } from "./json";

export interface AuthHandlers {
  signup: (req: http.IncomingMessage, res: http.ServerResponse, body: JsonBody) => Promise<void>;
  login: (req: http.IncomingMessage, res: http.ServerResponse, body: JsonBody) => Promise<void>;
  logout: (req: http.IncomingMessage, res: http.ServerResponse) => void;
  session: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
}

/** Concrete session-creating auth: an AuthService plus a token->cookie factory. */
interface SessionAuth extends AuthService {
  createSession(userId: string): string;
}

export function authRoutes(auth: SessionAuth): AuthHandlers {
  return {
    async signup(req, res, body) {
      const { username, password } = readCredentials(body);
      const user = await auth.signup(username, password);
      const token = auth.createSession(user.id);
      res.setHeader("Set-Cookie", sessionCookie(token));
      writeJson(res, 201, { user });
    },

    async login(req, res, body) {
      const { username, password } = readCredentials(body);
      const user = await auth.login(username, password);
      const token = auth.createSession(user.id);
      res.setHeader("Set-Cookie", sessionCookie(token));
      writeJson(res, 200, { user });
    },

    logout(req, res) {
      auth.logout(req, res);
      writeJson(res, 200, { ok: true });
    },

    async session(req, res) {
      const user = await auth.currentUser(req);
      if (!user) {
        writeJson(res, 401, { error: "not authenticated" });
        return;
      }
      writeJson(res, 200, { user });
    },
  };
}

function readCredentials(body: JsonBody): { username: string; password: string } {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "expected a JSON body");
  }
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  return { username, password };
}