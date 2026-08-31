# Target: a Humongous-style adventure engine + authoring editor

> **Status — historical/design context.** This is an **earlier pivot/handoff document
> retained for historical and design context**, not current product direction. Its
> art/runtime framing (e.g. "SVG is the default") predates the current roadmap. The
> **canonical current implementation sequence** is `docs/roadmap.md`, and the **canonical
> scope boundary** is `docs/product/engine-boundaries.md`. Where this document conflicts
> with either, the canonical docs win.
>
> **Purpose.** It records the original **product we were building** at the pivot so work
> can continue without re-explaining it. Companion docs: `history-and-architecture.md`
> (where we came from) and `research-he-games.md` (the games we're modeling).
>
> **Scope boundary:** before proposing **engine/Studio architecture changes**, read the
> canonical product constitution at `docs/product/engine-boundaries.md` (what the product
> is, what it is not, and the feature decision test), and the current sequencing in
> `docs/roadmap.md`.

---

## 1. What we're building (one paragraph)

A **web-based point-and-click adventure game engine and editor** in the spirit of
**Humongous Entertainment's** Freddi Fish / Putt-Putt / Pajama Sam — not a branching-text
CYOA anymore. The *player* moves through **full-bleed, non-clipped room scenes**, clicks
things to get reactions and collect **discoverable items**, and uses those items on
**environmental hotspots** to solve gentle puzzles and reach a goal. The *author* uses a
built-in **editor** to make those worlds without writing code. Eventually authors can
**publish and share** games, players can **browse and play** others' games, and the editor
will use **AI (a cloud LLM API)** to help generate SVG art and dialogue.

Emphasis: **SVG is the default** image format, but **raster (PNG/JPEG) is fully supported**
for both scenes and props. One *strong, complete* example game is worth many partial ones.

## 2. Authoring model (from "write code" today → "point and click" tomorrow)

We already have a form-based studio (`src/studio/`). The target is a **scene authoring
canvas**:
- Lay out a room: drop background art (SVG preferred, raster allowed) into a **non-clipped,
  full-bleed scene** (not a 9:4 clipped card).
- Place **hotspots** (clickable regions) anywhere on the scene — characters, objects,
  interactions.
- Mark hotspots as **pickupable item** (goes to inventory), **interactive prop** (posts a
  witty `look` line), **dialog**, or **exit** (screen-edge traversal to an adjacent scene).
- Draw **inventory items** with their `uses`, each optionally **targeted** at a hotspot.
- Wire **puzzles**: "use item X on hotspot Y" opens the next area.
- Set a **goal/act structure** and win condition.

## 3. Player runtime (what the game *is*)

- **Full-bleed scenes** — the background art fills the play surface, never clipped to a
  card, no sidebar of exit buttons as the primary nav. Movement is **not** a node map; it's
  **screen-edge arrows** to adjacent scenes (Freddi Fish style). (A minimap may exist as an
  optional aid but is not the main navigation.)
- **Click anything → react.** Every scene has several **interactive props** that give a
  funny spoken/text line with **no game-state change** (Monkey Island / Humongous humor).
- **Discoverable collectibles.** Items sit in the scene at coordinates; you notice and click
  them to collect. Hovering shows they're interactive (the grow-to-110% + name-tag we
  already ship).
- **Grab-and-drop item use.** Click a carried item → it attaches to the cursor → click a
  highlighted valid hotspot to use it, or click empty space to put it back. (We already
  shipped this exact interaction for targeted uses.)
- **Gentle puzzles, no punishment.** Items unlock the next section. Wrong clicks are jokes,
  never failures. Soft "lose"/reset, no timers, no death.
- **SVG-first rendering**, raster supported, both seamless in the same scene.

## 4. Feature/architecture implications for the codebase

The `Engine` already models data (rooms, items, uses, flags, effects, saves, validation).
Most of the work now is **renderer + input + editor**. Directions:

1. **Scenes over "room cards".** `RoomDef` already has `image`, `interactives`, `items`
   with `place`. Extend toward: non-clipped full-bleed layout, **free-form hotspot regions**
   (polygons/rects on the scene, not just fixed item sprites), and **screen-edge traversal
   exits** replacing the door-button list and node-map nav. Keep the engine's `Door`/
   reachability *logic*; change how it's presented.
2. **Unify hotspot authoring.** A scene contains: pickupable items, interactive props,
   dialog, and exits — all placed by the author. Consider a shared `Hotspot` type with
   `kind`, `region`, `useTargetId`, and `look`. (Today `ItemDef.place` + `RoomDef.interactives`
   are separate; unify in the editor even if storage stays split.)
3. **Drag-and-drop item use** is done. **Generalize its target vocabulary**: any hotspot can
   be a target, and "use item on hotspot" is the puzzle primitive (already `requiresTarget` +
   grab-and-drop, just point it at arbitrary hotspots).
4. **Non-clipped image handling.** Raster AND SVG must render full-bleed without the
   current 9:4 `object-fit:cover` cropping. Aspect should be free; the scene fills the
   available play area (letterbox only as a last resort), and hotspots must stay aligned
   with the rendered art regardless of aspect. This is the biggest rendering change from
   today's `.room-art` + percentage-positioned props.
5. **One flagship demo.** Replace/augment the two games with **one comprehensive example**
   that exercises every feature: full-bleed scene, discoverable props, grabbed item usage on
   multiple hotspots, screen-edge movement, a gentle multi-step puzzle arc, a win condition,
   and humor throughout. SVG-first world with at least one raster asset to prove both.
6. **Save/state** already serializes; keep it. AI generation hooks should integrate at the
   *editor* level (generate an SVG scene / prop / dialogue, then author places it) — not in
   the core engine.

## 5. Product roadmap shape (what the user described)

- **Core:** the engine + player runtime for this genre.
- **Editor:** scene canvas authoring; publish to the existing backend (`server/` + SQLite).
- **Community:** browse/play other authors' games (already the `/api` + registry model).
- **AI-assisted authoring (future):** call a **cloud LLM API** to (a) generate SVG scenes/
  props and (b) help write dialogue. Keep these as editor-side, optional features.

## 6. Where to start next time (suggested order)

1. **Rendering/scene first:** convert the play surface to **non-clipped, full-bleed** scenes
   that accept arbitrary SVG or raster, with **hotspots that stay aligned** at any aspect.
2. **Unify the hotspot/hotpiece model** and expose it in the editor canvas (drag-to-place
   regions, mark pickup/interactive/dialog/exit).
3. **Generalize grab-and-drop to any hotspot**, so "use item on hotspot" is the puzzle
   primitive for every kind of target.
4. **Screen-edge traversal** between adjacent scenes, replacing button/map navigation as the
   primary means of movement.
5. **Build the one flagship demo** exercising all of the above.
6. **Then** the editor scene-canvas authoring UX, then AI helpers, then community.

## 7. Golden rules to preserve

- **SVG by default, raster always supported.**
- **A solid, single demo beats several thin ones.**
- **Every chapter of interaction is a discoverable, low-friction, humorous event** — the
  Freddi Fish "click anything, it's fine and probably funny" ethos.
- **The engine stays data/logic-pure and serializable** so saves, sharing, and future
  AI-generation stay clean.