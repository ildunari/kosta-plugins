# Lane notes: smoke test and CI (for the integrator)

This lane added `toolkit/smoke_test.py`, `.github/workflows/doodle-smoke.yml`, and a smoke-test section in `DEVELOPING.md`. It did not edit `SKILL.md`, `engine.js`, `render.mjs` or `build.py`. This file lists the edits to those files that the integrator should consider.

## Why the test lives in `toolkit/`

- `build.py` reads `engine.js` and `shell.html` from the current folder, so a test has to run against a copy of the toolkit. If the test sits beside those files, it knows where its sources are, and the folder is self-contained.
- The skill already copies `toolkit/*` into every film folder, so a model can run `python3 smoke_test.py --work qa_smoke` there. That checks the model's own `story.js` with no extra setup. The glob is `story*.js`, which also picks up the new `story_gallery.js` and `story_components.js` automatically.
- CI runs the same file straight from the repo. The script copies the toolkit into `--work`, so nothing is ever built inside the plugin folder.
- The test copies top-level source files and any small subfolder (under 20 MB, and not a `qa*`, `*_frames`, `node_modules` or `smoke*` folder). A future `kits/` or `fonts/` folder is therefore copied without any change to the test.

## Merge points with other lanes

- **Kits in build.py.** The test builds with `python3 build.py <story> <out.html>` (in `check_story`, `smoke_test.py`). If `build.py` detects kits on its own, for example from the story source, nothing needs to change. If it needs extra arguments, change that one call, preferably by reading the kits the story declares, so that a new story needs no edit to the test.
- **`cp toolkit/*` and subfolders.** Once `toolkit/kits/` exists, `cp "${CLAUDE_SKILL_DIR}"/toolkit/* .` prints `cp: .../kits is a directory (not copied)` and leaves the kits behind. SKILL.md step 4 should become `cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .`. The same thing happens with a stray `toolkit/__pycache__/`, which appears if anyone runs Python inside the toolkit folder. Consider adding `__pycache__/` to `.gitignore`.
- **Fonts option.** Right now the smoke test needs network access for Google Fonts (`shell.html`). If the fonts lane adds a local or offline mode, CI could use it and drop that network dependency.

## Suggested changes to render.mjs (not made)

1. **Fail on page errors.** `--stills`, `--sheet`, `--strips` and `--seams` print `PAGE ERROR:` but still exit 0 when the error comes from a callback rather than from `__frameData`. Suggest `page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; })`. The smoke test greps for the string, so it works either way.
2. **Fail fast when boot throws.** If the story throws while loading, `openPage` waits the full 90 s for `window.__ready`. Race that wait against the first `pageerror` (the smoke probe gives it a 3 s grace period), so a model sees the error at once.
3. **`--info` mode.** `node render.mjs film.html --info` could print `JSON.stringify(window.__story)` and exit. The smoke test could then drop its embedded `_smoke_probe.mjs`, which copies render.mjs's Playwright lookup.

## Suggested change to build.py (not made)

- When the story has no `defineStory({ title: '...' })`, `re.search(...).group(1)` raises `AttributeError: 'NoneType'...`. A clear message such as `build.py: story.js has no defineStory({ title: '...' })` would help a model. The smoke test reports the exit and the error line either way.

## Lines to add to SKILL.md

In the toolkit table, after the `toolkit/motion_check.py` row:

```
| `toolkit/smoke_test.py` | Automated check: builds every `story*.js`, renders 3 stills of each and a short MP4 segment, and fails on page errors, blank frames, a missing or mono audio track, or no motion. |
```

In the workflow, as a new sub-bullet under step 6 (QA), before the full render:

```
   - `python3 smoke_test.py --work qa_smoke` builds and renders every story in the folder (3 stills each, plus a 3.5 s MP4 segment) and exits non-zero on any page error, blank frame or silent audio. Run it before the full render and after any engine or story change. It does not replace looking at the frames.
```

## Lines to add to DEVELOPING.md

This lane already added them (the "Automated smoke test" section, plus `smoke_test.py` in the layout block).

## CI caveats (the workflow has not run on GitHub yet)

- The workflow YAML parses (PyYAML), but `actionlint` was not installed on this machine, so the file was not linted, and the workflow itself has never run.
- Chromium and ffmpeg come from `npx playwright install --with-deps chromium` and `apt-get install ffmpeg` (ffmpeg 6.1 on ubuntu-24.04). All the filters the scripts use (`scale`, `hstack`, `tile`, `volumedetect`) are in that build.
- Expected runtime is about 1.5–2 min for setup plus about 2–3 min for the test with 2 workers, based on 47–85 s on an M-series Mac with 3 workers. The job has a 20-minute timeout.
- Headless Chromium on Linux could render text slightly differently from macOS. The checks are not pixel comparisons, so this should not matter.
