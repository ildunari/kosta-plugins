---
name: doodle-art-animation
description: Make hand-inked, notebook-style explainer films drawn entirely in canvas code from any topic, dataset or source, with lens zooms, ink wipes, paper burns, morphs and synthesized sound, rendered to MP4.
---

# Doodle Art Animation

This skill makes explainer films that look like a naturalist's field notebook come to life: cream striped paper, wobbly tapered ink lines, pen-hatched shading, pencil, charcoal and watercolor textures, serif titles that type on, numbers that count up, and one tracked hero subject followed through the film. A film is a sequence of scenes, which this plugin calls **plates** (numbered like the plates of a field guide). The hero can be anything the story follows: a traveller, an animal, a letter, a coin, a data packet, a molecule. Inside, hidden or abstract views (inside a cell, a chip, a network, a mind, deep space) switch to a dark **night paper**. Hand-made transitions (lens zooms, zoom hand-offs, whip pans, ink wipes and bleeds, iris blinks, shape match cuts, page rolls) move the story between scenes.

Every pixel and every sound is computed by JavaScript in one HTML file with one `<canvas>`. `renderFrame(f)` is a pure function of the frame number, and a Playwright script captures the frames and muxes them with ffmpeg. There are no images, video clips, audio files or animation libraries.

## What the plugin fixes and what you create

The plugin fixes the **look and feel**: ink and paper, type, the HUD, camera behaviour, transitions, sound and rendering all live in `toolkit/engine.js`, and every film shares them. Don't restyle them per film.

Everything else is **yours to create**: the topic, the scenery, the objects, the diagrams, the hero and its journey. Films can be about anything (code, AI and agents, geology, geography, web design, biology, space, art, history) and each should look like its own subject, not like the example. Use engine components where they fit, and draw new art in each plate's `draw(t)` wherever they don't. Build that art from the engine's drawing primitives so it matches the style: the ink primitives (`pen`, `ink`, `hatch`, `shade`, `stipple`, `scribble`, `speckle`, `shape.*`) and the brushes (`brush.*`: pencils, coloured pencil, charcoal, markers, technical pen, spray, textured hatching and flow fields, plus `wash` for watercolor tints under the ink). Inventing new elements is expected, not a workaround.

Before drawing a common object, check `references/components.md`: the kits already have seas, coasts, mountains, forests, strata, weather, terminals, code cards, browsers, server racks, circuit boards, cursors, neural networks, agents with tools, chat threads, token streams, attention arcs, star fields, planets, orbits, comets, telescopes, glassware, cells, molecules, microscopes, pipettes, easels, brush strokes, swatches, wireframes and pen-tool paths, rivers, volcanoes, caves, dunes, icebergs, flowers, animals that walk, fish schools, insects, flocks, people and crowds, houses, huts, tents, towers, villages, skylines, roads, bridges, ships, carts, fields, markets, maps and ruins. If you build something other films could reuse (a DNA helix, a phone, a database table), write it in the kit component shape and mention it to the user as a candidate for the plugin ("Growing the kits" in `references/components.md`).



