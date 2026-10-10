---
style: 3dlight
name: 3DLight
---

# 3DLight

Clean, matte 3D motion graphics on a light ground. A bold headline sits on the left and the art moves on the right. Beats change with a soft dissolve, and a film can loop without a seam. Every path in this file is relative to this style's folder (`styles/3dlight/`). The phases and gates are the ones in the main `SKILL.md`.

## What it is and when to choose it

3DLight is for premium, sober films about biotech, medtech and products. It suits:

- booth and lobby loops that play on a screen all day (the first films were 45 s loops for an expo table);
- posters that move: one or two beats on a loop;
- short explainers for a pitch, an investor deck or a product page.

Choose Doodle Draw instead for a story told to learners, a hero's journey, anything that should feel hand-made, or a narrated film. 3DLight has no hero, no camera moves and no transitions other than the dissolve. It has no voice-over.

A film is a list of **beats**. Each beat is one idea: a headline, with an optional sub line, stat and note, on the left, and moving art on the right. A beat lasts 4.5 s on screen (`beat`). Its art is written in **art time**, 0 to 6 s (`art`), and plays 1.33 times faster. Motion is calm to write and brisk to watch. Ten beats make a 45 s loop. A film can also play once (`loop: false`).

## What the style fixes and what the film creates

The toolkit fixes the look. Don't restyle it per film: the light backdrop, the one typeface (Sora), the text grid and its entrance timing, the dissolve, the beat ticks, the accent palettes, the matte materials and shading, the sound instruments and the mix.

Each film creates the rest: the words and facts, the art of every beat, the links between beats, and the sound cues. Draw the art from the `L3D` primitives (spheres, tubes, tablets, capsules, cells, strands, tags) so it stays on style. New objects are expected; build them with the same shading recipe (`references/look.md`). The booth examples show the level of finish, not scenery to reuse.

## The toolkit

| Path | What it is |
|---|---|
| `toolkit/core.js` | Canvas basics: the canvas `C`, the context `X`, `txt`, `meas`, `rr`, `rng`, `off`, `withCtx`, `mix`. |
| `toolkit/l3d.js` | `window.L3D`: matte 3D primitives, materials `M`, accents `PAL`, the backdrop, tags and leaders, headline layout. |
| `toolkit/beats.js` | The beat engine: `defineFilm`, `drawFrame(T)`, dissolves, text timing, ticks, easing in `ANIM_UTIL`. |
| `toolkit/shell.html`, `build.py` | `python3 build.py story.js film.html` makes one self-contained HTML file with the font embedded. It is also a preview player. |
| `toolkit/render.mjs` | The MP4 render on parallel workers, plus stills, beat strips, the loop seam sheet and a contact sheet. |
| `toolkit/smoke_test.mjs` | The automated check: build, page errors, fonts, blank or dark frames, determinism, text collisions, the loop seam, library effect names. |
| `toolkit/browser.mjs` | Finds Playwright and Chromium and opens a film. The scripts above use it. |
| `toolkit/sound/engine.js` | The instruments (pad, bass, keys, mallet, chime, whoosh, tick, thump, pop and more) and the mix. |
| `toolkit/sound/score.js` | The arranger: music bed, soft rhythm, library effects, then the story's cues. |
| `toolkit/sound/render_sound.mjs` | Sound to WAV at -16 LUFS, muxed onto the MP4, plus a long file of repeated loops. |
| `toolkit/sound/stems.mjs`, `analyze_stems.py` | Music and effects stems, and a balance report per cue. |
| `toolkit/sfxlib.js` | A copy of the shared sound library (`../../sound-library/`). `build.py` inlines it. Never edit it here. |
| `toolkit/package.json` | `npm i` installs the Sora font, so `build.py` can embed it. |
| `toolkit/examples/story_starter.js` | The smallest complete film: 4 beats, an 18 s loop, blue. Copy it to start. |
| `toolkit/examples/story_booth_biocoating.js` | A finished 10-beat, 45 s booth loop (teal): mucus coats nanoparticles. |
| `references/look.md` | Palette, accents, type scale, the matte shading recipe, composition, what to avoid. |
| `references/motion.md` | Art time and screen time, the dissolve, continuity, the loop rule, text timing, pacing, speed. |
| `references/api.md` | Every story field, beat field and function. |
| `references/sound.md` | The sound palette: layers, instruments, library families, levels, the `cues.md` format. |

Shared craft lives in Doodle Draw's references. Read `../doodle-draw/references/intake.md` for the question round and the plan card, and `../doodle-draw/references/writing.md` for the explainer voice and how to adapt a source.

## Workflow

