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

- roughly 15–25 minutes on a first playthrough;
- seven reusable illustrated rooms;
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

Sasquatch is searching for something he communicates as a **big “stuffed pepper” that he needs to sleep**. The child believes he means a cooked bell pepper stuffed with food. Sasquatch actually means a giant bell-pepper-shaped plush toy stuffed with fuzz that he cuddles to sleep. Both characters enthusiastically agree on the same phrase while meaning completely different things.

The family dog, Buddy, found the plush near the woods during/after the storm and carried it home. Sasquatch followed the trail to the house, which retroactively explains why he was outside the window in Act 1: he was searching for his comfort object, not stalking the child.

The final puzzle is a quiet, gentle swap. Buddy is asleep near the parents’ room holding the giant plush Pepper. The player trades him a stinky sock so he releases the Pepper without barking and waking the household. The child reunites Sasquatch with the plush, ending on friendship and a joke about not appearing outside bedroom windows at midnight.

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
9. Use/consume Cup of Water on self. Thirst resolves; the child says a small line such as `Better.`
10. Return through the Hallway to the Bedroom and go back to bed.
11. Fade/transition to morning.

**Act 1 teaches:** tap interactions, room exits, transitions, collectible inventory, inventory selection, item-on-environment use, item replacement/transformation, self-use/consumption, spoken reactions, persistent state, and a short timed sequence.

### Act 2 — Follow the Evidence

**Goal:** answer only two questions: **Was that really Sasquatch, and where did he go?** Do not reveal the plush yet.

1. Morning presentation replaces the stormy-night state.
2. The child goes to the Backyard.
3. A huge muddy footprint beneath/near the relevant window proves the sighting was real.
4. Smaller muddy Buddy pawprints lead toward the house while Sasquatch tracks lead toward the woods. The child merely notes that Buddy was outside too.
5. Coarse brown hair caught high on brush/fence provides another clear clue.
6. The player follows the trail into the Forest Trail room.
7. Tracking evidence includes bent fern, a branch broken unusually high, another giant footprint, and crushed/disturbed salal berries or similar PNW vegetation.
8. Evidence should be discoverable in flexible order rather than a rigid hidden-object sequence. The current intended abstraction is an evidence group, approximately **3 of 4** meaningful clues.
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
11. Sasquatch communicates `pepper`, strongly indicates **BIG**, then pantomimes hugging/sleeping.
12. The child interprets this as Sasquatch being unable to sleep because he is hungry and needing a **Stuffed Pepper** meal.
13. Sasquatch enthusiastically confirms because he means a giant plush pepper stuffed with fuzz.
14. Objective becomes: **Help [chosen name] find a Stuffed Pepper.**
15. The child remembers the pepper garden at home.

This is the midpoint pivot: **mystery adventure becomes buddy adventure.**

### Act 4 — The Great Stuffed Pepper Hunt

**Goal:** confidently solve the wrong problem, discover the misunderstanding, and reconnect the mystery to Buddy.

#### Part A — confidently solve the wrong problem

1. Return through the already-solved Creek and Forest Trail toward the Backyard.
2. Previously solved world state remains solved. The bridge stays repaired; any shed/key/shovel progress found early remains valid.
3. In the Backyard, the normal puzzle path is:
   - inspect slightly unusual fake landscaping rock;
   - reveal Shed Key;
   - unlock Shed;
   - collect Shovel;
   - use Shovel on the appropriate pepper garden/mud target;
   - obtain a real Bell Pepper.
4. If the player already discovered the key, unlocked the shed, or collected the shovel in Act 2, skip those completed steps naturally.
5. Present/use the real Bell Pepper on Sasquatch.
6. Sasquatch is confused/disappointed.
7. Kid lands the joke: `What?! You said stuffed pepper!`
8. Sasquatch repeats the hug/sleep idea and indicates where he remembers losing it.

#### Part B — discover what “stuffed” means

1. Retrace the established route.
2. New Act 4 evidence appears in reused rooms, not during Act 2:
   - Forest Trail: tuft of white fuzz/stuffing caught in vegetation;
   - Creek / Footbridge: small red/green fabric scrap snagged on the bridge/branch where Buddy dragged the plush.
