---
name: doodle-build
description: Build a doodle-art-animation film from an approved scene script - the working folder and shared helpers, the sound plan and one art lane per scene in parallel, then assembly into story.js, one build, and one shared QA render into qa/ for the reviewers to reuse.
disable-model-invocation: true
argument-hint: "[working folder] [script file]"
---

# Doodle Build

Turn an approved scene script into a built film: phases 3 to 5 of the workflow in the `doodle-art-animation` skill. It ends with `story.js`, `film.html` and one shared `qa/` set, ready for `/doodle-art-animation:doodle-qa`.

## 1. Find the plan, or stop

- Arguments given: `$ARGUMENTS` (both optional: first the working folder, then the script file).
- The working folder is the first argument, otherwise the current directory. `cd` into it and confirm with `pwd`.
- The script is the second argument, otherwise `script.md`. **If there is no script, stop**: say that this command builds an approved plan and that the user should run `/doodle-art-animation:doodle-plan` first. Don't invent a script here.
- If `script.md` exists but nothing shows it went through Gate 1 (no review notes, no approval in this conversation), say so and offer to run `doodle-art-animation:script-reviewer` on it now. Building against an unreviewed script is how a film gets drawn twice.
- Read `brief.md` and `facts.md` if they are there, and `cues.md` if `/doodle-art-animation:doodle-plan` already produced a sound plan.

## 2. Set up the working folder

Never build inside the plugin folder. The toolkit lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation/toolkit`; if that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation/toolkit`.

```
cp -R "<toolkit>/." .
mkdir -p qa
```

Then write `helpers.js`: the film's palette names, the `hero` function and its ID tag, the journey-log rows, and any shape or pose that two or more plates share. It is the one file every lane reads and no lane writes, so keep it small and finish it before the lanes start — a helper added later reaches nobody.

## 3. Sound plan and art lanes start together

Both need only the reviewed script, so start them in the same message. Skip the sound plan if `cues.md` already exists or the film is silent.

Run `doodle-art-animation:sound-designer` with `script.md`, `brief.md` and the absolute working folder. Save its cue sheet as `cues.md`; the cues get pasted into the plates at assembly, not by a lane.

## 4. One art lane per scene

Fan out with the Agent tool, one agent per plate, all started in one message. The contract is in `references/build-lanes.md`; hold every lane to it.

Each lane gets: the absolute working folder, its own row from the plate table, the seams on either side of it, `helpers.js`, `brief.md`, `facts.md`, and the references it needs (`style.md`, `components.md`, `api.md`, `motion.md`, `animation-principles.md`).

Each lane:

- writes exactly one file, `plate_<n>_<slug>.js`, holding one plate object named after the file (`plate_3_corona.js` defines `const P3_CORONA`) and nothing else;
- builds and renders only to check its own plate, with its own probe story so the lanes don't collide:

```
cat helpers.js plate_3_corona.js > probe_3.js
printf "defineStory({ title: 'probe 3', stages: <the film's stages>, plates: [P3_CORONA] });\nboot();\n" >> probe_3.js
python3 build.py probe_3.js probe_3.html
node render.mjs probe_3.html --sheet-range 0-10 --fps 6 --dir qa/plate_3
```

- returns that range sheet (`qa/plate_3/range_0-10.jpg`) as its evidence, plus a line on what it drew and anything it could not do. `--crop x,y,w,h` adds a detail sheet of the same frames for small labels and textures;
- never edits `engine.js`, `shell.html`, `build.py`, the kits, `helpers.js` or another lane's plate file. If a lane needs something in a shared file, it says so and the main session makes that change once, for everyone.

**Build serially instead** when fanning out would cost more than it saves: a film of one or two scenes; one continuous scene split only by camera moves; or plates so tied together that the second can't be drawn without the first (both halves of a custom morph seam, a recap that redraws earlier art).

## 5. Assemble and build once

Concatenate the plates in plate order, then append the story tail:

```
cat helpers.js plate_0_title.js plate_1_*.js plate_2_*.js plate_3_*.js plate_4_end.js > story.js
printf "defineStory({ title: '<title>', stages: <n>, plates: [P0, P1, P2, P3, P4] });\nboot();\n" >> story.js
python3 build.py story.js film.html
```

- `plates` lists every plate object in screen order, including the title plate and the end card. `stages` counts only the numbered plates between them (`story_example.js` has six plates and `stages: 4`).
- Paste each plate's `cues` and `bed` from `cues.md` now, and set `defineStory({ music: … })` if the sound plan asks for one.
- Fix every `PAGE ERROR` before going on; a page error means the film is not built.

## 6. One shared QA render

Render this set **once**, into `qa/`. `/doodle-art-animation:doodle-qa` and its reviewers reuse these files instead of rendering their own, so don't skip any of them and don't run them twice.

```
node render.mjs film.html --sheet 1 --dir qa          # qa/contact_sheet.jpg
node render.mjs film.html --strips --dir qa           # qa/strip_NN_type.jpg
node render.mjs film.html --seams --dir qa            # qa/seam_NN_type.jpg, prints each seam's time
node text_check.mjs film.html --json qa/text_check.json
node speed_check.mjs film.html
```

Keep the seam times and the `text_check` and `speed_check` output to hand on to the QA command. `motion_check.py` and `audio_check.py` need an MP4, so they wait for the render. Open the contact sheet and a few strips yourself before you report.

## 7. Report

- **Plates:** one line each — file, seconds, what it draws, and whether its range sheet looked right.
- **Sound:** whether `cues.md` exists and what went into the story.
- **Build:** the `build.py` line, the `text_check` result line, the `speed_check` result line, and where `qa/` is.
- **Open:** anything a lane could not do — a fact with no source, a seam that needs both plates changed, a shared-file change it asked for — and what you did about it.

Then point the user at `/doodle-art-animation:doodle-qa` (it reuses `qa/`), and `/doodle-art-animation:doodle-render` once QA passes.
