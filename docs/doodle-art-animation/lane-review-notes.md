# Review lane: notes for the integrator

Branch `doodle-film-review`. This lane adds a whole-film reviewer, two check scripts and two user-invoked commands. It does not touch `engine.js`, `render.mjs`, `build.py` or the main `SKILL.md`; the lines to add to that SKILL.md are below.

## What was added

| File | What it does |
|---|---|
| `agents/film-reviewer.md` | Reviews the whole film (collisions, edges, reading time, dead stretches, scaling text, facts, scenery variety, sound). It uses a 10-item rubric scored out of 20 and hands seams to `seam-reviewer`. |
| `skills/doodle-art-animation/toolkit/audio_check.py` | Checks level, peak, EBU R128 loudness, clipping, stereo, silence, audio against video length, and (with `--starts`) cue timing. It exits 1 only on a hard failure. |
| `skills/doodle-art-animation/toolkit/text_check.mjs` | Wraps the engine's `text()` in the page and follows every line as it plays. It reports `READ` (up shorter than `readTime`, or cut off while typing), `EDGE`, `OVERLAP` and `SCALE`, and prints the transition times. |
| `skills/doodle-qa/SKILL.md` | `/doodle-art-animation:doodle-qa`: build, sheet, strips, seams, text_check, motion, audio, frame count, then both reviewers, then one summary. |
| `skills/doodle-render/SKILL.md` | `/doodle-art-animation:doodle-render`: build, full MP4 at `--bitrate 3800k` with workers = CPUs − 2 (2 to 8), ffprobe, motion, audio, and a delivery summary with file sizes. |
| `references/sound.md` | The audio targets and the `audio_check` usage. |

`text_check.mjs` depends on engine names: `text`, `setFont`, `ctx`, `cvs`, `S.trans`, `STORY.plates`, `renderFrame`, `plateHeader`, `stageDial`, `journeyLog`, `frameCounter`, `reticle` and `window.__story`. If another lane renames any of these, update the script. It also relies on `text()` being a top-level function declaration in a classic `<script>` (true in `shell.html` today).

## Review fixes (second commit)

- `text_check.mjs`:
  - The result line counts SCALE groups, not records, and leaves out the engine lean-in groups, which it reports as "engine notes". A film with only those notes now reads CLEAN.
  - A line still typing when its plate ends (a hard cut) or when the film ends is flagged CUT OFF.
  - Plates are named by their header ("plate II "Inside the Drop"", "opening", "end card").
  - A line still in place in the first 0.3 s of a transition keeps counting as on screen.
  - `--step` is validated.
  - End-card text under 16 px goes to INFO instead of READ.
  - Short numeric readouts (6 characters or fewer with a digit, such as axis ticks) are not reading-checked.

