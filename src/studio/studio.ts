/**
 * The authoring studio: a two-pane structured editor.
 *
 * Left: forms for game meta, rooms, items, and effects. Right: a live preview
 * that renders the draft through a real Engine. A status rail shows
 * `inspectGame()` errors (block publish/playtest) and warnings. Drafts autosave
 * to the API when logged in and the game is known server-side, otherwise to
 * localStorage; publishing flips `is_published`.
 */
import { Engine } from "../core/engine";
import { inspectGame } from "../core/validate";
import type { GameDefinition, GameEffect, ItemDef, RoomDef } from "../core/types";
import { api, ApiError, isUnauthenticated } from "../web/api";
import { navBar, clearAndMount, notice } from "../web/ui";
import { navigate } from "../web/router";
import {
  type StudioState,
  initState,
  newDraft,
  addRoom,
  removeRoom,
  moveRoom,
  updateRoom,
  addDoor,
  removeDoor,
  updateDoor,
  addItem,
  removeItemFromRoom,
  updateItem,
  addUse,
  removeUse,
  updateUse,
  addEffect,
  removeEffect,
  updateEffect,
  allRooms,
  allItemIds,
  itemForId,
} from "./state";
import { render as renderPreview, setPlayRedraw } from "../web/render";

export interface StudioOptions {
  /** Bind to an existing draft's id (localStorage or DB). */
  gameId?: string;
  /** Optional server-provided definition to load (from API getGame). */
  fromServer?: GameDefinition;
}

const DRAFT_PREFIX = "cyoa:draft:";

/** Installed by mountStudio; every edit fires this (autosave + re-render). */
let editHandler: () => void = () => {};

