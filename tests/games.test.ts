import { describe, it, expect } from "vitest";
import { Engine } from "../src/core/engine";
import { lighthouse } from "../src/games/lighthouse";
import { postOffice } from "../src/games/post_office";
import { isValidGame, validateGame } from "../src/core/validate";
import type { GameDefinition } from "../src/core/types";

function find(e: Engine, id: string) {
  return e.state.inventory.find((i) => i.id === id);
}
const here = (e: Engine, id: string) => e.roomItemsHere.find((i) => i.id === id);

/** Every room is reachable from the start by its raw door graph (locks ignored). */
function assertAllReachable(game: GameDefinition): void {
  const seen = new Set<string>();
  const stack = [game.startingRoom];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const room = game.rooms.find((r) => r.id === id);
    for (const door of room?.doors ?? []) {
      if (!seen.has(door.to)) stack.push(door.to);
    }
  }
  for (const room of game.rooms) {
    expect(seen.has(room.id), `room ${room.id} reachable`).toBe(true);
  }
}

describe("shipped games validate & are fully connected", () => {
  it("lighthouse", () => {
    expect(isValidGame(lighthouse)).toBe(true);
    expect(() => validateGame(lighthouse)).not.toThrow();
    assertAllReachable(lighthouse);
  });

  it("postOffice", () => {
    expect(isValidGame(postOffice)).toBe(true);
    expect(() => validateGame(postOffice)).not.toThrow();
    assertAllReachable(postOffice);
  });
});

describe("The Flooded Post Office", () => {
  it("is time-scored with explicit map coordinates", () => {
    const e = new Engine(postOffice);
    expect(e.game.scoring?.type).toBe("time");
    const map = e.computeMap();
    const lobby = map.find((m) => m.room.id === "lobby")!;
    const boiler = map.find((m) => m.room.id === "boiler")!;
    expect([lobby.x, lobby.y]).toEqual([0, 0]);
    expect([boiler.x, boiler.y]).toEqual([1, -1]);
  });

  it("crowbar pries open both locked doors and persists", () => {
    const e = new Engine(postOffice);
    e.takeItem(here(e, "crowbar")!);
    const crowbar = find(e, "crowbar")!;
    const pryVault = crowbar.def.uses.find((u) => u.label.includes("vault"))!;
    const pryBoiler = crowbar.def.uses.find((u) => u.label.includes("boiler"))!;

    expect(e.useAvailable(pryVault)).toBe(true);
    e.useItem(crowbar, pryVault);
    expect(find(e, "crowbar")).toBeDefined(); // persists
    expect(e.isUnlocked(e.roomsById.get("sorting_room")!.doors.find((d) => d.to === "vault")!)).toBe(true);

    e.useItem(find(e, "crowbar")!, pryBoiler);
    expect(find(e, "crowbar")).toBeDefined(); // still persists
    expect(e.isUnlocked(e.roomsById.get("sorting_room")!.doors.find((d) => d.to === "boiler")!)).toBe(true);
  });

  it("lantern drains to 0 but stays (removableWhenEmpty:false) and stops offering uses", () => {
    const e = new Engine(postOffice);
    e.takeItem(here(e, "crowbar")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "sorting_room")!);
    e.takeItem(here(e, "storm_lantern")!);
    const lantern = find(e, "storm_lantern")!;
    const shine = lantern.def.uses[0]!;

    e.useItem(lantern, shine);
    e.useItem(lantern, shine);
    expect(lantern.charges).toBe(1);
    e.useItem(lantern, shine);
    expect(lantern.charges).toBe(0);
    // Still in inventory (never removed)...
    expect(find(e, "storm_lantern")).toBeDefined();
    // ...but no longer offers its charged action.
    expect(e.availableUses(lantern)).toHaveLength(0);
  });

  it("awards mid-game points and consumes the sovereign", () => {
    const e = new Engine(postOffice);
    e.takeItem(here(e, "crowbar")!);
    const crowbar = find(e, "crowbar")!;
    e.useItem(crowbar, crowbar.def.uses.find((u) => u.label.includes("boiler"))!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "sorting_room")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "boiler")!);

    e.takeItem(here(e, "gold_sovereign")!);
    const coin = find(e, "gold_sovereign")!;
    e.useItem(coin, coin.def.uses[0]!);
    expect(find(e, "gold_sovereign")).toBeUndefined(); // one-shot consumed
    expect(e.state.points).toBe(50);
  });

  it("can be won by delivering the ledger (time-scored, no points)", () => {
    const e = new Engine(postOffice);
    e.takeItem(here(e, "crowbar")!);
    const crowbar = find(e, "crowbar")!;
    e.useItem(crowbar, crowbar.def.uses.find((u) => u.label.includes("vault"))!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "sorting_room")!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "vault")!);

    e.takeItem(here(e, "parish_ledger")!);
    const ledger = find(e, "parish_ledger")!;
    const deliver = ledger.def.uses[0]!;
    e.useItem(ledger, deliver);

    expect(e.state.ended?.outcome).toBe("win");
    expect(e.state.points).toBe(0); // time-scored: no points on the win ending
    expect(e.finishedAt).toBeDefined();
    expect(e.score).toBeGreaterThanOrEqual(0);
  });

  it("serializes and resumes mid-game", () => {
    const e = new Engine(postOffice);
    e.takeItem(here(e, "crowbar")!);
    const crowbar = find(e, "crowbar")!;
    e.useItem(crowbar, crowbar.def.uses.find((u) => u.label.includes("vault"))!);
    e.tryMove(e.currentRoom.doors.find((d) => d.to === "sorting_room")!);
    e.takeItem(here(e, "storm_lantern")!);
    e.useItem(find(e, "storm_lantern")!, find(e, "storm_lantern")!.def.uses[0]!); // 3 -> 2 charges

    const save = e.serialize();
    const e2 = Engine.load(postOffice, save);
    expect(e2.state.currentRoomId).toBe("sorting_room");
    expect(find(e2, "crowbar")).toBeDefined();
    expect(find(e2, "storm_lantern")!.charges).toBe(2);
    expect(e2.state.roomItems.get("lobby") ?? []).toHaveLength(0); // crowbar taken
  });
});

// keep lighthouse import meaningful for the shipped-game validation block
export { lighthouse };
