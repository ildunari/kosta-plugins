# Build lanes: one plate per agent

Read this before the build phase, once Gate 1 has passed and the scene script and seam list are fixed. A long film is mostly independent drawing work: plate III's capillary has nothing to do with plate I's syringe except the two seams that join them. Building those plates one after another in a single session is slow, and it fills that session's context with build logs and frame sheets until the model that has to judge the film as a whole can no longer see it. Fanning out fixes both, but only if every lane is boxed in hard enough that the pieces still make one film.

The rule that makes it work: **the plan is fixed before the lanes start, and no lane may change it.** A lane draws its scene. It does not decide what the film is, how it looks, or how it moves between scenes. Everything a lane would otherwise have to invent — the palette, the transition, the hero's ID tag, the HUD — is either fixed by the plugin or settled in the script.

## What a lane owns

One lane, one plate, one file.

- The file is `plate_<n>_<slug>.js` in the working folder: `plate_2_corona.js`, `plate_3_leaky_vessels.js`. `<n>` is the plate's index in the film, so the files sort into story order.
- It holds **one plate object, named `P<n>`** — `const P2 = { … }` in `plate_2_corona.js` — in the shape `story_example.js` uses: `dur`, `dark`, `enter`, `header`, `stage`, `cam`, `draw(t)`, `overlay(t)`, plus the optional `hero`, `focus`, `log`, `drift`, `counter` and `marks` (`references/api.md`, "Plate fields"). `P<n>` is the name assembly concatenates and lists in `plates`, so it must be exactly that. One plate object per file and no second one; the drawing helpers only this plate uses may sit beside it, under prefixed names.
- **`cues` and `bed` are not the lane's.** The sound plan (`cues.md`) is written in parallel with the lanes and pasted into the plates at assembly, so a lane leaves both fields out rather than inventing sound for its own plate.
- The lane **never edits** `engine.js`, `shell.html`, `build.py`, the files in `kits/`, `helpers.js`, `story.js`, another lane's plate file, or anything else in the toolkit. If the plate needs something the engine does not do, the lane says so in its report and works around it; it does not patch the engine. An engine change is a plugin change, and the whole film would have to be rebuilt on it.
- It does not add a plate, drop a plate, change its own `dur`, or change the transition the seam list gave it. Those are script decisions, and the script passed Gate 1. If the plate genuinely cannot be drawn as written, the lane stops and reports rather than quietly redesigning it.

Name every top-level identifier in the file after the plate. All the plate files end up concatenated into one `<script>`, sharing one scope, so two lanes that both write `const GROUND = 640` produce `SyntaxError: Identifier 'GROUND' has already been declared` and a blank film — a failure that appears only at assembly, in the main session, far from the lane that caused it. Prefix instead:

```js
// don't: generic names at the top level of plate_2_corona.js
const GROUND = 640, R = 180;
function cell(x, y) { … }

// do: named for the plate, so nothing can collide at assembly
const CORONA_GROUND = 640, CORONA_R = 180;
function coronaCell(x, y) { … }
const P2 = { dur: 10, dark: true, … };          // the plate object keeps the plain P<n> name
```

The plate object itself is the one exception, and it needs no prefix: `P<n>` is already unique because each lane owns a different `n`.

## What the lane is given

A lane starts with no memory of the conversation that produced the script, so its brief has to be complete. Hand it all of this, in the message that starts it:

| Given | Why the lane cannot work without it |
|---|---|
| Its row of the scene script | Duration, world, camera, header, hero route, every beat with its start→end, journey log, stage, sound — the whole specification of the plate |
| **Both** its seams, in full | See below: each seam is written by one lane and depended on by the other |
| The brief from intake (`brief.md`) | Length, hero, audience, tone, audio choice, ending — the decisions the plate has to be consistent with |
| The facts it puts on screen, with sources (`facts.md`) | Numbers are researched once, in the research phase. A lane that researches its own numbers produces a film whose plates disagree with each other |
| `helpers.js` | The house helpers for this film (below) |
| `references/style.md`, `references/motion.md`, `references/animation-principles.md`, `references/api.md`, `references/components.md` | The fixed look, the motion it must keep alive, the primitives it draws with |
| The hero's ID tag and how it appears in this plate | `NP·01` must be the same object, tagged the same way, in every plate |
| Its plate's time window, **local and global** | `draw(t)` and `overlay(t)` get local seconds, starting at 0. `render.mjs --sheet-range` takes seconds from the start of the **film**. A lane working on a probe of its own plate alone has local = global; the moment it looks at a sheet of the assembled film, it needs the offset |

