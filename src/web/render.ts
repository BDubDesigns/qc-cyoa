import type { Engine } from "../core/engine";
import type { Door, ItemInstance, ItemUse, RoomDef, RoomTarget } from "../core/types";

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

/* ------------------------- play interaction state ------------------------ */

/**
 * Session-wide UI state for the active play screen: the currently aimed
 * (targeted) item-use, the pickup-buttons preference lookup, and a redraw hook
 * so that non-engine interactions (aiming, toggling pickup buttons, clicking a
 * target) can re-render. The web shell is expected to install `setPlayRedraw`
 * so target clicks re-render even though the engine state hasn't changed yet.
 */
export interface Aim {
  instance: ItemInstance;
  use: ItemUse;
}

let aim: Aim | null = null;
let redraw: (() => void) | null = null;

export function setPlayRedraw(fn: (() => void) | null): void {
  redraw = fn;
}
export function getAim(): Aim | null {
  return aim;
}
export function aimAt(a: Aim | null): void {
  aim = a;
  redraw?.();
}

/** Pickup-buttons preference, persisted per game id. Defaults to ON. */
const PICKUP_KEY = "cyoa:pickupBtns:";
export function pickupButtonsEnabled(gameId: string): boolean {
  try {
    return localStorage.getItem(`${PICKUP_KEY}${gameId}`) !== "0";
  } catch {
    return true;
  }
}
export function setPickupButtonsEnabled(gameId: string, on: boolean): void {
  try {
    localStorage.setItem(`${PICKUP_KEY}${gameId}`, on ? "1" : "0");
  } catch {
    // ignore
  }
  redraw?.();
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
  shell.appendChild(adminBar(engine));

  const layout = el("div", "layout");
  layout.append(
    roomPanel(engine, room),
    inventoryPanel(engine),
    mapPanel(engine),
  );
  shell.appendChild(layout);
  root.appendChild(shell);
}

/* ------------------------------- admin bar ------------------------------- */

/** A thin bar for play-time toggles (e.g. hiding the pickup buttons). */
function adminBar(engine: Engine): HTMLElement {
  const bar = el("div", "admin-bar");
  const on = pickupButtonsEnabled(engine.game.id);
  const toggle = el("button", "ghost pickup-toggle");
  toggle.textContent = on
    ? "Pickup buttons: shown (click items on the art to hide them)"
    : "Pickup buttons: hidden (click items on the art to collect them)";
  toggle.title = "This story is harder with the buttons hidden.";
  toggle.addEventListener("click", () => {
    setPickupButtonsEnabled(engine.game.id, !on);
  });
  bar.appendChild(toggle);
  return bar;
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

  // Art area doubles as the "pick up items by clicking them" surface.
  const art = el("div", "room-art");
  if (room.image) {
    const img = document.createElement("img");
    img.src = room.image;
    img.alt = `Illustration of ${room.name}`;
    img.loading = "eager";
    art.appendChild(img);
  }
  art.appendChild(itemOverlay(engine));

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

  // Aiming? Surface the room's targets so the player can click the one they
  // mean to use their item on.
  const aiming = getAim();
  if (aiming) {
    const banner = el("div", "notice aiming");
    banner.textContent = `Aiming ${aiming.use.label} — click the ${aiming.use.description || "thing you want to use it on"}.`;
    body.appendChild(banner);
  }

  // Items lying here — a clickable "You can take" row (toggleable off to make
  // the story harder; the item overlay on the art above is always available).
  const here = engine.roomItemsHere;
  if (here.length && pickupButtonsEnabled(engine.game.id)) {
    const e = el("h3", "subheading");
    e.textContent = "You can take";
    body.appendChild(e);
    const takeGrid = el("div", "exit-grid take-grid");
    for (const item of here) {
      takeGrid.appendChild(takeCard(engine, item));
    }
    body.appendChild(takeGrid);
  }

  // Exits (and, while aiming, the locks/doors are aimable targets).
  const exits = engine.availableExits;
  if (exits.length) {
    const e = el("h3", "subheading");
    e.textContent = "Exits";
    body.appendChild(e);
    const exitGrid = el("div", "exit-grid");
    for (const door of exits) {
      exitGrid.appendChild(doorButton(engine, door));
    }
    body.appendChild(exitGrid);
  }

  // Locked doors shown disabled — and while aiming, clickable as a target.
  const locked = room.doors.filter((d) => !engine.isUnlocked(d));
  if (locked.length) {
    const e = el("h3", "subheading");
    e.textContent = "Locked";
    body.appendChild(e);
    const grid = el("div", "exit-grid");
    for (const door of locked) {
      grid.appendChild(lockedDoor(engine, room, door));
    }
    body.appendChild(grid);
  }

  panel.append(h, art, body);
  return panel;
}

