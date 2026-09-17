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

A transition is part of the story, not a wipe laid over it. Design each one from both sides before choosing its type, and write it in the script's seam list (below the plate table). The built-in types are starting points. For a seam that carries meaning, write the transition yourself (see "Writing your own transition" in `references/motion.md`): no preset knows that an eraser and a ladybug are both small, round and red.

- **Exit:** the last thing the viewer looks at, where it is on screen, and which way it is moving.
- **Entry:** the first thing the viewer should look at in the next plate, where it is, and which way it moves.
- **Link:** what joins them. Pick the strongest one available:
  - **an object becomes another** (a red eraser → a ladybug, a drop → a planet, a cell → a city block): a custom morph built with `morphPose` and `softReveal`, or the `shape` preset for simple outlines;
  - **going into a surface** (a screen, a window, a pool of colour): `through`;
  - **position** (the subject stays put while the world changes): `cut` with `match`;
  - **motion** (something flies, flows or scrolls off one way): `pan` with `dir: 'auto'`, or any type with motion carry-over;
  - **scale** (inside it, or out of it): `lensIn`, `lensOut`, `zoom`;
  - **mood or time** (later, elsewhere, gone): `bleed`, `burn`, `hatch`, `iris`, `page`, `roll`.
- **Don't mirror.** After a push in, leave by a different, motivated move: track the subject, pan where it points, rise, or hand the camera to something moving (`references/film-grammar.md`, the switch-up rule).
- **Pace it.** Give scale and world changes 1.4–2 s, vary lengths and verbs from seam to seam, and give each seam a speed shape (a snap, a slow breath; `E.arrive`, `E.depart`), and start no text until the move has landed (`landAt(enter) + 0.4`). The speed limits are in `references/motion.md`.
- **Compose both ends to meet.** Place the entry object where the exit object will be when the cut lands, keep camera motion going the same way across the cut, and give the exit a reason (the pencil lifts, the ladybug takes off). If no link exists, change the plates until one does, or say so in the script and use a plain `cut`.

Example (`toolkit/story_seams.js`, "Pencil to Ladybug"; `story_example.js` lists its own seams at the top of the file):

| Seam | Exit | Entry | Link | Transition |
|---|---|---|---|---|
| I → II | pencil's red eraser, top centre, camera easing in | ladybug's red shell, centre, walking | an object becomes another (size, shape, colour) | custom: the eraser pops off, rounds, turns and arcs onto the leaf as the shell; head, spots and legs grow in; the garden dissolves in around it |
| II → III | ladybug flying off to the upper right | ladybug still flying right, slowing | motion | `pan`, `dir: 'auto'` |
| III → IV | ladybug landed on a poppy, right of centre | pencil sketch of the ladybug, half drawn | position | `cut`, `match: 1` |
| IV → V | the finished note | end card | chapter end | `page`, `dir: 'right'` |

## Plate script format

Write this before coding. One row per plate. Beat times are local seconds, written as start→end, with "→" alone meaning the beat stays:

| # | Plate (world) | Dur | Enter | Camera | Header: title / subtitle | Hero route | Beats (start→end) | Journey log | Stage | Sound |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Title (paper) | 6.5 | – | settle s 1.05→1, then push to 1.14 on the landing ripple | *The Long Release* / *the journey of one nanoparticle* | drop forms 1.0, falls 2.05–2.55, lands; NP·01 appears in the ripple | 0 frame lines draw · 0.25 blood floods in · 0.5→6.45 title types · 2.0 ruler Ø 150 nm · ripples keep spreading | – | – | noise sweep, plink, chime 2.6 |
| I | Into the Blood (paper) | 10 | through 1.8 (one plunge): blood surface → a red cell beside NP·01 | tracking: the world slides at half the particle's speed | … | along the vein, bobbing | 2.0→8.0 stat ≈430 billion per mg · 4.6→9.8 callout red cell (leader anchored through the camera) · 6.0→ size-ladder card | T+ 0→9 s, VEIN → RIGHT HEART | 01 CIRCULATION | heartbeat bed, pops |
| II | The Corona (night) | 10 | lensIn 1.4, dive 1.8 (a snap) | push 1→1.12 with a slow 0.05 rad turn | … | fixed centre | 1.2→9.6 backbone schematic · 72 proteins land in turn · 1.5→7.2 stat ≈70 g/L · 3.8→9.9 corona callout · 5.3→9.95 PEG callout · scale bar follows the zoom | T+ 12 s→5 min, diameter 150→172 nm | 02 CORONA | dark bed, plinks |
| III | Leaky Vessels (paper) | 12.8 | whip pan right 0.9, picking up the flow's speed: the flow carries the camera on (a switch-up after the lens-in, not a pull-out) | follow NP·01 at s 1.3 with lead room, then pull back to the full diagram 5.6→8.2 | … | along the capillary, down through a gap | 1.1→7.3 stat ≈380–780 nm · 1.4→6.7 junction callout (fixed label) · 5.2→12.6 EPR callout · 7.2 side labels · 8.3→12.6 lymph notes (wide view only) | T+ 6→24 h, FLOWING → LODGED | 03 EXTRAVASATION | heartbeat bed, chimes |
| IV | Slow Release (night) | 12 | lensIn 2.1, heavy (speed peak at 40%, long release; the slow breath), after a slow creep | slow push 1.06→1.14 with a sway | … | fixed; the particle swells and pits | 1.7→ release card, the curve draws with the clock · 2.2→7.6 hydrolysis callout · 6.6→11.9 diffusion callout | T+ 1→28 days, released % | 04 RELEASE | dark bed, plinks per drug |
| End | End card (night) | 10.5 | shape 1.6: the eroded particle → the emblem | – | – | – | drifting camera, ripples, turning tick ring, orbiting drug · 1.5 quote · 2.5 credits · 2.9 notes | – | – | pad, chimes |