3. Sasquatch recognizes the clues and repeats the hugging/sleep gesture.
4. The child realizes the supposed food is fuzzy and hugged.
5. Semantic reveal lands: not a pepper stuffed **with food**, but a **stuffed pepper** — a plush pepper stuffed with fuzz.
6. Objective changes to: **Find [chosen name]’s Stuffed Pepper.**

#### Part C — connect Buddy

1. The old Buddy pawprints now gain meaning.
2. The child realizes Buddy found the plush and dragged it home.
3. Sasquatch followed Buddy/the Pepper trail back to the house.
4. The frightening Act 1 window sighting is explicitly recontextualized as sympathetic and funny.
5. No detective inventory or separate clue UI is required; persistent discovery/state and contextual dialogue are enough.

### Act 5 — Quiet Pepper Rescue

**Goal:** recover the plush without waking the parents and pay off the friendship.

1. Sasquatch waits outside/near the Backyard while the child goes inside alone.
2. The Hallway returns to a quiet dim state.
3. Buddy is asleep near the parents’ bedroom door with the giant Stuffed Pepper between his paws / partly in his mouth.
4. Directly taking it gently fails: Buddy tightens his grip, stirs, opens an eye, or makes a sleepy noise.
5. The child refuses to continue because barking would wake the parents. There is no fail state or stealth subsystem.
6. Return to the Bedroom. The previously established dirty-laundry/stinky-sock joke now becomes useful.
7. Collect **Stinky Sock** if not already available under the active finale state.
8. Return to Hallway and use Stinky Sock on Buddy.
9. Short authored sequence:
   - Buddy’s nose twitches;
   - one eye opens;
   - he releases the Stuffed Pepper;
   - takes the sock;
   - curls back up and resumes sleeping/snoring.
10. Stuffed Pepper becomes collectible.
11. Return to Backyard and give Pepper to Sasquatch.
12. Sasquatch switches to a dedicated hugging-Pepper pose/state, relaxes, and makes a relieved/contented vocalization.
13. A simple tween may move Sasquatch toward the Pepper; no walk-cycle system is required.
14. Final exchange is warm and brief: the child invites him to visit again, but perhaps not by silently appearing outside the bedroom window at midnight.
15. Sasquatch seriously agrees/waves goodbye and heads back toward the forest.
16. Optional final tag: Buddy sleeps happily with the disgusting sock while a parent faintly asks why the hallway smells. Kid blames Buddy. End.

---

## 4. Seven-room graph

The game deliberately reuses familiar rooms across acts rather than expanding into a large world.

1. **Bedroom**
2. **Hallway**
3. **Bathroom**
4. **Backyard**
5. **Forest Trail**
6. **Creek / Footbridge**
7. **Hidden Cedar Grove**

Conceptual journey:

- **Act 1:** Bedroom → Hallway → Bathroom → Hallway → Bedroom
- **Act 2:** Bedroom / Hallway → Backyard → Forest Trail → Creek → Hidden Cedar Grove
- **Act 3:** Hidden Cedar Grove
- **Act 4:** Grove → Creek / Trail → Backyard → Trail / Creek as clues require
- **Act 5:** Backyard / home → Hallway → Bedroom → Hallway → Backyard / ending presentation

Exact physical exit routing may be refined for natural play without adding literal transitional spaces such as every staircase or doorway in the house.

---

## 5. Room design

### Bedroom

**Story roles:** Act 1 opening/return-to-bed, morning transition point, Act 5 Stinky Sock payoff.

**Locked required/stateful elements:**

- bed with at least child-present / empty presentation;
- exit to Hallway;
- dirty laundry / sock-related hotspot established before the finale so the solution is earned rather than appearing conveniently;
- Stinky Sock collectible behavior enabled when the finale objective makes it relevant;
- child dialogue/portrait presentation as needed.

**States:** stormy night before water, stormy night after water/return to bed, morning/day, Act 5 finale interaction state.

**Known interaction beats:** tap bedside/floor to get up; return to bed after resolving thirst; earlier laundry/sock joke should foreshadow Buddy’s sock habit; finale state allows collecting Stinky Sock.

