/* =====================================================================
   PROPOSED ENGINE ADDITIONS  ·  loads after engine.js, before the story
   Everything here is a pure function of frame/progress. No new state.
   Build with:  python3 proposed_build.py story.js film.html
   ===================================================================== */

/* ---------- 1. easing, beats, stagger, exits ---------- */
Object.assign(E, {
  in3: t => t * t * t,
  inOut5: t => t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2,
  /** small pull-back before the move (use for launches, exits) */
  anticipate: t => { const c = 1.7; return t * t * ((c + 1) * t - c); },
  /** bigger overshoot than outBack */
  outBack2: t => { const c = 2.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  /** gentle spring settle (use for pops of physical things, not text) */
  outElastic: t => t >= 1 ? 1 : 1 - 2 ** (-7 * t) * Math.cos(t * TAU * 1.15),
});
/**
 * beat(t, t0, t1, {in, out}) -> 0..1 envelope: eases in at t0 (dur `in`), holds, eases OUT so it is gone at t1.
 * t1 = null means "never leaves". This is how a plate clears a beat before the next one lands.
 */
function beat(t, t0, t1 = null, o = {}) {
  const a = E.out3(inv(t0, t0 + (o.in ?? 0.35), t));
  if (t1 == null) return a;
  return Math.min(a, 1 - E.in2(inv(t1 - (o.out ?? 0.3), t1, t)));
}
/** stagger(i, t, {t0, step, dur, ease}) -> eased 0..1 for the i-th item of a group */
const stagger = (i, t, { t0 = 0, step = 0.08, dur = 0.4, ease = E.out3 } = {}) => ease(inv(t0 + i * step, t0 + i * step + dur, t));
/** run fn with globalAlpha scaled (skips entirely at 0) */
function withAlpha(a, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); }
/** eraseOut(poly, p): a hand "rubs out" an object: paper-coloured scribble thickens over it (p 0..1), then it is gone */
function eraseOut(poly, p, dark = false) {
  if (p <= 0) return 1; if (p >= 1) return 0;
  scribble(poly, { color: dark ? PAL.night : PAL.paper, alpha: 0.9, w: lerp(2, 14, p), gap: lerp(30, 10, p), seed: 77, angle: 0.45, draw: clamp(p * 1.4) });
  return 1 - E.in2(inv(0.6, 1, p));
}

/* ---------- 2. pen: tapered / pressure strokes ---------- */
/**
 * pen(points, {w, taper, pressure, color, seed, amp, draw, alpha, closed})
 * A ribbon-filled stroke: width = w * pressure(u). Default profile tapers both ends (taper = fraction of
 * length) and adds slow hand-pressure variation, so lines read as nib strokes rather than uniform vector lines.
 * With draw < 1 the leading end tapers to the pen tip.
 */
