/* =====================  STORY: One Drop  ·  worked example (engine v3.1)  ===================== */
/* Something moves in every drawing: camera crane, follow-pan with parallax, flowing water, swaying trees and grass,
   swirling molecules, droplets rising in layers, a falling drop with the world scrolling past, a coast cross-section
   recap, rippling end card. Transitions: pan → lensIn → zoom → shape → bleed → page. */
Object.assign(PAL, { soilTop: '#b98457', gravel: '#d8c9a6', aquifer: '#6d9aa6', drop: '#bfe0f0', hill: '#b9b48a',
  rock: '#b3ab9c', snow: '#f4f0e6', bark: '#6b4a32', leafDeep: '#3f6b3a', vapour: '#cdd3ec' });
const STATES = ['VAPOUR', 'LIQUID', 'ICE'];
const HERO = 'H₂O·01';
const CLOUD = [[0, 110], [-150, 80], [130, 90], [-260, 60], [240, 62], [60, 70, 40], [-80, 100], [-200, 50, 30], [190, 46, 36]];
const SMALL_CLOUD = [[0, 60], [-80, 44], [76, 48], [20, 40, 26]];
const WORLD = 3400;                                                            // the valley is wider than the frame
const RIVER = [[-40, 650], [420, 672], [760, 700], [1100, 690], [1500, 724], [1900, 740], [2300, 736], [2700, 770], [3100, 780], [3460, 790]];
const BUN = (cx, cy, s, wob = 0) => Array.from({ length: 48 }, (_, i) => { const a = i / 48 * TAU, x = Math.cos(a), y = Math.sin(a);
  return [cx + s * (1 + wob) * x * (y > 0 ? 1.08 : 1), cy + s * (1 - wob) * (y < 0 ? y : 0.38 * y - 0.12 * Math.max(0, 1 - Math.abs(x) * 1.6))]; });
const TEAR = (cx, cy, s) => [[cx, cy - 1.6 * s], [cx + 0.55 * s, cy - 0.7 * s], [cx + 0.95 * s, cy + 0.1 * s], [cx + 0.8 * s, cy + 0.75 * s], [cx, cy + 1.05 * s], [cx - 0.8 * s, cy + 0.75 * s], [cx - 0.95 * s, cy + 0.1 * s], [cx - 0.55 * s, cy - 0.7 * s]];

