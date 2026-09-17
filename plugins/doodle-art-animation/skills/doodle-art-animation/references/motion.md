# Motion, camera and transitions

Read this before writing the plate script and before building each plate. The motion targets here are what separates a living film from a slideshow.

## Keep every drawing alive

A still frame reads as a slideshow, and a transition out of stillness reads as forced. The engine keeps a base level of life, and each plate must add its own.

**What the engine does automatically:**
- **On twos.** Every drawing is held for 2 frames (12 drawings a second), including during transitions. This is the hand-drawn cadence. Set `STORY.twos = false` only for a smooth, vector look.
- **Gate weave.** The whole frame shifts up to `STORY.weave` px (default 0.9) and turns a hair on each drawing.
- **Grain.** A film-grain tile changes on each drawing (`STORY.grain`, 0–1, default 1).
- **Line boil.** Outlines and hatching re-jitter on each drawing.
- **Drift.** Plates without `cam` get a slow 4% push-in (`STORY.drift` or `plate.drift`; set `false` to turn it off).
- **Momentum across cuts.** The old plate leans into its transition over its last 0.45 s, and the new plate arrives still moving and settles over about 0.9 s. Both only ever scale up, about the hero (see "Transitions").

**What every plate must add**, at least two of these at all times:
- Flowing things: `flow(path, t)` dashes along rivers, currents and arrows.
- Drifting particles: positions offset by `wander(i, t, amp, speed)`.
- Weather and sway: rain streaks, clouds drifting a few px a second, `grass(..., { sway })`.
- A moving hero: along a path (`along`), bobbing, wobbling (drops oscillate), or rotating.
- Camera moves, in the "Camera" table below.
- Flickering links: bonds or signals whose alpha follows `vnoise(t)`.
- On night plates, much more motion: jiggle amplitude 10–15 px at speed 1.5–2.5, because small light shapes on dark carry less visible motion.
- **Dense beats sparse on night plates.** A crowd of 100+ small bodies packed into a patch, swirling slowly as a group, reads as a liquid and measures lively. Forty scattered bodies measured close to still. For clouds of particles, use two or three depth layers: near ones bigger, brighter and faster.
- **End cards and holds move too:** ripples spreading from the hero, orbiting specks, a slowly turning dashed ring.

**Targets.** `motion_check.py` measures the mean absolute change between drawings at 192×108.
- Aim for a median of at least 1.5 per drawing, and fewer than 5% of drawings below 0.5.
- The reference measures a median of 2.0 with 2% still drawings over the whole film (2.3 and 0% over its first two minutes). Its quietest seconds sit around 0.7–1.0.
- In the per-second profile, keep plates above about 1.2 between transitions.
- A plate that measures near zero between beats needs more life, not a faster transition.

## Beats enter and leave

Every stat, callout, card and myth has a start **and an end**. Wrap a component in `withAlpha(beat(t, t0, t1), () => …)`. `beat` eases in over 0.35 s and fades out over the last 0.4 s before `t1`; `t1 = null` means the beat stays.

- Text exits by fading, never by un-typing.
- Drawn objects may exit with `eraseOut(poly, p)`, where a paper-coloured scribble rubs them out.
- A plate longer than about 15 s is 2–3 sub-scenes joined by clears or by a `zoom` hand-off. It is not one picture that keeps accumulating.

## Timings (measured from the reference)

