/* =====================  STORY: Component Reel  ·  engine test  ===================== */
/* Every annotation component (card, logRuler, lineChart, insetLens, gather, fluxArrow, stat, callout) on plates that
   move: crane and push-in cameras, a tracking camera, a wide follow pan, momentum into zooms and lenses, a match cut
   with carried motion, and zoom / cut / lensIn / bleed / page / custom / lensOut / iris / roll seams.
   Components in overlay() must hold still while the scene moves; the same components inside draw() move with it.
   Build: python3 build.py story_components.js components.html */
Object.assign(PAL, { probe: '#e3a03c', probeDeep: '#a4521f', river: '#9ec4d3', vapour: '#cdd3ec' });
const HERO = 'PROBE·07';

/* ---------- shared scenery ---------- */
function ground(t, { x0 = -40, x1 = W + 40, y = 760, seed = 3, tint = '#d9c9a0' } = {}) {
  const r = shape.ridge(x0, x1, y, 46, seed), g = shape.band(r, H + 60);
  flat(g, tint); hatch(g, { alpha: 0.28, seed: seed + 1, angle: 0.35, gap: 8 });
  pen(r, { w: 4, seed: seed + 2, taper: 0.02 }); grass(r, { every: 44, seed, sway: 4 });
  return r;
}
function probe(x, y, s = 1, t = 0, dark = false) {                        // the hero: a small survey probe with a turning antenna
  const body = shape.blob(x, y, 34 * s, 7, 0.08, 40);
  ink(body, { closed: true, w: 3.2, fill: PAL.probe, seed: 71, color: dark ? PAL.nightInk : PAL.ink });
  if (!dark) shade(body, { color: PAL.probeDeep, seed: 72, alpha: 0.5 });
  const a = t * 1.6; pen([[x, y - 30 * s], [x + Math.cos(a) * 20 * s, y - 58 * s]], { w: 2.4, seed: 73, color: dark ? PAL.nightInk : PAL.ink });
  ink(shape.circle(x + Math.cos(a) * 20 * s, y - 58 * s, 5 * s, 12), { closed: true, w: 2, fill: PAL.accent, amp: 0.2, seed: 74 });
}
function cloud(x, y, seed) { lobedCloud(x, y, [[0, 60], [-80, 44], [76, 48], [20, 40, 26]], { seed }); }
function specks(t, n, seed, { cx = W / 2, cy = H / 2, rx = 800, ry = 420, amp = 12 } = {}) {   // night crowd that drifts
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) { const [dx, dy] = wander(i + seed, t, amp, 1.8), x = cx + (r() * 2 - 1) * rx + dx, y = cy + (r() * 2 - 1) * ry + dy, z = r();
    ink(shape.circle(x, y, 4 + z * 9, 12), { closed: true, w: 1 + z, color: PAL.nightInk, fill: PAL.navyFill, amp: 0.3, seed: i, alpha: 0.4 + 0.6 * z }); }
}

/* ---------- plate 0 · crane in: gather forms a ring, a stat counts up, a callout follows the moving probe ---------- */
const RING = Array.from({ length: 36 }, (_, i) => [1240 + Math.cos(i / 36 * TAU) * 150, 520 + Math.sin(i / 36 * TAU) * 150]);
const p0At = t => [lerp(820, 1240, E.inOutSine(clamp((t - 0.5) / 4.5))), 520 + 10 * Math.sin(t * 2)];
const C0 = {
  dur: 6.5, dark: false,
  header: { num: 0, title: 'Component Reel', sub: 'charts and cards on moving plates' }, stage: { n: 1, name: 'GATHER', prevN: 0 },
  cam: t => ({ x: W / 2, y: H * 0.55, s: kf(t, [[0, 1.12], [6.5, 1.0]]), dy: kf(t, [[0, -60], [6.5, 0]]) }),
  hero: t => { const [x, y] = p0At(t); return { x, y, label: HERO, r: 44 }; },
  cues: [[1.0, 'pop'], [2.6, 'chime', { f: 660 }], [3.2, 'scratch', { chars: 20 }]],
  draw(t) {
    cloud(420 + 10 * t, 420, 11); cloud(1500 - 8 * t, 330, 12);
    ground(t, { seed: 5 });
    flow([[80, 900], [700, 940], [1300, 910], [1880, 960]], t, { color: PAL.sea, w: 3 });
    for (const [x, y, u] of gather(RING, t, { t0: 1.0, dur: 1.4, spread: 520, seed: 4 }))   // the ring assembles, then breathes
      ink(shape.circle(x, y, 7 + 3 * u + 2 * Math.sin(t * 3 + x), 12), { closed: true, w: 1.8, fill: u >= 1 ? PAL.peri : PAL.vapour, amp: 0.3, seed: Math.round(x) });
    const [x, y] = p0At(t); probe(x, y, 1, t);
  },
  overlay(t) {
    withAlpha(beat(t, 1.2, 6.2), () => stat(t - 1.2, { x: 96, y: 420, kicker: 'SAMPLES GATHERED', value: u => countUp(36, u, 1.3), note: 'one ring, thirty-six points' }));
    const h = heroOf(C0, t);
    withAlpha(beat(t, 3.0), () => callout(t - 3.0, { ax: h.x, ay: h.y + 36, ex: h.x - 80, ey: 820, x2: h.x - 160, align: 'right', title: 'the probe', sub: 'moves while the camera cranes in' }));
  },
};

