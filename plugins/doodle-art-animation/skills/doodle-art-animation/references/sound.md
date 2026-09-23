# Sound

Every sound is synthesized in code: the plugin ships no audio files, so a film stays one self-contained HTML. The one recording a film may carry is its own narration, which `build.py` embeds in the HTML (see "Narration" below). The engine renders the whole track with an `OfflineAudioContext` from the same plate start times as the picture, so the result is deterministic and exported as WAV.

The layers: a music bed (pads in the film's key), ambience beds (room tone, rain, wind, traffic), effect cues on the picture's events, instruments and short musical stingers in the film's key, the automatic sounds of seams and headers, a compressor, a short reverb and real stereo.

## The rule: different kinds of events get different sounds

A viewer hears a repeated sound as the same event happening again. So the same sound must never serve two kinds of event, and one sound must not carry the whole film.

- **Different kinds of events get different sounds.** A platen touching a tablet is a `thump` or a `crunch`; a camera move is its transition sound; a label arriving is a `pop`. Never the same `thump` for a contact and a camera move.
- **Fit the world.** A pen `scratch` belongs on paper. Inside a microscope, on a screen or on a night plate there is no pen: use `readout`, or nothing.
- **Repeats vary on their own.** Every effect in the engine re-rolls its pitch, length and timbre on each call, and for the low sounds (`thump`, `crunch`'s body, `shutter`) the body itself varies, not just the details, so twelve `droplet`s are twelve different drops and a run of `thump`s is not one sample. The seed is the plate, the time within the plate, the sound's name and how many calls of that name at that instant came before, never the order of calls across the film: adding or retiming one cue re-rolls only that cue, and lengthening a plate leaves the later plates' sounds as they were. Pass `seed: n` only when you want the *exact* same sound again (a motif, a callback).
- **No type dominates.** `cue_check.mjs` fails a film where one sound is more than 30% of its cues and seams plus two events of grace (so four pops and nothing else fail, and 5 of 8 fail), at any length, or where a fixed sound repeats identically more than 5 times. The automatic header typing and the pulses inside a bed (a heartbeat) are listed but do not count towards dominance.

## Event → sound map

| Event on screen | Sound | Notes |
|---|---|---|
| Contact, a landing, a heavy object set down | `thump`, `pegSnap` (small, clipped), `relay` (a switch) | `thump { g }` for weight |
| Compression, crushing, a tablet pressed | `crunch { dur, hard }`, `creak { material }` under the strain, `pump` for each stroke | crack first, grind after |
| Liquid: a drop, a pour, stirring, something dropped in | `droplet`, `pour { dur }`, `slosh`, `plop { size }` | `rain` bed for weather |
| Glassware, lab bench | `clink`, `shaker { dur }`, `relay`, `hiss { kind: 'vent' }`, bed `roomTone` | |
| Steam, gas, pressure let go | `hiss` (steam), `hiss { kind: 'vent' }` | |
| Paper, a page, a card | `pageFlip`, `flick` (the page transition) | |
| Typed text on paper | `scratch { chars, cps }` | the header gets it automatically |
| Typed text with no pen (screen, microscope, night) | `readout { chars, cps }` | automatic on night plates |
| A label, callout or card appears | `pop` | |
| A count-up lands, a fact resolves | `chime { f }` in key | |
| Arrivals, small discrete things (particles, dots) | `plink` (in key by default), `droplet` if they are wet | |
| Blister pack, packaging | `foil` | |
| A camera move or a seam | the automatic transition sound | don't add a contact sound to it |
| Time passing | a bed change (`wind` rising, `cityHum` thinning), a slow `tone` glide, or a `tick` series | not a pen scratch |
| A reveal | a moment of near-silence before it, then `chime` or a lift in the bed; for the film's one big reveal, the `reveal` stinger | see *Dynamics* |
| The hero first appears; changes; the end | `motif { degs }` (its four notes), varied `degs` when it changes, and ending on the tonic at the end | one motif per film |
| Something works, a step completes | `success` | musical, so keep it for real wins |
| A question is posed, a mystery opens | `question` | |
| A myth crossed out, a failed attempt | `oops` | |
| The end card | `resolve` (a rolled chord) | |
| A melody or a counted series in key | an instrument: `marimba`, `kalimba`, `musicBox`, `celesta`, `glock`, `vibes`, `epiano`, `pluck`, `feltPiano`, `strings` | `{ deg }` keeps it in key |
| Places | beds: `roomTone` (lab, office), `rain`, `wind` (outdoors, a fall), `cityHum` (streets) | |

## Effect cues

`cues: [[t, name, opts]]` on a plate calls `SFX[name](ac, out, plateStart + t, opts)`. Every effect takes `seed` (a fixed seed repeats one exact sound) and `g` (level; the defaults are balanced against the rest).

Established sounds, now varied per call:

- `scratch { chars, cps, g }` pen on paper for a typed line; `readout { chars, cps, g }` soft instrument blips for a typed line where there is no pen.
- `pop` a label or card appears; `chime { f }` a count-up lands; `plink { f }` arrivals (without `f` it picks a note of `music.tonic`); `thump { g }` a landing; `tick` a small mark.
- `swell { dur, up }`, `riser { dur }`, `whoosh { dur, dir }`, `glide { dur, up }`, `flick { dur }`, `shutter { dur }`, `bend { dur, f, f2 }`, `crackle { dur }` are the transition sounds; use them as cues only for motion of the same kind.
- `tone { f, f2, dur, g, type }` and `noise { dur, g, f0, f1, q, type, lfo }` are building blocks for story-level sounds; they do not vary by themselves.

New in v0.15 (techniques after Andy Farnell, *Designing Sound*, and K. van den Doel's bubble model; see the comment in `engine.js`):

- `crunch` `{ dur = 0.55, g, hard = 0.6 }`: a compaction crack and grind, for a tablet or grains under a press. A few sharp fractures, then a decaying cluster of millisecond grains, over a low body thud from the platen. `hard` weights the crack.
- `creak` `{ dur = 0.8, g, material = 'wood' | 'steel' }`: strained wood or steel, from stick-slip friction: irregular slip pulses whose rate follows the force, through the body's resonances (low and warm for wood, high and ringing for steel). Under slow pressure, a bending beam, a door.
- `pump` `{ dur = 0.9, g }`: one stroke of a hydraulic hand pump: lever clack, a rising squeeze and whine, the valve click and a breath of release. Cue one per stroke.
- `relay` `{ g, off }`: a heater or instrument relay: armature click plus contact bounce ringing the metal frame. `off: true` is the softer release.
- `hiss` `{ dur = 0.7, g, kind = 'steam' | 'vent' }`: steam from a valve (bright, sharp onset) or a cooling vent (softer, lower).
- `plop` `{ g, size = 1 }`: a small object into liquid: a soft impact and the rising pitch of the cavity bubble, then a few small bubbles. Larger `size` is lower.
- `slosh` `{ dur = 0.9, g }`: liquid moving in a vessel: two to four surges of low wash with bubbles on them.
- `shaker` `{ dur = 3, g, rpm }`: an orbital shaker or small lab motor for `dur` s: motor hum with harmonics, spin-up and spin-down, the glassware knocking once per orbit and rattling lightly between.
- `clink` `{ g, f }`: glass on glass: two glasses ringing at their own inharmonic modes. `f` sets the first glass's lowest mode.
- `pour` `{ dur = 2, g }`: water poured into a vessel: a stream of bubbles over a wash whose resonance rises as the vessel fills.
- `foil` `{ g }`: a blister pack pressed until the foil gives: crinkle, the pop through the foil, a little crinkle after.
- `droplet` `{ g, f }`: one water drop: a tiny impact and a damped sine that rises in pitch. `f` is the starting pitch (700–1600 Hz by default).
- `pageFlip` `{ dur = 0.45, g }`: a page turned: a rising, fluttering swish of air and the soft slap as it lands.
- `pegSnap` `{ g }`: a clothes peg: a scrape of the spring, a woody snap and a faint ring of the coil. Also good for any small clip or latch.

## Instruments and stingers (new in v0.16.4)

Ten pitched instruments play one note per call, in the film's key, and vary per call like the effects (a fixed `seed` repeats one exact note). Every one takes `{ f, deg, oct, tonic, g, pan, decay, seed }`: `f` is the pitch in Hz; without it, `deg` (a degree of the engine's `note()` scale, 0 = the tonic) is played in the film's key (`tonic`, else `music.tonic`, else 220 Hz), `oct` octaves above the tonic, starting from the instrument's home octave. `g` is the note's peak and `decay` stretches or shortens its ring (1 = as built). The pitch never varies by more than 2 cents per call, and a test checks every instrument's tuning by FFT to within 5 cents.

- `marimba { hard }` (home: one octave up): a wooden bar, soft mallet, short and woody. `hard` 0..1 is the mallet.
- `vibes { trem }` (one up): a long metal bar with the motor's tremolo (`trem` Hz, 0 = motor off).
- `musicBox` (two up): a plucked steel comb tine, bright, with the pin's click.
- `kalimba` (one up): a thumb-plucked tine over a wooden box, warm.
- `celesta` (two up): a soft, round bell.
- `glock { hard }` (three up): a glockenspiel, bright and ringing.
- `epiano { vel }` (one up): an electric piano, bright when struck and mellowing; `vel` 0..1 is how hard.
- `pluck { bright, t60 }` (the tonic's octave): a plucked string, harp-like when bright, a soft bass when low.
- `feltPiano { vel }` (the tonic's octave): a soft upright with felt over the hammers.
- `strings { dur, att, rel, bright, notes }`: a string section swelling in over `att` s, held `dur` s, released over `rel` s; one note (`f` or `deg`), a chord (`notes: [Hz, ...]`), or the film's I chord when neither is given.

How each is made is in the comment above `INST` in `engine.js`: struck bars and tines are modal synthesis (a few decaying sines at the object's mode ratios), the electric piano is FM, the plucked string is Karplus-Strong, the felt piano sums a stiff string's stretched overtones, and the strings are detuned sawtooth waves through a slowly opening filter.

Six stingers are short musical phrases in the film's key, built from the instruments. Each takes `{ tonic, g, seed }`, where `g` scales the whole phrase (1 = as balanced), and varies per call:

- `motif { degs = [2, 3, 4, 6], inst = 'musicBox', step = 0.22, oct }`: the hero's four notes, when it first appears. Change `degs` when the hero changes; end on the tonic (`0`) at the end.
- `success { inst = 'marimba' }`: a quick rising arpeggio.
- `question { inst = 'epiano' }`: two rising notes that do not resolve.
- `oops`: a falling half step on a muted string.
- `reveal { lead = 1.4 }`: a reversed swell that starts `lead` s before the cue and ends exactly on it, then a low boom, a bright chord and a string swell. The bed ducks by 40% for 0.9 s under it. Use it once or twice per film, on the moment itself (a cue's time is the hit, not the start of the swell).
- `resolve`: a rolled felt-piano chord and a music-box sparkle, for the end card.

`One Drop` (`story_one_drop.js`) uses five of them: its motif when the drop appears and again, ending on the tonic, under the end card; `oops` as the teardrop myth is crossed out; `reveal` as the camera settles on the whole route; `success` as the route closes; `resolve` under the end card's rule line. Music beds with a pulse (arpeggios, lo-fi, the pulse bed) are not built yet; today's pad is still the default bed.

A story can still add its own: `SFX.drip = (ac, out, t, o = {}) => { … }` before `defineStory`, built from `SFX.tone`, `SFX.noise` or `synth(ac, out, t, dur, fill, { g, pan, filters })`. Keep it deterministic: no `Math.random`; use `sfxRng(o, t, 'drip')` so it varies per call like the built-ins.

## Beds

`bed: (ac, out, t0, dur) => …` on a plate plays on a bus that ducks by 50% under every transition, by 25% under a `chime`, `pop` or `crunch`, and by 40% under a `reveal`. Overlapping ducks combine as the deepest one at each moment, so a cue inside a transition's duck never pulls the bed back up early.

- **Music bed:** `defineStory({ music: { tonic: 220, gain } })` gives every plate without a `bed` an automatic pad. Stage `n` plays chord `n` of a I–vi–IV–V–ii–V loop; night plates drop an octave, darken and add a low noise bed; the end card resolves to I with an added 9th. `SFX.pad` and `SFX.padKey` build your own.
- **Ambience beds** (`BED.*`, in the bed shape, each takes `(ac, out, t0, dur, opts)` and fades in and out over about a second; left and right are synthesized separately so they are really stereo):
  - `BED.roomTone { g = 0.02, hum = 50 | 60, fridge = true }`: lab or office air, a low air-handling rush and a fridge hum at the mains frequency and its harmonics.
  - `BED.rain { g = 0.03, heavy = 0.5 }`: a wash of noise and many small drop impacts, with the odd big drip.
  - `BED.wind { g = 0.035, strength = 0.5 }`: gusts that change level and colour slowly, a low rumble, a faint whistle on strong gusts.
  - `BED.cityHum { g = 0.03, cars = 1 }`: distant traffic, a low rumble and cars passing across the stereo field every few seconds.
  - `BED.mix(...beds)` layers beds: `bed: BED.mix(BED.roomTone, (ac, o, t, d) => SFX.pad(ac, o, t, { dur: d, notes: [220, 277.2, 329.6] }))`.
  - With options: `bed: (ac, o, t, d) => BED.rain(ac, o, t, d, { heavy: 0.8 })`.

## Automatic sounds

- **Seams:** a riser before every seam except `fade` (its length and pitch vary, and it always ends on the seam), then the transition's own sound: a swell for `lensIn`/`lensOut`, a low tap for `cut`, a whoosh for `pan`/`wipe`, a flick for `page`/`roll`, a crackle for `burn`, hatching strokes for `hatch`, a bend for `morph`/`shape`, nothing for `fade`. Each seam gets its own variation. A custom transition can set `enter.sfx: (ac, out, t, dur) => …`.
- **Headers:** the kicker, title and subtitle type on with pen `scratch` on paper plates, and with soft `readout` blips on night plates. Set `pen: true | false` on a plate to override, or `pen: 'none'` for silence.
- **Stereo:** small cues are panned deterministically, pads and beds are spread wide, and wipes pan with their direction.

## Dynamics: a loudness lift at the climax

A film that sits at −20 dB from start to end sounds flat, however good its cues are (the review measured a loudness range of 3.4 LU). Shape it: start a little under the average, build, **lift at the film's climax** (the reveal, the moment the process completes), then settle for the end card.

- `defineStory({ dynamics: [[t, dB], …] })` sets the master level over time: film seconds, dB relative to the default, linear ramps between points. The example: `[[0, -5], [6.5, -4.5], [16.5, -3.5], [26.5, -2], [39, -1], [41.5, 3], [50.5, 3], [53, 0], [62, -1]]` (quiet opening, a +3 dB lift over plate IV), which takes its loudness range from 3 to about 7 LU.
- Shorter: `lift: dB` on the climax plate ramps up over its first 1.5 s and back down over 1.5 s after it ends (used only when `dynamics` is absent).
- Density does the rest: fewer, sparser cues early; the climax gets a fuller bed and its strongest cue. A beat of near-silence just before the climax makes the lift land harder.
- The compressor (threshold −16 dB, 4:1) softens lifts at the loudest moments, so a +3 dB lift reads as about +2. Keep lifts within ±6 dB and re-check the level.

## Narration

A narrated film (plates with `vo`, clips from `toolkit/voice.mjs`, embedded by `build.py`; `references/api.md`, "Narration") mixes differently, because the words must always win.

- **The voice channel.** Each clip is first brought to −18 LUFS on its own (measured on the clip, so clips from different providers or takes match), then all of them go through one chain: a high-pass at 80 Hz (no rumble or plosive thumps), a gentle compressor (−26 dB threshold, 2.5:1, fast attack) and a touch of the same room the effects use. The voice is centred and never goes through the music's compressor, so neither pumps the other.
- **Ducking.** The music and ambience beds dip 14 dB under every sentence, starting 0.25 s before it and recovering over 0.6 s after it; sentences less than about a second apart share one dip, so the bed does not bob between them. The effects dip 3 dB, so a cue on a word still lands. The engine's own ducks under transitions and chimes still apply on top.
- **Levels.** The finished track is brought to **−16 LUFS integrated** (the usual target for web video and podcasts) with a look-ahead limiter holding **true peaks under −1.5 dBTP**, so the MP4 measures at or under −1 dBTP after AAC. While the voice speaks, the music and effects sit **15–20 dB under it** (the example measures 16.9 dB). For short-form uploads, `defineStory({ voice: { lufs: -14 } })`. The RMS level and loudness range targets under "Levels and checks" are for films without narration; they are reported, not judged, for a narrated film.
- **Settings.** `defineStory({ voice: { level: -18, lufs: -16, peak: -1.5, duck: 14, fxDuck: 3, reverb: 0.12 } })` are the defaults. Raise `duck` when the music competes with the words, lower it when the music vanishes; `reverb` is the room's share. A dense passage of cues under a line is better moved to a pause in the narration than ducked harder.
- **Checks.** `audio_check.py film.mp4 --narrated` judges loudness (−16 LUFS ±1; `--lufs -14` for another target) and true peak (−1 dBTP or lower). `node render.mjs film.html --stems --dir qa` writes the voice and everything else as two WAVs with the sentence times, and `audio_check.py film.mp4 --narrated --stems qa` adds `under`: how far the music and effects sit under the voice while it speaks (median over 400 ms windows, target 15–20 dB). `cue_check` is unchanged: the narration is not a cue, so it never counts towards a sound dominating the film.
- **Stems.** `window.__audioWav({ only: 'voice' })` and `({ only: 'rest' })` render one side alone, for a reviewer or a separate mix; both skip the final loudness pass, so they add up to the track before it.

## Levels and checks

- **Level:** mean about −18 to −21 dB, peak about −3 dB, loudness range 6 LU or more. The example measures a mean of −20.5 dB, a peak of −4.8 dB, −18.3 LUFS integrated and a range of 7.4 LU. `story_one_drop`, `story_components`, `story_seams` and `story_brushes` also carry a `dynamics` climax lift (7.4 to 9.4 LU); the two catalogue reels (`story_reel`, `story_gallery`) have no climax and stay flat, so their range warning is expected.
- **`audio_check.py film.mp4 --starts <transition times>`** prints PASS, WARN or FAIL for:
  - level (warns outside −21.5 to −17.5 dB) and peak (warns above −1 or below −6 dB);
  - EBU R128 loudness and true peak (warns above 0 dBTP), and loudness range (warns below 6 LU);
  - clipping (runs of 6+ full-scale samples fail);
  - stereo (one channel, or left and right the same, fails; side/mid below −20 dB warns);
  - silence (1.5 s or more below −50 dBFS warns);
  - audio against video length (more than 0.2 s apart fails);
  - with `--starts`, a sound onset within 0.25 s of each transition, or a swell of 6 dB or more within half a second (the engine's own seams dip and then rise, and pass as a swell). `bleed`, `fade` and `hatch` swell more slowly, so a warning there is normal.

  It exits 1 only on a failure; `--profile` prints the level for each second.
- **`node cue_check.mjs film.html [--json out.json] [--list]`** lists every sound the film plays (time, type, options, and the layer: cue, header, riser, transition, bed) and reports counts per type, the share of the most-used type, identical repeats, a sound that serves both a cue and a transition, and pen scratches on night plates. It sorts the events into three pools: the **judged** events (the plates' cues and the seams, each seam counted once), the **headers** (the automatic typing, one event per header: it is one kind of event by design and varies by itself), and the bed **pulses** (event sounds a bed plays, such as a heartbeat's thumps: a loop repeats by design); texture sounds in beds (`tone`, `noise`, pads, `BED.*`) are listed apart. It exits 1 when the most-used judged type is at least 4 events and more than 30% of the judged events plus 2 (the grace keeps a couple of cues from swinging a short film; there is no minimum film length), or when a fixed sound repeats identically more than 5 times among cues, headers and pulses (or identical repeats pass 15% of them), and 0 otherwise. The fixture `tests/doodle-art-animation/fixtures/story_monotone.js` (ten pops in 16 s) must fail it.