| Beat | Timing |
|---|---|
| Header after a **cut** | Title at +0.25 s, stage dial +0.25 s after that, journey log +0.35 s after the title |
| Header after any other transition | The title starts 0.3 s after the move *lands* (90% of its travel: `landAt(enter)`, about 0.6–0.85 × `dur` depending on its curve), not after its last creeping drawing |
| Header after a **lensOut** | The title starts immediately (the one exception, from the reference) |
| Anticipation before a lensIn | In the last 0.5 s a ring locks onto the hero (70 → 16 px) and fills with the next world's colour (automatic) |
| The transition itself | Never a snap. The lead-in starts 0.5 s before the cut and runs into the transition; the move itself follows the table's lengths and the speed limits below; the settle continues in the same direction. |
| Scene content after a transition | Already on screen (it came in with the transition). Stats, callouts and cards start at `landAt(enter) + 0.4` or later; a card frame that anchors the plate may open at `landAt(enter) + 0.2`. |
| Title type-on | Kicker at 30 chars/s; glyphs pop at 17 glyphs/s from +0.15 s; rule grows 0.35–1.1 s; subtitle from +0.7 s |
| Count-up | 1.3 s, ease-out cubic |
| Card | Outline, then fill, unfolding left to right over 0.4 s; its title types after it opens; content at 0.4–0.6 s |
| Callout | Anchor dot pops, the elbow leader draws on in 0.45 s, the title types from 0.35 s, the sub from 0.7 s |
| Group entrances | `stagger(i, t, { step: 0.05–0.12, dur: 0.4–0.5 })`. Use `E.outBack` for objects and `E.out3` for text. |
| New beat in a plate | Every 2–4 s. Plates run 10–25 s; the recap can run 45–60 s. |
| Title card | About 6 s. Frame lines draw on, the scene sweeps in, the sky element grows, the hero appears, and the camera pushes in 5% over the whole card. |
| Ambient motion | Something always moves slowly: drifting particles, flow streaks, rain, rotating reticle dashes, the boil. |

**Easing:**
- **Shape speed; don't just set length.** Arrivals and reveals (lensIn, lensOut, shape, roll, an iris opening, a zoom landing) use a fast-in, long-release curve: `E.arrive` (speed peaks at 30% of the move; 90% of the travel is done by 62%). Departures and ignitions (burn, an iris closing, a page lift) use `E.depart`. Where the speed limits bind (zooms), `E.arriveSoft` is asymmetric at the same peak as a sine. Moves that continue a moving camera start at its speed (`E.whip(v0)`, `E.inFrom(v0)`; `pan` does this itself). Symmetric `inOutSine` is for breathing cameras and dreamy dissolves only. A film where every seam has the same curve reads as uniformly slow, however long each one is.
- `E.shaped(a, pIn, pOut)` builds your own: speed peaks at `a` (below 0.5 an arrival, above it a departure); `pIn`/`pOut` set how sharp the attack and release are.
- `E.out3` for text and object arrivals, `E.outBack` for pops.
- `E.anticipate` for launches and exits, and `E.outElastic` for physical objects settling (never for text).
- Nothing moves linearly except flow and scrolling.

## Camera

Give a plate `cam: t => ({ x, y, s, dx, dy, rot })`. It moves the **scene only**: the paper, the HUD, the hero reticle and `overlay()` stay put. Plates without `cam` get the automatic drift.

| Move | When | Recipe |
|---|---|---|
| Breathing push-in | Default; any plate longer than 8 s | `s: 1 + 0.03–0.07 * E.inOutSine(t / dur)` |
| Crane / reveal | Title cards, "here is the place" | `s: kf(t, [[0, 1.14], [dur, 1]])` with `dy: kf(t, [[0, -70], [dur, 0]])` |
| Recap pull-out | Recap plates | Hard cut in close, then `s: kf(t, [[0, 1.6], [3, 1], [dur, 1.06]])`, keeping a slow drift after the pull |
| Follow pan | The hero travels further than the frame | Draw the world wider than the frame, and set `dx: -softClamp(heroX(t - 0.4) - 820, 0, WORLD - W, 260)` (lags the hero by 0.4 s; the soft limits ease the camera in and out instead of starting and stopping dead). Or use `follow()`, which averages the subject over its lag so jitter never reaches the camera. Add layers with `parallax(cam, depth, fn)`: sky 0.1–0.2, far hills 0.5, ground 1. |
| Slow turn | Night plates, "inside" views | `rot: 0.04–0.08 * Math.sin(t * 0.35)` about the hero |
| Fall / climb | Something falls or rises | Keep the hero near the centre and scroll the world past it (`ctx.translate(0, -700 * fall)` on layers), with `flow` streaks in the opposite direction |

- Put text that must not move with the camera (stats, callouts, cards, charts, the title-card type) in `overlay(t)`. Overlay art also ignores momentum and the match-cut/carry shift, so a card never slides toward the frame edge before a lens or zoom; it only moves with its plate's transition. Text anchored to scene positions (labels on a map) belongs in `draw(t)`, where it moves with the scene.
- To anchor a callout to a moving hero, read `heroOf(plate, t)`, which returns screen coordinates.