- **0 · Intake** writes `brief.md`, first line `style: 3dlight`. Run the question round from `../doodle-draw/references/intake.md`. Ask what matters here: where it plays (booth screen, web page, pitch), loop or play once, length (beats x 4.5 s), accent (teal, amber, blue or a brand colour), the kicker and credit lines, sound or silent, and the sources.
- **1 · Substance** writes `facts.md`. Every number on screen needs a source. Write down each condition too (in vitro, in rats, draft data): it goes in the beat's `note`.
- **2 · Script** writes `script.md`. A header: title, id, accent, kicker, credit, loop or once, number of beats, length. Then one table row per beat: `# | head | sub | stat | note | labels | visual | motion`. `visual` says what is drawn; `motion` says what moves and when, in art seconds. Below the table, a **continuity** list: which beats hand an object to the next, and how the last beat ends on beat 1's opening picture (loops). Word limits: head 3 to 8 words, sub one short line, stat value 2 to 12 characters, labels 1 to 3 words.
- **Gate 1 · Plan review.** Run `script-reviewer` on the saved `script.md` and apply its must-fix edits. Post the plan card: one line per beat, length, loop or once, accent, the sound idea. While it stands, set up the folder: `mkdir -p <film> && cd <film> && cp -R "${CLAUDE_SKILL_DIR}"/styles/3dlight/toolkit/. . && npm i`. If that variable is empty, the `toolkit` folder sits next to this file.
- **2b · Voice** does not apply. 3DLight films are not narrated; the words are on screen.
- **3 · Sound** writes `cues.md`. The `sound-designer` agent writes it from `references/sound.md`: the key and a chord per beat, rhythm levels, and cues per beat in art time. Runs beside the art. A silent film skips it.
- **4 · Art** writes `story.js`. Copy `examples/story_starter.js` to `story.js`, put the words from `script.md` into `defineFilm`, and draw each beat in its `draw(t, P)`. Check a beat with `python3 build.py story.js film.html`, then `node render.mjs film.html --strip N`. Up to about five beats, draw them yourself. From six beats, lanes may draw in parallel, one `beat_NN.js` each (`references/api.md`, "Lanes").
- **5 · Assemble** writes `film.html` and `qa/`. Put the cues into `sound` in the story and build. Render the QA set once: `node render.mjs film.html --sheet`, `--strip N` for every beat, `--seam` for a loop. Then `node smoke_test.mjs`.
- **Gate 2 · Check and review.** `smoke_test.mjs` must pass. Open the sheet, every strip and the seam sheet, and work through the QA checklist below. Run `film-reviewer` and `seam-reviewer` on `qa/`. Merge their fixes, apply them, and re-check only what changed: that beat's strip after an art fix, the smoke test after a word change. After three rounds, stop and ask the user.
- **6 · Render.** `node render.mjs film.html film.mp4`, then `node sound/render_sound.mjs film.html --mux film.mp4`. That writes `out_sound/<id>.wav` and `<id>_sound.mp4`, and for a loop `<id>_sound_long.mp4` (about ten minutes of the loop, no gap at the repeats). Run `audio-reviewer` on `<id>_sound.mp4`.
- **7 · Deliver** the MP4 with sound, the silent MP4, the long loop file for a booth screen, and `film.html`. The HTML plays the film: space pauses, the arrow keys move one beat.

Requirements: Node 18+, Playwright with Chromium, ffmpeg, Python 3 (numpy for `analyze_stems.py`). Fonts: run `npm i` in the film folder and `build.py` embeds Sora. Without it, `build.py` links Google Fonts, which needs the network while rendering. `render.mjs` refuses to render when Sora did not load.

## Sound

Every sound is synthesized when the film renders. `story.sound` sets the music (a chord per beat, felt `keys` or glass `mallet`), the rhythm and the cues. Effects come from two places.

- The engine's instruments, called in `cues(E, o, ev, U)` with art times: `E.pop(U.S(6.6), 700, 0.02, { pan: 0.2 })`.
- The shared library (`../../sound-library/catalog.md`), listed in `sound.fx` with screen times:
  `fx: [{ at: 12.3, fx: 'siliconeTap', g: 0.8, pan: -0.2, pitch: 2, size: 0.5, seed: 4 }]`.
  `at` is screen seconds from the film start (or `art:` in art seconds). `g` is relative gain: 1 peaks near -15 dBFS. Without `seed`, the cue's order gives one, so a re-render sounds the same. Inside `cues`, `E.fx('siliconeTap', t, { g: 0.8 })` does the same.

The smoke test fails a film that names an effect the library does not have. The palette, levels and `cues.md` format are in `references/sound.md`.

