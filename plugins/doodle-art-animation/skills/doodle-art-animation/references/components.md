# Component kits

Ready-made building blocks, drawn in the house style, that a story can use directly. They live in `toolkit/kits/`, and `build.py` inlines every file there between the engine and the story, so a story can call them with no setup. `build.py` includes only the kits a story names (`KIT.earth…` pulls in `earth.js`, plus the shared `_kit.js`), so a film that uses no kits carries none; if it can't tell (for example `const K = KIT`), it includes them all. If a story uses `KIT.` but the working folder has no `kits/`, the build stops and says so: copy the toolkit with `cp -R`. To see all of them moving, build `toolkit/story_gallery.js`.

The kits are a head start, not a limit. Use a component where it fits your subject, restyle it with its options, and draw anything else yourself from the engine primitives. A film about geology might use `earth.strata` and then draw its own fault lines and fossils.

## How every component is called

```js
KIT.<kit>.<name>(t, { x, y, s, rot, draw, alpha, seed, dark, ...its own options })
```

| Option | Meaning |
|---|---|
| `t` | The plate's local seconds. Always pass the plate's `t`, because it drives the idle motion. |
| `x`, `y` | Where the component's anchor lands. Box components anchor at their top-left; objects that stand on something anchor at their base (listed below). |
| `s` | Scale. Line weights grow by √s, so small copies stay legible. |
| `rot` | Rotation in radians about the anchor. |
| `draw` | Draw-on progress, 0..1. Pass something like `E.inOut2(inv(0.4, 1.8, t))` so the component draws itself in; 1 is fully drawn. |
| `alpha` | Opacity, for fading a component out with its beat. |
| `seed` | Picks the layout variant (tree positions, star field, peaks). The same seed always gives the same drawing. |
| `dark` | `true` on night plates. Every component honours it: outlines and loose strokes turn pale, and components drawn on their own surface adjust it (see below). |

**On the other world.** `KIT.ai` and `KIT.space` default to `dark: true`; everything else defaults to paper. Any component works on either world:

- Scenery (`earth.*`), animals, insects, fish, birds and people (`life.*`), glassware, the microscope, the pipette, the rack, the circuit board, the easel, brushes and the pen tool keep their own fills and switch their ink to pale on night plates.
- Things that are surfaces in their own right keep them: `tech.browser`, `studio.swatches`, `studio.wireframe` and the easel's canvas stay light (like a lit screen or a card), with pale outlines; `tech.terminal` is a dark screen in both worlds. `tech.code` switches to a dark card with night syntax colours.
- On paper, `space.stars`, `space.comet` and the `ai.*` highlights switch to inked colours so they don't vanish.

**Minimum size.** Components with text (`ai.agent`, `ai.chat`, `ai.tokens`, `ai.attention`, `tech.terminal`, `tech.code`, `tech.browser`, `studio.swatches`, `studio.wireframe`, `lab.flask` with a label) become hard to read below `s: 0.75`; at `s: 0.5` their labels are unreadable. Scale those down by giving them a smaller `w` or `size` instead, or keep them at 0.75 or above. Pure drawings (trees, planets, molecules, glassware) work down to about 0.4.

Every component keeps moving after it has drawn on, so a plate built from kit parts is never frozen. All of them are deterministic (no `Math.random`), cache their geometry, and add their colours to `PAL` under a kit prefix (`PAL.earthSea`, `PAL.techBoard` and so on). Override those colours with `Object.assign(PAL, {...})` like any other.

Components draw inside the plate's camera, so they zoom and pan with it. Draw them in `draw(t)`, not in `overlay(t)`.

