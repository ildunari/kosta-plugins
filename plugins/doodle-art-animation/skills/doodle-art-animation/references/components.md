# Component kits

Ready-made building blocks, drawn in the house style, that a story can use directly. They live in `toolkit/kits/`, and `build.py` inlines every file there between the engine and the story, so a story can call them with no setup. To see all of them moving, build `toolkit/story_gallery.js`.

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
| `dark` | `true` on night plates, so the ink turns pale. |

Every component keeps moving after it has drawn on, so a plate built from kit parts is never frozen. All of them are deterministic (no `Math.random`), cache their geometry, and add their colours to `PAL` under a kit prefix (`PAL.earthSea`, `PAL.techBoard` and so on). Override those colours with `Object.assign(PAL, {...})` like any other.

Components draw inside the plate's camera, so they zoom and pan with it. Draw them in `draw(t)`, not in `overlay(t)`.

## KIT.earth: landscapes and weather (paper)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `earth.sea(t, o)` | `w, h, waves, glint` | Open water seen from the side: flat teal, two hatch tones, a pen horizon at `y`. Foam strokes drift and bob; `glint: x` adds a flickering gold sun column. | Oceans, lakes, horizons, the base of a coast scene |
| `earth.coast(t, o)` | `w, h, side, land` | A map-view coastline: land with hill contour rings, a sand fringe, and surf lines that breathe along the shore. `side: 'right'` mirrors it; `land` is the land's share of the width. | Geography, erosion, maps, harbours |
| `earth.mountains(t, o)` | `w, h, n, bleed` | A range of `n` peaks with a paler back row, snowcaps, foothills, drifting mist and snow blowing off the tallest summit. Peaks stand on the box's bottom edge. `bleed: true` lets the back peaks run past the box. | Far scenery, climate, tectonics, a sky-line behind anything |
| `earth.forest(t, o)` | `w, h, n` | A row of round and pointed trees on a grassy ground line; they grow in one by one and sway. Anchor: the left end of the ground. `h` is the tallest tree. | Foregrounds, ecology, carbon, habitats |
| `earth.strata(t, o)` | `w, h, labels` | An underground cutaway: grass, topsoil with roots and a tunnelling worm, gravel, an aquifer with creeping groundwater, bedrock. Layers reveal top to bottom; `labels: false` hides the names. | Geology, groundwater, soil, mining, foundations |
| `earth.weather(t, o)` | `w, h, kind, n, cloud` | `kind: 'rain'` (streaks and splashes), `'snow'` (turning flakes that drift) or `'wind'` (gust lines that curl, with tumbling leaves). Rain and snow come with a cloud unless `cloud: false`. | Any paper sky, seasons, the water cycle, storms |

## KIT.tech: software and hardware (paper)

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `tech.terminal(t, o)` | `w, h, lines, title, cps, t0, loop, size` | A dark terminal window. Lines starting with `$ ` are typed as commands; other lines print as output (`✓ …` green, `✗ …` or `! …` pink). The cursor blinks and the view scrolls when lines overflow. `t0` delays the typing; `loop` (seconds) restarts it. | CLIs, builds, deploys, agents running tools |
| `tech.code(t, o)` | `w, lines, hl, size, title, t0` | A code card with line numbers and light syntax colour. A highlight bar steps through the lines and a caret blinks; `hl` pins it to a line index or a function `t => index`. Height follows the line count. | Explaining a function, step-through execution, diffs |
| `tech.browser(t, o)` | `w, h, url, title` | A browser window with a spinning tab loader, an address bar that types the url, a sweeping loading bar, and a sketched page (nav, headline, button, image, cards) that scrolls gently. | The web, web design, apps, "a user visits…" |
| `tech.rack(t, o)` | `units` | A server rack standing on the floor at (`x`, `y`). Units slide in; power, activity and network lights blink; cables sway. | Data centres, the cloud, scaling, infrastructure |
| `tech.circuit(t, o)` | `w, h, label, pins` | A green board with a central chip, fanned copper traces ending in vias, a few parts, and pulses running along the traces. `pins: [perSide, perEnd]`. | Chips, hardware, AI accelerators, signals |
| `tech.cursor(t, o)` | `path, period` | A mouse pointer hopping between the points of `path` (relative to `x`, `y`) and clicking with a ripple at each stop. Draw it last so it sits on top. | Pointing at anything in a UI, demos |

