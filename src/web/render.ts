import type { Engine } from "../core/engine";
import type { ItemInstance, RoomDef } from "../core/types";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/**
 * Optional hook: when the player clicks "Play again" on the ended screen the
 * web shell can mount a handler here (e.g. to clear an autosaved game before
 * reloading). Falls back to a plain `location.reload()`.
 */
let onRestart: (() => void) | null = null;
export function setRestartHandler(fn: (() => void) | null): void {
  onRestart = fn;
}

/** Render the entire game UI into `root`. */
export function render(root: HTMLElement, engine: Engine): void {
  const state = engine.state;
  const room = engine.currentRoom;

  // End-of-game screen overrides everything.
  if (state.ended) {
    root.appendChild(endedScreen(engine));
    return;
  }

  const shell = el("div", "shell");
  shell.appendChild(header(engine));
  shell.appendChild(statusBar(engine));

  const layout = el("div", "layout");
  layout.append(
    roomPanel(engine, room),
    inventoryPanel(engine),
    mapPanel(engine),
  );
  shell.appendChild(layout);
  root.appendChild(shell);
}

/* --------------------------------- header -------------------------------- */

function header(engine: Engine): HTMLElement {
  const heading = el("header", "game-header");
  const title = el("h1");
  title.textContent = engine.game.title;
  const sub = el("p");
  sub.textContent = engine.game.description;
  heading.append(title, sub);
  return heading;
}

function statusBar(engine: Engine): HTMLElement {
  const bar = el("div", "status-bar");
  const time = el("span", "status-chip time-chip");
  // `id` lets the web shell update this in place on a live ticker.
  time.id = "time-chip";
  time.textContent = `⏱ ${formatDuration(engine.elapsedMs)}`;
  bar.appendChild(time);

  if (engine.isScored && engine.score !== undefined) {
    const chip = el("span", "status-chip score");
    if (engine.game.scoring!.type === "points") {
      chip.textContent = `★ ${engine.score} points`;
    } else {
      chip.textContent = `Best time: ${formatDuration(engine.score)}`;
    }
    bar.appendChild(chip);
  }

  // Mid-game author-chosen points (via addPoints) even in a time-scored game.
  if (engine.state.points > 0 && engine.game.scoring?.type !== "points") {
    const chip = el("span", "status-chip score");
    chip.textContent = `★ ${engine.state.points} pts`;
    bar.appendChild(chip);
  }
  return bar;
}

/* ------------------------------- room panel ------------------------------ */

function roomPanel(engine: Engine, room: RoomDef): HTMLElement {
  const panel = el("section", "panel room-panel");
  const h = el("h2", "room-name");
  h.textContent = room.name;

  const art = el("div", "room-art");
  if (room.image) {
    const img = document.createElement("img");
    img.src = room.image;
    img.alt = `Illustration of ${room.name}`;
    img.loading = "eager";
    art.appendChild(img);
  }

  const body = el("div", "room-body");
  const desc = el("p", "room-desc");
  desc.textContent = room.description;
  body.appendChild(desc);

  // Message log from the latest action.
  const noticeWrap = el("div", "notices");
  for (const msg of engine.state.lastMessages) {
    const n = el("div", "notice");
    n.textContent = msg;
    noticeWrap.appendChild(n);
  }
  body.appendChild(noticeWrap);

  // Items lying here, awaiting pickup — the player chooses to take them.
  const here = engine.roomItemsHere;
  if (here.length) {
    const e = el("h3", "subheading");
    e.textContent = "You can take";
    body.appendChild(e);
    const takeGrid = el("div", "exit-grid");
    for (const item of here) {
      takeGrid.appendChild(takeCard(engine, item));
    }
    body.appendChild(takeGrid);
  }

  // Exits.
  const exits = engine.availableExits;
  if (exits.length) {
    const e = el("h3", "subheading");
    e.textContent = "Exits";
    body.appendChild(e);
    const exitGrid = el("div", "exit-grid");
    for (const door of exits) {
      const b = el("button", "exit");
      b.textContent = door.direction;
      b.title = door.to;
      b.addEventListener("click", () => engine.tryMove(door));
      exitGrid.appendChild(b);
    }
    body.appendChild(exitGrid);
  }

  // Locked-but-seen doors shown disabled for mood.
  const locked = room.doors.filter((d) => !engine.isUnlocked(d));
  if (locked.length) {
    const e = el("h3", "subheading");
    e.textContent = "Locked";
    body.appendChild(e);
    const grid = el("div", "exit-grid");
    for (const door of locked) {
      const b = el("button", "exit locked");
      b.textContent = `${door.direction} 🔒`;
      b.disabled = true;
      b.title = door.lockedText ?? "Locked";
      grid.appendChild(b);
    }
    body.appendChild(grid);
  }

  panel.append(h, art, body);
  return panel;
}

function takeCard(engine: Engine, item: ItemInstance): HTMLElement {
  const b = el("button", "take-card");
  const name = el("span", "take-name");
  name.textContent = item.def.name;
  const hint = el("span", "take-hint");
  hint.textContent = item.def.description;
  b.append(name, hint);
  b.addEventListener("click", () => engine.takeItem(item));
  return b;
}