## KIT.earth: landscapes and weather (paper)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `earth.sea(t, o)` | `w, h, waves, glint` | Open water seen from the side: flat teal, two hatch tones, a pen horizon at `y`. Foam strokes drift and bob; `glint: x` adds a flickering gold sun column. | Oceans, lakes, horizons, the base of a coast scene |
| `earth.coast(t, o)` | `w, h, side, land` | A map-view coastline: land with hill contour rings, a sand fringe, and surf lines that breathe along the shore. `side: 'right'` mirrors it; `land` is the land's share of the width. | Geography, erosion, maps, harbours |
| `earth.mountains(t, o)` | `w, h, n, bleed` | A range of `n` peaks with a paler back row, jagged snowcaps, foothills, drifting mist and snow blowing off the tallest summit. Peaks stand on the box's bottom edge and the whole range ends inside the box, with mist fading at the sides. `bleed: true` lets it run past the sides instead (a range that continues off frame). | Far scenery, climate, tectonics, a sky-line behind anything |
| `earth.forest(t, o)` | `w, h, n` | A row of round and pointed trees on a grassy ground line; they grow in one by one and sway. Anchor: the left end of the ground. `h` is the tallest tree. | Foregrounds, ecology, carbon, habitats |
| `earth.strata(t, o)` | `w, h, labels` | An underground cutaway: grass, topsoil with roots and a tunnelling worm, gravel, an aquifer with creeping groundwater, bedrock. Layers reveal top to bottom; `labels: false` hides the names. | Geology, groundwater, soil, mining, foundations |
| `earth.weather(t, o)` | `w, h, kind, n, cloud` | `kind: 'rain'` (streaks and splashes), `'snow'` (turning flakes that drift) or `'wind'` (gust lines that curl, with tumbling leaves). Rain and snow come with a cloud unless `cloud: false`. | Any paper sky, seasons, the water cycle, storms |
| `earth.river(t, o)` | `w, h, from, to, width, bends, land` | A river winding through a meadow box: narrow where it rises (`from`, `[u, v]` fractions of the box) and wide where it arrives (`to`), so it recedes into the distance; `width: [start, end]` in px. Sandy banks, current dashes and ripple chevrons running downstream, foam ringing rocks, reeds swaying. It flows in from its source on draw. `land: false` draws only the water and banks, to lay over your own ground; `from: [0, 0.3], to: [1, 0.55]` with similar widths gives a map-view river crossing the box. | Rivers, erosion, settlements by water, trade routes, watersheds |
| `earth.volcano(t, o)` | `w, h, erupt, wind, plume` | A cone standing on the ground at (`x`, `y`) with a glowing crater, lava runs creeping down its face, a plume of rough smoke puffs that swell and drift downwind, and embers arcing from the vent. `erupt: 0` is a quiet cone (cooled dark runs and a thin steam wisp); `wind` bends the plume (negative blows left). At `plume: 1` the smoke climbs about `1.4 h` above the crater, so lower `plume` where there is less sky. | Geology, plate tectonics, islands, climate, disasters |
| `earth.cave(t, o)` | `w, h, mouth, glow, bats` | A rock face filling its box, grass along the top, a ground line along the bottom, and a cave mouth that falls away into darkness in steps. Stalactites drip, vines sway at the edge, bats flit out now and then. `mouth` is the opening's share of the width; `glow: true` lights a flickering fire deep inside. | Early people, shelter, hidden places, "going inside" hand-offs (`lensIn` into the dark) |
| `earth.dunes(t, o)` | `w, h, rows, wind` | Desert dunes in rows that pale with distance: long windward slopes, shaded crescent slip faces, sand ripples creeping downwind and sand blowing off the crests. `wind: -1` turns every dune the other way. Reveals left to right. | Deserts, wind, climate, caravans, erosion |
| `earth.iceberg(t, o)` | `w, h, size, above, sea` | An iceberg afloat with (`x`, `y`) the middle of the waterline: a faceted peak above water and a much larger mass below, bobbing and tilting together. The submerged mass has its own facets, ice striations, trapped air and hatching that darkens with depth until the water swallows it, and it shifts sideways in the first few px under the surface, the way refraction bends it. Foam laps at the waterline, bubbles rise, a floe drifts past. `w, h` is the water box (centred on `x`, below `y`); `sea: false` leaves the water out; `size` is the width at the waterline, `above` the peak's height. | Climate, "the hidden part", scale, polar seas, the Titanic |
| `earth.flowers(t, o)` | `w, h, n, kinds` | A patch of flowers on a grassy ground line (anchor: its left end): stems grow and heads pop open on draw, then sway; now and then a petal drifts off. `kinds`: any of `'daisy'`, `'tulip'`, `'poppy'`, `'bell'`; `h` is the tallest stem. | Spring, pollination (with `life.insect`), gardens, growth, foregrounds |

