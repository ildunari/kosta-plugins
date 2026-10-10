# 3DLight: the look

How a 3DLight frame looks, with the numbers the toolkit uses. The toolkit draws the backdrop, the text and the chrome; the film draws the art. Everything here is in the 1920 x 1080 design space.

## The feel

Calm, clean, adult and scientific. Think of a good product film or a journal cover, not a cartoon and not a game. Soft matte objects sit on a pale studio ground under a big soft light from the upper left. One accent colour per film. Lots of air. Restraint wins: when in doubt, leave it out.

## The ground

`L.backdrop()` (drawn once per film by the engine) has three layers:

1. a vertical gradient from the accent's `bg0` (top) to `bg1` (bottom);
2. a white radial glow centred at (1380, 430), radius 40 to 1000, alpha 0.9 at the centre, 0.4 halfway, 0 at the edge;
3. a floor haze from y 700 to the bottom, from clear to the accent's `floor` colour.

Move the glow behind the film's main object with `defineFilm({ backdrop: { cx, cy } })`. Never replace the ground with a dark, saturated or textured fill. There is no bokeh, on purpose.

## Accents

One accent per film, set with `defineFilm({ accent })`.

| Accent | `a` (accent) | `t` (text accent) | `soft` | `bg0` | `bg1` | Used by |
|---|---|---|---|---|---|---|
| `teal` (default) | #14917F | #0E7366 | #BFE6DC | #F5FBF9 | #D4ECE5 | the biocoating loop |
| `amber` | #E39B2D | #B0640A | #F6D9A8 | #F7FAFD | #DDE9F5 | warm topics: implants, release over time |
| `blue` | #3B7DD8 | #1F5BAA | #C8DBF3 | #F6F9FD | #D8E5F4 | the starter (new) |

