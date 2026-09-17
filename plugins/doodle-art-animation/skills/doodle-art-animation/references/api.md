# Engine API

Everything a story can call. The engine lives in `toolkit/engine.js`; read that file when a detail is missing here.

**Story.** Call `defineStory({ title, stages, music, twos, weave, grain, drift, plates })`, then `boot()`.

Plate fields:

| Field | Meaning |
|---|---|
| `dur` | Plate length in seconds |
| `dark` | `true` for the night world |
| `enter` | `{ type, dur, momentum, settle, match, …type options (dir, k, dive, scaleFrom, from, to, fromFill, toFill, style, at, ink, drop, fall, rim, rimAlpha, rough, color, opacity, back, radius) }` |
| `header` | `{ num, title, sub }` |
| `log` | `t => ({ title, rows: [[label, value]], states, state })` |
| `stage` | `{ n, name, prevN }` |
| `hero` | `t => ({ x, y, label, r, tag, alpha })` |
| `focus` | `t => [x, y]` in screen coordinates, for plates without a hero |
| `cam` | `t => ({ x, y, s, dx, dy, rot })` |
| `drift` | Override the automatic push-in (a fraction, or `false`) |
| `draw(t)` | The scene |
| `overlay(t)` | Art that ignores the camera |
| `cues` | `[[t, name, opts]]` |
| `bed` | `(ac, out, t0, dur) => …` |
| `counter`, `marks` | `false` hides the frame counter or the registration marks |

`draw(t)` receives local seconds. During the next plate's transition, `t` runs past `dur`, so clamp your animations.

**Timing:**
- `inv(a, b, t)`: 0..1 progress inside a window.
- `kf(t, [[t0, v0], …], ease)`: keyframed numbers or `[x, y]` points.
- `beat(t, t0, t1)`, `stagger(i, t, opts)`, `withAlpha(a, fn)`, `readTime(s)`.
- `E.*` easings, plus `clamp`, `lerp` and `zlerp(a, b, e)` (geometric, for scales).
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

**Components:**
- `stat`, `callout`, `reticle`, `card` (returns 0 until open), `logRuler`, `lineChart` (returns `{ X, Y }`), `insetLens`.
- The header, journey log, stage dial, hero reticle, frame counter, backgrounds, vignettes, transitions, anticipation dot and audio cues are drawn automatically.

**Advanced:**
- `layer(fn, slot)` draws into an offscreen canvas (it swaps `ctx`, which is why `ctx` is a `let`).
- `withCamera`, `camPoint`, `camOf`, `heroOf`, `parallax(cam, depth, fn)`, `momentum(plate, t)`, `coverR(x, y)`, `bgTex(dark)`, `about(px, py, s, tx, ty)`.
- `TRANS[type](p, X)` adds a new transition. It returns the share of the frame the new plate owns, and should get matching `HEADER_DELAY` and `TRANS_SFX` entries.
- `S.trans = { type, p }` lets plates react to their own transition.

**Theme.** `Object.assign(PAL, { … })` at the top of the story adds subject colours. `FONT` and `FONT_LOADS` hold the three faces.
