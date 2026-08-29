import type { GameDefinition, ItemDef, RoomDef } from "../src/core/types";

/** Build a minimal game, defaulting the starting room to the first room. */
export function makeGame(overrides: Partial<GameDefinition> & { rooms: RoomDef[] }): GameDefinition {
  const rooms = overrides.rooms;
  return {
    id: "test-game",
    title: "Test Game",
    description: "A game built for unit tests.",
    startingRoom: rooms[0]?.id ?? "",
    ...overrides,
  };
}

/** A trivially small two-room game (auto-tiled from `a`). */
export function twoRoomGame(): GameDefinition {
  return makeGame({
    rooms: [
      { id: "a", name: "Room A", description: "A", mapHint: "a", doors: [{ direction: "north", to: "b" }] },
      { id: "b", name: "Room B", description: "B", mapHint: "b", doors: [{ direction: "south", to: "a" }] },
    ],
  });
}

/** A single room containing the given items (so callers can focus on items). */
export function roomWithItems(items: ItemDef[]): GameDefinition {
  return makeGame({
    rooms: [{ id: "room", name: "Room", description: "d", doors: [], items }],
  });
}

/** Convenience: an item with a single use applying `effects`. */
export function item(
  id: string,
  name: string,
  effects: GameDefinitionEffects,
  opts: Partial<ItemDef> = {},
): ItemDef {
  return {
    id,
    name,
    description: `${name} description`,
    uses: [{ label: `Use ${name}`, description: `use ${name}`, effects }],
    ...opts,
  };
}

type GameDefinitionEffects = import("../src/core/types").GameEffect[];