## Transitions

Every transition is a pure function of progress `p`. Transitions, and the half second on either side of them, render **on ones** (24 drawings a second) so scale and mask steps stay small; the line boil stays on twos. A plate can ask for ones during its own fast camera move with `ones: t => bool`. Zooms interpolate scale geometrically with `zlerp`, so the speed never seems to stall or rush. Masks (lens, window, iris) ease their **edge**, which is what the eye follows; easing their area instead makes them pop open in the first drawings.

### Speed limits

A transition must never snap or pop. Between two consecutive drawings:

- scale changes by at most 5% (10% while motion-blurred);
- a pan or scroll moves at most 40 px (250 px while motion-blurred, as `pan` is);
- a mask edge (lens, window, iris, wipe front, crease) moves at most 90 px in its first and last three drawings, and 200 px at its peak;
- nothing holds still and then jumps: no drawing changes more than 2.5× the drawing before it, except at a hard cut.

A transition that cannot meet these at its ratio is redesigned (a smaller ratio, a colour or mask hand-off, blur), never sped up. `motion_check.py` measures them after a render: `spikes` marks `SNAP` where a non-cut transition changes too much per drawing (any drawing above 75, or two in a row above 55), `pops` lists drawings where a lot of the frame changes at once from near rest (something appeared instead of growing in), and `jerks` lists drawings that change far more than the one before. A SNAP at a non-cut seam fails review. Pops and jerks are leads, not verdicts: render every drawing around each one and look (a whip pan or a high-contrast sweep can trip them honestly; a camera that bobs, a colour that switches or a mask that jumps cannot). Before shortening a transition below its default, render it and check those lines.

**`speed_check.mjs`** measures the same limits without a render, straight from the page's own transition and camera values (`toolkit/speed_check.mjs film.html`): a camera-scale ratio, a mask/edge travel in px, and a sheet pan in px, per seam, plus each plate's own camera across its life and its speed just before and after every cut. It marks a seam `ok`, `FAST` (past the limits above, a warning — a film may run faster than the default on purpose, see "Pace is a choice") or `SNAP` (would visibly snap; the only failure, exit code 1). Run it alongside `motion_check.py`: this script catches a seam before it's rendered and points at which quantity (scale, pan, which mask) is the problem; `motion_check.py` is still the ground truth on the actual pixels once a render exists.

**Minimum lengths.** lensIn and lensOut 1.4 s (dive ≤ 2×), zoom 1.9 s at `k` 4 (2.15 s at `k` 5), through 1.6 s, shape 1.3 s, iris 1.4 s, pan 0.8 s, wipe 0.8 s, bleed 1.5 s, burn 1.4 s, page 1.6 s, roll 1.3 s, fade 1.0 s.

**Holds.** After any transition the new plate holds with ambient motion only: no header, stat, callout or card before the move has landed (`landAt(enter) + 0.3`–`0.4`; a card frame that anchors the plate may open at `landAt(enter) + 0.2`). Don't wait for the last creeping drawings: the release is part of the hold. One idea at a time: the eye lands, then reads.

**Continuity across the cut.** The engine's momentum keeps one direction: the old plate's lead-in accelerates into the cut and runs half a second into the transition; after a push-in (lensIn, shape, iris, cut, zoom in) the new plate keeps easing in (to 1.03), and after anything else it arrives slightly enlarged and eases out to 1. The scale never reverses at the hand-off.

**Cameras.** No camera starts or stops in fewer than 6 drawings (0.5 s), and none bobs back and forth: use `curve` with an easing, `softClamp` for limits (never a hard `clamp` on a camera), and `follow()` for tracking (it smooths the subject and its lead room over the last second, so a subject that moves in stops and starts still gets a gliding camera).

**Rhythm.** Consecutive seams differ in verb (scale, travel, mood), by at least 0.4 s in length, and in speed shape: a film has at least one snap (speed peak in the first third, under 1.2 s) and one slow breath (2 s or more), and never three seams with the same curve in a row. A film has at least one cut or pan. A push-in at one seam is not answered by a pull-out on the same subject at the next: hand off to travel (a pan, a follow) instead.

