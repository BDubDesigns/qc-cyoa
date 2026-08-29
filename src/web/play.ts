/**
 * Play screen: runs a GameDefinition through a real Engine with the existing
 * renderer, autosaving to localStorage (cloud saves are deferred to M4). The
 * game is provided by the caller (loaded from the registry or the API).
 */
import { Engine } from "../core/engine";
import type { SavedState } from "../core/engine";
import type { GameDefinition } from "../core/types";
import { escapeHtml, formatDuration, render, setRestartHandler, setPlayRedraw } from "./render";

export function mountPlay(root: HTMLElement, game: GameDefinition): void {
  const STORAGE_KEY = `cyoa:save:${game.id}`;

  function loadSave(): unknown | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

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

  const saved = loadSave();
  const liveSaved =
    saved && typeof saved === "object" && (saved as { ended?: unknown }).ended === undefined
      ? (saved as SavedState)
      : null;

  const engine = liveSaved ? Engine.load(game, liveSaved) : new Engine(game);

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

  const timer = setInterval(() => {
    const chip = document.getElementById("time-chip");
    if (chip && !engine.state.ended) {
      chip.textContent = `⏱ ${formatDuration(engine.elapsedMs)}`;
    }
  }, 1000);

  setRestartHandler(() => {
    clearSave();
    location.reload();
  });

  function showIntro(): void {
    const intro = document.createElement("section");
    intro.className = "intro panel";
    intro.innerHTML = `<p>${escapeHtml(game.intro ?? "")}</p>`;
    if (game.author) {
      const author = document.createElement("p");
      author.className = "muted intro-author";
      author.textContent = `by ${game.author}`;
      intro.appendChild(author);
    }

    const begin = document.createElement("button");
    begin.className = "primary";
    begin.textContent = `Begin: ${game.title}`;
    begin.addEventListener("click", () => {
      intro.remove();
      paint();
    });
    intro.appendChild(begin);

    if (liveSaved) {
      const resume = document.createElement("button");
      resume.className = "primary ghost";
      resume.textContent = "Resume where you left off";
      resume.addEventListener("click", () => {
        intro.remove();
        paint();
      });
      intro.appendChild(resume);
    }
    root.appendChild(intro);
  }

  if (game.intro) {
    showIntro();
  } else {
    paint();
  }

  (window as unknown as { __engine?: Engine }).__engine = engine;

  // Ensure the live timer dies with the screen if the route changes.
  root.dataset.playTimer = String(timer);
}

/** Stop any running autosave/resume loggers (called on unmount). */
export function unmountPlay(root: HTMLElement): void {
  const t = Number(root.dataset.playTimer);
  if (Number.isFinite(t)) clearInterval(t);
  delete root.dataset.playTimer;
  setRestartHandler(null);
  setPlayRedraw(null);
}