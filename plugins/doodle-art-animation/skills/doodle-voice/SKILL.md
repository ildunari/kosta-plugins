---
name: doodle-voice
description: Record and lock the voice-over of a narrated doodle-art-animation film, after the plan is approved and before anything is drawn - generate one clip per plate, check and retake, lock the timing into vo/voice.json and script.md, and build an animatic to judge the pacing with the real voice.
disable-model-invocation: true
argument-hint: "[working folder]"
---

# Doodle Voice

Record the narration of a film: phase 2b of the workflow in the `doodle-art-animation` skill. It runs after `/doodle-art-animation:doodle-plan` and before `/doodle-art-animation:doodle-build`, only for a narrated film. It ends with `vo/voice.json` locked, the plate durations in `script.md` updated to the recorded voice, and an animatic. **Nothing is drawn here.**

The order is words, then voice, then picture. Recorded speech cannot be stretched more than a few percent without sounding wrong, while the picture is code and can fit any timing, so the voice is locked first and the plates are timed to it.

## 1. Find the plan, or stop

- Arguments given: `$ARGUMENTS` (optional: the working folder). Otherwise the current directory. `cd` into it and confirm with `pwd`.
- The skill lives at `${CLAUDE_PLUGIN_ROOT}/skills/doodle-art-animation`. If that path was not filled in, use `${CLAUDE_SKILL_DIR}/../doodle-art-animation`. Copy in anything the folder is missing, never overwriting: `cp -Rn "<skill>/toolkit/." . || true`.
- Read `references/voice.md` from the skill, then `brief.md`, `script.md` and `facts.md`.
- **Stop** if `script.md` has no `## Narration` section, or `brief.md` says the film has no narration: say that this command records a narrated film's voice and nothing needs recording. **Stop** too if nothing shows the script passed Gate 1 (no review notes, no approval in this conversation), and point at `/doodle-art-animation:doodle-plan`: every word recorded against an unreviewed script may be recorded twice.

## 2. Lines, provider and key

```
node voice.mjs lines script.md --facts facts.md --preset charon   # writes vo/lines.json, prints each plate's estimate against its Dur
node voice.mjs keys --test                                        # where the provider's key was found (never the key), and whether it works
```

- The provider, style and narrator preset come from `brief.md`; pass the preset `brief.md` names to `--preset`. The default is Gemini (`gemini-3.1-flash-tts-preview`) with the style's preset: `charon` for documentary. If `brief.md` names no preset yet, choose one now by the rules in `references/voice-presets.md`, "Picking the preset", and write it into `brief.md` with its reason. On another provider there are no presets: pass `--provider` and, if the user named one, `--voice`.
- If `keys --test` fails for the chosen provider, say which variable to set and where (`references/voice.md`, "API keys"), and stop. Never ask for the key in the conversation, and never write it to any file, `brief.md` or memory. In a claude.ai cloud environment the network proxy may add the Gemini key itself, so a missing variable is not a failure until the provider refuses.
- If a plate's estimate runs well past its `Dur`, that is fine: `lock` lengthens it. If the whole film runs more than about 15% past the length in `brief.md`, cut words now, before paying for them.

## 3. Confirm the voice

- The preset in `brief.md` is the voice. There is no audition by default: the rules in `references/voice-presets.md` pick the preset, including not reusing the narrator of the last two films.
- Audition only when two or three presets fit the film equally well: `node voice.mjs audition --presets orus-wry,charon-wry` (about a cent per preset). It ranks them by pace, loudness and flags, best first, in `vo/audition/audition.md`. If the plan already ran one, use it.
- The user picks when they are here to pick. In unattended runs, and when the user said to just make it, take the top preset in `audition.md` that has no flags, write the choice and the reason into `brief.md`, re-run `lines` with that `--preset`, attach the audition MP3s to the thread for the record, and carry on.

## 4. Generate, check, retake

```
node voice.mjs generate                   # one clip per plate, cached by exactly what was sent
node voice.mjs check                      # every clip against its line: length, pace, gaps, loudness, and the transcript against the script (voice_check.py)
```

`generate` already retakes a clip that fails a check (twice by default). For what still fails, follow the table in `references/voice.md`, "When a check fails": a new take (`node voice.mjs generate --retake P2`), a rewritten line, or a pause tag. Only the plates whose text or settings changed cost anything. After two rounds, keep the best take, list its flags, and carry on; don't circle.

Claude cannot hear the clips. The checks measure them; say so in the report, and attach one or two clips to the thread so the user can listen when they have time.

## 5. Lock

```
node voice.mjs lock                       # marks vo/voice.json locked; lengthens the plates the voice outgrew in script.md
```

`lock` refuses while a clip fails a check; `--force` locks anyway, and then the report names each flagged clip. After locking, re-read the plate table: the durations are now the recorded ones, and the film's total length is the sum. If it runs well past `brief.md`, say so in the report rather than trimming the voice.

If `sound-designer` already wrote `cues.md` against the estimates, note that its plate times moved; `/doodle-art-animation:doodle-build` re-runs it when `cues.md` is older than `script.md`.

## 6. The animatic

The animatic is the film with placeholders instead of art: each plate's header, transitions, sound and narration play, and the frame shows the line being spoken, the plate's beats as they come, and a timeline with its sentences and marks. It answers "does this pace feel right?" before anything is drawn.

Write `animatic.js` in the working folder: one plate per row of the table, each with only its `header`, `enter` transition, `vo: 'P<n>'` and `beats: [[t or 'mark', 'label'], …]` taken from the script's beats column, and no `draw` (a plate without `draw` is drawn as a placeholder), then a `defineStory({ title, stages, plates: [...] })` and `boot()`. Then:

```
python3 build.py animatic.js animatic.html --animatic
node render.mjs animatic.html animatic.mp4 --animatic
```

Watch for a plate whose line starts before its title has typed, a beat whose mark is missing (`WARNING: narration`), and stretches with nothing said and nothing happening. Fix those in `script.md` (the narration or the beats), regenerate only what changed, and lock again. In unattended runs, attach the animatic MP4 to the thread for the record and carry on.

## 7. Report and hand off

- **Voice:** provider, model, preset (or voice, off Gemini) and why it was picked; the audition winner's line from `audition.md` if one ran.
- **Clips:** one line per plate: its length, pace in words a minute, and any flag `check` still reports.
- **Timing:** the film's length before and after `lock`, and which plates got longer.
- **Cost:** the rough cost `generate` printed.
- **Files:** `vo/voice.json` (locked), `vo/lines.json`, `animatic.mp4`.

Then point the user at `/doodle-art-animation:doodle-build <folder>`, which times each plate to its clip and lands the beats on their marks.