/* ---------- plate 1 · zoom in: a tracking camera on the probe; a card with a line chart holds still ---------- */
const PATH1 = [[300, 640], [700, 560], [1100, 620], [1500, 520], [1900, 600], [2300, 540], [2700, 600]];
const p1At = t => along(PATH1, E.inOutSine(clamp(t / 7.5)));
const S1 = [[0, 12], [1, 18], [2, 16], [3, 27], [4, 31], [5, 29], [6, 42], [7, 48], [8, 45], [9, 61], [10, 70]];
const S2 = [[0, 30], [1, 28], [2, 33], [3, 30], [4, 36], [5, 34], [6, 38], [7, 37], [8, 41], [9, 40], [10, 44]];
const C1 = {
  dur: 7.5, dark: false, enter: { type: 'zoom', dir: 'in', k: 6 },
  header: { num: 1, title: 'Tracking', sub: 'follow() with a card that must not move' }, stage: { n: 2, name: 'TRACK' },
  log: t => ({ title: `LOG · ${HERO}`, rows: [['DISTANCE', `${fmt(Math.round(lerp(0, 2400, t / 7.5)))} m`], ['SIGNAL', `${Math.round(lerp(12, 70, clamp(t / 6)))} %`]] }),
  cam: t => follow(p1At, t, { s: 1.1, lead: 200, anchor: [700, 620] }),
  hero: t => { const [x, y] = p1At(t); return { x, y, label: HERO, r: 44 }; },
  cues: [[1.2, 'pageFlip'], [2.0, 'scratch', { chars: 18 }], [4.0, 'chime', { f: 587 }]],   // the card opens: paper, not a pop
  draw(t) {
    const c = C1.cam(t);
    parallax(c, 0.2, () => { cloud(500, 380, 21); cloud(1300, 300, 22); cloud(2100, 360, 23); });
    ground(t, { x0: -1400, x1: 3800, y: 720, seed: 8 });
    ink(PATH1, { w: 2, dash: [3, 10], color: PAL.accent, amp: 0.2 });
    const [x, y] = p1At(t); probe(x, y, 1, t);
    for (let i = 0; i < 6; i++) { const u = ((t * 0.9 + i / 6) % 1), [px, py] = p1At(t - u * 0.8);   // dust trail behind the probe
      ink(shape.circle(px - 30, py + 34, 3 + u * 8, 10), { closed: true, w: 1.2, color: PAL.muted, alpha: 1 - u, amp: 0.3, seed: i }); }
  },
  overlay(t) {
    const k = card(t - 1.2, { x: 1000, y: 300, w: 860, h: 470, title: 'SIGNAL STRENGTH', fig: 'FIG. 1' });
    if (k > 0) lineChart(t - 1.5, { x: 1090, y: 380, w: 720, h: 300, xr: [0, 10], yr: [0, 80], xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 20, 40, 60, 80],
      xlab: 'TIME · MIN', ylab: 'SIGNAL · %', series: [
        { pts: S1, color: PAL.accent, draw: E.inOut3(inv(2.0, 4.6, t)), label: 'PROBE' },
        { pts: S2, color: PAL.sea, draw: E.inOut3(inv(2.6, 5.0, t)), label: 'BASELINE' }] });
    const h = heroOf(C1, t);
    withAlpha(beat(t, 5.2), () => callout(t - 5.2, { ax: h.x, ay: h.y + 36, ex: h.x + 60, ey: 880, x2: h.x + 120, title: 'still moving at the cut', sub: 'the next plate carries it' }));
  },
};

