# 3DLight: motion

How time works in a 3DLight film, how beats join, and how to pace the art. For the general craft of motion inside a scene (overlap, follow-through, staggers, arcs), see `../doodle-draw/references/animation-principles.md`; this file covers what is specific to 3DLight.

## Two clocks

- **Screen time** `T`: seconds of the video, 0 to `LEN`. `drawFrame(T)` takes it.
- **Art time** `t`: seconds inside one beat, 0 to `art`. A beat's `draw(t, P)` takes it.

A beat lasts `beat` screen seconds (default 4.5) and `art` art seconds (default 6). So art time runs `K = art / beat = 1.333` times faster than the clock. Write motion in art time, at a calm pace; it plays brisker.

For a frame at screen time T: beat `i = floor(T / beat)`, and `t = (T - i x beat) x K`.

| Film | `art` | `beat` | K | 10 beats |
|---|---|---|---|---|
| Booth loop (default) | 6 | 4.5 | 1.333 | 45 s |
| Calmer explainer | 6 | 6 | 1 | 60 s |
| Poster that moves | 8 | 8 | 1 | one beat, 8 s |

The sound uses the other ratio: in `cues`, `U.K = beat / art = 0.75` screen seconds per art second, and `U.S(x)` turns art time x (from the film start) into a time in the render (`references/sound.md`).

## Inside a beat

Timings are in art time, for the default 6 s beat. Scale them for other lengths.

| Art time | What happens |
|---|---|
| 0 to 0.7 | The dissolve from the previous beat (below). The new art is already moving underneath. |
| 0 to 0.3 | The old headline block fades out. |
| 0.22 to 1.6 | The new text rises in, 26 px, line by line (below). |
| 0.5 to 4 | **The main move**: the one thing this beat shows happening. |
| 0.9 to 1.5 | The note fades in. |
| after the move | Labels on the art fade in over about 0.4 s once their object is in place, and stay. |
| 4 to 6 | **The living hold**: the picture is settled and readable, but not frozen. |

Text entrance, in art time from the start of the beat (the engine does this; it is listed so the art can leave room):

- headline line n: rises and fades in from `0.22 + 0.1 n`, over 0.55 s (ease-out);
- sub: from `0.22 + 0.1 x lines + 0.15`, each further line 0.08 later;
- stat value: 0.25 after the sub's start, over 0.7 s, rising 36 px; its label 0.2 after that;
- card: accent bar and name with the sub, the second line 0.15 later;
- credit: fades out over 0.4 s on a card beat and back in from 0.3 to 0.8 in the beat after;
- kicker: never moves; beat ticks: the active tick fills across the beat.

## Pacing

- **One main move per beat.** It starts after the headline has begun (about 0.5) and ends by about 4. Secondary motions overlap it and hand off to each other; nothing stops dead while the next thing starts from rest.
- **The living hold.** After the main move, keep at least one quiet motion: a float of a few pixels (`6 * Math.sin(t * 0.9)`), specks drifting, a flow along a path, a slow turn. Small amplitude, slow, continuous.
- **Eased, not bouncy.** `seg` (smoothstep) for moves, `eo` (ease-out) for arrivals, `segL` (linear) only for constant flow. No overshoot, bounce, wobble, camera shake, sparkles, flashes or glow pulses.
- **Nothing new after about 4.5 art seconds.** Viewers need the hold to read. A label that appears at 5.5 is a label nobody reads.
- **Calm beats about 4.5 s.** A beat with a stat and a two-line sub may need `beat: 5` or a shorter sub. Don't push the main move into the dissolve of the next beat.

## Joining beats: the dissolve

During the first `dissolve` art seconds of beat i (0.7, which is 0.525 s on screen), the frame fades with a smoothstep from beat i-1's **end picture** (its art at t = `art`, drawn once and cached) to beat i's live art.

- Beat i-1's art is only ever shown up to t = `art`. Make t = `art` a finished, calm picture, not the middle of a move.
- `dissolve: 0` cuts instead. Use it for a one-beat poster.
- In a film that plays once (`loop: false`), beat 1 fades in from the bare ground and has no old text to fade out.

## Continuity

When the script says one thing becomes the next (pills shrink into crystals, a capsule lands and opens, a protein drifts into the gut), make beat i+1's art at t = 0 start exactly where beat i's art ended: the same object, at the same place, the same size. The dissolve then blends two nearly identical pictures and reads as one continuous shot.

- Put shared positions and sizes in constants at the top of the story (`const TAB = { cx: 1390, cy: 470, ... }`) and use them in both beats.
- Do a transformation (a morph, a zoom into a porthole) inside one beat, not across the dissolve.
- Where there is no link, a clean dissolve to a new picture is fine. Say which in the script's continuity list.

## The loop rule

In a loop, the video repeats with no seam if **the last beat's art at t = `art` is identical to the first beat's art at t = 0**. Beat 1 then dissolves from a picture equal to its own opening.

- Usually the last beat is the card (the lab or brand card) and it rebuilds beat 1's opening picture: the object fades or settles back in and is still by t = `art`.
- Any hold motion in the last beat must reach exactly beat 1's starting pose at t = `art` (for example, a float `sin(t * w)` that is 0 at both ends, or no float at the end).
- `smoke_test.mjs` draws both pictures (art only, no text) and fails when they differ by more than an ordinary frame-to-frame step. The booth loops measure 0.000. `node render.mjs film.html --seam` shows the last 3 s and the first 2.5 s.

## Determinism and speed

- The picture depends only on t. No `Math.random` (use `rng(seed)`), `Date`, `performance.now`, timers, async work or state kept between calls.
- Precompute layouts (positions, paths, random offsets) at load time, outside `draw`.
- Cache static parts in an offscreen canvas made once (the starter's `once(key, fn)` and `blit(c, a)`), never a new canvas per frame, and never a cached picture that depends on t.
- Keep a frame under about 250 ms; the booth loops take 60 to 75 ms. `X.filter = 'blur(...)'`, `L.layer()` and `L.cshadow()` are the slow calls; draw many shadows into a cached sprite.
- A 45 s loop at 30 fps (1350 frames) renders in about a minute on four cores.

## Checking motion

You cannot watch the video, so look at frames.

- `node render.mjs film.html --strip N`: beat N at 8 moments (art 0, 0.35, 0.8, 1.5, 2.5, 3.5, 4.75, 5.99, scaled to `art`), from its dissolve to its end picture.
- `node render.mjs film.html --sheet`: each beat's held picture, for the film as a whole.
- `node render.mjs film.html --seam`: the loop seam.
- `node render.mjs film.html --stills 12.2,12.5`: single frames, for a close look.

Read every strip: the motion reads in order, nothing jumps between neighbouring moments, labels never collide with moving objects, and the end picture is clean.
