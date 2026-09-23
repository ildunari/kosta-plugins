# doodle-art-animation — acceptance (go / no-go)

v0.13's film and toolkit items are L1–L17, v0.14's workflow items W1–W9, v0.15's legibility, story and sound items V1–V8, and v0.16's speed item P1, at the end of this file. All are in force.

The ledger agreed with Kosta on 2026-09-17, turned into checks. `tests/doodle-art-animation/acceptance_check.py`
runs every **[auto]** item: with no flags it does the text and file checks, and `--full` adds builds, page probes, renders and timing.
**[eye]** items need evidence (a named frame sheet or clip) looked at by a person or the final reviewer.
A version ships only when every auto item passes, every eye item has evidence, and the existing gates still pass
(`smoke_test.py`, marketplace validation in CI, `text_check` CLEAN on the example films).

Paths below are relative to `plugins/doodle-art-animation/skills/doodle-art-animation/` unless they start with
`plugins/` or `docs/`.

**What these checks can and cannot do.** Most of the W items are rules about prose, and the checks read prose:
they catch a rule that was deleted, renamed, moved or contradicted by accident, which is how these documents
actually decay. They are not proof against someone writing text that satisfies the words and means the
opposite — two reviews have demonstrated exactly that, and each round of hardening only raised the price. Where
a rule could be turned into something mechanical (a file that must exist, a flag a tool must parse, a number a
render must hit) it has been. For the rest, the check is a tripwire and the review is the gate: when you change
one of these documents, read the rule next to it, and expect a reviewer to ask whether the text still means it.

