# Engine API

Everything a story can call. The engine lives in `toolkit/engine.js`; read that file when a detail is missing here.

**Story.** Call `defineStory({ title, stages, paper, music, dynamics, silent, twos, weave, grain, drift, voice, plates })`, then `boot()`.
- `paper: 'notebook'` picks the paper set (the default, today's cream and night papers). See **Paper** below.
- `music: { tonic, gain }` gives every plate without a `bed` an automatic pad in that key (`references/sound.md`, "Beds").
- `dynamics: [[t, dB], …]` is the film's loudness shape: the master level over time in film seconds, dB relative to the default, linear ramps between points (a quiet opening and a lift at the climax; `references/sound.md`, "Dynamics"). Without it, plates' `lift` fields shape the level; without either it is flat.
  - It can also be a function of the timed plates, `P => [[t, dB], …]`, for a narrated film, where the voice decides when each plate starts: `P => [[0, -4], [P[2].start, -2], [markAt('pull'), 1.5], [P[3].start + 0.5, 0]]`.
- `voice: { lead, tail, gap, level, lufs, peak, duck, fxDuck, reverb }` overrides the narration defaults (see **Narration** below, and `references/sound.md`, "Narration").

Plate fields:

| Field | Meaning |
|---|---|
| `dur` | Plate length in seconds. On a plate with narration it is the drawing's minimum: the plate lasts until its narration ends plus the tail, whichever is longer, and `dur` may be left out when the voice sets the length |
| `vo` | The plate's narration clip, by its id in `vo/voice.json`: `'P2'`, a list `['P3a', 'P3b']` played in order, or `{ id, at, gap, tail, marks }` (see **Narration**) |
| `dark` | `true` for the night world |
| `paper` | Another paper set for this plate alone, or a single paper (then `dark` follows that paper's tone). The two plates of a transition may sit on different papers |
| `enter` | `{ type, dur, ease, curve, draw (custom transition), momentum, settle, match, carry, sfx, …type options (dir, k, dive, scaleFrom, from, to, fromFill, toFill, style, at, ink, drop, fall, rim, rimAlpha, rough, color, opacity, back, radius) }` |
| `silent` (on `defineStory`) | `true` renders a silent audio track of the right length and turns off the automatic risers, transition sounds and pen scratches, which play even with no cues. Check it with `audio_check.py --silent`. |
| `header` | `{ num, title, sub, backing }` (`backing: false` drops the glyph halo round title and subtitle; `'card'` puts them on a torn scrap) — the kicker above the title is always `PLATE <roman num>`; there is no field for other kicker text. A film's own kicker (`A FIELD STUDY IN 3 PLATES`) belongs to the title card, drawn in that plate's own `draw` |
| `log` | `t => ({ title, rows: [[label, value]], states, state, backing })`; `backing` is `true` (default, a glyph halo round every line), `'card'` (a torn scrap behind the block) or `false` |
| `stage` | `{ n, name, prevN }` |
| `hero` | `t => ({ x, y, label, r, tag, alpha })` |
| `focus` | `t => [x, y]` in screen coordinates, for plates without a hero |
| `cam` | `t => ({ x, y, s, dx, dy, rot })`, or `t => follow(target, t, { s, lead, lag, anchor })` to track a moving subject |
| `drift` | Override the automatic push-in (a fraction, or `false`) |
| `draw(t)` | The scene. While `draw` and `overlay` run, `ctx.globalAlpha` counts from the alpha the plate was handed: during a transition's fade, `ctx.globalAlpha = 1` means "back to the fade", not full strength, so a plate cannot undo its own fade. `ctx.save()` / `*=` / `ctx.restore()` still reads best |
| `overlay(t)` | Art that ignores the camera, momentum and the match-cut/carry shift (stats, callouts, cards, charts). It still leaves with its plate during a transition. Anchor to the hero with `heroOf(plate, t)`. |
| `cues` | `[[t, name, opts]]`: at local time `t`, play `SFX[name](ac, out, plateStart + t, opts)`. `t` may be a mark of the narration, `'gone'` or `'gone+0.2'`, so the sound lands on the word |
| `beats` | `[[t, label]]`: what happens when, for the animatic (`t` may be a mark). Without it the animatic lists the plate's cues |
| `bed` | `(ac, out, t0, dur) => …`, or a `BED.*` bed; replaces the automatic music pad for this plate |
| `pen` | How the header types on: `true` pen `scratch`, `false` soft `readout` blips, `'none'` silent. Defaults to the paper's own header sound (`sfx.header`): a pen on the notebook's cream, blips at night |
| `lift` | dB: this plate's level lift, ramped up over its first 1.5 s and down over 1.5 s after it ends. Used only when `defineStory` has no `dynamics` |
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
- `text(s, x, y, { kind: 'display'|'sans'|'mono', size, weight, italic, color, align, ls, alpha, role })`.
  - `role` says which legibility floor the line must meet on screen (`references/style.md`, "Text size and legibility"): `'fact'` 28 px, `'label'` 22 px (the default when omitted), `'hud'` 18 px, `'decor'` exempt. Drawing ignores it; `legibility_check.mjs` reads it. Every engine component passes its own.
- `screenText(s, x, y, opts)`: `text()` counter-scaled about its anchor, so the line keeps `size` px on screen under any camera zoom while its anchor still moves with the scene. Use it for scene labels in `draw()`; `KIT.caption(t, s, x, y, { screen: true })` does the same for captions.
- `haloText(s, x, y, opts)`: `text()` with a glyph halo: the glyphs are first stroked in the plate's paper colour (`dark` picks night paper) with a round-joined line `haloWidth` em wide (default 0.25), at `haloAlpha` (0.92), so line art clears only in a thin band around each letter. `halo: false` skips it; `haloColor` overrides the colour. It is what the components use by default.
- `backing(x0, y0, x1, y1, { dark, style, pad, feather, alpha, seed })`: a real card to write on, made of the plate's own paper. `style: 'card'` (default) is a torn scrap with a pencil edge and a shadow; `'patch'` is a soft-edged patch of the texture, which erases the drawing under it, so use it only over areas that are already empty-looking. Draw it before the text (and before any leader lines). `textBox(s, x, y, opts)` gives a line's box and `unionBox([...])` joins several, for sizing it on the full strings before they type on.
- Text colour: `labelOf(dark)` for secondary text (`PAL.label` / `PAL.nightLabel`; `mutedOf` is for lines), `legible(color, dark)` to darken a coloured label on paper (or lighten it at night) until it reads at 6:1, `inkOn(bg)` for ink or pale paper on a coloured surface.
- `typed(s, t, cps)`.
- `dropText(s, x, y, t, opts)`: left-aligned only; for centred text, start at `cx - measure(s) / 2`.
- `countUp(to, t, dur, decimals)`, plus `fmt`, `ROMAN`, `SUB`, `SUP`.

**Kit components:** `KIT.<kit>.<name>(t, { x, y, s, rot, draw, alpha, seed, dark, … })`; the catalogue is `references/components.md`.

**Components:**
- `stat`, `callout`, `reticle`, `card` (returns 0 until open), `logRuler`, `lineChart` (returns `{ X, Y, ends }`), `insetLens`.
- Their text meets the role floors by default: callout title 32 px and sub 28 px (`fact`); stat kicker 22 px (`label`), value and 28 px note (`fact`); card title, chart ticks and axis labels, series labels, ruler ticks and marks, lens labels 22 px (`label`); Journey Log, stage dial and hero tag 18–21 px (`hud`); `FIG.` labels, the `PLATE` kicker and the frame counter `decor`.
- `callout` and `stat` take `backing`: `true` (default, a glyph halo round each line), `'card'` (a torn scrap behind the block) or `false`. `dark` defaults to the plate's own world.
- Bigger type needs room: a card holding a two-row `logRuler` needs about 180 px of height (marks sit 28 and 60 px above the rule, tick labels 34 px below); a `lineChart` needs about 40 px left of its axis, 70 px below it and 30 px above it.
- `callout` turns its leader around at the elbow (and slides its text in) when the text would leave the frame; the hero tag does the same near the right edge.
- `callout`'s `align` is which side of the elbow the text sits on, and it does not follow the leader's direction: route `x2` to the **left** of the anchor and you must pass `align: 'right'`, or the text reads back across its own leader. Only the frame-edge turnaround flips it for you.
- `card`: a title wider than the card tightens its letter-spacing (it never drops below 22 px, so keep titles short or the card wide), and a figure label that would collide moves to the bottom-right corner.
- `lineChart` series: `{ pts, color, w, draw (0..1, default 1), label }`; the label appears at the line's end as it finishes. Charts and rulers draw nothing before their local `t` reaches 0.
- `insetLens` picks its ring and label ink from the plate it sits on (`S.dark`); its own `dark` option is the lens interior.
- Put these in `overlay(t)` when they should hold still, and in `draw(t)` when they belong to the world (a chart on a wall), where they zoom and pan with the camera.
- The header, journey log, stage dial, hero reticle, frame counter, backgrounds, vignettes, transitions, anticipation dot and audio cues are drawn automatically.

**Brushes** (natural media, adapted from p5.brush; see `## Brushes` in `references/style.md`):
- `brush.stroke(pts, { type, w, color, alpha, pressure, taper, seed, draw, closed, amp, field, fieldAmt, fieldT, nib, streaks, blend, dark })`: a textured line along `pts`.
  - `type`: `'pencil-2b'` (w 5.2), `'pencil-hb'` (3.8, the default), `'pencil-2h'` (2.8), `'cpencil'` (6), `'charcoal'` (13), `'marker'` (12), `'marker-2'` (22, chisel), `'techpen'` (2), `'spray'` (16). `brush.types` lists them.
  - `color` defaults to graphite (pencils), vermilion (`cpencil`) or the plate's ink (`inkOf(dark)`, so night plates get pale ink). `alpha` multiplies the medium's own opacity.
  - `pressure`: `fn(u) -> 0..1`, a number, `[start, end]` or `[start, mid, end]`; the default is a seeded bell. `taper` is the share of the length that tapers at each end.
  - `seed` fixes the grain, bristle streaks and ragged edge; it defaults to one derived from the shape (moving the shape keeps it). `amp` is the outline wobble, which boils on twos.
  - `draw` (0..1) draws the stroke on with a narrowing tip. `nib` is the `marker-2` chisel angle in radians. `streaks: false` drops the bristle streaks. `blend` is a composite op (markers use `multiply` on paper and `screen` at night).
  - `field`: a field name or `fn(x, y, t)`, which bends the stroke as it is drawn; `fieldAmt` scales the bend and `fieldT` animates the field.
- `brush.wash(poly, { color, alpha, seed, bleed, layers, strength, texture, edge, dir, res, draw, reveal, from, blend, dark })` and the global `wash(poly, opts)`: a watercolour fill. Draw it before the ink lines.
  - `bleed` (0..1, default 0.3) is how far the colour runs past the outline. `layers` (14) sets how many translucent layers are stacked. `strength` (0.42, 0.55 at night) is the opacity where they pile up.
  - `texture` (0..1, 0.6) controls the lifted blotches and paper grain. `edge` (0..1, 0.7) controls the darker pooled edge. `dir` is the angle the colour bleeds toward.
  - `draw` (0..1) spreads it out: `reveal: 'bloom'` (the default) grows from `from` (default the centre), and `'sweep'` crosses left to right.
  - It is rendered once per shape and option set and cached; moving the shape reuses the raster. `res` is the raster scale (default 1, 0.75 above 160k px², 0.5 above 500k px²); raise it for close zooms. Colour, `alpha` and `draw` can animate freely.
- `brush.hatch(poly, { type, angle, gap, w, color, alpha, seed, rand, gradient, continuous, inset, keep, draw, pressure, field, dark })`: scanline hatching drawn with brush strokes (textured and pressure-shaped), unlike the pen `hatch()`.
  - `angle` defaults to −0.6, `gap` to 9 px and `type` to `'pencil-hb'`. `rand` (0.25) jitters the line ends. `gradient` (0..1) widens the gaps across the shape. `continuous` draws one zig-zag stroke.
  - `inset` keeps lines clear of the outline. `keep` (0..1 or `fn(x, y)`) thins the lines, for shading. `draw` makes the lines appear in order.
- `brush.field(name | fn, drawFn?)`: returns the field's angle function `fn(x, y, t)` (radians, added to a stroke's heading). With `drawFn`, every brush stroke drawn inside it bends along the field.
  - Named fields: `hand`, `curved`, `zigzag`, `waves`, `seabed`, `spiral`, `columns`. Add your own to `brush.fields`.
  - `brush.flow(x, y, len, { dir, field, ...stroke opts })` draws a stroke that starts at a point and follows a field.
- `window.__brushProbe(kind, boil)` (a test hook) draws one fixed sample of a stroke type, `'wash'`, `'hatch'` or `'field'` offscreen and returns `{ hash, ms }`.

**Advanced:**
- `layer(fn, slot)` draws into an offscreen canvas (it swaps `ctx`, which is why `ctx` is a `let`).
- `heroOf(plate, t)`: the hero's screen position, including the camera and the entry shift (use it to anchor overlay art).
- `motionOf(plate, t)` (on-screen velocity of the hero or camera, px/s), `travelOf(plate, t)` (which way the camera is effectively travelling), `follow(target, t, opts)` (tracking camera with lead room), `withCamera`, `camPoint`, `camOf`, `heroOf`, `parallax(cam, depth, fn)`, `momentum(plate, t)`, `coverR(x, y)`, `bgTex(dark or ground)`, `about(px, py, s, tx, ty)`.
- Custom transitions: `enter: { type: 'custom', draw(p, X) }` (see `references/motion.md`), with `morphPose(A, B, u, poseA, poseB)`, `softReveal(fn, x, y, r, feather)`, `S.side` ('old' or 'new'), `S.trans` ({ type, p }) and `S.dark` (whether the plate being drawn is a night plate).
- `TRANS[type](p, X)` adds a new built-in transition. It returns the share of the frame the new plate owns, and should get matching `HEADER_DELAY` and `TRANS_SFX` entries. It runs with the new plate's paper current; `X.gOld` / `X.gNew` are the two papers (`bgTex(X.gOld)` is the old plate's texture) and `X.palOld` / `X.palNew` their palettes.
- `S.trans = { type, p }` lets plates react to their own transition.

