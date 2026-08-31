# qc-cyoa Product Constitution: Engine Boundaries

> **Purpose.** This is the canonical product document for qc-cyoa. It defines what the
> product **is**, what it is **not**, and which engine/Studio boundaries future
> development must not casually cross. Read it before proposing or planning any
> product-level engine or Studio architecture change.
>
> **Status.** Source of truth for product scope. Earlier pivot/handoff write-ups and a
> history of the pivot live in `plans/` (`target-genre-and-editor.md`,
> `research-he-games.md`, `history-and-architecture.md`) and are retained for historical
> and design context, **not** current direction. Current implementation sequencing lives in
> `docs/roadmap.md`; this document records the scope boundaries the product must not cross.
> Where those `plans/` docs conflict with `docs/roadmap.md` or this document, the canonical
> docs win.

---

## 1. Core product definition

**qc-cyoa is an illustrated, voiced, point-and-click adventure creator with a SCUMM-like
runtime and a CYOA-like learning curve.** It exists to let ordinary, non-programmer
creators make and share small illustrated point-and-click adventures in the spirit of
classic child-friendly adventure games (Freddi Fish, Putt-Putt, Pajama Sam).

The basic authoring experience should feel approximately like:

1. create a room;
2. choose/generate/upload a background;
3. place characters, props, items, and exits;
4. choose what happens when the player taps something;
5. write or generate dialogue and optionally attach stored voice audio;
6. connect rooms;
7. add simple inventory/item-use puzzles when desired;
8. playtest and publish.

A creator must be able to make a very simple game with only rooms, dialogue, and exits.
More powerful interaction must reveal itself progressively rather than being required up
front. The flagship game may deliberately exercise much more of the runtime than an
ordinary first-time author will use.

---

## 2. "SCUMM-like runtime, CYOA-like learning curve"

The defining tension this product navigates is:

> The runtime may be capable underneath, but authors should be able to make a simple
> adventure without learning programming, state-machine terminology, boolean logic, or a
> general-purpose event system.

- The **runtime** behaves like a point-and-click adventure engine: illustrated rooms,
  layered characters and props, click hotspots, dialogue, spoken audio, inventory, and
  inventory-onto-environment puzzle solving.
- The **authoring learning curve** must stay as low as a choose-your-own-adventure:
  "room → art → things in the room → what happens when tapped."

The runtime underneath may use generic concepts (triggers, conditions, actions), but that
is an implementation detail. It must not leak into ordinary authoring workflows.

---

## 3. Principle: simple case is a subset of the powerful case

Do **not** create separate "CYOA mode" and "SCUMM mode" engines unless a future proven
need requires that split.

- A three-room story with dialogue and exits must be expressible using the same
  underlying game representation as a richer inventory-puzzle adventure.
- Simple authors must not need to interact with advanced capabilities they are not using.
- Advanced capabilities must appear progressively when the creator asks for them.

The Studio UI should present human concepts such as *When this is tapped...* → *Say
something*, *Give an item*, *Go to another room*, *Play a sound*, *Reveal something*,
*Change how this looks* — and only introduce additional conditions when needed.

---

## 4. Authoring UX: progressive disclosure

The primary usability target is **not** "a developer can understand the schema." The
target is:

> **A non-programmer can make a tiny playable adventure quickly, then discover more power
> only as they need it.**

A first-time creator must not be confronted with concepts such as:

- state variables;
- condition expressions;
- event graphs;
- serialization;
- predicates;
- action pipelines;
- scene-graph internals.

Those concepts may exist underneath or in advanced tooling, but ordinary workflows should
describe **player-visible intent**. Prefer forms such as:

- "Only show after the door is unlocked";
- "After the player picks up the key";
- "When the cup is used on the sink";

rather than requiring authors to manually define variables and boolean expressions
whenever a common adventure concept can be represented directly.

---

## 5. Engine capabilities that fit the product

The runtime must remain an **adventure runtime**, optimized for:

- illustrated rooms;
- layered characters and props;
- tap/click hotspots;
- room-to-room navigation;
- dialogue;
- stored spoken audio;
- inventory collection;
- selecting an inventory item;
- using inventory items on environmental targets;
- simple puzzle state;
- object visibility/state changes;
- room presentation variants;
- simple timed/sequenced presentation changes;
- one-shot vs. repeatable interactions;
- persistent game state / save-resume;
- responsive phone and desktop play.

The engine **must** remain **data-driven, declarative, serializable, and safe to
interpret**. It must not require or encourage arbitrary author-provided executable code
for ordinary game behavior.

---

## 6. Hard non-goals / scope boundaries

These capabilities are **out of scope** for the product's engine identity unless real user
demand and a deliberate product decision justify crossing the boundary. qc-cyoa must not
drift into a generic engine supporting:

- platforming;
- real-time action combat;
- physics simulation;
- arbitrary 2D/3D movement systems;
- general-purpose skeletal animation tooling;
- multiplayer gameplay;
- arbitrary scripting/plugin execution;
- user-supplied JavaScript;
- ECS-style general game architecture exposed to creators;
- general RPG stat/skill/combat systems;
- general visual programming with dozens/hundreds of node types;
- arbitrary event buses exposed as the primary authoring model;
- unrestricted boolean/programming DSLs as the normal creator experience.

