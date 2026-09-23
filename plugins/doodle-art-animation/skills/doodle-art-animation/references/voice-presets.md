# Narrator presets: which voice for which film

Read this when a film is narrated on Gemini, before running `node voice.mjs lines`. It says which narrator and which
delivery to use, and how to keep Kosta's films from all sounding alike.

A **preset** is one of Gemini's voices plus a **delivery**: the one-line direction sent before the words ("Say warmly,
like a favourite professor…") and the pace that direction really reads at. Kosta listened to all 30 of Gemini's voices
in September 2026 and kept five. The rest were set aside on purpose: most of the male voices sounded alike, and none
of the other female voices appealed. Don't bring one back unless the user names it.

## The five narrators

| Narrator | Gemini voice | Sounds like | Usual delivery | Good for |
|---|---|---|---|---|
| `charon` | Charon | Male, mid-low (about 118 Hz), informative, steady. The house narrator | plain | Most films: mechanisms, papers, anything where the facts lead |
| `orus` | Orus | Male, higher and more animated than Charon (about 150 Hz) | plain | The second male voice, for variety; topics with energy or motion |
| `erinome` | Erinome | Female, clear and bright (about 195 Hz) | plain | Explainers, methods and techniques, step-by-step processes |
| `leda` | Leda | Female, light and youthful (about 200 Hz) | plain | Upbeat films, short-form, a student audience |
| `pulcherrima` | Pulcherrima | Female, low, warm and slightly husky (about 135 Hz), close to the listener | intimate | Personal or human stories, reflective films, endings that should land softly |

The pitch in brackets is the median measured on each voice's plain read. A preset named with the narrator alone
(`charon`) uses its usual delivery; `<narrator>-<delivery>` (`charon-storyteller`) picks another.

## The eight deliveries

| Delivery | What it does | Pace | When to use it |
|---|---|---|---|
| `plain` | Calm and measured, at a natural conversational pace | 120 wpm | The default. Any topic |
| `british` | The same calm read with a British English accent. It lifts the pitch a lot (Charon goes from about 118 to 178 Hz), so it sounds like a new voice | 120 wpm | Variety; a formal or historical subject |
| `professor` | Warm, with a hint of a smile, like a favourite professor explaining something they love | 120 wpm | Explaining how something works, step by step. The explainer style's default |
| `hushed` | Soft and slightly awed, like a nature documentary | 115 wpm | Reveals of the very small or the very large: inside a cell, a lens dive, deep space |
| `wry` | Dry, understated wit | 120 wpm | Myth-busting, a surprising or ironic finding, a light topic |
| `lively` | Bright and brisk, like an enthusiastic science explainer | 160 wpm | Short-form (Reels, Shorts, TikTok). The short-form style's default |
| `storyteller` | Low and intimate, like a late-night radio storyteller | 105 wpm | The history of a discovery, an origin story, a slow reflective film |
| `intimate` | Warm, soft and slightly husky, like talking to one close friend | 110 wpm | Personal stakes (a patient, a researcher's life), a quiet ending |

The pace is words a minute, measured on the five voices reading the same line; one take can differ from another by
about 10%. `voice.mjs` uses the preset's pace for the plate estimates in `lines` and for the pace check, so a slow
delivery gets longer plates instead of a warning. Budget the words to match: a 10-second plate has about 7.5 seconds
of speech after its lead-in and tail, which holds about 13 words at 105 words a minute and 18 at 138.

## Picking the preset

Go down this list and stop at the first rule that decides it.

1. **The user asked for something.** Map their words to a preset:

   | The request says | Preset |
   |---|---|
   | a narrator or preset by name | that one |
   | a woman's voice, a female narrator | `erinome` (or `pulcherrima` when the film is personal or reflective) |
   | a man's voice | `charon`; "a different voice" or "not the usual one": `orus` |
   | British, an English accent | `charon-british` (or the chosen narrator with `-british`) |
   | warm, soft, intimate, husky, cosy | `pulcherrima` |
   | upbeat, energetic, for Reels, Shorts or TikTok | `leda-lively` (or `charon-lively`) |
   | funny, tongue-in-cheek, dry | `charon-wry` |
   | a story, storytelling, calm and slow | `charon-storyteller` |
   | wonder, awe, a nature documentary | `charon-hushed` |
   | like a teacher or a lecture | `erinome-professor` or `charon-professor` |

2. **The film has a clear character.** Match the delivery to the story's arc, not to single plates: a journey into the
   very small is `hushed`, a discovery told as history is `storyteller`, a finding that overturns what people assume is
   `wry`, a story about one person is `pulcherrima`.
3. **Otherwise, the style's preset.** Documentary gets `charon`, explainer `charon-professor`, short-form
   `charon-lively`. `voice.mjs lines` picks this one by itself when no preset or voice is named.
4. **Then vary it.** Kosta wants variety across his films. Before settling on a preset, look at the voice the
   project's recent narrated films used (their `brief.md` or `vo/lines.json`, or project memory). If the last two used
   the same narrator, pick a different narrator that still suits the film, for example `orus` or `erinome` instead of
   another `charon`. Films in one series (parts of the same paper or topic) keep the same preset instead.

Keep one narrator and one delivery for the whole film. A single plate may use another delivery of the same narrator
through `@direction` in its narration block (a quiet `intimate` ending after a `plain` film; copy the direction from
`node voice.mjs presets`), but do it at most once.

Write the choice into `brief.md` as the preset name and a reason of a few words ("orus-wry: myth-busting topic; the
last two films were Charon"), and name it in one line when the film is delivered.

In an unattended run, decide by these rules without an audition. Audition only when two or three presets fit equally
well: `node voice.mjs audition --presets orus-wry,charon-wry` reads the same few lines in each and ranks them by the
automatic checks, for about a cent per preset.

## Using a preset

- `node voice.mjs presets` lists the narrators and deliveries with their directions (`--json` for all 40 presets).
- `node voice.mjs lines script.md --preset orus-wry` writes the preset's voice, direction and pace into
  `vo/lines.json`, with `"preset": "orus-wry"`. Running `lines` again later keeps them, including any edit made to
  `vo/lines.json` by hand; naming another `--preset` replaces them.
- Changing `--style` on a film that is still on its style's preset moves it to the new style's preset (documentary's
  `charon` becomes short-form's `charon-lively`). A preset chosen on purpose stays.
- A plate's own `@voice` or `@direction` line still wins for that plate.
- `vo/voice.json` records the preset, so a finished film says which voice it used.

## Limits

- Presets are Gemini voices. `--preset` refuses another provider, and a film on OpenAI, Grok, ElevenLabs, Inworld or
  Kokoro uses that provider's voice and the style's direction (`references/voice-providers.md`).
- The directions are one line ending in a colon. A longer one is more likely to be read aloud; every preset's
  direction was checked by transcribing its take, and none was.
- The `intimate` and `storyteller` deliveries are slow. On a fact-dense plate they may run long; cut words rather
  than switching to a faster delivery for one plate.
- None of the five voices imitates a real person. `pulcherrima` was chosen as the lowest and huskiest of Gemini's
  female voices when Kosta asked for a warm, close female narrator.
