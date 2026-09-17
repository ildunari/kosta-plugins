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

**Targets.** `motion_check.py` measures the mean absolute change between drawings at 192×108.
- Aim for a median of at least 1.5 per drawing, and fewer than 5% of drawings below 0.5.
- The reference measures a median of 2.0 with 2% still drawings over the whole film (2.3 and 0% over its first two minutes). Its quietest stretches still sit around 0.7–1.0 per second.
- A plate that measures near zero between beats needs more life, not a faster transition.

## Beats enter and leave

Every stat, callout, card and myth has a start **and an end**. Wrap a component in `withAlpha(beat(t, t0, t1), () => …)`. `beat` eases in over 0.35 s and fades out over the last 0.3 s before `t1`; `t1 = null` means the beat stays.

- Text exits by fading, never by un-typing.
- Drawn objects may exit with `eraseOut(poly, p)`, where a paper-coloured scribble rubs them out.
- A plate longer than about 15 s is 2–3 sub-scenes joined by clears or by a `zoom` hand-off. It is not one picture that keeps accumulating.

## Timings (measured from the reference)

| Beat | Timing |
|---|---|
| Header after a **cut** | Title at +0.25 s, stage dial +0.25 s after that, journey log +0.35 s after the title |
| Header after a **lensIn** | The new scene sits bare for 0.4 s after the lens finishes, then the title |
| Header after a **lensOut** | The title starts immediately |
| Anticipation before a lensIn | 0.2 s before the cut, a 16 px dot in the next world's colour pops onto the hero (automatic) |
| The transition itself | A snap: about 2 drawings of lead-in, a 0.25–0.35 s burst, a short settle. Zooms use `E.inOut5` and `zlerp` (equal ratios per drawing). |
| Scene content after a lens | Already on screen, or arriving within 0.1–0.6 s. Never leave the new world empty for a second. |
| Title type-on | Kicker at 30 chars/s; glyphs pop at 17 glyphs/s from +0.15 s; rule grows 0.35–1.1 s; subtitle from +0.7 s |
| Count-up | 1.3 s, ease-out cubic |
| Card | Outline, then fill, unfolding left to right over 0.4 s; its title types after it opens; content at 0.4–0.6 s |
| Callout | Anchor dot pops, the elbow leader draws on in 0.45 s, the title types from 0.35 s, the sub from 0.7 s |
| Group entrances | `stagger(i, t, { step: 0.05–0.12, dur: 0.4–0.5 })`. Use `E.outBack` for objects and `E.out3` for text. |
| New beat in a plate | Every 2–4 s. Plates run 10–25 s; the recap can run 45–60 s. |
| Title card | About 6 s. Frame lines draw on, the scene sweeps in, the sky element grows, the hero appears, and the camera pushes in 5% over the whole card. |
| Ambient motion | Something always moves slowly: drifting particles, flow streaks, rain, rotating reticle dashes, the boil. |

**Easing:**
- `E.out3` for arrivals, `E.inOut3` for travel and transitions, `E.outBack` for pops.
- `E.anticipate` for launches and exits, and `E.outElastic` for physical objects settling (never for text).
- Nothing moves linearly except flow and scrolling.

## Camera

Give a plate `cam: t => ({ x, y, s, dx, dy, rot })`. It moves the **scene only**: the paper, the HUD, the hero reticle and `overlay()` stay put. Plates without `cam` get the automatic drift.

| Move | When | Recipe |
|---|---|---|
| Breathing push-in | Default; any plate longer than 8 s | `s: 1 + 0.03–0.07 * E.inOutSine(t / dur)` |
| Crane / reveal | Title cards, "here is the place" | `s: kf(t, [[0, 1.14], [dur, 1]])` with `dy: kf(t, [[0, -70], [dur, 0]])` |
| Recap pull-out | Recap plates | Hard cut in close, then `s: kf(t, [[0, 1.6], [3, 1], [dur, 1.06]])`, keeping a slow drift after the pull |
| Follow pan | The hero travels further than the frame | Draw the world wider than the frame, and set `dx: -clamp(heroX(t - 0.4) - 820, 0, WORLD - W)` (lags the hero by 0.4 s). Add layers with `parallax(cam, depth, fn)`: sky 0.1–0.2, far hills 0.5, ground 1. |
| Slow turn | Night plates, "inside" views | `rot: 0.04–0.08 * Math.sin(t * 0.35)` about the hero |
| Fall / climb | Something falls or rises | Keep the hero near the centre and scroll the world past it (`ctx.translate(0, -700 * fall)` on layers), with `flow` streaks in the opposite direction |

- Put text that must not move with the camera (stats, callouts, the title-card type) in `overlay(t)`.
- To anchor a callout to a moving hero, read `heroOf(plate, t)`, which returns screen coordinates.

## Transitions

Every transition is a pure function of progress `p`, animated on twos. Zooms interpolate scale geometrically with `zlerp`, so the speed never seems to stall or rush. Choose a transition by what the cut means. If `dur` is left out, each type gets the length in the table (`DEFAULT_DUR` in the engine).

