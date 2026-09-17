# Engine API

Everything a story can call. The engine lives in `toolkit/engine.js`; read that file when a detail is missing here.

**Story.** Call `defineStory({ title, stages, music, twos, weave, grain, drift, plates })`, then `boot()`.

Plate fields:

| Field | Meaning |
|---|---|
| `dur` | Plate length in seconds |
| `dark` | `true` for the night world |
| `enter` | `{ type, dur, ease, curve, draw (custom transition), momentum, settle, match, carry, sfx, …type options (dir, k, dive, scaleFrom, from, to, fromFill, toFill, style, at, ink, drop, fall, rim, rimAlpha, rough, color, opacity, back, radius) }` |
| `header` | `{ num, title, sub }` |
| `log` | `t => ({ title, rows: [[label, value]], states, state })` |
| `stage` | `{ n, name, prevN }` |
| `hero` | `t => ({ x, y, label, r, tag, alpha })` |
| `focus` | `t => [x, y]` in screen coordinates, for plates without a hero |
| `cam` | `t => ({ x, y, s, dx, dy, rot })`, or `t => follow(target, t, { s, lead, lag, anchor })` to track a moving subject |
| `drift` | Override the automatic push-in (a fraction, or `false`) |
| `draw(t)` | The scene |
| `overlay(t)` | Art that ignores the camera, momentum and the match-cut/carry shift (stats, callouts, cards, charts). It still leaves with its plate during a transition. Anchor to the hero with `heroOf(plate, t)`. |
| `cues` | `[[t, name, opts]]` |
| `bed` | `(ac, out, t0, dur) => …` |
| `counter`, `marks` | `false` hides the frame counter or the registration marks |

`draw(t)` receives local seconds. During the next plate's transition, `t` runs past `dur`, so clamp your animations.

**Timing:**
- `inv(a, b, t)`: 0..1 progress inside a window.
- `kf(t, [[t0, v0], …], ease)`: keyframed numbers or `[x, y]` points.
- `beat(t, t0, t1)`, `stagger(i, t, opts)`, `withAlpha(a, fn)`, `readTime(s)`.
- `E.*` easings (list in `references/motion.md`, "Pacing a transition"), `easeOf(nameOrFn)`, plus `clamp`, `lerp` and `zlerp(a, b, e)` (geometric, for scales).
- `curve(t, [[t, value, ease?], …], { geo })`: keyframes with a different easing per segment and holds; values may be numbers or arrays.
- Motion: `wander(i, t, amp, speed, seed)`, `flow(path, t, { speed, gap, len, color, w, alpha })`, `subpath(path, a, b)`, `vnoise`, `vnoise2`.

**Geometry** (functions return point arrays):
- `shape.circle`, `ellipse`, `blob(cx, cy, r, seed, irregularity)`, `rect`, `arc`, `cloud`, `ridge(x0, x1, y, amp, seed)`, `band(ridge, yBottom)`, `between(top, bottom)`.
- Path tools: `along`, `partial`, `resample`, `smooth`, `morph(A, B, u)`, `gather(targets, t, opts)`.

**Lines and textures:**
- `pen(pts, { w, taper, pressure, draw, … })`.
- `ink(pts, { closed, w, color, fill, fillAlpha, fillReveal: 'sweep', double, amp, seed, draw, alpha, dash })`.
- Fills and textures: `flat`, `hatch`, `shade`, `crosshatch`, `speckle`, `stipple`, `scribble`, `pebbles`, `grass`, `lobedCloud`, `eraseOut`.
- Arrows and paths: `arrowHead`, `arrowPath`, `fluxArrow`, `journeyPath`, `textOnPath`.

**Text:**
- `text(s, x, y, { kind: 'display'|'sans'|'mono', size, weight, italic, color, align, ls })`.
- `typed(s, t, cps)`.
- `dropText(s, x, y, t, opts)`: left-aligned only; for centred text, start at `cx - measure(s) / 2`.
- `countUp(to, t, dur, decimals)`, plus `fmt`, `ROMAN`, `SUB`, `SUP`.

**Kit components:** `KIT.<kit>.<name>(t, { x, y, s, rot, draw, alpha, seed, dark, … })`; the catalogue is `references/components.md`.

**Components:**
- `stat`, `callout`, `reticle`, `card` (returns 0 until open), `logRuler`, `lineChart` (returns `{ X, Y, ends }`), `insetLens`.
- `callout` turns its leader around at the elbow (and slides its text in) when the text would leave the frame; the hero tag does the same near the right edge.
- `card`: a title wider than the card shrinks to fit, and a figure label that would collide moves to the bottom-right corner.
- `lineChart` series: `{ pts, color, w, draw (0..1, default 1), label }`; the label appears at the line's end as it finishes. Charts and rulers draw nothing before their local `t` reaches 0.
- `insetLens` picks its ring and label ink from the plate it sits on (`S.dark`); its own `dark` option is the lens interior.
- Put these in `overlay(t)` when they should hold still, and in `draw(t)` when they belong to the world (a chart on a wall), where they zoom and pan with the camera.
- The header, journey log, stage dial, hero reticle, frame counter, backgrounds, vignettes, transitions, anticipation dot and audio cues are drawn automatically.

**Advanced:**
- `layer(fn, slot)` draws into an offscreen canvas (it swaps `ctx`, which is why `ctx` is a `let`).
- `heroOf(plate, t)`: the hero's screen position, including the camera and the entry shift (use it to anchor overlay art).
- `motionOf(plate, t)` (on-screen velocity of the hero or camera, px/s), `travelOf(plate, t)` (which way the camera is effectively travelling), `follow(target, t, opts)` (tracking camera with lead room), `withCamera`, `camPoint`, `camOf`, `heroOf`, `parallax(cam, depth, fn)`, `momentum(plate, t)`, `coverR(x, y)`, `bgTex(dark)`, `about(px, py, s, tx, ty)`.
- Custom transitions: `enter: { type: 'custom', draw(p, X) }` (see `references/motion.md`), with `morphPose(A, B, u, poseA, poseB)`, `softReveal(fn, x, y, r, feather)`, `S.side` ('old' or 'new'), `S.trans` ({ type, p }) and `S.dark` (whether the plate being drawn is a night plate).
- `TRANS[type](p, X)` adds a new built-in transition. It returns the share of the frame the new plate owns, and should get matching `HEADER_DELAY` and `TRANS_SFX` entries.
- `S.trans = { type, p }` lets plates react to their own transition.

**Theme.** `Object.assign(PAL, { … })` at the top of the story adds subject colours. `FONT` and `FONT_LOADS` hold the three faces.
