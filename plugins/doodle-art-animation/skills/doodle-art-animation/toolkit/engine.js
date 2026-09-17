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
  pink: '#e8577a', navyFill: '#26336a', gold: '#e6c65c', cyan: '#56c3d2', mint: '#53ba8b',
  topo: ['#d98a8a', '#6fb5b8', '#d9c06a', '#9a9ad4'],
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
};
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
  return t1 == null ? a : Math.min(a, 1 - E.in2(inv(t1 - (o.out ?? 0.3), t1, t)));
}
/** stagger(i, t, {t0, step, dur, ease}) -> eased 0..1 for the i-th item of a group */
const stagger = (i, t, { t0 = 0, step = 0.08, dur = 0.4, ease = E.out3 } = {}) => ease(inv(t0 + i * step, t0 + i * step + dur, t));
/** run fn with globalAlpha scaled; skipped entirely at 0 */
function withAlpha(a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); }
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
const S = { f: 0, boil: 0, T: 0, morph: false, trans: null, noReticle: false };   // per-frame globals
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
function ink(pts, o = {}) {
  const { closed = false, w = 3, color = PAL.ink, fill = null, amp = 1.2, seed = 1, draw = 1, alpha = 1, dash = null, fillAlpha = 1, fillReveal = null, double = false } = o;
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
  const { w = 3.5, color = PAL.ink, seed = 1, amp = 1.0, draw = 1, alpha = 1, taper = 0.16, closed = false, minW = 0.25 } = o;
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
 * lobedCloud(x, base, bumps, opts): the reference cloud. bumps = [[dx, r, dy?], ...]. Each lobe is its own outlined
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
function journeyPath(path, o = {}) {
  const { draw = 1, waypoints = [], color = PAL.accent, dark = false, w = 2.2 } = o; if (draw <= 0) return;
  ink(partial(path, draw), { w, color, amp: 0.4, dash: [2, 9], seed: 12 });
  waypoints.forEach(({ u, label, dx = 14, dy = -14 }, i) => { if (u > draw) return;
    const [x, y] = along(path, u), a = E.outBack(clamp((draw - u) * 10));
    withAlpha(a, () => { ink(shape.circle(x, y, 9 * a, 18), { closed: true, w: 2, color, fill: dark ? PAL.night : PAL.paper, amp: 0.3, seed: 40 + i });
      text(label, x + dx, y + dy, { kind: 'mono', size: 14, weight: 600, color }); }); });
}
/** textOnPath(s, path, u0, opts): glyphs laid along a polyline (rivers, layers, flows) */
function textOnPath(s, path, u0, o = {}) {
  const { size = 16, kind = 'mono', ls = 2 } = o, L = pathLen(path); let s0 = u0 * L;
  for (const ch of s) { const w = measure(ch, { kind, size }) + ls, u = (s0 + w / 2) / L; if (u > 1) break;
    const a = along(path, u), b = along(path, Math.min(1, u + 0.004));
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); text(ch, -w / 2 + ls / 2, 0, { ...o, kind, size, align: 'left' }); ctx.restore(); s0 += w; }
}