export async function mountStudio(root: HTMLElement, opts: StudioOptions): Promise<void> {
  // Resolve initial definition.
  let draft: GameDefinition;
  if (opts.fromServer) {
    draft = opts.fromServer;
  } else if (opts.gameId) {
    draft = loadLocalDraft(opts.gameId) ?? newDraftWithId(opts.gameId);
  } else {
    draft = newDraft();
  }

  const state = initState(draft);
  const dbIdKnown = new Set<string>(opts.gameId ? [opts.gameId] : []);

  clearAndMount(root, navBar("studio"));
  const container = document.createElement("div");
  container.className = "studio-root";
  root.appendChild(container);

  const left = document.createElement("div");
  left.className = "studio-left";
  const right = document.createElement("div");
  right.className = "studio-right";
  container.append(left, right);

  const previewPane = document.createElement("div");
  previewPane.className = "studio-preview";
  const rail = document.createElement("div");
  rail.className = "studio-rail";
  right.append(previewPane, rail);

  // Toolbar.
  const toolbar = document.createElement("div");
  toolbar.className = "studio-toolbar";
  const saveStatus = document.createElement("span");
  saveStatus.className = "muted";
  const playtestBtn = document.createElement("button");
  playtestBtn.className = "primary";
  playtestBtn.textContent = "Playtest";
  const publishBtn = document.createElement("button");
  publishBtn.className = "primary ghost";
  publishBtn.textContent = "Publish";
  const copyLinkBtn = document.createElement("button");
  copyLinkBtn.className = "ghost";
  copyLinkBtn.textContent = "Copy play link";
  toolbar.append(saveStatus, playtestBtn, publishBtn, copyLinkBtn);
  container.prepend(toolbar);

  /** Everything UI that depends on the current draft lives in here. */
  function refresh(): void {
    left.replaceChildren(buildMetaSection(state), buildRoomsSection(state), buildItemsSection(state));

    previewPane.replaceChildren();
    const issues = inspectGame(state.game);
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length > 0) {
      const note = document.createElement("div");
      note.className = "notice-line error";
      note.textContent = "Preview unavailable until the errors below are fixed.";
      previewPane.appendChild(note);
    } else {
      try {
        const engine = new Engine(state.game);
        renderPreview(previewPane, engine);
      } catch (err) {
        const note = document.createElement("div");
        note.className = "notice-line error";
        note.textContent = `Preview error: ${err instanceof Error ? err.message : String(err)}`;
        previewPane.appendChild(note);
      }
    }

    rail.replaceChildren();
    const warnCount = issues.filter((i) => i.level === "warning").length;
    const heading = document.createElement("div");
    heading.className = "rail-heading";
    heading.textContent = `${errors.length} error${errors.length === 1 ? "" : "s"} · ${warnCount} warning${warnCount === 1 ? "" : "s"}`;
    rail.appendChild(heading);
    if (issues.length === 0) {
      const ok = document.createElement("div");
      ok.className = "notice-line info";
      ok.textContent = "No issues — this story looks valid.";
      rail.appendChild(ok);
    }
    for (const issue of issues) {
      const line = document.createElement("div");
      line.className = `notice-line ${issue.level}`;
      line.textContent = issue.message;
      rail.appendChild(line);
    }

    playtestBtn.disabled = errors.length > 0;
    publishBtn.disabled = errors.length > 0;
  }

  async function ensureServerGame(): Promise<string> {
    // Returns a server-known id for the current draft, creating a draft row if
    // needed. Throw ApiError 401 if not authenticated.
    if (dbIdKnown.has(state.game.id)) return state.game.id;
    const { id } = await api.createGame(state.game);
    dbIdKnown.add(id);
    state.game.id = id;
    return id;
  }

  let debounce: ReturnType<typeof setTimeout> | null = null;
  function onEdit(): void {
    saveLocalDraft(state.game);
    refresh();
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      void persist().then(() => {});
    }, 600);
  }

  async function persist(): Promise<void> {
    try {
      const id = await ensureServerGame();
      await api.updateGame(id, state.game);
      saveStatus.textContent = "saved to server";
    } catch (err) {
      if (isUnauthenticated(err)) {
        saveStatus.textContent = "not signed in — saved locally";
      } else {
        // Keep a local copy regardless so nothing is lost.
        saveLocalDraft(state.game);
        saveStatus.textContent = "saved locally (server unavailable)";
      }
    }
  }

  editHandler = onEdit;
  // The live-preview pane is itself a playtest surface: wire aim / pickup
  // interactions to re-render it through the same render module.
  setPlayRedraw(refresh);

  playtestBtn.addEventListener("click", () => openPlaytest(state.game, "Playtest"));
  publishBtn.addEventListener("click", () => {
    void doPublish(state, ensureServerGame, saveStatus, container);
  });
  copyLinkBtn.addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}#/play?game=${encodeURIComponent(state.game.id)}`;
    void navigator.clipboard.writeText(url).then(() => {
      notice(container, "Play link copied to clipboard.", "info");
    });
  });

  refresh();
}

async function doPublish(
  state: StudioState,
  ensureServerGame: () => Promise<string>,
  saveStatus: HTMLElement,
  container: HTMLElement,
): Promise<void> {
  if (inspectGame(state.game).some((i) => i.level === "error")) return;
  try {
    const id = await ensureServerGame();
    await api.updateGame(id, state.game);
    await api.publishGame(id);
    saveStatus.textContent = "published ✓";
    navigate({ name: "browse" });
  } catch (err) {
    if (isUnauthenticated(err)) {
      notice(container, "Sign in (Account) to save and publish your story.", "error");
    } else {
      notice(container, `Publish failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }
}

function newDraftWithId(id: string): GameDefinition {
  const draft = newDraft();
  draft.id = id;
  return draft;
}

/* ------------------------------ local drafts ----------------------------- */

export function saveLocalDraft(game: GameDefinition): void {
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${game.id}`, JSON.stringify(game));
  } catch {
    // storage may be unavailable
  }
}

export function loadLocalDraft(id: string): GameDefinition | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameDefinition;
  } catch {
    return null;
  }
}

