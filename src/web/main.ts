/**
 * App entry: tiny hash-router that mounts play / studio / browse / account.
 * The bundled demo games fall back from the registry when the API is down or
 * the requested id is a shipped demo.
 */
import "./styles.css";
import type { GameDefinition } from "../core/types";
import { onRouteChange, type Route } from "./router";
import { loadGameById } from "./registry";
import { api, ApiError, isUnauthenticated } from "./api";
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
      await mountProtectedAuthoring(() => mountProjects(root));
      return;
    case "project":
      await mountProtectedAuthoring(() => mountProjectDetail(root, route.projectId));
      return;
  }
}

async function mountProtectedAuthoring(mount: () => Promise<void>): Promise<void> {
  try {
    await api.session();
  } catch (err) {
    if (isUnauthenticated(err)) {
      renderAuthRequired();
      return;
    }
    renderAuthoringUnavailable(err);
    return;
  }
  await mount();
}

function renderAuthRequired(): void {
  const sec = document.createElement("section");
  sec.className = "app-panel panel";
  const h = document.createElement("h2");
  h.textContent = "Sign in to open the creator studio";
  const p = document.createElement("p");
  p.className = "muted";
  p.textContent = "Projects and their asset libraries are private creator workspaces.";
  const a = document.createElement("a");
  a.className = "primary";
  a.href = "#/account";
  a.textContent = "Go to Account →";
  sec.append(h, p, a);
  root.replaceChildren(navBar("account"), sec);
}

function renderAuthoringUnavailable(err: unknown): void {
  const sec = document.createElement("section");
  sec.className = "app-panel panel";
  const h = document.createElement("h2");
  h.textContent = "Creator studio unavailable";
  const p = document.createElement("p");
  p.className = "notice-line error";
  p.textContent = err instanceof Error ? err.message : "Could not verify your creator session.";
  sec.append(h, p);
  root.replaceChildren(navBar("projects"), sec);
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
      h.textContent = "Illustrated point-and-click adventure creator";
      const p = document.createElement("p");
      p.textContent =
        "qc-cyoa is a creator studio for illustrated, voiced point-and-click adventures. Build a project, then create assets and their appearances to hold generated or uploaded variants.";
      const links = document.createElement("div");
      links.className = "home-links";
      const projects = document.createElement("a");
      projects.href = "#/projects";
      projects.className = "primary";
      projects.textContent = "Open Projects →";
      const browse = document.createElement("a");
      browse.href = "#/browse";
      browse.className = "primary ghost";
      browse.textContent = "Browse archives";
      const play = document.createElement("a");
      play.href = "#/play";
      play.className = "primary ghost";
      play.textContent = "Play a demo";
      links.append(projects, browse, play);
      sec.append(h, p, links);

      // Clearly demoted: the old CYOA editor is retained for development /
      // regression, but is NOT the current authoring experience.
      const legacy = document.createElement("p");
      legacy.className = "muted home-legacy";
      legacy.innerHTML =
        'Legacy <a href="#/studio">CYOA Studio</a> — the older story editor — is still available for development and regression testing.';
      sec.appendChild(legacy);
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