## KIT.life: animals, people and crowds (paper; all work at night)

Walkers (`quadruped`, `figure`, walking `insect`s) take `walk`, their ground speed in px/s before scale, or `dist`, the distance walked so far (use it for eased moves: `dist: kf(t, …)`). The gait is timed to that speed, so move the component's `x` by the same amount times `s` (`x: x0 + walk * s * t`) and the feet stay planted; with `dir: -1` (or `rot: Math.PI` for insects) move it the other way. Seeds pick coats, clothes, skin and hair.

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `life.quadruped(t, o)` | `kind, walk, dist, moving, dir, fill, antlers, look, shape` | A four-legged animal standing on the ground at (`x`, `y`): `kind` is `'deer'` (antlers, white rump), `'dog'`, `'horse'` (its own long-muzzled profile, a mane lying along the neck, a long tail) or `'fox'` (bushy tail); `shape: { L, H, leg, neck, hl, hh }` changes the proportions for other animals. Walking, the legs step in a lateral sequence with the body bobbing and the head nodding; idle, it breathes, looks about, flicks its ears and swishes or wags its tail. `look` lifts the head (radians); `moving` (0..1) eases between standing and walking. Deer and horse stand about 150–190 px tall at `s: 1`. | Ecology, farming, domestication, migration, pets |
| `life.fishSchool(t, o)` | `w, h, n, speed, size, spread, fill` | A school swimming a looping figure-eight inside its box: each fish follows the leader's path a little late, keeps its place in the school, wanders a little and beats its tail; a few have orange fins, and bubbles rise. The loop shrinks to keep the whole school in the box, so give it room. Looks best over water (your own, or `earth.sea` with the school drawn after it). | Oceans, rivers, food webs, collective behaviour |
| `life.insect(t, o)` | `kind, walk, dist, fly, fill` | A small insect seen from above, centred on its body and facing right (turn it with `rot`): `'beetle'`, `'ladybug'` (lifts its wing cases now and then) and `'ant'` walk in alternating tripods at `walk` px/s and feel about with their antennae; `'bee'` and `'butterfly'` hover on beating wings (`fly: false` lands them). About 40 px long at `s: 1`; use `s: 1.5`–`4`. | Pollination, ecosystems, close-ups, "tiny workers" |
| `life.flock(t, o)` | `w, h, n, mode, speed, at, size` | Birds in a box of sky. `mode: 'v'` is a skein in V formation and `'line'` a loose diagonal line; both cross the box at `speed` px/s (0 holds them) with wings flapping out of step, fading at the box sides. `at` (0..1) sets where the leader starts. `'murmur'` is a murmuration: a few hundred starlings spread through a cloud with a dense ridge sweeping across it, so knots of birds fold and darken where they crowd together while the rim stays loose enough to read as single birds. `size` is the wingspan scale. | Any paper sky, migration, swarms, emergent behaviour |
| `life.figure(t, o)` | `pose, pose2, blend, walk, dist, dir, aim, item, label, height, skin, shirt, pants, hair, hairStyle` | A pen-drawn person, about 170 px tall, standing on the ground at (`x`, `y`). `pose`: `'stand'` (breathing, weight shift, blinking), `'walk'` (a planted walk cycle with swinging arms), `'point'` (`aim` is the angle, positive up), `'hold'` (both hands forward, carrying `item`), `'wave'` or `'cheer'`. `pose2` + `blend` (0..1) ease one pose into another. `item`: `'box'`, `'book'`, `'sign'` (with `label`), `'ball'`, or a function `(t, hx, hy)` drawn at the hands, unmirrored even with `dir: -1`. | People, users, workers, "someone explains", history |
| `life.crowd(t, o)` | `w, n, rows, mode, speed, size` | Many small gesture people in rows (anchor: the front row's left end on the ground), back rows higher, smaller and paler, each with its own colours, sway and head turns. `mode`: `'idle'` (some wave now and then), `'cheer'` (arms up, bouncing) or `'walk'` (everyone walks right at `speed`, fading at the ends). `size` is a figure's height (default 64). Cheap enough for 100+ figures. | Populations, audiences, cities, protests, markets, "everyone" |

## KIT.tech: software and hardware (paper)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `tech.terminal(t, o)` | `w, h, lines, title, cps, t0, loop, size` | A dark terminal window. Lines starting with `$ ` are typed as commands; other lines print as output (`✓ …` green, `✗ …` or `! …` pink). The cursor blinks and the view scrolls when lines overflow. `t0` delays the typing (the screen stays empty until then); `loop` (seconds) restarts it. | CLIs, builds, deploys, agents running tools |
| `tech.code(t, o)` | `w, lines, hl, size, title, t0` | A code card with line numbers and light syntax colour. A highlight bar steps through the lines and a caret blinks; `hl` pins it to a line index or a function `t => index` (clamped to the lines). Height follows the line count, and the call returns `{ h }` so you can place things under it. | Explaining a function, step-through execution, diffs |
| `tech.browser(t, o)` | `w, h, url, title` | A browser window with a spinning tab loader, an address bar that types the url, a sweeping loading bar, and a sketched page (nav, headline, button, image, cards) that scrolls gently. | The web, web design, apps, "a user visits…" |
| `tech.rack(t, o)` | `units` | A server rack standing on the floor at (`x`, `y`). Units slide in; power, activity and network lights blink; cables sway. | Data centres, the cloud, scaling, infrastructure |
| `tech.circuit(t, o)` | `w, h, label, pins` | A green board with a central chip, fanned copper traces ending in vias, a few parts, and pulses running along the traces. `pins: [perSide, perEnd]` (1 or more each). | Chips, hardware, AI accelerators, signals |
| `tech.cursor(t, o)` | `path, period` | A mouse pointer hopping between the points of `path` (relative to `x`, `y`) and clicking with a ripple at each stop. Draw it last so it sits on top. | Pointing at anything in a UI, demos |

## KIT.ai: models and agents (night by default)

These draw for the night world; pass `dark: false` to use them on paper.

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `ai.network(t, o)` | `w, h, layers, speed, labels` | A layered neural network. A wave of signals runs from the first layer to the last, lighting nodes as it arrives, then starts again. `layers: [3, 5, 5, 2]`; `labels` adds one caption per layer. | How models compute, training, inference |
| `ai.agent(t, o)` | `tools, R, spread, period, name` | An agent node that calls tools in turn: a request arrow goes out, the tool works, and a dashed response comes back carrying a result chip. Anchor: the agent's centre; tools fan out to the right. `tools`: names or `{ name, icon }` (icons `search`, `code`, `files`, `web`, `db`). | Agents, tool use, orchestration, APIs |
| `ai.chat(t, o)` | `w, msgs, t0, size` | A chat thread growing downward. User bubbles pop in on the right; the assistant shows typing dots, then its reply types on. After the last message the typing dots keep bouncing. `msgs: [{ who: 'user' \| 'ai', text }]`. Returns `{ h }`, the full thread height: about `size × 1.32` per wrapped line plus 38 px per message, plus 48 px for the typing bubble; replies wrap at 70% of `w`. | Assistants, conversations, prompts |
| `ai.tokens(t, o)` | `w, words, rate, t0, loop, size` | A model writing: token chips pop onto a line (it slides left when full) with their ids underneath, and a panel shows the candidate next tokens and their odds. Leading spaces show as `·`. | Tokenisation, generation, sampling |
| `ai.attention(t, o)` | `w, words, period, focus` | Self-attention over a sentence: each period one word is the query, arcs to the other words swell by weight, and the key words underline by weight. `focus` pins the query word. | Transformers, context, "what the model looks at" |
| `ai.motes(t, o)` | `w, h, n, speed` | A drifting crowd of data specks (dots, bits, dashes), nearer ones bigger and faster. A back layer that gives a night plate the crowd it needs to register as moving. | Backdrops for any digital or night plate |

## KIT.space: sky and cosmos (night by default)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `space.stars(t, o)` | `w, h, n, drift, shooting` | A star field that twinkles and drifts (bigger stars move faster, for depth), with sparkles on bright stars and a shooting star every few seconds. Works as a full-frame backdrop (`x: -40, y: -40, w: W + 80, h: H + 80`). | Any night sky; the back layer of space plates |
| `space.planet(t, o)` | `r, fill, band, rings, tilt, moon` | A banded planet with a shaded night side, drifting bands and a storm spot, optional rings split so the front half passes in front, ring particles circling, and a small moon orbiting behind and in front. Anchor: the centre. | Planets, scale comparisons, exploration |
| `space.orbits(t, o)` | `radii, tilt, speed, sizes, colors` | A star with bodies on tilted orbits, each at its own pace (farther is slower), trailing a short arc and passing behind and in front of the star. Anchor: the star. | Solar systems, orbital mechanics, atoms as a metaphor |
| `space.comet(t, o)` | `len, ang` | A comet head with a glowing coma and a flickering, streaming tail with dust. `ang` is the direction the tail points. Anchor: the head. | Comets, meteors, anything streaking across a night plate |
| `space.telescope(t, o)` | `aim, flip, beam` | A refractor on a tripod that slowly scans the sky, with a lens glint and a faint sight line. Anchor: the ground under the tripod. It points right, or left with `flip: true`; `aim` is the tube angle (negative is up). | Astronomy, observation, discovery |

## KIT.lab: science bench (paper; cell and molecule also work at night)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `lab.flask(t, o)` | `kind, level, fill, bubbles, steam, label` | Glassware: `kind` is `'beaker'` (with graduations), `'flask'` or `'tube'`. The liquid pours in on draw, its surface moves, bubbles rise, and `steam: true` adds wisps. Anchor: the base. | Chemistry, experiments, mixing, reactions |
| `lab.cell(t, o)` | `r` | A eukaryotic cell: the membrane breathes, the nucleus turns slowly, mitochondria, ER, Golgi, ribosomes and vesicles drift. Organelles pop in after the membrane. Anchor: the centre. | Biology, medicine, microscopic plates |
| `lab.molecule(t, o)` | `preset, atoms, bonds, unit, spin, labels` | A ball-and-stick model turning in 3-D, re-sorted by depth every frame. Presets: `water`, `co2`, `methane`, `ethanol`, `benzene`; or pass `atoms: [[el, x, y, z], …]` (Å) and `bonds: [[i, j, order], …]`. `unit` is pixels per Å. Anchor: the centre. | Chemistry, materials, drugs, "zoom into the substance" |
| `lab.microscope(t, o)` | (none) | A light microscope. The focus knob turns back and forth, the tube moves with it, and the lamp flickers its beam up through the slide. Anchor: the bench under it. | The hand-off into a microscopic plate (`lensIn` from its eyepiece or slide) |
| `lab.pipette(t, o)` | `fall, period, fill, dish` | A dropper: the bulb squeezes, a drop swells at the tip, falls `fall` px and lands in a dish with a ripple, over and over. Anchor: the tip. `dish: false` drops onto your own surface. | Samples, dosing, titration, "one drop" moments |

## KIT.studio: art and design (paper)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `studio.easel(t, o)` | `paint` | A wooden easel with a canvas whose small landscape paints itself on (`paint` 0..1 fixes the progress; by default it follows `draw`). Painted clouds drift, the sun pulses, the lake glints. Anchor: the floor. | Art, creativity, making things |
| `studio.brush(t, o)` | `path, color, width, period, paint` | A brush painting a stroke along `path` (relative to `x`, `y`) with bristle streaks and a wet sheen; it lifts away and repaints every `period`. `paint` fixes the progress instead of looping. | Underlines, emphasis, painting, "drawing a line" |
| `studio.swatches(t, o)` | `colors, cols, period` | Paint chips with names and hex codes. Each period one chip lifts, gets a selection ring, and an eyedropper moves to it. `colors: [[name, hex], …]`. | Colour, branding, palettes, design systems |
| `studio.wireframe(t, o)` | `w, h, label, period` | An artboard with 12-column guides, a baseline grid and greyed layout blocks. A selection box with handles and a size badge hops between blocks, with a spacing marker. | Web and product design, layout, grids |
| `studio.penTool(t, o)` | `anchors, period` | A Bézier path being edited: handles swing so the curve reshapes, the active anchor changes each period with the pen-nib cursor beside it, and a dashed rubber band previews the next segment. `anchors: [[x, y, hx, hy], …]`. | Vector graphics, curves, illustration, "how shapes are drawn" |

## Using a component in a plate

```js
const P2 = {
  dur: 7, dark: true, enter: { type: 'lensIn', dur: 0.6 },
  header: { num: 2, title: 'Calling tools', sub: 'the agent asks, the tool answers' },
  draw(t) {
    KIT.ai.motes(t, { x: -40, y: -40, w: W + 80, h: H + 80, n: 180 });
    KIT.ai.agent(t, { x: 620, y: 560, tools: ['search', { name: 'repo', icon: 'files' }], draw: E.inOut2(inv(0.3, 1.6, t)) });
    withAlpha(beat(t, 3, 6.5), () => KIT.tech.terminal(t - 3, { x: 1150, y: 420, w: 600, h: 300, dark: true, t0: 0.3, lines: ['$ grep -r parseDate', 'src/date.ts:41'] }));
  },
};
```

Notes:

- Pass a shifted clock (`t - 3`) when a component should start later; its typing and cycles start from zero. (`dark: true` on the terminal above only turns its outline pale; the screen is dark in both worlds.)
- Animate positions (`x`, `y`, `s`, `rot`, `alpha`, `draw`), not the options that shape the geometry (`w`, `h`, `n`, `layers`, `r`, `path`, `words`…). Geometry is cached per option set (`KIT.memo`, capped at 256 entries), so a value that changes every frame recomputes the layout every frame and churns the cache.
- Wrap components in `withAlpha(beat(...))` to make them leave, like any other beat.
- Keep components out of the header, journey log and stage-dial regions (`references/style.md`, "Plate furniture").
- `story_gallery.js` is a specimen sheet. A film should place a few components inside a scene built for its topic, not lay them out in a grid.

## Growing the kits

The kits should grow with every film. When you build a reusable piece in a story (a DNA helix, a phone, a database table), do this:

1. **Write it as a kit component from the start:** a function `(t, o)` that calls `KIT.opts(o, { defaults })` and draws inside `KIT.at(o, () => …)` in local coordinates. Support `draw` (use `KIT.ph(draw, a, b)` to sequence its parts), give it idle motion driven by `t`, and take a `seed`.
2. **Stay deterministic:** no `Math.random` or `Date`. Use `mulberry(seed)` for layouts and `hash3()` for per-frame values, and cache layouts with `KIT.memo(key, () => …)`, including in the key every option the cached value depends on (sizes, counts, and `dark` if colours are cached).
3. **Honour `dark`:** pass `color: KIT.inkOf(o.dark)` to every `pen`/`ink` outline, skip `KIT.shadow` on night plates, and check the component on both worlds.
4. **Match the style:** build only from engine primitives (`pen` for subjects, `ink` for measurement, `hatch`/`shade`/`stipple` for texture, no gradients), and use two textures on any fill wider than 200 px. Add colours with `Object.assign(PAL, { kitName: '#…' })` using the kit's prefix.
5. **Keep names private:** put helpers inside the kit's wrapper function, never at the top level, because the engine, kits and story share one global scope. Don't depend on another kit's colours or helpers.
6. **Propose it back:** tell the user the piece is a candidate for the plugin, and name the kit it belongs in (or a new kit file, `toolkit/kits/<kit>.js`, which `build.py` picks up automatically). When adding it to the plugin, also add it to `story_gallery.js` and to this catalogue, then render the gallery and check it on both worlds.

The shared helpers in `kits/_kit.js` are `KIT.memo`, `KIT.opts`, `KIT.at`, `KIT.lw` (line width under scale), `KIT.ph`/`KIT.pop` (draw-on phases), `KIT.cyc` (repeating cycles), `KIT.rrect`, `KIT.ribbon`, `KIT.offset`, `KIT.cubic`, `KIT.rot`, `KIT.shadow`, `KIT.caption`, `KIT.inkOf` and `KIT.mutedOf`.
