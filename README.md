# Choose Your Own Adventure Framework

A TypeScript framework for building **choose-your-own-adventure** games. It
provides an engine (UI-agnostic) plus a ready-made web renderer, and ships with
a complete demo game, *The Abandoned Lighthouse*, that exercises every feature.

## Features

- **Rooms & doors** — rooms with descriptions, optional images, and labeled
  exits (which may be **locked** until a flag is set).
- **Items you find & *choose* to pick up** — items lie in a room and stay there
  until you take them. Taking one moves it into your inventory and vanishes it
  from the room (so you can't "re-loot").
- **Persistent items** — e.g. a **key** that you use again and again; it never
  leaves your inventory.
- **Consumable items** — e.g. a **lighter** with a single strike of fuel. It has
  `charges: 1`; after you strike it the charge drops to 0 and it disappears.
  `consumes: true` items (like a jar of oil) vanish on use outright.
- **Item actions that change the world** — uses are made of `effects` such as
  `unlockExit`, `setFlag`, `message`, and `endGame`, so a key can open a door
  and a lighter can light a beacon to win.
- **Map for orientation, not travel** — an auto-laid-out map of the whole game.
  Tiles are small; the tile you're standing on is lit, and each explored room
  shows its name and a one-line hint. You move only via a room's exits (no
  teleporting), so the map is for seeing where you've been and where you are.
- **Optional images** — every room and item may have an `image` (URL, data URI,
  or local path), but none are required. The demo ships with hand-drawn SVG
  artwork (see `src/art.ts`) embedded as data URIs, so it works fully offline.
- **Scoring & timing** — games declare how they're scored (`time` or `points`).
  The engine tracks elapsed time and author-awarded points automatically. Use
  the `addPoints` effect to award score mid-game, not just on a win.
- **Save / resume** — the engine can `serialize()` its whole state and rebuild
  itself with `Engine.load(game, saved)`. The bundled web renderer autosaves to
  `localStorage` and offers to resume where you left off — the foundation for
  accounts, cloud saves, and "pick up where you left off."
- **Author-time validation** — `validateGame()` and the `defineGame()` helper
  check a definition at build/startup (duplicate ids, doors to missing rooms,
  bad `unlockExit` targets) and throw a clear `GameValidationError` instead of
  crashing mid-play. The `Engine` constructor runs it automatically.
- **Change-based UI** — the engine emits change events (`engine.onChange(fn)`),
  so any renderer re-renders on every action. The built-in web renderer uses
  this, so controls always work, and its timer ticks live every second.
- **Two shipped games** — *The Abandoned Lighthouse* (points) and *The Flooded
  Post Office* (time-scored), proving the framework is game-agnostic.

## Quick start

```bash
npm install

# Terminal 1 — the API + SQLite backend (stores authored stories, accounts)
npm run dev:api        # http://127.0.0.1:8787  (nodemon-free; rerun to restart)

# Terminal 2 — the frontend (proxies /api to the backend)
npm run dev            # open http://localhost:5173

npm test               # run the full test suite (Vitest)
npm run typecheck      # strict TS check for src + server
npm run build          # production build to ./dist
```

## Author, publish, and share a story

Open `http://localhost:5173`, use the **Account** page to sign up, then head to
the **Studio**. There you can build a story with a structured editor (game meta,
rooms, doors, items, and an effects builder), with **live preview** on the right
and a **validation rail** (errors block publishing). Hit **Publish** and your
story is stored in the SQLite database; **copy the play link** (`…/?game=<id>`)
and share it — readers open it and play straight from the server.

- Publishing/cloud storage needs a (temporary, test-only) account; later it will
  move to better-auth.
- The bundled demo games (`lighthouse`, `post_office`) are always available and
  play offline even if the API is down.
- Auth today is minimal username/password (scrypt-hashed) behind a swappable
  `AuthService`; CSRF and rate-limiting are intentionally deferred to the
  better-auth swap.

## How a game is defined

A game is a plain object: `{ id, title, description, startingRoom, rooms }`.
Each room has `id`, `name`, `description`, optional `image` and `mapHint`, a
list of `doors`, and optional starting `items`.

```ts
import type { GameDefinition } from "../src/core/types";

const myGame: GameDefinition = {
  id: "my-game",
  title: "My Grand Adventure",
  description: "A short explainer.",
  startingRoom: "entrance",
  rooms: [
    {
      id: "entrance",
      name: "The Entrance Hall",
      description: "Dust and cobwebs. A door stands north.",
      mapHint: "Where you begin.",
      doors: [
        {
          direction: "north",
          to: "great_hall",
          // Locked until the "entrance_unlocked" flag is true:
          requiresFlag: "entrance_unlocked",
          lockedText: "The latch won't move.",
        },
      ],
      items: [
        {
          id: "brass_key",
          name: "Brass Key",
          description: "A heavy key that never wears out.",
          uses: [
            {
              label: "Unlock the north door",
              description: "Turn the key.",
              effects: [
                {
                  type: "unlockExit",
                  roomId: "entrance",
                  direction: "north",
                  message: "The lock clicks open.",
                },
              ],
            },
          ],
        },
      ],
    },
    // ... more rooms
  ],
};
```