function pen(pts, o = {}) {
  const { w = 3.5, color = PAL.ink, seed = 1, amp = 1.0, draw = 1, alpha = 1, taper = 0.16, closed = false, minW = 0.25 } = o;
  if (draw <= 0 || alpha <= 0) return;
  let p = wobble(pts, closed, amp, seed); if (closed) p = p.concat([p[0]]);
  const Lfull = pathLen(p); if (Lfull <= 0) return;
  if (draw < 1) p = partial(p, draw, false);
  if (p.length < 2) return;
  const Lpart = pathLen(p);
  const prof = o.pressure || (u => {
    const tp = closed ? 1 : Math.min(1, Math.min(u, 1 - u) / taper);
    return (minW + (1 - minW) * Math.sqrt(tp)) * (0.82 + 0.18 * vnoise(u * 7 + seed, seed + 3));
  });
  const left = [], right = []; let s = 0;
  for (let i = 0; i < p.length; i++) {
    if (i) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    let hw = w * prof(s / Lfull) / 2;
    if (draw < 1) hw *= Math.min(1, (Lpart - s) / (taper * Lfull) + 0.05);      // pen-tip taper while drawing on
    left.push([p[i][0] + nx * hw, p[i][1] + ny * hw]); right.push([p[i][0] - nx * hw, p[i][1] - ny * hw]);
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  trace(left.concat(right.reverse()), true); ctx.fill();
  ctx.beginPath();
  for (const [q, u] of [[p[0], 0], [p[p.length - 1], Lpart / Lfull]]) { const hw = Math.max(0.3, w * prof(u) / 2 * (draw < 1 && u > 0 ? 0.3 : 1)); ctx.moveTo(q[0] + hw, q[1]); ctx.arc(q[0], q[1], hw, 0, TAU); }
  ctx.fill(); ctx.restore();
}

/* ---------- 3. richer texture primitives ---------- */
/** scribble(poly, {gap, color, alpha, w, seed, angle, draw}) — one continuous zig-zag pencil stroke clipped to the polygon */
function scribble(p, o = {}) {
  const { gap = 9, color = PAL.ink, alpha = 0.35, w = 1.4, seed = 4, angle = -0.6, draw = 1, jit = 3 } = o;
  const bb = bounds(p), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, R = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + gap;
  const ca = Math.cos(angle), sa = Math.sin(angle), r = mulberry(seed), pts = []; let dir = 1;
  for (let v = -R; v <= R; v += gap) {
    const u0 = -R + r() * gap, u1 = R - r() * gap, a = dir > 0 ? u0 : u1, b = dir > 0 ? u1 : u0;
    for (let k = 0; k <= 5; k++) { const u = lerp(a, b, k / 5), jv = v + (r() - 0.5) * jit * 2; pts.push([cx + ca * u - sa * jv, cy + sa * u + ca * jv]); }
    dir = -dir;
  }
  ctx.save(); trace(p, true); ctx.clip(); ink(pts, { w, color, alpha, amp: 1.5, seed: seed + 1, draw }); ctx.restore();
}
/** pebbles(poly, n, {rmin, rmax, color, alpha, w, seed, fill}) — the reference's gravel/aquifer texture: loose ovals */
function pebbles(p, n, o = {}) {
  const { rmin = 5, rmax = 14, color = PAL.ink, alpha = 0.5, w = 1.1, seed = 8, fill = null } = o;
  const bb = bounds(p), r = mulberry(seed);
  ctx.save(); trace(p, true); ctx.clip(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) { const x = lerp(bb.x0, bb.x1, r()), y = lerp(bb.y0, bb.y1, r()), rr = lerp(rmin, rmax, r()), rot = r() * TAU;
    ink(shape.ellipse(x, y, rr, rr * (0.55 + r() * 0.4), rot, 12), { closed: true, w, color, fill, amp: rr * 0.16, seed: seed + i }); }
  ctx.restore();
}
/** stipple(poly, n, opts) — fine ink dots (soil, sand, shadow) */
function stipple(p, n, o = {}) { speckle(p, n, { color: PAL.ink, alpha: 0.35, rmin: 0.6, rmax: 1.6, ...o }); }
/** grass(ridgePts, {every, h, color, seed, draw}) — tufts along a ground line */
function grass(ridge, o = {}) {
  const { every = 26, h = 14, color = PAL.leaf, seed = 9, draw = 1, w = 1.6 } = o, L = pathLen(ridge), n = Math.floor(L / every);
  for (let i = 0; i < n * draw; i++) { const [x, y] = along(ridge, i / n), r = mulberry(seed + i);
    for (let k = 0; k < 3; k++) { const dx = (r() - 0.5) * 10, hh = h * (0.6 + r() * 0.8); ink([[x + dx, y], [x + dx + (r() - 0.5) * 8, y - hh]], { w, color, amp: 0.4, seed: seed + i * 3 + k }); } }
}
/**
 * lobedCloud(x, base, bumps, {w, color, fill, seed, draw, hatchColor}) — the reference cloud: each lobe is its own
 * outlined disc, drawn back-to-front so front lobes cut the outlines of the ones behind; each lobe is pen-shaded on
 * its underside; a flat base line closes it. draw 0..1 draws lobes on one by one, then the base line.
 */
function lobedCloud(x, base, bumps, o = {}) {
  const { w = 3.2, color = PAL.ink, fill = '#efe9db', seed = 5, draw = 1, hatchColor = PAL.ink, alpha = 1 } = o;
  if (draw <= 0 || alpha <= 0) return;
  const lobes = bumps.map(([d, r, dy = 0], i) => ({ cx: x + d, cy: base - r * 0.38 - dy, r, i })).sort((a, b) => (a.cy + a.r) - (b.cy + b.r));
  const x0 = Math.min(...lobes.map(l => l.cx - l.r)), x1 = Math.max(...lobes.map(l => l.cx + l.r));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.rect(x0 - 30, base - 3000, x1 - x0 + 60, 3000); ctx.clip();
  lobes.forEach((l, k) => {
    const d = inv(k / lobes.length * 0.8, k / lobes.length * 0.8 + 0.25, draw); if (d <= 0) return;
    const c = shape.circle(l.cx, l.cy, l.r, 40);
    ink(c, { closed: true, w, color, fill: d >= 1 ? fill : null, amp: 1, seed: seed + l.i, draw: d });
    if (d >= 1) { hatch(c, { color: hatchColor, alpha: 0.42, gap: 4.5, len: 8, angle: -0.5, w: 1.2, seed: seed + 10 + l.i, keep: (px, py) => 0.95 * clamp((py - l.cy) / l.r + 0.3) ** 1.6 });
      hatch(c, { color: hatchColor, alpha: 0.25, gap: 7, len: 12, angle: 0.05, w: 1.1, seed: seed + 30 + l.i, keep: (px, py) => 0.8 * clamp((py - l.cy) / l.r - 0.1) ** 2 }); }
  });
  ctx.restore();
  const bd = E.out3(inv(0.75, 1, draw));
  if (bd > 0) { withAlpha(alpha, () => { flat(shape.rect(x0 + 2, base - 1, (x1 - x0 - 4) * bd, 6), fill); pen([[x0 + 2, base], [x1 - 2, base]], { w: w + 0.6, color, seed: seed + 99, draw: bd, taper: 0.05 }); }); }
}

/* ---------- 4. arrows, journey path, text on path, morph ---------- */
/** arrowPath(path, {draw, w, color, head, dash}) — a line drawn along a path, head riding its current end */
function arrowPath(path, o = {}) {
  const { draw = 1, w = 2.4, color = PAL.ink, head = 12, dash = null, amp = 0.8, seed = 3 } = o; if (draw <= 0) return;
  const p = partial(path, draw); ink(p, { w, color, dash, amp, seed });
  const e = p[p.length - 1], q = along(path, Math.max(0, draw - 0.02)); arrowHead(e[0], e[1], Math.atan2(e[1] - q[1], e[0] - q[0]), head, color, w);
}
/** fluxArrow(path, {width, draw, fill, color}) — hollow hatched ribbon arrow, width ∝ flux (recap plate) */
function fluxArrow(path, o = {}) {
  const { width = 30, draw = 1, fill = '#a9c6d4', color = PAL.ink, w = 2.4, seed = 6 } = o; if (draw <= 0) return;
  const L = pathLen(path), hl = Math.min(width * 1.5, L * 0.3), sEnd = L * draw, sHead = Math.max(0, sEnd - hl), n = 30, left = [], right = [];
  const norm = u => { const a = along(path, u), b = along(path, Math.min(1, u + 0.01)); const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [a, -dy / l, dx / l]; };
  for (let k = 0; k <= n; k++) { const [a, nx, ny] = norm(sHead * k / n / L), hw = width / 2; left.push([a[0] + nx * hw, a[1] + ny * hw]); right.push([a[0] - nx * hw, a[1] - ny * hw]); }
  const [b, nx, ny] = norm(sHead / L), tip = along(path, draw), hw = width * 0.95;
  const poly = [...left, [b[0] + nx * hw, b[1] + ny * hw], tip, [b[0] - nx * hw, b[1] - ny * hw], ...right.reverse()];
  ink(poly, { closed: true, w, color, fill, amp: 1, seed });
  hatch(poly, { color, alpha: 0.35, gap: 5, len: 9, angle: 0.9, seed: seed + 1, keep: 0.7 });
}
/** journeyPath(path, {draw, waypoints:[{u,label}], color, dark}) — dotted hero route + roman-numeral waypoints (recap) */
function journeyPath(path, o = {}) {
  const { draw = 1, waypoints = [], color = PAL.accent, dark = false, w = 2.2 } = o; if (draw <= 0) return;
  ink(partial(path, draw), { w, color, amp: 0.4, dash: [2, 9], seed: 12 });
  waypoints.forEach(({ u, label, dx = 14, dy = -14 }, i) => { if (u > draw) return;
    const [x, y] = along(path, u), a = E.outBack(clamp((draw - u) * 10));
    withAlpha(a, () => { ink(shape.circle(x, y, 9 * a, 18), { closed: true, w: 2, color, fill: dark ? PAL.night : PAL.paper, amp: 0.3, seed: 40 + i });
      text(label, x + dx, y + dy, { kind: 'mono', size: 14, weight: 600, color }); }); });
}
/** textOnPath(s, path, u0, opts) — glyphs laid along a polyline starting at fraction u0 */
function textOnPath(s, path, u0, o = {}) {
  const { size = 16, kind = 'mono', ls = 2 } = o, L = pathLen(path); let s0 = u0 * L;
  for (const ch of s) { const w = measure(ch, { kind, size }) + ls, u = (s0 + w / 2) / L; if (u > 1) break;
    const a = along(path, u), b = along(path, Math.min(1, u + 0.004));
    ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); text(ch, -w / 2 + ls / 2, 0, { ...o, kind, size, align: 'left' }); ctx.restore(); s0 += w; }
}
/** resample(pts, n, closed) — n points evenly spaced by arc length */
function resample(pts, n, closed = true) { const p = closed ? pts.concat([pts[0]]) : pts; return Array.from({ length: n }, (_, i) => along(p, i / (closed ? n : n - 1))); }
/** morph(A, B, u, n) — interpolate two closed shapes; aligns start point and winding so nothing twists */
function morph(A, B, u, n = 72) {
  const a = resample(A, n), b0 = resample(B, n), b1 = b0.slice().reverse();
  let best = null, bd = Infinity;
  for (const b of [b0, b1]) for (let k = 0; k < n; k++) { let d = 0; for (let i = 0; i < n; i += 3) { const q = b[(i + k) % n]; d += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } if (d < bd) { bd = d; best = [b, k]; } }
  const [b, k] = best; return a.map((p, i) => { const q = b[(i + k) % n]; return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)]; });
}