If a proposed feature makes the product substantially more like Unity, Godot, GDevelop,
Construct, RPG Maker, or a generic visual-programming system, stop and ask whether that
capability is truly necessary for small illustrated adventures. The correct answer may
still occasionally be **yes**, but it requires an explicit scope decision, not entry
through incremental feature creep.

---

## 7. AI's role: creation assistant, not gameplay runtime

AI should help **hide configuration complexity** rather than introduce runtime dependence
on AI.

- A future author may express intent naturally, e.g. *"When they pick up the flashlight,
  make the cave entrance clickable, but only after they talked to Grandma."*
- AI may translate that request into the same safe declarative game representation used by
  Studio.

**Rule:** AI may assist in writing configuration/content; the published gameplay must not
require an LLM to interpret normal player actions. Prefer **generate/configure once,
store, and run deterministically.**

---

## 8. Art / layering principles

The product must support multiple cost/quality paths without changing the fundamental
game model:

- **uploaded user art** — accessible/free path;
- **reusable existing/community assets** — normally no new inference cost;
- **SVG generation** — very cheap optional generation path;
- **raster generation** — likely default-quality AI-art path;
- **premium/instant/remix generation** — may exist later as paid credit actions.

Do **not** lower the flagship's visual design merely to force SVG to be the default
quality tier.

**Layering rule:** Room backgrounds should normally remain static art without important
mutable interactive items baked into them. Characters, props, collectible items, exits,
and puzzle targets should normally be **separate layered assets** so their state can
change independently.

---

## 9. Flagship vs. normal author scope

The flagship Pacific Northwest Bigfoot adventure is intentionally allowed to use a large
percentage of the sane runtime envelope. It should serve as:

- a showcase;
- a mascot/story vehicle;
- a runtime requirements test;
- a Studio requirements test;
- a regression/reference game.

Do **not** assume normal creators need to build games equally complex. A successful
ordinary first creation may be as small as:

- three rooms;
- one character;
- one collectible item;
- one simple item-use puzzle;
- a beginning and an ending.

The authoring UX must optimize heavily for creators actually finishing these small games.

---

## 10. Runtime complexity rule (when to add a primitive)

Every proposed runtime primitive must answer at least one of these questions:

1. Does the flagship adventure concretely require this?
2. Does more than one ordinary adventure pattern clearly need this soon?
3. Does adding it materially simplify authoring for normal creators?

If the answer to all three is **no**, defer it. Do **not** build generic capability merely
because it would make the engine theoretically complete. Prefer a small closed vocabulary
of adventure interactions that expands when a real game earns the need.

---

## 11. Decision test for future features

Before expanding the engine or Studio, run this short review test:

1. Does this help make small illustrated point-and-click adventures?
2. Is this required by a real authored game or repeatedly requested workflow?
3. Can it be expressed as a small declarative primitive?
4. Can a normal creator use it without learning programming concepts?
5. Can complexity be hidden until the creator needs it?
6. Does it keep gameplay deterministic and largely AI-independent?
7. Are we accidentally rebuilding a general game engine?

If the feature fails this test, **simplify or defer it.**

---

## 12. Product risk: creator completion, not engine capability

The largest uncertainty is **not** whether the engine is technically buildable. The larger
product risk is whether creators:

- start creating;
- reach a playable result quickly;
- finish an adventure;
- share it;
- return to make another;
- eventually pay for optional AI-assisted creation.

Feature decisions must therefore be evaluated partly against **time-to-first-playable
result** and **completion rate**, not only engine capability. A technically elegant
feature that makes Studio more intimidating may be a net product loss. **Creator
completion/retention is a greater product risk than technical engine capability.**

---

## 13. The one question

After any proposal, read this document and answer:

> **Does this make qc-cyoa better at letting normal people finish small illustrated
> point-and-click adventures, or are we accidentally turning it into a generic game
> engine?**

If that answer is unclear, this document is not specific enough — sharpen it.

---

## 14. Agent / repository linkage

This document is the **single canonical source of truth** for product-level engine and
Studio scope. Do not duplicate it into multiple instruction files; link to it instead.

Agents reach it through a small pointer chain — each has exactly one link, not a copy:

- `AGENTS.md` (the repository's agent-instruction surface) points to this document before
  any product-level engine/Studio architecture work, and applies the §11 decision test;
- `docs/roadmap.md` is the **canonical current implementation sequence** and this document
  is the **canonical scope boundary**;
- the `README.md` project overview references both under "Product scope & engine
  boundaries".

Where substantive art/runtime direction needed from earlier planning, note that the docs in
`plans/` (`target-genre-and-editor.md`, `research-he-games.md`, `history-and-architecture.md`)
are **earlier pivot/handoff documents retained for historical and design context**, **not**
current direction; their art/runtime claims (e.g. "SVG is the default") predate the current
roadmap and may conflict with `docs/roadmap.md` or this document. **Where they conflict, the
canonical documents win.** Do not treat those plan files as authoritative for what the
product is building now.

Keep this pointer chain minimal: this document stays the one source of truth, and adding a
new link should only ever point back here.