function sun(x, y, t, draw = 1) {
  const g = E.outBack(clamp(draw * 1.4)); if (g <= 0) return;
  const disc = shape.circle(x, y, 58 * g, 48);
  ink(disc, { closed: true, w: 3.4, fill: PAL.sun, seed: 70 }); crosshatch(disc, { color: '#a4521f', seed: 71, alpha: 0.4 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + t * 0.08, L = (i % 2 ? 26 : 44) * (1 + 0.12 * Math.sin(t * 2 + i)), q = stagger(i, draw, { t0: 0.4, step: 0.03, dur: 0.3 });
    pen([[x + Math.cos(a) * 74, y + Math.sin(a) * 74], [x + Math.cos(a) * (74 + L * q), y + Math.sin(a) * (74 + L * q)]], { w: 3.4, color: PAL.accent, seed: 80 + i, taper: 0.45, draw: q }); }
}
function hills(x0, x1) {                                                       // far layer (use with parallax depth ~0.5)
  const r = shape.ridge(x0 - 40, x1 + 40, 520, 70, 21, 0.0025);
  flat(shape.band(r, 640), PAL.hill, 0.8); hatch(shape.band(r, 640), { color: '#6b6a3f', alpha: 0.25, gap: 7, len: 10, angle: 0.5, seed: 22 });
  ink(r, { w: 2, alpha: 0.7, seed: 23 });
}
const groundY = x => 560 + 40 * (0.7 * vnoise(x * 0.004, 3) + 0.3 * vnoise(x * 0.012, 12));   // the top ridge used by landscape()
function mountain(x, base, w, h, seed) {                                       // far peak with a snowcap (use with parallax ~0.3)
  const r = mulberry(seed), pts = [];
  for (let k = 0; k <= 12; k++) { const u = k / 6 - 1, j = k === 0 || k === 12 || k === 6 ? 0 : (r() - 0.5) * h * 0.12;
    pts.push([x + u * w / 2, base - h * (1 - Math.abs(u)) ** 1.15 + j]); }
  const poly = [...pts, [x + w / 2, base + 40], [x - w / 2, base + 40]];
  flat(poly, PAL.rock); shade(poly, { color: '#4d4640', seed: seed + 1, alpha: 0.4, light: [-0.8, -0.5] });
  const snow = pts.filter(([, y]) => y < base - h * 0.62), zig = [];
  if (snow.length > 1) { const [sx0] = snow[0], [sx1] = snow[snow.length - 1];
    for (let k = 0; k <= 6; k++) zig.push([lerp(sx1, sx0, k / 6), base - h * (0.66 + (k % 2 ? -0.06 : 0.03))]);
    const cap = [...snow, ...zig]; ink(cap, { closed: true, w: 1.4, fill: PAL.snow, amp: 0.6, seed: seed + 2 }); }
  pen(pts, { w: 2.6, seed: seed + 3, taper: 0.05 });
}
function tree(x, y, s, seed, t) {                                              // trunk + shaded canopy that sways
  const sw = 3 * s * Math.sin(t * 1.3 + x * 0.01), cx = x + sw, cy = y - 88 * s;
  pen([[x, y + 4], [x + sw * 0.3, y - 40 * s], [cx, cy + 10 * s]], { w: 5 * s, color: PAL.bark, seed, taper: 0.3 });
  const c = shape.blob(cx, cy, 44 * s, seed, 0.28, 40);
  ink(c, { closed: true, w: 2.4, fill: PAL.leaf, amp: 1, seed: seed + 1 });
  shade(c, { color: PAL.leafDeep, seed: seed + 2, alpha: 0.55 });
}
function sea(x0, y0, t, poly) {                                                // open water: flat, two hatch tones, moving wave strokes
  flat(poly, PAL.sea); hatch(poly, { color: '#bfe3ea', alpha: 0.45, gap: 9, len: 14, angle: 0.02, seed: 71 });
  hatch(poly, { color: PAL.seaDeep, alpha: 0.4, gap: 7, len: 12, angle: 0.02, seed: 72, keep: (px, py) => clamp((py - y0) / 300) });
  pen([[x0, y0], [W + 320, y0]], { w: 3.4, seed: 73, taper: 0.02 });
  for (let i = 0; i < 24; i++) { const x = x0 + 30 + ((i * 97 + t * (30 + (i % 3) * 12)) % (W - x0 + 280)), y = y0 + 22 + (i % 5) * 26;
    pen([[x, y], [x + 14, y - 6], [x + 28, y], [x + 42, y - 6]], { w: 2, color: '#e8f3f5', seed: 74 + i, taper: 0.3, alpha: 0.9 }); }
}
function birds(t, x0, y0, n = 4, seed = 181) {                                // a small flock crossing the sky, wings flapping on twos
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) { const x = ((x0 + i * 46 + r() * 30 + t * 42) % (W + 300)) - 150, y = y0 + r() * 50 + 6 * Math.sin(t * 1.1 + i), f = Math.sin(t * 9 + i * 1.7), s = 9 + r() * 5;
    pen([[x - s, y - f * s * 0.6], [x - s * 0.4, y - 2], [x, y + 1], [x + s * 0.4, y - 2], [x + s, y - f * s * 0.6]], { w: 1.8, seed: seed + i, taper: 0.25, amp: 0.2 }); }
}
function landscape(t, o = {}) {                                                // ground layers from x0 to x1, bleeding past both
  const { x0 = 0, x1 = W, draw = 1, detail = 1, dy = 0, river: showRiver = true } = o, a = x0 - 30, b = x1 + 30;
  ctx.save(); ctx.translate(0, dy);
  const sky = shape.ridge(a, b, 560, 40, 3), top = shape.ridge(a, b, 640, 30, 4), mid = shape.ridge(a, b, 800, 40, 6), low = shape.ridge(a, b, 930, 20, 7);
  const ground = shape.band(sky, H + 40); flat(ground, '#e4d9bd'); if (detail) stipple(ground, 2600 * (x1 - x0) / W, { seed: 3, alpha: 0.28 });
  const soil = shape.between(sky, top); flat(soil, PAL.soilTop); hatch(soil, { color: '#6b4426', alpha: 0.35, gap: 5, len: 10, angle: 0.1, seed: 5 });
  const grav = shape.between(top, mid); flat(grav, PAL.gravel); if (detail) pebbles(grav, 260 * (x1 - x0) / W, { seed: 8, alpha: 0.45, rmin: 6, rmax: 16 });
  const aq = shape.between(mid, low); flat(aq, PAL.aquifer); hatch(aq, { color: '#2f5c68', alpha: 0.5, gap: 6, len: 16, angle: 0.02, seed: 9 });
  const rock = shape.band(low, H + 40); flat(rock, '#5a5250'); if (detail) scribble(rock, { color: '#2b2523', alpha: 0.35, gap: 12, seed: 11, angle: 0.5 });
  pen(sky, { w: 4, seed: 12, draw, taper: 0.02 }); pen(top, { w: 2.4, seed: 13, draw, taper: 0.02 });
  flow(shape.ridge(a, b, 870, 6, 7), t, { speed: 22, gap: 140, len: 40, color: '#1f3f48', w: 2, alpha: 0.6 });   // groundwater creeping
  grass(sky, { every: 34, h: 16, seed: 14, draw, sway: 4 });
  if (showRiver) { const river = RIVER.filter(([x]) => x > a - 500 && x < b + 500);
    fluxArrow(river, { width: 26, draw, fill: '#9ec4d3', seed: 15 });
    flow(river, t, { speed: 140, gap: 90, len: 34, color: '#ffffff', w: 2.4, alpha: 0.9 * draw }); }
  ctx.restore();
}
function rain(x0, x1, yTop, yBot, t, n = 16, alpha = 1) {                     // streaks that keep falling
  const r = mulberry(61);
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), ph = r(), u = (t * 1.3 + ph) % 1, y = lerp(yTop, yBot, u);
    pen([[x, y], [x - 6, y + 46]], { w: 2.2, color: PAL.peri, seed: 60 + i, taper: 0.35, alpha: alpha * Math.sin(Math.PI * u) }); }
}
function molecule(x, y, r, seed, rot = 0) {
  const body = shape.circle(x, y, r, 24);
  ink(body, { closed: true, w: 1.6, color: PAL.nightInk, fill: PAL.navyFill, amp: 0.4, seed }); speckle(body, Math.round(r * 0.8), { seed });
  ctx.fillStyle = PAL.pink; ctx.beginPath();
  for (const s of [-1, 1]) { const a = Math.PI / 2 + s * 0.91 + rot; ctx.moveTo(x + Math.cos(a) * r * 0.95 + r * 0.38, y + Math.sin(a) * r * 0.95); ctx.arc(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, r * 0.38, 0, TAU); }
  ctx.fill();
}

