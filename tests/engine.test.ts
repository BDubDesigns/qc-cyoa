import { describe, it, expect, vi } from "vitest";
import { Engine } from "../src/core/engine";
import type { SavedState } from "../src/core/engine";
import type { ItemDef, ItemUse } from "../src/core/types";
import { item, makeGame, roomWithItems, twoRoomGame } from "./helpers";

const find = (e: Engine, id: string) => e.state.inventory.find((i) => i.id === id);
const roomItem = (e: Engine, id: string, roomId: string) =>
  (e.state.roomItems.get(roomId) ?? []).find((i) => i.id === id);

describe("navigation", () => {
  it("starts in the starting room, marked seen", () => {
    const e = new Engine(twoRoomGame());
    expect(e.state.currentRoomId).toBe("a");
    expect(e.state.seenRooms.has("a")).toBe(true);
  });

  it("moves through an unlocked door and records the destination", () => {
    const e = new Engine(twoRoomGame());
    const res = e.tryMove(e.currentRoom.doors[0]!);
    expect(res.ok).toBe(true);
    expect(res.moved).toBe(true);
    expect(e.state.currentRoomId).toBe("b");
    expect(e.state.seenRooms.has("b")).toBe(true);
  });

  it("refuses a locked door and does not move", () => {
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [{ direction: "north", to: "b", requiresFlag: "open" }] },
        { id: "b", name: "B", description: "b", doors: [{ direction: "south", to: "a" }] },
      ],
    });
    const e = new Engine(g);
    expect(e.availableExits).toHaveLength(0); // door is locked
    const res = e.tryMove(e.currentRoom.doors[0]!);
    expect(res.ok).toBe(false);
    expect(e.state.currentRoomId).toBe("a");
  });

  it("unlocks a door when its flag is set", () => {
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [{ direction: "north", to: "b", requiresFlag: "open" }] },
        { id: "b", name: "B", description: "b", doors: [] },
      ],
    });
    const e = new Engine(g);
    e.setFlag("open", true);
    expect(e.isUnlocked(e.currentRoom.doors[0]!)).toBe(true);
    expect(e.tryMove(e.currentRoom.doors[0]!).ok).toBe(true);
  });
});

describe("taking items", () => {
  it("moves a taken item from the room into the inventory", () => {
    const e = new Engine(roomWithItems([item("key", "Key", [{ type: "message", text: "ok" }])]));
    expect(e.roomItemsHere).toHaveLength(1);
    const res = e.takeItem(e.roomItemsHere[0]!);
    expect(res.ok).toBe(true);
    expect(find(e, "key")).toBeDefined();
    expect(e.roomItemsHere).toHaveLength(0);
  });

  it("rejects taking an item that isn't in the room", () => {
    const e = new Engine(twoRoomGame());
    const ghost = { def: item("x", "X", []), id: "x", charges: 0, origin: "" };
    const res = e.takeItem(ghost);
    expect(res.ok).toBe(false);
    expect(find(e, "x")).toBeUndefined();
  });
});

