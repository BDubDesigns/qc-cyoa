/**
 * Runtime-safe draft buffer for the authoring studio.
 *
 * The studio edits a plain `GameDefinition` but never mutates a live
 * definition in place — it works on a deep-copied buffer via these helpers.
 * Ids are auto-generated and kept unique so `validateGame`/`inspectGame` never
 * trip on editor-created collisions.
 */
import type {
  Door,
  GameDefinition,
  GameEffect,
  ItemDef,
  ItemUse,
  RoomDef,
} from "../core/types";

export type { Door, GameDefinition, GameEffect, ItemDef, ItemUse, RoomDef };

let counter = 0;
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/** Deep-clone a definition so edits never touch the original object. */
export function cloneDefinition(game: GameDefinition): GameDefinition {
  return JSON.parse(JSON.stringify(game)) as GameDefinition;
}

/** A fresh, valid-enough skeleton the author builds on. */
export function newDraft(): GameDefinition {
  return {
    id: genId("game"),
    title: "Untitled Story",
    description: "",
    startingRoom: "room_0",
    author: "",
    tags: [],
    scoring: { type: "points", points: 100 },
    rooms: [
      {
        id: "room_0",
        name: "Room 1",
        description: "Describe this room.",
        mapHint: "",
        doors: [],
        items: [],
      },
    ],
  };
}

export interface StudioState {
  game: GameDefinition;
  /** id of the room currently selected in the room list. */
  selectedRoomId: string;
}

export function initState(game: GameDefinition): StudioState {
  return { game: cloneDefinition(game), selectedRoomId: game.rooms[0]?.id ?? "" };
}

/* -------------------------------- rooms ---------------------------------- */

export function addRoom(state: StudioState): void {
  const id = genId("room");
  state.game.rooms.push({ id, name: `Room ${state.game.rooms.length + 1}`, description: "", doors: [], items: [] });
  state.selectedRoomId = id;
}

export function removeRoom(state: StudioState, roomId: string): void {
  const idx = state.game.rooms.findIndex((r) => r.id === roomId);
  if (idx === -1) return;
  // Remove doors that point at the deleted room, and drop the room.
  for (const room of state.game.rooms) {
    room.doors = room.doors.filter((d) => d.to !== roomId);
  }
  state.game.rooms.splice(idx, 1);
  if (state.game.startingRoom === roomId) {
    state.game.startingRoom = state.game.rooms[0]?.id ?? "";
  }
  if (state.selectedRoomId === roomId) {
    state.selectedRoomId = state.game.rooms[0]?.id ?? "";
  }
}

export function moveRoom(state: StudioState, roomId: string, dir: -1 | 1): void {
  const idx = state.game.rooms.findIndex((r) => r.id === roomId);
  const target = idx + dir;
  if (idx === -1 || target < 0 || target >= state.game.rooms.length) return;
  const [room] = state.game.rooms.splice(idx, 1);
  state.game.rooms.splice(target, 0, room!);
}

export function updateRoom(state: StudioState, roomId: string, patch: Partial<RoomDef>): void {
  const room = state.game.rooms.find((r) => r.id === roomId);
  if (!room) return;
  Object.assign(room, patch);
}

/* --------------------------------- doors --------------------------------- */

export function addDoor(state: StudioState, roomId: string): void {
  const room = state.game.rooms.find((r) => r.id === roomId);
  if (!room) return;
  const target = state.game.rooms.find((r) => r.id !== roomId);
  room.doors.push({ direction: "north", to: target?.id ?? roomId, requiresFlag: undefined });
}

export function removeDoor(state: StudioState, roomId: string, doorIndex: number): void {
  const room = state.game.rooms.find((r) => r.id === roomId);
  if (room) room.doors.splice(doorIndex, 1);
}

export function updateDoor(state: StudioState, roomId: string, doorIndex: number, patch: Partial<Door>): void {
  const room = state.game.rooms.find((r) => r.id === roomId);
  const door = room?.doors[doorIndex];
  if (door) Object.assign(door, patch);
}

