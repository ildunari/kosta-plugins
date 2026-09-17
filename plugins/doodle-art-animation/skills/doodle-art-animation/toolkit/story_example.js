/* =====================  STORY: One Drop  ·  worked example (engine v3)  ===================== */
/* Something moves in every drawing: camera crane, follow-pan with parallax, flowing water, swaying grass, jiggling
   molecules, a falling drop with the world scrolling past. Transitions: pan → lensIn → zoom → shape → bleed → page. */
Object.assign(PAL, { soilTop: '#b98457', gravel: '#d8c9a6', aquifer: '#6d9aa6', drop: '#bfe0f0', hill: '#b9b48a' });
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
function landscape(t, o = {}) {                                                // ground layers from x0 to x1, bleeding past both
  const { x0 = 0, x1 = W, draw = 1, detail = 1, dy = 0 } = o, a = x0 - 30, b = x1 + 30;
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
  const river = RIVER.filter(([x]) => x > a - 500 && x < b + 500);
  fluxArrow(river, { width: 26, draw, fill: '#9ec4d3', seed: 15 });
  flow(river, t, { speed: 140, gap: 90, len: 34, color: '#ffffff', w: 2.4, alpha: 0.9 * draw });
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
  cues: [[0.3, 'noise', { dur: 1.4, g: 0.05, f0: 300, f1: 1500, q: 0.8 }], [2.6, 'plink', { f: 1760 }], [4.2, 'plink', { f: 880 }], [4.25, 'chime', { f: 523 }], [0.6, 'scratch', { chars: 25, cps: 34 }], [1.0, 'scratch', { chars: 8, cps: 13 }]],
  draw(t) {
    landscape(t, { draw: E.out3(inv(0, 1.4, t)) });
    lobedCloud(560 + 12 * Math.sin(t * 0.5), 400, CLOUD, { draw: inv(0.3, 2.2, t), seed: 21 });
    lobedCloud(1350 + t * 14, 250, SMALL_CLOUD, { draw: inv(0.8, 2.0, t), seed: 25 });
    rain(330, 800, 420, 640, t, 14, inv(2.0, 2.6, t));
    const f = E.outBack(inv(2.6, 3.0, t));                                   // the drop forms, falls, lands
    if (f > 0 && t < 4.2) { const y = dropY(t); ink(BUN(DROP_X, y, 12 * f, 0.15 * Math.sin(t * 20)), { closed: true, w: 2.4, fill: PAL.drop, amp: 0.3 }); }
    for (let k = 0; k < 3; k++) { const q = inv(4.2 + k * 0.18, 5.4 + k * 0.18, t); if (q > 0 && q < 1) ink(shape.ellipse(DROP_X, 684, 12 + q * 110, 4 + q * 22, 0, 40), { closed: true, w: 2.2, color: '#ffffff', alpha: 1 - q, amp: 0.4 }); }
    pen(smooth([[1180, 120], [1330, 150], [1480, 128], [1600, 170]], 3), { w: 5, seed: 31, draw: E.out3(inv(0.2, 1.2, t)), taper: 0.1 });
  },
  overlay(t) {
    sun(1720, 170, t, inv(0.5, 1.5, t));
    text(typed('A FIELD STUDY IN 5 PLATES', t - 0.6, 34), 1000, 300, { kind: 'mono', size: 21, ls: 9, color: PAL.inkSoft });
    dropText('One Drop', 992, 420, t - 1.0, { kind: 'display', size: 112, weight: 500, cps: 13 });
    text(typed('the journey of one raindrop', t - 2.4, 26), 996, 486, { kind: 'display', size: 44, italic: true, color: PAL.inkSoft });
  },
};
/* ---------- plate I · the valley (whip pan): the camera follows the hero downstream, hills in parallax ---------- */
const riverAt = t => along(RIVER, 0.12 + 0.62 * E.inOutSine(clamp(t / 7.5)));
const P1 = {
  dur: 7.5, dark: false, enter: { type: 'pan', dur: 1.0, dir: 'left' },
  header: { num: 1, title: 'The Valley', sub: 'where the river collects the rain' }, stage: { n: 1, name: 'RUNOFF', prevN: 0 },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', `T+ ${Math.floor(lerp(0, 40, t / 7.5))} min`], ['ALTITUDE', `${fmt(Math.round(lerp(640, 120, t / 7.5)))} m`]], states: STATES, state: 1 }),
  cam: t => ({ x: W / 2, y: H / 2, s: 1, dx: -clamp(riverAt(t - 0.4)[0] - 820, 0, WORLD - W) }),
  hero: t => { const [x, y] = riverAt(t); return { x, y, label: HERO, r: 30 }; },
  cues: [[1.3, 'scratch', { chars: 30 }], [2.5, 'chime', { f: 660 }], [4.4, 'pop'], [4.6, 'scratch', { chars: 14 }]],
  draw(t) {
    const c = P1.cam(t);
    parallax(c, 0.15, () => { lobedCloud(1480, 430, SMALL_CLOUD, { seed: 25 }); lobedCloud(2500, 400, SMALL_CLOUD, { seed: 26 }); sun(1340, 200, t); });
    parallax(c, 0.5, () => hills(0, WORLD));
    landscape(t, { x0: 0, x1: WORLD });
  },
  overlay(t) {
    withAlpha(beat(t, 1.1, 4.1), () => stat(t - 1.1, { x: 700, y: 330, kicker: 'RAIN ON THIS VALLEY, EACH YEAR', value: u => '≈ ' + countUp(1200, u, 1.3) + ' mm', note: 'about a bathtub on every square metre' }));
    const h = heroOf(P1, t);
    withAlpha(beat(t, 4.4, 7.2), () => callout(t - 4.4, { ax: h.x, ay: h.y - 12, ex: h.x - 70, ey: 330, x2: h.x - 130, align: 'right', title: 'surface runoff', sub: 'what the ground cannot take flows downhill' }));
  },
};
/* ---------- plate II · inside the drop (lens in): molecules jiggle, bonds flicker, the camera turns slowly ---------- */
const C2 = [960, 600];
const MOLS = (() => { const r = mulberry(41), out = []; for (let i = 0; i < 90 && out.length < 44; i++) { const x = 480 + r() * 960, y = 300 + r() * 600;
  if (Math.hypot(x - C2[0], y - C2[1]) > 90 && out.every(m => Math.hypot(m.x - x, m.y - y) > 60)) out.push({ x, y, i }); } return out; })();
