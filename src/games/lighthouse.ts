import type { GameDefinition } from "../core/types";
import { art } from "../art";

/**
 * Example game: "The Abandoned Lighthouse".
 *
 * Demonstrates all the framework's features:
 *  - Rooms with optional images (some set as remote URLs, most not).
 *  - Items that disappear from a room and enter your inventory on pickup.
 *  - A persistent item (the Brass Key) — usable repeatedly, never consumed.
 *  - A consumable item (the Lighter) with finite fuel — one charge, gone after use.
 *  - Locked doors opened by using the right item.
 *  - A map layout with per-room hints for backtracking.
 *
 * Win path: find the Brass Key, unlock the tower door, climb to the beacon,
 * and use the lighter to relight it.
 */
export const lighthouse: GameDefinition = {
  id: "lighthouse",
  title: "The Abandoned Lighthouse",
  description:
    "A short demonstration game. Explore, pick up items, use the key to break into the tower, and use the lighter to relight the beacon.",
  author: "CYOA Framework Demo",
  tags: ["short", "mystery"],
  scoring: { type: "points", points: 100 },
  startingRoom: "cliff_path",
  intro:
    "The sea fog closes in as you reach the foot of a derelict lighthouse. A keeper's pace could not save the last crew. Now the beacon is dark, and the shore below is blind. Somewhere on these grounds is a way inside...",

  rooms: [
    {
      id: "cliff_path",
      name: "The Cliff Path",
      description:
        "Wind whips the grass along the cliff, and black water churns below. The lighthouse looms ahead, its iron door rusted shut. A tumbled path door leads east to an open storeroom, and a strong key West lies in the wreckage of an old boat shed.",
      image: art.rooms.cliff_path,
      mapHint: "The windy start, where you first see the lighthouse.",
      doors: [
        { direction: "north", to: "tower_door", lockedText: "The iron door is buckled and sealed. No forcing this." },
        { direction: "east", to: "boatshed" },
      ],
      items: [
        {
          id: "brass_key",
          name: "Brass Tower Key",
          description:
            "A heavy brass key stamped with an anchor. It fits the tower door and, once used, stays with you — keys don't wear out.",
          image: art.items.brass_key,
          place: { x: 210, y: 320, scale: 0.85 }, // lying on the shore path
          uses: [
            {
              label: "Unlock the tower door",
              description: "Turn the key in the iron lock of the tower door.",
              requiresTarget: { type: "door", ref: "north" },
              effects: [
                {
                  type: "unlockExit",
                  roomId: "tower_door",
                  direction: "north",
                  message: "The brass key grinds in the lock, and the iron door swings inward.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "boatshed",
      name: "The Boat Shed",
      description:
        "A cluttered shed smelling of tar and dead fish. Rows of benches hold lanterns and tackle. A flight of wide stairs climbs the cliff back toward the lighthouse, and an open hatch leads to a cellar below.",
      image: art.rooms.boatshed,
      mapHint: "A dark shed with lanterns and tackle.",
      doors: [
        { direction: "west", to: "cliff_path" },
        { direction: "north", to: "cellar" },
      ],
      items: [
        {
          id: "lighter",
          name: "Battered Lighter",
          description:
            "An old brass lighter, scraped bare. You can feel a faint slosh inside — barely enough fuel for a single strike.",
          image: art.items.lighter,
          place: { x: 250, y: 230, scale: 0.8 }, // on the work bench
          charges: 1,
          uses: [
            {
              label: "Waste a strike on a spark",
              description: "Flick the wheel for a single lonely spark. Uses up the last fuel.",
              chargesPerUse: 1,
              effects: [
                {
                  type: "endGame",
                  message:
                    "The lighter flares once, a thin tongue of flame that dies in seconds. One strike, then nothing but cold brass. When you finally reached the tower to relight the beacon, you had no flame left. The shore stays dark, and you walk away defeated.",
                  outcome: "lose",
                },
              ],
            },
            {
              label: "Light the beacon mantle",
              description: "Hold the last flame of the lighter to the primed mantle. (Consumes the lighter.)",
              chargesPerUse: 1,
              requiresFlag: "beacon_ready",
              effects: [
                {
                  type: "endGame",
                  message:
                    "You touch the last, single flame of the lighter to the primed mantle. It catches, and the great lens blazes to life, sweeping a vast beam across the sleeping sea. The lighthouse is alive again, and you have saved the shore.",
                  outcome: "win",
                  points: 100,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "cellar",
      name: "The Cellar",
      description:
        "A musty stone cellar beneath the shed. Shelves hold jars of pickled things and two coils of new rope. A strong-box on the floor is locked with a simple latch. A ladder leads back up to the shed.",
      image: art.rooms.cellar,
      mapHint: "A musty stone cellar below the shed.",
      doors: [
        { direction: "south", to: "boatshed" },
      ],
      items: [
        {
          id: "strongbox_key",
          name: "Small Strongbox Key",
          description: "A little burnished key that opens the cellar strong-box.",
          image: art.items.strongbox_key,
          place: { x: 232, y: 148, scale: 0.8 }, // on the cellar shelf
          uses: [
            {
              label: "Open the strong-box",
              description: "Unlock the steel strong-box on the cellar floor.",
              effects: [
                { type: "message", text: "Inside the strong-box: nothing but dust and a single tall wax candle." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "tower_door",
      name: "The Tower Door",
      description:
        "A heavy iron door seals the tower. The lock is old but strong. To the south the cliff path winds away between the sheds.",
      image: art.rooms.tower_door,
      mapHint: "The rusted iron entrance to the tower.",
      doors: [
        { direction: "north", to: "spiral_stairs", requiresFlag: "tower_door_unlocked", lockedText: "The iron door is shut and locked." },
        { direction: "south", to: "cliff_path" },
      ],
    },
    {
      id: "spiral_stairs",
      name: "The Spiral Stairs",
      description:
        "A tight spiral stair winds up inside the tower wall. Through tall arched windows, fog pours in. Above you, the lantern room waits. Below, the iron door you unlocked stands open.",
      image: art.rooms.spiral_stairs,
      mapHint: "The winding stair up the tower's heart.",
      doors: [
        { direction: "north", to: "beacon_room" },
        { direction: "south", to: "tower_door" },
      ],
      items: [
        {
          id: "beacon_manual",
          name: "Keeper's Manual",
          description: "A damp leather manual on lighting the great lamp.",
          image: art.items.beacon_manual,
          place: { x: 518, y: 350, scale: 0.85 }, // resting on a stair
          uses: [
            {
              label: "Read the manual",
              description: "Learn how to light the beacon.",
              effects: [
                { type: "message", text: "The manual says: wind the clockwork, open the fuel valve, and touch the flame to the mantle — a single strong flame is enough." },
                { type: "setFlag", flag: "read_manual", value: true },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "beacon_room",
      name: "The Beacon Room",
      description:
        "At the crown of the tower sits the great lens, its mantle cold and dark. Cracked windows stare out to sea. Fuel drips from a battered can beside the lamp. The way back down is south.",
      image: art.rooms.beacon_room,
      mapHint: "The crown of the tower — the dark beacon.",
      doors: [
        { direction: "south", to: "spiral_stairs" },
      ],
      items: [
        {
          id: "fuel_can",
          name: "Oil Fuel Can",
          description: "A battered can of lighthouse oil. It has just enough to refill the lamp once — then it's empty.",
          image: art.items.fuel_can,
          place: { x: 730, y: 300, scale: 0.9 }, // beside the lamp on the floor
          charges: 1,
          uses: [
            {
              label: "Fill the oil lamp",
              description: "Pour the last of the oil into the beacon's reservoir (consumes the can).",
              chargesPerUse: 1,
              effects: [
                { type: "message", text: "Oil sloshes into the reservoir and the can clatters down, empty. The lamp is primed, waiting for a flame." },
                { type: "setFlag", flag: "beacon_ready", value: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};