/* ---------- 5. camera + plate drawing with a scene transform ---------- */
/** withCamera({x, y, s, dx, dy, rot}, fn): draw fn() zoomed by s about pivot (x, y), panned by (dx, dy). Paper and HUD stay put. */
function withCamera(cam, fn) {
  if (!cam) return fn();
  const { x = W / 2, y = H / 2, s = 1, rot = 0, dx = 0, dy = 0 } = cam;
  ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(s, s); ctx.rotate(rot); ctx.translate(-x, -y); fn(); ctx.restore();
}
/** delay before the header starts, by transition type (measured from the reference: hold after a lens-in, none after a lens-out) */
const HEADER_DELAY = { cut: 0.25, lensIn: d => d + 0.4, lensOut: () => 0.05, fade: d => d * 0.6, burn: d => d * 0.75, wipe: d => d * 0.55, iris: d => d * 0.5 + 0.3, zoom: d => d * 0.85, morph: d => d * 0.85, page: d => d * 0.7, hatch: d => d * 0.6 };
function headerDelay(pl) { const tr = pl.enter; if (!tr || pl.i === 0) return 0.1; const h = HEADER_DELAY[tr.type] ?? 0.25; return typeof h === 'function' ? h(tr.dur || 0.5) : h; }
/**
 * drawPlate(pl, t, o): o.xf = fn applying extra ctx transforms to the SCENE (paper + HUD untouched),
 * o.all = true applies xf to everything (page turn), o.hud = alpha for the HUD, o.bg = false skips the paper.
 */
