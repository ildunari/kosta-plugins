# Animation principles: flow inside a scene

Read this while writing the scene script and again while building each plate. An experienced animator applies these without thinking; a model has to apply them on purpose. They are about how motion flows **within** a plate and from one animation to the next. Seams and camera cuts between plates are covered in `references/film-grammar.md`; speed shapes and the speed limits are in `references/motion.md`.

These are principles for judgement, not fixed numbers. The figures below are typical starting points taken from hand-drawn practice at 12 drawings a second. Each film picks its own values, and a plate can break a principle on purpose when the story asks for it (a hard stop for a shock, everything moving at once for an explosion). Break them knowingly, not by default.

**The unit is the drawing.** The engine works on twos: one drawing is held for two frames, so one drawing is 1/12 s ≈ 0.083 s. Offsets smaller than a drawing are invisible (two starts 0.03 s apart land on the same drawing), so think in drawings: 1 drawing ≈ 0.08 s, 3 ≈ 0.25 s, 6 = 0.5 s, 12 = 1 s.

## 1. Overlapping action and follow-through

**Why.** Real things are not rigid. When a body moves, its loose parts (a tail, a cable, a label on a string, a cloud of particles around it) start later and stop later. When the main mass stops, those parts carry on, overshoot and settle. A move where every part starts and stops on the same drawing reads as a cut-out sliding across the page.

**How here.** Drive the main mass with one timing and the loose parts with the same move shifted 1–3 drawings later, or with a spring on top. `E.spring(k)` and `E.outElastic` give a settle with overshoot; a decaying sine gives a wobble. Overlapping action also works between separate beats: let the previous animation still be settling (the last 10–30% of its release) when the next one starts, so there is never a dead drawing between them.

```js
// don't: body and tail start and stop together, then freeze
const x = kf(t, [[1.0, 300], [2.2, 1100]], E.arrive);
drawFish(x, 540, { tail: 0 });

// do: the tail follows the body a few drawings late, then keeps swinging and settles
const x    = kf(t, [[1.0, 300], [2.2, 1100]], E.arrive);
const xLag = kf(t, [[1.17, 300], [2.45, 1100]], E.arrive);        // same move, 2 drawings behind
const settle = 1 - inv(2.2, 3.6, t);                                // dies away after the body lands
const tail = (x - xLag) * 0.004 + 0.25 * settle * Math.sin((t - 2.2) * 9);
drawFish(x, 540, { tail });
```

Names like `drawFish`, `drawNode`, `drawCell`, `drawSpeck` and `dot` in these snippets stand for your own story's drawing helpers; everything else is engine API (`references/api.md`). For something that lands, give its scale a spring: `curve(t, [[2.0, 0.6], [2.6, 1, E.spring(1)]])`.

## 2. Stagger instead of unison

**Why.** Twelve objects that appear on the same drawing read as one flat event, and the eye has nowhere to go. Staggered starts give the eye a path through the group and make it feel made by hand.

**How here.** `stagger(i, t, { t0, step, dur, ease })`. Typical offsets:

| Between | Offset |
|---|---|
| Items in one group (dots, bars, list rows) | 1–2 drawings (`step: 0.05–0.15`) |
| A main action and its secondary action | 3–6 drawings (0.25–0.5 s) |
| Two separate ideas in the same plate | 0.8–2 s, or wait until the first has landed |

Order the stagger along a direction the eye can follow (left to right, outward from the hero, along the flow), not in array order. Uniform steps look mechanical in large groups; add a little seeded jitter.

```js
// don't: every node pops on the same drawing
nodes.forEach(n => withAlpha(beat(t, 2.0), () => drawNode(n)));

// do: nodes arrive outward from the hero, a drawing or so apart, with seeded jitter
nodes.forEach((n, i) => {
  const t0 = 2.0 + n.distFromHero * 0.0015 + 0.05 * hash3(i, 3, 1);
  const a = stagger(0, t, { t0, dur: 0.45, ease: E.outBack });
  withAlpha(a, () => drawNode(n, { s: 0.6 + 0.4 * a }));
});
```

## 3. Hand-offs: what finishes leads to what starts

**Why.** Eye trace (see `references/film-grammar.md`) applies inside a plate too. The viewer is looking where the last motion ended. If the next thing starts on the other side of the frame with no link, they miss its start and the plate feels like a list of events.

**How here.** Make each animation end where the next begins, or point at it. The link can be:
- **position**: a `flow` dash arrives at a node, and the node pulses and its callout starts there;
- **direction**: a moving thing exits towards the next element, and the next element enters moving the same way;
- **colour**: a drop of the accent colour travels to the part that turns that colour;
- **shape**: a circle that shrinks becomes the dot a callout's leader starts from.