**Still open:** exact permanent decor, full optional-click inventory, exact sock foreshadowing lines, and whether the sock may be collected harmlessly before Act 5 or only becomes collectible then.

### Hallway

One physical room reused for stormy night, ordinary morning/day, and Act 5 finale.

Permanent background can contain walls, trim, floor, family photos, console table, door frames, window frame, and cozy PNW-home details.

Keep story/state layers separate where practical:

- Bedroom door;
- Bathroom door;
- parents’ bedroom door;
- window treatment/state;
- lightning overlay;
- Sasquatch silhouette;
- Buddy;
- giant Stuffed Pepper;
- night/darkness presentation overlay.

**Act 1:** run the brief one-shot lightning/Sasquatch reveal. Window, family photo, and parents’ door can provide optional reactions. Bathroom path is never puzzle-gated.

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

Required sequence is exactly the Act 1 Cup → Sink → Cup of Water → self-use flow.

Prefer the author-facing primitive **replace item A with item B** rather than arbitrary internal item-state mutation.

Optional personality can come from mirror, toilet, toothbrush, or tub reactions without gating progress.

Only two meaningful story states are required: before thirst resolved and after thirst resolved.

### Backyard

A reusable multi-act room.

Permanent raster background can include back of house, bedroom window, lawn/mud, fence, woods edge, garden beds, shed structure, landscaping rocks, and PNW vegetation.

Separate stateful layers where practical:

- giant Sasquatch footprint;
- Sasquatch track trail;
- Buddy pawprints;
- coarse hair on brush/fence;
- shed door state;
- fake hide-a-key rock;
- key;
- pepper plant/diggable patch;
- Bell Pepper;
- Shovel/shed contents.

**Act 2:** giant footprint proves the sighting, two track directions foreshadow Buddy, coarse hair supports the forest direction. Forest progression should require enough evidence without becoming a pixel hunt.

**Act 2 foreshadowing / world rule:** shed, pepper garden, rocks, and fake rock already exist. **Allow early puzzle solving where logically valid.** If the player finds the key/unlocks the shed/gets the shovel early, later acts respect it.

**Act 4:** fake rock → key → shed → shovel → garden → Bell Pepper, skipping any already-solved steps. Presenting the Bell Pepper to Sasquatch advances the misunderstanding.

Optional reactions include comparing footprints, garden jokes, repeated locked-shed jokes, Buddy pawprint reactions, and ordinary-rock jokes before the fake rock pays off.

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
- Act 4 fuzz/stuffing clue.

Narrative clue order may naturally read bent fern → branch → print → berries, but inspection order must be flexible. Current evidence-group target is about **3 of 4** meaningful clues before the child concludes Sasquatch went toward the Creek.

Board is collectable before its purpose is known. Missing it should produce gentle bridge/backtracking hints, not punishment.

Known optional reactions include `No Bigfoot. Just bush.`, `Still bush.`, unknown-mushroom caution, `Suspiciously normal.` rock, and a joke about a tree being too skinny to hide a Sasquatch — which Act 3 pays off.

Act 4 reuses this room with white fuzz/stuffing; that clue must not appear in Act 2.

### Creek / Footbridge

The first clear environmental item-use puzzle.

Permanent background may include creek, banks, trees/moss/ferns, rocks, most of the bridge, and path on the far side.

Separate state layers:

- damaged bridge gap;
- installed Board/repaired bridge;
- fresh far-bank tracks;
- disturbed vegetation/tension cue;
- Act 4 red/green fabric scrap;
- exits to Forest Trail and Hidden Cedar Grove.

First-arrival rule: **Board + bridge gap → repaired bridge**. Board leaves inventory and appears in the world. Suggested reaction: `Perfect-ish.`

If Board was missed, hint toward something long, flat, and sturdy and allow backtracking.

Bridge transition is one-way **broken → repaired** and remains solved for all later acts.

Wrong-item experimentation is safe and funny; examples already proposed include Cup (`Hydrated bridge. Still broken.`), Key (`That would be a very small bridge.`), and Bell Pepper (`I don't think vegetables are load-bearing.`).