| Path | What it is |
|---|---|
| `toolkit/engine.js` | The engine: paper, ink, text, components, camera, transitions, timeline, sound, render hooks. Stories never edit it. |
| `toolkit/shell.html`, `toolkit/build.py` | `python3 build.py story.js film.html` inlines the engine and the story into one self-contained HTML file. |
| `toolkit/render.mjs` | Frame capture, stills, contact sheets, transition strips, MP4 muxing. |
| `toolkit/motion_check.py` | Measures how alive a render is, from its pixels, and flags snaps, pops and jerks. |
| `toolkit/speed_check.mjs` | Measures each seam's and camera's speed from the engine's own values; `FAST` is advice, `SNAP` is a failure. |
| `toolkit/audio_check.py` | Checks the sound: level, peak, clipping, stereo, silence, length, cue timing. |
| `toolkit/text_check.mjs` | Measures on-screen text: reading time, text off the frame, overlaps, text that scales. |
| `toolkit/legibility_check.mjs` | Looks at the pixels behind every line of text: size on screen against its role's floor, contrast, and how busy the artwork under it is. `CLASH` and `SMALL` fail. |
| `toolkit/story_check.mjs` | Checks the film's own facts over time: elapsed time never runs backwards, stage numbers don't repeat, the hero keeps one ID. |
| `toolkit/cue_check.mjs` | Lists every sound the film plays and fails a film where one effect dominates or repeats identically. |
| `toolkit/smoke_test.py` | Automated check: builds your own `story*.js` (the bundled examples when there are none; `story_tail.js` and other pieces `assemble.sh` joins into `story.js` are skipped), renders 3 stills of each and a short MP4 segment, and fails on page errors, font failures, blank frames, a missing, mono or silent audio track, or no motion. |
| `toolkit/story_example.js` | The main worked example, "The Long Release" (62 s): one PLGA nanoparticle from syringe to drug release, in a title, 4 plates and an end card. Read it for **structure**: plate objects, beats that enter and leave, text in `overlay()`, motivated cameras (a tracking shot, a slow push and turn, a follow that pulls back to the full diagram), and a designed seam list at the top of the file. Don't reuse its scenery for an unrelated topic. |
| `toolkit/story_one_drop.js` | A second example, "One Drop" (55 s, the water cycle): scenery recipes (far mountains, trees, birds, a coast cross-section), dense night plates, a size-ladder card. |
| `toolkit/story_seams.js` | "Pencil to Ladybug" (25 s): a short example of designed seams (a custom eraser-to-ladybug morph, an auto-direction `pan`, a match `cut`, a `page` turn). Read it with "Designing the seams" in `references/writing.md`. |
| `toolkit/story_brushes.js` | Brush demo: every brush type, washes on paper and night, textured hatching and flow fields. |
| `toolkit/story_reel.js` | Test reel with all 15 transition types back to back. |
| `toolkit/kits/` | Component kits: ready-made, on-style building blocks (`KIT.earth`, `KIT.life`, `KIT.settle`, `KIT.tech`, `KIT.ai`, `KIT.space`, `KIT.lab`, `KIT.studio`). `build.py` inlines the ones a story uses. Catalogue in `references/components.md`. |
| `toolkit/story_gallery.js` | "Component Gallery": every kit component drawing on and idling, ten plates across the eight kits (`earth` and `settle` take two each). The visual test for the kits. |
| `toolkit/story_components.js` | Component test reel: stats, callouts, cards, charts, rulers, inset lenses and gather on moving cameras and across transitions. |
| `references/components.md` | Every kit component: its call, options, look, motion and good uses, plus how to add new ones. |
| `references/style.md` | Worlds, palette, type, line and texture recipes, composition, HUD positions. |
| `references/motion.md` | Keeping every drawing alive, beats, timings, camera moves, the transition table and rules. |
| `references/intake.md` | The short question round with the user before a film starts, and the plan card at Gate 1. |
| `references/build-lanes.md` | How to build one scene per agent without the film drifting, and how the main session assembles it. |
| `references/writing.md` | Explainer voice, how to adapt any subject or dataset, the scene (plate) script format. |
| `references/animation-principles.md` | How motion flows inside a scene: overlapping action, follow-through, staggers, hand-offs, moving holds, arcs, anticipation, main and secondary motion. |
| `references/sound.md` | The synthesized sound design and cue names. |
| `references/api.md` | Every function and plate field a story can use. |
| `references/film-grammar.md` | Editing and animation grammar for seams and camera moves (eye trace, screen direction, lead room, motivated camera, the switch-up rule, the twelve principles) and the seam review rubric. |
| `references/render.md` | How rendering works, options and speed. |

Read `references/style.md`, `references/motion.md`, `references/writing.md`, `references/animation-principles.md` and `references/film-grammar.md` before writing the scene script. Open `references/api.md` and `references/components.md` while building, and `references/sound.md` when adding cues.

## When the plugin falls short

