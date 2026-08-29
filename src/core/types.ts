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
  /**
   * Description of what contextual targets it applies to (shown to player).
   * When `requiresTarget` is set this explains what to aim at (e.g. "the
   * lock on the tower door").
   */
  description: string;
  /**
   * A thing in the CURRENT room this use must be aimed at before it can run.
   * The player clicks the use (arms it) and then clicks the matching object in
   * the room. If unset, the use runs directly from the inventory. This is what
   * prevents "unlock the door from anywhere" — the target must be right here.
   */
  requiresTarget?: RoomTarget;
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
 * A thing inside a room that a targeted item-use can be aimed at. Two kinds:
 *  - a door (by its `direction` label), e.g. the lock on the north exit;
 *  - a loose item lying in the room (by its item `id`), e.g. a strong-box.
 * The engine requires the referenced object to actually be present in the
 * player's CURRENT room before the use can run.
 */
export interface RoomTarget {
  type: "door" | "item";
  /** For `door`: the door's `direction`. For `item`: the item def `id`. */
  ref: string;
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
  /**
   * Where this loose copy sits in the room it's placed in, as a position on the
   * room art's 900x400 canvas. Lets the item look like a prop in the scene
   * (on a shelf, floor, table) that the player has to discover and click.
   * `scale` is a multipllier on top of the item's natural sprite size; the
   * default is configured by the renderer. If omitted the item gets a sensible
   * default placement.
   */
  place?: { x: number; y: number; scale?: number };
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
  /**
   * Interactive props that aren't pickupable — the Monkey Island "look at"
   * gags. Each sits in the scene like an item, hoverable/clickable, and clicking
   * posts `look` to the message box without changing game state.
   */
  interactives?: InteractiveDef[];
}

/** A decorative, non-pickupable object the player can look at for a line. */
export interface InteractiveDef {
  id: string;
  name: string;
  /**
   * The line shown when the player clicks it (a joke, an observation, flavour).
   */
  look: string;
  /** Where on the 900x400 scene it sits, like an item's `place`. */
  place?: { x: number; y: number; scale?: number };
  /** Optional sprite; if omitted the prop renders as a small name tag hotspot. */
  image?: string;
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