describe("using items", () => {
  it("rejects a use that the item doesn't define", () => {
    const e = new Engine(roomWithItems([item("key", "Key", [{ type: "message", text: "ok" }])]));
    const k = e.roomItemsHere[0]!;
    e.takeItem(k);
    const bogus: ItemUse = { label: "Nope", description: "x", effects: [] };
    const res = e.useItem(find(e, "key")!, bogus);
    expect(res.ok).toBe(false);
  });

  it("rejects a use whose flag gate isn't satisfied", () => {
    const gated: ItemDef = item("gadget", "Gadget", [{ type: "message", text: "go" }]);
    gated.uses[0]!.requiresFlag = "allowed";
    const e = new Engine(roomWithItems([gated]));
    const gi = e.roomItemsHere[0]!;
    e.takeItem(gi);
    expect(e.useAvailable(gated.uses[0]!, find(e, "gadget")!)).toBe(false);
    expect(e.useItem(find(e, "gadget")!, gated.uses[0]!).ok).toBe(false);
  });

  it("keeps a persistent item in the inventory after use", () => {
    const key = item("key", "Key", [{ type: "message", text: "ok" }]);
    const e = new Engine(roomWithItems([key]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "key")!, key.uses[0]!);
    expect(find(e, "key")).toBeDefined();
  });

  it("removes a one-shot item (consumes) on use", () => {
    const potion = item("potion", "Potion", [{ type: "message", text: "gulp" }], {}, { uses: [] });
    potion.uses = [{ label: "Drink", description: "x", consumes: true, effects: [{ type: "message", text: "gulp" }] }];
    const e = new Engine(roomWithItems([potion]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "potion")!, potion.uses[0]!);
    expect(find(e, "potion")).toBeUndefined();
  });

  it("removes a charge item when it empties", () => {
    const lighter = item("lighter", "Lighter", [{ type: "message", text: "flick" }]);
    lighter.charges = 1;
    lighter.uses = [{ label: "Strike", description: "x", chargesPerUse: 1, effects: [{ type: "message", text: "flick" }] }];
    const e = new Engine(roomWithItems([lighter]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "lighter")!, lighter.uses[0]!);
    expect(find(e, "lighter")).toBeUndefined();
  });

  it("persists a charge item at 0 when removableWhenEmpty is false, and gates its uses", () => {
    const lantern = item("lantern", "Lantern", [{ type: "message", text: "shine" }]);
    lantern.charges = 2;
    lantern.removableWhenEmpty = false;
    lantern.uses = [{ label: "Shine", description: "x", chargesPerUse: 1, effects: [{ type: "message", text: "shine" }] }];
    const e = new Engine(roomWithItems([lantern]));
    e.takeItem(e.roomItemsHere[0]!);
    const inst = find(e, "lantern")!;
    e.useItem(inst, lantern.uses[0]!);
    e.useItem(inst, lantern.uses[0]!);
    // Empty but still present.
    expect(find(e, "lantern")).toBeDefined();
    expect(inst.charges).toBe(0);
    // Even though it persists, its charged uses are no longer offered.
    expect(e.availableUses(inst)).toHaveLength(0);
    expect(e.useAvailable(lantern.uses[0]!, inst)).toBe(false);
    // Using it directly is refused.
    expect(e.useItem(find(e, "lantern")!, lantern.uses[0]!).ok).toBe(false);
  });
});