drawPlate = function (pl, t, o = {}) {
  const { xf = null, all = false, hud = 1, bg = true } = o;
  ctx.save();
  if (all && xf) xf();
  if (bg) background(pl.dark, t);
  const cam = pl.cam ? pl.cam(t) : null;
  ctx.save(); if (xf && !all) xf(); withCamera(cam, () => pl.draw(t, pl)); ctx.restore();
  if (hud > 0) {
    ctx.globalAlpha *= clamp(hud);
    const ht = t - headerDelay(pl);
    if (pl.header) plateHeader(ht, { ...pl.header, dark: pl.dark });
    if (pl.stage) stageDial(ht - 0.25, { ...pl.stage, N: STORY.stages }, pl.dark);   // reference: dial lands after the title
    if (pl.log) journeyLog(ht - 0.35, pl.log(t), pl.dark);                          // ...and the log after the dial
    if (pl.marks !== false) regMarks(pl.dark);
  }
  ctx.restore();
};

/* ---------- 6. transitions (pure functions of p) ---------- */
/** offscreen layer: render fn() into a fresh W×H canvas and return it (ctx is swapped for the duration) */
function layer(fn) { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), old = ctx; ctx = g; try { fn(); } finally { ctx = old; } return c; }
const TRANS = {
  /** ink-bleed / paper-burn: the new plate soaks through as a union of seeded blots spreading from the hero outward */
  burn(p, X) {
    const { drawOld, drawNew, focusNew, darkNew, seed } = X, e = E.inOut3(p);
    drawOld();
    const [fx, fy] = focusNew, N = 170, maxD = Math.hypot(W, H) * 0.55;
    const blots = Array.from({ length: N }, (_, i) => { const r = mulberry(seed * 131 + i); const a = r() * TAU, d = Math.sqrt(r()) * maxD * 1.15;
      const x = fx + Math.cos(a) * d, y = fy + Math.sin(a) * d, delay = 0.55 * (Math.hypot(x - fx, y - fy) / maxD) ** 0.9 + r() * 0.12;
      return { x, y, R: 70 + r() * 130, delay, seed: i + 1 }; });
    const path = () => { ctx.beginPath(); for (const b of blots) { const g = E.out2(inv(b.delay, b.delay + 0.42, e)); if (g <= 0) continue;
      const pts = shape.blob(b.x, b.y, b.R * g, b.seed + S.boil % 3, 0.5, 26); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.closePath(); } };
    // charred / bled edge: stroke the union, then cover the inside with the new plate so only the outer rim shows
    ctx.save(); ctx.lineJoin = 'round'; for (const [lw, al] of [[26, 0.10], [14, 0.22], [6, 0.7]]) { path(); ctx.lineWidth = lw; ctx.strokeStyle = darkNew ? `rgba(16,12,36,${al})` : `rgba(80,45,20,${al})`; ctx.stroke(); } ctx.restore();
    ctx.save(); path(); ctx.clip(); drawNew(); ctx.restore();
    return e;
  },
  /** ink wipe: a drawn, wobbly front sweeps across (dir: 'lr' | 'rl' | 'tb'); spray dots ride ahead of it */
  wipe(p, X) {
    const { drawOld, drawNew, darkNew, seed } = X, e = E.inOut3(p), dir = X.tr.dir || 'lr', vert = dir === 'tb';
    drawOld();
    const span = vert ? H : W, f = lerp(-160, span + 160, dir === 'rl' ? 1 - e : e);
    const edge = shape.ridge(0, vert ? W : H, 0, 55, seed + 3, 0.006, 16).map(([u, d]) => vert ? [u, f + d] : [f + d, u]);
    const poly = dir === 'rl' ? [[W + 10, -10], ...edge, [W + 10, H + 10]] : vert ? [[-10, -10], ...edge, [W + 10, -10]] : [[-10, -10], ...edge, [-10, H + 10]];
    ctx.save(); trace(poly, true); ctx.clip(); drawNew(); ctx.restore();
    if (p < 1) { pen(edge, { w: 5, color: darkNew ? PAL.nightInk : PAL.ink, seed: seed + 4, taper: 0.02, amp: 0.6 });
      const r = mulberry(seed + 9); ctx.fillStyle = darkNew ? PAL.nightInk : PAL.ink;
      for (let i = 0; i < 40; i++) { const u = r() * span, ahead = (r() * 60 + 10) * (dir === 'rl' ? -1 : 1), q = 2 + r() * 3 * Math.sin(u * 0.01 + S.T * 3) ** 2;
        ctx.beginPath(); ctx.arc(vert ? u : f + ahead, vert ? f + ahead : u, q, 0, TAU); ctx.fill(); } }
    return e;
  },
  /** iris / blink: a reticle closes on the old hero, holds two frames, opens on the new hero */
  iris(p, X) {
    const { drawOld, drawNew, focusOld, focusNew, darkNew } = X, Rmax = Math.hypot(W, H) * 0.6;
    const closing = p < 0.5, q = closing ? E.in3(inv(0, 0.46, p)) : E.out3(inv(0.54, 1, p));
    const [cx, cy] = closing ? focusOld : focusNew, r = closing ? lerp(Rmax, 0, q) : lerp(0, Rmax, q);
    ctx.drawImage(darkNew ? TEX.night : TEX.paper, 0, 0);
    if (r > 0) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); (closing ? drawOld : drawNew)(); ctx.restore(); lensRing(cx, cy, r, 1); }
    return closing ? 0 : 1;
  },
  /** zoom hand-off (scale ladder inside one continuous move): both plates share the hero point; the old shrinks to a dot
      while the new grows in from k× around it. dir 'out' = pull back to a larger world, 'in' = push into a smaller one */
  zoom(p, X) {
    const { drawOld, drawNew, focusOld, focusNew, tr } = X, e = E.inOut3(p), k = tr.k ?? 8, out = (tr.dir || 'out') === 'out';
    const sOld = out ? lerp(1, 1 / k, e) : lerp(1, k, e), sNew = out ? lerp(k, 1, e) : lerp(1 / k, 1, e);
    const pivot = [lerp(focusOld[0], focusNew[0], e), lerp(focusOld[1], focusNew[1], e)];
    const xf = (f, s) => () => { ctx.translate(pivot[0], pivot[1]); ctx.scale(s, s); ctx.translate(-f[0], -f[1]); };
    const aNew = E.inOut3(inv(0.25, 0.7, p));
    X.drawOldX({ xf: xf(focusOld, sOld), hud: 1 - inv(0, 0.35, p) });
    S.noReticle = p < 0.62; withAlpha(aNew, () => X.drawNewX({ xf: xf(focusNew, sNew), hud: inv(0.6, 1, p), bg: false })); S.noReticle = false;
    return e;
  },
  /** dissolve through hatching: the new plate appears as pen strokes that thicken until they merge */
  hatch(p, X) {
    const { drawOld, drawNew, seed } = X, e = E.inOut3(p), gap = 16, ang = -0.7, ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(W, H) / 2 + 40, r = mulberry(seed + 21);
    drawOld();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.beginPath();
    for (let v = -R; v <= R; v += gap) { let u = -R + r() * 60; while (u < R) { const L = 50 + r() * 110, d = r() * 0.25, h = gap * 1.15 * E.inOut3(inv(d, d + 0.75, e)); if (h > 0.2) ctx.rect(u, v - h / 2, L, h); u += L + 6 + r() * 30; } }
    ctx.clip(); ctx.rotate(-ang); ctx.translate(-W / 2, -H / 2); drawNew(); ctx.restore();
    void ca; void sa; return e;
  },
  /** page turn (notebook, spine at the top): the old page folds up and away, its blank back sweeps off, the new page is beneath */
  page(p, X) {
    const { drawOld, drawNew, darkOld, darkNew } = X, e = E.inOut3(p), th = e * Math.PI, c = Math.cos(th);
    drawNew();
    if (c > 0) { X.drawOldX({ all: true, xf: () => ctx.scale(1, c) });                      // front of the page, foreshortened
      const g = ctx.createLinearGradient(0, H * c, 0, H * c + 90); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, H * c, W, 90); }
    else { const h = H * -c; ctx.save(); ctx.drawImage(darkOld ? TEX.night : TEX.paper, 0, 0, W, H, 0, 0, W, h); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, W, h); ctx.restore();   // back of the page
      const g = ctx.createLinearGradient(0, h, 0, h + 90); g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, h, W, 90); }
    void darkNew; return e;
  },
  /** match cut through a morph: everything crossfades while one drawn object turns into another (tr.from(pt) -> tr.to(t)) */
  morph(p, X) {
    const { drawOld, drawNew, tr, pl, prev, pt, t } = X, e = E.inOut3(p);
    S.morph = true;                                                                  // plates check S.morph and skip their own object
    drawOld(); withAlpha(E.inOut3(inv(0.3, 0.8, p)), drawNew); S.morph = false;
    const A = tr.from(prev, pt), B = tr.to(pl, t), M = morph(A, B, e), st = tr.style ? tr.style(e) : {};
    ink(M, { closed: true, w: 3, amp: 1, seed: 33, ...st });
    return e;
  },
};
/** frame assembly: plates, transitions, vignette, counter */
renderFrame = function (f) {
  S.f = f; S.boil = Math.floor(f / 2); S.T = f / FPS;
  const T = S.T, P = STORY.plates; let i = P.findIndex(p => T < p.start + p.dur); if (i < 0) i = P.length - 1;
  const pl = P[i], t = T - pl.start, tr = pl.enter, vig = d => d ? TEX.vigNight : TEX.vigPaper;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; S.trans = null;
  if (i > 0 && tr && tr.type !== 'cut' && t < tr.dur) {
    const prev = P[i - 1], pt = prev.dur + t, p = t / tr.dur; S.trans = { type: tr.type, p };
    const X = { drawOld: () => drawPlate(prev, pt), drawNew: () => drawPlate(pl, t), drawOldX: o => drawPlate(prev, pt, o), drawNewX: o => drawPlate(pl, t, o),
      focusOld: prev.focus(pt), focusNew: pl.focus(t), darkOld: prev.dark, darkNew: pl.dark, prev, pl, pt, t, tr, seed: i * 7 + 1 };
    let share;
    if (tr.type === 'fade') { X.drawOld(); withAlpha(E.inOut3(p), X.drawNew); share = E.inOut3(p); }
    else if (tr.type === 'lensIn' || tr.type === 'lensOut') {
      // anticipation: a dark dot pops on the hero 5 frames before a lens-in opens (as in the reference)
      lensTransition(tr.type, p, X.drawOld, X.drawNew, X.focusOld, X.focusNew, prev.dark, pl.dark); share = tr.type === 'lensIn' ? E.inOut3(p) : 1;
    } else share = TRANS[tr.type](p, X);
    ctx.save(); ctx.globalAlpha = 1 - share; ctx.drawImage(vig(prev.dark), 0, 0); ctx.globalAlpha = share; ctx.drawImage(vig(pl.dark), 0, 0); ctx.restore();
  } else {
    drawPlate(pl, t); ctx.drawImage(vig(pl.dark), 0, 0);
    // lens-in anticipation dot: 0.2 s before the next plate's lensIn, a small dark ring pops onto the hero
    const nx = P[i + 1]; if (nx && nx.enter && nx.enter.type === 'lensIn') { const a = E.outBack(inv(pl.dur - 0.22, pl.dur - 0.08, t)); if (a > 0) { const [hx, hy] = pl.focus(t);
      ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, 16 * a, 0, TAU); ctx.fillStyle = nx.dark ? PAL.night : PAL.paper; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#e9e7f5'; ctx.stroke(); ctx.restore(); } }
  }
  if (pl.counter !== false) frameCounter(f, pl.dark);
};

/* ---------- 7. polish of existing pieces ---------- */
/** faster hatch: only walks rows/dashes that can touch the polygon's bounding box (2-4x on wide bands) */
hatch = function (p, o = {}) {
  const { angle = -0.45, gap = 7, len = 12, color = PAL.ink, alpha = 0.3, w = 1.3, seed = 3, keep = 0.8, jit = 0.8 } = o;
  const bb = bounds(p), ca = Math.cos(angle), sa = Math.sin(angle);
  const corners = [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]];
  const us = corners.map(([x, y]) => ca * x + sa * y), vs = corners.map(([x, y]) => -sa * x + ca * y);
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
};
/** calmer contours: four large smooth loops instead of six tangles; fainter on paper */
contours = function (t, dark, seed = 21) {
  const r = mulberry(seed);
  for (let i = 0; i < 4; i++) { const cx = r() * W, cy = r() * H, rad = 260 + r() * 300, col = PAL.topo[i % PAL.topo.length];
    for (let k = 0; k < 2; k++) { const p = shape.blob(cx + Math.sin(t * 0.05 + i) * 16, cy, rad * (1 - k * 0.18), seed + i * 7 + k, 0.22, 96, t * 0.012 * (i % 2 ? 1 : -1));
      ink(p, { closed: true, w: 1.3, color: col, alpha: dark ? 0.10 : 0.16, amp: 0 }); } }
};
/** journey log with a STATE row that fits on one line (13 px options, tighter dots) and wraps only when it must */
journeyLog = function (t, log, dark) {
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
};
/** paper rebuilt: soft-edged bands at half the strength, fibres, large-scale mottling, grain (replaces TEX.paper) */
{ const _bt = buildTextures; buildTextures = function () { _bt();
  const c = TEX.paper, g = c.getContext('2d'), r = mulberry(11);
  g.fillStyle = PAL.paper; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 4);
  for (let x = -1700; x < 1700; x += 132) { const lg = g.createLinearGradient(x, 0, x + 66, 0);
    lg.addColorStop(0, 'rgba(205,175,115,0)'); lg.addColorStop(0.2, 'rgba(205,175,115,0.10)'); lg.addColorStop(0.8, 'rgba(205,175,115,0.10)'); lg.addColorStop(1, 'rgba(205,175,115,0)');
    g.fillStyle = lg; g.fillRect(x, -1700, 66, 3400); }
  g.restore();
  for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H, R = 260 + r() * 420, rg = g.createRadialGradient(x, y, 0, x, y, R);
    rg.addColorStop(0, i % 2 ? 'rgba(120,90,50,0.055)' : 'rgba(255,250,235,0.08)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
  g.lineCap = 'round';
  for (let i = 0; i < 3200; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 4 + r() * 18;
    g.strokeStyle = `rgba(${r() < .5 ? '110,90,60' : '160,140,110'},${0.05 + r() * 0.07})`; g.lineWidth = 0.6 + r() * 0.8;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * .5, y + Math.sin(a + 0.6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const img = g.getImageData(0, 0, W, H), d = img.data, rr = mulberry(3);
  for (let i = 0; i < d.length; i += 4) { const n = (rr() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(img, 0, 0);
}; }
/** the hero reticle is furniture, not scene art: hide it while a zoom hand-off is scaling the incoming plate */
{ const _ret = reticle; reticle = function (...a) { if (S.noReticle) return; _ret(...a); }; }
/** smooth(pts, k) — Chaikin corner cutting, k rounds; turns a rough polyline into a curve the pen can follow */
function smooth(pts, k = 2, closed = false) { let p = pts;
  for (let r = 0; r < k; r++) { const q = []; const n = closed ? p.length : p.length - 1; if (!closed) q.push(p[0]);
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25)], [lerp(a[0], b[0], 0.75), lerp(a[1], b[1], 0.75)]); }
    if (!closed) q.push(p[p.length - 1]); p = q; } return p; }

