---
name: doodle-art-animation
description: Make hand-inked, notebook-style explainer films drawn entirely in canvas code (Opus 5 "Water Cycle" style) from any topic, dataset or source, with lens zooms, ink wipes, paper burns, morphs and synthesized sound, rendered to MP4.
---

# Doodle Art Animation

This skill makes explainer films that look like a naturalist's field notebook come to life: cream striped paper, wobbly tapered ink lines, pen-hatched shading, serif titles that type on, numbers that count up, and one small tracked "hero" (a molecule, a particle, a photon) followed through numbered **plates**. Microscopic scenes switch to a dark navy "microscope" world. Hand-made transitions (lens zooms, zoom hand-offs, whip pans, ink wipes and bleeds, iris blinks, shape match cuts, page rolls) move the story between scenes.

Every pixel and every sound is computed by JavaScript in one HTML file with one `<canvas>`. `renderFrame(f)` is a pure function of the frame number, and a Playwright script captures the frames and muxes them with ffmpeg. There are no images, video clips, audio files or animation libraries.

**Reference:** the Claude Opus 5 "The Water Cycle" film (4 min 34 s, 1920×1080, 24 fps, 15 plates, no narration), which was built the same way. The toolkit here was rebuilt from a frame-by-frame study of it and then tuned against its measured motion.

## Files in this skill

| Path | What it is |
|---|---|
| `toolkit/engine.js` | The engine: paper, ink, text, components, camera, transitions, timeline, sound, render hooks. Stories never edit it. |
| `toolkit/shell.html`, `toolkit/build.py` | `python3 build.py story.js film.html` inlines the engine and the story into one self-contained HTML file. |
| `toolkit/render.mjs` | Frame capture, stills, contact sheets, transition strips, MP4 muxing. |
| `toolkit/motion_check.py` | Measures how alive a render is. |
| `toolkit/story_example.js` | Worked example "One Drop" (44.5 s, 7 plates). Start every new film from a copy of it. |
| `toolkit/story_reel.js` | Test reel with all 12 transition types back to back. |
| `references/style.md` | Worlds, palette, type, line and texture recipes, composition, HUD positions. |
| `references/motion.md` | Keeping every drawing alive, beats, timings, camera moves, the transition table and rules. |
| `references/writing.md` | Explainer voice, how to adapt any subject or dataset, the plate script format. |
| `references/sound.md` | The synthesized sound design and cue names. |
| `references/api.md` | Every function and plate field a story can use. |
| `references/render.md` | How rendering works, options and speed. |

Read `references/style.md`, `references/motion.md` and `references/writing.md` before writing the plate script. Open `references/api.md` while building, and `references/sound.md` when adding cues.

## Feedback Loop

Read `FEEDBACK.md` in this skill's folder before every use and apply its lessons.

1. **Detect**: after a render, note anything that went wrong or needed a second pass (a text collision, a transition glitch, unclear copy, wrong pacing, a render failure, a change the user asked for that the skill should have prevented).
2. **Search** `FEEDBACK.md` for an existing entry on the same issue.
3. **Scope**: decide whether it is a new entry or an update.
4. **Draft and ask**: "I noticed [issue]. Want me to log this?"
5. **Write on approval**, with a category tag and the date. If the skill folder is read-only (an installed plugin), put the entry in a proposed update to the plugin instead.
6. **Compact at 75**: merge duplicates, promote repeated patterns into this file, archive resolved items, and reset to about 30.

## Workflow

1. **Get the substance first.** Research the topic, or read the user's data or source. Every number on screen needs a source; write the sources down now, because they go on the end card.
2. **Pick the hero and the journey.** Something small that travels through the whole story, with an ID tag like `H₂O·01`, `NP·01`, `γ·01`, `PKT·01` (see `references/writing.md`).
3. **Write the plate script** in the table format from `references/writing.md`, with camera, transition and exit columns. For films longer than about a minute, show the script to the user before building.
4. **Set up a working folder** (not inside this skill): `cp "${CLAUDE_SKILL_DIR}"/toolkit/* .` then `cp story_example.js story.js`. If that variable is not filled in, the `toolkit` folder sits next to this SKILL.md.
5. **Build plate by plate.** After each plate run `python3 build.py story.js film.html` and `node render.mjs film.html --stills <frames>`, then look at the stills: beats, collisions, empty regions.
6. **QA the motion, not just the stills.**
   - `node render.mjs film.html --sheet 1` writes one frame per second to `qa/contact_sheet.jpg`.
   - `node render.mjs film.html --strips` writes a 12-frame, 8 fps strip around every plate start.
   - Open every strip and work through the QA checklist below.
   - After the first full render, run `python3 motion_check.py film.mp4` and compare with the targets.
