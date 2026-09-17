# Field Plates skill: motion and craft review

Reviewer: senior motion design / creative technology pass over `SKILL_v1.md`, the toolkit in `sandbox/`, the demo renders in `/home/claude/fieldplates/`, and a frame-by-frame study of the original *Water Cycle* film. Everything below was checked against rendered frames, not assumed. Prototype code lives in `sandbox/proposed_patch.js` and `sandbox/proposed_demo_story.js` and was rendered to `sandbox/demo.mp4` (34.5 s, 828 frames, with sound).

## Verdict

The rebuild gets the *look* about 70% of the way there and the *motion* about 40%. Stills from our films could pass for the reference at thumbnail size: the paper, the navy world, the type stack, the journey log and dial are right. At full size and in motion the gap shows. Our lines are uniform-width vector strokes with a jitter on top; the reference's are pen strokes with taper and pressure. Our fills are flat colour with a thin hatch; the reference's are two or three overlaid pen textures per material. Our scenes float in a band across the middle of an empty sheet; the reference's bleed to every edge and sit under translucent cards. And our plates are static compositions that only accrete: nothing ever leaves, the camera never moves, every transition is one of two lens moves, and headers arrive on a fixed 75%-of-transition timer that is wrong in both directions compared with the reference.

The reference is doing five things we do not, all visible in the contact sheets:

1. **Beats clear.** The Ocean's big stat fades out at 12–13 s and the bottom card leaves at 15 s so the molecule callout lands on clean paper (sheet_00). Callouts and stats in Condensation vanish between sub-scenes (sheet_02, 48–54 s).
2. **The camera moves.** Rising & Cooling pans up as the parcel climbs (the sea leaves the bottom of frame at 35–36 s). Carried Inland side-scrolls a whole landscape (70–80 s). River & Reservoir and The Whole Cycle hard-cut into a close-up then pull out over about 2 s (168→169 s, 207→209 s, verified in `rv/pull207.png`). The paper does not zoom; the scene does.
3. **Transitions have anticipation and settle.** Before a lens-in a small dark dot pops onto the hero and holds 5 frames (19.93 s, 134.97 s). After a lens-in the new scene sits bare for about 0.4 s before the title types (20.43→20.80 s, 135.72→136.10 s). After a lens-out the title starts immediately (34.23 s, 59.10 s). After a hard cut the scene is fully drawn and the title starts at +0.25 s, the dial at +0.5 s, the log at +0.6 s (`rv/cut81.png`).
4. **Scale is walked inside a plate.** Condensation zooms out three times in 15 s (0.2 µm → 5 µm → 1 cm) by shrinking the hero to a dot and growing the next scale in around it, with the scale bar re-labelling.
5. **Sound is busy and wide.** The reference's spectrogram shows a sustained scratch texture for the whole duration of every typed line, a thump on each card landing, a broad modulated bed, and real stereo (side channel at −21.5 dB, ours is mono in a stereo file). Ours is a drone with a few blips.

Everything in the P0 list is prototyped and verified visually; the P1 list is mostly prototyped; the P2 list is sketched.

---

## P0 — the things that change how the films feel

### P0.1 Exits and holds: give every beat an end time

**Problem.** `stat`, `callout`, `card` all take a start time and never leave. Plates fill up until the transition wipes them. The reference clears the stat after ~4 s and the bottom card after ~6 s so each new idea gets clean paper. Our Corona plate (f_00560) ends with a stat, two callouts, a schematic and a scale bar all up at once.

**Change.** Add a `beat(t, t0, t1)` envelope and a `withAlpha` wrapper, and make the skill's plate script carry an *exit* column. Rule: a beat that has been read (12 chars/s + 1 s) fades out over 0.3 s before the next beat lands in the same region. Text exits by fade (never by un-typing); drawn objects can exit by `eraseOut` (a paper-coloured scribble rubs them out) or by fade.