Crossing uses an ordinary transition/fade; no walking system or separate far-bank room is required.

Act 4 adds the red/green fabric scrap rather than repeating the bridge puzzle.

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
- final Stuffed Pepper hug.

Optional interactions include the skinny tree, berries (Sasquatch may eat while the child still thinks he is starving), and a giant footprint confirmation.

Sasquatch should be expressive through raster states, gesture, and vocal SFX rather than requiring fluent TTS dialogue.

---

## 6. Puzzle chains

### Tutorial puzzle — water

**Problem:** child is thirsty.

**Clue:** visible Cup and Sink in Bathroom; immediate ordinary-world logic.

**Solution:** collect Cup → use Cup on Sink → replace with Cup of Water → use/consume on self.

**State change:** thirst resolved; Cup of Water consumed; return-to-bed progression allowed/understood.

### Puzzle chain 1 — track Sasquatch and cross Creek

**Problem:** prove what was outside and find where it went.

**Clues:** Backyard footprint/hair + flexible Forest Trail evidence.

**Inventory:** Board found on Forest Trail.

**Solution:** evidence threshold establishes Creek route; Board used on bridge gap.

**State change:** bridge repaired permanently; Grove becomes reachable.

### Puzzle chain 2 — solve the wrong Stuffed Pepper

**Problem:** child believes Sasquatch needs a cooked Stuffed Pepper.

**Clue:** home pepper garden plus visible shed/rocks already established.

**Inventory:** Shed Key → Shovel → Bell Pepper.

**Solution:** fake rock reveals key; key unlocks shed; shovel digs/gets pepper; Bell Pepper offered to Sasquatch.

**State change:** the attempted solution fails comedically and motivates retracing the loss route. Already-solved substeps remain solved if discovered early.

### Puzzle chain 3 — understand and rescue the real Pepper

**Problem:** determine what Sasquatch actually lost, then retrieve it from Buddy quietly.

**Clues:** Forest Trail fuzz + Creek fabric + hug/sleep gesture + remembered Buddy tracks.

**Discovery:** child realizes the “stuffed pepper” is a plush and Buddy dragged it home.

**Final item puzzle:** collect Stinky Sock from Bedroom → use on Buddy → Buddy releases Pepper → collect Pepper → give to Sasquatch.

**State change:** Buddy holds sock, Pepper returns to Sasquatch, game completes.

---

## 7. Inventory lifecycle / item-use matrix

| Item | Appears / obtained | Correct target | Result | Final disposition |
| --- | --- | --- | --- | --- |
| Cup | Bathroom | Sink/Faucet | Replace with Cup of Water | Removed by replacement |
| Cup of Water | Result of Cup + Sink | Self | Drink; resolve thirst | Consumed |
| Board | Forest Trail | Bridge gap | Repair bridge; enable crossing | Removed from inventory, installed in environment |
| Shed Key | Under fake rock in Backyard | Shed door | Unlock shed | **Open:** retain vs consume/remove after unlock |
| Shovel | Inside unlocked shed | Pepper garden/mud target | Obtain real Bell Pepper | **Open:** later retention/disposition |
| Bell Pepper | Backyard garden | Sasquatch | Wrong interpretation comedy; advance Act 4 | **Open:** discard/retain/remove after rejection |
| Stinky Sock | Bedroom/laundry interaction | Buddy | Buddy swaps Pepper for sock | Removed from inventory; Buddy holds it |
| Stuffed Pepper | Hallway after Buddy swap | Sasquatch | Reunion / ending | Removed from inventory into Sasquatch hug state |

Evidence such as coarse hair, bent fern, white fuzz, and fabric scrap is **environmental discovery state**, not a required clue inventory.

---

## 8. Characters and dialogue-state needs

### Child protagonist

Role: curious, brave enough to investigate, funny without being snarky toward a young audience, and willing to help rather than capture/prove Sasquatch.

Presentation: viewpoint, spoken lines, dialogue portrait, occasional authored illustration/state where useful. No pathfinding avatar.

Required dialogue states include:

