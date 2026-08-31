# Agents

Guidance for coding and planning agents working in this repository. This file stays
purposefully short — it is the **instruction pointer surface**, not the documentation
itself.

## Before you change engine or Studio architecture

**Read `docs/product/engine-boundaries.md` first.** It is the canonical product
constitution: what qc-cyoa is (an illustrated, voiced, point-and-click adventure creator —
SCUMM-like runtime, CYOA-like learning curve), the engine primitives in scope, hard
non-goals, and the feature decision test in §11. Apply that test before proposing any
product-level engine or Studio change, and keep this document the single source of truth
(do not duplicate its contents here).

## Where things live

- `src/core/` — engine (data-driven, serializable), `types.ts`, author-time validation.
- `src/games/` — the shipped demo games (flagship lives here).
- `src/web/` + `src/studio/` — player renderer and the authoring studio.
- `server/` — bare `node:http` + `node:sqlite` backend, temp auth.
- `plans/` — product-direction write-ups (`target-genre-and-editor.md`,
  `research-he-games.md`, `history-and-architecture.md`).
- `tests/` — Vitest suites.

## Quality bar

- Keep logic data-driven, declarative, serializable, and safe to interpret — no arbitrary
  author executable code in ordinary gameplay.
- `npm run typecheck`, `npm test`, and `npm run build` must pass for non-trivial changes.