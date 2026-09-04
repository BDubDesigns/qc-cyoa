/**
 * SQLite storage via Node's built-in `node:sqlite` (DatabaseSync).
 *
 * Deliberately dependency-free: no Drizzle/better-sqlite3. Node 22 ships a
 * synchronous SQLite driver, which is enough for this MVP and swaps cleanly to
 * an ORM / Postgres later without touching studio or game code.
 *
 * The file path is configurable so tests can point at a temp/in-memory DB.
 * WAL mode is enabled for concurrent reads during dev.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";

/**
 * Load `node:sqlite` through Node's CJS require. It is an experimental builtin
 * that is NOT present in `module.builtinModules`, so Vite/vite-node would try
 * to resolve it as a bare package during tests and fail to load it. Bypassing
 * via `createRequire` resolves it natively and keeps both tsx (dev/api) and
 * vitest working.
 */
const require = createRequire(import.meta.url);
const { DatabaseSync: DatabaseSyncCtor } = require("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = InstanceType<typeof DatabaseSyncCtor>;

let db: DatabaseSync | null = null;

export interface DbPaths {
  /** Absolute or relative path to the sqlite file. */
  file: string;
}

/** Open (or reuse) the application database. `:memory:` is allowed for tests. */
export function openDb(opts: DbPaths): DatabaseSync {
  if (db) return db;
  if (opts.file !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(opts.file)), { recursive: true });
  }
  const database = new DatabaseSyncCtor(opts.file);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  migrate(database);
  db = database;
  return database;
}

/** Closes and forgets the DB (used by tests between cases). */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Returns the live DB handle, throwing if not open. */
export function getDb(): DatabaseSync {
  if (!db) throw new Error("DB not open: call openDb() first");
  return db;
}

function migrate(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id           TEXT PRIMARY KEY,
      author_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      tags         TEXT NOT NULL DEFAULT '[]',
      json         TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_games_author ON games(author_id);
    CREATE INDEX IF NOT EXISTS idx_games_published ON games(is_published);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

    CREATE TABLE IF NOT EXISTS assets (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

    CREATE TABLE IF NOT EXISTS asset_appearances (
      id                TEXT PRIMARY KEY,
      asset_id          TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      description       TEXT NOT NULL DEFAULT '',
      sort_order        INTEGER NOT NULL DEFAULT 0,
      active_variant_id TEXT,
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_appearances_asset ON asset_appearances(asset_id);

    CREATE TABLE IF NOT EXISTS asset_variants (
      id                  TEXT PRIMARY KEY,
      appearance_id       TEXT NOT NULL REFERENCES asset_appearances(id) ON DELETE CASCADE,
      source_type         TEXT NOT NULL CHECK(source_type IN ('generated','uploaded')),
      status              TEXT NOT NULL CHECK(status IN ('pending','ready','failed')),
      storage_path        TEXT,
      mime_type           TEXT,
      width               INTEGER,
      height              INTEGER,
      prompt              TEXT,
      provider_id         TEXT,
      model_id            TEXT,
      generation_settings TEXT,
      error_message       TEXT,
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_variants_appearance ON asset_variants(appearance_id);
  `);
}

/** Row shapes mirroring the schema above (snake_case = raw DB columns). */
export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
}

export interface GameRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  tags: string;
  json: string;
  is_published: number;
  created_at: number;
  updated_at: number;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface AssetRow {
  id: string;
  project_id: string;
  name: string;
  category: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface AssetAppearanceRow {
  id: string;
  asset_id: string;
  name: string;
  description: string;
  sort_order: number;
  active_variant_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface AssetVariantRow {
  id: string;
  appearance_id: string;
  source_type: string;
  status: string;
  storage_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  prompt: string | null;
  provider_id: string | null;
  model_id: string | null;
  generation_settings: string | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

