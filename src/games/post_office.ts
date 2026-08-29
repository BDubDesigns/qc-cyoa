import type { GameDefinition } from "../core/types";
import { art, svg } from "../art";

const POST_WALL = "fill='url(#wall)'";

/**
 * Example game #2: "The Flooded Post Office".
 *
 * A deliberately different game from the lighthouse, proving the framework is
 * game-agnostic and exercising features the lighthouse doesn't:
 *
 *  - **Time scoring** (`scoring: { type: "time" }`) instead of points — here a
 *    faster escape is the better result.
 *  - **A persistent multi-target tool** — the crowbar is used again and again
 *    to pry open *two different* doors.
 *  - **A charge item that never leaves** — the storm lantern has 3 charges with
 *    `removableWhenEmpty: false`, so it stays as a dead prop when drained while
 *    its charged actions stop being offered.
 *  - **Mid-game `addPoints` awards** — searching dark corners and counting the
 *    day's takings score points while you play (author-chosen, not just win/lose).
 *  - **One-shot item** — the gold sovereign is spent when you count it.
 *  - **Explicit map coordinates** (`room.map`), so the layout is hand-placed
 *    rather than auto-tiled.
 *
 * Win path: pry the sorting-room vault door open, deliver the parish ledger.
 */
export const postOffice: GameDefinition = {
  id: "post_office",
  title: "The Flooded Post Office",
  description:
    "A short demonstration game with the clock against you. Pry, shine, loot, and get the parish ledger out before the water wins.",
  author: "CYOA Framework Demo",
  tags: ["short", "rescue"],
  scoring: { type: "time" },
  startingRoom: "lobby",
  intro:
    "A burst main has drowned the ground floor of the old post office. You have maybe ten minutes before the water finds the fuse box and every light dies. Somewhere in the sorting room, jammed behind the iron grate, is the parish ledger they so badly want saved. Find a way in, take it, and get out fast. The clock is yours alone to beat.",

  rooms: [
    {
      id: "lobby",
      name: "The Flooded Lobby",
      description:
        "Cold brown water laps at your boots across the tiled lobby. A service counter runs along the far wall, and mail bins bob in the far corner. The sorting room lies east, behind a counter gap.",
      image: svg(900, 400, lobbyArt()),
      map: { x: 0, y: 0 },
      mapHint: "The flooded entrance hall.",
      doors: [{ direction: "east", to: "sorting_room" }],
      items: [
        {
          id: "crowbar",
          name: "Iron Crowbar",
          description:
            "A heavy crowbar. Good for prying. Keys never wear out; neither does this.",
          image: svg(160, 180, crowbarArt()),
          place: { x: 285, y: 300, scale: 0.9 }, // leaning against the counter
          uses: [
            {
              label: "Pry open the vault doors",
              description: "Work the crowbar into the seam of the sorting-room vault doors.",
              requiresTarget: { type: "door", ref: "south" },
              effects: [
                {
                  type: "message",
                  text: "You set the claw between the vault doors and haul. With a screech the locking bars give way.",
                },
                {
                  type: "unlockExit",
                  roomId: "sorting_room",
                  direction: "south",
                  message: "The vault doors hang ajar.",
                },
              ],
            },
            {
              label: "Pry open the boiler-room grate",
              description: "Wedge the crowbar under the riveted grate to the boiler room.",
              requiresTarget: { type: "door", ref: "north" },
              effects: [
                {
                  type: "message",
                  text: "The grate's rivets pop like struck matches. A steamy dark gap opens beyond.",
                },
                {
                  type: "unlockExit",
                  roomId: "sorting_room",
                  direction: "north",
                  message: "The boiler-room grate swings open.",
                },
              ],
            },
          ],
        },
      ],
      interactives: [
        {
          id: "counter_bell",
          name: "The service bell",
          look: "Ink-stained, brass, exquisitely wrong. You ring it. Somewhere far away, a postmaster who filed for retirement in 1947 twitches in his sleep.",
          place: { x: 240, y: 150, scale: 0.8 },
          image: art.props.moustache,
        },
        {
          id: "mail_bin",
          name: "The floating mail bin",
          look: "Unsorted letters bob inside it like tiny panicked swimmers. You resist the urge to declare an emergency and start filing.",
          place: { x: 390, y: 270, scale: 0.85 },
          image: art.props.crate,
        },
      ],
    },
    {
      id: "sorting_room",
      name: "The Sorting Room",
      description:
        "Ranks of pigeonhole shelves stretch into gloom. Water drips from the ceiling beams. A hanging storm lantern sways near the workbench. North, a riveted grate leads to the boiler room; south, a heavy pair of vault doors; west, back to the lobby.",
      image: svg(900, 400, sortingRoomArt()),
      map: { x: 1, y: 0 },
      mapHint: "Rows of mail slots and a swaying lantern.",
      doors: [
        { direction: "west", to: "lobby" },
        {
          direction: "north",
          to: "boiler",
          requiresFlag: "boiler_pried",
          lockedText: "The riveted grate is seized solid. You'll need leverage — something heavy and pry-like.",
        },
        {
          direction: "south",
          to: "vault",
          requiresFlag: "vault_pried",
          lockedText: "The double vault doors are shut tight as a drum.",
        },
      ],
      items: [
        {
          id: "storm_lantern",
          name: "Storm Lantern",
          description:
            "A brass storm lantern, well used. It holds three strikes of fuel and stays with you even after the last one sputters out.",
          image: svg(160, 180, lanternArt()),
          place: { x: 362, y: 158, scale: 0.8 }, // hanging near the workbench
          charges: 3,
          removableWhenEmpty: false,
          uses: [
            {
              label: "Shine into the dark corners",
              description: "Swing the lantern across the flooded corners, hunting for anything worth keeping.",
              chargesPerUse: 1,
              effects: [
                {
                  type: "message",
                  text: "The beam sweeps the shadows. You spot a sodden packet of first-class stamps and claim it: +10 points.",
                },
                { type: "addPoints", amount: 10 },
              ],
            },
          ],
        },
      ],
      interactives: [
        {
          id: "pigeonholes",
          name: "A wall of pigeonholes",
          look: "Hundreds of little shelves, each one the cold metal grave of a letter someone once meant to send. You feel personally addressed.",
          place: { x: 640, y: 150, scale: 0.8 },
          image: art.props.crate,
        },
        {
          id: "workbench",
          name: "The workbench",
          look: "A half-canceled stamp kit, a tin of ink, and a note in a hand you almost recognize: 'Fix the leak. AGAIN.' The leak drips on regardless.",
          place: { x: 250, y: 210, scale: 0.85 },
          image: art.props.barrel,
        },
      ],
    },
    {
      id: "boiler",
      name: "The Boiler Room",
      description:
        "An enormous black boiler hulks in the dark, hissing faintly. A thin skein of steam rises past the pipes. Among the coal dust on the floor lies a single bright gold sovereign.",
      image: svg(900, 400, boilerRoomArt()),
      map: { x: 1, y: -1 },
      mapHint: "A hissing iron boiler room.",
      doors: [{ direction: "south", to: "sorting_room" }],
      items: [
        {
          id: "gold_sovereign",
          name: "Gold Sovereign",
          description: "A fat golden coin, hot to the touch, forgotten in the coal dust.",
          image: svg(160, 180, coinArt()),
          place: { x: 660, y: 320, scale: 0.7 }, // half-lost in the coal dust
          uses: [
            {
              label: "Count it into your takings",
              description: "Pocket the sovereign and spend it on your way out. (Consumed.)",
              consumes: true,
              effects: [
                { type: "message", text: "You flip the coin once and pocket it. A good day's loot all told: +50 points." },
                { type: "addPoints", amount: 50 },
              ],
            },
          ],
        },
      ],
      interactives: [
        {
          id: "steam",
          name: "The hissing boiler",
          look: "It exhales a long, patient sigh of steam. You get the sense it isn't working, only keeping the lights on out of stubbornness.",
          place: { x: 460, y: 120, scale: 0.85 },
          image: art.props.fog,
        },
        {
          id: "coal_dust",
          name: "A drift of coal dust",
          look: "Blacker than the water out back. A single bootprint at its centre — a size you'd describe, approvingly, as 'sturdy'.",
          place: { x: 250, y: 330, scale: 0.7 },
          image: art.props.barrel,
        },
      ],
    },
    {
      id: "vault",
      name: "The Vault",
      description:
        "The vault is dry and cold. On a steel shelf sits the parish ledger in its oilcloth wrap — the only thing anyone cares about in this whole drowned building.",
      image: svg(900, 400, vaultArt()),
      map: { x: 1, y: 1 },
      mapHint: "The dry steel vault.",
      doors: [{ direction: "north", to: "sorting_room" }],
      items: [
        {
          id: "parish_ledger",
          name: "Parish Ledger",
          description: "The heavy, oilcloth-wrapped parish ledger. This is why you came.",
          image: svg(160, 180, ledgerArt()),
          place: { x: 300, y: 152, scale: 0.8 }, // sitting on the vault shelf
          uses: [
            {
              label: "Deliver the ledger to safety",
              description: "Get the ledger out of the vault and out of the building, fast.",
              effects: [
                {
                  type: "endGame",
                  message:
                    "You sprint through the rising water, ledger clutched to your chest, and burst out onto the pavement as the lights finally die behind you. Dry-handed and fast — the parish's accounts are saved. (Time is your score: the sooner the better.)",
                  outcome: "win",
                },
              ],
            },
          ],
        },
      ],
      interactives: [
        {
          id: "vault_door",
          name: "The vault door",
          look: "A door this heavy should hold a kingdom, not half a century of unopened mail. You push it. It does not move. It doesn't have to.",
          place: { x: 632, y: 150, scale: 1.05 },
          image: art.props.barrel,
        },
        {
          id: "shelf_dust",
          name: "A film of vault dust",
          look: "You run a finger through it and consider, briefly, the longevity of dust. It has outlived the postmaster, the war, and, you suspect, whoever was supposed to return this ledger.",
          place: { x: 300, y: 175, scale: 0.7 },
          image: art.props.seagull,
        },
      ],
    },
  ],
};

