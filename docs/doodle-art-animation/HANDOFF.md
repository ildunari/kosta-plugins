# Handoff: doodle-art-animation, from saved skills to a plugin

Written 16 Sep 2026 at the end of a long Cowork session, for the Claude Code sessions that take this over. Kosta will decide with you where the repo lives.

## What this project is

A skill that makes short explainer films in the style of the Claude Opus 5 film "The Water Cycle": a naturalist's field notebook come to life. Cream striped paper, wobbly tapered pen lines, pen-hatched shading, serif titles that type on, numbers that count up, and one small tracked "hero" (a molecule, a particle, a photon) followed through numbered plates. Microscopic scenes switch to a dark navy world. Hand-made transitions (lens zooms, whip pans, ink bleeds, page rolls and so on) join the scenes, and every sound is synthesized.

Everything is computed by JavaScript in one HTML file with one `<canvas>`. `renderFrame(f)` is a pure function of the frame number. A Playwright script captures each frame as a JPEG, renders the audio offline as a WAV, and ffmpeg joins them into an MP4. No animation library, images, clips or audio files are used.

The goal now is to turn this into a proper **plugin** (real files instead of code pasted into skill text), then keep improving the quality of the films.

## What is in this folder

| Path | What it is |
|---|---|
| `KICKOFF_PROMPT.md` | The prompt to paste into the first Claude Code session |
| `repo-starter/` | A ready repo root: `CLAUDE.md`, `.gitignore`, and the draft plugin `doodle-art-animation/`. Copy this folder's contents into the new repo. |
| `repo-starter/doodle-art-animation/` | Draft plugin. Passes `claude plugin validate --strict` and loads in Claude Code 2.1.273 (details below). |
| `saved-skills/` | The three skills currently saved in Kosta's Claude account, exactly as saved. The plugin replaces them. |
| `examples/` | Two older films, "The Long Release" (a PLGA nanoparticle's journey, 55.5 s) and "The Long Way Out" (a photon leaving the Sun, 28 s). Both build and render on the current engine, but neither has been upgraded to the current motion rules. |
| `history/v2_design_review.md` | The design review (run with Fable 5.1 on high effort) that drove version 2, plus its prototype patch. Most of it is already applied. |
| `reference/` | The study of the original film: 14 contact sheets (one frame per second, 20 per sheet, `sheet_00` = 0–19 s), 14 labelled close-ups of transitions and the spectrogram, cut times, and motion measurements. |
| `renders/` | The current example film (`one_drop_v3.mp4`, 18.7 MB, plus its HTML player), the transition reel HTML, and fresh contact sheet and strips for both. |

Suggested repo layout: the contents of `repo-starter/` at the root, and `HANDOFF.md`, `history/`, `reference/` and `examples/` under `docs/`. Keep `renders/` and all MP4s out of git. If Kosta still has the original `water-cycle-claude-opus5.mp4` (136 MB), keep it next to `docs/reference/` but out of git.

## How it got here

### Version 1: the study and the first engine

The original film was studied frame by frame (contact sheets, strips around every cut, a spectrogram, crops of the type).

**What the study found about the film:**

- 4 min 34 s, 1920×1080, 24 fps, 6,583 frames, H.264 at about 4 Mbps, stereo AAC, 15 plates grouped into 11 stages, no narration.
- It was made as one self-contained HTML file with a single canvas. The on-screen counter `EXP n  F n` matches the real frame index, and `EXP` is always `F / 2`, which shows it animates on twos.
- The timing, palette, type, textures and layout it uses are written up in `references/style.md` and `references/motion.md`.

**What version 1 produced:**

- The engine, the render script, and the two films now in `examples/`.

**Problems fixed along the way:**

- Playwright workers timed out while pages loaded. Fix: open the pages one at a time and wait with `polling: 250`.
- Lens transitions showed rectangle edges and wrong vignette darkness. Fix: vignettes became their own layer, drawn once per frame, and lenses scale their content to cover the frame.
- The STATE row overflowed. Fix: it now wraps, but only when it has to.
- Log-ruler labels ran off the right edge. Fix: they now flip to the left near the edge.
- The MP4 was too large to upload to chat (limit 30 MB). Fix: `--bitrate 3800k`, which is about what the reference uses.

### Version 2: design review and rename

A Fable 5.1 review (`history/v2_design_review.md`) led to these changes:

- beats that clear instead of piling up;
- a camera system, plus anticipation and settle around moves;
- zoom steps within one world;
- new transitions: shape match cut, ink bleed and burn, page, hatch dissolve, whip pan;
- the rename to `doodle-art-animation`.

Saving it as one skill failed: the 121 KB SKILL.md was more than a single reply can output, so the skill was split into a main skill and an engine skill.

### Version 3: the motion rework (current)

Kosta watched the version 2 example and said the camera and transitions felt static, and the transitions forced and not smooth. Measuring confirmed it: 69% of v2's drawings were identical to the one before (median change 0.34), and each cut spiked out of a dead stop.

**Changes:**

- Engine automatics:
  - animation on twos, including during transitions;
  - gate weave (the whole frame shifts up to 0.9 px and turns slightly on each drawing);
  - a film-grain tile that changes on each drawing;
  - a slow 4% push-in on plates without their own camera;
  - momentum across cuts (`LEAD` and `SETTLE`).
- Zooms use `zlerp`, which changes scale by an equal ratio per drawing. (They once used `E.inOut5` to snap; v0.11 replaced that with gentle easing, speed limits and transitions on ones.)
- New helpers for living plates: `flow`, `wander`, `parallax`, `subpath`, `vnoise2`.
- Rebuilt transitions:
  - the pan is now a whip pan with a visible join and speed lines;
  - the page turn became a scroll roll (the old one flashed at the end);
  - the shape transition became a morph inside an opening window (the old crossfade dimmed the whole screen);
  - the iris now covers the whole frame (`coverR`);
  - the bleed has an organic front.
- A rewritten example with a follow pan, parallax, jiggling molecules, an updraft, and a falling drop with the world scrolling past.
- `motion_check.py` and the 12-transition test reel.

**Problems fixed during the rework:**

- Momentum below 1 exposed plate edges. It now only scales up.
- The pan strobed. It now uses `inOut3` over 1.0 s, with speed lines at `alpha 0.6*v`.
- The night plate sat empty right after the lens. Its content now arrives earlier.
- A cloud overlapped the stat. The cloud was moved.

**Saving v3.** It was saved as three skills: the main skill and two engine halves. Each half is pasted in as a code block and joined with `cat`.

## Where it stands now

**Verified in the Cowork session:**

- The three saved skills reproduce the working files byte for byte.
- The example and the reel build and render from those files.
- The draft plugin passes `claude plugin validate --strict`.
- The plugin loads with `claude --plugin-dir`, and `${CLAUDE_SKILL_DIR}` is filled in when the skill runs.
- The toolkit copied from the plugin builds the example and the reel and renders both.

**Motion** (from `reference/measurements.txt`):

| Film | Length | Median change per drawing | 75th percentile | Still drawings (< 0.5) |
|---|---:|---:|---:|---:|
| Reference, whole film | 274.3 s | 2.00 | 2.62 | 2% |
| Reference, first 120 s (earlier measurement) | 120.0 s | 2.31 | n/a | 0% |
| One Drop, v2 | 44.5 s | 0.34 | n/a | 69% |
| One Drop, v3 (current) | 44.5 s | 1.57 | 3.08 | 1% |

The saved skills quote the reference as "2.3 and 0%". That figure covers only the first two minutes. The plugin draft has been corrected to 2.0 and 2% for the whole film.

These numbers measure how much the picture changes, not whether the motion looks good. A film can pass the targets and still feel jittery or busy, so look at the strips too.

**Other numbers:**

- Audio on the v3 example: mean −20.3 dB, peak −5.7 dB, real stereo. The skill's target peak is about −3 dB, so there is some headroom left.
- Render speed on the cloud Linux box: about 60–70 ms per frame with 6 workers; the 44.5 s example took about 1.5 minutes. Speed on Kosta's Macs is unknown.

## Known weaknesses, most important first

1. **Night plates move less than the reference's.** In v3 they sit around 1.2–1.3 per second (plate II, 14–19 s), while the reference's first two minutes mostly run 2–5.
2. **The end card goes nearly still.** Its last three seconds measure 0.6–0.7 per second, below target.
3. **The paper plates look alike.** Four of the example's five paper plates reuse the same `landscape()` layers. The reference changes scenery constantly: open sea, coastal upland, mountains and snowpack, trees, underground cutaways. See the `reference/` close-ups.
4. **The recap plate is thin.** The reference recap shows every path at once with flux arrows, a stat, and a balance-equation card. Ours only retraces a dotted route with waypoints.
5. **Several components haven't been checked since v3.**
   - The v3 example never uses `card`, `logRuler`, `lineChart`, `insetLens`, `gather` or `fluxArrow`, so none of them has been checked with the v3 camera, momentum and twos.
   - The older films in `examples/` use some of them, but those films haven't been motion-checked.
6. **Nothing longer than 55 s has been tested.** A 2–4 minute film may show new problems with render time, memory, audio length or pacing.
7. **The font fallback is untested.** Rendering needs Google Fonts over the network. The `@fontsource` fallback described in the skill has never been tried.
8. **There are no automated tests.** A smoke test (build, render three stills, fail on any `PAGE ERROR`, run `motion_check` on a short render) would catch engine regressions.

## Plugin plan

**Facts about plugins.** A docs lookup on 16 Sep 2026 found the following. Re-check anything that looks off.

- **Layout.** The manifest is `.claude-plugin/plugin.json`, and only `name` is required. `skills/`, `agents/`, `hooks/hooks.json`, `.mcp.json` and `bin/` sit at the plugin root.
- **Commands.** `commands/` still works but is legacy. New slash commands are skills with `disable-model-invocation: true`.
- **Skills.** A skill folder can hold supporting files. Inside a skill, `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PLUGIN_ROOT}` point at the installed files.
- **Size guidance.** Keep SKILL.md under about 500 lines; descriptions can be up to 1,536 characters.
- **Local testing.** Load with `claude --plugin-dir <path>`, reload with `/reload-plugins`, and check with `claude plugin validate <path> [--strict]`.
- **Agents.** `agents/<name>.md` files take `name` and `description`, plus optional `tools`, `model`, `effort` and more.
- **Cowork.** A `.plugin` file is a zip with the same layout, uploaded under Customize → Plugins. Limits are 200 MB uncompressed and 5,000 files. The Cowork session did not test this.
- **Sources:**
  - [Plugins](https://code.claude.com/docs/en/plugins.md)
  - [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)
  - [Skills](https://code.claude.com/docs/en/skills.md)
  - [Subagents](https://code.claude.com/docs/en/sub-agents.md)
  - [Cowork plugins guide](https://claude.com/docs/cowork/guide/plugins)

**What the draft already does.**

- One skill replaces the three saved ones.
- SKILL.md is 112 lines: workflow, the most important rules, determinism rules and the QA checklist.
- The detail lives in six `references/` files.
- The toolkit is shipped as real files that the workflow copies with `cp "${CLAUDE_SKILL_DIR}"/toolkit/* .`.

**Still to add.** These are suggestions; check them with Kosta.

1. **User-invoked skills** with `disable-model-invocation: true`:
   - `doodle-qa`: contact sheet, strips, `motion_check`, and a short report;
   - `doodle-render`: the final MP4 at `--bitrate 3800k`;
   - maybe `doodle-reel`: builds the transition reel for engine work.
2. **A `motion-reviewer` agent.**
   - It reads the strips, the contact sheet and the `motion_check` output, and compares them with the targets and the reference close-ups.
   - It reports flat stretches, transitions that start from stillness, collisions, empty regions, and text that isn't up long enough to read.
   - It needs `Read`, `Glob` and `Bash`. This review step is what found most of the v3 fixes, so it is worth making repeatable.
3. **Reference close-ups for the reviewer (optional).** Shipping a few of them inside the skill (`references/img/`, about 5 MB) would give the reviewer something to compare against.
4. **A smoke-test script** (see weakness 8).
5. **Packaging for Cowork.** Zip the plugin as a `.plugin` file and upload it. After installing it in Cowork and in Claude Code, delete the three saved skills (`doodle-art-animation`, `doodle-art-animation-engine`, `doodle-art-animation-engine-motion`) from Kosta's account so two copies don't compete.

## Engine map (`toolkit/engine.js`, 1,096 lines)

| Section | Lines |
|---|---:|
| Palette, type, easing, `kf`, `beat`, `stagger` | 13–69 |
| Seeded randomness, `vnoise`, `S` globals, `boil` | 70–86 |
| Geometry: `shape.*`, `along`, `resample`, `smooth`, `morph`, `gather` | 87–150 |
| Ink and textures: `wobble`, `ink`, `pen`, `hatch`, `shade`, `scribble`, `pebbles`, `grass`, `lobedCloud`, `eraseOut`, arrows | 151–360 |
| Built-once textures (paper, night, grain tiles, vignettes), `contours`, `layer` | 361–431 |
| Type: `text`, `typed`, `dropText`, `countUp` | 432–465 |
| HUD: header, journey log, stage dial, frame counter | 466–515 |
| Components: `callout`, `stat`, `reticle`, `card`, `logRuler`, `lineChart`, `insetLens` | 516–615 |
| Motion helpers: `vnoise2`, `wander`, `subpath`, `flow`, `zlerp`, `coverR` | 616–647 |
| Camera: `withCamera`, `camPoint`, `camOf`, `parallax`, `heroOf`, `LEAD`, `SETTLE`, `momentum` | 648–690 |
| Transitions: `TRANS.*`, `HEADER_DELAY` | 691–878 |
| Timeline: `defineStory`, `drawPlate`, `renderFrame` (twos, weave, grain) | 879–943 |
| Audio: `SFX.*`, `TRANS_SFX`, `autoBed`, `renderAudio`, WAV export | 944–1056 |
| Boot: render hooks (`__frameData`, `__audioWav`) and the preview player | 1057–1096 |

The rules that must not break are listed in `repo-starter/CLAUDE.md`. One trap to know about: transitions draw into offscreen layer slots 1 (bleed, hatch) and 2 (page), so a story that calls `layer()` should use slot 0 or 3 and up.

## Mac setup

- Node 18+, Playwright with Chromium (`npx playwright install chromium` if it's missing), ffmpeg (Homebrew), and Python 3 with numpy.
- `render.mjs` looks for Playwright in the local `node_modules` first, then in the global npm root.
- Kosta works across a Mac Studio, a MacBook and a Mac mini. If he wants the plugin on all three, install it from the repo on each machine.

## Working with Kosta

- **Plain wording.** He wants plain, readable explanations with no jargon shorthand. Say what something does before naming it.
- **Taste.** He cares about the result looking finished and having real taste. Look at rendered frames before calling anything done, and show him strips or short renders when motion changes.
- **Science.** He is a biomedical engineering PhD student working on PLGA nanoparticle drug delivery, so scientific accuracy matters in any science film. Keep `≈` and "illustrative" where they apply.
- **Skill conventions.** Every skill gets a `FEEDBACK.md` with the standard header and a Feedback Loop section. He says the loop is rarely used in practice, so keep it light.
- **Decisions.** Ask before big structural changes; make routine calls yourself.

## Suggested order of work

1. Set up the repo where Kosta wants it, copy the files in as described above, and `git init`.
2. Check the Mac setup. Build and render the example from the plugin toolkit, run `motion_check.py`, and confirm it lands near the baseline (median 1.57, 1% still).
3. Validate and load the plugin. Then, in a fresh session, run the skill on a new 30–45 s topic to test the whole workflow as a user would.
4. Add `doodle-qa`, `doodle-render` and the `motion-reviewer` agent.
5. Quality work, in the order of the weaknesses list:
   - more motion on night plates and on the end card;
   - more varied paper scenery;
   - a richer recap;
   - using cards and charts in a film.

   Upgrading "The Long Release" (`examples/story_long_release.js`) to the v3 rules makes a good second test film, and it is close to Kosta's own research.
6. Test one longer film (2–4 minutes).
7. Package the `.plugin` file for Cowork, install it, and remove the three saved skills.
