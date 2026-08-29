/**
 * Play screen: runs a GameDefinition through a real Engine with the existing
 * renderer, autosaving to localStorage (cloud saves are deferred to M4). The
 * game is provided by the caller (loaded from the registry or the API).
 *
 * "Begin" always starts a brand-new session (fresh engine, timer, inventory,
 * and cleared save); "Resume" loads the saved engine instead.
 */
import { Engine } from "../core/engine";
import type { SavedState } from "../core/engine";
import type { GameDefinition } from "../core/types";
import { escapeHtml, formatDuration, render, setRestartHandler, setPlayRedraw } from "./render";

export function mountPlay(root: HTMLElement, game: GameDefinition): void {
  const STORAGE_KEY = `cyoa:save:${game.id}`;

  // The engine is created lazily so "Begin" builds a genuinely fresh session,
  // while "Resume" keeps the saved one.
  let timer: ReturnType<typeof setInterval> | null = null;

  function writeSave(engine: Engine): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.serialize()));
    } catch {
      // localStorage may be unavailable.
    }
  }

  function clearSave(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function loadSave(): SavedState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as unknown;
      if (saved && typeof saved === "object" && (saved as { ended?: unknown }).ended === undefined) {
        return saved as SavedState;
      }
      return null;
    } catch {
      return null;
    }
  }

  function start(engine: Engine): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }

    function paint(): void {
      root.replaceChildren();
      render(root, engine);
    }
    // Aim-mode and pickup-button toggles re-render through this hook.
    setPlayRedraw(paint);

    engine.onChange(() => {
      writeSave(engine);
      paint();
    });

    timer = setInterval(() => {
      const chip = document.getElementById("time-chip");
      if (chip && !engine.state.ended) {
        chip.textContent = `⏱ ${formatDuration(engine.elapsedMs)}`;
      }
    }, 1000);

    (window as unknown as { __engine?: Engine }).__engine = engine;
    paint();
  }

  function teardown(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  setRestartHandler(() => {
    clearSave();
    location.reload();
  });

  function showIntro(liveSaved: SavedState | null): void {
    const intro = document.createElement("section");
    intro.className = "intro panel";
    intro.innerHTML = `<p>${escapeHtml(game.intro ?? "")}</p>`;
    if (game.author) {
      const author = document.createElement("p");
      author.className = "muted intro-author";
      author.textContent = `by ${game.author}`;
      intro.appendChild(author);
    }

    // "Begin" = throw away any previous session and start a fresh one.
    const begin = document.createElement("button");
    begin.className = "primary";
    begin.textContent = `Begin: ${game.title}`;
    begin.addEventListener("click", () => {
      clearSave();
      intro.remove();
      start(new Engine(game));
    });
    intro.appendChild(begin);

    // "Resume" only appears when an in-progress (un-ended) save exists and
    // continues that exact engine (same timer/inventory/positioning).
    if (liveSaved) {
      const resume = document.createElement("button");
      resume.className = "primary ghost";
      resume.textContent = "Resume where you left off";
      resume.addEventListener("click", () => {
        intro.remove();
        start(Engine.load(game, liveSaved));
      });
      intro.appendChild(resume);
    }
    root.appendChild(intro);
  }

  // No intro? Start directly. With a save present, resume it; otherwise fresh.
  const liveSaved = loadSave();
  if (game.intro) {
    showIntro(liveSaved);
  } else if (liveSaved) {
    start(Engine.load(game, liveSaved));
  } else {
    start(new Engine(game));
  }

  // Ensure the live timer dies with the screen if the route changes.
  (root as unknown as { __cyoaTeardown?: () => void }).__cyoaTeardown = teardown;
}

/** Stop any running autosave/resume loggers (called on unmount). */
export function unmountPlay(root: HTMLElement): void {
  const node = root as unknown as { __cyoaTeardown?: () => void };
  node.__cyoaTeardown?.();
  delete node.__cyoaTeardown;
  setRestartHandler(null);
  setPlayRedraw(null);
}