# Style guide

Read this before drawing any plate. It covers the two worlds, palette, type, line and texture recipes, composition and the fixed HUD positions.

## Two worlds, one scale ladder

| World | Use it for | Background | Ink |
|---|---|---|---|
| **Paper** | Human scale and larger: landscapes, organs, cross-sections, maps, diagrams | Cream `#ebe2cc`, soft-edged 45° bands (66 px every 132 px), large mottles, fibres, grain, warm vignette | Near-black `#1b1518` |
| **Night** | Inside, hidden or abstract views: molecules, cells, the inside of a machine, a chip or a network, a mind, deep space, night itself | Navy gradient `#0b0a1e` → `#16142e`, faint 120 px grid, crosshatch weave, specks, strong vignette | Pale lavender `#dcdcef` |

Both worlds carry four large, smooth topographic loops that drift slowly (muted pink, teal, yellow and periwinkle), plus crosshair registration marks in the corners. The end card is always night.

## Papers

The two worlds above are the **notebook** paper set, and it is the default. A paper set keeps the same two-world idea on a different paper: `defineStory({ paper: 'blueprint' })` puts every paper-world plate on the set's light paper and every night plate on its dark one. `plate.paper` changes one plate. Each paper brings its own palette, vignette, grain strength, topographic loops, header sound and, optionally, a treatment that changes how the whole scene looks on it (a blue tint, sepia, chalk tooth, a glow). The HUD is never treated.

| Set | Paper world | Night world | Status |
|---|---|---|---|
| `notebook` | `cream` | `night` | In `engine.js`; the default |
| Others (blueprint, lab, chalk, codex, toned) | | | Planned; each lands as `toolkit/grounds/<name>.js` |

Pick one set per film and switch only with a reason (a flashback on another paper, say). Subject colours that read on cream may not read on a coloured paper, so check them on the chosen set's `story_swatch.js` plates.

Texture rules for new papers. Short-form video is re-encoded hard (TikTok, YouTube Shorts), and these keep a texture from turning into mush or bands:
- Grain in specks of 2 px or more (`paperKit.grain(g, amt, seed)` does this by default). Single-pixel grain is the first thing re-encoding removes.
- Grid lines at least 1.5 px wide, at least 8/255 brighter or darker than the paper (a different hue alone is not enough, because colour is stored at lower resolution), and never closer together than 30 px.
- Put mottles over a dark gradient, or it bands. The night gradient spans only about 9 brightness levels across the frame.
- Contrast against the texture: ink 7:1 or more, label text 4.5:1 or more, the accent (a graphic, not text) 3:1 or more. `smoke_test.py` checks this on every paper. The notebook's vermilion measures 2.5:1 on cream and keeps a lowered floor so older films look the same.

## Palette

| Role | Hex | Role | Hex |
|---|---|---|---|
| Paper | `#ebe2cc` | Accent (vermilion: reticles, active state, dial) | `#d8643a` |
| Ink | `#1b1518` | Periwinkle (rules, rulers, leaders, ticks) | `#8487c6` |
| Soft ink (subtitles) | `#4a3f35` | Sea | `#2f7f98` |
| Muted (lines, rules, ticks; not text) | `#8a8176` | Sun | `#e3a03c` |
| Label text (`PAL.label`, `labelOf()`) | `#544b42` | Night label text (`PAL.nightLabel`) | `#9c9dc0` |
| Card paper (92% opaque) | `#ece6d8` | Leaf and grass | `#6f9a58` |
| Night | `#0b0a1e` | Soil | `#baa27e` |
| Night ink | `#dcdcef` | Hydrogen pink | `#e8577a` |
| Night muted (lines, not text) | `#77789a` | Molecule navy | `#26336a` |
| Gold (angles, highlights) | `#e6c65c` | Cyan / mint (series) | `#56c3d2` / `#53ba8b` |

Keep subject colours muted and slightly warm. The accent orange means "look here", so reserve it for the reticle, the active state dot, the dial progress, and the hero's own chart mark.

## Type