Then run it:

```ts
import { Engine } from "./src/core/engine";
import { myGame } from "./your-game";

const engine = new Engine(myGame);   // items stay in rooms until you take them
engine.currentRoom;                  // { id, name, description, ... }
engine.availableExits;               // unlocked doors from here
engine.roomItemsHere;                // items lying in the current room
engine.takeItem(anItem);             // pick one up -> into your inventory
engine.tryMove(someDoor);            // go through an unlocked door
engine.useItem(anItemInstance, aUse);// use a carried item (may change the world)
engine.state;                        // state incl. flags, inventory, seen rooms
engine.computeMap();                 // [{ room, x, y }] for layout
engine.onChange(() => reRender());   // re-render whenever state changes
engine.serialize();                  // plain-JSON snapshot for saving
Engine.load(myGame, savedState);     // resume a game from a snapshot
```

Wire it to your own UI, or use the included renderer by making it the game passed
to `src/web/main.ts`.

## Scoring and timing

A game declares how it's scored:

```ts
const myGame: GameDefinition = {
  // ...
  author: "you",
  tags: ["short", "horror"],
  scoring: { type: "points", points: 100 },   // or { type: "time" }
};
```

- `scoring.type: "points"` — the engine accumulates points. Award points on a
  win via `{ type: "endGame", outcome: "win", points: 100 }`, or anywhere with
  the `addPoints` effect:
  ```ts
  { type: "addPoints", amount: 25 },  // e.g. loot a hidden cache mid-game
  ```
- `scoring.type: "time"` — the score is elapsed time (lower is better).

The engine exposes `engine.score`, `engine.elapsedMs`, `engine.isScored`, and
`engine.startedAt`/`finishedAt`. Both are surfaced automatically in the web UI's
status bar and end screen (accumulated `addPoints` show as a ★ chip even in a
time-scored game).

## Save / resume (foundation for accounts & leaderboards)

`engine.serialize()` returns a plain-JSON `SavedState`. Persist it anywhere
(localStorage, an API, IndexedDB) and resume with:

```ts
const saved = JSON.parse(localStorage.getItem("lighthouse")!);
const engine = Engine.load(lighthouse, saved);
```

A resumed `Engine` is fully playable — same room, inventory, locks, flags, seen
rooms, and timing. This is the hook on which login, per-user saves, and "heart
or hate / recommend to a friend / author your own" features can build: identify
a user, key saves by `game.id + user.id`, and store `SavedState` server-side.

## Picking up & aimed item uses

- **Pick items by clicking them on the room art.** Each loose item is a *prop
  sitting in the scene* (positioned via `ItemDef.place` at a point on the room's
  900×400 art), not an obvious button — you have to notice it. Mousing over a
  prop shows it's a hotspot (pointer cursor, a faint dashed ring, a name tag) and
  gently grows it to 110% (animated, shrinking back on mouse-out); clicking its
  bounding box takes it. The "You can take" button row below can be toggled off
  from the play screen to make a story harder / more exploratory — the on-art
  prop click always works.
- **Targeted uses (aim-then-click):** a use can declare `requiresTarget`
  (`{ type: "door", ref: <direction> }` or `{ type: "item", ref: <itemId> }`).
  Such a use can only be executed against something in the **current room** —
  click the item's use to arm it, then click the matching lock/item. This stops
  "unlock the door from anywhere": you must be in the room with the lock.
  Non-targeted uses run directly from the inventory as before.

## Item consumption rules

An item can behave as persistent, one-shot, or charge-limited, depending on two
fields plus the individual use:

| Item behaviour                              | How                                     |
| ------------------------------------------- | --------------------------------------- |
| **Persistent** (stays in inventory forever) | no `charges`, and uses avoid `consumes` |
| **Charge-limited & removed** (lighter, can) | `charges: N` + `chargesPerUse` on uses  |
| **Charge-limited & kept** (a prop that runs out but stays) | `charges: N` + `removableWhenEmpty: false` |
| **One-shot** (removed on use)               | `consumes: true` on the use             |

- When a *charge item* (`charges` is set) drops to `0`, it is removed
  automatically — unless `removableWhenEmpty: false`.
- Even when a charge item persists at `0`, its *charged* actions are no longer
  offered (`chargesPerUse` uses are gated out while empty), so the player sees
  it as drained rather than endlessly reusable.
- Persistent items have **no** `charges` field, so they are never "emptied."

### World-changing effects

`unlockExit` looks up a specific door by `roomId` + `direction` and flips the
flag that door requires, so afterwards `tryMove` succeeds. Flags are stored in
`engine.state.flags` and can also gate which item-use is offered via
`requiresFlag` / `requireValue` on the use (e.g. *Light the beacon* only shows
after the beacon is fueled).