/* ---------- textures (built once) ---------- */
const TEX = {};
function buildTextures() {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const grain = (g, amt, seed) => { const img = g.getImageData(0, 0, W, H), d = img.data, r = mulberry(seed);
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(img, 0, 0); };
  // paper: cream, soft-edged 45° bands, large mottles, fibres, grain
  let [c, g] = mk(), r = mulberry(11);
  g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 4);
  for (let x = -1700; x < 1700; x += 132) { const lg = g.createLinearGradient(x, 0, x + 66, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.2, PAL.stripe); lg.addColorStop(0.8, PAL.stripe); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(x, -1700, 66, 3400); }
  g.restore();
  for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H, R = 260 + r() * 420, rg = g.createRadialGradient(x, y, 0, x, y, R);
    rg.addColorStop(0, i % 2 ? 'rgba(120,90,50,0.055)' : 'rgba(255,250,235,0.08)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
  g.lineCap = 'round';
  for (let i = 0; i < 3200; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 4 + r() * 18;
    g.strokeStyle = `rgba(${r() < .5 ? '110,90,60' : '160,140,110'},${0.05 + r() * 0.07})`; g.lineWidth = 0.6 + r() * 0.8;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * .5, y + Math.sin(a + 0.6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  grain(g, 16, 3);
  TEX.paper = c;
  // night: deep navy, faint grid, cross-hatch weave, specks, grain
  [c, g] = mk();
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, PAL.night); lg.addColorStop(1, PAL.night2);
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(130,130,200,0.045)'; g.lineWidth = 1;
  for (let x = 0; x <= W; x += 120) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
  for (let y = 0; y <= H; y += 120) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
  r = mulberry(12);
  for (let i = 0; i < 9000; i++) { const x = r() * W, y = r() * H, l = 5 + r() * 12, s = r() < .5 ? 1 : -1;
    g.strokeStyle = `rgba(150,150,210,${0.02 + r() * 0.035})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y - s * l); g.stroke(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(210,210,255,${0.05 + r() * 0.2})`; g.fillRect(r() * W, r() * H, 1.4, 1.4); }
  grain(g, 10, 4);
  TEX.night = c;
  // film grain: four noise tiles, one per drawing, so the paper never sits perfectly still
  TEX.grain = [0, 1, 2, 3].map(k => { const c2 = document.createElement('canvas'); c2.width = c2.height = 256; const gg = c2.getContext('2d'), im = gg.createImageData(256, 256), rr = mulberry(300 + k);
    for (let i = 0; i < im.data.length; i += 4) { const v = rr() < 0.5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = rr() * 34; }
    gg.putImageData(im, 0, 0); return gg.createPattern(c2, 'repeat'); });
  // vignettes: their own layer, drawn once per frame at identity so scaled plates never show edges
  for (const [key, col] of [['vigPaper', 'rgba(90,60,20,0.16)'], ['vigNight', 'rgba(0,0,8,0.45)']]) {
    [c, g] = mk(); const vg = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 1.02);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, col); g.fillStyle = vg; g.fillRect(0, 0, W, H); TEX[key] = c;
  }
}
/** four large, smooth topographic loops drifting slowly (the survey-map layer) */
function contours(t, dark, seed = 21) {
  const r = mulberry(seed);
  for (let i = 0; i < 4; i++) { const cx = r() * W, cy = r() * H, rad = 260 + r() * 300, col = PAL.topo[i % PAL.topo.length];
    for (let k = 0; k < 2; k++) { const p = shape.blob(cx + Math.sin(t * 0.05 + i) * 16, cy, rad * (1 - k * 0.18), seed + i * 7 + k, 0.22, 96, t * 0.012 * (i % 2 ? 1 : -1));
      ink(p, { closed: true, w: 1.3, color: col, alpha: dark ? 0.10 : 0.16, amp: 0 }); } }
}
function regMarks(dark, alpha = 1) {
  const col = dark ? 'rgba(160,160,220,0.35)' : 'rgba(110,110,170,0.45)';
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = 1.2;
  for (const [x, y] of [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]]) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 15); ctx.stroke();
  }
  ctx.restore();
}
function background(dark, t) { ctx.drawImage(dark ? TEX.night : TEX.paper, 0, 0); contours(t, dark); }
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
function setFont(kind, size, weight = 400, italic = false) { ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT[kind]}`; }
/** text(s, x, y, {kind, size, weight, italic, color, align, ls, alpha}) -> width */
function text(s, x, y, o = {}) {
  const { kind = 'sans', size = 24, weight = 400, italic = false, color = PAL.ink, align = 'left', ls = 0, alpha = 1, base = 'alphabetic' } = o;
  if (!s || alpha <= 0) return 0;
  ctx.save(); setFont(kind, size, weight, italic); ctx.letterSpacing = ls + 'px';
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  ctx.fillText(s, x, y); const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function measure(s, o = {}) { ctx.save(); setFont(o.kind || 'sans', o.size || 24, o.weight || 400, o.italic); ctx.letterSpacing = (o.ls || 0) + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
/** typewriter: characters revealed at cps from local t = 0 */
const typed = (s, t, cps = 34) => s.slice(0, Math.floor(clamp(t * cps, 0, s.length)));
/** display type-on: each new glyph pops in place (scale 1.55 -> 1 about its own centre, overshoot). Left-aligned. */
function dropText(s, x, y, t, o = {}) {
  const cps = o.cps ?? 16, k = t * cps; if (k <= 0) return 0;
  const full = Math.min(s.length, Math.floor(k));
  const w = text(s.slice(0, full), x, y, o);
  if (full < s.length) {
    const p = clamp(k - full), sc = lerp(1.55, 1, E.outBack(p));
    const gw = measure(s[full], o), gx = x + measure(s.slice(0, full + 1), o) - gw;   // keeps the kerning pair
    const ax = gx + gw / 2, ay = y - (o.size || 24) * 0.35;
    ctx.save(); ctx.translate(ax, ay); ctx.scale(sc, sc); ctx.translate(-ax, -ay);
    text(s[full], gx, y, { ...o, alpha: (o.alpha ?? 1) * clamp(p * 2.5) }); ctx.restore();
  }
  return w;
}
const fmt = (v, dec = 0) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
/** count-up string: ease-out cubic from `from` to `to` over dur seconds */
const countUp = (to, t, dur = 1.3, dec = 0, from = 0) => fmt(lerp(from, to, E.out3(clamp(t / dur))), dec);
const ROMAN = n => [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
const SUB = s => s.replace(/[0-9]/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
const SUP = s => s.replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

/* ---------- HUD: the recurring plate furniture ---------- */
const inkOf = dark => dark ? PAL.nightInk : PAL.ink;
const mutedOf = dark => dark ? PAL.nightMuted : PAL.muted;
function plateHeader(t, { num, title, sub, dark }) {
  const ic = inkOf(dark);
  text(typed(`PLATE  ${ROMAN(num)}`, t, 30), 90, 95, { kind: 'mono', size: 18, ls: 6, color: mutedOf(dark) });
  dropText(title, 88, 158, t - 0.15, { kind: 'display', size: 64, weight: 500, color: ic, cps: 17 });
  const tw = measure(title, { kind: 'display', size: 64, weight: 500 }), rp = E.out3(inv(0.35, 1.1, t));
  if (rp > 0) ink([[90, 180], [90 + (tw + 6) * rp, 180]], { w: 1.6, color: PAL.peri, amp: 0, alpha: 0.85 });
  text(typed(sub, t - 0.7, 30), 90, 221, { kind: 'display', size: 30, italic: true, color: dark ? '#b9b9d6' : PAL.inkSoft });
}
/** journey log: {title, rows: [[label, value]], states: [...], state: i}. STATE options wrap only when they must. */
function journeyLog(t, log, dark) {
  const x0 = 1518, x1 = 1868, ic = inkOf(dark), mc = mutedOf(dark);
  text(typed(log.title, t, 40), x1, 70, { kind: 'mono', size: 16, ls: 3, align: 'right', color: dark ? '#b9b9d6' : PAL.inkSoft });
  ink([[x0, 82], [lerp(x0, x1, E.out3(inv(0.1, 0.6, t))), 82]], { w: 1.4, color: PAL.peri, amp: 0, alpha: 0.8 });
  log.rows.forEach(([lab, val], i) => { const y = 112 + i * 30, al = inv(0.2 + i * 0.08, 0.5 + i * 0.08, t);
    text(lab, x0, y, { kind: 'mono', size: 16, ls: 1, color: mc, alpha: al }); text(val, x1, y, { kind: 'mono', size: 19, weight: 600, align: 'right', color: ic, alpha: al }); });
  if (log.states) {
    const y = 112 + log.rows.length * 30, al = inv(0.5, 0.8, t), so = { kind: 'mono', size: 13, weight: 600 };
    text('STATE', x0, y, { kind: 'mono', size: 16, ls: 1, color: mc, alpha: al });
    const need = log.states.reduce((s, st) => s + measure(st, so) + 34, 0), ys = need > x1 - x0 - 62 ? y + 26 : y;
    let x = x1;
    for (let i = log.states.length - 1; i >= 0; i--) { const on = i === log.state, s = log.states[i];
      const w = text(s, x, ys, { ...so, weight: on ? 600 : 400, align: 'right', color: on ? ic : PAL.peri, alpha: al * (on ? 1 : 0.8) });
      ctx.save(); ctx.globalAlpha *= al; ctx.beginPath(); ctx.arc(x - w - 9, ys - 4.5, 4.2, 0, TAU);
      if (on) { ctx.fillStyle = PAL.accent; ctx.fill(); } else { ctx.strokeStyle = PAL.peri; ctx.lineWidth = 1.2; ctx.stroke(); } ctx.restore(); x -= w + 30; }
  }
}
function stageDial(t, { n, N, name, prevN }, dark) {
  const a = inv(0, 0.4, t); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const box = shape.rect(45, 900, 358, 138);
  if (dark) ink(box, { closed: true, w: 1.2, color: 'rgba(160,160,220,0.35)', fill: 'rgba(20,20,48,0.75)', amp: 0 });
  else { flat(shape.rect(48, 903, 358, 138), 'rgba(40,30,20,0.10)'); ink(box, { closed: true, w: 1.6, color: PAL.panelEdge, fill: PAL.panel, fillAlpha: PAL.panelAlpha, amp: 0.5, seed: 91, double: true }); }
  const cx = 118, cy = 968, R = 50;
  ink(shape.circle(cx, cy, R), { closed: true, w: 1.3, color: PAL.peri, amp: 0, alpha: 0.9 });
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; ink([[cx + Math.cos(an) * (R - 5), cy + Math.sin(an) * (R - 5)], [cx + Math.cos(an) * (R + 5), cy + Math.sin(an) * (R + 5)]], { w: 1.2, color: PAL.peri, amp: 0 }); }
  const p = lerp((prevN ?? n - 1) / N, n / N, E.inOut3(inv(0.2, 1.2, t))), an = -Math.PI / 2 + p * TAU;
  if (p > 0) ink(shape.arc(cx, cy, R, -Math.PI / 2, an, 40), { w: 3, color: PAL.accent, amp: 0 });
  ctx.beginPath(); ctx.arc(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 7, 0, TAU); ctx.fillStyle = dark ? PAL.nightInk : PAL.ink; ctx.fill();
  text(`STAGE ${String(n).padStart(2, '0')} / ${N}`, 194, 960, { kind: 'mono', size: 16, ls: 3, color: mutedOf(dark) });
  text(typed(name, t - 0.3, 24), 194, 989, { kind: 'mono', size: 21, weight: 600, ls: 3, color: inkOf(dark) });
  ctx.restore();
}
function frameCounter(f, dark) {
  const s = `EXP ${String(Math.floor(f / 2)).padStart(4, '0')}    F ${String(f).padStart(4, '0')}`;
  text(s, 1868, 1046, { kind: 'mono', size: 14, ls: 1, align: 'right', color: dark ? 'rgba(160,160,210,0.6)' : 'rgba(90,80,70,0.6)' });
}

/* ---------- annotation components ---------- */
/**
 * callout(t, {ax, ay, ex, ey, x2, title, sub, dark, align}): anchor dot -> elbow -> horizontal leader, then a bold title
 * and a grey sub. t is local (0 = starts drawing). Wrap in withAlpha(beat(...)) to make it leave.
 */
function callout(t, o) {
  if (t <= 0) return;
  const { ax, ay, ex, ey, x2, title, sub, dark, align = 'left', size = 30 } = o;
  const ic = inkOf(dark), lp = E.out3(inv(0, 0.45, t));
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 5.5 * E.outBack(clamp(t * 6)), 0, TAU); ctx.fillStyle = ic; ctx.fill(); ctx.restore();
  pen([[ax, ay], [ex, ey], [x2, ey]], { w: 2.6, color: ic, amp: 0.5, seed: 7, draw: lp, taper: 0.04, minW: 0.6 });
  const tx = align === 'left' ? x2 + 12 : x2 - 12;
  text(typed(title, t - 0.35, 30), tx, ey + 10, { kind: 'sans', size, weight: 600, color: ic, align });
  if (sub) text(typed(sub, t - 0.7, 45), tx, ey + 48, { kind: 'sans', size: size * 0.74, color: dark ? '#8f90ad' : '#6f675e', align });
}
/** big stat: kicker (mono caps) + large display number (tight tracking) + italic note */
function stat(t, { x, y, kicker, value, note, dark, size = 62, align = 'left' }) {
  if (t <= 0) return;
  text(typed(kicker, t, 40), x + 3, y - size * 0.95, { kind: 'mono', size: 18, ls: 5, color: dark ? '#b9b9d6' : PAL.inkSoft, align });
  const v = typeof value === 'function' ? value(t - 0.3) : value;
  text(v, x, y, { kind: 'display', size, weight: 500, color: inkOf(dark), align, ls: size >= 56 ? -1 : 0, alpha: clamp((t - 0.3) * 5) });
  if (note) text(typed(note, t - 1.2, 40), x + 3, y + 36, { kind: 'display', size: 24, italic: true, color: dark ? '#9d9dbd' : PAL.inkSoft, align });
}
/** tracker reticle + ID tag. Prefer the plate's `hero` property, which the engine draws as furniture. */
function reticle(x, y, t, { label, r = 40, dark, alpha = 1, tag = true }) {
  if (alpha <= 0 || S.noReticle) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ink(shape.circle(x, y, r * (1 + 0.04 * Math.sin(t * 4))), { closed: true, w: 1.4, color: PAL.peri, amp: 0 });
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.9);
  ctx.strokeStyle = PAL.accent; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([r * 0.55, r * 0.35]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.rotate(-t * 1.5); ctx.lineWidth = 1.6; ctx.globalAlpha *= 0.8;
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5)); ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12)); ctx.stroke(); }
  ctx.restore();
  if (tag && label) {
    const lx = x + r * 0.72, ly = y - r * 0.72, tx = lx + 22, ty = ly - 22;
    ink([[lx, ly], [tx, ty], [tx + 110, ty]], { w: 1.4, color: PAL.peri, amp: 0 });
    text(label, tx + 4, ty - 8, { kind: 'mono', size: 18, weight: 600, color: inkOf(dark) });
  }
  ctx.restore();
}
/** card that unfolds left to right (translucent, double outline); returns content progress, 0 until open */
function card(t, { x, y, w, h, dark, fig, title }) {
  const p = E.out3(inv(0, 0.4, t)); if (p <= 0) return 0;
  const ww = w * p;
  if (dark) ink(shape.rect(x, y, ww, h), { closed: true, w: 1.4, color: 'rgba(170,170,230,0.45)', fill: 'rgba(18,18,44,0.85)', amp: 0 });
  else { flat(shape.rect(x + 4, y + 4, ww, h), 'rgba(40,30,20,0.12)'); ink(shape.rect(x, y, ww, h), { closed: true, w: 2, color: PAL.panelEdge, fill: PAL.panel, fillAlpha: PAL.panelAlpha, amp: 0.6, seed: 77, double: true }); }
  if (title) text(typed(title, t - 0.45, 40), x + 24, y + 38, { kind: 'mono', size: 18, weight: 600, ls: 4, color: inkOf(dark) });
  if (fig) text(typed(fig, t - 0.45, 30), x + w - 24, y + 34, { kind: 'mono', size: 15, ls: 3, align: 'right', color: mutedOf(dark) });
  return inv(0.4, 0.6, t);
}
/** log-scale ruler in a card: ticks [[v, label]], marks [{v, label, color, row, t0}] (labels flip left near the end) */
function logRuler(t, { x, y, w, min, max, ticks, marks, dark }) {
  const X = v => x + w * (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  const ic = inkOf(dark), lp = E.out3(inv(0, 0.8, t));
  ink([[x, y], [x + w * lp, y]], { w: 2, color: ic, amp: 0 });
  if (lp >= 1) arrowHead(x + w + 2, y, 0, 11, ic, 2);
  ticks.forEach(([v, lab], i) => { const a = inv(0.1 + i * 0.05, 0.3 + i * 0.05, t); if (!a) return;
    ink([[X(v), y - 8], [X(v), y + 8]], { w: 1.5, color: ic, amp: 0, alpha: a });
    text(lab, X(v), y + 30, { kind: 'mono', size: 15, align: 'center', color: mutedOf(dark), alpha: a }); });
  marks.forEach((m, i) => { const mt = t - (m.t0 ?? 0.6 + i * 0.35); if (mt <= 0) return;
    const yy = y - 26 - (m.row || 0) * 28, col = m.color || ic;
    ink([[X(m.v), y], [X(m.v), yy + 6]], { w: 1.2, color: col, amp: 0, draw: E.out3(clamp(mt * 4)) });
    ctx.beginPath(); ctx.arc(X(m.v), y, 6 * E.outBack(clamp(mt * 4)), 0, TAU); ctx.fillStyle = col; ctx.fill();
    const lo = { kind: 'mono', size: 15, weight: 600, ls: 1, color: col }, flip = X(m.v) + 8 + measure(m.label, lo) > x + w + 20;
    text(typed(m.label, mt - 0.1, 40), X(m.v) + (flip ? -8 : 8), yy, { ...lo, align: flip ? 'right' : 'left' }); });
}
/** line chart inside a card; series drawn on to s.draw. Returns {X, Y, ends} for placing marks. */
function lineChart(t, { x, y, w, h, xr, yr, xticks, yticks, xlab, ylab, series, dark }) {
  const X = v => x + w * (v - xr[0]) / (xr[1] - xr[0]), Y = v => y + h - h * (v - yr[0]) / (yr[1] - yr[0]);
  const ic = inkOf(dark), mc = mutedOf(dark), a = E.out3(inv(0, 0.5, t));
  ink([[x, y], [x, y + h], [x + w * a, y + h]], { w: 2, color: ic, amp: 0.4, seed: 5 });
  xticks.forEach(v => { text(String(v), X(v), y + h + 26, { kind: 'mono', size: 15, align: 'center', color: mc, alpha: a });
    ink([[X(v), y], [X(v), y + h]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.25 * a }); });
  yticks.forEach(v => { text(String(v), x - 12, Y(v) + 5, { kind: 'mono', size: 15, align: 'right', color: mc, alpha: a });
    ink([[x, Y(v)], [x + w, Y(v)]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.25 * a }); });
  if (xlab) text(xlab, x + w, y + h + 52, { kind: 'mono', size: 14, ls: 2, align: 'right', color: mc, alpha: a });
  if (ylab) text(ylab, x, y - 14, { kind: 'mono', size: 14, ls: 2, color: mc, alpha: a });
  const ends = [];
  series.forEach(s => { const pts = s.pts.map(([u, v]) => [X(u), Y(v)]);
    if (s.draw > 0) pen(pts, { w: s.w || 3, color: s.color, amp: 0.6, seed: 9, draw: s.draw, taper: 0.03, minW: 0.5 });
    ends.push(along(pts, s.draw)); });
  return { X, Y, ends };
}
/**
 * insetLens(t, {cx, cy, r, sx, sy, draw, dark, label}): a magnifier bubble tied to a source point by two tangent lines.
 * The close-up stays at full size while the circle opens around it. draw(t) paints in local coords centred on (0,0).
 */
function insetLens(t, { cx, cy, r, sx, sy, draw, dark = true, label }) {
  const p = E.outBack(inv(0, 0.5, t)); if (p <= 0) return;
  const rr = r * Math.max(0.01, p), d = Math.hypot(cx - sx, cy - sy), a = Math.atan2(cy - sy, cx - sx), b = Math.asin(clamp(rr / d, -1, 1));
  const L = Math.sqrt(Math.max(0, d * d - rr * rr));
  for (const sg of [-1, 1]) ink([[sx, sy], [sx + Math.cos(a + sg * b) * L, sy + Math.sin(a + sg * b) * L]], { w: 1.2, color: PAL.peri, amp: 0, alpha: 0.8 * clamp(p) });
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.clip();
  ctx.drawImage(dark ? TEX.night : TEX.paper, cx - W / 2, cy - H / 2);
  ctx.translate(cx, cy); draw(t); ctx.restore();
  lensRing(cx, cy, rr, clamp(p));
  if (label) text(typed(label, t - 0.5, 30), cx, cy + r + 44, { kind: 'mono', size: 17, ls: 4, align: 'center', color: PAL.inkSoft });
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
const bgTex = dark => dark ? TEX.night : TEX.paper;

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
/** parallax(cam, depth, fn): inside draw(), makes fn's layer pan at `depth` times the camera's pan (0 = pinned sky, 1 = ground) */
function parallax(cam, depth, fn) { if (!cam) return fn(); ctx.save(); ctx.translate(-(cam.dx || 0) * (1 - depth), -(cam.dy || 0) * (1 - depth)); fn(); ctx.restore(); }
/** a plate's hero on screen: from plate.hero(t) (scene coords, camera applied) or plate.focus(t) (screen coords) */
function heroOf(pl, t) {
  if (pl.hero) { const h = pl.hero(t); const [x, y] = camPoint(camOf(pl, t), [h.x, h.y]); return { ...h, x, y }; }
  const [x, y] = pl.focus ? pl.focus(t) : [W / 2, H / 2]; return { x, y, none: true };
}
const focusOf = (pl, t) => { const h = heroOf(pl, t); return [h.x, h.y]; };
/**
 * Momentum across cuts. The old plate leans into its transition (LEAD, over its last 0.45 s) and the new plate
 * arrives still moving and settles (SETTLE, over enter.settle s after the transition). Both scale about the hero,
 * so the camera never stops dead at a cut. enter.momentum = false turns it off for one plate.
 */
const LEAD = { lensIn: 1.14, zoom: 1.08, shape: 1.12, iris: 1.06, bleed: 1.03, burn: 1.03, cut: 1.03 };   // always >= 1: scenes only bleed past the edges when enlarged
const SETTLE = { lensIn: 1.12, lensOut: 1.08, zoom: 1.06, shape: 1.08, iris: 1.06, bleed: 1.05, burn: 1.05, cut: 1.05, wipe: 1.03, page: 1.04, roll: 1.04, fade: 1.02, hatch: 1.03 };
/**
 * Match cut. After a `cut` (or any enter with match: 0..1) the new plate starts shifted so its hero sits where the
 * old hero was (by the match fraction, 0.6 for cuts), holds a beat, then eases home over enter.settle s. It zooms
 * just enough to keep covering the frame while shifted. enter.match = 0 turns it off.
 */
function matchShift(pl, t) {
  const tr = pl.enter; if (!tr || !pl.i) return null;
  const k = tr.match ?? (tr.type === 'cut' ? 0.6 : 0); if (!k) return null;
  const d = tr.dur || 0, q = 1 - E.inOut3(inv(d + 0.15, d + 0.15 + (tr.settle ?? 1.0), t)); if (q <= 0) return null;
  const prev = STORY.plates[pl.i - 1], [ox, oy] = focusOf(prev, prev.dur), [nx, ny] = focusOf(pl, d);
  const dx = (ox - nx) * k * q, dy = (oy - ny) * k * q;
  const cov = (c, dd, span) => Math.max(1, (c + dd) / (c + 20), (span - c - dd) / (span + 20 - c));   // scenes bleed ~20 px past the edges
  return { dx, dy, s: Math.max(cov(nx, dx, W), cov(ny, dy, H)) };
}
function momentum(pl, t) {
  let s = 1;
  const nx = STORY.plates[pl.i + 1], lead = nx && nx.enter && nx.enter.momentum !== false && LEAD[nx.enter.type];
  if (lead) s *= lerp(1, lead, E.in2(inv(pl.dur - 0.45, pl.dur, t)));
  const tr = pl.enter, settle = tr && pl.i > 0 && tr.momentum !== false && SETTLE[tr.type];
  if (settle) { const d = tr.dur || 0; s *= lerp(settle, 1, E.out3(inv(d, d + (tr.settle ?? 0.9), t))); }
  return s;
}

/* ---------- transitions ---------- */
function lensRing(cx, cy, r, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#e9e7f5'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(132,135,198,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, TAU); ctx.stroke();
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
 * darkOld, darkNew, prev, pl, pt, t, tr, seed}. Zooms use zlerp (constant ratio per frame) and E.inOut5 (a snap).
 */
const TRANS = {
  /** down the scale ladder into another world: the camera dives at the hero while a lens opens on it, the new world inside */
  lensIn(p, X) {
    const { tr } = X, e = E.inOut5(p), [cx, cy] = X.focusOld, [fx, fy] = X.focusNew, r = zlerp(16, coverR(cx, cy), e);
    X.drawOldX({ xf: about(cx, cy, zlerp(1, tr.dive ?? 2.4, e)) });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.drawImage(bgTex(X.darkNew), 0, 0);
    X.drawNewX({ bg: false, xf: about(fx, fy, zlerp(tr.scaleFrom ?? 0.3, 1, e), lerp(cx, fx, e), lerp(cy, fy, e)) });
    ctx.restore();
    lensRing(cx, cy, r, 1 - inv(0.8, 1, p));
    return E.inOut3(inv(0.2, 0.9, p));
  },
  /** up the scale ladder: the old world shrinks into a lens that lands on the hero, while the new world pulls back into place */
  lensOut(p, X) {
    const { tr } = X, e = E.inOut5(p), [ox, oy] = X.focusOld, [nx, ny] = X.focusNew, R0 = coverR(ox, oy);
    const cx = lerp(ox, nx, e), cy = lerp(oy, ny, e), r = zlerp(R0, 20, e);
    X.drawNewX({ xf: about(nx, ny, zlerp(tr.dive ?? 2.4, 1, e)) });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.drawImage(bgTex(X.darkOld), 0, 0);
    X.drawOldX({ bg: false, hud: 1 - inv(0, 0.3, p), xf: about(ox, oy, zlerp(1, 0.12, e), cx, cy) });
    ctx.restore();
    lensRing(cx, cy, r, 1 - inv(0.85, 1, p));
    return clamp(1 - (r / R0) ** 2);
  },
  /** plain crossfade: only into the end card */
  fade(p, X) { const e = E.inOut3(p); X.drawOld(); withAlpha(e, X.drawNew); return e; },
  /** one step on the scale ladder in the same world (tr.dir 'out' | 'in', tr.k): old shrinks (or grows) away while the new scale grows in around the hero */
  zoom(p, X) {
    const { tr } = X, e = E.inOut5(p), k = tr.k ?? 8, out = (tr.dir || 'out') === 'out';
    const sOld = out ? zlerp(1, 1 / k, e) : zlerp(1, k, e), sNew = out ? zlerp(k, 1, e) : zlerp(1 / k, 1, e);
    const [ox, oy] = X.focusOld, [nx, ny] = X.focusNew, px = lerp(ox, nx, e), py = lerp(oy, ny, e), a = E.inOut3(inv(0.25, 0.75, p));
    ctx.drawImage(bgTex(X.darkNew), 0, 0);
    withAlpha(1 - E.in2(inv(0.5, 0.95, p)), () => X.drawOldX({ bg: false, hud: 1 - inv(0, 0.3, p), xf: about(ox, oy, sOld, px, py) }));
    S.noReticle = p < 0.6;
    withAlpha(a, () => X.drawNewX({ bg: false, hud: inv(0.6, 1, p), xf: about(nx, ny, sNew, px, py) }));
    S.noReticle = false;
    return a;
  },
  /** whip pan along one long sheet (tr.dir 'left' | 'right' | 'up' | 'down'): both plates slide, speed lines at full speed */
  pan(p, X) {
    const dir = X.tr.dir || 'left', vert = dir === 'up' || dir === 'down', sg = dir === 'left' || dir === 'up' ? -1 : 1, span = vert ? H : W;
    const Lo = layer(() => X.drawOldX({ all: true }), 1), Ln = layer(() => X.drawNewX({ all: true }), 2);
    const offAt = q => sg * span * E.inOut3(clamp(q)), sh = 0.5 / (12 * (X.tr.dur || 0.8));   // half-drawing shutter
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
    const v = (4 * p * (1 - p)) ** 2, r = mulberry(X.seed + S.boil);        // speed lines, strongest at peak speed
    if (v > 0.02) for (let i = 0; i < 26; i++) {
      const u = r() * (vert ? W : H), a = r() * span, L = 160 + r() * 380;
      const pts = vert ? [[u, a], [u, a + L]] : [[a, u], [a + L, u]];
      pen(pts, { w: 1.4 + r() * 2.2, color: X.darkNew ? PAL.nightInk : PAL.ink, alpha: 0.45 * v, taper: 0.45, seed: i, amp: 0.4 });
    }
    return E.inOut3(inv(0.35, 0.65, p));
  },
  /** ink wipe (tr.dir 'lr' | 'rl' | 'tb'): a curved inked front sweeps across; the new plate slides in slightly behind it */
  wipe(p, X) {
    const e = E.inOut3(p), dir = X.tr.dir || 'lr', vert = dir === 'tb', span = vert ? H : W, f = lerp(-180, span + 180, dir === 'rl' ? 1 - e : e);
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
    const [fx, fy] = X.tr.at || X.focusNew, w = 480, h = 270, fall = X.tr.fall ?? 0.14, dm = coverR(fx, fy);
    const dropCol = X.tr.ink || (X.darkNew ? PAL.night : PAL.inkSoft);
    if (p < fall) {                                                    // the drop falls onto the spot
      X.drawOld(); const q = E.in2(p / fall), s = X.tr.drop ?? 22, y = lerp(-80, fy - s, q);
      pen([[fx, y - 150 * q - 20], [fx, y - 30]], { w: 2, color: dropCol, alpha: 0.35 * q, taper: 0.5, amp: 0.2 });
      ink(teardrop(fx, y, s), { closed: true, w: 2, color: PAL.ink, fill: dropCol, amp: 0.3, seed: 5 });
      return 0;
    }
    const u = (p - fall) / (1 - fall), e = E.inOutSine(u);
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
    const rc = X.tr.rim || (X.darkNew ? [16, 14, 44] : [70, 52, 40]);
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
    const e = E.inOutSine(p), [fx, fy] = X.tr.at || X.focusOld, w = 480, h = 270, nf = noiseField(X.seed + 5, w, h, 0.4), dm = coverR(fx, fy);
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
    const ar = mulberry(X.seed + 77), col = X.darkOld ? PAL.nightInk : PAL.ink;         // ash: each fleck leaves when the front reaches it
    for (let i = 0; i < 60; i++) { const ax = ar() * W, ay = ar() * H, age = (th - vAt(ax, ay)) / 0.3, dr = ar();
      if (age <= 0 || age >= 1) continue;
      const [wx, wy] = wander(i, S.T, 14, 1.2), s = 2 + dr * 3;
      withAlpha((1 - age) * 0.7, () => ink(shape.circle(ax + wx + age * 40 * (dr - 0.5), ay - age * (90 + 80 * dr) + wy, s * (1 - 0.5 * age), 6), { closed: true, w: 0.8, color: col, fill: col, amp: 0.4, seed: i })); }
    return e;
  },
  /** iris / blink: a lens closes on the old hero to a dot, then opens from a dot on the new hero */
  iris(p, X) {
    const curtain = X.tr.color || (X.darkOld || X.darkNew ? '#07061a' : PAL.ink), op = X.tr.opacity ?? 0.8, [ox, oy] = X.focusOld, [nx, ny] = X.focusNew, r0 = 7;
    let cx, cy, r;
    const hole = () => { ctx.save(); ctx.globalAlpha *= op; ctx.fillStyle = curtain; ctx.beginPath(); ctx.rect(-20, -20, W + 40, H + 40);
      if (r > r0 + 0.5) ctx.arc(cx, cy, r, 0, TAU, true); ctx.fill('evenodd'); ctx.restore(); };
    if (p < 0.45) { const q = E.in3(p / 0.45); [cx, cy] = [ox, oy]; r = zlerp(coverR(cx, cy), r0, q); X.drawOldX({ hud: 1 - q, xf: about(cx, cy, 1 + 0.15 * q) }); hole(); }
    else if (p < 0.55) { const u = E.inOut3((p - 0.45) / 0.1); cx = lerp(ox, nx, u); cy = lerp(oy, ny, u); r = r0;
      X.drawOldX({ hud: 0, xf: about(ox, oy, 1.15) }); withAlpha(u, () => X.drawNewX({ hud: 0, xf: about(nx, ny, 1.15) })); hole(); }
    else { const q = E.out3((p - 0.55) / 0.45); [cx, cy] = [nx, ny]; r = zlerp(r0, coverR(cx, cy), q); X.drawNewX({ hud: q, xf: about(cx, cy, 1.15 - 0.15 * q) }); hole(); }
    lensRing(cx, cy, r, 1 - inv(0.9, 1, p));
    if (r <= r0 + 0.5) { ctx.fillStyle = '#e9e7f5'; ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.6, 0, TAU); ctx.fill(); }
    return E.inOut3(inv(0.4, 0.6, p));
  },
  /** page turn: a bottom corner of the old page is lifted and dragged across (tr.dir 'left' = the right corner travels left,
   *  'right' = the left corner travels right); the page folds along a moving crease and slides off. Its back takes the look
   *  of the page being turned to (tr.back 'new' | 'old'), so the new world curls into view over the old one. */
  page(p, X) {
    const e = E.inOut3(p), fl = (X.tr.dir || 'left') === 'right', hx = x => fl ? W - x : x;
    const P = [hx(W + 4), H + 4], Q = [hx(lerp(W + 4, -1.25 * W, e)), lerp(H + 4, 0.7 * H, Math.sin(e * Math.PI / 2))];
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
      const backDark = (X.tr.back || 'new') === 'new' ? X.darkNew : X.darkOld;
      ctx.drawImage(bgTex(backDark), 0, 0); ctx.fillStyle = backDark ? 'rgba(60,60,110,0.25)' : 'rgba(255,252,240,0.35)'; ctx.fillRect(0, 0, W, H);
      if (backDark === X.darkOld) { ctx.save(); ctx.globalAlpha = 0.09; ctx.transform(1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, 2 * md * nx, 2 * md * ny); ctx.drawImage(L, 0, 0); ctx.restore(); }   // print showing through
      const g = ctx.createLinearGradient(mx, my, mx - nx * 300, my - ny * 300);   // the curl: dark in the crease, a highlight, then soft shade
      g.addColorStop(0, 'rgba(30,20,10,0.38)'); g.addColorStop(0.12, 'rgba(30,20,10,0.08)'); g.addColorStop(0.35, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(30,20,10,0.10)');
      ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.restore();
      ink(flap, { closed: true, w: 2.2, color: backDark ? PAL.nightInk : PAL.ink, amp: 0.5, seed: 61, alpha: 0.85 });
    }
    X.drawOldX({ hudOnly: true, hud: 1 - inv(0, 0.3, p) });
    return e;
  },
  /** roll (window blind / projector screen): the old page rolls up from the bottom edge (inked roll, shadow below), revealing the new page */
  roll(p, X) {
    const e = E.inOut3(p), R = X.tr.radius ?? 60, yc = lerp(H + 6, -R - 40, e), step = 2;
    X.drawNew();
    if (yc < H) { const g = ctx.createLinearGradient(0, yc + R, 0, yc + R + 110); g.addColorStop(0, 'rgba(30,20,10,0.32)'); g.addColorStop(1, 'rgba(30,20,10,0)');
      ctx.fillStyle = g; ctx.fillRect(0, yc + R, W, 110); }                                   // shadow the roll casts on the new page
    const L = layer(() => X.drawOldX({ hud: 0 }), 2), back = bgTex(X.darkOld);
    if (yc > 0) ctx.drawImage(L, 0, 0, W, Math.min(H, yc), 0, 0, W, Math.min(H, yc));     // the part not yet rolled
    const strip = (d, front) => { const sy = yc + d; if (sy < 0 || sy >= H) return; const th = d / R, dy = yc + R * Math.sin(th), dh = Math.max(1, step * Math.abs(Math.cos(th)) + 1);
      if (front) { ctx.drawImage(L, 0, sy, W, step, 0, dy, W, dh); ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.sin(th)})`; }
      else { ctx.drawImage(back, 0, (H - 1 - sy) % H, W, step, 0, dy, W, dh); ctx.fillStyle = `rgba(40,28,14,${0.06 + 0.3 * (1 + Math.cos(th))})`; }
      ctx.fillRect(0, dy, W, dh); };
    for (let d = 0; d < Math.PI * R / 2; d += step) strip(d, true);                          // underside of the roll
    for (let d = Math.PI * R / 2; d < Math.PI * R; d += step) strip(d, false);               // outside of the roll, facing us
    if (yc < H && yc > -R) { const col = X.darkOld ? PAL.nightInk : PAL.ink;                // inked edges of the roll
      pen([[-10, yc], [W + 10, yc]], { w: 2.4, color: col, seed: 51, taper: 0.01, amp: 0.8 });
      pen([[-10, yc + R], [W + 10, yc + R]], { w: 3.2, color: col, seed: 52, taper: 0.01, amp: 0.8 });
      ink(shape.arc(W - 40, yc + R / 2, R * 0.32, -1.4, 3.6, 24), { w: 1.8, color: col, alpha: 0.7, amp: 0.3 }); }
    X.drawOldX({ hudOnly: true, hud: 1 - inv(0, 0.35, p) });              // HUD is furniture: it fades, it doesn't roll
    return e;
  },
  /** shape reveal (match cut): an object morphs into its counterpart while a window centred on it opens onto the new world */
  shape(p, X) {
    const { tr } = X, e = E.inOut5(p);
    const A = tr.from(X.prev, X.pt), B = tr.to(X.pl, X.t), M = morph(A, B, e), b = bounds(M), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const ba = bounds(A), bb = bounds(B), ax = (ba.x0 + ba.x1) / 2, ay = (ba.y0 + ba.y1) / 2, bx = (bb.x0 + bb.x1) / 2, by = (bb.y0 + bb.y1) / 2;
    const r0 = Math.max(6, Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.45), q = E.inOut3(inv(0.1, 0.92, p)), r = zlerp(r0, coverR(cx, cy), q);
    const fa = tr.fromFill || sampleColor(X, 'old', ax, ay), fb = tr.toFill || sampleColor(X, 'new', bx, by);
    S.morph = true;
    X.drawOldX({ hud: 1 - inv(0, 0.4, p), xf: about(ax, ay, zlerp(1, 1.6, e), cx, cy) });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(bgTex(X.darkNew), 0, 0);
    X.drawNewX({ bg: false, hud: inv(0.7, 1, p), xf: about(bx, by, zlerp(0.7, 1, e), cx, cy) });
    ctx.restore();
    S.morph = false;
    ink(shape.circle(cx, cy, r, 72), { closed: true, w: 2, color: PAL.peri, amp: 0, alpha: 0.6 * (1 - q) });
    ink(M, { closed: true, w: 3, amp: 1, seed: 33, fill: mixColor(fa, fb, E.inOut3(inv(0.15, 0.85, p))), alpha: 1 - inv(0.8, 1, p), ...(tr.style ? tr.style(e) : {}) });   // fades onto the real object
    return q;
  },
  /** dissolve through hatching: the new plate appears as pen strokes that thicken until they merge */
  hatch(p, X) {
    const e = E.inOut3(p), gap = 16, ang = -0.7, R = Math.hypot(W, H) / 2 + 40, r = mulberry(X.seed + 21);
    X.drawOld();
    const L = layer(() => {
      X.drawNew(); ctx.globalCompositeOperation = 'destination-in';
      ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.beginPath();
      for (let v = -R; v <= R; v += gap) { let u = -R + r() * 60; while (u < R) { const Ln = 50 + r() * 110, d = r() * 0.25, h = gap * 1.15 * E.inOut3(inv(d, d + 0.75, e)); if (h > 0.2) ctx.rect(u, v - h / 2, Ln, h); u += Ln + 6 + r() * 30; } }
      ctx.fillStyle = '#000'; ctx.fill();
    }, 1);
    ctx.drawImage(L, 0, 0);
    return e;
  },
};
/** header start delay per transition (measured from the reference: bare hold after a lens-in, none after a lens-out) */
const HEADER_DELAY = { cut: () => 0.25, lensIn: d => d + 0.4, lensOut: () => 0.05, fade: d => d * 0.6, burn: d => d * 0.7, bleed: d => d * 0.7, wipe: d => d * 0.55,
  iris: d => d * 0.5 + 0.3, zoom: d => d * 0.85, shape: d => d * 0.85, morph: d => d * 0.85, page: d => d * 0.6, roll: d => d * 0.6, hatch: d => d * 0.6, pan: d => d * 0.8 };