/* ---------- 8. sound: cues for the new transitions + musical glue ---------- */
Object.assign(SFX, {
  /** paper burn / ink bleed: crackle = many tiny filtered-noise grains with a rising centre frequency */
  crackle(ac, out, t, { dur = 0.8, g = 0.05 } = {}) { const r = mulberry(Math.round(t * 100));
    for (let i = 0; i < 26; i++) { const u = r(); SFX.noise(ac, out, t + u * dur * 0.9, { dur: 0.03 + r() * 0.05, g: g * (0.4 + r()), f0: 900 + u * 2600, q: 3, a: 0.004 }); }
    SFX.noise(ac, out, t, { dur, g: g * 0.5, f0: 200, f1: 1800, q: 0.8 }); },
  /** ink wipe: one broadband whoosh, filter sweeping with the front */
  whoosh(ac, out, t, { dur = 0.6, g = 0.09 } = {}) { SFX.noise(ac, out, t, { dur, g, f0: 500, f1: 5000, q: 1.2, a: dur * 0.45 }); SFX.tone(ac, out, t + dur * 0.5, { f: 180, f2: 60, dur: 0.18, g: 0.08 }); },
  /** iris: two shutter ticks around a soft thump */
  shutter(ac, out, t, { dur = 0.6 } = {}) { SFX.tick(ac, out, t); SFX.tone(ac, out, t + dur * 0.46, { f: 120, f2: 50, dur: 0.16, g: 0.16 }); SFX.tick(ac, out, t + dur * 0.55); SFX.tick(ac, out, t + dur * 0.6); },
  /** zoom hand-off: a sine glide with vibrato, up when pushing in, down when pulling out */
  glide(ac, out, t, { dur = 0.8, up = false } = {}) { SFX.tone(ac, out, t, { f: up ? 260 : 900, f2: up ? 1100 : 220, dur, g: 0.045, type: 'sine', a: dur * 0.3 }); SFX.noise(ac, out, t, { dur, g: 0.04, f0: up ? 400 : 3000, f1: up ? 3000 : 400, q: 1.5 }); },
  /** page turn: a paper flick (bright short noise) then the page landing */
  flick(ac, out, t, { dur = 0.7 } = {}) { SFX.noise(ac, out, t, { dur: 0.16, g: 0.12, f0: 2500, f1: 6000, q: 0.9, a: 0.02 }); SFX.noise(ac, out, t + dur * 0.55, { dur: 0.12, g: 0.09, f0: 900, q: 1, a: 0.01 }); SFX.thump(ac, out, t + dur * 0.62, { g: 0.14 }); },
  /** morph: a portamento between two pitches (the thing becomes another thing) */
  bend(ac, out, t, { dur = 0.8, f = 440, f2 = 660 } = {}) { SFX.tone(ac, out, t, { f, f2, dur, g: 0.05, type: 'triangle', a: 0.05 }); SFX.tone(ac, out, t, { f: f * 2, f2: f2 * 2, dur, g: 0.015, a: 0.05 }); },
  /** riser: 0.35 s of anticipation before any transition (noise + rising tone), so cuts never feel abrupt */
  riser(ac, out, t, { dur = 0.35 } = {}) { SFX.noise(ac, out, t, { dur, g: 0.035, f0: 300, f1: 2400, q: 1.5, a: dur * 0.8 }); SFX.tone(ac, out, t, { f: 330, f2: 660, dur, g: 0.018, type: 'triangle', a: dur * 0.8 }); },
  /** stereo pad in a key: chord degrees over a tonic, sine+triangle pairs detuned and panned; dark = darker filter */
  padKey(ac, out, t, { dur = 8, tonic = 220, chord = [0, 4, 7], g = 0.02, dark = false, oct = 0 } = {}) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = dark ? 650 : 1500; lp.connect(out);
    chord.forEach((semi, i) => { const f = tonic * 2 ** (semi / 12 + oct); [-0.6, 0.6].forEach((pan, j) => {
      const o = ac.createOscillator(), v = ac.createGain(), pn = ac.createStereoPanner(); o.type = j ? 'triangle' : 'sine'; o.frequency.value = f * (1 + (j ? 0.0028 : -0.0018)); pn.pan.value = pan * (i % 2 ? -1 : 1);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g / (j + 1.4), t + 1.4); v.gain.setValueAtTime(g / (j + 1.4), t + dur - 0.7); v.gain.linearRampToValueAtTime(0, t + dur + 0.4);
      o.connect(v).connect(pn).connect(lp); o.start(t); o.stop(t + dur + 0.5); }); });
  },
});
const TRANS_SFX = { lensIn: (ac, o, t, d) => SFX.swell(ac, o, t - 0.05, { dur: d + 0.2, up: true }), lensOut: (ac, o, t, d) => SFX.swell(ac, o, t - 0.05, { dur: d + 0.2, up: false }),
  cut: (ac, o, t) => SFX.thump(ac, o, t), fade: () => {}, burn: (ac, o, t, d) => SFX.crackle(ac, o, t, { dur: d }), wipe: (ac, o, t, d) => SFX.whoosh(ac, o, t, { dur: d }),
  iris: (ac, o, t, d) => SFX.shutter(ac, o, t, { dur: d }), zoom: (ac, o, t, d, tr) => SFX.glide(ac, o, t, { dur: d, up: tr.dir === 'in' }), hatch: (ac, o, t, d) => SFX.noise(ac, o, t, { dur: d, g: 0.06, f0: 1200, f1: 3500, q: 2, lfo: 14 }),
  page: (ac, o, t, d) => SFX.flick(ac, o, t, { dur: d }), morph: (ac, o, t, d) => SFX.bend(ac, o, t, { dur: d }) };
