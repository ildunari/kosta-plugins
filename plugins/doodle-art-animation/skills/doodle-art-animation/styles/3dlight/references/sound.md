# 3DLight: sound

The sound palette of 3DLight: clean, synthesized and calm, like a product film. Every sound is computed when the film renders (Web Audio, offline, seeded), so there are no audio files and a re-render matches. Doodle Draw is acoustic and hand-made; 3DLight should never sound like it.

## Layers

1. **The bed** (`sound.music`): one of three beds made of the shared library's instrument voices. Pick by the film's feel:

   | Bed | What plays | Fits |
   |---|---|---|
   | `glassPulse` (the default) | a glass pad, a soft sub pulse, tuned clicks, a gated arpeggio that grows and thins, a faint hat and a dotted echo at the peak | science explainers, booth loops, product films |
   | `slowAir` | a low drone, a slowly morphing pad, one singing glass note per beat, glass plucks drifting in and out of phase, a quiet tick | calm documentary pace, long reading holds |
   | `quietEngine` | soft saw chords on a 3-3-2 rhythm, a rolling octave bass, a three-note square motif, offbeat hats | a launch or pitch, a confident pace |

   Every bed plays a five-chord cycle, two beats per chord, two bars per beat (106.7 BPM with 4.5 s beats). Its layers follow one ten-step shape over the film's beats: sparse at the start, fullest a little past the middle, thin again at the end, so the bed has a shape like a short piece of music, and a loop's last beat matches its first. `key` moves it all (`{ bed: 'glassPulse', key: 57 }` is in A); `level` trims it.
2. **Transitions**: one soft library transition on each dissolve, starting about 0.25 s before the beat change and clearly quieter than the event cues (`g` about 0.4 to 0.6). Vary them over the film: `breathBloom`, `sheetSlide`, `tunedSweep`, `easeSettle`, `lensRack`, `tonalSwoosh`.
3. **Effects on events**: small, precise library effects on what the art does (a capsule lands, a strand touches a particle, a label appears), called with `E.fx` in `cues`.
4. **The card**: a tonal stinger in the bed's key when the card appears (`jewelResolve`, `rissetBell`, `fiveNoteMnemonic`, `loopSeamOpen` in a loop).