/* --------------------------------- items --------------------------------- */
// Items live in one room's `items` array at author time (they are found there).

export function addItem(state: StudioState, roomId: string): void {
  const room = state.game.rooms.find((r) => r.id === roomId);
  if (!room) return;
  room.items ??= [];
  room.items.push({
    id: genId("item"),
    name: "Item",
    description: "Describe the item.",
    uses: [],
  });
}

export function removeItemFromRoom(state: StudioState, roomId: string, itemId: string): void {
  const room = state.game.rooms.find((r) => r.id === roomId);
  if (room) room.items = (room.items ?? []).filter((i) => i.id !== itemId);
}

export function updateItem(state: StudioState, itemId: string, patch: Partial<ItemDef>): void {
  const item = findItem(state, itemId);
  if (item) Object.assign(item, patch);
}

export function addUse(state: StudioState, itemId: string): void {
  const item = findItem(state, itemId);
  if (!item) return;
  item.uses ??= [];
  item.uses.push({ label: "Use", description: "", effects: [] });
}

export function removeUse(state: StudioState, itemId: string, useIndex: number): void {
  const item = findItem(state, itemId);
  if (item) item.uses.splice(useIndex, 1);
}

export function updateUse(state: StudioState, itemId: string, useIndex: number, patch: Partial<ItemUse>): void {
  const item = findItem(state, itemId);
  const use = item?.uses[useIndex];
  if (use) Object.assign(use, patch);
}

export function addEffect(state: StudioState, itemId: string, useIndex: number, type: GameEffect["type"]): void {
  const item = findItem(state, itemId);
  const use = item?.uses[useIndex];
  if (!use) return;
  use.effects ??= [];
  const effect = defaultEffect(type, state);
  if (effect) use.effects.push(effect);
}

export function removeEffect(state: StudioState, itemId: string, useIndex: number, effectIndex: number): void {
  const item = findItem(state, itemId);
  const use = item?.uses[useIndex];
  if (use) use.effects.splice(effectIndex, 1);
}

export function updateEffect(
  state: StudioState,
  itemId: string,
  useIndex: number,
  effectIndex: number,
  patch: Partial<GameEffect>,
): void {
  const item = findItem(state, itemId);
  const use = item?.uses[useIndex];
  const effect = use?.effects[effectIndex];
  if (effect) Object.assign(effect, patch);
}

export function allRooms(state: StudioState): RoomDef[] {
  return state.game.rooms;
}

export function allItemIds(state: StudioState): string[] {
  return state.game.rooms.flatMap((r) => (r.items ?? []).map((i) => i.id));
}

export function itemForId(state: StudioState, itemId: string): { item: ItemDef; roomId: string } | undefined {
  for (const room of state.game.rooms) {
    const item = (room.items ?? []).find((i) => i.id === itemId);
    if (item) return { item, roomId: room.id };
  }
  return undefined;
}

function findItem(state: StudioState, itemId: string): ItemDef | undefined {
  return itemForId(state, itemId)?.item;
}

/** Build a sensible default for a newly-added effect. */
export function defaultEffect(type: GameEffect["type"], state: StudioState): GameEffect | undefined {
  switch (type) {
    case "message":
      return { type: "message", text: "Something happens." };
    case "setFlag":
      return { type: "setFlag", flag: genId("flag"), value: true };
    case "addPoints":
      return { type: "addPoints", amount: 10 };
    case "endGame":
      return { type: "endGame", message: "You finished!", outcome: "win", points: undefined };
    case "destroyItem":
      return { type: "destroyItem", itemId: allItemIds(state)[0] ?? "" };
    case "setItemCharges": {
      const first = allItemIds(state)[0];
      return { type: "setItemCharges", itemId: first ?? "", charges: 1 };
    }
    case "unlockExit": {
      const room = state.game.rooms[0];
      return { type: "unlockExit", roomId: room?.id ?? "", direction: room?.doors[0]?.direction ?? "north", message: undefined };
    }
    default:
      return undefined;
  }
}