Choose a transition by what the cut means. If `dur` is left out, each type gets the length in the table (`DEFAULT_DUR` in the engine).

| Type | Use when | What happens | Dur | Sound |
|---|---|---|---|---|
| `lensIn` | Down the scale ladder into a **different world** (paper → night) | A ring locks onto the hero, then the old scene dives 2× at it while a lens snaps open (fast attack, long release; edge eased) with the new world growing inside, a beat behind the ring; a bare hold before the title. Options: `dive`, `scaleFrom`. | 1.6 s (1.4–2.0) | swell up |
| `lensOut` | Up the scale ladder (night → paper) | The old world shrinks into a lens that travels to the new hero, while the new world pulls back from 2× into place. | 1.6 s (1.4–2.0) | swell down |
| `zoom` | One step on the scale ladder **within the same world** | Both plates pivot on the hero on an asymmetric ramp; the old scale shrinks (or grows) by `k` and fades while the new grows in; the HUD crossfades. A plate shrunk below full size is seen through a soft disc, so its world's edges never show. `dir` 'out' or 'in', `k` 3–5 (default 3.5; keep under 5% per drawing: k 4 needs 1.9 s, k 5 needs 2.15 s). | 1.9 s (1.9–2.4) | glide |
| `shape` (alias `morph`) | Match cut: **one object becomes another** | The object morphs from `from(prev, pt)` to `to(pl, t)` (closed outlines) while a circular window centred on it opens onto the new world. The outline's fill blends from the old object's colour to the new one's (sampled automatically, or set `fromFill` / `toFill`) and fades onto the real object at the end; `style(e)` can override fill and width (blend colours with `mixColor`; a colour that switches at a threshold pops). Plates skip their own copy while `S.morph` is true. | 1.4 s (1.3–1.8) | bend + swell |
| `pan` | Same scale, **somewhere else along the journey** (downstream, next room) | Whip pan along one long sheet: both plates slide (`dir` 'left', 'right', 'up', 'down'), motion-blurred at speed, a faint fold shadow at the join, speed lines at full speed. The corner labels travel with the sheet. | 0.8 s (0.8–1.2) | whoosh |
| `wipe` | A reveal with a direction | A curved inked front sweeps across (`dir` 'lr', 'rl', 'tb'), with spray ahead; the new plate slides in slightly behind it. | 1.0 s | whoosh |
| `bleed` | Time passing, a change of mood, "meanwhile underground" | An ink drop falls onto the new hero (or `at: [x, y]`), squashes on impact and splats: a round blot, splash chains and specks spread and pool together, revealing the new plate, with ink pooled at the edge. The splat bursts on impact and spreads more slowly as it pools. Options: `ink` (drop colour), `drop` (size), `fall` (share of the time spent falling, default 0.22), `rim`, `rimAlpha`. | 1.6 s | soft swell |
| `burn` | Destruction, an ending, "the old idea goes up in smoke" | The old page chars from its hero (or `at`) outward: scorch, char, a flickering ember edge, then holes onto the new plate, with ash lifting off the front. Option: `rough`. | 1.4 s | crackle |
| `iris` | A same-scale jump that needs a blink | A see-through ink curtain closes on the old hero to a dot; the dot travels on a shallow arc to the new hero (the scenes crossfade dimly behind it) and the curtain opens there. Options: `color`, `opacity` (default 0.8). | 1.6 s | shutter |
| `hatch` | Dreamy dissolve into a memory or a hypothetical | The new plate appears through pen strokes that thicken until they merge. | 1.2 s | hiss |
| `page` | A chapter break: turning to the next part of the notebook | Page turn: a bottom corner lifts and is dragged across (`dir` 'left' moves the right corner leftward, the default; 'right' the reverse), the page folds along a crease that crosses the frame at an even, eased pace, and slides off. The back of the turning page takes the new page's look, so the new world curls into view (`back: 'old'` keeps the old page's look, with its print showing through). The old corner labels fade in place. | 1.6 s | flick |
| `roll` | A clean reset: into the recap or the end card | The old page rolls up from the bottom edge like a window blind or projector screen (inked roll, shadow below), revealing the new page. The old corner labels fade in place. Option: `radius`. | 1.3 s | flick + thump |
| `cut` | Same scale, new place, with a hard edit | Match cut: the new plate opens shifted so its hero sits where the old hero was (`match`, default 0.6 of the way), holds a beat, then eases home over `settle` s. The old plate leans in 3% beforehand; the header follows 0.25 s later. `match: 0` gives a plain hard cut. Any other transition can take `match` too. | 0 | riser + thump |
| `through` | Going **into a surface**: a screen, a window, a pool of colour. Not for one object becoming another (that reads as a jarring zoom in and out; write a custom morph instead). | One plunge: the camera accelerates a little into an object in the old plate (`dive`, 1.6×) while the object's colour spreads over the frame; the colour turns in a few drawings; then the field snaps back onto an object in the new plate (fast attack, long release) as that plate settles from `rise` (1.4×) to 1. The new object starts where the old one was and glides home. `from` / `to`: `{ at: [x, y], r }` in scene coordinates, or `(plate, t) => …`; `fromFill` / `toFill` set the colours (set them when the anchor point sits on detail such as a spot or seam). | 1.8 s (1.6–2.4) | glide up, glide down |
| `fade` | The end card only | Crossfade. | 1.0 s | none |