```js
/** 0..1 envelope: eased in at t0, held, eased OUT so it is gone at t1 (t1 = null never leaves) */
function beat(t, t0, t1 = null, o = {}) {
  const a = E.out3(inv(t0, t0 + (o.in ?? 0.35), t));
  return t1 == null ? a : Math.min(a, 1 - E.in2(inv(t1 - (o.out ?? 0.3), t1, t)));
}
function withAlpha(a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); }
// in a plate: the stat owns the top band from 0.9 s to 3.3 s, then the callout takes it
withAlpha(beat(t, 0.9, 3.3), () => stat(t - 0.9, { ... }));
withAlpha(beat(t, 3.5),      () => callout(t - 3.5, { ... }));
```

Verified: `sandbox/qa_demo3/sheet.jpg` row 2 (Plate I: stat at 1–3 s, gone at 4 s, callout in the same space at 4–5 s).

### P0.2 A camera: push, pull and pan inside a plate

**Problem.** No virtual camera. The reference uses one on at least five plates and it is the single biggest reason its plates feel filmed rather than laid out.

**Change.** A per-plate `cam(t) => { x, y, s, dx, dy }` applied to the *scene only*. Paper texture, contours, vignette and HUD stay at identity (that is what the reference does: the stripes never scale in `rv/pull207.png`). `drawPlate` becomes background → `withCamera(cam, draw)` → HUD.

```js
function withCamera(cam, fn) {
  if (!cam) return fn();
  const { x = W / 2, y = H / 2, s = 1, rot = 0, dx = 0, dy = 0 } = cam;
  ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(s, s); ctx.rotate(rot); ctx.translate(-x, -y); fn(); ctx.restore();
}
// recap plate: cut in close, pull out over 2.6 s (reference: 207→209 s)
cam: t => ({ x: 640, y: 420, s: kf(t, [[0, 1.55], [2.6, 1]], E.inOut3) })
// title card: a 5 % push-in over the whole plate so the frame breathes
cam: t => ({ x: 700, y: 420, s: 1 + 0.05 * E.inOutSine(clamp(t / 5)) })
// side-scroll (Carried Inland): pan, and draw the world 1.5 frames wide
cam: t => ({ dx: -lerp(0, 900, E.inOutSine(inv(1, 9, t))) })
```

Rules for the skill: push-ins of 3–6% on any plate longer than 8 s; pull-outs of 1.4–1.8× on recaps and reveals; pans follow the hero with a 0.4 s lag (`kf` on the hero path); never zoom text (HUD is furniture); the hero reticle must also be furniture (see P1.6). Verified: title push-in and recap pull-out in `demo.mp4` (sheet row 5, cols 2–4).

### P0.3 Header and HUD timing that matches the reference

**Problem.** `hd = enter.dur * 0.75` for every non-cut transition and 0.1 s for cuts. Measured reference: lens-in → hold 0.4 s *after* the lens finishes; lens-out → title starts *at* the transition start; cut → 0.25 s. The HUD also lands all at once; the reference staggers title → dial → log by ~0.25 s each.

**Change.**

```js
const HEADER_DELAY = { cut: 0.25, lensIn: d => d + 0.4, lensOut: () => 0.05, fade: d => d * 0.6,
  burn: d => d * 0.75, wipe: d => d * 0.55, iris: d => d * 0.5 + 0.3, zoom: d => d * 0.85, morph: d => d * 0.85, page: d => d * 0.7 };
// in drawPlate:
if (pl.header) plateHeader(ht, ...);
if (pl.stage)  stageDial(ht - 0.25, ...);
if (pl.log)    journeyLog(ht - 0.35, ...);
```

Plus the **anticipation dot**: 0.2 s before a lens-in, pop a 16 px dot in the new plate's paper colour with a white ring on the hero (`E.outBack`), hold, then the lens opens from it. Verified in `sandbox/qa_photon_p/lens_sheet.jpg` (frames 117, 119 show the dot; 132 and 140 show the bare hold; 146 shows the title starting). Also fix `renderAudio`: it plays a `thump` on `fade` transitions (the else branch), so every end card currently thuds.