export function openPlaytest(game: GameDefinition, title: string): void {
  const overlay = document.createElement("div");
  overlay.className = "playtest-overlay";
  const frame = document.createElement("div");
  frame.className = "playtest-frame";
  const header = document.createElement("div");
  header.className = "playtest-head";
  const h = document.createElement("h3");
  h.textContent = title;
  const close = document.createElement("button");
  close.className = "ghost";
  close.textContent = "Close";
  close.addEventListener("click", () => overlay.remove());
  header.append(h, close);

  const body = document.createElement("div");
  body.className = "playtest-body";
  frame.append(header, body);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  const engine = new Engine(game);
  renderPreview(body, engine);
  engine.onChange(() => {
    body.replaceChildren();
    renderPreview(body, engine);
  });
}

/* ------------------------------- form sections --------------------------- */

function buildMetaSection(state: StudioState): HTMLElement {
  const g = state.game;
  return section("Game", [
    field("Id", textInput("id", g.id, (v) => (g.id = v))),
    field("Title", textInput("title", g.title, (v) => (g.title = v))),
    field("Description", textInput("description", g.description, (v) => (g.description = v))),
    field("Author", textInput("author", g.author ?? "", (v) => (g.author = v))),
    field("Starting room", selectRoom(state, g.startingRoom, (v) => (g.startingRoom = v))),
    field(
      "Scoring",
      select(["points", "time"], g.scoring?.type ?? "points", (v) => {
        g.scoring = { type: v as "points" | "time", points: v === "points" ? g.scoring?.points ?? 100 : undefined };
      }),
    ),
    field("Scoring points (points mode)", numberInput(String(g.scoring?.points ?? 100), (n) => {
      g.scoring ??= { type: "points" };
      g.scoring.type = "points";
      g.scoring.points = n;
    })),
  ]);
}

function buildRoomsSection(state: StudioState): HTMLElement {
  const wrap = section("Rooms", []);
  const list = document.createElement("div");
  list.className = "rooms-list";
  for (const room of state.game.rooms) {
    const row = document.createElement("div");
    row.className = "room-row";
    const selectBtn = document.createElement("button");
    selectBtn.className = "room-row-name";
    selectBtn.textContent = room.id;
    selectBtn.addEventListener("click", () => {
      state.selectedRoomId = room.id;
      editHandler();
    });
    row.appendChild(selectBtn);
    if (room.id === state.selectedRoomId) {
      row.appendChild(roomForm(state, room));
    }
    list.appendChild(row);
  }
  wrap.appendChild(list);
  const add = addButton("+ Add room", () => {
    addRoom(state);
    editHandler();
  });
  wrap.appendChild(add);
  return wrap;
}

function roomForm(state: StudioState, room: RoomDef): HTMLElement {
  const box = document.createElement("div");
  box.className = "room-form";
  box.append(
    field("Name", textInput("name", room.name, (v) => updateRoom(state, room.id, { name: v }))),
    field("Description", textArea(room.description, (v) => updateRoom(state, room.id, { description: v }))),
    field("Map hint", textInput("hint", room.mapHint ?? "", (v) => updateRoom(state, room.id, { mapHint: v }))),
    field("Map x", numberInput(String(room.map?.x ?? 0), (n) => updateRoom(state, room.id, { map: { x: n, y: room.map?.y ?? 0 } }))),
    field("Map y", numberInput(String(room.map?.y ?? 0), (n) => updateRoom(state, room.id, { map: { x: room.map?.x ?? 0, y: n } }))),
  );

  box.appendChild(subhead("Doors"));
  for (let di = 0; di < room.doors.length; di++) {
    const door = room.doors[di]!;
    box.appendChild(
      field(
        `Direction ${di + 1}`,
        textInput("door.dir", door.direction, (v) => updateDoor(state, room.id, di, { direction: v })),
      ),
    );
    box.appendChild(field("To room", selectRoom(state, door.to, (v) => updateDoor(state, room.id, di, { to: v }))));
    box.appendChild(
      field(
        "Requires flag (optional)",
        textInput("door.flag", door.requiresFlag ?? "", (v) => updateDoor(state, room.id, di, { requiresFlag: v || undefined })),
      ),
    );
    const del = addButton("✕ door", () => {
      removeDoor(state, room.id, di);
      editHandler();
    }, "danger");
    box.appendChild(del);
  }
  box.appendChild(addButton("+ Add door", () => {
    addDoor(state, room.id);
    editHandler();
  }));

  box.appendChild(subhead("Items in this room"));
  const itemNames = (room.items ?? []).map((i) => i.name).join(", ") || "none";
  const list = document.createElement("p");
  list.className = "muted";
  list.textContent = itemNames;
  box.appendChild(list);

  const nav = document.createElement("div");
  nav.className = "nested-row";
  nav.append(
    addButton("↑", () => {
      moveRoom(state, room.id, -1);
      editHandler();
    }),
    addButton("↓", () => {
      moveRoom(state, room.id, 1);
      editHandler();
    }),
    addButton("Delete room", () => {
      removeRoom(state, room.id);
      editHandler();
    }, "danger"),
  );
  box.appendChild(nav);
  return box;
}