function headerDelay(pl) { const tr = pl.enter; if (!tr || pl.i === 0) return 0.1; return (HEADER_DELAY[tr.type] || HEADER_DELAY.cut)(tr.dur || 0.5); }
TRANS.morph = TRANS.shape;   // v2 name

/* ---------- timeline ---------- */
/** transition length when a plate's enter has no dur (seconds) */
const DEFAULT_DUR = { cut: 0, lensIn: 0.6, lensOut: 0.6, zoom: 0.8, pan: 0.8, wipe: 0.8, bleed: 1.5, burn: 1.4, iris: 0.9, shape: 1.1, morph: 1.1, hatch: 0.8, page: 1.2, roll: 1.0, fade: 0.8 };
let STORY = null, TOTAL_T = 0, TOTAL_F = 0;
function defineStory(story) {
  STORY = story; let t = 0;
  story.plates.forEach((p, i) => { p.i = i; p.start = t; t += p.dur; if (p.enter && p.enter.dur == null) p.enter.dur = DEFAULT_DUR[p.enter.type] ?? 0.6; });
  TOTAL_T = t; TOTAL_F = Math.round(t * FPS);
}
/**
 * drawPlate(pl, t, o): paper -> scene (transition xf, momentum, camera) -> hero reticle (constant size) -> overlay -> HUD (staggered).
 * o.all applies xf to everything (pans, page curls); o.hud scales HUD alpha; o.bg = false skips the paper.
 */
