# Lane notes: charts and cards, long films, offline fonts

This lane changed `toolkit/engine.js`, `render.mjs`, `build.py` (fonts option only), `shell.html`, `references/render.md`, `references/api.md` and `references/motion.md`, and added `toolkit/story_components.js`. It did not edit `SKILL.md`. These are the SKILL.md changes it recommends, as exact replacements.

## 1. Requirements (line 73)

Replace:

> **Requirements:** Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy, and network access to Google Fonts. If fonts are blocked, install `@fontsource/fraunces`, `@fontsource/inter-tight` and `@fontsource/ibm-plex-mono` and replace the `<link>` in `shell.html` with `@font-face` rules.

with:

> **Requirements:** Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy, and network access to Google Fonts. If `render.mjs` prints `WARNING: fonts not loaded`, the film is using fallback faces and its layout will be off. Build it with embedded fonts instead: `npm i @fontsource-variable/fraunces @fontsource/inter-tight @fontsource/ibm-plex-mono` in the film folder (the variable Fraunces package, not the static one), then `python3 build.py story.js film.html --fonts local` (details in `references/render.md`, "Fonts"). Don't edit `shell.html` by hand.

## 2. Render step (workflow step 7, line 68)

Replace:

> 7. **Render**: `node render.mjs film.html film.mp4 --workers 6`, adding `--bitrate 3800k` for a shareable file (a one-minute film lands near 25–30 MB).

with:

> 7. **Render**: `node render.mjs film.html film.mp4 --workers 6 --bitrate 3800k --strict-fonts` (a one-minute film lands near 25–30 MB). Leave out `--bitrate` only for a master you will re-encode: the grain makes constant-quality files huge (a 2.7-minute film was 1.36 GB). For films over two minutes, read "Long films" in `references/render.md` (disk, memory, and encode time).

## 3. HUD rule (line 85)

Replace:

> - **The HUD and the hero reticle never scale with the camera.** Text that must stay still goes in `overlay(t)`.

with:

> - **The HUD and the hero reticle never scale with the camera.** Stats, callouts, cards and charts that must stay still go in `overlay(t)`, which ignores the camera, momentum and the match-cut shift and only moves with its plate's transition. Anchor overlay art to the hero with `heroOf(plate, t)`. Put a chart in `draw(t)` only when it belongs to the world and should zoom with it.

## 4. QA checklist (lines 116–125)

`callout()` now turns around at the elbow when its text would leave the frame, the hero tag flips near the right edge, and card titles shrink to fit. Replace:

>   - Callouts running off the frame edge: flip them.

with:

>   - Callouts that the engine had to turn around (their leader points the other way from what you wrote): check that the text doesn't now cover the art, and move the callout if it does.

The "Edges" bullet (line 125) still applies to stat notes, which are not clamped.

## 5. Optional: the component reel (toolkit table and engine-work paragraph, line 71)

Add a row to the toolkit table:

> | `toolkit/story_components.js` | Component test reel: every card, chart, ruler, lens, stat, callout, gather and flux arrow on moving plates. Build it after changing a component. |

and extend line 71:

> If you change or add a transition, test it in the reel first: `python3 build.py story_reel.js reel.html`, then `node render.mjs reel.html --strips`. After changing a component, do the same with `story_components.js`.

## Findings not fixed here (for other lanes or later)

- `motion_check` baseline for the example is unchanged by this lane: median 1.95, 0% still.
- The synthesized audio is not bit-identical between runs (±1 LSB on about 0.02% of samples). It is inaudible, but it rules out WAV hashes as a regression check.
- `callout` clamps text inside the frame but does not avoid the HUD boxes (stage dial, journey log); story layout still has to.
- A long film that repeats plates also repeats stage numbers; the engine does not check `stages` against the plate list.
