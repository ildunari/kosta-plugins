# 3DLight: API

Every story field, beat field and function a film can use. The files load in this order: `core.js`, `l3d.js`, `beats.js`, `sfxlib.js` (when present), `sound/engine.js`, `sound/score.js`, then the story. They are classic scripts, so their globals are visible to the story. Wrap a story in `(() => { ... })();` so its own names stay private.

## A story

```js
(() => {
const L = L3D, { M } = L;                 // primitives and materials
const { seg, eo, lerp, clamp } = ANIM_UTIL; // easing

defineFilm({
  id: 'my_film', title: 'My Film · 3DLight',
  kicker: 'TOPIC IN CAPITALS', accent: 'teal', credit: 'Lab · Institution',
  art: 6, beat: 4.5, loop: true,
  beats: [
    { head: 'One idea per beat.', sub: 'A short line.', labels: ['tablet'], note: 'in vitro',
      draw(t, P) { /* art at art time t, 0..6 */ } },
    // ...
  ],
  sound: { seed: 3, music: { ... }, rhythm: { ... }, fx: [ ... ], cues(E, o, ev, U) { ... } },
});
})();
```

`examples/story_starter.js` is a complete, small version. The booth examples are large ones.

## `defineFilm(spec)`

Called once. It checks the spec and throws a clear error on a bad field.

| Field | Default | What it does |
|---|---|---|
| `id` | required | Short file-safe name (letters, digits, `_ . -`). Output files are named after it. |
| `title` | required | The HTML page title. |
| `beats` | required | The list of beats (below). |
| `kicker` | none | Small capitals line above the headline (32 px, accent text colour). Never moves. |
| `credit` | none | Bottom right, 22 px. Hidden on a `card` beat, where the card shows it large. |
| `accent` | `'teal'` | `'teal'`, `'amber'`, `'blue'`, or an object `{ a, t, soft, bg0, bg1, floor }` (missing keys from teal). |
| `art` | 6 | Art seconds per beat (the clock `draw` sees). |
| `beat` | 4.5 | Screen seconds per beat. `K = art / beat`. |
| `dissolve` | 0.7 | Art seconds of cross-fade at the start of each beat. 0 cuts. |
| `loop` | true | `false`: the film plays once; beat 1 fades in from the bare ground. |
| `fps` | 30 | Frame rate for `render.mjs` and the checks. |
| `size` | `[1920, 1080]` | Output size, 16:9. Art is always drawn at 1920 x 1080; `render.mjs` scales with ffmpeg. |
| `ticks` | true | `false` hides the beat ticks (a one-beat poster). |
| `backdrop` | `{}` | `{ cx, cy }`: where the white glow sits (default 1380, 430). |
| `sound` | default bed | The sound settings (below). |

## Beat fields

| Field | What it does |
|---|---|
| `head` | Required. The headline, 1 to 3 lines, 116 to 92 px, laid out by `L.headLines`. |
| `sub` | One short line under the headline (50 px, up to 3 lines). |
| `stat` | `{ v: '≈ 30 days', l: 'what it is' }`: a big gradient value (fits 740 px) and its label. |
| `note` | Bottom right, 27 px, 1 or 2 lines: sources, conditions, "illustrative". Stays on screen. |
| `labels` | Strings for the art's tags. The engine does not draw them; `draw` reads `P.labels`. |
| `card` | `true`: the lab or brand card. `sub` must be `'Big line · smaller line'`; it is drawn under an accent bar, and the credit hides. |
| `draw(t, P, S)` | Draws the beat's art at art time `t` (0 to `art`). `P` is this beat, `S` the whole spec. Optional: a beat without it shows only the ground and text. |
| anything else | Ignored by the engine. Keep `visual` and `motion` from `script.md` here for reviewers. |

`draw` runs inside `X.save()` and `X.restore()`, on the ground already drawn, with the identity transform. Draw only the art and the labels that sit on it (tags, leaders, step tags). Never draw the ground, headline, sub, stat, note, credit or ticks.

