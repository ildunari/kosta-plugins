# Writing, adapting a subject, and the plate script

Read this when planning the film.

## Explainer voice

- **Title card:** kicker `A FIELD STUDY IN 15 PLATES`, a title of 2–4 words, and an italic subtitle naming the hero's journey (*the journey of one molecule*).
- **Plate titles** are plain nouns or verb pairs: *The Ocean*, *Evaporation*, *Rising & Cooling*, *Melt, Run, Soak*.
- **Subtitles** are one lowercase italic line of 4–8 words that states the mechanism literally, with a little life: *sunlight shakes a molecule loose*.
- **Big stats:** one number per plate, with `≈`, a unit, and a note stating the assumption.
- **Callouts:** titles of 2–4 lowercase words (*hydrogen bonds break*); the sub is one concrete fact.
- **Correct myths in place:** show the wrong picture, cross it out with two `pen` strokes, label it (*not a teardrop*), then `eraseOut` it.
- **Recap plate:**
  - every path and flux at once (`fluxArrow` width ∝ √flux);
  - the hero's route retraced with `journeyPath` and roman-numeral waypoints;
  - a closing balance equation (`413 − 373 = 40 = 113 − 73`);
  - enter it with a pull-out.
- **End card:**
  - the hero in a reticle;
  - one italic line that reframes the film (*Every glass of water has done this before.*);
  - the colophon `TITLE · N PLATES · N FRAMES · DRAWN IN CODE`;
  - `SOURCES · …`.
- **No narration.** On-screen text carries the story, so give every line its reading time.

## Adapting any subject

- **The hero.** Choose the smallest thing that passes through every stage: a molecule, a particle, a photon, a dollar, a data packet, a nutrient, a vote, a transcript.
  - Declare it as `hero: t => ({ x, y, label, r })` in scene coordinates.
  - The engine draws its reticle at a constant size, applies the camera, and aims the transitions at it.
- **The journey log.** Pick 2–3 quantities that change along the route (time elapsed, plus place, depth, size, concentration or amount) and one three-way state (ICE/LIQUID/VAPOUR, FLOWING/LODGED/RELEASING, QUEUED/IN-FLIGHT/DELIVERED). Time should jump in honest units as the scale changes: seconds, then days, then years.
- **The scale ladder.** Sort the plates by size, then design each seam (see "Designing the seams"). Paper plates show where things are, and night plates show how they work.
  - Between worlds use `lensIn`/`lensOut`; within a world use `zoom`.
  - Same-scale moves use `pan` (along the journey), `cut`, `wipe`, `iris` or `bleed`, chosen by meaning.
  - Use `morph` whenever an object persists across the cut.

**Data maps onto components like this:**

| The source contains | Use |
|---|---|
| One headline quantity | `stat()` with `countUp`, cleared before the next beat |
| Parts of a whole | Bottom card with a segmented bar and labelled segments |
| Values across orders of magnitude | `logRuler()` in a card |
| A process over time | `lineChart()` in a side card, drawn on in sync with the journey log's clock |
| A mechanism | A night plate with an entity diagram, groups entering with `stagger` |
| A named part | `callout()` |
| A route or cycle | `arrowPath`, `fluxArrow`, `journeyPath`, `textOnPath` |
| Things assembling | `gather()`: particles fly in to form a shape, then swap to the drawn shape |
| A budget or conservation law | The recap plate's equation card |

- **Datasets.** Chapters become plates. Put extremes and totals in stats, and distributions or trends in cards.
- **Source documents.** Pull the 10–20 numbers that matter, and turn each section into a plate with one stat and 1–3 callouts. Cite the document on the end card.
- **Honesty.** Mark estimates with `≈` and ranges with `–`, and say "illustrative" when a curve is schematic. Never invent precision.

## Designing the seams

A transition is part of the story, not a wipe laid over it. Design each one from both sides before choosing its type, and write it in the script's seam list (below the plate table):