| Use | Face (closest free match) | Setting | Speed |
|---|---|---|---|
| Plate title | **Fraunces** 500, 64 px (title card 104–112 px) | Sentence case; each glyph pops in place | 17 glyphs/s |
| Subtitle, notes | Fraunces *italic* 30 px (stat notes 28 px) | Lowercase, types on | 30 chars/s |
| Kickers, labels, axes | **IBM Plex Mono** 22 px | ALL CAPS, letter-spacing 1–8 px | 30–40 chars/s |
| HUD (Journey Log, stage dial, hero tag) | **IBM Plex Mono** 18 px labels, 21 px values | ALL CAPS, letter-spacing 1–3 px | 40 chars/s |
| Callout title / sub | **Inter Tight** 600, 32 px / 400, 28 px | Lowercase; the sub is the label tone | 30 / 45 chars/s |
| Big numbers | Fraunces 500, 56–62 px, tracking −1 px | `≈` prefix, thousands separators, real units (`km³`, `µm`) | Count-up over 1.3 s |
| Colophon | Plex Mono 20 px, spacing 6 | Centred on the end card | 60 chars/s |

Use real subscripts and superscripts (`H₂O`, `km³`, `10²⁰`) with the `SUB()` and `SUP()` helpers. **Reading time:** a line needs `readTime(s)` = characters ÷ 12 + 0.8 s on screen before anything may replace it.

## Text size and legibility

A film is made at 1920×1080 but watched smaller: in a laptop browser window at about 0.75× and on a phone at about 0.44×. A 14 px label lands at about 6 px on a phone, which nobody can read, and grey text that looks quiet on a monitor disappears on a small, bright screen. So every line of text has a **role**, and each role has a floor measured on screen, after the camera:

| Role | Floor | What it covers |
|---|---|---|
| `fact` | 28 px | Callout titles and subs, stat values and notes, any line that carries a fact the story depends on |
| `label` | 22 px | The default: chart axes and ticks, legends, ruler marks, card titles, stat kickers, scene labels, captions |
| `hud` | 18 px | Journey Log labels and values, the stage dial's text, the hero's ID tag |
| `decor` | exempt | Frame counter, `FIG.` numbers, the `PLATE` kicker, marks written on an object (dial digits, hex codes on a paint chip, server tags) |

Every role but `decor` also needs **contrast of at least 4.5:1** against what is actually behind it, measured on the pixels. Pass the role as `o.role` on `text()`; the engine's components already do, so `stat`, `callout`, `card`, the charts, the ruler and the HUD meet their floors by default. `toolkit/legibility_check.mjs` measures all of it. `decor` is for real ornament only: a line a viewer needs to read meets its floor instead of being exempted.

- **Tone.** Secondary text uses `PAL.label` / `PAL.nightLabel` (`labelOf(dark)`), which stay warm and quiet but clear 4.5:1. `PAL.muted` and `PAL.nightMuted` are for lines and ticks, not text. For coloured text (a series name, a ruler mark), `legible(color, dark)` darkens the hue on paper or lightens it at night until it reads; `inkOn(bg)` picks ink or pale paper for a label written on a coloured surface.
- **Backing.** Text on a night plate, or over busy art, sits on something readable. `callout`, `stat`, the plate header, the Journey Log and the hero tag give their words a **glyph halo** by default, the cartographer's knockout: before the letters are filled, the same glyphs are stroked in the plate's paper colour (night paper on night plates) with a round-joined line about a quarter of an em wide. Line art clears only in a thin band around each letter, so the words read and the drawing behind them stays whole. `backing: 'card'` puts a block on a torn scrap of the same paper with a pencil edge and a small shadow, for a line that needs a real card; `backing: false` turns it off (for text deliberately written on a surface). Scene labels use `haloText(s, x, y, opts)` or `KIT.caption(..., { backing: true })`. Never erase a soft box out of the drawing behind a line (a paper hole in the artwork reads as damage, not as the notebook), and never draw a UI box: no flat fill, no rounded rectangle, no solid border.
- **Camera.** Scene labels drawn in `draw()` scale with the camera: a 30 px label under a 0.5× pull-back lands at 15 px. Put labels that must stay readable in `overlay()`, or draw them with `screenText()` (or `KIT.caption(..., { screen: true })`), which keeps their on-screen size.
- **Bigger type needs room.** A bottom card with a two-row ruler needs about 180 px of height; a chart needs about 40 px left of its axis and 70 px below it. Long credits and notes go on several short lines, so each line gets its own reading time.