```js
// don't: the stat appears top right while the eye is at the particle, bottom left
withAlpha(beat(t, 4.0, 9.0), () => stat(t - 4.0, { x: 1400, y: 160, value: '≈ 40%', note: 'absorbed' }));

// do: the particle reaches the membrane at 3.6 s; the membrane flashes there,
// a leader draws from that point, and the callout starts as the flash peaks
const hit = 3.6, [hx, hy] = along(route, 1);
withAlpha(1 - inv(hit, hit + 0.8, t), () => ink(shape.circle(hx, hy, 14 + 40 * inv(hit, hit + 0.8, t)), { closed: true, w: 2 }));
withAlpha(beat(t, hit + 0.15, 9.0), () => callout(t - hit - 0.15, { ax: hx, ay: hy, ex: hx + 160, ey: hy - 120, x2: hx + 220, title: 'crosses the membrane', sub: '≈ 40% gets through' }));
```

## 4. Moving holds, not dead stops

**Why.** A drawing that stops completely looks switched off, even with the engine's boil and grain. Animators hold a pose with a little life in it (a breath, a sway, a slow drift), so the character is resting, not frozen.

**How here.** When a keyframed move ends, keep a small motion running: a `wander` offset of 2–6 px (10–15 px on night plates), a slow scale breath of 1–3%, a slow turn, flow still running through it. Fade the hold motion **in** as the move lands, so the arrival and the hold join without a seam.

```js
// don't: the value reaches 900 at 2.2 s and never changes again
const x = kf(t, [[1.0, 300], [2.2, 900]], E.arrive);

// do: the hold keeps breathing, and the breathing grows in as the move lands
const x = kf(t, [[1.0, 300], [2.2, 900]], E.arrive);
const live = inv(1.8, 2.8, t), [wx, wy] = wander(0, t, 4, 0.5, 11);
const s = 1 + 0.02 * live * Math.sin(t * 1.4);
drawCell(x + wx * live, 540 + wy * live, s);
```

## 5. Arcs, not straight lines

**Why.** Living and thrown things travel on curves. A straight path between two points reads as mechanical, and a straight path with easing reads as a slide.

**How here.** Build the path with a bulge, or draw it as a curve and move along it with `along`. A shallow arc (bulge 5–15% of the distance) is enough; a thrown or jumping object gets a real one. Arc turns and morphs too: rotate a little in the direction of travel.

```js
// don't: a straight slide
const [x, y] = kf(t, [[1, [300, 700]], [2.4, [1200, 600]]], E.arrive);

// do: the same move on an arc, tilting into the turn
const u = E.arrive(inv(1, 2.4, t));
const x = lerp(300, 1200, u), y = lerp(700, 600, u) - 140 * Math.sin(Math.PI * u);
const rot = 0.25 * Math.cos(Math.PI * u);
// or: const [x, y] = along(smooth([[300, 700], [750, 460], [1200, 600]], 3), u);
```

## 6. Anticipation

**Why.** A small move the other way before a big move tells the viewer something is about to happen and where to look, so they don't miss the start. Without it, fast moves appear to start from nowhere.

**How here.** Before a launch, a jump, a big scale change or a fast exit, pull back 5–15% of the travel over 3–5 drawings (0.25–0.4 s), then go. `E.anticipate` and `E.inBack` build it into one easing; a `curve` with a small reverse segment gives more control. Small moves don't need it; anticipating everything makes the film twitchy. The engine already anticipates lens transitions (the ring that locks onto the hero).

```js
// don't: the probe shoots right from rest on the first drawing
const x = kf(t, [[3.0, 400], [3.6, 1500]], E.out3);

// do: it pulls back, holds for a drawing, then launches
const x = curve(t, [[3.0, 400], [3.3, 330, 'out2'], [3.38, 330], [4.0, 1500, E.shaped(0.35, 2, 3)]]);
```

## 7. One main motion; secondary motion supports it

**Why.** The eye follows one thing at a time. If the hero moves, the camera swings, a callout types and a chart draws all at once, the viewer reads none of them. Secondary motion (grass swaying as the ladybug walks, bubbles trailing a diver) makes the main action richer only while it stays secondary.

**How here.**
- At any moment, pick the lead: the thing the viewer should be watching. Everything else is secondary: smaller amplitude (half or less), slower or finer, lower contrast, or already running as ambient life.
- Don't start a text beat while a big move is running; start it as the move lands (the staging rule in `references/film-grammar.md`).
- Secondary motion should be caused by the main one where possible: particles pushed aside by the hero, a wake behind it, a node that lights as the pulse passes.
- The ambient life every plate needs (`references/motion.md`, "Keep every drawing alive") is secondary by definition. Keep it below the lead in amplitude and contrast.