| Type | Use when | What happens | Dur | Sound |
|---|---|---|---|---|
| `lensIn` | Down the scale ladder into a **different world** (paper → night) | Anticipation dot, then the old scene dives 2.4× at the hero while a lens opens on it with the new world growing inside; 0.4 s bare hold before the title. Options: `dive`, `scaleFrom`. | 0.5–0.6 s | swell up |
| `lensOut` | Up the scale ladder (night → paper) | The old world shrinks into a lens that travels to the new hero, while the new world pulls back from 2.4× into place. | 0.5–0.6 s | swell down |
| `zoom` | One step on the scale ladder **within the same world** | Both plates pivot on the hero; the old scale shrinks (or grows) by `k` and fades while the new grows in; the HUD crossfades. `dir` 'out' or 'in', `k` 6–10. | 0.7–0.9 s | glide |
| `shape` (alias `morph`) | Match cut: **one object becomes another** | The object morphs from `from(prev, pt)` to `to(pl, t)` (closed outlines) while a circular window centred on it opens onto the new world. The outline's fill blends from the old object's colour to the new one's (sampled automatically, or set `fromFill` / `toFill`) and fades onto the real object at the end; `style(e)` can override fill and width. Plates skip their own copy while `S.morph` is true. | 1.1 s | bend + swell |
| `pan` | Same scale, **somewhere else along the journey** (downstream, next room) | Whip pan along one long sheet: both plates slide (`dir` 'left', 'right', 'up', 'down'), motion-blurred at speed, a faint fold shadow at the join, speed lines at full speed. The corner labels travel with the sheet. | 0.8–1.0 s | whoosh |
| `wipe` | A reveal with a direction | A curved inked front sweeps across (`dir` 'lr', 'rl', 'tb'), with spray ahead; the new plate slides in slightly behind it. | 0.6–0.8 s | whoosh |
| `bleed` | Time passing, a change of mood, "meanwhile underground" | An ink drop falls onto the new hero (or `at: [x, y]`) and splats: a round blot, splash chains and specks spread and pool together, revealing the new plate, with ink pooled at the edge. Screen area is covered at an even rate. Options: `ink` (drop colour), `drop` (size), `fall` (share of the time spent falling), `rim`, `rimAlpha`. | 1.5 s | soft swell |
| `burn` | Destruction, an ending, "the old idea goes up in smoke" | The old page chars from its hero (or `at`) outward: scorch, char, a flickering ember edge, then holes onto the new plate, with ash lifting off the front. Option: `rough`. | 1.3–1.6 s | crackle |
| `iris` | A same-scale jump that needs a blink | A see-through ink curtain closes on the old hero to a dot; the dot travels to the new hero (the scenes crossfade dimly behind it) and the curtain opens there. Options: `color`, `opacity` (default 0.8). | 0.9 s | shutter |
| `hatch` | Dreamy dissolve into a memory or a hypothetical | The new plate appears through pen strokes that thicken until they merge. | 0.7 s | hiss |
| `page` | A chapter break: turning to the next part of the notebook | Page turn: the bottom-right corner lifts and is dragged across, the page folds along a moving crease showing its back (curl shading, print showing through), and slides off to the left over the new page. The old corner labels fade in place. | 1.2 s | flick |
| `roll` | A clean reset: into the recap or the end card | The old page rolls up from the bottom edge like a window blind or projector screen (inked roll, shadow below), revealing the new page. The old corner labels fade in place. Option: `radius`. | 1.0 s | flick + thump |
| `cut` | Same scale, new place, with a hard edit | Match cut: the new plate opens shifted so its hero sits where the old hero was (`match`, default 0.6 of the way), holds a beat, then eases home over `settle` s. The old plate leans in 3% beforehand; the header follows 0.25 s later. `match: 0` gives a plain hard cut. Any other transition can take `match` too. | 0 | riser + thump |
| `fade` | The end card only | Crossfade. | 0.8 s | none |

**Rules:**
- **Pick by meaning:**
  - between worlds, `lensIn` and `lensOut`;
  - within a world, `zoom`;
  - an object that persists across the cut, `shape`;
  - moving along the journey, `pan`;
  - time passing, `bleed`.
- Use 4–6 types per film, and never the same one three times in a row.
- **Momentum** is automatic (`LEAD` and `SETTLE` in the engine). Set `enter.momentum: false` to turn it off, or `enter.settle` (seconds) to change the settle length. Momentum scales only upward, because scenes bleed past the frame edges only when enlarged.
- The engine plays a 0.35 s riser before every transition except `fade`, and ducks the music bed under it.
- **Inset lens** (`insetLens()`) is not a transition. It is a magnifier bubble tied to an object by two tangent lines, showing a close-up. The close-up stays at full size while the circle opens around it.
- **New transitions** go in `TRANS[type](p, X)`, returning the share of the frame the new plate owns. Give each a `HEADER_DELAY`, `TRANS_SFX` and, if it zooms, `LEAD`/`SETTLE` entries. Test it in the reel before using it in a film.
