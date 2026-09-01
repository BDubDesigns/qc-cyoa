# Flagship: Pacific Northwest Bigfoot Adventure

> **Status — canonical current flagship design.** This document is the current source of truth for the qc-cyoa flagship adventure designed under Issue #1. Issue #1 remains the design epic and decision history. Older issue comments, chats, and planning notes are useful provenance, but when they conflict with this document, this document wins unless the product owner deliberately changes the design.
>
> Product/engine scope remains governed by `docs/product/engine-boundaries.md`. Implementation sequence remains governed by `docs/roadmap.md`.
>
> **Editing rule:** only promote a brainstorm into the locked sections below after it has been deliberately accepted. Unresolved questions belong in **Open design questions** rather than being silently filled in.

---

## 1. Product target

The flagship is a short, child-friendly Pacific Northwest point-and-click adventure inspired by the gentle exploration, humor, spoken dialogue, and environmental puzzles of games such as Freddi Fish, Pajama Sam, and Putt-Putt.

Target shape:

- roughly 15–25 minutes on a first playthrough, with playtesting allowed to justify a little more if the eight-room version remains well paced;
- eight reusable illustrated rooms, with the Kitchen deliberately earning the one-room expansion beyond the original approximate 5–7-room target;
- one clear mystery/helping goal;
- approximately three meaningful puzzle chains plus a tiny opening tutorial puzzle;
- a small memorable cast;
- spoken dialogue and character audio;
- funny optional interactions that reward curiosity;
- no combat, harsh fail states, obscure adventure-game logic, or punishment for experimenting;
- comfortable landscape play on phones and desktops;
- all essential interactions work by tap.

The protagonist is represented through viewpoint, voice, portraits/authored illustrations, and scene state. There is **no free-roaming player avatar or pathfinding requirement**.

The emotional progression is:

**ordinary night → strange sighting → morning evidence/mystery → exploration → discovery → friendship/helping rather than hunting/capturing.**

---

## 2. Core premise and payoff

During a stormy Pacific Northwest night, a child wakes up thirsty. While walking to the bathroom, lightning briefly reveals a huge Sasquatch silhouette outside the hallway window.

The following morning, physical evidence proves the sighting was real. The child follows tracks and other clues into the woods, repairs a storm-damaged footbridge, and eventually reaches a hidden cedar grove where the frightening creature turns out to be shy, awkward, and friendly.

Sasquatch is searching for something he communicates as a **big “stuffed pepper” that he needs to sleep**. The child believes he means a bell pepper stuffed with food. Sasquatch actually means a giant bell-pepper-shaped plush toy stuffed with fuzz that he cuddles to sleep. Both characters enthusiastically agree on the exact same phrase while meaning completely different things.

The misunderstanding must be allowed to fully pay off. The child does not merely bring Sasquatch a plain pepper. They recover a real bell pepper from the backyard, go into the Kitchen, stuff it with cream cheese, proudly create a literal **Stuffed Pepper (Food)**, and bring that finished creation back to Sasquatch. Only then does Sasquatch's confused hug/sleep pantomime finally make the double meaning click: **stuffed like a stuffed animal — except the stuffed object is a pepper.**

The family dog, Buddy, had already found the plush near the woods and carried it home **before the Act 1 window sighting**. Sasquatch followed the Pepper/Buddy trail to the house and was searching the windows for his comfort object. The frightening silhouette is therefore recontextualized later as funny and sympathetic rather than threatening.

The final puzzle is a quiet, gentle swap. Buddy is asleep near the parents’ room holding the giant plush Pepper. The player trades him a stinky sock so he releases the Pepper without barking and waking the household. The child reunites Sasquatch with the plush, ending on friendship, followed by a small final smell joke that pays off Buddy taking the sock.

---

## 3. Five-act story spine

### Act 1 — Something Outside

**Goal:** teach the basic interaction language with almost no friction, then introduce the mystery.

1. The game opens in the Bedroom at night during a storm. The child wakes thirsty.
2. A short voiced line establishes the immediate goal: get water.
3. Tapping the floor/bedside area gets the child out of bed. The bed presentation changes from child-present to empty.
4. Tapping the Bedroom door moves to the Hallway.
5. Shortly after first entering the Hallway, a one-shot authored lightning sequence fires:
   - dark hallway;
   - brief wait;
   - lightning flash;
   - huge Sasquatch silhouette visible outside the window;
   - brief beat;
   - lightning and silhouette disappear;
   - child reacts with a minimal voiced line such as `...what was THAT?`.
6. The Bathroom remains immediately accessible; there is no extra opening gate.
7. In the Bathroom, the player collects a Cup.
8. Select Cup and tap Sink/Faucet: **Cup → Cup of Water**.
9. Cup of Water exposes a simple authored inventory action, **Drink**. Activating Drink consumes it and resolves thirst. Do not invent an invisible generic “self” target for this interaction.
10. The child says a small line such as `Better.`
11. Return through the Hallway to the Bedroom and go back to bed.
12. Fade/transition to morning.

**Act 1 teaches:** tap interactions, room exits, transitions, collectible inventory, inventory selection, item-on-environment use, item replacement/transformation, a simple explicit inventory-item action, spoken reactions, persistent state, and a short timed sequence.

### Act 2 — Follow the Evidence

**Goal:** answer only two questions: **Was that really Sasquatch, and where did he go?** Do not reveal the plush yet.