**Sound** (all synthesized; the catalogue and the event map are in `references/sound.md`):
- `SFX.<name>(ac, out, t, opts)`: every effect a cue can name. Events: `tick`, `scratch`, `readout`, `pop`, `chime`, `plink`, `thump`, `crunch`, `creak`, `pump`, `relay`, `hiss`, `plop`, `slosh`, `shaker`, `clink`, `pour`, `foil`, `droplet`, `pageFlip`, `pegSnap`. Motion (the transition sounds): `swell`, `riser`, `whoosh`, `glide`, `flick`, `shutter`, `bend`, `crackle`. Building blocks that do not vary by themselves: `tone`, `noise`, `pad`, `padKey`. Every varied effect takes `seed` (fixes one exact sound) and most take `g` (level). `VARIED` is the set of names that vary per call.
- Instruments, one note per call in the film's key, varied per call: `marimba`, `vibes`, `musicBox`, `kalimba`, `celesta`, `glock`, `epiano`, `pluck`, `feltPiano`, `strings`. Each takes `{ f, deg, oct, tonic, g, pan, decay, seed }` plus its own options (`references/sound.md`, "Instruments and stingers"). They are cue names (`[1.2, 'marimba', { deg: 2 }]`) and also live in `INST`, for a story's own beds and phrases.
- Stingers, short phrases in the film's key: `motif { degs, inst, step }`, `success`, `question`, `oops`, `reveal { lead }` (ends exactly on the cue), `resolve`. `g` scales the whole phrase. Cue names, and also in `STING`.
- `tonicOf(opts)` is the film's key (opts.tonic, else `music.tonic`, else 220 Hz); `pitchOf(opts, homeOct)` turns `{ f, deg, oct }` into Hz.
- `BED.roomTone`, `BED.rain`, `BED.wind`, `BED.cityHum`: ambience beds, `(ac, out, t0, dur, opts)`, usable directly as a plate's `bed`; `BED.mix(...beds)` layers beds.
- `TRANS_SFX[type](ac, out, t, dur, enter)`: the automatic sound of each seam; `enter.sfx: (ac, out, t, dur) => …` replaces it for one custom transition.
- Helpers for a story's own sounds (`SFX.drip = (ac, out, t, o = {}) => …` before `defineStory`):
  - `sfxRng(o, t, name)`: the per-call random generator the built-ins use (seeded by `o.seed`, or by the plate, the time within it, `name` and the repeat count at that instant), so a story's sound varies like theirs. `rr(r, a, b)` draws a number in `[a, b)` from it; `semis(r, n)` a pitch ratio within ±n semitones.
  - `synth(ac, out, t, dur, fill, { g, pan, pan1, filters, r, fade })`: renders a mono buffer that `fill(d, r)` writes sample by sample, normalized so `g` is its peak, through optional biquads (`{ type, f, f1, q, gain, curve }`). `noiseInto(d, r, env)` adds noise shaped by `env(s)`; `DSP.burst`, `DSP.chirp`, `DSP.modes`, `DSP.reson` are the grain, bubble, struck-mode and resonator primitives the v0.15 sounds are built from.
  - `note(tonic, degree)`: a degree of the major pentatonic scale over `tonic`; `SR` is the sample rate. Keep it deterministic: no `Math.random`, no clock.