function buildItemsSection(state: StudioState): HTMLElement {
  const items = allItems(state);
  const wrap = section("Items", []);
  if (items.length === 0) {
    const muted = document.createElement("p");
    muted.className = "muted";
    muted.textContent = "No items yet. Add one to a room to start.";
    wrap.appendChild(muted);
  } else {
    for (const { item, roomId } of items) wrap.appendChild(itemForm(state, item, roomId));
  }
  const target = state.game.rooms.find((r) => r.id === state.selectedRoomId) ?? state.game.rooms[0];
  if (target) {
    wrap.appendChild(addButton(`+ Add item to "${target.name}"`, () => {
      addItem(state, target.id);
      editHandler();
    }));
  }
  return wrap;
}

function allItems(state: StudioState): Array<{ item: ItemDef; roomId: string }> {
  return state.game.rooms.flatMap((r) => (r.items ?? []).map((item) => ({ item, roomId: r.id })));
}

function itemForm(state: StudioState, item: ItemDef, roomId: string): HTMLElement {
  const box = document.createElement("div");
  box.className = "item-form";

  const ownerRoom = state.game.rooms.find((r) => r.id === roomId)?.name ?? roomId;
  const owner = document.createElement("div");
  owner.className = "muted";
  owner.textContent = `found in: ${ownerRoom}`;
  box.appendChild(owner);

  box.append(
    field("Name", textInput("item.name", item.name, (v) => updateItem(state, item.id, { name: v }))),
    field("Description", textArea(item.description, (v) => updateItem(state, item.id, { description: v }))),
    field(
      "Charges (blank = persistent)",
      numberInput(item.charges !== undefined ? String(item.charges) : "", (n) => updateItem(state, item.id, { charges: n })),
    ),
  );

  box.appendChild(subhead("Uses"));
  for (let ui = 0; ui < item.uses.length; ui++) {
    const use = item.uses[ui]!;
    const useBox = document.createElement("div");
    useBox.className = "use-box";
    useBox.append(
      field("Label", textInput("use.label", use.label, (v) => updateUse(state, item.id, ui, { label: v }))),
      field("Description", textArea(use.description, (v) => updateUse(state, item.id, ui, { description: v }))),
      field(
        "Charges per use (0/blank = none)",
        numberInput(use.chargesPerUse !== undefined && use.chargesPerUse > 0 ? String(use.chargesPerUse) : "0", (n) => updateUse(state, item.id, ui, { chargesPerUse: n || undefined })),
      ),
      field("Aim it at (leave blank to use directly)", targetSelect(state, item.id, ui)),
    );

    useBox.appendChild(subhead("Effects"));
    for (let ei = 0; ei < use.effects.length; ei++) {
      const effect = use.effects[ei]!;
      useBox.appendChild(effectForm(state, item.id, ui, ei, effect));
    }
    useBox.appendChild(addEffectPicker(state, item.id, ui));
    useBox.appendChild(addButton("Delete use", () => {
      removeUse(state, item.id, ui);
      editHandler();
    }, "danger"));
    box.appendChild(useBox);
  }

  box.appendChild(addButton("+ Add use", () => {
    addUse(state, item.id);
    editHandler();
  }));
  box.appendChild(addButton("Delete item", () => {
    removeItemFromRoom(state, roomId, item.id);
    editHandler();
  }, "danger"));
  return box;
}

