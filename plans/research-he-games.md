# Research: Humongous Entertainment point-and-click adventures

> **Purpose.** Understand the games the user wants to build toward — **Freddi Fish,
> Putt-Putt, and Pajama Sam** (and the broader Humongous "Junior Adventures" line). These
> are the reference point for the pivot from a CYOA framework to a **room-based,
> point-and-click adventure engine with an authoring editor**. This is research only; the
> actionable design is captured in `target-genre-and-editor.md`.
>
> Sources are linked inline; the key community references are the
> [Humongous/Freddi Fish fan walkthrough wiki](https://humongous.fandom.com/wiki/Freddi_Fish_and_the_Case_of_the_Missing_Kelp_Seeds/Walkthrough),
> [Freddi Fish FAQs/walkthroughs](https://gamefaqs.gamespot.com/unixlinux/799959-freddi-fish-2-the-case-of-the-haunted-schoolhouse/faqs/62141),
> [MobyGames Putt-Putt reviews](https://www.mobygames.com/game/1017/putt-putt-joins-the-parade/reviews/dos/),
> and [SCUMM (engine lineage)](https://wiki.scummvm.org/index.php?title=SCUMM).

---

## 1. What these games are

A **first graphical adventure designed for young children** (ages ~3-8), in the mold of
classic PC point-and-click adventures but stripped of every barrier that would frustrate a
kid: **no fail states, no death, no time pressure, no "wrong" actions.** The player moves a
little character through **hand-painted, full-screen rooms**, clicks on things, and works
toward a gentle goal (find Grandma Grouper's missing treasure; deliver the moon cheese).

Key franchise identities:
- **Freddi Fish** — an underwater detective series. Scoop up objects, talk to quirky fish,
  solve a light mystery. Navigation is via **screen-edge arrows** to adjacent underwater
  scenes, not a menu or a node map. ([Freddi Fish overview](https://en.wikipedia.org/?curid=3419222))
- **Putt-Putt** — a purple car you drive around (left/right, into buildings) pursuing a
  simple objective (e.g. join the parade, save the zoo). Movement is literal point-to-point
  traversal of environments; buildings are click-to-enter.
  ([Putt-Putt review context](https://www.mobygames.com/game/1017/putt-putt-joins-the-parade/reviews/dos/))
- **Pajama Sam** — a pajama-clad boy solving a fear-of-the-dark mystery. Same engine
  principles: collect tools, use them on environmental problems, lots of spoken humor and
  optional silliness. ([Pajama Sam mechanics reference](https://patents.google.com/patent/US20120004031))

They all share **one shell** — descended from the classic **S.C.U.M.M.** engine Humongous
built out of LucasArts' SCUMM heritage for this very "Junior Adventures" line
([SCUMM lineage](https://wiki.scummvm.org/index.php?title=SCUMM)).

## 2. The core mechanics (what "works")

**Ingredient list** — this is the direct blueprint for our engine:

1. **Full-bleed rooms, unclipped.** The whole screen *is* the scene — no text card, no
   windowed art, no sidebar of buttons. Scenery fills every edge to sell the space.
2. **Click-to-interact on anything visual.** The player clicks characters, objects, decor —
   and gets a spoken line, a joke, or a reaction. Many clicks are **pure flavor**
   (satire/fun), exactly the Monkey Island-standard the user already asked for. This is the
   interaction we began building with `RoomDef.interactives` / `Engine.observe`.
3. **Discoverable collectibles.** Important items are not announced — they're **placed in
   the scene** (in plain sight or partially hidden) and you must notice them and click them
   to add to your inventory. (Confirmed by Freddi Fish walkthroughs: you find the item,
   then figure out where its use goes.
   [Freddi Fish 1 walkthrough](https://humongous.fandom.com/wiki/Freddi_Fish_and_the_Case_of_the_Missing_Kelp_Seeds/Walkthrough))
4. **Inventory + environmental puzzle solving.** You carry a small set of objects and use
   them **on specific parts of the environment** to unlock progression (e.g. the
   [crank handle](https://humongous.fandom.com/wiki/Crank_handle) raises the piano,
   [oil can](https://humongous.fandom.com/wiki/Oil_can) frees a wheel). This is precisely
   our `requiresTarget` / grab-and-drop mechanic — generalized from "door lock" to *any*
   hotspot.
5. **Sequencing / act structure.** Adventures typically organize into a soft
   "collect → use → resolve" arc with a clear win goal. Rooms are one-way-gated: you can
   explore a lot, but a locked door / lever / unfixable machine opens the next section.
6. **Spoken response on actions.** Rooms and items give *audio* reactions; voice acting
   lowers the reading floor for kids. (Text should remain for our web-first, SVG-text
   authoring, but the principle — immediate, characterful feedback on every click — holds.)
7. **No punishment.** Fail isn't possible. Wrong clicks get a joke, not a penalty. This
   guarantees a safe, explorable, goldfish-attention-span-friendly session.

## 3. What made them *work* (design principles to steal)

- **Exploration feels rewarding, not gated.** You can wander and click on everything; the
  world reacts. Confidence comes from "I can touch anything and it's fine."
- **Humor is the fuel.** A huge fraction of content is jokes and gags, not plot. It
  converts gross clicks into delight and makes discovery self-sustaining.
- **Low, implied instruction.** No tutorial walls. The interaction model (click thing →
  react) is learned in seconds by doing.
- **Accessibility by design.** Spoken lines, big targets, forgiving click areas, no
  timers, no death. (Scholarship on these games' learner-friendly "direct access to
  meaning" backs this up — see the ALSC study noting the environment's reliance on visual
  induction. [ALSC article](https://journals.openedition.org///alsic/5995))
- **A single clear goal.** Each game is "help X do Y" — simple enough for a 4-year-old to
  restate, but with enough hidden steps to feel substantial.
- **One heroine/hero and a coherent world.** The world is small but dense and consistent,
  so every screen feels like a real place.

## 4. Concrete interactions to model in our engine

| Humongous interaction | What we already have | What we must add |
|---|---|---|
| Full-bleed room, no clipped art | `RoomDef.image` + `.room-art` (9:4) | Non-clipped, flexible aspect; scene fills the whole play surface |
| Click-to-talk / click-to-joke hotspots | `RoomDef.interactives` + `Engine.observe` | Hotspot regions with position; spoken/flavor handler |
| Click-to-collect placed items | `ItemDef.place` props on the art; grab on hover | Multiple item appearances; collectible de-dupe |
| Use item on environmental hotspot | `requiresTarget` + grab-and-drop | Generalize target to any hotspot; "combine item" optional |
| Screen-edge movement between rooms | door buttons + map | Off-screen arrows that traverse to adjacent scenes |
| Sequencing via locked doors / machines | `Door.requiresFlag`, unlock effects | Persistent "world state" toggles; flags already do this |
| No-fail, no-death safety | ends = win/lose/points | Keep lose soft ("walk away") rather than harsh; safe reset |
| Act structure / clear goal | flags + scoring | Author-authored act/goal; optional progress tracker |

## 5. Bottom line for the pivot

These games are **room-based, object-interactive point-and-click adventures** where the
enginness and juice is in *responsive, humorous, exploratory scenes* rather than branching
narrative menus. Our existing `Engine` (rooms, items, uses, flags, effects, saves,
validation) already covers the **logic**; the work is in the **presentation and input
model** (full-bleed scenes, free hotspots, screen-edge traversal, grab-and-drop onto any
hotspot) — and an **editor** good enough to author that without code.

The user's vision folds in a big feature beyond the original games: an **authoring editor**
and eventually **AI-assisted generation** (SVG scenes + dialogue via a cloud LLM), plus
**browse/play of other people's games**. See `target-genre-and-editor.md` for that vision.