- `a` fills the active beat tick, the card's accent bar, the top of the stat gradient and tag dots.
- `t` colours the kicker, the foot of the stat gradient and the card's second line.
- `soft` is a pale tint for art (a highlight band, a zone on a diagram).
- A brand colour: pass an object, `accent: { a: '#7A5CC8', t: '#5A3FA6' }`. Missing keys come from teal, so give `bg0`, `bg1` and `floor` too if the ground should change. Keep `bg0` and `bg1` very light (relative luminance above about 0.78, like the three built in).
- Contrast of `t` against `bg0`: teal 5.5, blue 6.3, amber 4.3 (fine for the 32 px bold kicker; use amber's `t` only for large text). A custom `t` needs at least 4.5:1 against `bg0`.

## Neutrals

| Name | Hex | Used for | Contrast on `bg1` |
|---|---|---|---|
| `NAVY` | #0F1B2D | headline, card name, tag text, leaders | 13.5 to 14.0 |
| `INK2` | #22344A | stat label | about 10 |
| `SLATE` | #40546A | sub line, note | about 6.2 |
| `MUTE` | #5E7086 | credit only | about 4.0 |

No pure black anywhere. Shadows use `rgba(20,36,58,a)`, a blue-black, never grey or black.

## Type

One typeface: **Sora** (variable, embedded by `build.py`). Characters outside its Latin ranges (`≈`, `→`, `×`) fall back to Inter or the system sans; the smoke test lists them.

| Role | Weight | Size (px) | Spacing | Colour | Position |
|---|---|---|---|---|---|
| Kicker | 600 | 32 | +6, capitals | `t` | x 110, baseline y 190; never moves |
| Headline | 700 | 116 to 92, 1 to 3 lines | -2 | NAVY | x 105, first baseline y 316, line height 1.07 |
| Sub | 500 | 50, up to 3 lines | 0 | SLATE | 96 px below the last headline baseline, lines 64 apart |
| Card name | 700 | 66 | -1 | NAVY | below a 96 x 9 accent bar, 74 px under the headline |
| Card line 2 | 600 | 52 | 0 | `t` | 70 px under the card name |
| Stat value | 700 | 156 to 112 (fits 740 px) | -4 | gradient `a` to `t` | baseline y 790 |
| Stat label | 600 | 44 | 0 | INK2 | from y 858, lines 54 apart, wraps at 740 px |
| Note | 400 | 27, 1 or 2 lines | 0 | SLATE | right-aligned at x 1840, baseline y 946 |
| Credit | 600 | 22 | +1 | MUTE | right-aligned at x 1840, y 994 |
| Beat ticks | | 34 x 7 bars, gap 8 | | `a` on 13% navy | x 110, y 986 |
| Tags on the art | 600 | 40 | 0 | NAVY on a white pill | where the art needs them |

The headline layout (`L.headLines`) picks the largest size and the most balanced break, and avoids ending a line on a short word (a, an, in, of, to, at, by, the, is). Write headlines that break well: 3 to 8 words, one claim.

## The text grid

- Text column: x 110 to about 920 (`L.LX = 110`, `L.TW = 800` for headlines).
- Art zone: x 940 to 1840, y 80 to 900. Big objects centre near x 1390, y 470.
- Note line: bottom right, y 910 to 1000. Keep the art out of it.
- Frame margin: nothing important closer than 80 px to an edge.
- The same grid on every beat, so the film reads as one piece.

## Materials

`L.M` holds the materials. Each is a set of `hi`, `mid`, `lo` and usually `rim` colours, used by `gsph`, `tube`, `ellSph` and the objects built on them.

| Material | Looks like | Good for |
|---|---|---|
| `white`, `pearl`, `grey` | soft white and grey | neutral particles, polymer, devices |
| `chain` | pale blue-grey | polymer chains (`tangle`, `stack`) |
| `amber`, `gold`, `drug` | warm orange, gold, pale yellow | drug crystals, specks, beads |
| `teal`, `strand` | teal, mint | mucus strands, coatings, accent objects |
| `blue`, `slateB` | mid blue, slate blue | antibodies, enzymes, cool parts |
| `coral`, `red` | soft coral, deep red | charge, blood, warnings (sparingly) |
| `cell`, `nuc` | pink tissue, mauve nucleus | cells, villi, gut lining |

Pick two or three materials per film plus the accent. A material can be made for a new object: `{ hi, mid, lo, rim }`, light to dark, all of one hue.

## The matte shading recipe

Every object is lit from the upper left by a large soft light. Build new objects the same way as `gsph`:

1. **Body**: a radial gradient from a point up and left of centre: `hi` at 0, `mid` at 0.42, `lo` at 0.86, `rim` at 1.
2. **Bounce**: a faint white glow from below (alpha 0.28), so the dark side is not dead.
3. **Highlight**: a soft white ellipse, upper left, peak alpha 0.42 or less. This is the matte rule. An earlier glossy draft used 0.95; the matte look replaced it.
4. **Contact shadow**: `L.cshadow(cx, cy, rx, ry, a, blur)` under anything that rests or floats near a surface. `L.ground()` is the two-layer shadow for objects on the floor.
5. **Sides and tops** of extruded shapes (tablets, cylinders, arrows): sides are a horizontal dark-light-dark gradient; tops are a radial white to `topMid` to `lo`; a thin white line on the front edge of a top face is a bevel, not gloss.
6. **Lines** (tubes, strands, chains): `L.tube` draws a dark core, a mid body and a narrow highlight at alpha 0.45.

Tube and sheen alphas are capped too: tube highlight 0.45, tablet sheen 0.16, rod highlight 0.4. Two booth objects are brighter on purpose: `glassBall` (it is glass) and `enzyme` (a small highlight). Use glass only for glass.

## Composition

- One focal object per beat, large (often 500 to 900 px wide), on the glow.
- A second level of detail inside it when the idea needs it: a `porthole` (a magnified round window) or a cutaway (`tablet` with `cut`).
- Labels on the art are `L.tag` pills (40 px), placed in clear space, with a `L.leader` (navy line, white dot) to the thing they name. Tags fade in once their object is in place and stay.
- Steps are `L.numTag(n, word, x, y)`: a numbered ball and a word.
- Depth: big near objects, smaller and paler far ones, soft shadows. No perspective grids, no floors with lines.
- Diagrams and curves are allowed when the script needs them: thin navy axes, the accent for the data, no tick numbers beyond those in the beat's fields, and "illustrative" in the note.

## What to avoid

- Gloss: hot white highlights, chrome, wet looks, lens flares, glints, sparkles.
- Bokeh, light leaks, vignettes, grain, film noise.
- Dark, black, saturated or textured grounds; cream or off-white paper.
- Glow, outlines or drop shadows on text; neon; purple-to-blue gradients; emoji.
- More than one accent colour; rainbow palettes.
- Busy art behind text, text crossing the art without a white tag behind it.
- Cartoon faces, mascots, hand-drawn lines (that is Doodle Draw).