1. Morning presentation replaces the stormy-night state.
2. The child moves through the house and reaches the Backyard.
3. A huge muddy footprint beneath/near the relevant window proves the sighting was real.
4. Smaller muddy Buddy pawprints lead toward the house while Sasquatch tracks lead toward the woods. The child merely notes that Buddy was outside too.
5. Coarse brown hair caught high on brush/fence provides another clear clue.
6. The player follows the trail into the Forest Trail room.
7. Tracking evidence includes bent fern, a branch broken unusually high, another giant footprint, and crushed/disturbed salal berries or similar PNW vegetation.
8. Evidence is discoverable in flexible order rather than as a rigid hidden-object sequence. **Default implementation is 3 of 4 meaningful Forest Trail clues.** The evidence-group abstraction and one-way seen state are locked; the exact numeric threshold may be tuned after child playtesting without redesigning the runtime.
9. A loose storm-fallen Board can be collected on the Forest Trail before the player knows why it matters.
10. At the Creek / Footbridge, storm damage has left a bridge gap the child will not cross safely.
11. Use Board on bridge gap. Board leaves inventory and becomes part of the repaired bridge.
12. The bridge remains repaired permanently.
13. Fresh tracks, rustling, a low grunt, and/or a huge partial shape on the far side raise tension.
14. The player enters the Hidden Cedar Grove.

**Locked flow:** Backyard footprint + Buddy pawprint foreshadowing → hair/evidence → Forest Trail evidence → collect Board → repair/cross Footbridge → fresh tracks/sound → Hidden Cedar Grove.

### Act 3 — Meet and Name Sasquatch

**Goal:** collapse fear into comedy, establish friendship, and launch the Stuffed Pepper quest.

1. The child enters the Hidden Cedar Grove. Sasquatch steps partly into view for a brief intimidating beat.
2. Kid says something simple such as `...Hi?`
3. Sasquatch attempts to hide behind a cedar tree far too skinny to conceal him.
4. The kid points out that they can still see him; Sasquatch may suck in, shift sideways, or try again and fail.
5. This deliberately pays off the optional Forest Trail skinny-tree joke.
6. Do **not** add a fetch/trust puzzle. Reaching him through Act 2 is enough. The child reassures him; Sasquatch cautiously emerges.
7. Sasquatch communicates primarily through expressive vocal sounds, gestures, pose/state changes, and the child interpreting him rather than fluent English.
8. The child asks his name. His answer is an unintelligible grunt/warble, so the player chooses a fixed name:
   - Sassy
   - Sassafras
   - Bigfoot
   - Sasquatch
   - Squatch
9. Store the selected value as persistent story data. Avoid repeating it constantly in spoken dialogue so only a small number of lines need five audio variants.
10. The child asks what Sasquatch is searching for.
11. Sasquatch communicates `stuffed pepper`, strongly indicates **BIG**, then pantomimes hugging/sleeping.
12. The child interprets this as Sasquatch being unable to sleep because he is hungry and needing a **Stuffed Pepper** meal.
13. Sasquatch enthusiastically confirms because he means a giant plush pepper stuffed with fuzz.
14. Objective becomes: **Help [chosen name] find a Stuffed Pepper.**
15. The child remembers the pepper garden at home.

This is the midpoint pivot: **mystery adventure becomes buddy adventure.**

### Act 4 — The Great Stuffed Pepper Hunt

**Goal:** confidently solve the wrong problem all the way through, discover the double meaning, then track the real plush back toward Buddy.

#### Part A — make a literal Stuffed Pepper

1. The child and Sasquatch retrace the already-solved Creek and Forest Trail route toward home. Sasquatch accompanies the child through the outdoor rooms as a co-star; he does not become a hidden off-screen quest giver.
2. Previously solved world state remains solved. The bridge stays repaired; any shed/key/shovel progress found early remains valid.
3. In the Backyard, the normal puzzle path is:
   - inspect the slightly unusual fake landscaping rock;
   - reveal Shed Key;
   - unlock Shed; the key leaves inventory and the shed remains permanently unlocked;
   - collect Shovel;
   - use Shovel on the storm-softened garden/mud target where the usable pepper is partly buried/inaccessible;
   - obtain a real Bell Pepper; the child leaves/returns the Shovel by the garden or shed rather than carrying a now-useless tool through the rest of the game.
4. If the player already discovered the key, unlocked the shed, or collected the shovel in Act 2, skip those completed steps naturally.
5. Sasquatch stays hidden outside while the child goes through the Kitchen back door; a giant Sasquatch casually entering the family Kitchen would break both the story and the quiet household stakes.
6. In the Kitchen, the child opens the refrigerator and obtains **Cream Cheese**.
7. Use Bell Pepper on the Kitchen Prep Area while Cream Cheese is owned. The authored sequence removes Bell Pepper + Cream Cheese and gives **Stuffed Pepper (Food)**. This is a small condition/action recipe, not a generalized crafting system.
8. The child proudly returns to Sasquatch with a genuinely prepared stuffed pepper.
9. Present/use Stuffed Pepper (Food) on Sasquatch.
10. Sasquatch is deeply confused. He sniffs/looks at it, then emphatically pantomimes cradling a much larger object, hugging it to his chest, and sleeping.
11. The child finally understands the language joke: **`Ohhh! Stuffed like a stuffed animal!`** The thing he wants is a stuffed pepper filled with fuzz, not a pepper stuffed with food.
12. Objective changes to: **Find [chosen name]’s Stuffed Pepper.**

The semantic reveal happens here. Do **not** use the later fuzz/fabric clues to teach the meaning of “stuffed.” The player earns the joke by fully solving the food interpretation first.

#### Part B — track the actual plush

1. Sasquatch indicates where he remembers losing the plush, and the child and Sasquatch retrace the outdoor route together.
2. Act 4 tracking clues become discoverable in reused rooms; they were physically present but intentionally not interactive/relevant during Act 2:
   - Forest Trail: tuft of white fuzz/stuffing caught in vegetation;
   - Creek / Footbridge: small red/green fabric scrap snagged on the bridge/branch where Buddy dragged the plush.
