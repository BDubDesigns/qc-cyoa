/**
 * Core type definitions for the choose-your-own-adventure framework.
 *
 * A game is a collection of Rooms connected by Doors. Rooms may contain Items
 * which the player can pick up (removing them from the room) into a shared
 * inventory. Items may be "used" — either persistently (stays in inventory,
 * e.g. a key) or consumably (consumed or depleted, e.g. a lighter with limited
 * fuel). The whole layout is presented as a map so the player can backtrack.
 */

/** An arbitrary effect the engine can apply to the game state. */
export type GameEffect =
  | { type: "message"; text: string }
  | { type: "destroyItem"; itemId: string }
  | { type: "setItemCharges"; itemId: string; charges: number }
  | { type: "addPoints"; amount: number }
  | { type: "setFlag"; flag: string; value: boolean | string | number }
  | {
      type: "unlockExit";
      roomId: string;
      direction: string;
      /** Thematic message shown when the exit unlocks. */
      message?: string;
    }
  | { type: "endGame"; message: string; outcome: "win" | "lose"; points?: number };

/**
 * A single action a player can take with an item while it is in their inventory.
 * If `consumes` is true the whole instance is removed afterward; otherwise the
 * item persists. `chargesPerUse` reduces charges (and when charges reach 0 the
 * item is removed unless `removableWhenEmpty` is false).
 */
export interface ItemUse {
  /** Button label / command verb, e.g. "Open the door". */
  label: string;
  /** Description of what contextual targets it applies to (shown to player). */
  description: string;
  /**
   * Effects to run when used. May reference the *current* room through the
   * engine's `this` context (see `ItemUseHandler`).
   */
  effects: GameEffect[];
  /** Reduce this many charges per use. Default 0. */
  chargesPerUse?: number;
  /**
   * When true, the item is removed from inventory entirely after this use
   * (regardless of charges). Useful for "one-time" items.
   */
  consumes?: boolean;
  /**
   * Optional gate: this use is only offered/effective when the named flag
   * equals `requireValue` (default true). Lets one item have different actions
   * depending on world state (e.g. "Light the beacon" only once it is fueled).
   */
  requiresFlag?: string;
  requireValue?: boolean | string | number;
}

/**
 * Item definition. Ids must be unique per game.
 *
 * An item is instantiated at runtime so multiple copies (or one instance that
 * accumulates uses) can carry independent state — e.g. `charges`.
 */
export interface ItemDef {
  id: string;
  name: string;
  description: string;
  /** Optional image for the item (URL or data URI). */
  image?: string;
  /** Optional initial charges; e.g. a lighter with 1 use has charges: 1. */
  charges?: number;
  /**
   * If this is false, an item whose charges hit 0 still remains in inventory
   * (a multi-use prop like a candle that never truly empties). Default true.
   */
  removableWhenEmpty?: boolean;
  /** Actions available when the item is in the player's inventory. */
  uses: ItemUse[];
}

/** A runtime copy of an item, distinct per acquisition / per state. */
export interface ItemInstance {
  def: ItemDef;
  /** Id of the item definition this derives from. */
  id: string;
  charges: number;
  /** Provenance shown to the player, e.g. where it was found. */
  origin: string;
}

/** A door (exit) from one room to another. */
export interface Door {
  /** Direction label, e.g. "north", "east", "down the hatch". */
  direction: string;
  /** Destination room id. */
  to: string;
  /**
   * Lock condition. If present, the player can only traverse the door when the
   * listed flag matches `requireValue` (default true).
   */
  requiresFlag?: string;
  requireValue?: boolean | string | number;
  /** Optional text shown when the door is locked and the player tries to pass. */
  lockedText?: string;
}

export interface RoomDef {
  id: string;
  name: string;
  /** Main narrative/descriptive text shown for the room. */
  description: string;
  /** Optional image for the room (URL or data URI). Not required. */
  image?: string;
  /**
   * Optional map coordinates for the auto-layout. If omitted the map layout is
   * computed from the door graph. `x`/`y` in grid units.
   */
  map?: { x: number; y: number };
  /**
   * One short line for the map tooltip, e.g. "The dim entrance hall."
   */
  mapHint?: string;
  doors: Door[];
  /** Items that start in this room (picked up → removed from room + inventory). */
  items?: ItemDef[];
}

/** How a game is scored, chosen by the author. */
export interface GameScoring {
  /** War a lower time is better ("time"), or an explicit score ("points"). */
  type: "time" | "points";
  /**
   * For "points" mode: the total points awarded on a win. The author can also
   * award per-use/flag points via `endGame.points` or by setting a "score" flag.
   */
  points?: number;
}

/** Metadata about the whole game. */
export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  startingRoom: string;
  rooms: RoomDef[];
  /** Optional narrator intro shown before the first room. */
  intro?: string;
  /** Optional metadata shown in lobbies / provenance (author, tags, etc.). */
  author?: string;
  /** Optional tag list, e.g. ["horror", "short"]. */
  tags?: string[];
  /** How the game is scored; absent means "no score". */
  scoring?: GameScoring;
}