/* ------------------------------ inventory -------------------------------- */

function inventoryPanel(engine: Engine): HTMLElement {
  const panel = el("aside", "panel inventory");
  const h = el("h2", "panel-title");
  h.textContent = "Inventory";
  panel.appendChild(h);

  const inv = engine.state.inventory;
  if (!inv.length) {
    const empty = el("p", "muted");
    empty.textContent = "Nothing yet. Pick things up as you explore.";
    panel.appendChild(empty);
    return panel;
  }

  const list = el("div", "inv-list");
  for (const instance of inv) {
    list.appendChild(itemCard(engine, instance));
  }
  panel.appendChild(list);
  return panel;
}

function itemCard(engine: Engine, instance: ItemInstance): HTMLElement {
  const card = el("div", "item-card");
  const top = el("div", "item-top");
  if (instance.def.image) {
    const img = document.createElement("img");
    img.src = instance.def.image;
    img.alt = instance.def.name;
    top.appendChild(img);
  }
  const name = el("div", "item-name");
  name.textContent = instance.def.name;
  top.appendChild(name);
  card.appendChild(top);

  const badge = el("div", "item-sub");
  if (instance.charges > 0) {
    badge.textContent = `Charges: ${instance.charges}`;
  } else if (instance.def.charges !== undefined && instance.charges <= 0) {
    badge.textContent = "Empty";
  } else {
    badge.textContent = "Usable";
  }
  card.appendChild(badge);

  const buttons = el("div", "item-uses");
  for (const use of engine.availableUses(instance)) {
    const b = el("button", "item-use");
    b.textContent = use.label;
    b.title = use.description;
    b.addEventListener("click", () => engine.useItem(instance, use));
    buttons.appendChild(b);
  }
  card.appendChild(buttons);
  return card;
}

/* ---------------------------------- map ---------------------------------- */

function mapPanel(engine: Engine): HTMLElement {
  const panel = el("section", "panel map-panel");
  const h = el("h2", "panel-title");
  h.textContent = "Map";
  panel.appendChild(h);

  const coords = engine.computeMap();
  const minX = Math.min(...coords.map((c) => c.x));
  const maxX = Math.max(...coords.map((c) => c.x));
  const minY = Math.min(...coords.map((c) => c.y));
  const maxY = Math.max(...coords.map((c) => c.y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const grid = el("div", "map");
  grid.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${height}, auto)`;

  for (const { room, x, y } of coords) {
    const cell = el("div", "map-cell");
    cell.style.gridColumn = `${x - minX + 1}`;
    cell.style.gridRow = `${y - minY + 1}`;

    const seen = engine.state.seenRooms.has(room.id);
    const current = room.id === engine.state.currentRoomId;

    const tile = el("div", "map-tile");
    tile.classList.toggle("seen", seen);
    tile.classList.toggle("current", current);

    const nameSpan = el("span", "map-tile-name");
    nameSpan.textContent = seen ? room.name : "?";
    tile.appendChild(nameSpan);

    // Brief description/hint shown on the tile, so you can orient yourself.
    const hint = el("span", "map-tile-hint");
    if (current) {
      hint.textContent = room.mapHint ?? room.description;
    } else if (seen) {
      hint.textContent = room.mapHint ?? "";
    } else {
      hint.textContent = "Not explored";
    }
    tile.appendChild(hint);

    if (current) {
      const marker = el("span", "map-tile-marker");
      marker.textContent = "◉ you are here";
      tile.appendChild(marker);
    }

    tile.title = `${room.name} — ${room.mapHint ?? room.description}`;
    cell.appendChild(tile);
    grid.appendChild(cell);
  }

  panel.appendChild(grid);

  const legend = el("p", "muted map-legend");
  legend.textContent =
    "You are the lit tile. The rest are rooms you've explored (or not). The map is for orientation, not travel — use the room's exits to move.";
  panel.appendChild(legend);
  return panel;
}

/* ------------------------------ ended screen ----------------------------- */

function endedScreen(engine: Engine): HTMLElement {
  const overlay = el("section", "ended");
  const panel = el("div", `panel ended-card ${engine.state.ended!.outcome}`);
  const h = el("h2");
  h.textContent = engine.state.ended!.outcome === "win" ? "You won!" : "Game over";

  const p = el("p");
  p.textContent = engine.state.ended!.message;

  const meta = el("div", "ended-meta");
  meta.textContent = `Time: ${formatDuration(engine.elapsedMs)}`;
  if (engine.isScored && engine.score !== undefined) {
    const label = engine.game.scoring!.type === "points" ? "Score" : "Best";
    meta.textContent += ` · ${label}: ${engine.game.scoring!.type === "points" ? engine.score : formatDuration(engine.score)}`;
  }

  const restart = el("button", "primary");
  restart.textContent = "Play again";
  restart.addEventListener("click", () => {
    if (onRestart) onRestart();
    else location.reload();
  });

  panel.append(h, p, meta, restart);
  overlay.appendChild(panel);
  return overlay;
}