## Pacing a transition

Every transition's pace is yours to set. `dur` sets its length, and one of these reshapes its timing:

- **`ease`:** the easing for the whole transition, e.g. `ease: 'inOutSine'` (slow in and out), `'outBounce'` (lands with bounces), `'inBack'` (pulls back before going), `'outExpo'` (fast start, long settle). On presets with one main easing (lensIn, lensOut, zoom, pan, wipe, bleed, burn, page, roll, shape, hatch, fade) it **replaces** that easing; on iris, through and custom transitions it reshapes the clock. Presets already shape their speed, so leave `ease` out unless you want a different feel (for example a heavier arrival: `ease: E.shaped(0.4, 2, 4)`, with `land: 0.7` so titles wait for it). A transition that feels rushed usually has its peak too early or its release too short: fix the shape (a longer release, a smaller ratio, blur) before adding length. Lengthening a symmetric ease only makes it uniformly slower.
- **`curve`:** keyframes from clock to progress, with holds and a different easing per segment. `[[0, 0], [0.3, 0.45, 'out3'], [0.6, 0.55, 'lin'], [1, 1, 'inOut3']]` rushes to the middle, lingers there, then finishes smoothly. Repeat a value to hold it.
- **Easings (`E`):** `lin`, `in2`, `in3`, `in5`, `out2`, `out3`, `out5`, `inOut2`, `inOut3`, `inOut5`, `inSine`, `outSine`, `inOutSine`, `inExpo`, `outExpo`, `inOutExpo`, `inBack`, `outBack`, `outBack2`, `inOutBack`, `anticipate`, `outElastic`, `outBounce`, `hold`, the shaped curves `arrive`, `arriveSoft`, `depart`, and the factories `E.spring(k)` (a settle with k overshoots), `E.shaped(a, pIn, pOut)`, `E.ramp(a, r)`, `E.whip(v0)`, `E.inFrom(v0)`. A factory named as a string (`ease: 'shaped'`) uses its defaults.
- **Limits:** `curve` always reshapes the clock, on top of the preset's own easing, so give presets a `curve` that is mostly linear with holds, or use `ease` instead. Built-in transitions clamp progress to 0..1, so overshooting easings flatten at the ends there. Inside a custom transition, `S.trans.raw` is the unshaped clock, and `curve(t, keys, { geo: true })` shapes any value you like: zoom scales (geometric, so zooms never rush), positions, colours, alphas.
- **Pace the plates around it.** A long or slow seam eats into the next plate's opening, so delay that plate's own action and beats by about the extra time.

## Writing your own transition

The built-in types are presets. When a seam matters, write it in the story: give the plate `enter: { type: 'custom', dur, draw: (p, X) => share }`. `draw` is called for every drawing of the transition with progress `p` (0..1) and must return the share of the frame the new plate owns (for the vignettes). Everything else about it is up to you.