The checks reject the prose each review used to defeat them, including negated stop-clauses, a `Gate 1` row
whose cells invert the rule, an uncapped fix loop, a description that says "invoked by" and then tells the agent
to start itself, and the timed deadline restored verbatim (`tests/doodle-art-animation/` has no copy of that
harness; it lived in the reviewer's scratch folder).

## Guiding rule (applies to every item)

The plugin fixes the base style, tone and tools; each film's model decides content, scenes, pacing and
transitions by its own judgement. New guidance explains *why* and gives defaults; it does not hard-wire numbers
a film may not cross, except snaps, determinism and reading time.

## L1 · Long Release end card has a real closing beat
- [auto] The end card (last plate of `toolkit/story_example.js`) measures a `motion_check` median ≥ 1.2 per drawing.
- [eye] A frame sheet of the end card shows a designed closing beat (something happens and resolves), not only drifting dust.

## L2 · Long Release title plate is livelier
- [auto] The title plate (plate 0) measures a `motion_check` median ≥ 1.2.
- [auto] The whole film still has no `SNAP`, and `text_check` is CLEAN.

## L3 · Speed checker from engine values, pace as a choice
- [auto] `toolkit/speed_check.mjs` exists. `node speed_check.mjs film.html` reads the transition and camera
  values from the page, prints one line per seam, marks `FAST` (a warning) and `SNAP` (a failure), and exits 1
  only on `SNAP`.
- [auto] It exits 0 on **every bundled `story*.js`** (the films the plugin ships are what a model reads as
  exemplary, so none of them may snap), and exits 1 with `SNAP` on the fixture
  `tests/doodle-art-animation/fixtures/story_snap.js`. `FAST` lines are allowed everywhere.
- [auto] `references/motion.md` has a section `## Pace is a choice` saying the speed numbers are defaults and
  each film sets its own pace by taste; only visible snaps are a hard failure.
- [auto] SKILL.md and `agents/seam-reviewer.md` mention `speed_check`.

## L4 · No Water Cycle film reference
- [auto] No `"The Water Cycle"`, `Opus 5 "Water`, `Reference:**`, `from the reference`, `the reference's`,
  `reference cloud` or `the reference measures` anywhere in the plugin.
- [auto] The One Drop example is still listed in SKILL.md, and the motion targets are still stated.

## L5 · General hero, plates are scenes
- [auto] SKILL.md says `one tracked hero subject`, defines plates as scenes, and no longer says
  `one small tracked`, `Something small` or `(a molecule, a particle, a photon)`.
- [auto] `references/writing.md` does not require the hero to be small.

## L6 · Night paper, not a microscope
- [auto] SKILL.md says `night paper` and no longer says `dark navy "microscope" world`.
- [auto] `references/style.md` describes night paper for inside, hidden or abstract views, not only microscopic ones.

## L7 / L14 · Primitives and key rules
- [auto] The SKILL.md art paragraph names `pen`, `ink`, `hatch`, `shade`, `stipple`, `scribble`, `speckle`,
  `shape.*`, `brush.*` and `wash`.
- [auto] The key rules mention the brushes, the new kits, `animation-principles.md` and `intake.md`.

## L8 · Native brush set (ported from p5.brush)
- [auto] `engine.js` has a brush section crediting p5.brush (MIT) and defines `brush.stroke`, `brush.wash`,
  `brush.hatch`, `brush.field` and a global `wash`, with stroke types `pencil-2b`, `pencil-hb`, `pencil-2h`,
  `cpencil`, `charcoal`, `marker`, `marker-2`, `techpen` and `spray`.
- [auto] The brush section uses no `Math.random`, `Date` or `performance.now`.
- [auto] The page hook `window.__brushProbe(kind, boil)` draws one sample of `kind` (every stroke type, plus
  `wash`, `hatch` and `field`) at a fixed seed and returns `{ hash, ms }`. The same arguments give the same hash
  on two calls (deterministic).
- [auto] Speed: the median frame time of `toolkit/story_brushes.js` is at most 1.5× the median frame time of
  `story_example.js` on the same machine.
- [auto] `references/api.md` documents every brush name, and `references/style.md` has a `## Brushes` section
  that credits p5.brush and allows washes as a tint under the ink.
- [auto] `story_brushes.js` builds and passes the smoke test.
- [auto] `story_brushes.js` measures no `SNAP` and no wholly still plate. It is a **specimen sheet**, so it is
  exempt from the 1.5 house median: measured at 1.23 (5% still), against `story_gallery.js` at 1.48. The
  exception, and why forcing it higher would make the brush texture read as crawling, is written into
  `references/motion.md` ("Specimen sheets are the one exception").
- [eye] The `story_brushes.js` frame sheet: each brush reads as its medium, fits the notebook style, and the
  texture does not crawl between drawings (a 12-frame strip at 12 fps shows only the normal line boil).

## L9 · New components
- [auto] `toolkit/kits/life.js` defines `KIT.life` with `quadruped`, `fishSchool`, `insect`, `flock`, `figure`
  and `crowd`.
- [auto] `toolkit/kits/settle.js` defines `KIT.settle` with `house`, `hut`, `tent`, `tower`, `village`,
  `skyline`, `road`, `bridge`, `ship`, `cart`, `fields`, `market`, `map` and `ruins`.
- [auto] `KIT.earth` also returns `river`, `volcano`, `cave`, `dunes`, `iceberg` and `flowers`.
- [auto] Every new component is a function in the built page, is listed in `references/components.md`, and
  appears in `story_gallery.js`; the gallery builds and renders with no page errors.
- [eye] Gallery frame sheets: every new component matches the ink style, draws on, and has idle motion.

## L10 · No feedback loop
- [auto] `FEEDBACK.md` is gone and SKILL.md has no Feedback Loop section. SKILL.md tells the model to suggest a
  plugin change when something goes wrong that the plugin should have prevented.

## L11 · Scene script and a short summary for the user
- [auto] The workflow step that authors the plan says `scene script`, and the user sees a short summary
  (at Gate 1), never the full table.

## L12 · Continuity and flow
- [auto] `references/animation-principles.md` exists and covers overlapping action, follow-through, staggered
  starts, hand-offs, moving holds, arcs, anticipation, and one main motion with supporting motion, with
  do / don't examples in engine terms.
- [auto] The script-authoring step and the key rules point to it.
- [eye] It reads as practical guidance a model can act on, not a list of terms.

## L13 · Frame sheets for a time range
- [auto] `node render.mjs film.html --sheet-range 2-4 --fps 6 --dir D` writes `D/range_2-4.jpg`, a grid of
  frames from that range.
- [auto] The build step requires a range sheet per scene (and close-up crops for detail) and names `--sheet-range`.

## L15 / L16 · New agents
- [auto] `plugins/doodle-art-animation/agents/` has `script-reviewer.md`, `sound-designer.md` and
  `audio-reviewer.md`, each with `name` and `description` frontmatter.
- [auto] `audio-reviewer.md` says it cannot listen and works from measurements (`audio_check`, cue times against
  transition times, loudness, a spectrogram image).
- [auto] SKILL.md names all three agents, and `skills/doodle-qa/SKILL.md` names all five.

## L17 · Intake questions
- [auto] `references/intake.md` exists and covers: asking permission first; 3–7 questions; up to four options
  with the recommended one first and marked `(Recommended)`; an `Other` answer; the question tool when present
  and plain text otherwise; skipping on "just make it".
- [auto] The workflow's intake step points to it.

## v0.14 — workflow ledger (W1–W9)

Agreed with Kosta on 2026-09-17 after a real Cowork run fired `script-reviewer` and then `sound-designer`
before a script existed, wrote the script afterwards, and then built with the reviews already stale.
The v0.13 items above stay in force; these add the phase and gate structure.

## W1 · The script step is split, and sound design has one home
- [auto] SKILL.md's workflow has a step that only authors the script, a separate blocking `Gate 1`, and a
  separate step for the sound plan. The script-authoring step does not mention `sound-designer`.
- [auto] No agent description contains a workflow step number (they drift), and `sound-designer` no longer
  claims "workflow step 5".

## W2 · Every agent refuses to start without its input
- [auto] Each of the five agent files has a `## Preconditions` section that names the file or artefact it needs,
  says to stop and report when it is missing, and offers no way to carry on without it: `script-reviewer` a script file, `sound-designer` a reviewed script, `film-reviewer` and `seam-reviewer` a built film, `audio-reviewer` an MP4 with audio.

## W3 · A phase table, not prose
- [auto] SKILL.md has a `## Phases and gates` table whose header names what each phase **needs**, what it
  **produces**, and which **lanes** may run at the same time, with a row for every phase and both gates.
- [auto] Gate 1's row needs `script.md` on disk and does not list the art lanes as concurrent work.

## W4 · Per-scene build lanes
- [auto] `references/build-lanes.md` exists and covers: one plate per agent, a range sheet as the agent's
  evidence, no engine edits, shared helpers in one file, assembly by the main session, and how style drift is
  prevented.
- [auto] SKILL.md's build step points to it.

## W5 · One shared QA render
- [auto] SKILL.md's assemble step says the sheets, strips and seam sheets are rendered once into `qa/` and that
  the reviewers reuse them instead of rendering their own.
- [auto] `film-reviewer`, `seam-reviewer` and `audio-reviewer` each say they reuse that set.

## W6 · Fix loop re-runs only what changed
- [auto] SKILL.md and `skills/doodle-qa/SKILL.md` both say to merge the fix list, apply it, and re-run only the
  checks affected by the change, and neither also demands the whole gate again.
- [auto] `doodle-qa` caps the loop: three rounds, then report what is still failing.

## W7 · The order is mechanical: the commands
- [auto] `skills/doodle-plan/SKILL.md` (intake, research lanes, script, Gate 1) and
  `skills/doodle-build/SKILL.md` (build lanes, assembly, one build, the shared QA render) exist, and all four
  commands — these two plus `doodle-qa` and `doodle-render` — carry `name`, `description` and
  `disable-model-invocation: true`, because they are the user's to type.
- [auto] SKILL.md names both commands.

## W8 · Agents don't invite themselves
- [auto] No agent description mentions acting proactively. Each one says, in a single sentence, which command
  invokes it (`doodle-plan`, `doodle-build`, `doodle-qa` or `doodle-render`) and that it never starts on its own initiative.

## W9 · Gate 1 never blocks and never fakes a clock
- [auto] `references/intake.md` has a `## The plan card, and why it has no clock` section which says a model cannot run a timer and
  a reply cannot arrive mid-turn; that the wait is bounded by the work the plan does not govern; that the run
  carries on rather than stalling; and what stays editable afterwards (the script and seams, until the final
  render). It must not instruct the model to wait a number of minutes as its only mechanism.
- [auto] SKILL.md's Gate 1 step says the same, and says which work may start while the card stands.

## v0.15 — legibility, story and sound (V1–V8)

Agreed with Kosta on 2026-09-18 after an adversarial review of "The Slow Squeeze", a Cowork film made from his
lab's paper with v0.13. All ten plates failed: text printed over artwork at contrast as low as 1.4 while
`text_check` reported CLEAN, story text at 13–16 px, a hero whose identity changed five times and whose log ran
backwards, a pressed tablet that came out the same height it went in, and 28 identical pops and 111 pen scratches.

Text roles used below: every engine text call carries a role — `fact` (callout notes, stat notes and any line
carrying a fact), `label` (the default: chart axes, legends, card notes), `hud` (Journey Log values and labels) or
`decor` (frame counter, figure numbers, the PLATE kicker and similar ornament).

## V1 · Legibility is checked on pixels, not boxes
- [auto] `toolkit/legibility_check.mjs` exists. `node legibility_check.mjs film.html` renders sampled frames with
  and without their text, and for every non-`decor` line measures its on-screen size, its WCAG contrast against
  what is behind it, and how busy that background is. It prints one line per failure (`CLASH`, `SMALL`), writes
  close-up crops of every flagged line with `--crops DIR`, and exits 1 on any failure.
- [auto] It exits 1 on the fixture `tests/doodle-art-animation/fixtures/story_clash.js` (text on line work and
  undersized story text) and on `tests/doodle-art-animation/fixtures/story_legmiss.js` (the final review's probes:
  faint ink, half a line on a dark block, haloed lines in dense hatching, glyph-by-glyph and single-glyph text, a
  gradient fill), and 0 on every bundled `story*.js`.

## V2 · Size and contrast floors for text the story depends on
- [auto] On screen, after the camera: `fact` ≥ 28 px, `label` ≥ 22 px, `hud` ≥ 18 px; contrast ≥ 4.5 for every
  role but `decor`. The floors are written in `references/style.md` with the reason (a 1080p frame watched on a
  laptop or phone), and `legibility_check` enforces them.
- [auto] The engine's own components pass these roles, so a story that uses `stat`, `callout`, `card`, the charts
  and the HUD gets the floors by default.

## V3 · Layout by guidance, not coordinates
- [auto] `references/style.md` has a `## Layout: bands and clearances` section: the header band and the Journey Log
  band stay clear of artwork, text on dark or busy plates sits on a card or halo, overlap is allowed when the text is
  written on the surface it belongs to, and how to fix a clash (move, re-sequence, card, weight, colour). It gives
  no pixel coordinates to copy.

## V4 · A story, not a tour of the source
- [auto] `references/writing.md` has a `## A story, not a tour of the source` section: one hero with one identity
  for the whole film; what it wants, what stands in its way, what changes; a source's sections become obstacles and
  turning points, not chapters.
- [auto] `agents/script-reviewer.md` checks for a tour of the document and for a hero whose identity changes.

## V5 · Things that are acted on change
- [auto] `references/animation-principles.md` has a `## Things that are acted on change` section (shape, size,
  rotation, texture, colour — while staying recognisable), the scene-script format in `references/writing.md` has
  a `Changes` column, and `agents/film-reviewer.md` fails a key object that stays static through the action that
  should change it.

## V6 · Sound with variety, still synthesized
- [auto] The engine's `SFX` has, besides its existing sounds: `crunch`, `creak`, `pump`, `relay`, `hiss`, `plop`,
  `slosh`, `shaker`, `clink`, `pour`, `foil`, `droplet`, `pageFlip`, `pegSnap`, and the beds `roomTone`, `rain`,
  `wind`, `cityHum`. Each takes a `seed`, and repeated calls vary unless a seed is fixed. All are synthesized; the
  plugin still ships no audio files.
- [auto] `references/sound.md` documents every one of them, the rule that different kinds of event get different
  sounds, and a loudness lift at the film's climax.
- [auto] `toolkit/cue_check.mjs` exists, lists every sound the film plays with its time, flags one effect dominating
  the film and identical repeats, exits 1 on a failure, and exits 0 on every bundled `story*.js`. Dominance is judged
  at any film length over the cues and seams (more than 30% plus two events of grace, from four events up); the
  automatic header typing and a bed's pulses are listed but not counted. It exits 1 with a failing `dominant:` line
  on the fixture `tests/doodle-art-animation/fixtures/story_monotone.js` (ten pops in 16 s).
- [auto] Unseeded repeats of a sound vary in their dominant component, and the variation is seeded by plate, time
  within the plate, name and repeat at that instant, never by call order (fixes from the final v0.15 review).

## V7 · Scene verdicts at fixed points
- [auto] `references/build-lanes.md`, `agents/film-reviewer.md` and `agents/seam-reviewer.md` use one scene-verdict
  format — PASS or FAIL, the evidence (an image path), the reason, and the fix — and say that a small fix is
  re-checked on its own chunk, not by a fresh review of the whole film.

## V8 · The story's own facts stay consistent
- [auto] `toolkit/story_check.mjs` exists. `node story_check.mjs film.html` reads each plate's header, stage, hero
  label and Journey Log over time, and exits 1 when a clock (`T+` values, ELAPSED / TIME / DAY rows, `DAY n`) runs
  backwards, header numbers repeat or run backwards, a stage exceeds `stages`, runs backwards or returns after a
  different one (consecutive plates may share a stage), or the hero's ID in the log title or its `hero()` label
  changes or the two disagree. It exits 1 on the fixtures `tests/doodle-art-animation/fixtures/story_drift.js` and
  `story_drift2.js` and 0 on every bundled `story*.js`.

## P1 · Renders and checks use the machine, and frames don't depend on render order
- [auto] `render.mjs` uses one page per CPU core (at most 8) when `--workers` is not given, encodes with x264's
  `medium` preset by default, and spreads `--stills`, `--sheet`, `--strips`, `--seams` and `--sheet-range` over
  several pages. `skills/doodle-render/SKILL.md` no longer holds cores back (the old rule was cores minus 2, which
  chose 2 workers on a 4-core machine: 187 s of drawing against 105 s with 4).
- [auto] `text_check.mjs` and `legibility_check.mjs` take `--workers`. `text_check` throws each frame's queued
  drawing away (`ctx.reset()`) instead of reading a pixel, since it only needs the text calls.
- [auto] `renderFrame` fills the canvas with paper before drawing, and on `story_one_drop.js`, `story_example.js`
  and `story_reel.js` every third drawing of every transition is at most 1 level apart whether frame 0 or its own
  neighbour was drawn before it (`--full`). Before v0.16 the pan's seam let the previous frame through (4–5 levels).
- [eye] The same QA sets and check results from one page and from several: `text_check` and `legibility_check`
  JSON identical on One Drop, The Long Release and the gallery; contact sheet, strips, seams and range sheets
  byte-identical except the pan seam's sheets, which changed because of the fix above.

## Release
- [auto] `plugin.json` and the marketplace entry say `0.16.2`.
- [auto] `smoke_test.py` passes on every bundled story, including `story_brushes.js`.
- [eye] Final independent review against this file and the ledger; example films and gallery re-rendered and
  sent to Kosta.
