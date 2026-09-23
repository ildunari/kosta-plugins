# doodle-art-animation: developer guide

The `kosta-plugins` repo holds the **doodle-art-animation** plugin: a skill that makes hand-inked, notebook-style explainer films drawn entirely in canvas code, plus the toolkit it copies into each film's working folder. The full history, measurements and open problems are in `docs/doodle-art-animation/HANDOFF.md`. Read it before changing the engine or the skill.

## Design principle

The plugin owns the **style and feel**, and the model owns the **content**.

- **Engine (fixed, tested in the reel):** ink, paper, type, HUD, camera, transitions, sound, rendering. Fix problems here in code, not with more instructions.
- **Story (written per film by the model):** topic, scenery, objects, layout, pacing. Films can be about any subject, so the engine should supply broad, reusable building blocks (scenery and object components across nature, tech, science, space, art and so on) plus the primitives to draw anything else.
- The instructions should push the model to invent art for its topic and never to copy the example's look. Reusable pieces a model builds during a film are candidates to fold back into the engine.

When a film looks wrong, first decide which layer caused it. If it happens in every film or in the transition reel, it's the engine.

## Layout

```
plugins/doodle-art-animation/       the plugin
  .claude-plugin/plugin.json
  agents/seam-reviewer.md           scores every seam against the film-grammar rubric
  agents/film-reviewer.md           reviews the whole film: text, reading time, life, facts, variety, sound
  agents/script-reviewer.md         reviews the scene script and seam list before any drawing
  agents/sound-designer.md          turns a reviewed script into a sound plan and cue sheet
  agents/audio-reviewer.md          checks the rendered audio against the picture, from measurements
  skills/doodle-plan/               /doodle-art-animation:doodle-plan, phases 0-Gate 1 (intake, research, script)
  skills/doodle-build/              /doodle-art-animation:doodle-build, phases 3-5 (sound, scene lanes, assembly)
  skills/doodle-qa/                 /doodle-art-animation:doodle-qa, Gate 2: every check and the reviewers
  skills/doodle-render/             /doodle-art-animation:doodle-render, final MP4 plus checks
  skills/doodle-art-animation/
    SKILL.md                        workflow and the most important rules (keep it under ~500 lines)
    references/                     style, motion, writing, film-grammar, animation-principles,
                                    intake, build-lanes, sound, api, render, components
    toolkit/                        engine.js, shell.html, build.py, render.mjs,
                                    motion_check.py, speed_check.mjs, audio_check.py, text_check.mjs,
                                    legibility_check.mjs, story_check.mjs, cue_check.mjs,
                                    smoke_test.py, story_example.js (The Long Release), story_one_drop.js,
                                    story_seams.js, story_reel.js, story_gallery.js, story_components.js,
                                    story_brushes.js, story_swatch.js (every paper), kits/ (_kit.js,
                                    earth, life, settle, tech, ai, space, lab, studio), grounds/ (papers
                                    beyond the notebook; README.md says how build.py picks them),
                                    voice.mjs and voice_kokoro.py (narration: script.md -> checked,
                                    timed voice clips and vo/voice.json), voice_check.py (transcript,
                                    voice consistency and listening checks on those clips; voice.mjs
                                    check runs it)
docs/doodle-art-animation/          not shipped with the plugin
  DEVELOPING.md                     this file
  v0.14-state.md … v0.17.2-state.md what each release changed, how it was checked, its known limits
  ACCEPTANCE.md                     the go/no-go rules (L1-L17 films and toolkit, W1-W9 workflow)
  HANDOFF.md                        history, measurements, known weaknesses (paths in it refer to the original handoff zip)
  history/  reference/  examples/   design review, reference-film study images, an older story file
                                    (The Long Release now lives in the toolkit as story_example.js)
  examples/narrated/                the narrated example, "Salt in Water": story_narrated.js, its Kokoro clips and
                                    vo/voice.json (made by make_voice.py). It lives here, not in the toolkit, because
                                    the plugin ships no audio files; a film folder's own vo/ holds its narration
```

