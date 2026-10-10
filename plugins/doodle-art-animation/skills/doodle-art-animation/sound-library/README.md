# Sound library

A catalog of synthesized sound effects and instrument voices that every style can use. Each one is a small
Web Audio recipe with notes on what it sounds like, which on-screen moments it fits and which styles it suits.
There are no audio files: every sound is computed when the film renders, so it varies a little each time it plays
and a re-render of the same film is identical.

`catalog.md` lists every effect by family, with its description, the moments it fits, its tags, its tone, its options
and its length. Read it when planning a film's sound, and pick from it before inventing a new effect.

## Files

| File | What it is |
|---|---|
| `sfxlib.js` | The library: the helpers (seeded random numbers, envelopes, filters, noise, small reverb, sample-level synthesis) and every effect. Sets `window.SFXLIB`. |
| `catalog.md` | The generated table of every effect. Never edit it by hand; run `node catalog.mjs`. |
| `catalog.mjs` | Writes `catalog.md` from the effects' meta. `--check` fails when it is out of date; `--page out.html` also writes the listening page. |
| `listen.template.html` | The listening page: tap any effect to hear three variations, filter by style, family and tone, search by moment ("binding", "label"), or tap a tag to list every effect that has it. |
| `sfxlib_test.mjs` | Renders every effect offline in Chromium and checks it (below). `--wav dir` writes each one as a WAV. |
| `research/` | The four research catalogs the effects were built from, with their sources: motion and interface, biology and materials, synthesis techniques, music beds. |

## The families

| Family | id | For |
|---|---|---|
| Transitions and motion | `transition` | moves between scenes, camera moves, things flying past |
| Impacts and arrivals | `impact` | something lands, locks, presses or is revealed |
| Interface | `ui` | labels, chips, checks, toggles, highlights |
| Data and digital | `digital` | scans, readouts, data moving, processing |
| Organic and biological | `organic` | cells, membranes, binding, cutting, engulfing |
| Liquid and micro-fluid | `liquid` | drops, micro-bubbles, flow in channels and vessels |
| Materials | `material` | struck glass, ceramic, metal, wood, plastic, rubber, paper |
| Tonal accents and stingers | `tonal` | short musical figures and single notes in the music's key |
| Textures and ambiences | `texture` | beds, pads, drones and long sounds under a scene |
| Rhythm and pulse | `rhythm` | single percussive hits for a bed or a tempo-locked cue |

## Finding an effect

Every effect carries tags, so a search by moment or by sound is one call:

```js
SFXLIB.list({ tag: 'count' })                     // every effect that fits a counter or a tally
SFXLIB.list({ tag: 'serious' }).filter(n => SFXLIB.meta[n].tags.includes('bind'))   // serious binding sounds
```

There are three small fixed vocabularies, listed in `sfxlib.js` as `SFXLIB.uses`, `SFXLIB.feels` and `SFXLIB.tones`:

| Kind | How many per effect | The tags |
|---|---|---|
| Use: the moment it serves | 2 to 4 | arrive, leave, move, transition, reveal, number, count, click, scan, bind, split, form, dissolve, flow, pulse, bed, ending, alert, swell, impact |
| Feel: how it sounds | 2 to 5 | soft, airy, warm, dark, bright, glassy, metallic, woody, wet, dry, sub, crisp, tonal, noisy, clean, cold, digital, organic, natural, clinical, premium, matte |
| Tone | 0 or 1 | serious, playful |

**Tone.** `serious` effects are restrained enough for a professional piece (an investor or expo booth, a medical or
pharma film); `playful` ones are cartoon or toy-like (bloops, bounces, wobbles, pops, pentatonic runs, chiptune). The
rest depend on how they are used. Tone was rated from each effect's synthesis code by three independent raters on a
1 to 5 scale: serious means a median of 4 or more with no rating under 3, playful a median of 2 or less. The `TONE`
list at the end of `sfxlib.js` sets it, so tone never has to be edited inside an effect's meta. A 3DLight film
with `sound.serious: true` (the default for new stories) can only call serious effects.

The `events` field is the long version of the use tags: the exact on-screen moments, in words, that the listening
page's search box reads. On the listening page, tapping a tag under a sound lists every sound with that tag, and the
Serious only switch hides the rest.

## Calling an effect

```js
SFXLIB.fx.dockSeat(ac, out, t, { g: 0.8, pan: -0.2, seed: 3 });
```

