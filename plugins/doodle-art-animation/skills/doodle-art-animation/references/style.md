# Style guide

Read this before drawing any plate. It covers the two worlds, palette, type, line and texture recipes, composition and the fixed HUD positions.

## Two worlds, one scale ladder

| World | Use it for | Background | Ink |
|---|---|---|---|
| **Paper** | Human scale and larger: landscapes, organs, cross-sections, maps, diagrams | Cream `#ebe2cc`, soft-edged 45° bands (66 px every 132 px), large mottles, fibres, grain, warm vignette | Near-black `#1b1518` |
| **Night** | Inside, hidden or abstract views: molecules, cells, the inside of a machine, a chip or a network, a mind, deep space, night itself | Navy gradient `#0b0a1e` → `#16142e`, faint 120 px grid, crosshatch weave, specks, strong vignette | Pale lavender `#dcdcef` |

Both worlds carry four large, smooth topographic loops that drift slowly (muted pink, teal, yellow and periwinkle), plus crosshair registration marks in the corners. The end card is always night.

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
- **Backing.** Text on a night plate, or over busy art, sits on something readable. `callout`, `stat`, the plate header, the Journey Log and the hero tag draw a **halo** behind their words by default: a soft-edged patch of the plate's own paper (or night paper), like an eraser pass. Over empty paper it is invisible; over line art it fades the lines out behind the words. `backing: 'card'` swaps it for a torn scrap of the same paper with a pencil edge and a small shadow, and `backing: false` turns it off (for text deliberately written on a surface). Scene labels can call `backing(x0, y0, x1, y1, opts)` themselves, or use `KIT.caption(..., { backing: true })`. It is never a UI box: no flat fill, no rounded rectangle, no solid border.
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

## Plate furniture (fixed positions on a 1920×1080 frame)

| Element | Where | What it shows |
|---|---|---|
| Plate header | Kicker at (90, 95), title baseline (88, 158), rule at y 180, subtitle baseline (90, 221) | `PLATE  III` / *Rising & Cooling* / *warm air climbs, expands and chills* |
| Journey log | x 1518–1868 (wider to the left when a row needs it), header at y 70, rows every 34 px from y 114 | `JOURNEY LOG · H₂O·01`, 2–3 rows, then a three-way STATE switch (`○ ICE ● LIQUID ○ VAPOUR`) that wraps under the STATE label when it does not fit |
| Stage dial | Card at (45, 900, 358×138) | Ring with 12 ticks, orange progress arc, `STAGE 02 / 11`, stage name. Stages group plates: 11 stages over 15 plates. |
| Frame counter | Baseline (1868, 1046) | `EXP 0360    F 0720` |
| Big stat | Around x 600–720, y 200–340 | Kicker, count-up number, italic note giving the assumption |
| Bottom card | x 490 to about 1680 (keep the counter clear), y about 866, h about 180 | Distribution bar, log ruler, budget equation |
| Side card | About x 1260–1870, y 300–940 | `FIG. 2` panels: charts, size series, cutaways |
