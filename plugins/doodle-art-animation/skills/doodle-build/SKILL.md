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

Then write `helpers.js`, unless `/doodle-art-animation:doodle-plan` already wrote one. If it did, and `script.md` is older than it, read it and add only what is missing. If `script.md` is newer — the user changed the plan at the card — reconcile first: the hero function and its ID tag, the palette and every seam anchor come from the script, so bring those into line with it before any lane starts, or every lane draws the old plan. It holds the film's palette names, the `hero` function and its ID tag, the journey-log rows, any shape or pose that two or more plates share, and **every constant a seam anchors to**: if plate 2's `enter` reads the point where plate 1's drop landed, that point is declared here, or plate 2 cannot build without plate 1's file. It is the one file every lane reads and no lane writes, so keep it small and finish it before the lanes start — a helper added later reaches nobody.

## 3. Sound plan and art lanes start together

Both need only the reviewed script, so start them in the same message. Skip the sound plan if the film is silent, or if `cues.md` exists and is newer than `script.md`. A `cues.md` older than the script was planned against a version the user may since have changed — a scene retimed at the plan card moves every cue in it — so run `sound-designer` again.

Run `doodle-art-animation:sound-designer` with `script.md`, `brief.md` and the absolute working folder. Save its cue sheet as `cues.md`; the cues get pasted into the plates at assembly, not by a lane.

## 4. One art lane per scene

Fan out with the Agent tool, one agent per plate, all started in one message. The contract is in `references/build-lanes.md`; hold every lane to it.

Each lane gets: the absolute working folder, its own row from the plate table, the seams on either side of it, `helpers.js`, `brief.md`, `facts.md`, and the **absolute paths** of the references it must read (`style.md`, `components.md`, `api.md`, `motion.md`, `animation-principles.md`) — a lane is a fresh agent, so `${CLAUDE_PLUGIN_ROOT}` is not expanded in its prompt and a bare file name resolves nowhere. When a lane returns nothing, an error, or a plate that misses its row, follow "When a lane fails" in `references/build-lanes.md`: the main session finishes it at assembly rather than re-briefing.

Each lane:

- writes exactly one file, `plate_<n>_<slug>.js`, holding one plate object named `P<n>` (`plate_2_corona.js` defines `const P2`) and nothing else;
- builds and renders only to check its own plate, with its own probe story so the lanes don't collide:

```
cat helpers.js plate_2_corona.js > probe_2.js
printf "defineStory({ title: 'probe 2', stages: <the film's stages>, plates: [P2] });\nboot();\n" >> probe_2.js
python3 build.py probe_2.js probe_2.html
node render.mjs probe_2.html --sheet-range 0-<the plate's duration> --fps 6 --dir qa/plate_2
```

- returns that range sheet (`qa/plate_2/range_0-<dur>.jpg`) as its evidence, plus a line on what it drew and anything it could not do. `--crop x,y,w,h` adds a detail sheet of the same frames for small labels and textures. A probe holds one plate, so its seconds start at 0 whatever the plate's place in the film; `--sheet-range` counts from the start of whatever film it is handed, so those numbers change once the film is assembled;
- never edits `engine.js`, `shell.html`, `build.py`, the kits, `helpers.js` or another lane's plate file. If a lane needs something in a shared file, it says so and the main session makes that change once, for everyone.

**Fan out from three scenes up.** Below that — one or two plates, or a film of about 30 seconds or less — the briefing costs more than the drawing, so build the scenes yourself one after another. Build serially too when the plates share one continuous shot split only by camera moves, when they are so tied together that the second cannot be drawn without the first (both halves of a custom morph, a recap that redraws earlier art), or when the harness has no way to run agents at all.

## 5. Assemble and build once

`story.js` is generated, never edited. Its sources are `helpers.js`, the plate files and a short `story_tail.js`, and one script rebuilds it from them — so every later fix goes into a source file and the film is reassembled, instead of drifting away from what the lanes wrote.

0. If the brief says the film is silent, add `silent: true` to the `defineStory` call in `story_tail.js` and skip the rest of the sound. Leaving out cues is not enough: the engine adds a riser, a transition sound and a pen scratch on its own for every seam and header, and `silent: true` is what turns those off.
1. Put the sound into its plates: paste each plate's `cues` and `bed` from `cues.md` into that plate's file now. Pasted into `story.js` they would vanish at the next reassembly.
2. Write `story_tail.js` with the story call, listing **every** plate object in screen order — title plate and end card included — and the music if the sound plan asks for it:

   ```
   defineStory({ title: '<title>', stages: <n>, music: { … }, plates: [P0, P1, P2, … every plate …] });
   boot();
   ```

   `stages` counts only the numbered plates between the title and the end card (`story_example.js` has six plates and `stages: 4`).
3. Write `assemble.sh`, naming every plate file from the script explicitly, in film order — never a `plate_*.js` glob, which puts `plate_10` before `plate_2` — then run it and build:

   ```
   cat > assemble.sh <<'SH'
   #!/bin/sh
   # regenerates story.js from its sources; edit those, not story.js
   set -e
   cat helpers.js plate_0_title.js plate_1_<slug>.js plate_2_<slug>.js … plate_<last>_end.js story_tail.js > story.js
   SH
   sh assemble.sh && python3 build.py story.js film.html
   ```

   The plate list must match `story_tail.js` exactly: a file missing from `assemble.sh` is a `ReferenceError`, and a name missing from `plates` is a plate that silently never plays.
- Fix every `PAGE ERROR` before going on; a page error means the film is not built.

## 6. One shared QA render

Render this set **once**, into `qa/`. `/doodle-art-animation:doodle-qa` and its reviewers reuse these files instead of rendering their own, so don't skip any of them and don't run them twice.

```
node render.mjs film.html --sheet 1 --dir qa          # qa/contact_sheet.jpg
node render.mjs film.html --strips --dir qa           # qa/strip_NN_type.jpg
node render.mjs film.html --seams --dir qa            # qa/seam_NN_type.jpg, prints each seam's time
node text_check.mjs film.html --json qa/text_check.json
node speed_check.mjs film.html
touch qa/.complete                                    # last, and only if every line above succeeded
```

`qa/.complete` marks the set as whole. A run that stops half-way leaves the old marker behind the new sheets, so the next staleness check sees the gap instead of trusting a set that is half new, half old.

Keep the seam times and the `text_check` and `speed_check` output to hand on to the QA command. `motion_check.py` and `audio_check.py` need an MP4, so they wait for the render. Open the contact sheet and a few strips yourself before you report.

## 7. Report

- **Plates:** one line each — file, seconds, what it draws, and whether its range sheet looked right.
- **Sound:** whether `cues.md` exists and what went into the story.
- **Build:** the `build.py` line, the `text_check` result line, the `speed_check` result line, and where `qa/` is.
- **Open:** anything a lane could not do — a fact with no source, a seam that needs both plates changed, a shared-file change it asked for — and what you did about it.

Then point the user at `/doodle-art-animation:doodle-qa` (it reuses `qa/`), and `/doodle-art-animation:doodle-render` once QA passes.