### The seam is shared, so both lanes get it

A plate's `enter` implements the transition **into** it. The seam between plate 2 and plate 3 lives in plate 3's `enter`, and it usually reaches back into plate 2's geometry — in `story_example.js`, plate I's `enter` is `{ type: 'through', dur: 1.8, from: { at: LAND, r: 30 } }`, where `LAND` is where the drop landed in the title plate.

So each lane needs two seam rows:

- **Its entry seam** (from the previous plate). The lane writes this one. It needs the previous plate's exit: what is on screen at the end, where it sits, which way it is moving, what colour and shape it is. Its own opening drawing has to line up with that.
- **Its exit seam** (into the next plate). The lane does **not** write this one — the next lane does — but it must honour it. If the seam list says "the coated particle is carried off to the right by the plasma, and the next plate whip-pans right picking up the flow's speed", then this plate ends with the hero moving right at that speed, in that position, and does not stop dead at `dur`.

Two details that catch lanes out. `draw(t)` keeps being called with `t` past `dur` while the next plate's transition runs, so clamp anything that would fly off or wrap during the hand-off. And nothing in the plate should read as finished before `landAt(enter) + 0.3–0.5 s`: the entry move has to land before the first beat starts, or the viewer reads text through a moving camera.

## Shared helpers live in one file the main session owns

Anything more than one plate needs goes in `helpers.js` in the working folder: this film's palette additions (`Object.assign(PAL, { … })`), the state list, the bed generators, a drawing shared across plates (the red blood cell that appears in three of them), a camera shape used more than once.

**The main session owns `helpers.js`. Lanes read it and may not edit it.** A lane that wants a new shared helper asks for it in its report and draws its own local version in the meantime. This is not bureaucracy: two lanes inventing the same helper is the single biggest source of drift in these films. Two `rbc()` functions with slightly different ellipse ratios and hatch angles give you two kinds of red blood cell in one film, and nobody notices until the whole thing is assembled and playing. Palette keys are worse, because they collide silently: `Object.assign(PAL, { plasma: '#efd8b0' })` in one plate and `{ plasma: '#e8d4a8' }` in another do not error, they just make the last one win and the other plate wrong.

**Seam anchors belong here too.** Any constant an adjacent plate's `enter` reads — the point where a drop landed, the position a shape hands off from — is declared in `helpers.js` before the lanes start, because a plate object evaluates its `enter` the moment the file loads. A lane that reaches into another lane's file for it gets a `ReferenceError` on its own probe; `build.py` still exits 0, because it only splices text, so the only symptom is a render that waits 90 seconds for a page that never becomes ready. The seam list names every one of these.

This is why `helpers.js` is finished **before** the lanes start: a helper added once they are running reaches nobody, because no lane re-reads it mid-build. When a lane asks for one, the main session adds it at assembly and points the plates at it then. A lane that has already drawn its own local version leaves it alone rather than refactoring — the duplicate costs a few lines; a half-applied refactor across parallel lanes costs the build.

## Evidence a lane must return

**A lane that has not looked at its own frames is not finished.** Code that builds is not a plate that works, and the main session cannot check every plate by reading JavaScript — that is precisely the context it is trying not to spend.

Each lane builds a **probe story of its own plate** and renders it. Concatenate `helpers.js` and the plate file, append a one-plate `defineStory` and `boot()`, and build:

```bash
cat helpers.js plate_2_corona.js > probe_2.js
printf "defineStory({ title: 'probe 2', stages: 1, plates: [P2] });\nboot();\n" >> probe_2.js
python3 build.py probe_2.js probe_2.html
node render.mjs probe_2.html --sheet-range 0-10 --fps 6 --dir qa/plate_2
```