- **`X`:** `drawOld()`, `drawNew()`, `drawOldX(o)`, `drawNewX(o)` (options `xf`, `hud`, `bg`, `all`, `hudOnly`), `prev` and `pl` (the plates), `pt` and `t` (their local times), `focusOld`, `focusNew`, `darkOld`, `darkNew`, `tr`, `seed`.
- **Knowing your role:** while a plate is drawn inside a transition, `S.trans` is `{ type, p }` and `S.side` is `'old'` or `'new'`. Use them to hide the object your transition is animating (the demo's pencil hides its eraser, the garden hides its ladybug until the hand-off).
- **Building blocks:**
  - `morphPose(A, B, u, poseA, poseB)`: morph two outlines drawn in their own local frames while position, rotation and size blend too, so one object turns into another without collapsing.
  - `softReveal(fn, x, y, r, feather)`: draw the new plate inside a soft circle growing from a point, a dissolve centred on the action.
  - `morph`, `mixColor`, `about`, `camPoint`, `layer`, `clipHalf`, `withAlpha`, and any drawing helper from your story (grow the new object's details in with its own drawing function).
- **Hand-off:** at the end, the object you animated must match what the new plate draws (same place, turn, size and colour). Fade your version out over the last 10–15% while the plate's own copy fades in. For camera moves, end the transition on the plate's own opening camera (a close-up, if the plate starts close) and let the plate's camera carry on, instead of resetting to zoom 1.
- **Tracking:** `follow(target, t, { s, lead, lag })` returns a camera that travels with a moving subject and leaves lead room ahead of it; give `s` a `curve` to pull back while travelling.
- **Other options:** `carry: false` and `momentum: false` when your transition places things exactly; `sfx: (ac, out, t, dur) => …` for its sound.
- **Examples:** `toolkit/story_seams.js` has two designs for the same seam. `eraserToBug` morphs the eraser into the ladybug; `eraserToBugMacro` sinks into the red eraser until red fills the screen, lets black spots bloom, then pulls back slowly to the ladybug, holds, and pulls back again to the garden, with every phase paced by a `curve`. Set `SEAM` at the top of the file to switch.
- **Judge it moving.** Render the seam as a clip and watch it at full speed. A transition can line up perfectly frame by frame and still feel forced; ask whether it reads as one continuous thing.

**Rules:**
- **Pick by meaning:**
  - between worlds, `lensIn` and `lensOut`;
  - within a world, `zoom`;
  - an object that persists across the cut, `shape`;
  - moving along the journey, `pan`;
  - time passing, `bleed`;
  - one object becoming another, a custom morph (or `shape` for simple outlines); going into a surface, `through`.
  - Better still, design the seam first (`references/writing.md`, "Designing the seams") and let the link choose the type.
- Use 4–6 types per film, and never the same one three times in a row.
- **Motion carries across the seam.** When the old plate's hero (or camera pan) is still moving at the cut, the new plate enters travelling the same way and eases to rest (`enter.carry`, seconds, default 0.35; `false` turns it off). It is off for `pan`, `page`, `roll`, `fade`, `through` and `shape`.
- **Pans follow the action.** `pan` with no `dir` (or `dir: 'auto'`) keeps the camera travelling the way it was, whether it was chasing a moving hero or panning on its own; it falls back to `'left'` when nothing is moving.
- **Momentum** is automatic (`LEAD` and `SETTLE` in the engine). Set `enter.momentum: false` to turn it off, or `enter.settle` (seconds) to change the settle length. Momentum scales only upward, because scenes bleed past the frame edges only when enlarged.
- The engine plays a 0.35 s riser before every transition except `fade`, and ducks the music bed under it.
- **Inset lens** (`insetLens()`) is not a transition. It is a magnifier bubble tied to an object by two tangent lines, showing a close-up. The close-up stays at full size while the circle opens around it.
- **New transitions** go in `TRANS[type](p, X)`, returning the share of the frame the new plate owns. Give each a `HEADER_DELAY`, `TRANS_SFX` and, if it zooms, `LEAD`/`SETTLE` entries. Test it in the reel before using it in a film.