function effectForm(state: StudioState, itemId: string, ui: number, ei: number, effect: GameEffect): HTMLElement {
  const box = document.createElement("div");
  box.className = "effect-box";
  const head = document.createElement("div");
  head.className = "muted";
  head.textContent = effect.type;
  const del = addButton("✕", () => {
    removeEffect(state, itemId, ui, ei);
    editHandler();
  }, "danger");
  box.append(head, del);

  switch (effect.type) {
    case "message":
      box.appendChild(field("Text", textInput("fx.text", effect.text, (v) => updateEffect(state, itemId, ui, ei, { text: v }))));
      break;
    case "addPoints":
      box.appendChild(field("Amount", numberInput(String(effect.amount), (n) => updateEffect(state, itemId, ui, ei, { amount: n }))));
      break;
    case "setFlag":
      box.appendChild(field("Flag", textInput("fx.flag", effect.flag, (v) => updateEffect(state, itemId, ui, ei, { flag: v }))));
      box.appendChild(field("Value", select(["true", "false"], String(effect.value), (v) => updateEffect(state, itemId, ui, ei, { value: v === "true" }))));
      break;
    case "destroyItem":
      box.appendChild(field("Item", selectItem(state, effect.itemId, (v) => updateEffect(state, itemId, ui, ei, { itemId: v }))));
      break;
    case "setItemCharges":
      box.appendChild(field("Item", selectItem(state, effect.itemId, (v) => updateEffect(state, itemId, ui, ei, { itemId: v }))));
      box.appendChild(field("Charges", numberInput(String(effect.charges), (n) => updateEffect(state, itemId, ui, ei, { charges: n }))));
      break;
    case "unlockExit":
      box.appendChild(field("Room", selectRoom(state, effect.roomId, (v) => updateEffect(state, itemId, ui, ei, { roomId: v }))));
      box.appendChild(field("Direction", textInput("fx.dir", effect.direction, (v) => updateEffect(state, itemId, ui, ei, { direction: v }))));
      break;
    case "endGame":
      box.appendChild(field("Outcome", select(["win", "lose"], effect.outcome, (v) => updateEffect(state, itemId, ui, ei, { outcome: v as "win" | "lose" }))));
      box.appendChild(field("Message", textInput("fx.msg", effect.message, (v) => updateEffect(state, itemId, ui, ei, { message: v }))));
      box.appendChild(field("Points", numberInput(effect.points !== undefined ? String(effect.points) : "", (n) => updateEffect(state, itemId, ui, ei, { points: n || undefined }))));
      break;
    default:
      break;
  }
  return box;
}

function addEffectPicker(state: StudioState, itemId: string, ui: number): HTMLElement {
  const sel = document.createElement("select");
  const types: Array<GameEffect["type"]> = ["message", "endGame", "setFlag", "unlockExit", "addPoints", "destroyItem", "setItemCharges"];
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "+ add effect…";
  sel.appendChild(placeholder);
  for (const t of types) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    if (sel.value) {
      addEffect(state, itemId, ui, sel.value as GameEffect["type"]);
      editHandler();
    }
    sel.value = "";
  });
  return sel;
}

function selectItem(state: StudioState, value: string, onChange: (id: string) => void): HTMLSelectElement {
  const sel = document.createElement("select");
  const ids = allItemIds(state);
  if (ids.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no items)";
    sel.appendChild(opt);
    return sel;
  }
  for (const id of ids) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    opt.selected = id === value;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  return sel;
}

/**
 * Editor control for a use's `requiresTarget` (aim-it-at-this). A kind dropdown
 * (none / a door / a loose item) plus, when a kind is chosen, a control to pick
 * the target's ref (door direction, or item id).
 */