## Testing the plugin

- Validate: `claude plugin validate plugins/doodle-art-animation --strict`
- Acceptance checks, also run by CI on every push and PR: `python3 tests/doodle-art-animation/acceptance_check.py` for the text and
  file rules, and `--full --node-modules <playwright>/node_modules` for builds, page probes, renders and timing.
  They are the written form of what was agreed with the owner; extend them when the plugin gains a feature.
- Voice tool tests, also run by CI: `node tests/doodle-art-animation/voice_test.mjs`. They use the fake voice and pretend
  Gemini, OpenAI, Grok, ElevenLabs, Inworld and proxy servers, so they need no network, no keys and cost nothing. `DOODLE_TEST_KOKORO=1` adds a real
  Kokoro run (needs `python3 -m pip install kokoro-onnx` and downloads a 325 MB model from GitHub the first time).
- Voice check tests, also run by CI: `python3 tests/doodle-art-animation/voice_check_test.py`. They plant a missing word, a
  wrong-speed clip, a silent clip and another person's voice in a fake-voice film and answer Gemini with a pretend server.
- Regression tests for bugs found while making films, also run by CI: `python3 tests/doodle-art-animation/regression_test.py
  --node-modules <playwright>/node_modules` (`--static` for the parts that need no browser). Add a check there, and a fixture
  story when it needs one, for each bug a film turns up.
- Narration test, also run by CI: `python3 tests/doodle-art-animation/narration_test.py --node-modules <playwright>/node_modules`
  (`--static` for the parts that need no browser). It builds the narrated example and checks the engine's voice track:
  clips embedded, plates timed by the voice, cues on word marks, captions, the levels, the music under the voice, an MP4
  segment with the voice, the animatic and a build without the voice. Change the example and its clips together:
  `make_voice.py` in its folder regenerates them (needs `kokoro-onnx`, `faster-whisper` and ffmpeg).
- Sound tests, also run by CI: `python3 tests/doodle-art-animation/effects_test.py --node-modules <playwright>/node_modules` renders
  `fixtures/story_sounds.js` (one of each sound added in v0.16.6) and checks the header's writing sound follows the paper.
- Load it in a session: `claude --plugin-dir plugins/doodle-art-animation`, then `/reload-plugins` after edits.
- The skill copies its toolkit with `cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .`. Never build films inside the plugin folder.

## Testing the toolkit (do this after any engine or story change)

Work in a scratch folder outside the repo:

```
mkdir -p /tmp/doodle-test && cp -R plugins/doodle-art-animation/skills/doodle-art-animation/toolkit/. /tmp/doodle-test/ && cd /tmp/doodle-test
cp story_example.js story.js
python3 build.py story.js film.html && python3 build.py story_reel.js reel.html && python3 build.py story_gallery.js gallery.html
node render.mjs film.html --stills 150,480,700 --dir qa_stills   # --sheet clears f_*.jpg in its own --dir      # quick look
node render.mjs film.html --sheet 1                 # qa/contact_sheet.jpg
node render.mjs film.html --strips                  # qa/strip_NN_type.jpg, one per transition
node render.mjs film.html --seams                   # qa/seam_NN_type.jpg, both sides of each transition
node render.mjs reel.html --strips --dir qa_reel    # all 14 transition types
node render.mjs film.html film.mp4                  # full render (one worker per CPU core, at most 8)
python3 motion_check.py film.mp4                    # target: median >= 1.5, still < 5%
python3 audio_check.py film.mp4                     # level, peak, clipping, stereo, silence, length
node text_check.mjs film.html                       # reading time, text off frame, overlaps, text that scales
```

Look at the images yourself before calling anything done. Baselines on engine v0.9: `story_one_drop.js` median 1.95, 0% still; `story_example.js` (The Long Release, 61.8 s, 1483 frames) median 1.70, 0% still, text_check clean, audio_check pass (one soft-onset cue warning).

## Automated smoke test

