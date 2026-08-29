import "./styles.css";
import { Engine } from "../core/engine";
import type { SavedState } from "../core/engine";
import { lighthouse } from "../games/lighthouse";
import { escapeHtml, formatDuration, render, setRestartHandler } from "./render";

const root = document.getElementById("root")!;

// In a real app you'd know which game to load (and for which user) from state /
// routing. Here we demo the lighthouse in-browser.
const game = lighthouse;
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
    // localStorage may be unavailable (private mode / storage disabled).
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

// Resume an in-progress game if one exists, otherwise start fresh.
const engine = liveSaved ? Engine.load(game, liveSaved) : new Engine(game);

function paint(): void {
  root.replaceChildren();
  render(root, engine);
}

// Persist + re-render on every state change. This is what makes buttons work
// and keeps the save in sync as the player plays.
engine.onChange(() => {
  writeSave(engine);
  paint();
});

// Live-ticking timer: re-read the clock and update the status chip in place
// without re-rendering the whole DOM every second.
setInterval(() => {
  const chip = document.getElementById("time-chip");
  if (chip && !engine.state.ended) {
    chip.textContent = `⏱ ${formatDuration(engine.elapsedMs)}`;
  }
}, 1000);

// "Play again" clears the saved game and reloads to a fresh start.
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

  // If we resumed a saved game, offer to continue it instead of restarting.
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

// (Optional) expose the engine for debugging / wiring a save button in devtools.
(window as unknown as { __engine?: Engine }).__engine = engine;