- thirsty opening;
- Sasquatch-window reaction;
- trail clue conclusions/hints;
- fear-to-comedy Grove introduction;
- interpretation of Sasquatch gestures;
- naming choice framing;
- Stuffed Pepper misunderstanding;
- Bell Pepper failure realization;
- plush semantic realization;
- Buddy connection realization;
- quiet-finale warnings/reactions;
- warm ending.

Most important child lines should have stored spoken audio.

### Sasquatch

Role: mystery figure → shy comic reveal → co-star/friend whose lost comfort item drives the adventure.

Communication principle: expressive nonverbal sounds, gestures, facial/pose states, and limited intelligible sounds. Do not make ordinary fluent English/TTS the default.

Persistent player-selected name choices: Sassy, Sassafras, Bigfoot, Sasquatch, Squatch.

Audio needs: grunts/warbles, nervous sounds, strong confirmation, excited sounds, relieved/contented ending sound. These may be recorded/generated/uploaded audio rather than language TTS.

### Buddy

Role: family dog, early foreshadowing, cause of the mystery, and final gentle puzzle target.

States: absent/background relevance; pawprints evidence; sleeping with Pepper; stirring on direct grab; sleeping with Stinky Sock.

Audio/presentation: breathing/snoring, tiny sleepy reaction, perhaps nose twitch/eye opening. No complex dialogue.

### Parents

Primarily off-screen environmental stakes. Parents’ bedroom door exists from Act 1 so the finale does not invent the constraint late.

Potential audio: faint final off-screen line about the smell if the ending tag is kept.

---

## 9. Known optional/funny interactions

Optional reactions should reward curiosity without becoming progression requirements. Current locked/proposed examples include:

- Hallway window after lightning: child refuses to investigate too closely;
- Hallway family photo: warm/funny characterization;
- parents’ door at night: reinforces that the adults are sleeping;
- Bathroom mirror/toilet/toothbrush/tub reactions;
- Backyard: compare child footprint to Sasquatch footprint;
- Backyard: garden joke before it matters;
- Backyard: repeated locked-shed joke;
- Backyard: Buddy pawprint reaction;
- Backyard: terse reactions to ordinary rocks before fake-rock payoff;
- Forest Trail bushes: `No Bigfoot. Just bush.` / `Still bush.`;
- Forest Trail mushroom caution;
- Forest Trail ordinary rock: `Suspiciously normal.`;
- Forest Trail skinny-tree joke that later pays off;
- Creek wrong-item jokes;
- Grove skinny-tree follow-up;
- Grove berry interaction while the child still thinks Sasquatch is hungry;
- Grove footprint confirmation;
- Hallway finale wrong-item/sleepy Buddy reactions without punishment.

**Open:** Issue #1 originally targets roughly 2–4 optional interactions per room where appropriate. Bedroom and some later room-state variants still need their final optional interaction inventory.

---

## 10. Visual asset inventory

### Static backgrounds

Likely seven core raster room backgrounds, with lighting/presentation handled through layers/state where practical rather than regenerating entire near-duplicate rooms:

1. Bedroom
2. Hallway
3. Bathroom
4. Backyard
5. Forest Trail
6. Creek / Footbridge
7. Hidden Cedar Grove

A room may need deliberately different full-background appearance only when the base scene truly changes; otherwise prefer overlays/stateful layers.

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
- Bedroom/Bathroom/parents’ doors or hotspots as needed;
- Buddy sleeping with Pepper;
- Buddy sleeping with Sock;
- giant Stuffed Pepper.

**Bathroom**
- Cup;
- Cup of Water item art;
- Sink/Faucet target if not purely hotspot-based.

**Backyard**
- giant footprint;
- Sasquatch track trail;
- Buddy pawprints;
- coarse hair clue;
- shed locked/open state;
- fake rock state;
- Shed Key;
- Shovel;
- pepper garden/diggable state;
- Bell Pepper.

**Forest Trail**
- bent fern clue;
- high broken branch clue;
- giant footprint clue;
- crushed berries clue;
- Board;
- Act 4 white fuzz/stuffing clue.

