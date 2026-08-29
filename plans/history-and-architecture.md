# The Journey So Far: Architecture & History

> **Purpose.** This doc is the first of three linked write-ups that record the pivot
> of this project from a *choose-your-own-adventure framework* into the beginnings of a
> **full-room, point-and-click adventure game engine with an authoring editor** (the
> "Humongous Entertainment" style of games — Freddi Fish, Putt-Putt, Pajama Sam). This
> file captures **what we built and why**, so a future session can write the eventual
> from-start-to-finish story. Read it alongside:
>
> - `research-he-games.md` — how Freddi Fish / Putt-Putt / Pajama Sam actually work.
> - `target-genre-and-editor.md` — the target game genre and the editor/engine we're building.

---

## 1. Where we started (commit `4361daa`)

Originally this was a **generic CYOA framework**: rooms, inventory items, usable items,
locked doors, and a backtracking map. The selling point was a **UI-agnostic, serializable
`Engine`** — the game logic (rooms, doors, flags, items, effects) lives entirely in
plain-data `GameDefinition` objects and is simulated by a headless `Engine` that emits
change events. Because state is pure data, games can be saved (`serialize()`/`Engine.load`),
shared, and driven by any UI.

Core types (still relevant today):
- `RoomDef`, `Door`, `ItemDef`, `ItemUse`, `GameEffect`, `GameScoring`, `GameDefinition`
- `Engine` — the pure-logic simulator: `tryMove`, `takeItem`, `useItem`, `setFlag`,
  `useAvailable`, `availableUses`, `isUnlocked`, `aimableTargets`, `observe`,
  `serialize`/`Engine.load`, `computeMap`.
- `validateGame` / `inspectGame` / `defineGame` — author-time safety.

The demo game then was **"The Abandoned Lighthouse"** — text-description rooms, door
buttons, and a map grid. Items were picked up from a "You can take" button row. Locked
doors were opened by selecting a key from inventory and clicking a "use" button.

## 2. Authoring + accounts (commit `4ea1eea`)

We added a **production backend** and shifted from local-first embeds to **DB-backed
sharing by id** (`/?game=<id>`):
- `server/` — a depend-light `node:http` server (no Hono), `node:sqlite` (built-in) for
  storage, minimal-but-swap-ready temp auth (username/password, scrypt-hashed, httpOnly
  session cookie) behind an `AuthService`, plus routes for auth, games CRUD, and JSON save.
- `src/studio/` — a structured, form-based **authoring studio** with a live preview.
- `src/web/` — a small hash router (`#/play`, `#/studio`, `#/browse`, `#/account`, `#/`),
  an API client, a **registry fallback** for bundled demo games when the API is unreachable,
  and browse/account screens.
- `vitest` tests (~77 at time of writing) and strict `tsc` across `src/` and `server/`.

This is when the project genuinely became *a platform* (author games, publish them, share
a link, browse others) rather than just a single-game framework.

## 3. Discovering the pivot: the interaction began changing

Once we started playing with the lighthouse as a *real* player, the text/CYOA framing kept
rubbing against the experience we wanted. A series of feature requests, each of which nudged
the engine and renderer further away from "choose your own adventure" and toward
"point-and-click adventure":

- **Targeted item uses can only affect what's in your current room** (`requiresTarget`
  + `RoomTarget`). The brass key no longer unlocks a door from anywhere — you must be in
  the room with the lock. (This was the first real "adventure game" constraint: inventory +
  environment interplay, not menu-driven unlocks.)
- **Items appear in the scene as discoverable props.** Instead of a "take" button list, the
  key/crowbar/etc. sit in the room art at `ItemDef.place` coordinates. You have to *notice*
  them, hover to confirm they're interactive (grow to 110%, name tag), and click to collect.
- **Interactive but non-pickupable props** (`RoomDef.interactives` / `InteractiveDef`):
  Monkey Island-style "look at" gags — click a seagull, the black sea, a marked jar, and a
  witty line posts to the message box without changing game state (`Engine.observe`).
- **Grab-and-drop item use.** The two-step "aim then click apart" flow was replaced: *click
  the item → it attaches to your cursor (a floating sprite follows the mouse) → click a
  highlighted target to apply, or click empty space to drop it back to inventory.*

The cumulative result: the renderer and interaction model now behave like a **point-and-
click adventure**, while the engine still thinks in serializable data. This is the moment in
the write-up where the project's identity genuinely changed from *CYOA* to *adventure-game
engine + editor*.

## 4. Current architecture (at the pivot)

```
src/
  core/             engine, types, validation       <- pure, UI-agnostic game logic
  games/            lighthouse + post_office demos  <- the two shipped examples
  art.ts            hand-rolled SVG (rooms, items, interactive props)
  web/              router, render, play, studio(host), browse, account, api, registry
  studio/           the form-based authoring editor + live preview
server/             bare node:http + node:sqlite backend, temp auth, save routes
tests/              vitest suites
plans/              roadmap + these write-ups
```

Notable invariants to preserve in the pivot:
1. **Logic is data.** `GameDefinition` is plain JSON-serializable; `Engine` is headless and
   emits change events. Any UI can drive it.
2. **Saves are data.** `serialize()` produces `SavedState`; resumes via `Engine.load`.
   (Current: local-only; cloud saves are a planned step.)
3. **Validation is author-time.** `validateGame` gives actionable errors/warnings before a
   game ships.
4. **Discovery-dense scenes.** Items/interactives live at scene coordinates and reward
   attention, not menus.

## 5. Architectural friction points the pivot reveals

- **"Rooms" here are text+9:4 image cards with exit buttons and a grid map.** The
  Humongous-style target wants **full-bleed, non-clipped scenes** with free-form clickable
  hotspots, no explicit "go north" buttons, and no node-map as the primary navigation. The
  engine's notion of doors/exits remains useful (the *logic* of reachability) but the
  *presentation* must shift.
- **SVG-first, raster supported.** `art.ts` already emits SVG data-URIs; we want both formats
  as first-class, and the editor to author placement freely (not just fixed 900x400 items).
- **The engine is CYOA-shaped** (flags, locks, consume/points). Humongous games are about
  collecting items and solving **environmental puzzles**. Much of `GameEffect` still maps
  (consume, set-flag, unlock, message, points, win/lose), but the *interaction* vocabulary
  needs expanding (e.g. "use item on hotspot", "combine items"?).
- **One strong example beats several weak ones.** The user asked for a single comprehensive
  demo that exercises every feature, rather than two partial ones.

## 6. Recommended write-up arc (for the eventual "from start to finish")

1. The generic CYOA framework and its pure-engine idea.
2. The platform turn: authoring, accounts, share-by-id (and the abandoned embed-link idea).
3. The interaction epiphanies (in-room targeting, discoverable props, interactive props,
   grab-and-drop) and what each taught us about the real product.
4. The pivot to the Humongous-style point-and-click adventure engine + authoring editor.
5. Where the codebase now lives vs. where the target requires it to go (see the other two
   docs for the destination).