- **Exit:** the last thing the viewer looks at, where it is on screen, and which way it is moving.
- **Entry:** the first thing the viewer should look at in the next plate, where it is, and which way it moves.
- **Link:** what joins them. Pick the strongest one available:
  - **colour or material** (a red eraser → a red ladybug shell): `through`;
  - **outline** (a drop → a planet, a cell → a city block): `shape`;
  - **position** (the subject stays put while the world changes): `cut` with `match`;
  - **motion** (something flies, flows or scrolls off one way): `pan` with `dir: 'auto'`, or any type with motion carry-over;
  - **scale** (inside it, or out of it): `lensIn`, `lensOut`, `zoom`;
  - **mood or time** (later, elsewhere, gone): `bleed`, `burn`, `hatch`, `iris`, `page`, `roll`.
- **Compose both ends to meet.** Place the entry object where the exit object will be when the cut lands, keep camera motion going the same way across the cut, and give the exit a reason (the pencil lifts, the ladybug takes off). If no link exists, change the plates until one does, or say so in the script and use a plain `cut`.

Example (`toolkit/story_seams.js`, "Pencil to Ladybug"):

| Seam | Exit | Entry | Link | Transition |
|---|---|---|---|---|
| I → II | pencil's red eraser, top centre, camera pushing in | ladybug's red shell, centre, walking | colour | `through` from the eraser (r 24) to the shell (r 44), fills set |
| II → III | ladybug flying off to the upper right | ladybug still flying right, slowing | motion | `pan`, `dir: 'auto'` |
| III → IV | ladybug landed on a poppy, right of centre | pencil sketch of the ladybug, half drawn | position | `cut`, `match: 1` |
| IV → V | the finished note | end card | chapter end | `page`, `dir: 'right'` |

## Plate script format

Write this before coding. One row per plate. Beat times are local seconds, written as start→end, with "→" alone meaning the beat stays:

| # | Plate (world) | Dur | Enter | Camera | Header: title / subtitle | Hero route | Beats (start→end) | Journey log | Stage | Sound |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Title (paper) | 6 | – | crane: s 1.14→1, dy −70→0 | *One Drop* / *the journey of one raindrop* | drop forms 2.6, falls 3.0–4.2, splashes | 0 ground draws on · 0.3 cloud lobes · 1.0 title pops · 2.0 rain · 4.2 ripples | – | – | noise sweep, plinks, chime 4.25 |
| I | The Valley (paper) | 7.5 | pan left 1.0 | follow pan, hills at parallax 0.5 | … | along a 3,400 px river | 1.1→4.1 stat ≈1,200 mm · 4.4→7.2 callout (flipped left, overlay) | T+ 0→40 min | 01 RUNOFF | chime 2.5, pop 4.4 |
| II | Inside the Drop (night) | 6.5 | lensIn 0.55 | push 8% + slow turn | … | jiggling centre | 0.1 a crowd of 120 molecules staggers in and swirls · 0.6 bonds flicker · 1.6→5.0 stat ≈1.4 × 10²⁰ · 3.8→ callout | … | 02 LIQUID | pitched plinks |
| III | The Cloud Within (night) | 6.5 | zoom out k 8 | push + rise + slight turn | … | bobbing | droplets rise in depth layers · 1.3 stat 20 µm · 2.9 size-ladder card · 3.4 ruler marks | … | 03 CLOUD | glide, updraft hum, pop |
| IV | A Raindrop (paper) | 7 | shape circle → bun | none; world scrolls up | … | bobbing, wobbling | 1.0→ callout · 2.8 myth drawn · 3.4 crossed · 4.8 erased | altitude 1,200→300 m | 04 FALL | bend, wind bed |
| V | The Whole Route (paper) | 10 | bleed 1.4 | pull-out 1.6→1, then slow push and pan | … | cloud → slope → river → sea → air | 0.9–4.6 flows draw on in turn (vapour, rain, runoff, groundwater) · 1.8 labels · 3.2→ stat ≈9 days · 5.6→ parts-of-a-whole card | T+ 1→9 days, place, state | 05 RETURN | plinks up the scale, chimes |