renderAudio = async function () {
  const ac = new OfflineAudioContext(2, Math.ceil(SR * (TOTAL_T + 0.5)), SR); ac._noise = noiseBuffer(ac, 6);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.knee.value = 6; comp.connect(ac.destination);
  const dry = ac.createGain(); dry.gain.value = 0.9; dry.connect(comp);
  const rv = makeReverb(ac), wet = ac.createGain(); wet.gain.value = 0.28; rv.connect(wet).connect(comp);
  const out = ac.createGain(); out.gain.value = 2.6; out.connect(dry); out.connect(rv);
  const bedBus = ac.createGain(); bedBus.gain.value = 1; bedBus.connect(out);                      // beds go through a duckable bus
  const duck = (t, depth = 0.55, dur = 0.5) => { bedBus.gain.setValueAtTime(1, t - 0.02); bedBus.gain.linearRampToValueAtTime(1 - depth, t + 0.05); bedBus.gain.linearRampToValueAtTime(1, t + dur); };
  for (const p of STORY.plates) {
    const t0 = p.start, tr = p.enter, ty = tr?.type, d = tr?.dur || 0.5;
    if (p.i > 0) { if (ty !== 'fade') SFX.riser(ac, out, t0 - 0.35); (TRANS_SFX[ty] || TRANS_SFX.cut)(ac, out, t0, d, tr || {}); duck(t0, 0.5, d + 0.4); }
    const hd = headerDelay(p);
    if (p.header) for (let k = 0; k < 6; k++) SFX.tick(ac, out, t0 + hd + k * 0.06);
    if (p.bed) p.bed(ac, bedBus, t0, p.dur);
    for (const [ct, type, opt] of (p.cues || [])) { SFX[type](ac, out, t0 + ct, opt || {}); if (type === 'chime' || type === 'pop') duck(t0 + ct, 0.25, 0.35); }
  }
  return ac.startRendering();
};
