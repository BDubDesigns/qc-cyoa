# qc-cyoa implementation roadmap

This document is the current canonical implementation sequence for qc-cyoa. It exists so future agents and contributors do not reconstruct product strategy from scattered chats or issue comments.

## Product direction

qc-cyoa is an illustrated point-and-click adventure creator: a SCUMM-like runtime with a CYOA-like learning curve.

The near-term goal is not to build a general-purpose game engine. The goal is to build the smallest reusable runtime and Studio capability required to author one strong flagship adventure, then dogfood each slice before expanding.

Core rule:

> The agent builds the Studio capability; Brandon builds the actual flagship game through Studio.

Small fixtures are fine for testing. Do not hand-code the flagship around missing Studio features. If authoring through Studio is painful, that is product feedback.

## Current planning issues

- #1 — Flagship Pacific Northwest Bigfoot adventure design and runtime requirements
- #2 — Product boundaries: SCUMM-like runtime, CYOA-like learning curve
- #3 — Benchmark qc-cyoa image-generation models for flagship styles and pricing tiers
- #4 — Curated art-style families and reusable AI asset library rules
- #5 — Studio Slice 0: creator auth, project shell, and asset generation library

## Current implementation sequence

### Phase A — Creator and asset foundation

#### Issue #3 — Image benchmark

Run the qc-cyoa-specific image benchmark using real product workloads. Start with the flagship pixel-art-style raster direction and compare candidate models on quality, consistency, retry burden, and effective cost per usable asset.

The benchmark should ultimately inform creator-facing generation tiers such as Economy, Standard, and Premium.

This work can proceed alongside Slice 0.

#### Issue #5 — Studio Slice 0

Build the creator/auth/project/asset foundation:

- durable creator auth;
- project creation and ownership;
- logical assets;
- appearances/states;
- generated/uploaded variants;
- active variant selection;
- generate-through-Studio flow;
- provider abstraction;
- initial Singularity adapter for dogfooding.

The flagship production art should start being generated through this system once it is usable.

### Phase B — Act 1 authoring capability

#### Next — Room / Scene Editor Foundation

Build enough visual authoring to create the physical Act 1 world:

Bedroom -> Hallway -> Bathroom.

Initial goals:

- create/rename/delete/duplicate rooms;
- choose room backgrounds from Asset Library;
- place layered assets;
- move and resize placements;
- horizontal flip;
- z-order;
- visibility;
- visible-asset exits and invisible exit hotspots;
- room-to-room navigation;
- default fade-out/fade-in transition;
- stable logical 16:9 scene coordinates;
- autosave with visible save status;
- live player preview;
- preview presets for desktop and phone landscape;
- choose a starting room.

Published gameplay is landscape-first. Portrait gameplay is not a near-term target.

Studio is desktop-first for initial implementation. Tablet and phone authoring are explicit long-term goals, especially so kids and creators without laptops can make games, but they must not distort the first editor slice.

Initial transform scope is deliberately limited to move, resize, horizontal flip, and z-order. Rotation, color filters, and other image effects should be added only when real authoring needs expose them.

For experimentation safety, start with autosave and Duplicate Room. A broader project-checkpoint/version-history system should be designed separately later rather than bloating the first scene editor.

#### Following — Declarative Interactions v1

Introduce the basic authoring grammar:

trigger -> optional conditions -> actions.

Initial triggers should stay small, such as On Tap and On Room Enter.

Initial conditions should stay small, such as flag set/not set and interaction happened/not happened.

Initial actions should support the Act 1 room interactions, such as:

- say dialogue;
- set flag;
- show entity;
- hide entity;
- change appearance;
- go to room;
- enable/disable entity or exit.

Studio should present human-readable concepts, not scripting or a giant node graph.

#### Following — Inventory + Item-on-Target Authoring

Add the core point-and-click puzzle grammar:

- collectible entity -> inventory;
- select/deselect item;
- tap-safe mobile selection UX;
- use selected item on scene target;
- player-has-item conditions;
- give/remove/replace item;
- wrong-item reactions.

This should allow Brandon to author the Bathroom tutorial:

Cup -> Sink -> Cup of Water -> drink/resolve thirst.

#### Following — Beat-Based Sequence Editor v1

Build the lightweight scene sequencer with live room preview.

The initial action vocabulary should stay intentionally small:

- wait;
- show/hide;
- change appearance;
- move entity over a duration;
- say dialogue;
- play sound;
- set flag.

Beats may run multiple actions in parallel. Do not build a professional animation suite.

This slice should allow Brandon to author the Hallway lightning/Sasquatch reveal through Studio.

#### Following — Dialogue Audio / TTS Authoring v1

Add stored spoken dialogue support:

- dialogue text;
- generated voice path;
- stored audio playback;
- preview;
- voice assignment;
- mark generated audio stale when dialogue/voice settings change;
- regenerate only when requested;
- keep TTS provider replaceable.

Playing a game should simply play stored audio; normal gameplay should not call the model.

### Act 1 dogfood gate

After the above slices exist, Brandon authors the complete Act 1 through Studio:

Bedroom -> Hallway -> Bathroom -> Bedroom.

It should include:

- generated/uploaded art through Studio;
- layered assets;
- exits;
- funny optional interactions;
- Cup/Water inventory puzzle;
- lightning reveal sequence;
- stored spoken dialogue;
- phone-landscape and desktop play.

Do not immediately continue expanding the engine.

First evaluate the actual authoring experience and fix painful workflows.

## Phase C — Act 2 capability, only after Act 1 dogfooding

The likely next runtime/Studio additions are known, but should not be fully specified until Act 1 has been authored and tested.

Expected needs include:

### Evidence Groups

Creator-friendly abstraction:

- create an evidence group;
- add evidence items/hotspots;
- choose how many must be discovered, e.g. 3 of 4;
- discovering evidence permanently flips unseen -> seen;
- once threshold is met, group completion is a one-way gate;
- conditions can depend on evidence-group completion.

### Persistent world-state puzzles

The engine should naturally respect persistent state:

- locked -> unlocked;
- broken -> repaired;
- collected items remain collected;
- early puzzle solving is valid;
- authors should not be forced into one exact interaction sequence unless the story requires it.

### Contextual hints

Potential inactivity hints/highlights may be useful for younger players, but should be added only if playtesting shows the need.

## Phase D — Act 3 and later

Act 3 is expected to stress-test:

- fixed-choice stored values;
- dynamic value/name tokens;
- richer character appearance sets;
- sequence authoring;
- expressive nonverbal character audio.

Acts 4 and 5 should mostly reuse existing primitives rather than trigger a large new engine expansion.

## Product constraints to preserve

- Data-driven, declarative, serializable gameplay.
- No arbitrary creator-supplied executable code.
- Static background art plus layered interactive assets.
- Stable logical coordinates across device sizes.
- Essential gameplay actions work by tap.
- Playing is free; basic creation with user-provided assets stays accessible.
- AI primarily assists creation.
- Generate once, store, reuse.
- Providers remain replaceable.
- Uploaded/personal content never becomes public automatically.
- Avoid feature sprawl and generic-engine ambitions.

## Planning rule

Do not spec dozens of future implementation issues in detail before dogfooding the current slice.

Keep the near-term sequence clear, build complete vertical slices, make the founder use them, and let real authoring pain determine what gets built next.
