import type { GameDefinition, GameEffect, RoomDef } from "./types";

/**
 * Author-time validation for game definitions.
 *
 * A well-typed `GameDefinition` still allows plenty of *semantic* mistakes that
 * compile fine but break at runtime — a door pointing to a room that doesn't
 * exist, duplicate item ids, an `unlockExit` for a door that has no lock, etc.
 * `validateGame` catches those up-front with a clear message instead of letting
 * them surface as a confusing error in the middle of a playthrough.
 *
 * The `Engine` constructor runs this automatically, and `defineGame` runs it at
 * author time too, so a bad definition fails at startup / test time.
 */

/** Thrown by `validateGame` when the definition has structural errors. */
export class GameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameValidationError";
  }
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

/** All issues (errors + warnings) for a game definition, without throwing. */
export function inspectGame(game: GameDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bad = (message: string) =>
    issues.push({ level: "error", message: `game "${game.id}": ${message}` });
  const warn = (message: string) =>
    issues.push({ level: "warning", message: `game "${game.id}": ${message}` });

  if (!game.id) bad("id must be a non-empty string");
  if (!game.title) warn("has no title");
  if (!game.rooms || game.rooms.length === 0) {
    bad("has no rooms");
    return issues;
  }

  const roomIds = new Set<string>();
  for (const room of game.rooms) {
    if (!room.id) bad(`room is missing an id (index ${game.rooms.indexOf(room)})`);
    else if (roomIds.has(room.id)) bad(`duplicate room id "${room.id}"`);
    else roomIds.add(room.id);
  }

  if (!game.startingRoom) bad("has no startingRoom");
  else if (!roomIds.has(game.startingRoom)) {
    bad(`startingRoom "${game.startingRoom}" does not match any room`);
  }

  // Doors must point at existing rooms.
  for (const room of game.rooms) {
    for (const door of room.doors ?? []) {
      if (!door.direction) bad(`room "${room.id}" has a door with no direction`);
      if (!door.to) bad(`room "${room.id}" door "${door.direction ?? "?"}" has no destination`);
      else if (!roomIds.has(door.to)) {
        bad(`room "${room.id}" door "${door.direction ?? "?"}" points to unknown room "${door.to}"`);
      }
    }
  }

  // Item ids must be unique across the whole game.
  const itemIds = new Set<string>();
  const itemOwners = new Map<string, string>();
  for (const room of game.rooms) {
    for (const item of room.items ?? []) {
      if (!item.id) bad(`room "${room.id}" has an item with no id`);
      else if (itemIds.has(item.id)) {
        bad(`duplicate item id "${item.id}" (owned by "${itemOwners.get(item.id)}" and "${room.id}")`);
      } else {
        itemIds.add(item.id);
        itemOwners.set(item.id, room.id);
      }
      if (!item.name) bad(`item "${item.id ?? "?"}" has no name`);
      if (item.place) {
        if (typeof item.place.x !== "number" || typeof item.place.y !== "number") {
          bad(`item "${item.id ?? "?"}" has a place with non-numeric x/y`);
        } else if (item.place.x < 0 || item.place.x > 900 || item.place.y < 0 || item.place.y > 400) {
          warn(`item "${item.id ?? "?"}" place sits outside the 900x400 scene (${item.place.x}, ${item.place.y})`);
        }
        if (item.place.scale !== undefined && item.place.scale <= 0) {
          bad(`item "${item.id ?? "?"}" place.scale must be positive`);
        }
      }
      if (!item.uses || item.uses.length === 0) {
        warn(`item "${item.id ?? "?"}" has no uses (the player can never do anything with it)`);
      }
    }
  }
  if (itemIds.size === 0) warn("game has no items at all");

  // Validate effects against the real door graph / item set.
  for (const room of game.rooms) {
    for (const item of room.items ?? []) {
      for (const use of item.uses ?? []) {
        if (!use.label) bad(`item "${item.id}" has a use with no label`);
        // A targeted use's item ref must reference a real item somewhere.
        if (use.requiresTarget?.type === "item") {
          const tid = use.requiresTarget.ref;
          if (!tid) bad(`item "${item.id}" use "${use.label}" targets an item with no id`);
          else if (!itemIds.has(tid)) {
            bad(`item "${item.id}" use "${use.label}" targets unknown item "${tid}"`);
          }
        }
        if (use.requiresTarget?.type === "door" && !use.requiresTarget.ref) {
          bad(`item "${item.id}" use "${use.label}" targets a door with no direction`);
        }
        for (const effect of use.effects ?? []) checkEffect(effect);
      }
    }
  }

  function checkEffect(effect: GameEffect): void {
    switch (effect.type) {
      case "unlockExit": {
        const room = game.rooms.find((r) => r.id === effect.roomId);
        if (!room) {
          bad(`unlockExit refers to unknown room "${effect.roomId}"`);
          return;
        }
        const door = room.doors?.find((d) => d.direction === effect.direction);
        if (!door) {
          bad(`unlockExit refers to unknown door "${effect.direction}" in room "${effect.roomId}"`);
          return;
        }
        if (!door.requiresFlag) {
          warn(`unlockExit for room "${effect.roomId}" door "${effect.direction}" has no lock (no requiresFlag) — no effect`);
        }
        break;
      }
      case "destroyItem":
      case "setItemCharges":
        if (!itemIds.has(effect.itemId)) {
          bad(`${effect.type} refers to unknown item "${effect.itemId}"`);
        }
        break;
      case "endGame":
        if (effect.points !== undefined && game.scoring?.type !== "points") {
          warn(`endGame awards ${effect.points} points but the game is not points-scored — the score is ignored`);
        }
        break;
      default:
        break;
    }
  }

  // Scoring shape.
  if (game.scoring) {
    if (game.scoring.type !== "time" && game.scoring.type !== "points") {
      bad(`scoring.type must be "time" or "points", got ${String(game.scoring.type)}`);
    } else if (game.scoring.type === "points") {
      const awardsPoints = game.rooms.some((r) =>
        (r.items ?? []).some((i) =>
          (i.uses ?? []).some((u) =>
            u.effects.some((ef) => ef.type === "endGame" && ef.points !== undefined),
          ),
        ),
      );
      if (!awardsPoints) {
        warn("scoring is type \"points\" but no endGame effect awards any points — the final score will be 0");
      }
    }
  }

  // Reachability: every room should be reachable from the start.
  const reachable = reachableRooms(game);
  for (const room of game.rooms) {
    if (!reachable.has(room.id)) {
      warn(`room "${room.id}" is unreachable from the starting room`);
    }
  }

  return issues;
}

