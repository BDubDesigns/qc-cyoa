# Author Stories + Accounts — Implementation Plan

**Date:** 2026-08-29
**Status:** Plan (not yet implemented). Written for handoff to a fresh session.
**Repo:** `/home/brandon/Projects/cyoa` (TypeScript CYOA framework; **not a git repo yet** — commit before starting).

---

## 0. TL;DR / The one decision that matters

**Auth is not the next thing to build.** For "folks author their own stories," the
bottleneck is the **authoring → publish → play** pipeline. This plan sequences it so
the authoring studio ships **local-first (no server)** first, then a **self-hosted
Node backend** with **simple username/password auth behind a swappable
`AuthService`**, then the social features.

**Auth stance:** simple username/password now, done correctly (argon2id + httpOnly
cookie session + CSRF + rate limiting), behind a small interface so OAuth / passkeys
can be swapped in later without touching game/save/score code. Do **not** build
"better auth" yet.

---

## 1. Current state (verified)

- **Framework:** `src/core/{types,engine,validate}.ts`. UI-agnostic `Engine` with
  declarative `GameDefinition`, a **closed union of `GameEffect`** (so third-party
  authored games are **safe to execute — no callbacks, no sandbox needed**),
  `serialize()/load()` for saves, `validateGame()/defineGame()/inspectGame()/
  isValidGame()` for author-time safety, `addPoints` effect, `onChange` pub/sub.
- **Web:** `src/web/{main,render,styles}.ts`. `main.ts` **hardcodes
  `import { lighthouse }`** and autosaves to `localStorage` (`cyoa:save:<gameId>`),
  offers Resume, has a live-ticking timer and a restart hook.
- **Games:** `src/games/{lighthouse,post_office}.ts`.
- **Tests:** Vitest — `tests/{smoke,engine,validate,games}.test.ts` + `tests/helpers.ts`
  (53 tests). `npm test`, `npm run test:watch`. `tsc --noEmit` covers `src` + `tests`.
