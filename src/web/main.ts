/**
 * App entry: tiny hash-router that mounts play / studio / browse / account.
 * The bundled demo games fall back from the registry when the API is down or
 * the requested id is a shipped demo.
 */
import "./styles.css";
import type { GameDefinition } from "../core/types";
import { onRouteChange, type Route } from "./router";
import { loadGameById } from "./registry";
import { api, ApiError } from "./api";
import { mountPlay, unmountPlay } from "./play";
import { mountStudio } from "../studio/studio";
import { mountBrowse } from "./browse";
import { mountAccount } from "./account";
import { mountProjects, mountProjectDetail } from "./projects";
import { navBar } from "./ui";

const root = document.getElementById("root")!;

let currentCleanup: (() => void) | null = null;

async function dispatch(route: Route): Promise<void> {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  switch (route.name) {
    case "home":
      renderHome();
      return;
    case "play":
      await mountPlayScreen(route.game);
      return;
    case "studio":
      await mountStudioScreen(route.game);
      return;
    case "browse":
      await mountBrowse(root);
      return;
    case "account":
      await mountAccount(root);
      return;
    case "projects":
      await mountProjects(root);
      return;
    case "project":
      await mountProjectDetail(root, route.projectId);
      return;
  }
}

async function mountPlayScreen(gameId?: string): Promise<void> {
  const game = await resolveGame(gameId);
  if (!game) {
    renderNotFound();
    return;
  }
  root.replaceChildren(navBar("home"));
  mountPlay(root, game);
  currentCleanup = () => unmountPlay(root);
}

async function mountStudioScreen(gameId?: string): Promise<void> {
  if (gameId) {
    try {
      const detail = await api.getGame(gameId);
      if (detail.editable || detail.is_published) {
        await mountStudio(root, { gameId, fromServer: detail.definition });
        return;
      }
    } catch {
      // fall through to local-draft handling
    }
  }
  await mountStudio(root, { gameId });
}

async function resolveGame(id?: string): Promise<GameDefinition | null> {
  if (id) {
    try {
      const detail = await api.getGame(id);
      return detail.definition;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return loadGameById(id) ?? null;
      }
      return loadGameById(id) ?? null;
    }
  }
  return loadGameById("lighthouse") ?? null;
}

function renderHome(): void {
  root.replaceChildren(
    navBar("home"),
    (() => {
      const sec = document.createElement("section");
      sec.className = "app-panel panel home-hero";
      const h = document.createElement("h2");
      h.textContent = "Choose Your Own Adventure";
      const p = document.createElement("p");
      p.textContent =
        "Author stories in the Studio, publish them, and share a play link. Browse published tales or play a bundled demo.";
      const links = document.createElement("div");
      links.className = "home-links";
      const studio = document.createElement("a");
      studio.href = "#/studio";
      studio.className = "primary";
      studio.textContent = "Author a story →";
      const projects = document.createElement("a");
      projects.href = "#/projects";
      projects.className = "primary ghost";
      projects.textContent = "Projects →";
      const browse = document.createElement("a");
      browse.href = "#/browse";
      browse.className = "primary ghost";
      browse.textContent = "Browse stories";
      links.append(studio, projects, browse);
      sec.append(h, p, links);
      return sec;
    })(),
  );
}

function renderNotFound(): void {
  root.replaceChildren(
    navBar("home"),
    (() => {
      const sec = document.createElement("section");
      sec.className = "app-panel panel";
      const h = document.createElement("h2");
      h.textContent = "Game not found";
      const a = document.createElement("a");
      a.href = "#/browse";
      a.textContent = "Browse stories";
      sec.append(h, a);
      return sec;
    })(),
  );
}

onRouteChange((route) => {
  void dispatch(route);
});