```js
// don't: the camera pans, the hero dives and the chart draws on in the same second
// do: the chart draws while the hero drifts slowly; the dive comes after the chart has landed,
//     and the plankton only sway, pushed aside as the hero passes
const [hx, hy] = along(heroRoute, E.arrive(inv(6.0, 8.5, t)));      // the dive starts once the chart is up
plankton.forEach(([px, py], i) => {
  const push = Math.max(0, 1 - Math.hypot(px - hx, py - hy) / 180);  // stronger near the hero
  const [wx, wy] = wander(i, t, 3 + 10 * push, 0.6, 5);
  drawSpeck(px + wx, py + wy);
});
```

## 8. Slow in, slow out, and shaped speed

Ease every start and stop, and make the ease asymmetric: arrivals attack fast and release long (`E.arrive`, or `E.shaped(a, pIn, pOut)` with `a` below 0.5), departures build and finish quickly (`E.depart`). Symmetric eases on every move make a film feel uniformly slow. `references/motion.md` ("Easing" and "Pacing a transition") has the details and the easing list; the same rules apply to moves inside a plate. Nothing moves linearly except flow, scrolling and drift.

## 9. Joining motion that is already running

**Why.** A plate is never still (the engine and your ambient motion keep it alive), so a new animation always joins something already moving. If it pops in beside the running scene, stands still and then starts, it looks pasted on.

**How here.**
- **Enter on a beat of existing motion**: when a flow dash arrives, when the hero passes, at the peak of a sway, on a sound cue. Pick the start time from the running motion, not a round number.
- **Inherit direction and speed.** Something that joins a stream enters moving at the stream's speed and eases to its own; something that joins the hero's path picks up the hero's heading. `E.inFrom(v0)` and `E.whip(v0)` start a move already moving; `motionOf(plate, t)` and `travelOf(plate, t)` give the current velocity.
- **Grow in, don't appear.** Draw it on (`ink(pts, { draw })`, `pen(pts, { draw })`), scale it up from a point, or let it arrive from off the edge, while it is already moving.
- **Never start from a dead scene.** If the plate has gone quiet, wake it first (a ripple, a flicker, the hero turning), then bring in the new element on that motion.

```js
// don't: the new particle appears at its spot, still, then starts moving a second later
withAlpha(beat(t, 5.0), () => dot(x0 + 60 * inv(6.0, 7.0, t), y0));

// do: it arrives with the current, already moving at the stream's speed, and grows in
const v = 60, t0 = 5.0, e = inv(t0, t0 + 0.5, t);
withAlpha(e, () => dot(x0 - 40 + v * (t - t0), y0 + wander(7, t, 3)[1], { r: 6 * E.outBack(e) }));
```

## 10. Timing, spacing and rhythm on twos

**Timing** is how many drawings a move takes; **spacing** is how far the thing travels between drawings. Close spacing at the ends of a move reads as easing; wide spacing in the middle reads as speed. Look at the spacing on a range sheet: evenly spaced positions mean a linear, mechanical move.

- **On twos, big jumps strobe.** A move of more than about 150 px per drawing splits into separate copies. Shorten the travel, add speed lines or a smear, or ask for ones during that move (`ones: t => t > 3 && t < 3.6`).
- **Small things move fast, big things move slowly.** A dot can cross the frame in 6 drawings; a landscape takes seconds.
- **Holds are timing too.** A pose held for 4–8 drawings (with a moving hold) lets the eye land before the next action.
- **Rhythm across a scene.** Contrast fast and slow: a quick accent (3–6 drawings) followed by a slow stretch (1.5–3 s), a burst of staggered pops and then one slow draw-on. If every beat enters over 0.4 s with the same ease, the plate drones, however well each beat is made. Vary length, ease and energy from beat to beat, as `references/film-grammar.md` asks from seam to seam.

## Things that are acted on change

**Why.** When something is pressed, heated, filled, emptied, cut or pushed, the viewer watches it to see what happens. If it comes out looking the way it went in, the film has told them nothing happened, whatever the caption says. The Slow Squeeze pressed a tablet and the tablet came out the same height; its gauges read the wrong value while the press was moving; its polymer chains were drawn over with new lines instead of turning; a jar that should have released drug stayed full. Every one of those was a still picture of a process the film was about.

**How here.**

