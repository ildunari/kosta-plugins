# Styles

Each folder here is one visual style. The main `SKILL.md` picks a style, writes it as the first line of the film's `brief.md` (`style: <id>`), and then follows that style's `STYLE.md`. The phases and gates (intake, substance, script, plan review, voice, sound, art, assemble, check, render, deliver) and the five commands are shared by every style; what a style changes is how each phase is done and with which tools.

## The styles

| id | Name | Status | One line |
|---|---|---|---|
| `doodle-draw` | Doodle Draw | default, since v0.1 | Ink and watercolor field notebook, hero's journey, hand-made transitions, acoustic sound. |
| `3dlight` | 3DLight | new in v0.19 | Clean matte 3D motion graphics on a light ground, headline beside the art, beats that dissolve, optional seamless loop. |

## What a style folder must contain

```
styles/<id>/
  STYLE.md        the style card (below). Starts with front matter: style: <id>, name: <Display Name>
  toolkit/        everything copied into a film folder: the engine or drawing code, build and render scripts,
                  checks, examples. A film never builds inside the plugin; it copies this folder first.
  references/     the style's detailed guides (look, motion, API, sound, render), read on demand
```

`STYLE.md` answers, in this order:

1. **What it is and when to choose it**, compared with the other styles.
2. **What the style fixes and what the film creates.** The look the toolkit guarantees, and the art each film draws.
3. **The toolkit**: a table of every file and what it does.
4. **The workflow, phase by phase.** For each shared phase: the file it produces in this style, the toolkit commands, and the checks that prove it. Say plainly when a phase does not apply (for example, a style without narration says so at phase 2b).
5. **The rules that matter most**, each pointing to the reference that explains it.
6. **Determinism**: what makes frame capture work in this style.
7. **The QA checklist**: what to look at in the frames, the strips and the sound before calling a film done.

Keep shared craft in one place: a style may point to another style's references (Doodle Draw's `writing.md`, `intake.md`, `film-grammar.md`, `animation-principles.md`) rather than copying them.

## Sound

Every style takes its effects from the shared `../sound-library/` and has its own **sound palette**: which library families and instruments it uses, its music bed, and its levels. The palette lives in the style's `references/sound.md`. Two styles should not sound alike: Doodle Draw is acoustic and hand-made, 3DLight is clean and synthesized.

## Adding a style

1. Copy the shape above into `styles/<id>/`. Start from the style whose format is closest: Doodle Draw for scene-based stories with transitions, 3DLight for beat-based films and loops.
2. Write `STYLE.md` with the seven parts above, and keep it under about 200 lines; details go in `references/`.
3. Give the toolkit at least one example story and a smoke test that builds it, renders a few stills and fails on page errors, font fallbacks and blank frames.
4. Pick its sound palette from `../sound-library/` and write it in `references/sound.md`.
5. Add a row to the table above and to the style table in the main `SKILL.md`, with the words that should make a request choose it.
6. If the reviewer agents need style-specific checks, add them to the style's `STYLE.md` under "Reviewers"; the agents read that section for any style other than Doodle Draw.
7. Add the style's smoke test to `.github/workflows/doodle-smoke.yml` and bump the plugin version.
