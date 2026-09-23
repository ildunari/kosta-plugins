# Voice providers for narration

`toolkit/voice.mjs` speaks with seven providers. Pick one with `--provider` on `node voice.mjs lines`, or set
`provider` in `vo/lines.json`. Prices and model names were read in September 2026 and change; check before relying on one.

| Provider | `--provider` | Default model and voice | About per minute | Timing | Written direction |
|---|---|---|---|---|---|
| Gemini (default) | `gemini` | `gemini-3.1-flash-tts-preview`, Charon | $0.03 | from the pauses | yes |
| OpenAI | `openai` | `gpt-4o-mini-tts`, cedar | $0.015 | from the pauses | yes (not on `tts-1`) |
| Grok (xAI) | `xai` | its `/v1/tts` voice, orion | $0.015 | every word, from the provider | no |
| ElevenLabs | `elevenlabs` | `eleven_v3`, Darian | $0.09 ($0.045 on `eleven_flash_v2_5`) | every word, from the provider | no |
| Inworld | `inworld` | `inworld-tts-2`, Dennis | $0.02 ($0.013 on `inworld-tts-2-flash`) | every word, from the provider | yes (not on Flash) |
| Local server | `local` | Kokoro through an OpenAI-style server, af_heart | free | from the pauses | no |
| Kokoro in-process | `kokoro` | Kokoro-82M, af_heart | free | every sentence, exact | no |

"Every word" means the provider reports when each word is spoken, so a beat on a mark like `{count}` lands on the
word itself. "From the pauses" places sentence starts at the pauses in the clip and marks inside a sentence by
syllable count, which can be about 0.3 s off.

## Keys

Each provider's own variable: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `ELEVENLABS_API_KEY`,
`INWORLD_API_KEY` (`DOODLE_TTS_API_KEY` for a local server that wants one). Set it in the shell, or put
`NAME=value` lines in `~/.config/doodle-art-animation/keys.env` and `chmod 600` it. In a claude.ai cloud
environment, add it to the environment's settings. Keys never go in the film folder, the repo or project files, and
the tool never prints one. `node voice.mjs keys --test` sends one free request per provider and says which work.

With no key the request still goes out, because a cloud network proxy may add the key itself; if the provider then
refuses, the tool stops and names the variable to set.

## Provider notes

- **Grok.** Voices for calm narration: orion, lux, perseus (luna and lumen are listed for education); list them
  with `GET https://api.x.ai/v1/tts/voices`. A pause tag
  becomes `[pause]` or `[long-pause]`; Grok's own sound tags (`[breath]`, `[sigh]`, `[laugh]`) pass through; other
  tags are dropped. Speed 0.7 to 1.5.
- **ElevenLabs.** A voice can be a name on your account, its 20-character voice ID, or one of the narrators that
  replace the retiring default voices (Darian, Sawyer, Finley, Eldrin, Elara, Talia), which the tool knows by ID.
  Library voices through the API need a paid plan. `eleven_v3` acts tags like `[curious]` and
  gets `...` for a pause; `eleven_multilingual_v2` is steadier over long passages and takes `<break>` pauses up to
  3 s. The free plan forbids commercial use; published films need at least the Starter plan. Speed 0.7 to 1.2.
- **Inworld.** Voices: Dennis, Ashley, Malcolm, Edward (list them with `GET https://api.inworld.ai/voices/v1/voices`).
  The key from Inworld's portal is already encoded and is sent as it is; an `id:secret` pair is encoded by the tool.
  At most 2,000 characters per plate. `inworld-tts-2` follows the film's direction and plain-English tags like
  `[curious]` (they stay in force until another tag); Flash ignores both. Speed 0.5 to 1.5.
- **OpenAI.** Plain speech endpoint only; realtime models are refused. `cedar` and `marin` sound best; `tts-1` and
  `tts-1-hd` lack ballad, verse, marin and cedar. If the default snapshot sounds muffled or slow, set the model to
  `gpt-4o-mini-tts-2025-03-20`.

## A local voice on a Mac

Any server that copies OpenAI's `POST /v1/audio/speech` works with `--provider local`. The commands below are the
usual ones; if one fails, the project's README has the current form.

- **Kokoro-FastAPI** (Apache-2.0 model, fine for commercial use). With Docker:
  `docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest`. Without Docker, clone
  `github.com/remsky/Kokoro-FastAPI` and run its `start-cpu.sh` (or `start-gpu_mac.sh` on Apple silicon). It serves
  `http://localhost:8880/v1`, the tool's default, so nothing else needs setting.
- **mlx-audio** (Apple silicon): `pip install mlx-audio`, then `mlx_audio.server --port 8880`. It also serves more
  expressive models such as Qwen3-TTS and Chatterbox; name one with `--model`.
- Another address: set `DOODLE_TTS_BASE_URL`, for example `http://localhost:9000/v1`.
- Check it: `node voice.mjs keys --test` should say "Local server: works".

Voices to audition on Kokoro: af_heart, bf_emma, am_michael, bm_george. Avoid `openedai-speech` (archived) and models
whose licences forbid commercial use (Fish Audio S2 Pro, Higgs Audio v3, Voxtral TTS).
