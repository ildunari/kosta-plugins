# Rendering

- **How it works:** `render.mjs` loads the HTML with `?render=1`, waits for `window.__ready`, and calls `window.__frameData(f)`, which returns the canvas as a JPEG.
  - Frames are split across workers by `floor(f / 2) % workers`.
  - Audio comes from `window.__audioWav()`.
  - ffmpeg joins them at `-crf 16`, or at `--bitrate` if you pass one.
  - Audio renders at the same time as the frames (on its own audio thread), and the script prints frame, audio and encode times and the file size.
  - The page loads on `domcontentloaded` and waits for `window.__ready`; if the fonts did not load it prints a yellow `WARNING` (see "Fonts" below).
- **Options:** `--png` for lossless frames, `--from/--to` to re-render a range, `--bitrate 3800k` for a capped bitrate, `--crf 16` and `--preset slow` for the constant-quality encode.
- **Seams:** `node render.mjs film.html --seams` writes `qa/seam_NN_type.jpg` for every transition. The top row shows the old plate's last drawing, the two overlaid, and the new plate once settled; the bottom row shows four drawings inside the transition. Use the overlay to check that the exit and entry objects line up.
- **Speed** depends mostly on CPU cores, because headless Chromium draws the canvas on the CPU.
  - On a machine with plenty of cores, 6 workers averaged about 60–70 ms per frame, so a 4.5-minute film takes about 7–8 minutes.
  - On a 2-core machine, the 49 s example averaged about 140 ms per frame with 4 workers (about 7 minutes).
  - The heaviest plates are wide panning worlds: drawing a 3,400 px landscape every frame cost about 330 ms per frame on 2 cores, against about 170 ms for a normal plate. Heavy `hatch()`, `pebbles()` and `stipple()` over large areas are the main costs, so keep `gap` at 5 px or more there.
- **Timing your own code:** Chromium queues canvas drawing until something reads the canvas. A loop that calls `renderFrame()` without reading back stalls for several seconds every couple of dozen frames. When timing, read one pixel after each frame (`ctx.getImageData(0, 0, 1, 1)`). `render.mjs` reads every frame, so real renders don't stall.
- **Alternative:** a HyperFrames (HeyGen) composition could drive the same canvas through a custom frame adapter (`seekFrame(f)` → `renderFrame(f)`). The plain harness below is the one that has been tested.

## Long films

Measured on this MacBook Pro (10 cores, 32 GB) with a 2 min 41 s film (the example's five plates repeated four times, 3,876 frames), 3 workers, while other renders were loading the machine (load average 130–245):

| Step | Result |
|---|---|
| Frames | 172 s, 44 ms/frame (the 49 s example: 38–42 ms/frame) |
| Audio (`__audioWav`) | 22 s, of which the offline render is 19.6 s and WAV + base64 0.3 s; 29.7 MB WAV (≈ 11 MB per minute). No clipping, loudness steady at about −20 dB from start to end. |
| Memory | Chromium with 3 pages: 1.3–1.6 GB, flat for the whole render (no growth). ffmpeg afterwards: up to 1.6 GB. |
| Disk | 3.6 GB of JPEG frames (≈ 1.3 GB per minute; `--png` is several times more). |
| A/V sync | Video 161.500 s, AAC 161.493 s. The WAV runs 0.5 s longer (reverb tail) and `-shortest` trims it. |
| `motion_check` | median 2.05, 0% still (1.91 with `--bitrate 3800k`) |
| Encode, default (`-crf 16 -preset slow`) | about 465 s and **1.36 GB** (≈ 500 MB per minute) |
| Encode, `-crf 16 -preset medium` | 362 s, 1.29 GB |
| Encode, `-crf 20 -preset slow` | 577 s, 966 MB |
| Encode, `--bitrate 3800k` | 327 s, **57 MB** |
| Whole run, current `render.mjs` with `--bitrate 3800k` | **318 s** (5.3 min for a 2.7-min film): frames 161 s, audio finished alongside them at 21 s, encode 153 s, 58 MB (load average about 100) |

Advice:
- **Always pass `--bitrate 3800k` for a film you will share.** The grain and gate weave change on every drawing, so constant-quality encodes spend their bits on noise: even CRF 20 gave almost 1 GB. At 3800k the paper grain softens a little and the type stays crisp. Keep the CRF 16 default only for a master you will re-encode. The script warns when a file exceeds 100 MB per minute.
- **On a busy machine the encode, not the drawing, is the long step.** Here it took longer than rendering the frames. `--preset medium` saves about a fifth.
- **Budget disk:** about 1.3 GB of frames per minute of film. Delete `film_frames/` after the MP4 is checked.
- Workers: 3 pages already use about 1.5 GB; each extra page adds roughly 400–500 MB. With other jobs running, more workers than free cores slows everything down.
- Pacing over a long film: the per-second profile shows no dead stretches, and the loudness stays steady. Stage numbers wrap if plates repeat, so give a long film its own stage count.
- The synthesized audio is not bit-identical between runs (±1 LSB on about 0.02% of samples, from the audio graph's own rounding). It is inaudible; don't compare WAV hashes.

## Fonts

The page uses Fraunces, Inter Tight and IBM Plex Mono from Google Fonts. `shell.html` loads their stylesheet without blocking the page, and `boot()` waits for them for at most 10 s (`?fontwait=ms` changes that).

- **If Google Fonts is blocked** (refused or unreachable), the film renders in fallback faces (Georgia and Menlo, visibly wider, so layouts shift). `render.mjs` prints `WARNING: fonts not loaded (…)` and the preview shows the same message in its control bar. Before this change, a silent network (requests that never answer) stalled the page forever, because the stylesheet blocked the scripts.
- **Offline fonts:** install the packages once in the film folder and build with `--fonts local`:
  ```
  npm i @fontsource-variable/fraunces @fontsource/inter-tight @fontsource/ibm-plex-mono
  python3 build.py story.js film.html --fonts local      # or --fonts /path/to/node_modules
  ```
  This embeds the Latin and Latin Extended WOFF2 files as base64 `@font-face` rules (about 600 KB more HTML) and removes the Google link, so the film needs no network. With the variable Fraunces package (which has the optical-size axis, like the Google version) the frames are pixel-identical to the Google Fonts render. `@fontsource/fraunces` (static 400/500/600) also works, with slightly different display type.
- **Testing:** `DOODLE_BLOCK_FONTS=abort node render.mjs film.html --stills 60` blocks the font servers (`hang` makes them never answer).
