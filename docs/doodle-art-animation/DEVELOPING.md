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
  skills/doodle-qa/                 /doodle-art-animation:doodle-qa, runs every check and both reviewers
  skills/doodle-render/             /doodle-art-animation:doodle-render, final MP4 plus checks
  skills/doodle-art-animation/
    SKILL.md                        workflow and the most important rules (keep it under ~500 lines)
    FEEDBACK.md                     lessons log (feedback-loop convention)
    references/                     style, motion, writing, film-grammar, sound, api, render
    toolkit/                        engine.js, shell.html, build.py, render.mjs,
                                    motion_check.py, audio_check.py, text_check.mjs, smoke_test.py,
                                    story_example.js (The Long Release), story_one_drop.js,
                                    story_seams.js, story_reel.js, story_gallery.js, story_components.js,
                                    kits/ (_kit.js, earth, tech, ai, space, lab, studio)
docs/doodle-art-animation/          not shipped with the plugin
  DEVELOPING.md                     this file
  HANDOFF.md                        history, measurements, known weaknesses (paths in it refer to the original handoff zip)
  history/  reference/  examples/   design review, reference-film study images, an older story file
                                    (The Long Release now lives in the toolkit as story_example.js)
```

## Testing the plugin

- Validate: `claude plugin validate plugins/doodle-art-animation --strict`
- Load it in a session: `claude --plugin-dir plugins/doodle-art-animation`, then `/reload-plugins` after edits.
- The skill copies its toolkit with `cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .`. Never build films inside the plugin folder.

## Testing the toolkit (do this after any engine or story change)

Work in a scratch folder outside the repo:

```
mkdir -p /tmp/doodle-test && cp -R plugins/doodle-art-animation/skills/doodle-art-animation/toolkit/. /tmp/doodle-test/ && cd /tmp/doodle-test
cp story_example.js story.js
python3 build.py story.js film.html && python3 build.py story_reel.js reel.html && python3 build.py story_gallery.js gallery.html
node render.mjs film.html --stills 150,480,700      # quick look
node render.mjs film.html --sheet 1                 # qa/contact_sheet.jpg
node render.mjs film.html --strips                  # qa/strip_NN_type.jpg, one per transition
node render.mjs film.html --seams                   # qa/seam_NN_type.jpg, both sides of each transition
node render.mjs reel.html --strips --dir qa_reel    # all 14 transition types
node render.mjs film.html film.mp4 --workers 6      # full render
python3 motion_check.py film.mp4                    # target: median >= 1.5, still < 5%
python3 audio_check.py film.mp4                     # level, peak, clipping, stereo, silence, length
node text_check.mjs film.html                       # reading time, text off frame, overlaps, text that scales
```

Look at the images yourself before calling anything done. Baselines on engine v0.9: `story_one_drop.js` median 1.95, 0% still; `story_example.js` (The Long Release, 61.8 s, 1483 frames) median 1.70, 0% still, text_check clean, audio_check pass (one soft-onset cue warning).

## Automated smoke test

`toolkit/smoke_test.py` runs the mechanical part of the checks above. It works on every `story*.js` next to it. In a film folder that also holds your own story, it tests only your stories and skips the bundled examples (`story_example.js`, `story_one_drop.js`, `story_seams.js`, `story_reel.js`, `story_gallery.js`, `story_components.js`), unless `--stories` names them.

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
- Animation is on twos: `S.boil = floor(f / 2)`, and `render.mjs` keeps frame pairs on the same worker.
- Every `TRANS[type](p, X)` returns the share (0..1) of the frame owned by the new plate. A new transition also needs `HEADER_DELAY` and `TRANS_SFX` entries, and `LEAD`/`SETTLE` entries if it zooms. Test it in the reel.
- `LEAD` and `SETTLE` values stay at or above 1. Scaling a plate below 1 exposes its edges.
- The HUD and hero reticle never scale with the camera or a transition.
- Offscreen layer slots: transitions use slot 1 (bleed, hatch) and slot 2 (page). Stories should use slot 0 or 3 and up.
- Stories never edit `engine.js`; they override `PAL` and add helpers. If the engine changes, re-run the example and the reel.

## Conventions

- Plain, readable wording in SKILL.md and references. Explain terms; no invented shorthand.
- Keep renders, frames, WAVs and QA folders out of git (`.gitignore`).
- Bump `version` in `plugin.json` when the plugin changes in a way users would notice.