function drawPlate(pl, t, o = {}) {
  const { xf = null, all = false, hud = 1, bg = true, hudOnly = false } = o;
  ctx.save();
  if (all && xf) xf();
  if (!hudOnly) {
  if (bg) background(pl.dark, t);
  const cam = camOf(pl, t), ms = matchShift(pl, t), mo = momentum(pl, t) * (ms ? ms.s : 1);
  ctx.save(); if (xf && !all) xf();
  if (ms) ctx.translate(ms.dx, ms.dy);
  if (mo !== 1) { const [hx, hy] = focusOf(pl, t); ctx.translate(hx, hy); ctx.scale(mo, mo); ctx.translate(-hx, -hy); }
  withCamera(cam, () => pl.draw(t, pl));
  if (pl.hero && !S.noReticle) { const h = heroOf(pl, t); if (h.label !== undefined || h.r) {
    const m = ctx.getTransform(), sc = Math.hypot(m.a, m.b) || 1;       // counter-scale: the reticle is furniture
    withAlpha((h.alpha ?? 1) * clamp(hud * 1.5), () => { ctx.translate(h.x, h.y); ctx.scale(1 / sc, 1 / sc); reticle(0, 0, t, { label: h.label, r: h.r ?? 34, dark: pl.dark, tag: h.tag ?? !!h.label }); }); } }
  if (pl.overlay) pl.overlay(t, pl);                                   // art that must not move with the camera
  ctx.restore();
  }
  if (hud > 0) {
    ctx.globalAlpha *= clamp(hud);
    const ht = t - headerDelay(pl);
    if (pl.header) plateHeader(ht, { ...pl.header, dark: pl.dark });
    if (pl.stage) stageDial(ht - 0.25, { ...pl.stage, N: STORY.stages }, pl.dark);
    if (pl.log) journeyLog(ht - 0.35, pl.log(t), pl.dark);
    if (pl.marks !== false) regMarks(pl.dark);
  }
  ctx.restore();
}
/** renderFrame(f): animated on twos (each drawing held 2 frames; STORY.twos = false for ones), with gate weave (STORY.weave px) and film grain (STORY.grain 0..1) */
function renderFrame(f) {
  const fq = STORY.twos === false ? f : f - (f % 2);
  S.f = f; S.boil = Math.floor(f / 2); S.T = fq / FPS; S.trans = null;
  const T = S.T, P = STORY.plates;
  let i = P.findIndex(p => T < p.start + p.dur); if (i < 0) i = P.length - 1;
  const pl = P[i], t = T - pl.start, tr = pl.enter, vig = d => d ? TEX.vigNight : TEX.vigPaper;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // gate weave: the whole drawing shifts a fraction of a pixel and turns a hair each drawing, like hand-shot animation
  const wv = STORY.weave ?? 0.9, db = Math.floor(fq / 2);
  if (wv) { ctx.translate(W / 2 + (hash3(db, 1, 7) - 0.5) * 2 * wv, H / 2 + (hash3(db, 2, 7) - 0.5) * 2 * wv); ctx.rotate((hash3(db, 3, 7) - 0.5) * 0.0012 * wv); ctx.scale(1.004, 1.004); ctx.translate(-W / 2, -H / 2); }
  if (i > 0 && tr && tr.type !== 'cut' && t < tr.dur) {
    const prev = P[i - 1], pt = prev.dur + t, p = t / tr.dur; S.trans = { type: tr.type, p };
    const X = { drawOld: () => drawPlate(prev, pt), drawNew: () => drawPlate(pl, t), drawOldX: o => drawPlate(prev, pt, o), drawNewX: o => drawPlate(pl, t, o),
      focusOld: focusOf(prev, pt), focusNew: focusOf(pl, t), darkOld: prev.dark, darkNew: pl.dark, prev, pl, pt, t, tr, seed: i * 7 + 1 };
    const share = (TRANS[tr.type] || TRANS.fade)(p, X);
    ctx.save(); ctx.globalAlpha = 1 - share; ctx.drawImage(vig(prev.dark), 0, 0); ctx.globalAlpha = share; ctx.drawImage(vig(pl.dark), 0, 0); ctx.restore();
  } else {
    drawPlate(pl, t); ctx.drawImage(vig(pl.dark), 0, 0);
    // anticipation: 0.2 s before a lens-in, a small dot in the next world's colour pops onto the hero
    const nx = P[i + 1];
    if (nx && nx.enter && nx.enter.type === 'lensIn') { const a = E.outBack(inv(pl.dur - 0.22, pl.dur - 0.08, t)); if (a > 0) { const [hx, hy] = focusOf(pl, t);
      ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, 16 * a, 0, TAU); ctx.fillStyle = nx.dark ? PAL.night : PAL.paper; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#e9e7f5'; ctx.stroke(); ctx.restore(); } }
  }
  const gr = STORY.grain ?? 1;                                          // grain tile changes every drawing
  if (gr) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = gr * (pl.dark ? 0.5 : 0.8); ctx.translate(-(hash3(db, 4, 9) * 256 | 0), -(hash3(db, 5, 9) * 256 | 0));
    ctx.fillStyle = TEX.grain[db % 4]; ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore(); }
  if (pl.counter !== false) frameCounter(f, pl.dark);
}

