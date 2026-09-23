# Voice: narration for a doodle film

Read this when a film is narrated: at intake, when writing the script, and in phase 2b (the voice phase, between the plan and the build). It covers when to narrate, how to write for the ear, how to pace it, and how to make and check the voice with `toolkit/voice.mjs`. How the voice sits in the mix is in `references/sound.md`, "Narration"; how the engine plays clips and lands beats on words (`vo`, `mark`, `markAt`) is in `references/api.md`, "Narration".

## What narration does, and the order it is made in

A narrator is a voice reading a script over the film: a voice-over. It carries the story in the viewer's ear while the picture shows what the words describe, so the on-screen text can shrink to labels and numbers.

The order is **words, then voice, then picture**:

1. **Words.** The narration is written in `script.md` with the rest of the plan.
2. **Voice.** A text-to-speech service (a model that reads text aloud) turns each plate's narration into a clip. Each clip is measured and checked, and its timing is locked.
3. **Picture.** The plates are drawn to the locked timing.

The reason is that code can stretch to fit any timing and recorded speech cannot. Changing a plate from 10 to 12.4 seconds costs nothing, but speeding a voice up or slowing it down by more than about 5% sounds artificial. So the flexible thing (the picture) follows the fixed thing (the voice). Sound effects still come after the picture, because they follow what is seen: the press crunches when the platen lands, not when the narrator says "press".

## When a film is narrated

Narration is **off by default**. A film is narrated only when the request asks for narration or a voice-over, or the intake answer says so (`references/intake.md`). Otherwise the film tells its story in on-screen text, as described in `references/writing.md`.

Kosta's films run unattended, so never stop to ask whether to narrate. If the request is silent on it, the answer is no narration; if it asks for a voice-over without saying which kind, use the documentary style below, with the narrator preset chosen as `references/voice-presets.md` describes.

## Styles

The style is chosen at intake and recorded in `brief.md`. It sets the writing rules and, when no narrator preset is chosen on purpose, the preset the film gets. The script has the same shape in every style.

| Style | Sounds like | Default preset (pace) | Writing rules |
|---|---|---|---|
| **Documentary** (default) | A curious, unhurried narrator, like a nature documentary | `charon` (120 words a minute) | Sentences up to about 20 words, one idea each. Pauses before reveals |
| Explainer | Friendly and clear | `charon-professor` (120) | The same, with fewer long pauses |
| Short-form | Energetic, for Reels, Shorts or TikTok | `charon-lively` (160) | A hook in the first 2–3 seconds. Sentences under about 12 words. Few pauses |
| Two voices | A host and an expert talking, like a podcast | none | **Planned, not built.** Don't offer it as available |

The pace a film is written and checked against is its preset's (`references/voice-presets.md` lists all of them, from 105 words a minute for `storyteller` to 160 for `lively`). On a provider other than Gemini there are no presets, and the style sets the pace instead: 138 words a minute for documentary, 152 for explainer, 160 for short-form.

The engine renders 16:9 landscape only, so a short-form narration still goes on a landscape film.

## Writing the narration

Write the narration first as one continuous piece, then split it across the plates. Each plate's part goes in the `## Narration` section of `script.md`; the format is in `references/writing.md`, "Narration".

- **Read it aloud first.** The narration should work as audio on its own, like a short podcast segment, before any picture is attached. If a line only makes sense with the picture, the viewer who glances away is lost.
- **Don't put the narrator's sentence on screen.** Showing the same sentence the narrator is saying slows people down, because they read and listen at once. Short labels, numbers and unfamiliar technical terms on screen are fine and help. Headers, stats and callouts already work this way; the narration should say something around them, not read them out.
- **Say numbers the way a person would, and show them exactly.** The narrator says "about four hundred and thirty billion" while the stat shows `≈ 430 billion`. Both come from `facts.md` and must agree.
- **One idea per sentence, subject first.** Short sentences give the picture clean moments to land on.
- **The title is not read aloud.** The header types on by itself, and the first line starts once the title has finished typing.
- **Keep a pronunciation list.** Every technical term the narrator says gets a "say it as" spelling in a `## Pronunciation` section (`- meloxicam: mel-OX-i-cam`). The voice is sent the respelling; the script and the screen keep the real word.
- **Marks go in braces.** `{count}` before a word names the moment that word is spoken, so a beat can land on it (`stat ≈430 billion per mg at {count}`). Marks are removed before the text is sent to the voice.
- **Delivery tags go in square brackets:** `[short pause]` (0.25 s), `[medium pause]` (0.5 s), `[long pause]` (1 s), `[curious]`, `[serious]`. Gemini acts them; the other providers drop them, and Kokoro turns a pause tag between sentences into that much silence.
- **A plate with nothing to say** gets a block reading `(none)`, so it is clear the silence is meant.