/* ------------------------- hand-rolled SVG artwork ------------------------ */
/* These live in the game file as the documented example of authoring images
   right in your game code with the `svg()` helper. */

function roomDefs(accent: string): string {
  return `
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d57"/>
      <stop offset="1" stop-color="#33353e"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="#1e2b36"/>
    </linearGradient>
  </defs>`;
}

function lobbyArt(): string {
  return `
  ${roomDefs("#3d5570")}
  <rect width="900" height="400" ${POST_WALL}/>
  <rect x="0" y="270" width="900" height="130" fill="url(#water)" opacity=".9"/>
  <path d="M0 270 C 180 258, 320 282, 470 268 C 640 253, 760 272, 900 262 L900 400 L0 400 Z" fill="#2c4052" opacity=".85"/>
  <!-- service counter -->
  <rect x="60" y="120" width="200" height="130" fill="#6b4f2f"/>
  <rect x="60" y="120" width="200" height="18" fill="#8a6a42"/>
  <rect x="60" y="128" width="14" height="122" fill="#8a6a42"/>
  <rect x="246" y="128" width="14" height="122" fill="#8a6a42"/>
  <!-- pigeonhole shelves -->
  <rect x="560" y="60" width="280" height="190" fill="#5a4630"/>
  ${pigeonholes(565, 68, 18, 200, 10)}
  <!-- floating mail bin -->
  <rect x="360" y="300" width="120" height="34" fill="#7a5230" transform="rotate(-8 420 317)"/>
  <rect x="368" y="294" width="104" height="16" fill="#9a7144" transform="rotate(-8 420 302)"/>`;
}