/* ---------- audio: synthesized, rendered offline, deterministic ---------- */
const SR = 48000;
function noiseBuffer(ac, seconds, seed = 99) {
  const b = ac.createBuffer(1, Math.ceil(SR * seconds), SR), d = b.getChannelData(0), r = mulberry(seed);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b;
}
const panOf = t => (hash3(Math.round(t * 1000), 5) - 0.5) * 1.3;          // deterministic stereo spread
/** a musical key: stage n picks a chord from I–vi–IV–V–ii–V; night plates drop an octave and darken */
const PROG = [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12], [7, 11, 14, 17]];
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const note = (tonic, deg) => tonic * 2 ** (SCALE[((deg % 8) + 8) % 8] / 12 + Math.floor(deg / 8));
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
  tick(ac, out, t) { SFX.tone(ac, out, t, { f: 3200, dur: 0.03, g: 0.012, pan: panOf(t) }); },
  /** pen-on-paper scratch for the whole length of a typed line */
  scratch(ac, out, t, { chars = 20, cps = 30, g = 0.016 } = {}) { SFX.noise(ac, out, t, { dur: Math.max(0.15, chars / cps), g, f0: 3600, q: 1.1, a: 0.02, lfo: Math.min(cps, 24), pan: panOf(t) * 0.5 }); },
  pop(ac, out, t) { const pan = panOf(t); SFX.tone(ac, out, t, { f: 980, f2: 620, dur: 0.14, g: 0.07, pan }); SFX.tone(ac, out, t + 0.01, { f: 1960, dur: 0.08, g: 0.02, pan }); },
  chime(ac, out, t, { f = 660 } = {}) { [1, 2, 3.01].forEach((m, i) => SFX.tone(ac, out, t + i * 0.012, { f: f * m, dur: 2.0 - i * 0.5, g: 0.05 / (i + 1), a: 0.02, pan: (i - 1) * 0.3 })); },
  plink(ac, out, t, { f = 1500 } = {}) { SFX.tone(ac, out, t, { f, f2: f * 0.35, dur: 0.09, g: 0.06, pan: panOf(t) }); },
  thump(ac, out, t, { g = 0.25 } = {}) { SFX.tone(ac, out, t, { f: 90, f2: 42, dur: 0.22, g }); },
  swell(ac, out, t, { dur = 0.6, up = true } = {}) {
    SFX.tone(ac, out, t, { f: up ? 220 : 1300, f2: up ? 1300 : 200, dur, g: 0.05, type: 'triangle', a: dur * 0.6 });
    SFX.noise(ac, out, t, { dur, g: 0.08, f0: up ? 300 : 4000, f1: up ? 4000 : 300, q: 2 });
  },
  riser(ac, out, t, { dur = 0.35 } = {}) { SFX.noise(ac, out, t, { dur, g: 0.035, f0: 300, f1: 2400, q: 1.5, a: dur * 0.8 }); SFX.tone(ac, out, t, { f: 330, f2: 660, dur, g: 0.018, type: 'triangle', a: dur * 0.8 }); },
  crackle(ac, out, t, { dur = 0.8, g = 0.05 } = {}) { const r = mulberry(Math.round(t * 100));
    for (let i = 0; i < 26; i++) { const u = r(); SFX.noise(ac, out, t + u * dur * 0.9, { dur: 0.03 + r() * 0.05, g: g * (0.4 + r()), f0: 900 + u * 2600, q: 3, a: 0.004, pan: (r() - 0.5) * 1.2 }); }
    SFX.noise(ac, out, t, { dur, g: g * 0.5, f0: 200, f1: 1800, q: 0.8 }); },
  whoosh(ac, out, t, { dur = 0.6, g = 0.09, dir = 'lr' } = {}) { SFX.noise(ac, out, t, { dur, g, f0: 500, f1: 5000, q: 1.2, a: dur * 0.45, pan: dir === 'rl' ? 0.4 : dir === 'lr' ? -0.4 : 0 }); SFX.tone(ac, out, t + dur * 0.5, { f: 180, f2: 60, dur: 0.18, g: 0.08 }); },
  shutter(ac, out, t, { dur = 0.6 } = {}) { SFX.tick(ac, out, t); SFX.tone(ac, out, t + dur * 0.46, { f: 120, f2: 50, dur: 0.16, g: 0.16 }); SFX.tick(ac, out, t + dur * 0.55); SFX.tick(ac, out, t + dur * 0.6); },
  glide(ac, out, t, { dur = 0.8, up = false } = {}) { SFX.tone(ac, out, t, { f: up ? 260 : 900, f2: up ? 1100 : 220, dur, g: 0.045, a: dur * 0.3 }); SFX.noise(ac, out, t, { dur, g: 0.04, f0: up ? 400 : 3000, f1: up ? 3000 : 400, q: 1.5 }); },
  flick(ac, out, t, { dur = 0.7 } = {}) { SFX.noise(ac, out, t, { dur: 0.16, g: 0.12, f0: 2500, f1: 6000, q: 0.9, a: 0.02 }); SFX.noise(ac, out, t + dur * 0.55, { dur: 0.12, g: 0.09, f0: 900, q: 1, a: 0.01 }); SFX.thump(ac, out, t + dur * 0.62, { g: 0.14 }); },
  bend(ac, out, t, { dur = 0.8, f = 440, f2 = 660 } = {}) { SFX.tone(ac, out, t, { f, f2, dur, g: 0.05, type: 'triangle', a: 0.05 }); SFX.tone(ac, out, t, { f: f * 2, f2: f2 * 2, dur, g: 0.015, a: 0.05 }); },
  hiss(ac, out, t, { dur = 0.7 } = {}) { SFX.noise(ac, out, t, { dur, g: 0.06, f0: 1200, f1: 3500, q: 2, lfo: 14 }); },
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
const TRANS_SFX = {
  lensIn: (ac, o, t, d) => SFX.swell(ac, o, t - 0.05, { dur: d + 0.2, up: true }), lensOut: (ac, o, t, d) => SFX.swell(ac, o, t - 0.05, { dur: d + 0.2, up: false }),
  cut: (ac, o, t) => SFX.thump(ac, o, t), fade: () => {}, burn: (ac, o, t, d) => SFX.crackle(ac, o, t, { dur: d }),
  wipe: (ac, o, t, d, tr) => SFX.whoosh(ac, o, t, { dur: d, dir: tr.dir }), iris: (ac, o, t, d) => SFX.shutter(ac, o, t, { dur: d }),
  zoom: (ac, o, t, d, tr) => SFX.glide(ac, o, t, { dur: d, up: tr.dir === 'in' }), hatch: (ac, o, t, d) => SFX.hiss(ac, o, t, { dur: d }),
  page: (ac, o, t, d) => SFX.flick(ac, o, t, { dur: d }), roll: (ac, o, t, d) => SFX.flick(ac, o, t, { dur: d }), morph: (ac, o, t, d) => SFX.bend(ac, o, t, { dur: d }),
  shape: (ac, o, t, d) => { SFX.bend(ac, o, t, { dur: d }); SFX.swell(ac, o, t, { dur: d, up: true }); },
  bleed: (ac, o, t, d) => { SFX.noise(ac, o, t, { dur: d + 0.3, g: 0.07, f0: 250, f1: 1400, q: 0.7, a: d * 0.5 }); SFX.tone(ac, o, t + d * 0.3, { f: 110, f2: 70, dur: 0.5, g: 0.06 }); },
  pan: (ac, o, t, d, tr) => SFX.whoosh(ac, o, t, { dur: d, dir: tr.dir === 'right' ? 'rl' : 'lr', g: 0.12 }),
};
/** default bed when a plate has none and STORY.music = {tonic}: the stage's chord, darker and lower at night */
function autoBed(p) {
  const m = STORY.music; if (!m) return null;
  const n = p.stage ? p.stage.n : p.i, chord = p.i === STORY.plates.length - 1 ? [0, 7, 12, 14] : PROG[(n - (p.stage ? 1 : 0) + PROG.length * 4) % PROG.length];
  return (ac, out, t0, dur) => { SFX.padKey(ac, out, t0, { dur, tonic: m.tonic || 220, chord, g: m.gain || 0.018, dark: p.dark, oct: p.dark ? -1 : 0 });
    if (p.dark) SFX.noise(ac, out, t0, { dur, g: 0.025, f0: 160, type: 'lowpass', q: 0.5, a: 1 }); };
}
async function renderAudio() {
  const ac = new OfflineAudioContext(2, Math.ceil(SR * (TOTAL_T + 0.5)), SR); ac._noise = noiseBuffer(ac, 6);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.knee.value = 6; comp.connect(ac.destination);
  const dry = ac.createGain(); dry.gain.value = 0.9; dry.connect(comp);
  const rv = makeReverb(ac), wet = ac.createGain(); wet.gain.value = 0.3; rv.connect(wet).connect(comp);
  const out = ac.createGain(); out.gain.value = 3.8; out.connect(dry); out.connect(rv);
  const bedBus = ac.createGain(); bedBus.gain.value = 1; bedBus.connect(out);          // beds duck under transitions and cues
  const duck = (t, depth = 0.55, dur = 0.5) => { bedBus.gain.setValueAtTime(1, Math.max(0, t - 0.02)); bedBus.gain.linearRampToValueAtTime(1 - depth, t + 0.05); bedBus.gain.linearRampToValueAtTime(1, t + dur); };
  for (const p of STORY.plates) {
    const t0 = p.start, tr = p.enter, ty = tr?.type, d = tr?.dur || 0.5;
    if (p.i > 0) { if (ty !== 'fade') SFX.riser(ac, out, Math.max(0, t0 - 0.35)); (TRANS_SFX[ty] || TRANS_SFX.cut)(ac, out, t0, d, tr || {}); duck(t0, 0.5, d + 0.4); }
    if (p.header) { const hd = t0 + headerDelay(p), h = p.header;
      SFX.scratch(ac, out, hd, { chars: 9, cps: 30 }); SFX.scratch(ac, out, hd + 0.15, { chars: h.title.length, cps: 17 }); SFX.scratch(ac, out, hd + 0.7, { chars: h.sub.length, cps: 30, g: 0.012 }); }
    const bed = p.bed || autoBed(p); if (bed) bed(ac, bedBus, t0, p.dur);
    for (const [ct, type, opt] of (p.cues || [])) { SFX[type](ac, out, t0 + ct, opt || {}); if (type === 'chime' || type === 'pop') duck(t0 + ct, 0.25, 0.35); }
  }
  return ac.startRendering();
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
async function boot() {
  await Promise.all(FONT_LOADS.map(f => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
  buildTextures();
  window.__story = { fps: FPS, frames: TOTAL_F, width: W, height: H, title: STORY.title, starts: STORY.plates.map(p => ({ t: p.start, type: p.enter ? p.enter.type : null, dur: p.enter ? p.enter.dur : 0 })) };
  window.__renderFrame = f => { renderFrame(f); return true; };
  window.__frameData = (f, type = 'image/jpeg', q = 0.94) => { renderFrame(f); return cvs.toDataURL(type, q).split(',')[1]; };
  window.__audioWav = async () => b64(wavBytes(await renderAudio()));
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
  });
  (function loop() {
    let s = now(); if (s >= TOTAL_T) { stop(); pos = 0; s = 0; }
    const f = Math.min(TOTAL_F - 1, Math.floor(s * FPS)); renderFrame(f); bar.value = f;
    requestAnimationFrame(loop);
  })();
  ui.style.display = 'flex';
}