7. **Render**: `node render.mjs film.html film.mp4 --workers 6`, adding `--bitrate 3800k` for a shareable file (a one-minute film lands near 25–30 MB).
8. **Deliver** the MP4 and the HTML. The HTML is also a player: space plays and pauses, the arrow keys move 2 s, `[` and `]` jump between plates, and there is a scrubber.

If you change or add a transition, test it in the reel first: `python3 build.py story_reel.js reel.html`, then `node render.mjs reel.html --strips`.

**Requirements:** Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy, and network access to Google Fonts. If fonts are blocked, install `@fontsource/fraunces`, `@fontsource/inter-tight` and `@fontsource/ibm-plex-mono` and replace the `<link>` in `shell.html` with `@font-face` rules.

## The rules that matter most

Each has its details in the references.

- **Every drawing moves.** The engine adds twos, gate weave, grain, line boil, a slow push-in and momentum across cuts. Each plate must also keep at least two of its own motions going (flow, drifting particles, weather, a moving hero, a camera move, flickering links), with much more on night plates. Target: `motion_check.py` median of at least 1.5 per drawing and fewer than 5% of drawings below 0.5 (the reference measures a median of 2.0 with 2% still drawings over the whole film). A plate that sits near zero needs more life, not a faster transition.
- **Beats enter and leave.** Wrap stats, callouts and cards in `withAlpha(beat(t, t0, t1), …)`. Text fades out; it never un-types. Give every line `readTime(s)` on screen.
- **Pick transitions by meaning:** `lensIn`/`lensOut` between worlds, `zoom` within a world, `shape` when an object persists across the cut, `pan` along the journey, `bleed` for time passing, `page` for chapter breaks, `fade` only into the end card. Use 4–6 types per film, never the same one three times in a row.
- **Scenes bleed to all four edges**, with the horizon at 48–52% and a sky element on every paper plate. One idea per region: top-centre stat, one side for callouts, bottom card.
- **Pen for subjects, ink for measurement**, shading made of pen strokes (never gradients), and at least two textures on any fill wider than 200 px.
- **The HUD and the hero reticle never scale with the camera.** Text that must stay still goes in `overlay(t)`.
- **Honest numbers:** `≈` for estimates, real units, "illustrative" for schematic curves, sources on the end card.

## Determinism rules (these are what make frame capture work)

- Everything is a function of `f` (or `t`). Never use `Math.random`, `Date`, `performance.now`, or state carried between frames.
- Use seeded randomness: `mulberry(seed)` for layouts and `hash3(a, b, c)` for per-item values. Precompute layouts at load time, outside `draw`.
- Motion comes in three forms:
  - closed-form (`x = x0 + v·t`, wrapped with `%`);
  - keyframed (`kf`);
  - a precomputed path indexed by time (`along(path, t / dur)`).
- The boil comes from `S.boil = floor(f / 2)`. The renderer keeps frame pairs on the same worker.
- Audio is scheduled from the same plate start times, so picture and sound stay in sync by construction.

## QA checklist

Look at the actual frames, not your code.

- **Contact sheet.** Every second shows something readable. Nothing is empty by accident, and each region holds one idea.
- **Strips** (`--strips`), one per transition:
  - the anticipation dot appears before each lensIn;
  - the bare hold follows each lensIn;
  - no HUD or reticle scales with a zoom or the camera;
  - no rectangle edges show inside lens circles;
  - no vignette has the wrong darkness;
  - morph outlines don't twist;
  - the bleed front looks organic, not blocky;
  - the page roll has inked edges and a shadow;
  - pans show a single join and speed lines, not two frozen frames.
- **Collisions.**
  - Callout text over art, or touching a card.
  - Callouts running off the frame edge: flip them.
  - The STATE row overrunning (the engine wraps it only when it must).
  - Log-ruler labels near the right edge (the engine flips them).
  - A bottom card hitting the frame counter.
- **Motion.** `python3 motion_check.py film.mp4` meets the targets. Its per-second profile has no flat stretches, and no transition spikes out of a near-zero second.
- **Momentum.** In the strips, the old scene visibly leans in before each zoomy cut, and the new scene is still easing when the title starts.
- **Reading.** Every line stays up for `readTime`, and no beat is replaced before it can be read.
- **Facts.** Every on-screen number matches the plate script and its source.
- **File.** `ffprobe` shows the frame count equal to `__story.frames`, the audio level is in range, and the audio is really stereo.