**Narration** (the voice track; `vo/voice.json` and its clips come from `toolkit/voice.mjs`, and `build.py` embeds them):
- A narrated film carries its narration in the HTML: `build.py story.js film.html` finds `vo/voice.json` next to the story by itself when a plate has `vo`, and embeds each clip as Opus (`--voice path/to/voice.json` names another, `--voice none` builds without). The player, the render and every check then hear it. Without embedded narration, `vo` is ignored and every plate keeps its `dur`, so a film builds and plays before its voice exists.
- **The picture follows the voice.** A plate's clip starts once its header's title has typed on, plus `voice.lead` (0.25 s), and never before the `lead` voice.json gives the clip; on a plate with no header, once its transition has landed. `vo: { at }` sets the start in plate seconds (a negative `at` starts it during the previous plate: a J-cut). The plate lasts until the clip ends plus `tail` (from `vo`, else the clip's own in voice.json, else `voice.tail`, 0.8 s), or its drawing's `dur` if that is longer. A negative `tail` lets the line run on into the next plate (an L-cut). Several clips on one plate play `gap` seconds apart (`voice.gap`, 0.45 s).
- **Marks.** Words the script marks in braces (`{count}about four hundred`) are marks with their times in the clip. `mark('count')` is the plate time the word is spoken, for use inside `draw`, `overlay` and `log`; `mark('count', plate)` puts it on another plate's clock; `markAt('count')` is film time. When two plates' narrations use the same name, name the clip too: `mark('P2.count')`. A cue or beat time can be the mark's name as a string, with an offset: `'count'`, `'count+0.3'`, `'P2.count-0.1'`. `vo.marks: { count: 4.2 }` gives estimates in plate seconds, used until the narration exists.
- **The mix.** The voice has its own channel, centred, and the music beds duck under every sentence and the effects a little. The finished track of a narrated film is brought to −16 LUFS integrated with true peaks under −1.5 dBTP. `references/sound.md`, "Narration", has the numbers and how to check them.
- **Captions.** `window.__srt()` gives the narration as an `.srt` file, one caption per sentence (or part of a long one), two lines of 42 characters at most. A full render writes `film.srt` next to the MP4; `render.mjs --srt` writes it alone. In the player, `c` (or `?cc`) shows them over the picture; the render never draws them into the frames.
- **Animatic.** `build.py --animatic`, `render.mjs --animatic` or `?animatic` replaces each plate's drawing with a placeholder: the header, sound, transitions and narration stay, and the frame shows the line being spoken, the plate's beats (or cues) as they come, and a timeline of the plate with its sentences and marks. A plate with no `draw` is drawn this way too. Use it to judge the pacing with the voice before any art is drawn.
- Hooks for checks: `window.__voice()` (the narration on the film clock: each clip's plate, start, length, sentences and marks, plus warnings such as a clip a plate asks for that voice.json lacks), `window.__audioWav({ only: 'voice' | 'rest' })` (one stem, before the final loudness pass), `window.__story.narrated` and `.animatic`, and `window.__loudness` after a full audio render.

**Theme.** `Object.assign(PAL, { … })` at the top of the story adds subject colours. `FONT` and `FONT_LOADS` hold the three faces. A paper's own `pal` fields replace these while its plates draw.

**Paper.** A paper (a ground) is a texture plus the palette and finish that go with it; a paper set pairs a light paper (the paper world) with a dark one (the night world). The notebook set, `cream` and `night`, is in `engine.js`; other papers live in `toolkit/grounds/<name>.js`, and `build.py` includes a file when the story names one of its papers (`toolkit/grounds/README.md`). The look and the texture rules are in `references/style.md`, "Papers".
- `defineGround(name, { tone, build(g, rand, W, H), pal, vignette, grain, contours, treatment, sfx, stroke, minContrast, seed })`:
  - `tone`: `'light'` or `'dark'`, the world it stands in for. `build` paints the texture once, at the film's own size.
  - `pal`: the `PAL` fields it sets while its plates draw: paper-world fields (`paper`, `ink`, `label`, …) on a light paper, `night*` fields on a dark one, plus shared ones such as `accent`. The other paper of its set lends only its own world's fields.
  - `vignette` (edge colour), `grain` (film-grain strength, 0..1), `contours` (`{ colors, alpha }`, `false`, or `fn(t, ground, seed)`), `sfx: { header }` (the SFX the header types with).
  - `treatment`: how a scene looks on the paper, applied to the plate's paper, scene and overlay on a layer, with the HUD drawn on top untreated. Any of `tooth: [share, alpha]` (holes refilled with the paper, so lines pick up its grain), `filter: 'sepia(0.4)'`, `color: [hex, amount]` (a hue tint), `glow: [px, strength]`; or a function `fn(g2d, ground, { base, raw })` that does the whole job.
  - `stroke: { min, from }`: every `pen()` and `ink()` line of `from` px or more (default 2.5) is drawn at least `min` px wide on this paper, so chalk lines survive phone compression (the chalkboard uses `{ min: 5 }`). Thinner lines, such as hatching and HUD rules, keep their width.
  - `minContrast: { ink, label, accent }` lowers a contrast floor for `smoke_test.py` (default 7, 4.5, 3); give the reason in a comment.
- `definePaperSet(name, { light, dark })`: two paper names. `GROUNDS` and `PAPER_SETS` hold everything defined.
- `paperKit` helpers for `build` (counts scale with the frame's area): `fill(g, a, b)`, `mottle(g, r, n, cols, rmin, rmax)`, `fibres(g, r, n, rgbs, …)`, `specks(g, r, n, rgb, s0, s1, a0, a1)`, `grid(g, r, step, col, alpha, lw, { every, majorAlpha, majorW })`, `swirl(g, r, x, y, R, col)`, `grain(g, amt, seed, { size: 2, mono })`.
- While a plate draws: `S.ground` is its paper, `groundFor(dark)` the paper of either world in its set, `paperTex(dark)` that paper's texture. `withPaper(plate, fn)` runs `fn` with another plate's paper and palette current; `palView(plate)` returns a plate's palette as an object. `window.__paperProbe()` reports each paper's contrast.
