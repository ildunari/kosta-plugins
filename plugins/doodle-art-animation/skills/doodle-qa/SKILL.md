---
name: doodle-qa
description: Run every quality check on a doodle-art-animation film working folder (build, contact sheet, strips, seam sheets, text, legibility, story, sound-variety, speed, motion and audio checks, then the film-reviewer, seam-reviewer and audio-reviewer agents, and script-reviewer when a scene script is present) and summarise what to fix.
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
- Narration: the film is narrated when `brief.md` says so or the folder has `vo/voice.json`. Note it; several checks below change for a narrated film.
- The film HTML is `film.html` unless the folder already has another HTML built from this story (check its `<title>` against the story's `title`). The MP4 is the newest `*.mp4` in the folder, if any.
- The toolkit lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation/toolkit`. If that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation/toolkit`. Copy in anything the folder is missing, never overwriting existing files: `cp -Rn "<toolkit>/." . || true` (macOS `cp -n` can exit non-zero when files already exist; that is fine). If the folder's `engine.js` differs from the toolkit's (`cmp`), say so in the summary; don't replace it, because the story may depend on it.

## 2. Run the checks

`/doodle-art-animation:doodle-build` already rendered the shared set into `qa/` (contact sheet, strips, seam sheets, `qa/text_check.json`) at the end of the build. Reuse it: re-run only what is missing or stale. The film depends on everything the build reads — the plate files and `helpers.js` (or a hand-written story), `engine.js`, `shell.html`, `build.py` and the kits — so the set is stale when any of those is newer than it:

```
find . -maxdepth 2 \( -name '*.js' -o -name '*.mjs' -o -name 'shell.html' -o -name 'build.py' \) \
     -not -path './qa/*' -not -path './node_modules/*' -newer qa/.complete
```

Compare against `qa/.complete`, which the build writes only after the whole set rendered, never against one sheet: a run interrupted after the contact sheet would otherwise leave a fresh sheet in front of old strips and seam sheets and bless the lot. No `qa/.complete` means the set is incomplete — render all of it, and touch the marker when it succeeds.

In a folder with an `assemble.sh`, `story.js` is generated and always looks new, so add `-not -name story.js`; the plate files and `helpers.js` stand for it. Anything the command lists means rebuild and re-render the parts that change touches; nothing means the set is current. Don't judge against the built HTML — the build rewrites it every time, so it always looks newer. If the folder was built by hand and has no `qa/`, run the whole set.

Run these from the working folder, in order, and keep each command's key output:

```
sh assemble.sh                                 # only if the folder has one: story.js is generated from the plate files
python3 build.py <story> <film>.html          # only if a source is newer than the HTML
node render.mjs <film>.html --sheet 1          # qa/contact_sheet.jpg
node render.mjs <film>.html --strips           # qa/strip_NN_type.jpg
node render.mjs <film>.html --seams            # qa/seam_NN_type.jpg, prints each transition time
node text_check.mjs <film>.html --json qa/text_check.json
node speed_check.mjs <film>.html               # engine values against the speed limits (skip if the folder has no speed_check.mjs)
node legibility_check.mjs <film>.html --crops qa/legibility   # text over artwork, text below its role's size floor
node story_check.mjs <film>.html                              # elapsed time, stage numbers and the hero's ID stay consistent
node cue_check.mjs <film>.html                                # one effect dominating, identical repeats
python3 smoke_test.py --stories <story> --work qa_smoke   # page errors, fonts, blank frames, and a short clip whose sound it checks
node voice.mjs check                                          # narrated films only: every clip against its line (length, pace, gaps)
node render.mjs <film>.html --stems --dir qa                  # narrated films only: voice and the rest as two WAVs, plus qa/speech.json
touch qa/.complete                             # only once everything above succeeded
```

If there is an MP4 **newer than the current build**, also run the following. An MP4 older than `qa/.complete` is the previous film: treat it as absent, so `motion_check`, `audio_check` and `audio-reviewer` never measure one film while the other reviewers look at another, and say it needs a re-render.

```
python3 motion_check.py <film>.mp4
python3 audio_check.py <film>.mp4 --starts <transition times printed by text_check>   # add --silent, and drop --starts, for a story made with silent: true
                                                    # narrated: add --narrated --stems qa (-16 LUFS, true peak, music 15-20 dB under the voice)
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 <film>.mp4
```

Stop and report if the build fails or any `PAGE ERROR` appears. Open the contact sheet and a few strips yourself before going on.

## 3. Run the reviewers

Start the reviewers in parallel with the Agent tool: `doodle-art-animation:film-reviewer`, `doodle-art-animation:seam-reviewer` and, if there is an MP4 with sound, `doodle-art-animation:audio-reviewer`. Give each the absolute working folder, the HTML name, the story file and the MP4 (if any). Tell them that `qa/` already holds the contact sheet (`qa/contact_sheet.jpg`), strips, seam sheets and `qa/text_check.json` from this run (and the `text_check`, `speed_check`, `motion_check` and `audio_check` output, pasted into the prompt), so they should reuse those and render only the extra stills they need. Give `audio-reviewer` the transition times and any sound plan from `sound-designer` too. For a narrated film, tell all three it is narrated and point them at `vo/voice.json`, `qa/speech.json` and the `voice.mjs check` output: `film-reviewer` checks the words on screen against what is being said, `seam-reviewer` checks lines running across seams, and `audio-reviewer` checks the voice in the mix. Without an MP4, skip `audio-reviewer` and list it under "Not checked" — `/doodle-art-animation:doodle-render` runs it once the MP4 exists. For a silent film (`silent: true` in the story) there is nothing for it to review; say so, and tell `film-reviewer` the film is silent so it runs `audio_check --silent` and skips its sound rubric — a silent track has identical channels and would otherwise fail as mono.

If step 1 found a scene script, also start `doodle-art-animation:script-reviewer` (for a narrated film, with the narration: the locked lengths from `vo/voice.json` against the script's estimates) with the script, the story file, the sources the folder or story lists, and the user's request and intake answers if you have them from this conversation (say so if you don't). It normally runs before the build, during planning; here it checks that the built film still matches its plan, so ask for that comparison explicitly: hand it the plate files (or `story.js`) as well as the script, and ask it to map every row to what was built — beats present and in order, facts and numbers as scripted, seams as listed. With no script, skip it and note that script review belongs to planning.

## 4. Summarise

Keep it short:

- **Verdict:** ready to render / ready to deliver / fix first.
- **Measurements:** the `motion_check` line, the `speed_check` result, the `audio_check` result line, the frame count against the film's frame count, and the result lines of `text_check`, `legibility_check`, `story_check` and `cue_check`.
- **Scores:** the film-reviewer total out of 20, the lowest seam total out of 20, the audio-reviewer verdict and its FAIL lines, and the script-reviewer verdict if it ran, with any automatic fails.
- **Fixes:** one merged list in order of importance, each with the time or plate and the concrete change. Drop duplicates between the reviews.
- **Not checked:** anything you couldn't run (no MP4, a missing tool, no scene script). Note that audio-reviewer works from measurements and can't hear the film, so pass on its "needs a listen" items to the user.
- **Sound plan:** if the film has no `cues` beyond a few, or audio-reviewer asks for one, suggest running `sound-designer` on the script.

Then ask whether to apply the fixes.

## 5. The fix loop

If the user says yes: merge the reviews into one fix list, apply it, rebuild, and then **re-run only the checks the change affected**. Re-running the whole gate on a one-word edit costs minutes and tells you nothing new.

| The change | Re-run |
|---|---|
| Text edited, moved or retimed | `text_check` and `legibility_check`; if it moved, also render the frames around it and look — neither can tell text across a gauge face from text on a card |
| A seam, transition or camera move changed | `speed_check`, `--seams` (and `--strips` for the plates either side), then `seam-reviewer` |
| New art, a new beat, a plate retimed | that plate's `--sheet-range` sheet, `--sheet 1`, `text_check` (a retimed plate can cut a line short at its new end), `motion_check` after the next render, then `film-reviewer`; if the change reaches the plate's first or last seconds, also the adjacent seam sheets and `seam-reviewer`, since a hero moved at the boundary is a hand-off that no longer meets |
| A cue, bed or `music` changed | `cue_check`, then `audio_check` after the next render, then `audio-reviewer` |
| The scene script itself changed | `script-reviewer` |
| A narration line rewritten or retaken | `node voice.mjs generate`, `check` and `lock` (only that plate costs anything), rebuild, `--stems`, then `film-reviewer` and `audio-reviewer`: the plate's length and its marks moved, and the beats on them moved too |

Apply each fix to its source — the plate file or `helpers.js` in a folder built by `/doodle-art-animation:doodle-build`, never `story.js`, which `assemble.sh` regenerates — then `sh assemble.sh` and a build (`python3 build.py`) come before any of them, and anything needing an MP4 waits for the next render. Repeat until the affected checks are clean, then report the same summary as above for what changed, and say which checks you did not re-run and why.

**Three rounds, then stop.** If a check is still failing after three passes, don't keep going round: report what is failing, what you tried, and what you think it would take — a story change the user should weigh, a target that is wrong for this film, or a plugin fault. A check three fixes could not satisfy is usually a disagreement about the film, not a bug in the film.