Everything in those four lines is named after the plate, and that is the point: lanes run at the same time in the same folder. `--dir qa/plate_<n>` is not decoration — `render.mjs` names a range sheet after its seconds, so two lanes rendering `--sheet-range 0-10` into the same directory both write `qa/range_0-10.jpg` and the second silently destroys the first's evidence. Give every lane its own `probe_<n>.js`, `probe_<n>.html` and `--dir qa/plate_<n>`.

`build.py` needs a `defineStory({ title: '...' })` with a single-quoted title, and it picks the kits by scanning the story text for `KIT.<name>`, so the probe must be the concatenated file — the plate file alone has neither.

The lane reports:

- **A range sheet of the whole plate** (`qa/plate_<n>/range_<start>-<end>.jpg`), in several sheets if the plate is long, plus **close-up crops** (`--crop x,y,w,h` on the same range) for fine detail: small labels, a texture, the moment of a hand-off. The lane says what it saw in them, against the cohesive-scene checklist in `references/animation-principles.md`.
- **`node text_check.mjs probe_<n>.html`** if the plate has text, which every plate with a header has. `READ`, `EDGE` and `OVERLAP` lines are the lane's to fix before it reports.
- **Not `speed_check`.** A probe holds one plate, and both `speed_check.mjs` and the engine skip the first plate's `enter`, so a probe reports no seams at all — a clean exit that measured nothing, which is worse than no check. Seams are measured once, on the assembled film, by the main session. A lane that wants reassurance about its own move watches it in its range sheet, drawing by drawing.
- **Every number it put on screen, with its source**, copied from the facts it was given. If the lane changed a number, rounded one, or derived one by arithmetic, it shows the arithmetic.
- **An honest note on what it could not get right**: a beat that does not read, a texture that crawls, a callout it had to move, a helper it wants shared, a place where the script asks for something the plate cannot show. This is the most valuable part of the report. A lane that reports "done, looks good" has told the main session nothing, and the problem surfaces at Gate 2 instead, where it costs a re-render.

A probe is not the film. Its camera has no momentum carried in from a previous plate, its entry seam has nothing real to come from, and none of its seams are measured at all. The lane's evidence says the plate works; only the assembled film says the plate fits.

## How drift is prevented

Style drift is what makes fan-out fail: six plates that are each fine and together look like six films. Five things hold it:

1. **The script and the seam list are fixed at Gate 1**, before any lane starts. Every lane is drawing to the same plan, and the plan was reviewed as a whole by `script-reviewer`.
2. **The look is the plugin's, not the lane's.** Ink, paper, type, the HUD, the camera, the transitions and the sound all live in `engine.js`. Every lane reads `references/style.md` and uses the same `PAL` — extended only through `helpers.js`. No lane restyles the HUD, changes the type scale, adds a gradient, or picks its own accent colour.
3. **No lane invents a transition.** The seam list already chose each one and its pace. A custom transition (`references/motion.md`, "Writing your own transition") is a script decision made before the fan-out, written into the seam list, and then implemented by the lane that owns that entry — not improvised by a lane that thought of something better.
4. **The kits come first.** Before drawing a common object, a lane checks `references/components.md`. Two lanes drawing their own mountains produce two kinds of mountain; two lanes calling `KIT.earth.mountains` produce one film.
5. **Only the main session judges the film as a whole**, and the Gate 2 reviewers see the **assembled film**, never the pieces. `film-reviewer`, `seam-reviewer` and `audio-reviewer` are looking for exactly what a lane cannot see: scenery repeating between plates, the hero drawn differently in plate II than in plate IV, five seams in a row at the same speed, a stat in the same corner every time. Running a reviewer on a single plate's probe wastes it.

## Assembly, by the main session

Assembly is not parallel work and is not delegated. The main session owns it.

**The plate files must be concatenated, not imported.** `build.py` takes exactly one story file and inlines it into a plain `<script>` block in `shell.html`, next to the engine and the kits. There is no module graph: no `import`, no `export`, no `type="module"`, and no second file served alongside — the built HTML is a single self-contained file opened from disk. So:

