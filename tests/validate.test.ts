import { describe, it, expect } from "vitest";
import {
  defineGame,
  GameValidationError,
  inspectGame,
  isValidGame,
  validateGame,
} from "../src/core/validate";
import type { GameDefinition } from "../src/core/types";
import { item, makeGame, twoRoomGame } from "./helpers";

function base(): GameDefinition {
  return twoRoomGame();
}

describe("validateGame", () => {
  it("accepts a valid game and returns it", () => {
    const g = base();
    expect(validateGame(g)).toBe(g);
    expect(isValidGame(g)).toBe(true);
    expect(inspectGame(g).filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("throws on a duplicate room id", () => {
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [] },
        { id: "a", name: "A again", description: "a", doors: [] },
      ],
    });
    expect(() => validateGame(g)).toThrow(GameValidationError);
    expect(() => validateGame(g)).toThrow(/duplicate room id/);
  });

  it("throws when the starting room doesn't exist", () => {
    const g = makeGame({ startingRoom: "missing", rooms: [{ id: "a", name: "A", description: "a", doors: [] }] });
    expect(() => validateGame(g)).toThrow(/startingRoom "missing"/);
  });

  it("throws when a door points to a nonexistent room", () => {
    const g = makeGame({
      rooms: [{ id: "a", name: "A", description: "a", doors: [{ direction: "north", to: "ghost" }] }],
    });
    expect(() => validateGame(g)).toThrow(/unknown room "ghost"/);
  });

  it("throws on a duplicate item id across the game", () => {
    const shared = item("dup", "Dup", [{ type: "message", text: "x" }]);
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [], items: [shared] },
        { id: "b", name: "B", description: "b", doors: [], items: [shared] },
      ],
    });
    expect(() => validateGame(g)).toThrow(/duplicate item id "dup"/);
  });

  it("throws when unlockExit references an unknown room", () => {
    const g = makeGame({
      rooms: [{ id: "a", name: "A", description: "a", doors: [], items: [
        item("key", "Key", [{ type: "unlockExit", roomId: "nope", direction: "north" }]),
      ] }],
    });
    expect(() => validateGame(g)).toThrow(/unknown room "nope"/);
  });

  it("throws when unlockExit references an unknown door in a real room", () => {
    const g = makeGame({
      rooms: [
        { id: "a", name: "A", description: "a", doors: [], items: [
          item("key", "Key", [{ type: "unlockExit", roomId: "room", direction: "west" }]),
        ] },
        { id: "room", name: "Room", description: "r", doors: [{ direction: "north", to: "a" }] },
      ],
    });
    expect(() => validateGame(g)).toThrow(/unknown door "west"/);
  });

  it("throws when an effect references an undefined item", () => {
    const g = makeGame({
      rooms: [{ id: "a", name: "A", description: "a", doors: [], items: [
        item("key", "Key", [{ type: "destroyItem", itemId: "ghost" }]),
      ] }],
    });
    expect(() => validateGame(g)).toThrow(/unknown item "ghost"/);
  });

  it("flags warnings (not errors) for a game that still runs", () => {
    // Item with no uses -> warning; already-open door unlock -> warning; no
    // points awarded but points-scored -> warning. None should throw.
    const g = makeGame({
      scoring: { type: "points", points: 100 },
      rooms: [
        {
          id: "a",
          name: "A",
          description: "a",
          doors: [{ direction: "north", to: "b" }],
          items: [
            { id: "noop", name: "Noop", description: "n", uses: [] },
            { id: "key", name: "Key", description: "k", uses: [
              { label: "Open", description: "x", effects: [{ type: "unlockExit", roomId: "a", direction: "north" }] },
            ] },
          ],
        },
        { id: "b", name: "B", description: "b", doors: [{ direction: "south", to: "a" }] },
      ],
    });
    const issues = inspectGame(g);
    expect(issues.some((i) => i.level === "warning" && /no uses/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.level === "warning" && /no lock/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.level === "warning" && /no endGame effect/.test(i.message))).toBe(true);
    expect(isValidGame(g)).toBe(true); // warnings don't fail validation
  });

  it("rejects a bad scoring type", () => {
    const g = base() as GameDefinition & { scoring: { type: string } };
    g.scoring = { type: "stars" } as never;
    expect(() => validateGame(g as GameDefinition)).toThrow(/scoring\.type/);
  });
});

describe("defineGame", () => {
  it("returns a valid game", () => {
    const g = defineGame(base());
    expect(g.id).toBe("test-game");
  });

  it("throws on an invalid game", () => {
    expect(() => defineGame({ id: "x", title: "X", description: "x", startingRoom: "nope", rooms: [] })).toThrow();
  });
});
