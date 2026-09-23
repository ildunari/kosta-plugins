/* =====================================================================
   DOODLE ART ANIMATION ENGINE v3  ·  one <canvas>, every frame computed from f
   renderFrame(f) is a pure function of the frame number: no wall-clock, no
   Math.random, no state carried between frames. Same f -> same pixels.
   ===================================================================== */
const W = 1920, H = 1080, FPS = 24;
const QS = new URLSearchParams(location.search);
const RENDER = QS.has('render');
const cvs = document.getElementById('stage');
let ctx = cvs.getContext('2d');          // `let`: layer() swaps it to draw offscreen
cvs.width = W; cvs.height = H;

/* ---------- palette + type (override per story with Object.assign) ---------- */
const PAL = {
  paper: '#ebe2cc', stripe: 'rgba(205,175,115,0.10)', ink: '#1b1518', inkSoft: '#4a3f35',
  muted: '#8a8176', peri: '#8487c6', accent: '#d8643a', accentDeep: '#b44e2e',
  panel: '#ece6d8', panelEdge: '#2a2226', panelAlpha: 0.92, cloudFill: '#efe9db',
  sea: '#2f7f98', seaDeep: '#22657b', sun: '#e3a03c', leaf: '#6f9a58', soil: '#baa27e',
  night: '#0b0a1e', night2: '#16142e', nightInk: '#dcdcef', nightMuted: '#77789a',
  label: '#544b42', nightLabel: '#9c9dc0',   // secondary TEXT (labels, subs, axes): muted but >= 4.5:1 on paper / night. muted/nightMuted are for lines.
  pink: '#e8577a', navyFill: '#26336a', gold: '#e6c65c', cyan: '#56c3d2', mint: '#53ba8b',
  topo: ['#d98a8a', '#6fb5b8', '#d9c06a', '#9a9ad4'],
  // plate furniture, per world (a paper set restyles these with the rest of its palette; see GROUNDS below)
  mark: 'rgba(110,110,170,0.45)', nightMark: 'rgba(160,160,220,0.35)',          // registration marks
  shadow: 'rgba(40,30,20,0.13)', nightShadow: 'rgba(0,0,6,0.45)',               // a torn card's drop shadow
  cardTint: 'rgba(252,248,238,0.40)', nightCardTint: 'rgba(34,32,70,0.30)', cardEdge: 'rgba(42,34,38,0.42)', nightCardEdge: 'rgba(170,170,230,0.40)',
  dialShadow: 'rgba(40,30,20,0.10)', figShadow: 'rgba(40,30,20,0.12)',          // the stage dial's and a card()'s shadow on paper
  nightPanel: 'rgba(20,20,48,0.92)', nightPanelEdge: 'rgba(160,160,220,0.35)',    // stage dial at night
  nightFig: 'rgba(18,18,44,0.92)', nightFigEdge: 'rgba(170,170,230,0.45)',        // card() at night
  counter: 'rgba(90,80,70,0.6)', nightCounter: 'rgba(160,160,210,0.6)',          // the frame counter
  nightSoft: '#b9b9d6', nightSoft2: '#b3b3d2',                                     // soft text at night (inkSoft on paper)
  lens: '#e9e7f5', lensEdge: 'rgba(132,135,198,0.8)',                              // lens and iris rings
  nightCurtain: '#07061a', rim: [70, 52, 40], nightRim: [16, 14, 44],              // iris curtain at night; an ink drop's pooled rim
  pageBack: 'rgba(255,252,240,0.35)', nightPageBack: 'rgba(60,60,110,0.25)',       // the back of a turned page
};
const FONT = {
  display: '"Fraunces", Georgia, serif',
  sans: '"Inter Tight", "Helvetica Neue", Arial, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
};
const FONT_LOADS = ['500 64px Fraunces', 'italic 400 30px Fraunces', '400 30px Fraunces',
  '600 30px "Inter Tight"', '400 22px "Inter Tight"', '400 18px "IBM Plex Mono"', '600 18px "IBM Plex Mono"'];

/* ---------- math, easing, beats ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));          // progress of x inside [a,b]
const TAU = Math.PI * 2;
const E = {
  lin: t => t,
  in2: t => t * t, in3: t => t * t * t,
  out2: t => 1 - (1 - t) ** 2, out3: t => 1 - (1 - t) ** 3,
  inOut3: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
  inOut5: t => t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - 2 ** (-10 * t),
  outBack: t => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  outBack2: t => { const c = 2.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  anticipate: t => { const c = 1.7; return t * t * ((c + 1) * t - c); },       // small pull-back, then go
  outElastic: t => t >= 1 ? 1 : 1 - 2 ** (-7 * t) * Math.cos(t * TAU * 1.15),  // spring settle (objects, not text)
  in5: t => t ** 5, out5: t => 1 - (1 - t) ** 5,
  inOut2: t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  inSine: t => 1 - Math.cos(t * Math.PI / 2), outSine: t => Math.sin(t * Math.PI / 2),
  inExpo: t => t <= 0 ? 0 : 2 ** (10 * t - 10),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  inBack: t => { const c = 1.7; return (c + 1) * t ** 3 - c * t * t; },
  inOutBack: t => { const c = 1.7 * 1.525; return t < .5 ? ((2 * t) ** 2 * ((c + 1) * 2 * t - c)) / 2 : ((2 * t - 2) ** 2 * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; },
  outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
  hold: t => t < 1 ? 0 : 1,                                                     // jump at the end of a segment
  /** spring(k): a settle with k overshoots (1 = one gentle bounce past the target) */
  spring: (k = 1) => t => t >= 1 ? 1 : 1 - Math.exp(-5 * t) * Math.cos(t * Math.PI * (k + 0.5)),
};
/**
 * Shaped speed. Real moves are asymmetric: arrivals attack fast and release long; departures build slowly and finish
 * quickly. shaped(a, pIn, pOut) starts and ends at rest with its speed peak at a (a < 0.5: arrival, a > 0.5: departure).
 */
E.shaped = (a = 0.3, pIn = 2, pOut = 3) => { const A = pOut * a / (pOut * a + pIn * (1 - a));
  return t => t <= 0 ? 0 : t >= 1 ? 1 : t < a ? A * (t / a) ** pIn : 1 - (1 - A) * ((1 - t) / (1 - a)) ** pOut; };
/** ramp(a, r): speeds up over a, cruises, slows over r (sine corners): the lowest peak for an asymmetric move, for zooms where the speed limits bind */
E.ramp = (a = 0.2, r = 0.55) => { const V = 1 / (1 - (a + r) / 2), P = Math.PI; return t => { t = clamp(t);
  if (t < a) return V * (t / 2 - a / (2 * P) * Math.sin(P * t / a)); if (t <= 1 - r) return V * (a / 2 + t - a);
  const u = t - 1 + r; return V * (a / 2 + 1 - a - r + u / 2 + r / (2 * P) * Math.sin(P * u / r)); }; };
/** whip(v0): an arrival that starts already moving at v0 (share of the travel per unit time), so a pan picks up the camera's speed */
E.whip = (v0 = 0) => { const b = E.shaped(0.4, 2, 3); return t => b(t) + v0 * t * (1 - t) ** 3; };
/** inFrom(v0): an ease-in that starts at speed v0, for a move that continues an incoming push */
E.inFrom = (v0 = 0) => t => v0 * t + (1 - v0) * t * t;
E.arrive = E.shaped(0.3, 2, 3);        // speed peaks at 30%: half the travel by 34%, 90% by 62%
E.arriveSoft = E.ramp(0.2, 0.55);      // asymmetric, but no faster at its peak than inOutSine
E.depart = E.shaped(0.62, 2.5, 2);     // builds, then catches: 90% by 82%
const EASE_FACTORIES = { spring: 1, shaped: 1, ramp: 1, whip: 1, inFrom: 1 };
/** easeOf('inOut3' | fn | null): an easing by name (factories by name use their defaults), a function, or linear */
const easeOf = e => typeof e === 'function' ? e : e && E[e] ? (EASE_FACTORIES[e] ? E[e]() : E[e]) : E.lin;
/**
 * curve(t, keys, { geo }): a value over time with its own easing per segment. keys = [[t, value, ease?], ...]; the
 * ease on a key shapes the segment that ends there (name or function, default inOut3). Repeat a value to hold it.
 * geo: true interpolates positive numbers geometrically (use it for zoom scales, so zooms never rush or stall).
 */
function curve(t, keys, { geo = false } = {}) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [ta, va] = keys[i - 1], [tb, vb, eb] = keys[i], e = easeOf(eb ?? 'inOut3')(inv(ta, tb, t));
    const mix = (a, b) => geo && a > 0 && b > 0 ? zlerp(a, b, e) : lerp(a, b, e);
    return Array.isArray(va) ? va.map((v, j) => mix(v, vb[j])) : mix(va, vb);
  }
  return keys[keys.length - 1][1];
}
/** keyframed value: kf(t, [[t0,v0],[t1,v1],...], ease); values may be numbers or [x,y] */
function kf(t, keys, ease = E.inOut3) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [ta, va] = keys[i - 1], [tb, vb] = keys[i], e = ease(inv(ta, tb, t));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], e)) : lerp(va, vb, e);
  }
  return keys[keys.length - 1][1];
}
/** beat(t, t0, t1) -> 0..1: eases in at t0, holds, eases out so it is gone at t1 (t1 = null: never leaves) */
function beat(t, t0, t1 = null, o = {}) {
  const a = E.out3(inv(t0, t0 + (o.in ?? 0.35), t));
  return t1 == null ? a : Math.min(a, 1 - E.inOutSine(inv(t1 - (o.out ?? 0.4), t1, t)));
}
/** stagger(i, t, {t0, step, dur, ease}) -> eased 0..1 for the i-th item of a group */
const stagger = (i, t, { t0 = 0, step = 0.08, dur = 0.4, ease = E.out3 } = {}) => ease(inv(t0 + i * step, t0 + i * step + dur, t));
/** run fn with globalAlpha scaled; skipped entirely at 0 */
function withAlpha(a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); }
/**
 * relAlpha(fn): run story code with globalAlpha measured from the alpha it was handed. Plates often write
 * ctx.globalAlpha = 0.4 … ctx.globalAlpha = 1; inside a transition that threw the fade away, so the art stayed at full
 * strength and vanished in one drawing. While fn runs, reading globalAlpha gives 1 at the start and writing x sets
 * x × the fade, so `= 1` means "back to what I was handed". Engine code keeps using *=, which reads the same either way.
 */
const ALPHA_PROP = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha');
function relAlpha(fn) {
  const c = ctx, base = ALPHA_PROP.get.call(c); if (base >= 1) return fn();
  const had = Object.getOwnPropertyDescriptor(c, 'globalAlpha');     // nested: this layer's base is the outer native value
  Object.defineProperty(c, 'globalAlpha', { configurable: true,
    get() { return ALPHA_PROP.get.call(this) / base; }, set(v) { if (v >= 0 && v <= 1) ALPHA_PROP.set.call(this, v * base); } });   // out of range is ignored, as the canvas does
  try { return fn(); } finally { if (had) Object.defineProperty(c, 'globalAlpha', had); else delete c.globalAlpha; }
}
/** seconds a line needs on screen: 12 chars/s reading + 0.8 s hold */
const readTime = s => s.length / 12 + 0.8;

/* ---------- deterministic randomness ---------- */
function mulberry(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash3(a, b = 0, c = 0) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, seed = 0) {                        // smooth 1-D value noise in [-1,1]
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash3(i, seed), hash3(i + 1, seed), u) * 2 - 1;
}
// per-frame globals. dark: the plate being drawn is a night plate; ground: its paper (GROUNDS); grounds: its set's
// { light, dark } papers; raw: true while a treated plate draws its scene (paper lookups give the untreated texture)
const S = { f: 0, boil: 0, T: 0, morph: false, trans: null, side: null, noReticle: false, dark: false, ground: null, grounds: null, raw: false };
/** jitter that re-rolls every 2 frames: the hand-drawn "boil" (animation on twos) */
const boil = (seed, k, amp) => (hash3(seed, k, S.boil) - 0.5) * 2 * amp;

/* ---------- geometry ---------- */
const shape = {
  circle(cx, cy, r, n = 56) { return Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * TAU), cy + r * Math.sin(i / n * TAU)]); },
  ellipse(cx, cy, rx, ry, rot = 0, n = 48) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return Array.from({ length: n }, (_, i) => { const a = i / n * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); return [cx + x * c - y * s, cy + x * s + y * c]; });
  },
  blob(cx, cy, r, seed = 1, irr = 0.15, n = 48, rot = 0) {
    const R = mulberry(seed), p = [R() * TAU, R() * TAU, R() * TAU];
    return Array.from({ length: n }, (_, i) => { const a = i / n * TAU + rot;
      const k = 1 + irr * (0.6 * Math.sin(2 * a + p[0]) + 0.35 * Math.sin(3 * a + p[1]) + 0.2 * Math.sin(5 * a + p[2])) / 1.15;
      return [cx + r * k * Math.cos(a), cy + r * k * Math.sin(a)]; });
  },
  rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; },
  arc(cx, cy, r, a0, a1, n = 32) { return Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }); },
  /** simple scalloped cloud outline (upper envelope of circles). For drawn clouds prefer lobedCloud(). */
  cloud(x, base, bumps, step = 5) {
    const x0 = Math.min(...bumps.map(([d, r]) => x + d - r)), x1 = Math.max(...bumps.map(([d, r]) => x + d + r)), top = [];
    for (let px = x0; px <= x1; px += step) { let y = base;
      for (const [d, r] of bumps) { const dx = px - (x + d); if (Math.abs(dx) < r) y = Math.min(y, base - r * 0.35 - Math.sqrt(r * r - dx * dx)); }
      top.push([px, y]); }
    return [[x0, base], ...top, [x1, base]];
  },
  /** open ridge line x0..x1 around y0 (hills, horizons, ground layers) */
  ridge(x0, x1, y0, amp, seed = 1, freq = 0.004, step = 12) {
    const out = []; for (let x = x0; x <= x1 + 0.1; x += step) out.push([x, y0 + amp * (0.7 * vnoise(x * freq, seed) + 0.3 * vnoise(x * freq * 3, seed + 9))]); return out;
  },
  /** close an open ridge down to y (filled bands) */
  band(ridge, yBottom) { return [...ridge, [ridge[ridge.length - 1][0], yBottom], [ridge[0][0], yBottom]]; },
  /** the region between two ridges (a ground layer) */
  between(top, bottom) { return [...top, ...bottom.slice().reverse()]; },
};
function bounds(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; }
function pathLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
/** point at fraction u along a polyline (motion paths) */
function along(p, u) {
  let target = pathLen(p) * clamp(u);
  for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (target <= l) { const k = l ? target / l : 0; return [lerp(p[i - 1][0], p[i][0], k), lerp(p[i - 1][1], p[i][1], k)]; } target -= l; }
  return p[p.length - 1];
}
/** n points evenly spaced by arc length */
function resample(pts, n, closed = true) { const p = closed ? pts.concat([pts[0]]) : pts; return Array.from({ length: n }, (_, i) => along(p, i / (closed ? n : n - 1))); }
/** Chaikin corner cutting: turns a rough polyline into a curve a pen can follow */
function smooth(pts, k = 2, closed = false) {
  let p = pts;
  for (let r = 0; r < k; r++) { const q = [], n = closed ? p.length : p.length - 1; if (!closed) q.push(p[0]);
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]); }
    if (!closed) q.push(p[p.length - 1]); p = q; }
  return p;
}
/** morph(A, B, u): interpolate two closed shapes, aligning start point and winding so nothing twists */
function morph(A, B, u, n = 72) {
  const a = resample(A, n), b0 = resample(B, n), b1 = b0.slice().reverse(); let best = null, bd = Infinity;
  for (const b of [b0, b1]) for (let k = 0; k < n; k++) { let d = 0; for (let i = 0; i < n; i += 3) { const q = b[(i + k) % n]; d += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } if (d < bd) { bd = d; best = [b, k]; } }
  const [b, k] = best; return a.map((p, i) => { const q = b[(i + k) % n]; return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; });
}
/**
 * morphPose(A, B, u, pa, pb): morph two outlines that each live in their own local frame (centred on 0, 0) while the
 * frame itself travels: pa / pb = { x, y, rot, s }. Shape, position, turn and size all blend together, so one object
 * turns into another without collapsing. Returns screen points. Use it to write object-to-object seams.
 */
function morphPose(A, B, u, pa, pb, n = 72) {
  const M = morph(A.map(([x, y]) => [x * pa.s, y * pa.s]), B.map(([x, y]) => [x * pb.s, y * pb.s]), u, n);
  const x = lerp(pa.x, pb.x, u), y = lerp(pa.y, pb.y, u), r = lerp(pa.rot || 0, pb.rot || 0, u), c = Math.cos(r), sn = Math.sin(r);
  return M.map(([px, py]) => [x + px * c - py * sn, y + px * sn + py * c]);
}
/** gather(targets, t, {t0, dur, spread, seed}) -> [[x,y,u],...]: particles fly in from a scatter to form a shape */
function gather(targets, t, { t0 = 0, dur = 1.2, spread = 400, seed = 9 } = {}) {
  const r = mulberry(seed);
  return targets.map(([tx, ty]) => { const a = r() * TAU, d = spread * (0.3 + r()), s = t0 + r() * 0.4, u = E.inOut3(inv(s, s + dur, t));
    return [lerp(tx + Math.cos(a) * d, tx, u), lerp(ty + Math.sin(a) * d, ty, u), u]; });
}

/* ---------- ink: hand-drawn strokes and pen textures ---------- */
function wobble(pts, closed, amp, seed, step = 9) {
  if (amp <= 0) return pts;
  const n = pts.length, segs = closed ? n : n - 1, ms = [];
  let M = 0; for (let i = 0; i < segs; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; const m = Math.max(1, Math.ceil((Math.hypot(x1 - x0, y1 - y0) || 1) / step)); ms.push(m); M += m; }
  const out = []; let k = 0;
  for (let i = 0; i < segs; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let j = 0; j < ms[i]; j++) {
      // closed shapes blend toward the start so the noise has no seam where the outline meets itself
      const nz = closed ? lerp(vnoise(k * 0.3, seed), vnoise((k - M) * 0.3, seed), k / M) : vnoise(k * 0.3, seed);
      const d = nz * amp + boil(seed, k, amp * 0.45);
      out.push([lerp(x0, x1, j / ms[i]) + nx * d, lerp(y0, y1, j / ms[i]) + ny * d]); k++;
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function trace(p, closed) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); if (closed) ctx.closePath(); }
function partial(p, frac, closed) {
  if (closed) p = p.concat([p[0]]);
  let target = pathLen(p) * clamp(frac); const out = [p[0]];
  for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (target >= l) { out.push(p[i]); target -= l; } else { const u = l ? target / l : 0; out.push([lerp(p[i - 1][0], p[i][0], u), lerp(p[i - 1][1], p[i][1], u)]); break; } }
  return out;
}
/**
 * ink(points, opts): a hand-inked line or shape with constant width (measurement lines, small repeated marks).
 * opts: closed, w, color, fill, fillAlpha, amp (wobble px), seed, draw (0..1 draw-on), alpha, dash, cap,
 *       double (faint second contour), fillReveal ('sweep' fills left-to-right during the last 45% of draw)
 */
/** strokeW(w): a line's width on the current paper. A paper with stroke: { min, from } (the chalkboard) draws every pen() and
    ink() line of `from` px or more at least `min` px wide, as chalk is; thinner lines (hatching, HUD rules) keep their width */
const strokeW = w => { const k = S.ground && S.ground.stroke; return k && w >= (k.from ?? 2.5) ? Math.max(w, k.min) : w; };
function ink(pts, o = {}) {
  const { closed = false, w: w0 = 3, color = PAL.ink, fill = null, amp = 1.2, seed = 1, draw = 1, alpha = 1, dash = null, fillAlpha = 1, fillReveal = null, double = false } = o, w = strokeW(w0);
  if (draw <= 0 || alpha <= 0) return pts;
  const p = wobble(pts, closed, amp, seed);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineJoin = 'round'; ctx.lineCap = o.cap || 'round';
  const fr = draw >= 1 ? 1 : fillReveal ? E.out3(inv(0.55, 1, draw)) : 0;
  if (fill && fr > 0) {
    ctx.save();
    if (fr < 1) { const b = bounds(p); ctx.beginPath(); ctx.rect(b.x0 - 2, b.y0 - 2, (b.x1 - b.x0 + 4) * fr, b.y1 - b.y0 + 4); ctx.clip(); }
    trace(p, closed); ctx.globalAlpha *= fillAlpha; ctx.fillStyle = fill; ctx.fill(); ctx.restore();
  }
  if (w > 0) { const q = draw < 1 ? partial(p, draw, closed) : p; trace(q, closed && draw >= 1); ctx.lineWidth = w; ctx.strokeStyle = color; if (dash) ctx.setLineDash(dash); ctx.stroke(); }
  ctx.restore();
  if (double && w > 0) ink(pts, { ...o, fill: null, double: false, seed: seed + 17, w: w * 0.7, alpha: alpha * 0.35 });
  return p;
}
/**
 * pen(points, opts): a nib stroke. Width follows a pressure profile: tapered ends, slow hand-pressure variation,
 * and a pen-tip taper on the leading end while drawing on. Use it for subject outlines, horizons, rays, rain, branches.
 * opts: w, color, seed, amp, draw, alpha, taper (fraction of length), minW, closed, pressure(u) -> 0..1
 */
function pen(pts, o = {}) {
  const { w: w0 = 3.5, color = PAL.ink, seed = 1, amp = 1.0, draw = 1, alpha = 1, taper = 0.16, closed = false, minW = 0.25 } = o, w = strokeW(w0);
  if (draw <= 0 || alpha <= 0) return;
  let p = wobble(pts, closed, amp, seed); if (closed) p = p.concat([p[0]]);
  const Lfull = pathLen(p); if (Lfull <= 0) return;
  if (draw < 1) p = partial(p, draw, false);
  if (p.length < 2) return;
  const Lpart = pathLen(p);
  const prof = o.pressure || (u => { const tp = closed ? 1 : Math.min(1, Math.min(u, 1 - u) / taper);
    return (minW + (1 - minW) * Math.sqrt(tp)) * (0.82 + 0.18 * vnoise(u * 7 + seed, seed + 3)); });
  const left = [], right = []; let s = 0;
  for (let i = 0; i < p.length; i++) {
    if (i) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    let hw = w * prof(s / Lfull) / 2;
    if (draw < 1) hw *= Math.min(1, (Lpart - s) / (taper * Lfull) + 0.05);
    left.push([p[i][0] - dy / l * hw, p[i][1] + dx / l * hw]); right.push([p[i][0] + dy / l * hw, p[i][1] - dx / l * hw]);
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  trace(left.concat(right.reverse()), true); ctx.fill();
  ctx.beginPath();
  for (const [q, u] of [[p[0], 0], [p[p.length - 1], Lpart / Lfull]]) { const hw = Math.max(0.3, w * prof(u) / 2 * (draw < 1 && u > 0 ? 0.3 : 1)); ctx.moveTo(q[0] + hw, q[1]); ctx.arc(q[0], q[1], hw, 0, TAU); }
  ctx.fill(); ctx.restore();
}
/** fill a polygon with flat colour (no outline) */
function flat(p, color, alpha = 1) { ctx.save(); ctx.globalAlpha *= alpha; trace(p, true); ctx.fillStyle = color; ctx.fill(); ctx.restore(); }
/**
 * hatch(polygon, opts): short parallel pen dashes clipped to the polygon. Only walks rows that can touch the bbox.
 * opts: angle, gap, len, color, alpha, w, seed, jit, keep (0..1, or fn(x,y) -> 0..1 for shading)
 */
function hatch(p, o = {}) {
  const { angle = -0.45, gap = 7, len = 12, color = PAL.ink, alpha = 0.3, w = 1.3, seed = 3, keep = 0.8, jit = 1.2 } = o;
  const bb = bounds(p), ca = Math.cos(angle), sa = Math.sin(angle);
  const cs = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]];
  const us = cs.map(([x, y]) => ca * x + sa * y), vs = cs.map(([x, y]) => -sa * x + ca * y);
  const u0 = Math.min(...us) - len, u1 = Math.max(...us) + len, v0 = Math.min(...vs), v1 = Math.max(...vs);
  ctx.save(); trace(p, true); ctx.clip(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  const r = mulberry(seed); ctx.beginPath(); let row = 0;
  for (let v = v0; v <= v1; v += gap, row++) {
    let u = u0 + r() * len * 2, k = 0;
    while (u < u1) { const L = len * (0.55 + r() * 0.9), rv = r(), px = ca * u - sa * v, py = sa * u + ca * v;
      const kp = typeof keep === 'function' ? keep(px, py) : keep;
      if (rv < kp) { const j = boil(seed + row, k, jit); ctx.moveTo(px - sa * j, py + ca * j); ctx.lineTo(px + ca * L - sa * j, py + sa * L + ca * j); }
      u += L + 3 + r() * len * 0.8; k++; }
  }
  ctx.stroke(); ctx.restore();
}
/** shade(polygon, opts): hatch that thickens away from the light (default light from upper-left) */
function shade(p, o = {}) {
  const bb = bounds(p), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rx = (bb.x1 - bb.x0) / 2 || 1, ry = (bb.y1 - bb.y0) / 2 || 1;
  const [lx, ly] = o.light || [-0.6, -0.8], base = o.base ?? 0.08, gain = o.gain ?? 0.9;
  hatch(p, { gap: 4.5, len: 8, alpha: 0.6, w: 1.5, ...o, keep: (x, y) => base + gain * clamp(-(((x - cx) / rx) * lx + ((y - cy) / ry) * ly) * 0.8 + 0.1) });
}
/** crosshatch(polygon, opts): two hatch passes at ±angle (sun, rock, deep shadow) */
function crosshatch(p, o = {}) { hatch(p, { gap: 5, len: 9, alpha: 0.45, ...o, angle: o.angle ?? 0.6 }); hatch(p, { gap: 5, len: 9, alpha: 0.45, ...o, angle: -(o.angle ?? 0.6), seed: (o.seed ?? 3) + 50 }); }
/** speckle(polygon, n, opts): scattered dots (grain, stone, "stars" inside night bodies) */
function speckle(p, n, o = {}) {
  const { color = '#fff', alpha = 0.5, rmin = 0.8, rmax = 2, seed = 5 } = o;
  const bb = bounds(p), r = mulberry(seed);
  ctx.save(); trace(p, true); ctx.clip(); ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.beginPath();
  for (let i = 0; i < n; i++) { const x = lerp(bb.x0, bb.x1, r()), y = lerp(bb.y0, bb.y1, r()), rr = lerp(rmin, rmax, r()); ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU); }
  ctx.fill(); ctx.restore();
}
/** stipple(polygon, n, opts): fine ink dots (soil, sand, shadow) */
function stipple(p, n, o = {}) { speckle(p, n, { color: PAL.ink, alpha: 0.35, rmin: 0.6, rmax: 1.6, ...o }); }
/** scribble(polygon, opts): one continuous zig-zag pencil stroke clipped to the polygon (rock, rub-outs) */
function scribble(p, o = {}) {
  const { gap = 9, color = PAL.ink, alpha = 0.35, w = 1.4, seed = 4, angle = -0.6, draw = 1, jit = 3 } = o;
  const bb = bounds(p), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + gap;
  const ca = Math.cos(angle), sa = Math.sin(angle), r = mulberry(seed), pts = []; let dir = 1;
  for (let v = -R; v <= R; v += gap) {
    const a = dir > 0 ? -R + r() * gap : R - r() * gap, b = dir > 0 ? R - r() * gap : -R + r() * gap;
    for (let k = 0; k <= 5; k++) { const u = lerp(a, b, k / 5), jv = v + (r() - 0.5) * jit * 2; pts.push([cx + ca * u - sa * jv, cy + sa * u + ca * jv]); }
    dir = -dir;
  }
  ctx.save(); trace(p, true); ctx.clip(); ink(pts, { w, color, alpha, amp: 1.5, seed: seed + 1, draw }); ctx.restore();
}
/** pebbles(polygon, n, opts): loose ovals (gravel, aquifers, riverbeds) */
function pebbles(p, n, o = {}) {
  const { rmin = 5, rmax = 14, color = PAL.ink, alpha = 0.5, w = 1.1, seed = 8, fill = null } = o;
  const bb = bounds(p), r = mulberry(seed);
  ctx.save(); trace(p, true); ctx.clip(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) { const x = lerp(bb.x0, bb.x1, r()), y = lerp(bb.y0, bb.y1, r()), rr = lerp(rmin, rmax, r()), rot = r() * TAU;
    ink(shape.ellipse(x, y, rr, rr * (0.55 + r() * 0.4), rot, 12), { closed: true, w, color, fill, amp: rr * 0.16, seed: seed + i }); }
  ctx.restore();
}
/** grass(ridge, opts): tufts along a ground line that sway (opts.sway px); draw 0..1 grows them left to right */
function grass(ridge, o = {}) {
  const { every = 26, h = 14, color = PAL.leaf, seed = 9, draw = 1, w = 1.6 } = o, n = Math.floor(pathLen(ridge) / every);
  for (let i = 0; i < n * draw; i++) { const [x, y] = along(ridge, i / n), r = mulberry(seed + i);
    for (let k = 0; k < 3; k++) { const dx = (r() - 0.5) * 10, hh = h * (0.6 + r() * 0.8), sw = (o.sway ?? 3) * Math.sin(S.T * 1.7 + x * 0.013 + k);
      ink([[x + dx, y], [x + dx + (r() - 0.5) * 8 + sw, y - hh]], { w, color, amp: 0.4, seed: seed + i * 3 + k }); } }
}
/**
 * lobedCloud(x, base, bumps, opts): the house cloud. bumps = [[dx, r, dy?], ...]. Each lobe is its own outlined
 * disc, drawn back to front so front lobes cut the ones behind, pen-shaded on its underside, closed by a flat base.
 * opts: w, color, fill, seed, draw (lobes appear one by one, then the base), hatchColor, alpha
 */
function lobedCloud(x, base, bumps, o = {}) {
  const { w = 3.2, color = PAL.ink, fill = PAL.cloudFill, seed = 5, draw = 1, hatchColor = PAL.ink, alpha = 1 } = o;
  if (draw <= 0 || alpha <= 0) return;
  const lobes = bumps.map(([d, r, dy = 0], i) => ({ cx: x + d, cy: base - r * 0.38 - dy, r, i })).sort((a, b) => (a.cy + a.r) - (b.cy + b.r));
  const x0 = Math.min(...lobes.map(l => l.cx - l.r)), x1 = Math.max(...lobes.map(l => l.cx + l.r));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.rect(x0 - 30, base - 3000, x1 - x0 + 60, 3000); ctx.clip();
  lobes.forEach((l, k) => {
    const d = inv(k / lobes.length * 0.8, k / lobes.length * 0.8 + 0.25, draw); if (d <= 0) return;
    const c = shape.circle(l.cx, l.cy, l.r, 40);
    ink(c, { closed: true, w, color, fill, amp: 1, seed: seed + l.i, draw: d, fillReveal: 'sweep' });
    if (d >= 1) { hatch(c, { color: hatchColor, alpha: 0.42, gap: 4.5, len: 8, angle: -0.5, w: 1.2, seed: seed + 10 + l.i, keep: (px, py) => 0.95 * clamp((py - l.cy) / l.r + 0.3) ** 1.6 });
      hatch(c, { color: hatchColor, alpha: 0.25, gap: 7, len: 12, angle: 0.05, w: 1.1, seed: seed + 30 + l.i, keep: (px, py) => 0.8 * clamp((py - l.cy) / l.r - 0.1) ** 2 }); }
  });
  ctx.restore();
  const bd = E.out3(inv(0.75, 1, draw));
  if (bd > 0) withAlpha(alpha, () => { flat(shape.rect(x0 + 2, base - 1, (x1 - x0 - 4) * bd, 6), fill); pen([[x0 + 2, base], [x1 - 2, base]], { w: w + 0.6, color, seed: seed + 99, draw: bd, taper: 0.05 }); });
}
/** eraseOut(polygon, p, dark): a hand rubs an object out with a paper-coloured scribble; returns the alpha to draw it with */
function eraseOut(poly, p, dark = false) {
  if (p <= 0) return 1; if (p >= 1) return 0;
  scribble(poly, { color: dark ? PAL.night : PAL.paper, alpha: 0.9, w: lerp(2, 14, p), gap: lerp(30, 10, p), seed: 77, angle: 0.45, draw: clamp(p * 1.4) });
  return 1 - E.in2(inv(0.6, 1, p));
}
function arrowHead(x, y, ang, s = 12, color = PAL.ink, w = 2.5) {
  ink([[x - s * Math.cos(ang - 0.45), y - s * Math.sin(ang - 0.45)], [x, y], [x - s * Math.cos(ang + 0.45), y - s * Math.sin(ang + 0.45)]], { w, color, amp: 0.4 });
}
/** arrowPath(path, opts): a line drawn along a path, the head riding its moving end */
function arrowPath(path, o = {}) {
  const { draw = 1, w = 2.4, color = PAL.ink, head = 12, dash = null, amp = 0.8, seed = 3 } = o; if (draw <= 0) return;
  const p = partial(path, draw); ink(p, { w, color, dash, amp, seed });
  const e = p[p.length - 1], q = along(path, Math.max(0, draw - 0.02)); arrowHead(e[0], e[1], Math.atan2(e[1] - q[1], e[0] - q[0]), head, color, w);
}
/** fluxArrow(path, opts): hollow hatched ribbon arrow; width ∝ √flux on recap plates */
function fluxArrow(path, o = {}) {
  const { width = 30, draw = 1, fill = '#a9c6d4', color = PAL.ink, w = 2.4, seed = 6 } = o; if (draw <= 0) return;
  const L = pathLen(path), hl = Math.min(width * 1.5, L * 0.3), sHead = Math.max(0, L * draw - hl), n = 30, left = [], right = [];
  const norm = u => { const a = along(path, u), b = along(path, Math.min(1, u + 0.01)); const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [a, -dy / l, dx / l]; };
  for (let k = 0; k <= n; k++) { const [a, nx, ny] = norm(sHead * k / n / L); left.push([a[0] + nx * width / 2, a[1] + ny * width / 2]); right.push([a[0] - nx * width / 2, a[1] - ny * width / 2]); }
  const [b, nx, ny] = norm(sHead / L), tip = along(path, draw), hw = width * 0.95;
  const poly = [...left, [b[0] + nx * hw, b[1] + ny * hw], tip, [b[0] - nx * hw, b[1] - ny * hw], ...right.reverse()];
  ink(poly, { closed: true, w, color, fill, amp: 1, seed });
  hatch(poly, { color, alpha: 0.35, gap: 5, len: 9, angle: 0.9, seed: seed + 1, keep: 0.7 });
}
/** journeyPath(path, opts): the hero's route as a dotted line with roman-numeral waypoints (recap plates) */
/** journeyPath(path, {draw, waypoints: [{u, label, dx, dy}], color, dark, w}): a dashed route drawn on, with waypoint rings.
 *  Waypoint labels are role 'label', 22 px, in a darkened (legible) route colour with a glyph halo. */
function journeyPath(path, o = {}) {
  const { draw = 1, waypoints = [], color = PAL.accent, dark = S.dark, w = 2.2 } = o; if (draw <= 0) return;
  ink(partial(path, draw), { w, color, amp: 0.4, dash: [2, 9], seed: 12 });
  waypoints.forEach(({ u, label, dx = 14, dy = -14 }, i) => { if (u > draw) return;
    const [x, y] = along(path, u), a = E.outBack(clamp((draw - u) * 10));
    withAlpha(a, () => { ink(shape.circle(x, y, 9 * a, 18), { closed: true, w: 2, color, fill: dark ? PAL.night : PAL.paper, amp: 0.3, seed: 40 + i });
      haloText(label, x + dx, y + dy, { kind: 'mono', size: 22, weight: 600, role: 'label', dark, color: legible(color, dark) }); }); });
}
/** textOnPath(s, path, u0, opts): glyphs laid along a polyline (rivers, layers, flows). Default 22 px (role 'label'). */
function textOnPath(s, path, u0, o = {}) {
  const { size = 22, kind = 'mono', ls = 2 } = o, L = pathLen(path); let s0 = u0 * L;
  for (const ch of s) { const w = measure(ch, { kind, size }) + ls, u = (s0 + w / 2) / L; if (u > 1) break;
    const a = along(path, u), b = along(path, Math.min(1, u + 0.004));
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); text(ch, -w / 2 + ls / 2, 0, { role: 'label', ...o, kind, size, align: 'left' }); ctx.restore(); s0 += w; }
}

/* ===================== BRUSHES · natural media: pencils, charcoal, markers, pens, spray, watercolor ===================== */
/* Techniques adapted from p5.brush by Alejandro Campos Uribe, MIT (https://github.com/acamposuribe/p5.brush, v2.2.2).
   Nothing is loaded at runtime: the ideas are rebuilt for the 2D canvas.
   - p5.brush stamps thousands of dots per stroke on the GPU. Here a stroke is an outline whose width follows a
     seeded pressure bell (p5.brush's gaussian pressure), filled in layers with grain tiles (paper tooth: pigment only
     catches the high points of the paper), with bristle streaks that follow the curve and, for markers, pigment
     pooled along the edges.
   - A wash is the watercolor recipe p5.brush uses (after Tyler Hobbs): a polygon deformed by recursive midpoint
     displacement, many translucent layers, outline strokes that pool pigment at the edges, blotches erased out,
     and paper grain breaking the colour up. It is rendered once per shape and cached.
   - brush.hatch lays scanline hatching drawn with brush strokes; flow fields are angle functions that bend a stroke
     as it is drawn (p5.brush's plot + field).
   Texture is seeded per shape and anchored to the stroke, so it never re-rolls between drawings (no crawl); only the
   centre line wobbles with the boil, like pen(). Same arguments -> same pixels. */
const brush = (() => {
  const TILE = 256;
  const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  /* ---- caches: raster entries are bounded by pixel count, geometry by entry count (least recently used goes first) */
  function lru(cap, budget = Infinity) {
    const m = new Map(); let used = 0;
    return (key, make, size = () => 1) => {
      if (m.has(key)) { const v = m.get(key); m.delete(key); m.set(key, v); return v.v; }
      const v = make(), s = size(v); m.set(key, { v, s }); used += s;
      while ((m.size > cap || used > budget) && m.size > 1) { const k = m.keys().next().value; used -= m.get(k).s; m.delete(k); }
      return v;
    };
  }
  const rasters = lru(160, 60e6), geom = lru(256);
  /** a stable number for a list of points, relative to its first point (moving a shape keeps its seed and texture) */
  function shapeKey(pts, q = 2) {
    const x0 = pts[0][0], y0 = pts[0][1]; let h = 2166136261 ^ pts.length;
    for (const [x, y] of pts) { h = Math.imul(h ^ Math.round((x - x0) * q), 16777619); h = Math.imul(h ^ Math.round((y - y0) * q), 16777619); }
    return h >>> 0;
  }
  const seedOf = pts => shapeKey(pts, 0.25) % 100000;
  function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }

  /* ---- grain tiles: seamless noise built once, turned into alpha masks, tinted per colour */
  let NZ = null;
  function noise() {
    if (NZ) return NZ;
    const n = TILE * TILE;
    const lattice = (cell, seed) => { const g = TILE / cell, v = new Float32Array(g * g), r = mulberry(seed), out = new Float32Array(n);
      for (let i = 0; i < g * g; i++) v[i] = r();
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy;
        const sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy), x1 = (ix + 1) % g, y1 = (iy + 1) % g;
        const a = v[iy * g + ix], b = v[iy * g + x1], c = v[y1 * g + ix], d = v[y1 * g + x1];
        out[y * TILE + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }
      return out; };
    const r = mulberry(4242), white = new Float32Array(n); for (let i = 0; i < n; i++) white[i] = r();
    const l2 = lattice(2, 11), l4 = lattice(4, 12), l8 = lattice(8, 13), l32 = lattice(32, 14), fine = new Float32Array(n), coarse = new Float32Array(n), wax = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      fine[i] = 0.42 * l2[i] + 0.30 * white[i] + 0.18 * l4[i] + 0.10 * l32[i];     // graphite on laid paper
      coarse[i] = 0.34 * l4[i] + 0.26 * l8[i] + 0.22 * white[i] + 0.18 * l32[i];   // charcoal: bigger pits
      wax[i] = 0.5 * l2[i] + 0.2 * l8[i] + 0.3 * l32[i];                           // coloured pencil: waxy, fewer pinholes
    }
    NZ = { fine, coarse, wax, white, l32 };
    return NZ;
  }
  const masks = new Map(), specIds = new WeakMap();
  const idOf = spec => { let id = specIds.get(spec); if (!id) { id = JSON.stringify(spec); specIds.set(spec, id); } return id; };
  /** mask(spec): a TILE² white alpha tile. spec = { src, lo, hi, gain } thresholds a noise field; { dots } scatters discs */
  function mask(spec) {
    const id = idOf(spec);
    if (masks.has(id)) return masks.get(id);
    const c = newCanvas(TILE, TILE), g = c.getContext('2d');
    if (spec.dots) {
      const r = mulberry(spec.seed || 77); g.fillStyle = '#fff'; g.globalAlpha = spec.gain ?? 1;
      for (let i = 0; i < spec.dots; i++) { const x = r() * TILE, y = r() * TILE, rr = lerp(spec.r0 ?? 0.45, spec.r1 ?? 1.2, r() ** 2);
        for (const dx of [-TILE, 0, TILE]) for (const dy of [-TILE, 0, TILE]) {
          if (x + dx < -3 || x + dx > TILE + 3 || y + dy < -3 || y + dy > TILE + 3) continue;
          g.beginPath(); g.arc(x + dx, y + dy, rr, 0, TAU); g.fill(); } }
    } else {
      const src = noise()[spec.src], im = g.createImageData(TILE, TILE), d = im.data, lo = spec.lo, span = (spec.hi - spec.lo) || 1e-3, gain = spec.gain ?? 1, fl = spec.floor ?? 0;
      for (let i = 0, j = 0; i < src.length; i++, j += 4) { const a = clamp((src[i] - lo) / span); d[j] = d[j + 1] = d[j + 2] = 255; d[j + 3] = 255 * gain * (fl + (1 - fl) * a * a * (3 - 2 * a)); }
      g.putImageData(im, 0, 0);
    }
    masks.set(id, c);
    return c;
  }
  const pats = new Map();
  /** pattern(spec, color): the mask tinted with colour, as a repeating pattern (cached) */
  function pattern(spec, color) {
    const key = idOf(spec) + color;
    let p = pats.get(key);
    if (!p) {
      const c = newCanvas(TILE, TILE), g = c.getContext('2d');
      g.drawImage(mask(spec), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, TILE, TILE);
      p = ctx.createPattern(c, 'repeat'); pats.set(key, p);
      if (pats.size > 400) pats.delete(pats.keys().next().value);
    }
    return p;
  }

  /* ---- the media. layers go outer -> inner: k = width share, thr = pressure a layer needs before it shows (so light
     pressure leaves only the sparse outer grain), jag = ragged edge, grain = the tile spec */
  const G = (src, lo, hi, gain, o) => ({ src, lo, hi, gain, ...o });
  const GRAPHITE = () => PAL.graphite || '#3b3834';   // pencils default to graphite grey on paper (night: the night ink)
  const MEDIA = {
    'pencil-2b': { w: 5.2, amp: 0.9, alpha: 0.95, press: [0.4, 1], taper: 0.16, jag: 0.14, color: GRAPHITE,
      layers: [{ k: 1.3, grain: G('fine', 0.54, 0.74, 0.7) }, { k: 0.95, thr: 0.2, grain: G('fine', 0.42, 0.6, 0.85) }, { k: 0.55, thr: 0.55, grain: G('fine', 0.3, 0.5, 0.95) }],
      streaks: { n: 3, w: 0.8, alpha: 0.4, dash: 22 } },
    'pencil-hb': { w: 3.8, amp: 0.8, alpha: 0.9, press: [0.45, 1], taper: 0.14, jag: 0.1, color: GRAPHITE,
      layers: [{ k: 1.25, grain: G('fine', 0.52, 0.72, 0.6) }, { k: 0.85, thr: 0.25, grain: G('fine', 0.44, 0.64, 0.8) }],
      streaks: { n: 2, w: 0.6, alpha: 0.35, dash: 26 } },
    'pencil-2h': { w: 2.8, amp: 0.6, alpha: 0.8, press: [0.55, 1], taper: 0.12, jag: 0.05, color: () => PAL.muted,
      layers: [{ k: 1.2, grain: G('fine', 0.5, 0.7, 0.5) }, { k: 0.7, thr: 0.3, grain: G('fine', 0.44, 0.62, 0.7) }] },
    'cpencil': { w: 6, amp: 0.8, alpha: 0.9, press: [0.55, 1], taper: 0.12, jag: 0.14, color: () => PAL.accent,
      layers: [{ k: 1.2, grain: G('wax', 0.5, 0.66, 0.7) }, { k: 0.85, thr: 0.25, grain: G('wax', 0.38, 0.56, 0.9) }],
      streaks: { n: 3, w: 0.9, alpha: 0.3, dash: 30 } },
    'charcoal': { w: 13, amp: 1.3, alpha: 0.92, press: [0.4, 1], taper: 0.1, jag: 0.28,
      layers: [{ k: 1.55, grain: { dots: 260, r0: 0.5, r1: 1.4, gain: 0.55, seed: 5 } }, { k: 1.2, grain: G('coarse', 0.58, 0.72, 0.7) },
        { k: 0.9, thr: 0.2, grain: G('coarse', 0.44, 0.6, 0.9) }, { k: 0.55, thr: 0.5, grain: G('coarse', 0.3, 0.48, 1) }],
      streaks: { n: 5, w: 1.1, alpha: 0.5, dash: 16 } },
    'marker': { w: 12, amp: 0.7, alpha: 0.8, press: [0.9, 1], taper: 0, jag: 0.02, round: true, blend: 'multiply', blendNight: 'screen',
      layers: [{ k: 1, grain: G('l32', 0, 1, 0.58, { floor: 0.8 }) }],
      rim: { w: 2.2, alpha: 0.75 }, streaks: { n: 3, w: 1.6, alpha: 0.28, dash: 70 } },
    'marker-2': { w: 22, amp: 0.7, alpha: 0.8, press: [0.92, 1], taper: 0, jag: 0.02, chisel: -0.7, blend: 'multiply', blendNight: 'screen',
      layers: [{ k: 1, grain: G('l32', 0, 1, 0.5, { floor: 0.72 }) }],
      rim: { w: 1.6, alpha: 0.6 }, streaks: { n: 9, w: 1.3, alpha: 0.5, dash: 110, light: true } },
    'techpen': { w: 2, amp: 0.35, alpha: 1, vector: true },
    'spray': { w: 16, amp: 0.4, alpha: 0.85, press: [0.7, 1], taper: 0.25, jag: 0.12, spray: true,
      layers: [{ k: 2.6, grain: { dots: 1400, r0: 0.4, r1: 0.95, gain: 0.6, seed: 21 } }, { k: 1.9, grain: { dots: 3200, r0: 0.4, r1: 0.95, gain: 0.7, seed: 22 } },
        { k: 1.3, grain: { dots: 6000, r0: 0.45, r1: 1.05, gain: 0.75, seed: 23 } }, { k: 0.8, thr: 0.2, grain: { dots: 10000, r0: 0.5, r1: 1.1, gain: 0.8, seed: 24 } }] },
  };
  const TYPES = Object.keys(MEDIA);

  /* ---- pressure: a seeded bell like p5.brush's gaussian pressure, times a taper at the ends */
  function pressureOf(M, o, seed) {
    const [pmin, pmax] = M.press || [1, 1], taper = o.taper ?? M.taper ?? 0.1, P = o.pressure;
    const end = u => taper > 0 ? Math.sqrt(Math.min(1, Math.min(u, 1 - u) / taper)) * 0.85 + 0.15 : 1;
    if (typeof P === 'function') return u => clamp(P(u), 0, 1.5) * end(u);
    if (typeof P === 'number') return u => P * end(u);
    if (Array.isArray(P)) { const [a, b, c] = P.length === 2 ? [P[0], (P[0] + P[1]) / 2, P[1]] : P;
      return u => (u < 0.5 ? lerp(a, b, u * 2) : lerp(b, c, u * 2 - 1)) * end(u); }
    const peak = 0.3 + 0.4 * hash3(seed, 91), half = 0.45 + 0.25 * hash3(seed, 92), c = 1.6 + hash3(seed, 93);
    return u => lerp(pmin, pmax, 1 / (1 + Math.abs((u - peak) / (u < peak ? half * 1.2 : half * 0.8)) ** (2 * c))) * end(u);
  }

  /* ---- flow fields: angle(x, y, t) in radians, added to a stroke's heading as it is drawn */
  const fields = {
    hand: (x, y, t) => 0.22 * vnoise2(x * 0.02 + t * 0.2, y * 0.02, 5) + 0.08 * Math.sin(x * 0.05 + y * 0.03),
    curved: (x, y, t) => 1.1 * vnoise2(x * 0.0022 + t * 0.05, y * 0.0022, 9),
    zigzag: (x, y) => ((Math.floor(x / 34) + Math.floor(y / 34)) % 2 ? 0.55 : -0.55),
    waves: (x, y, t) => 0.75 * Math.sin(x * 0.018 + t) * Math.cos(y * 0.009),
    seabed: (x, y, t) => 0.7 * Math.sin((x * y) * 0.000045 + 17) * Math.cos(t * 0.5),
    spiral: (x, y) => 0.8 * Math.sin(Math.atan2(y - H / 2, x - W / 2) * 2 + Math.hypot(x - W / 2, y - H / 2) * 0.012),
    columns: x => 0.6 * Math.sin(Math.floor(x / 48) * 1.9),
  };
  let ACTIVE = null;
  const fieldOf = f => typeof f === 'function' ? f : f ? (fields[f] || null) : null;
  /** bend(pts, f): walk the path in short steps, turning each step by the field (the stroke drifts, as in p5.brush) */
  function bend(pts, f, amt, t) {
    let x = pts[0][0], y = pts[0][1]; const out = [[x, y]];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dy); if (!L) continue;
      const h = Math.atan2(dy, dx), n = Math.ceil(L / 7), st = L / n;
      for (let k = 0; k < n; k++) { const a = h + amt * f(x, y, t); x += Math.cos(a) * st; y += Math.sin(a) * st; out.push([x, y]); }
    }
    return out;
  }

  /* ---- one stroke */
  let DOMM = null;
  const anchorOf = (x, y, seed) => { DOMM = DOMM || new DOMMatrix(); DOMM.e = Math.round(x) + (seed * 37) % TILE; DOMM.f = Math.round(y) + (seed * 91) % TILE; return DOMM; };
  /**
   * stroke(pts, opts): a natural-media line along pts.
   * opts: type ('pencil-2b' | 'pencil-hb' | 'pencil-2h' | 'cpencil' | 'charcoal' | 'marker' | 'marker-2' | 'techpen' | 'spray'),
   *       w, color, alpha, pressure (fn(u) | number | [start, end] | [start, mid, end]), taper, seed, draw (0..1),
   *       closed, amp (outline wobble, boils on twos), field (name | fn), fieldAmt, fieldT, nib (marker-2 chisel angle),
   *       blend (composite op), dark
   */
  function mediumOf(o) {
    const type = o.type || 'pencil-hb', M = MEDIA[type];
    if (!M) throw new Error(`brush.stroke: unknown type "${type}" (use ${TYPES.join(', ')})`);
    return M;
  }
  /** prep: the stroke's geometry for this drawing (wobbled centre line, normals, pressure, ragged edges), or null */
  function prep(pts, o, M) {
    const draw = o.draw ?? 1;
    if (draw <= 0 || !pts || pts.length < 2) return null;
    const w = o.w ?? M.w, seed = o.seed ?? seedOf(pts), closed = !!o.closed;
    let p = pts;
    const fld = fieldOf(o.field === undefined ? ACTIVE : o.field);
    if (fld) p = bend(closed ? p.concat([p[0]]) : p, fld, o.fieldAmt ?? 1, o.fieldT ?? 0);
    p = wobble(p, closed && !fld, o.amp ?? M.amp, seed, o.step ?? 7);
    if (closed && !fld) p = p.concat([p[0]]);
    const n0 = p.length, s = new Float32Array(n0);
    for (let i = 1; i < n0; i++) s[i] = s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const L = s[n0 - 1]; if (L <= 0.5) return null;
    let n = n0;
    if (draw < 1) {                                    // cut the path where the draw-on has reached
      const cut = L * draw; let i = 1; while (i < n0 - 1 && s[i] < cut) i++;
      const k = (cut - s[i - 1]) / ((s[i] - s[i - 1]) || 1);
      p = p.slice(0, i + 1); p[i] = [lerp(p[i - 1][0], p[i][0], k), lerp(p[i - 1][1], p[i][1], k)]; s[i] = cut; n = i + 1;
    }
    if (n < 2) return null;
    const G = { p, n, s, L, w, hw0: w / 2, seed, ax: pts[0][0], ay: pts[0][1], nib: o.nib ?? M.chisel };
    if (M.vector) return G;
    const Lp = s[n - 1], prof = pressureOf(M, o, seed), tipLen = Math.min(Lp, Math.max(w * 2.5, 10));
    const nx = G.nx = new Float32Array(n), ny = G.ny = new Float32Array(n), pr = G.pr = new Float32Array(n), jl = G.jl = new Float32Array(n), jr = G.jr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / l; ny[i] = dx / l;
      let q = prof(s[i] / L);
      if (draw < 1) q *= Math.min(1, (Lp - s[i]) / tipLen * 0.8 + 0.2);        // the pen tip narrows the drawing end
      if (G.nib != null) q *= 0.22 + 0.78 * Math.abs(Math.sin(Math.atan2(dy, dx) - G.nib));
      pr[i] = q;
      jl[i] = 1 + M.jag * vnoise(s[i] * 0.11, seed + 5); jr[i] = 1 + M.jag * vnoise(s[i] * 0.11, seed + 6);
    }
    return G;
  }
  /** add one layer's outline (share k of the width, shown above pressure thr) to the current path */
  function outlinePath(G, M, k, thr) {
    const { p, n, nx, ny, pr, jl, jr, hw0, nib } = G, round = M.round, nc = round ? 5 : 3, capK = round ? 1 : 0.7;
    const hOf = i => hw0 * k * (thr ? clamp((pr[i] - thr) / (1 - thr)) : pr[i]);
    ctx.moveTo(p[0][0] + nx[0] * hOf(0) * jl[0], p[0][1] + ny[0] * hOf(0) * jl[0]);
    for (let i = 1; i < n; i++) { const h = hOf(i) * jl[i]; ctx.lineTo(p[i][0] + nx[i] * h, p[i][1] + ny[i] * h); }
    const cap = (i, dir, from) => {                    // round (or blunt) ends; a chisel nib ends flat
      const h = hOf(i); if (h < 0.2 || nib != null) return;
      const tx = ny[i] * dir, ty = -nx[i] * dir;
      for (let j = 1; j < nc; j++) { const a = (from ? j : nc - j) / nc * Math.PI, c = Math.cos(a), sn = Math.sin(a);
        ctx.lineTo(p[i][0] + (nx[i] * c + tx * sn) * h * capK, p[i][1] + (ny[i] * c + ty * sn) * h * capK); }
    };
    cap(n - 1, 1, true);
    for (let i = n - 1; i >= 0; i--) { const h = hOf(i) * jr[i]; ctx.lineTo(p[i][0] - nx[i] * h, p[i][1] - ny[i] * h); }
    cap(0, -1, false);
    ctx.closePath();
  }
  /** fill a set of prepared strokes of one medium, one path per layer (hatching batches every line into one fill) */
  function paint(Gs, M, o, streaks) {
    const alpha = (o.alpha ?? 1) * M.alpha; if (alpha <= 0 || !Gs.length) return;
    const dark = o.dark ?? S.dark, color = o.color || (M.color && !dark ? M.color() : inkOf(dark)), G0 = Gs[0];
    ctx.save();
    ctx.globalAlpha *= alpha;
    const blend = o.blend || (dark ? M.blendNight : M.blend); if (blend) ctx.globalCompositeOperation = blend;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (M.vector) { for (const G of Gs) techpen(G, color); ctx.restore(); return; }
    for (let li = 0; li < M.layers.length; li++) {
      const Ly = M.layers[li], pat = pattern(Ly.grain, color);
      ctx.beginPath(); for (const G of Gs) outlinePath(G, M, Ly.k, Ly.thr || 0);
      pat.setTransform(anchorOf(G0.ax + li * 53, G0.ay + li * 29, G0.seed));
      ctx.fillStyle = pat; ctx.fill();
      if (li === 0 && M.rim) { ctx.save(); ctx.clip(); ctx.globalAlpha *= M.rim.alpha; ctx.strokeStyle = color; ctx.lineWidth = M.rim.w * 2 * Math.sqrt(G0.w / M.w); ctx.stroke(); ctx.restore(); }   // pigment pooled on the inside edge
    }
    if (M.spray) for (const G of Gs) sprayDrops(G, color);
    const st = M.streaks;
    if (st && streaks) for (const G of Gs) {           // bristle / grain streaks that follow the curve
      const { p, n, nx, ny, pr, hw0 } = G;
      ctx.save(); ctx.globalAlpha *= st.alpha; ctx.lineWidth = st.w * Math.sqrt(G.w / M.w);
      ctx.strokeStyle = st.light ? (dark ? PAL.night : PAL.paper) : color;
      const r = mulberry(G.seed + 404), dash = [];
      for (let j = 0; j < 6; j++) dash.push(st.dash * (0.4 + r() * 1.2), st.dash * (0.15 + r() * 0.5));
      ctx.setLineDash(dash); ctx.lineDashOffset = r() * 200;
      ctx.beginPath();
      for (let j = 0; j < st.n; j++) {
        const v = (r() * 2 - 1) * 0.72;
        for (let i = 0; i < n; i++) { const h = hw0 * pr[i] * v; if (i) ctx.lineTo(p[i][0] + nx[i] * h, p[i][1] + ny[i] * h); else ctx.moveTo(p[i][0] + nx[i] * h, p[i][1] + ny[i] * h); }
      }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function stroke(pts, o = {}) {
    const M = mediumOf(o), G = prep(pts, o, M);
    if (G) paint([G], M, o, o.streaks !== false);
  }
  /** a technical pen: constant width, crisp, a small ink blot where the nib touched down, a faint bleed */
  function techpen(G, color) {
    const { p, n, w, seed } = G;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.strokeStyle = color;
    ctx.save(); ctx.globalAlpha *= 0.16; ctx.lineWidth = w + 1.1; ctx.stroke(); ctx.restore();
    ctx.lineWidth = w; ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0][0], p[0][1], w * (0.62 + 0.1 * hash3(seed, 3)), 0, TAU); ctx.fill();
  }
  /** spray: larger droplets scattered around the path, fixed per stroke */
  function sprayDrops(G, color) {
    const { p, n, s, L, nx, ny, pr, hw0, seed } = G;
    const r = mulberry(seed + 808), cnt = Math.min(300, Math.round(L * hw0 * 0.012)), us = [];
    for (let k = 0; k < cnt; k++) us.push([r(), gauss(r) * 1.1, 0.45 + r() * r() * 1.1]);
    us.sort((a, b) => a[0] - b[0]);
    ctx.fillStyle = color; ctx.beginPath(); let i = 1;
    for (const [u, v, rad] of us) {
      const d = u * L; if (d > s[n - 1]) break;
      while (i < n - 1 && s[i] < d) i++;
      const h = hw0 * 2 * pr[i] * v, x = p[i][0] + nx[i] * h, y = p[i][1] + ny[i] * h;
      ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, TAU);
    }
    ctx.fill();
  }

  /* ---- watercolor wash */
  function areaOf(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
  /** deform: one round of midpoint displacement (Hobbs): each edge gets a new vertex pushed off its midpoint by a
      gaussian share of the edge length, mostly outward; mods carry how much each part of the edge bleeds */
  function deform(v, m, amt, r, sign, dir) {
    const out = [], om = [], N = v.length;
    for (let i = 0; i < N; i++) {
      const a = v[i], b = v[(i + 1) % N], ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1;
      const nxo = ey / el * sign, nyo = -ex / el * sign;             // outward normal
      out.push(a); om.push(m[i]);
      const lean = dir ? 0.45 + 1.3 * Math.max(0, nxo * dir[0] + nyo * dir[1]) : 1;
      const d = (0.22 + gauss(r) * 0.3) * el * amt * m[i] * lean;
      const tw = gauss(r) * 0.12;
      out.push([a[0] + ex * (0.5 + tw) + nxo * d, a[1] + ey * (0.5 + tw) + nyo * d]);
      om.push(clamp(m[i] * (0.9 + gauss(r) * 0.12), 0.1, 2.5));
    }
    return [out, om];
  }
  function grow(v, m, amt, rounds, r, sign, dir, cap = 700) {
    for (let k = 0; k < rounds; k++) {
      if (v.length * 2 > cap) { v = v.filter((_, i) => i % 2 === 0); m = m.filter((_, i) => i % 2 === 0); }
      [v, m] = deform(v, m, amt, r, sign, dir);
    }
    return [v, m];
  }
  const WASH_GRAIN = { src: 'fine', lo: 0.3, hi: 0.8, gain: 1 }, WASH_GRAN = { src: 'coarse', lo: 0.45, hi: 0.75, gain: 1 };
  function renderWash(rel, bw, bh, o) {
    const { seed, bleed, layers, texture, edge, strength, res, dirAngle } = o;
    const size = Math.max(bw, bh), mrg = Math.ceil(size * bleed * 0.4 + 12);
    const c = newCanvas((bw + 2 * mrg) * res, (bh + 2 * mrg) * res), g = c.getContext('2d');
    g.scale(res, res); g.translate(mrg, mrg);
    const r = mulberry(seed * 7 + 13), sign = areaOf(rel) >= 0 ? 1 : -1;   // makes (ey, -ex) point outward
    const dir = dirAngle == null ? null : [Math.cos(dirAngle), Math.sin(dirAngle)];
    // base: a few even vertices, bled three times; a stretch of the edge stays calm (p5.brush's "fluid" share)
    const per = pathLen(rel.concat([rel[0]])), nv = clamp(Math.round(per / Math.max(10, size / 7)), 10, 60);
    const even = resample(rel, nv), calm = Math.floor(r() * nv);
    const m0 = even.map((_, i) => ((i - calm + nv) % nv < nv * 0.3 ? 0.4 : 1) * (0.8 + r() * 0.7));
    let [base, bm] = grow(even, m0, bleed * 0.55, 3, r, sign, dir);
    const fills = layers * 3.6, a = 1 - Math.pow(1 - strength, 1 / fills);
    const mid = even.reduce((q, [x, y]) => [q[0] + x / nv, q[1] + y / nv], [0, 0]);
    // spread: push every vertex out along its normal in soft lobes (some layers run wide, some stay in), so the colour
    // fades out past the ink line instead of stopping at it
    const spread = (v, amt, ph) => v.map((q, i) => {
      const N = v.length, pa = v[(i - 1 + N) % N], pb = v[(i + 1) % N], ex = pb[0] - pa[0], ey = pb[1] - pa[1], el = Math.hypot(ex, ey) || 1;
      const nxo = ey / el * sign, nyo = -ex / el * sign, lean = dir ? 0.3 + 1.4 * Math.max(0, nxo * dir[0] + nyo * dir[1]) : 1;
      const d = amt * lean * clamp(0.35 + 1.1 * vnoise(i / N * 6 + ph, seed + 17));
      return [q[0] + nxo * d, q[1] + nyo * d]; });
    const trace2 = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineJoin = 'round';   // a white mask first: tinting at the end keeps the hue exact
    for (let i = 0; i < layers; i++) {
      if (i % 4 === 0) [base, bm] = grow(base, bm, bleed * 0.1, 1, r, sign, dir, 360);
      for (let k = 0; k < 3; k++) {                    // three bleeds of the same shape per layer, wide to narrow
        const [lv] = grow(spread(base, bleed * size * 0.22 * (0.15 + 0.85 * r()) * (1 - k * 0.3), k * 0.35), bm, bleed * (0.62 - k * 0.2), 3, r, sign, dir);
        trace2(lv); g.globalAlpha = a; g.fill();
        g.globalAlpha = a * 0.9 * edge; g.lineWidth = size / 70 + 1; g.stroke();   // faint wide rims pile up into a darker edge
      }
      if (i % 2 === 0) {                                // a darker pool inside
        const sc = 0.5 + r() * 0.35, cx = mid[0] + (r() - 0.5) * bw * 0.35, cy = mid[1] + (r() - 0.5) * bh * 0.35;
        const [pv] = grow(base.map(([x, y]) => [cx + (x - cx) * sc, cy + (y - cy) * sc]), bm, bleed * 0.5, 2, r, sign, dir, 300);
        trace2(pv); g.globalAlpha = a * 1.2; g.fill();
      }
      if (i % 4 === 3 && texture > 0) {                 // lift blotches out (p5.brush's erase)
        g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
        const cnt = Math.round(20 + 40 * texture);
        for (let j = 0; j < cnt; j++) { const x = mid[0] + gauss(r) * bw / 2.4, y = mid[1] + gauss(r) * bh / 2.4, rr = size * lerp(0.02, 0.22, r() ** 1.4);
          g.globalAlpha = (0.03 + r() * 0.07) * texture; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
        g.restore();
      }
    }
    // tide line: pigment dried hard along the edge
    const [tv] = grow(base, bm, bleed * 0.25, 2, r, sign, dir);
    g.globalAlpha = 0.3 * edge; g.lineWidth = 1.3; trace2(tv); g.stroke();
    g.globalAlpha = 0.12 * edge; g.lineWidth = 3.5; g.stroke();
    // paper grain breaks the colour up (granulation), then the mask is tinted
    if (texture > 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out';
      for (const [sp, al, k] of [[WASH_GRAIN, 0.35, 13], [WASH_GRAN, 0.3, 29]]) { const tile = pattern(sp, '#000');
        tile.setTransform(new DOMMatrix([1, 0, 0, 1, (seed * k) % TILE, (seed * (k + 4)) % TILE])); g.globalAlpha = al * texture; g.fillStyle = tile; g.fillRect(0, 0, c.width, c.height); }
      g.restore(); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.fillStyle = o.color; g.fillRect(0, 0, c.width, c.height); g.restore();
    return { c, mrg };
  }
  /**
   * wash(poly, opts): a watercolor fill. Soft, layered, darker where the pigment pooled at the edges, broken up by the
   * paper grain. It is a tint: draw it first and the ink lines on top. Rendered once per shape and cached (moving the
   * shape keeps the cache; changing its outline, colour or options renders it again).
   * opts: color, alpha (0..1, applied when drawn), seed, bleed (0..1, how far it spreads past the outline, default 0.3),
   *       layers (default 14), strength (opacity where the layers pile up, default 0.42, 0.55 at night), texture (0..1 blotches and
   *       grain, default 0.6), edge (0..1 pooled edge, default 0.7), dir (angle the colour bleeds toward), res (raster
   *       scale: default 1, 0.75 above 160k px², 0.5 above 500k px²; raise it for zoomed shots), draw (0..1 the wash spreads out), reveal ('bloom' | 'sweep'), from ([x, y]
   *       where a bloom starts), blend, dark
   */
  /** big washes are soft: they are rasterised at half resolution, which keeps their image memory (and the frame's) small */
  const autoRes = bb => { const a = (bb.x1 - bb.x0) * (bb.y1 - bb.y0); return a > 500000 ? 0.5 : a > 160000 ? 0.75 : 1; };
  function washFn(poly, o = {}) {
    const draw = o.draw ?? 1, alpha = o.alpha ?? 1;
    if (draw <= 0 || alpha <= 0 || !poly || poly.length < 3) return;
    const dark = o.dark ?? S.dark, color = o.color || (dark ? PAL.cyan : PAL.sea);
    const bb = bounds(poly), seed = o.seed ?? seedOf(poly);
    const opt = { seed, color, bleed: o.bleed ?? 0.3, layers: o.layers ?? 14, texture: o.texture ?? 0.6, edge: o.edge ?? 0.7,
      strength: o.strength ?? (dark ? 0.55 : 0.42), res: o.res ?? autoRes(bb), dirAngle: o.dir ?? null };
    const key = `w|${shapeKey(poly, 2)}|${poly.length}|${JSON.stringify(opt)}`;       // relative to the shape: moving it reuses the raster
    const R = rasters(key, () => renderWash(poly.map(([x, y]) => [x - bb.x0, y - bb.y0]), bb.x1 - bb.x0, bb.y1 - bb.y0, opt), v => v.c.width * v.c.height);
    ctx.save(); ctx.globalAlpha *= clamp(alpha);
    ctx.globalCompositeOperation = o.blend || (dark ? 'screen' : 'multiply');
    if (draw < 1) {                                      // the wet edge spreads out from a point (or sweeps across)
      const e = E.out2(draw);
      if (o.reveal === 'sweep') {
        const x = lerp(bb.x0 - R.mrg, bb.x1 + R.mrg, e), amp = Math.max(24, (bb.y1 - bb.y0) * 0.09), pts = [[bb.x0 - R.mrg - 5, bb.y0 - R.mrg - 5]];
        for (let k = 0; k <= 20; k++) { const y = lerp(bb.y0 - R.mrg - 5, bb.y1 + R.mrg + 5, k / 20);   // the wet front runs ahead in tongues
          pts.push([x + amp * (0.6 * vnoise(k * 0.8, seed + 2) + 0.4 * vnoise(k * 2.3, seed + 3)), y]); }
        pts.push([bb.x0 - R.mrg - 5, bb.y1 + R.mrg + 5]); trace(pts, true); ctx.clip();
      } else {
        const [fx, fy] = o.from || [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2];
        const far = Math.max(...[[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]].map(([x, y]) => Math.hypot(x - fx, y - fy))) + R.mrg;
        trace(shape.blob(fx, fy, far * e * 1.15 + 1, seed + 3, 0.3, 28), true); ctx.clip();
      }
    }
    ctx.drawImage(R.c, bb.x0 - R.mrg + boil(seed, 1, 0.35), bb.y0 - R.mrg + boil(seed, 2, 0.35), R.c.width / opt.res, R.c.height / opt.res);
    ctx.restore();
  }

  /* ---- hatching with brush strokes */
  function scanSegments(poly, angle, gap, gradient) {
    const ca = Math.cos(angle), sa = Math.sin(angle), rot = poly.map(([x, y]) => [x * ca + y * sa, -x * sa + y * ca]);
    let y0 = Infinity, y1 = -Infinity; for (const q of rot) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const segs = []; let Y = y0 + gap * 0.5, step = gap, row = 0;
    while (Y < y1) {
      const xs = [];
      for (let i = 0; i < rot.length; i++) { const a = rot[i], b = rot[(i + 1) % rot.length];
        if ((a[1] <= Y) !== (b[1] <= Y)) xs.push(a[0] + (Y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) segs.push({ row, a: [xs[i] * ca - Y * sa, xs[i] * sa + Y * ca], b: [xs[i + 1] * ca - Y * sa, xs[i + 1] * sa + Y * ca] });
      Y += step; step *= gradient; row++;
    }
    return segs;
  }
  /**
   * hatch(poly, opts): hatching laid with brush strokes (textured, pressure-shaped), unlike the engine's pen hatch().
   * opts: type (a stroke type, default 'pencil-hb'), angle (radians, default -0.6), gap (px, default 9), w, color, alpha,
   *       seed, rand (0..1 end jitter, default 0.25), gradient (0..1 gaps widen across the shape), continuous (one
   *       zig-zag stroke), inset (px kept clear of the outline), keep (0..1 or fn(x, y) -> 0..1, thins lines), draw (0..1
   *       lines appear in order), field, dark
   */
  function hatchFn(poly, o = {}) {
    const draw = o.draw ?? 1; if (draw <= 0 || !poly || poly.length < 3) return;
    const angle = o.angle ?? -0.6, gap = Math.max(1.5, o.gap ?? 9), grad = 1 + 0.1 * clamp(o.gradient ?? 0), seed = o.seed ?? seedOf(poly);
    const rand = o.rand ?? 0.25, inset = o.inset ?? 0, keep = o.keep ?? 1;
    const lines = geom(`h|${shapeKey(poly, 2)}|${poly.length}|${angle}|${gap}|${grad}|${seed}|${rand}|${inset}`, () => {
      const r = mulberry(seed + 71), out = [], x0 = poly[0][0], y0 = poly[0][1];
      for (const sg of scanSegments(poly.map(([x, y]) => [x - x0, y - y0]), angle, gap, grad)) {   // relative, so a moved shape reuses it
        const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], l = Math.hypot(dx, dy); if (l < inset * 2 + 2) continue;
        const ux = dx / l, uy = dy / l, j = () => (r() * 2 - 1) * rand * gap * 1.5;
        const a = [sg.a[0] + ux * (inset + j()), sg.a[1] + uy * (inset + j())], b = [sg.b[0] - ux * (inset + j()), sg.b[1] - uy * (inset + j())];
        out.push({ a, b, keep: r(), row: sg.row });
      }
      return out;
    });
    const X0 = poly[0][0], Y0 = poly[0][1];
    const kept = lines.filter(Ln => Ln.keep < (typeof keep === 'function' ? keep(X0 + (Ln.a[0] + Ln.b[0]) / 2, Y0 + (Ln.a[1] + Ln.b[1]) / 2) : keep))
      .map(Ln => ({ a: [X0 + Ln.a[0], Y0 + Ln.a[1]], b: [X0 + Ln.b[0], Y0 + Ln.b[1]] }));
    const so = { type: o.type || 'pencil-hb', w: o.w, color: o.color, alpha: o.alpha ?? 0.85, dark: o.dark, field: o.field, amp: o.amp ?? 0.5, blend: o.blend,
      step: o.step ?? 12, pressure: o.pressure };
    const M = mediumOf(so);
    if (o.continuous) {
      const path = []; kept.forEach((Ln, i) => { if (i % 2) path.push(Ln.b, Ln.a); else path.push(Ln.a, Ln.b); });
      const G = path.length > 1 && prep(path, { ...so, seed, draw, pressure: o.pressure ?? 0.9 }, M);
      if (G) paint([G], M, so, false);
      return;
    }
    const N = kept.length, reach = draw * N, Gs = [];
    for (let i = 0; i < N && i < reach; i++) { const G = prep([kept[i].a, kept[i].b], { ...so, seed: seed + i * 13, draw: clamp(reach - i) }, M); if (G) Gs.push(G); }
    paint(Gs, M, so, false);
  }

  /**
   * field(name | fn, drawFn?): resolves a flow field to its angle function fn(x, y, t). With drawFn, every brush stroke
   * drawn inside it bends along that field (and the field is switched off again afterwards). Named fields: hand,
   * curved, zigzag, waves, seabed, spiral, columns. Add your own to brush.fields.
   */
  function field(f, drawFn) {
    const fn = fieldOf(f);
    if (f && !fn) throw new Error(`brush.field: unknown field "${f}" (use ${Object.keys(fields).join(', ')})`);
    if (drawFn) { const was = ACTIVE; ACTIVE = fn; try { drawFn(fn); } finally { ACTIVE = was; } }
    return fn;
  }
  /** flow(x, y, len, opts): a stroke that starts at (x, y) heading opts.dir and follows the field (opts.field) for len px */
  function flow(x, y, len, o = {}) {
    const d = o.dir ?? 0; stroke([[x, y], [x + Math.cos(d) * len, y + Math.sin(d) * len]], { field: 'curved', ...o });
  }

  /* ---- test hook: one fixed sample of each kind, drawn offscreen; returns a pixel hash and the draw time */
  function sample(kind) {
    const wave = Array.from({ length: 24 }, (_, i) => [30 + i * 18, 110 + 45 * Math.sin(i * 0.45)]);
    if (TYPES.includes(kind)) { stroke(wave, { type: kind, seed: 7 }); return; }
    const blobP = shape.blob(240, 110, 80, 3, 0.25, 40);
    if (kind === 'wash') { washFn(blobP, { seed: 5, color: PAL.sea }); return; }
    if (kind === 'hatch') { hatchFn(blobP, { seed: 5, gap: 8 }); return; }
    if (kind === 'field') { field('curved', () => { for (let k = 0; k < 6; k++) stroke([[30, 40 + k * 28], [450, 40 + k * 28]], { type: 'pencil-hb', seed: 20 + k }); }); return; }
    throw new Error(`__brushProbe: unknown kind "${kind}"`);
  }
  if (typeof window !== 'undefined') {
    // performance.now() here only reports how long the sample took; it never reaches a drawing
    window.__brushProbe = (kind, boilV = 0) => {
      const c = newCanvas(480, 220), g = c.getContext('2d'), was = ctx, wasBoil = S.boil, wasDark = S.dark;
      let ms = 0; ctx = g; S.boil = boilV; S.dark = false;
      try { const t0 = performance.now(); sample(kind); ms = performance.now() - t0; }
      finally { ctx = was; S.boil = wasBoil; S.dark = wasDark; }
      const d = g.getImageData(0, 0, c.width, c.height).data; let h = 2166136261;
      for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619);
      return { hash: (h >>> 0).toString(16), ms };
    };
  }

  return { stroke, wash: washFn, hatch: hatchFn, field, flow, fields, types: TYPES, media: MEDIA };
})();
/** wash(poly, opts): watercolor tint under the ink; same as brush.wash */
function wash(poly, o) { return brush.wash(poly, o); }
/* ===================== end of brushes ===================== */

/* ---------- paper: grounds and paper sets ---------- */
/*
 * A ground is one paper: its texture, its palette and how a scene looks on it. A paper set pairs a light ground (the
 * paper world: outside, human scale) with a dark one (the night world: inside, small, abstract). A story picks a set with
 * defineStory({ paper: 'notebook' }), the default, and every plate keeps dark: true / false, which picks the set's light
 * or dark page. plate.paper names another set, or a single ground, for that plate alone. Papers beyond the notebook live
 * in toolkit/grounds/<name>.js; build.py includes a file when the story names one of its papers (references/api.md).
 *
 * defineGround(name, {
 *   tone: 'light' | 'dark',         the world it stands in for
 *   build(g, rand, W, H),           paints the texture once, at the film's own size (paperKit has the helpers)
 *   pal: { ... },                    PAL fields it sets while one of its plates is drawn: the paper-world fields for a
 *                                    light ground (paper, ink, label, ...), the night* fields for a dark one, plus shared
 *                                    ones (accent, peri, ...). Its set's other page lends only its own world's fields.
 *   vignette: 'rgba(...)',           the colour the frame's edges darken toward
 *   grain: 0.8,                      film-grain strength on this paper (0..1, times STORY.grain)
 *   contours: { colors, alpha } | false | fn(t, ground, seed),   the drifting topographic loops (default: PAL.topo)
 *   treatment: { tooth, filter, color, glow } | fn(g2d, ground, { base, raw }) | null,   how a scene looks on it (treat())
 *   sfx: { header: 'scratch' },      the SFX a plate header types with; it takes { chars, cps, g }
 *   stroke: { min: 5, from: 2.5 },  pen() and ink() lines of `from` px or more are drawn at least `min` px wide (chalk)
 *   minContrast: { ink, label, accent },   lowered contrast floors for the smoke test (default 7, 4.5, 3), with a reason
 *   seed,                            seeds rand (default: from the name)
 * })
 * definePaperSet(name, { light, dark })   ground names
 */
const GROUNDS = {}, PAPER_SETS = {};
const nameSeed = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function defineGround(name, spec) {
  if (!spec || (spec.tone !== 'light' && spec.tone !== 'dark')) throw new Error(`defineGround('${name}'): tone must be 'light' or 'dark'`);
  if (typeof spec.build !== 'function') throw new Error(`defineGround('${name}'): it needs build(g, rand, W, H)`);
  const dark = spec.tone === 'dark';
  return (GROUNDS[name] = { name, pal: {}, grain: dark ? 0.5 : 0.8, vignette: dark ? 'rgba(0,0,8,0.45)' : 'rgba(90,60,20,0.16)',
    contours: { alpha: dark ? 0.10 : 0.16 }, treatment: null, sfx: { header: dark ? 'readout' : 'scratch' }, minContrast: {}, seed: nameSeed(name), ...spec });
}
function definePaperSet(name, { light, dark }) { return (PAPER_SETS[name] = { light, dark }); }

/*
 * paperKit: helpers for build(g, rand, W, H). They read the size from g.canvas, and counts scale with the frame's area
 * (given for 1920 × 1080), so a paper looks the same in portrait. Rules that keep a texture alive through TikTok and
 * YouTube re-encoding (references/style.md, "Papers"):
 *   - grain in 2 px specks or larger (grain(..., { size: 2 }), the default): single-pixel grain is the first thing lost;
 *   - grid lines at least 1.5 px wide, at least 8/255 brighter or darker than the paper (not only another hue), and
 *     never closer than 30 px;
 *   - a dark gradient gets mottles over it, or it bands.
 */
const paperKit = {
  area: g => g.canvas.width * g.canvas.height / (1920 * 1080),
  /** a flat colour, or a top-to-bottom gradient a -> b */
  fill(g, a, b = null) { const { width: w, height: h } = g.canvas;
    if (b) { const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, a); lg.addColorStop(1, b); g.fillStyle = lg; } else g.fillStyle = a;
    g.fillRect(0, 0, w, h); },
  /** n soft round stains, colours taken in turn */
  mottle(g, r, n, cols, rmin, rmax) { const { width: w, height: h } = g.canvas, k = Math.sqrt(paperKit.area(g));
    for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, R = (rmin + r() * (rmax - rmin)) * k, rg = g.createRadialGradient(x, y, 0, x, y, R);
      rg.addColorStop(0, cols[i % cols.length]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - R, y - R, 2 * R, 2 * R); } },
  /** n short curved fibres; rgbs: ['r,g,b', ...] picked at random, alpha a0..a1, length l0..l1, width w0..w1 */
  fibres(g, r, n, rgbs, a0 = 0.04, a1 = 0.1, l0 = 4, l1 = 18, w0 = 0.6, w1 = 1.4) { const { width: w, height: h } = g.canvas; g.save(); g.lineCap = 'round';
    for (let i = 0, N = Math.round(n * paperKit.area(g)); i < N; i++) { const x = r() * w, y = r() * h, a = r() * TAU, l = l0 + r() * (l1 - l0);
      g.strokeStyle = `rgba(${rgbs[(r() * rgbs.length) | 0]},${(a0 + r() * (a1 - a0)).toFixed(3)})`; g.lineWidth = w0 + r() * (w1 - w0);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * .5, y + Math.sin(a + 0.6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.restore(); },
  /** n round specks of colour rgb ('r,g,b'), radius s0..s1, alpha a0..a1 */
  specks(g, r, n, rgb, s0, s1, a0, a1) { const { width: w, height: h } = g.canvas;
    for (let i = 0, N = Math.round(n * paperKit.area(g)); i < N; i++) { g.fillStyle = `rgba(${rgb},${(a0 + r() * (a1 - a0)).toFixed(3)})`;
      g.beginPath(); g.arc(r() * w, r() * h, s0 + r() * (s1 - s0), 0, TAU); g.fill(); } },
  /** a printed grid: lines every `step` px whose ink wanders a little along their length; every `every`-th line is a major one */
  grid(g, r, step, col, alpha, lw = 1.5, { ox = 0, oy = 0, every = 0, majorAlpha = alpha, majorW = lw } = {}) {
    const { width: w, height: h } = g.canvas;
    const line = (x0, y0, x1, y1, a, wd) => { for (let k = 0; k < 12; k++) { g.globalAlpha = a * (0.8 + 0.4 * r()); g.lineWidth = wd;
      g.beginPath(); g.moveTo(lerp(x0, x1, k / 12), lerp(y0, y1, k / 12)); g.lineTo(lerp(x0, x1, (k + 1) / 12), lerp(y0, y1, (k + 1) / 12)); g.stroke(); } };
    g.save(); g.strokeStyle = col;
    for (let x = ox, i = 0; x <= w; x += step, i++) { const M = every && i % every === 0; line(x, 0, x, h, M ? majorAlpha : alpha, M ? majorW : lw); }
    for (let y = oy, i = 0; y <= h; y += step, i++) { const M = every && i % every === 0; line(0, y, w, y, M ? majorAlpha : alpha, M ? majorW : lw); }
    g.restore(); },
  /** faint overlapping arcs, as an eraser or a rag leaves them */
  swirl(g, r, x, y, R, col, n = 40, lw = 26) { g.save(); g.lineCap = 'round'; g.strokeStyle = col;
    for (let k = 0; k < n; k++) { const a0 = r() * TAU, a1 = a0 + 0.8 + r() * 2.2, rr = R * (0.4 + r() * 0.8); g.lineWidth = lw * (0.5 + r());
      g.beginPath(); g.ellipse(x + (r() - .5) * R * .5, y + (r() - .5) * R * .3, rr, rr * (0.35 + r() * 0.3), (r() - .5) * 0.6, a0, a1); g.stroke(); }
    g.restore(); },
  /** noise of strength amt (0..255) in specks `size` px square; mono: false gives each channel its own noise */
  grain(g, amt, seed, { size = 2, mono = true } = {}) {
    const { width: w, height: h } = g.canvas, img = g.getImageData(0, 0, w, h), d = img.data, r = mulberry(seed);
    if (size <= 1) {
      for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += mono ? n : (r() - 0.5) * amt; d[i + 2] += mono ? n : (r() - 0.5) * amt; }
    } else {
      const w2 = Math.ceil(w / size), h2 = Math.ceil(h / size), nz = new Float32Array(w2 * h2 * 3);
      for (let i = 0; i < w2 * h2; i++) { const n = (r() - 0.5) * amt; nz[i * 3] = n; nz[i * 3 + 1] = mono ? n : (r() - 0.5) * amt; nz[i * 3 + 2] = mono ? n : (r() - 0.5) * amt; }
      for (let y = 0; y < h; y++) for (let x = 0, row = ((y / size) | 0) * w2; x < w; x++) { const j = (row + ((x / size) | 0)) * 3, i = (y * w + x) * 4;
        d[i] += nz[j]; d[i + 1] += nz[j + 1]; d[i + 2] += nz[j + 2]; }
    }
    g.putImageData(img, 0, 0); },
};

/* the notebook: today's two papers, and the default set. Built exactly as before paper sets, so films keep their look. */
defineGround('cream', { tone: 'light', seed: 11, vignette: 'rgba(90,60,20,0.16)', grain: 0.8, contours: { alpha: 0.16 }, sfx: { header: 'scratch' },
  minContrast: { accent: 2.5 },    // the vermilion measures 2.5:1 on the cream texture; it stays, so films made before paper sets look the same
  /** cream: soft-edged 45° bands, large mottles, fibres, grain */
  build(g, r, W, H) {
    const k = W * H / (1920 * 1080), span = Math.max(1700, Math.ceil(Math.hypot(W, H) / 264 + 1) * 132);   // the bands cover any frame
    g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 4);
    for (let x = -span; x < span; x += 132) { const lg = g.createLinearGradient(x, 0, x + 66, 0);
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.2, PAL.stripe); lg.addColorStop(0.8, PAL.stripe); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.fillRect(x, -span, 66, 2 * span); }
    g.restore();
    for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H, R = 260 + r() * 420, rg = g.createRadialGradient(x, y, 0, x, y, R);
      rg.addColorStop(0, i % 2 ? 'rgba(120,90,50,0.055)' : 'rgba(255,250,235,0.08)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
    g.lineCap = 'round';
    for (let i = 0, n = Math.round(3200 * k); i < n; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 4 + r() * 18;
      g.strokeStyle = `rgba(${r() < .5 ? '110,90,60' : '160,140,110'},${0.05 + r() * 0.07})`; g.lineWidth = 0.6 + r() * 0.8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * .5, y + Math.sin(a + 0.6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    paperKit.grain(g, 16, 3, { size: 1 });
  } });
defineGround('night', { tone: 'dark', seed: 12, vignette: 'rgba(0,0,8,0.45)', grain: 0.5, contours: { alpha: 0.10 }, sfx: { header: 'readout' },
  /** night: deep navy, faint grid, cross-hatch weave, specks, grain */
  build(g, r, W, H) {
    const k = W * H / (1920 * 1080), lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, PAL.night); lg.addColorStop(1, PAL.night2);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(130,130,200,0.045)'; g.lineWidth = 1;
    for (let x = 0; x <= W; x += 120) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
    for (let y = 0; y <= H; y += 120) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
    for (let i = 0, n = Math.round(9000 * k); i < n; i++) { const x = r() * W, y = r() * H, l = 5 + r() * 12, s = r() < .5 ? 1 : -1;
      g.strokeStyle = `rgba(150,150,210,${0.02 + r() * 0.035})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - s * l); g.stroke(); }
    for (let i = 0, n = Math.round(500 * k); i < n; i++) { g.fillStyle = `rgba(210,210,255,${0.05 + r() * 0.2})`; g.fillRect(r() * W, r() * H, 1.4, 1.4); }
    paperKit.grain(g, 10, 4, { size: 1 });
  } });
definePaperSet('notebook', { light: 'cream', dark: 'night' });

/*
 * Which paper each plate is on. resolvePapers() runs at boot: it gives every plate pl._grounds (its set's { light, dark })
 * and pl._ground (the page it is drawn on), and the palette it draws with (pl._pal). A plate whose `paper` names a single
 * ground takes that ground's tone as its dark flag.
 */
const WORLD_LIGHT = new Set(['paper', 'stripe', 'ink', 'inkSoft', 'muted', 'label', 'panel', 'panelEdge', 'panelAlpha', 'cloudFill', 'graphite',
  'mark', 'shadow', 'cardTint', 'cardEdge', 'dialShadow', 'figShadow', 'counter', 'rim', 'pageBack']);
const worldKey = (tone, k) => tone === 'dark' ? k.startsWith('night') : WORLD_LIGHT.has(k);
let PAPER = null, PAL_KEYS = [];   // PAPER: the story's set { light, dark }; PAL_KEYS: the PAL fields a paper in this film changes
function paperSet(name, what) {
  const known = () => `paper sets: ${Object.keys(PAPER_SETS).join(', ')}; papers: ${Object.keys(GROUNDS).join(', ')}`;
  const need = n => { if (!GROUNDS[n]) throw new Error(`${what}: paper set '${name}' uses the paper '${n}', which is not defined (${known()})`); return GROUNDS[n]; };
  if (PAPER_SETS[name]) return { light: need(PAPER_SETS[name].light), dark: need(PAPER_SETS[name].dark) };
  if (GROUNDS[name]) { const g = GROUNDS[name], nb = PAPER || { light: GROUNDS.cream, dark: GROUNDS.night }; return { ...nb, [g.tone]: g }; }
  throw new Error(`${what}: '${name}' is not a paper set or a paper (${known()}). Papers outside the engine live in toolkit/grounds/*.js, ` +
    `and build.py includes one when the story names it as paper: '${name}'`);
}
function resolvePapers() {
  PAPER = null; PAPER = paperSet(STORY.paper ?? 'notebook', 'defineStory({ paper })');
  for (const pl of STORY.plates) {
    let gs = PAPER;
    if (pl.paper != null) {
      gs = paperSet(pl.paper, `plate ${pl.i} paper`);
      if (!PAPER_SETS[pl.paper]) { const tone = GROUNDS[pl.paper].tone;    // a single paper sets the plate's world
        if (pl.dark != null && !!pl.dark !== (tone === 'dark')) console.warn(`plate ${pl.i}: paper '${pl.paper}' is a ${tone} paper, so the plate is drawn as dark: ${tone === 'dark'}`);
        pl.dark = tone === 'dark'; }
    }
    pl._grounds = gs; pl._ground = gs[pl.dark ? 'dark' : 'light'];
  }
  const used = new Set(STORY.plates.flatMap(pl => [pl._grounds.light, pl._grounds.dark]));
  PAL_KEYS = [...new Set([...used].flatMap(g => Object.keys(g.pal)))];
  const base = PAL_KEYS.map(k => PAL[k]);                                  // PAL as the story left it
  for (const pl of STORY.plates) { const own = pl._ground, other = pl._grounds[own.tone === 'dark' ? 'light' : 'dark'];
    pl._pal = PAL_KEYS.map((k, i) => k in own.pal ? own.pal[k] : k in other.pal && worldKey(other.tone, k) ? other.pal[k] : base[i]); }
  return used;
}
/** swap a plate's palette into PAL (returns what to put back), and back out. A notebook film changes nothing. */
function palIn(vals) { if (!PAL_KEYS.length || !vals) return null; const was = PAL_KEYS.map(k => PAL[k]); PAL_KEYS.forEach((k, i) => { PAL[k] = vals[i]; }); return was; }
function palOut(was) { if (was) PAL_KEYS.forEach((k, i) => { PAL[k] = was[i]; }); }
/** withPaper(plate, fn): run fn with the plate's paper current (PAL, S.ground, S.grounds), then put everything back */
function withPaper(pl, fn) {
  const g0 = S.ground, gs0 = S.grounds, was = palIn(pl._pal); S.ground = pl._ground || null; S.grounds = pl._grounds || null;
  try { return fn(); } finally { palOut(was); S.ground = g0; S.grounds = gs0; }
}
/** palView(plate): the palette a plate draws with, as an object (for code that needs another plate's colours) */
function palView(pl) { return PAL_KEYS.length && pl._pal ? Object.assign({}, PAL, Object.fromEntries(PAL_KEYS.map((k, i) => [k, pl._pal[i]]))) : PAL; }
/** groundFor(dark): the paper of that world on the plate being drawn (its set's light or dark page) */
function groundFor(dark = S.dark) { const gs = S.grounds || PAPER || { light: GROUNDS.cream, dark: GROUNDS.night }; return gs[dark ? 'dark' : 'light']; }

/* ---------- textures (built once per paper, at the film's size) ---------- */
const GTEX = {};
/** groundTex(ground) -> { raw, treated, vig }: the texture as painted, with its treatment applied, and its vignette */
function groundTex(g) {
  let T = GTEX[g.name]; if (T) return T;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const raw = mk(); g.build(raw.getContext('2d'), mulberry(g.seed), W, H);
  const vig = mk(), vg = vig.getContext('2d'), m = Math.min(W, H), rg = vg.createRadialGradient(W / 2, H / 2, m * 0.32, W / 2, H / 2, m * 1.02);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, g.vignette); vg.fillStyle = rg; vg.fillRect(0, 0, W, H);   // drawn once per frame at identity, so scaled plates never show edges
  let treated = raw;
  if (g.treatment) { treated = mk(); const tg = treated.getContext('2d'); tg.drawImage(raw, 0, 0); treat(tg, g, new DOMMatrix(), raw); }
  return (GTEX[g.name] = { raw, treated, vig });
}
/** paperTex(dark): the texture of that world's paper: untreated while a treated scene draws (the treatment processes it), treated otherwise */
function paperTex(dark = S.dark, g = groundFor(dark)) { const T = groundTex(g); return S.raw ? T.raw : T.treated; }
const TEX = {};   // TEX.grain: the film-grain tiles. TEX.paper / TEX.night / TEX.vigPaper / TEX.vigNight: the notebook's, for older stories
for (const [k, n, f] of [['paper', 'cream', 'raw'], ['night', 'night', 'raw'], ['vigPaper', 'cream', 'vig'], ['vigNight', 'night', 'vig']])
  Object.defineProperty(TEX, k, { enumerable: true, get: () => groundTex(GROUNDS[n])[f] });
function buildTextures() {
  // film grain: four noise tiles, one per drawing, so the paper never sits perfectly still
  TEX.grain = [0, 1, 2, 3].map(k => { const c2 = document.createElement('canvas'); c2.width = c2.height = 256; const gg = c2.getContext('2d'), im = gg.createImageData(256, 256), rr = mulberry(300 + k);
    for (let i = 0; i < im.data.length; i += 4) { const v = rr() < 0.5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = rr() * 34; }
    gg.putImageData(im, 0, 0); return gg.createPattern(c2, 'repeat'); });
  for (const g of resolvePapers()) groundTex(g);                          // only the papers this film uses
  TEX.ready = true;
}

/*
 * treat(g2d, ground, base, raw): how a scene looks on a paper. drawPlate() draws a treated plate's paper, scene and
 * overlay onto a layer, treats it here, and draws the HUD on top untreated. base: the frame the paper was drawn in;
 * raw: the untreated texture. The kinds, applied in this order (any combination):
 *   tooth: [share, alpha]   holes punched through the drawing and filled with the paper, so lines pick up its grain
 *   filter: 'sepia(0.45)'   a CSS filter over everything
 *   color: ['#2d62b0', 0.7] everything tinted toward one hue (the 'color' blend: brightness stays, hue and saturation go)
 *   glow: [8, 0.6]          a blurred copy added on top (px, strength), as fluorescence glows
 * A function instead of the object does the whole job itself: fn(g2d, ground, { base, raw }), on the layer at identity.
 */
const TREAT = { scratch: null, masks: new Map() };
/** toothMask(share, w, h): holes in 2 px specks over a whole paper (share of full holes, as many again half-open), built
    once per size. One drawImage of it costs far less per frame than filling the frame with a scaled pattern. */
function toothMask(share, w, h) {
  const key = `${share}:${w}x${h}`; let c = TREAT.masks.get(key); if (c) return c;
  const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2), sm = Object.assign(document.createElement('canvas'), { width: w2, height: h2 });
  const sg = sm.getContext('2d'), im = sg.createImageData(w2, h2), r = mulberry(91);
  for (let i = 0; i < im.data.length; i += 4) { const v = r(); im.data[i + 3] = v < share ? 255 : v < share * 1.8 ? 90 : 0; }
  sg.putImageData(im, 0, 0);
  c = Object.assign(document.createElement('canvas'), { width: w, height: h }); const g = c.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, w2 * 2, h2 * 2); TREAT.masks.set(key, c); return c;
}
function treatScratch(src) {
  const c = TREAT.scratch && TREAT.scratch.width === src.width && TREAT.scratch.height === src.height ? TREAT.scratch : (TREAT.scratch = Object.assign(document.createElement('canvas'), { width: src.width, height: src.height }));
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'copy'; g.drawImage(src, 0, 0); return c;
}
function treat(g2d, gr, base, raw) {
  const tr = gr.treatment; if (!tr) return;
  const c = g2d.canvas;
  g2d.save();
  try {
    g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.globalAlpha = 1; g2d.globalCompositeOperation = 'source-over'; g2d.filter = 'none';
    if (typeof tr === 'function') { tr(g2d, gr, { base, raw }); return; }
    // keep every kind on the paper's own rectangle: outside it the layer is empty, and a blend or a blur would fill that
    g2d.setTransform(base); g2d.beginPath(); g2d.rect(0, 0, raw.width, raw.height); g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.clip();
    if (tr.tooth) {                                                        // holes in 2 px specks, fixed to the paper
      const [share, a] = tr.tooth;
      g2d.globalCompositeOperation = 'destination-out'; g2d.globalAlpha = a; g2d.setTransform(base); g2d.drawImage(toothMask(share, raw.width, raw.height), 0, 0);
      g2d.globalAlpha = 1; g2d.globalCompositeOperation = 'destination-over'; g2d.drawImage(raw, 0, 0); g2d.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (tr.filter) { const s = treatScratch(c); g2d.globalCompositeOperation = 'copy'; g2d.globalAlpha = 1; g2d.filter = tr.filter; g2d.drawImage(s, 0, 0); g2d.filter = 'none'; }
    if (tr.color) { const [col, a] = tr.color; g2d.globalCompositeOperation = 'color'; g2d.globalAlpha = a; g2d.fillStyle = col; g2d.fillRect(0, 0, c.width, c.height); }
    if (tr.glow) { const [px, a] = tr.glow, s = treatScratch(c); g2d.globalCompositeOperation = 'lighter'; g2d.globalAlpha = a; g2d.filter = `blur(${px}px)`; g2d.drawImage(s, 0, 0); }
  } finally { g2d.restore(); }
}
/** the layer a treated plate draws its scene on (one per nesting depth: a transition can draw a plate inside another's layer) */
const TREAT_LAYERS = []; let TREAT_DEPTH = 0;

/** four large, smooth topographic loops drifting slowly (the survey-map layer), in the paper's colours */
function contours(t, dark, seed = 21) {
  const g = groundFor(dark), c = g.contours; if (!c) return;
  if (typeof c === 'function') return c(t, g, seed);
  const cols = c.colors || PAL.topo, alpha = c.alpha ?? (dark ? 0.10 : 0.16), r = mulberry(seed);
  for (let i = 0; i < 4; i++) { const cx = r() * W, cy = r() * H, rad = 260 + r() * 300, col = cols[i % cols.length];
    for (let k = 0; k < 2; k++) { const p = shape.blob(cx + Math.sin(t * 0.05 + i) * 16, cy, rad * (1 - k * 0.18), seed + i * 7 + k, 0.22, 96, t * 0.012 * (i % 2 ? 1 : -1));
      ink(p, { closed: true, w: 1.3, color: col, alpha, amp: 0 }); } }
}
function regMarks(dark, alpha = 1) {
  const col = dark ? PAL.nightMark : PAL.mark;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = 1.2;
  for (const [x, y] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 15); ctx.stroke();
  }
  ctx.restore();
}
function background(dark, t) { ctx.drawImage(paperTex(dark), 0, 0); contours(t, dark); haloGround(dark, t); }
/** the ground a glyph halo paints with: this frame's paper plus its drifting contour loops, drawn once per plate per
    frame into an offscreen canvas in the paper's own frame. With the loops included, a halo over plain paper is the
    paper, tint and all, so it cannot show as an outline; over line art it still knocks the lines back. On a treated
    paper there are two: the untreated one for text inside the scene (the treatment reaches it later) and a treated one
    for the HUD, which is drawn after the treatment. */
const HALO_BG = { c: null, t: null };
function haloGround(dark, t) {
  const g = groundFor(dark), tex = groundTex(g).raw;
  if (!HALO_BG.c || HALO_BG.c.width !== tex.width || HALO_BG.c.height !== tex.height) {
    HALO_BG.c = document.createElement('canvas'); HALO_BG.c.width = tex.width; HALO_BG.c.height = tex.height; }
  const was = ctx; ctx = HALO_BG.c.getContext('2d');
  try { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tex, 0, 0); contours(t, dark); }
  finally { ctx = was; }
  S.haloPat = ctx.createPattern(HALO_BG.c, 'no-repeat');   // a copy: the next plate in a transition can reuse the canvas
  S.haloPatT = null;
  if (g.treatment) {
    if (!HALO_BG.t || HALO_BG.t.width !== tex.width || HALO_BG.t.height !== tex.height) HALO_BG.t = Object.assign(document.createElement('canvas'), { width: tex.width, height: tex.height });
    const tg = HALO_BG.t.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'copy'; tg.drawImage(HALO_BG.c, 0, 0);
    tg.globalCompositeOperation = 'source-over'; treat(tg, g, new DOMMatrix(), tex);
    S.haloPatT = ctx.createPattern(HALO_BG.t, 'no-repeat');
  }
}
/** layer(fn, slot): draw fn() into a reusable offscreen W×H canvas (ctx is swapped for the duration) and return it */
const LAYERS = [];
function layer(fn, slot = 0) {
  if (!LAYERS[slot]) { const c = document.createElement('canvas'); c.width = W; c.height = H; LAYERS[slot] = c; }
  const c = LAYERS[slot], g = c.getContext('2d'), old = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H);
  ctx = g; try { fn(); } finally { ctx = old; }
  return c;
}

/* ---------- type ---------- */
/**
 * Text roles (references/style.md, "Text size and legibility"). Every text call carries o.role; legibility_check
 * measures each line ON SCREEN (after the camera) against these floors, and contrast >= 4.5 against what is behind it:
 *   'fact'  28 px  callout titles and notes, stat values and notes, any line carrying a fact
 *   'label' 22 px  the default: chart axes and ticks, legends, card titles, stat kickers, scene labels
 *   'hud'   18 px  Journey Log labels and values, stage dial text, the hero's ID tag
 *   'decor' exempt frame counter, FIG numbers, the PLATE kicker, marks written on an object (dial digits, hex codes)
 */
const ROLE_PX = { fact: 28, label: 22, hud: 18, decor: 0 };
function setFont(kind, size, weight = 400, italic = false) { ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT[kind]}`; }
/**
 * text(s, x, y, {kind, size, weight, italic, color, align, ls, alpha, role}) -> width
 * role: 'fact' | 'label' (default) | 'hud' | 'decor' — drawing ignores it; it tells the checker which floor applies.
 */
function text(s, x, y, o = {}) {
  const { kind = 'sans', size = 24, weight = 400, italic = false, color = PAL.ink, align = 'left', ls = 0, alpha = 1, base = 'alphabetic' } = o;
  if (!s || alpha <= 0) return 0;
  ctx.save(); setFont(kind, size, weight, italic); ctx.letterSpacing = ls + 'px';
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  ctx.fillText(s, x, y); const w = ctx.measureText(s).width; ctx.restore(); return w;
}
/** the camera's current zoom (1 at identity, including the gate weave's 0.4%) */
const zoomNow = () => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1; };
/**
 * screenText(s, x, y, o): text() that keeps `size` px ON SCREEN whatever the camera does — counter-scaled about its
 * anchor (x, y), which still moves with the scene. Use it for scene labels drawn inside draw(): a label drawn at 30 px
 * under a 0.5x pull-back would otherwise land at 15 px. Returns the width in the caller's (scene) units.
 */
function screenText(s, x, y, o = {}) {
  const k = zoomNow(); ctx.save(); ctx.translate(x, y); ctx.scale(1 / k, 1 / k); const w = (o.backing || o.halo ? haloText : text)(s, 0, 0, o); ctx.restore(); return w / k;
}
function measure(s, o = {}) { ctx.save(); setFont(o.kind || 'sans', o.size || 24, o.weight || 400, o.italic); ctx.letterSpacing = (o.ls || 0) + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
/** typewriter: characters revealed at cps from local t = 0 */
const typed = (s, t, cps = 34) => s.slice(0, Math.floor(clamp(t * cps, 0, s.length)));
/** display type-on: each new glyph pops in place (scale 1.55 -> 1 about its own centre, overshoot). Left-aligned. */
function dropText(s, x, y, t, o = {}) {
  const cps = o.cps ?? 16, k = t * cps; if (k <= 0) return 0;
  const full = Math.min(s.length, Math.floor(k));
  // each glyph pops on its own 0.25 s clock, so several are mid-pop at once (a single-glyph pop is shorter than a drawing)
  const pop = 0.25 * cps, settled = Math.max(0, Math.min(s.length, Math.floor(k - pop)));
  const tx = o.halo ? haloText : text, w = tx(s.slice(0, settled), x, y, o);   // o.halo: glyph halo (plate header)
  for (let g = settled; g < Math.min(s.length, Math.ceil(k)); g++) {
    const p = clamp((k - g) / pop), sc = lerp(1.45, 1, E.outBack(p));
    const gw = measure(s[g], o), gx = x + measure(s.slice(0, g + 1), o) - gw;   // keeps the kerning pair
    const ax = gx + gw / 2, ay = y - (o.size || 24) * 0.35;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(sc, sc); ctx.translate(-ax, -ay);
    tx(s[g], gx, y, { ...o, alpha: (o.alpha ?? 1) * clamp(p * 2) }); ctx.restore();
  }
  return settled === s.length ? w : measure(s.slice(0, full), o);
}
/* ---------- legible text: backing and colour ---------- */
/** a rectangle with a ragged, torn-paper edge (static per seed: paper does not boil; the ink drawn round it does) */
function tornEdge(x, y, w, h, seed = 1, amp = 3) {
  const pts = [], side = (ax, ay, bx, by, nx, ny, s) => { const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(L / 11));
    for (let i = 0; i < n; i++) { const u = i / n, j = amp * (0.75 * vnoise(u * L / 38, seed * 7 + s) + 0.25 * (hash3(i, s, seed) - 0.5) * 2);
      pts.push([lerp(ax, bx, u) + nx * j, lerp(ay, by, u) + ny * j]); } };
  side(x, y, x + w, y, 0, -1, 1); side(x + w, y, x + w, y + h, 1, 0, 2); side(x + w, y + h, x, y + h, 0, 1, 3); side(x, y + h, x, y, -1, 0, 4);
  return pts;
}
/**
 * backing(x0, y0, x1, y1, o): a real card to write on, made of the plate's own paper (paper texture on paper plates,
 * night texture on night plates). The components' default is not this but a glyph halo (haloText); use a card when a
 * block of text genuinely needs one.
 *   style 'card' (default): a torn scrap of the same paper, a faint pencil edge and a drop shadow.
 *   style 'patch': a soft-edged patch of the texture. It erases the drawing under it in a soft box, so it is never a
 *     default; keep it for empty-looking areas such as night sky.
 * o: { dark = S.dark, pad = 16, feather = 18, alpha = 1, seed = 1, style = 'card' }. Box is in the caller's units.
 */
const BACK = {};
function backing(x0, y0, x1, y1, o = {}) {
  const { dark = S.dark, pad = 16, feather = 18, alpha = 1, seed = 1, style = 'card' } = o;
  if (alpha <= 0 || !TEX.ready || x1 <= x0) return;
  const X0 = x0 - pad, Y0 = y0 - pad, w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad, tex = paperTex(dark);
  // the texture is sampled where the plate's own paper lies (S.base: the frame drawPlate drew the paper in), so a halo
  // over empty paper matches it grain for grain, whatever camera, counter-scale or overlay transform the caller is under
  const base = S.base || new DOMMatrix(), cur = ctx.getTransform(), B = base.inverse().multiply(cur), k = Math.hypot(B.a, B.b) || 1;
  if (style === 'card') {
    const e = tornEdge(X0, Y0, w, h, seed, 2.6);
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.save(); ctx.translate(4, 5); flat(e, dark ? PAL.nightShadow : PAL.shadow); ctx.restore();
    ctx.save(); trace(e, true); ctx.clip(); ctx.setTransform(base); ctx.drawImage(tex, 0, 0); ctx.setTransform(cur);
    flat(e, dark ? PAL.nightCardTint : PAL.cardTint); ctx.restore();
    ink(e, { closed: true, w: 1.1, color: dark ? PAL.nightCardEdge : PAL.cardEdge, amp: 0.35, seed });
    ctx.restore(); return;
  }
  // patch: the torn shape's blurred SHADOW only (the shape itself is drawn far off-canvas), so the edge is soft on both
  // sides of the outline; the core, `pad` inside it, is solid. Built in base-frame pixels, then drawn back in local units.
  const m = Math.ceil(feather * 1.6), cw = Math.ceil(w * k + 2 * m), ch = Math.ceil(h * k + 2 * m);
  if (!BACK.c || BACK.c.width < cw || BACK.c.height < ch) { const c = document.createElement('canvas'); c.width = Math.max(cw, BACK.c ? BACK.c.width : 0); c.height = Math.max(ch, BACK.c ? BACK.c.height : 0); BACK.c = c; }
  const c = BACK.c, g = c.getContext('2d'), e = tornEdge(X0, Y0, w, h, seed, Math.min(5, pad * 0.3)), OFF = 20000;
  const bx = B.a * X0 + B.c * Y0 + B.e, by = B.b * X0 + B.d * Y0 + B.f;           // the box's corner in base-frame pixels
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height);
  g.save(); g.shadowColor = '#000'; g.shadowBlur = feather; g.shadowOffsetX = OFF;
  g.setTransform(k, 0, 0, k, m - k * X0 - OFF, m - k * Y0); g.beginPath(); e.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); g.fillStyle = '#000'; g.fill(); g.restore();
  g.globalCompositeOperation = 'source-in'; g.drawImage(tex, m - bx, m - by); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(c, 0, 0, cw, ch, X0 - m / k, Y0 - m / k, cw / k, ch / k); ctx.restore();
}
/** the box a text() call covers (full string), for sizing a backing before the text types on: [x0, y0, x1, y1] */
function textBox(s, x, y, o = {}) {
  const size = o.size || 24, w = measure(s, o), al = o.align || 'left', x0 = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
  return [x0, y - size * 0.8, x0 + w, y + size * 0.25];
}
/**
 * haloText(s, x, y, o): text() with a glyph halo, the cartographer's knockout: the same glyphs are first stroked in the
 * plate's paper colour (night paper on night plates) with a round-joined line about 0.25 em wide, so line art clears only
 * in a thin band around each letter and the drawing behind stays whole. o.halo: false skips it; o.haloWidth (em),
 * o.haloAlpha (default 0.92) and o.haloColor tune it. The stroke is drawn straight on ctx, not through text(), so the
 * legibility checks see it as part of what the text sits on.
 */
/** the halo's ink: the plate's own paper texture, placed where drawPlate laid the paper (S.base), so over plain paper the
    halo matches it grain for grain and cannot show; a flat PAL colour left a pale outline round every haloed line */
const HALO = {};
function haloInk(dark = S.dark) {
  if (!TEX.ready) return dark ? PAL.night : PAL.paper;
  // on a treated paper the HUD (drawn after the treatment) needs the treated paper; text inside the scene the untreated one
  const g = groundFor(dark), tex = paperTex(dark, g), treated = tex !== groundTex(g).raw, key = g.name + (treated ? '|t' : '');
  const own = S.haloDark === !!dark && (treated ? S.haloPatT : S.haloPat);
  const pat = own || HALO[key] || (HALO[key] = ctx.createPattern(tex, 'no-repeat'));
  pat.setTransform(ctx.getTransform().inverse().multiply(S.base || new DOMMatrix()));   // pattern space = the paper's frame
  return pat;
}
function haloText(s, x, y, o = {}) {
  if (s && o.halo !== false && (o.alpha ?? 1) > 0) {
    const { kind = 'sans', size = 24, weight = 400, italic = false, align = 'left', ls = 0, alpha = 1, base = 'alphabetic', dark = S.dark } = o;
    ctx.save(); setFont(kind, size, weight, italic); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.globalAlpha *= alpha * (o.haloAlpha ?? 0.92); ctx.strokeStyle = o.haloColor || haloInk(dark);
    ctx.lineWidth = size * (o.haloWidth ?? 0.25); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 2;
    ctx.strokeText(s, x, y); ctx.restore();
  }
  return text(s, x, y, o);
}
const unionBox = bs => bs.filter(Boolean).reduce((a, b) => a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b, null);
/**
 * legible(color, dark, min = 6): the same hue pushed toward the plate's ink (darker on paper, lighter on night) until it
 * reads at >= min:1 against the plate's ground. For coloured labels (series names, ruler marks): the accent orange and
 * the sea blue are too pale to read as text on paper.
 */
const LEG = {};
function legible(color, dark = S.dark, min = 6) {
  const key = `${color}|${dark ? 1 : 0}|${min}|${dark ? PAL.night2 : PAL.paper}|${PAL.ink}`; if (LEG[key]) return LEG[key];   // keyed by the paper too
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = c => { const [r, g, b] = rgbOf(c).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bg = lum(dark ? PAL.night2 : PAL.paper), cr = c => { const l = lum(c); return (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05); };
  let out = color;
  for (let k = 1; cr(out) < min && k <= 10; k++) out = mixColor(color, dark ? '#ffffff' : PAL.ink, k / 10);
  return (LEG[key] = out);
}
const labelOf = dark => dark ? PAL.nightLabel : PAL.label;    // secondary text colour (readable); mutedOf is for lines
/** inkOn(bg): ink or pale paper, whichever reads better on a coloured surface (a label written on a layer, a chip, a patch) */
function inkOn(bg) { const L = c => { const [r, g, b] = rgbOf(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const lb = L(bg), cr = c => { const lc = L(c); return (Math.max(lb, lc) + 0.05) / (Math.min(lb, lc) + 0.05); }; return cr(PAL.ink) >= cr('#fbf7ee') ? PAL.ink : '#fbf7ee'; }
const fmt = (v, dec = 0) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
/** count-up string: ease-out cubic from `from` to `to` over dur seconds */
const countUp = (to, t, dur = 1.3, dec = 0, from = 0) => fmt(lerp(from, to, E.out3(clamp(t / dur))), dec);
const ROMAN = n => [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
const SUB = s => s.replace(/[0-9]/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
const SUP = s => s.replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

/* ---------- HUD: the recurring plate furniture ---------- */
const inkOf = dark => dark ? PAL.nightInk : PAL.ink;
const mutedOf = dark => dark ? PAL.nightMuted : PAL.muted;
/** plate header: kicker (decor), title (label), subtitle (fact). header.backing (default true): a glyph halo round the
 *  title and subtitle, so art that strays into the header band never runs through the letters; 'card' or false. */
function plateHeader(t, { num, title, sub, dark, backing: bk = true }) {
  const ic = inkOf(dark), TO = { kind: 'display', size: 64, weight: 500, role: 'label' }, SO = { kind: 'display', size: 30, italic: true, role: 'fact' };
  if (bk === 'card') { const b = unionBox([textBox(title, 88, 158, TO), sub && textBox(sub, 90, 221, SO)]); backing(b[0], b[1], b[2], b[3], { dark, alpha: clamp(t * 3), seed: 3, pad: 12 }); }
  const hl = { dark, halo: bk === true };
  text(typed(`PLATE  ${ROMAN(num)}`, t, 30), 90, 95, { kind: 'mono', size: 18, ls: 6, color: mutedOf(dark), role: 'decor' });
  dropText(title, 88, 158, t - 0.15, { ...TO, ...hl, color: ic, cps: 17 });
  const tw = measure(title, TO), rp = E.out3(inv(0.35, 1.1, t));
  if (rp > 0) ink([[90, 180], [90 + (tw + 6) * rp, 180]], { w: 1.6, color: PAL.peri, amp: 0, alpha: 0.85 });
  if (sub) haloText(typed(sub, t - 0.7, 30), 90, 221, { ...SO, ...hl, color: dark ? PAL.nightSoft : PAL.inkSoft });
}
/**
 * journey log: {title, rows: [[label, value]], states: [...], state: i, backing}. HUD role: labels 18 px, values 21 px.
 * The block widens to the left when a row needs it, and the STATE options wrap onto their own lines only when they must.
 * backing (default true): a glyph halo round every line (or 'card' for a torn scrap behind the block), so the log never
 * sits directly on line art; false turns it off.
 */
const LOG = { x1: 1868, y: 114, row: 34, title: { kind: 'mono', size: 18, ls: 3, role: 'hud' }, lab: { kind: 'mono', size: 18, ls: 1, role: 'hud' },
  val: { kind: 'mono', size: 21, weight: 600, role: 'hud' }, st: { kind: 'mono', size: 18, weight: 600, role: 'hud' } };
function journeyLog(t, log, dark) {
  const { x1, y: y0, row: R } = LOG, ic = inkOf(dark), lc = labelOf(dark);
  const rowW = Math.max(0, ...log.rows.map(([l, v]) => measure(l, LOG.lab) + measure(String(v), LOG.val) + 28));
  const stW = log.states ? log.states.map(s => measure(s, LOG.st) + 34) : [];
  const x0 = Math.min(1518, x1 - Math.max(measure(log.title, LOG.title), rowW, ...stW));
  // STATE options: on the STATE row when they fit beside the label, else on their own lines below it (right-aligned)
  const lines = [], wrap = !!log.states && stW.reduce((a, b) => a + b, 0) - 4 > x1 - x0 - measure('STATE', LOG.lab) - 24;
  if (log.states && !wrap) lines.push(log.states.map((_, i) => i));
  else if (wrap) { let cur = [], w = 0; stW.forEach((sw, i) => { if (cur.length && w + sw - 4 > x1 - x0) { lines.push(cur); cur = []; w = 0; } cur.push(i); w += sw; }); lines.push(cur); }
  const ySt = y0 + log.rows.length * R, yEnd = log.states ? ySt + (wrap ? lines.length : 0) * 30 : ySt - R;
  if (log.backing === 'card') backing(x0, 52, x1, yEnd + 8, { dark, alpha: clamp(t * 3), seed: 5, pad: 16 });
  const hl = { dark, halo: (log.backing ?? true) === true }, text = haloText;   // every line below gets the glyph halo
  text(typed(log.title, t, 40), x1, 70, { ...LOG.title, ...hl, align: 'right', color: dark ? PAL.nightSoft : PAL.inkSoft });
  ink([[x0, 84], [lerp(x0, x1, E.out3(inv(0.1, 0.6, t))), 84]], { w: 1.4, color: PAL.peri, amp: 0, alpha: 0.8 });
  log.rows.forEach(([lab, val], i) => { const y = y0 + i * R, al = inv(0.2 + i * 0.08, 0.5 + i * 0.08, t);
    text(lab, x0, y, { ...LOG.lab, ...hl, color: lc, alpha: al }); text(val, x1, y, { ...LOG.val, ...hl, align: 'right', color: ic, alpha: al }); });
  if (log.states) {
    const al = inv(0.5, 0.8, t);
    text('STATE', x0, ySt, { ...LOG.lab, ...hl, color: lc, alpha: al });
    lines.forEach((ln, li) => { const ys = wrap ? ySt + (li + 1) * 30 : ySt; let x = x1;
      for (let k = ln.length - 1; k >= 0; k--) { const i = ln[k], on = i === log.state, s = log.states[i];
        const w = text(s, x, ys, { ...LOG.st, ...hl, weight: on ? 600 : 400, align: 'right', color: on ? ic : legible(PAL.peri, dark), alpha: al });
        ctx.save(); ctx.globalAlpha *= al; ctx.beginPath(); ctx.arc(x - w - 10, ys - 6, 4.6, 0, TAU);
        if (on) { ctx.fillStyle = PAL.accent; ctx.fill(); } else { ctx.strokeStyle = PAL.peri; ctx.lineWidth = 1.3; ctx.stroke(); } ctx.restore(); x -= w + 34; } });
  }
}
function stageDial(t, { n, N, name, prevN }, dark) {
  const a = inv(0, 0.4, t); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const box = shape.rect(45, 900, 358, 138);
  if (dark) ink(box, { closed: true, w: 1.2, color: PAL.nightPanelEdge, fill: PAL.nightPanel, amp: 0 });
  else { flat(shape.rect(48, 903, 358, 138), PAL.dialShadow); ink(box, { closed: true, w: 1.6, color: PAL.panelEdge, fill: PAL.panel, fillAlpha: Math.max(0.97, PAL.panelAlpha), amp: 0.5, seed: 91, double: true }); }   // opaque: the dial is the backing for its text
  const cx = 118, cy = 968, R = 50;
  ink(shape.circle(cx, cy, R), { closed: true, w: 1.3, color: PAL.peri, amp: 0, alpha: 0.9 });
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; ink([[cx + Math.cos(an) * (R - 5), cy + Math.sin(an) * (R - 5)], [cx + Math.cos(an) * (R + 5), cy + Math.sin(an) * (R + 5)]], { w: 1.2, color: PAL.peri, amp: 0 }); }
  const p = lerp((prevN ?? n - 1) / N, n / N, E.inOut3(inv(0.2, 1.2, t))), an = -Math.PI / 2 + p * TAU;
  if (p > 0) ink(shape.arc(cx, cy, R, -Math.PI / 2, an, 40), { w: 3, color: PAL.accent, amp: 0 });
  ctx.beginPath(); ctx.arc(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 7, 0, TAU); ctx.fillStyle = dark ? PAL.nightInk : PAL.ink; ctx.fill();
  text(`STAGE ${String(n).padStart(2, '0')} / ${N}`, 194, 958, { kind: 'mono', size: 18, ls: 3, color: labelOf(dark), role: 'hud', alpha: inv(0.25, 0.45, t) });   // after the card is solid
  const no = { kind: 'mono', size: 21, weight: 600, ls: 3, role: 'hud' }, nk = Math.min(1, 196 / Math.max(1, measure(name, no)));   // a long name tightens its tracking first
  text(typed(name, t - 0.3, 24), 194, 990, { ...no, ls: nk < 1 ? Math.max(0, 3 - (1 - nk) * 40) : 3, color: inkOf(dark) });
  ctx.restore();
}
function frameCounter(f, dark) {
  const s = `EXP ${String(Math.floor(f / 2)).padStart(4, '0')}    F ${String(f).padStart(4, '0')}`;
  text(s, 1868, 1046, { kind: 'mono', size: 14, ls: 1, align: 'right', color: dark ? PAL.nightCounter : PAL.counter, role: 'decor' });
}

/* ---------- annotation components ---------- */
/**
 * callout(t, {ax, ay, ex, ey, x2, title, sub, dark, align, size, backing}): anchor dot -> elbow -> horizontal leader, then
 * a bold title and a quieter sub. Both are role 'fact': title 32 px, sub max(28, 0.875 x size). t is local (0 = starts
 * drawing). Wrap in withAlpha(beat(...)) to make it leave. backing (default true): a glyph halo round the words
 * (haloText), which clears line art only in a thin band around each letter. false turns it off; 'card' puts the words
 * on a torn scrap of paper instead.
 */
function callout(t, o) {
  if (t <= 0) return;
  const { ax, ay, ex, ey, x2, title, sub, dark = S.dark, align = 'left', size = 32, backing: bk = true } = o;
  let { x2: xe, align: al } = { x2, align };
  const ic = inkOf(dark), lp = E.out3(inv(0, 0.45, t)), M = 40;
  const TO = { kind: 'sans', size, weight: 600, role: 'fact' }, SO = { kind: 'sans', size: Math.max(28, Math.round(size * 0.875)), role: 'fact' };
  // keep the text inside the frame: if it would run past an edge, the leader turns around at the elbow; if it still
  // does not fit, the text slides in (measured on the full strings, so it never jumps while typing)
  const tw = Math.max(measure(title, TO), sub ? measure(sub, SO) : 0);
  const over = (x, a) => a === 'left' ? x + 12 + tw > W - M : x - 12 - tw < M;
  const flip = al === 'left' ? 'right' : 'left', xf2 = al === 'left' ? Math.min(2 * ex - xe, ex - 60) : Math.max(2 * ex - xe, ex + 60);   // flipped flag: at least 60 px
  if (over(xe, al) && !over(xf2, flip)) { xe = xf2; al = flip; }
  let tx = al === 'left' ? xe + 12 : xe - 12;
  tx = al === 'left' ? Math.min(tx, W - M - tw) : Math.max(tx, M + tw);
  const ty = ey + 10, sy = ty + Math.round(size * 0.6 + SO.size * 0.85);
  if (bk === 'card') { const b = unionBox([textBox(title, tx, ty, { ...TO, align: al }), sub && textBox(sub, tx, sy, { ...SO, align: al })]);
    backing(b[0], b[1], b[2], b[3], { dark, alpha: clamp((t - 0.3) * 4), seed: 11, pad: 12 }); }
  const hl = { dark, halo: bk === true };
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 5.5 * E.outBack(clamp(t * 6)), 0, TAU); ctx.fillStyle = ic; ctx.fill(); ctx.restore();
  pen([[ax, ay], [ex, ey], [xe, ey]], { w: 2.6, color: ic, amp: 0.5, seed: 7, draw: lp, taper: 0.04, minW: 0.6 });
  haloText(typed(title, t - 0.35, 30), tx, ty, { ...TO, ...hl, color: ic, align: al });
  if (sub) haloText(typed(sub, t - 0.7, 45), tx, sy, { ...SO, ...hl, color: labelOf(dark), align: al });
}
/**
 * big stat: kicker (mono caps, role 'label', 22 px) + large display number (role 'fact', tight tracking) + italic note
 * (role 'fact', 28 px). backing (default true): a glyph halo round each line; 'card' puts the block on a torn scrap.
 */
function stat(t, { x, y, kicker, value, note, dark = S.dark, size = 62, align = 'left', backing: bk = true }) {
  if (t <= 0) return;
  const KO = { kind: 'mono', size: 22, ls: 4, role: 'label', align }, VO = { kind: 'display', size, weight: 500, align, ls: size >= 56 ? -1 : 0, role: 'fact' },
    NO = { kind: 'display', size: 28, italic: true, role: 'fact', align }, ky = y - size * 0.95, ny = y + 40;
  const v = typeof value === 'function' ? value(t - 0.5) : value;   // the count starts once the number is fully in
  if (bk === 'card') { const vf = typeof value === 'function' ? value(1e4) : value, b = unionBox([kicker && textBox(kicker, x + 3, ky, KO), textBox(String(vf), x, y, VO), note && textBox(note, x + 3, ny, NO)]);
    backing(b[0], b[1], b[2], b[3], { dark, alpha: clamp(t * 4), seed: 13, pad: 14 }); }
  const hl = { dark, halo: bk === true }, text = haloText;
  if (kicker) text(typed(kicker, t, 40), x + 3, ky, { ...KO, ...hl, color: dark ? PAL.nightSoft : PAL.inkSoft });
  if (t >= 0.3) text(v, x, y, { ...VO, ...hl, color: inkOf(dark) });   // the number lands at full ink, like a typed glyph (a fade would show the first count half-transparent)
  if (note) text(typed(note, t - 1.2, 40), x + 3, ny, { ...NO, ...hl, color: dark ? PAL.nightSoft2 : PAL.inkSoft });
}
/** tracker reticle + ID tag (role 'hud', 18 px, with a glyph halo). Prefer the plate's `hero` property, which the engine draws as furniture. */
function reticle(x, y, t, { label, r = 40, dark, alpha = 1, tag = true }) {
  if (alpha <= 0 || S.noReticle) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  let tg = null;
  if (tag && label) {
    const LO = { kind: 'mono', size: 18, weight: 600, role: 'hud' }, lw = Math.max(110, measure(label, LO) + 8), m = ctx.getTransform();
    const sg = m.e + (x + r * 0.72 + 22 + lw) * Math.hypot(m.a, m.b) > W - 30 ? -1 : 1;   // near the right edge the tag points left
    const lx = x + sg * r * 0.72, ly = y - r * 0.72, tx = lx + sg * 22, ty = ly - 22;
    tg = { LO, lw, sg, lx, ly, tx, ty };
  }
  ink(shape.circle(x, y, r * (1 + 0.04 * Math.sin(t * 4))), { closed: true, w: 1.4, color: PAL.peri, amp: 0 });
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.9);
  ctx.strokeStyle = PAL.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([r * 0.55, r * 0.35]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.rotate(-t * 1.5); ctx.lineWidth = 1.6; ctx.globalAlpha *= 0.8;
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5)); ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12)); ctx.stroke(); }
  ctx.restore();
  if (tg) { const { LO, lw, sg, lx, ly, tx, ty } = tg;
    ink([[lx, ly], [tx, ty], [tx + sg * lw, ty]], { w: 1.4, color: PAL.peri, amp: 0 });
    haloText(label, tx + sg * 4, ty - 8, { ...LO, dark, color: inkOf(dark), align: sg > 0 ? 'left' : 'right' }); }
  ctx.restore();
}
/** card that unfolds left to right (translucent, double outline); returns content progress, 0 until open.
 *  title: mono caps, role 'label', 22 px (a long title tightens its tracking first, never below 22 px).
 *  fig: the FIG. number, role 'decor'. The card itself is the backing for whatever is drawn in it. */
function card(t, { x, y, w, h, dark = S.dark, fig, title }) {
  const p = E.out3(inv(0, 0.4, t)); if (p <= 0) return 0;
  const ww = w * p;
  if (dark) ink(shape.rect(x, y, ww, h), { closed: true, w: 1.4, color: PAL.nightFigEdge, fill: PAL.nightFig, amp: 0 });
  else { flat(shape.rect(x + 4, y + 4, ww, h), PAL.figShadow); ink(shape.rect(x, y, ww, h), { closed: true, w: 2, color: PAL.panelEdge, fill: PAL.panel, fillAlpha: Math.max(0.95, PAL.panelAlpha), amp: 0.6, seed: 77, double: true }); }
  let to = { kind: 'mono', size: 22, weight: 600, ls: 4, role: 'label' };
  if (title && measure(title, to) > w - 48) to = { ...to, ls: 1 };
  if (title) {
    // a title that does not fit even at the tightest tracking wraps onto more lines rather than running off the card:
    // the floor is 22 px, so it never shrinks (a wrapped title takes 26 px more height per line; leave room for it)
    const words = title.split(' '), lines = [];
    for (const wd of words) { const cur = lines.length ? lines[lines.length - 1] + ' ' + wd : wd;
      if (lines.length && measure(cur, to) > w - 48) lines.push(wd); else if (lines.length) lines[lines.length - 1] = cur; else lines.push(wd); }
    let shown = typed(title, t - 0.45, 40).length;
    lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, shown)); shown -= ln.length + 1;
      if (part) text(part, x + 24, y + 40 + i * 26, { ...to, color: inkOf(dark) }); });
  }
  if (fig) { const fo = { kind: 'mono', size: 16, ls: 3, role: 'decor' }, clash = title && measure(title, to) + measure(fig, fo) + 72 > w;
    text(typed(fig, t - 0.45, 30), x + w - 24, clash ? y + h - 18 : y + 36, { ...fo, align: 'right', color: mutedOf(dark) }); }   // a long title pushes the figure label to the bottom corner
  return inv(0.4, 0.6, t);
}
/** log-scale ruler in a card: ticks [[v, label]], marks [{v, label, color, row, t0}] (labels flip left near the end).
 *  Tick labels and marks are role 'label', 22 px; mark colours are darkened (legible()) until they read as text. */
function logRuler(t, { x, y, w, min, max, ticks, marks, dark = S.dark }) {
  const X = v => x + w * (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  const ic = inkOf(dark), lp = E.out3(inv(0, 0.8, t)); if (lp <= 0) return;
  ink([[x, y], [x + w * lp, y]], { w: 2, color: ic, amp: 0 });
  if (lp >= 1) arrowHead(x + w + 2, y, 0, 11, ic, 2);
  ticks.forEach(([v, lab], i) => { const a = inv(0.1 + i * 0.05, 0.3 + i * 0.05, t); if (!a) return;
    ink([[X(v), y - 8], [X(v), y + 8]], { w: 1.5, color: ic, amp: 0, alpha: a });
    text(lab, X(v), y + 34, { kind: 'mono', size: 22, align: 'center', color: labelOf(dark), alpha: a, role: 'label' }); });
  marks.forEach((m, i) => { const mt = t - (m.t0 ?? 0.6 + i * 0.35); if (mt <= 0) return;
    const yy = y - 28 - (m.row || 0) * 32, col = m.color || ic;
    ink([[X(m.v), y], [X(m.v), yy + 6]], { w: 1.2, color: col, amp: 0, draw: E.out3(clamp(mt * 4)) });
    ctx.beginPath(); ctx.arc(X(m.v), y, 6 * E.outBack(clamp(mt * 4)), 0, TAU); ctx.fillStyle = col; ctx.fill();
    const lo = { kind: 'mono', size: 22, weight: 600, ls: 0, color: legible(col, dark), role: 'label' }, flip = X(m.v) + 8 + measure(m.label, lo) > x + w + 20;
    text(typed(m.label, mt - 0.1, 40), X(m.v) + (flip ? -8 : 8), yy, { ...lo, align: flip ? 'right' : 'left' }); });
}
/**
 * line chart inside a card. series: [{ pts, color, w, draw (0..1, default 1), label }]; a label appears at the line's end
 * once it has drawn on. Nothing is drawn before t = 0; the axes draw on first. Returns {X, Y, ends} for placing marks.
 * Tick labels, axis labels and series labels are role 'label', 22 px: leave about 40 px left of the y axis for its
 * ticks, 70 px below the x axis for its ticks and label, and 30 px above the chart for the y label.
 */
function lineChart(t, { x, y, w, h, xr, yr, xticks, yticks, xlab, ylab, series, dark = S.dark }) {
  const X = v => x + w * (v - xr[0]) / (xr[1] - xr[0]), Y = v => y + h - h * (v - yr[0]) / (yr[1] - yr[0]);
  const ic = inkOf(dark), lc = labelOf(dark), a = E.out3(inv(0, 0.5, t)), TO = { kind: 'mono', size: 22, role: 'label' };
  if (a <= 0) return { X, Y, ends: [] };
  ink([[x, y], [x, y + h], [x + w, y + h]], { w: 2, color: ic, amp: 0.4, seed: 5, draw: a });
  xticks.forEach(v => { text(String(v), X(v), y + h + 30, { ...TO, align: 'center', color: lc, alpha: a });
    ink([[X(v), y], [X(v), y + h]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.25 * a }); });
  yticks.forEach(v => { text(String(v), x - 12, Y(v) + 7, { ...TO, align: 'right', color: lc, alpha: a });
    ink([[x, Y(v)], [x + w, Y(v)]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.25 * a }); });
  if (xlab) text(xlab, x + w, y + h + 62, { ...TO, ls: 1, align: 'right', color: lc, alpha: a });
  if (ylab) text(ylab, x, y - 16, { ...TO, ls: 1, color: lc, alpha: a });
  const ends = [];
  series.forEach((s, i) => { const pts = s.pts.map(([u, v]) => [X(u), Y(v)]), d = s.draw ?? 1;
    if (d > 0) pen(pts, { w: s.w || 3, color: s.color, amp: 0.6, seed: 9 + i, draw: d, taper: 0.03, minW: 0.5 });
    const e = along(pts, d); ends.push(e);
    if (s.label && d > 0) text(s.label, Math.min(e[0], x + w), e[1] - 14, { ...TO, weight: 600, ls: 1, align: 'right', color: legible(s.color, dark), alpha: E.out3(inv(0.85, 1, d)) }); });
  return { X, Y, ends };
}
/**
 * insetLens(t, {cx, cy, r, sx, sy, draw, dark, label}): a magnifier bubble tied to a source point by two tangent lines.
 * The close-up stays at full size while the circle opens around it. draw(t) paints in local coords centred on (0,0).
 * label: role 'label', 22 px, under the lens, with a glyph halo.
 */
function insetLens(t, { cx, cy, r, sx, sy, draw, dark = true, label }) {
  const p = E.outBack(inv(0, 0.5, t)); if (p <= 0) return;
  const rr = r * Math.max(0.01, p), d = Math.hypot(cx - sx, cy - sy), a = Math.atan2(cy - sy, cx - sx), b = Math.asin(clamp(rr / d, -1, 1));
  const L = Math.sqrt(Math.max(0, d * d - rr * rr));
  for (const sg of [-1, 1]) ink([[sx, sy], [sx + Math.cos(a + sg * b) * L, sy + Math.sin(a + sg * b) * L]], { w: 1.2, color: PAL.peri, amp: 0, alpha: 0.8 * clamp(p) });
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.clip();
  ctx.drawImage(paperTex(dark), cx - W / 2, cy - H / 2);
  ctx.translate(cx, cy); draw(t); ctx.restore();
  lensRing(cx, cy, rr, clamp(p), S.dark ? null : PAL.inkSoft);                      // the plate's own ink: a pale ring vanishes on paper
  if (label) haloText(typed(label, t - 0.5, 30), cx, cy + r + 48, { kind: 'mono', size: 22, ls: 3, align: 'center', role: 'label', color: S.dark ? PAL.nightSoft : PAL.inkSoft });
}

/* ---------- motion helpers ---------- */
/** 2-D value noise in [-1,1] */
function vnoise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (i, j) => hash3(xi + i, yi + j, seed);
  return lerp(lerp(h(0, 0), h(1, 0), u), lerp(h(0, 1), h(1, 1), u), v) * 2 - 1;
}
/** wander(i, t, amp, speed, seed) -> [dx, dy]: smooth random drift for particles (thermal motion, floating specks) */
const wander = (i, t, amp = 6, speed = 0.6, seed = 0) => [amp * vnoise(t * speed + i * 7.1, seed + i), amp * vnoise(t * speed + i * 3.3, seed + i + 91)];
/** the piece of a polyline between fractions a and b */
function subpath(p, a, b, step = 6) {
  const L = pathLen(p), n = Math.max(2, Math.ceil((b - a) * L / step));
  return Array.from({ length: n }, (_, i) => along(p, lerp(a, b, i / (n - 1))));
}
/** flow(path, t, opts): tapered dashes that travel along a path (currents, rivers, blood, conveyor arrows) */
function flow(path, t, o = {}) {
  const { speed = 60, gap = 70, len = 26, color = '#ffffff', w = 2.2, alpha = 0.8, seed = 3 } = o;
  const L = pathLen(path); if (L <= 0) return;
  const shift = ((t * speed) % gap + gap) % gap;
  let k = 0;
  for (let s = shift - gap; s < L; s += gap, k++) {
    const a = clamp(s / L), b = clamp((s + len) / L); if (b - a < 0.002) continue;
    const fade = clamp(a * L / 40) * clamp((1 - b) * L / 40);
    if (fade > 0) pen(subpath(path, a, b), { w, color, alpha: alpha * fade, taper: 0.35, seed: seed + k, amp: 0.3 });
  }
}
/** zoom-style interpolation: equal ratios per unit time, so a zoom never seems to speed up or stall */
const zlerp = (a, b, e) => a * Math.pow(b / a, e);
/** radius of the smallest circle centred at (x, y) that covers the whole frame */
const coverR = (x, y) => Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y)) + 24;
/** bgTex(ground | dark): a paper texture to lay under a plate drawn with bg: false (a ground, or a world of the current plate's set) */
const bgTex = d => d && typeof d === 'object' ? groundTex(d).treated : paperTex(!!d);

/* ---------- camera ---------- */
/** withCamera({x, y, s, dx, dy, rot}, fn): draw fn() zoomed by s about (x, y) and panned by (dx, dy). Paper and HUD stay put. */
function withCamera(cam, fn) {
  if (!cam) return fn();
  const { x = W / 2, y = H / 2, s = 1, rot = 0, dx = 0, dy = 0 } = cam;
  ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(s, s); ctx.rotate(rot); ctx.translate(-x, -y); fn(); ctx.restore();
}
/** where a scene point lands on screen under a camera */
function camPoint(cam, [px, py]) {
  if (!cam) return [px, py];
  const { x = W / 2, y = H / 2, s = 1, rot = 0, dx = 0, dy = 0 } = cam, c = Math.cos(rot), sn = Math.sin(rot), ux = (px - x) * s, uy = (py - y) * s;
  return [x + dx + ux * c - uy * sn, y + dy + ux * sn + uy * c];
}
/** plates without `cam` get a slow push-in (STORY.drift, default 4%) so no shot is ever frozen; drift: false turns it off */
function camOf(pl, t) {
  if (pl.cam) return pl.cam(t);
  const d = pl.drift ?? STORY.drift ?? 0.04; if (!d) return null;
  return { x: W / 2, y: H * 0.55, s: 1 + d * E.inOutSine(clamp(t / pl.dur)) };
}
/**
 * follow(target, t, { s, lead, lag, anchor, turn }): a tracking camera. It keeps a moving subject (target: t => [x, y],
 * scene coordinates) near `anchor` on screen with lead room: space opens up in the direction the subject is heading,
 * growing with its speed. The camera trails by `lag` seconds, so the subject leads the frame. s: zoom, a number or
 * t => number. Returns a cam for plate.cam.
 */
function follow(target, t, { s = 1, lead = 180, lag = 0.2, anchor = [W / 2, H / 2], turn = 0.4 } = {}) {
  // the anchor is the subject averaged over the last `lag` seconds (a smooth lag), so jitter never reaches the camera
  const avg = t0 => { let x = 0, y = 0; for (let k = 0; k < 5; k++) { const [a, b] = target(t0 - lag * (0.5 + k / 4)); x += a / 5; y += b / 5; } return [x, y]; };
  // lead room follows the subject's heading averaged over the last second, so stop-and-go motion never makes the frame bob
  const leadAt = t0 => { const [ux, uy] = target(t0), [wx, wy] = target(t0 - turn), vx = ux - wx, vy = uy - wy, sp = Math.hypot(vx, vy);
    const k = E.inOutSine(clamp(sp / turn / 260)) * lead; return sp ? [vx / sp * k, vy / sp * k] : [0, 0]; };
  let lx = 0, ly = 0; for (let k = 0; k < 7; k++) { const [a, b] = leadAt(t - lag - k / 6); lx += a / 7; ly += b / 7; }
  const sc = typeof s === 'function' ? s(t) : s, [px, py] = avg(t);
  const ax = anchor[0] - lx, ay = anchor[1] - ly;
  return { x: px, y: py, s: sc, dx: ax - px, dy: ay - py };
}
/** softClamp(x, lo, hi, k): clamp with rounded corners k px wide, so a camera limited by it eases to a stop instead of stopping dead */
function softClamp(x, lo, hi, k = 240) {
  const sm = (a, b) => { const h = clamp(0.5 + (b - a) / (2 * k)); return lerp(b, a, h) - k * h * (1 - h); };   // smooth min
  return -sm(-sm(x, hi), -lo);
}
/** parallax(cam, depth, fn): inside draw(), makes fn's layer pan at `depth` times the camera's pan (0 = pinned sky, 1 = ground) */
function parallax(cam, depth, fn) { if (!cam) return fn(); ctx.save(); ctx.translate(-(cam.dx || 0) * (1 - depth), -(cam.dy || 0) * (1 - depth)); fn(); ctx.restore(); }
/** a plate's hero on screen: from plate.hero(t) (scene coords, camera applied) or plate.focus(t) (screen coords) */
function heroRaw(pl, t) {
  if (pl.hero) { const h = pl.hero(t); const [x, y] = camPoint(camOf(pl, t), [h.x, h.y]); return { ...h, x, y }; }
  const [x, y] = pl.focus ? pl.focus(t) : [W / 2, H / 2]; return { x, y, none: true };
}
/** heroOf includes the entry shift (match cut + carried motion), so overlay art anchored to it stays on the reticle */
function heroOf(pl, t) { const h = heroRaw(pl, t), ms = STORY && pl.i != null ? entryShift(pl, t) : null; return ms ? { ...h, x: h.x + ms.dx, y: h.y + ms.dy } : h; }
const focusOf = (pl, t) => { const h = heroRaw(pl, t); return [h.x, h.y]; };   // unshifted: the engine's own anchor
/**
 * Momentum across cuts. The old plate leans into its transition (LEAD, over its last 0.45 s) and the new plate
 * arrives still moving and settles (SETTLE, over enter.settle s after the transition). Both scale about the hero,
 * so the camera never stops dead at a cut. enter.momentum = false turns it off for one plate.
 */
const LEAD = { lensIn: 1.1, zoom: 1.06, shape: 1.08, iris: 1.05, bleed: 1.03, burn: 1.03, cut: 1.03 };   // always >= 1: scenes only bleed past the edges when enlarged
// After a push-in the new plate keeps easing in (to PUSH_ON); after anything else it arrives enlarged and eases out to 1.
// Either way the scale keeps the direction the transition was moving in, so nothing reverses at the hand-off.
const PUSH = { lensIn: 1, shape: 1, morph: 1, iris: 1, cut: 1 }, PUSH_ON = 1.05, SETTLE_EASE = E.shaped(0.15, 2, 2.5);
const SETTLE = { through: 1.06, lensOut: 1.08, zoom: 1.07, bleed: 1.06, burn: 1.06, wipe: 1.05, page: 1.05, roll: 1.05, fade: 1.04, hatch: 1.05 };
/**
 * motionOf(pl, t): how the plate's content is moving on screen at local time t, in px/s. Uses the hero when there is
 * one (camera included), otherwise the camera pan. Measured over one drawing (1/12 s).
 */
function motionOf(pl, t) {
  const dt = 1 / 12, t0 = Math.max(0, t - dt);
  if (pl.hero) { const [x0, y0] = focusOf(pl, t0), [x1, y1] = focusOf(pl, t); return [(x1 - x0) / (t - t0 || dt), (y1 - y0) / (t - t0 || dt)]; }
  const c0 = camOf(pl, t0) || {}, c1 = camOf(pl, t) || {};
  return [((c1.dx || 0) - (c0.dx || 0)) / (t - t0 || dt), ((c1.dy || 0) - (c0.dy || 0)) / (t - t0 || dt)];
}
/**
 * Motion carry-over. The new plate enters still travelling the way the old plate's content was moving at the cut
 * (enter.carry: seconds for that motion to die away, default 0.35; false turns it off), so movement flows through
 * the transition instead of stopping at it. On by default except for pan, page, roll and fade (which move the sheet themselves) and through and shape (which place objects exactly).
 */
/** travelOf(plate, t): which way the camera is effectively travelling (px/s): chasing a moving hero, or panning */
function travelOf(pl, t) {
  const dt = 1 / 12, t0 = Math.max(0, t - dt), c0 = camOf(pl, t0) || {}, c1 = camOf(pl, t) || {};
  const cx = ((c1.dx || 0) - (c0.dx || 0)) / (t - t0 || dt), cy = ((c1.dy || 0) - (c0.dy || 0)) / (t - t0 || dt);
  const [hx, hy] = pl.hero ? motionOf(pl, t) : [0, 0];
  return [hx - cx, hy - cy];
}
const NO_CARRY = { pan: 1, page: 1, roll: 1, fade: 1, through: 1, shape: 1 };   // through and shape place their objects exactly
function carryShift(pl, t) {
  const tr = pl.enter; if (!tr || !pl.i) return null;
  const tau = tr.carry ?? (NO_CARRY[tr.type] ? 0 : 0.35); if (!tau) return null;
  const prev = STORY.plates[pl.i - 1], [vx, vy] = motionOf(prev, prev.dur - 1e-3), sp = Math.hypot(vx, vy);
  if (sp < 40) return null;
  const k = Math.min(1, 900 / sp), f = -tau * Math.exp(-t / tau) * k;        // velocity at t = 0 equals the old plate's (capped)
  if (Math.abs(f) * sp < 0.5) return null;
  return [vx * f, vy * f];
}
/**
 * Match cut. After a `cut` (or any enter with match: 0..1) the new plate starts shifted so its hero sits where the
 * old hero was (by the match fraction, 0.6 for cuts), holds a beat, then eases home over enter.settle s. It zooms
 * just enough to keep covering the frame while shifted. enter.match = 0 turns it off.
 */
function matchShift(pl, t) {
  const tr = pl.enter; if (!tr || !pl.i) return null;   // returns the shift only; entryShift adds carry and cover zoom
  const k = tr.match ?? (tr.type === 'cut' ? 0.6 : 0); if (!k) return null;
  const d = tr.dur || 0, q = 1 - E.inOut3(inv(d + 0.15, d + 0.15 + (tr.settle ?? 1.0), t)); if (q <= 0) return null;
  const prev = STORY.plates[pl.i - 1], [ox, oy] = focusOf(prev, prev.dur), [nx, ny] = focusOf(pl, d);
  return { dx: (ox - nx) * k * q, dy: (oy - ny) * k * q, hx: nx, hy: ny };
}
/** everything that shifts a plate as it enters (match cut + carried motion), with just enough zoom to keep covering the frame */
function entryShift(pl, t) {
  const m = matchShift(pl, t), c = carryShift(pl, t); if (!m && !c) return null;
  const dx = (m ? m.dx : 0) + (c ? c[0] : 0), dy = (m ? m.dy : 0) + (c ? c[1] : 0), [hx, hy] = m ? [m.hx, m.hy] : focusOf(pl, t);
  const cov = (h, dd, span) => Math.max(1, (h + dd) / (h + 20), (span - h - dd) / (span + 20 - h));   // scenes bleed ~20 px past the edges
  return { dx, dy, s: Math.max(cov(hx, dx, W), cov(hy, dy, H)) };
}
/** a zoom goes in (the camera dives toward the hero) unless its enter says dir: 'out'. Before v0.16.1 it went out by default */
function zoomOut(tr) { return tr.dir === 'out'; }
function momentum(pl, t) {
  let s = 1;
  const nx = STORY.plates[pl.i + 1], lead = nx && nx.enter && nx.enter.momentum !== false && LEAD[nx.enter.type];
  // the lead is still accelerating at the cut and keeps going (half-way) into the transition, so the dive picks up its speed
  if (lead) s *= lerp(1, lead, E.inOutSine(inv(pl.dur - 0.5, pl.dur + 0.5, t)));
  const tr = pl.enter, on = tr && pl.i > 0 && tr.momentum !== false;
  if (on && (PUSH[tr.type] || (tr.type === 'zoom' && !zoomOut(tr)))) { const d = tr.dur || 0; s *= zlerp(1, PUSH_ON, SETTLE_EASE(inv(d * 0.7, d + (tr.settle ?? 1.2), t))); }
  else if (on && SETTLE[tr.type]) { const d = tr.dur || 0; s *= zlerp(SETTLE[tr.type], 1, SETTLE_EASE(inv(d * 0.7, d + (tr.settle ?? 1.0), t))); }
  return s;
}

/* ---------- transitions ---------- */
function lensRing(cx, cy, r, a, color = null) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = color || PAL.lens; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = PAL.lensEdge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, TAU); ctx.stroke();
  for (let i = 0; i < 48; i++) { const a2 = i / 48 * TAU, e = r + (i % 4 ? 13 : 20); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a2) * (r + 8), cy + Math.sin(a2) * (r + 8)); ctx.lineTo(cx + Math.cos(a2) * e, cy + Math.sin(a2) * e); ctx.stroke(); }
  ctx.restore();
}
/** scale about a point, as an xf for drawPlate */
const about = (px, py, s, tx = px, ty = py) => () => { ctx.translate(tx, ty); ctx.scale(s, s); ctx.translate(-px, -py); };
/** low-res mask canvases for bleed (reused every frame) */
const MASK = {};
function maskCanvas(key, w, h) {
  if (!MASK[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); MASK[key] = { c, g, img: g.createImageData(w, h) }; }
  return MASK[key];
}
/** frontAt(vals, u): the threshold that marks share u (0..1) of the values as reached, so a front covers screen area evenly in u */
function frontAt(vals, u) {
  const sorted = vals.slice().sort(), n = sorted.length;
  return sorted[Math.min(n - 1, Math.max(0, Math.floor(clamp(u) * (n - 1))))];
}
/**
 * softReveal(fn, cx, cy, r, feather, slot): draw fn() only inside a soft-edged circle, as a dissolve that spreads from
 * one point. Uses offscreen layer `slot` (default 1).
 */
function softReveal(fn, cx, cy, r, feather = 260, slot = 1) {
  if (r <= 0) return;
  const L = layer(() => { fn(); ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createRadialGradient(cx, cy, Math.max(0, r - feather), cx, cy, r + 1);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }, slot);
  ctx.drawImage(L, 0, 0);
}
/** clipHalf(poly, f): the part of a convex polygon where f(point) <= 0 (f linear) */
function clipHalf(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const u = fa / (fa - fb); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); } }
  return out;
}
/** a falling ink drop, tip up */
const teardrop = (cx, cy, s, n = 36) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [cx + s * Math.sin(a) * Math.sin(a / 2) * 1.1, cy - s * 1.35 * Math.cos(a)]; });
const NOISE = {};
function noiseField(seed, w, h, sc = 1) {
  const k = seed + ':' + w + ':' + sc; if (NOISE[k]) return NOISE[k];
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (f, c, sn, sd) => vnoise2((x * c - y * sn) * f * sc, (x * sn + y * c) * f * sc, sd);   // each octave turned, so no grid shows
    a[y * w + x] = 0.55 * o(0.07, 0.83, 0.56, seed) + 0.3 * o(0.19, 0.29, -0.96, seed + 7) + 0.15 * o(0.5, -0.64, 0.77, seed + 13); }
  return (NOISE[k] = a);
}
/** any CSS colour (or [r, g, b]) -> [r, g, b] */
function rgbOf(c) {
  if (Array.isArray(c)) return c;
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillStyle = c; const v = ctx.fillStyle; ctx.restore();
  if (v[0] === '#') return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
  return v.match(/[\d.]+/g).slice(0, 3).map(Number);
}
const mixColor = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
/**
 * sampleColor(X, 'old' | 'new', x, y): the average colour of a 9x9 patch of the old plate's last drawing or the new
 * plate's settled drawing, without HUD or reticle. Drawn with a fixed boil so every worker gets the same answer.
 */
const SAMPLES = {};
function sampleColor(X, which, x, y) {
  const k = X.seed + which + Math.round(x) + ',' + Math.round(y); if (SAMPLES[k]) return SAMPLES[k];
  const pl = which === 'old' ? X.prev : X.pl, t = which === 'old' ? X.prev.dur - 1e-3 : (X.tr.dur || 0.6) + (X.tr.settle ?? 0.9);
  const keep = { boil: S.boil, nr: S.noReticle, morph: S.morph }; S.boil = 0; S.noReticle = true; S.morph = false;
  const L = layer(() => drawPlate(pl, t, { hud: 0 }), 'sample');
  Object.assign(S, { boil: keep.boil, noReticle: keep.nr, morph: keep.morph });
  const d = L.getContext('2d').getImageData(Math.round(x) - 4, Math.round(y) - 4, 9, 9).data, c = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) c[j] += d[i + j] / 81;
  return (SAMPLES[k] = c.map(Math.round));
}
/**
 * Every transition is a pure function of p (0..1) and returns the share (0..1) of the frame owned by the new plate,
 * which the engine uses to blend vignettes. X = {drawOld, drawNew, drawOldX(o), drawNewX(o), focusOld, focusNew,
 * darkOld, darkNew, gOld, gNew (the two plates' papers), palOld, palNew (their palettes), prev, pl, pt, t, tr, seed}.
 * A transition runs with the new plate's paper current, so PAL is palNew; the old plate's colours are X.palOld.
 * Transitions render on ones; zooms use zlerp (constant ratio per drawing); masks ease their edge, not their area.
 * See references/motion.md, Speed limits.
 */
const TRANS = {
  /** down the scale ladder into another world: the camera dives at the hero while a lens opens on it, the new world inside */
  lensIn(p, X) {
    const { tr } = X, e = X.ez(p, E.arrive), [cx, cy] = X.focusOld, [fx, fy] = X.focusNew, R = coverR(cx, cy), r = lerp(16, R, e);   // ease the ring's edge (what the eye follows), not its area: area easing pops the lens open
    X.drawOldX({ xf: about(cx, cy, zlerp(1, tr.dive ?? 2, e)) });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.drawImage(bgTex(X.gNew), 0, 0);
    const ei = X.ez(p, E.arriveSoft);   // the world inside lags the ring a little (overlapping action)
    X.drawNewX({ bg: false, xf: about(fx, fy, zlerp(tr.scaleFrom ?? 0.3, 1, ei), lerp(cx, fx, e), lerp(cy, fy, e)) });
    ctx.restore();
    lensRing(cx, cy, r, 1 - inv(0.8, 1, p));
    return E.inOut3(inv(0.2, 0.9, p));
  },
  /** up the scale ladder: the old world shrinks into a lens that lands on the hero, while the new world pulls back into place */
  lensOut(p, X) {
    const { tr } = X, e = X.ez(p, E.arrive), eo = X.ez(p, E.arriveSoft), [ox, oy] = X.focusOld, [nx, ny] = X.focusNew, R0 = coverR(ox, oy);
    const cx = lerp(ox, nx, e), cy = lerp(oy, ny, e), r = lerp(R0, 20, e);   // the edge eases in and out
    X.drawNewX({ xf: about(nx, ny, zlerp(tr.dive ?? 2, 1, e)) });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    withAlpha(1 - E.in2(inv(0.8, 1, p)), () => { ctx.drawImage(bgTex(X.gOld), 0, 0);   // the last dot of the old world fades instead of popping off
      X.drawOldX({ bg: false, hud: 1 - inv(0, 0.3, p), xf: about(ox, oy, zlerp(1, 0.25, eo), cx, cy) }); });
    ctx.restore();
    lensRing(cx, cy, r, 1 - inv(0.85, 1, p));
    return clamp(1 - (r / R0) ** 2);
  },
  /** plain crossfade: only into the end card */
  fade(p, X) { const e = X.ez(p, E.inOut3); X.drawOld(); withAlpha(e, X.drawNew); return e; },
  /** one step on the scale ladder in the same world (tr.dir 'in', the default, or 'out'; tr.k): the old scale grows (or shrinks) away while the new one settles in around the hero */
  zoom(p, X) {
    const { tr } = X, e = X.ez(p, E.arriveSoft), k = tr.k ?? 3.5, out = zoomOut(tr);
    const sOld = out ? zlerp(1, 1 / k, e) : zlerp(1, k, e), sNew = out ? zlerp(k, 1, e) : zlerp(1 / k, 1, e);
    const [ox, oy] = X.focusOld, [nx, ny] = X.focusNew, px = lerp(ox, nx, e), py = lerp(oy, ny, e), a = E.inOut3(inv(0.15, 0.6, p));   // the new scale is in before the release, so the eye lands while it settles
    // a plate shrunk below 1 would show its world's hard edges (a ground band ending mid-frame): draw it through a soft
    // disc about the pivot that grows with its scale, and draw its HUD unmasked
    // (the masked pass keeps the reticle at the HUD's strength; only the header, dial and log are drawn unmasked after it)
    const plate = (draw, sc, hud, xf, R) => { if (sc >= 0.999) return draw({ bg: false, hud, xf });
      softReveal(() => draw({ bg: false, hud, chrome: false, xf }), px, py, sc * R * 1.1, sc * R * 0.45, 1); if (hud > 0) draw({ hudOnly: true, hud }); };
    ctx.drawImage(bgTex(X.gOld), 0, 0); if (X.gNew !== X.gOld) withAlpha(a, () => ctx.drawImage(bgTex(X.gNew), 0, 0));   // the paper changes gradually
    withAlpha(1 - E.in2(inv(0.35, 0.8, p)), () => plate(X.drawOldX, sOld, 1 - inv(0, 0.3, p), about(ox, oy, sOld, px, py), coverR(ox, oy)));
    S.noReticle = p < 0.6;
    withAlpha(a, () => plate(X.drawNewX, sNew, inv(0.6, 1, p), about(nx, ny, sNew, px, py), coverR(nx, ny)));
    S.noReticle = false;
    return a;
  },
  /** whip pan along one long sheet (tr.dir 'left' | 'right' | 'up' | 'down'): both plates slide, speed lines at full speed */
  pan(p, X) {
    let dir = X.tr.dir || 'auto';
    if (dir === 'auto') {   // keep the camera travelling the way it was: sheets slide opposite to the camera
      const [vx, vy] = travelOf(X.prev, X.prev.dur - 1e-3);
      dir = Math.hypot(vx, vy) < 40 ? 'left' : Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'left' : 'right') : (vy > 0 ? 'up' : 'down'); }
    const vert = dir === 'up' || dir === 'down', sg = dir === 'left' || dir === 'up' ? -1 : 1, span = vert ? H : W;
    const Lo = layer(() => X.drawOldX({ all: true }), 1), Ln = layer(() => X.drawNewX({ all: true }), 2);
    // the sheets start at the speed the old plate's content was already moving (if it moves the same way), then land long
    const [mvx, mvy] = motionOf(X.prev, X.prev.dur - 1e-3), mv = vert ? mvy : mvx;
    const v0 = Math.sign(mv) === sg ? clamp(Math.abs(mv) * (X.tr.dur || 0.8) / span, 0, 1.2) : 0, pe = E.whip(v0);
    const offAt = q => sg * span * X.ez(clamp(q), pe), sh = 0.5 / (12 * (X.tr.dur || 0.8));   // half-drawing shutter
    const n = Math.round(clamp(Math.abs(offAt(p + sh / 2) - offAt(p - sh / 2)) / 5, 1, 48));
    for (let j = 0; j < n; j++) {                                 // running average of n exposures = motion blur
      const off = offAt(p + (n > 1 ? j / (n - 1) - 0.5 : 0) * sh), [ox, oy] = vert ? [0, off] : [off, 0], [nx, ny] = vert ? [0, off - sg * span] : [off - sg * span, 0];
      ctx.save(); ctx.globalAlpha = 1 / (j + 1); ctx.drawImage(Lo, ox, oy); ctx.drawImage(Ln, nx, ny); ctx.restore();
    }
    const off = offAt(p), seam = sg < 0 ? span + off : off;      // where the two sheets meet: a soft fold shadow
    ctx.save();
    const g = vert ? ctx.createLinearGradient(0, seam - 18, 0, seam + 18) : ctx.createLinearGradient(seam - 18, 0, seam + 18, 0);
    g.addColorStop(0, 'rgba(40,30,20,0)'); g.addColorStop(0.5, 'rgba(40,30,20,0.07)'); g.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = g; vert ? ctx.fillRect(0, seam - 18, W, 36) : ctx.fillRect(seam - 18, 0, 36, H); ctx.restore();
    const v = clamp(Math.abs(offAt(p + 0.02) - offAt(p - 0.02)) / (0.04 * span) / 2.5) ** 2, r = mulberry(X.seed + S.boil);   // speed lines follow the real speed
    if (v > 0.02) for (let i = 0; i < 26; i++) {
      const u = r() * (vert ? W : H), a = r() * span, L = 160 + r() * 380;
      const pts = vert ? [[u, a], [u, a + L]] : [[a, u], [a + L, u]];
      pen(pts, { w: 1.4 + r() * 2.2, color: X.darkNew ? PAL.nightInk : PAL.ink, alpha: 0.45 * v, taper: 0.45, seed: i, amp: 0.4 });
    }
    return E.inOut3(inv(0.35, 0.65, p));
  },
  /**
   * through (bridge): the camera dives into an object in the old plate (tr.from) until its colour fills the frame,
   * the colour shifts, and the field shrinks back onto an object in the new plate (tr.to). from / to are
   * { at: [x, y], r } in scene coordinates, or functions (plate, t) returning one; defaults are the heroes with r 40.
   * The new object starts where the old one was and glides to its own place. Colours are sampled unless
   * tr.fromFill / tr.toFill are given.
   */
  through(p, X) {
    const { tr } = X, anc = (a, pl, t, def) => { const v = typeof a === 'function' ? a(pl, t) : a; const cam = camOf(pl, t);
      if (!v) return { at: def, r: 40 }; return { at: camPoint(cam, v.at), r: (v.r ?? 40) * (cam ? cam.s || 1 : 1) }; };
    const A = anc(tr.from, X.prev, X.pt, X.focusOld), B = anc(tr.to, X.pl, X.t, X.focusNew), [ax, ay] = A.at, [bx, by] = B.at;
    const cA = tr.fromFill || sampleColor(X, 'old', ax, ay), cB = tr.toFill || sampleColor(X, 'new', bx, by);
    const col = mixColor(cA, cB, E.inOut3(inv(0.38, 0.62, p)));
    // A camera cannot fly 50x in a second without strobing, so the dive is short (tr.dive, default 1.6x) and the
    // object's colour does the rest: its disc grows (edge eased) until it fills the frame, the colour turns, and the
    // disc shrinks onto the new object while the new plate settles from tr.rise (1.4x) to 1.
    // One plunge (accelerating into the colour), a brief turn, one rise that attacks and releases long.
    const dive = tr.dive ?? 1.6, rise = tr.rise ?? 1.4, riseE = E.shaped(0.25, 2, 3);
    if (p < 0.46) {
      const q = p / 0.46, sc = zlerp(1, dive, E.in2(q)), R = coverR(ax, ay), rad = lerp(A.r * sc, R, E.in2(inv(0.05, 1, q)));   // covers the last corner exactly as the dive ends
      X.drawOldX({ hud: 1 - inv(0, 0.4, q), xf: about(ax, ay, sc) });
      withAlpha(E.inOutSine(inv(0, 0.4, q)), () => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax, ay, rad, 0, TAU); ctx.fill(); });   // the object becomes a field of its colour
    } else if (p < 0.49) { ctx.fillStyle = col; ctx.fillRect(-20, -20, W + 40, H + 40); }   // the colour turns (a few drawings)
    else {
      const q = (p - 0.49) / 0.51, g = riseE(q), sc = zlerp(rise, 1, g), px = lerp(ax, bx, g), py = lerp(ay, by, g);
      const R = coverR(px, py), rad = lerp(R, B.r, riseE(inv(-0.06, 0.85, q)));   // already moving as the rise begins: the flat field never holds
      S.noReticle = q < 0.6;
      X.drawNewX({ hud: inv(0.6, 1, q), xf: about(bx, by, sc, px, py) });
      S.noReticle = false;
      withAlpha(1 - E.inOut3(inv(0.55, 0.95, q)), () => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); });   // the field shrinks onto the new object, then gives way to it
    }
    const fa = Math.sin(clamp(inv(0.3, 0.7, p)) * Math.PI);                 // a soft highlight drifts across the field so it never reads as a frozen frame
    if (fa > 0.01) { const hx = lerp(ax, bx, p), hy = lerp(ay, by, p) - 60, g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 700);
      g.addColorStop(0, `rgba(255,240,230,${0.16 * fa})`); g.addColorStop(1, 'rgba(255,240,230,0)'); ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    return E.inOut3(inv(0.44, 0.56, p));
  },
  /** ink wipe (tr.dir 'lr' | 'rl' | 'tb'): a curved inked front sweeps across; the new plate slides in slightly behind it */
  wipe(p, X) {
    const e = X.ez(p, E.ramp(0.25, 0.35)), dir = X.tr.dir || 'lr', vert = dir === 'tb', span = vert ? H : W, f = lerp(-180, span + 180, dir === 'rl' ? 1 - e : e);
    const edge = smooth(shape.ridge(-20, (vert ? W : H) + 20, 0, 70, X.seed + 3, 0.004, 40), 2).map(([u, d]) => vert ? [u, f + d] : [f + d, u]);
    const poly = dir === 'rl' ? [[W + 10, -10], ...edge, [W + 10, H + 10]] : vert ? [[-10, -30], ...edge, [W + 10, -30]] : [[-30, -10], ...edge, [-30, H + 10]];
    const slide = (1 - e) * 90 * (dir === 'rl' ? 1 : -1);
    X.drawOld();
    ctx.save(); trace(poly, true); ctx.clip(); X.drawNewX({ xf: () => vert ? ctx.translate(0, slide) : ctx.translate(slide, 0) }); ctx.restore();
    if (p > 0.02 && p < 0.98) {
      const col = X.darkNew ? PAL.nightInk : PAL.ink;
      pen(edge, { w: 4.5, color: col, seed: X.seed + 4, taper: 0.03, amp: 0.8 });
      const r = mulberry(X.seed + 9); ctx.fillStyle = col;
      for (let i = 0; i < 18; i++) { const u = r(), ahead = (r() * 50 + 12) * (dir === 'rl' ? -1 : 1), q = 1.5 + r() * 2.5; const [ex, ey] = along(edge, u);
        ctx.beginPath(); ctx.arc(vert ? ex : ex + ahead, vert ? ey + ahead : ey, q, 0, TAU); ctx.fill(); }
    }
    return e;
  },
  /** ink drop: a drop falls onto the new hero (or tr.at) and splats; the blot, its splash chains and specks spread and pool together, revealing the new plate, with ink pooled at the edge */
  bleed(p, X) {
    const [fx, fy] = X.tr.at || X.focusNew, w = 480, h = 270, fall = X.tr.fall ?? 0.22, dm = coverR(fx, fy);
    const dropCol = X.tr.ink || (X.darkNew ? PAL.night : PAL.inkSoft);
    if (p < fall) {                                                    // the drop falls onto the spot
      X.drawOld(); const u0 = p / fall, q = E.in2(inv(0, 0.85, u0)), sq = inv(0.85, 1, u0), s = X.tr.drop ?? 22, y = lerp(-80, fy - s, q);   // falls, then squashes on impact
      pen([[fx, y - 150 * q - 20], [fx, y - 30]], { w: 2, color: dropCol, alpha: 0.35 * q * (1 - sq), taper: 0.5, amp: 0.2 });
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1 + 0.5 * sq, 1 - 0.4 * sq); ctx.translate(-fx, -fy);
      ink(teardrop(fx, y, s), { closed: true, w: 2, color: PAL.ink, fill: dropCol, amp: 0.3, seed: 5 }); ctx.restore();
      return 0;
    }
    const u = (p - fall) / (1 - fall), rho = X.ez(u, E.shaped(0.15, 1.6, 3)), e = rho * rho;   // the splat bursts on impact (radius shaped; area = radius²)
    // the splat: a main blot plus satellite droplets and short splash chains; blobs merge where they touch
    const R = mulberry(X.seed + 31), drops = [[fx, fy, 1, 0]];
    for (let k = 0; k < 7; k++) { const a = R() * TAU, D = 150 + R() * 230;       // splash chains: droplets shrinking outward
      for (let j = 0; j < 3; j++) { const d = D * (0.55 + 0.25 * j) + R() * 20, ww = (0.11 - 0.028 * j) * (0.7 + 0.6 * R());
        drops.push([fx + Math.cos(a + (R() - 0.5) * 0.15) * d, fy + Math.sin(a + (R() - 0.5) * 0.15) * d, ww, 0.015 + 0.01 * j + R() * 0.02]); } }
    for (let k = 0; k < 10; k++) { const a = R() * TAU, d = 90 + R() * 300;       // loose specks
      drops.push([fx + Math.cos(a) * d, fy + Math.sin(a) * d, 0.03 + 0.05 * R(), 0.01 + R() * 0.05]); }
    const nf = noiseField(X.seed, w, h, 0.18), kS = 0.018, soft = 0.012, band = 0.03, vals = new Float32Array(w * h);
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
      const px = (x + 0.5) / w * W, py = (y + 0.5) / h * H; let acc = 0;
      for (let d = 0; d < drops.length; d++) { const [cx, cy, ww, o] = drops[d];
        const f = o + Math.hypot(px - cx, py - cy) / (dm * ww) + (d === 0 ? nf[i] * 0.05 : 0);
        acc += Math.exp(-f / kS); }                                    // smooth minimum: blobs pool together
      vals[i] = -kS * Math.log(acc + 1e-30);
    }
    const th = frontAt(vals, e) + (soft + 0.005) * e;
    const m = maskCanvas('m', w, h), rm = maskCanvas('r', w, h), md = m.img.data, rd = rm.img.data;
    const rc = X.tr.rim || (X.darkNew ? PAL.nightRim : PAL.rim);
    for (let i = 0; i < w * h; i++) { const b = th - vals[i], j = i * 4;
      md[j + 3] = 255 * clamp(b / soft);
      rd[j] = rc[0]; rd[j + 1] = rc[1]; rd[j + 2] = rc[2]; rd[j + 3] = b > 0 && b < band ? 255 * (1 - b / band) ** 1.5 : 0; }   // ink pools at the edge
    m.g.putImageData(m.img, 0, 0); rm.g.putImageData(rm.img, 0, 0);
    X.drawOld();
    const L = layer(() => { X.drawNew(); ctx.globalCompositeOperation = 'destination-in'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.filter = 'blur(1.5px)'; ctx.drawImage(m.c, 0, 0, W, H); }, 1);
    ctx.drawImage(L, 0, 0);
    ctx.save(); ctx.filter = 'blur(1.5px)'; ctx.globalAlpha = (X.tr.rimAlpha ?? 0.7) * (1 - inv(0.8, 1, p)); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(rm.c, 0, 0, W, H); ctx.restore();
    return e;
  },
  /** burn: the old page chars from a spot (tr.at, default the old hero) outward: scorch, char, a glowing ember edge, then a hole onto the new plate; ash lifts off the front */
  burn(p, X) {
    const e = X.ez(p, E.depart), [fx, fy] = X.tr.at || X.focusOld, w = 480, h = 270, nf = noiseField(X.seed + 5, w, h, 0.4), dm = coverR(fx, fy);
    const charW = 0.05, scorchW = 0.13, emberW = 0.012, nw = X.tr.rough ?? 0.22;
    const m = maskCanvas('m', w, h), om = maskCanvas('r', w, h), gm = maskCanvas('g', w, h), md = m.img.data, od = om.img.data, gd = gm.img.data;
    const vAt = (px, py) => Math.hypot(px - fx, py - fy) / dm * 0.9 + nf[clamp(Math.floor(py / H * h), 0, h - 1) * w + clamp(Math.floor(px / W * w), 0, w - 1)] * nw;
    const vals = new Float32Array(w * h);
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) vals[i] = vAt((x + 0.5) / w * W, (y + 0.5) / h * H);
    const th = frontAt(vals, e) + 0.01 * e;                             // the burned AREA grows with e
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
      const b = th - vals[i], j = i * 4;
      md[j + 3] = 255 * clamp(b / 0.004);                                            // burned-through holes are crisp
      let r = 0, g = 0, bl = 0, a = 0;
      if (b <= 0 && b > -charW) { const u = 1 + b / charW; r = 26; g = 16; bl = 10; a = 0.35 + 0.6 * u ** 0.7; }
      else if (b <= -charW && b > -scorchW) { const u = 1 - (-b - charW) / (scorchW - charW); r = 120; g = 74; bl = 32; a = 0.35 * u * u; }
      od[j] = r; od[j + 1] = g; od[j + 2] = bl; od[j + 3] = 255 * a;
      const fl = 0.65 + 0.35 * vnoise2(x * 0.25, S.boil * 0.9 + y * 0.05, X.seed);    // embers flicker per drawing
      gd[j] = 255; gd[j + 1] = 140 + 60 * fl; gd[j + 2] = 40; gd[j + 3] = Math.abs(b) < emberW ? 255 * fl * (1 - Math.abs(b) / emberW) : 0;
    }
    m.g.putImageData(m.img, 0, 0); om.g.putImageData(om.img, 0, 0); gm.g.putImageData(gm.img, 0, 0);
    X.drawOld();
    const L = layer(() => { X.drawNew(); ctx.globalCompositeOperation = 'destination-in'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.filter = 'blur(2.5px)'; ctx.drawImage(m.c, 0, 0, W, H); }, 1);
    ctx.drawImage(L, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.filter = 'blur(4px)'; ctx.drawImage(om.c, 0, 0, W, H);
    const fade = 1 - inv(0.85, 1, p); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * fade; ctx.filter = 'blur(10px)'; ctx.drawImage(gm.c, 0, 0, W, H);
    ctx.globalAlpha = 0.9 * fade; ctx.filter = 'none'; ctx.drawImage(gm.c, 0, 0, W, H); ctx.restore();
    const ar = mulberry(X.seed + 77), col = X.darkOld ? X.palOld.nightInk : X.palOld.ink;         // ash: each fleck leaves when the front reaches it
    for (let i = 0; i < 60; i++) { const ax = ar() * W, ay = ar() * H, age = (th - vAt(ax, ay)) / 0.3, dr = ar();
      if (age <= 0 || age >= 1) continue;
      const [wx, wy] = wander(i, S.T, 14, 1.2), s = 2 + dr * 3;
      withAlpha((1 - age) * 0.7, () => ink(shape.circle(ax + wx + age * 40 * (dr - 0.5), ay - age * (90 + 80 * dr) + wy, s * (1 - 0.5 * age), 6), { closed: true, w: 0.8, color: col, fill: col, amp: 0.4, seed: i })); }
    return e;
  },
  /** iris / blink: a lens closes on the old hero to a dot, then opens from a dot on the new hero */
  iris(p, X) {
    const curtain = X.tr.color || (X.darkNew ? PAL.nightCurtain : X.darkOld ? X.palOld.nightCurtain : PAL.ink), op = X.tr.opacity ?? 0.8, [ox, oy] = X.focusOld, [nx, ny] = X.focusNew, r0 = 7;
    let cx, cy, r;
    const hole = () => { ctx.save(); ctx.globalAlpha *= op; ctx.fillStyle = curtain; ctx.beginPath(); ctx.rect(-20, -20, W + 40, H + 40);
      if (r > r0 + 0.5) ctx.arc(cx, cy, r, 0, TAU, true); ctx.fill('evenodd'); ctx.restore(); };
    // radius eases (the edge is what the eye follows); the closed dot travels to the new hero on a shallow arc
    if (p < 0.46) { const q = E.shaped(0.65, 2, 2)(p / 0.46); [cx, cy] = [ox, oy]; r = lerp(coverR(cx, cy), r0, q); X.drawOldX({ hud: 1 - q, xf: about(cx, cy, 1 + 0.15 * q) }); hole(); }
    else if (p < 0.54) { const u = E.inOut3((p - 0.46) / 0.08); cx = lerp(ox, nx, u); cy = lerp(oy, ny, u) - Math.sin(u * Math.PI) * 0.18 * Math.hypot(nx - ox, ny - oy); r = r0;
      X.drawOldX({ hud: 0, xf: about(ox, oy, 1.15) }); withAlpha(u, () => X.drawNewX({ hud: 0, xf: about(nx, ny, 1.15) })); hole(); }
    else { const q = E.shaped(0.35, 2, 3)((p - 0.54) / 0.46); [cx, cy] = [nx, ny]; r = lerp(r0, coverR(cx, cy), q); X.drawNewX({ hud: q, xf: about(cx, cy, 1.15 - 0.15 * q) }); hole(); }
    lensRing(cx, cy, r, 1 - inv(0.9, 1, p));
    if (r <= r0 + 0.5) { ctx.fillStyle = PAL.lens; ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.6, 0, TAU); ctx.fill(); }
    return E.inOut3(inv(0.4, 0.6, p));
  },
  /** page turn: a bottom corner of the old page is lifted and dragged across (tr.dir 'left' = the right corner travels left,
   *  'right' = the left corner travels right); the page folds along a moving crease and slides off. Its back takes the look
   *  of the page being turned to (tr.back 'new' | 'old'), so the new world curls into view over the old one. */
  page(p, X) {
    const e = X.ez(p, E.shaped(0.5, 1.8, 2.5)), fl = (X.tr.dir || 'left') === 'right', hx = x => fl ? W - x : x;
    // the crease is what the eye follows: ease its position across the frame (x = W..-0.1W), then place the corner from it
    const cxr = lerp(W + 4, -0.02 * W, e), P = [hx(W + 4), H + 4], Q = [hx(2 * cxr - (W + 4)), lerp(H + 4, 0.7 * H, Math.sin(e * Math.PI / 2))];
    const dx = P[0] - Q[0], dy = P[1] - Q[1], len = Math.hypot(dx, dy);
    if (len < 2) { X.drawOld(); return 0; }
    const nx = dx / len, ny = dy / len, mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, md = mx * nx + my * ny;
    const side = ([x, y]) => x * nx + y * ny - md, refl = ([x, y]) => { const d = 2 * side([x, y]); return [x - d * nx, y - d * ny]; };
    const rect = [[-4, -4], [W + 4, -4], [W + 4, H + 4], [-4, H + 4]], keep = clipHalf(rect, side), lifted = clipHalf(rect, q => -side(q));
    const L = layer(() => X.drawOldX({ hud: 0 }), 2);
    X.drawNew();
    if (lifted.length > 2) { ctx.save(); trace(lifted, true); ctx.clip();          // shadow the lifted page casts on the new one
      const g = ctx.createLinearGradient(mx, my, mx + nx * 160, my + ny * 160); g.addColorStop(0, 'rgba(30,20,10,0.35)'); g.addColorStop(1, 'rgba(30,20,10,0)');
      ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.restore(); }
    if (keep.length > 2) { ctx.save(); trace(keep, true); ctx.clip(); ctx.drawImage(L, 0, 0); ctx.restore(); }
    const flap = lifted.map(refl);
    if (flap.length > 2) {
      ctx.save(); ctx.filter = 'blur(14px)'; ctx.globalAlpha = 0.28; ctx.translate(-10 * nx, -10 * ny + 6); flat(flap, '#1e140c'); ctx.restore();   // soft drop shadow
      ctx.save(); trace(flap, true); ctx.clip();
      const backNew = (X.tr.back || 'new') === 'new', backDark = backNew ? X.darkNew : X.darkOld, bp = backNew ? X.palNew : X.palOld;
      ctx.drawImage(bgTex(backNew ? X.gNew : X.gOld), 0, 0); ctx.fillStyle = backDark ? bp.nightPageBack : bp.pageBack; ctx.fillRect(0, 0, W, H);
      if (backDark === X.darkOld) { ctx.save(); ctx.globalAlpha = 0.09; ctx.transform(1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, 2 * md * nx, 2 * md * ny); ctx.drawImage(L, 0, 0); ctx.restore(); }   // print showing through
      const g = ctx.createLinearGradient(mx, my, mx - nx * 300, my - ny * 300);   // the curl: dark in the crease, a highlight, then soft shade
      g.addColorStop(0, 'rgba(30,20,10,0.38)'); g.addColorStop(0.12, 'rgba(30,20,10,0.08)'); g.addColorStop(0.35, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(30,20,10,0.10)');
      ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.restore();
      ink(flap, { closed: true, w: 2.2, color: backDark ? bp.nightInk : bp.ink, amp: 0.5, seed: 61, alpha: 0.85 });
    }
    X.drawOldX({ hudOnly: true, hud: 1 - inv(0, 0.3, p) });
    return e;
  },
  /** roll (window blind / projector screen): the old page rolls up from the bottom edge (inked roll, shadow below), revealing the new page */
  roll(p, X) {
    const e = X.ez(p, E.shaped(0.25, 2, 3)), R = X.tr.radius ?? 60, yc = lerp(H + 6, -R - 40, e), step = 2;
    X.drawNew();
    if (yc < H) { const g = ctx.createLinearGradient(0, yc + R, 0, yc + R + 110); g.addColorStop(0, 'rgba(30,20,10,0.32)'); g.addColorStop(1, 'rgba(30,20,10,0)');
      ctx.fillStyle = g; ctx.fillRect(0, yc + R, W, 110); }                                   // shadow the roll casts on the new page
    const L = layer(() => X.drawOldX({ hud: 0 }), 2), back = bgTex(X.gOld);
    if (yc > 0) ctx.drawImage(L, 0, 0, W, Math.min(H, yc), 0, 0, W, Math.min(H, yc));     // the part not yet rolled
    const strip = (d, front) => { const sy = yc + d; if (sy < 0 || sy >= H) return; const th = d / R, dy = yc + R * Math.sin(th), dh = Math.max(1, step * Math.abs(Math.cos(th)) + 1);
      if (front) { ctx.drawImage(L, 0, sy, W, step, 0, dy, W, dh); ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.sin(th)})`; }
      else { ctx.drawImage(back, 0, (H - 1 - sy) % H, W, step, 0, dy, W, dh); ctx.fillStyle = `rgba(40,28,14,${0.06 + 0.3 * (1 + Math.cos(th))})`; }
      ctx.fillRect(0, dy, W, dh); };
    for (let d = 0; d < Math.PI * R / 2; d += step) strip(d, true);                          // underside of the roll
    for (let d = Math.PI * R / 2; d < Math.PI * R; d += step) strip(d, false);               // outside of the roll, facing us
    if (yc < H && yc > -R) { const col = X.darkOld ? X.palOld.nightInk : X.palOld.ink;                // inked edges of the roll
      pen([[-10, yc], [W + 10, yc]], { w: 2.4, color: col, seed: 51, taper: 0.01, amp: 0.8 });
      pen([[-10, yc + R], [W + 10, yc + R]], { w: 3.2, color: col, seed: 52, taper: 0.01, amp: 0.8 });
      ink(shape.arc(W - 40, yc + R / 2, R * 0.32, -1.4, 3.6, 24), { w: 1.8, color: col, alpha: 0.7, amp: 0.3 }); }
    X.drawOldX({ hudOnly: true, hud: 1 - inv(0, 0.35, p) });              // HUD is furniture: it fades, it doesn't roll
    return e;
  },
  /** shape reveal (match cut): an object morphs into its counterpart while a window centred on it opens onto the new world */
  shape(p, X) {
    const { tr } = X, e = X.ez(p, E.arrive);
    const A = tr.from(X.prev, X.pt), B = tr.to(X.pl, X.t), M = morph(A, B, e), b = bounds(M), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const ba = bounds(A), bb = bounds(B), ax = (ba.x0 + ba.x1) / 2, ay = (ba.y0 + ba.y1) / 2, bx = (bb.x0 + bb.x1) / 2, by = (bb.y0 + bb.y1) / 2;
    const r0 = Math.max(6, Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.45), q = E.arrive(inv(0.05, 0.9, p)), r = lerp(r0, coverR(cx, cy), q);   // the window's edge eases open
    const fa = tr.fromFill || sampleColor(X, 'old', ax, ay), fb = tr.toFill || sampleColor(X, 'new', bx, by);
    S.morph = true;
    X.drawOldX({ hud: 1 - inv(0, 0.4, p), xf: about(ax, ay, zlerp(1, 1.6, e), cx, cy) });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(bgTex(X.gNew), 0, 0);
    X.drawNewX({ bg: false, hud: inv(0.7, 1, p), xf: about(bx, by, zlerp(0.7, 1, e), cx, cy) });
    ctx.restore();
    S.morph = false;
    ink(shape.circle(cx, cy, r, 72), { closed: true, w: 2, color: PAL.peri, amp: 0, alpha: 0.6 * (1 - q) });
    ink(M, { closed: true, w: 3, amp: 1, seed: 33, fill: mixColor(fa, fb, E.inOut3(inv(0.15, 0.85, p))), alpha: 1 - inv(0.8, 1, p), ...(tr.style ? tr.style(e) : {}) });   // fades onto the real object
    return q;
  },
  /** dissolve through hatching: the new plate appears as pen strokes that thicken until they merge */
  hatch(p, X) {
    const e = X.ez(p, E.inOutSine), gap = 16, ang = -0.7, R = Math.hypot(W, H) / 2 + 40, r = mulberry(X.seed + 21);
    X.drawOld();
    const L = layer(() => {
      X.drawNew(); ctx.globalCompositeOperation = 'destination-in';
      ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.beginPath(); let n = 0;
      for (let v = -R; v <= R; v += gap) { let u = -R + r() * 60; while (u < R) { const Ln = 50 + r() * 110, d = r() * 0.4, h = gap * 1.15 * E.inOutSine(inv(d, d + 0.6, e)); if (h > 0.2) { ctx.rect(u, v - h / 2, Ln, h); n++; } u += Ln + 6 + r() * 30; } }
      // an empty path makes the browser skip the fill, which would leave the whole new plate showing: clear instead
      if (n) { ctx.fillStyle = '#000'; ctx.fill(); } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); }
    }, 1);
    ctx.drawImage(L, 0, 0);
    return e;
  },
};
/** header start delay per transition (a bare hold after a lens-in, none after a lens-out) */
/** where each transition lands (90% of its travel), as a share of its length; the title starts 0.3 s after that */
const LAND_AT = { lensIn: 0.62, lensOut: 0.62, shape: 0.6, morph: 0.6, roll: 0.61, iris: 0.8, zoom: 0.7, through: 0.85, bleed: 0.85, page: 0.78, burn: 0.82, wipe: 0.75, hatch: 0.8, pan: 0.75, erase: 0.85 };
/** landAt(tr): seconds after a plate starts when its entering move has landed (use it to time beats) */
const landAt = tr => !tr ? 0 : tr.type === 'cut' ? 0 : (tr.land ?? LAND_AT[tr.type] ?? 0.85) * (tr.dur || 0);
/** lensOut keeps an instant title: the new world is already open */
const HEADER_DELAY = { cut: () => 0.25, lensOut: () => 0.05, fade: d => d * 0.6 + 0.2 };
function headerDelay(pl) { const tr = pl.enter; if (!tr || pl.i === 0) return 0.1; const h = HEADER_DELAY[tr.type]; return h ? h(tr.dur || 0) : landAt(tr) + 0.3; }
/** eraser wipe: a board eraser rubs across the old plate in overlapping zigzag swipes and the new plate shows where it has
    been. Made for the chalk papers (a whiteboard or chalkboard film), though it works on any. Options: dir 'lr' | 'rl', band (px). */
TRANS.erase = function (p, X) {
  const e = X.ez(p, E.ramp(0.12, 0.2)), band = X.tr.band ?? 190, step = band * 0.6, rl = X.tr.dir === 'rl', r = mulberry(X.seed + 41);
  const path = [];                                                     // up and down swipes, each leaning a little, drifting across the frame
  for (let i = 0, x = -band * 0.3; x < W + band * 0.6; i++, x += step) {   // step + lean stays under band, so swipes overlap edge to edge
    const y0 = i % 2 ? H + band : -band, y1 = i % 2 ? -band : H + band, lean = 20 + r() * 15;
    for (let k = 0; k <= 8; k++) { const u = k / 8, px = x + lean * u + Math.sin(u * Math.PI) * (r() - 0.5) * 24;
      path.push([rl ? W - px : px, lerp(y0, y1, u)]); }
  }
  X.drawOld();
  const done = partial(path, e, false);
  if (done.length > 1) {
    const L = layer(() => {
      X.drawNew(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-in';
      trace(done, false); ctx.lineWidth = band; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.stroke();
    }, 1);
    ctx.drawImage(L, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); trace(done, false); ctx.lineWidth = band * 0.85; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = X.darkNew ? 'rgba(225,232,222,0.045)' : 'rgba(80,90,110,0.035)'; ctx.stroke(); ctx.restore();   // what the eraser leaves: a faint smear
    if (p > 0.01 && p < 0.99) {                                        // the eraser itself: a wooden back on a felt pad
      const [hx, hy] = done[done.length - 1], [qx, qy] = done[Math.max(0, done.length - 3)], a = Math.atan2(hy - qy, hx - qx) - Math.PI / 2;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(clamp(a, -0.35, 0.35) * 0.5 + (rl ? 0.08 : -0.08));
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.roundRect(-band * 0.28 + 8, -band * 0.55 + 10, band * 0.56, band * 1.1, 14); ctx.fill();
      ctx.fillStyle = '#9a7650'; ctx.beginPath(); ctx.roundRect(-band * 0.28, -band * 0.55, band * 0.56, band * 1.1, 14); ctx.fill();
      ctx.fillStyle = '#3d3c42'; ctx.beginPath(); ctx.roundRect(band * 0.06, -band * 0.55, band * 0.22, band * 1.1, [0, 14, 14, 0]); ctx.fill();
      ctx.strokeStyle = '#1b1518'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-band * 0.28, -band * 0.55, band * 0.56, band * 1.1, 14); ctx.stroke();
      ctx.restore();
    }
  }
  return e;
};
TRANS.morph = TRANS.shape;   // v2 name

/* ---------- timeline ---------- */
/** presets whose main easing enter.ease replaces (see renderFrame) */
const EASED = { lensIn: 1, lensOut: 1, fade: 1, zoom: 1, pan: 1, wipe: 1, bleed: 1, burn: 1, page: 1, roll: 1, shape: 1, hatch: 1, erase: 1 };
/** transition length when a plate's enter has no dur (seconds) */
const DEFAULT_DUR = { custom: 1.6, through: 1.8, cut: 0, lensIn: 1.6, lensOut: 1.6, zoom: 1.9, pan: 0.8, wipe: 1.0, bleed: 1.6, burn: 1.4, iris: 1.6, shape: 1.4, morph: 1.4, hatch: 1.2, page: 1.6, roll: 1.3, fade: 1.0, erase: 1.4 };
let STORY = null, TOTAL_T = 0, TOTAL_F = 0;
function defineStory(story) {
  STORY = story; let t = 0;
  story.plates.forEach((p, i) => { p.i = i; if (p.enter && p.enter.dur == null) p.enter.dur = DEFAULT_DUR[p.enter.type] ?? 0.6; });
  placeVoice(story);                                                   // narration first: it can lengthen plates (see VOICE below)
  story.plates.forEach(p => {
    if (!(p.dur > 0)) throw new Error(`plate ${p.i}${p.header ? ` (${p.header.title})` : ''} has no dur` + (p.vo ? ', and no narration was embedded to time it (build with vo/voice.json)' : ''));
    p.start = t; t += p.dur; });
  const vEnd = Math.max(0, ...story.plates.flatMap(p => p.voice.filter(v => v.unit).map(v => p.start + v.at + v.dur)));
  if (vEnd + 0.3 > t) { const last = story.plates[story.plates.length - 1]; last.dur += vEnd + 0.3 - t; t = vEnd + 0.3; }   // a line running off the end
  indexMarks(story);
  for (const p of story.plates) {                                      // cue and beat times may name a word of the narration
    if (typeof p.cues === 'function') p.cues = p.cues(p);
    if (p.cues) p.cues = p.cues.map(c => typeof c[0] === 'string' ? [timeOf(c[0], p), ...c.slice(1)] : c);
    if (p.beats) p.beats = p.beats.map(b => typeof b[0] === 'string' ? [timeOf(b[0], p), ...b.slice(1)] : b);
    if (ANIMATIC || !p.draw) animaticPlate(p);
  }
  TOTAL_T = t; TOTAL_F = Math.round(t * FPS);
}

/* ---------- voice: narration generated by voice.mjs, embedded by build.py ---------- */
/*
 * A narrated film carries its own narration. build.py reads vo/voice.json, compresses each clip to Opus and embeds it
 * in the HTML as window.__VOICE_DATA, so the film stays one file and the player, the render and every check hear it.
 * A plate names its clip: `vo: 'P2'`, a list `vo: ['P3a', 'P3b']` (played in order, `gap` s apart), or
 * `vo: { id, at, gap, tail, marks }`. Then:
 *   - the clip starts at `at` (plate seconds; default: once the header's title has typed on, plus VOICE.lead, and
 *     no earlier than the clip's own `lead` in voice.json). A negative `at` starts it during the previous plate (a J-cut);
 *   - the plate lasts at least until the clip ends plus `tail` (default: the clip's `tail` in voice.json, else
 *     VOICE.tail). Its own `dur` is the drawing's
 *     minimum, and may be left out when the narration sets the length. A negative `tail` lets the line run on across
 *     the seam into the next plate (an L-cut);
 *   - named words in the script ({count}) are marks: mark('count') is the plate time that word is spoken, and a cue
 *     or beat time can be the string 'count' or 'count+0.3'. `vo.marks` gives estimates in plate seconds, used until
 *     the narration exists, so the film builds and plays before and after the voice.
 * Without embedded narration nothing changes: `vo` is ignored and every plate keeps its `dur`.
 * defineStory({ voice: {...} }) overrides VOICE (below). The mix (renderAudio): the voice gets its own channel
 * (high-pass, a gentle compressor, a touch of the room), the beds duck under every sentence and the effects a little,
 * and the finished track is set to VOICE.lufs integrated with true peaks under VOICE.peak.
 */
const VOICE = { lead: 0.25, tail: 0.8, gap: 0.45, level: -18, lufs: -16, peak: -1.5, duck: 14, fxDuck: 3, reverb: 0.12 };
const ANIMATIC = QS.has('animatic') || !!window.__ANIMATIC;
const NARR = { data: null, units: new Map(), marks: new Map(), warnings: [], opts: VOICE };   // the film's narration, once placed
const cleanWords = s => String(s || '').replace(/\{[\w.]+\}/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
/** one unit of voice.json, with sentences as [t0, t1, text] (text from the entries, or split from unit.text) */
function voiceUnit(u) {
  const raw = (u.sentences || []).map(s => Array.isArray(s) ? [+s[0], +s[1], s[2]] : [+(s.t0 ?? s.start), +(s.t1 ?? s.end), s.text]);
  let sents = raw.map(([a, b, x]) => [a, b, cleanWords(x)]);
  if (sents.length && sents.every(s => !s[2]) && u.text) {
    const parts = cleanWords(u.text).split(/(?<=[.!?…])\s+/).filter(Boolean);
    sents = parts.length === sents.length ? sents.map((s, i) => [s[0], s[1], parts[i]]) : [[sents[0][0], sents[sents.length - 1][1], cleanWords(u.text)]];
  }
  if (!sents.length) sents = [[0, +u.dur || 0, cleanWords(u.text)]];
  return { id: String(u.id), dur: +u.dur || (sents.length ? sents[sents.length - 1][1] : 0), sentences: sents, marks: u.marks || {}, audio: u.audio, mime: u.mime,
    lead: u.lead != null ? +u.lead : null, tail: u.tail != null ? +u.tail : null };
}
/** where a plate's narration starts by default: once the title has finished typing (dropText at 17 cps, 0.25 s pop) */
function voiceStart(p) {
  if (p.header) return headerDelay(p) + 0.15 + p.header.title.length / 17 + 0.25 + NARR.opts.lead;
  return (p.i === 0 || !p.enter ? 0.5 : landAt(p.enter) + 0.3) + NARR.opts.lead;
}
function placeVoice(story) {
  const data = window.__VOICE_DATA || null, o = NARR.opts = { ...VOICE, ...(story.voice || {}) };
  NARR.data = data; NARR.warnings = [];
  NARR.units = new Map(((data && data.units) || []).map(u => [String(u.id), voiceUnit(u)]));
  const used = new Set();
  for (const p of story.plates) {
    p.voice = [];
    const items = (p.vo == null || p.vo === false ? [] : Array.isArray(p.vo) ? p.vo : [p.vo]).map(x => typeof x === 'object' ? x : { id: String(x) });
    let end = null;
    for (const it of items) {
      const u = NARR.units.get(String(it.id)) || null;
      if (data && !u) NARR.warnings.push(`plate ${p.i} asks for narration '${it.id}', which the embedded voice.json does not have`);
      if (u) used.add(u.id);
      // the first clip waits for the title; the lead voice.json planned for it (script.md's @lead) is a minimum
      const at = it.at != null ? +it.at : end == null ? Math.max(voiceStart(p), (u && u.lead) || 0) : end + (it.gap ?? o.gap);
      end = at + (u ? u.dur : 0);
      p.voice.push({ id: String(it.id), at, dur: u ? u.dur : 0, unit: u, est: it.marks || {}, tail: it.tail ?? (u ? u.tail : null) ?? undefined });
    }
    if (p.voice.some(v => v.unit)) { const last = p.voice[p.voice.length - 1];
      p.durMin = p.dur; p.dur = Math.max(p.dur || 0, end + (last.tail ?? o.tail)); }            // the picture waits for the voice
  }
  for (const id of NARR.units.keys()) if (!used.has(id)) NARR.warnings.push(`narration '${id}' in voice.json is not used by any plate`);
  if (NARR.warnings.length) { window.__voiceWarning = NARR.warnings.join('; '); console.warn('voice: ' + window.__voiceWarning); }
}
/** marks by name (and by 'clip.name'): the word's time in its plate; before the narration exists, the vo.marks estimates */
function indexMarks(story) {
  NARR.marks = new Map();
  const add = (k, rec) => NARR.marks.set(k, [...(NARR.marks.get(k) || []), rec]);
  for (const p of story.plates) for (const v of p.voice) {
    const names = new Set([...Object.keys(v.est), ...Object.keys(v.unit ? v.unit.marks : {})]);
    for (const n of names) {
      const real = v.unit && v.unit.marks[n] != null;
      if (v.unit && !real) NARR.warnings.push(`mark '${n}' is not in narration '${v.id}' (its estimate is used)`);
      const rec = { plate: p, id: v.id, t: real ? v.at + +v.unit.marks[n] : +v.est[n], real };
      add(n, rec); add(`${v.id}.${n}`, rec);
    }
  }
  if (NARR.warnings.length) window.__voiceWarning = NARR.warnings.join('; ');
}
/** mark(name[, plate]): the plate time (seconds) at which the narration says the word marked {name}. With a plate
 *  (the object, or its index) the time is on that plate's clock, even for a word in another plate's narration. */
function mark(name, plate) {
  if (!STORY || !STORY.plates[0] || STORY.plates[0].start == null) throw new Error(`mark('${name}'): marks are known once defineStory() has run. Use mark() inside draw, overlay or log, or write a cue time as the string '${name}'`);
  const hits = NARR.marks.get(name) || [];
  if (plate != null) { const p = typeof plate === 'number' ? STORY.plates[plate] : plate, own = hits.find(h => h.plate === p);
    if (own) return own.t; if (hits.length === 1) return hits[0].plate.start + hits[0].t - p.start; }
  else if (hits.length === 1) return hits[0].t;
  if (!hits.length) throw new Error(`mark('${name}'): no narration mark of that name (known: ${[...NARR.marks.keys()].filter(k => !k.includes('.')).join(', ') || 'none'})`);
  throw new Error(`mark('${name}') is in the narration of ${hits.length} plates: name the clip, as in mark('${hits[0].id}.${name}')`);
}
/** markAt(name): the film time (seconds) of a mark */
const markAt = name => { const h = NARR.marks.get(name) || []; if (h.length !== 1) return mark(name); return h[0].plate.start + h[0].t; };
/** a cue or beat time: a number, or a mark name with an optional offset ('count', 'count+0.3', 'P2.press-0.1') */
function timeOf(v, p) {
  const m = String(v).match(/^\s*([A-Za-z_][\w.]*)\s*(?:([+-])\s*(\d*\.?\d+))?\s*$/);
  if (!m) throw new Error(`plate ${p.i}: time '${v}' is neither a number nor a mark name like 'count+0.3'`);
  return mark(m[1], p) + (m[2] ? (m[2] === '-' ? -1 : 1) * +m[3] : 0);
}
/** the narration placed on the film clock: [{ plate, id, t0 (film s), dur, sentences [[t0, t1, text]] (film s), marks }] */
function voiceTrack() {
  const out = [];
  for (const p of STORY.plates) for (const v of p.voice || []) { if (!v.unit) continue; const t0 = p.start + v.at;
    out.push({ plate: p.i, id: v.id, t0, dur: v.dur, sentences: v.unit.sentences.map(([a, b, x]) => [t0 + a, t0 + b, x]),
      marks: Object.fromEntries(Object.entries(v.unit.marks).map(([k, s]) => [k, t0 + +s])), unit: v.unit }); }
  return out;
}
/** captions from the sentence times: at most two lines of 42 characters per caption; a longer sentence is split at
 *  word boundaries and its time shared out by length */
function captions() {
  const caps = [];
  for (const v of voiceTrack()) for (const [a, b, text] of v.sentences) {
    if (!text) continue;
    const words = text.split(' '), chunks = [];
    let cur = '';
    for (const w of words) { if (cur && (cur + ' ' + w).length > 84) { chunks.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) chunks.push(cur);
    const total = chunks.reduce((s, c) => s + c.length, 0); let t = a;
    for (const c of chunks) { const d = (b - a) * c.length / total, lines = [];
      let line = ''; for (const w of c.split(' ')) { if (line && (line + ' ' + w).length > 42) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w; }
      lines.push(line); caps.push({ t0: t, t1: t + d, text: lines.join('\n') }); t += d; }
  }
  return caps;
}
function srtOf(caps) {
  const ts = s => { const ms = Math.max(0, Math.round(s * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  return caps.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(c.t1)}\n${c.text}\n`).join('\n');
}

/* ---------- animatic: the pacing check before any art ----------
 * ?animatic=1 (render.mjs --animatic, build.py --animatic), or a plate with no draw: the plate's drawing is replaced by
 * a placeholder. The header, stage dial, log, transitions, sound and narration stay; the frame shows the plate's beat
 * labels appearing at their times (`beats: [[t | 'mark', 'label']]`, else its cues), the sentence being spoken, and a
 * timeline of the plate with its sentences, marks and beats. Cheap to draw, so an animatic renders in a minute or two. */
function animaticPlate(p) {
  const h0 = p.hero; p.hero = h0 ? t => { const h = h0(t); return { x: h.x, y: h.y }; } : null;   // keeps the lens and zoom targets, drops the reticle
  p.cam = null; p.drift = false; p.draw = t => animaticScene(p, t); p.overlay = t => animaticOverlay(p, t);
}
function animaticScene(p, t) {
  const dk = p.dark, c = mutedOf(dk);
  for (let x = 120; x < W; x += 240) ink([[x, 300], [x, 840]], { w: 1, color: c, amp: 0.4, alpha: 0.25, seed: x });
  for (let y = 300; y <= 840; y += 180) ink([[60, y], [W - 60, y]], { w: 1, color: c, amp: 0.4, alpha: 0.25, seed: y });
  if (p.hero) { const h = p.hero(t); ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, TAU); ctx.fillStyle = PAL.accent; ctx.fill(); }
}
function animaticOverlay(p, t) {
  const dk = p.dark, ic = inkOf(dk), lc = labelOf(dk), acc = legible(PAL.accent, dk), fmtS = s => s.toFixed(1) + ' s';
  const beats = p.beats || (p.cues || []).map(([ct, name]) => [ct, 'sound · ' + name]);
  text('ANIMATIC · PLACEHOLDER', W - 90, 300, { kind: 'mono', size: 18, ls: 3, align: 'right', color: lc, role: 'hud' });
  text(`${fmtS(Math.max(0, Math.min(t, p.dur)))} / ${fmtS(p.dur)}`, W - 90, 330, { kind: 'mono', size: 22, align: 'right', color: ic, role: 'label' });
  const seen = beats.filter(b => b[0] <= t).slice(-6);
  seen.forEach(([bt, label], k) => { const a = k === seen.length - 1 ? 1 : 0.55, y = 420 + k * 44;
    text(`${fmtS(bt).padStart(6)}  ${typed(String(label), t - bt, 40)}`, 120, y, { kind: 'mono', size: 24, color: k === seen.length - 1 ? acc : ic, alpha: a, role: 'label' }); });
  const now = p.start + t, line = voiceTrack().flatMap(v => v.sentences).find(([a, b]) => now >= a && now <= b + 0.2);
  if (line) haloText(line[2], W / 2, 860, { kind: 'display', size: 34, italic: true, align: 'center', color: ic, role: 'fact' });
  const x0 = 120, x1 = W - 120, y = 960, X = s => lerp(x0, x1, clamp(s / p.dur));
  ink([[x0, y], [x1, y]], { w: 2, color: lc, amp: 0 });
  for (const v of p.voice || []) if (v.unit) for (const [a, b] of v.unit.sentences) ink([[X(v.at + a), y - 10], [X(v.at + b), y - 10]], { w: 7, color: PAL.peri, amp: 0, alpha: 0.8 });
  for (const [bt] of beats) ink([[X(bt), y + 4], [X(bt), y + 18]], { w: 2, color: ic, amp: 0 });
  for (const v of p.voice || []) for (const [n, s] of Object.entries(v.unit ? v.unit.marks : v.est)) { const mx = X(v.unit ? v.at + +s : +s);
    ink([[mx, y - 30], [mx, y - 16]], { w: 2.5, color: acc, amp: 0 }); text(`{${n}}`, mx, y - 38, { kind: 'mono', size: 18, align: 'center', color: acc, role: 'hud' }); }
  ctx.beginPath(); ctx.arc(X(t), y, 8, 0, TAU); ctx.fillStyle = acc; ctx.fill();
}
/**
 * drawPlate(pl, t, o): paper -> scene (transition xf, momentum, camera) -> hero reticle (constant size) -> overlay -> HUD (staggered).
 * o.all applies xf to everything (pans, page curls); o.hud scales HUD alpha; o.bg = false skips the paper.
 * The plate draws with its own paper current (withPaper: PAL, S.ground). On a paper with a treatment, the paper, scene,
 * reticle and overlay go onto a layer that is treated (treat()) and then drawn; the HUD goes on top, untreated. A
 * treated plate always carries its own paper on that layer (bg: false draws it without the contour loops).
 */
function drawPlate(pl, t, o = {}) {
  const { hud = 1, hudOnly = false, chrome = true } = o;   // chrome: false skips header, dial, log and marks (the reticle still follows hud)
  const darkWas = S.dark, baseWas = S.base, patWas = S.haloPat, patTWas = S.haloPatT, pdWas = S.haloDark;
  S.dark = !!pl.dark; S.haloPat = null; S.haloPatT = null; S.haloDark = !!pl.dark;
  withPaper(pl, () => {
    ctx.save();
    if (o.all && o.xf) o.xf();
    S.base = ctx.getTransform();                                       // the frame the paper is drawn in: backing() samples it here
    if (!hudOnly) (S.ground && S.ground.treatment ? treatedScene : plateScene)(pl, t, o);
    if (hud > 0 && chrome) {
      ctx.globalAlpha *= clamp(hud);
      const ht = t - headerDelay(pl);
      if (pl.header) plateHeader(ht, { ...pl.header, dark: pl.dark });
      if (pl.stage) stageDial(ht - 0.25, { ...pl.stage, N: STORY.stages }, pl.dark);
      if (pl.log) journeyLog(ht - 0.35, pl.log(t), pl.dark);
      if (pl.marks !== false) regMarks(pl.dark);
    }
    ctx.restore();
  });
  S.dark = darkWas; S.base = baseWas; S.haloPat = patWas; S.haloPatT = patTWas; S.haloDark = pdWas;
}
/** the plate below its HUD: paper, the scene under its camera, the hero's reticle, the overlay */
function plateScene(pl, t, { xf = null, all = false, hud = 1, bg = true } = {}, own = false) {
  if (bg) background(pl.dark, t); else if (own) ctx.drawImage(paperTex(pl.dark), 0, 0);   // own: a treated plate's layer carries its paper
  const cam = camOf(pl, t), ms = entryShift(pl, t), mo = momentum(pl, t) * (ms ? ms.s : 1);
  ctx.save(); if (xf && !all) xf();
  ctx.save();                                                          // scene: entry shift + momentum + camera
  if (ms) ctx.translate(ms.dx, ms.dy);
  if (mo !== 1) { const [hx, hy] = focusOf(pl, t); ctx.translate(hx, hy); ctx.scale(mo, mo); ctx.translate(-hx, -hy); }
  withCamera(cam, () => relAlpha(() => pl.draw(t, pl)));
  if (pl.hero && !S.noReticle) { const hh = pl.hero(t); if (hh.label !== undefined || hh.r) {
    const h = heroRaw(pl, t), m = ctx.getTransform(), sc = Math.hypot(m.a, m.b) || 1;       // counter-scale: the reticle is furniture
    withAlpha((h.alpha ?? 1) * clamp(hud * 1.5), () => { ctx.translate(h.x, h.y); ctx.scale(1 / sc, 1 / sc); reticle(0, 0, t, { label: h.label, r: h.r ?? 34, dark: pl.dark, tag: h.tag ?? !!h.label }); }); } }
  ctx.restore();
  // overlay: art that must not move with the camera. Camera, momentum and entry shift don't apply (they would slide
  // cards and stats off the frame before a lens or zoom); a transition's xf still does, so it leaves with its plate.
  if (pl.overlay) relAlpha(() => pl.overlay(t, pl));
  ctx.restore();
}
/** plateScene on the treatment layer: drawn in the same frame as ctx, treated, then laid down with ctx's own clip and alpha */
function treatedScene(pl, t, o) {
  const outer = ctx, d = TREAT_DEPTH;
  if (!TREAT_LAYERS[d] || TREAT_LAYERS[d].width !== W || TREAT_LAYERS[d].height !== H) TREAT_LAYERS[d] = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const L = TREAT_LAYERS[d], g = L.getContext('2d'), rawWas = S.raw;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H);
  g.setTransform(ctx.getTransform());
  ctx = g; S.raw = true; TREAT_DEPTH++;
  try { plateScene(pl, t, o, true); }
  finally { ctx = outer; S.raw = rawWas; TREAT_DEPTH--; }
  treat(g, S.ground, S.base, groundTex(S.ground).raw);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L, 0, 0); ctx.restore();
}
/** true while frame f is inside a transition (or a plate's lead into one): those run on ones so scale and mask steps stay small */
function onOnes(f) {
  const T = f / FPS, P = STORY.plates, i = P.findIndex(p => T < p.start + p.dur); if (i < 0) return false;
  const pl = P[i], t = T - pl.start, tr = pl.enter, nx = P[i + 1];
  if (pl.ones && pl.ones(t)) return true;                                      // plate.ones(t): a fast camera move asks for ones
  if (i > 0 && tr && tr.type !== 'cut' && t < tr.dur + 0.6) return true;      // the transition and its settle
  return !!(nx && nx.enter && nx.enter.type !== 'cut' && t > pl.dur - 0.6);    // the lead into the next one
}
/** renderFrame(f): drawings on twos (STORY.twos = false for ones) except transitions, which run on ones; the line boil
 *  always changes on twos. Gate weave (STORY.weave px) drifts slowly; film grain (STORY.grain 0..1) changes every drawing. */
function renderFrame(f) {
  const fq = STORY.twos === false || onOnes(f) ? f : f - (f % 2);
  S.f = f; S.boil = Math.floor(f / 2); S.T = fq / FPS; S.trans = null;
  const T = S.T, P = STORY.plates;
  let i = P.findIndex(p => T < p.start + p.dur); if (i < 0) i = P.length - 1;
  const pl = P[i], t = T - pl.start, tr = pl.enter;
  const vig = p => p._ground ? groundTex(p._ground).vig : p.dark ? TEX.vigNight : TEX.vigPaper;   // each paper has its own vignette
  withPaper(pl, () => frameBody(f, P, i, pl, t, tr, vig));             // the frame draws with this plate's paper and palette
}
function frameBody(f, P, i, pl, t, tr, vig) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // start every frame on plain paper. A transition can leave a sub-pixel gap (the whip pan's seam between its two
  // sheets), and the previous frame showed through it, so the frame depended on what this page had drawn before and
  // renders with different worker counts differed in one pixel column
  ctx.fillStyle = pl.dark ? PAL.night : PAL.paper; ctx.fillRect(0, 0, W, H);
  // gate weave: the whole drawing shifts a fraction of a pixel and turns a hair each drawing, like hand-shot animation
  const wv = STORY.weave ?? 0.9, db = Math.floor(f / 2), TT = f / FPS;   // weave: a slow wander (under 1 Hz) plus a tiny per-drawing jitter, so text never buzzes
  if (wv) { ctx.translate(W / 2 + (1.4 * vnoise(TT * 0.7, 1) + 0.25 * (hash3(db, 1, 7) - 0.5)) * wv, H / 2 + (1.4 * vnoise(TT * 0.6, 2) + 0.25 * (hash3(db, 2, 7) - 0.5)) * wv);
    ctx.rotate(0.0006 * vnoise(TT * 0.5, 3) * wv); ctx.scale(1.004, 1.004); ctx.translate(-W / 2, -H / 2); }
  if (i > 0 && tr && tr.type !== 'cut' && t < tr.dur) {
    const prev = P[i - 1], pt = prev.dur + t, raw = t / tr.dur;
    // pacing: enter.curve maps clock -> progress (holds, per-segment easing). enter.ease REPLACES the main easing of the
    // presets that have one (EASED); for the rest (iris, through, custom) it reshapes the clock instead. Never both,
    // so a transition is never eased twice (that left dead starts and two-drawing snaps).
    const own = !!(tr.ease && EASED[tr.type]);
    const p = clamp(tr.curve ? curve(raw, tr.curve) : tr.ease && !own ? easeOf(tr.ease)(raw) : raw);   // presets clamp overshoot; custom draws can read S.trans.raw
    S.trans = { type: tr.type, p, raw };
    const side = (sd, fn) => { const k = S.side; S.side = sd; try { fn(); } finally { S.side = k; } };   // plates can ask S.side which role they are playing
    const X = { drawOld: () => side('old', () => drawPlate(prev, pt)), drawNew: () => side('new', () => drawPlate(pl, t)),
      drawOldX: o => side('old', () => drawPlate(prev, pt, o)), drawNewX: o => side('new', () => drawPlate(pl, t, o)),
      focusOld: focusOf(prev, pt), focusNew: focusOf(pl, t), darkOld: prev.dark, darkNew: pl.dark, prev, pl, pt, t, tr, seed: i * 7 + 1,
      gOld: prev._ground, gNew: pl._ground, palOld: palView(prev), palNew: palView(pl),   // the two papers and palettes (PAL is the new plate's)
      ez: (v, def) => own ? easeOf(tr.ease)(v) : def(v) };   // a preset's main easing, unless enter.ease replaces it
    const share = (tr.draw || TRANS[tr.type] || TRANS.fade)(p, X);        // enter.draw: a transition written by the story itself
    ctx.save(); ctx.globalAlpha = 1 - share; ctx.drawImage(vig(prev), 0, 0); ctx.globalAlpha = share; ctx.drawImage(vig(pl), 0, 0); ctx.restore();
  } else {
    drawPlate(pl, t); ctx.drawImage(vig(pl), 0, 0);
    // anticipation: in the last 0.5 s before a lens-in a ring locks onto the hero (70 -> 16 px) and fills with the next world's colour
    const nx = P[i + 1];
    if (nx && nx.enter && nx.enter.type === 'lensIn') { const u = inv(pl.dur - 0.5, pl.dur, t); if (u > 0) { const [hx, hy] = focusOf(pl, t), rr = lerp(70, 16, E.inOutSine(u)), fa = E.inOutSine(inv(0.5, 1, u));
      ctx.save(); ctx.globalAlpha = E.out3(inv(0, 0.3, u)); ctx.beginPath(); ctx.arc(hx, hy, rr, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = PAL.lens; ctx.stroke();
      ctx.globalAlpha = fa; ctx.fillStyle = palView(nx)[nx.dark ? 'night' : 'paper']; ctx.fill(); ctx.stroke(); ctx.restore(); } }
  }
  const gr = STORY.grain ?? 1;                                          // grain tile changes every drawing
  if (gr) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = gr * (pl._ground ? pl._ground.grain : pl.dark ? 0.5 : 0.8); ctx.translate(-(hash3(db, 4, 9) * 256 | 0), -(hash3(db, 5, 9) * 256 | 0));
    ctx.fillStyle = TEX.grain[db % 4]; ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore(); }
  if (pl.counter !== false) frameCounter(f, pl.dark);
}

/* ---------- audio: synthesized, rendered offline, deterministic ---------- */
const SR = 48000;
function noiseBuffer(ac, seconds, seed = 99) {
  const b = ac.createBuffer(1, Math.ceil(SR * seconds), SR), d = b.getChannelData(0), r = mulberry(seed);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b;
}
// deterministic stereo spread; a sound given a seed is placed by the seed, so a fixed seed really is one fixed sound
const panOf = (t, o) => ((o && o.seed != null ? hash3(o.seed | 0, 17) : hash3(Math.round(t * 1000), 5)) - 0.5) * 1.3;
/** a musical key: stage n picks a chord from I–vi–IV–V–ii–V; night plates drop an octave and darken */
const PROG = [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12], [7, 11, 14, 17]];
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const note = (tonic, deg) => tonic * 2 ** (SCALE[((deg % 8) + 8) % 8] / 12 + Math.floor(deg / 8));
/*
 * Variation. Every sound below that is listed in VARIED re-rolls its small details (pitch, length, timbre) on each
 * call from a seed: opts.seed when given (a fixed seed plays the same sound every time), otherwise the plate the call
 * belongs to, its time within that plate, the sound's name, and how many calls of that name at that time came before
 * (so two identical calls at one instant still differ). Nothing depends on call order across the film: adding,
 * removing or retiming a cue re-rolls only that cue, and lengthening a plate leaves every later plate's sounds alone.
 * Still deterministic: the same film renders the same audio every time, but no two pops, risers or pen scratches in it
 * are identical. AUDIO.tag names the layer that is playing (cue, header, riser, transition, bed) for cue_check.mjs;
 * renderAudio sets AUDIO.plate and AUDIO.t0 (that plate's start) as it walks the plates.
 */
const AUDIO = { tag: 'cue', plate: 0, t0: 0, seen: new Map(), reset() { this.plate = 0; this.t0 = 0; this.seen.clear(); this.tag = 'cue'; } };
const VARIED = new Set(['tick', 'scratch', 'readout', 'pop', 'chime', 'plink', 'thump', 'swell', 'riser', 'crackle', 'whoosh', 'shutter',
  'glide', 'flick', 'bend', 'hiss', 'crunch', 'creak', 'pump', 'relay', 'plop', 'slosh', 'shaker', 'clink', 'pour', 'foil', 'droplet',
  'pageFlip', 'pegSnap', 'marimba', 'vibes', 'musicBox', 'kalimba', 'celesta', 'glock', 'epiano', 'pluck', 'feltPiano', 'strings',
  'motif', 'success', 'question', 'oops', 'reveal', 'resolve']);
const saltOf = s => { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0; return h; };
/** rng for one sound: mulberry seeded by opts.seed, or by (plate, time within the plate, name, repeat at that instant) */
const sfxRng = (o, t, name) => {
  if (o && o.seed != null) return mulberry(Math.imul(o.seed | 0, 7919) ^ saltOf(name));
  VARIED.add(name);   // a story's own effect built on sfxRng varies too: cue_check reads this set after rendering
  const ms = Math.round((t - AUDIO.t0) * 1000), key = AUDIO.plate + '|' + ms + '|' + name, k = AUDIO.seen.get(key) || 0; AUDIO.seen.set(key, k + 1);
  return mulberry((hash3(ms, AUDIO.plate + 1, k) * 4294967296 | 0) ^ saltOf(name));
};
const rr = (r, a, b) => a + (b - a) * r();
const semis = (r, n) => 2 ** ((r() * 2 - 1) * n / 12);                      // a random interval within +/- n semitones

/*
 * Sample-level synthesis for the sounds WebAudio nodes can't shape well (grains, bubbles, modes, stick-slip).
 * Techniques, after Andy Farnell, Designing Sound (MIT Press 2010) and its SuperCollider port
 * (en.wikibooks.org/wiki/Designing_Sound_in_SuperCollider: Bubbles, Rain, Running water, Creaking door, Motors):
 *   - bubbles and drops: a damped sine whose pitch rises exponentially after it forms (Minnaert resonance with the
 *     rising chirp of K. van den Doel, "Physically based models for liquid sounds", ACM TAP 2005): droplet, plop,
 *     slosh, pour, rain;
 *   - modal synthesis: a struck object as a sum of exponentially decaying sines at its mode frequencies (inharmonic
 *     for glass and metal): clink, relay, pegSnap, foil, the rattle in shaker;
 *   - stick-slip friction: an irregular impulse train (slip events whose rate follows the force) through fixed
 *     resonators, the body of the door or beam: creak;
 *   - granular clusters: many millisecond noise grains, densest at the start and decaying, for fracture and grit:
 *     crunch, foil crinkle, pageFlip's flutter;
 *   - filtered noise with slow random (value-noise) modulation of level and centre frequency: wind, hiss, cityHum
 *     pass-bys, roomTone air.
 * Each fill writes a mono buffer that is normalized to peak 1, so `g` is the sound's peak before the master chain.
 */
const DSP = {
  burst(d, t0, amp, len, tau, r) { const i0 = t0 * SR | 0, n = Math.min(d.length - i0, len * SR | 0), k = 1 / (tau * SR);
    for (let i = 0; i < n; i++) d[i0 + i] += amp * (r() * 2 - 1) * Math.exp(-i * k); },
  chirp(d, t0, amp, f0, f1, sweep, tau, len = tau * 6, ph0 = 0) { const i0 = t0 * SR | 0, n = Math.min(d.length - i0, len * SR | 0), k = Math.log(f1 / f0) / Math.max(1e-4, sweep);
    let ph = ph0; for (let i = 0; i < n; i++) { const s = i / SR; ph += TAU * f0 * Math.exp(k * Math.min(s, sweep)) / SR; d[i0 + i] += amp * Math.sin(ph) * Math.exp(-s / tau) * Math.min(1, i / 48); } },
  modes(d, t0, list) { const i0 = t0 * SR | 0;
    for (const [f, a, tau] of list) { const n = Math.min(d.length - i0, tau * 7 * SR | 0), w = TAU * f / SR, k = 1 / (tau * SR);
      for (let i = 0; i < n; i++) d[i0 + i] += a * Math.sin(w * i) * Math.exp(-i * k) * Math.min(1, i / 24); } },
  /** two-pole resonator (centre f, bandwidth bw Hz); f may be a function of the sample index for a sweep */
  reson(x, f, bw) { const r = Math.exp(-Math.PI * bw / SR), a2 = -r * r, y = new Float32Array(x.length); let y1 = 0, y2 = 0;
    const fixed = typeof f !== 'function', c = fixed ? 2 * r * Math.cos(TAU * f / SR) : 0;
    for (let i = 0; i < x.length; i++) { const a1 = fixed ? c : 2 * r * Math.cos(TAU * f(i) / SR), v = (1 - r) * x[i] + a1 * y1 + a2 * y2; y[i] = v; y2 = y1; y1 = v; } return y; },
  norm(d) { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) for (let i = 0; i < d.length; i++) d[i] /= m; return d; },
};
/** synth: fill(d, r) writes a mono buffer of `dur` s that plays at t, normalized, through optional biquads.
 *  filters: [{ type, f, f1 (ramp to by the end), q, gain, curve (Float32Array of Hz over the sound) }]; pan1 ramps the pan. */
function synth(ac, out, t, dur, fill, { g = 0.1, pan = 0, pan1 = null, filters = [], r = mulberry(1), fade = 0 } = {}) {
  const n = Math.max(2, Math.ceil(SR * dur)), b = ac.createBuffer(1, n, SR), d = b.getChannelData(0); fill(d, r); DSP.norm(d);
  if (fade) { const m = Math.min(n >> 1, fade * SR | 0); for (let i = 0; i < m; i++) { d[i] *= i / m; d[n - 1 - i] *= i / m; } }
  const s = ac.createBufferSource(); s.buffer = b; let node = s;
  for (const f of filters) { const bq = ac.createBiquadFilter(); bq.type = f.type || 'bandpass'; bq.Q.value = f.q ?? 0.7; if (f.gain != null) bq.gain.value = f.gain;
    if (f.curve) bq.frequency.setValueCurveAtTime(f.curve, t, dur); else { bq.frequency.setValueAtTime(f.f, t); if (f.f1) bq.frequency.exponentialRampToValueAtTime(f.f1, t + dur); }
    node = node.connect(bq); }
  const v = ac.createGain(), pn = ac.createStereoPanner(); v.gain.value = g; pn.pan.setValueAtTime(clamp(pan, -1, 1), t);
  if (pan1 != null) pn.pan.linearRampToValueAtTime(clamp(pan1, -1, 1), t + dur);
  node.connect(v).connect(pn).connect(out); s.start(t);
}
/** white noise shaped by env(s) (s in seconds) into d */
const noiseInto = (d, r, env) => { for (let i = 0; i < d.length; i++) d[i] += (r() * 2 - 1) * env(i / SR); };
/** a slow random curve (value noise) sampled n times over dur, mapped to [lo, hi] */
const slowCurve = (seed, dur, rate, lo, hi, n = 64) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = lo + (hi - lo) * (vnoise(i / (n - 1) * dur * rate, seed) + 1) / 2; return c; };

const SFX = {
  tone(ac, out, t, { f = 880, f2 = null, dur = 0.12, g = 0.06, type = 'sine', a = 0.004, pan = 0 }) {
    const o = ac.createOscillator(), v = ac.createGain(), pn = ac.createStereoPanner(); o.type = type; o.frequency.setValueAtTime(f, t); pn.pan.value = pan;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v).connect(pn).connect(out); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(ac, out, t, { dur = 1, g = 0.05, f0 = 800, f1 = null, q = 0.7, type = 'bandpass', a = null, lfo = 0, pan = 0 }) {
    const s = ac.createBufferSource(); s.buffer = ac._noise; s.loop = true;
    const bq = ac.createBiquadFilter(); bq.type = type; bq.Q.value = q; bq.frequency.setValueAtTime(f0, t);
    if (f1) bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const v = ac.createGain(), at = a ?? Math.min(0.3, dur / 3), pn = ac.createStereoPanner(); pn.pan.value = pan;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + at); v.gain.setValueAtTime(g, t + Math.max(at, dur - at)); v.gain.linearRampToValueAtTime(0, t + dur);
    let node = s.connect(bq).connect(v);
    if (lfo) { const l = ac.createOscillator(), lg = ac.createGain(), mod = ac.createGain(); l.frequency.value = lfo; lg.gain.value = 0.5; mod.gain.value = 0.5;
      l.connect(lg).connect(mod.gain); node = node.connect(mod); l.start(t); l.stop(t + dur); }
    node.connect(pn).connect(out); s.start(t, (t * 7.3) % 5); s.stop(t + dur + 0.05);
  },
  tick(ac, out, t, o = {}) { const r = sfxRng(o, t, 'tick'); SFX.tone(ac, out, t, { f: 3200 * semis(r, 3), dur: rr(r, 0.022, 0.04), g: 0.012 * rr(r, 0.8, 1.15), pan: panOf(t, typeof o === 'object' ? o : null) }); },
  /** pen-on-paper scratch for the whole length of a typed line; each one a slightly different nib and hand */
  scratch(ac, out, t, o = {}) { const { chars = 20, cps = 30, g = 0.016 } = o, r = sfxRng(o, t, 'scratch');
    SFX.noise(ac, out, t, { dur: Math.max(0.15, chars / cps), g: g * rr(r, 0.85, 1.12), f0: rr(r, 3000, 4400), q: rr(r, 0.9, 1.5), a: 0.02, lfo: Math.min(cps, 24) * rr(r, 0.85, 1.15), pan: panOf(t, typeof o === 'object' ? o : null) * 0.5 }); },
  /** a typed line where there is no pen (a night plate, a screen, a microscope): soft instrument blips at typing speed */
  readout(ac, out, t, o = {}) { const { chars = 20, cps = 30, g = 0.01 } = o, r = sfxRng(o, t, 'readout'), f = rr(r, 1700, 2500), step = Math.max(1 / 14, 1 / cps);
    for (let k = 0, n = Math.min(40, Math.ceil(chars / cps / step)); k < n; k++)
      SFX.tone(ac, out, t + k * step + rr(r, 0, 0.012), { f: f * (r() < 0.3 ? 1.335 : 1) * semis(r, 0.3), dur: rr(r, 0.018, 0.03), g: g * rr(r, 0.6, 1), pan: panOf(t, typeof o === 'object' ? o : null) * 0.4 }); },
  pop(ac, out, t, o = {}) { const r = sfxRng(o, t, 'pop'), pan = panOf(t, typeof o === 'object' ? o : null), f = rr(r, 840, 1120), h = [2, 2.5, 3][r() * 3 | 0];
    SFX.tone(ac, out, t, { f, f2: f * rr(r, 0.58, 0.7), dur: rr(r, 0.11, 0.17), g: 0.07 * rr(r, 0.85, 1.08), pan }); SFX.tone(ac, out, t + 0.01, { f: f * h, dur: rr(r, 0.06, 0.1), g: 0.02 * rr(r, 0.7, 1.2), pan }); },
  chime(ac, out, t, o = {}) { const { f = 660 } = o, r = sfxRng(o, t, 'chime'), rat = [1, rr(r, 1.99, 2.02), rr(r, 2.96, 3.06)], L = rr(r, 0.85, 1.15), k = semis(r, 0.08);
    rat.forEach((m, i) => SFX.tone(ac, out, t + i * rr(r, 0.008, 0.018), { f: f * m * k, dur: (2.0 - i * 0.5) * L, g: 0.05 / (i + 1) * rr(r, 0.9, 1.1), a: 0.02, pan: (i - 1) * 0.3 })); },
  /** f defaults to a random note of the film's key (music.tonic, two octaves up) */
  plink(ac, out, t, o = {}) { const r = sfxRng(o, t, 'plink'), f = o.f ?? (STORY.music ? note((STORY.music.tonic || 220) * 4, r() * 6 | 0) : 1500 * semis(r, 3));
    SFX.tone(ac, out, t, { f, f2: f * rr(r, 0.3, 0.45), dur: rr(r, 0.07, 0.12), g: 0.06 * rr(r, 0.85, 1.1), pan: panOf(t, typeof o === 'object' ? o : null) }); },
  /** a landing or contact: a low body (its pitch, drop, length and weight all vary), a second body mode and the soft click of contact */
  thump(ac, out, t, o = {}) { const { g = 0.25 } = o, r = sfxRng(o, t, 'thump'), dur = rr(r, 0.18, 0.34);
    synth(ac, out, t, dur + 0.02, (d, q) => { const f = rr(q, 68, 108);
      DSP.chirp(d, 0, 1, f, f * rr(q, 0.38, 0.56), rr(q, 0.06, 0.16), rr(q, 0.02, 0.034), dur, q() * TAU);                          // the body
      DSP.chirp(d, rr(q, 0, 0.004), rr(q, 0.1, 0.35), f * rr(q, 1.45, 2.4), f * rr(q, 1, 1.6), 0.05, rr(q, 0.015, 0.035), dur, q() * TAU);   // a second mode
      DSP.burst(d, 0, rr(q, 0.1, 0.35), 0.03, rr(q, 0.004, 0.01), q); },                                                             // the contact
      { g: g * rr(r, 0.85, 1), r, filters: [{ type: 'lowpass', f: rr(r, 500, 1200), q: 0.7 }] }); },
  swell(ac, out, t, o = {}) { const { dur = 0.6, up = true } = o, r = sfxRng(o, t, 'swell'), k = semis(r, 2);
    SFX.tone(ac, out, t, { f: (up ? 220 : 1300) * k, f2: (up ? 1300 : 200) * k, dur, g: 0.05, type: r() < 0.5 ? 'triangle' : 'sine', a: dur * 0.6 });
    SFX.noise(ac, out, t, { dur, g: 0.08, f0: (up ? 300 : 4000) * k, f1: (up ? 4000 : 300) * k, q: rr(r, 1.5, 2.5) });
  },
  /** the riser before a seam; the length varies but it always ends at t + dur (the seam) */
  riser(ac, out, t, o = {}) { const { dur = 0.35 } = o, r = sfxRng(o, t, 'riser'), d = dur * rr(r, 0.8, 1.25), t1 = Math.max(0, t + dur - d), f = 330 * semis(r, 4);
    SFX.noise(ac, out, t1, { dur: d, g: 0.035 * rr(r, 0.85, 1.1), f0: rr(r, 250, 400), f1: rr(r, 1800, 3200), q: rr(r, 1.1, 2), a: d * 0.8 });
    SFX.tone(ac, out, t1, { f, f2: f * (r() < 0.7 ? 2 : 1.5), dur: d, g: 0.018, type: r() < 0.6 ? 'triangle' : 'sine', a: d * 0.8 }); },
  crackle(ac, out, t, o = {}) { const { dur = 0.8, g = 0.05 } = o, r = sfxRng(o, t, 'crackle');
    for (let i = 0; i < 26; i++) { const u = r(); SFX.noise(ac, out, t + u * dur * 0.9, { dur: 0.03 + r() * 0.05, g: g * (0.4 + r()), f0: 900 + u * 2600, q: 3, a: 0.004, pan: (r() - 0.5) * 1.2 }); }
    SFX.noise(ac, out, t, { dur, g: g * 0.5, f0: 200, f1: 1800, q: 0.8 }); },
  whoosh(ac, out, t, o = {}) { const { dur = 0.6, g = 0.09, dir = 'lr' } = o, r = sfxRng(o, t, 'whoosh');
    SFX.noise(ac, out, t, { dur, g, f0: rr(r, 400, 650), f1: rr(r, 4000, 6000), q: rr(r, 1, 1.5), a: dur * rr(r, 0.38, 0.52), pan: dir === 'rl' ? 0.4 : dir === 'lr' ? -0.4 : 0 });
    SFX.tone(ac, out, t + dur * 0.5, { f: rr(r, 150, 210), f2: rr(r, 50, 70), dur: 0.18, g: 0.08 }); },
  shutter(ac, out, t, o = {}) { const { dur = 0.6 } = o, r = sfxRng(o, t, 'shutter');
    SFX.tick(ac, out, t, { seed: o.seed }); const f = rr(r, 85, 160); SFX.tone(ac, out, t + dur * rr(r, 0.42, 0.5), { f, f2: f * rr(r, 0.35, 0.55), dur: rr(r, 0.1, 0.22), g: 0.16 * rr(r, 0.75, 1) }); SFX.tick(ac, out, t + dur * 0.55, { seed: o.seed != null ? o.seed + 1 : undefined }); SFX.tick(ac, out, t + dur * 0.6, { seed: o.seed != null ? o.seed + 2 : undefined }); },
  glide(ac, out, t, o = {}) { const { dur = 0.8, up = false } = o, r = sfxRng(o, t, 'glide'), k = semis(r, 3);
    SFX.tone(ac, out, t, { f: (up ? 260 : 900) * k, f2: (up ? 1100 : 220) * k, dur, g: 0.045, a: dur * 0.3 }); SFX.noise(ac, out, t, { dur, g: 0.04, f0: (up ? 400 : 3000) * k, f1: (up ? 3000 : 400) * k, q: rr(r, 1.2, 1.8) }); },
  flick(ac, out, t, o = {}) { const { dur = 0.7 } = o, r = sfxRng(o, t, 'flick');
    SFX.noise(ac, out, t, { dur: 0.16, g: 0.12, f0: rr(r, 2100, 2900), f1: rr(r, 5200, 6800), q: 0.9, a: 0.02 }); SFX.noise(ac, out, t + dur * 0.55, { dur: 0.12, g: 0.09, f0: rr(r, 750, 1100), q: 1, a: 0.01 });
    SFX.tone(ac, out, t + dur * 0.62, { f: rr(r, 110, 140), f2: 55, dur: 0.16, g: 0.12 }); },          // the page landing: its own low tap, not the contact thump
  bend(ac, out, t, o = {}) { const { dur = 0.8, f = 440, f2 = 660 } = o, r = sfxRng(o, t, 'bend'), k = semis(r, 1.5);
    SFX.tone(ac, out, t, { f: f * k, f2: f2 * k, dur, g: 0.05, type: 'triangle', a: 0.05 }); SFX.tone(ac, out, t, { f: f * 2 * k, f2: f2 * 2 * k, dur, g: 0.015 * rr(r, 0.6, 1.4), a: 0.05 }); },
  /** steam from a valve or a cooling vent: turbulent, bright noise; kind 'steam' (default) or 'vent' (softer, lower) */
  hiss(ac, out, t, o = {}) { const { dur = 0.7, g = 0.045, kind = 'steam' } = o, r = sfxRng(o, t, 'hiss'), sd = r() * 1e6 | 0, steam = kind !== 'vent';
    const at = steam ? 0.015 : Math.min(0.25, dur / 3), rel = dur * (steam ? 0.35 : 0.3), rate = rr(r, 18, 34);
    synth(ac, out, t, dur, (d, q) => noiseInto(d, q, s => Math.min(1, s / at) * Math.min(1, (dur - s) / rel) * (1 + 0.35 * vnoise(s * rate, sd))), {
      g: g * (kind === 'vent' ? 1.2 : 0.6), r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: steam ? [{ type: 'highpass', f: rr(r, 2200, 3200), q: 0.6 }, { type: 'peaking', f: rr(r, 4500, 7000), q: 1.2, gain: 6 }]
        : [{ type: 'bandpass', f: rr(r, 1100, 1800), q: 0.6 }] }); },

  /* ---- new in v0.15: objects, liquids, machines (seeded; opts.seed fixes one exact sound) ---- */
  /** a compaction crack and grind: a tablet or grain under a press. dur = the grind; hard (0..1) = crack share */
  crunch(ac, out, t, o = {}) { const { dur = 0.55, g = 0.16, hard = 0.6 } = o, r = sfxRng(o, t, 'crunch');
    synth(ac, out, t, dur + 0.08, (d, q) => {
      for (let k = 0, n = 3 + (r() * 4 | 0); k < n; k++) DSP.burst(d, rr(q, 0, 0.025), rr(q, 0.6, 1) * (0.4 + hard), 0.004, rr(q, 0.0005, 0.0014), q);   // the crack: a few sharp fractures
      for (let k = 0, n = dur * rr(q, 260, 380) | 0; k < n; k++) { const s = 0.01 + dur * q() ** 1.6;                                             // the grind: decaying grains
        DSP.burst(d, s, rr(q, 0.08, 0.5) * (1 - s / (dur + 0.02)) ** 0.7, 0.005, rr(q, 0.0003, 0.0015), q); } },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.5, filters: [{ type: 'highpass', f: rr(r, 350, 550), q: 0.7 }, { type: 'peaking', f: rr(r, 1800, 2800), q: 0.8, gain: 5 }, { type: 'lowpass', f: rr(r, 5500, 7000), q: 0.6 }] });
    synth(ac, out, t, 0.36, (d, q) => { const f0 = rr(q, 85, 175), tau = rr(q, 0.03, 0.075), nz = rr(q, 0.15, 0.6), nt = rr(q, 0.03, 0.1);
      DSP.chirp(d, rr(q, 0, 0.012), 1, f0, f0 * rr(q, 0.35, 0.6), rr(q, 0.05, 0.14), tau, 0.34, q() * TAU); noiseInto(d, q, s => nz * Math.exp(-s / nt)); },
      { g: g * rr(r, 0.45, 0.85), r, filters: [{ type: 'lowpass', f: rr(r, 280, 520), q: 0.7 }] }); },                                              // the platen's body thud
  /** strained wood or steel: stick-slip pulses through the body's resonances. material 'wood' | 'steel' */
  creak(ac, out, t, o = {}) { const { dur = 0.8, g = 0.08, material = 'wood' } = o, r = sfxRng(o, t, 'creak'), steel = material === 'steel', sd = r() * 1e6 | 0;
    synth(ac, out, t, dur + 0.05, (d, q) => {
      const x = new Float32Array(d.length), base = steel ? rr(q, 140, 260) : rr(q, 55, 95);
      for (let s = 0.005; s < dur;) { const u = s / dur, F = Math.sin(Math.PI * u) ** 0.7;
        if (q() > 0.15 * (1 - F)) { const i = s * SR | 0; x[i] += F * rr(q, 0.6, 1); x[i + 1] -= F * 0.5; }
        s += 1 / (base * (0.7 + 0.6 * F) * (1 + 0.25 * vnoise(u * 6, sd))); }
      const fm = steel ? [[rr(q, 900, 1300), 15, 1], [rr(q, 2300, 2900), 25, 0.7], [rr(q, 4200, 5200), 40, 0.4]] : [[rr(q, 380, 520), 60, 1], [rr(q, 900, 1200), 110, 0.8], [rr(q, 2000, 2600), 200, 0.5]];
      for (const [f, bw, a] of fm) { const y = DSP.reson(x, f, bw); DSP.norm(y); for (let i = 0; i < d.length; i++) d[i] += a * y[i]; } },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: [{ type: 'highpass', f: 150 }] }); },
  /** one stroke of a hydraulic hand pump: lever clack, a rising fluid squeeze and whine, the valve click and a breath of release */
  pump(ac, out, t, o = {}) { const { dur = 0.9, g = 0.12 } = o, r = sfxRng(o, t, 'pump');
    synth(ac, out, t, dur + 0.2, (d, q) => {
      DSP.burst(d, 0, 0.8, 0.003, 0.0008, q); DSP.modes(d, 0, [[rr(q, 170, 210), 0.9, 0.04], [rr(q, 420, 500), 0.5, 0.03], [rr(q, 1000, 1300), 0.35, 0.015]]);
      const x = new Float32Array(d.length), f0 = rr(q, 160, 220), f1 = f0 * rr(q, 2.2, 2.8), wh = rr(q, 65, 80);
      noiseInto(x, q, s => s > 0.04 && s < dur ? Math.sin(Math.PI * ((s - 0.04) / (dur - 0.04)) ** 0.8) : 0);
      const y = DSP.reson(x, i => f0 * (f1 / f0) ** Math.min(1, i / (dur * SR)), 90); DSP.norm(y);
      let ph = 0; for (let i = 0; i < d.length; i++) { const s = i / SR, u = Math.min(1, s / dur), e = s > 0.04 && s < dur ? Math.sin(Math.PI * u) : 0;
        ph += TAU * wh * (1 + 0.5 * u) / SR; d[i] += 0.55 * y[i] + 0.12 * e * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.33 * Math.sin(3 * ph)); }
      const vc = dur * rr(q, 0.82, 0.9); DSP.burst(d, vc, 0.6, 0.002, 0.0005, q); DSP.modes(d, vc, [[rr(q, 2000, 2500), 0.3, 0.012], [rr(q, 3600, 4200), 0.2, 0.008]]);
      DSP.burst(d, vc + 0.01, 0.12, 0.15, 0.05, q); },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.5, filters: [{ type: 'highpass', f: 50 }] }); },
  /** a heater or instrument relay: armature click plus a contact bounce, ringing the metal frame. off: true = the softer release */
  relay(ac, out, t, o = {}) { const { g = 0.09, off = false } = o, r = sfxRng(o, t, 'relay');
    synth(ac, out, t, 0.12, (d, q) => { const k = off ? 1.25 : 1;
      for (const [s, a] of [[0, 1], [rr(q, 0.004, 0.009), rr(q, 0.3, 0.5)]]) { DSP.burst(d, s, a, 0.001, 0.00025, q);
        DSP.modes(d, s, [[rr(q, 1900, 2300) * k, 0.5 * a, 0.018], [rr(q, 3500, 4000) * k, 0.35 * a, 0.012], [rr(q, 5600, 6400) * k, 0.25 * a, 0.008], [rr(q, 300, 400), 0.3 * a, 0.01]]); } },
      { g: off ? g * 0.7 : g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.7 }); },
  /** a small object into liquid: a soft impact and the rising pitch of the cavity bubble, a few small bubbles after. size ~0.5..2 */
  plop(ac, out, t, o = {}) { const { g = 0.09, size = 1 } = o, r = sfxRng(o, t, 'plop');
    synth(ac, out, t, 0.35, (d, q) => { DSP.burst(d, 0, 0.35, 0.005, 0.0015, q); const f0 = rr(q, 350, 650) / size;
      DSP.chirp(d, rr(q, 0.008, 0.015), 1, f0, f0 * rr(q, 2.2, 2.9), rr(q, 0.05, 0.09), rr(q, 0.06, 0.1), 0.3);
      for (let k = 0, n = 1 + (q() * 3 | 0); k < n; k++) { const f = rr(q, 900, 2200); DSP.chirp(d, rr(q, 0.04, 0.15), rr(q, 0.15, 0.3), f, f * 2, 0.02, 0.02, 0.08); } },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.5, filters: [{ type: 'highpass', f: 120 }] }); },
  /** liquid moving in a vessel: surges of low wash with bubbles clustered on them */
  slosh(ac, out, t, o = {}) { const { dur = 0.9, g = 0.08 } = o, r = sfxRng(o, t, 'slosh');
    synth(ac, out, t, dur + 0.1, (d, q) => { const surges = [...Array(2 + (q() * 2 | 0))].map(() => [rr(q, 0.1, 0.85) * dur, rr(q, 0.06, 0.16), rr(q, 0.5, 1)]);
      const env = s => surges.reduce((a, [c, w, h]) => a + h * Math.exp(-(((s - c) / w) ** 2)), 0), x = new Float32Array(d.length); noiseInto(x, q, env);
      let lp = 0; for (let i = 0; i < d.length; i++) { lp += 0.08 * (x[i] - lp); d[i] += 1.2 * lp; }
      for (let k = 0, n = dur * rr(q, 25, 45) | 0; k < n; k++) { const [c, w, h] = surges[q() * surges.length | 0], f = rr(q, 300, 1400);
        DSP.chirp(d, Math.max(0, c + (q() * 2 - 1) * w * 1.5), rr(q, 0.04, 0.12) * h, f, f * rr(q, 1.8, 2.6), rr(q, 0.03, 0.06), rr(q, 0.02, 0.05), 0.15); } },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.5, filters: [{ type: 'bandpass', f: rr(r, 500, 750), q: 0.5 }] }); },
  /** an orbital shaker (or any small lab motor) running for dur: motor hum with harmonics and the glassware rattling once per orbit */
  shaker(ac, out, t, o = {}) { const { dur = 3, g = 0.045, rpm } = o, r = sfxRng(o, t, 'shaker'), orbit = (rpm ?? rr(r, 160, 220)) / 60, sd = r() * 1e6 | 0;
    synth(ac, out, t, dur, (d, q) => { const fm = rr(q, 45, 60), up = Math.min(0.5, dur / 4); let ph = 0;
      for (let i = 0; i < d.length; i++) { const s = i / SR, e = Math.min(1, s / up, (dur - s) / up); ph += TAU * fm * (0.3 + 0.7 * e) * (1 + 0.01 * vnoise(s * 3, sd)) / SR;
        let v = 0; for (let h = 1; h <= 6; h++) v += Math.sin(h * ph) / h; d[i] += 0.12 * e * v; }
      const glass = [rr(q, 2200, 2800), rr(q, 3000, 3800)], hit = (s, a) => { const f = glass[q() * 2 | 0] * semis(q, 0.5);
        DSP.burst(d, s, a, 0.0006, 0.0002, q); DSP.modes(d, s, [[f, a * 1.2, 0.006], [f * rr(q, 2.5, 2.9), a * 0.5, 0.004]]); };
      for (let s = up * 0.6; s < dur - up * 0.5; s += (1 / orbit) * rr(q, 0.92, 1.08))                            // each orbit the flasks knock: a cluster of hits
        for (let k = 0, n = 2 + (q() * 4 | 0); k < n; k++) hit(s + rr(q, 0, 0.06), rr(q, 0.25, 0.6));
      for (let s = up; s < dur - up; s += rr(q, 0.02, 0.08)) hit(s, rr(q, 0.05, 0.15)); },                   // and a light continuous rattle
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.5, filters: [{ type: 'lowpass', f: 7000 }], fade: 0.01 }); },
  /** glass on glass: two struck glasses ringing at their own inharmonic modes. f = the first glass's lowest mode */
  clink(ac, out, t, o = {}) { const { g = 0.07 } = o, r = sfxRng(o, t, 'clink');
    synth(ac, out, t, 1.4, (d, q) => { DSP.burst(d, 0, 0.4, 0.0008, 0.0002, q);
      const glass = (f, a, s) => DSP.modes(d, s, [[f, a, rr(q, 0.5, 0.9)], [f * rr(q, 2.3, 2.7), a * 0.5, 0.35], [f * rr(q, 4.2, 4.9), a * 0.3, 0.2], [f * rr(q, 6.6, 7.6), a * 0.15, 0.1]]);
      const f1 = o.f ?? rr(q, 1800, 3000); glass(f1, 1, 0); glass(f1 * rr(q, 1.07, 1.3), 0.6, rr(q, 0, 0.003)); },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: [{ type: 'highpass', f: 600 }] }); },
  /** water poured into a vessel for dur: a stream of bubbles over a wash whose resonance rises as the vessel fills */
  pour(ac, out, t, o = {}) { const { dur = 2, g = 0.06 } = o, r = sfxRng(o, t, 'pour'), at = Math.min(0.15, dur / 4), rel = Math.min(0.3, dur / 3);
    const env = s => Math.min(1, s / at, (dur - s) / rel);
    synth(ac, out, t, dur, (d, q) => noiseInto(d, q, s => Math.max(0, env(s)) * (1 + 0.3 * Math.sin(s * rr(q, 20, 30)))),
      { g: g * 0.7, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.4, filters: [{ type: 'bandpass', f: rr(r, 350, 450), f1: rr(r, 1100, 1500), q: 1.2 }] });
    synth(ac, out, t, dur + 0.1, (d, q) => { for (let k = 0, n = dur * rr(q, 50, 80) | 0; k < n; k++) { const s = q() * dur, u = s / dur, f = rr(q, 500, 2500) * (1 + 0.6 * u);
        DSP.chirp(d, s, rr(q, 0.1, 0.35) * Math.max(0, env(s)), f, f * rr(q, 1.6, 2.4), rr(q, 0.01, 0.03), rr(q, 0.01, 0.03), 0.1); } },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.4, filters: [{ type: 'highpass', f: 300 }] }); },
  /** a blister pack pressed until the foil gives: crinkle, the pop through the foil, a little crinkle after */
  foil(ac, out, t, o = {}) { const { g = 0.1 } = o, r = sfxRng(o, t, 'foil');
    synth(ac, out, t, 0.25, (d, q) => { const p = rr(q, 0.07, 0.11);
      for (let k = 0, n = 6 + (q() * 7 | 0); k < n; k++) DSP.burst(d, q() * p, rr(q, 0.15, 0.35), 0.0015, rr(q, 0.0003, 0.0012), q);
      DSP.burst(d, p, 1, 0.003, 0.0005, q); DSP.modes(d, p, [[rr(q, 1300, 1900), 0.45, 0.03], [rr(q, 3100, 3900), 0.25, 0.015]]);
      for (let k = 0, n = 3 + (q() * 4 | 0); k < n; k++) DSP.burst(d, p + rr(q, 0.005, 0.06), rr(q, 0.08, 0.2), 0.0012, 0.0004, q); },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: [{ type: 'highpass', f: 600 }] }); },
  /** one water drop: a tiny impact and a damped sine that rises in pitch (a Minnaert bubble). f = starting pitch */
  droplet(ac, out, t, o = {}) { const { g = 0.07 } = o, r = sfxRng(o, t, 'droplet');
    synth(ac, out, t, 0.3, (d, q) => { const f0 = o.f ?? rr(q, 700, 1600); DSP.burst(d, 0, 0.15, 0.001, 0.0003, q);
      DSP.chirp(d, 0.002, 1, f0, f0 * rr(q, 1.8, 2.7), rr(q, 0.03, 0.06), rr(q, 0.035, 0.07), 0.28); },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: [{ type: 'highpass', f: 300 }] }); },
  /** a page turned: a rising, fluttering swish of air and the soft slap of the page landing */
  pageFlip(ac, out, t, o = {}) { const { dur = 0.45, g = 0.11 } = o, r = sfxRng(o, t, 'pageFlip'), sd = r() * 1e6 | 0;
    synth(ac, out, t, dur + 0.04, (d, q) => { const fl = rr(q, 25, 40);
      noiseInto(d, q, s => Math.sin(Math.PI * Math.min(1, s / (dur * 0.85))) ** 2 * (0.6 + 0.4 * Math.max(0, vnoise(s * fl, sd)) * 2));
      DSP.burst(d, dur * rr(q, 0.8, 0.9), 1.4, 0.012, 0.003, q); },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: [{ type: 'bandpass', f: rr(r, 900, 1300), f1: rr(r, 3500, 5000), q: 0.8 }] }); },
  /** a clothes peg: a scrape of the spring, the woody snap and a faint ring of the coil */
  pegSnap(ac, out, t, o = {}) { const { g = 0.09 } = o, r = sfxRng(o, t, 'pegSnap');
    synth(ac, out, t, 0.25, (d, q) => { const x = new Float32Array(d.length); DSP.burst(x, 0, 1, 0.015, 0.006, q); const y = DSP.reson(x, rr(q, 4500, 5500), 400); DSP.norm(y);
      for (let i = 0; i < d.length; i++) d[i] += 0.2 * y[i];
      const s = rr(q, 0.015, 0.03); DSP.burst(d, s, 1, 0.001, 0.0003, q);
      DSP.modes(d, s, [[rr(q, 800, 1000), 0.7, 0.02], [rr(q, 2100, 2600), 0.5, 0.012], [rr(q, 4000, 4600), 0.2, 0.006], [rr(q, 3000, 3400), 0.12, 0.08], [rr(q, 5000, 5400), 0.07, 0.05]]); },
      { g, r, pan: panOf(t, typeof o === 'object' ? o : null) * 0.6, filters: [{ type: 'highpass', f: 200 }] }); },

  /** simple pad (fixed notes); prefer padKey */
  pad(ac, out, t, { dur = 8, notes = [220, 277.2, 329.6], g = 0.022, dark = false }) { SFX.padKey(ac, out, t, { dur, tonic: notes[0], chord: notes.map(f => 12 * Math.log2(f / notes[0])), g, dark }); },
  /** stereo pad in a key: chord = semitones over tonic; sine+triangle pairs, detuned and panned */
  padKey(ac, out, t, { dur = 8, tonic = 220, chord = [0, 4, 7], g = 0.02, dark = false, oct = 0 } = {}) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = dark ? 650 : 1500; lp.connect(out);
    chord.forEach((semi, i) => { const f = tonic * 2 ** (semi / 12 + oct); [-0.6, 0.6].forEach((pan, j) => {
      const o = ac.createOscillator(), v = ac.createGain(), pn = ac.createStereoPanner(); o.type = j ? 'triangle' : 'sine'; o.frequency.value = f * (1 + (j ? 0.0028 : -0.0018)); pn.pan.value = pan * (i % 2 ? -1 : 1);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g / (j + 1.4), t + 1.4); v.gain.setValueAtTime(g / (j + 1.4), t + Math.max(1.4, dur - 0.7)); v.gain.linearRampToValueAtTime(0, t + dur + 0.4);
      o.connect(v).connect(pn).connect(lp); o.start(t); o.stop(t + dur + 0.5); }); });
  },
};
/*
 * Instruments: pitched notes in the film's key, one note per call, varied per call like the effects above (a fixed
 * `seed` repeats one exact note). Every instrument takes (ac, out, t, { f, deg, oct, tonic, g, pan, decay, seed }):
 * `f` is the pitch in Hz; without it, `deg` (a degree of note()'s scale, 0 = the tonic) is played in the film's key
 * (`tonic`, else music.tonic, else 220 Hz), `oct` octaves above the tonic (each instrument has a home octave).
 * `g` is the note's peak and `decay` stretches or shortens its ring (1 = as built). The pitch is exact: small per-call
 * changes are in level, timbre and ring, never more than 2 cents of pitch (the tuning test allows 5).
 * How they are made:
 *   - struck bars and tines (marimba, vibes, glock, celesta, musicBox, kalimba): modal synthesis, a few decaying sines
 *     at the object's mode ratios (a marimba bar tuned near 1 : 3.9 : 9.2, a free steel bar 1 : 2.756 : 5.404, after
 *     Fletcher & Rossing, The Physics of Musical Instruments, 1998), each dying at its own rate, plus the mallet's click;
 *   - epiano: two-operator FM (Chowning, JAES 1973) with a decaying index, bright at the strike and mellowing;
 *   - pluck: Karplus-Strong (CMJ 1983), a noise burst circulating in a delay line that loses treble each pass, with the
 *     allpass fine-tuning of Jaffe & Smith (CMJ 1983) so high notes stay in tune; low notes make a soft bass;
 *   - feltPiano: partials stretched by string stiffness (f_n = n f sqrt(1 + B n^2), Fletcher et al., JASA 1962), two
 *     strings per note a hair apart so they beat, a quick and a slow decay, a soft felt onset;
 *   - strings: three detuned sawtooth oscillators per note through a slowly opening filter, with vibrato, spread wide.
 */
/** the film's key: opts.tonic, else music.tonic, else 220 Hz (A3) */
const tonicOf = o => (o && o.tonic) || (STORY && STORY.music && STORY.music.tonic) || 220;
/** an instrument's pitch: opts.f in Hz, else degree opts.deg of the film's key, opts.oct octaves up (home: the instrument's own) */
const pitchOf = (o, home) => o.f ?? note(tonicOf(o) * 2 ** (o.oct ?? home), o.deg ?? 0);
const softOnset = (d, n) => { for (let i = 0, m = Math.min(n, d.length); i < m; i++) d[i] *= i / m; };
const INST = {
  /** marimba: a rosewood bar over a tube, soft mallet, short and woody. hard 0..1 = mallet hardness */
  marimba(ac, out, t, o = {}) { const { g = 0.07, pan = 0, decay = 1, hard = 0.5 } = o, r = sfxRng(o, t, 'marimba'), f = pitchOf(o, 1) * semis(r, 0.02);
    const tau = clamp(0.5 * Math.sqrt(262 / f), 0.12, 0.8) * decay;
    synth(ac, out, t, tau * 5, (d, q) => { DSP.modes(d, 0, [[f, 1, tau], [f * rr(q, 3.88, 3.98), rr(q, 0.14, 0.26) * (0.6 + 0.8 * hard), tau * 0.22], [f * rr(q, 9.0, 9.3), 0.05 * (0.4 + 1.2 * hard), tau * 0.07]]);
      DSP.burst(d, 0, rr(q, 0.15, 0.3) * (0.4 + 1.2 * hard), 0.008, 0.0015, q); }, { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'lowpass', f: Math.min(9000, f * 10), q: 0.5 }] }); },
  /** vibraphone: a long aluminium bar with the motor's tremolo (trem Hz, 0 = motor off) */
  vibes(ac, out, t, o = {}) { const { g = 0.05, pan = 0, decay = 1, trem = 5.2 } = o, r = sfxRng(o, t, 'vibes'), f = pitchOf(o, 1), tau = clamp(1.5 * Math.sqrt(262 / f), 0.5, 2.4) * decay;
    synth(ac, out, t, tau * 3.5, (d, q) => { DSP.modes(d, 0, [[f, 1, tau], [f * 4.0, rr(q, 0.07, 0.13), tau * 0.15], [f * 10, 0.025, tau * 0.05]]);
      const ph = q() * TAU, rate = trem * rr(q, 0.97, 1.03); if (trem > 0) for (let i = 0; i < d.length; i++) d[i] *= 1 - 0.3 * (0.5 + 0.5 * Math.sin(TAU * rate * i / SR + ph)); },
      { g: g * rr(r, 0.9, 1.05), r, pan }); },
  /** music box: a plucked steel comb tine, bright, with its high inharmonic partial and the pin's click */
  musicBox(ac, out, t, o = {}) { const { g = 0.05, pan = 0, decay = 1 } = o, r = sfxRng(o, t, 'musicBox'), f = pitchOf(o, 2), tau = clamp(0.9 * Math.sqrt(1046 / f), 0.3, 1.4) * decay;
    synth(ac, out, t, tau * 4, (d, q) => { DSP.modes(d, 0, [[f, 1, tau], [f * 1.0025, rr(q, 0.25, 0.4), tau], [f * rr(q, 5.9, 6.3), 0.16, tau * 0.12], [f * rr(q, 16.5, 17.5), 0.04, tau * 0.03]]);
      DSP.burst(d, 0, rr(q, 0.08, 0.15), 0.004, 0.0008, q); }, { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'highpass', f: 250 }] }); },
  /** kalimba: a thumb-plucked tine over a wooden box, warm, with a quick high overtone and the box's knock */
  kalimba(ac, out, t, o = {}) { const { g = 0.06, pan = 0, decay = 1 } = o, r = sfxRng(o, t, 'kalimba'), f = pitchOf(o, 1), tau = clamp(0.8 * Math.sqrt(523 / f), 0.3, 1.2) * decay;
    synth(ac, out, t, tau * 4, (d, q) => { DSP.modes(d, 0, [[f, 1, tau], [f * rr(q, 5.8, 6.1), rr(q, 0.16, 0.28), tau * 0.07], [f * 2, 0.05, tau * 0.3]]);
      DSP.chirp(d, 0, rr(q, 0.14, 0.22), rr(q, 165, 195), 120, 0.02, 0.012, 0.06); }, { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'lowpass', f: 6000, q: 0.5 }] }); },
  /** celesta: felt hammers on steel bars over resonators: a soft, round bell */
  celesta(ac, out, t, o = {}) { const { g = 0.05, pan = 0, decay = 1 } = o, r = sfxRng(o, t, 'celesta'), f = pitchOf(o, 2), tau = clamp(1.1 * Math.sqrt(1046 / f), 0.4, 1.6) * decay;
    synth(ac, out, t, tau * 4, (d, q) => { DSP.modes(d, 0, [[f, 1, tau], [f * 2.0, rr(q, 0.09, 0.15), tau * 0.4], [f * rr(q, 2.72, 2.78), 0.06, tau * 0.25]]); softOnset(d, 96); },
      { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'lowpass', f: 7000 }] }); },
  /** glockenspiel: a hard mallet on free steel bars, bright and ringing. hard 0..1 = mallet hardness */
  glock(ac, out, t, o = {}) { const { g = 0.045, pan = 0, decay = 1, hard = 0.6 } = o, r = sfxRng(o, t, 'glock'), f = pitchOf(o, 3), tau = clamp(1.4 * Math.sqrt(1568 / f), 0.5, 2) * decay;
    synth(ac, out, t, tau * 4, (d, q) => { DSP.modes(d, 0, [[f, 1, tau], [f * 2.756, rr(q, 0.24, 0.36) * (0.5 + hard), tau * 0.45], [f * 5.404, 0.12 * (0.4 + hard), tau * 0.18]]);
      DSP.burst(d, 0, 0.1 * (0.5 + hard), 0.003, 0.0006, q); }, { g: g * rr(r, 0.85, 1.05), r, pan }); },
  /** electric piano: two-operator FM with a decaying index, plus the tine's short high ding. vel 0..1 = how hard it is played */
  epiano(ac, out, t, o = {}) { const { g = 0.05, pan = 0, decay = 1, vel = 0.6 } = o, r = sfxRng(o, t, 'epiano'), f = pitchOf(o, 1), tau = (0.9 * Math.sqrt(262 / f) + 0.5) * decay;
    synth(ac, out, t, tau * 3, (d, q) => { const i0 = (1.2 + 2.2 * vel) * rr(q, 0.9, 1.1), p0 = q() * TAU, bark = rr(q, 0.08, 0.16); let pc = p0, pm = 0;
      for (let i = 0; i < d.length; i++) { const s = i / SR, idx = i0 * Math.exp(-s / 0.3) + 0.35; pm += TAU * f / SR; pc += TAU * f * 1.0007 / SR;
        d[i] = Math.exp(-s / tau) * Math.min(1, i / 80) * (Math.sin(pc + idx * Math.sin(pm)) + bark * Math.exp(-s / 0.05) * Math.sin(TAU * f * 14 * s)); } },
      { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'lowpass', f: 4500, q: 0.5 }, { type: 'highpass', f: 40, q: 0.5 }] }); },
  /** plucked string: harp-like when bright, a soft bass when low. bright 0..1, t60 = seconds to die away (default by pitch) */
  pluck(ac, out, t, o = {}) { const { g = 0.06, pan = 0, decay = 1, bright = 0.5 } = o, r = sfxRng(o, t, 'pluck'), f = pitchOf(o, 0), T = o.t60 ?? clamp(1.8 * Math.sqrt(220 / f), 0.5, 3) * decay;
    synth(ac, out, t, T, (d, q) => { const P = SR / f, N = Math.max(2, Math.floor(P - 0.6)), D = P - 0.5 - N, C = (1 - D) / (1 + D), buf = new Float32Array(N);
      let lp = 0; for (let i = 0; i < N; i++) { lp += (q() * 2 - 1 - lp) * (0.15 + 0.75 * bright); buf[i] = lp; }
      const loss = 0.001 ** (1 / (T * f)); let p = 0, prev = 0, ax = 0, ay = 0;
      for (let i = 0; i < d.length; i++) { const y = buf[p], avg = 0.5 * (y + prev); prev = y; const ap = C * avg + ax - C * ay; ax = avg; ay = ap; buf[p] = ap * loss; p = (p + 1) % N; d[i] = y; } },
      { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'lowpass', f: 1500 + 6000 * bright, q: 0.5 }] }); },
  /** felt piano: a soft, intimate upright with felt over the hammers. vel 0..1 = how hard it is played */
  feltPiano(ac, out, t, o = {}) { const { g = 0.06, pan = 0, decay = 1, vel = 0.5 } = o, r = sfxRng(o, t, 'feltPiano'), f = pitchOf(o, 0), slow = clamp(2.6 * Math.sqrt(262 / f), 0.8, 4) * decay;
    synth(ac, out, t, slow * 2.2, (d, q) => { const B = 0.0004, list = [];
      for (let n = 1; n <= 10; n++) { const fn = n * f * Math.sqrt(1 + B * n * n); if (fn > 6000) break; const a = n ** -1.4 * Math.exp(-(n - 1) * (0.9 - vel) * 0.6), dt = 0.0006 * rr(q, 0.6, 1.4);
        list.push([fn * (1 - dt), a * 0.45, slow / n ** 0.6], [fn * (1 + dt), a * 0.45, slow / n ** 0.6], [fn, a * 0.5, 0.2 / n ** 0.5]); }
      DSP.modes(d, 0, list); DSP.chirp(d, 0, rr(q, 0.07, 0.13), rr(q, 125, 155), 90, 0.03, 0.02, 0.08); softOnset(d, 200); },
      { g: g * rr(r, 0.85, 1.05), r, pan, filters: [{ type: 'lowpass', f: Math.min(5000, f * 5 + 800 * vel), q: 0.5 }] }); },
  /** string section: one note (f or deg) or a chord (notes: [Hz, ...]; the film's I chord when neither is given), swelling in over
   *  att s, held for dur s, released over rel s. bright 0..1 opens the filter */
  strings(ac, out, t, o = {}) { const { dur = 3, g = 0.01, att = 1.4, rel = 1.2, bright = 0.5, pan = 0 } = o, r = sfxRng(o, t, 'strings'), ton = tonicOf(o);
    const notes = o.notes || (o.f != null || o.deg != null ? [pitchOf(o, 0)] : [0, 4, 7].map(s => ton * 2 ** (s / 12 + (o.oct ?? 0))));
    const lp = ac.createBiquadFilter(), hp = ac.createBiquadFilter(), top = (1200 + 1800 * bright) * rr(r, 0.9, 1.1); lp.type = 'lowpass'; lp.Q.value = 0.6; hp.type = 'highpass'; hp.frequency.value = 110;
    lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(top, t + Math.min(dur, att * 2)); lp.frequency.linearRampToValueAtTime(900, t + dur + rel);
    lp.connect(hp).connect(out);
    const spread = rr(r, 0.8, 1.2), v0 = g * rr(r, 0.9, 1.05);
    notes.forEach((nf, i) => [-9, 0, 8].forEach((cents, j) => { const os = ac.createOscillator(), v = ac.createGain(), pn = ac.createStereoPanner(), lfo = ac.createOscillator(), lg = ac.createGain();
      os.type = 'sawtooth'; os.frequency.value = nf; os.detune.value = cents * spread; lfo.frequency.value = (4.8 + 0.3 * j + 0.2 * i) * rr(r, 0.95, 1.05); lg.gain.value = 5; lfo.connect(lg).connect(os.detune);
      pn.pan.value = clamp(pan + (j - 1) * 0.6 + (i % 2 ? 0.2 : -0.2), -1, 1);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(v0, t + att); v.gain.setValueAtTime(v0, t + Math.max(att, dur)); v.gain.linearRampToValueAtTime(0, t + Math.max(att, dur) + rel);
      os.connect(v).connect(pn).connect(lp); os.start(t); lfo.start(t); os.stop(t + Math.max(att, dur) + rel + 0.1); lfo.stop(t + Math.max(att, dur) + rel + 0.1); })); },
};
/*
 * Stingers: short musical phrases in the film's key, for moments that are musical rather than physical. Each takes
 * (ac, out, t, { tonic, g, seed, ... }) where `g` scales the whole phrase (1 = as balanced here), and varies per call
 * (a fixed `seed` repeats the exact phrase, for a callback). They are built from the instruments above.
 *   motif    the hero's four notes (degs, on inst), when the hero first appears; vary degs when it changes, resolve at the end
 *   success  a quick rising arpeggio: something works, a step completes
 *   question two rising notes that do not resolve: a question is posed, a mystery opens
 *   oops     a falling half step on a muted string: a myth crossed out, a failed attempt
 *   reveal   a reversed swell that starts `lead` s early and ends exactly on t, then a low boom, a bright chord and a
 *            string swell: the big reveal (at most one or two per film). The bed ducks under it
 *   resolve  a rolled felt-piano chord and a music-box sparkle: the end card
 */
const STING = {
  motif(ac, out, t, o = {}) { const { degs = [2, 3, 4, 6], inst = 'musicBox', step = 0.22, g = 1 } = o, r = sfxRng(o, t, 'motif'), tonic = tonicOf(o);
    let s = 0; degs.forEach((deg, i) => { INST[inst](ac, out, t + s, { deg, oct: o.oct, tonic, g: (INST_G[inst] || 0.05) * g * (i === degs.length - 1 ? 1.1 : 1), pan: (i - (degs.length - 1) / 2) * 0.2,
      seed: o.seed != null ? o.seed * 16 + i : undefined }); s += step * rr(r, 0.96, 1.04); }); },
  success(ac, out, t, o = {}) { const { inst = 'marimba', g = 1 } = o, r = sfxRng(o, t, 'success'), tonic = tonicOf(o), step = rr(r, 0.07, 0.09);
    [0, 2, 3, 5].forEach((deg, i) => INST[inst](ac, out, t + i * step, { deg, tonic, g: (INST_G[inst] || 0.06) * g * (i === 3 ? 1.2 : 0.9), pan: (i - 1.5) * 0.15, seed: o.seed != null ? o.seed * 16 + i : undefined })); },
  question(ac, out, t, o = {}) { const { inst = 'epiano', g = 1 } = o, r = sfxRng(o, t, 'question'), tonic = tonicOf(o), gap = rr(r, 0.25, 0.31);
    [1, 4].forEach((deg, i) => INST[inst](ac, out, t + i * gap, { deg, tonic, g: (INST_G[inst] || 0.05) * g, vel: 0.45, pan: i ? 0.15 : -0.15, seed: o.seed != null ? o.seed * 16 + i : undefined })); },
  oops(ac, out, t, o = {}) { const { g = 1 } = o, r = sfxRng(o, t, 'oops'), tonic = tonicOf(o), gap = rr(r, 0.2, 0.24);
    INST.pluck(ac, out, t, { f: tonic * 2 ** (3 / 12), g: 0.07 * g, bright: 0.3, t60: 0.5, seed: o.seed != null ? o.seed * 16 : undefined });
    INST.pluck(ac, out, t + gap, { f: tonic * 2 ** (2 / 12), g: 0.07 * g, bright: 0.25, t60: 0.9, seed: o.seed != null ? o.seed * 16 + 1 : undefined }); },
  reveal(ac, out, t, o = {}) { const { lead = 1.4, g = 1 } = o, r = sfxRng(o, t, 'reveal'), tonic = tonicOf(o), t0 = Math.max(0, t - lead), L = t - t0, sd = k => o.seed != null ? o.seed * 16 + k : undefined;
    if (L > 0.05) { synth(ac, out, t0, L, (d, q) => noiseInto(d, q, s => (s / L) ** 3), { g: 0.06 * g, r, filters: [{ type: 'highpass', f: 1500 }, { type: 'bandpass', f: rr(r, 2600, 3400), f1: rr(r, 6000, 8000), q: 0.5 }] });
      SFX.tone(ac, out, t0, { f: tonic, f2: tonic * 2, dur: L, g: 0.02 * g, a: L * 0.9, type: 'triangle' }); }
    const boom = rr(r, 62, 78); synth(ac, out, t, 1.6, (d, q) => { DSP.chirp(d, 0, 1, boom, boom * 0.54, 0.3, 0.45, 1.6); DSP.burst(d, 0, 0.3, 0.05, 0.01, q); }, { g: 0.22 * g, r, filters: [{ type: 'lowpass', f: 600 }] });
    [0, 4, 7].forEach((s, i) => INST.glock(ac, out, t + i * rr(r, 0.01, 0.02), { f: tonic * 4 * 2 ** (s / 12), g: 0.035 * g, pan: (i - 1) * 0.5, seed: sd(i) }));
    INST.strings(ac, out, t, { tonic, dur: 2.2, g: 0.009 * g, att: 0.15, rel: 1.5, bright: 0.8, seed: sd(3) }); },
  resolve(ac, out, t, o = {}) { const { g = 1 } = o, r = sfxRng(o, t, 'resolve'), tonic = tonicOf(o), roll = rr(r, 0.06, 0.08);
    [0, 7, 12, 14, 16].forEach((s, i) => INST.feltPiano(ac, out, t + i * roll, { f: tonic / 2 * 2 ** (s / 12), g: 0.06 * g * (i ? 0.7 : 1), vel: 0.4, seed: o.seed != null ? o.seed * 16 + i : undefined }));
    [5, 7].forEach((deg, i) => INST.musicBox(ac, out, t + 0.6 + i * 0.25, { deg, oct: 2, tonic, g: 0.03 * g, seed: o.seed != null ? o.seed * 16 + 8 + i : undefined })); },
};
/** each instrument's default note level, so a stinger played on another instrument keeps its balance */
const INST_G = { marimba: 0.07, vibes: 0.05, musicBox: 0.05, kalimba: 0.06, celesta: 0.05, glock: 0.045, epiano: 0.05, pluck: 0.06, feltPiano: 0.06, strings: 0.01 };
Object.assign(SFX, INST, STING);   // plates cue them by name: cues: [[1.2, 'marimba', { deg: 2 }], [3.0, 'reveal']]
/*
 * Ambience beds, in the plate `bed` shape: `bed: BED.rain`, or with options `bed: (ac, o, t, d) => BED.rain(ac, o, t, d, { heavy: 0.8 })`.
 * Layer several with BED.mix(BED.roomTone, myPad). They fade in and out over about a second, so neighbours crossfade.
 * Left and right are synthesized separately (decorrelated), so a bed is really stereo.
 */
const BED = {
  /** lab or office air: low air-handling rush, a fridge or transformer hum at the mains frequency (hum: 50 or 60) and its harmonics */
  roomTone(ac, out, t0, dur, o = {}) { const { g = 0.02, hum = 50, fridge = true } = o, r = sfxRng(o, t0, 'roomTone');
    [-0.7, 0.7].forEach(pan => synth(ac, out, t0, dur, (d, q) => noiseInto(d, q, () => 1), { g: g * 1.6, r, pan, fade: Math.min(1, dur / 4), filters: [{ type: 'lowpass', f: rr(r, 350, 500), q: 0.5 }, { type: 'highpass', f: 60 }] }));
    if (fridge) synth(ac, out, t0, dur, (d, q) => { const sd = q() * 1e6 | 0, amps = [0.4, 1, 0.35, 0.2, 0.1];
      for (let i = 0; i < d.length; i++) { const s = i / SR, w = 0.8 + 0.2 * vnoise(s * 0.3, sd); let v = 0; amps.forEach((a, h) => v += a * Math.sin(TAU * hum * (h + 1) * s)); d[i] = v * w; } },
      { g: g * 0.5, r, fade: Math.min(1, dur / 4), pan: 0.15 }); },
  /** rain: a wash of noise and many small drop impacts (each a click and a tiny rising bubble), with the odd big drip. heavy 0..1 */
  rain(ac, out, t0, dur, o = {}) { const { g = 0.03, heavy = 0.5 } = o, r = sfxRng(o, t0, 'rain');
    [-0.75, 0.75].forEach(pan => synth(ac, out, t0, dur, (d, q) => { const rate = 60 + 190 * heavy;
      noiseInto(d, q, () => 0.18 + 0.12 * heavy);
      for (let s = q() / rate; s < dur - 0.05; s += -Math.log(1 - q() * 0.999) / rate) { DSP.burst(d, s, rr(q, 0.05, 0.3), 0.0006, 0.0002, q);
        if (q() < 0.5) { const f = rr(q, 2000, 6000); DSP.chirp(d, s + 0.0005, rr(q, 0.05, 0.25), f, f * 1.5, 0.005, 0.006, 0.03); } }
      for (let s = rr(q, 0.2, 1.5); s < dur - 0.3; s += rr(q, 0.5, 2)) { const f = rr(q, 700, 1500); DSP.chirp(d, s, rr(q, 0.3, 0.6), f, f * rr(q, 1.8, 2.5), 0.04, 0.05, 0.25); } },
      { g, r, pan, fade: Math.min(1, dur / 4), filters: [{ type: 'highpass', f: 400 }, { type: 'lowpass', f: 7000 }] })); },
  /** wind: noise whose level and colour follow slow random gusts, a low rumble and a faint whistle on the strong gusts. strength 0..1 */
  wind(ac, out, t0, dur, o = {}) { const { g = 0.035, strength = 0.5 } = o, r = sfxRng(o, t0, 'wind'), sd = r() * 1e6 | 0, rate = rr(r, 0.2, 0.4);
    const gust = s => 0.3 + 0.7 * ((vnoise(s * rate, sd) + 1) / 2) ** 1.5;
    [-0.6, 0.6].forEach((pan, j) => synth(ac, out, t0, dur, (d, q) => noiseInto(d, q, s => gust(s + j * 0.4)), { g: g * (0.8 + 0.4 * strength), r, pan, fade: Math.min(1.2, dur / 4),
      filters: [{ type: 'bandpass', f: 500, q: 0.8, curve: slowCurve(sd + j, dur, rate, 280, 700 + 500 * strength) }, { type: 'lowpass', f: 1400, q: 0.5 }] }));
    synth(ac, out, t0, dur, (d, q) => noiseInto(d, q, gust), { g: g * 0.8, r, fade: Math.min(1.2, dur / 4), filters: [{ type: 'lowpass', f: 160, q: 0.5 }] });
    if (strength > 0.3) synth(ac, out, t0, dur, (d, q) => noiseInto(d, q, s => gust(s) ** 3), { g: g * 0.25 * strength, r, pan: 0.3, fade: Math.min(1.2, dur / 4),
      filters: [{ type: 'bandpass', f: 800, q: 25, curve: slowCurve(sd, dur, rate, 650, 1150) }] }); },
  /** distant traffic: a low city rumble, a soft mid wash, and cars passing every few seconds across the stereo field */
  cityHum(ac, out, t0, dur, o = {}) { const { g = 0.03, cars = 1 } = o, r = sfxRng(o, t0, 'cityHum');
    [-0.7, 0.7].forEach(pan => synth(ac, out, t0, dur, (d, q) => noiseInto(d, q, () => 1), { g: g * 1.4, r, pan, fade: Math.min(1, dur / 4), filters: [{ type: 'lowpass', f: rr(r, 160, 240), q: 0.6 }, { type: 'highpass', f: 35 }] }));
    synth(ac, out, t0, dur, (d, q) => noiseInto(d, q, () => 1), { g: g * 0.3, r, fade: Math.min(1, dur / 4), filters: [{ type: 'bandpass', f: 500, q: 0.5 }] });
    for (let s = rr(r, 0, 2); s < dur - 1 && cars > 0; s += rr(r, 2.5, 6) / cars) { const len = Math.min(rr(r, 3, 6), dur - s), dir = r() < 0.5 ? -1 : 1, f = rr(r, 700, 1000);
      synth(ac, out, t0 + s, len, (d, q) => noiseInto(d, q, x => Math.sin(Math.PI * x / len) ** 3), { g: g * rr(r, 0.5, 1), r, pan: -0.8 * dir, pan1: 0.8 * dir,
        filters: [{ type: 'bandpass', f, f1: f * 0.6, q: 0.7 }] }); } },
  /** layer beds: bed: BED.mix(BED.roomTone, (ac, o, t, d) => SFX.pad(ac, o, t, { dur: d })) */
  mix: (...beds) => (ac, out, t0, dur) => beds.forEach(b => b(ac, out, t0, dur)),
};
/* transition sounds: each seam gets its own variation (the SFX above re-seed per call); a cut is a low tap of its own, not the contact thump */
const TRANS_SFX = {
  custom: (ac, o, t, d, tr) => tr.sfx ? tr.sfx(ac, o, t, d) : SFX.swell(ac, o, t, { dur: d, up: true }),
  through: (ac, o, t, d) => { SFX.glide(ac, o, t, { dur: d / 2, up: true }); SFX.glide(ac, o, t + d / 2, { dur: d / 2 }); },
  lensIn: (ac, o, t, d) => SFX.swell(ac, o, t - 0.05, { dur: d + 0.2, up: true }), lensOut: (ac, o, t, d) => SFX.swell(ac, o, t - 0.05, { dur: d + 0.2, up: false }),
  cut: (ac, o, t) => { const r = sfxRng({}, t, 'cut'); SFX.tone(ac, o, t, { f: rr(r, 120, 160), f2: rr(r, 55, 70), dur: rr(r, 0.12, 0.18), g: 0.2 }); SFX.tick(ac, o, t); },
  fade: () => {}, burn: (ac, o, t, d) => SFX.crackle(ac, o, t, { dur: d }),
  wipe: (ac, o, t, d, tr) => SFX.whoosh(ac, o, t, { dur: d, dir: tr.dir }), iris: (ac, o, t, d) => SFX.shutter(ac, o, t, { dur: d }),
  zoom: (ac, o, t, d, tr) => SFX.glide(ac, o, t, { dur: d, up: !zoomOut(tr) }),
  hatch: (ac, o, t, d) => { const r = sfxRng({}, t, 'hatch'); SFX.noise(ac, o, t, { dur: d, g: 0.06, f0: rr(r, 1000, 1400), f1: rr(r, 3000, 4000), q: 2, lfo: rr(r, 11, 17) }); },   // hatching strokes
  erase: (ac, o, t, d) => { const r = sfxRng({}, t, 'erase'); SFX.noise(ac, o, t, { dur: d, g: 0.07, f0: rr(r, 500, 700), f1: rr(r, 1600, 2200), q: 1.2, lfo: rr(r, 5, 7) }); },   // felt rubbing, one swipe per wobble
  page: (ac, o, t, d) => SFX.flick(ac, o, t, { dur: d }), roll: (ac, o, t, d) => SFX.flick(ac, o, t, { dur: d }), morph: (ac, o, t, d) => SFX.bend(ac, o, t, { dur: d }),
  shape: (ac, o, t, d) => { SFX.bend(ac, o, t, { dur: d }); SFX.swell(ac, o, t, { dur: d, up: true }); },
  bleed: (ac, o, t, d) => { const r = sfxRng({}, t, 'bleed'); SFX.noise(ac, o, t, { dur: d + 0.3, g: 0.07, f0: rr(r, 200, 300), f1: rr(r, 1200, 1700), q: 0.7, a: d * 0.5 }); SFX.tone(ac, o, t + d * 0.3, { f: rr(r, 95, 125), f2: 70, dur: 0.5, g: 0.06 }); },
  pan: (ac, o, t, d, tr) => SFX.whoosh(ac, o, t, { dur: d, dir: tr.dir === 'right' ? 'rl' : 'lr', g: 0.12 }),
};
/** default bed when a plate has none and STORY.music = {tonic}: the stage's chord, darker and lower at night */
function autoBed(p) {
  const m = STORY.music; if (!m) return null;
  const n = p.stage ? p.stage.n : p.i, chord = p.i === STORY.plates.length - 1 ? [0, 7, 12, 14] : PROG[(n - (p.stage ? 1 : 0) + PROG.length * 4) % PROG.length];
  return (ac, out, t0, dur) => { SFX.padKey(ac, out, t0, { dur, tonic: m.tonic || 220, chord, g: m.gain || 0.018, dark: p.dark, oct: p.dark ? -1 : 0 });
    if (p.dark) SFX.noise(ac, out, t0, { dur, g: 0.025, f0: 160, type: 'lowpass', q: 0.5, a: 1 }); };
}
/**
 * The film's loudness shape. defineStory({ dynamics: [[t, dB], ...] }) sets the master level over time (film seconds,
 * dB relative to the default, linear ramps between points), e.g. [[0, -3], [40, -3], [46, 3], [58, 3], [62, 0]] for a
 * quiet opening and a lift at the climax. Without it, a plate with `lift: dB` ramps up over its first 1.5 s and back down
 * over 1.5 s after it ends. Without either, the level is flat.
 */
function dynamicsOf() {
  const dyn = typeof STORY.dynamics === 'function' ? STORY.dynamics(STORY.plates) : STORY.dynamics;   // a function of the timed plates, for a narrated film
  if (Array.isArray(dyn) && dyn.length) return [...dyn].sort((a, b) => a[0] - b[0]);
  const pts = [];
  for (const p of STORY.plates) if (p.lift) pts.push([p.start, 0], [p.start + Math.min(1.5, p.dur / 2), p.lift], [p.start + p.dur, p.lift], [p.start + p.dur + 1.5, 0]);
  return pts;
}
/** cues that duck the bed: [depth, seconds]; a reveal's boom and chord get a deeper, longer dip */
const CUE_DUCK = { chime: [0.25, 0.35], pop: [0.25, 0.35], crunch: [0.25, 0.35], reveal: [0.4, 0.9] };
/**
 * renderAudio(opts): the whole track, offline. For a narrated film, opts.only = 'voice' or 'rest' renders one stem
 * (the narration alone, or everything else), without the final loudness pass, so a check can compare the two.
 */
async function renderAudio(opts = {}) {
  // defineStory({ silent: true }): the user chose no sound. The automatic risers, transition effects and header
  // scratches below would otherwise play anyway, so render a stereo track of silence of the right length instead.
  if (STORY.silent) return new OfflineAudioContext(2, Math.ceil(SR * (TOTAL_T + 0.5)), SR).startRendering();
  const ac = new OfflineAudioContext(2, Math.ceil(SR * (TOTAL_T + 0.5)), SR); ac._noise = noiseBuffer(ac, 6); AUDIO.reset();
  const track = voiceTrack(), clips = track.length ? await voiceBuffers(ac, track) : new Map(), voiced = clips.size > 0;   // decoded before the graph is built
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.knee.value = 6;
  // a narrated film sums the music-and-effects chain and the voice channel on a master bus after the compressor, so
  // the voice never pumps the music and the music never pumps the voice
  const master = voiced ? ac.createGain() : null;
  if (voiced) { const rest = ac.createGain(); rest.gain.value = opts.only === 'voice' ? 0 : 1; comp.connect(rest).connect(master); master.connect(ac.destination); }
  else comp.connect(ac.destination);
  const dry = ac.createGain(); dry.gain.value = 0.9; dry.connect(comp);
  const rv = makeReverb(ac), wet = ac.createGain(); wet.gain.value = 0.3; rv.connect(wet).connect(comp);
  const lift = ac.createGain(); lift.connect(dry); lift.connect(rv);                   // the film's loudness shape (dynamicsOf)
  const dyn = dynamicsOf(); lift.gain.setValueAtTime(dyn.length ? 10 ** (dyn[0][1] / 20) : 1, 0);
  for (const [t, dB] of dyn) lift.gain.exponentialRampToValueAtTime(10 ** (dB / 20), Math.max(0, t));   // exponential in gain = linear in dB, as documented
  const out = ac.createGain(); out.gain.value = 3.8; out.connect(lift);
  const bedBus = ac.createGain(); bedBus.gain.value = 1;                               // beds duck under transitions and cues
  let fx = out;                                                                        // effects, risers, seams and headers
  if (voiced) {                                                                        // and under every sentence of the narration
    const under = ac.createGain(); bedBus.connect(under).connect(out); speechDucks(track, under.gain, NARR.opts.duck);
    fx = ac.createGain(); fx.connect(out); speechDucks(track, fx.gain, NARR.opts.fxDuck);
    voiceChannel(ac, track, clips, master, opts);
  } else bedBus.connect(out);
  // Each duck dips to 1 - depth in 70 ms and recovers linearly by t + dur. Overlapping ducks combine as the deepest one
  // at each instant (a cue inside a transition's duck no longer snaps the bed back up): they are collected here and
  // written after the loop as one value curve per merged span, which starts and ends at 1.
  const ducks = [], duck = (t, depth = 0.55, dur = 0.5) => ducks.push([t, depth, dur]);
  const duckAt = x => ducks.reduce((v, [t, depth, dur]) => Math.min(v, x <= t - 0.02 || x >= t + dur ? 1
    : x < t + 0.05 ? 1 - depth * (x - t + 0.02) / 0.07 : 1 - depth * (t + dur - x) / (dur - 0.05)), 1);
  const writeDucks = () => { const spans = ducks.map(([t, , dur]) => [Math.max(0, t - 0.02), t + dur]).sort((a, b) => a[0] - b[0]), merged = [];
    for (const sp of spans) { const m = merged[merged.length - 1]; if (m && sp[0] <= m[1] + 0.01) m[1] = Math.max(m[1], sp[1]); else merged.push([...sp]); }
    for (const [a, b] of merged) { const n = Math.max(3, Math.ceil((b - a) / 0.005) + 1), c = new Float32Array(n);
      for (let i = 0; i < n; i++) c[i] = duckAt(a + (b - a) * i / (n - 1));
      c[0] = c[n - 1] = 1; bedBus.gain.setValueCurveAtTime(c, a, b - a); } };
  for (const p of STORY.plates) {
    const t0 = p.start, tr = p.enter, ty = tr?.type, d = tr?.dur || 0.5;
    AUDIO.plate = p.i; AUDIO.t0 = t0;                                                    // seeds are per plate (see sfxRng)
    if (p.i > 0) { AUDIO.tag = 'riser'; if (ty !== 'fade') SFX.riser(ac, fx, Math.max(0, t0 - 0.35));
      AUDIO.tag = 'transition'; (TRANS_SFX[ty] || TRANS_SFX.cut)(ac, fx, t0, d, tr || {}); duck(t0, 0.5, d + 0.4); }
    // the header types on with its paper's sound (ground.sfx.header): pen scratch on the notebook's paper, soft readout
    // blips at night where there is no pen. plate.pen: true / false forces the scratch / the blips, 'none' is silent
    if (p.header) { const hd = t0 + headerDelay(p), h = p.header, hs = p.pen === true ? 'scratch' : p.pen === false ? 'readout'
        : p._ground ? p._ground.sfx.header : p.dark ? 'readout' : 'scratch', s = SFX[hs] || SFX.scratch; AUDIO.tag = 'header';
      if (p.pen !== 'none') { s(ac, fx, hd, { chars: 9, cps: 30 }); s(ac, fx, hd + 0.15, { chars: h.title.length, cps: 17 }); if (h.sub) s(ac, fx, hd + 0.7, { chars: h.sub.length, cps: 30, g: hs === 'readout' ? 0.005 : 0.012 }); } }
    AUDIO.tag = 'bed'; const bed = p.bed || autoBed(p); if (bed) bed(ac, bedBus, t0, p.dur);
    AUDIO.tag = 'cue';
    for (const [ct, type, opt] of (p.cues || [])) { SFX[type](ac, fx, t0 + ct, opt || {}); const dk = CUE_DUCK[type]; if (dk) duck(t0 + ct, ...dk); }
  }
  writeDucks(); AUDIO.reset();
  const buf = await ac.startRendering();
  if (voiced && !opts.only) finishNarrated(buf);
  return buf;
}
/* ---------- the voice channel ---------- */
const VOICE_BUF = new Map();                                                           // decoded clips, shared by every render in the page
async function voiceBuffers(ac, track) {
  const out = new Map();
  for (const v of track) {
    if (out.has(v.id) || !v.unit.audio) continue;
    let c = VOICE_BUF.get(v.id);
    if (!c) { const bin = atob(v.unit.audio), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const buf = await ac.decodeAudioData(u8.buffer), d0 = buf.getChannelData(0);
      c = { buf, lufs: lufsOf(buf.numberOfChannels > 1 ? [d0, buf.getChannelData(1)] : [d0, d0]) };   // a mono clip plays in both channels
      VOICE_BUF.set(v.id, c); }
    out.set(v.id, c);
  }
  return out;
}
/** centred narration: each clip brought to VOICE.level (LUFS, measured on the clip, so clips from any provider match),
 *  then one chain for all of them: a high-pass (no rumble or plosive thumps), a gentle compressor, a touch of the room.
 *  The room is a copy of the effects' reverb (same impulse, same 0.3 wet level), fed and returned inside this channel,
 *  so the voice never reaches the music compressor and the 'voice' stem holds all of the voice */
function voiceChannel(ac, track, clips, master, opts) {
  const o = NARR.opts, bus = ac.createGain(); bus.gain.value = opts.only === 'rest' ? 0 : 1; bus.connect(master);
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7;
  const cmp = ac.createDynamicsCompressor(); cmp.threshold.value = -26; cmp.ratio.value = 2.5; cmp.knee.value = 10; cmp.attack.value = 0.005; cmp.release.value = 0.15;
  hp.connect(cmp).connect(bus);
  const send = ac.createGain(); send.gain.value = o.reverb * 0.3; cmp.connect(send).connect(makeReverb(ac)).connect(bus);
  for (const v of track) { const c = clips.get(v.id); if (!c) continue;
    const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = c.buf; g.gain.value = 10 ** ((o.level - c.lufs) / 20);
    s.connect(g).connect(hp); if (v.t0 >= 0) s.start(v.t0); else s.start(0, -v.t0); }
}
/** duck a gain under every sentence: down over 0.25 s before it starts, back up over 0.6 s after it ends; sentences
 *  closer than about a second share one duck, so the bed does not bob between them */
function speechDucks(track, param, db) {
  const g = 10 ** (-db / 20), spans = [], merged = [];
  for (const v of track) for (const [a, b] of v.sentences) spans.push([a, b]);
  spans.sort((x, y) => x[0] - y[0]);
  for (const s of spans) { const m = merged[merged.length - 1]; if (m && s[0] - 0.25 <= m[1] + 0.9) m[1] = Math.max(m[1], s[1]); else merged.push([...s]); }
  for (const [a, b] of merged) { const a0 = Math.max(0, a - 0.25), a1 = Math.max(a0 + 0.05, a), b1 = Math.max(b + 0.1, a1);
    param.setValueAtTime(1, a0); param.linearRampToValueAtTime(g, a1); param.setValueAtTime(g, b1); param.linearRampToValueAtTime(1, b1 + 0.6); }
}
/** integrated loudness in LUFS (ITU-R BS.1770-4, as EBU R128 measures it): K-weighting (the 48 kHz filters from the
 *  standard), 400 ms blocks every 100 ms, an absolute gate at -70 LUFS and a relative gate 10 LU below */
function lufsOf(chs) {
  const hop = SR / 10, n = chs[0].length, e = new Float64Array(Math.ceil(n / hop) + 1);
  for (const x of chs) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0;
    for (let i = 0; i < n; i++) { const v = x[i];
      const y = 1.53512485958697 * v - 2.69169618940638 * x1 + 1.19839281085285 * x2 + 1.69065929318241 * y1 - 0.73248077421585 * y2;
      const z = y - 2 * y1 + y2 + 1.99004745483398 * z1 - 0.99007225036621 * z2;
      x2 = x1; x1 = v; y2 = y1; y1 = y; z2 = z1; z1 = z; e[(i / hop) | 0] += z * z; } }
  const L = m => -0.691 + 10 * Math.log10(m), blocks = [];
  for (let b = 0; (b + 4) * hop <= n; b++) blocks.push((e[b] + e[b + 1] + e[b + 2] + e[b + 3]) / (4 * hop));
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length, abs = blocks.filter(m => L(m) > -70);
  if (!abs.length) return -70;
  const rel = L(mean(abs)) - 10, gated = abs.filter(m => L(m) > rel);
  return L(mean(gated));
}
/** a narrated film's last step: set the whole track to VOICE.lufs (about -16 LUFS, the usual target for web video
 *  and podcasts), then hold true peaks under VOICE.peak dBTP with a look-ahead limiter. Deterministic, like the rest. */
function finishNarrated(buf) {
  const chs = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), L = lufsOf(chs);
  if (!(L > -70)) return;
  const g = 10 ** ((NARR.opts.lufs - L) / 20); for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= g;
  limitPeaks(chs, NARR.opts.peak);
  window.__loudness = { before: +L.toFixed(2), gain: +(20 * Math.log10(g)).toFixed(2), target: NARR.opts.lufs, peak: NARR.opts.peak };
}
/** look-ahead peak limiter. The peak between samples (what a DAC or an AAC encoder produces) is estimated with a
 *  windowed-sinc interpolator at 4x; the gain reaches its value 5 ms before a peak (a sliding minimum, then a moving
 *  average of the same length, which can never overshoot) and recovers over about 80 ms */
function limitPeaks(chs, ceilDb) {
  const c = 10 ** (ceilDb / 20), n = chs[0].length, A = Math.round(0.005 * SR), T = 8;
  const K = [0.25, 0.5, 0.75].map(f => Array.from({ length: 2 * T }, (_, j) => { const k = j - T + 1, u = k - f, x = Math.PI * u;
    return (u === 0 ? 1 : Math.sin(x) / x) * (0.5 + 0.5 * Math.cos(Math.PI * u / T)); }));
  const need = new Float32Array(n).fill(1); let any = false;
  for (const d of chs) for (let i = 0; i < n; i++) {
    let pk = Math.abs(d[i]);
    if (pk > c * 0.6 || (i + 1 < n && Math.abs(d[i + 1]) > c * 0.6)) for (const k of K) { let s = 0;
      for (let j = 0; j < 2 * T; j++) { const q = i + j - T + 1; if (q >= 0 && q < n) s += d[q] * k[j]; }
      pk = Math.max(pk, Math.abs(s)); }
    if (pk > c) { any = true; need[i] = Math.min(need[i], c / pk); }
  }
  if (!any) return;
  const mn = new Float32Array(n), dq = new Int32Array(n); let h = 0, t = 0;              // mn[i] = min(need[i .. i + A])
  for (let i = n - 1; i >= 0; i--) { while (t > h && need[dq[t - 1]] >= need[i]) t--; dq[t++] = i; while (dq[h] > i + A) h++; mn[i] = need[dq[h]]; }
  const rel = 1 - Math.exp(-1 / (0.08 * SR)); let sum = 0, gPrev = 1;
  for (let i = 0; i < n; i++) { sum += mn[i] - (i >= A ? mn[i - A] : 1); const avg = (A + sum) / A;   // the average over [i - A + 1, i], counting 1 before the start
    const gi = Math.min(avg, gPrev + (1 - gPrev) * rel); gPrev = gi; for (const d of chs) d[i] *= gi; }
}
function makeReverb(ac) {
  const len = SR * 2.2, b = ac.createBuffer(2, len, SR), r = mulberry(5);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * (1 - i / len) ** 3; }
  const cv = ac.createConvolver(); cv.buffer = b; return cv;
}
function wavBytes(buf) {
  const n = buf.length, ch = buf.numberOfChannels, dv = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const ws = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, ch, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
  ws(36, 'data'); dv.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c)); let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { dv.setInt16(o, clamp(data[c][i], -1, 1) * 32767, true); o += 2; }
  return new Uint8Array(dv.buffer);
}
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }

/* ---------- boot: render hooks + preview player ---------- */
/**
 * Wait for the web fonts, but never forever: the Google Fonts stylesheet loads without blocking the page (shell.html
 * marks it data-state ok / failed), and a blocked or silent network gives up after FONT_WAIT ms. Missing faces are
 * detected by measuring text against two fallbacks (document.fonts.check() says true when a face was never declared)
 * and reported in window.__fontWarning, which render.mjs prints and the preview shows. Wall-clock time is fine here:
 * this runs once at boot, never inside renderFrame.
 * If any face is missing at the cap, the fallback is frozen: the Google stylesheet is removed, so no face that arrives
 * later can change frames mid-render. ?nofonts=1 freezes it at once (render.mjs passes it to extra workers when the
 * first page already fell back, so every page draws with the same faces without waiting the cap again).
 */
const FONT_WAIT = +(QS.get('fontwait') || 10000);
const FONT_PKG = { 'Fraunces': '@fontsource-variable/fraunces', 'Inter Tight': '@fontsource/inter-tight', 'IBM Plex Mono': '@fontsource/ibm-plex-mono' };
function missingFonts() {
  const g = document.createElement('canvas').getContext('2d'), probe = 'Hamburgefonstiv 0123 AQWxyz';
  return [['Fraunces', '500 40px'], ['Inter Tight', '400 40px'], ['IBM Plex Mono', '400 40px']].filter(([fam, spec]) =>
    ['monospace', 'serif'].every(fb => { g.font = `${spec} "${fam}", ${fb}`; const a = g.measureText(probe).width; g.font = `${spec} ${fb}`; return a === g.measureText(probe).width; }))
    .map(m => m[0]);
}
async function loadFonts() {
  const link = document.getElementById('webfonts'), state = link ? link.dataset.state : null;
  let missing, why;
  if (QS.has('nofonts') && link) { missing = Object.keys(FONT_PKG); why = 'fonts skipped (?nofonts); '; }   // embedded fonts are never skipped
  else {
    const late = new Promise(r => setTimeout(() => r('timeout'), FONT_WAIT));
    if (link && !link.dataset.state) await Promise.race([late, new Promise(r => { link.addEventListener('load', r); link.addEventListener('error', r); })]);
    await Promise.race([late, Promise.all(FONT_LOADS.map(f => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready)]);
    missing = missingFonts();
    why = link && link.dataset.state === 'failed' ? 'Google Fonts is blocked; ' : link ? 'Google Fonts did not answer; ' : '';
  }
  if (!missing.length) return;
  if (link) {                                              // freeze: drop the stylesheet so its faces are no longer declared
    link.remove(); for (const l of document.querySelectorAll('link[href*="fonts.g"]')) l.remove();
    for (const f of [...document.fonts]) if (f.status !== 'loaded') document.fonts.delete(f);   // non-CSS faces still loading
    await new Promise(r => setTimeout(r, 50));             // not document.fonts.ready: it never settles while a request hangs
    missing = missingFonts();                              // removing the sheet also drops faces that had loaded
  }
  window.__fontWarning = `fonts not loaded (${missing.join(', ')}): text uses fallback faces. ` + why +
    (link ? 'build with: python3 build.py story.js film.html --fonts local'
      : `the embedded fonts lack them: npm i ${missing.map(m => FONT_PKG[m]).join(' ')} in the film folder and rebuild with --fonts local`);
  console.warn(window.__fontWarning);
}
async function boot() {
  await loadFonts();
  buildTextures();
  window.__story = { fps: FPS, frames: TOTAL_F, width: W, height: H, title: STORY.title, silent: !!STORY.silent, starts: STORY.plates.map(p => ({ t: p.start, type: p.enter ? p.enter.type : null, dur: p.enter ? p.enter.dur : 0, settle: p.enter ? p.enter.settle ?? 0.9 : 0 })),
    narrated: voiceTrack().length > 0, animatic: ANIMATIC };
  window.__renderFrame = f => { renderFrame(f); return true; };
  window.__frameData = (f, type = 'image/jpeg', q = 0.94) => { renderFrame(f); return cvs.toDataURL(type, q).split(',')[1]; };
  window.__audioWav = async (o = {}) => b64(wavBytes(await renderAudio(o)));   // o.only: 'voice' | 'rest' for one stem of a narrated film
  /* ---- narration hooks (a film without embedded narration returns empty values) ----
   * __voice(): the narration on the film clock: [{ plate, id, t0, dur, sentences: [[t0, t1, text]], marks: { name: t } }]
   *   (film seconds), plus the warnings (a plate asking for a clip that is missing, an unused clip, a missing mark).
   * __srt(): captions as the text of an .srt file (render.mjs writes film.srt next to a narrated film's MP4). */
  window.__voice = () => ({ units: voiceTrack().map(({ unit, ...v }) => v), warnings: NARR.warnings, animatic: ANIMATIC,
    provider: NARR.data && NARR.data.provider, model: NARR.data && NARR.data.model, voice: NARR.data && NARR.data.voice });
  window.__srt = () => srtOf(captions());
  /* ---- speed_check probes: read-only, for toolkit/speed_check.mjs (references/motion.md, "Speed limits") ----
   * __camProbe(i, t): plate i's own composed camera at its local time t — camOf(pl,t) folded with momentum()
   *   and entryShift() (the lean into/out of a cut), i.e. exactly what drawPlate composes for that plate on
   *   its own, with no transition xf. { s: scale, dx, dy: px pan }. Sample across a plate's life for camera
   *   jumps, and just before/after a cut for a stall (film-grammar.md F8).
   * __seamProbe(i, u): the transition ENTERING plate i, at u = 0..1 of its own clock (same `raw` as
   *   renderFrame). Returns { type, p (eased progress), raw, ...} where the extra fields are the same
   *   scale/mask/pan quantities TRANS[type] computes for its own xf (read off the preset's own formulas with
   *   the engine's own E/zlerp/lerp/coverR — not a second implementation of the transition). This is the
   *   tunable part of a seam (dur, ease, k, dive, ...); a plate's own camera is __camProbe's job, not this
   *   one's, so the two are never multiplied together here. null before plate i, or when it has no enter. */
  window.__camProbe = (i, t) => {
    const pl = STORY.plates[i]; if (!pl) return null;
    const cam = camOf(pl, t) || { s: 1, dx: 0, dy: 0 }, ms = entryShift(pl, t), mo = momentum(pl, t) * (ms ? ms.s : 1);
    return { s: (cam.s ?? 1) * mo, dx: (cam.dx || 0) + (ms ? ms.dx : 0), dy: (cam.dy || 0) + (ms ? ms.dy : 0) };
  };
  window.__seamProbe = (i, u) => {
    const P = STORY.plates, pl = P[i]; if (!pl || i === 0) return null;
    const prev = P[i - 1], tr = pl.enter; if (!tr) return null;
    const dur = tr.dur || 0, raw = clamp(u), t = raw * dur, pt = prev.dur + t;
    const own = !!(tr.ease && EASED[tr.type]);
    const p = clamp(tr.curve ? curve(raw, tr.curve) : tr.ease && !own ? easeOf(tr.ease)(raw) : raw);
    const ez = (v, def) => own ? easeOf(tr.ease)(v) : def(v);
    const [ox, oy] = focusOf(prev, pt), [nx, ny] = focusOf(pl, t);
    const out = { type: tr.type, p, raw };
    switch (tr.type) {
      case 'lensIn': { const e = ez(p, E.arrive); out.scaleOld = zlerp(1, tr.dive ?? 2, e); out.maskR = lerp(16, coverR(ox, oy), e); break; }
      case 'lensOut': { const e = ez(p, E.arrive); out.scaleNew = zlerp(tr.dive ?? 2, 1, e); out.maskR = lerp(coverR(ox, oy), 20, e); break; }
      case 'zoom': { const e = ez(p, E.arriveSoft), k = tr.k ?? 3.5, isOut = zoomOut(tr);
        out.scaleOld = isOut ? zlerp(1, 1 / k, e) : zlerp(1, k, e); out.scaleNew = isOut ? zlerp(k, 1, e) : zlerp(1 / k, 1, e); break; }
      case 'shape': case 'morph': { const e = ez(p, E.arrive); out.scaleOld = zlerp(1, 1.6, e); out.scaleNew = zlerp(0.7, 1, e);
        out.maskR = lerp(6, coverR((ox + nx) / 2, (oy + ny) / 2), E.arrive(inv(0.05, 0.9, p))); break; }
      case 'iris': { let r; if (p < 0.46) r = lerp(coverR(ox, oy), 7, E.shaped(0.65, 2, 2)(p / 0.46));
        else if (p < 0.54) r = 7; else r = lerp(7, coverR(nx, ny), E.shaped(0.35, 2, 3)((p - 0.54) / 0.46));
        out.maskR = r; break; }
      case 'through': { const dive = tr.dive ?? 1.6, rise = tr.rise ?? 1.4;
        if (p < 0.46) out.scaleOld = zlerp(1, dive, E.in2(p / 0.46));
        else if (p < 0.49) out.scaleOld = dive;
        else out.scaleNew = zlerp(rise, 1, E.shaped(0.25, 2, 3)((p - 0.49) / 0.51)); break; }
      case 'pan': { let dir = tr.dir || 'auto';
        if (dir === 'auto') { const [vx, vy] = travelOf(prev, prev.dur - 1e-3);
          dir = Math.hypot(vx, vy) < 40 ? 'left' : Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'left' : 'right') : (vy > 0 ? 'up' : 'down'); }
        const vert = dir === 'up' || dir === 'down', sg = (dir === 'left' || dir === 'up') ? -1 : 1, span = vert ? H : W;
        const [mvx, mvy] = motionOf(prev, prev.dur - 1e-3), mv = vert ? mvy : mvx;
        const v0 = Math.sign(mv) === sg ? clamp(Math.abs(mv) * (dur || 0.8) / span, 0, 1.2) : 0;
        out.panOff = sg * span * ez(p, E.whip(v0));
        // where each plate's hero is on screen as the sheets slide, and its reticle size under its own camera:
        // speed_check warns when both are in frame at once (the hero seen twice, worst across a scale jump)
        const hs = (q, tq, [x, y], d) => { if (!q.hero) return null; const cam = camOf(q, tq), r = (q.hero(tq).r ?? 34) * (cam && cam.s ? cam.s : 1);
          return vert ? [x, y + out.panOff + d, r] : [x + out.panOff + d, y, r]; };
        out.heroOld = hs(prev, pt, [ox, oy], 0); out.heroNew = hs(pl, t, [nx, ny], -sg * span); break; }
      case 'wipe': { const e = ez(p, E.ramp(0.25, 0.35)), dir = tr.dir || 'lr', span = dir === 'tb' ? H : W;
        out.frontPos = lerp(-180, span + 180, dir === 'rl' ? 1 - e : e); break; }
      case 'bleed': { const fall = tr.fall ?? 0.22;
        if (p < fall) out.dropY = lerp(-80, ny - (tr.drop ?? 22), E.in2(inv(0, 0.85, p / fall)));
        else out.splatE = ez((p - fall) / (1 - fall), E.shaped(0.15, 1.6, 3)) ** 2; break; }
      case 'burn': out.burnE = ez(p, E.depart); break;
      case 'page': out.creaseX = lerp(W + 4, -0.02 * W, ez(p, E.shaped(0.5, 1.8, 2.5))); break;
      case 'roll': out.rollY = lerp(H + 6, -((tr.radius ?? 60) + 40), ez(p, E.shaped(0.25, 2, 3))); break;
      default: break;   // cut, hatch, fade: no scale/mask beyond p itself (exempt from speed limits, or plain crossfade)
    }
    return out;
  };
  /* __paperProbe(): for each paper this film uses, its tone, the mean colour of its texture (treated, as a scene sees
   * it) and the contrast of its ink, label text and accent against that mean, next to the floors they must clear:
   * ink 7, labels 4.5, the accent 3 (a graphic, not text), or the paper's own minContrast. smoke_test.py checks it. */
  window.__paperProbe = () => {
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = c => { const [r, g, b] = rgbOf(c).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
    return [...resolvePapers()].map(g => {
      const d = groundTex(g).treated.getContext('2d').getImageData(0, 0, W, H).data, m = [0, 0, 0]; let n = 0;
      for (let i = 0; i < d.length; i += 4 * 7) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; n++; }
      const mean = m.map(v => Math.round(v / n)), pl = STORY.plates.find(q => q._ground === g);
      const pal = pl ? palView(pl) : Object.assign({}, PAL, g.pal), dk = g.tone === 'dark';
      const got = { ink: cr(dk ? pal.nightInk : pal.ink, mean), label: cr(dk ? pal.nightLabel : pal.label, mean), accent: cr(pal.accent, mean) };
      const floors = { ink: 7, label: 4.5, accent: 3, ...g.minContrast };
      return { name: g.name, tone: g.tone, mean, ...got, floors, fails: Object.keys(floors).filter(k => got[k] < floors[k]) };
    });
  };
  window.__ready = true;
  if (RENDER) { renderFrame(+(QS.get('f') || 0)); return; }
  player();
}
function player() {
  const ui = document.getElementById('ui'), bar = document.getElementById('scrub'), btn = document.getElementById('play');
  let playing = false, ac = null, src = null, buf = null, t0 = 0, pos = +(QS.get('t') || 0);
  bar.max = TOTAL_F - 1;
  const now = () => playing ? (ac.currentTime - t0) : pos;
  async function start() {
    if (!ac) { btn.textContent = 'rendering audio…'; ac = new AudioContext({ sampleRate: SR }); buf = await renderAudio(); }
    src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
    t0 = ac.currentTime - pos; src.start(0, pos); playing = true; btn.textContent = 'pause';
  }
  function stop() { if (src) src.stop(); pos = now(); playing = false; btn.textContent = 'play'; }
  const seek = s => { const was = playing; if (was) stop(); pos = clamp(s, 0, TOTAL_T - 1 / FPS); if (was) start(); };
  btn.onclick = () => playing ? stop() : start();
  bar.oninput = () => seek(bar.value / FPS);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); btn.click(); }
    if (e.code === 'ArrowRight') seek(now() + 2); if (e.code === 'ArrowLeft') seek(now() - 2);
    if (e.key === ']') { const p = STORY.plates.find(p => p.start > now() + 0.01); if (p) seek(p.start); }
    if (e.key === '[') { const ps = STORY.plates.filter(p => p.start < now() - 0.5); if (ps.length) seek(ps[ps.length - 1].start); }
    if (e.key === 'c' && caps.length) { cc.hidden = !cc.hidden; }
  });
  // captions of a narrated film, over the picture (not in it: the render never draws them). c shows or hides them.
  const caps = captions(), cc = document.createElement('div');
  cc.hidden = !QS.has('cc');
  cc.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);max-width:80vw;padding:6px 14px;border-radius:6px;background:rgba(8,8,20,.72);' +
    'color:#f3efe2;font:500 clamp(14px,2.2vw,26px)/1.3 "Inter Tight",system-ui,sans-serif;text-align:center;white-space:pre-line;pointer-events:none';
  if (caps.length) { document.body.appendChild(cc); const k = ui.querySelector('.keys'); if (k) k.textContent += ' · c captions'; }
  (function loop() {
    let s = now(); if (s >= TOTAL_T) { stop(); pos = 0; s = 0; }
    const f = Math.min(TOTAL_F - 1, Math.floor(s * FPS)); renderFrame(f); bar.value = f;
    if (caps.length) { const c = caps.find(c => s >= c.t0 && s < c.t1); cc.textContent = c ? c.text : ''; cc.style.visibility = c ? 'visible' : 'hidden'; }
    requestAnimationFrame(loop);
  })();
  ui.style.display = 'flex';
  for (const w of [window.__fontWarning, window.__voiceWarning]) if (w) { const el = document.createElement('span'); el.textContent = '⚠ ' + w; el.style.color = '#e8577a'; ui.appendChild(el); ui.style.opacity = 1; }
}