3. These clues now confirm and track the **already-understood plush object** rather than causing the semantic realization.
4. Sasquatch recognizes the clues and reacts excitedly/urgently.
5. The trail direction and the old Buddy pawprints finally connect: Buddy found the plush outdoors and dragged it home.
6. The child realizes Sasquatch followed Buddy/the Pepper trail back to the house.
7. The frightening Act 1 window sighting is explicitly recontextualized as sympathetic and funny.
8. No detective inventory or separate clue UI is required; persistent discovery/state and contextual dialogue are enough.

### Act 5 — Quiet Pepper Rescue

**Goal:** recover the plush without waking the parents and pay off the friendship.

1. Sasquatch waits outside/near the Backyard while the child goes inside alone.
2. The child returns through the Kitchen/Hallway route; the Hallway is now in a quiet dim state.
3. Buddy is asleep near the parents’ bedroom door with the giant Stuffed Pepper (Plush) between his paws / partly in his mouth.
4. Directly taking it gently fails: Buddy tightens his grip, stirs, opens an eye, or makes a sleepy noise.
5. The child refuses to continue because barking would wake the parents. There is no fail state or stealth subsystem.
6. Return to the Bedroom. The previously established dirty-laundry/stinky-sock joke now becomes useful. The Stinky Sock has been visible/jokeable earlier in the game but was deliberately **not collectible** before this objective.
7. Collect **Stinky Sock** now that the finale makes it relevant.
8. Return to Hallway and use Stinky Sock on Buddy.
9. Short authored sequence:
   - Buddy’s nose twitches;
   - one eye opens;
   - he releases the Stuffed Pepper (Plush);
   - takes the sock;
   - curls back up and resumes sleeping/snoring.
10. Stuffed Pepper (Plush) becomes collectible.
11. Return through the Kitchen to Backyard and give the plush to Sasquatch.
12. Sasquatch switches to a dedicated hugging-Pepper pose/state, relaxes, and makes a relieved/contented vocalization.
13. A simple tween may move Sasquatch toward the Pepper; no walk-cycle system is required.
14. Final exchange is warm and brief: the child invites him to visit again, but perhaps not by silently appearing outside the bedroom window at midnight.
15. Sasquatch seriously agrees/waves goodbye and heads back toward the forest.
16. **Keep the final smell tag:** Buddy sleeps happily with the disgusting sock while a parent faintly asks why the hallway smells. The child blames Buddy. Exact wording remains production polish. End.

---

## 4. Eight-room graph

The game deliberately reuses familiar rooms across acts rather than expanding into a large world. The Kitchen is the one deliberate expansion beyond the original approximate 5–7-room target because it carries the literal stuffed-pepper payoff, provides a playful domestic interaction scene, and creates a natural Hallway ↔ Backyard connection.

1. **Bedroom**
2. **Hallway**
3. **Bathroom**
4. **Kitchen**
5. **Backyard**
6. **Forest Trail**
7. **Creek / Footbridge**
8. **Hidden Cedar Grove**

Physical routing:

- Bedroom ↔ Hallway
- Bathroom ↔ Hallway
- Kitchen ↔ Hallway
- Kitchen ↔ Backyard via back door
- Backyard ↔ Forest Trail
- Forest Trail ↔ Creek / Footbridge
- Creek / Footbridge ↔ Hidden Cedar Grove

Parents’ bedroom is represented by a Hallway door/hotspot, not a separate room.

Conceptual journey:

- **Act 1:** Bedroom → Hallway → Bathroom → Hallway → Bedroom
- **Act 2:** Bedroom / Hallway → Kitchen → Backyard → Forest Trail → Creek → Hidden Cedar Grove
- **Act 3:** Hidden Cedar Grove
- **Act 4:** Grove → Creek / Trail → Backyard → Kitchen → Backyard → Trail / Creek as tracking clues require
- **Act 5:** Backyard → Kitchen → Hallway → Bedroom → Hallway → Kitchen → Backyard / ending presentation

---

## 5. Room design

### Bedroom

**Story roles:** Act 1 opening/return-to-bed, morning transition point, Act 5 Stinky Sock payoff.

**Locked required/stateful elements:**

- bed with at least child-present / empty presentation;
- exit to Hallway;
- dirty laundry / sock-related hotspot established before the finale so the solution is earned rather than appearing conveniently;
- Stinky Sock is visible/jokeable before Act 5 but cannot enter inventory until the Buddy-rescue objective makes it relevant;
- child dialogue/portrait presentation as needed.

**States:** stormy night before water, stormy night after water/return to bed, morning/day, Act 5 finale interaction state.

**Known interaction beats:** tap bedside/floor to get up; return to bed after resolving thirst; earlier laundry/sock joke foreshadows Buddy’s sock habit; finale state enables collecting Stinky Sock.

Exact permanent decorative details and final line wording can be chosen during art/script production; the design-level interactive roles are locked here and in Section 9.

### Hallway

One physical room reused for stormy night, ordinary morning/day, and Act 5 finale.

Permanent background can contain walls, trim, floor, family photos, console table, door frames, window frame, and cozy PNW-home details.

Keep story/state layers separate where practical:

- Bedroom door;
- Bathroom door;
- Kitchen connection/doorway;
- parents’ bedroom door;
- window treatment/state;
- lightning overlay;
- Sasquatch silhouette;
- Buddy;
- giant Stuffed Pepper (Plush);
- night/darkness presentation overlay.

**Act 1:** run the brief one-shot lightning/Sasquatch reveal. Window, family photo, and parents’ door provide optional reactions. Bathroom path is never puzzle-gated.

**Morning:** ordinary daylight presentation. Formerly ominous window looks harmless; a click can reinforce uncertainty before the Backyard footprint proves the sighting.

**Act 5:** Buddy sleeps with Pepper beside the already-established parents’ door. Direct grabs make Buddy stir. Stinky Sock swaps his held object and exposes Pepper for collection.