Retest, without new renders:
- `text_check`:
  - One Drop reads `read 7, edge 0, overlap 1, scale 0; engine notes 2, info 5`.
  - A copy edited so the title subtitle hits the plate end and an end-card line hits the film end mid-typing flags both CUT OFF.
  - `story_seams` still flags the aphid note.
  - The Long Release (`lr.html`, another lane's build) runs cleanly.
  - `--step` with no value, or with 0, exits 2 with a message.
- `audio_check`:
  - `lr.mp4` passes.
  - The clipped file fails with 576 runs of 6+ samples.
  - A synthetic WAV with 4- and 5-sample full-scale runs warns and exits 0.
  - The no-audio, dual-mono and short files still exit 1.
- `cp -Rn toolkit/. .` exits 1 on macOS when a file exists, keeps that file, and copies the rest.
- `audio_check.py`: the docstring matches the level bands and mentions the 0.5 s leading-silence warning. Clipping now fails on runs of 6 or more full-scale samples; runs of 3–5 warn (AAC decode overshoot near 0 dBFS).
- `film-reviewer.md`: reuses a contact sheet, strips and `text_check` output that the caller already has, and explains the transition-frame rule and the INFO lines.
- `doodle-qa` and `doodle-render`:
  - Both copy the whole toolkit without overwriting: `cp -Rn "<toolkit>/." . || true`. This keeps working if another lane adds `toolkit/kits/`.
  - Both take the story file as the first argument. The second is the working folder for `doodle-qa` and the output name for `doodle-render`.

## Lines to add to the main `skills/doodle-art-animation/SKILL.md`

In the toolkit table, after the `toolkit/motion_check.py` row:

```
| `toolkit/audio_check.py` | Checks the sound: level, peak, clipping, stereo, silence, length, cue timing. |
| `toolkit/text_check.mjs` | Measures on-screen text: reading time, text off the frame, overlaps, text that scales. |
```

In Workflow step 6 ("QA the motion, not just the stills"), after the `--seams` bullet:

```
   - `node text_check.mjs film.html` measures every line of text as it plays: lines up for less than `readTime` or cut off while typing, text off the frame, overlapping text, and HUD or overlay text that changes size. It also prints the transition times.
```

Replace the seam-reviewer bullet in step 6 with:

```
   - Before the final render, run the plugin's `film-reviewer` and `seam-reviewer` agents on the working folder (or `/doodle-art-animation:doodle-qa`, which runs every check and both agents), and fix everything they fail. Without the agents, apply the rubrics in `agents/film-reviewer.md` and `references/film-grammar.md` yourself.
```

After the `motion_check` bullet in step 6:

```
   - After the first full render, also run `python3 audio_check.py film.mp4 --starts <transition times>` (targets in `references/sound.md`).
```

Replace step 7 with:

```
7. **Render**: `/doodle-art-animation:doodle-render`, or by hand `node render.mjs film.html film.mp4 --workers 6 --bitrate 3800k` (a one-minute film lands near 20–30 MB), then `motion_check.py` and `audio_check.py`.
```

(If the main skill's setup line becomes `cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .`, the new scripts are copied with it.)

In the QA checklist, replace the **Reading** and **File** bullets with:

```
- **Reading.** `node text_check.mjs film.html` shows no `READ` lines: every line stays up for `readTime` from when it starts typing until it starts to fade, and no line fades while still typing. In a `stat`, the note starts 1.2 s in, so the beat needs at least 1.5 s + `readTime(note)`; in a `callout`, the sub starts 0.7 s in, so it needs 1.0 s + `readTime(sub)`.
- **File.** `ffprobe` shows the frame count equal to `__story.frames`, and `python3 audio_check.py film.mp4` passes (level, peak, no clipping, real stereo, audio as long as the video).
```

Add to the **Collisions** bullet:

```
  - `text_check` `OVERLAP` and `EDGE` lines (text boxes only; look at the frames for text over art).
```

HANDOFF.md's "Still to add" items 1 (`doodle-qa`, `doodle-render`) and 2 (the reviewer, done as `film-reviewer`) are covered by this lane. Consider bumping `plugin.json` to 0.10.0 when the lanes merge; this lane leaves the version alone to avoid conflicts.

## Test evidence (16 Sep 2026, MacBook Pro, 10 cores)

- `claude plugin validate plugins/doodle-art-animation --strict`: passed.
- `claude -p --plugin-dir …` lists `doodle-art-animation:film-reviewer` and `doodle-art-animation:seam-reviewer`.
- `story_example.js` built and rendered at 3 workers with `--bitrate 3800k`: 2 min 9 s, 18 MB, 1176 frames (matches the film's frame count), 1920×1080, 24 fps.
- `motion_check`: median 1.82, p75 3.25, 0% still.
- `audio_check` on that render: mean −20.2 dB (matches `volumedetect`), peak −5.8, −17.7 LUFS, no clipping, side/mid −7.1 dB, no silence, length difference −0.02 s. With `--starts`, 5 of 6 transitions have an onset within 0.25 s; the `bleed` at 33.5 s is +0.40 s (a slow swell, as expected).
- `audio_check` on made-up bad files: no audio stream, a 1-channel file, a dual-mono file (side/mid −40 dB after AAC, correlation 1.000), audio pushed 12 dB into clipping (773 clipped runs) and audio 0.58 s short each exit 1. A 2.5 s muted gap warns and exits 0.
- `text_check` on the example (50 s for 588 drawings) found 8 short lines, including:
  - plate I, "1,200 litres on every square metre": up 1.5 s, needs 3.6 s;
  - plate I, "what the ground cannot take flows downhill": up 1.8 s, needs 4.3 s;
  - the end card credits: up 2.25 s, needs 9.8 s.

  It also found one 0.08 s touch between a reticle tag and a label, and overlay text changing size by 5–8% in the engine's lean-in before the zooms at 20 s and 26.5 s. By the same formulas as the agent: the plate I beat is 3.0 s long, minus 1.5 gives 1.5 s, which matches.
- `text_check` on `story_seams.js` caught the plate II note "aphids, as an adult (illustrative)" fading while still typing; the rendered frames show it stops at "aphids, as an adult". Its beat is 3.3–5.3 s and needs about 4.8 s.

### Sample film-review run (the procedure acted out on One Drop)

Verdict: **fix first** (14/20, reading scores 0).

| Item | Score | Reason |
|---|---:|---|
| Collisions | 2 | One 0.08 s touch between the reticle tag and "RAIN" at 36.9 s; nothing else |
| Edges | 2 | No `EDGE` lines; scenery bleeds on every plate |
| Reading | 0 | 8 short lines (plate I note 1.5 of 3.6 s, callout sub 1.8 of 4.3 s, end card credits 2.25 of 9.8 s) |
| Life | 1 | Median 1.82, 0% still, but 36–38 s (raindrop fall) and 45–48 s (end card) sit at 1.2–1.4 |
| Fullness | 1 | The "A Raindrop" plate leaves a large empty sky for its first seconds (27–29 s) |
| Furniture | 1 | HUD and reticle are steady; overlay text scales 5–8% in the lean-in (engine behaviour) |
| Facts | 2 | 1,200 mm = 1,200 L/m², 1.4×10²⁰ molecules in a 2 mm drop and 20 µm ≈ 70,000 molecules check out; the source list on the end card is too small to read on the sheet |
| Variety | 1 | The title, valley and raindrop plates share the same ground strata |
| Sound level | 2 | `audio_check` passes |
| Sound to picture | 2 | Onsets within 0.25 s at every sharp transition |

Fixes, in order: lengthen the plate I stat beat to about 1.1–6.3 s (the note needs 1.5 + 3.6 s); the callout sub then no longer fits in the 7.5 s plate, so shorten it to about 20 characters or give the plate about 3 s more; hold the end card credits at least 10 s; give the raindrop plate's fall and the end card more motion; give the raindrop plate its own ground (open sky or sea).

## Doubts

- By the engine's own `readTime` rule, the shipped example fails in 8 places. Either the example beats need lengthening (another lane owns the story), or 12 characters per second is stricter than intended. A typical adult reads roughly 15–20 characters per second, and `readTime` counts from when typing starts.
- The overlay lean-in scaling (5–8%) may be intended; `text_check` reports it separately as an engine note.
- The film-reviewer agent itself was not run as a live subagent here. Its procedure was acted out by hand with the same commands. `doodle-qa` and `doodle-render` were checked by validation and the load test, not invoked end to end.
- `${CLAUDE_PLUGIN_ROOT}` is documented as substituted in skill and agent text but is not an environment variable in Bash, so the skills and agent write it literally into commands and give a `${CLAUDE_SKILL_DIR}/..` fallback.