/**
 * Clickable items floating over the room art. Clicking an item takes it (it
 * disappears from the room). This is always available — even when the pickup
 * buttons are hidden — so there is always a visual, in-world way to collect.
 */
function itemOverlay(engine: Engine): HTMLElement {
  const overlay = el("div", "item-overlay");
  const aiming = getAim();
  const picks = engine.roomItemsHere.map((item) => {
    const chip = el("button", "item-svg");
    chip.classList.toggle("aimable", aiming?.use.requiresTarget?.type === "item");

    if (aiming && aiming.use.requiresTarget?.type === "item") {
      chip.classList.add("target-popper");
    }

    if (item.def.image) {
      const img = document.createElement("img");
      img.src = item.def.image;
      img.alt = item.def.name;
      img.draggable = false;
      chip.appendChild(img);
    }
    const label = el("span", "item-svg-label");
    label.textContent = item.def.name;
    chip.appendChild(label);

    chip.addEventListener("click", () => {
      if (aiming && aiming.use.requiresTarget?.type === "item") {
        // Aiming at an item: click it to run the use.
        const target: RoomTarget = { type: "item", ref: item.id };
        applyTargetedUse(engine, aiming, target);
        return;
      }
      engine.takeItem(item);
    });
    return chip;
  });

  if (picks.length) {
    overlay.classList.add("has-items");
    for (const p of picks) overlay.appendChild(p);
  }
  return overlay;
}

function takeCard(engine: Engine, item: ItemInstance): HTMLElement {
  const b = el("button", "take-card");
  const name = el("span", "take-name");
  name.textContent = item.def.name;
  const hint = el("span", "take-hint");
  hint.textContent = item.def.description;
  b.append(name, hint);

  const aiming = getAim();
  if (aiming && aiming.use.requiresTarget?.type === "item" && aiming.use.requiresTarget.ref === item.id) {
    b.classList.add("target-popper");
  }
  b.addEventListener("click", () => {
    if (aiming && aiming.use.requiresTarget?.type === "item") {
      applyTargetedUse(engine, aiming, { type: "item", ref: item.id });
      return;
    }
    engine.takeItem(item);
  });
  return b;
}

function doorButton(engine: Engine, door: Door): HTMLElement {
  const b = el("button", "exit");
  b.textContent = door.direction;
  b.title = door.to;
  b.addEventListener("click", () => {
    // Exits are never a "use" target in normal play; leaving a room cancels any pending aim.
    if (getAim()) aimAt(null);
    engine.tryMove(door);
  });
  return b;
}

function lockedDoor(engine: Engine, room: RoomDef, door: RoomDef["doors"][number]): HTMLElement {
  const b = el("button", "exit locked");
  const aiming = getAim();

  if (aiming && aiming.use.requiresTarget?.type === "door" && aiming.use.requiresTarget.ref === door.direction) {
    // This is the lock the player is trying to aim at.
    b.classList.add("target-popper");
    b.disabled = false;
    b.textContent = `🔓 ${door.direction}`;
    b.title = "Click to use the aimed item here.";
    b.addEventListener("click", () => {
      applyTargetedUse(engine, aiming, { type: "door", ref: door.direction });
    });
  } else {
    b.disabled = true;
    b.textContent = `${door.direction} 🔒`;
    b.title = door.lockedText ?? "Locked";
  }
  return b;
}

/** Run a targeted use against a chosen current-room target. */
function applyTargetedUse(engine: Engine, a: Aim, target: RoomTarget): void {
  const res = engine.useItem(a.instance, a.use, target);
  aimAt(null);
  void res;
}

/* ------------------------------ inventory -------------------------------- */

function inventoryPanel(engine: Engine): HTMLElement {
  const panel = el("aside", "panel inventory");
  const h = el("h2", "panel-title");
  h.textContent = "Inventory";
  panel.appendChild(h);

  const inv = engine.state.inventory;
  // Targeting hint while we're aiming.
  const aiming = getAim();

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
  void aiming;
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
  const aiming = getAim();
  const thisAimActive = aiming?.instance === instance;

  for (const use of engine.availableUses(instance)) {
    const b = el("button", "item-use");
    b.textContent = use.label;
    b.title = use.description;

    if (use.requiresTarget) {
      // Targeted use: clicking arms it (aim mode) rather than running it.
      b.classList.add("aimable");
      b.classList.toggle("active-aim", thisAimActive && aiming?.use === use);
      b.addEventListener("click", () => {
        aimAt(aiming?.use === use ? null : { instance, use });
      });
    } else {
      if (thisAimActive) b.classList.add("aimable");
      b.addEventListener("click", () => {
        if (aiming) aimAt(null);
        engine.useItem(instance, use);
      });
    }
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