### P0.4 Pen strokes with taper and pressure

**Problem.** `ink()` is a constant-width `lineTo` stroke with noise displacement. It reads as "vector with wobble". The reference's outlines are heavier on the underside of the cloud, lighter on top, and its rays and rain taper to points (f_10, f_66).

**Change.** A ribbon-filled `pen()` whose half-width follows `w * pressure(u)`: sqrt taper over the first and last 16% of the length, plus slow value-noise pressure variation, plus a pen-tip taper on the leading end while `draw < 1`. Use `pen` for subject outlines, horizons, rays, rain and branches; keep `ink` for measurement lines and small repeated things.

```js
function pen(pts, o = {}) {
  const { w = 3.5, color = PAL.ink, seed = 1, amp = 1, draw = 1, taper = 0.16, closed = false, minW = 0.25 } = o;
  let p = wobble(pts, closed, amp, seed); if (closed) p = p.concat([p[0]]);
  const Lfull = pathLen(p); if (draw < 1) p = partial(p, draw, false); const Lpart = pathLen(p);
  const prof = o.pressure || (u => { const tp = closed ? 1 : Math.min(1, Math.min(u, 1 - u) / taper);
    return (minW + (1 - minW) * Math.sqrt(tp)) * (0.82 + 0.18 * vnoise(u * 7 + seed, seed + 3)); });
  const L = [], R = []; let s = 0;
  for (let i = 0; i < p.length; i++) {
    if (i) s += Math.hypot(p[i][0] - p[i-1][0], p[i][1] - p[i-1][1]);
    const a = p[Math.max(0, i-1)], b = p[Math.min(p.length-1, i+1)], dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx, dy) || 1;
    let hw = w * prof(s / Lfull) / 2; if (draw < 1) hw *= Math.min(1, (Lpart - s) / (taper * Lfull) + 0.05);
    L.push([p[i][0] - dy/l*hw, p[i][1] + dx/l*hw]); R.push([p[i][0] + dy/l*hw, p[i][1] - dx/l*hw]);
  }
  ctx.save(); ctx.fillStyle = color; trace(L.concat(R.reverse()), true); ctx.fill(); /* + round end caps */ ctx.restore();
}
```

Also add a **double-stroke** option to `ink` (a second pass at alpha 0.35 with a different seed and 0.7× width): the reference's clouds and cards show a faint second contour and it costs one extra call. Verified: `pen` on horizons, branch, rain in `qa_demo2/f_00060.jpg` (feed rough polylines through `smooth(pts, 3)` first or the ribbon kinks at corners).

### P0.5 A real transition vocabulary

We have lensIn, lensOut, cut, fade. The prototype adds six, all pure functions of `p` (see `TRANS` in `proposed_patch.js`) and all verified in `demo.mp4`. When to use each, with the implementation:

