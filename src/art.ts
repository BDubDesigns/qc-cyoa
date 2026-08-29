/**
 * Hand-rolled SVG artwork for the demo game.
 *
 * These are deliberately crude, charmingly amateur vector drawings — perfectly
 * acceptable, indisputably *not* professional. Room art uses inline gradients
 * and simple shapes; item art is a plain flat icon. Every image is emitted as a
 * data URI so games stay self-contained (no separate file requests, works fully
 * offline). To use a `data:` URI, just assign it to RoomDef.image / ItemDef.image.
 */

const NS = "xmlns='http://www.w3.org/2000/svg'";

/** Wrap raw SVG markup into an SVG image data URI. */
export function svg(width: number, height: number, body: string): string {
  const markup = `<svg ${NS} width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>
  ${body}
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

const LEAF = "fill='#3f7d3a' opacity='.9'";
const SKY = "fill='url(#sky)'";

/* ------------------------------ room artwork ----------------------------- */

export const roomCliffPath = svg(
  900,
  400,
  `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b6b8a"/>
      <stop offset="1" stop-color="#a9b6c4"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f4b63"/>
      <stop offset="1" stop-color="#182d3f"/>
    </linearGradient>
  </defs>
  <rect width="900" height="400" ${SKY}/>
  <rect x="0" y="180" width="900" height="220" fill="url(#sea)"/>
  <path d="M0 300 C 150 260, 300 320, 500 280 C 700 245, 800 290, 900 260 L900 400 L0 400 Z" fill="#3d4a3a" />
  <path d="M0 180 C 150 170, 280 190, 420 175 C 600 155, 750 180, 900 168 L900 400 L0 400 Z" fill="#4e5d43"/>
  <path d="M0 180 C 150 170, 280 190, 420 175 C 600 155, 750 180, 900 168 L900 234 L0 234 Z" fill="#5d6f4d"/>
  <!-- lighthouse tower -->
  <rect x="470" y="10" width="70" height="330" fill="#cdd2d6"/>
  <rect x="460" y="300" width="90" height="40" fill="#c2c8cd"/>
  <rect x="452" y="310" width="106" height="26" fill="#8f9aa3"/>

  <polygon points="505,22 470,70 540,70" fill="#e8e3d6"/>
  <rect x="470" y="70" width="70" height="24" fill="#d3d7d9"/>
  <rect x="482" y="94" width="46" height="40" fill="#39424b"/>

  <rect x="478" y="140" width="54" height="70" fill="#f3efe4"/>
  <rect x="488" y="150" width="34" height="50" fill="#5b6b8a"/>
  <!-- stripe -->
  <rect x="470" y="185" width="70" height="22" fill="#b03a2e" opacity=".85"/>
  <rect x="470" y="228" width="70" height="22" fill="#b03a2e" opacity=".85"/>
  <!-- grass tufts -->
  <ellipse cx="140" cy="215" rx="70" ry="16" ${LEAF}/>
  <ellipse cx="760" cy="225" rx="80" ry="15" ${LEAF}/>
  <ellipse cx="900" cy="235" rx="90" ry="16" ${LEAF}/>
  <!-- little path -->
  <path d="M150 400 C 220 340, 340 330, 430 355" stroke="#a08b62" stroke-width="26" fill="none" stroke-linecap="round"/>
`
);

export const roomBoatShed = svg(
  900,
  400,
  `
  <defs>
    <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#40321f"/>
      <stop offset="1" stop-color="#2b2113"/>
    </linearGradient>
  </defs>
  <rect width="900" height="400" fill="url(#w)"/>
  <!-- wooden slats -->
  <g stroke="#5a452b" stroke-width="2" opacity=".6">
    <line x1="0" y1="80" x2="900" y2="80"/><line x1="0" y1="160" x2="900" y2="160"/>
    <line x1="0" y1="240" x2="900" y2="240"/><line x1="0" y1="320" x2="900" y2="320"/>
  </g>
  <!-- bench -->
  <rect x="60" y="250" width="300" height="18" fill="#6b5133"/>
  <rect x="90" y="268" width="24" height="120" fill="#57412a"/>
  <rect x="300" y="268" width="24" height="120" fill="#57412a"/>
  <!-- lanterns on bench -->
  <rect x="120" y="180" width="30" height="70" rx="4" fill="#9c5a24"/>
  <rect x="146" y="180" width="30" height="70" rx="4" fill="#9c5a24"/>
  <rect x="172" y="200" width="30" height="50" rx="4" fill="#7d4a1c"/>
  <!-- coils of rope -->
  <circle cx="560" cy="330" r="42" fill="none" stroke="#c8b06a" stroke-width="14"/>
  <circle cx="560" cy="330" r="16" fill="#5d6f4d"/>
  <circle cx="680" cy="340" r="34" fill="none" stroke="#bfa55e" stroke-width="12"/>
  <!-- hanging net -->
  <path d="M760 60 L830 250 L690 250 Z" fill="none" stroke="#8a7a50" stroke-width="3" stroke-dasharray="8 6"/>
  <!-- open hatch to cellar (dark hole) -->
  <rect x="380" y="320" width="150" height="80" rx="6" fill="#0c0f14"/>
  <rect x="372" y="312" width="166" height="18" fill="#4a3a25"/>
`
);

export const roomCellar = svg(
  900,
  400,
  `
  <rect width="900" height="400" fill="#241d14"/>
  <!-- stone wall -->
  <g fill="#3a3025" stroke="#1d1810" stroke-width="2">
    <rect x="0" y="0" width="120" height="90"/><rect x="120" y="0" width="110" height="90"/>
    <rect x="0" y="90" width="100" height="90"/><rect x="100" y="90" width="130" height="90"/>
    <rect x="0" y="180" width="120" height="90"/><rect x="120" y="180" width="110" height="90"/>
  </g>
  <!-- floor -->
  <rect x="0" y="300" width="900" height="100" fill="#4b3c2a"/>
  <!-- shelves -->
  <rect x="200" y="120" width="260" height="16" fill="#6b4c2b"/>
  <rect x="200" y="210" width="260" height="16" fill="#6b4c2b"/>
  <rect x="200" y="300" width="260" height="16" fill="#6b4c2b"/>
  <!-- jars on shelves -->
  <g fill="#9fb48a" opacity=".8">
    <rect x="220" y="80" width="20" height="40" rx="6"/><rect x="252" y="92" width="18" height="28" rx="5"/>
    <rect x="286" y="76" width="22" height="44" rx="6"/>
    <rect x="220" y="180" width="18" height="30" rx="5"/><rect x="250" y="172" width="22" height="38" rx="6"/>
    <rect x="288" y="182" width="18" height="28" rx="5"/>
  </g>
  <!-- rope coils on low shelf -->
  <circle cx="360" cy="292" r="12" fill="none" stroke="#c8b06a" stroke-width="5"/>
  <circle cx="392" cy="292" r="12" fill="none" stroke="#bfa55e" stroke-width="5"/>
  <!-- strongbox -->
  <rect x="600" y="250" width="150" height="110" rx="6" fill="#6a6f76"/>
  <rect x="600" y="250" width="150" height="110" rx="6" fill="none" stroke="#3f444c" stroke-width="4"/>
  <rect x="652" y="298" width="46" height="34" rx="4" fill="#7d848d"/>
  <circle cx="675" cy="315" r="6" fill="#2b2f35"/>
  <!-- ladder -->
  <g stroke="#8a6a3c" stroke-width="10">
    <line x1="60" y1="70" x2="40" y2="390"/><line x1="100" y1="70" x2="120" y2="390"/>
  </g>
  <g stroke="#8a6a3c" stroke-width="6"><line x1="58" y1="120" x2="102" y2="120"/><line x1="52" y1="190" x2="104" y2="190"/><line x1="46" y1="260" x2="107" y2="260"/><line x1="42" y1="330" x2="110" y2="330"/></g>
`
);

export const roomTowerDoor = svg(
  900,
  400,
  `
  <defs>
    <linearGradient id="w2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4238"/>
      <stop offset="1" stop-color="#2e2a24"/>
    </linearGradient>
    <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8b9096"/>
      <stop offset="1" stop-color="#565c63"/>
    </linearGradient>
  </defs>
  <rect width="900" height="400" fill="url(#w2)"/>
  <!-- heavy stone arch -->
  <path d="M180 400 L180 150 C180 60 300 40 450 40 C600 40 720 60 720 150 L720 400 Z" fill="#24201a"/>
  <path d="M205 400 L205 160 C205 85 300 70 450 70 C600 70 695 85 695 160 L695 400 Z" fill="#33302b"/>
  <!-- iron door -->
  <rect x="300" y="90" width="300" height="400" rx="6" fill="url(#d)"/>
  <!-- rivets -->
  <g fill="#3c424a"><circle cx="318" cy="108" r="7"/><circle cx="582" cy="108" r="7"/>
    <circle cx="318" cy="200" r="7"/><circle cx="582" cy="200" r="7"/></g>
  <!-- rust streaks -->
  <g fill="#7a4a2f" opacity=".7">
    <rect x="330" y="150" width="10" height="120"/><rect x="410" y="180" width="8" height="160"/>
    <rect x="530" y="140" width="9" height="110"/>
  </g>
  <!-- bands -->
  <rect x="300" y="300" width="300" height="24" fill="#2f343b"/><rect x="300" y="360" width="300" height="24" fill="#2f343b"/>
  <!-- lock plate -->
  <rect x="415" y="250" width="70" height="90" rx="8" fill="#262b31"/>
  <circle cx="450" cy="295" r="14" fill="#c9a13b"/>
  <rect x="444" y="295" width="12" height="34" rx="3" fill="#8a7428"/>
  <!-- ground -->
  <rect x="0" y="380" width="900" height="20" fill="#3a3430"/>
  <ellipse cx="200" cy="330" rx="60" ry="14" ${LEAF}/>
  <ellipse cx="680" cy="340" rx="60" ry="14" ${LEAF}/>
`
);

export const roomSpiralStairs = svg(
  900,
  400,
  `
  <defs>
    <linearGradient id="stair" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8a7a5f"/>
      <stop offset="1" stop-color="#5a4d3a"/>
    </linearGradient>
  </defs>
  <rect width="900" height="400" fill="#2c2720"/>
  <!-- curving wall (rough spiral) -->
  <path d="M450 400 C200 400 150 260 250 160 C320 90 520 120 600 200 C660 260 640 330 560 360" stroke="#4a402f" stroke-width="40" fill="none"/>
  <!-- stone steps rising -->
  <g fill="url(#stair)" stroke="#332a1e" stroke-width="2">
    <path d="M470 380 h120 l-16 20 h-120 Z"/>
    <path d="M520 330 h110 l-16 20 h-110 Z"/>
    <path d="M560 280 h100 l-16 20 h-100 Z"/>
    <path d="M590 230 h90 l-14 20 h-90 Z"/>
    <path d="M600 180 h80 l-12 20 h-80 Z"/>
    <path d="M600 130 h70 l-10 20 h-70 Z"/>
  </g>
  <!-- arched windows on the tower wall, looking out to the fog -->
  <g stroke="#3a4556" stroke-width="4" fill="#1d2c42">
    <path d="M700 250 L700 110 A50 50 0 0 1 800 110 L800 250 Z"/>
    <path d="M646 190 L646 126 A32 32 0 0 1 710 126 L710 190 Z"/>
  </g>
  <g stroke="#2b3a52" stroke-width="2">
    <line x1="750" y1="112" x2="750" y2="248"/>
    <line x1="702" y1="188" x2="798" y2="188"/>
    <line x1="678" y1="128" x2="678" y2="188"/>
    <line x1="648" y1="156" x2="708" y2="156"/>
  </g>
  <!-- handrail -->
  <path d="M470 385 C520 380 560 340 600 300 C640 260 620 220 660 185" stroke="#9c7d45" stroke-width="8" fill="none"/>
  <!-- hanging lantern -->
  <line x1="300" y1="0" x2="300" y2="70" stroke="#7a6435" stroke-width="4"/>
  <rect x="278" y="70" width="44" height="60" rx="8" fill="#c88b3a"/>
  <ellipse cx="300" cy="100" rx="12" ry="18" fill="#f5d983"/>
`
);

export const roomBeaconRoom = svg(
  900,
  400,
  `
  <defs>
    <radialGradient id="sky2" cx="0.5" cy="0.15" r="1">
      <stop offset="0" stop-color="#1b2436"/>
      <stop offset="1" stop-color="#0c0f16"/>
    </radialGradient>
  </defs>
  <rect width="900" height="400" fill="url(#sky2)"/>
  <!-- cracked windows looking out -->
  <g fill="#18283c" stroke="#3a4556" stroke-width="4">
    <rect x="80" y="60" width="200" height="220"/>
    <rect x="620" y="60" width="200" height="220"/>
  </g>
  <g stroke="#202c3d" stroke-width="3">
    <line x1="180" y1="60" x2="180" y2="280"/><line x1="80" y1="170" x2="280" y2="170"/>
    <line x1="720" y1="60" x2="720" y2="280"/><line x1="620" y1="170" x2="820" y2="170"/>
  </g>
  <!-- stars -->
  <g fill="#dfe6f2"><circle cx="120" cy="120" r="2"/><circle cx="150" cy="90" r="1.5"/><circle cx="740" cy="120" r="2"/></g>
  <!-- the great lens -->
  <g transform="translate(450,150)">
    <path d="M-120 70 L-60 -60 Q0 -120 60 -60 L120 70 Z" fill="#3b4a63"/>
    <path d="M-60 -60 Q0 -120 60 -60 L80 -30 Q0 -80 -80 -30 Z" fill="#587395"/>
    <ellipse cx="0" cy="-20" rx="30" ry="45" fill="#7f9bb8"/>
    <ellipse cx="0" cy="-20" rx="22" ry="34" fill="#dce7f2"/>
    <circle cx="12" cy="-28" r="4" fill="#fff" opacity=".8"/>
  </g>
  <!-- floor -->
  <rect x="0" y="320" width="900" height="80" fill="#3a332b"/>
  <!-- fuel can on floor -->
  <rect x="700" y="260" width="60" height="70" rx="8" fill="#b03a2e"/>
  <rect x="712" y="248" width="36" height="20" fill="#5a8a4a"/>
  <!-- mantel -->
  <ellipse cx="450" cy="305" rx="90" ry="14" fill="#4a453c"/>
`
);

/* ------------------------------ item artwork ----------------------------- */

export const itemBrassKey = svg(
  160,
  180,
  `
  <g transform="rotate(-45 80 92)">
    <circle cx="60" cy="36" r="24" fill="none" stroke="#c9a13b" stroke-width="13"/>
    <line x1="60" y1="60" x2="60" y2="150" stroke="#c9a13b" stroke-width="13"/>
    <!-- teeth (bits) sticking out perpendicular to the shaft -->
    <rect x="60" y="116" width="36" height="12" rx="2" fill="#a8862f" stroke="#8a7428" stroke-width="2"/>
    <rect x="60" y="136" width="30" height="12" rx="2" fill="#a8862f" stroke="#8a7428" stroke-width="2"/>
  </g>
`
);

export const itemLighter = svg(
  160,
  180,
  `
  <rect x="55" y="30" width="52" height="110" rx="10" fill="#b07a34"/>
  <rect x="50" y="20" width="62" height="26" rx="8" fill="#d9912f"/>
  <rect x="66" y="26" width="30" height="8" rx="4" fill="#e8b14f"/>
  <rect x="66" y="140" width="30" height="18" rx="4" fill="#8a5a20"/>
  <line x1="70" y1="60" x2="92" y2="60" stroke="#8a5a20" stroke-width="2"/>
`
);

export const itemStrongboxKey = svg(
  160,
  180,
  `
  <g transform="rotate(-45 72 88)">
    <circle cx="52" cy="34" r="20" fill="none" stroke="#d9b45c" stroke-width="11"/>
    <line x1="52" y1="54" x2="52" y2="142" stroke="#d9b45c" stroke-width="11"/>
    <rect x="52" y="114" width="30" height="11" rx="2" fill="#b08c3a" stroke="#8a7428" stroke-width="2"/>
    <rect x="52" y="132" width="24" height="11" rx="2" fill="#b08c3a" stroke="#8a7428" stroke-width="2"/>
  </g>
`
);

export const itemBeaconManual = svg(
  160,
  180,
  `
  <rect x="38" y="24" width="96" height="132" rx="6" fill="#7a4a2f"/>
  <rect x="46" y="34" width="80" height="112" rx="4" fill="#efe6d2"/>
  <g stroke="#9a8f78" stroke-width="3">
    <line x1="58" y1="56" x2="104" y2="56"/><line x1="58" y1="74" x2="100" y2="74"/>
    <line x1="58" y1="92" x2="104" y2="92"/><line x1="58" y1="110" x2="92" y2="110"/><line x1="58" y1="128" x2="102" y2="128"/>
  </g>
  <path d="M38 24 L134 24 L134 52 L38 52 Z" fill="#6b3f27"/>
`
);

export const itemFuelCan = svg(
  160,
  180,
  `
  <rect x="40" y="40" width="84" height="100" rx="10" fill="#b03a2e"/>
  <rect x="40" y="40" width="84" height="100" rx="10" fill="none" stroke="#7a2018" stroke-width="4"/>
  <rect x="58" y="22" width="48" height="28" rx="6" fill="#5a8a4a"/>
  <rect x="70" y="26" width="24" height="20" rx="4" fill="#d9d9de"/>
  <rect x="52" y="70" width="60" height="10" fill="#7a2018"/>
  <rect x="52" y="92" width="60" height="10" fill="#7a2018"/>
`
);

/* ------------------------- interactive prop sprites ------------------------ */

export const propSeagull = svg(
  120,
  90,
  `
  <g transform="translate(20 30)">
    <ellipse cx="40" cy="10" rx="26" ry="9" fill="#eef1f4"/>
    <ellipse cx="18" cy="8" rx="12" ry="6" fill="#dfe5ea"/>
    <circle cx="58" cy="8" r="2.5" fill="#1c1c1e"/>
    <path d="M30 22 C34 34 48 36 58 26 L58 22 Z" fill="#dfe5ea"/>
  </g>
  `
);

export const propRat = svg(
  110,
  90,
  `
  <ellipse cx="55" cy="58" rx="20" ry="11" fill="#7d6a55"/>
  <circle cx="48" cy="40" r="11" fill="#8a7760"/>
  <circle cx="45" cy="37" r="1.6" fill="#1c1c1e"/>
  <ellipse cx="38" cy="30" rx="6" ry="3" fill="#c9706b" transform="rotate(-20 38 30)"/>
  <path d="M70 48 Q92 40 96 30" stroke="#7d6a55" stroke-width="4" fill="none" stroke-linecap="round"/>
  `
);

export const propMoustache = svg(
  160,
  120,
  `
  <g transform="rotate(-8 80 60)">
    <circle cx="60" cy="60" r="26" fill="none" stroke="#e8dcc0" stroke-width="3"/>
    <circle cx="60" cy="60" r="19" fill="#1c1c1e"/>
    <path d="M46 58 Q60 70 74 58 Q60 68 46 58 Z" fill="#c9a13b"/>
  </g>
  `
);

export const propBarrel = svg(
  130,
  130,
  `
  <path d="M30 20 h70 l10 48 l-10 48 h-70 l-10 -48 Z" fill="#8a5a2b" stroke="#5c3a1b" stroke-width="3"/>
  <line x1="38" y1="20" x2="38" y2="116" stroke="#5c3a1b" stroke-width="3"/>
  <line x1="92" y1="20" x2="92" y2="116" stroke="#5c3a1b" stroke-width="3"/>
  <line x1="26" y1="68" x2="104" y2="68" stroke="#5c3a1b" stroke-width="3"/>
  `
);

export const propCrate = svg(
  130,
  110,
  `
  <rect x="20" y="18" width="90" height="74" fill="#9a6b3a" stroke="#6b4521" stroke-width="3"/>
  <line x1="20" y1="40" x2="110" y2="40" stroke="#6b4521" stroke-width="3"/>
  <line x1="20" y1="68" x2="110" y2="68" stroke="#6b4521" stroke-width="3"/>
  <line x1="65" y1="18" x2="45" y2="92" stroke="#6b4521" stroke-width="3"/>
  <line x1="65" y1="18" x2="85" y2="92" stroke="#6b4521" stroke-width="3"/>
  `
);

export const propFog = svg(
  160,
  110,
  `
  <g opacity=".85">
    <ellipse cx="60" cy="66" rx="70" ry="22" fill="#cfd8e0"/>
    <ellipse cx="110" cy="48" rx="56" ry="18" fill="#dbe2ea"/>
    <ellipse cx="40" cy="42" rx="40" ry="14" fill="#e6ecf2"/>
  </g>
  `
);

export const propHandrail = svg(
  160,
  90,
  `
  <path d="M10 30 Q120 10 160 40" stroke="#9c7d45" stroke-width="9" fill="none" stroke-linecap="round"/>
  <line x1="98" y1="42" x2="110" y2="78" stroke="#9c7d45" stroke-width="6"/>
  <line x1="140" y1="38" x2="150" y2="74" stroke="#9c7d45" stroke-width="6"/>
  `
);

/** Bundle of all artwork keyed by game id for easy wiring. */
export const art = {
  rooms: {
    cliff_path: roomCliffPath,
    boatshed: roomBoatShed,
    cellar: roomCellar,
    tower_door: roomTowerDoor,
    spiral_stairs: roomSpiralStairs,
    beacon_room: roomBeaconRoom,
  },
  items: {
    brass_key: itemBrassKey,
    lighter: itemLighter,
    strongbox_key: itemStrongboxKey,
    beacon_manual: itemBeaconManual,
    fuel_can: itemFuelCan,
  },
  props: {
    seagull: propSeagull,
    rat: propRat,
    moustache: propMoustache,
    barrel: propBarrel,
    crate: propCrate,
    fog: propFog,
    handrail: propHandrail,
  },
};