/* ---------- title: the camera cranes down while a drop forms, falls and splashes ---------- */
const DROP_X = 560, dropY = t => kf(t, [[3.0, 450], [4.2, 684]], E.in2);
const T0 = {
  dur: 6, dark: false,
  cam: t => ({ x: W / 2, y: H / 2, s: kf(t, [[0, 1.14], [6, 1.0]], E.inOutSine), dy: kf(t, [[0, -70], [6, 0]], E.inOutSine) }),
  hero: t => ({ x: DROP_X, y: t < 4.2 ? dropY(t) : 684, r: 26, alpha: inv(2.6, 3.0, t) }),
  cues: [[0.3, 'noise', { dur: 1.4, g: 0.05, f0: 300, f1: 1500, q: 0.8 }], [2.6, 'motif', { degs: [2, 3, 4, 6] }], [4.2, 'plink', { f: 880 }], [4.25, 'chime', { f: 523 }], [0.6, 'scratch', { chars: 25, cps: 34 }], [1.0, 'scratch', { chars: 8, cps: 13 }]],
  draw(t) {
    landscape(t, { draw: E.out3(inv(0, 1.4, t)) });
    lobedCloud(560 + 12 * Math.sin(t * 0.5), 400, CLOUD, { draw: inv(0.3, 2.2, t), seed: 21 });
    lobedCloud(1350 + t * 14, 250, SMALL_CLOUD, { draw: inv(0.8, 2.0, t), seed: 25 });
    rain(330, 800, 420, 640, t, 14, inv(2.0, 2.6, t));
    const f = E.outBack(inv(2.6, 3.0, t));                                   // the drop forms, falls, lands
    if (f > 0 && t < 4.2) { const y = dropY(t); ink(BUN(DROP_X, y, 12 * f, 0.15 * Math.sin(t * 20)), { closed: true, w: 2.4, fill: PAL.drop, amp: 0.3 }); }
    for (let k = 0; k < 3; k++) { const q = inv(4.2 + k * 0.18, 5.4 + k * 0.18, t); if (q > 0 && q < 1) ink(shape.ellipse(DROP_X, 684, 12 + q * 110, 4 + q * 22, 0, 40), { closed: true, w: 2.2, color: '#ffffff', alpha: 1 - q, amp: 0.4 }); }
    pen(smooth([[1180, 120], [1330, 150], [1480, 128], [1600, 170]], 3), { w: 5, seed: 31, draw: E.out3(inv(0.2, 1.2, t)), taper: 0.1 });
    withAlpha(inv(1.5, 2.5, t), () => birds(t, 1100, 520, 4, 191));
  },
  overlay(t) {
    sun(1720, 170, t, inv(0.5, 1.5, t));
    text(typed('A FIELD STUDY IN 5 PLATES', t - 0.6, 34), 1000, 300, { kind: 'mono', size: 22, ls: 8, color: PAL.inkSoft });
    dropText('One Drop', 992, 420, t - 1.0, { kind: 'display', size: 112, weight: 500, cps: 13 });
    text(typed('the journey of one raindrop', t - 2.4, 26), 996, 486, { kind: 'display', size: 44, italic: true, color: PAL.inkSoft });
  },
};
/* ---------- plate I · the valley (whip pan): the camera follows the hero downstream, hills in parallax ---------- */
const riverAt = t => along(RIVER, 0.12 + 0.62 * E.inOutSine(clamp(t / 7.5)));
const MOUNTAINS = [[180, 520, 150], [640, 620, 175], [1120, 480, 140], [1600, 640, 170], [2080, 560, 155]];   // [x, width, height], layer coords
const TREES = [[330, 1.0], [700, 1.25], [1040, 0.9], [1380, 1.15], [1880, 1.3], [2260, 0.95], [2640, 1.2], [3060, 1.05]];
const P1 = {
  dur: 7.5, dark: false, enter: { type: 'pan', dur: 0.8, dir: 'left' },
  header: { num: 1, title: 'The Valley', sub: 'where the river collects the rain' }, stage: { n: 1, name: 'RUNOFF', prevN: 0 },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', `T+ ${Math.floor(lerp(0, 40, t / 7.5))} min`], ['ALTITUDE', `${fmt(Math.round(lerp(640, 120, t / 7.5)))} m`]], states: STATES, state: 1 }),
  cam: t => ({ x: W / 2, y: H / 2, s: 1, dx: -softClamp(riverAt(t - 0.4)[0] - 820, 0, WORLD - W, 260) }),   // soft limits: the camera eases into and out of the follow
  hero: t => { const [x, y] = riverAt(t); return { x, y, label: HERO, r: 30 }; },
  cues: [[1.3, 'scratch', { chars: 30 }], [2.6, 'chime', { f: 660 }], [3.6, 'pop'], [3.8, 'scratch', { chars: 14 }]],
  draw(t) {
    const c = P1.cam(t);
    parallax(c, 0.15, () => { lobedCloud(1480, 430, SMALL_CLOUD, { seed: 25 }); lobedCloud(2500, 400, SMALL_CLOUD, { seed: 26 }); sun(1340, 200, t); });
    parallax(c, 0.3, () => MOUNTAINS.forEach(([x, w, h], i) => mountain(x, 560, w, h, 90 + i * 7)));
    parallax(c, 0.5, () => hills(0, WORLD));
    landscape(t, { x0: 0, x1: WORLD });
    TREES.forEach(([x, s], i) => tree(x, groundY(x), s, 120 + i * 5, t));
  },
  overlay(t) {
    withAlpha(beat(t, 1.3, 6.2), () => stat(t - 1.3, { x: 700, y: 330, kicker: 'RAIN ON THIS VALLEY, EACH YEAR', value: u => '≈ ' + countUp(1200, u, 1.3) + ' mm', note: '1,200 L on each square metre' }));
    const h = heroOf(P1, t);
    withAlpha(beat(t, 3.6, 7.45), () => callout(t - 3.6, { ax: h.x, ay: h.y - 12, ex: h.x - 70, ey: 470, x2: h.x - 130, align: 'right', title: 'surface runoff', sub: 'the rest flows downhill' }));
  },
};
/* ---------- plate II · inside the drop (lens in): molecules jiggle, bonds flicker, the camera turns slowly ---------- */
const C2 = [960, 600];
const RX = 540, RY = 330;                                                      // the crowd fills an elliptical patch of liquid
const MOLS = (() => { const r = mulberry(41), out = []; for (let i = 0; i < 1400 && out.length < 120; i++) { const x = C2[0] + (r() * 2 - 1) * RX, y = C2[1] + (r() * 2 - 1) * RY;
  if (((x - C2[0]) / RX) ** 2 + ((y - C2[1]) / RY) ** 2 < 0.92 && Math.hypot(x - C2[0], y - C2[1]) > 80 && out.every(m => Math.hypot(m.x - x, m.y - y) > 46)) out.push({ x, y, i }); } return out; })();
