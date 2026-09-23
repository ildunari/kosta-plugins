# Sound

Every sound is synthesized in code: the plugin ships no audio files, so a film stays one self-contained HTML. The one recording a film may carry is its own narration, which `build.py` embeds in the HTML (see "Narration" below). The engine renders the whole track with an `OfflineAudioContext` from the same plate start times as the picture, so the result is deterministic and exported as WAV.

The layers: a music bed (pads in the film's key), ambience beds (room tone, rain, wind, traffic, the inside of the body, underwater, forest, ocean, fire, a room with a clock, the micro world, vinyl crackle), effect cues on the picture's events, the automatic sounds of seams and headers (the header writes with its paper's own tool), a compressor, a short reverb and real stereo.

## The rule: different kinds of events get different sounds

A viewer hears a repeated sound as the same event happening again. So the same sound must never serve two kinds of event, and one sound must not carry the whole film.

- **Different kinds of events get different sounds.** A platen touching a tablet is a `thump` or a `crunch`; a camera move is its transition sound; a label arriving is a `pop`. Never the same `thump` for a contact and a camera move.
- **Fit the world.** A pen `scratch` belongs on the cream notebook; each other paper has its own tool (the table under *Automatic sounds*). Inside a microscope, on a screen or on a night plate there is no pen: use `readout`, or nothing.
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
| Paper, a page, a card | `pageFlip`, `flick` (the page transition), `tear`, `stamp` | |
| Typed text on paper | the paper's writing tool `{ chars, cps }`: `scratch`, `pencil`, `chalk`, `marker`, `quill`, `charcoal`, `techPen` | the header gets it automatically |
| A line drawn, a sum worked on a board, a mistake rubbed out | the paper's writing tool `{ dur }`, `eraser` | |
| Typing on a machine, an old report | `typewriter { chars, cps }` | |
| Typed text with no pen (screen, microscope, night) | `readout { chars, cps }` | automatic on night plates |
| A label, callout or card appears | `pop` | |
| A count-up runs | `counter { n, dur }` under it, the clicks slowing as the number settles | then `chime` when it lands |
| A count-up lands, a fact resolves | `chime { f }` in key | |
| A line graph draws | `sonify { dur, curve }`: a tone whose pitch follows the data | quiet; one per graph |
| An idea lands, something gleams | `sparkle` in key | sparingly |
| Arrivals, small discrete things (particles, dots) | `plink` (in key by default), `droplet` if they are wet | |
| Blister pack, packaging, pills | `foil`, `pills` | |
| Lab work | `pipette`, `syringe`, `centrifuge { dur }`, `beep { n, f }` (an instrument ready) | |
| Dissolving, gas, a tablet in water | `fizz { dur }`, `bubbles { dur, rate }` | |
| Gels, mucus, anything wet and soft | `squelch` | |
| The body | `heartbeat` (one beat), bed `BED.body` (a steady pulse) | |
| Electricity, magnetism | `zap`, `magnet` | |
| A camera move or a seam | the automatic transition sound | don't add a contact sound to it |
| Time passing | a bed change (`wind` rising, `cityHum` thinning), bed `BED.clockRoom`, a slow `tone` glide, or a `tick` series | not a pen scratch |
| A reveal | a moment of near-silence before it, then `chime` or a lift in the bed | see *Dynamics* |
| Places | beds: `roomTone` (lab, office, classroom), `rain`, `wind` (outdoors, a fall), `cityHum` (streets), `body` (inside the body, the bloodstream), `underwater`, `forest`, `ocean`, `fire`, `clockRoom`, `micro` (inside a cell, mucus, a gel), `vinyl` (lo-fi, archival) | |

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

New in v0.16.4 (sound build S2). Writing tools take `{ chars, cps }` to type a line or `{ dur }` to draw one; typed, each is level-matched to the pen `scratch` (within 0.3 LU), and drawn, each sits with the other effects:

- `pencil` `{ chars, cps, dur = 1.2, g, rate }`: graphite on paper, softer and grainier than the pen, in strokes (`rate` a second).
- `chalk` `{ chars, cps, dur = 1, g, rate }`: typed, a tap onto each letter and a short dry scrape; drawn, a rough scrape with the odd squeak.
- `marker` `{ chars, cps, dur = 0.8, g, strokes }`: a felt squeak per stroke on a whiteboard.
- `quill` `{ chars, cps, dur = 1, g, rate }`: scratchy, the nib catching on each downstroke.
- `charcoal` `{ chars, cps, dur = 1, g }`: soft, low and broad.
- `techPen` `{ chars, cps, dur = 1, g }`: a technical pen on drafting film, thin and even, with a ruler click every few strokes.

Paper and desk, data, lab and body, physical:

- `typewriter` `{ chars = 16, cps = 9, g, bell = true }`: key strikes (spaces duller), then the margin bell and the carriage return.
- `eraser` `{ dur = 0.9, g, rate = 7 }`: an eraser rubbed back and forth.
- `stamp` `{ g }`: a rubber stamp's thunk and a small squish of ink.
- `tear` `{ dur = 0.7, g }`: paper tearing, a crackling run of fibres snapping.
- `counter` `{ n = 12, dur = 1.5, g }`: a tally counter under a count-up, `n` clicks slowing as the number settles.
- `sonify` `{ dur = 2, curve, lo = 330, hi = 990, g }`: a soft tone whose pitch follows `curve` (values 0 to 1) as a line draws, panning left to right.
- `sparkle` `{ n = 7, dur = 0.6, g, tonic }`: a quick cluster of high glockenspiel pings in the film's key.
- `pipette` `{ g }`: the plunger click, the draw of liquid, the release.
- `centrifuge` `{ dur = 4, g, top = 520 }`: spin-up whine, a steady hum, spin-down.
- `syringe` `{ dur = 0.8, g }`: the plunger's rubber squeak and a thin hiss of liquid.
- `pills` `{ g, shakes = 3 }`: pills rattling in a plastic bottle.
- `fizz` `{ dur = 2.5, g }`: an effervescent tablet, thousands of tiny bubbles bursting.
- `bubbles` `{ dur = 1.5, g, rate = 12 }`: a stream of bubbles rising.
- `squelch` `{ dur = 0.5, g }`: a wet squelch, a resonant sweep over bubbly noise, for gels and mucus.
- `heartbeat` `{ g }`: one lub-dub. For a steady pulse under a plate use `BED.body`.
- `beep` `{ n = 1, f = 1000, gap = 0.18, g }`: short instrument beeps at an exact pitch.
- `zap` `{ dur = 0.35, g }`: an electric spark, a crack and a short buzz.
- `magnet` `{ g }`: a small magnet snapping onto metal.

A story can still add its own: `SFX.drip = (ac, out, t, o = {}) => { … }` before `defineStory`, built from `SFX.tone`, `SFX.noise` or `synth(ac, out, t, dur, fill, { g, pan, filters })`. Keep it deterministic: no `Math.random`; use `sfxRng(o, t, 'drip')` so it varies per call like the built-ins.

## Beds

`bed: (ac, out, t0, dur) => …` on a plate plays on a bus that ducks by 50% under every transition and by 25% under a `chime`, `pop` or `crunch`. Overlapping ducks combine as the deepest one at each moment, so a cue inside a transition's duck never pulls the bed back up early.

- **Music bed:** `defineStory({ music: { tonic: 220, gain } })` gives every plate without a `bed` an automatic pad. Stage `n` plays chord `n` of a I–vi–IV–V–ii–V loop; night plates drop an octave, darken and add a low noise bed; the end card resolves to I with an added 9th. `SFX.pad` and `SFX.padKey` build your own.
- **Ambience beds** (`BED.*`, in the bed shape, each takes `(ac, out, t0, dur, opts)` and fades in and out over about a second; left and right are synthesized separately so they are really stereo):
  - `BED.roomTone { g = 0.02, hum = 50 | 60, fridge = true }`: lab or office air, a low air-handling rush and a fridge hum at the mains frequency and its harmonics.
  - `BED.rain { g = 0.03, heavy = 0.5 }`: a wash of noise and many small drop impacts, with the odd big drip.
  - `BED.wind { g = 0.035, strength = 0.5 }`: gusts that change level and colour slowly, a low rumble, a faint whistle on strong gusts.
  - `BED.cityHum { g = 0.03, cars = 1 }`: distant traffic, a low rumble and cars passing across the stereo field every few seconds.
  - `BED.body { g = 0.05, bpm = 66 }`: inside the body: a slow heartbeat felt more than heard, and blood rushing in time with it.
  - `BED.underwater { g = 0.05 }`: a muffled low wash, slow pressure swells and bubble streams rising.
  - `BED.forest { g = 0.012, birds = 1 }`: leaves in a light breeze and a few birds calling; `birds: 0` for none.
  - `BED.ocean { g = 0.028 }`: waves that build and break every 7 to 11 s, with a hiss of foam as each recedes.
  - `BED.fire { g = 0.08 }`: a low roar with sparse crackles and pops.
  - `BED.clockRoom { g = 0.1, rate = 1 }`: a quiet room with a clock ticking, for time passing.
  - `BED.micro { g = 0.07, tonic }`: the micro world, slow viscous blobs of low sound and soft glassy tones in the film's key, for scenes inside a cell or mucus.
  - `BED.vinyl { g = 0.1 }`: record-surface crackle and a faint hiss, quieter than the others; a layer for a lo-fi or archival feel.
  - `BED.mix(...beds)` layers beds: `bed: BED.mix(BED.roomTone, (ac, o, t, d) => SFX.pad(ac, o, t, { dur: d, notes: [220, 277.2, 329.6] }))`.
  - With options: `bed: (ac, o, t, d) => BED.rain(ac, o, t, d, { heavy: 0.8 })`.

## Automatic sounds

- **Seams:** a riser before every seam except `fade` (its length and pitch vary, and it always ends on the seam), then the transition's own sound: a swell for `lensIn`/`lensOut`, a low tap for `cut`, a whoosh for `pan`/`wipe`, a flick for `page`/`roll`, a crackle for `burn`, hatching strokes for `hatch`, a bend for `morph`/`shape`, nothing for `fade`. Each seam gets its own variation. A custom transition can set `enter.sfx: (ac, out, t, dur) => …`.
- **Headers:** the kicker, title and subtitle type on with the writing tool of the plate's paper, and with soft `readout` blips where there is no pen. A paper in the paper registry names its tool with `sfx: { header }`; the engine's own table (`PAPER_PEN`) covers the planned papers:

  | Paper | Writing sound |
  |---|---|
  | cream notebook (today's paper plates) | `scratch` |
  | night (today's dark plates), fluorescence, screens | `readout` |
  | graph, engineering, dot grid, hexagon, semi-log (the lab set) | `pencil` |
  | whiteboard | `marker` |
  | chalkboard | `chalk` |
  | parchment or laid paper, star atlas (the codex set) | `quill` |
  | kraft, toned tan | `charcoal` |
  | black sketchbook (gel pen) | `scratch` |
  | whiteprint, blueprint | `techPen` |

  A plate's `pen` overrides it: a sound name (`pen: 'chalk'`), `true` (the paper's tool, or the pen where the paper has none), `false` (the readout blips) or `'none'` (silence).
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
