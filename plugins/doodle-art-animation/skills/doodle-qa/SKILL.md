---
name: doodle-qa
description: Run every quality check on a doodle-art-animation film working folder (build, contact sheet, strips, seam sheets, text, speed, motion and audio checks, then the film-reviewer, seam-reviewer and audio-reviewer agents, and script-reviewer when a scene script is present) and summarise what to fix.
disable-model-invocation: true
argument-hint: "[story file] [working folder]"
---

# Doodle QA

Check a film before the final render, or check a render before delivery. Don't edit the story during this command; report, then offer to fix.

The plugin has five agents. Three review a built film and run here: `film-reviewer` (the whole film), `seam-reviewer` (transitions and camera) and `audio-reviewer` (the sound against the picture, from measurements). Two belong to planning, before anything is drawn: `script-reviewer` checks the scene script and seam list against the user's request, and `sound-designer` turns a reviewed script into a cue sheet in the engine's audio API. `/doodle-art-animation:doodle-plan` owns `script-reviewer` at Gate 1, before anything is drawn; this command re-runs it only when the folder holds a scene script (see step 3), to check that the built film still matches its plan. It never runs `sound-designer`, but suggests it when the film has little or no designed sound.

## 1. Find the folder and the files

- Arguments given: `$ARGUMENTS` (both optional, in the same order as `/doodle-art-animation:doodle-render`: first the story file, then the working folder).
- The working folder is the second argument, otherwise the current directory. `cd` into it and confirm with `pwd`.
- The story is the first argument, otherwise `story.js`. If that doesn't exist, list the `story*.js` files and ask which one.
- The scene script, if any: a `script.md`, `plates.md` or similar in the folder, or the plate table and seam list in the story file's top comment. Note where it is.
- The film HTML is `film.html` unless the folder already has another HTML built from this story (check its `<title>` against the story's `title`). The MP4 is the newest `*.mp4` in the folder, if any.
- The toolkit lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation/toolkit`. If that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation/toolkit`. Copy in anything the folder is missing, never overwriting existing files: `cp -Rn "<toolkit>/." . || true` (macOS `cp -n` can exit non-zero when files already exist; that is fine). If the folder's `engine.js` differs from the toolkit's (`cmp`), say so in the summary; don't replace it, because the story may depend on it.

## 2. Run the checks

`/doodle-art-animation:doodle-build` already rendered the shared set into `qa/` (contact sheet, strips, seam sheets, `qa/text_check.json`) at the end of the build. Reuse it: re-run only what is missing, or stale because the **story file** is newer than the sheets (`ls -l` the story and `qa/`). Judge staleness against the story, not the HTML — the build below rewrites the HTML every time, and comparing against it would make the whole set look stale and undo the saving. Rebuild the HTML only when the story is newer than it. If the folder was built by hand and has no `qa/`, run the whole set.

Run these from the working folder, in order, and keep each command's key output:

```
python3 build.py <story> <film>.html          # only if the story is newer than the HTML
node render.mjs <film>.html --sheet 1          # qa/contact_sheet.jpg
node render.mjs <film>.html --strips           # qa/strip_NN_type.jpg
node render.mjs <film>.html --seams            # qa/seam_NN_type.jpg, prints each transition time
node text_check.mjs <film>.html --json qa/text_check.json
node speed_check.mjs <film>.html               # engine values against the speed limits (skip if the folder has no speed_check.mjs)
```

If there is an MP4, also run:

```
python3 motion_check.py <film>.mp4
python3 audio_check.py <film>.mp4 --starts <transition times printed by text_check>
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 <film>.mp4
```

Stop and report if the build fails or any `PAGE ERROR` appears. Open the contact sheet and a few strips yourself before going on.

## 3. Run the reviewers

Start the reviewers in parallel with the Agent tool: `doodle-art-animation:film-reviewer`, `doodle-art-animation:seam-reviewer` and, if there is an MP4 with sound, `doodle-art-animation:audio-reviewer`. Give each the absolute working folder, the HTML name, the story file and the MP4 (if any). Tell them that `qa/` already holds the contact sheet (`qa/contact_sheet.jpg`), strips, seam sheets and `qa/text_check.json` from this run (and the `text_check`, `speed_check`, `motion_check` and `audio_check` output, pasted into the prompt), so they should reuse those and render only the extra stills they need. Give `audio-reviewer` the transition times and any sound plan from `sound-designer` too. Without an MP4, skip `audio-reviewer` and list it under "Not checked".

If step 1 found a scene script, also start `doodle-art-animation:script-reviewer` with the script, the story file, the sources the folder or story lists, and the user's request and intake answers if you have them from this conversation (say so if you don't). It normally runs before the build, during planning; here it checks that the built film still matches its plan. With no script, skip it and note that script review belongs to planning.

## 4. Summarise

Keep it short:

- **Verdict:** ready to render / ready to deliver / fix first.
- **Measurements:** the `motion_check` line, the `speed_check` result, the `audio_check` result line, the frame count against the film's frame count, and the `text_check` result line.
- **Scores:** the film-reviewer total out of 20, the lowest seam total out of 20, the audio-reviewer verdict and its FAIL lines, and the script-reviewer verdict if it ran, with any automatic fails.
- **Fixes:** one merged list in order of importance, each with the time or plate and the concrete change. Drop duplicates between the reviews.
- **Not checked:** anything you couldn't run (no MP4, a missing tool, no scene script). Note that audio-reviewer works from measurements and can't hear the film, so pass on its "needs a listen" items to the user.
- **Sound plan:** if the film has no `cues` beyond a few, or audio-reviewer asks for one, suggest running `sound-designer` on the script.

Then ask whether to apply the fixes.

## 5. The fix loop

If the user says yes: merge the reviews into one fix list, apply it, rebuild, and then **re-run only the checks the change affected**. Re-running the whole gate on a one-word edit costs minutes and tells you nothing new.

| The change | Re-run |
|---|---|
| Text edited, moved or retimed | `text_check` |
| A seam, transition or camera move changed | `speed_check`, `--seams` (and `--strips` for the plates either side), then `seam-reviewer` |
| New art, a new beat, a plate retimed | that plate's `--sheet-range` sheet, `--sheet 1`, `motion_check` after the next render, then `film-reviewer` |
| A cue, bed or `music` changed | `audio_check` after the next render, then `audio-reviewer` |
| The scene script itself changed | `script-reviewer` |

A build (`python3 build.py`) comes before any of them, and anything needing an MP4 waits for the next render. Repeat until the affected checks are clean, then report the same summary as above for what changed, and say which checks you did not re-run and why.

**Three rounds, then stop.** If a check is still failing after three passes, don't keep going round: report what is failing, what you tried, and what you think it would take — a story change the user should weigh, a target that is wrong for this film, or a plugin fault. A check three fixes could not satisfy is usually a disagreement about the film, not a bug in the film.
