# doodle-art-animation v0.13 — acceptance (go / no-go)

The ledger agreed with Kosta on 2026-09-17, turned into checks. `tests/doodle-art-animation/acceptance_check.py`
runs every **[auto]** item (`--static` for the text and file checks, add `--full` for builds, renders and timing).
**[eye]** items need evidence (a named frame sheet or clip) looked at by a person or the final reviewer.
v0.13 ships only when every auto item passes, every eye item has evidence, and the existing gates still pass
(`smoke_test.py`, marketplace validation in CI, `text_check` CLEAN on the example films).

Paths below are relative to `plugins/doodle-art-animation/skills/doodle-art-animation/` unless they start with
`plugins/` or `docs/`.

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
- [auto] It exits 0 on `story_example.js` and `story_one_drop.js`, and exits 1 with `SNAP` on the fixture
  `tests/doodle-art-animation/fixtures/story_snap.js`.
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
- [auto] Workflow step 3 says `scene script` and asks for a short summary for films over about a minute, not
  the full table.

## L12 · Continuity and flow
- [auto] `references/animation-principles.md` exists and covers overlapping action, follow-through, staggered
  starts, hand-offs, moving holds, arcs, anticipation, and one main motion with supporting motion, with
  do / don't examples in engine terms.
- [auto] SKILL.md step 3 and the key rules point to it.
- [eye] It reads as practical guidance a model can act on, not a list of terms.

## L13 · Frame sheets for a time range
- [auto] `node render.mjs film.html --sheet-range 2-4 --fps 6 --dir D` writes `D/range_2-4.jpg`, a grid of
  frames from that range.
- [auto] Workflow step 5 requires a range sheet per scene (and close-up crops for detail) and names `--sheet-range`.

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
- [auto] SKILL.md workflow has an intake step 0 that points to it.

## Release
- [auto] `plugin.json` and the marketplace entry say `0.13.0`.
- [auto] `smoke_test.py` passes on every bundled story, including `story_brushes.js`.
- [eye] Final independent review against this file and the ledger; example films and gallery re-rendered and
  sent to Kosta.
