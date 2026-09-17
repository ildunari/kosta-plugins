# Rendering

- **How it works:** `render.mjs` loads the HTML with `?render=1`, waits for `window.__ready`, and calls `window.__frameData(f)`, which returns the canvas as a JPEG.
  - Frames are split across workers by `floor(f / 2) % workers`.
  - Audio comes from `window.__audioWav()`.
  - ffmpeg joins them at `-crf 16`, or at `--bitrate` if you pass one.
- **Options:** `--png` for lossless frames, and `--from/--to` to re-render a range.
- **Seams:** `node render.mjs film.html --seams` writes `qa/seam_NN_type.jpg` for every transition. The top row shows the old plate's last drawing, the two overlaid, and the new plate once settled; the bottom row shows four drawings inside the transition. Use the overlay to check that the exit and entry objects line up.
- **Speed** depends mostly on CPU cores, because headless Chromium draws the canvas on the CPU.
  - On a machine with plenty of cores, 6 workers averaged about 60–70 ms per frame, so a 4.5-minute film takes about 7–8 minutes.
  - On a 2-core machine, the 49 s example averaged about 140 ms per frame with 4 workers (about 7 minutes).
  - The heaviest plates are wide panning worlds: drawing a 3,400 px landscape every frame cost about 330 ms per frame on 2 cores, against about 170 ms for a normal plate. Heavy `hatch()`, `pebbles()` and `stipple()` over large areas are the main costs, so keep `gap` at 5 px or more there.
- **Timing your own code:** Chromium queues canvas drawing until something reads the canvas. A loop that calls `renderFrame()` without reading back stalls for several seconds every couple of dozen frames. When timing, read one pixel after each frame (`ctx.getImageData(0, 0, 1, 1)`). `render.mjs` reads every frame, so real renders don't stall.
- **Alternative:** a HyperFrames (HeyGen) composition could drive the same canvas through a custom frame adapter (`seekFrame(f)` → `renderFrame(f)`). The plain harness below is the one that has been tested.
