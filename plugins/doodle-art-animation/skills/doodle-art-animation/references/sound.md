# Sound

The reference's spectrogram shows several layers: pure harmonic stacks, filtered-noise beds, pitch sweeps at zooms, a scratch texture under every typed line, thumps on card landings, and real stereo. The engine renders all of this with an `OfflineAudioContext`, so the result is deterministic and exported as WAV.

- **Music bed:** `defineStory({ music: { tonic: 220 } })` gives every plate without a `bed` an automatic pad.
  - Stage `n` plays chord `n` of a I–vi–IV–V–ii–V loop.
  - Night plates drop an octave, darken, and add a low noise bed.
  - The end card resolves to I with an added 9th.
- **Automatic cues:**
  - a riser before and a matching cue on every transition (table above);
  - pen scratch for the header's kicker, title and subtitle;
  - bed ducking under transitions, chimes and pops.
- **Cues you add** (`cues: [[t, name, opts]]`):
  - `scratch { chars, cps }` under every typed stat note or callout;
  - `chime { f }` when a count-up lands;
  - `pop` when a callout or card appears;
  - `plink { f: note(tonic, degree) }` for drops and arrivals, pitched to the scale so the film stays in key;
  - `thump` for landings; `hiss`, `noise` and `tone` for anything else;
  - a long, quiet `noise` bed for continuous motion (wind for a fall, a hum for an updraft).
- **Stereo:** small cues are panned deterministically, pads are spread wide, and wipes pan with their direction.
- **Level:** mean about −18 to −21 dB, peak about −3 dB. Check with `ffmpeg -i film.mp4 -af volumedetect -f null -`.