**Capabilities exercised:** one-shot room-entry sequence; timed show/hide; layered state; persistent flags; conditional interactions; room revisit with changed meaning; item-on-character use; inventory exchange; tension without fail states.

### Bathroom

A deliberately tiny tutorial room.

Permanent background may include walls/floor, sink cabinet, mirror, toilet, tub/shower, towels, and normal clutter.

Separate interactive assets/targets:

- Cup;
- Sink/Faucet target;
- Door/exit;
- Cup of Water item/presentation as needed.

Required sequence is exactly **Cup → Sink → Cup of Water → Drink inventory action**.

Prefer the author-facing primitive **replace item A with item B** rather than arbitrary internal item-state mutation.

Cup of Water has a deliberate `Drink` inventory action. This resolves the no-avatar problem without adding a generic invisible self target.

Only two meaningful story states are required: before thirst resolved and after thirst resolved.

### Kitchen

The Kitchen is a deliberately earned eighth room, not decorative scope growth. It carries the literal Stuffed Pepper food puzzle, creates a natural house-to-Backyard route, and gives the flagship a rich optional-click scene.

Permanent background may include cabinets, counters, sink, refrigerator, stove/oven, toaster, fruit bowl, magnets/artwork, and the back door to the Backyard.

Keep mechanically important elements separate or hotspot-addressable:

- refrigerator/open interaction;
- Cream Cheese;
- Prep Area/cutting board target;
- Stuffed Pepper (Food) result presentation if shown in-room;
- Hallway exit;
- Backyard/back-door exit.

**Act 2:** mostly ordinary traversal toward Backyard. The room may already be explorable; do not prematurely advertise the cream-cheese solution.

**Act 4:** Bell Pepper is brought inside while Sasquatch waits hidden outside. Refrigerator yields Cream Cheese. Use Bell Pepper on Prep Area while Cream Cheese is owned → remove Bell Pepper + Cream Cheese → give Stuffed Pepper (Food). This is an authored condition/action recipe, not a general crafting subsystem.

**Act 5:** functions as the natural quiet route between Backyard and Hallway while Sasquatch remains outside.

The final optional-click set is in Section 9; do not expand the Kitchen into a second puzzle system just because it has many plausible objects.

### Backyard

A reusable multi-act room.

Permanent raster background can include back of house/Kitchen back door, relevant window, lawn/mud, fence, woods edge, garden beds, shed structure, landscaping rocks, and PNW vegetation.

Separate stateful layers where practical:

- giant Sasquatch footprint;
- Sasquatch track trail;
- Buddy pawprints;
- coarse hair on brush/fence;
- shed door state;
- fake hide-a-key rock;
- key;
- pepper plant/diggable storm-mud patch;
- Bell Pepper;
- Shovel/shed contents;
- Sasquatch placement/state during Act 4 and ending.

**Act 2:** giant footprint proves the sighting, two track directions foreshadow Buddy, coarse hair supports the forest direction. Forest progression uses the evidence-group rule without becoming a pixel hunt.

**Act 2 foreshadowing / world rule:** shed, pepper garden, rocks, and fake rock already exist. **Allow early puzzle solving where logically valid.** If the player finds the key/unlocks the shed/gets the shovel early, later acts respect it.

**Key lifecycle:** using Shed Key permanently unlocks/opens the shed and removes the key from inventory. The world state is the durable result; do not leave a useless key occupying inventory.

**Act 4 food puzzle:** fake rock → key → shed → shovel → storm-softened garden/mud patch → Bell Pepper, skipping any already-solved steps. The shovel is required because the usable pepper is partly buried/inaccessible in storm-softened mud, not because vegetables arbitrarily require shovels. After the pepper is freed, the Shovel leaves inventory and is shown leaned/returned by the garden or shed.

**Act 4 handoff:** Sasquatch waits/hides outside while the child uses the Kitchen. The completed Stuffed Pepper (Food) is brought back here; Sasquatch’s hug/sleep pantomime causes the semantic reveal.

Do not create a detective-points/evidence-inventory subsystem.

### Forest Trail

Use one trail room, not a maze or hidden-object scene.

Permanent background: cedar trunks, ferns, salal, moss, trail, filtered light, storm debris.

Separate clue/state assets include:

- bent fern;
- high broken branch;
- giant muddy footprint;
- crushed salal berries;
- loose/storm-fallen Board;
- optional flavor plants/rocks;
- Backyard and Creek exits;
- Act 4 fuzz/stuffing clue;
- Sasquatch placement/state for the Act 4 retrace.

Narrative clue order may naturally read bent fern → branch → print → berries, but inspection order must be flexible. **Default threshold is 3 of 4** meaningful clues before the child concludes Sasquatch went toward the Creek. Playtesting may tune the number while preserving the same generic evidence-group data model.

Board is collectable before its purpose is known. Missing it should produce gentle bridge/backtracking hints, not punishment.

Act 4 reuses this room with white fuzz/stuffing **after** the child already understands the plush interpretation. That clue tracks the real object; it does not explain the word “stuffed.”

### Creek / Footbridge

The first clear environmental item-use puzzle.

Permanent background may include creek, banks, trees/moss/ferns, rocks, most of the bridge, and path on the far side.

Separate state layers:

- damaged bridge gap;
- installed Board/repaired bridge;
- fresh far-bank tracks;
- disturbed vegetation/tension cue;
- Act 4 red/green fabric scrap;
- Sasquatch placement/state during Act 4 retrace;
- exits to Forest Trail and Hidden Cedar Grove.

First-arrival rule: **Board + bridge gap → repaired bridge**. Board leaves inventory and appears in the world. Suggested reaction: `Perfect-ish.`

If Board was missed, hint toward something long, flat, and sturdy and allow backtracking.

Bridge transition is one-way **broken → repaired** and remains solved for all later acts.