function pigeonholes(x: number, y: number, size: number, rowPixels: number, colCount = 5): string {
  let out = "";
  const rows = Math.floor(rowPixels / size);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < colCount; c++) {
      const px = x + c * (size + 8);
      const py = y + r * (size + 6);
      out += `<rect x="${px}" y="${py}" width="${size}" height="${size}" rx="2" fill="#241a0e"/>
        <rect x="${px + 2}" y="${py + 2}" width="${size - 4}" height="${size - 4}" rx="2" fill="#3d2f1c"/>`;
    }
  }
  return out;
}

function sortingRoomArt(): string {
  return `
  ${roomDefs("#35503f")}
  <rect width="900" height="400" ${POST_WALL}/>
  <rect x="0" y="290" width="900" height="110" fill="url(#water)" opacity=".8"/>
  <path d="M0 290 C 160 280, 340 300, 520 288 C 700 276, 800 292, 900 284 L900 400 L0 400 Z" fill="#20402e" opacity=".8"/>
  <!-- shelving rows -->
  ${pigeonholes(40, 70, 22, 260)}
  ${pigeonholes(340, 70, 22, 260)}
  ${pigeonholes(640, 70, 22, 260)}
  <!-- workbench -->
  <rect x="210" y="210" width="140" height="70" fill="#6b4f2f"/>
  <rect x="210" y="196" width="140" height="14" fill="#8a6a42"/>
  <!-- dripping water -->
  <ellipse cx="180" cy="250" rx="5" ry="20" fill="#9fc4dd" opacity=".5"/>
  <ellipse cx="700" cy="240" rx="5" ry="20" fill="#9fc4dd" opacity=".5"/>`;
}

function boilerRoomArt(): string {
  return `
  ${roomDefs("#2f3640")}
  <rect width="900" height="400" ${POST_WALL}/>
  <rect x="0" y="320" width="900" height="80" fill="url(#water)" opacity=".8"/>
  <!-- big boiler -->
  <rect x="330" y="40" width="240" height="270" rx="20" fill="#20242c"/>
  <ellipse cx="450" cy="310" rx="120" ry="26" fill="#161a20"/>
  <rect x="345" y="60" width="60" height="120" fill="#2b3140"/>
  <!-- pipes -->
  <rect x="470" y="80" width="18" height="220" fill="#3a4d63"/>
  <rect x="360" y="240" width="18" height="18" fill="#3a4d63"/>
  <!-- steam -->
  <ellipse cx="560" cy="120" rx="26" ry="40" fill="#cfd8e0" opacity=".25"/>
  <ellipse cx="610" cy="90" rx="20" ry="34" fill="#cfd8e0" opacity=".2"/>
  <ellipse cx="595" cy="180" rx="18" ry="30" fill="#cfd8e0" opacity=".18"/>
  <!-- grate -->
  <rect x="600" y="250" width="120" height="60" rx="6" fill="#3a3226"/>
  <rect x="605" y="262" width="110" height="8" fill="#151209"/>
  <rect x="605" y="280" width="110" height="8" fill="#151209"/>
  <rect x="605" y="298" width="110" height="8" fill="#151209"/>`;
}

