import { describe, it, expect } from "vitest";
import { Engine } from "../src/core/engine";
import { lighthouse } from "../src/games/lighthouse";

const find = (e: Engine, id: string) => e.state.inventory.find((i) => i.id === id);
const here = (e: Engine, id: string) => e.roomItemsHere.find((i) => i.id === id);

describe("manual pickup", () => {
  it("items start in the room, not automatically in the inventory", () => {
    const e = new Engine(lighthouse);
    expect(find(e, "brass_key")).toBeUndefined();
    expect((e.state.roomItems.get("cliff_path") ?? []).some((i) => i.id === "brass_key")).toBe(true);
  });

  it("taking an item moves it into inventory and empties the room", () => {
    const e = new Engine(lighthouse);
    e.takeItem(here(e, "brass_key")!);
    expect(find(e, "brass_key")).toBeDefined();
    expect(e.state.roomItems.get("cliff_path") ?? []).toHaveLength(0);
  });
});

describe("persistent key", () => {
  it("stays in the inventory after being used", () => {
    const e = new Engine(lighthouse);
    e.takeItem(here(e, "brass_key")!);
    const brass = find(e, "brass_key")!;
    e.useItem(brass, brass.def.uses.find((u) => u.label.includes("Unlock"))!);
    expect(find(e, "brass_key")).toBeDefined();
    expect(e.isUnlocked(e.game.rooms.find((r) => r.id === "tower_door")!.doors[0]!)).toBe(true);
  });
});

describe("full win path", () => {
  it("reaches the beacon, fuels it, and lights it for a win + 100 points", () => {
    const e = new Engine(lighthouse);
    e.takeItem(here(e, "brass_key")!);
    let brass = find(e, "brass_key")!;
    e.useItem(brass, brass.def.uses[0]!);

    e.tryMove(e.currentRoom.doors.find((d) => d.to === "boatshed")!);
    e.takeItem(here(e, "lighter")!);
    expect(find(e, "lighter")).toBeDefined();

    // Back out and climb up through the now-unlocked tower door.
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "cliff_path")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "tower_door")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "spiral_stairs")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "beacon_room")!);
    expect(e.state.currentRoomId).toBe("beacon_room");

    e.takeItem(here(e, "fuel_can")!);
    const fuel = find(e, "fuel_can")!;
    e.useItem(fuel, fuel.def.uses[0]!);
    expect(find(e, "fuel_can")).toBeUndefined();
    expect(e.state.flags.beacon_ready).toBe(true);

    const lighter = find(e, "lighter")!;
    const winUse = lighter.def.uses.find((u) => u.label.includes("Light the beacon"))!;
    expect(e.useAvailable(winUse)).toBe(true);
    e.useItem(lighter, winUse);
    expect(e.state.ended?.outcome).toBe("win");
    expect(find(e, "lighter")).toBeUndefined();
    expect(e.score).toBe(100);
  });
});

describe("lose path", () => {
  it("wasting the lighter's fuel leads to a win-less ending", () => {
    const e = new Engine(lighthouse);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "boatshed")!);
    e.takeItem(here(e, "lighter")!);
    const lighter = find(e, "lighter")!;
    e.useItem(lighter, lighter.def.uses.find((u) => u.label.includes("Waste"))!);
    expect(e.state.ended?.outcome).toBe("lose");
    expect(e.score).toBe(0);
  });
});

describe("map", () => {
  it("covers every room and each room carries a mapHint", () => {
    const e = new Engine(lighthouse);
    const map = e.computeMap();
    const rooms = new Set(map.map((m) => m.room.id));
    expect(rooms.size).toBe(lighthouse.rooms.length);
    expect(map.every((m) => m.room.mapHint !== undefined)).toBe(true);
  });
});

describe("save / resume", () => {
  it("round-trips an in-progress game that stays playable", () => {
    const e = new Engine(lighthouse);
    e.takeItem(here(e, "brass_key")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "boatshed")!);
    e.takeItem(here(e, "lighter")!);

    const save = e.serialize();
    const e2 = Engine.load(lighthouse, save);
    expect(e2.state.currentRoomId).toBe("boatshed");
    expect(find(e2, "brass_key")).toBeDefined();
    expect(find(e2, "lighter")).toBeDefined();
    expect(e2.state.seenRooms.has("boatshed")).toBe(true);
    expect(e2.startedAt).toBe(e.startedAt);

    e2.tryMove(e2.currentRoom.doors.find((d) => d.to === "cliff_path")!);
    expect(e2.state.currentRoomId).toBe("cliff_path");
  });
});
