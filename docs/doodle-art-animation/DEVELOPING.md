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
  skills/doodle-art-animation/
    SKILL.md                        workflow and the most important rules (keep it under ~500 lines)
    FEEDBACK.md                     lessons log (feedback-loop convention)
    references/                     style, motion, writing, sound, api, render
    toolkit/                        engine.js, shell.html, build.py, render.mjs,
                                    motion_check.py, story_example.js, story_reel.js
docs/doodle-art-animation/          not shipped with the plugin
  DEVELOPING.md                     this file
  HANDOFF.md                        history, measurements, known weaknesses (paths in it refer to the original handoff zip)
  history/  reference/  examples/   design review, reference-film study images, older story files
```

## Testing the plugin

- Validate: `claude plugin validate plugins/doodle-art-animation --strict`
- Load it in a session: `claude --plugin-dir plugins/doodle-art-animation`, then `/reload-plugins` after edits.
- The skill copies its toolkit with `cp "${CLAUDE_SKILL_DIR}"/toolkit/* .`. Never build films inside the plugin folder.

## Testing the toolkit (do this after any engine or story change)

Work in a scratch folder outside the repo:

```
cp plugins/doodle-art-animation/skills/doodle-art-animation/toolkit/* /tmp/doodle-test/ && cd /tmp/doodle-test   # mkdir -p it first
cp story_example.js story.js
python3 build.py story.js film.html && python3 build.py story_reel.js reel.html
node render.mjs film.html --stills 150,480,700      # quick look
node render.mjs film.html --sheet 1                 # qa/contact_sheet.jpg
node render.mjs film.html --strips                  # qa/strip_NN_type.jpg, one per transition
node render.mjs reel.html --strips --dir qa_reel    # all 13 transitions
node render.mjs film.html film.mp4 --workers 6      # full render
python3 motion_check.py film.mp4                    # target: median >= 1.5, still < 5%
```

Look at the images yourself before calling anything done. Baseline for the example: median 1.57, still 1% (see `HANDOFF.md`).

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