The `script-reviewer` agent checks each plate's word count against its length at the style's rate, that the narration reads naturally, that it does not repeat on-screen sentences, that every mark a beat names exists, that numbers agree with `facts.md`, and that technical terms are in the pronunciation list.

## Pacing

These are conventions, not measured rules; the animatic (below) is where they get tuned.

- **Film budget.** Narration fills about 70–80% of the running time; the rest is transitions, reveals and holds. At 120 words a minute (most presets) that is about 85–95 words for a 60-second film and 250–290 for a 3-minute film; scale it to the film's own pace.
- **Plate estimate.** A plate's length is roughly: 1–1.5 s before the first line (the transition landing and the title typing) + words ÷ rate + planned pauses + a tail of about 0.8 s before the next seam. `node voice.mjs lines script.md` prints this estimate against each plate's `Dur`.
- **Silence before reveals.** Leave 0.75–1.5 s of silence before a reveal or the climax, so it lands. The sound design already asks for near-silence there.
- **Most seams are unnarrated.** The transition's own sound carries the cut, and the narrator starts again once the new plate has settled.
- **Crossing a seam on purpose.** A sentence can run on over a seam into the next plate when it connects the two (an L-cut, from the shape the sound makes on an editor's timeline): "…until it reaches the blood" as the lens dives in. Or the next plate's first word can start just before its picture arrives (a J-cut). Write either one into the seam list, never leave it to chance; the engine settings are in `references/api.md`, "Narration".
- **Hold a new visual for at least 1 s after the line that introduces it,** so the viewer has time to look.

## Phase 2b: making the voice

Run these in the film folder, with `voice.mjs` from the copied toolkit. Everything is read from and written to `./vo/`.

1. **Lines.** `node toolkit/voice.mjs lines script.md --preset charon` reads the `## Narration` and `## Pronunciation` sections into `vo/lines.json` and prints each plate's estimated spoken length against its `Dur`, at the preset's pace. No audio, no cost. Name the preset chosen for the film (`references/voice-presets.md`); without `--preset`, a Gemini film gets its style's preset. Add `--style explainer` (or `short-form`) when the brief asks for it, and `--facts facts.md` when the pronunciation list lives there. `vo/lines.json` can be edited freely afterwards (provider, voice, direction, speed, lead and tail), and a later `lines` run keeps those edits.
2. **Audition, only when it is a close call.** When two or three presets fit the film equally well, `node toolkit/voice.mjs audition --presets orus-wry,charon-wry` reads the same few lines in each and writes `vo/audition/<preset>.mp3` and `vo/audition/audition.md`: pace, loudness and flags per preset, best first. Otherwise skip it; the rules in `references/voice-presets.md` decide.
3. **Generate.** `node toolkit/voice.mjs generate` makes one clip per plate (`vo/clips/<fingerprint>.wav`) and writes `vo/voice.json`. A clip that fails a check is retaken automatically up to twice (`--retakes N` changes that).
4. **Check.** `node toolkit/voice.mjs check` measures every clip again against `vo/lines.json` and flags problems. What to do with a flag is in the table below.
5. **Lock.** `node toolkit/voice.mjs lock` marks `vo/voice.json` locked and lengthens every plate in `script.md` whose narration outgrew its `Dur`. It refuses while a clip fails; `--force` locks anyway (say so in the delivery).
6. **Animatic.** `python3 toolkit/build.py story.js film.html --animatic`, or `node toolkit/render.mjs film.html --animatic`, replaces each plate's drawing with a placeholder: the header, the line being spoken, the beats as they come and a timeline, over the real voice and the beds. It shows whether the pace feels right before any art is drawn. In an unattended run, attach it for the record and carry on.

Clips are cached by a fingerprint of exactly what was sent (text, provider, model, voice, direction, speed), so after editing one plate's narration, `generate` pays only for that plate, and every other plate keeps its take and its sound.

`node toolkit/voice.mjs keys` says where each provider's key was found, never the key itself; `keys --test` sends one free request per provider to see whether the key works. Run it first when a request fails.

## Providers and voices

| Provider | Model | Cost | Notes |
|---|---|---|---|
| **gemini** (default) | `gemini-3.1-flash-tts-preview` | about 3 cents a minute | Acts delivery tags and plain-English directions. No speed setting. Returns no word timing, so marks inside a sentence are estimated (off by up to about 0.3 s) |
| openai | `gpt-4o-mini-tts` | about 1.5 cents a minute | Voices `cedar` (default), `marin`, `ash` |
| xai (Grok) | Grok's `/v1/tts`, voice `orion` | about 1.5 cents a minute | Reports when each word is spoken, so marks are exact. No written direction; keeps its own sound tags |
| elevenlabs | `eleven_v3`, voice `Darian` | about 9 cents a minute | Exact word timing. No written direction; acts `[curious]`-style tags |
| inworld | `inworld-tts-2`, voice `Dennis` | about 2 cents a minute | Exact word timing, takes a written direction (`inworld-tts-2-flash` is cheaper and ignores directions) |
| local | any OpenAI-style speech server | free | For a server such as Kokoro-FastAPI at `DOODLE_TTS_BASE_URL` (default `http://localhost:8880/v1`) |
| kokoro | Kokoro-82M, run inside Python | free | CPU only, no key. The way to test the whole pipeline before any key exists |
| fake | synthetic tones | free | For tests only: no network, no voice |

Each provider's voices, tags and quirks are in `references/voice-providers.md`.

**On Gemini, choose the voice with a narrator preset** (`references/voice-presets.md`). A preset is one of the five voices Kosta chose by ear (Charon, Orus, Erinome, Leda, Pulcherrima) plus a delivery: the one-line direction sent before the words and the pace it really reads at. That file says which preset suits which film, and how to vary the narrator from one film to the next. `node voice.mjs presets` lists them all. On the other providers, use that provider's default voice (or one the user named) with the style's direction.

## API keys

- **Where the tool looks,** in order: the provider's environment variable (`GEMINI_API_KEY` or `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `DOODLE_TTS_API_KEY` for a local server), then the same name prefixed with `CLAUDE_PLUGIN_OPTION_` (a plugin setting), then `~/.config/doodle-art-animation/keys.env` (one `NAME=value` per line, `chmod 600`).
- **In claude.ai cloud threads** the network proxy adds the Gemini key to the request itself, so no variable is needed. The tool sends the request without a key and only asks for one if Gemini refuses it.
- **Never** write a key into the repo, the project files, memory or `brief.md`, and never print one in a thread. The tool reports only where it found a key, and hides anything that looks like one in its output. Non-secret choices (provider, voice, style) go in `brief.md`.

## Choosing the voice in an unattended run

Nothing in phase 2b waits for Kosta.

- **Pick the preset by the rules** in `references/voice-presets.md`, "Picking the preset", without an audition, and write it into `brief.md` with a reason of a few words.
- **When two or three presets fit equally well,** audition just those (`--presets`), take the top one in `audition.md` that has no flags, and attach the audition clips to the thread so the choice can be heard later.
- Say in the delivery which preset was used and why, in one line.

## When a check fails

`generate` retakes a failing clip twice by itself. Anything still flagged after that is yours:

| Flag | What it usually means | What to do |
|---|---|---|
| Missing or extra words, or a clip much shorter than expected | The voice skipped, repeated or garbled part of the line | Retake it: `node toolkit/voice.mjs generate --retake P2`. If it keeps happening, rewrite the line (shorter sentences, a respelling for the word it trips on) |
| Pace more than 15% off the target | The voice read too fast or too slowly for the style | Adjust the text (cut or add words) or set `@speed` for that plate (not on Gemini, which has no speed setting; change the direction instead) |
| An unplanned gap over about 1.2 s | A pause the script does not ask for | Retake |
| A take much louder or quieter than the others before levelling | Often a different-sounding take | Retake |
| Far longer than expected ("the direction may have been read aloud") | Gemini read its direction as part of the line | Retake; if it repeats, shorten the direction |
| Still failing after retakes | | Use the best take, lock with `--force`, and name the plate and the flag in the delivery |

## Cost

Small enough not to ration. An audition costs about a cent per preset on Gemini. A full 3-minute narration costs 5–30 cents depending on the provider and the retakes (Gemini is about 3 cents a minute). The tool prints what each run's new clips cost; cached clips cost nothing.
