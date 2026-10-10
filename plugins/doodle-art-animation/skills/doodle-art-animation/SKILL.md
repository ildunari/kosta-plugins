---
name: doodle-art-animation
description: Make animated explainer films and seamless loops drawn entirely in canvas code, from any topic, dataset or source, rendered to MP4 with synthesized sound, in a choice of visual styles. Doodle Draw is a hand-inked field notebook with lens zooms, ink wipes, paper burns, morphs and optional voice-over narration. 3DLight is clean, matte 3D motion graphics for biotech, medtech and product explainers, posters that move and booth loops.
---

# Doodle Art Animation

This skill makes explainer films, and short loops for screens at a booth or in a lobby, in one of several visual **styles**. Whatever the style, every pixel and every sound is computed by JavaScript in one HTML file with one `<canvas>`: a frame is a pure function of time, a Playwright script captures the frames, and ffmpeg muxes them with the synthesized sound into an MP4. There are no images, video clips, audio files or animation libraries (a narrated film's own voice-over is the one exception).

A style fixes the **look and feel**: the drawing tools, type, palette, transitions or dissolves, the sound palette, the toolkit that builds and renders a film, and the checks that prove it. You create the story, the scenes and the art, in that style.

## Styles

| Style | Folder | What it looks like | Choose it for |
|---|---|---|---|
| **Doodle Draw** (`doodle-draw`, the default) | `styles/doodle-draw/` | A naturalist's field notebook coming to life: ink and watercolor on cream paper, a tracked hero subject, hand-made transitions (lens zooms, ink wipes, page turns), acoustic sound (pens, paper, felt piano, kalimba). | Story-driven explainers: a hero's journey through a process, a paper or a dataset; teaching; anything that should feel hand-made. Optional voice-over. |
| **3DLight** (`3dlight`) | `styles/3dlight/` | Clean, light, matte 3D-shaded motion graphics: soft spheres, capsules, cells and tissue layers on a mint-white ground, bold sans headlines beside the art, smooth dissolves between beats, a modern synthesized sound palette. | Biotech, medtech and product explainers, investor or expo booth loops, a poster that moves. Calm and sober, never glossy or dark. |

`styles/README.md` is the registry: what every style folder must contain, and how to add a new style.

## Pick the style first

1. If the user named a style or one is obvious from the request ("booth loop", "clean 3D", "like the expo videos" is 3DLight; "doodle", "notebook", "hand-drawn" is Doodle Draw), use it.
2. Otherwise make it the first question of the intake round, with a recommendation: Doodle Draw for a story told to learners, 3DLight for a pitch, a product, a booth or a loop. Unattended runs use Doodle Draw unless the request asks for a loop, a booth, 3D or a clean corporate look.
3. Write `style: <id>` as the first line of `brief.md`. Every phase, command and reviewer reads it from there. A brief without that line is a Doodle Draw film (films made before styles existed).
4. Read `styles/<style>/STYLE.md` before anything else and follow it. It names the style's toolkit (copied into the film folder with `cp -R "${CLAUDE_SKILL_DIR}"/styles/<style>/toolkit/. .`), its references, its workflow details, its rules and its checks. A style may point to another style's references for the parts they share (Doodle Draw's `references/writing.md`, `intake.md`, `film-grammar.md` and `animation-principles.md` hold the general craft).

## Sound library

`sound-library/` holds the plugin's shared catalog of synthesized sound effects, sorted by family (transitions, impacts, interface, digital, organic, liquid, material, tonal accents, textures, rhythm), with the style or styles each one suits and the recipe that makes it. Its code runs in every style's sound engine. Read `sound-library/README.md` when planning a film's sound, and pick from the families that fit the style before inventing a new effect.

## When the plugin falls short

If something goes wrong that the plugin should have prevented (a check that missed a fault, a rule that led you astray, a component that doesn't fit), fix it in your film, then tell the user and suggest the plugin change in a sentence or two. If the gap is in one style, name the style. Don't write notes into the installed plugin folder; it is replaced on every update.

## Phases and gates

| Phase | Needs | Produces | Lanes that may run at once |
|---|---|---|---|
| 0 · Intake | the user's request | `brief.md` | — |
| 1 · Substance | `brief.md` | `facts.md`, a source per number | topic research · the user's data; then a citations check on what they return |
| 2 · Script | `facts.md` | `script.md`: scene table and seam list | — |
| Gate 1 · Plan review | `script.md` on disk | a reviewed plan the user has seen | during the wait: folder, `helpers.js`, sound plan, and for a narrated film an audition only when two or three narrator presets fit equally |
| 2b · Voice (narrated films only) | a reviewed `script.md` with its narration | `vo/voice.json` locked, plate durations updated, an animatic | — |
| 3 · Sound | a reviewed `script.md` | `cues.md` | runs beside phase 4 |
| 4 · Art | a reviewed `script.md`, `helpers.js`, and for a narrated film the locked `vo/voice.json` | one `plate_<n>_<slug>.js` per scene | one agent per scene |
| 5 · Assemble | every plate file | `story.js`, `film.html`, the shared `qa/` set | — |
| Gate 2 · Check and review | `film.html` and the shared `qa/` set | one merged fix list | text, speed and smoke checks · film, seam and audio reviewers |
| 6 · Render | a clean Gate 2 | `film.mp4` | render workers |
| 7 · Deliver | `film.mp4` | the MP4 and the HTML player | — |

A phase starts only when what it needs exists. The same goes for the agents: an agent handed a file that was never written will review an imaginary film, and everything after it inherits that. Each agent refuses to start without its input, and you should not have to rely on that.

The table uses Doodle Draw's file names; each style's `STYLE.md` lists its own (3DLight has beats where Doodle Draw has plates). Five commands run the phases for every style, reading the style from `brief.md`, and they are the **user's** to type — a model cannot invoke them: `/doodle-art-animation:doodle-plan` runs 0 to Gate 1, `:doodle-voice` runs 2b for a narrated film, `:doodle-build` runs 3 to 5, `:doodle-qa` runs Gate 2, `:doodle-render` runs 6. Suggest them when the user would rather drive phase by phase; otherwise follow the same phases yourself, in this order, which is what each style's `STYLE.md` describes step by step.