## KIT.ai: models and agents (night by default)

These draw for the night world; pass `dark: false` to use them on paper.

| Call | Own options | What it looks like and how it moves | Good for |
|---|---|---|---|
| `ai.network(t, o)` | `w, h, layers, speed, labels` | A layered neural network. A wave of signals runs from the first layer to the last, lighting nodes as it arrives, then starts again. `layers: [3, 5, 5, 2]`; `labels` adds one caption per layer. | How models compute, training, inference |
| `ai.agent(t, o)` | `tools, R, spread, period, name` | An agent node that calls tools in turn: a request arrow goes out, the tool works, and a dashed response comes back carrying a result chip. Anchor: the agent's centre; tools fan out to the right. `tools`: names or `{ name, icon }` (icons `search`, `code`, `files`, `web`, `db`). | Agents, tool use, orchestration, APIs |
| `ai.chat(t, o)` | `w, msgs, t0, size` | A chat thread growing downward. User bubbles pop in on the right; the assistant shows typing dots, then its reply types on. After the last message the typing dots keep bouncing. `msgs: [{ who: 'user' \| 'ai', text }]`. | Assistants, conversations, prompts |
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
    withAlpha(beat(t, 3, 6.5), () => KIT.tech.terminal(t - 3, { x: 1150, y: 420, w: 600, h: 300, dark: true, lines: ['$ grep -r parseDate', 'src/date.ts:41'] }));
  },
};
```

Notes:

- Pass a shifted clock (`t - 3`) when a component should start later; its typing and cycles start from zero.
- Wrap components in `withAlpha(beat(...))` to make them leave, like any other beat.
- Keep components out of the header, journey log and stage-dial regions (`references/style.md`, "Plate furniture").
- `story_gallery.js` is a specimen sheet. A film should place a few components inside a scene built for its topic, not lay them out in a grid.

## Growing the kits

The kits should grow with every film. When you build a reusable piece in a story (a DNA helix, a volcano, a phone, a database table), do this:

1. **Write it as a kit component from the start:** a function `(t, o)` that calls `KIT.opts(o, { defaults })` and draws inside `KIT.at(o, () => …)` in local coordinates. Support `draw` (use `KIT.ph(draw, a, b)` to sequence its parts), give it idle motion driven by `t`, and take a `seed`.
2. **Stay deterministic:** no `Math.random` or `Date`. Use `mulberry(seed)` for layouts and `hash3()` for per-frame values, and cache layouts with `KIT.memo(key, () => …)`, including every option that changes the geometry in the key.
3. **Match the style:** build only from engine primitives (`pen` for subjects, `ink` for measurement, `hatch`/`shade`/`stipple` for texture, no gradients), and use two textures on any fill wider than 200 px. Add colours with `Object.assign(PAL, { kitName: '#…' })` using the kit's prefix.
4. **Keep names private:** put helpers inside the kit's wrapper function, never at the top level, because the engine, kits and story share one global scope. Don't depend on another kit's colours or helpers.
5. **Propose it back:** tell the user the piece is a candidate for the plugin, and name the kit it belongs in (or a new kit file, `toolkit/kits/<kit>.js`, which `build.py` picks up automatically). When adding it to the plugin, also add it to `story_gallery.js` and to this catalogue, then render the gallery and check it.

The shared helpers in `kits/_kit.js` are `KIT.memo`, `KIT.opts`, `KIT.at`, `KIT.lw` (line width under scale), `KIT.ph`/`KIT.pop` (draw-on phases), `KIT.cyc` (repeating cycles), `KIT.rrect`, `KIT.ribbon`, `KIT.offset`, `KIT.cubic`, `KIT.rot`, `KIT.shadow`, `KIT.caption`, `KIT.inkOf` and `KIT.mutedOf`.