If something goes wrong that the plugin should have prevented (a check that missed a fault, a rule that led you astray, a component that doesn't fit), fix it in your film, then tell the user and suggest the plugin change in a sentence or two. Don't write notes into the installed plugin folder; it is replaced on every update.

## Phases and gates

| Phase | Needs | Produces | Lanes that may run at once |
|---|---|---|---|
| 0 · Intake | the user's request | `brief.md` | — |
| 1 · Substance | `brief.md` | `facts.md`, a source per number | topic research · the user's data; then a citations check on what they return |
| 2 · Script | `facts.md` | `script.md`: scene table and seam list | — |
| Gate 1 · Plan review | `script.md` on disk | a reviewed plan the user has seen | during the wait: folder, `helpers.js`, sound plan |
| 3 · Sound | a reviewed `script.md` | `cues.md` | runs beside phase 4 |
| 4 · Art | a reviewed `script.md`, `helpers.js` | one `plate_<n>_<slug>.js` per scene | one agent per scene |
| 5 · Assemble | every plate file | `story.js`, `film.html`, the shared `qa/` set | — |
| Gate 2 · Check and review | `film.html` and the shared `qa/` set | one merged fix list | text, speed and smoke checks · film, seam and audio reviewers |
| 6 · Render | a clean Gate 2 | `film.mp4` | render workers |
| 7 · Deliver | `film.mp4` | the MP4 and the HTML player | — |

A phase starts only when what it needs exists. The same goes for the agents: an agent handed a file that was never written will review an imaginary film, and everything after it inherits that. Each agent refuses to start without its input, and you should not have to rely on that.

Four commands run the phases, and they are the **user's** to type — a model cannot invoke them: `/doodle-art-animation:doodle-plan` runs 0 to Gate 1, `:doodle-build` runs 3 to 5, `:doodle-qa` runs Gate 2, `:doodle-render` runs 6. Suggest them when the user would rather drive phase by phase; otherwise follow the same phases yourself, in this order, which is what the rest of this file describes.

## Workflow

0. **Ask before you start.** Offer the user a short question round (3–7 questions, with options and a recommendation) and skip it if they said to just make it; see `references/intake.md`. Write the answers into `brief.md` and carry them into every phase below.
1. **Get the substance first.** Research the topic, or read the user's data or source. Every number on screen needs a source; write the sources down now, because they go on the end card. When the topic is broad, fan this out: topic research and the user's own data or sources run in parallel, then one more pass checks every number they returned against a second source — started alongside them it would have nothing to check — and the result is `facts.md`. A small topic, or one where the user supplied everything, is faster done in one pass.
2. **Pick the hero subject and write the scene script.** The hero is the one subject the viewer follows through the whole story, at any size: a person, an animal, a vehicle, a letter, a coin, a data packet, a molecule. Give it an ID tag like `H₂O·01`, `NP·01`, `FOX·01`, `PKT·01` (see `references/writing.md`). Create the film's working folder now if it doesn't exist (`mkdir -p <folder>`, `cd` into it, confirm with `pwd`; the toolkit is copied in at Gate 1, not here), then write the scene script — one row per plate, in the table format from `references/writing.md`, with camera, transition, beat and Changes columns (what visibly changes in each plate), and the exits in the seam list — and **design every seam** (exit, entry, link) in the seam list below the table, letting the link pick the transition. Plan how the motion flows: inside each scene, animations overlap and hand off to each other instead of stopping and starting, and each seam carries motion from one scene into the next (`references/animation-principles.md`). Save it as `script.md` in the film folder.
Gate 1. **Review the plan, then show the user.** Run the `script-reviewer` agent on the saved `script.md` — never before that file exists — and apply the edits it calls must-fix. Then post a short summary of the plan (one or two lines per scene, the hero's journey, the length and the sound idea) and say in the same message what happens next: reply to change anything, otherwise the build carries on. You cannot run a clock and a reply cannot reach you mid-turn, so the wait is bounded by work, not by time: while the card stands, set up the working folder, write the shared `helpers.js` (including any constant a seam anchors to) and let the sound plan run, then hand off or continue. Don't start the art lanes on an unapproved plan — that is the expensive work the card governs. Users who said to just make it, unattended runs and non-interactive runs get the card for the record and carry straight on (`references/intake.md`, "The plan card").
3. **Plan the sound.** With the reviewed script, run the `sound-designer` agent for a cue sheet (beds and ambience per scene, a motif, effect cues on beats and seams, fades, deliberate silences, levels) and save it as `cues.md`. This runs beside phase 4 and never before Gate 1 has passed the script; it may start while the plan card stands.
4. **Build the scenes.** The folder and the toolkit are already there from phase 2 and Gate 1; if they are not, `cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .` into the film folder now (if that variable is not filled in, the `toolkit` folder sits next to this SKILL.md). Never build inside the plugin. Write the shared `helpers.js` first, then give each scene its own build lane — one agent, one plate file, its own range sheet as evidence (`node render.mjs probe_<n>.html --sheet-range 0-<the plate's duration> --fps 6 --dir qa/plate_<n>`, with `--crop x,y,w,h` for close-ups; `--sheet-range` counts from the start of whatever film it is handed, so a lane's numbers start at 0 on its own probe and change once the film is assembled) — following the contract in `references/build-lanes.md`. Use kit components (`references/components.md`) where they fit the subject and draw everything else yourself; copy a helper from `story_example.js` only when it genuinely fits. **Fan out from three scenes up.** Below that — one or two plates, or a film of about 30 seconds or less — the briefing costs more than the drawing, so build the scenes yourself one after another. Build serially too when the plates share one continuous shot split only by camera moves, when they are so tied together that the second cannot be drawn without the first (both halves of a custom morph, a recap that redraws earlier art), or when the harness has no way to run agents at all.
5. **Assemble and render the QA set once.** Paste the cues into their plate files, write `story_tail.js` (the `defineStory` call listing every plate) and an `assemble.sh` that concatenates `helpers.js`, every plate file in film order and the tail into `story.js`, then run it and `python3 build.py story.js film.html`. From here on `story.js` is generated: fixes go into its sources and it is reassembled. Render the shared set once, into `qa/`: `node render.mjs film.html --sheet 1` (one frame per second), `--strips` (a 12-frame strip around every plate start), `--seams` (both sides of every transition and their overlay), then `node text_check.mjs film.html --json qa/text_check.json` and `node speed_check.mjs film.html`. The reviewers at Gate 2 reuse this `qa/` set and render only the extra frames they need, so nothing renders the same frames twice.
Gate 2. **Check and review what moves, not the stills.** Do these yourself, or suggest `/doodle-art-animation:doodle-qa` to the user, which runs them: the cheap checks in parallel (`legibility_check` for text over artwork and text too small to read, `story_check` for the film's own facts over time, `cue_check` for repeated sound, `text_check` for reading time and collisions, `speed_check` for seam and camera speed — `FAST` is advice, `SNAP` must be fixed, `TWICE` (a pan showing the hero twice) needs a look at the seam sheet — and `python3 smoke_test.py --work qa_smoke` for page errors, font failures, blank frames and a short clip's sound), then the `film-reviewer` and `seam-reviewer` agents in parallel on the shared `qa/` set. `audio-reviewer` needs an MP4, so it runs at phase 6. Open the strips and the seam sheets yourself and work through the QA checklist below; without the agents, apply the rubric in `references/film-grammar.md`. Then merge every fix list into one and apply it to the sources — the plate files and `helpers.js`, not `story.js`, which is regenerated by `sh assemble.sh` — and **re-run only the checks the change affects**: text edits need `text_check` and `legibility_check`, a seam or camera change needs `speed_check` and `seam-reviewer`, new art or a new beat needs its range sheet, `motion_check` and `film-reviewer`, a cue change needs `cue_check`, `audio_check` and `audio-reviewer`, and a change to the log or the plates' order needs `story_check`. Each scene gets one verdict here — PASS or FAIL, the evidence, the reason, the fix — and after that a small fix is re-checked on its own chunk, a range sheet of that scene, not by a fresh review of the whole film. Don't re-run the whole gate for a one-line fix. Three rounds of this is the limit: if a check still fails after three, stop and put it to the user with what you tried, rather than circling.
6. **Render, then review the sound.** Render with `node render.mjs film.html film.mp4 --bitrate 3800k --strict-fonts` (it uses one worker per CPU core, at most 8; a one-minute film lands near 20–30 MB), then `python3 motion_check.py film.mp4` against the targets and `python3 audio_check.py film.mp4 --starts <transition times>` (targets in `references/sound.md`). Leave out `--bitrate` only for a master you will re-encode: the grain makes constant-quality files huge (a 2.7-minute film was 1.36 GB). For films over two minutes, read "Long films" in `references/render.md`. This is the first MP4, so it is where the `audio-reviewer` agent runs — cue timing and hand-offs across seams, which `audio_check`'s levels cannot see — unless the film is silent (`defineStory({ silent: true })`; check it with `audio_check.py --silent`).
7. **Deliver** the MP4 and the HTML. The HTML is also a player: space plays and pauses, the arrow keys move 2 s, `[` and `]` jump between plates, and there is a scrubber.

If you change or add a kit component, render the gallery (`python3 build.py story_gallery.js gallery.html`, then `node render.mjs gallery.html --sheet 1`). If you change or add a transition, test it in the reel first: `python3 build.py story_reel.js reel.html`, then `node render.mjs reel.html --strips`. After changing a component, do the same with `story_components.js`.

**Requirements:** Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy, and network access to Google Fonts. If `render.mjs` prints `WARNING: fonts not loaded`, the film is using fallback faces and its layout will be off. Build it with embedded fonts instead: `npm i @fontsource-variable/fraunces @fontsource/inter-tight @fontsource/ibm-plex-mono` in the film folder (the variable Fraunces package, not the static one), then `python3 build.py story.js film.html --fonts local` (details in `references/render.md`, "Fonts"). Don't edit `shell.html` by hand.

## The rules that matter most

Each has its details in the references.

- **Every drawing moves.** The engine adds twos, gate weave, grain, line boil, a slow push-in and momentum across cuts. Each plate must also keep at least two of its own motions going (flow, drifting particles, weather, a moving hero, a camera move, flickering links), with much more on night plates. Target: `motion_check.py` median of at least 1.5 per drawing and fewer than 5% of drawings below 0.5. Night plates need dense crowds (100+ small bodies) or depth layers to register, and end cards need motion too (ripples, orbiting specks). A plate that sits near zero needs more life, not a faster transition.
- **A story, not a tour.** One hero with one identity from the first plate to the last; it wants something, something stands in its way, and something changes. A paper's or report's sections become obstacles and turning points, never chapters (`references/writing.md`).
- **Things that are acted on change.** A pressed object squashes, a heated one warms, a filling vessel fills, and the gauge agrees with all of it — changed but recognisable (`references/animation-principles.md`).
- **Motion flows.** Animations in a scene overlap, stagger and hand off to each other; nothing stops dead while the next thing starts from rest, and new motion joins what is already moving (`references/animation-principles.md`).
- **Text the story needs is legible.** Facts at 28 px, labels at 22, the HUD at 18 on screen, contrast 4.5, never on line art of the same weight; text written on the thing it labels is fine. Compose by bands and clearances, not coordinates, and let `legibility_check.mjs` prove it (`references/style.md`).
- **Beats enter and leave.** Wrap stats, callouts and cards in `withAlpha(beat(t, t0, t1), …)`. Text fades out; it never un-types. Give every line `readTime(s)` on screen.
- **Design the seams, then pick transitions by the link between them.** The built-in types are presets; when one object becomes another, or a seam carries meaning, write a custom transition in the story (`references/motion.md`, "Writing your own transition"). Set each transition's pace too (`dur`, `ease`, `curve`: slow in and out, bounces, holds). Presets: `lensIn`/`lensOut` between worlds, `zoom` within a world, `shape` when an object persists across the cut, `pan` along the journey, `bleed` (an ink drop) for time passing, `burn` for an ending, `page` (a page turn) for chapter breaks, `roll` for a clean reset, `erase` (a board eraser) between points of a chalk or whiteboard film, `fade` only into the end card. Use 4–6 types once a film has five or more seams, and never the same one three times in a row; a two- or three-seam film just needs the right link for each seam.
- **Pace is yours.** The speed numbers in `references/motion.md` are defaults, not limits: pick faster or slower seams and moves when the story calls for it, and keep a contrast of quick and slow. Only visible snaps are a hard failure (`speed_check.mjs`, `motion_check.py`).
- **Scenes bleed to all four edges**, with the horizon at 48–52% and a sky element on every paper plate. One idea per region: top-centre stat, one side for callouts, bottom card.
- **Vary the scenery:** different ground, trees, far mountains, birds or open sea from plate to plate, and a recap with its own composition.
- **Pen for subjects, ink for measurement**, shading made of pen or brush strokes, and at least two textures on any fill wider than 200 px. Watercolor `wash` tints may sit under the ink lines; smooth digital gradients never appear. Choose brushes (`brush.stroke` types, `brush.hatch`, `brush.field`) per film to suit the subject: pencil for sketches and plans, charcoal for weight and weather, markers for diagrams (`references/style.md`, "Brushes").
- **Use the kits, then go further.** The kits cover nature (`KIT.earth`), animals and people (`KIT.life`), dwellings and civilization (`KIT.settle`), technology, AI, space, the lab and the studio. Kit components are on-style and already move; use them where they fit, restyle them with their options, and draw the rest of the scene yourself. A film should never look like the gallery: a few components inside a scene built for its topic.
- **The HUD and the hero reticle never scale with the camera.** Stats, callouts, cards and charts that must stay still go in `overlay(t)`, which ignores the camera, momentum and the match-cut shift and only moves with its plate's transition. Anchor overlay art to moving things through `camPoint` or `heroOf(plate, t)`, keeping labels fixed. Put a chart in `draw(t)` only when it belongs to the world and should zoom with it.
- **Sound varies with what happens.** Different kinds of event get different sounds — a press crunches, a liquid pours, a camera move whooshes — no effect repeats identically, and the climax is louder than the rest (`references/sound.md`, `cue_check.mjs`).
- **Ask, then review the plan.** Start with the intake round (`references/intake.md`), write the script to `script.md`, and pass Gate 1 (`script-reviewer`, then the plan card) before any art is drawn.
- **Nothing runs before its input exists.** The phase table above says what each phase and agent needs. A reviewer given a file that was never written will score an imaginary film, and every later phase inherits that mistake.
- **Honest numbers:** `≈` for estimates, real units, "illustrative" for schematic curves, sources on the end card.

## Determinism rules (these are what make frame capture work)

- Everything is a function of `f` (or `t`). Never use `Math.random`, `Date`, `performance.now`, or state carried between frames.
- Use seeded randomness: `mulberry(seed)` for layouts and `hash3(a, b, c)` for per-item values. Precompute layouts at load time, outside `draw`.
- Motion comes in three forms:
  - closed-form (`x = x0 + v·t`, wrapped with `%`);
  - keyframed (`kf`);
  - a precomputed path indexed by time (`along(path, t / dur)`).
- The boil comes from `S.boil = floor(f / 2)`. The renderer keeps frame pairs on the same worker.
- Audio is scheduled from the same plate start times, so picture and sound stay in sync by construction.

## QA checklist

Look at the actual frames, not your code.

- **Contact sheet.** Every second shows something readable. Nothing is empty by accident, and each region holds one idea.
- **Strips** (`--strips`), one per transition:
  - the anticipation dot appears before each lensIn;
  - the bare hold follows each lensIn;
  - no HUD or reticle scales with a zoom or the camera;
  - no rectangle edges show inside lens circles;
  - no vignette has the wrong darkness;
  - morph outlines don't twist;
  - the bleed front looks organic, not blocky;
  - the page turn shows the back of the page with a crease shadow, and the roll has inked edges and a shadow;
  - pans show a single join and speed lines, not two frozen frames.
- **Seams** (`--seams`): the exit and entry objects line up in the overlay, motion keeps its direction across the cut, and nothing pops in or vanishes at the join. Then watch each seam at full speed: if it feels like a camera trick rather than one continuous thing, redesign it.
- **Collisions** (plus any `text_check` `OVERLAP` and `EDGE` lines, which compare text with text, and every `legibility_check` `CLASH` and `SMALL` line, which compares text with the artwork behind it — open its crops).
  - Callout text over art, or touching a card.
  - Callouts the engine had to turn around (their leader points the other way from what you wrote): check that the text doesn't now cover the art or a HUD box, and move the callout if it does.
  - The STATE row overrunning (the engine wraps it only when it must).
  - Log-ruler labels near the right edge (the engine flips them).
  - A bottom card hitting the frame counter.
- **Motion.** `python3 motion_check.py film.mp4` meets the targets. Its per-second profile has no flat stretches, and no transition spikes out of a near-zero second.
- **Momentum.** In the strips, the old scene visibly leans in before each zoomy cut, and the new scene is still easing when the title starts.
- **Reading.** `node text_check.mjs film.html` shows no `READ` lines: every line stays up for `readTime` from when it starts typing until it starts to fade, and no line fades while still typing. In a `stat`, the note starts 1.2 s in, so the beat needs at least 1.5 s + `readTime(note)`; in a `callout`, the sub starts 0.7 s in, so it needs 1.0 s + `readTime(sub)`. Keep a moving callout's label fixed and let only its leader track the camera.
- **Facts.** Every on-screen number matches the plate script and its source. Check every comparison with arithmetic before it goes on screen: 1,200 mm of rain is 1,200 litres on each square metre, which is several bathtubs, not one.
- **Edges.** Stat notes, callout subs and card labels stay inside the frame. Measure long notes; a stat at x 1330 with a 45-character note ran off the right edge.
- **File.** `ffprobe` shows the frame count equal to `__story.frames`, and `python3 audio_check.py film.mp4` passes (level, peak, no clipping, real stereo, audio as long as the video).