describe("effects", () => {
  it("applies message, setFlag, and addPoints", () => {
    const g = item("thing", "Thing", [
      { type: "message", text: "hello" },
      { type: "setFlag", flag: "seen_thing", value: true },
      { type: "addPoints", amount: 25 },
    ]);
    const e = new Engine(roomWithItems([g]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "thing")!, g.uses[0]!);
    expect(e.state.lastMessages).toContain("hello");
    expect(e.state.flags.seen_thing).toBe(true);
    expect(e.state.points).toBe(25);
  });

  it("sets item charges and destroys an item from inventory", () => {
    const a = item("a", "A", [
      { type: "setItemCharges", itemId: "b", charges: 7 },
      { type: "destroyItem", itemId: "b" },
    ]);
    const b = item("b", "B", [{ type: "message", text: "x" }], {}, { charges: 1 });
    const e = new Engine(roomWithItems([a, b]));
    const ai = e.roomItemsHere.find((i) => i.id === "a")!;
    const bi = e.roomItemsHere.find((i) => i.id === "b")!;
    e.takeItem(ai);
    e.takeItem(bi);
    e.useItem(find(e, "a")!, a.uses[0]!);
    expect(find(e, "b")).toBeUndefined();
  });

  it("a targeted unlock requires the player to be in the door's room", () => {
    // The lock is in `doorway`; the key is first found in `start`. Using it
    // from `start` must fail until the player walks to `doorway`.
    const g = makeGame({
      rooms: [
        { id: "start", name: "Start", description: "s", doors: [{ direction: "north", to: "doorway" }], items: [
          item("key", "Key", [{ type: "unlockExit", roomId: "doorway", direction: "north", message: "click" }], {
            requiresTarget: { type: "door", ref: "north", },
          }),
        ] },
        { id: "doorway", name: "Doorway", description: "d", doors: [{ direction: "north", to: "end", requiresFlag: "open" }] },
        { id: "end", name: "End", description: "e", doors: [] },
      ],
    });
    const e = new Engine(g);
    e.takeItem(e.roomItemsHere[0]!);
    const key = find(e, "key")!;
    const use = key.def.uses[0]!;
    const doorway = g.rooms.find((r) => r.id === "doorway")!;

    // Aiming a targeted use without clicking a target is refused.
    expect(e.useItem(key, use).ok).toBe(false);
    expect(e.state.lastMessages.join(" ")).toMatch(/aim/i);

    // Aiming the wrong door is refused.
    expect(e.useItem(key, use, { type: "door", ref: "south" }).ok).toBe(false);

    // The lock door isn't in this room yet, so aiming it fails.
    const far = e.useItem(key, use, { type: "door", ref: "north" });
    expect(far.ok).toBe(false);
    expect(e.isUnlocked(doorway.doors[0]!)).toBe(false);

    // Walk to the room that contains the lock, aim, and unlock works.
    e.tryMove(e.availableExits[0]!);
    expect(e.useItem(key, use, { type: "door", ref: "north" }).ok).toBe(true);
    expect(e.isUnlocked(doorway.doors[0]!)).toBe(true);
    expect(e.state.lastMessages.join(" ")).toMatch(/click/);
  });

  it("aimableTargets lists the doors and loose items in the current room", () => {
    const g = makeGame({
      rooms: [
        {
          id: "start",
          name: "Start",
          description: "s",
          doors: [{ direction: "north", to: "end", requiresFlag: "unlocked" }],
          items: [item("tool", "Tool", [{ type: "message", text: "x" }])],
        },
        { id: "end", name: "End", description: "e", doors: [] },
      ],
    });
    const e = new Engine(g);
    const targets = e.aimableTargets;
    expect(targets).toContainEqual({ type: "door", ref: "north" });
    expect(targets).toContainEqual({ type: "item", ref: "tool" });
  });

  it("a targeted item-use can be aimed at a loose item in the room", () => {
    // A lockable strong-box modeled as an item target.
    const g = makeGame({
      rooms: [
        {
          id: "cellar",
          name: "Cellar",
          description: "s",
          doors: [],
          items: [
            { id: "strongbox", name: "Strong-box", description: "locked", uses: [] },
            item(
              "key",
              "Key",
              [
                { type: "message", text: "The strong-box clicks open." },
                { type: "setFlag", flag: "box_open", value: true },
              ],
              { requiresTarget: { type: "item", ref: "strongbox" } },
            ),
          ],
        },
      ],
    });
    const e = new Engine(g);
    e.takeItem(e.roomItemsHere.find((i) => i.id === "key")!);
    const key = find(e, "key")!;
    const use = key.def.uses[0]!;

    // Refusing a non-present target.
    expect(e.useItem(key, use, { type: "item", ref: "missing" }).ok).toBe(false);
    expect(e.useItem(key, use, { type: "item", ref: "strongbox" }).ok).toBe(true);
    expect(e.state.flags.box_open).toBe(true);
  });

  it("unlockExit in a different room reports the lock isn't here", () => {
    const g = makeGame({
      rooms: [
        { id: "start", name: "Start", description: "s", doors: [{ direction: "north", to: "doorway" }], items: [
          item("key", "Key", [{ type: "unlockExit", roomId: "doorway", direction: "north" }]),
        ] },
        { id: "doorway", name: "Doorway", description: "d", doors: [{ direction: "north", to: "end", requiresFlag: "open" }] },
        { id: "end", name: "End", description: "e", doors: [] },
      ],
    });
    const e = new Engine(g);
    e.takeItem(e.roomItemsHere[0]!);
    // No requiresTarget here, but the effect still refuses a door in another room.
    e.useItem(find(e, "key")!, find(e, "key")!.def.uses[0]!);
    expect(e.state.lastMessages.join(" ")).toMatch(/isn't in this room/);
  });

  it("endGame sets the outcome, message, and points", () => {
    const g = item("win", "Win", [{ type: "endGame", message: "you did it", outcome: "win", points: 40 }]);
    const e = new Engine(roomWithItems([g]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "win")!, g.uses[0]!);
    expect(e.state.ended?.outcome).toBe("win");
    expect(e.state.ended?.message).toBe("you did it");
    expect(e.state.points).toBe(40);
    expect(e.finishedAt).toBeDefined();
  });
});

describe("actions after the game ends", () => {
  it("refuses to move, take, or use once ended", () => {
    const g = item("lose", "Lose", [{ type: "endGame", message: "bad", outcome: "lose" }]);
    const e = new Engine(roomWithItems([g]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "lose")!, g.uses[0]!);
    expect(e.state.ended?.outcome).toBe("lose");
    // Moving somewhere is refused.
    const fakeDoor = { direction: "north", to: "somewhere" };
    expect(e.tryMove(fakeDoor as never).ok).toBe(false);
    // Taking is refused.
    const ghost = { def: g, id: "lose", charges: 0, origin: "" };
    expect(e.takeItem(ghost).ok).toBe(false);
    // Using is refused.
    expect(e.useItem(ghost, g.uses[0]!).ok).toBe(false);
  });
});

describe("serialization / resume", () => {
  it("round-trips an in-progress game", () => {
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [{ direction: "east", to: "b" }], items: [
          item("key", "Key", [{ type: "message", text: "x" }]),
        ] },
        { id: "b", name: "B", description: "b", doors: [{ direction: "west", to: "a" }] },
      ],
    });
    const e = new Engine(g);
    e.takeItem(e.roomItemsHere[0]!);
    e.tryMove(e.currentRoom.doors[0]!);
    e.setFlag("probe", 3);
    e.state.points = 12;

    const save = e.serialize();
    const e2 = Engine.load(g, save);

    expect(e2.state.currentRoomId).toBe("b");
    expect(find(e2, "key")).toBeDefined();
    expect(e2.state.flags.probe).toBe(3);
    expect(e2.state.points).toBe(12);
    expect(e2.state.seenRooms.has("b")).toBe(true);
    expect(e2.startedAt).toBe(e.startedAt);
    // Resumed game is still playable.
    expect(e2.tryMove(e2.currentRoom.doors[0]!).ok).toBe(true);
  });

  it("round-trips an ended game including finishedAt", () => {
    const g = item("finish", "Finish", [{ type: "endGame", message: "done", outcome: "win", points: 100 }]);
    const e = new Engine(roomWithItems([g]));
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "finish")!, g.uses[0]!);
    const save = e.serialize();
    const e2 = Engine.load(roomWithItems([g]), save);
    expect(e2.state.ended?.outcome).toBe("win");
    expect(e2.state.points).toBe(100);
    expect(e2.finishedAt).toBe(e.finishedAt);
  });

  it("throws on a saved item that is no longer defined", () => {
    const bad = {
      version: 1 as const,
      currentRoomId: "room",
      inventory: [{ id: "ghost", charges: 0, origin: "" }],
      roomItems: [],
      flags: {},
      seenRooms: ["room"],
      lastMessages: [],
      points: 0,
      startedAt: 0,
    } satisfies SavedState;
    const g = roomWithItems([]);
    expect(() => Engine.load(g, bad)).toThrow(/not defined/);
  });
});