## Globals for checks and tools

| Name | What it is |
|---|---|
| `drawFrame(T)` | Draws screen time T. Loops wrap T; a film that plays once clamps it. |
| `drawArtFrame(i, t)` | Beat i's art alone (ground and art, no text) at art time t; `t >= art` gives its cached end picture. |
| `textLayout(i)` | Beat i's text boxes once entered: `[{ kind, x0, y0, x1, y1 }]`, kinds `head`, `sub`, `card`, `stat`, `statLabel`, `note`. |
| `filmReady()` | Waits for the fonts. Returns `{ family, faces, loaded, latin, fallbackChars }`. |
| `FILM` | The spec passed to `defineFilm`. |
| `FILM_INFO` | `{ id, title, ART, BEAT, K, N, LEN, loop, DIS, DIS_ART, size, fps, accent }`. `LOOP` is an old alias of `LEN`. |
| `ANIM_UTIL` | `clamp(x)`, `ease(x)` smoothstep, `eo(x)` ease-out cubic, `sm5(x)` smootherstep, `lerp(a, b, k)`, `seg(t, a, b)` eased 0..1 progress of t from a to b, `segL(t, a, b)` linear. |

## core.js

| Name | What it does |
|---|---|
| `C`, `X`, `W`, `H` | The canvas, the current 2D context, 1920, 1080. Always draw through `X` and never keep it in a variable: `withCtx` swaps it. |
| `F.sora` | The font stack: `"Sora Variable", Sora, Inter, sans-serif`. |
| `rng(seed)` | Seeded random numbers (mulberry32): returns a function giving 0..1. |
| `font(w, size, f, st, ls)` | Sets `X.font` and letter spacing. |
| `txt(s, x, y, o)` | One line of text; returns its width. `o`: `w` weight, `size`, `f`, `color`, `align`, `base`, `ls`, `alpha`. |
| `meas(s, o)` | Width of a line with the same options. |
| `fit(s, maxW, o)` | Largest size (from `o.size`, down by 2) at which `s` fits. |
| `rr(x, y, w, h, r)` | Rounded-rectangle path; then `X.fill()` or `X.stroke()`. |
| `line(x1, y1, x2, y2, color, w, dash)`, `arrow(...)`, `head(x, y, ang, size, color)` | Lines and arrows. |
| `off(w, h)`, `withCtx(ctx, fn)` | An offscreen canvas, and drawing into it: `withCtx(c.getContext('2d'), () => { ... })`. |
| `mix(a, b, t)` | Mixes two hex colours. |

## L3D

`const L = L3D;` Every function draws with `X` at the current transform and is a pure function of its arguments. Options objects are optional.

**Constants.** `L.M` materials, `L.PAL` accents, `L.A` the current accent (read-only), `L.PILL` an amber disc palette, `L.NAVY`, `L.SLATE`, `L.MUTE`, `L.INK2`, `L.LX` 110, `L.TW` 800, `L.RX` 1840, `L.TAU`.

**Ground and shadows.**
- `backdrop(proj, seed, { cx, cy })`: the studio ground (the engine draws it; the first two arguments are unused).
- `cshadow(cx, cy, rx, ry, a = 0.3, blur = 16)`: a soft blue-black ellipse shadow.
- `ground(cx, cy, rx, ry, k = 1)`: the two-layer floor shadow under a resting object.