`toolkit/smoke_test.py` runs the mechanical part of the checks above. It works on every `story*.js` next to it. In a film folder that also holds your own story, it tests only your stories and skips the bundled examples (`story_example.js`, `story_one_drop.js`, `story_seams.js`, `story_reel.js`, `story_gallery.js`, `story_components.js`, `story_brushes.js`), unless `--stories` names them.

For each story it does three things:
- **Builds it.**
- **Loads it once in headless Chromium.** The load must reach `window.__ready` with a sane `window.__story`. The fonts must have loaded: `window.__fontWarning` is unset and `document.fonts.check('500 64px Fraunces')` is true. It also renders 3 frames through `__frameData` and waits 1.5 s, so errors thrown after boot are seen.
- **Renders 3 stills** at 20%, 50% and 80% of the film with `render.mjs --stills`. It fails on a non-zero exit, any `PAGE ERROR:`, a blank still (grey std-dev below 2) or three identical stills.

It then renders a 3.5 s MP4 segment across the first transition of your own story (`story.js` first), or of `story_example.js` when run from the repo. That segment must have the right frame count and duration, and a stereo audio track that is not silent (max above -60 dB, mean above -50 dB). It must also pass `motion_check.py` with loose thresholds (median >= 0.5, still <= 50%).

It never builds in the plugin folder; everything goes into `--work`. Without `--work` it uses a temp folder, which it deletes after a clean pass (unless `--keep`) and keeps, with the path printed, after a failure.

```
# from the repo (Playwright installed somewhere; point at its node_modules)
python3 plugins/doodle-art-animation/skills/doodle-art-animation/toolkit/smoke_test.py \
    --work /tmp/doodle-smoke --node-modules /path/to/node_modules --workers 3

# inside a film folder (the toolkit was copied there; ./node_modules is picked up); tests your story.js
python3 smoke_test.py --work qa_smoke
```

- `--workers N` (or `SMOKE_WORKERS`) sets how many stories are checked at once and the `render.mjs --workers` for the MP4. The default is 3; CI uses 2.
- `--stories a.js,b.js`, `--skip x.js`, `--video-story`, `--video-seconds` and `--no-video` narrow the run.
- The output goes to `<work>/smoke_qa/`: `sheet_<story>.jpg` (the 3 stills side by side), the full stills per story, `segment_<story>.mp4`, and `summary.json`.
- Exit codes: 0 means everything passed, 1 means a check failed (the summary names each story), and 2 means a setup problem: a missing tool, Playwright not found, or an unknown `--stories` or `--video-story` file.
- It needs network access for Google Fonts. On a slow network, font requests can fail and show up as console errors or a font failure. If the story itself looks fine, re-run before you start debugging.
- On an M-series Mac the three bundled stories plus the segment take about 45–90 s, and a single film-folder story takes about 30 s.
- A command that times out is killed together with its Chromium children.

It proves the stories build, boot and render without errors. It does not replace looking at the sheets, strips and seams yourself.

CI: `.github/workflows/doodle-smoke.yml` runs it on ubuntu-latest for pushes to `main` and for pull requests that touch `plugins/doodle-art-animation/**`, and it can also be started by hand. The contact sheets and `summary.json` are uploaded as the `doodle-smoke-sheets` artifact. On a failure, the whole `smoke_qa/` folder is uploaded as `doodle-smoke-failure`.

## Engine rules that must not break

- `renderFrame(f)` is a pure function of `f`. No `Math.random`, `Date`, `performance.now`, or state carried between frames. Use `mulberry(seed)` and `hash3()`.
  That includes the pixels already on the canvas: every frame starts by filling it with paper, so nothing a transition
  leaves uncovered (a sub-pixel seam) shows the previous frame. `render.mjs`, `text_check` and `legibility_check` spread
  frames over several pages, so a frame that depends on what its page drew before comes out differently with a different
  worker count. `acceptance_check.py --full` (P1) draws every transition's frames after two different predecessors.