- **Anything acted on changes visibly**, in at least one of shape, size, rotation, texture or colour, and **stays recognisable** while it does. A pressed tablet gets shorter and wider, its edges bulge, its surface texture tightens; it is still that tablet. A heated block reddens and its hatching loosens; a filled jar's level rises and its colour deepens; a cut rope parts and its ends fray and swing. Keep the outline's character (the same seed, the same line weight, the same features) so the viewer never wonders whether it is a new object.
- **The change follows the action's timing.** It starts when the action touches the object, eases with it (`E.arrive` for a press landing, a slower ease for heat soaking in), and has follow-through: a little overshoot and settle, a spring back, a crack that keeps spreading after the blow (sections 1 and 4 apply to the change as much as to the move).
- **Key characters evolve over the film.** The hero and any second character carry a visible history: the corona builds up, the particle pits, the traveller's coat gets muddy, the letter picks up stamps. Drive the change from film progress or the journey log's quantities, not from a per-plate toggle, so it keeps its value across seams and reads as one thing going through a story.
- **Readouts agree with the action at every moment.** A gauge, a counter, a clock, a bar, a log row or the STATE switch shows the value the picture shows, on the same frame. Drive both from one variable: the needle and the press's travel from the same `kf`, the log's diameter from the same number that sizes the drawing, the STATE switch flipping on the frame the thing happens. A readout that jumps to its end value while the action is still moving, or never moves at all, is a wrong number on screen.
- **Transform in place; don't overdraw.** When chains align, move and bend the chains that are there (interpolate their points with `lerp` or `morphPose`) rather than drawing a new, aligned set on top of the old one. When a shape becomes another, morph it or cross it through a moment both share. Two drawings stacked in one place read as a mistake, not as a change.

```js
// don't: the press comes down and the tablet under it never changes;
//        the gauge reads its end value from the start
const press = kf(t, [[2.0, 0], [3.2, 1]], E.arrive);
drawPlaten(560 + 180 * press);
drawTablet(960, 780, { w: 220, h: 120 });
drawGauge(1500, 420, { value: 250 });

// do: one variable drives the platen, the tablet's shape and the gauge;
//     the tablet squashes and spreads (roughly keeping its volume), bulges at the sides,
//     springs back a little as the press lifts, and its texture tightens
const press = curve(t, [[2.0, 0], [3.2, 1, E.arrive], [4.4, 1], [5.2, 0.85, E.spring(1)]]);
const h = lerp(120, 70, press), w = 220 * Math.sqrt(120 / h);
drawPlaten(560 + 180 * press);
drawTablet(960, 850 - h / 2, { w, h, bulge: 0.12 * press, hatchGap: lerp(9, 5, press), seed: 12 });
drawGauge(1500, 420, { value: 250 * press });

// don't: a new, aligned set of chains drawn over the tangled ones
chains.forEach(c => pen(c.tangled));
withAlpha(beat(t, 3.0), () => chains.forEach(c => pen(c.aligned)));

// do: each chain's own points move from tangled to aligned, staggered from the platen down
chains.forEach(c => {                                                // c.depth: 0 at the platen, rising downwards
  const u = stagger(c.depth, t, { t0: 2.2, step: 0.04, dur: 1.2, ease: E.arrive });
  pen(c.tangled.map((p, k) => [lerp(p[0], c.aligned[k][0], u), lerp(p[1], c.aligned[k][1], u)]), { seed: c.seed });
});
```

`drawPlaten`, `drawTablet` and `drawGauge` stand for your own story's helpers, as the names in the earlier sections do. Plan each change in the scene script's `Changes` column (`references/writing.md`), so the lane that draws the plate knows which object changes and how.

## Cohesive scene checklist

Run this on each plate's range sheet (a frame grid of the plate: `--sheet-range`, SKILL.md phase 4) and then at full speed.

1. **No dead drawings.** Every frame has at least one thing clearly moving, and no element sits perfectly still after its move (moving hold).
2. **Overlap.** Each beat starts while the previous one is still settling; no gap where nothing is happening between beats.
3. **Follow-through.** Things that stop overshoot or settle; loose parts lag the main mass.
4. **Stagger.** No group appears on a single drawing unless it is meant as one unit; the order gives the eye a path.
5. **Hand-offs.** Each new beat starts near where the eye was left, or the old motion points to it.
6. **Arcs.** Paths curve; nothing important slides on a straight line.
7. **Anticipation.** Big or fast moves have a small wind-up; small moves don't.
8. **Hierarchy.** At every moment there is one lead; secondary motion is smaller and supports it; text does not start during a big move.
9. **Joining.** New elements enter on a beat of running motion, in its direction, and grow in rather than pop in.
10. **Speed shape.** Starts and stops are eased and asymmetric; spacing on the sheet is close at the ends and wide in the middle.
11. **Rhythm.** The plate has both fast accents and slow stretches, and its beats don't all share one length and ease.
12. **Change.** Whatever the plate acts on visibly changes and stays recognisable; the hero shows its history; every readout agrees with the picture on every frame; nothing is overdrawn where it should have transformed.

If a plate fails an item, fix the motion before adding more content. More elements rarely fix a plate that doesn't flow.