**Spheres, tubes, discs.**
- `gsph(x, y, r, mat, { alpha, spec })`: the matte sphere; `spec: false` drops the highlight.
- `ellSph(x, y, rx, ry, mat, o)`: a squashed sphere.
- `speck(x, y, r, mat = M.drug)`: a small sphere (drug speck).
- `particle(x, y, r, { pal, shadow, shY, coat, seed, coatO })`: a particle with its shadow; `coat: true` adds a fuzzy strand coat.
- `coat(x, y, r, seed, { n, a0, span, nFace, w })`: a strand coat; returns `{ back(), front() }` to draw around a sphere.
- `gel(x, y, r)`: a pale gel halo.
- `beads(pts, r, mat = M.gold)`: beads on a string. `dotPath(pts, color, step = 18, r = 4.5)`: a dotted path.
- `tube(pts, w, mat, { alpha })`: a shaded tube along points. `spline(pts, n = 14)`: smooth points through points.
- `disc2d(sx, sy, rx, ry, depth, pal, { alpha, score })`: an extruded disc (a pill); `L.PILL` is its amber palette.

**Lab and pharma objects.**
- `tablet(cx, cy, rx, ry, h, { seed, speck, n, sr, specks, shadow, shadowK, cut: [a1, a2], topMid })`: the white implant tablet with drug specks; `cut` removes a front wedge.
- `rod(x1, y1, x2, y2, r, { seed })`: an implant rod with specks.
- `capsule3d(cx, cy, L, R, ang, { gap, alpha, inside })`: a two-part capsule; `gap` opens it.
- `cylinder(cx, cy, rx, ry, h, { side, warm, dark, top, topMid, topLo })`, `steelG(x0, x1, warm)`: a matte cylinder and its side gradient.
- `glossArrow(x, y0, y1, w, mat)`: an extruded, matte down arrow (the name is historical).
- `porthole(cx, cy, r, fn)`: a magnified round window; `fn` draws its inside.
- `glassBall(x, y, r, fn)`: a glass sphere with `fn` drawn inside.

**Polymer and biology.**
- `tangle(seed, cx, cy, rw, rh, n, w, steps, stepLen)`: loose tangled chains (amorphous polymer).
- `stack(cx, cy, len, nStems, gap, w, ang)`: one chain folded into parallel stems (ordered polymer).
- `strandSet(seed, [x, y, w, h], n, w, { pal, dir, spread, steps, fromLeft })`: wavy strands (mucin).
- `mucus(x0, x1, y0, y1, seed, { a0, a1, n, nBack, w })`: a mucus layer with strands.
- `cell(x, y, w, h, { nuc, nucY, mv, mvGap, mvW })`, `cellRow(x0, x1, y, h, { n, ... })`: tissue cells; `mv` adds microvilli; `cellRow` returns each cell's `[x, w]`.
- `villi(x0, x1, base, seed, { sp, h, w, pal })`: intestinal villi; `base(x)` gives the base line.
- `vessel(x0, x1, yc, rv)`: a cut blood vessel; returns `{ front() }` to draw over its contents. `rbc(x, y, r, rot, tilt)`: a red blood cell.
- `antibody(x, y, s, ang)`, `enzyme(x, y, s, ang, { mouth })`, `minusPill(x, y, s, a)`: molecules and a charge sign.

**Labels and text.**
- `tag(s, x, y, { size = 40, w, dot, align, color })`: a white pill label; returns its box `{ x, y, w, h, cx, r, b }`.
- `leader(x1, y1, x2, y2)`: a line from a tag to its object, with a white dot.
- `numTag(n, word, x, y, { pal })`: a numbered step tag.
- `headLines(s)`, `subLines(s, maxW, o)`, `splitBest(s, maxW, o, kMax)`, `wrapLines(s, maxW, o)`, `partition(...)`: the line breakers the engine uses.

**Helpers.** `poly(pts)` closed path, `pathOpen(pts)` open path, `layer(fn, { alpha, blur })` draws `fn` into an offscreen layer and composites it (slow: cache it), `camera(pitchDeg, dist, f, ox, oy)` returns a 3D-to-screen projection `(x, y, z) => [sx, sy, scale]`.

**Accents and extension.**
- `L.setA(name | object)`: the engine sets the film's accent before every draw; a story rarely needs it.
- `L3D.extend({ name: fn, ... })`: a view of L3D with the story's own helpers added, so art code can call `L.calTray(...)` beside `L.gsph(...)`. The booth examples use it for their scene helpers.

