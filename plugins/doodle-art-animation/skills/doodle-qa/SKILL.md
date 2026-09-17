---
name: doodle-qa
description: Run every quality check on a doodle-art-animation film working folder (build, contact sheet, strips, seam sheets, text, motion and audio checks, then the film-reviewer and seam-reviewer agents) and summarise what to fix.
disable-model-invocation: true
argument-hint: "[story file] [working folder]"
---

# Doodle QA

Check a film before the final render, or check a render before delivery. Don't edit the story during this command; report, then offer to fix.

## 1. Find the folder and the files

- Arguments given: `$ARGUMENTS` (both optional, in the same order as `/doodle-art-animation:doodle-render`: first the story file, then the working folder).
- The working folder is the second argument, otherwise the current directory. `cd` into it and confirm with `pwd`.
- The story is the first argument, otherwise `story.js`. If that doesn't exist, list the `story*.js` files and ask which one.
- The film HTML is `film.html` unless the folder already has another HTML built from this story (check its `<title>` against the story's `title`). The MP4 is the newest `*.mp4` in the folder, if any.
- The toolkit lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation/toolkit`. If that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation/toolkit`. Copy in anything the folder is missing, never overwriting existing files: `cp -Rn "<toolkit>/." . || true` (macOS `cp -n` can exit non-zero when files already exist; that is fine). If the folder's `engine.js` differs from the toolkit's (`cmp`), say so in the summary; don't replace it, because the story may depend on it.

## 2. Run the checks

Run these from the working folder, in order, and keep each command's key output:

```
python3 build.py <story> <film>.html
node render.mjs <film>.html --sheet 1          # qa/contact_sheet.jpg
node render.mjs <film>.html --strips           # qa/strip_NN_type.jpg
node render.mjs <film>.html --seams            # qa/seam_NN_type.jpg, prints each transition time
node text_check.mjs <film>.html --json qa/text_check.json
```

If there is an MP4, also run:

```
python3 motion_check.py <film>.mp4
python3 audio_check.py <film>.mp4 --starts <transition times printed by text_check>
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 <film>.mp4
```

Stop and report if the build fails or any `PAGE ERROR` appears. Open the contact sheet and a few strips yourself before going on.

## 3. Run the reviewers

Start both agents in parallel with the Agent tool: `doodle-art-animation:film-reviewer` and `doodle-art-animation:seam-reviewer`. Give each the absolute working folder, the HTML name, the story file and the MP4 (if any). Tell them that `qa/` already holds the contact sheet (`qa/contact_sheet.jpg`), strips, seam sheets and `qa/text_check.json` from this run (and the `text_check`, `motion_check` and `audio_check` output, pasted into the prompt), so they should reuse those and render only the extra stills they need.

## 4. Summarise

Keep it short:

- **Verdict:** ready to render / ready to deliver / fix first.
- **Measurements:** the `motion_check` line, the `audio_check` result line, the frame count against the film's frame count, and the `text_check` result line.
- **Scores:** the film-reviewer total out of 20 and the lowest seam total out of 20, with any automatic fails.
- **Fixes:** one merged list in order of importance, each with the time or plate and the concrete change. Drop duplicates between the two reviews.
- **Not checked:** anything you couldn't run (no MP4, a missing tool).

Then ask whether to apply the fixes.