Crossing uses an ordinary transition/fade; no walking system or separate far-bank room is required.

Act 4 adds the red/green fabric scrap after the food-vs-plush reveal. It helps track Buddy’s dragged plush rather than repeating the bridge puzzle.

### Hidden Cedar Grove

The emotional hinge of the adventure and Act 3 home base.

It should feel quieter/more secluded than the trail. Reaching the Grove is the reward; **do not add another trust/fetch puzzle**.

First entrance sequence:

- brief intimidating partial Sasquatch reveal;
- kid says `...Hi?`;
- Sasquatch attempts the absurd skinny-tree hiding pose;
- fear collapses into comedy;
- kid reassures him;
- Sasquatch cautiously emerges and may awkwardly wave.

The naming choice and Stuffed Pepper misunderstanding occur here.

Likely separate Sasquatch appearances/states:

- intimidating partial reveal;
- skinny-tree hiding;
- cautious peek/nervous;
- relaxed/neutral;
- excited confirmation;
- `BIG` gesture;
- hugging/sleep gesture;
- confused food-pepper reaction as needed;
- final Stuffed Pepper hug.

Sasquatch should be expressive through raster states, gesture, and vocal SFX rather than requiring fluent TTS dialogue.

---

## 6. Puzzle chains

### Tutorial puzzle — water

**Problem:** child is thirsty.

**Clue:** visible Cup and Sink in Bathroom; immediate ordinary-world logic.

**Solution:** collect Cup → use Cup on Sink → replace with Cup of Water → choose `Drink` on Cup of Water in inventory.

**State change:** thirst resolved; Cup of Water consumed; return-to-bed progression understood.

### Puzzle chain 1 — track Sasquatch and cross Creek

**Problem:** prove what was outside and find where it went.

**Clues:** Backyard footprint/hair + flexible Forest Trail evidence.

**Inventory:** Board found on Forest Trail.

**Solution:** default 3-of-4 evidence threshold establishes Creek route; Board used on bridge gap.

**State change:** bridge repaired permanently; Grove becomes reachable.

### Puzzle chain 2 — fully solve the wrong Stuffed Pepper

**Problem:** child believes Sasquatch needs a Stuffed Pepper meal.

**Clue:** home pepper garden + visible shed/rocks + ordinary Kitchen food logic.

**Inventory:** Shed Key → Shovel → Bell Pepper → Cream Cheese → Stuffed Pepper (Food).

**Solution:** fake rock reveals key; key unlocks shed and leaves inventory; shovel frees the pepper from storm-softened garden mud and is left by the garden/shed afterward; child obtains Cream Cheese from Kitchen; Bell Pepper + Cream Cheese are consumed by the Prep Area recipe to create Stuffed Pepper (Food); completed food is proudly offered to Sasquatch.

**State change:** Sasquatch’s confused hug/sleep pantomime causes the semantic reveal. The child now understands the lost object is a plush stuffed with fuzz. Already-solved backyard substeps remain solved if discovered early.

### Puzzle chain 3 — track and rescue the real Pepper

**Problem:** find the actual plush after the double meaning is understood, then retrieve it from Buddy quietly.

**Clues:** Forest Trail fuzz + Creek fabric + remembered Buddy tracks, all interpreted after the food puzzle has already established what the plush is.

**Discovery:** child realizes Buddy found the plush outdoors and dragged it home; this also explains Sasquatch’s Act 1 window visit.

**Final item puzzle:** the Stinky Sock becomes collectible in Bedroom only after the Buddy problem is established → use on Buddy → Buddy releases Stuffed Pepper (Plush) → collect plush → give to Sasquatch.

**State change:** Buddy holds sock, plush returns to Sasquatch, game completes; final smell tag pays off the exchange.

---

## 7. Inventory lifecycle / item-use matrix

| Item | Appears / obtained | Correct target/action | Result | Final disposition |
| --- | --- | --- | --- | --- |
| Cup | Bathroom | Sink/Faucet | Replace with Cup of Water | Removed by replacement |
| Cup of Water | Result of Cup + Sink | Inventory action: `Drink` | Resolve thirst | Consumed |
| Board | Forest Trail | Bridge gap | Repair bridge; enable crossing | Removed from inventory, installed in environment |
| Shed Key | Under fake rock in Backyard | Shed door | Unlock shed | Removed after use; shed stays permanently unlocked/open |
| Shovel | Inside unlocked shed | Storm-softened pepper garden/mud target | Obtain Bell Pepper | Removed after use; shown returned/leaned by garden or shed |
| Bell Pepper | Backyard garden | Kitchen Prep Area while Cream Cheese is owned | Create Stuffed Pepper (Food) | Consumed by recipe |
| Cream Cheese | Kitchen refrigerator | Condition/ingredient at Prep Area | Create Stuffed Pepper (Food) | Consumed by recipe |
| Stuffed Pepper (Food) | Kitchen Prep Area recipe | Sasquatch | Semantic-reveal comedy; Sasquatch demonstrates hug/sleep meaning | Removed by authored handoff/rejection sequence |
| Stinky Sock | Visible/jokeable in Bedroom earlier; collectible only once Act 5 Buddy-rescue objective is active | Buddy | Buddy swaps plush for sock | Removed from inventory; Buddy holds it |
| Stuffed Pepper (Plush) | Hallway after Buddy swap | Sasquatch | Reunion / ending | Removed from inventory into Sasquatch hug state |

Evidence such as coarse hair, bent fern, white fuzz, and fabric scrap is **environmental discovery state**, not a required clue inventory.

The Kitchen recipe is deliberately **not** a generalized crafting system. It uses ordinary declarative conditions/actions already useful elsewhere: required item owned, item used on target, remove items, give result, play reaction.

---

## 8. Characters and dialogue-state needs

### Child protagonist