/* ---------- plate 2 · match cut: a wide follow pan along a river drawn as a flux arrow; a log ruler with marks near its end ---------- */
const WORLD = 3400;
const RIVER = [[-40, 700], [400, 720], [800, 690], [1200, 730], [1600, 710], [2000, 750], [2400, 730], [2800, 770], [3440, 760]];
const p2At = t => along(RIVER, 0.14 + 0.6 * E.inOutSine(clamp(t / 8)));
const C2 = {
  dur: 8, dark: false, enter: { type: 'cut' },
  header: { num: 2, title: 'Downstream', sub: 'match cut, carried motion, a follow pan' }, stage: { n: 3, name: 'RIVER' },
  cam: t => ({ x: W / 2, y: H / 2, s: 1, dx: -clamp(p2At(t - 0.4)[0] - 820, 0, WORLD - W) }),
  hero: t => { const [x, y] = p2At(t); return { x, y: y - 20, label: HERO, r: 40 }; },
  cues: [[1.6, 'scratch', { chars: 12 }], [3.0, 'pageFlip'], [5.0, 'chime', { f: 523 }]],
  draw(t) {
    const c = C2.cam(t);
    parallax(c, 0.15, () => { cloud(1400, 380, 31); cloud(2600, 340, 32); });
    parallax(c, 0.5, () => { const r = shape.ridge(-40, WORLD, 560, 60, 33, 0.003); flat(shape.band(r, 700), '#b9b48a', 0.8); ink(r, { w: 2, alpha: 0.7, seed: 34 }); });
    ground(t, { x0: -60, x1: WORLD + 60, y: 640, seed: 12, tint: '#e0d2ae' });
    fluxArrow(RIVER, { width: 30, draw: E.out3(inv(0.2, 2.0, t)), fill: PAL.river, seed: 35 });
    flow(RIVER, t, { speed: 150, gap: 90, len: 34, color: '#ffffff', w: 2.4, alpha: 0.9 });
    const [x, y] = p2At(t); probe(x, y - 20, 0.8, t);
  },
  overlay(t) {
    withAlpha(beat(t, 1.4, 5.6), () => stat(t - 1.4, { x: 1820, y: 400, align: 'right', kicker: 'FLOW RATE', value: u => '≈ ' + countUp(3.4, u, 1.3, 1) + ' m³/s', note: 'right-aligned near the edge' }));
    const k = card(t - 3.0, { x: 420, y: 830, w: 1460, h: 200, title: 'PARTICLE SIZE IN THE RIVER', fig: 'LOG SCALE' });   // room for two rows of 22 px marks
    if (k > 0) logRuler(t - 3.4, { x: 460, y: 960, w: 1360, min: 1e-7, max: 1, ticks: [[1e-6, '1 µm'], [1e-4, '100 µm'], [1e-2, '1 cm'], [1, '1 m']],
      marks: [{ v: 2e-6, label: 'CLAY' }, { v: 3e-4, label: 'SAND', color: PAL.accent }, { v: 0.05, label: 'PEBBLE' }, { v: 0.6, label: 'BOULDER, NEAR THE END', row: 1 }] });
  },
};