**Creek / Footbridge**
- damaged bridge gap;
- installed Board/repaired bridge;
- fresh tracks/tension cue;
- Act 4 red/green fabric scrap.

**Hidden Cedar Grove / Sasquatch**
- Sasquatch appearance set: partial reveal, hiding, cautious/nervous, neutral, excited, BIG gesture, sleep/hug gesture, final Pepper hug;
- optional movement target placements rather than walk-cycle art.

**UI/dialogue**
- child dialogue portrait;
- speaker/portrait assets as the dialogue design requires.

The first production asset batch in Studio Slice 0 is intentionally smaller: Bedroom night, Hallway night, Bathroom, Cup, Cup of Water, Sasquatch window silhouette, Lightning overlay/effect, and Kid dialogue portrait.

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
- bridge/interaction SFX;
- final reunion emotional sound cue.

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
- room-enter, entity-tap, and item-on-target triggers;
- limited structured conditions based on owned items, prior interactions, solved state, evidence completion, and fixed story choice;
- declarative actions including show/hide, change appearance, wait, play dialogue/audio, set persistent state, give/remove/replace item, enable/disable interaction/exit, change objective, and go to room;
- beat-based one-shot authored sequences with parallel actions where useful;
- simple authored movement/tween between scene positions without pathfinding;
- displayed dialogue + stored audio playback;
- fixed-choice persistent story values;
- inventory collection, selection/deselection, consumption, replacement, and item-on-environment/character use;
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
- crafting system for bridge/garden puzzles;
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
- author item-use puzzles;
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
- self-use/consumption;
- persistent state across room revisits;
- at least one optional funny interaction.

Do this rather than an unrelated gray-box demo: it is simultaneously the real first minutes of the flagship and the smallest useful test of qc-cyoa’s intended experience.

---

## 15. Issue #1 completion status

The story spine is coherent and substantially locked. Remaining design work is narrower than the original issue:

- **Premise / target player:** substantially locked.
- **Beginning-to-ending story outline:** locked.
- **Seven-room graph:** locked at conceptual level; exact physical exit routing may still be refined.
- **Complete puzzle chain:** substantially locked.
- **Inventory/item-use matrix:** mostly locked; a few post-use dispositions remain open.
- **Characters/dialogue-state map:** structural states are identified; final dialogue writing and exact line inventory remain open.
- **Optional interactions:** many are identified; final per-room interaction inventory remains open.
- **Visual asset list:** first consolidated inventory now exists here; exact production list will tighten during room/interaction finalization.
- **Audio/TTS requirements:** structurally identified; exact line/audio inventory remains open.
- **Runtime requirements:** derived and classified here.
- **First vertical slice:** locked as Bedroom → Hallway → Bathroom → Bedroom.

Issue #1 should not be closed until the remaining interaction/dialogue/asset/audio details are sufficient that another developer can explain the exact playthrough and the smallest reusable runtime without reconstructing decisions from chats.

---

## 16. Open design questions

These are intentionally unresolved; do not infer answers without product-owner approval.

1. What is Sasquatch’s external/canonical mascot or brand name, if any, separate from the five in-game player choices?
2. What is the final permanent decor and optional-interaction inventory for Bedroom?
3. Should Stinky Sock be collectible early, or only become collectible when Act 5 makes it relevant?
4. After Shed Key unlocks the shed, is it removed from inventory or harmlessly retained?
5. After the Shovel produces the Bell Pepper, does the Shovel remain in inventory or leave the carried set?
6. After Sasquatch rejects the real Bell Pepper, is it retained, discarded, returned to the garden, or removed by the authored sequence?
7. Is the Forest Trail evidence threshold definitively 3-of-4, or should playtesting tune that while preserving the evidence-group abstraction?
8. What exact 2–4 optional reactions per room make the final interaction inventory?
9. What are the final voiced lines and which optional reactions receive audio versus text-only fallback?
10. What exact physical exit routing between home/Backyard and the woods feels natural without adding unnecessary transitional rooms?
11. Does the optional parent/smell ending tag improve the ending enough to keep?

As these decisions lock, update this document and leave a concise `Locked decision` comment on Issue #1 so the issue remains the historical decision log while this file remains the current truth.
