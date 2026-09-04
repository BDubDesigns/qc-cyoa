# Agents

Guidance for coding and planning agents working in this repository. This file stays
purposefully short — it is the **instruction pointer surface**, not the documentation
itself.

## Before starting issue or prompt work

Check the working tree first and preserve any existing local work. For new work,
fetch the latest `origin/main` and create the dedicated branch from that updated
remote base before making changes. If the local tree or remote base is not clean or
unambiguous, stop and resolve that before editing.

## Before you change engine or Studio architecture

**Read `docs/product/engine-boundaries.md` first.** It is the canonical product
constitution: what qc-cyoa is (an illustrated, voiced, point-and-click adventure creator —
SCUMM-like runtime, CYOA-like learning curve), the engine primitives in scope, hard
non-goals, and the feature decision test in §11. Apply that test before proposing any
product-level engine or Studio change, and keep this document the single source of truth
(do not duplicate its contents here).

For work that depends on the flagship game itself, read
`docs/flagship/bigfoot-adventure.md`, the canonical current Bigfoot adventure design and
Issue #1 requirements source.

## Where things live

- `src/core/` — engine (data-driven, serializable), `types.ts`, author-time validation.
- `src/games/` — the shipped demo games (`lighthouse`, `post_office`). The flagship does
  not exist yet; it is planned, not shipped.
- `src/web/` + `src/studio/` — player renderer and the authoring studio.
- `server/` — bare `node:http` + `node:sqlite` backend, temp auth.
- `docs/` — canonical product/implementation docs: `roadmap.md` (current implementation
  sequence), `product/engine-boundaries.md` (scope boundary), and
  `flagship/bigfoot-adventure.md` (current flagship game design).
- `plans/` — **historical/design-context** write-ups (`target-genre-and-editor.md`,
  `research-he-games.md`, `history-and-architecture.md`), not current direction.
- `tests/` — Vitest suites.

## Quality bar

- Keep logic data-driven, declarative, serializable, and safe to interpret — no arbitrary
  author executable code in ordinary gameplay.
- `pnpm run typecheck`, `pnpm test`, and `pnpm run build` must pass for non-trivial changes.
