# Rendering

- **How it works:** `render.mjs` loads the HTML with `?render=1`, waits for `window.__ready`, and calls `window.__frameData(f)`, which returns the canvas as a JPEG.
  - Frames are split across workers by `floor(f / 2) % workers`.
  - Audio comes from `window.__audioWav()`.
  - ffmpeg joins them at `-crf 16`, or at `--bitrate` if you pass one.
- **Options:** `--png` for lossless frames, and `--from/--to` to re-render a range.
- **Speed:** in-page drawing takes about 15–26 ms per frame. JPEG encoding and page-to-script transfer take the rest.
  - With 6 workers at 1080p, expect about 60–70 ms per frame, so a 4.5-minute film takes about 7–8 minutes.
  - Heavy `hatch()`, `pebbles()` and `stipple()` over the full frame are the main drawing costs, so keep `gap` at 5 px or more on large areas.
- **Alternative:** a HyperFrames (HeyGen) composition could drive the same canvas through a custom frame adapter (`seekFrame(f)` → `renderFrame(f)`). The plain harness below is the one that has been tested.