## The rules that matter most

- **Matte, never glossy.** Highlights stay soft, at most 0.45 white. No bokeh, lens flares, glow on text, neon or chrome (`references/look.md`).
- **Light grounds.** The backdrop is a pale accent gradient with a white glow behind the art. Never a dark or saturated ground.
- **One idea per beat.** One headline, one focal object, lots of air. Besides the headline, use at most two of sub, stat and note.
- **Text left, art right.** Text sits in the column x 110 to 920. Art stays in x 940 to 1840, y 80 to 900. The note line (bottom right, y 910 to 1000) stays clear.
- **Readable across a room.** Headline 92 to 116 px, sub 50, stat 112 to 156, labels on the art 40, note 27. Text is navy or slate on the light ground (contrast 6:1 or more). Text on busy art sits on a white tag.
- **The art keeps moving.** The main move happens between about 0.5 and 4 art seconds, then a living hold: a float, a drift, a flow. Eased moves only; no bounce, wobble, shake, sparkle or flash (`references/motion.md`).
- **Continuity.** When a beat hands an object to the next, the next beat's art at t = 0 starts exactly where it ended: same object, place and size.
- **The loop rule.** In a loop, the last beat's art at its end is identical to beat 1's art at t = 0. The smoke test measures it. The card beat usually comes last and rebuilds beat 1's opening picture.
- **Honest numbers.** Every number comes from `facts.md`. Use `≈` for estimates and real units. Write "illustrative" in the note for schematic curves and counts. The note carries the conditions and stays on screen.
- **The motion adds no claims.** No numbers, axis values or words on the art beyond the beat's own fields.
- **Sound is clean and synthesized.** Soft pad, felt keys or glass mallets, a quiet rhythm, small precise effects (`references/sound.md`).

## Determinism

- `drawFrame(T)` is a pure function of T, and a beat's `draw(t, P)` depends only on t. Frames render in any order, on any worker.
- Never use `Math.random`, `Date`, `performance.now`, timers or state carried between frames. Use `rng(seed)` and build layouts once, at load time.
- Cache only pictures that never change (`once()` in the starter). Never cache anything that depends on t.
- Keep a frame under about 250 ms. Blur filters and `L.layer()` are the slow parts. The booth loops draw a frame in 60 to 75 ms.
- The smoke test draws a frame again after the others and fails if it differs.
- Sound is scheduled from the same beat times. A loop's sound renders twice and keeps the second pass, so tails flow across the seam.

## QA checklist

Look at the frames, not the code.

- **Sheet** (`qa/<id>_sheet.png`): each beat reads as one idea, and the beats look like one film: same grid, accent and light.
- **Strips** (`--strip N`, every beat): the dissolve is clean, the main move reads in order, nothing jumps between neighbouring moments, labels never collide with moving objects, the end picture is calm and finished.
- **Continuity**: where the script links two beats, the last moment of one strip matches the first moment of the next.
- **Seam** (`--seam`, loops): the last 3 s flow into the first 2.5 s with no jump, and the smoke test's seam number is near 0.
- **Text**: no overlaps or overruns (the smoke test checks the boxes); headlines break into balanced lines; every note is on screen; `≈` and `→` (outside Sora) look right in the fallback face.
- **Facts**: every number matches `facts.md`, with its unit and its condition.
- **Sound**: `render_sound.mjs` prints -16 LUFS (within 1 LU) and a true peak at or under -1.5 dBTP. In the long file, the loop point has no click or gap. Cues land on what they mark, and no effect repeats identically.
- **File**: `ffprobe` shows `LEN x 30` frames and the right length.

## Reviewers

The agents read this section in place of the Doodle Draw checks.

- **script-reviewer**: a beat table, not plates and seams. Check one idea per beat, the word limits, a source for every number, a note for every condition, the continuity list and the loop rule. No hero or narration.
- **film-reviewer**: use `qa/<id>_sheet.png` and the strips. There is no `text_check`, `legibility_check` or `motion_check`; `smoke_test.mjs` covers page errors, fonts, blank or dark frames, text boxes and determinism. Judge the look against `references/look.md` and the motion against `references/motion.md`.
- **seam-reviewer**: the only transition is the dissolve. Review the linked beats in the strips, and the loop seam in `qa/<id>_seam.png` with the smoke test's seam number.
- **audio-reviewer**: use `out_sound/<id>_sound.mp4` and the loudness line `render_sound.mjs` prints. There is no `audio_check`; the targets are in `references/sound.md`.
- **sound-designer**: write `cues.md` in the 3DLight format (`references/sound.md`), with engine instruments and library effects.