## Line and texture

- **Two kinds of line:**
  - `pen()` is a nib stroke: tapered ends, slow pressure variation, and a pen-tip taper while it draws on. Use it for subjects: outlines of big things, horizons, ground lines, rays, rain, branches, and callout leaders.
  - `ink()` is a constant-width wobbly line. Use it for measurement (rulers, ticks, scale bars, grids) and for small repeated marks. `double: true` adds the faint second contour the reference shows on cards and clouds.
- **The boil:** every wobble re-rolls every 2 frames (animation "on twos"), so still lines feel alive. The HUD counter shows it: `EXP` is always `F / 2`.
- **Shading is pen strokes, never gradients.** Put **two textures minimum** on any fill wider than 200 px, and make at least one of them denser on the shadow side.
- **Weight shows depth:** far objects get `w` 2 at alpha 0.7; near objects get `w` 3.5 and shading.
- **Vary the scenery.** Don't reuse one landscape on every paper plate. Change the ground (valley, mountains, open sea, cutaway), add trees, a far mountain range or a flock of birds, and give the recap its own composition.

| Material | Recipe |
|---|---|
| Sea / lake | Flat teal. `hatch` angle 0.02, gap 9, len 14 in a light tone (alpha 0.5), then again in a dark tone (alpha 0.35, `keep` denser with depth). 12–20 S-curve wave strokes with `pen` w 2. A column of gold dashes under the sun. |
| Cloud | `lobedCloud(x, base, [[dx, r, dy], …])`: lobes outlined back to front, two underside hatch passes each, a flat `pen` base line. |
| Soil / sand | Flat ochre, `stipple(poly, 2000+)`, then `hatch` angle 0.1, gap 5 in a darker brown. |
| Gravel / aquifer | `pebbles(poly, 200–300, { rmin: 6, rmax: 16 })`. Aquifers add horizontal teal dashes. |
| Rock / bedrock | Dark flat, `scribble` angle 0.5 gap 12, plus short vertical `hatch`. |
| Ground line | `pen` w 4, plus `grass(ridge, { every: 30 })`. |
| Sun | Flat, plus `crosshatch`, plus 16–20 tapered `pen` rays of alternating length. |
| Solid body (cell, drop, organ) | Flat, `shade()` away from an upper-left light, and a short white highlight arc at the upper left. |
| Night body | Flat navy, `speckle`, a highlight arc, and a scattered pink/cyan ring. |
| Far mountains | Jagged polygon, flat grey, `shade()` with light from the upper left, a white snowcap with a zig-zag lower edge, `pen` outline. Keep peaks below any stat that sits above them. Use parallax depth about 0.3. |
| Tree | Tapered `pen` trunk, `shape.blob` canopy (irregularity about 0.28) filled leaf green, `shade()` in dark green, canopy swaying 2–3 px. |
| Birds | 4–5 small `pen` "v" shapes crossing the sky at about 40 px/s, wings flapping. Cheap motion for any paper sky. |
| Coast cross-section | Clip the land layers to a coastline polygon, fill the sea on the other side, and run the mountain's rock down under the valley. |

## Brushes