- Drawings are on twos except inside transitions (and 0.6 s either side), which `onOnes(f)` puts on ones; the line boil stays on twos (`S.boil = floor(f / 2)`), and `render.mjs` keeps frame pairs on the same worker. Never reuse a frame for its pair.
- Every `TRANS[type](p, X)` returns the share (0..1) of the frame owned by the new plate. A new transition needs a `TRANS_SFX` entry, a `DEFAULT_DUR` that meets the speed limits in `references/motion.md`, and a `LEAD` plus a `PUSH` or `SETTLE` entry if it zooms and a `LAND_AT` share (where 90% of its travel is done; headers start 0.3 s after it). Shape its speed (`E.arrive`, `E.depart`, `E.shaped`) rather than using a symmetric ease. Masks ease their edge, not their area. Test it in the reel and run `motion_check.py` on the render: no `SNAP`, pop or jerk.
- `LEAD`, `PUSH_ON` and `SETTLE` values stay at or above 1 (scaling a plate below 1 exposes its edges), and momentum keeps one direction through a cut: push-in types keep easing in, the rest ease out.
- The HUD and hero reticle never scale with the camera or a transition.
- Offscreen layer slots: transitions use slot 1 (bleed, hatch) and slot 2 (page). Stories should use slot 0 or 3 and up.
- Brushes (`brush.stroke`, `brush.wash`, `brush.hatch`, `brush.field`, `wash`) are 2D-canvas ports of p5.brush's
  ideas, credited in the engine's brush section. Their grain and bleed are seeded per shape and cached, so texture
  never re-rolls with the boil (only the outline wobbles). A new brush keeps that rule, stays inside the frame-time
  budget (`story_brushes.js` at most 1.5x `story_example.js`, checked by the acceptance script), and gets a sample
  in `window.__brushProbe`, an entry in `references/api.md` and a specimen in `story_brushes.js`.
- Speed: `speed_check.mjs` reads transition and camera speed from the engine's values through `window.__seamProbe`
  and `window.__camProbe`. Its `FAST` verdict is advice (a film may choose its own pace); `SNAP` is a failure.
- The workflow is a phase table with two gates (SKILL.md, "Phases and gates"): nothing starts before its input
  exists, every agent guards its own preconditions, phase 4 fans out one agent per scene
  (`references/build-lanes.md`), phase 5 renders one shared `qa/` set the reviewers reuse, and Gate 2's fix loop
  re-runs only the checks a change affects. If you add a phase or an agent, add its row and its preconditions.
- Text: every engine text call carries a role (`fact` 28 px, `label` 22, `hud` 18, `decor` exempt) and the
  components meet those floors by default, on a glyph halo (`haloText`). A new component that draws text passes a
  role and uses the halo; `legibility_check.mjs` must stay clean on every bundled story.
- Sound: every `SFX` entry is synthesized, deterministic and seeded, and repeats vary; `cue_check.mjs` must stay
  clean on every bundled story. The plugin ships no audio files.
- Stories never edit `engine.js`; they override `PAL` and add helpers. If the engine changes, re-run the example and the reel.

## Conventions

- Plain, readable wording in SKILL.md and references. Explain terms; no invented shorthand.
- Keep renders, frames, WAVs, MP3s and QA folders out of git (`.gitignore`). The narrated example's Opus clips are the one
  exception: they are small (about 70 KB each) and the example needs them to build.
- Narration (`voice.mjs`): API keys come only from environment variables or `~/.config/doodle-art-animation/keys.env`,
  never from the repo, project files or memory, and the tool never prints one. Its files (`vo/lines.json`,
  `vo/voice.json`) are described at the top of `voice.mjs`, and the providers in `references/voice-providers.md`; the engine reads `vo/voice.json`, so a change to that
  format changes both sides together. Requests go through `HTTPS_PROXY` with the tool's own tunnel, because Node's
  `fetch` ignores that variable and would connect directly, skipping the claude.ai proxy that adds the Gemini key.
- Bump `version` in `plugin.json` when the plugin changes in a way users would notice.