```bash
cat helpers.js plate_0_title.js plate_1_blood.js plate_2_corona.js \
    plate_3_vessels.js plate_4_release.js plate_5_end.js > story.js
printf "defineStory({ title: 'The Long Release', stages: 4, plates: [P0, P1, P2, P3, P4, P5] });\nboot();\n" >> story.js
python3 build.py story.js film.html
```

Four things the main session does here, because no lane can:

- **Plate order** is the order in the `plates` array. Concatenation order only has to put every plate object before `defineStory`; it is the array that plays. Get it right against the script, since a mis-ordered array builds cleanly and plays the film wrong.
- **Paste the sound in.** Each plate's `cues` and `bed` come from `cues.md` now, along with `defineStory({ music: … })` if the sound plan asks for one. The lanes deliberately left these out.
- **`stages`** counts only the numbered plates — not the title plate or the end card. `story_example.js` has six plates and `stages: 4`. It has to agree with every plate's `stage: { n, name, prevN }`: lanes fill in their own `n`, `name` and `prevN` from the script, and the main session checks the chain runs 1, 2, 3… with each `prevN` matching the previous numbered plate's `n`.
- **Kit selection happens on the assembled text.** `build.py` scans `story.js` for `KIT.<name>` and inlines only those kits, so a plate that is missing from `story.js` also silently loses its kit. Check the `kits:` line `build.py` prints against what the plates actually use. If it prints `all`, something in the story refers to `KIT` in a way the scan cannot read, which only costs file size.

Fix every `PAGE ERROR` before going further; a page error means the film is not built.

Then **re-check the seam list against the built film**, because seams are the one thing no lane could verify: `node render.mjs film.html --seams` and `--strips`, and `node speed_check.mjs film.html` over the whole film. Every seam's exit and entry should line up in the overlay, motion should keep its direction across the cut, and the pace should vary from seam to seam. This is also where momentum first exists — a probe has none — so a seam that read fine in a lane's probe can still stall or lurch here.

When two plates collide, the fix is the main session's, not a re-run of a lane:

- **Same scenery.** Two lanes drew the same coastline, or both opened on far mountains. Change the later one: different ground, a different horizon height, a different time of day. `references/style.md` and the "vary the scenery" rule say what to vary.
- **Same composition.** Two plates put the stat top-centre and the callout on the right. Move one. One idea per region, and the regions should rotate through the film.
- **A hand-off that no longer lines up.** The exit lane drew its hero leaving at a different height, speed or size than the entry lane assumed. Fix whichever end is wrong against the seam list — the list is the authority, not either plate — and prefer adjusting the entry, since changing an exit also changes everything the earlier plate was built to lead into.
- **A duplicated helper.** Two near-identical drawing functions for the same object. Promote one into `helpers.js`, point both plates at it, and rebuild.
- **A name collision.** The build throws `SyntaxError: Identifier 'X' has already been declared` and the page is blank. Rename in the later plate file and rebuild.

After the fixes, build once more and take **one shared QA render into `qa/`** for the Gate 2 reviewers, rather than letting each reviewer render its own.

## When not to fan out

Fanning out costs a brief per lane, an assembly pass, and a class of bug (collisions, duplicated helpers, seams that only meet at assembly) that a serial build simply does not have. It is worth it for a long film of independent scenes. It is not worth it for:

- **Short films.** One or two plates, or a film of about 30 seconds or less: fan out from three scenes up. The briefing costs more than the drawing.
- **One continuous scene or camera.** A film that is a single unbroken push through one landscape, or one long camera move across a diagram, has no seams to divide it at. Its plates share geometry, and two lanes drawing halves of one continuous world will not meet in the middle.
- **Plates too interdependent to draw alone.** Both halves of a custom morph seam, where one object has to become another and neither drawing can be settled without the other. A recap that redraws earlier art. A film where plate III is plate II from another angle, or where each scene is a step of one diagram accumulating on screen. A lane needs something it can draw without the other plates in front of it.
- **A film whose look is still being found.** If the first plate is also the experiment that settles how this film's subject gets drawn, build that plate in the main session first and fan out the rest once there is something for the lanes to match.

A good middle path when only part of the film is independent: build the plates that set the look serially, then fan out the run of interchangeable middle scenes. Fan-out is a tool for the parts of a film that are genuinely parallel, not a mode the whole build has to be in.