The bed is the music; nothing else in the film should be a melody. The sound before v0.19 (a pad, sine bass and felt `keys` or glass `mallet` arpeggio with a soft kick, knock and shaker, and the engine's own instruments such as `E.pop` and `E.whoosh`) still plays for a story whose `music` has `chords`, as the `'classic'` bed. It sounds close to Doodle Draw, so new films don't use it.

## Library effects

The plugin's shared library (`../../sound-library/`, catalog in `catalog.md`, a listening page from `catalog.mjs --page`) is inlined into every film from `toolkit/sfxlib.js`. Two ways to call an effect:

```js
sound: {
  music: { bed: 'glassPulse', key: 57 },
  fx: [{ at: 12.3, fx: 'siliconeTap', g: 0.8, pan: -0.2, pitch: 2, size: 0.5, seed: 4 }], // screen seconds
  cues(E, o, ev, U) { E.fx('dockSeat', U.S(16.4), { g: 0.9, pan: 0.3 }); },             // art time via U.S
}
```

- `at` is screen seconds from the film start; `art:` takes art seconds instead.
- `g` is relative gain: 1 peaks near -15 dBFS before the mix, 0.5 is 6 dB quieter.
- `seed`: without one, the cue's order gives it, so a re-render is the same and two plays of one effect differ.
- `pitch` in semitones; `key` (the bed's key as MIDI) for tonal effects, so they are in tune; any other option in the catalog's Options column.
- `send` (0..1) adds room reverb.
- Effects play on the effects bus.

Which families fit which moments:

| Family | For |
|---|---|
| `organic` | binding, docking, cutting, coating, engulfing, a membrane flexing (`dockSeat`, `bondLock`, `enzymeSnip`, `engulf`, `membraneFlex`) |
| `liquid` | diffusion, mucus, gels, drops, flow in channels (`diffuseDrift`, `mucusStretch`, `gelWobble`, `capillaryFlow`, `dropMerge`) |
| `material` | lab objects: struck glass and ceramic, a capsule opening, pressing, melting, crystals (`ceramicTap`, `capsuleOpen`, `crystalGrow`, `meltDull`) |
| `impact` | something lands, locks or is revealed (`subSigh`, `haloHit`, `bounceSettle`, `layerStack`) |
| `ui` | labels, chips, checks, a line drawing on (`siliconeTap`, `confirmPair`, `softLatch`, `staggerCascade`, `lineTrace`) |
| `digital` | a number landing, a readout, a curve drawing, a scan (`releaseCurve`, `densityPulse`, `scanPass`, `denoiseResolve`) |
| `tonal` | reveals and the card, in the bed's key |
| `transition` | dissolves and camera moves |
| `texture` | a long sound under one beat, at most one at a time |

Use effects whose meta lists `3dlight` (`SFXLIB.list({ style: '3dlight' })`, the catalog's styles column, or the listening page's style switch); pass `style: '3dlight'` to effects with a flavour per style. Avoid pens, paper, pencils, wood and other hand-made foley. The `rhythm` family and the instrument voices in `tonal` and `texture` (`glassPad`, `subPulse`, `gatedArp` ...) are what the beds are made of; a cue can use one, but not as a second melody.

## Mix and levels

The engine fixes the mix:

- music bus: low shelf -4 dB at 120 Hz (booth screens have small speakers);
- library effects (`E.fx`, `sound.fx`): a bus of their own with a low shelf -6 dB at 140 Hz and a gentle compressor. Effects enter it 12 dB down, so most stay under the compressor's threshold and `g` behaves as the library says (0.5 is 6 dB quieter), and leave it 6 dB up, so a cue at `g: 1` sits about level with the default bed around it;
- the classic instruments (`E.pop`, `E.thump` ...) keep their own effects bus and older mix;
- a small soft room (2.4 s), a 32 Hz high-pass, a glue compressor and a soft limiter on the master.

Starting levels: event cues `g` 0.7 to 1.2, dissolves 0.3 to 0.6, the card 0.4 to 0.8 (the bed is quiet at the ends of its arc, so the card needs little). Then measure and adjust.

Targets, which `render_sound.mjs` applies and prints:

| What | Target |
|---|---|
| Integrated loudness, the film (or loop) played three times | -16 LUFS, within 1 LU |
| True peak | at most -1.5 dBTP. Sharp effect onsets over a calm bed can stop a plain gain short of -16; `render_sound` then runs a look-ahead limiter on the loudest onsets (at most 6 dB, printed as "limiter up to N dB") |
| Loudness range | 2 to 5 LU: the beds build and thin on purpose; a booth loop should stay near the low end |
| Each effect against the music around it (`analyze_stems.py`) | median between -4 and +3 dB, 90th percentile at most +8 dB; no important event under about -15 dB (a label fading in may be silent) |

A loop's sound renders twice and keeps the second pass, so reverb tails and held notes from the end flow into the start. The long file (`<id>_sound_long.mp4`) repeats the audio sample-exactly, with no gap.

## Rules

- Different kinds of event get different sounds; no effect repeats identically (vary pitch, pan and seed).
- The music follows the beats: the beds change chord every two beats, on a beat change. In a loop, the last chord leads back to the first.
- Keep effects sparse in the hold of each beat; the sound should breathe with the picture.
- Tonal effects use the bed's key (`key: 57` when the bed is `{ bed: 'glassPulse', key: 57 }`).
- No effect name carries more than about a quarter of a film's cues.
- No sound adds a claim: no alarm for a result that is not alarming, no fanfare for draft data.
- A silent film (booth screens often play muted) skips the sound phase; the film still renders and loops without it.

## `cues.md` (phase 3)

The `sound-designer` agent writes it; the cues then go into `story.sound`.

```
# Sound: <title>
Bed: glassPulse, key 57 (A). Tempo: 106.7 BPM (two bars per 4.5 s beat). Level 1.

| Beat | Art t | Event (from the script's motion) | Sound | g | Pan |
|---|---|---|---|---|---|
| 1 | 2.6 | capsule lands | bounceSettle | 0.9 | 0.3 |
| 1-2 | 5.7 | dissolve | breathBloom | 0.5 | 0 |
| 2 | 8.4 | enzymes cut | enzymeSnip | 0.8 | 0.05 |
| 2 | 9.6 | label appears | siliconeTap | 0.6 | -0.2 |
| 10 | 54.3 | card | jewelResolve, key 57 | 0.8 | -0.1 |
```

Art times count from the film start (beat n starts at `(n - 1) x 6`). In the story, an art time x becomes `U.S(x)` inside `cues`, or `{ art: x }` in `sound.fx`.

## Checks

- `node sound/render_sound.mjs film.html`: the loudness line (LUFS, true peak, LRA), `<id>_spectrum.png` and `<id>_wave.png`.
- `node sound/stems.mjs film.html` then `python3 sound/analyze_stems.py out_sound/<id>`: each event's effect against the music.
- Listen to the loop point in `<id>_sound_long.mp4`.
- Two renders of the same film differ by at most a couple of 16-bit steps (Chromium's reverb is not bit-exact; about -84 dBFS, inaudible). Loudness is identical.