- **Toolchain:** Node v22 (nvm default; also v24 + `pnpm` present), Vite 5, TS strict
  (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`), npm
  (`package-lock.json`). Dev server: `npm run dev` on `http://127.0.0.1:5173/`.
- **No backend, no DB, no user model.**

**Single biggest enabler:** the `Engine` already runs *any* `GameDefinition`. The only
thing standing between this app and "load any story" is that `main.ts` hardcodes the
game. Everything else is plumbing.

---

## 2. Locked decisions

| Topic | Decision |
| --- | --- |
| Authoring UX | **Structured editor** (forms + live preview + validation + Playtest). Visual map editor is **deferred**. |
| Backend | **Self-hosted Node + SQLite to start**, Postgres-ready. Use **Hono** (small, TS-native, edge-friendly) with **Drizzle** ORM + `better-sqlite3` (v3 for node:sqlite if desired). |
| Auth | Simple username/password → argon2id hash, httpOnly cookie session, CSRF token, rate limiting. Behind `AuthService` interface. Defer OAuth/passkeys/MFA/email-verify. |
| Approach | Keep a **single project** for now (FE + `server/` + shared `src/core`). Extract a **workspace** (npm/pnpm) only if FE/BE split pain appears. |
| Sequencing | M0 foundations → M1 authoring studio (**local-first, no server**) → M2 backend + auth → M3 wire FE→BE → M4 social. See §10. |
| Scope now | **Structured editor** only. Out of scope: visual map editor, monetization, moderation/curation, DRM, email verification, OAuth/passkeys. |

---

## 3. Architecture

```
┌──────────────────────── Browser ────────────────────────┐
│  Vue/React-free SPA (current Vite + TS modules)        │
│    /browse        — library of published games          │
│    /play/:id      — run a GameDefinition through Engine │
│    /studio/:game? — structured authoring editor         │
│    /my-games      — my drafts + published                │
│    /my-saves      — pick up where I left off             │
│    /account       — login/signup, profiles, hearts       │
│  state: AppState + router (tiny hash/URL router, or add) │
│  Auth: AuthService (FE adapter) → httpOnly cookie        │
└──────────────┬──────────────────────────────────────────┘
               │ fetch (same-origin /api/*, credentials: include)
┌──────────────▼──────────────────────────────────────────┐
│  Node backend (Hono)  server/                           │
│    routes: auth, games, saves, scores, hearts, recommend│
│    middleware: session, csrf, rate-limit, zod input     │
│    password.ts: argon2id; auth.ts: AuthService impl      │
│  Drizzle ORM → SQLite (Postgres-ready)                   │
└─────────────────────────────────────────────────────────┘
```

- **Shared code:** `src/core/types.ts`, `src/core/validate.ts` are reused by both the
  FE and the `server/` (the backend validates submitted games with the *same*
  `validateGame`, so content safety is identical in both places).
- **Auth transport:** httpOnly `__Host-` cookie session (or a stateless, signed
  session token) — never a JWT/localStorage token for the MVP (XSS-safe default).
- **Content safety:** games are declarative; FE renders via `textContent`/`escapeHtml`
  already. Keep `sanitize`-free (don't `dangerouslySetInnerHTML` user content).

---

## 4. Data model (Drizzle schema → SQLite)

```ts
users:        { id: text pk, username: text unique, password_hash: text,
                created_at: int }
sessions:     { id: text pk, user_id: text fk, token_hash: text, expires_at: int }
games:        { id: text pk, author_id: text fk, title: text, description: text,
                tags: text /*json array*/, json: text /*GameDefinition*/, 
                is_published: bool, is_public: bool, created_at, updated_at }
saves:        { id: text pk, user_id, game_id, saved_state: text /*SavedState*/,
                updated_at, unique(user_id, game_id) }
scores:       { id: text pk, user_id, game_id, score: int, outcome: text,
                duration_ms: int, played_at }
hearts:       { user_id, game_id, value: 'heart'|'hate', unique(user_id, game_id) }
recommends:   { id: text pk, from_user, game_id, to_user, created_at,
                unique(from_user, game_id, to_user) }
```

Notes:
- `games.json` is the canonical `GameDefinition` (validated on write/read).
- `saves` single row per user+game ("pick up where you left off"). If multiple slots
  wanted later, add `slot` column.
- `scores` is append-only (leaderboard = best score per user+game).
- ids: `crypto.randomUUID()` or nanoid.

---

## 5. API endpoints

```
POST /api/auth/signup          { username, password }            -> 201, sets cookie
POST /api/auth/login           { username, password }            -> 200, sets cookie
POST /api/auth/logout                                          -> clears cookie
GET  /api/auth/session                                          -> { user } | 401

GET    /api/games?q=&tag=&page=                                  -> published games (public)
GET    /api/games/:id                                            -> one game (published, or own draft)
POST   /api/games                                                -> create draft (auth)
PUT    /api/games/:id                                            -> update (own game only)
POST   /api/games/:id/publish                                    -> set is_published (own only)
DELETE /api/games/:id                                            -> delete (own only)

GET  /api/games/:id/save                                         -> my SavedState (auth)
PUT  /api/games/:id/save                                         -> upsert SavedState (auth)

POST /api/games/:id/score                                        -> record a play (auth)
GET  /api/games/:id/leaderboard                                  -> best scores (public)

POST /api/games/:id/heart        { value: 'heart'|'hate' }       -> (auth) toggle
GET  /api/games/:id/hearts                                       -> aggregates (public)

GET  /api/me/games                                               -> my drafts+publs (auth)
GET  /api/me/saves                                               -> my saved games (auth)
GET  /api/me/recommendations                                     -> recommended for me (auth)
POST /api/recommendations        { gameId, toUser }              -> recommend (auth)
```

Conventions: JSON body, zod-validated input; every mutation re-validates the
`GameDefinition` with `validateGame`; auth is per-route middleware.

---

## 6. Auth design (specifics)

1. **Storage:** `username` + `password_hash = argon2id(password, salt)` (use `argon2`
   or `@node-rs/argon2`). Never store/return the hash.
2. **Session:** on success, create a `sessions` row with a random token; return it as
   an **httpOnly + Secure + SameSite=Lax** cookie (`__Host-cyoa_sid`). Store only a
   **hash** of the token server-side. Expiry ~30 days with sliding renewal.
3. **CSRF:** for state-changing requests, require a CSRF token (double-submit cookie
   or a header token returned by `/auth/session`). SameSite=Lax covers most; keep the
   token for defence in depth.
4. **Rate limiting:** per-IP + per-username on `/signup` and `/login` (e.g. linear or a
   tiny in-memory/DB counter). Throttle failed logins.
5. **Password policy:** min length 8; a small password-strength check (no dictionary).
6. **Swappable interface (the key abstraction):**
   everything FE/game code touches goes through one type, so adding OAuth/passkeys
   later means a *second implementation*:

   ```ts
   // shared by FE (adapter) and BE (impl)
   interface AuthService {
     signup(username, password): Promise<User>
     login(username, password): Promise<User>
     logout(): Promise<void>
     currentUser(): Promise<User | null>
   }
   ```
7. **Do later (not now):** OAuth (Google/GitHub), passkeys/WebAuthn, MFA, email
   verification, password reset + email, account recovery.

---

## 7. Structured authoring editor (the core feature)

**Shape:** a two-pane editor — left = structured forms, right = **live preview** that
renders the draft through the real `Engine` (WYSIWYG). Drafts are the plain
`GameDefinition`, edited in place with a **runtime-safe editor buffer** (ids
auto-generated; ordering kept stable and reorderable).

**Editor sections** (each maps 1:1 to `GameDefinition` fields):

1. **Game meta:** `id`, `title`, `description`, `author`, `tags`, `intro`,
   `scoring` (`time` | `points` + `points?`), `startingRoom` (dropdown of rooms).
2. **Rooms** (list, reorder, add/delete):
   - `name`, `description`, `mapHint`, `map {x,y}` (grid inputs), `image` (data URI /
     URL / upload → we provide the `svg()` helper as a starter).
   - `doors[]`: `direction` (label), `to` (room dropdown), `requiresFlag` +
     `requireValue`, `lockedText`.
   - `items[]` reference into the Items workspace.
3. **Items** (workspace, add/delete):
   - `id`, `name`, `description`, `image`, `charges?`, `removableWhenEmpty?`,
   - `uses[]`: `label`, `description`, `chargesPerUse?`, `consumes?`,
     `requiresFlag?`/`requireValue?`, and an **effects builder**.
4. **Effects builder** (add one or more per use) — explicit picker, one form per type:
   - `message` (text)
   - `unlockExit` (room dropdown + direction dropdown)
   - `setFlag` (flag + value)
   - `setItemCharges` (item dropdown + number)
   - `addPoints` (number)
   - `destroyItem` (item dropdown)
   - `endGame` (outcome win|lose, message, `points?`)

**Validation:** live `inspectGame()` in a status rail — **errors** block publish/play,
**warnings** show inline (e.g. "item has no uses", "unlockExit on already-open door",
"endGame awards points but game isn't points-scored"). Non-blocking autosave to
`localStorage` (`cyoa:draft:<id>`) so nothing is lost; **Playtest** runs the draft
through a fresh `Engine` in a modal/inline pane.

**Local-first:** everything above works with **no account**. Publishing/cloud-save is
the only thing that needs auth. Until then, "share" = export a **shareable link**
that encodes the validated `GameDefinition` (deflate → base64 → URL fragment), which
readers can play fully offline.

**Future (deferred):** a drag-to-connect visual map editor that emits the same
`GameDefinition`; image upload/asset store; templates/quick-start "story wizard".

---

## 8. Frontend route/state notes

- Decide the **router** early. Given zero deps so far, either use a tiny hash router
  or add `wouter`/`react-router`-free path handling. Hash router keeps it serverless-
  friendly for the MVP.
- Reuse the existing `render()` + `engine.onChange` for the **play screen** — it is
  already correct and the live timer/autosave just needs to write to the backend save
  endpoint instead of (or in addition to) `localStorage`.
- `main.ts` must stop hardcoding `lighthouse`; move to a **game loader** that picks a
  `GameDefinition` from (query param / registry / authored draft / saved).

---

## 9. Security notes (must-do)

- Argon2id password hashing. No plaintext. No logging of credentials.
- httpOnly, Secure, SameSite=Lax cookie; scoped to `__Host-`; never expose session
  token to JS.
- CSRF token on all mutations + SameSite cookie.
- Rate limit `/signup` & `/login`; lockout/backoff on repeated failures.
- Validate + `validateGame` every submitted game; cap payload size (e.g. 1 MB).
- Parameterized SQL via Drizzle (no string interpolation). Zod-validate all inputs.
- Escape/never `innerHTML` user-authored narrative text (render.ts already uses
  `textContent`; keep it that way). Reject `javascript:`/`data:` URLs except the
  allowlisted `svg()` `data:image/svg+xml` form.
- Run backend TLS-terminated in production; HSTS; secure cookie flag.

---

## 10. Milestones & acceptance criteria

**M0 — Foundations (no server). ~small.**
- `main.ts` → game loader/registry (load a `GameDefinition` from a source). Add a
  "browse" placeholder that lists discovered games.
- Export a **share-link** (deflate+base64 URL fragment) for any `GameDefinition`.
- Extract confirmed shared exports (`src/index.ts` is fine) so `server/` can import
  `validateGame`/`types` later.
- ✅ `npm test` green; manual: load lighthouse & post_office via link.

**M1 — Authoring studio (local-first). ~large.**
- Two-pane structured editor per §7; live preview via a real `Engine`; inline
  validation (`inspectGame`); `localStorage` draft autosave; Playtest; export link.
- ✅ Author a new game with zero code, playtest it, share a link that runs offline.
- ✅ Invalid content is caught in the editor, and warnings are shown.

**M2 — Backend + auth. ~medium-large.**
- Hono app + Drizzle + SQLite; schema per §4; `AuthService` (credentials + session
  cookie) per §6; `server/` reuses `src/core/validate.ts`.
- ✅ Signup/login/logout/session round-trip; cookie is httpOnly; argon2 used.
- ✅ CRUD for games; saves; scores; hearts; recommendations endpoints; zod-validated.

**M3 — Wire FE → BE. ~medium.**
- `/browse`, `/play/:id`, `/my-games`, `/my-saves`, `/account`; publish flow;
  cloud saves replace/augment `localStorage`.
- ✅ Browse published games, play one by id, save+resume cross-"device", see my
  played games + score.

**M4 — Social polish. ~medium.**
- Heart/hate on a story; recommend to a friend (by username); leaderboard per game;
  "see played games + score" on profile.
- ✅ Heart/hate persists and is reflected; recommendations land in `/my-recommendations`.

**Deferred:** visual map editor, OAuth/passkeys/MFA, email verification/password
reset, moderation/curation, uploads/assets, DRM.

---

## 11. Proposed file tree (post-M2)

```
cyoa/
  package.json            # add server scripts (dev:api, build:server)
  tsconfig.json           # keep src + tests; add server/ as needed
  vite.config.ts
  server/
    index.ts              # Hono app, mount routes, CORS/session middleware
    db.ts                 # drizzle(sqlite) + schema init
    schema.ts             # Drizzle tables (§4)
    auth.ts               # AuthService impl
    password.ts           # argon2id helpers
    session.ts            # cookie session middleware
    validate-input.ts     # zod schemas + shared validateGame wrapping
    routes/
      auth.ts games.ts saves.ts scores.ts hearts.ts recommend.ts
  src/
    core/{types,engine,validate}.ts   # shared FE+BE (unchanged)
    web/                              # existing render/register loader
    studio/                           # authoring editor components
    games/ {lighthouse,post_office}.ts
  tests/                  # add server integration tests + studio tests
  plans/08-29-authoring-and-accounts.md   # this document
```

---

## 12. Risks / open questions

- **Package layout:** single project vs npm/pnpm workspace. Recommend single now;
  move to a workspace when `server/` and React-free FE tooling differ.
- **Framework choice for the studio:** the app is dependency-light. Decide whether to
  keep vanilla TS + small helpers (consistent with current code) or pull in a minimal
  reactive lib (e.g. Preact/signals) for the studio forms. Recommend staying vanilla
  to match the existing style; revisit if forms explode in complexity.
- **Hosting for the backend:** need a Node host + the SQLite/Postgres DB. Not decided.
- **"Recommend to a friend"** needs users to be findable by username — confirm policy
  (username search vs invite-by-email). MVP: username search, email later.
- **Auth hardening later** (OAuth/passkeys) is explicitly a swap, but plan a place to
  store third-party identities if/when added.

---

## 13. First commit / bootstrap commands

```bash
# From project root (before code changes):
git init && git add -A && git commit -m "chore: snapshot pre-authoring-platform"

npm install --cache ./node_modules/.npm-cache
npm install -D hono  # when starting M2 (or use server deps)
npm run dev          # FE on http://127.0.0.1:5173/
npm test             # Vitest
```

> npm cache note: `/home/brandon/.npm` is read-only — always install with
> `--cache ./node_modules/.npm-cache` (already the established workaround).