## Sound

`story.sound`, all optional:

| Field | What it does |
|---|---|
| `seed` | Seed of the engine's noise and random choices (default 7). |
| `music` | `false` for no music, or `{ bed, key, level, cycle, pump }` for a bed made of the library's instrument voices: `bed` is `'glassPulse'` (default: pulse minimalism, a premium biotech bed), `'slowAir'` (ambient documentary, no drums or bass line) or `'quietEngine'` (a quiet synth groove); `key` the tonic as MIDI (default 62, D); `level` scales the whole bed (default 1); `cycle` picks the five-chord cycle (`'reich'`, `'dorian'`, `'lydian'`, or your own list of `{ pad, bass }`), two beats per chord; `pump` the dip in dB that pad and bass take on every quarter (glassPulse 2.5, quietEngine 4; slowAir has none). Each bed builds up and thins out over the film's beats on the same ten-step shape, so a short film and a long one both rise and settle, and a loop's last beat matches its first. `{ chords, bass, arp, arpLevel, cut, inst }` instead plays the `'classic'` bed (pad, sine bass and a felt `keys` or glass `mallet` arpeggio, plus `rhythm`), the 3DLight sound before v0.19. |
| `rhythm` | Only with the `'classic'` bed: `false`, or `{ level: [per beat] }`, a soft kick, wooden knock and shaker. The other beds carry their own pulse. |
| `fx` | Library effects: `[{ at: 12.3, fx: 'siliconeTap', g: 0.8, pan: -0.2, pitch: 2, size: 0.5, seed: 4 }]`. `at` is screen seconds from the film start (or `art:` art seconds). `fx` names an effect in `sfxlib.js` (`../../sound-library/catalog.md`). Every other key goes to the effect: `g` relative gain (1 peaks near -15 dBFS), `pan`, `pitch` in semitones, `seed`, and the effect's own options. Without `seed`, the cue's order in the film gives one, so a re-render is the same. `send` (0..1) also sends it to the room reverb. |
| `events` | A list of `{ t, end, kind, what, beat }` in art time from the film start, for `cues` to pick by name. |
| `cues(E, o, ev, U)` | The film's own cues (below). |
| `score(E, o, ev, U)` | Replaces the whole score (bed, rhythm, fx and cues) with your own. |

`cues` runs once per render pass. `E` is the engine, `o` the pass start in render seconds, `ev` the events. `U` has:

- `U.S(x)`: art time x from the film start, as render time in this pass (`o + x * U.K`).
- `U.beatStart(i)`: render time of beat i's start (0-based).
- `U.K` (beat / art, 0.75), `U.VB` (one beat, 4.5 s), `U.BAR` (half a beat), `U.Q` (a quarter note), `U.N`, `U.LEN`, `U.music`.
- `U.at(ev, /regex/)`: the events whose `what` matches; `U.first(ev, /regex/)`: the first (throws if none).
- `U.transitions(E, o)`: a soft breath of air on every dissolve, from the engine. New films put one library transition on each dissolve instead (`references/sound.md`).

**Engine calls.** The last two rows, `E.fx` and `E.voice`, play the shared library and are what new films use; their `g` is relative (1 peaks near -15 dBFS). The other rows are the classic palette, kept so older stories still render; they sound close to Doodle Draw, so a new 3DLight film avoids them, and their gains are absolute. Times are render seconds (use `U.S` or `U.beatStart`) and notes are MIDI. `o` options include `pan` (-1..1) and `send` (reverb, 0..1).