/* ---------- plate 3 · lens in (night): an inset lens and a dark card with a chart, while the camera turns ---------- */
const C3c = [900, 560];
const C3 = {
  dur: 7, dark: true, enter: { type: 'lensIn' },
  header: { num: 3, title: 'In the Water', sub: 'an inset lens and a dark chart' }, stage: { n: 4, name: 'INSIDE' },
  cam: t => ({ x: C3c[0], y: C3c[1], s: 1 + 0.08 * E.inOutSine(t / 7), rot: 0.07 * Math.sin(t * 0.45) }),
  hero: t => { const [dx, dy] = wander(3, t, 10, 1.4); return { x: C3c[0] + dx, y: C3c[1] + dy, label: HERO, r: 56 }; },
  cues: [[1.0, 'clink'], [1.4, 'readout', { chars: 20 }], [3.2, 'chime', { f: 440 }]],   // the lens opens: glass
  draw(t) {
    specks(t, 110, 41, { cx: 900, cy: 560, rx: 820, ry: 440 });
    const h = C3.hero(t); probe(h.x, h.y, 1, t, true);
  },
  overlay(t) {
    const h = heroOf(C3, t);
    withAlpha(beat(t, 1.0, 6.6), () => insetLens(t - 1.0, { cx: 380, cy: 560, r: 150, sx: h.x - 30, sy: h.y, label: 'CLOSE-UP · 40×', draw: u => {
      for (let i = 0; i < 9; i++) { const [dx, dy] = wander(i, t, 20, 1.2, 3), a = i / 9 * TAU;
        ink(shape.blob(Math.cos(a) * 80 + dx, Math.sin(a) * 60 + dy, 16, i, 0.3, 24), { closed: true, w: 2, color: PAL.nightInk, fill: PAL.mint, amp: 0.4, seed: i }); }
      probe(0, 20, 1.6, t, true); } }));
    const k = card(t - 2.0, { x: 1180, y: 600, w: 690, h: 400, dark: true, title: 'UPTAKE', fig: 'FIG. 2' });
    if (k > 0) lineChart(t - 2.3, { x: 1260, y: 680, w: 560, h: 220, xr: [0, 24], yr: [0, 100], xticks: [0, 6, 12, 18, 24], yticks: [0, 50, 100], xlab: 'HOURS', ylab: 'UPTAKE · %', dark: true,
      series: [{ pts: Array.from({ length: 25 }, (_, i) => [i, 100 * (1 - Math.exp(-i / 6))]), color: PAL.gold, draw: E.inOut3(inv(2.8, 5.0, t)), label: 'MEASURED' }] });
  },
};

/* ---------- plate 4 · bleed (paper): the same components inside draw() — they scale with the push-in on purpose ---------- */
const C4 = {
  dur: 7, dark: false, enter: { type: 'bleed' },
  header: { num: 4, title: 'Inside the Scene', sub: 'components drawn in the world scale with it' }, stage: { n: 5, name: 'WORLD' },
  cam: t => ({ x: 960, y: 560, s: 1 + 0.14 * E.inOutSine(clamp(t / 7)) }),
  hero: t => ({ x: 1500, y: 560 + 8 * Math.sin(t * 1.8), label: HERO, r: 40 }),
  cues: [[1.6, 'scratch', { chars: 16 }], [3.6, 'clink']],
  draw(t) {
    ground(t, { y: 800, seed: 17 });
    cloud(300 + 12 * t, 360, 51);
    const k = card(t - 1.4, { x: 180, y: 300, w: 900, h: 460, title: 'A CHART ON THE WALL', fig: 'IN draw()' });   // a chart that belongs to the world
    if (k > 0) lineChart(t - 1.7, { x: 270, y: 380, w: 760, h: 280, xr: [0, 5], yr: [0, 10], xticks: [0, 1, 2, 3, 4, 5], yticks: [0, 5, 10], xlab: 'DAYS', ylab: 'GROWTH',
      series: [{ pts: [[0, 1], [1, 2], [2, 3.5], [3, 5.5], [4, 7.8], [5, 9.4]], color: PAL.leaf, draw: E.inOut3(inv(2.0, 4.2, t)), label: 'SPROUT' }] });
    withAlpha(beat(t, 3.6), () => insetLens(t - 3.6, { cx: 1560, cy: 300, r: 110, sx: 1500, sy: 540, dark: false, label: 'ANTENNA', draw: () => probe(0, 60, 2.2, t) }));
    const h = C4.hero(t); probe(h.x, h.y, 1, t);
  },
  overlay(t) {
    withAlpha(beat(t, 4.6), () => stat(t - 4.6, { x: 1180, y: 900, kicker: 'OVERLAY STAT', value: u => countUp(128, u, 1.0) + ' px', note: 'this one should hold still' }));
  },
};

