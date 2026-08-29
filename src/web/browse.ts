/**
 * Browse screen: lists published games from the API, plus the bundled demo
 * games when the API is unavailable.
 */
import { api, type GameSummary } from "./api";
import { loadGameById, registeredGameIds } from "./registry";
import { notice, navBar, clearAndMount, panel } from "./ui";
import { playUrl } from "./router";

export async function mountBrowse(root: HTMLElement): Promise<void> {
  clearAndMount(root, navBar("browse"));
  root.appendChild(panel("Play a story", document.createElement("div")));
  const body = root.lastElementChild as HTMLElement;
  const listEl = document.createElement("div");
  listEl.className = "game-list";
  body.appendChild(listEl);

  const group = document.createElement("h3");
  group.className = "subheading";
  group.textContent = "Published stories";
  listEl.appendChild(group);

  try {
    const { games } = await api.listPublished();
    if (games.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No published stories yet. Head to the Studio to author one and hit Publish.";
      listEl.appendChild(empty);
    } else {
      for (const game of games) listEl.appendChild(gameCard(game));
    }
  } catch {
    notice(listEl, "Couldn't reach the server. Showing bundled demo games instead.", "error");
  }

  const demos = document.createElement("h3");
  demos.className = "subheading";
  demos.textContent = "Bundled demo games (always available)";
  listEl.appendChild(demos);
  for (const id of registeredGameIds()) {
    const game = loadGameById(id);
    if (!game) continue;
    listEl.appendChild(gameCard({ id: game.id, author_id: "framework", title: game.title, description: game.description, tags: game.tags ?? [], is_published: true, created_at: 0, updated_at: 0 }));
  }
}

function gameCard(game: GameSummary): HTMLElement {
  const card = document.createElement("article");
  card.className = "game-card panel";
  const title = document.createElement("div");
  title.className = "game-card-title";
  title.textContent = game.title;
  const desc = document.createElement("div");
  desc.className = "muted";
  desc.textContent = game.description;
  const meta = document.createElement("div");
  meta.className = "muted game-card-meta";
  meta.textContent = game.tags.length ? `tags: ${game.tags.join(", ")}` : "";

  const play = document.createElement("a");
  play.className = "primary";
  play.textContent = "Play";
  play.href = playUrl(game.id);
  play.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = `#/play?game=${encodeURIComponent(game.id)}`;
  });

  card.append(title, desc, meta, play);
  return card;
}