| Transition | Use when | Implementation | Dur / ease | Sound |
|---|---|---|---|---|
| **lensIn / lensOut** (existing) | Down / up the scale ladder to a *different* world | as now, plus the anticipation dot and the header hold | 0.4–0.55 s, inOut3 | swell up/down |
| **cut** (existing) | Same scale, new place | as now, but header +0.25 s, dial +0.5, log +0.6 | 0 | thump + riser |
| **zoom** (new) | Same world, one step on the scale ladder (Condensation's 0.2 µm → 5 µm → 1 cm). Reads as one continuous pull-out or push-in | Both plates share a pivot (old hero → new hero, lerped). Old scene scale `1 → 1/k`, new scene scale `k → 1` about the pivot (`k` = 6–10); new plate alpha `inv(0.25, 0.7, p)`; old HUD fades out over the first 35%, new HUD fades in over the last 40%; the incoming hero reticle is suppressed until p > 0.62 (else it ghosts huge). Paper stays at identity (`drawPlate(pl, t, { xf, bg: false })`) | 0.8–1.0 s, inOut3 | glide (sine sweep down for out, up for in) + noise sweep |
| **iris** (new) | Same-scale cut that needs a blink, e.g. leaving a diagram to rejoin the journey | p<0.5: old plate clipped to a circle on the old hero, radius `Rmax → 0` with `E.in3`; 2-frame hold on the new plate's bare paper; p>0.5: new plate clipped to a circle on the new hero opening with `E.out3`; `lensRing` on the edge | 0.6–0.7 s | shutter: tick, thump, tick-tick |
| **wipe** (new) | Reveals with a direction: the title card's wave, "and now the whole landscape", a river's downstream reveal | Front `f = lerp(-160, span+160, inOut3(p))`; edge = `shape.ridge` (amp 55) mapped perpendicular to the front; clip polygon = everything behind the edge; `pen` the edge at 5 px; 40 spray dots ahead of it whose radius pulses with `S.T` | 0.6–0.8 s | whoosh: bandpass noise 500→5000 Hz + a low tone at the landing |
| **burn** (new) | Time passing, "meanwhile underground", paper → night or paper → paper when the mood turns | 170 seeded blots (`hash`ed by plate index) around the new hero; each blot is a `shape.blob` whose radius grows `E.out2(inv(delay, delay+0.42, e))` with delay ∝ distance from the hero^0.9; the union of blots (nonzero winding, one `beginPath`) is the clip for the new plate; before clipping, stroke the union three times (26 px @0.10, 14 px @0.22, 6 px @0.7) in scorch brown (paper) or ink (night) so a feathered rim survives outside the clip; blob seed varies with `S.boil % 3` so the edge crackles on twos | 0.8–1.0 s, inOut3 | crackle: 26 short noise grains rising in frequency + a slow noise sweep |
| **morph** (new) | Match cut where one drawn object becomes another (droplet → raindrop, cell → tumour, coin → bar) | `tr.from(prevPlate, pt)` and `tr.to(plate, t)` return closed point arrays; `morph(A, B, e)` resamples both to 72 points by arc length, picks the start offset and winding with the least squared distance, lerps; both plates skip drawing that object while `S.morph` is true; everything else crossfades `inv(0.3, 0.8, p)`; `tr.style(e)` lerps colour/width/fill | 0.8–1.0 s, inOut3 | bend: triangle portamento f → f2 plus an octave shadow |
| **page** (new) | Chapter break, into the recap or the end card | Notebook flip with the spine at the top: for `θ = e·π`, while cos θ > 0 draw the old plate with `ctx.scale(1, cos θ)` (whole plate, HUD included) over the new plate, with a 90 px shadow gradient under the lifting edge; while cos θ < 0 draw the page's blank back (paper texture cropped to `H·|cos θ|`, darkened 12%) shrinking to nothing | 0.8–0.9 s, inOut3 | flick: 160 ms bright noise, then a 900 Hz noise tap and a thump at the landing |
| **hatch** (sketched, not verified) | Dreamy dissolve into a memory or a diagram | Clip = union of rotated dashes (gap 16, lengths 50–160) whose height grows `gap·1.15·inOut3(inv(d, d+0.75, e))` with a per-dash delay d; new plate inside; the strokes literally thicken until they merge | 0.7 s | lfo-modulated noise (14 Hz) |

Also **particles-to-shape gather** (not a transition, an in-plate reveal, reference 60→62 s): precompute N target points on the outline/interior of the shape; each particle has a scatter position and lerps to its target with `stagger(i, t)`; when `draw` reaches 1, swap to the drawn shape. Sketch in P1.5.

Sound for every transition is preceded by a 0.35 s **riser** (noise sweep 300→2400 Hz + a triangle tone rising an octave). The reference never cuts cold.

### P0.6 Texture vocabulary per material

**Problem.** One `hatch()` pass per fill. The reference layers material-specific textures (f_124: pebbles in the aquifer, stipple in the soil, vertical dashes plus scribble in the rock, horizontal light-and-dark dashes plus wave curls plus a glint column in water, underside hatch on each cloud lobe, tufted grass on every ground line).

**Change.** Add `pebbles`, `stipple`, `scribble`, `grass`, `lobedCloud` (all verified in `qa_demo2/f_00060.jpg`) and put this table in the skill:

| Material | Recipe |
|---|---|
| Sea / lake | flat teal; `hatch` angle 0.02 gap 9 len 14 in a light tone (alpha 0.5) and again in a dark tone (alpha 0.35, keep denser with depth); 12–20 S-curve wave strokes `ink` w 2; a vertical column of gold dashes under the sun |
| Cloud | `lobedCloud(x, base, [[dx, r, dy], …])`: each lobe outlined, drawn back to front so front lobes cut the ones behind, two hatch passes on each underside, flat base line in `pen` |
| Soil | flat ochre; `stipple(poly, 2000+)`; `hatch` angle 0.1 gap 5 in a darker brown |
| Gravel / aquifer | `pebbles(poly, 200–300, { rmin 6, rmax 16 })`; aquifer adds horizontal dashes in teal |
| Rock / bedrock | dark flat; `scribble` angle 0.5 gap 12; vertical short `hatch` len 8 |
| Ground line | `pen` w 4 + `grass(ridge, { every 30 })` |
| Sun | flat + cross-hatch (two `hatch` passes at ±0.6, gap 4, alpha 0.5) + 20 tapered `pen` rays of varied length |
| Night body | flat navy + `speckle` + a white highlight arc at upper-left + a scattered pink/cyan ring |

Rule: two textures minimum on any fill wider than 200 px, and at least one of them must be denser toward the shadow side.

### P0.7 Paper and contours

**Problem.** Our stripes are hard-edged bands at alpha 0.17 with no large-scale tone variation; the photon still (qa_photon5/f_00420) reads as a printed pattern. Our `contours()` draws 12 loops with irregularity 0.45 that tangle into scribbles (very visible on the photon plates); the reference has 3–4 large, smooth loops.

**Change.** Rebuild the paper: bands as linear gradients with 20% soft edges at alpha 0.10, nine radial mottles (±5–8%), 3200 fibres, grain 16. Contours: 4 loops, irregularity 0.22, 96 points, alpha 0.16 paper / 0.10 night, drift at 0.012 rad/s. Both in the patch; compare `qa_demo2/cloud60.jpg` with `qa_photon5/f_00420.jpg`.

---

## P1 — polish that the reference has and we can add cheaply

### P1.1 Fill reveal while drawing on
`ink()` pops its fill the frame `draw` reaches 1. The reference's leaf (open.png, 0.5–0.75 s) draws its outline, then the fill sweeps in. Add `fillReveal: 'sweep' | 'grow'`: sweep clips the fill to a rect crossing the bbox as `inv(0.6, 1, draw)`; grow scales the fill polygon about its centroid. Cards should use the same idea: outline first, fill 0.15 s later.

### P1.2 Cards that are part of the world
Reference cards are translucent (the sea's dashes show through the bottom card in f_10) with a 4 px shadow and a wobbly double outline. Set `PAL.panelAlpha = 0.9`, draw the card fill with that alpha, and give the card the double stroke. Also the reference card *appears* in about 0.1 s (blank) and its content starts 0.4–0.6 s later; our 0.4 s unfold-from-the-left is fine but the blank hold should be a documented beat, not an accident.

### P1.3 Typography rhythm
- `dropText` scales the popping glyph about its baseline-left anchor, so it pops up-and-right instead of in place. Scale about `(x + w + gw/2, y - size*0.35)`.
- Kerning between the last settled glyph and the popping glyph is lost (width measured on the slice). Measure `s.slice(0, full+1)` and subtract the glyph width.
- The reference varies cps: kickers 30, titles 17 glyphs/s, subtitles 30, callout titles 30, subs 45, colophon 60. Ours matches; write it in the skill as a table with *reading time* = chars/12 + 0.8 s hold before the next beat may replace it.
- Big-number kerning: use `ctx.letterSpacing = '-1px'` for Fraunces at ≥56 px; the reference's numerals sit tighter than ours.

### P1.4 Journey log STATE row
`journeyLog` wraps the three state options onto a second line whenever they exceed 280 px, which is nearly always for 3 words (our f_00300: "STATE" alone on a row, options below). At 13 px with 30 px spacing three 7–9 letter states fit in 350 px. Patched and verified (demo, top right).

### P1.5 Missing primitives (all in the patch unless noted)
- `arrowPath(path, { draw })`: a line drawn along a path with the head riding the moving end.
- `fluxArrow(path, { width, draw })`: the recap's hollow, hatched ribbon arrows with width ∝ √flux. Verified.
- `journeyPath(path, { draw, waypoints: [{ u, label }] })`: dotted hero route + roman-numeral waypoints. Verified.
- `textOnPath(s, path, u0)`: labels that follow a layer or a river ("GROUNDWATER FLOW →"). Verified.
- `resample`, `morph`: for match cuts. Verified.
- `smooth(pts, k)`: Chaikin corner cutting so `pen` has curves to follow. Verified.
- `stagger(i, t, { t0, step, dur })`: the group helper used for rain, log rows, chart series, ruler marks.
- `eraseOut(poly, p)`: rub-out exit for drawn objects (the crossed-out teardrop myth in the demo uses it).
- `layer(fn)`: renders into an offscreen canvas and returns it (`ctx` must become `let`; `proposed_build.py` does this at build time). Needed for clean burn masks, page curls with real perspective, and per-boil caching. Verified that `ctx` is restored and the layer holds pixels.
- Particle gather (sketch, not prototyped):
  ```js
  function gather(targets, t, { t0, dur = 1.2, spread = 400, seed = 9 }) {   // targets: [[x,y],...] on/in the shape
    const r = mulberry(seed);
    return targets.map(([tx, ty], i) => { const a = r() * TAU, d = spread * (0.3 + r()); const u = E.inOut3(inv(t0 + r() * 0.4, t0 + r() * 0.4 + dur, t));
      return [lerp(tx + Math.cos(a) * d, tx, u), lerp(ty + Math.sin(a) * d, ty, u), u]; });
  }
  ```

### P1.6 The hero reticle is furniture
`reticle()` is called from inside `draw()`, so it scales with the camera and the zoom hand-off (it ghosted at 5× in the first prototype). Make it a plate property the engine draws after the scene at identity: `hero: t => ({ x, y, label, r })`, with `focus` derived from it. Until then, the patch suppresses `reticle` while `S.noReticle` is set.

### P1.7 Sound: cues, texture, stereo, key
Measured on the reference: mean −20.9 dB, peak −1.5 dB, a real side channel; sustained scratch during every typed line (blocks in `rv/ref_spec_zoom.png` lasting the full type-on), thumps when cards land, a broad modulated bed. Ours: mean −23.3, peak −5.5 (a touch quiet), mono, six ticks per header, silence between blips.

Changes (transition cues, `riser`, `padKey` with stereo panners and chords in a key, a duckable bed bus that dips 50% under transitions and 25% under chimes are in the patch and audible in `demo.mp4`; the rest is sketched):

```js
/** typing texture for the whole length of a typed line: tremolo'd noise at the cps rate */
scratch(ac, out, t, { chars = 20, cps = 30, g = 0.03 } = {}) { SFX.noise(ac, out, t, { dur: chars / cps, g, f0: 3500, q: 1.2, a: 0.01, lfo: cps }); },
// call it from renderAudio for header kicker/title/sub and for every callout and stat note; the engine knows their lengths
/** pitch the plinks to a scale so the film is in a key: degree -> Hz */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16], note = (tonic, deg) => tonic * 2 ** (SCALE[((deg % 8) + 8) % 8] / 12 + Math.floor(deg / 8));
// sonify: a log-ruler mark's plink pitched by its position, a chart's draw-on by a slow glide from y0 to y1
```

Musical plan for the skill: one tonic per film; stage k uses chord k of a I–vi–IV–V–ii–V loop so the pad moves between plates; night plates drop an octave and close the filter; the end card resolves to I with the added 9th. Set `out.gain` to 3.2. Add `StereoPannerNode` to plinks (pan = hero x mapped to −0.5…0.5) so the hero's sounds sit where the hero is.

---

## P2 — engine hygiene, performance, fragile spots

- **`build.py` picks the wrong title.** `re.search(r"title:\s*'([^']+)'")` matches the first plate header's title, so `photon.html` is titled "The Core" and `demo.html` "The Valley". Use `re.search(r"defineStory\(\{\s*title:\s*'([^']+)'")`.
- **`renderAudio` thumps on `fade`** (the else branch). Fades should be silent or a soft down-swell.
- **`hatch()` scans the bbox diagonal regardless of angle**: rows and dashes far outside the polygon are generated then clipped. Projecting the bbox corners onto the hatch axes halves the work on wide bands (measured 5.65 → 2.94 ms on a 1920×130 band). In the patch.
- **Determinism is fine but slow in the wrong place.** `wobble()` recomputes every point of every shape every frame; with 300 pebbles it dominates. Because the boil only changes every 2 frames, a pure memo keyed by `(seed, S.boil, geometry hash)` is legal under the skill's determinism rules and halves geometry cost. To let it pay off in the renderer, split frames across workers by `Math.floor(f / 2) % workers` (pairs share a boil) instead of `f % workers`.
- **The 50–60 ms/frame figure is mostly encode and IPC**, not drawing: in-page `renderFrame` of the heaviest demo frame (burn mid-transition, 1.55× camera, pebbles, scribble) is 26 ms; Plate I is 14 ms. If speed matters, return raw RGBA via `getImageData` over a shared buffer, or move JPEG encoding to a worker; the drawing has headroom for richer texture.
- **`lensTransition` `cover()`** forces a large scale when the hero sits near an edge (min distance clamped at 200). The reference simply translates the new plate so its hero sits under the old hero and irises at 1:1 (20.05 s). Offer `scaleFrom: 1` for that behaviour.
- **`fade` double-vignettes**: old vignette at full, then new plate + new vignette at alpha. Crossfade the vignettes like the lens branch does.
- **`insetLens`** draws the close-up scaled by the pop progress, so content scales with the bubble; the reference's content is static inside a growing circle (clip, don't scale).
- **`journeyLog` wraps when it need not** (P1.4).
- **`dropText` glyph anchor** (P1.3).
- **`wobble` seam**: closed shapes get an unrelated offset at the first and last sub-point. Invisible at amp 1.2, visible at amp ≥ 3 (blob clouds). Make the noise periodic in `k` for closed paths.
- **`ink` with `draw < 1` on a `closed` shape with `fill`**: no fill until the end (P1.1).
- **Player**: seeking while playing rebuilds the source; fine. But `bar.oninput` seeks on every pixel of drag, re-rendering audio buffers is avoided; OK. Minor: `[`/`]` keys use `now() - 0.5` heuristics; fine.
- **`SFX.chime` partials** at ×1, ×2, ×3.01 with gains 0.05/0.025/0.017 are bright; the reference chime has a soft attack (a ≈ 0.02) and a longer tail. Use the reverb send at 0.4 for chimes only.

---

## The skill document

What a future agent needs that the document does not give:

1. **A motion grammar with exits** (P0.1). The plate-script table gains two columns: *Exit* (when each beat clears) and *Camera*. Add the rule "one idea on screen at a time in each region; three regions: top band, side, bottom card".
2. **The transition table** above, with the "when to use" column, and the timing rules from P0.3 written as numbers (dot at −0.2 s, lens 0.45 s, hold 0.4 s, title, dial +0.25, log +0.35).
3. **The texture vocabulary table** (P0.6) with the actual parameters, and the composition rules the reference follows: scenes bleed to all four edges; the horizon at 48–52%; the ground runs under the cards; a sky element (sun, cloud, birds) on every paper plate; far objects thinner and lighter (w 2, alpha 0.7), near objects heavier (w 3.5) and shaded; leave the top-centre band and one side clear for the stat and a callout.
4. **Reading-time math** and the sub-scene pattern: a plate longer than 15 s is 2–3 sub-scenes joined by `zoom` or clears, not one accreting picture.
5. **Sound plan** per film: key, chord per stage, which cue goes with which component, the typing scratch, the riser before every transition, stereo placement.
6. **QA that watches motion**: add `node render.mjs film.html --strips` that writes an 8 fps 4×4 strip around every plate start automatically (the reference study was only possible with strips), and require looking at them for: the anticipation dot, the bare hold, no HUD scaling, no double vignette.
7. **Fix the worked example**: `story_photon.js` has an empty sky, a card that sits blank for 0.4 s with nothing to read, and no exits; it teaches the flat look. Replace it with the demo story here, which uses every primitive once.
8. **Small corrections**: `build.py` title regex; the `fade` thump; state the `let ctx` change; document `S.morph` / `S.trans` so plates can react to transitions; note that `cam` must not be used on the same plate as `insetLens` without passing the camera to the inset (or the tangent lines detach).

---

## Prototype files

- `sandbox/proposed_patch.js` (loads after `engine.js`): beats/stagger/exits, `pen`, `scribble`/`pebbles`/`stipple`/`grass`/`lobedCloud`, `arrowPath`/`fluxArrow`/`journeyPath`/`textOnPath`/`resample`/`morph`/`smooth`, `withCamera` + a new `drawPlate` (scene transform, HUD stagger, header delays), `layer`, the `TRANS` table (burn, wipe, iris, zoom, hatch, page, morph) and a new `renderFrame` with the lens-in anticipation dot, bounded `hatch`, calmer `contours`, one-line `journeyLog`, rebuilt paper, the reticle guard, and the sound additions (`crackle`, `whoosh`, `shutter`, `glide`, `flick`, `bend`, `riser`, `padKey`, a ducked bed bus, per-transition cue map).
- `sandbox/proposed_build.py`: `build.py` plus the `let ctx` rewrite and the patch include.
- `sandbox/proposed_demo_story.js`: "One Drop", 7 plates, 34.5 s. Exercises wipe → iris → zoom → morph → burn → page, a title push-in, a recap pull-out, cleared beats, and every new primitive.
- Renders: `sandbox/demo.mp4` (828 frames, audio mean −23.3 dB / peak −5.5 dB), `sandbox/qa_demo3/sheet.jpg` (1 fps contact sheet), `sandbox/qa_demo3/{zoom,iris,morph}_strip.jpg` (8 fps strips), `sandbox/qa_demo3/spec.png`, `sandbox/qa_demo/trans_sheet.jpg` (first-pass transition midpoints), `sandbox/qa_demo2/` (after fixes), `sandbox/qa_photon_p/lens_sheet.jpg` (anticipation dot and header hold on the existing photon story, built with the patch).

Verified visually: wipe, iris, zoom hand-off, morph, burn, page turn, camera push/pull, beat exits, pen taper, lobed cloud, pebbles/stipple/scribble/grass, flux arrow, journey path, text on path, the anticipation dot and header hold, determinism (same frame twice → identical pixels), `layer()` restoring `ctx`. Not verified visually: the `hatch` dissolve, `gather`, `scratch`, `eraseOut` at full speed (only in stills). Known rough edges in the prototype: the burn rim shows faint interior seams where blots overlap near the boundary (render the union through `layer()` with `destination-in` to fix); the zoom's incoming reticle appears at ~1.4× for a few frames; the wipe's edge reads as a torn edge rather than a wave (give it a curl: add a `crest(y)` term to the ridge and draw foam dots along it).