describe("computeMap", () => {
  it("auto-tiles a room graph, covering every room", () => {
    const e = new Engine(twoRoomGame());
    const map = e.computeMap();
    expect(map).toHaveLength(2);
    expect(map.every((m) => m.room.mapHint !== undefined)).toBe(true);
  });

  it("honours explicit map coordinates", () => {
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [], map: { x: 3, y: -2 } },
        { id: "b", name: "B", description: "b", doors: [{ direction: "east", to: "a" }], map: { x: 4, y: -2 } },
      ],
      startingRoom: "b",
    });
    const e = new Engine(g);
    const map = e.computeMap();
    const a = map.find((m) => m.room.id === "a")!;
    expect([a.x, a.y]).toEqual([3, -2]);
  });
});

describe("change notifications", () => {
  it("emits on action and stops emitting after unsubscribe", () => {
    const e = new Engine(twoRoomGame());
    const spy = vi.fn();
    const unsub = e.onChange(spy);
    e.tryMove(e.currentRoom.doors[0]!);
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
    e.tryMove(e.currentRoom.doors[0]!);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("scoring", () => {
  it("awards points and reports score for a points game", () => {
    const g = item("win", "Win", [{ type: "endGame", message: "w", outcome: "win", points: 100 }]);
    const game = makeGame({ rooms: [{ id: "room", name: "Room", description: "d", doors: [], items: [g] }] });
    game.scoring = { type: "points", points: 100 };
    const e = new Engine(game);
    expect(e.isScored).toBe(true);
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "win")!, g.uses[0]!);
    expect(e.score).toBe(100);
  });

  it("uses elapsed milliseconds for a time game", () => {
    const g = item("fin", "Fin", [{ type: "endGame", message: "f", outcome: "win" }]);
    const game = makeGame({ rooms: [{ id: "room", name: "Room", description: "d", doors: [], items: [g] }] });
    game.scoring = { type: "time" };
    const e = new Engine(game);
    e.takeItem(e.roomItemsHere[0]!);
    e.useItem(find(e, "fin")!, g.uses[0]!);
    expect(e.score).toBeGreaterThanOrEqual(0);
    expect(e.finishedAt).toBeDefined();
  });
});