function targetSelect(state: StudioState, itemId: string, ui: number): HTMLElement {
  const item = itemForId(state, itemId)?.item;
  const current = item?.uses[ui]?.requiresTarget;

  const wrap = document.createElement("div");
  wrap.className = "target-select";

  const kind = document.createElement("select");
  kind.name = `${itemId}.use${ui}.target.kind`;
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "— no target, use instantly —";
  none.selected = !current;
  const door = document.createElement("option");
  door.value = "door";
  door.textContent = "a locked door";
  door.selected = current?.type === "door";
  const loose = document.createElement("option");
  loose.value = "item";
  loose.textContent = "a loose item";
  loose.selected = current?.type === "item";
  kind.append(none, door, loose);
  wrap.appendChild(kind);

  if (current?.type === "door") {
    const ref = textInput("target.door", current.ref, (v) =>
      updateUse(state, itemId, ui, { requiresTarget: { type: "door", ref: v } }),
    );
    ref.placeholder = "door direction, e.g. north";
    wrap.appendChild(ref);
  } else if (current?.type === "item") {
    const ref = document.createElement("select");
    const itemIds = allItemIds(state);
    if (itemIds.length === 0) {
      const no = document.createElement("option");
      no.value = "";
      no.textContent = "(no items yet — add one first)";
      ref.appendChild(no);
    }
    for (const id of itemIds) {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = id;
      o.selected = id === current.ref;
      ref.appendChild(o);
    }
    ref.addEventListener("change", () => {
      updateUse(state, itemId, ui, { requiresTarget: { type: "item", ref: ref.value } });
      editHandler();
    });
    wrap.appendChild(ref);
  }

  kind.addEventListener("change", () => {
    const next =
      kind.value === "door"
        ? { type: "door" as const, ref: "north" }
        : kind.value === "item"
          ? { type: "item" as const, ref: allItemIds(state)[0] ?? "" }
          : undefined;
    updateUse(state, itemId, ui, { requiresTarget: next });
    editHandler();
  });
  return wrap;
}

function textInput(name: string, value: string, onChange: (v: string) => void): HTMLInputElement {
  const input = document.createElement("input");
  input.name = name;
  input.value = value;
  input.addEventListener("input", () => {
    onChange(input.value);
    editHandler();
  });
  return input;
}

function textArea(value: string, onChange: (v: string) => void): HTMLTextAreaElement {
  const area = document.createElement("textarea");
  area.value = value;
  area.addEventListener("input", () => {
    onChange(area.value);
    editHandler();
  });
  return area;
}

function numberInput(value: string, onChange: (n: number) => void): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.value = value;
  input.addEventListener("input", () => {
    const n = input.value.trim() === "" ? NaN : Number(input.value);
    onChange(Number.isNaN(n) ? 0 : n);
    editHandler();
  });
  return input;
}

function select(values: string[], value: string, onChange: (v: string) => void): HTMLSelectElement {
  const sel = document.createElement("select");
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    opt.selected = v === value;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    onChange(sel.value);
    editHandler();
  });
  return sel;
}

function selectRoom(state: StudioState, value: string, onChange: (id: string) => void): HTMLSelectElement {
  const known = allRooms(state).map((r) => r.id);
  const all = known.includes(value) ? known : [...known, value];
  const sel = document.createElement("select");
  for (const id of all) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    opt.selected = id === value;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    onChange(sel.value);
    editHandler();
  });
  return sel;
}

function field(label: string, input: HTMLElement): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const span = document.createElement("span");
  span.textContent = label;
  wrap.append(span, input);
  return wrap;
}

function subhead(text: string): HTMLElement {
  const h4 = document.createElement("h4");
  h4.className = "subheading";
  h4.textContent = text;
  return h4;
}

function section(title: string, children: HTMLElement[]): HTMLElement {
  const sec = document.createElement("section");
  sec.className = "studio-section";
  const h = document.createElement("h3");
  h.className = "section-title";
  h.textContent = title;
  sec.appendChild(h);
  for (const c of children) sec.appendChild(c);
  return sec;
}

function addButton(label: string, onClick: () => void, kind: "ghost" | "danger" = "ghost"): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = kind === "danger" ? "ghost danger" : "ghost";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}