/* ---------- plate 5 · page turn: long labels near every edge ---------- */
const C5 = {
  dur: 6.5, dark: false, enter: { type: 'page' },
  header: { num: 5, title: 'Edges', sub: 'labels near the frame must stay inside it' }, stage: { n: 6, name: 'EDGES' },
  hero: t => ({ x: 1760, y: 640 + 10 * Math.sin(t * 2), label: HERO, r: 44 }),   // the same probe: its tag rides the right edge
  cues: [[1.2, 'pop'], [2.4, 'pop']],
  draw(t) {
    ground(t, { y: 780, seed: 23 });
    probe(1760, 640 + 10 * Math.sin(t * 2), 1, t);
    probe(160, 620, 0.8, t + 1);
    for (const [x, y, u] of gather(Array.from({ length: 24 }, (_, i) => [760 + (i % 8) * 50, 460 + Math.floor(i / 8) * 50]), t, { t0: 0.8, dur: 1.2, seed: 12 }))
      ink(shape.rect(x - 12, y - 12, 24, 24), { closed: true, w: 1.8, fill: u >= 1 ? PAL.gold : PAL.panel, amp: 0.5, seed: Math.round(x + y) });
  },
  overlay(t) {
    withAlpha(beat(t, 1.0), () => callout(t - 1.0, { ax: 1760, ay: 690, ex: 1800, ey: 860, x2: 1850, title: 'a right-edge callout with a long title', sub: 'it should turn around instead of leaving the frame' }));
    withAlpha(beat(t, 2.2), () => callout(t - 2.2, { ax: 160, ay: 660, ex: 120, ey: 520, x2: 80, align: 'right', title: 'left-edge callout, right-aligned', sub: 'same problem on the other side' }));
    // a title too long for one line wraps onto a second (22 px floor), so the card is 26 px taller than a one-line card
    const k = card(t - 3.0, { x: 620, y: 290, w: 560, h: 136, title: 'A VERY LONG CARD TITLE THAT MEETS ITS FIGURE LABEL', fig: 'FIG. 3 · SUPPLEMENTARY' });
    if (k > 0) text('card content', 650, 400, { kind: 'mono', size: 22, color: PAL.inkSoft, alpha: k });
  },
};

/* ---------- plate 6 · custom seam: the old grid scatters and gathers into a ring on the night plate ---------- */
const RING6 = Array.from({ length: 40 }, (_, i) => [960 + Math.cos(i / 40 * TAU) * 170, 540 + Math.sin(i / 40 * TAU) * 170]);
const C6 = {
  dur: 6.5, dark: true,
  enter: { type: 'custom', dur: 1.4, carry: false, draw(p, X) {
    X.drawOld();
    const r = softRevealR(p);
    softReveal(X.drawNew, 960, 540, r, 300);
    for (const [x, y, u] of gather(RING6, p, { t0: 0, dur: 0.6, spread: 700, seed: 21 }))
      withAlpha(1 - inv(0.85, 1, p), () => ink(shape.circle(x, y, 8, 12), { closed: true, w: 1.8, color: PAL.nightInk, fill: mixColor(PAL.gold, PAL.cyan, u), amp: 0.3, seed: Math.round(x) }));
    return clamp(r / coverR(960, 540));
  } },
  header: { num: 6, title: 'Gathered', sub: 'a custom seam built from gather()' }, stage: { n: 7, name: 'RING' },
  focus: () => [960, 540],
  cam: t => ({ x: 960, y: 540, s: 1.04 + 0.05 * E.inOutSine(clamp(t / 6.5)), rot: 0.05 * Math.sin(t * 0.4) }),
  cues: [[2.0, 'chime', { f: 392 }]],
  draw(t) {
    specks(t, 90, 61);
    const fl = [[200, 900], [600, 700], [960, 700], [1300, 820], [1700, 760]];
    fluxArrow(fl, { width: 26, draw: E.out3(inv(1.2, 3.0, t)), fill: PAL.navyFill, color: PAL.nightInk, seed: 62 });
    flow(fl, t, { color: PAL.cyan, alpha: 0.8 * inv(1.5, 3, t) });
    RING6.forEach(([x, y], i) => { const [dx, dy] = wander(i, t, 5, 1.5, 6); ink(shape.circle(x + dx, y + dy, 8, 12), { closed: true, w: 1.8, color: PAL.nightInk, fill: PAL.cyan, amp: 0.3, seed: Math.round(x) }); });
  },
  overlay(t) {
    withAlpha(beat(t, 2.4), () => stat(t - 2.4, { x: 1200, y: 360, kicker: 'RING', value: '40 points', note: 'every one landed on its mark', dark: true }));
  },
};
function softRevealR(p) { return zlerp(20, coverR(960, 540) + 300, E.inOut3(inv(0.35, 1, p))); }