const molAt = (m, t) => { const [dx, dy] = wander(m.i, t, 15, 2.2, 5); return [m.x + dx, m.y + dy]; };
const P2 = {
  dur: 6.5, dark: true, enter: { type: 'lensIn', dur: 0.55 },
  header: { num: 2, title: 'Inside the Drop', sub: 'a crowd of molecules holding hands' }, stage: { n: 2, name: 'LIQUID' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 40 min'], ['SIZE', '≈ 0.3 nm']], states: STATES, state: 1 }),
  cam: t => ({ x: C2[0], y: C2[1], s: 1 + 0.07 * E.inOutSine(t / 6.5), rot: 0.06 * Math.sin(t * 0.35) }),
  hero: t => { const [dx, dy] = wander(99, t, 8, 1.6, 5); return { x: C2[0] + dx, y: C2[1] + dy, label: HERO, r: 64 }; },
  cues: [[1.6, 'scratch', { chars: 15 }], [3.0, 'chime', { f: 440 }], [3.8, 'pop'], [4.0, 'scratch', { chars: 14 }], ...Array.from({ length: 6 }, (_, i) => [0.9 + i * 0.45, 'plink', { f: note(880, i) }])],
  draw(t) {
    const pts = MOLS.map(m => molAt(m, t)), hx = P2.hero(t);
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {    // hydrogen bonds blink on and off
      const d = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]), on = vnoise(t * 1.6 + a * 3.1 + b, 17);
      if (d < 110 && on > 0) ink([pts[a], pts[b]], { w: 1.4, color: PAL.gold, alpha: 0.6 * clamp(on * 3) * stagger(0, t, { t0: 0.6 }), dash: [4, 6], amp: 0 });
    }
    MOLS.forEach((m, k) => { const a = stagger(k % 12, t, { t0: 0.1, step: 0.04, dur: 0.45, ease: E.outBack }); if (a > 0) withAlpha(clamp(a), () => molecule(pts[k][0], pts[k][1], 16 * a, m.i, 0.5 * Math.sin(t * 2 + m.i))); });
    if (!S.morph) molecule(hx.x, hx.y, 40, 99, 0.3 * Math.sin(t * 1.7));
  },
  overlay(t) {
    withAlpha(beat(t, 1.6, 5.0), () => stat(t - 1.6, { x: 1330, y: 420, kicker: 'IN ONE RAINDROP', value: u => '≈ ' + countUp(1.7, u, 1.3, 1) + ' × 10' + SUP('20'), note: 'molecules, give or take', dark: true, size: 54 }));
    const h = heroOf(P2, t);
    withAlpha(beat(t, 3.8), () => callout(t - 3.8, { ax: h.x - 40, ay: h.y + 30, ex: 700, ey: 880, x2: 640, align: 'right', title: 'hydrogen bonds', sub: 'each molecule held by up to four', dark: true }));
  },
};
/* ---------- plate III · the cloud within (zoom out 8×): droplets drift on an updraft ---------- */
const DROPS = (() => { const r = mulberry(51); return Array.from({ length: 230 }, (_, i) => { const a = r() * TAU, d = 60 + Math.sqrt(r()) * 560; return { x: C2[0] + Math.cos(a) * d, y: C2[1] + Math.sin(a) * d * 0.6, r: 3 + r() * 5, i }; }); })();
const P3 = {
  dur: 5, dark: true, enter: { type: 'zoom', dur: 0.8, dir: 'out', k: 8 },
  header: { num: 3, title: 'The Cloud Within', sub: 'a million droplets per litre of air' }, stage: { n: 3, name: 'CLOUD' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 3 h'], ['SIZE', '≈ 20 µm']], states: STATES, state: 1 }),
  cam: t => ({ x: C2[0], y: C2[1], s: 1 + 0.06 * E.inOutSine(t / 5), dy: -10 * t }),
  hero: () => ({ x: C2[0], y: C2[1], label: HERO, r: 30 }),
  cues: [[1.3, 'scratch', { chars: 23 }], [2.4, 'chime', { f: 392 }], [0, 'noise', { dur: 5, g: 0.03, f0: 500, f1: 900, q: 0.6, a: 1.5 }]],
  draw(t) {
    for (const d of DROPS) { const [dx, dy] = wander(d.i, t, 16, 0.5, 9), up = ((d.y - t * 30 - 200) % 820 + 820) % 820 + 200 - d.y;
      ink(shape.circle(d.x + dx, d.y + dy + up, d.r, 10), { closed: true, w: 1.1, color: '#9fb4ff', fill: 'rgba(80,110,200,0.5)', amp: 0.2, seed: d.i }); }
    for (let i = 0; i < 6; i++) flow([[400 + i * 220, 980], [420 + i * 220 + 30 * Math.sin(i), 620], [400 + i * 220, 260]], t, { speed: 90, gap: 160, len: 50, color: PAL.nightMuted, w: 1.6, alpha: 0.5 });
    if (!S.morph) ink(shape.circle(C2[0], C2[1], 9, 20), { closed: true, w: 1.6, color: PAL.nightInk, fill: PAL.navyFill, amp: 0.2, seed: 7 });
  },
  overlay(t) { stat(t - 1.3, { x: 1330, y: 420, kicker: 'A TYPICAL CLOUD DROPLET', value: u => '≈ ' + countUp(20, u, 1.2) + ' µm', note: 'about 70,000 times wider than the molecule', dark: true, size: 54 }); },
};
/* ---------- plate IV · a raindrop (shape reveal): the drop wobbles while the world scrolls up past it ---------- */
const P4 = {
  dur: 7, dark: false,
  enter: { type: 'shape', dur: 0.9, from: () => shape.circle(C2[0], C2[1], 9, 20), to: () => BUN(960, 400, 110),
    style: e => ({ color: e > 0.5 ? PAL.ink : PAL.nightInk, fill: e > 0.5 ? PAL.drop : PAL.navyFill, w: lerp(1.6, 3.2, e) }) },
  header: { num: 4, title: 'A Raindrop', sub: 'not a teardrop: a bun with a flat belly' }, stage: { n: 4, name: 'FALL' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 3 h 20 min'], ['ALTITUDE', `${fmt(Math.round(lerp(1200, 300, t / 7)))} m`]], states: STATES, state: 1 }),
  drift: false,
  hero: t => ({ x: 960, y: 400 + 8 * Math.sin(t * 2.2), label: HERO, r: 140 }),
  cues: [[1.0, 'pop'], [1.2, 'scratch', { chars: 17 }], [2.8, 'pop'], [4.8, 'hiss', { dur: 0.9 }], [0, 'noise', { dur: 7, g: 0.05, f0: 900, q: 0.5, a: 1 }]],
  draw(t) {
    const fall = E.inOutSine(clamp(t / 7));
    ctx.save(); ctx.translate(0, -700 * fall);                                  // the sky slides up as we fall
    lobedCloud(560, 180, CLOUD, { seed: 21, alpha: 0.9 }); lobedCloud(1500, 420, SMALL_CLOUD, { seed: 27 });
    ctx.restore();
    landscape(t, { detail: 0, dy: lerp(640, -60, fall) });
    for (let i = 0; i < 9; i++) flow([[860 + i * 25, 1000], [860 + i * 25, -40]], t + i * 0.13, { speed: 900, gap: 360, len: 70, color: PAL.peri, w: 2, alpha: 0.7 });   // air rushing up
    const { y } = P4.hero(t), wob = 0.05 * Math.sin(t * 9);
    if (!S.morph) { const d = BUN(960, y, 110, wob); ink(d, { closed: true, w: 3.2, fill: PAL.drop, amp: 1, seed: 5 });
      shade(d, { color: '#2f6f8f', seed: 6, alpha: 0.45 }); ink(shape.arc(930, y - 30, 55, 3.6, 4.4, 10), { w: 5, color: '#ffffff', amp: 0.3, alpha: 0.9 }); }
  },
  overlay(t) {
    const { y } = P4.hero(t);
    withAlpha(beat(t, 1.0), () => callout(t - 1.0, { ax: 1050, ay: y + 25, ex: 1180, ey: 300, x2: 1240, title: 'flattened by drag', sub: 'air pushes the belly up as it falls' }));
    const m = TEAR(420, 380, 60), ea = eraseOut(m, inv(4.8, 5.8, t));           // the myth: drawn, crossed out, rubbed out
    withAlpha(beat(t, 2.8) * ea, () => { ink(m, { closed: true, w: 2.4, color: PAL.muted, fill: PAL.panel, amp: 0.8, seed: 8, draw: inv(2.8, 3.4, t), fillReveal: 'sweep' });
      pen([[350, 310], [490, 460]], { w: 4, color: PAL.accent, draw: inv(3.4, 3.7, t), taper: 0.2 }); pen([[490, 310], [350, 460]], { w: 4, color: PAL.accent, draw: inv(3.6, 3.9, t), taper: 0.2 });
      text(typed('not a teardrop', t - 3.7, 30), 420, 510, { kind: 'sans', size: 24, weight: 600, align: 'center' }); });
  },
};
/* ---------- plate V · the whole route (ink bleed): pull out from a close-up, the path retraces ---------- */
const ROUTE = [[560, 300], [560, 470], [700, 690], [1100, 690], [1500, 724], [1760, 740]];
const P5 = {
  dur: 7.5, dark: false, enter: { type: 'bleed', dur: 0.9 },
  cam: t => ({ x: 640, y: 440, s: kf(t, [[0, 1.6], [3.0, 1.0], [7.5, 1.06]], E.inOut3), dx: kf(t, [[0, 60], [3.0, 0], [7.5, -50]], E.inOutSine) }),
  header: { num: 5, title: 'The Whole Route', sub: 'every plate, retraced' }, stage: { n: 5, name: 'RETURN' },
  log: t => ({ title: `JOURNEY LOG · ${HERO}`, rows: [['ELAPSED', 'T+ 4 h'], ['ALTITUDE', '0 m']], states: STATES, state: 1 }),
  hero: t => { const [x, y] = along(ROUTE, E.inOut3(inv(1.8, 5.2, t))); return { x, y, label: HERO, r: 26 }; },
  cues: [[2.2, 'plink', { f: note(660, 0) }], [3.0, 'plink', { f: note(660, 2) }], [3.8, 'plink', { f: note(660, 4) }], [4.6, 'plink', { f: note(660, 5) }], [5.3, 'chime', { f: 784 }]],
  draw(t) {
    landscape(t);
    sun(1180, 170, t);
    lobedCloud(560 + 10 * Math.sin(t * 0.4), 400, CLOUD, { seed: 21 }); lobedCloud(1400 + t * 18, 260, SMALL_CLOUD, { seed: 26 });
    rain(330, 800, 420, 640, t, 16, 0.8);
    journeyPath(ROUTE, { draw: E.inOut3(inv(1.8, 5.2, t)), waypoints: [{ u: 0.03, label: 'I' }, { u: 0.25, label: 'II · III' }, { u: 0.45, label: 'IV' }, { u: 0.97, label: 'V', dx: -30, dy: -20 }] });
  },
};
/* ---------- end card (page roll) ---------- */
const END = {
  dur: 5, dark: true, enter: { type: 'page', dur: 1.0 }, counter: false, focus: () => [960, 400],
  hero: t => ({ x: 960, y: 400, r: 70, tag: false, alpha: inv(0.3, 1, t) }),
  cues: [[1.0, 'chime', { f: 392 }], [0.6, 'scratch', { chars: 34, cps: 22 }]],
  draw(t) {
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + t * 0.25, [dx, dy] = wander(i, t, 10, 0.7), rr = 150 + 30 * Math.sin(i * 1.7);
      withAlpha(inv(0.4, 1.2, t) * 0.8, () => ink(shape.circle(960 + Math.cos(a) * rr + dx, 400 + Math.sin(a) * rr * 0.6 + dy, 3 + (i % 3), 10), { closed: true, w: 1, color: '#9fb4ff', fill: 'rgba(80,110,200,0.5)', amp: 0.2, seed: i })); }
    const q = 'Every drop is on its way somewhere.', qo = { kind: 'display', size: 56, italic: true, color: PAL.nightInk, cps: 22 };
    dropText(q, 960 - measure(q, qo) / 2, 640, t - 0.6, qo);
    const rl = E.out3(inv(2.2, 2.9, t)); if (rl > 0) pen([[960 - 300 * rl, 676], [960 + 300 * rl, 676]], { w: 1.4, color: PAL.peri, taper: 0.3 });
    const col = `ONE DROP  ·  5 PLATES  ·  ${fmt(TOTAL_F)} FRAMES  ·  DRAWN IN CODE`, co = { kind: 'mono', size: 20, ls: 6, color: '#9fa0c8' };
    text(typed(col, t - 2.4, 60), 960 - measure(col, co) / 2, 724, co);
    const src = 'NOTES  ·  ROUNDED, ILLUSTRATIVE VALUES', so = { kind: 'mono', size: 15, ls: 5, color: PAL.nightMuted };
    text(typed(src, t - 3.4, 60), 960 - measure(src, so) / 2, 930, so);
  },
};
defineStory({ title: 'One Drop', stages: 5, music: { tonic: 220 }, plates: [T0, P1, P2, P3, P4, P5, END] });
boot();
