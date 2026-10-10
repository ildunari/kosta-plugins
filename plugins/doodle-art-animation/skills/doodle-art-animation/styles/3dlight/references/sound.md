# 3DLight: sound

The sound palette of 3DLight: clean, synthesized and calm, like a product film. Every sound is computed when the film renders (Web Audio, offline, seeded), so there are no audio files and a re-render matches. Doodle Draw is acoustic and hand-made; 3DLight should never sound like it.

## Layers

1. **The bed** (`sound.music`): a warm pad chord, a soft sine bass and an arpeggio on felt `keys` or glass `mallet`. One chord per beat, two bars per beat, so a 4.5 s beat is 106.7 BPM. `arpLevel` per beat lowers the arpeggio where the effects are busy.
2. **The rhythm** (`sound.rhythm`): a soft kick on 1 and 3, a wooden knock on 2 and 4, a shaker on the off-beats. `level` per beat; the booth loops play the first beat at 0.7 and the last at 0.75.
3. **Transitions**: `U.transitions(E, o)` in `cues` puts a soft breath of air on every dissolve.
4. **Effects on events**: small, precise sounds on what the art does (a capsule lands, a strand touches a particle, a label appears). From the engine's instruments (`E.pop`, `E.tick`, `E.thump`, `E.glide`, `E.swell`, `E.shimmer`, `E.chime` ...) and from the shared library.
5. **The card**: a chime (`E.chime`) or a library stinger in the music's key when the card appears.

## Library effects

The plugin's shared library (`../../sound-library/`, catalog in `catalog.md`) is inlined into every film from `toolkit/sfxlib.js`. Two ways to call an effect:

```js
sound: {
  fx: [{ at: 12.3, fx: 'siliconeTap', g: 0.8, pan: -0.2, pitch: 2, size: 0.5, seed: 4 }], // screen seconds
  cues(E, o, ev, U) { E.fx('siliconeTap', U.S(16.4), { g: 0.6, pan: 0.3 }); },          // art time via U.S
}
```

- `at` is screen seconds from the film start; `art:` takes art seconds instead.
- `g` is relative gain: 1 peaks near -15 dBFS before the mix, 0.5 is 6 dB quieter. The engine's own instruments take absolute gains instead.
- `seed`: without one, the cue's order gives it, so a re-render is the same. Give two plays of one effect different seeds (the default does) so they never sound identical.
- `pitch` in semitones; `key` (the music's tonic as MIDI) for tonal effects; any other option in the catalog's Options column.
- `send` (0..1) adds room reverb.
- Effects play on the effects bus, so they are mixed like the engine's effects.

Families that fit 3DLight: **transition** (soft swishes and air), **impact** (soft landings, a lock, a reveal), **ui** (labels, chips, checks), **digital** (scans, readouts, data moving), **organic** (cells, binding, coating), **liquid** (drops, micro-bubbles, flow), **material** (struck glass and ceramic: lab objects), **tonal** (stingers and accents in the music's key), **texture** (air or shimmer under one beat). Prefer effects whose meta lists `3dlight` (`SFXLIB.list({ style: '3dlight' })`, or the catalog's "For 3DLight" column); pass `style: '3dlight'` to effects with a flavour per style. Avoid pens, paper, pencils, wood and other hand-made foley.

## Mix and levels

The engine fixes the mix:

- music bus: low shelf -4 dB at 120 Hz (booth screens have small speakers);
- effects bus: low shelf -6 dB at 140 Hz and a gentle compressor, trimmed so effects sit about 4 dB under the music overall;
- a small soft room (2.4 s), a 32 Hz high-pass, a glue compressor and a limiter on the master.

Targets, which `render_sound.mjs` applies and prints:

| What | Target |
|---|---|
| Integrated loudness, the film (or loop) played three times | -16 LUFS, within 1 LU |
| True peak | at most -1.5 dBTP (the gain stops there, so a film can land a little under -16; the biocoating loop is -16.9) |
| Loudness range | small, about 2 LU: a calm film |
| Each effect against the music around it (`analyze_stems.py`) | median between about -6 dB (not heard on booth speakers) and +10 dB (jumps out) |

A loop's sound renders twice and keeps the second pass, so reverb tails and held notes from the end flow into the start. The long file (`<id>_sound_long.mp4`) repeats the audio sample-exactly, with no gap.

## Rules

- Different kinds of event get different sounds; no effect repeats identically (vary pitch, pan and seed).
- The music follows the beats: one chord per beat. In a loop, the last chord leads back to the first; in a film that plays once, the card resolves home.
- Keep effects sparse in the hold of each beat; the sound should breathe with the picture.
- Tonal effects and chimes use the music's key.
- No sound adds a claim: no alarm for a result that is not alarming, no fanfare for draft data.
- A silent film (booth screens often play muted) skips the sound phase; the film still renders and loops without it.

## `cues.md` (phase 3)

The `sound-designer` agent writes it; the cues then go into `story.sound`.

```
# Sound: <title>
Key: A minor. Instrument: mallet. Tempo: 106.7 BPM (two bars per 4.5 s beat).
Chords (one per beat): Am9 Fmaj7 Cmaj9 G6 ... (MIDI in the story)
Rhythm levels: 0.7 1 1 ... 0.75. Arpeggio levels: 0.7 0.8 0.6 ...

| Beat | Art t | Event (from the script's motion) | Sound | Level | Pan |
|---|---|---|---|---|---|
| 1 | 0.0-2.6 | capsule falls | E.whoosh 2600 to 500 Hz | 0.03 | 0.1 to 0.3 |
| 1 | 2.6 | capsule lands | E.thump f0 130 | 0.11 | 0.3 |
| 2 | 8.4 | enzymes cut | library: <name> | g 0.7 | 0.05 |
| 10 | 54.3 | card | E.chime A5 | 0.45 | -0.3 |
```

Art times count from the film start (beat n starts at `(n - 1) x 6`). In the story, an art time x becomes `U.S(x)` inside `cues`, or `{ art: x }` in `sound.fx`.

## Checks

- `node sound/render_sound.mjs film.html`: the loudness line (LUFS, true peak, LRA), `<id>_spectrum.png` and `<id>_wave.png`.
- `node sound/stems.mjs film.html` then `python3 sound/analyze_stems.py out_sound/<id>`: each event's effect against the music.
- Listen to the loop point in `<id>_sound_long.mp4`.
- Two renders of the same film differ by at most a couple of 16-bit steps (Chromium's reverb is not bit-exact; about -84 dBFS, inaudible). Loudness is identical.