/* ---------- plate 7 · lens out to paper; an overlay lens is open when the iris closes ---------- */
const C7 = {
  dur: 6.5, dark: false, enter: { type: 'lensOut' },
  header: { num: 7, title: 'Back Up', sub: 'a lens that is open across the next seam' }, stage: { n: 8, name: 'SURFACE' },
  hero: t => ({ x: 1100, y: 600 + 6 * Math.sin(t * 2), label: HERO, r: 40 }),
  cam: t => ({ x: 1100, y: 600, s: 1.02 + 0.05 * E.inOutSine(t / 6.5) }),
  cues: [[1.5, 'clink'], [3.0, 'scratch', { chars: 20 }]],
  draw(t) { ground(t, { y: 720, seed: 31 }); cloud(700 - 10 * t, 380, 71); const h = C7.hero(t); probe(h.x, h.y, 1, t); },
  overlay(t) {
    const h = heroOf(C7, t);
    withAlpha(beat(t, 1.5), () => insetLens(t - 1.5, { cx: 560, cy: 520, r: 170, sx: h.x - 20, sy: h.y, label: 'SENSOR HEAD', dark: true, draw: () => { probe(0, 30, 2.4, t, true); } }));
    const k = card(t - 2.6, { x: 1260, y: 820, w: 600, h: 180, title: 'DEPTH', fig: 'M' });
    if (k > 0) logRuler(t - 3.0, { x: 1290, y: 930, w: 540, min: 0.1, max: 1000, ticks: [[1, '1'], [10, '10'], [100, '100']], marks: [{ v: 0.3, label: 'NOW' }, { v: 600, label: 'FLOOR', color: PAL.accent }] });
  },
};

/* ---------- plate 8 · iris; plate 9 · roll to the end card ---------- */
const C8 = {
  dur: 5.5, dark: false, enter: { type: 'iris' },
  header: { num: 8, title: 'Summary', sub: 'stat, card and chart together' }, stage: { n: 9, name: 'SUMMARY' },
  hero: t => ({ x: 480, y: 600, label: HERO, r: 40 }),
  cues: [[1.0, 'pop'], [1.6, 'pageFlip']],
  draw(t) { ground(t, { y: 760, seed: 41 }); probe(480, 600 + 6 * Math.sin(t * 2), 1, t); cloud(1500 + 6 * t, 330, 81); },
  overlay(t) {
    withAlpha(beat(t, 1.0), () => stat(t - 1.0, { x: 96, y: 420, kicker: 'PLATES', value: '9', note: 'eight seams' }));
    const k = card(t - 1.6, { x: 900, y: 300, w: 900, h: 520, title: 'ALL SERIES', fig: 'FIG. 4' });
    if (k > 0) lineChart(t - 1.9, { x: 990, y: 380, w: 760, h: 340, xr: [0, 10], yr: [0, 80], xticks: [0, 5, 10], yticks: [0, 40, 80], xlab: 'TIME', ylab: 'VALUE',
      series: [{ pts: S1, color: PAL.accent, label: 'PROBE' }, { pts: S2, color: PAL.sea, label: 'BASELINE' }].map((s, i) => ({ ...s, draw: E.inOut3(inv(2.2 + i * 0.4, 3.8 + i * 0.4, t)) })) });
  },
};
const END = {
  dur: 4.5, dark: true, enter: { type: 'roll' }, counter: false, focus: () => [960, 480],
  draw(t) {
    for (let k = 0; k < 3; k++) { const q = ((t + k * 0.6) % 1.8) / 1.8; ink(shape.ellipse(960, 480, 80 + q * 380, (80 + q * 380) * 0.4, 0, 64), { closed: true, w: 2.4, color: '#b9bbef', alpha: 0.9 * (1 - q), amp: 0.5, seed: k }); }
    const q = 'Components, in motion.', qo = { kind: 'display', size: 60, italic: true, color: PAL.nightInk, cps: 22 };
    dropText(q, 960 - measure(q, qo) / 2, 700, t - 0.5, qo);
  },
};
defineStory({ title: 'Component Reel', stages: 9, music: { tonic: 220 }, plates: [C0, C1, C2, C3, C4, C5, C6, C7, C8, END],
  dynamics: [[0, -4], [6.5, -3.5], [22, -2.5], [36, -1], [42, 0], [43.5, 4], [48.5, 4], [50.5, 1], [65.5, 0]] });   // sound: a lift at the gathered ring (plate VI)
boot();
