# Lane notes: component kits (for the integrator)

This lane added `toolkit/kits/` (6 kits plus the `_kit.js` base), `toolkit/story_gallery.js`, `references/components.md`, a `__KITS__` slot in `toolkit/shell.html`, and a `build.py` that inlines kit files between the engine and the story. It includes `kits/_*.js` plus only the kits the story names (`KIT.<kit>`), or every kit when that can't be read (`const K = KIT`, `KIT[...]`, an unknown name); a film with no kits carries none. It stops with a clear message when a story uses `KIT.` but `kits/` is missing, and still works with an older `shell.html` that has no `__KITS__` slot. SKILL.md, engine.js and the other references were not touched. These are the edits they need.

## SKILL.md

1. **Files table**, add these rows after the `toolkit/story_reel.js` row:

```
| `toolkit/kits/` | Component kits: ready-made, on-style building blocks (`KIT.earth`, `KIT.tech`, `KIT.ai`, `KIT.space`, `KIT.lab`, `KIT.studio`). `build.py` inlines them automatically. Catalogue in `references/components.md`. |
| `toolkit/story_gallery.js` | "Component Gallery" (36 s): every kit component drawing on and idling, one plate per kit. The visual test for the kits. |
| `references/components.md` | Every kit component: its call, options, look, motion and good uses, plus how to add new ones. |
```

2. **Read list** (the line after the table): add `references/components.md` to the files to open while building:

```
Open `references/api.md` and `references/components.md` while building, and `references/sound.md` when adding cues.
```

3. **Workflow step 4**, change the copy command to `cp -R` so `kits/` comes along:

```
4. **Set up a working folder** (not inside this skill): `cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .` then write a new `story.js` that follows the example's structure, with art built for this topic. Use kit components (`references/components.md`) where they fit your subject, and draw everything else yourself. Copy a helper from the example only when it genuinely fits. If that variable is not filled in, the `toolkit` folder sits next to this SKILL.md.
```

4. **"What the plugin fixes and what you create"**, replace the paragraph starting "If you build something other films could reuse" with:

```
Before drawing a common object, check `references/components.md`: the kits already have seas, coasts, mountains, forests, strata, weather, terminals, code cards, browsers, server racks, circuit boards, cursors, neural networks, agents with tools, chat threads, token streams, attention arcs, star fields, planets, orbits, comets, telescopes, glassware, cells, molecules, microscopes, pipettes, easels, brush strokes, swatches, wireframes and pen-tool paths. If you build something other films could reuse (a DNA helix, a volcano, a phone), write it in the kit component shape and propose it back ("Growing the kits" in `references/components.md`).
```

5. **Rules that matter most**, add one bullet:

```
- **Use the kits, then go further.** Kit components (`references/components.md`) are on-style and already move; use them where they fit, restyle them with their options, and draw the rest of the scene yourself. A film should never look like the gallery: a few components inside a scene built for its topic.
```

6. **Step 6 or the regression note** ("If you change or add a transition…"), add:

```
If you change or add a kit component, render the gallery: `python3 build.py story_gallery.js gallery.html`, then `node render.mjs gallery.html --sheet 1`.
```

## Other docs outside this lane

- `docs/doodle-art-animation/DEVELOPING.md` still says `cp "${CLAUDE_SKILL_DIR}"/toolkit/* .` (line 37) and `cp …/toolkit/* /tmp/doodle-test/` (line 44). Both need `cp -R …/toolkit/. <dir>`, or `kits/` is skipped. Its layout block should list `kits/` and `story_gallery.js`, and its test list should add the gallery build and sheet.
- `references/api.md` could add one line under "Components": "Kit components: `KIT.<kit>.<name>(t, opts)`; see `references/components.md`."
- `.gitignore` may want `gallery.html` next to `film.html` and `reel.html`.
- Consider bumping `plugin.json` `version` (users will notice the kits).

## Verification done in this lane

- The gallery, example, seams and reel stories all built with the kits inlined, and their stills rendered with no page errors.
- The gallery contact sheet and per-plate stills were reviewed by eye.
- `gallery.mp4` (36 s): `motion_check` median 1.59, still 0% (first pass; see the review pass below).

## Review pass (merge-with-fixes)

- Every component honours `dark` (a dark-flip test rendered all 33 components on the other world); `components.md` documents what stays light.
- Memo keys fixed (`earth.weather` includes `n`, `ai.motes` includes `dark`); `KIT.memo` is an LRU capped at 256 entries.
- `tech.terminal` with `loop` stays empty before `t0`; `tech.code` clamps `hl`; `tech.circuit` accepts 1 pin per side; `ai.chat` returns `{ h }`.
- Visual fixes: flask highlights follow each glass, token fade and candidate clip, stronger rain with splashes, a mountain range that ends inside its box (with jittered snowcaps and edge-faded mist), legible strata labels, stronger planet bands and lighter night hatching, the eyedropper dips into the chip, paper colours for stars, comets and attention arcs, and gallery layout collisions cleared.