const molAt = (m, t) => {                                                     // slow swirl inside the patch plus thermal jiggle
  const ux = (m.x - C2[0]) / RX, uy = (m.y - C2[1]) / RY, a = 0.16 * t * (1.3 - Math.hypot(ux, uy)), c = Math.cos(a), sn = Math.sin(a);
  const [dx, dy] = wander(m.i, t, 13, 2.2, 5); return [C2[0] + (ux * c - uy * sn) * RX + dx, C2[1] + (ux * sn + uy * c) * RY + dy]; };
const P2 = {
  dur: 7, dark: true, enter: { type: 'lensIn', dur: 1.4, dive: 1.8 },
  header: { num: 2, title: 'Inside the Drop', sub: 'a crowd of molecules holding hands' }, stage: { n: 2, name: 'LIQUID' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 40 min'], ['SIZE', '≈ 0.3 nm']], states: STATES, state: 1 }),
  cam: t => ({ x: C2[0], y: C2[1], s: 1 + 0.08 * E.inOutSine(t / 6.5), rot: 0.08 * Math.sin(t * 0.45) }),
  hero: t => { const [dx, dy] = wander(99, t, 8, 1.6, 5); return { x: C2[0] + dx, y: C2[1] + dy, label: HERO, r: 64 }; },
  cues: [[1.4, 'readout', { chars: 15 }], [2.7, 'chime', { f: 440 }], [2.6, 'pop'], [2.9, 'readout', { chars: 14 }], ...Array.from({ length: 6 }, (_, i) => [0.9 + i * 0.45, 'plink', { f: note(880, i) }])],
  draw(t) {
    const pts = MOLS.map(m => molAt(m, t)), hx = P2.hero(t);
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {    // hydrogen bonds blink on and off
      const d = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]), on = vnoise(t * 2.4 + a * 3.1 + b, 17);
      if (d < 78 && on > 0) ink([pts[a], pts[b]], { w: 1.4, color: PAL.gold, alpha: 0.6 * clamp(on * 3) * stagger(0, t, { t0: 0.6 }), dash: [4, 6], amp: 0 });
    }
    MOLS.forEach((m, k) => { const a = stagger(k % 12, t, { t0: 0.1, step: 0.04, dur: 0.45, ease: E.outBack }); if (a > 0) withAlpha(clamp(a), () => molecule(pts[k][0], pts[k][1], 14 * a, m.i, 0.8 * Math.sin(t * 2.4 + m.i))); });
    if (!S.morph) molecule(hx.x, hx.y, 40, 99, 0.3 * Math.sin(t * 1.7));
  },
  overlay(t) {
    withAlpha(beat(t, 1.4, 6.5), () => stat(t - 1.4, { x: 1540, y: 420, kicker: 'IN ONE RAINDROP', value: u => '≈ ' + countUp(1.4, u, 1.3, 1) + ' × 10' + SUP('20'), note: 'molecules in a 2 mm drop', dark: true, size: 54 }));
    const h = heroOf(P2, t);
    withAlpha(beat(t, 2.6), () => callout(t - 2.6, { ax: h.x - 40, ay: h.y + 30, ex: 520, ey: 770, x2: 470, align: 'right', title: 'hydrogen bonds', sub: 'each held by up to four', dark: true }));
  },
};
/* ---------- plate III · the cloud within (zoom out 8×): droplets drift on an updraft ---------- */
const DROPS = (() => { const r = mulberry(51); return Array.from({ length: 260 }, (_, i) => { const a = r() * TAU, d = 60 + Math.sqrt(r()) * 620, z = r();
  return { x: C2[0] + Math.cos(a) * d * 1.2, y: C2[1] + Math.sin(a) * d * 0.7, r: 2 + z * 7, z, i }; }).sort((p, q) => p.z - q.z); })();   // z: far (0) to near (1)