| Call | Sound |
|---|---|
| `E.pad(t, dur, notes, { gain, att, rel, cut })` | Warm detuned pad chord. |
| `E.bass(t, dur, note, { gain })` | Soft sine bass. |
| `E.keys(t, note, vel, { dec, pan, bus })` | Felt piano note. |
| `E.mallet(t, note, vel, { dec, pan, bus })` | Glass mallet note (pass `bus: E.sfx` to treat it as an effect). |
| `E.chime(t, note, vel, { dec, pan })` | FM bell for key moments. |
| `E.whoosh(t, dur, f0, f1, gain, { q, peak, pan, panTo })` | Filtered air sweep. |
| `E.tick(t, f, gain, { pan })` | Tiny precise click. |
| `E.thump(t, gain, { f0, f1, dec, body, pan })` | Soft low landing. |
| `E.pop(t, f, gain, { down, len, dec, pan })` | Soft bubble pop, up or down. |
| `E.shimmer(t, dur, notes, gain, { peak, pan })` | High soft cluster that swells and fades. |
| `E.swell(t, dur, f0, f1, gain, { peak, tone, pan })` | Rising or falling filtered noise. |
| `E.glide(t, dur, f0, f1, gain, { type, cut, pan, panTo, wobble })` | A travelling tone (a dot moving). |
| `E.hum(t, dur, f, gain, { att, rel, cut, air })` | Low warm hum. |
| `E.flow(t, dur, gain, { cut, rate, att, rel })` | Pulsing low current (blood flow). |
| `E.kick(t, gain)`, `E.rim(t, gain, pan)`, `E.shaker(t, gain, pan)` | The soft rhythm's voices. |
| `E.fx(name, t, { g, pan, pitch, key, seed, send, ... })` | A library effect at render time t, on the effects bus. |
| `E.voice(name, t, { note, notes, dur, g, pan, seed, send, ... }, bus)` | A library instrument voice on the music bus (or `bus`), for a story that writes its own bed in `score`. |

Every bed puts two bars in each visual beat: with 4.5 s beats that is 106.7 BPM.

## Tools

| Command | What it does |
|---|---|
| `python3 build.py story.js film.html [--fonts local\|google\|<node_modules dir>]` | One self-contained HTML file. `local` (the default when `node_modules/@fontsource-variable/sora` exists) embeds Sora; `google` links it. Inlines `sfxlib.js` when present. |
| `node smoke_test.mjs [story.js ...] [--work DIR] [--fonts ...]` | Builds and checks each story (yours, else the examples). Exit code 1 on any failure. |
| `node render.mjs film.html film.mp4 [--workers N] [--fps 30] [--from A] [--to B] [--crf 16]` | The video, H.264, silent. |
| `node render.mjs film.html --stills T,T` / `--strip N` / `--seam` / `--sheet` `[--dir qa]` | Stills, a beat strip, the loop seam, a contact sheet. |
| `node sound/render_sound.mjs film.html [--out DIR] [--mux film.mp4] [--long N]` | The sound at -16 LUFS (true peak at most -1.5 dBTP, with a look-ahead limiter on sharp onsets when needed), muxed, and N loops in one file. |
| `node sound/stems.mjs film.html` then `python3 sound/analyze_stems.py out_sound/<id>` | Music and effects stems, and how far each cue sits above the music. |

## Lanes

For films of six beats or more, beats can be drawn in parallel, one agent per beat:

- `helpers.js`: opens the wrapper (`(() => {`), declares `const BEATS = [];`, and holds the shared constants (positions that link beats, sizes, materials) and helpers. Written first, by the main session.
- `beat_NN.js`: one per lane, `BEATS[NN - 1] = (t, P) => { ... };`, using only `helpers.js` and `L3D`.
- `tail.js`: `defineFilm({ ..., beats: [{ head: ..., draw: (t, P) => BEATS[0] && BEATS[0](t, P) }, ...] })`, closing the wrapper that `helpers.js` opened.
- Join them with `cat helpers.js beat_*.js tail.js > story.js`. A lane checks its own beat on a probe: `cat helpers.js beat_03.js tail.js > probe_03.js`, build it, and render `--strip 3`. Beats not yet written show only the ground and text (the smoke test fails them until they are drawn).

Linked beats (where one hands an object to the next) share their constants in `helpers.js`, and the lane drawing the later beat starts from the earlier beat's end picture.