## Validating your game

Bad definitions fail loudly at startup instead of mid-play. Either wrap your
definition in `defineGame()` (which validates at author time):

```ts
import { defineGame } from "./src/core/validate";

export const myGame = defineGame({ id: "my-game", /* ... */ });
```

…or rely on the fact that `new Engine(game)` runs `validateGame()` automatically
and throws a `GameValidationError` with a clear message on problems such as:

- a `door.to` pointing at a room that doesn't exist,
- duplicate room or item ids,
- an `unlockExit` referencing an unknown room or a door the room doesn't have,
- an effect (`destroyItem` / `setItemCharges`) naming an item that isn't defined,
- `scoring.type` that isn't `"time"` or `"points"`.

`inspectGame(game)` returns *all* issues as `{ level, message }[]` (warnings for
non-fatal things like "item has no uses" or an `unlockExit` on an already-open
door), and `isValidGame(game)` checks for the absence of errors. The demo games
are validated in the test suite so a regression fails CI.

## Project layout

```
server/                  # Node API (bare node:http + node:sqlite)
  index.ts               # router + listener (PORT 8787)
  db.ts                  # SQLite schema/helpers (node:sqlite)
  auth-service.ts        # AuthService seam + credentials/session impl
  password.ts            # scrypt hashing (temporary, pre-better-auth)
  routes/ auth.ts games.ts json.ts
src/
  core/
    types.ts      # GameDefinition, RoomDef, ItemDef, Door, ItemUse, GameEffect
    engine.ts     # Engine: nav, manual pickup, item use, unlock, scoring, save
    validate.ts   # validateGame / defineGame / inspectGame / isValidGame
  art.ts          # hand-drawn SVG artwork (rooms + items) as data URIs
  games/
    lighthouse.ts # Demo game #1: "The Abandoned Lighthouse" (points-scored)
    post_office.ts# Demo game #2: "The Flooded Post Office" (time-scored)
  web/
    main.ts       # hash router -> play/studio/browse/account
    api.ts        # FE fetch client (the only API touchpoint)
    router.ts     # tiny hash router + play/studio URL builders
    registry.ts   # bundled demo games (offline fallback)
    play.ts       # play screen (autosave/resume/timer)
    browse.ts     # published + demo games listing
    account.ts    # temporary login/signup + my-games
    render.ts     # room view, room items to take, inventory, map, ended screen
    styles.css    # theming (incl. studio + nav)
  studio/
    state.ts      # runtime-safe draft buffer helpers (pure, tested)
    studio.ts     # two-pane authoring editor (forms + live preview + rail)
tests/
  smoke.test.ts   # lighthouse walkthrough: pickup, win & lose, save/resume
  engine.test.ts  # engine unit tests: nav, items, effects, serialize, map
  validate.test.ts# author-time validation (validateGame / inspectGame)
  games.test.ts   # both demo games: connectivity + post_office mechanics
  server.test.ts  # API integration: auth round-trip, games CRUD, ownership
  studio.test.ts  # draft-buffer helper logic
  helpers.ts      # tiny game builders for the engine unit tests
```

## Product scope & engine boundaries

`docs/product/engine-boundaries.md` is the canonical product constitution: it defines
qc-cyoa as an **illustrated, voiced, point-and-click adventure creator** (SCUMM-like
runtime, CYOA-like learning curve), records the engine primitives that fit the product,
hard non-goals, and a decision test for future engine/Studio features. **Read it before
making product-level engine or Studio architecture changes** (see `AGENTS.md`, the
agent-instruction pointer). `docs/roadmap.md` is the canonical current implementation
sequence.

The docs in `plans/` (`target-genre-and-editor.md`, `research-he-games.md`,
`history-and-architecture.md`) are **earlier pivot/handoff documents retained for
historical and design context** — not current direction. Where they conflict with
`docs/roadmap.md` or `docs/product/engine-boundaries.md`, the canonical docs win.

## Adding your own images

Assign any of the following to `RoomDef.image` / `ItemDef.image`:

```ts
// a regular URL
image: "/public/my-room.png",
// or a data URI — great for embedding generated SVG
image: svg(900, 400, "<rect .../>"),
// or omit image entirely — the UI simply leaves the art area empty
```

The `svg()` helper in `src/art.ts` wraps raw SVG markup into a `data:` URI, so
you can author images right inside your game code. Only rooms with an `image`
show artwork; the rest render as a clean empty panel.

## Notes

- The engine/framework code has **no runtime dependencies**. The dev-only
  toolchain (Vite, Vitest, TypeScript) may report an occasional "vulnerabilities"
  audit line; it's not shipped in the bundle and doesn't affect users.
- The wrapped renderer autosaves the current game to `localStorage` under
  `cyoa:save:<gameId>`, so a refresh (or returning later) offers to resume. It
  clears on "Play again". In private browsing / storage-disabled contexts it
  silently falls back to no persistence.