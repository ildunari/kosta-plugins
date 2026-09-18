---
name: doodle-render
description: Final render of a doodle-art-animation film - build, full MP4 at 3800k, then ffprobe, motion and audio checks and a short delivery summary with file sizes.
disable-model-invocation: true
argument-hint: "[story file] [output.mp4]"
---

# Doodle Render

Make the shareable MP4 of a film in the current working folder and check it before handing it over.

## 1. Set up

- Run from the film's working folder (`pwd` to confirm). Never render inside the plugin folder.
- Arguments given: `$ARGUMENTS` (both optional: first the story file, as in `/doodle-art-animation:doodle-qa`, then the output MP4 name).
- The story is the first argument, otherwise `story.js`. The output is the second argument, otherwise `film.mp4`; the HTML takes the same name with `.html`.
- The toolkit lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation/toolkit`. If that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation/toolkit`. Copy in anything the folder is missing, never overwriting existing files: `cp -Rn "<toolkit>/." . || true` (macOS `cp -n` can exit non-zero when files already exist; that is fine).
- Pick the worker count from the CPU count: `n=$(sysctl -n hw.ncpu 2>/dev/null || nproc)`, then workers = n - 2, at least 2 and at most 8. Use fewer if the user says the machine is busy.

## 2. Render

```
sh assemble.sh                                  # if the folder has one: story.js is generated from the plate files
python3 build.py <story> <film>.html
node render.mjs <film>.html <film>.mp4 --workers <workers> --bitrate 3800k --strict-fonts
```

Run the render in the background and check on it. It prints the frame total first and then progress every 120 frames; expect roughly 40–70 ms per frame with 6 workers (a one-minute film takes 1–2 minutes). Stop and report if a `PAGE ERROR` appears.

## 3. Check the file

```
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames,width,height,r_frame_rate -of compact <film>.mp4
python3 motion_check.py <film>.mp4
python3 audio_check.py <film>.mp4          # add --silent for a story made with silent: true
ls -lh <film>.mp4 <film>.html; du -sh <film>_frames
```

- The frame count must equal the total `render.mjs` printed, at 1920×1080 and 24 fps.
- `motion_check`: median at least 1.5, still drawings under 5%.
- `audio_check` must not FAIL (it exits 1 on no audio, mono, clipping, or a length mismatch). Report its WARN lines.
- At 3800k the MP4 lands at about 20–30 MB per minute (the 55 s One Drop example is 18 MB).

If anything fails, say what and suggest `/doodle-art-animation:doodle-qa`; don't deliver a failing file as final.

**Then review the sound, unless the film is silent.** This is the first moment an MP4 exists, so it is the first moment `doodle-art-animation:audio-reviewer` can do its job — `audio_check` only measures levels, not whether a cue lands on its moment or a bed hands off cleanly across a seam. Run the agent with the working folder, the HTML, the story file, the MP4, the transition times and `cues.md` if there is one, and fix what it fails before delivering. A cue fix means a rebuild and a re-render, so keep it to what matters.

## 4. Deliver

Reply with a short summary:

- the MP4 path, size, length and frame count;
- the HTML path and size (it is also a player: space plays, the arrow keys skip 2 s, `[` and `]` jump between plates);
- the `motion_check` and `audio_check` result lines;
- the render time and worker count.

The `<film>_frames` folder holds every frame and the WAV. Give its size and offer to delete it; delete it only if the user agrees.