`ac` is the (Offline)AudioContext, `out` the node to connect to (a style's effects bus, never `ac.destination`
directly in a film), `t` the start time in seconds. Options every effect takes:

- `g`: level relative to the library's standard. `g: 1` peaks near -15 dBFS per channel before the master bus;
  `0.5` is 6 dB quieter. This differs from Doodle Draw's own effects, whose `g` is an absolute gain.
- `pan`: -1 to 1. `seed`: a fixed integer repeats one exact sound; without it the sound comes from the start time
  and the name, so two plays differ and a re-render is identical.
- `pitch`: semitones, for effects with a pitch. `key`: the music's tonic as a MIDI note (default 69, A4), for effects
  that play notes. `note`/`notes`: an exact MIDI note or chord, for instrument voices. `dur`: the length, for effects
  that have one. `style`: `'3dlight'` or `'doodle-draw'` for effects with a flavour per style.

Some effects take more (`size`, `dir`, `bpm`, `n`, `curve`, `kind`); the Options column of `catalog.md` lists every
option each effect reads. `SFXLIB.meta[name]` holds the meta, `SFXLIB.list({ family, style, tag })` filters names.

### In each style

- **Doodle Draw.** `build.py` inlines `toolkit/sfxlib.js` before the engine, and every library effect becomes a cue
  name: `cues: [[1.2, 'dockSeat', { g: 0.8 }]]`. An engine sound with the same name keeps the engine's version. The
  engine trims library effects 10 dB so that `g: 1` matches its own cues. Library effects count as varied sounds for
  `cue_check.mjs`. The style's sound guide (`styles/doodle-draw/references/sound.md`)
  says which families fit its hand-made palette.
- **3DLight.** Its sound engine calls library effects from cues, `{ at: 12.3, fx: 'siliconeTap', g: 0.8 }`, and its
  music bed plays the library's instrument voices note by note. `styles/3dlight/references/sound.md` is its palette.
- **A new style** copies `sfxlib.js` into its toolkit, inlines it before its sound engine and writes its palette in
  its own `references/sound.md` (see `styles/README.md`).

Each style's toolkit carries its own copy of `sfxlib.js`, because a film folder is a copy of the toolkit. The copies
must match this file: after changing the library, run `node sync.mjs` here, which copies it into every style's
toolkit (`sfxlib_test.mjs` fails while a copy differs).

## Adding an effect

1. Pick its family and check `catalog.md` for something close; a variation of an existing effect is often better as
   an option of that effect.
2. Add a `define(name, meta, fn)` call in `sfxlib.js` just above the `// __EFFECTS__` line, in the section it fits. The meta needs `family`, `styles`,
   `tags`, `dur` (the longest it lasts at default options), `desc` (what it sounds like, one sentence), `events` (the
   on-screen moments it fits, separated by `;`) and `from` (where the idea came from). `tags` takes 2 to 5 feel tags
   and 2 to 4 use tags from the vocabularies above; a new tag word goes into `lib.uses` or `lib.feels` first. Write
   `desc` from what the code actually makes (the pitch, the material, the shape over time), not from the name, and
   name an option in backticks (`` `dur` sets the length ``) and the start as "the cue time".
   If it is clearly serious or playful, add its name to the `TONE` list at the end of the file.
3. Build it from the helpers in `H`: `H.r()` is the seeded random number (never `Math.random`, `Date` or
   `performance.now`), `H.buffer` writes samples, `H.DSP` has bursts, modal resonators, chirps, Karplus-Strong strings,
   FM and grains. Vary every play a little (pitch about 2 %, level about 1.5 dB) so repeats never sound identical.
4. Set its level so the default peak sits near -15 dBFS (`H.buffer` with `level: 0.25` at centre pan does this).
5. Run `node sfxlib_test.mjs --only yourName --wav /tmp/x`, look at a spectrogram of the WAV
   (`ffmpeg -i x.wav -lavfi showspectrumpic=s=800x300 x.png`), then `node catalog.mjs` and `node sync.mjs`.

## What the test checks

`node sfxlib_test.mjs` renders every effect three times (seed 1, seed 1 again, seed 2) and fails an effect that is
silent or produces non-finite samples, peaks outside -22 to -5 dBFS, differs between two renders with the same seed,
sounds identical with a different seed (unless its meta says `fixed: true`), rings on past its `dur` plus 1.5 s, has
incomplete meta, has a tag outside the vocabularies or the wrong number of use or feel tags, or takes the name of a
Doodle Draw engine sound. It also fails when a style's toolkit copy of
`sfxlib.js` differs from this one.