Role: curious, brave enough to investigate, funny without being snarky toward a young audience, and willing to help rather than capture/prove Sasquatch.

Presentation: viewpoint, spoken lines, dialogue portrait, occasional authored illustration/state where useful. No pathfinding avatar.

Required dialogue states/beats include:

- thirsty opening;
- Sasquatch-window reaction;
- trail clue conclusions/hints;
- fear-to-comedy Grove introduction;
- interpretation of Sasquatch gestures;
- naming choice framing;
- Stuffed Pepper food misunderstanding;
- confidence while obtaining/preparing the food Stuffed Pepper;
- food handoff and `stuffed like a stuffed animal` realization;
- fuzz/fabric tracking conclusions;
- Buddy connection realization;
- quiet-finale warnings/reactions;
- warm ending;
- final smell-tag reaction.

Most important child beats should have stored spoken audio. Issue #1 does **not** require every final sentence to be scripted before it can close; exact wording may be polished during production as long as the required states, progression, and audio needs are clear.

### Sasquatch

Role: mystery figure → shy comic reveal → co-star/friend whose lost comfort item drives the adventure.

Communication principle: expressive nonverbal sounds, gestures, facial/pose states, and limited intelligible sounds. Do not make ordinary fluent English/TTS the default.

Persistent player-selected name choices: Sassy, Sassafras, Bigfoot, Sasquatch, Squatch.

Audio needs: grunts/warbles, nervous sounds, strong confirmation, excited sounds, confused food-pepper reaction, relieved/contented ending sound. These may be recorded/generated/uploaded audio rather than language TTS.

During Act 4, Sasquatch accompanies the child through the outdoor retrace but waits outside when the child enters the Kitchen/home.

### Buddy

Role: family dog, early foreshadowing, cause of the mystery, and final gentle puzzle target.

Chronology: Buddy finds the plush outdoors and carries it home before Act 1. His tracks therefore legitimately point back toward the house the morning after the sighting.

States: absent/background relevance; pawprints evidence; sleeping with Pepper; stirring on direct grab; sleeping with Stinky Sock.

Audio/presentation: breathing/snoring, tiny sleepy reaction, perhaps nose twitch/eye opening. No complex dialogue.

### Parents

Primarily off-screen environmental stakes. Parents’ bedroom door exists from Act 1 so the finale does not invent the constraint late.

The final smell tag is retained: a faint off-screen parent line reacts to the smell after Buddy takes the sock. Exact wording is production polish.

---

## 9. Final optional/funny interaction inventory

These are the **design-level final interaction beats** for Issue #1. Exact wording, timing, and small visual flourishes may be polished during authoring. They are flavor, not progression gates, and should reuse ordinary hotspot/dialogue/state primitives rather than spawning bespoke systems.

### Bedroom

1. **Dirty laundry / Stinky Sock foreshadowing:** before Act 5, the child reacts to the especially nasty sock but refuses to collect it. When Act 5 activates, the same hotspot becomes collectible.
2. **Alarm clock / bedside clock:** a sleepy reaction to the unreasonable hour reinforces the ordinary-night opening.
3. **Bed/pillow after getting up:** the child is tempted to crawl straight back into bed, but thirst still needs resolving.

### Hallway

1. **Window after the lightning reveal:** the child refuses to press their face against the glass to investigate the giant mystery silhouette.
2. **Family photo:** a warm/light family joke gives the house personality without introducing another character.
3. **Parents’ bedroom door:** quiet reaction reinforces that the parents are asleep; in Act 5 it doubles as the reason Buddy cannot be allowed to bark.
4. **Buddy wrong-item attempts in Act 5:** harmless sleepy/stirring reactions for unsuitable inventory items, with no punishment or fail state.

### Bathroom

1. **Mirror:** sleepy-hair / half-awake reaction.
2. **Toothbrush:** a small bedtime/morning joke; not another task.
3. **Tub/shower:** child declines starting a full bath in the middle of the night.

### Kitchen

1. **Family magnets / child art on refrigerator:** a short personal joke or proud/embarrassed reaction.
2. **Toaster:** a silly appliance reaction; no cooking subsystem.
3. **Fruit bowl:** child briefly considers whether random fruit could somehow solve the increasingly weird Pepper problem.
4. **Fridge contents outside the Cream Cheese beat:** one or two changing reactions that make the refrigerator feel like a real family fridge without adding collectible clutter.

### Backyard

1. **Compare the child’s footprint to the giant print:** direct size gag that sells the mystery.
2. **Buddy pawprints:** an early `Buddy was out here too` observation that becomes meaningful later without explaining the reveal.
3. **Ordinary landscaping rocks:** terse/repeatable reactions make clicking rocks mildly funny and make the subtly different hide-a-key rock feel fair rather than pixel-hunted.
4. **Locked shed / later open shed:** state-aware joke before unlocking and a small payoff reaction afterward.

### Forest Trail

1. **Bush:** `No Bigfoot. Just bush.` with a shorter/drier repeat such as `Still bush.`
2. **Unknown mushroom:** child refuses to eat/touch unidentified forest mushrooms.
3. **Ordinary rock:** `Suspiciously normal.` or equivalent.
4. **Skinny cedar/tree:** joke that it could not possibly hide a Sasquatch, explicitly paid off by the Grove hiding gag.

### Creek / Footbridge

1. **Creek water:** child declines trying to swim/wade the storm-swollen crossing.
2. **Broken bridge before finding/using Board:** a reaction that describes the physical problem clearly enough to hint at needing something long, flat, and sturdy.
3. **Wrong-item family:** at least two authored harmless jokes for unsuitable inventory items when available; examples include Cup (`Hydrated bridge. Still broken.`) and a clearly unsuitable small item (`That would be a very small bridge.`). Do not require every item to have bespoke dialogue.