function vaultArt(): string {
  return `
  ${roomDefs("#2a4a4a")}
  <rect width="900" height="400" ${POST_WALL}/>
  <rect x="0" y="330" width="900" height="70" fill="url(#water)" opacity=".55"/>
  <!-- open vault door -->
  <rect x="620" y="60" width="140" height="260" fill="#8f959c" transform="skewY(-4)"/>
  <rect x="630" y="70" width="120" height="8" fill="#aab0b6"/>
  <rect x="630" y="90" width="120" height="8" fill="#aab0b6"/>
  <rect x="630" y="250" width="120" height="8" fill="#aab0b6"/>
  <circle cx="680" cy="170" r="22" fill="#c8ced4"/>
  <circle cx="680" cy="170" r="12" fill="#3a4147"/>
  <!-- vault frame -->
  <rect x="600" y="45" width="14" height="290" fill="#565c63"/>
  <rect x="600" y="45" width="180" height="14" fill="#565c63"/>
  <!-- shelf with ledger -->
  <rect x="180" y="160" width="260" height="14" fill="#6b4f2f"/>
  <rect x="220" y="100" width="150" height="60" fill="#31505a"/>`;
}

function crowbarArt(): string {
  return `
  <rect width="160" height="180" fill="none"/>
  <path d="M52 30 L138 130" stroke="#3a4147" stroke-width="22" stroke-linecap="round"/>
  <path d="M52 30 L138 130" stroke="#69727c" stroke-width="12" stroke-linecap="round"/>
  <path d="M52 30 L34 48 L60 56 L48 70 L78 78" fill="#4c545e"/>
  <path d="M112 158 L138 130 L150 146 L160 138" stroke="#69727c" stroke-width="12" stroke-linecap="round" fill="none"/>`;
}

function lanternArt(): string {
  return `
  <rect width="160" height="180" fill="#0d0f14"/>
  <!-- handle -->
  <path d="M50 20 h60 M50 20 v26 M110 20 v26" stroke="#5b656f" stroke-width="6" fill="none"/>
  <!-- body -->
  <rect x="34" y="44" width="92" height="92" rx="10" fill="#47505c"/>
  <rect x="34" y="136" width="92" height="24" rx="8" fill="#2b313b"/>
  <!-- glass -->
  <rect x="46" y="58" width="68" height="66" rx="6" fill="#f3c75c"/>
  <rect x="46" y="58" width="68" height="66" rx="6" fill="#ff9d00" opacity=".55"/>
  <line x1="80" y1="58" x2="80" y2="124" stroke="#47505c" stroke-width="5"/>
  <line x1="46" y1="91" x2="114" y2="91" stroke="#47505c" stroke-width="5"/>`;
}

function coinArt(): string {
  return `
  <rect width="160" height="180" fill="#161a20"/>
  <g transform="rotate(-8 80 90)">
    <circle cx="80" cy="90" r="60" fill="#d8a623"/>
    <circle cx="80" cy="90" r="54" fill="#f0c94a"/>
    <circle cx="80" cy="90" r="40" fill="none" stroke="#b8860b" stroke-width="6"/>
    <rect x="56" y="84" width="48" height="12" fill="#c99a1e"/>
  </g>`;
}

function ledgerArt(): string {
  return `
  <rect width="160" height="180" fill="#171b23"/>
  <g transform="rotate(-10 80 90)">
    <rect x="34" y="28" width="92" height="124" rx="6" fill="#6b2f2f"/>
    <rect x="40" y="34" width="80" height="112" rx="4" fill="#3c1f1f"/>
    <rect x="44" y="40" width="66" height="96" fill="#e9e2cd"/>
    <line x1="48" y1="52" x2="106" y2="52" stroke="#8a8374" stroke-width="3"/>
    <line x1="48" y1="72" x2="106" y2="72" stroke="#8a8374" stroke-width="3"/>
    <line x1="48" y1="92" x2="94" y2="92" stroke="#8a8374" stroke-width="3"/>
    <line x1="48" y1="112" x2="100" y2="112" stroke="#8a8374" stroke-width="3"/>
  </g>`;
}
