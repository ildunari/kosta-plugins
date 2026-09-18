# Rendering

- **How it works:** `render.mjs` loads the HTML with `?render=1`, waits for `window.__ready`, and calls `window.__frameData(f)`, which returns the canvas as a JPEG.
  - Frames are split across workers by `floor(f / 2) % workers`.
  - Audio comes from `window.__audioWav()`.
  - ffmpeg joins them at `-crf 16`, or at `--bitrate` if you pass one.
  - Audio renders at the same time as the frames (on its own audio thread), and the script prints frame, audio and encode times and the file size.
  - The page loads on `domcontentloaded` and waits for `window.__ready`; if the fonts did not load it prints a yellow `WARNING` (see "Fonts" below).
- **Options:** `--png` for lossless frames, `--from/--to` to re-render a range, `--bitrate 3800k` for a capped bitrate, `--crf 16` and `--preset slow` for the constant-quality encode, `--strict-fonts` to stop (exit code 1) when any page fell back to other fonts. Use `--strict-fonts` for the final render (the `doodle-render` step), so a film never ships in the wrong typeface.
- **Seams:** `node render.mjs film.html --seams` writes `qa/seam_NN_type.jpg` for every transition. The top row shows the old plate's last drawing, the two overlaid, and the new plate once settled; the bottom row shows four drawings inside the transition. Use the overlay to check that the exit and entry objects line up.
- **Range sheets:** `node render.mjs film.html --sheet-range A-B [--fps 6] [--dir qa]` renders frames from `A` to `B` seconds at `--fps` drawings a second (default 6) and tiles them into one grid, `qa/range_A-B.jpg` (6 per row, 480 px tiles, via the same `tile` helper `--sheet` uses). Add `--crop x,y,w,h` (pixels, in the film's 1920×1080 frame) to also write a detail sheet of the same frames, cropped first and scaled up to the same 480 px tiles — `qa/range_A-B_crop.jpg` — for close-ups a plain range sheet is too small to judge (a hand, a small mask edge, hatching). `--sheet-range` is its own early exit, like `--stills`/`--sheet`/`--seams`/`--strips`: it never falls through to a full-film render, with or without an `out.mp4` on the command line.
- **Speed** depends mostly on CPU cores, because headless Chromium draws the canvas on the CPU.
  - On a machine with plenty of cores, 6 workers averaged about 60–70 ms per frame, so a 4.5-minute film takes about 7–8 minutes.
  - On a 2-core machine, the 55 s One Drop film (`story_one_drop.js`) averaged about 140 ms per frame with 4 workers (about 7 minutes).
  - The heaviest plates are wide panning worlds: drawing a 3,400 px landscape every frame cost about 330 ms per frame on 2 cores, against about 170 ms for a normal plate. Heavy `hatch()`, `pebbles()` and `stipple()` over large areas are the main costs, so keep `gap` at 5 px or more there.
- **Timing your own code:** Chromium queues canvas drawing until something reads the canvas. A loop that calls `renderFrame()` without reading back stalls for several seconds every couple of dozen frames. When timing, read one pixel after each frame (`ctx.getImageData(0, 0, 1, 1)`). `render.mjs` reads every frame, so real renders don't stall.
- **Alternative:** a HyperFrames (HeyGen) composition could drive the same canvas through a custom frame adapter (`seekFrame(f)` → `renderFrame(f)`). The plain harness below is the one that has been tested.

## Legibility and story checks

Two checks read the built film rather than a render. Both load `film.html` in headless Chromium the way `render.mjs` does, need `playwright` in the film folder, and exit 0 when clean, 1 on a finding and 2 on a setup error (missing file, page error, no playwright).

**`node legibility_check.mjs film.html [--step 0.5] [--json out.json] [--crops DIR] [--from s --to s]`** checks the text on pixels. `text_check` compares text boxes with each other, so it can't see grey type printed across line art. This check can. Every `--step` seconds, skipping frames inside transitions, it renders the frame twice: once as the film shows it, and once with only the letters' fill hidden and the film grain off. Whatever the engine draws around the letters stays in that second render: the glyph halo of `haloText()`, a card or a backing. So it shows the frame as the viewer sees it, minus the letters themselves. Then, for every line whose role isn't `decor`, it measures three things.
- **Size** is the em size on screen after the camera.
- **The ring** is where contrast and busy are measured. The line's glyphs are drawn alone as a mask (same font, transform and letter-spacing), grown by 0.12 em (at least 2 px), and the glyphs themselves are subtracted. What's left is the band right around each letter. Art between two lines, or behind a word gap, is outside it. The width is set by the halo: `haloText` clears 0.125 em around each letter, and a wider ring would count the halo's own clean edge against the art as clutter.
- **Contrast** is WCAG contrast of the text colour, blended by its alpha, against the mean luminance of the ring.
- **Busy** is the share of ring pixels whose grey-level gradient is above 40.
- `SMALL`: the size is below the role's floor. The floors are `fact` 28 px, `label` 22 px (the default when a `text()` call gives no `role`) and `hud` 18 px.
- `CLASH`: contrast is below 4.5, or busy is above 0.06, meaning art touches the letters. Paper and cards read 0.00–0.03, and a glyph halo reads 0.00–0.06 over any art. Line art touching letters without a halo reads 0.07–0.45.
- Repeats of a line (same plate, role, font and calling component) are grouped into one finding with its time span. Typewriter prefixes fold into the full line, and so do ticking numbers. A sample is judged only when the line is at full opacity and full size. A line fails when two of its samples fail, or when it has only one sample and that fails.
- Each finding line gives the time span, plate, role, the component that drew it (`journeyLog`, `callout < overlay`, `draw`, …), the text and the numbers. `--crops DIR` writes a full-resolution JPEG close-up of each finding at its worst sample. Open them, because a number is not a picture.
- Text on a card, or with the engine's glyph halo, passes where its surround is clean. That is how legitimate overlap is allowed. To fix a `CLASH`, move the line into clear space, re-sequence it so the art isn't there yet, draw it with `haloText` or on a card, or darken or enlarge it. To fix a `SMALL`, enlarge the line, or give it the right role.
- Speed: a 172 s film at `--step 0.5` took 26–32 s (306 frames, two renders each).
- Calibration, on "The Slow Squeeze", v0.13 build (the film whose review failed all ten plates while `text_check` said CLEAN; no halos; 350 lines, 190 CLASH and 254 SMALL):

  | Line | Where | Contrast | Busy |
  |---|---|---|---|
  | Plate IV callout sub "10,000 lb at about 20 °C, 5 minutes" | on the platen | 2.01 | 0.076 |
  | Journey Log labels SITE / MESOPHASE / STATE | on the pink chains | 1.43–3.06 | 0.09–0.24 |
  | Drug names MELOXICAM / DOLUTEGRAVIR / DEXAMETHASONE | on the wood | 1.45–1.47 | 0.00 |
  | "chains stacked neat — no room to pass" | over the chains | 3.31 | 0.113 |

  The review's 13–16 px story and HUD text all came out `SMALL`. The closest busy value to the line was "out in a moment", busy 0.068. The crop shows chain strokes crossing it, so it is a real clash.
- The same story rebuilt on the v0.15 engine gives 72 CLASH and 83 SMALL. All of them come from the story's own `text()` calls, none from the engine's components.
- Every bundled `story*.js` exits 0. The most crowded haloed line there is the NP·01 tag on a cell, at busy 0.054.

**`node story_check.mjs film.html [--json out.json]`** checks that the story keeps its own facts straight. It needs no render. For every plate it reads `header` and `stage`, and samples `log(t)` every 0.25 s.
- `TIME`: elapsed time runs backwards, inside a plate or from one plate to the next. Elapsed time is any log value starting `T+`. `T+ 3 h 20 min` sums its parts, and a bare `T+ 0` is 0. The units are s, sec, min, h, hr, hour(s), d, day(s), week(s), month(s) and year(s).
- `STAGE`: two plates share a stage number. Title and end cards have no stage and are skipped.
- `HERO`: the ID in the log title (`JOURNEY LOG · <ID>`) changes.
- Warnings, which exit 0: `FROZEN` for a log value unchanged across three or more plates in a row, and `UNREAD` for a `T+` value it can't parse. Rows without `T+`, such as `DAY 3 of 28`, are not read as time.
- On "The Slow Squeeze" it prints `TIME` twice (T+ 10 min → T+ 5 min, then T+ 5 min → T+ 0 days) and `STAGE` three times (stages 4, 5 and 6 each on two plates). It warns that ELAPSED stays `T+ 0` for plates I–III.

## Long films

Measured on this MacBook Pro (10 cores, 32 GB) with a 2 min 41 s film (the example's five plates repeated four times, 3,876 frames), 3 workers, while other renders were loading the machine (load average 130–245):

| Step | Result |
|---|---|
| Frames | 172 s, 44 ms/frame (the 55 s One Drop example: 38–42 ms/frame) |
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
- **The fallback is frozen.** If any face is missing when the wait ends, the engine removes the Google stylesheet, so fonts that arrive later can't change frames halfway through a render. Without this, fonts arriving 3 s late changed the frames rendered a few seconds after startup.
- **Every worker draws with the same faces.** When the first page fell back, the other workers open with `?nofonts=1` and freeze the same fallback at once, so a silent network costs one 10 s wait, not one per worker. `render.mjs` compares the warnings of all pages and stops with exit code 1 if they disagree.
- A `--fonts local` build that still lacks a face names the missing package in its warning.
- **Offline fonts:** install the packages once in the film folder and build with `--fonts local`:
  ```
  npm i @fontsource-variable/fraunces @fontsource/inter-tight @fontsource/ibm-plex-mono
  python3 build.py story.js film.html --fonts local      # or --fonts /path/to/node_modules
  ```
  This embeds the Latin and Latin Extended WOFF2 files as base64 `@font-face` rules (about 600 KB more HTML) and removes the Google link, so the film needs no network. `local` means `./node_modules` in the folder you run `build.py` from (the film folder). `--fonts=local` works too. Use `@fontsource-variable/fraunces`: it has the optical-size (opsz) axis, like the Google version, and the frames are pixel-identical to the Google Fonts render. Static `@fontsource/fraunces` (400/500/600) has no opsz axis, so display type looks different; `build.py` says so when it falls back to it.
- **Testing:** `DOODLE_BLOCK_FONTS=abort node render.mjs film.html --stills 60` blocks the font servers (`hang` makes them never answer).