const P3 = {
  dur: 7, dark: true, enter: { type: 'zoom', dur: 2.1, dir: 'out', k: 4 },   // the slow breath of the film
  header: { num: 3, title: 'The Cloud Within', sub: 'a million of these make one raindrop' }, stage: { n: 3, name: 'CLOUD' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 3 h'], ['SIZE', '≈ 20 µm']], states: STATES, state: 1 }),
  cam: t => ({ x: C2[0], y: C2[1], s: 1 + 0.07 * E.inOutSine(t / 6.5), dy: -12 * t, rot: 0.03 * Math.sin(t * 0.5) }),
  hero: t => ({ x: C2[0], y: C2[1] + 6 * Math.sin(t * 1.4), label: HERO, r: 30 }),
  cues: [[1.8, 'readout', { chars: 23 }], [3.0, 'chime', { f: 392 }], [2.9, 'pop'], [3.4, 'readout', { chars: 30 }], [0, 'noise', { dur: 7, g: 0.03, f0: 500, f1: 900, q: 0.6, a: 1.5 }]],
  draw(t) {
    for (let i = 0; i < 7; i++) flow([[300 + i * 230, 1040], [330 + i * 230 + 40 * Math.sin(i), 620], [300 + i * 230, 180]], t, { speed: 160, gap: 150, len: 60, color: PAL.nightMuted, w: 1.8, alpha: 0.6, seed: 30 + i });
    for (const d of DROPS) {                                                   // near droplets are bigger, brighter and rise faster (depth)
      const [dx, dy] = wander(d.i, t, 10 + 14 * d.z, 0.8, 9), sp = 25 + 75 * d.z, up = ((d.y - t * sp - 140) % 900 + 900) % 900 + 140 - d.y;
      ink(shape.circle(d.x + dx, d.y + dy + up, d.r, 10), { closed: true, w: 0.6 + d.z, color: '#9fb4ff', fill: `rgba(80,110,200,${0.3 + 0.4 * d.z})`, amp: 0.2, seed: d.i, alpha: 0.45 + 0.55 * d.z }); }
    if (!S.morph) ink(shape.circle(C2[0], C2[1] + 6 * Math.sin(t * 1.4), 9, 20), { closed: true, w: 1.6, color: PAL.nightInk, fill: PAL.navyFill, amp: 0.2, seed: 7 });
  },
  overlay(t) {
    stat(t - 1.8, { x: 1280, y: 420, kicker: 'A TYPICAL CLOUD DROPLET', value: u => '≈ ' + countUp(20, u, 1.2) + ' µm', note: 'about 70,000 molecules across', dark: true, size: 54 });
    const k = card(t - 2.9, { x: 470, y: 858, w: 980, h: 182, dark: true, title: 'SIZE LADDER', fig: 'LOG SCALE' });   // room for two rows of 22 px marks
    if (k > 0) logRuler(t - 3.4, { x: 510, y: 985, w: 900, min: 1e-10, max: 1e-2, dark: true,
      ticks: [[1e-9, '1 nm'], [1e-6, '1 µm'], [1e-3, '1 mm']],
      marks: [{ v: 2.8e-10, label: 'MOLECULE', t0: 0.5 }, { v: 2e-5, label: 'CLOUD DROPLET', color: PAL.accent, t0: 0.9 }, { v: 2e-3, label: 'RAINDROP', t0: 1.3, row: 1 }] });
  },
};
/* ---------- plate IV · a raindrop (shape reveal): the drop wobbles while the world scrolls up past it ---------- */
const P4 = {
  dur: 7.5, dark: false,
  enter: { type: 'shape', dur: 1.3, from: () => shape.circle(C2[0], C2[1], 9, 20), to: () => BUN(960, 400, 110),
    style: e => { const k = E.inOutSine(inv(0.3, 0.7, e)); return { color: mixColor(PAL.nightInk, PAL.ink, k), fill: mixColor(PAL.navyFill, PAL.drop, k), w: lerp(1.6, 3.2, e) }; } },   // blend, never switch: a switch pops
  header: { num: 4, title: 'A Raindrop', sub: 'not a teardrop: a bun with a flat belly' }, stage: { n: 4, name: 'FALL' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 3 h 20 min'], ['ALTITUDE', `${fmt(Math.round(lerp(1200, 300, t / 7)))} m`]], states: STATES, state: 1 }),
  drift: false,
  hero: t => ({ x: 960, y: 400 + 8 * Math.sin(t * 2.2), label: HERO, r: 140 }),
  cues: [[1.3, 'pop'], [1.5, 'scratch', { chars: 17 }], [2.8, 'pop'], [3.4, 'oops'], [4.8, 'hiss', { dur: 0.9 }], [0, 'noise', { dur: 7, g: 0.05, f0: 900, q: 0.5, a: 1 }]],
  draw(t) {
    const fall = E.inOutSine(clamp(t / 7));
    ctx.save(); ctx.translate(0, -700 * fall);                                  // the sky slides up as we fall
    lobedCloud(560, 180, CLOUD, { seed: 21, alpha: 0.9 });   // (a second, small cloud here scrolled through the journey log and the callout)
    ctx.restore();
    landscape(t, { detail: 0, dy: lerp(640, -60, fall) });
    for (let i = 0; i < 9; i++) flow([[860 + i * 25, 1000], [860 + i * 25, -40]], t + i * 0.13, { speed: 900, gap: 360, len: 70, color: PAL.peri, w: 2, alpha: 0.7 });   // air rushing up
    const { y } = P4.hero(t), wob = 0.05 * Math.sin(t * 9);
    if (!S.morph) { const d = BUN(960, y, 110, wob); ink(d, { closed: true, w: 3.2, fill: PAL.drop, amp: 1, seed: 5 });
      shade(d, { color: '#2f6f8f', seed: 6, alpha: 0.45 }); ink(shape.arc(930, y - 30, 55, 3.6, 4.4, 10), { w: 5, color: '#ffffff', amp: 0.3, alpha: 0.9 }); }
  },
  overlay(t) {
    const { y } = P4.hero(t);
    withAlpha(beat(t, 1.3), () => callout(t - 1.3, { ax: 1050, ay: y + 25, ex: 1180, ey: 300, x2: 1240, title: 'flattened by drag', sub: 'air pushes up the belly; big drops flatten most' }));
    const m = TEAR(420, 380, 60), ea = eraseOut(m, inv(4.8, 5.8, t));           // the myth: drawn, crossed out, rubbed out
    withAlpha(beat(t, 2.8) * ea, () => { ink(m, { closed: true, w: 2.4, color: PAL.muted, fill: PAL.panel, amp: 0.8, seed: 8, draw: inv(2.8, 3.4, t), fillReveal: 'sweep' });
      pen([[350, 310], [490, 460]], { w: 4, color: PAL.accent, draw: inv(3.4, 3.7, t), taper: 0.2 }); pen([[490, 310], [350, 460]], { w: 4, color: PAL.accent, draw: inv(3.6, 3.9, t), taper: 0.2 });
      text(typed('not a teardrop', t - 3.45, 30), 420, 510, { kind: 'sans', size: 24, weight: 600, align: 'center' }); });
  },
};
/* ---------- plate V · the whole route (ink bleed): a coast cross-section, every flow at once ---------- */
const ROUTE = [[560, 440], [590, 500], [630, 570], [660, 640], [900, 668], [1150, 664], [1330, 668], [1470, 700], [1640, 690], [1700, 600], [1680, 520]];
const VAPOUR = [[1720, 640], [1700, 520], [1580, 450], [1200, 436], [760, 420]];
const RUNOFF = [[640, 646], [900, 672], [1150, 668], [1330, 672], [1440, 700]];
const GROUND = [[780, 884], [1100, 876], [1420, 860]];
const LAND = [[-100, -100], [1400, -100], [1400, 600], [1350, 660], [1400, 800], [1480, H + 100], [-100, H + 100]];
const SEA = [[1400, 600], [W + 320, 600], [W + 320, H + 40], [1480, H + 40], [1400, 800], [1350, 660]];
const PEAK = (() => { const r = mulberry(141), p = [[-60, 480], [60, 450]];
  for (let k = 0; k <= 10; k++) { const x = 120 + k * 60, y = k <= 3 ? lerp(420, 330, k / 3) : lerp(330, 640, (k - 3) / 7); p.push([x, y + (k === 3 ? 0 : (k % 2 ? 1 : -1) * r() * 14)]); }
  return [...p, [760, 700], [690, H + 60], [-60, H + 60]]; })();   // the rock runs down under the valley
const MID_CLOUD = [[0, 70], [-90, 52], [90, 56], [20, 48, 30], [-40, 40, 24]];
function snowcap(pts, yLine, seed) {                                           // white cap over the points above yLine, with a zig-zag lower edge
  const top = pts.filter(([, y]) => y < yLine); if (top.length < 2) return;
  const x0 = top[0][0], x1 = top[top.length - 1][0], zig = [];
  for (let k = 0; k <= 8; k++) zig.push([lerp(x1, x0, k / 8), yLine + (k % 2 ? 7 : -3) + 4 * Math.sin(k * 2.3 + seed)]);
  ink([...top, ...zig], { closed: true, w: 1.4, fill: PAL.snow, amp: 0.6, seed });
}
const routeU = t => E.inOut3(inv(1.8, 8.4, t));
const P5 = {
  dur: 10, dark: false, enter: { type: 'bleed', dur: 1.8 },
  cam: t => ({ x: 640, y: 440, s: kf(t, [[0, 1.6], [3.0, 1.0], [10, 1.08]], E.inOut3), dx: kf(t, [[0, 60], [3.0, 0], [10, -150]], E.inOutSine) }),
  header: { num: 5, title: 'The Whole Route', sub: 'every plate, retraced' }, stage: { n: 5, name: 'RETURN' },
  log: t => { const u = routeU(t); return { title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', `T+ ${Math.max(1, Math.round(9 * u))} day${Math.round(9 * u) > 1 ? 's' : ''}`], ['PLACE', u < 0.12 ? 'CLOUD' : u < 0.3 ? 'SLOPE' : u < 0.68 ? 'RIVER' : u < 0.86 ? 'SEA' : 'AIR']],
    states: STATES, state: u < 0.12 || u > 0.9 ? 0 : 1 }; },
  hero: t => { const [x, y] = along(ROUTE, routeU(t)); return { x, y, label: HERO, r: 26 }; },
  cues: [[1.0, 'noise', { dur: 2.5, g: 0.04, f0: 400, f1: 1600, q: 0.7 }], [2.2, 'plink', { f: note(660, 0) }], [3.0, 'reveal', { lead: 1.2, g: 0.7 }], [3.4, 'scratch', { chars: 24 }],
    [4.4, 'plink', { f: note(660, 4) }], [4.6, 'chime', { f: 587 }], [5.6, 'pop'], [5.9, 'scratch', { chars: 26 }], [6.6, 'plink', { f: note(660, 5) }], [7.4, 'chime', { f: 784 }], [8.4, 'success']],
  draw(t) {
    const fd = k => E.out3(inv(0.9 + k * 0.5, 2.6 + k * 0.5, t));             // the flows draw on one after another
    sun(1650, 330, t);
    fluxArrow(VAPOUR, { width: 24, draw: fd(0), fill: PAL.vapour, seed: 151 });
    flow(VAPOUR, t, { speed: 90, gap: 110, len: 30, color: '#ffffff', w: 2, alpha: 0.9 * fd(0) });
    ctx.save(); trace(LAND, true); ctx.clip();
    landscape(t, { x1: 1500, river: false });
    flat(PEAK, PAL.rock); shade(PEAK, { color: '#4d4640', seed: 142, alpha: 0.45, light: [-0.8, -0.5] }); scribble(PEAK, { color: '#4d4640', alpha: 0.18, gap: 16, seed: 143 });
    snowcap(PEAK, 392, 144);
    pen(PEAK.slice(0, -2), { w: 3.2, seed: 145, taper: 0.04 }); pen([[760, 700], [690, H + 60]], { w: 2.2, seed: 146, alpha: 0.7, taper: 0.05 });
    fluxArrow(RUNOFF, { width: 26, draw: fd(2), fill: '#9ec4d3', seed: 152 });
    flow(RUNOFF, t, { speed: 140, gap: 90, len: 34, color: '#ffffff', w: 2.4, alpha: 0.9 * fd(2) });
    arrowPath(GROUND, { draw: fd(3), dash: [8, 8], w: 2.4, color: '#1f3f48' });
    ctx.restore();
    sea(1400, 600, t, SEA);
    for (let i = 0; i < 8; i++) { const x = 1480 + i * 50 + 10 * Math.sin(t + i), u = ((t * 0.5 + i * 0.37) % 1);  // vapour rising off the sea
      pen([[x, 590 - u * 90], [x + 6, 560 - u * 90]], { w: 2, color: PAL.peri, taper: 0.4, seed: 160 + i, alpha: Math.sin(Math.PI * u) * fd(0) }); }
    lobedCloud(560 + 8 * Math.sin(t * 0.4), 420, MID_CLOUD, { seed: 21 });
    rain(480, 660, 440, 600, t, 18, fd(1));
    birds(t, 900, 520, 5);
    journeyPath(ROUTE, { draw: routeU(t), waypoints: [{ u: 0.02, label: 'II · III', dx: -70 }, { u: 0.14, label: 'IV', dx: -34 }, { u: 0.42, label: 'I' }, { u: 0.8, label: 'V', dy: 30 }] });
  },
  overlay(t) {
    const c = P5.cam(t), lab = (s, x, y, k, o = {}) => withAlpha(E.out3(inv(1.8 + k * 0.5, 2.4 + k * 0.5, t)), () => { const lo = { kind: 'mono', size: 22, weight: 600, ls: 2, color: PAL.inkSoft, ...o }, b = null;
      haloText(s, x, y, lo); });   // labels written over rain and flow get a glyph halo
    if (c.s < 1.02) { lab('EVAPORATION', 1700, 560, 0); lab('RAIN', 560, 470, 1); lab('RUNOFF', 1000, 720, 2, { color: '#1f3f48' }); lab('GROUNDWATER', 800, 852, 3); }
    withAlpha(beat(t, 3.2), () => stat(t - 3.2, { x: 820, y: 330, kicker: 'WATER VAPOUR STAYS ALOFT', value: u => '≈ ' + countUp(9, u, 1.2) + ' days', note: 'on average, before it rains out' }));
    const k = card(t - 5.6, { x: 470, y: 876, w: 980, h: 166, title: 'WHERE A YEAR OF VALLEY RAIN GOES', fig: 'ILLUSTRATIVE SPLIT' });
    if (k > 0) {
      const segs = [[0.5, '#9a9ad4', 'BACK TO THE AIR · 600 MM'], [1 / 3, PAL.sea, 'RUNS OFF · 400 MM'], [1 / 6, PAL.soilTop, 'SOAKS IN · 200 MM']];
      let x = 500;
      segs.forEach(([f, col, label], i) => { const g = E.out3(inv(0.2 + i * 0.35, 0.7 + i * 0.35, t - 5.6)), w = 920 * f;
        if (g <= 0) { x += w; return; }
        const r = shape.rect(x, 936, w * g, 26); ink(r, { closed: true, w: 1.6, fill: col, amp: 0.4, seed: 170 + i }); hatch(r, { alpha: 0.25, gap: 6, len: 9, seed: 175 + i });
        const lo = { kind: 'mono', size: 22, weight: 600, ls: 1, color: PAL.inkSoft, alpha: g }, last = i === segs.length - 1;   // 22 px labels on two rows; the last one ends at the card edge
        text(label, last ? 1426 : x + w / 2, i % 2 ? 1026 : 994, { ...lo, align: last ? 'right' : 'center' });
        x += w; });
    }
  },
};
/* ---------- end card (page roll): ripples spread from the drop ---------- */
const END = {
  dur: 10, dark: true, enter: { type: 'page', dur: 1.4 }, counter: false, focus: () => [960, 400],
  hero: t => ({ x: 960, y: 400, r: 70, tag: false, alpha: inv(0.3, 1, t) }),
  cues: [[1.4, 'readout', { chars: 34, cps: 22 }], [1.7, 'chime', { f: 392 }], [3.0, 'resolve'], [4.6, 'motif', { degs: [2, 3, 4, 0], step: 0.3, g: 0.8 }]],
  draw(t) {
    for (let k = 0; k < 4; k++) { const q = ((t - 1.0 + k * 0.45) % 1.8) / 1.8; if (t < 1.0 - k * 0.45 + 0.001 || q < 0) continue;   // ripples, one every 0.45 s
      ink(shape.ellipse(960, 400, 80 + q * 420, (80 + q * 420) * 0.42, 0, 64), { closed: true, w: 3 - 1.5 * q, color: '#b9bbef', alpha: 0.9 * (1 - q), amp: 0.5, seed: k }); }
    withAlpha(inv(0.2, 1.0, t) * 0.5, () => { ctx.save(); ctx.translate(960, 400); ctx.rotate(t * 0.35); ctx.setLineDash([18, 14]); ctx.lineWidth = 2; ctx.strokeStyle = PAL.peri;
      ctx.beginPath(); ctx.arc(0, 0, 250, 0, TAU); ctx.stroke(); ctx.restore(); });
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + t * (0.35 + (i % 3) * 0.12), [dx, dy] = wander(i, t, 16, 1.1), rr = 150 + 70 * Math.sin(i * 1.7);
      withAlpha(inv(0.4, 1.2, t) * 0.9, () => ink(shape.circle(960 + Math.cos(a) * rr + dx, 400 + Math.sin(a) * rr * 0.6 + dy, 3 + (i % 4), 10), { closed: true, w: 1.2, color: '#9fb4ff', fill: 'rgba(80,110,200,0.6)', amp: 0.2, seed: i })); }
    const q = 'Every drop is on its way somewhere.', qo = { kind: 'display', size: 56, italic: true, color: PAL.nightInk, cps: 22 };
    dropText(q, 960 - measure(q, qo) / 2, 640, t - 1.4, qo);
    const rl = E.out3(inv(3.0, 3.7, t)); if (rl > 0) pen([[960 - 300 * rl, 676], [960 + 300 * rl, 676]], { w: 1.4, color: PAL.peri, taper: 0.3 });
    const col = `ONE DROP  ·  5 PLATES  ·  ${fmt(TOTAL_F)} FRAMES  ·  DRAWN IN CODE`, co = { kind: 'mono', size: 22, ls: 5, color: '#a9aacb' };
    text(typed(col, t - 3.0, 60), 960 - measure(col, co) / 2, 724, co);
    const so = { kind: 'mono', size: 22, ls: 1, color: PAL.nightLabel };   // two short lines: each gets its own reading time
    ['NOTES  ·  ROUNDED VALUES  ·  THE VALLEY SPLIT IS ILLUSTRATIVE', 'VAPOUR STAY: VAN DER ENT & TUINENBURG 2017'].forEach((src, k) => text(typed(src, t - 3.8 - k * 0.4, 70), 960 - measure(src, so) / 2, 912 + k * 36, so));
  },
};
// instruments and stingers (v0.16.2): the drop's motif when it first appears (title) and resolved to the tonic at the end, an
// 'oops' as the teardrop myth is crossed out (IV), a 'reveal' as the camera settles on the whole route and 'success' as the
// route closes (V), the rolled 'resolve' under the end card's rule line
defineStory({ title: 'One Drop', stages: 5, music: { tonic: 220 }, plates: [T0, P1, P2, P3, P4, P5, END],
  dynamics: [[0, -5], [6, -4.5], [13.5, -4], [27.5, -2], [34, -1], [36, 3], [44, 3], [46, 0], [55, -1]] });   // sound: quiet valley, a lift for the whole route (plate V)
boot();