Beside `pen` and `ink`, the engine has a natural-media brush set (`brush.stroke`, `brush.hatch`, `brush.field`) and watercolour washes (`wash`, the same as `brush.wash`). The techniques are adapted from [p5.brush](https://github.com/acamposuribe/p5.brush) by Alejandro Campos Uribe (MIT) and rebuilt for the 2D canvas; nothing is loaded at runtime. `story_brushes.js` shows every one of them.

| Medium | Reads as | Use it for |
|---|---|---|
| `pencil-2b` | Soft, dark, grainy graphite | Sketched subjects, loose outlines, notebook drawings |
| `pencil-hb` | Everyday pencil, lighter grain | Hatching, small details, annotations drawn in the scene |
| `pencil-2h` | Hard, pale, thin | Construction lines, perspective guides, faint grids |
| `cpencil` | Waxy coloured pencil (vermilion by default) | Coloured accents, children's-drawing warmth, a sun or a flower |
| `charcoal` | Broad, dusty, broken | Mountains, shadows, dramatic masses, rubbed backgrounds |
| `marker` | Round felt tip, pigment pooled at the edges | Highlights over text, bold diagram strokes, labels |
| `marker-2` | Chisel marker whose width turns with direction | Underlines, lettering, wide flat bands |
| `techpen` | Crisp, constant width, an ink blot where it starts | Technical diagrams, boxes, arrows, anything that should look exact |
| `spray` | Airbrush mist with droplets | Haze, glow, smoke, mist behind a diagram |

- **Washes are a tint under the ink.** Draw `wash()` first and the `pen`/`ink` lines on top; the ink lines stay on top and carry the drawing. Let the wash run a little past the line (`bleed`); a wash that stops exactly at its outline looks like a digital fill.
- **This relaxes the old rule.** Shading used to be pen strokes only. Watercolour washes are now allowed as flat-ish tints with pooled edges and paper grain, and brush hatching counts as a texture. Smooth digital gradients are still not allowed: no `createLinearGradient` or `createRadialGradient` fills on subjects.
- Keep one or two media per scene besides the house ink. Pencils and charcoal suit sketchbook plates, markers and the technical pen suit diagrams, and washes suit landscapes and night bodies (on night paper they blend as a glow).
- Moving art passes a `seed`: the grain stays fixed per seed and only the outline boils, like `pen()`.

## Composition rules

- Scenes **bleed to all four edges**. Ground layers run under the cards, and nothing floats in a band on empty paper.
- Put the horizon at 48–52% of the height. Every paper plate gets a sky element (sun, cloud, birds, a branch).
- **Three regions, one idea each:**
  - the top-centre band, for the big stat;
  - one side, for callouts or a side card;
  - the bottom card.
  A new beat in a region waits until the previous one has cleared.
- Leave empty paper where callout text will land. Never put a callout over busy art. When the hero is on the right half, flip the callout to `align: 'right'`.
- The HUD and the hero reticle are furniture. They never scale with the camera.

## Layout: bands and clearances

This section is guidance for arranging a scene, not a grid to copy. Every plate is composed differently, and fixed coordinates handed down from a reference collide with whatever the next plate needs. Decide where things go by what each region of the frame is for and what sits behind the text, then let `legibility_check.mjs` tell you whether the result reads.

**Two bands belong to the furniture and stay clear of artwork.**

- **The header band** runs across the top of the frame: the PLATE kicker, the title, its rule and the subtitle. Nothing drawn in the scene should pass behind those lines: no mountain peak under the subtitle, no gauge rising into the title, no chain crossing the rule. Compose the scene below it, or let only sky, paper or night texture sit there. If the camera pushes in and the art rises into the band, frame the push lower or start it after the header has faded.
- **The Journey Log band** runs down the upper right corner: the log title, its rows and the STATE switch. Keep the scene's own subjects out from behind it for the whole plate, including while the camera moves. A press, a chart or a crowd that fills the right side stops short of the log, or the log's plate is one where the right side is quiet.

The stage dial and the frame counter in the lower corners work the same way on a smaller scale: the bottom card and the ground line run past them, but nothing with its own marks (a scale bar, a label, a gauge) sits behind them.

**Text on a dark or busy plate sits on a card or a halo.** A night plate full of speckle, a hatched cross-section or a crowded diagram is not a background for bare text. Put the line on a card, or give it a halo, using the `backing` option the engine's callouts, stats and Journey Log take; don't hand-draw a box per line. On plain paper or an open night sky, bare text is fine.

**Overlap is right when the text is written on the surface it belongs to.** A label on a jar, notes on a card, a number printed on a panel, handwriting on a sheet of paper, a name on the side of a tablet: the surface is the text's ground, and the eye reads them as one object. Overlap is wrong when:

- the text sits on line art of similar weight: an italic subtitle over pen hatching, a callout sub across a tangle of polymer chains, a label crossing another label's leader;
- the text sits on something whose own marks carry meaning: a clock face, a gauge, a dial, a chart's axes or curve, a ruler's ticks. The viewer has to read both, and cannot read either.

The Slow Squeeze failed on both: subtitles printed through gauge faces, a callout laid across the press's bolted platen, labels on top of the chains they named.

**How to fix a clash**, in the order to try them:

1. **Move it.** Put the text on empty paper beside what it names and let the leader do the pointing; flip a callout to the other side (`align: 'right'`) when the hero is on the right half.
2. **Re-sequence it**, so the two never share the frame: the callout clears before the gauge swings up, or the chart draws after the note has faded. Two things that each need reading do not need to be on screen at the same moment.
3. **Put a card behind it** (`backing`), when the text has to stay where it is, over the art it describes.
4. **Change weight or colour**, as the last step: make the art behind it fainter (far objects at lower alpha and thinner `w`), or set the text in a weight or colour that separates from the lines under it. This helps with texture; it does not rescue text over a gauge or a chart.

`legibility_check.mjs` enforces the result on the rendered frames: it flags text whose contrast or background busyness fails, and its crops show where. A clean `text_check` is not enough, because text boxes can be clear of each other and still sit on art. Fix every `CLASH` line it prints before Gate 2.


**What the check cannot see.** `legibility_check` judges whether a line can be read. It cannot judge whether the line belongs where it is: a subtitle whose glyph halo keeps it perfectly readable can still run across a gauge face and nibble the ticks that give the gauge its meaning, and that passes. Text over something whose own marks carry meaning — a gauge, a clock, a chart, a ruler — is a composition fault, and it is yours and the film reviewer's to catch by looking.
## Plate furniture

The first four rows are drawn by the engine in fixed places, so they are facts to design around. The last three are yours to place: they are described by where they sit relative to the scene and the HUD, not by coordinates, because the right spot depends on what the plate is drawing ("Layout: bands and clearances").

| Element | Where | What it shows |
|---|---|---|
| Plate header | Kicker at (90, 95), title baseline (88, 158), rule at y 180, subtitle baseline (90, 221) | `PLATE  III` / *Rising & Cooling* / *warm air climbs, expands and chills* |
| Journey log | x 1518–1868 (wider to the left when a row needs it), header at y 70, rows every 34 px from y 114 | `JOURNEY LOG · H₂O·01`, 2–3 rows, then a three-way STATE switch (`○ ICE ● LIQUID ○ VAPOUR`) that wraps under the STATE label when it does not fit |
| Stage dial | Card at (45, 900, 358×138) | Ring with 12 ticks, orange progress arc, `STAGE 02 / 11`, stage name. Stages group plates: 11 stages over 15 plates. |
| Frame counter | Baseline (1868, 1046) | `EXP 0360    F 0720` |
| Big stat | In open paper near the top of the scene, clear of the header band and the Journey Log, and on the side of the frame the subject is not | Kicker, count-up number, italic note giving the assumption |
| Bottom card | Along the bottom edge, between the stage dial and the frame counter, below anything the scene needs the viewer to watch | Distribution bar, log ruler, budget equation |
| Side card | Beside the subject, below the Journey Log, on whichever side the scene leaves empty | `FIG. 2` panels: charts, size series, cutaways |

## Choosing the paper set

A paper set is a light paper for the paper plates and a dark paper for the night plates. A story picks one with `defineStory({ paper: '<set>' })` and every plate keeps its `dark: true / false`, so the two-world grammar above still holds. The planner picks the set from the topic and writes it at the top of `script.md` as `Paper: <set> (why)`. Defaults:

| Topic | Set | Light / dark paper |
|---|---|---|
| General stories, nature, anything that doesn't fit below | `notebook` | cream / night (the default) |
| Devices and processes: presses, dies, pumps, microfluidic chips, manufacturing | `blueprint` | whiteprint / blueprint |
| Cell and molecular work, drug delivery, imaging | `lab` | graph / fluorescence |
| The same, with a greener, engineering feel | `engineering` | graphgreen / fluorescence |
| History of science, discovery stories | `codex` | laid paper / star atlas (build C) |
| Lecture-style shorts | `chalk` | whiteboard / chalkboard (build C) |

One film uses one set. A single plate may name another paper (`plate.paper = 'semilog'`) when that scene is a different kind of page, such as a release curve on semi-log paper; say why in the plate's row of the script. Mixing two whole sets in one film needs a reason the viewer would see, such as a "then and now" story.

### Blueprint

- **Whiteprint (light):** off-white `#eeede4` with a faint non-photo-blue drafting grid and soft developer streaks. The treatment tints the whole scene toward diazo blue `#2a3f96`, so every subject becomes a shade of one blue. Ink `#1d3470` (10.1:1), labels `#3c4c80` (7.0:1), a red-pencil accent `#c2412d` (4.4:1).
- **Blueprint (dark):** Prussian-blue gradient `#1f4d8b → #194377` with uneven exposure, a white grid at 8% or less, two fold creases, white fibres and specks. The treatment tints toward `#2d62b0` and punches a light paper tooth through the drawing. Ink `#eef4ff` (7.6:1 at the top, 9.0:1 at the bottom), labels `#c4d6f0`, accent warm yellow `#ffd166` (5.8:1): the vermilion is only 2.7:1 here.
- **Linework:** real cyanotype lines are pale cyan, `PAL.bpLine` (`#9bc4d3`). It measures only 4.0–4.5:1, so use it for lines and fills, never for text; text stays near-white.
- **What the tint does to meaning:** the treatment removes hue from everything inside the scene (the HUD keeps its colours). Two subjects that differ only in colour, such as a red and a green particle, look alike on these plates. Tell them apart by shape, size, hatching or a label instead.

### Lab

- **Graph (light):** warm white `#f1efe6`, a teal 30 px grid with a heavier line every 150 px, and a red lab-book margin rule at x 58 (behind the stage dial). No treatment: lab notebooks are drawn in colour. Ink `#1a2130` (14.0:1), labels `#465063` (7.0:1), accent `#c8452a` (4.2:1).
- **Fluorescence (dark):** near-black `#07080b` (never pure black, which causes halation on phone screens) with faint out-of-focus coloured glows. The treatment raises saturation (`saturate(1.35)`) and adds a soft bloom, so fills glow the way stained cells do. It is the one treatment with a measurable cost, about 30 ms a frame on its plates. Ink `#e6eeff` (17.2:1), labels `#aeb8cc` (10.0:1), accent `#ff7a45` (7.7:1).
- **Channel colours:** on fluorescence plates `PAL.pink`, `PAL.mint`, `PAL.cyan` and `PAL.navyFill` become the colour-blind-safe channels, also available as `FLUOR.magenta` `#ff4df0`, `FLUOR.green` `#3dff7a`, `FLUOR.cyan` `#33e1ff` and `FLUOR.dapi` `#4f7bff`. Pair magenta with green or cyan, never red with green. DAPI is lifted from pure blue, which is only 2.3:1 on black.
- **Scale bar:** `KIT.lab.scaleBar(t, { x, y, len, label })` draws a microscope scale bar (a solid bar with its length above it) for fluorescence plates.
- **Single papers for one plate:** `graphgreen` (pale green engineering pad), `dotgrid` (bullet journal, a dot every 30 px), `hexpaper` (hexagon lattice for chemistry), `semilog` (linear across, three log decades up, for release and clearance curves). Each is a light paper, so naming it on a plate puts that plate in the paper world.