### Hidden Cedar Grove

1. **Skinny-tree follow-up:** clicking the hiding tree after the introduction gets a second embarrassed Sasquatch reaction or acknowledgement of the failed disguise.
2. **Berries:** while the child still thinks Sasquatch is hungry, Sasquatch casually eats a berry, which makes the child even more confident the problem is food.
3. **Giant footprint / Sasquatch feet:** child can finally compare the evidence to the actual owner.
4. **Repeat Sasquatch click:** an awkward wave, mirrored gesture, grunt, or other tiny friendly state/audio response makes him feel like a character rather than a quest terminal.

This satisfies the original target of roughly 2–4 playful interactions per room without turning every background object into authored content.

---

## 10. Visual asset inventory

### Static backgrounds

Likely eight core raster room backgrounds, with lighting/presentation handled through layers/state where practical rather than regenerating entire near-duplicate rooms:

1. Bedroom
2. Hallway
3. Bathroom
4. Kitchen
5. Backyard
6. Forest Trail
7. Creek / Footbridge
8. Hidden Cedar Grove

A room may need a deliberately different full-background appearance only when the base scene truly changes; otherwise prefer overlays/stateful layers.

### Layered / stateful assets

At minimum:

**Bedroom**
- kid-in-bed / empty-bed presentation as needed;
- laundry / Stinky Sock interaction asset;
- Bedroom exit.

**Hallway**
- lightning overlay;
- Sasquatch window silhouette;
- window interaction/state if needed;
- Bedroom/Bathroom/Kitchen/parents’ doors or hotspots as needed;
- Buddy sleeping with Pepper;
- Buddy sleeping with Sock;
- giant Stuffed Pepper (Plush).

**Bathroom**
- Cup;
- Cup of Water item art;
- Sink/Faucet target if not purely hotspot-based.

**Kitchen**
- refrigerator/open interaction if not hotspot-only;
- Cream Cheese item;
- Prep Area target;
- Stuffed Pepper (Food) item art;
- back-door exit if represented as a layered asset.

**Backyard**
- giant footprint;
- Sasquatch track trail;
- Buddy pawprints;
- coarse hair clue;
- shed locked/open state;
- fake rock state;
- Shed Key;
- Shovel;
- pepper garden/diggable storm-mud state;
- Bell Pepper;
- Sasquatch outdoor Act 4/ending placements as needed.

**Forest Trail**
- bent fern clue;
- high broken branch clue;
- giant footprint clue;
- crushed berries clue;
- Board;
- Act 4 white fuzz/stuffing clue;
- Sasquatch Act 4 placement/state as needed.

**Creek / Footbridge**
- damaged bridge gap;
- installed Board/repaired bridge;
- fresh tracks/tension cue;
- Act 4 red/green fabric scrap;
- Sasquatch Act 4 placement/state as needed.

**Hidden Cedar Grove / Sasquatch**
- Sasquatch appearance set: partial reveal, hiding, cautious/nervous, neutral, excited, BIG gesture, sleep/hug gesture, confused food-pepper reaction as needed, final Pepper hug;
- optional movement target placements rather than walk-cycle art.

**UI/dialogue**
- child dialogue portrait;
- speaker/portrait assets as the dialogue design requires.

The first production asset batch in Studio Slice 0 remains intentionally smaller: Bedroom night, Hallway night, Bathroom, Cup, Cup of Water, Sasquatch window silhouette, Lightning overlay/effect, and Kid dialogue portrait. Kitchen assets come later when the relevant Studio/runtime slice exists.

---

## 11. Spoken audio / TTS requirements

Important story, instruction, reactions, and character interactions should be audible because young players may not be strong readers.

Rules:

- generate/record once, store, and play saved audio during gameplay;
- no normal gameplay-time model calls;
- editing dialogue or voice settings marks generated audio stale;
- regenerate only when requested;
- keep TTS/audio provider replaceable;
- allow future generated TTS, recorded voice, uploaded audio, or text-only modes.

Flagship-specific needs:

- child protagonist: stored voiced dialogue for core beats and many optional reactions;
- Sasquatch: expressive nonverbal vocal SFX plus a very small number of intelligible sounds/approximations;
- fixed chosen Sasquatch name: only selected important lines should need five pre-generated audio variants;
- Buddy: snoring/breathing/sleepy reaction SFX;
- storm/lightning/rain ambience and flash cue;
- forest/creek ambience as useful;
- kitchen interaction/prep SFX as useful;
- bridge/interaction SFX;
- final reunion emotional sound cue;
- final smell-tag parent reaction if voiced rather than text-only.

Exact final script wording is a production task, not a blocker for Issue #1, once required dialogue states/beats and audio coverage are clear.

---

## 12. Runtime capabilities earned by the flagship

### Flagship-required

These are directly exercised by the current story and should be generic, declarative, serializable runtime capabilities:

- rooms with stable IDs and exits;
- static raster backgrounds;
- stable logical scene coordinates responsive across phone/desktop;
- layered entities with position, scale, visibility, z-order;
- multiple visual states/appearances for one logical entity;
- tap/click hotspots;
- room-enter, entity-tap, item-on-target, and explicit inventory-item-action triggers;
- limited structured conditions based on owned items, prior interactions, solved state, evidence completion, and fixed story choice;
- declarative actions including show/hide, change appearance, wait, play dialogue/audio, set persistent state, give/remove/replace item, enable/disable interaction/exit, change objective, and go to room;
- beat-based one-shot authored sequences with parallel actions where useful;
- simple authored movement/tween between scene positions without pathfinding;
- displayed dialogue + stored audio playback;
- fixed-choice persistent story values;
- inventory collection, selection/deselection, consumption, replacement, explicit item actions, and item-on-environment/character use;
- simple multi-item conditions/actions such as `Bell Pepper used on Prep Area AND Cream Cheese owned → remove both → give Stuffed Pepper (Food)` without a crafting subsystem;
- successful and wrong-item reactions;
- one-way persistent world state such as bridge repair and shed unlock;
- evidence groups / threshold completion with one-way seen state;
- lightweight objectives including selected-value interpolation;
- persistent revisiting of rooms with story-dependent entity visibility/behavior;
- save/serialize current room, inventory, flags/state, evidence, selected name, and progress;
- game completion/end state.