/** True when the definition has no errors (warnings don't count). */
export function isValidGame(game: GameDefinition): boolean {
  return inspectGame(game).every((i) => i.level !== "error");
}

/** Throws {@link GameValidationError} on the first structural error. */
export function validateGame(game: GameDefinition): GameDefinition {
  const errors = inspectGame(game).filter((i) => i.level === "error");
  if (errors.length > 0) {
    throw new GameValidationError(errors[0]!.message);
  }
  return game;
}

/**
 * Author-time helper: type-check + structurally validate a definition and
 * return it. Prefer this over object literals when five lines of runtime
 * validation are worth the safety.
 *
 * ```ts
 * const myGame = defineGame({ ... });
 * ```
 */
export function defineGame(game: GameDefinition): GameDefinition {
  return validateGame(game);
}

function reachableRooms(game: GameDefinition): Set<string> {
  const seen = new Set<string>();
  const stack = [game.startingRoom];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const room = game.rooms.find((r) => r.id === id);
    // Traverse every door, locked or not: a lock is opened by an item effect,
    // so a room behind it is still reachable. This scan only warns about rooms
    // that are genuinely disconnected from the start by the raw door graph.
    for (const door of room?.doors ?? []) {
      if (!seen.has(door.to)) stack.push(door.to);
    }
  }
  return seen;
}

export type { RoomDef };
