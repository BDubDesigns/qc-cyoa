/**
 * Studio draft-buffer helper unit tests (pure logic, no DOM).
 */
import { describe, it, expect } from "vitest";
import {
  initState,
  newDraft,
  addRoom,
  removeRoom,
  addItem,
  addUse,
  addEffect,
  removeEffect,
  updateItem,
  defaultEffect,
  allItemIds,
  itemForId,
  cloneDefinition,
} from "../src/studio/state";
import { inspectGame } from "../src/core/validate";
import { makeGame } from "./helpers";

describe("newDraft", () => {
  it("produces a structurally valid skeleton", () => {
    const draft = newDraft();
    expect(draft.rooms.length).toBe(1);
    expect(draft.startingRoom).toBe(draft.rooms[0]!.id);
    expect(inspectGame(draft).filter((i) => i.level === "error")).toEqual([]);
  });

  it("generates unique ids across calls", () => {
    const a = newDraft();
    const b = newDraft();
    expect(a.id).not.toBe(b.id);
  });
});

describe("cloneDefinition", () => {
  it("deep-copies so mutations don't touch the source", () => {
    const src = makeGame({ rooms: [{ id: "r", name: "R", description: "d", doors: [] }] });
    const copy = cloneDefinition(src);
    copy.rooms[0]!.name = "Changed";
    expect(src.rooms[0]!.name).toBe("R");
  });
});

describe("room helpers", () => {
  it("addRoom creates a new room and selects it", () => {
    const st = initState(newDraft());
    addRoom(st);
    expect(st.game.rooms.length).toBe(2);
    expect(st.selectedRoomId).toBe(st.game.rooms[1]!.id);
  });

  it("removeRoom drops the room and its inbound doors, fixed startingRoom", () => {
    const st = initState(makeGame({
      rooms: [
        { id: "a", name: "A", description: "d", doors: [{ direction: "north", to: "b" }] },
        { id: "b", name: "B", description: "d", doors: [] },
      ],
    }));
    st.game.startingRoom = "a";
    removeRoom(st, "b");
    expect(st.game.rooms.map((r) => r.id)).toEqual(["a"]);
    expect(st.game.rooms[0]!.doors).toEqual([]);
    expect(st.game.startingRoom).toBe("a");
  });

  it("removeRoom reassigns startingRoom when it removed the starter", () => {
    const st = initState(makeGame({
      rooms: [
        { id: "a", name: "A", description: "d", doors: [] },
        { id: "b", name: "B", description: "d", doors: [] },
      ],
    }));
    st.game.startingRoom = "a";
    removeRoom(st, "a");
    expect(st.game.startingRoom).toBe("b");
  });
});

describe("item + effect helpers", () => {
  it("addItem/addUse/addEffect builds a playable use with unique ids", () => {
    const st = initState(newDraft());
    const roomId = st.game.rooms[0]!.id;
    addItem(st, roomId);
    const item = st.game.rooms[0]!.items![0]!;
    addUse(st, item.id);
    addEffect(st, item.id, 0, "addPoints");
    const use = item.uses[0]!;
    expect(use.effects.length).toBe(1);
    expect(use.effects[0]).toMatchObject({ type: "addPoints" });
    // Ids stay unique.
    expect(new Set(allItemIds(st)).size).toBe(allItemIds(st).length);
  });

  it("removeEffect removes only the targeted effect", () => {
    const st = initState(newDraft());
    addItem(st, st.game.rooms[0]!.id);
    const item = st.game.rooms[0]!.items![0]!;
    addUse(st, item.id);
    addEffect(st, item.id, 0, "message");
    addEffect(st, item.id, 0, "addPoints");
    expect(item.uses[0]!.effects.length).toBe(2);
    removeEffect(st, item.id, 0, 0);
    expect(item.uses[0]!.effects.length).toBe(1);
    expect(item.uses[0]!.effects[0]).toMatchObject({ type: "addPoints" });
  });

  it("itemForId locates an item across rooms", () => {
    const st = initState(newDraft());
    const roomId = st.game.rooms[0]!.id;
    addItem(st, roomId);
    const id = st.game.rooms[0]!.items![0]!.id;
    expect(itemForId(st, id)?.roomId).toBe(roomId);
    expect(itemForId(st, "nope")).toBeUndefined();
  });

  it("updateItem patches an item in place", () => {
    const st = initState(newDraft());
    addItem(st, st.game.rooms[0]!.id);
    const item = st.game.rooms[0]!.items![0]!;
    updateItem(st, item.id, { name: "Beacon" });
    expect(st.game.rooms[0]!.items![0]!.name).toBe("Beacon");
  });
});

describe("defaultEffect", () => {
  it("returns an effect of the requested type", () => {
    const st = initState(newDraft());
    for (const type of ["message", "endGame", "setFlag", "unlockExit", "addPoints", "destroyItem", "setItemCharges"] as const) {
      const fx = defaultEffect(type, st);
      expect(fx).toBeDefined();
      expect(fx!.type).toBe(type);
    }
  });
});