### Useful soon, but not required to prove the first slice

- contextual inactivity/repeated-failure hints and gentle highlighting if playtesting shows children need them;
- tiny ambient-loop behavior such as blinking, dog breathing/snoring, foliage/light variation using existing state/move/wait primitives;
- more polished presentation effects beyond the minimum fade/lightning needs;
- recorded/uploaded voice UX in addition to the first stored-audio path.

### Speculative / explicitly defer

- free-roaming protagonist or NPC pathfinding;
- navmeshes/collision/physics;
- platforming or action combat;
- stealth subsystem or punishment/fail state for Buddy finale;
- generalized crafting system or recipe inventory;
- detective inventory, detective points, or visible clue-counter UI by default;
- arbitrary scripting/user JavaScript;
- unrestricted boolean/programming DSL;
- general node-based visual programming;
- professional keyframe/animation suite or skeletal-animation system;
- generic RPG systems;
- multiplayer.

---

## 13. Studio authoring contract

The flagship must be authored through Studio by Brandon rather than secretly implemented as bespoke story code.

Core rule:

> **The agent builds the reusable Studio capability; Brandon builds the actual flagship through Studio.**

Agents may create tiny test fixtures to validate generic primitives. They should not insert finished flagship production data/assets directly to bypass missing authoring UX.

The flagship therefore tests not only runtime capability but creator completion. If authoring a required behavior is confusing, excessively click-heavy, or impossible, that is Studio/product feedback.

Studio ultimately needs creator-facing workflows for:

- create/open project;
- create/generate/upload/select project assets;
- create rooms and choose backgrounds;
- place and transform layered entities visually;
- create appearances/states for logical entities;
- define human-readable `When... → do...` interactions;
- add common conditions through pickers rather than expressions;
- author item-use puzzles and explicit inventory item actions such as `Drink`;
- define simple required-item conditions without exposing a general crafting language;
- define evidence groups by selecting members + threshold + completion result;
- define fixed story choices;
- author beat-based sequences with live room preview;
- preview room state variations such as night/morning/finale;
- write dialogue and manage stored audio;
- define objectives;
- playtest the real adventure.

Production backgrounds, props, inventory art, character variants, and other flagship visual assets should likewise be created/organized/selected through Studio rather than a separate private flagship asset pipeline.

---

## 14. First vertical slice

The preferred first authored gameplay slice is the actual opening:

**Bedroom → Hallway → Bathroom → Bedroom**

It should prove:

- static raster backgrounds;
- layered assets;
- responsive scene scaling;
- tap/click interactions;
- exits/transitions;
- spoken dialogue/audio playback;
- one automatic one-shot timed sequence;
- lightning overlay + temporary Sasquatch silhouette;
- Cup collection;
- inventory selection/deselection;
- Cup + Sink item-on-environment interaction;
- Cup → Cup of Water replacement;
- explicit `Drink` inventory action and consumption;
- persistent state across room revisits;
- at least one optional funny interaction.

Do this rather than an unrelated gray-box demo: it is simultaneously the real first minutes of the flagship and the smallest useful test of qc-cyoa’s intended experience.

The Kitchen is **not** added to this first slice merely because it is now part of the full flagship. It earns its implementation when the Stuffed Pepper puzzle slice is reached.

---

## 15. Issue #1 completion status

At the design/requirements level, the flagship now satisfies Issue #1's required deliverables:

- **Premise / target player:** locked enough for implementation.
- **Beginning-to-ending story outline:** locked, including the literal food Stuffed Pepper before the plush reveal.
- **Eight-room graph:** locked, including Kitchen as the Hallway ↔ Backyard connector.
- **Complete puzzle chain:** locked at design level.
- **Inventory/item-use matrix:** locked at design level, including post-use disposition for key, shovel, sock, and both Pepper items.
- **Characters/dialogue-state map:** required structural states/beats are identified; exact final prose is production polish, not an Issue #1 blocker.
- **Optional interactions:** final design-level 2–4-per-room inventory is defined in Section 9.
- **Visual asset list:** consolidated and updated for Kitchen/food Stuffed Pepper.
- **Audio/TTS requirements:** structurally identified; exact recorded/generated line inventory can be finalized during authoring.
- **Runtime requirements:** derived and classified here.
- **First vertical slice:** locked as Bedroom → Hallway → Bathroom → Bedroom.

The Forest Trail starts at a **3-of-4** evidence threshold, but the exact number is intentionally a playtest tuning value rather than an architectural promise.

Issue #1 can close once this canonical document is merged: another developer can explain the full playthrough, puzzle/state flow, required content states, and smallest reusable runtime without reconstructing decisions from chats. It should **not** stay open merely because final joke wording, mascot branding, background decoration, or every production audio line has not been polished.

---

## 16. Open design questions

No remaining question below blocks Issue #1 or PR #8. These are production/product decisions that can be made when they become useful:

- What is Sasquatch’s external/canonical mascot or brand name, if any, separate from the five in-game player choices?
- What are the exact final voiced lines and which optional reactions receive audio versus text-only fallback?
- What exact permanent decorative details fill each background beyond the interaction-relevant composition already specified?
- Does child playtesting suggest changing the Forest Trail threshold from the initial 3-of-4 default?

As future decisions lock, update this document and leave concise historical notes on the relevant implementation/design issues rather than allowing chat history to become the only source of truth.
