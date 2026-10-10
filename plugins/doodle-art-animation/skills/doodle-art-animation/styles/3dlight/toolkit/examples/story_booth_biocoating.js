// "Dressed in Mucus": the oral nanoparticle booth loop (Mathiowitz Lab, Brown innovation expo, 2026-10). A 3DLight example.
// 45 s seamless loop: 10 beats x 4.5 s on screen (6 s of art time each), teal accent.
// Build: python3 build.py examples/story_booth_biocoating.js biocoating.html   Render: node render.mjs biocoating.html biocoating.mp4
//
// Organised in parts: 1. scene helpers (the gut wall, the capsule pose), 2. the art of the ten
// beats (B[0] ... B[9], sharing sprites and paths), 3. sound events and cue helpers, 4. defineFilm.
// The words and numbers come from Azagury et al., Small 2022 (films/biocoating facts); do not change them without the source.
(() => {
/* ======================= 1. scene helpers of this film (were in the booth's style_l3d.js) ======================= */
const SCENE = (() => {
  const { layer, strandSet } = L3D;
  const CAP = { x: 1300, y: 330, L: 380, R: 78, ang: -0.5 };
  const gutBase = x => 872 - 150 * Math.pow((x - 1385) / 470, 2);

  function gutWall(seed) {
    const f = gutBase, df = x => -300 * (x - 1385) / (470 * 470), x0 = 905, x1 = 1855;
    const c = off(W, H);
    withCtx(c.getContext('2d'), () => {
      // tissue wall
      X.beginPath(); for (let x = x0; x <= x1; x += 10) X.lineTo(x, f(x) - 4); for (let x = x1; x >= x0; x -= 10) X.lineTo(x, f(x) + 70); X.closePath();
      const wg = X.createLinearGradient(0, 700, 0, 950); wg.addColorStop(0, '#EDB3A6'); wg.addColorStop(1, '#D48B7E'); X.fillStyle = wg; X.fill();
      const finger = (x, h, w, pal, lift) => {
        const n = Math.atan2(-1, df(x)); X.save(); X.translate(x, f(x) - lift); X.rotate(n + Math.PI / 2);
        X.beginPath(); X.moveTo(-w / 2, 24); X.bezierCurveTo(-w / 2, -h * 0.5, -w / 2, -h + w * 0.2, -w / 2, -h + w / 2); X.arc(0, -h + w / 2, w / 2, Math.PI, 0); X.bezierCurveTo(w / 2, -h + w * 0.2, w / 2, -h * 0.5, w / 2, 24); X.closePath();
        const g = X.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, pal.lo); g.addColorStop(0.32, pal.mid); g.addColorStop(0.5, pal.hi); g.addColorStop(0.8, pal.mid); g.addColorStop(1, pal.lo); X.fillStyle = g; X.fill();
        const v = X.createLinearGradient(0, -h, 0, 20); v.addColorStop(0, 'rgba(255,255,255,.22)'); v.addColorStop(1, 'rgba(150,60,55,.22)'); X.fillStyle = v; X.fill(); X.restore();
      };
      const R = rng(seed);
      const back = { hi: '#FFF1EC', mid: '#F5C8BC', lo: '#DE9D8F' }, front = { hi: '#FFEAE3', mid: '#F2AD9D', lo: '#C46B5E' };
      const bl = off(W, H); withCtx(bl.getContext('2d'), () => { for (let x = x0 + 30; x <= x1; x += 58) finger(x, 112 + R() * 30, 48, back, 34); });
      X.save(); X.filter = 'blur(3px)'; X.drawImage(bl, 0, 0); X.restore();
      for (let x = x0 + 4; x <= x1; x += 62) finger(x, 118 + R() * 34, 54, front, 0);
      // translucent mucus over the lining
      X.save(); X.beginPath(); for (let x = x0; x <= x1; x += 10) X.lineTo(x, f(x) - 168 + Math.sin(x * 0.018) * 8); for (let x = x1; x >= x0; x -= 10) X.lineTo(x, f(x) + 6); X.closePath();
      const mg = X.createLinearGradient(0, 560, 0, 880); mg.addColorStop(0, 'rgba(165,224,208,.34)'); mg.addColorStop(0.45, 'rgba(150,215,198,.2)'); mg.addColorStop(1, 'rgba(120,200,182,.1)'); X.fillStyle = mg; X.fill(); X.clip();
      layer(() => strandSet(seed + 3, [x0, 560, x1 - x0, 300], 10, 6), { alpha: 0.45 }); X.restore();
      X.save(); X.strokeStyle = 'rgba(255,255,255,.8)'; X.lineWidth = 3; X.beginPath(); for (let x = x0; x <= x1; x += 10) X.lineTo(x, f(x) - 168 + Math.sin(x * 0.018) * 8); X.stroke(); X.restore();
      // fade the cut ends
      X.globalCompositeOperation = 'destination-in'; const m = X.createLinearGradient(x0, 0, x1, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.1, '#000'); m.addColorStop(0.9, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = m; X.fillRect(0, 0, W, H);
      const m2 = X.createLinearGradient(0, 860, 0, 940); m2.addColorStop(0, '#000'); m2.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = m2; X.fillRect(0, 0, W, H);
    });
    X.drawImage(c, 0, 0);
  }
  return { gutWall, gutBase, CAP };
})();

/* ======================= 2. the art of the ten beats (the booth's anim_bio.js) ======================= */
const L = L3D.extend(SCENE); // L3D plus this film's scene helpers, so the art below calls them as L.gutWall
const { M, TAU, CAP, gutBase, gsph, tube, spline, pathOpen, poly } = L;
// same timing helpers as window.ANIM_UTIL (anim_base.js loads after this file, so they are repeated here)
const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const eo = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const seg = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const sm5 = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const B = []; // B[i] = (P, S, t) => draws beat i + 1

/* ---------------- caches and drawing utilities ---------------- */
const memo = {};
function once(key, w, h, fn) { if (!memo[key]) { const c = off(w, h); withCtx(c.getContext('2d'), fn); memo[key] = c; } return memo[key]; }
function put(c, x, y, a = 1, s = 1) { // sprite centred on (x, y)
  if (a <= 0) return; X.save(); X.globalAlpha *= a; X.drawImage(c, x - c.width * s / 2, y - c.height * s / 2, c.width * s, c.height * s); X.restore();
}
// group: draw fn into a scratch canvas (device pixels, current transform kept), then onto X with one alpha
const pool = {};
function group(key, box, a, fn) {
  if (a <= 0) return;
  const T = X.getTransform(); const [x0, y0, w, h] = box;
  const p0 = T.transformPoint(new DOMPoint(x0, y0)), p1 = T.transformPoint(new DOMPoint(x0 + w, y0 + h));
  const dx = Math.floor(Math.min(p0.x, p1.x)), dy = Math.floor(Math.min(p0.y, p1.y));
  const dw = Math.ceil(Math.abs(p1.x - p0.x)) + 2, dh = Math.ceil(Math.abs(p1.y - p0.y)) + 2;
  let c = pool[key]; if (!c || c.width < dw || c.height < dh) c = pool[key] = off(Math.max(dw, c ? c.width : 0), Math.max(dh, c ? c.height : 0));
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, c.width, c.height);
  g.setTransform(T.a, T.b, T.c, T.d, T.e - dx, T.f - dy);
  withCtx(g, fn);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = a; X.drawImage(c, 0, 0, dw, dh, dx, dy, dw, dh); X.restore();
}
// soft contact shadow from one blurred sprite (no per-frame blur filter)
function shadow(cx, cy, rx, ry, a) {
  if (a <= 0) return;
  const c = once('shadow', 320, 320, () => { X.filter = 'blur(20px)'; X.fillStyle = 'rgb(20,36,58)'; X.beginPath(); X.arc(160, 160, 92, 0, TAU); X.fill(); X.filter = 'none'; });
  const k = 160 / 92; X.save(); X.globalAlpha = a; X.drawImage(c, cx - rx * k, cy - ry * k, rx * 2 * k, ry * 2 * k); X.restore();
}
// particle sprite (L3D.particle drawn once); k > 1 renders it sharper for a zoomed camera
function pSpr(r, o = {}, k = 1) {
  const key = 'P' + [r, k, o.seed || 0, o.coat ? 1 : 0, o.shadow === false ? 0 : 1, o.shY || 0, JSON.stringify(o.coatO || {})].join('|');
  const half = Math.ceil((r * 1.9 + 30) * k);
  return once(key, half * 2, half * 2, () => L.particle(half, half, r * k, o));
}
function putP(r, x, y, o, a = 1, k = 1) { if (a <= 0) return; const c = pSpr(r, o, k); put(c, x, y, a, 1 / k); }
// tags and numbered tags as sprites, with the same geometry as L3D.tag / L3D.numTag
function tagGeom(s, x, y, o = {}) {
  const h = 70, m = meas(s, { w: 600, size: 40, f: F.sora }); const bw = m + 48 + (o.dot ? 30 : 0);
  const bx = o.align === 'center' ? x - bw / 2 : o.align === 'right' ? x - bw : x, by = y - h / 2;
  return { x: bx, y: by, w: bw, h, cx: bx + bw / 2, r: bx + bw, b: by + h };
}
function tagA(s, x, y, o = {}, a = 1) {
  const g = tagGeom(s, x, y, o); if (a <= 0) return g; const pad = 44;
  const c = once('tag|' + s + (o.dot ? '|dot' : ''), Math.ceil(g.w + pad * 2), g.h + pad * 2, () => L.tag(s, pad, pad + g.h / 2, { dot: o.dot ? L.A.a : null }));
  X.save(); X.globalAlpha = a; X.drawImage(c, Math.round(g.x - pad), Math.round(g.y - pad)); X.restore(); return g;
}
function numTagA(n, word, x, y, a) {
  if (a <= 0) return; const m = meas(word, { w: 700, size: 40, f: F.sora, ls: 2 }); const bw = 54 + 14 + m + 32, h = 70, pad = 44;
  const c = once('nt|' + n + word, Math.ceil(bw + pad * 2), h + pad * 2, () => L.numTag(n, word, pad, pad + h / 2));
  X.save(); X.globalAlpha = a; X.drawImage(c, Math.round(x - pad), Math.round(y - h / 2 - pad)); X.restore();
}
function leaderA(x1, y1, x2, y2, a) { if (a <= 0) return; X.save(); X.globalAlpha = a; L.leader(x1, y1, x2, y2); X.restore(); }
// paths with arc length
function mkPath(ctrl, n) { const pts = spline(ctrl, n); const tab = [0]; for (let k = 1; k < pts.length; k++) tab.push(tab[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { pts, tab, len: tab[tab.length - 1] }; }
function at(p, d) {
  const { pts, tab } = p, n = pts.length; if (d <= 0) return pts[0].slice(); if (d >= tab[n - 1]) return pts[n - 1].slice();
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] <= d) lo = m; else hi = m; }
  const k = (d - tab[lo]) / (tab[hi] - tab[lo]); return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k)];
}
function between(p, a, b) { // polyline from arc length a to b
  if (b <= a) return []; const out = [at(p, a)]; p.pts.forEach((q, k) => { if (p.tab[k] > a && p.tab[k] < b) out.push(q); }); out.push(at(p, b)); return out;
}
function partial(pts, f) { // first fraction f of a point list
  if (f <= 0) return null; const n = pts.length; if (f >= 1) return pts; const x = f * (n - 1), k = Math.floor(x), u = x - k;
  const out = pts.slice(0, k + 1); out.push([lerp(pts[k][0], pts[k + 1][0], u), lerp(pts[k][1], pts[k + 1][1], u)]); return out;
}
/* ---------------- cartoon molecules: a protein ribbon and a lumpy enzyme, matte ----------------
   The particles in this film are smooth spheres, so the free protein drug and the enzymes are drawn the way
   structural biologists draw proteins: a folded ribbon (alpha helices + loops) and a lumpy globular blob with a cleft. */
const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const v3norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const v3lerp = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
// Ribbons are built in a local frame laid out like the screen: x right, y down, z toward the viewer.
// A knot is { p: [x, y, z], n: face normal hint, hw: half width }.
const LOOPW = 3.7;
function helixKnots(x0, x1, yc, R, turns, ph, hw, lw = LOOPW) { // right-handed alpha helix along +x (front strands run top-left to bottom-right)
  const out = [], n = Math.round(turns * 12);
  for (let i = 0; i <= n; i++) {
    const f = i / n, a = ph + f * turns * TAU, rad = [0, -Math.cos(a), Math.sin(a)];
    out.push({ p: [lerp(x0, x1, f), yc + R * rad[1], R * rad[2]], n: rad, hw: lerp(lw, hw, sm5(Math.min(1, i / 3, (n - i) / 3))) });
  }
  return out;
}
const loopKnots = (pts, hw = LOOPW) => pts.map(([x, y, z, nx = 0, ny = 0, nz = 1, w = hw]) => ({ p: [x, y, z], n: v3norm([nx, ny, nz]), hw: w }));
// Catmull-Rom through the knots, resampled evenly along the backbone; each section gets centre c, face normal n, half-width vector w
function ribbonBuild(knots, step = 2.2) {
  const P = knots.map(k => k.p), n = P.length, dense = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    for (let k = 0; k < 10; k++) {
      const t = k / 10, t2 = t * t, t3 = t2 * t;
      const p = [0, 1, 2].map(d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
      dense.push({ p, n: v3lerp(knots[i].n, knots[i + 1].n, t), hw: lerp(knots[i].hw, knots[i + 1].hw, t) });
    }
  }
  dense.push({ p: P[n - 1], n: knots[n - 1].n, hw: knots[n - 1].hw });
  const Lc = [0]; for (let i = 1; i < dense.length; i++) Lc.push(Lc[i - 1] + Math.hypot(...v3sub(dense[i].p, dense[i - 1].p)));
  const tot = Lc[Lc.length - 1], m = Math.max(2, Math.round(tot / step)), out = []; let j = 0;
  for (let k = 0; k <= m; k++) {
    const d = tot * k / m; while (j < dense.length - 2 && Lc[j + 1] < d) j++;
    const u = clamp((d - Lc[j]) / ((Lc[j + 1] - Lc[j]) || 1)), a = dense[j], b = dense[j + 1];
    out.push({ c: v3lerp(a.p, b.p, u), nh: v3lerp(a.n, b.n, u), hw: lerp(a.hw, b.hw, u) });
  }
  let prev = null;
  out.forEach((s, i) => {
    const T = v3norm(v3sub(out[Math.min(out.length - 1, i + 1)].c, out[Math.max(0, i - 1)].c));
    let nn = v3norm(v3sub(s.nh, T.map(v => v * v3dot(s.nh, T))));
    if (prev && v3dot(nn, prev) < 0) nn = nn.map(v => -v); // no sudden flips (keeps the ribbon edges continuous)
    prev = nn; s.n = nn; s.w = v3norm(v3cross(T, nn)).map(v => v * s.hw);
  });
  return out;
}
// place local sections on the screen: f(x, y) -> [X, Y, cos, sin] (position, and the rotation of the local frame there)
function ribbonMap(R, f, i0 = 0, i1 = R.length - 1) {
  const S = [];
  for (let i = i0; i <= i1; i++) {
    const s = R[i], [x, y, c, sn] = f(s.c[0], s.c[1]), rot = v => [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2]];
    const w = rot(s.w); S.push({ x, y, z: s.c[2], wx: w[0], wy: w[1], n: rot(s.n), nh: rot(s.nh) });
  }
  return S;
}
function ribbonMove(S, ox, oy, c0, ang, tx, ty) { // rigid move of screen sections: shift by (ox, oy), rotate about c0, put c0 at (tx, ty)
  const ca = Math.cos(ang), sa = Math.sin(ang), r2 = (u, v) => [u * ca - v * sa, u * sa + v * ca];
  return S.map(s => { const [x, y] = r2(s.x + ox - c0[0], s.y + oy - c0[1]), [wx, wy] = r2(s.wx, s.wy), [nx, ny] = r2(s.n[0], s.n[1]), [hx, hy] = r2(s.nh[0], s.nh[1]);
    return { x: tx + x, y: ty + y, z: s.z, wx, wy, n: [nx, ny, s.n[2]], nh: [hx, hy, s.nh[2]] }; });
}
// matte warm gold: diffuse light from the upper left, the inside face of a helix a shade deeper, a thin darker edge
const RIBC = { hi: [248, 214, 140], mid: [230, 168, 60], lo: [172, 104, 26], line: '#84530F' }, RLIGHT = v3norm([-0.45, -0.6, 0.66]);
function ribCol(k, inner) {
  const c = k < 0.5 ? v3lerp(RIBC.lo, RIBC.mid, k / 0.5) : v3lerp(RIBC.mid, RIBC.hi, (k - 0.5) / 0.5);
  const f = inner ? 0.86 : 1; return `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * (inner ? 0.82 : 1))},${Math.round(c[2] * (inner ? 0.7 : 1))})`;
}
function ribbonDraw(S, i0 = 0, i1 = S.length - 1, lw = 1.7) {
  if (i1 - i0 < 1) return; const quads = [];
  for (let i = i0; i < i1; i++) {
    const a = S[i], b = S[i + 1]; let n = v3norm([a.n[0] + b.n[0], a.n[1] + b.n[1], a.n[2] + b.n[2]]); if (n[2] < 0) n = n.map(v => -v);
    const inner = v3dot(n, a.nh) < 0, k = 0.26 + 0.7 * Math.max(0, v3dot(n, RLIGHT));
    quads.push({ i, z: (a.z + b.z) / 2, col: ribCol(k, inner) });
  }
  quads.sort((p, q) => p.z - q.z || p.i - q.i);
  X.save(); X.lineJoin = 'round'; X.lineCap = 'round';
  for (const q of quads) {
    const a = S[q.i], b = S[q.i + 1], al = [a.x - a.wx, a.y - a.wy], ar = [a.x + a.wx, a.y + a.wy], bl = [b.x - b.wx, b.y - b.wy], br = [b.x + b.wx, b.y + b.wy];
    X.beginPath(); X.moveTo(...al); X.lineTo(...ar); X.lineTo(...br); X.lineTo(...bl); X.closePath();
    X.fillStyle = q.col; X.fill(); X.strokeStyle = q.col; X.lineWidth = 1.1; X.stroke();
    X.beginPath(); X.moveTo(...al); X.lineTo(...bl); X.moveTo(...ar); X.lineTo(...br);
    if (q.i === i0) { X.moveTo(...al); X.lineTo(...ar); }
    if (q.i === i1 - 1) { X.moveTo(...bl); X.lineTo(...br); }
    X.strokeStyle = RIBC.line; X.lineWidth = lw; X.stroke();
  }
  X.restore();
}
// The protein drug: x runs from the head end (0, where the first bead was) to the tail (306, the last bead).
// Two helices joined by exposed loops; each loop bulges into the cleft of the enzyme that cuts it (the cuts fall where
// the beads were cut, between beads 3|4 and 7|8, and the ribbon is split at the loop tips).
const CUTS = [[70, -24], [227, 28]]; // loop tips, local (x, y)
const PROT = (() => {
  const K = [
    ...loopKnots([[-18, 12, -2], [-10, 14, 4]]),
    ...helixKnots(0, 58, 0, 17, 2.0, Math.PI * 0.62, 8.6),
    ...loopKnots([[65, -12, 7], [CUTS[0][0], CUTS[0][1], 8], [79, -20, 7], [93, -10, 5]]),
    ...helixKnots(106, 198, 0, 17, 3.0, Math.PI * 0.4, 8.6),
    ...loopKnots([[211, 12, 7], [CUTS[1][0], CUTS[1][1], 8], [237, 15, 6]]),
    // C-terminal loop: a flat ribbon that twists as it curls
    ...loopKnots([[247, -2, 3, 0, -0.2, 1, 5], [260, -15, -2, 0, 0.8, 0.6, 6], [277, -19, 1, 0, 0, 1, 6.2], [292, -9, 7, 0.4, -0.3, 1, 6.2], [295, 6, 9, 0, -0.9, 0.5, 6], [284, 14, 4, 0, 0, 1, 5.6], [298, 19, -2, 0, 0.6, 0.8, 5.4], [314, 12, 0, 0, 0, 1, 5], [322, 2, -3, 0, 0, 1, 4.6]]),
  ];
  const R = ribbonBuild(K);
  const near = ([x, y]) => { let bi = 0, bd = 1e9; R.forEach((s, i) => { const d = Math.hypot(s.c[0] - x, s.c[1] - y); if (d < bd) { bd = d; bi = i; } }); return bi; };
  return { R, iA: near(CUTS[0]), iB: near(CUTS[1]) };
})();
// a short peptide (beat 10 payload icon): one and a half turns of helix with short tails, centred on 0
const PEPT = ribbonBuild([...loopKnots([[-52, 14, -2], [-42, 13, 4]], 3.4), ...helixKnots(-30, 30, 0, 15, 1.75, Math.PI * 0.62, 8.2, 3.4), ...loopKnots([[41, -10, 5], [53, -15, 0]], 3.4)], 1.8);
// the chain path with smooth tangents, extended straight past both ends: point and unit tangent at arc length s
function pathTan(p) { if (!p.tv) p.tv = p.pts.map((q, k) => { const a = p.pts[Math.max(0, k - 1)], b = p.pts[Math.min(p.pts.length - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }); return p.tv; }
function atT(p, d) {
  const tv = pathTan(p), { pts, tab } = p, n = pts.length;
  if (d <= 0) { const t = tv[0]; return [pts[0][0] + t[0] * d, pts[0][1] + t[1] * d, t[0], t[1]]; }
  if (d >= tab[n - 1]) { const t = tv[n - 1], e = d - tab[n - 1]; return [pts[n - 1][0] + t[0] * e, pts[n - 1][1] + t[1] * e, t[0], t[1]]; }
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] <= d) lo = m; else hi = m; }
  const k = (d - tab[lo]) / (tab[hi] - tab[lo]); const tx = lerp(tv[lo][0], tv[hi][0], k), ty = lerp(tv[lo][1], tv[hi][1], k), l = Math.hypot(tx, ty) || 1;
  return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k), tx / l, ty / l];
}
// protein on the path with its head at arc length hd (local x -> back along the path, local y -> across it)
function proteinOnPath(p, hd, i1) { return ribbonMap(PROT.R, (x, y) => { const [px, py, tx, ty] = atT(p, hd - x); return [px + ty * y, py - tx * y, -tx, -ty]; }, 0, i1); }
// enzyme: a lumpy globular blob, two lobes around a cleft that faces +x; mouth (0.12 closed .. 0.5 open) swings the lobes on a hinge
const ENZ = (() => {
  const core = [[-0.3, 0.02, 0.62], [-0.6, -0.44, 0.4], [-0.66, 0.4, 0.38], [0.24, 0, 0.14]]; // the last one is the floor of the cleft
  const up = [[0.12, -0.47, 0.47], [0.6, -0.27, 0.31], [-0.2, -0.7, 0.32]];
  const dn = [[0.12, 0.5, 0.42], [0.5, 0.29, 0.25], [-0.22, 0.72, 0.28]];
  return { core, up, dn, hx: -0.3, col: { hi: '#F3C9BA', mid: '#DE9681', lo: '#B76653', line: '#94493B' } };
})();
function enzymeCircles(x, y, s, ang, mouth) {
  const th = (mouth - 0.16) * 1.0, ca = Math.cos(ang), sa = Math.sin(ang), out = [];
  const add = (list, a) => list.forEach(([u, v, r]) => { const c = Math.cos(a), sn = Math.sin(a), du = u - ENZ.hx, u2 = ENZ.hx + du * c - v * sn, v2 = du * sn + v * c; out.push([x + (u2 * ca - v2 * sa) * s, y + (u2 * sa + v2 * ca) * s, r * s]); });
  add(ENZ.core, 0); add(ENZ.up, -th * 0.5); add(ENZ.dn, th * 1.2); return out; // the lower lobe is the jaw that swings most
}
function enzymeOutline(x, y, s, ang, mouth) { // the lobes' union traced from inside as one smooth closed curve
  const cs = enzymeCircles(x, y, s, ang, mouth), ox = x - 0.25 * s * Math.cos(ang), oy = y - 0.25 * s * Math.sin(ang), N = 160, r = [];
  for (let k = 0; k < N; k++) {
    const a = k / N * TAU, dx = Math.cos(a), dy = Math.sin(a); let best = s * 0.3;
    cs.forEach(([cx, cy, cr]) => { const px = cx - ox, py = cy - oy, b = dx * px + dy * py, q = cr * cr - (px * px + py * py) + b * b; if (q >= 0) best = Math.max(best, b + Math.sqrt(q)); });
    r.push(best);
  }
  const W = [1, 2, 3, 2, 1], pts = [];
  for (let k = 0; k < N; k++) { let sum = 0; W.forEach((w, j) => { sum += w * r[(k + j - 2 + N) % N]; }); const rr2 = sum / 9, a = k / N * TAU; pts.push([ox + Math.cos(a) * rr2, oy + Math.sin(a) * rr2]); }
  return pts;
}
function drawEnzyme(x, y, s, ang, mouth) { // matte coral, screen-fixed light from the upper left
  const C = ENZ.col, lw = Math.max(1.8, s * 0.05), pts = enzymeOutline(x, y, s, ang, mouth);
  const loc = (u, v) => [x + (u * Math.cos(ang) - v * Math.sin(ang)) * s, y + (u * Math.sin(ang) + v * Math.cos(ang)) * s];
  X.save(); X.lineJoin = 'round';
  poly(pts); const g = X.createLinearGradient(x - s * 0.9, y - s, x + s * 0.8, y + s); g.addColorStop(0, C.hi); g.addColorStop(0.45, C.mid); g.addColorStop(1, C.lo); X.fillStyle = g; X.fill();
  X.save(); X.clip();
  const rim = X.createRadialGradient(x - s * 0.25, y - s * 0.3, s * 0.45, x - s * 0.1, y - s * 0.1, s * 1.25); rim.addColorStop(0, 'rgba(150,68,52,0)'); rim.addColorStop(1, 'rgba(150,68,52,.35)'); X.fillStyle = rim; X.fillRect(x - s * 1.5, y - s * 1.5, s * 3, s * 3);
  const [qx, qy] = loc(0.34, 0); const cl = X.createRadialGradient(qx, qy, 0, qx, qy, s * 0.55); cl.addColorStop(0, 'rgba(125,48,36,.4)'); cl.addColorStop(1, 'rgba(125,48,36,0)'); X.fillStyle = cl; X.fillRect(x - s * 1.5, y - s * 1.5, s * 3, s * 3);
  // domain boundary: a soft crease from the cleft back toward the hinge
  const p0 = loc(0.2, 0.01), p1 = loc(-0.2, 0.05), p2 = loc(-0.56, 0.22);
  X.beginPath(); X.moveTo(...p0); X.quadraticCurveTo(...p1, ...p2); X.strokeStyle = 'rgba(148,73,59,.32)'; X.lineWidth = lw * 0.85; X.lineCap = 'round'; X.stroke();
  X.restore();
  poly(pts); X.strokeStyle = C.line; X.lineWidth = lw; X.stroke();
  X.restore();
}
function enzymeA(key, x, y, s, ang, mouth, a = 1) { // enzyme with an alpha (drawn whole, then faded) and a sprite shadow
  if (a <= 0) return; shadow(x + 6, y + s * 1.15, s * 0.8, s * 0.18, 0.18 * a);
  group(key, [x - s * 1.5, y - s * 1.5, s * 3, s * 3], a, () => drawEnzyme(x, y, s, ang, mouth));
}
// mucus coat as strand lists (same random sequence as L3D.coat), so a coat can grow strand by strand
function coatGen(x, y, r, seed, o = {}) {
  const R = rng(seed); const n = o.n || 44; const back = [], front = [], face = [];
  for (let i = 0; i < n; i++) {
    const a0 = (o.a0 ?? 0) + R() * (o.span ?? TAU), span = 0.5 + R() * 1.2, base = r * (1.03 + R() * 0.16), amp = r * (0.03 + R() * 0.12), wig = 6 + R() * 10, ph = R() * 10;
    const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) { const a = a0 + span * t; const rad = base + Math.sin(t * Math.PI) * amp + Math.sin(t * wig + ph) * r * 0.025; pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]); }
    (R() < 0.55 ? front : back).push({ pts, i: i / n });
  }
  for (let i = 0; i < (o.nFace ?? 7); i++) { const a = R() * TAU, d = r * (0.3 + R() * 0.55); const cx2 = x + Math.cos(a) * d, cy2 = y + Math.sin(a) * d; const ta = a + Math.PI / 2 + (R() - 0.5); const L2 = r * (0.4 + R() * 0.4); const pts = []; for (let t = -1; t <= 1.0001; t += 0.1) pts.push([cx2 + Math.cos(ta) * L2 * t + Math.sin(t * 6 + i) * r * 0.04, cy2 + Math.sin(ta) * L2 * t + Math.cos(t * 5 + i) * r * 0.04]); face.push({ pts, i: i / Math.max(1, o.nFace ?? 7) }); }
  return { x, y, r, back, front, face, w: Math.max(3, r * (o.w ?? 0.05)) };
}
// draw part of a coat: P = 0..1 overall progress; strands start one after another and grow along their arc
function coatPart(key, cg, P, which) {
  if (P <= 0) return; const pad = cg.r * 1.5 + 20, box = [cg.x - pad, cg.y - pad, pad * 2, pad * 2];
  const list = cg[which], a = which === 'back' ? 0.5 : which === 'face' ? 0.22 : 0.9, w = which === 'face' ? cg.w * 0.8 : cg.w;
  group(key + which, box, a, () => list.forEach(s => { const f = clamp((P - 0.7 * s.i) / 0.3); const p = partial(s.pts, eo(f)); if (p) tube(p, w, M.strand); }));
}
function gelA(x, y, r, a) { if (a <= 0) return; X.save(); X.globalAlpha = a; L.gel(x, y, r); X.restore(); }

/* ---------------- the capsule, with a sliding cap ---------------- */
// d = how far the cap has slid along the axis from closed (0). Closed matches L3D.capsule3d; past 1.6 j a gap opens.
const WHITE = ['#DCE4EC', '#FFFFFF', '#EEF2F6', '#B7C4D2', '#97A8BB'], TEALC = ['#41B7A4', '#A6E8DC', '#22A08C', '#0D6F62', '#0A584E'];
function shell(x0, x1, r, roundL, roundR, st) {
  X.beginPath(); if (roundL) X.moveTo(x0 + r, -r); else X.moveTo(x0, -r);
  X.lineTo(x1 - (roundR ? r : 0), -r); if (roundR) X.arc(x1 - r, 0, r, -Math.PI / 2, Math.PI / 2); else X.lineTo(x1, r);
  X.lineTo(x0 + (roundL ? r : 0), r); if (roundL) X.arc(x0 + r, 0, r, Math.PI / 2, Math.PI * 1.5); else X.lineTo(x0, -r); X.closePath();
  const g = X.createLinearGradient(0, -r, 0, r); [0, 0.22, 0.5, 0.85, 1].forEach((p, k) => g.addColorStop(p, st[k])); X.fillStyle = g; X.fill();
}
function capsuleA(cx, cy, Lc, R, ang, d, o = {}) {
  const j = Lc * 0.1, gap = d - 1.6 * j, k = clamp(gap / 26), c0 = -0.6 * j + d;
  X.save(); X.translate(cx, cy); X.rotate(ang);
  shell(-Lc / 2, j, R, true, false, WHITE);
  if (k > 0) { // open mouth of the body, and what is inside
    X.save(); X.globalAlpha = k;
    X.beginPath(); X.ellipse(j, 0, R * 0.26, R, 0, 0, TAU); X.fillStyle = '#E9EEF3'; X.fill();
    X.beginPath(); X.ellipse(j, 0, R * 0.2, R * 0.86, 0, 0, TAU); const ig = X.createLinearGradient(0, -R, 0, R); ig.addColorStop(0, '#8FA0B4'); ig.addColorStop(1, '#C9D4DF'); X.fillStyle = ig; X.fill();
    X.restore();
    (o.inside || []).forEach(([u, v, a]) => { if (a > 0) gsph(j - 4 + u * R * 0.12, v * R * 0.6, R * 0.2, M.pearl, { alpha: a * k }); });
  }
  shell(c0, Lc / 2 + d, R * 1.05, false, true, TEALC);
  if (k > 0) { // the cap's open rim, facing the body
    X.save(); X.globalAlpha = k;
    X.beginPath(); X.ellipse(c0, 0, R * 0.27, R * 1.05, 0, 0, TAU); X.fillStyle = '#0C6A5D'; X.fill();
    X.beginPath(); X.ellipse(c0 + 2, 0, R * 0.2, R * 0.9, 0, 0, TAU); const cg = X.createLinearGradient(0, -R, 0, R); cg.addColorStop(0, '#2E8F80'); cg.addColorStop(1, '#8FD6C9'); X.fillStyle = cg; X.fill();
    X.restore();
  }
  if (k < 1) { X.save(); X.globalAlpha = 1 - k; X.beginPath(); X.ellipse(c0, 0, R * 0.16, R * 1.05, 0, Math.PI / 2, Math.PI * 1.5); X.strokeStyle = 'rgba(255,255,255,.55)'; X.lineWidth = 2.5; X.stroke(); X.restore(); }
  X.globalAlpha = 0.85; X.strokeStyle = '#FFFFFF'; X.lineCap = 'round'; X.lineWidth = R * 0.14; X.beginPath(); X.moveTo(-Lc / 2 + R * 0.9, -R * 0.5); X.lineTo(j - 8, -R * 0.5); X.stroke();
  X.globalAlpha = 0.7; X.beginPath(); X.moveTo(c0 + lerp(14, R * 0.3, k), -R * 0.52); X.lineTo(Lc / 2 - R * 0.9 + d, -R * 0.52); X.stroke();
  X.restore();
}
const J = CAP.L * 0.1;
function capPt(cx, cy, ang, u, v) { const c = Math.cos(ang), s = Math.sin(ang); return [cx + u * c - v * s, cy + u * s + v * c]; }

/* ================= beat 1: the capsule falls into the gut, lands and opens ================= */
const LAND = { x: 1360, y: 622, ang: -0.1 }, OPEN1 = 1.6 * J + 58, FALL = 2.6;
const CH1 = mkPath([[1415, 612], [1414, 548], [1402, 486], [1372, 428], [1322, 384], [1262, 362], [1198, 378], [1134, 352], [1068, 368]], 16);
const NB = 10, SPB = 34;
function chain1(t) { // reference points along the protein (where the beads of the first version sat): [x, y, alpha]
  const hd = CH1.len * seg(t, 3.0, 4.9); const out = [];
  for (let k = 0; k < NB; k++) { const s = hd - k * SPB; if (s > 0) { const [x, y] = at(CH1, s); out.push([x, y, clamp(s / 26)]); } }
  return out;
}
const protEnd = () => memo.protEnd || (memo.protEnd = proteinOnPath(CH1, CH1.len)); // the protein at rest (end of beat 1, start of beat 2)
function drawProtein1(t) { // the ribbon leaves the capsule gap head first, along the same path and timing as the bead chain did
  const hd = CH1.len * seg(t, 3.0, 4.9); if (hd <= 0) return;
  const R = PROT.R; let i1 = R.length - 1; for (let i = 0; i < R.length; i++) if (R[i].c[0] > hd + 30) { i1 = i; break; }
  if (i1 < 1) return;
  const S = hd >= CH1.len ? protEnd() : proteinOnPath(CH1, hd, i1);
  group('b1prot', [990, 270, 540, 400], 1, () => {
    ribbonDraw(S);
    if (hd < CH1.len) { // fade out what is still inside the gap (as the beads faded in over their first 26 px)
      X.globalCompositeOperation = 'destination-out'; const m = X.createLinearGradient(0, 584, 0, 607); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, '#000'); X.fillStyle = m; X.fillRect(1330, 560, 170, 110);
    }
  });
}
B[0] = (P, S, t) => {
  const f = sm5(t / FALL);
  const cx = lerp(CAP.x, LAND.x, f), cy = lerp(CAP.y, LAND.y, f), ang = lerp(CAP.ang, LAND.ang, f);
  // the gut rises into view as the capsule falls (camera following it down)
  const ga = seg(t, 0.1, 1.5), dy = 240 * (1 - seg(t, 0, FALL));
  // (soft bottom edge so the rising gut never crosses the note / credit line)
  if (ga > 0) { const g = once('gut', W, H, () => L.gutWall(9));
    group('b1gut', [880, 300, 1000, 640], ga, () => { X.drawImage(g, 0, dy); X.globalCompositeOperation = 'destination-in'; const m = X.createLinearGradient(0, 878, 0, 920); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = m; X.fillRect(880, 300, 1000, 640); }); }
  shadow(cx + 14, gutBase(cx) - 150 + dy, 165 * lerp(0.75, 1, f), 16, 0.16 * seg(t, 1.0, FALL));
  const d = OPEN1 * seg(t, 2.6, 3.4);
  capsuleA(cx, cy, CAP.L, CAP.R, ang, d);
  drawProtein1(t);
  const ta = seg(t, 3.4, 3.8);
  if (ta > 0) { const tg = tagA(P.labels[0], 1690, 430, { align: 'center' }, ta); const [lx, ly] = capPt(LAND.x, LAND.y, LAND.ang, OPEN1 + 150, -CAP.R * 0.82); leaderA(tg.cx - 30, tg.b - 4, lx, ly, ta); }
};

/* ================= beat 2: enzymes cut the protein; fragments stick in the mucus ================= */
const B2 = { cutA: 3, cutB: 7, dx: 40, dy: 24, rest: [[1075, 614], [1300, 654], [1548, 600]], rot: [0.25, -0.18, 0.3] };
B[1] = (P, S, t) => {
  X.drawImage(once('b2', W, H, () => { L.cellRow(930, 1840, 742, 140, { mv: 22, n: 7, nucY: 0.66 }); L.mucus(930, 1840, 520, 728, 7, { n: 16, w: 9 }); }), 0, 0);
  // the protein from beat 1 drifts down a little
  const base = chain1(6); const dr = seg(t, 0.6, 2.2);
  const pts = base.map(([x, y]) => [x + B2.dx * dr, y + B2.dy * dr]);
  // two enzymes close in on two links (one from above, one from below), bite, and the chain falls apart
  const mid = k => [(pts[k - 1][0] + pts[k][0]) / 2, (pts[k - 1][1] + pts[k][1]) / 2];
  const ea = seg(t, 0.9, 2.1), ee = eo((t - 0.9) / 1.2), bite = seg(t, 2.15, 2.4) * (1 - seg(t, 2.5, 2.9)), mouth = lerp(0.5, 0.12, bite);
  const [m1, m2] = [mid(B2.cutA), mid(B2.cutB)];
  const rt = seg(t, 2.7, 3.9); // after the cut the enzymes ease back, out of the fragments' way
  const E = [[m1[0] - 4 - (1 - ee) * 50 - 30 * rt, m1[1] - 66 - (1 - ee) * 80 - 24 * rt, Math.PI / 2 + 0.12], [m2[0] + 6 + (1 - ee) * 90 + 80 * rt, m2[1] + 66 - 10 * rt, -Math.PI / 2 - 0.15]];
  const cut = t >= 2.4, sep = seg(t, 2.4, 2.9), sink = seg(t, 2.9, 4.6);
  const frags = [pts.slice(0, B2.cutA), pts.slice(B2.cutA, B2.cutB), pts.slice(B2.cutB)];
  const enz = () => E.forEach(([x, y, an], k) => enzymeA('b2e' + k, x, y, 46, an, mouth, ea));
  if (t >= 2.9) enz(); // once the pieces sink, they pass in front of the enzymes
  // the ribbon moves exactly as the bead chain did: the same drift, then each piece follows its beads' centroid
  const S0 = protEnd(), ox = B2.dx * dr, oy = B2.dy * dr, Rn = S0.length - 1, piece = [[0, PROT.iA], [PROT.iA, PROT.iB], [PROT.iB, Rn]];
  if (!cut) ribbonDraw(ribbonMove(S0, ox, oy, [0, 0], 0, 0, 0));
  else frags.forEach((fr, k) => {
    const c0 = fr.reduce((s, p) => [s[0] + p[0] / fr.length, s[1] + p[1] / fr.length], [0, 0]);
    const so = [[-16, 6], [0, 8], [16, 6]][k]; const cx = c0[0] + so[0] * eo(sep), cy = c0[1] + so[1] * eo(sep);
    const tx = lerp(cx, B2.rest[k][0], sink), ty = lerp(cy, B2.rest[k][1], sink), a = B2.rot[k] * sink;
    ribbonDraw(ribbonMove(S0.slice(piece[k][0], piece[k][1] + 1), ox, oy, c0, a, tx, ty));
  });
  if (t < 2.9) enz();
  const tl = seg(t, 0.9, 1.3); tagA(P.labels[1], 1830, 470, { align: 'right' }, tl); tagA(P.labels[2], 1830, 830, { align: 'right' }, tl);
  const te = seg(t, 2.0, 2.4); if (te > 0) { const g = tagA(P.labels[0], 1500, 200, {}, te); leaderA(g.x + 30, g.b - 4, E[0][0] + 34, E[0][1] - 26, te); }
};

/* ================= beat 3: three particles, three charges, three question marks ================= */
const B3 = { ys: 500, r: 118, xs: [1094, 1404, 1714], pals: [M.coral, M.blue, M.grey] };
B[2] = (P, S, t) => {
  const { ys, r, xs, pals } = B3;
  xs.forEach((x, k) => {
    const sp = once('b3p' + k, 480, 480, () => { const c = 240; L.ground(c, c + r + 10, r * 0.9, r * 0.18, 0.9); gsph(c, c, r, pals[k]);
      X.save(); X.shadowColor = 'rgba(15,27,45,.25)'; X.shadowBlur = 8; X.shadowOffsetY = 2; txt(P.labels[k], c, c + (k === 2 ? 46 : 56), { w: 700, size: k === 2 ? 132 : 168, f: F.sora, color: k === 2 ? L.NAVY : '#FFFFFF', align: 'center' }); X.restore(); });
    const e = seg(t, 0.55 + 0.4 * k, 1.35 + 0.4 * k);
    put(sp, x, ys + (1 - e) * 30, e, 0.94 + 0.06 * e);
    // question bubble: appears, then the mark blinks once (a soft dip), in turn
    const qa = seg(t, 2.1 + 0.3 * k, 2.5 + 0.3 * k); if (qa <= 0) return;
    const bx = x + r * 0.78, by = ys - r * 0.95;
    const qb = once('b3q', 120, 120, () => { X.save(); X.shadowColor = 'rgba(15,27,45,.16)'; X.shadowBlur = 18; X.shadowOffsetY = 5; X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(60, 54, 34, 0, TAU); X.fill(); X.restore(); });
    put(qb, bx, by + 6 + (1 - qa) * 10, qa);
    const bl = Math.sin(Math.PI * seg(t, 3.5 + 0.3 * k, 4.1 + 0.3 * k));
    txt('?', bx, by + 16 + (1 - qa) * 10, { w: 700, size: 46, f: F.sora, color: L.A.t, align: 'center', alpha: qa * (1 - 0.7 * bl) });
  });
};

/* ================= beat 4: mucin strands reach out and wrap the particle ================= */
const B4 = (() => {
  const cx = 1240, cy = 470, r = 160; const R = rng(21); const strands = [];
  for (let i = 0; i < 8; i++) {
    const sx = 1830, sy = 150 + i * 92 + (R() - 0.5) * 40, aEnd = -1.25 + i * 0.36 + (R() - 0.5) * 0.15, rad = r * (1.07 + R() * 0.1);
    const ex = cx + Math.cos(aEnd) * rad, ey = cy + Math.sin(aEnd) * rad; const dx = ex - sx, dy = ey - sy, Ln = Math.hypot(dx, dy), px = -dy / Ln, py = dx / Ln;
    const amp = 22 + R() * 26, k = 9 + R() * 6, ph = R() * 6; const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.01) { const w = Math.sin(t * k + ph) * amp * (1 - t); pts.push([sx + dx * t + px * w, sy + dy * t + py * w]); }
    const dir = i % 2 ? 1 : -1, sweep = 0.8 + R() * 0.7; for (let t = 0.05; t <= 1.0001; t += 0.05) { const a = aEnd + dir * sweep * t, rr2 = rad + Math.sin(t * 10) * 5; pts.push([cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2]); }
    strands.push({ pts, w: 8 + R() * 4 });
  }
  return { cx, cy, r, strands };
})();
B[3] = (P, S, t) => {
  const { cx, cy, r } = B4;
  let co = null; if (!memo.b4f) { memo.b4b = once('b4b', W, H, () => { co = L.coat(cx, cy, r, 11, { a0: -1.3, span: 2.7, n: 30, nFace: 0 }); L.gel(cx + 40, cy, r * 0.95); co.back(); }); memo.b4f = once('b4f', W, H, () => co.front()); }
  const ca = seg(t, 2.5, 3.9);
  shadow(cx + 10, cy + r * 1.3, r * 0.85, r * 0.17, 0.22);
  if (ca > 0) { X.save(); X.globalAlpha = ca; X.drawImage(memo.b4b, 0, 0); X.restore(); }
  gsph(cx, cy, r, M.pearl);
  if (ca > 0) { X.save(); X.globalAlpha = ca; X.drawImage(memo.b4f, 0, 0); X.restore(); }
  group('b4s', [960, 60, 880, 820], 0.92, () => {
    B4.strands.forEach((s, i) => { const p = partial(s.pts, seg(t, 0.5 + 0.12 * i, 3.3 + 0.12 * i)); if (p) tube(p, s.w, M.strand); });
    X.globalCompositeOperation = 'destination-in'; const m = X.createLinearGradient(1560, 0, 1830, 0); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = m; X.fillRect(940, 40, 920, 860);
  });
  const ta = seg(t, 1.7, 2.1); if (ta > 0) { const g = tagA(P.labels[0], 1530, 150, {}, ta); leaderA(g.x + 50, g.b - 4, 1560, 262, ta); }
};

/* ================= beat 5: the coat closes, the minus charges fade ================= */
const B5 = { y: 440, r: 124, xb: 1140, xc: 1625, keep: [4, 10] };
B5.coat = coatGen(B5.xc, B5.y, B5.r, 5, { n: 48 });
B[4] = (P, S, t) => {
  const { y, r, xb, xc } = B5;
  const mp = once('b5m', 80, 50, () => L.minusPill(40, 22, 1.35, 1));
  const ring = k => { const a = k / 11 * TAU + 0.13; return [Math.cos(a) * (r + 56), Math.sin(a) * (r + 56)]; };
  putP(r, xb, y, { shY: 1.32 });
  for (let k = 0; k < 11; k++) { const [u, v] = ring(k); put(mp, xb + u, y + v + 3); }
  // right particle: bare at first, the coat grows around it and most charges fade
  const Pc = seg(t, 1.0, 3.6);
  shadow(xc + r * 0.1, y + r * 1.32, r * 0.85, r * 0.2, 0.22);
  gelA(xc, y, r, Pc);
  coatPart('b5', B5.coat, Pc, 'back');
  gsph(xc, y, r, M.pearl);
  coatPart('b5', B5.coat, Pc, 'face'); coatPart('b5', B5.coat, Pc, 'front');
  let m = 0;
  for (let k = 0; k < 11; k++) { const [u, v] = ring(k); const keep = B5.keep.includes(k); const a = keep ? 1 : 1 - seg(t, 1.5 + 0.24 * m, 1.95 + 0.24 * m); if (!keep) m++; put(mp, xc + u, y + v + 3, a); }
  X.save(); X.lineCap = 'round'; X.strokeStyle = L.A.a; X.lineWidth = 10; X.beginPath(); X.moveTo(1318, y); X.lineTo(1392, y); X.stroke(); X.restore(); head(1420, y, 0, 36, L.A.a);
  tagA(P.labels[0], xb, 708, { align: 'center' }, seg(t, 0.8, 1.2));
  tagA(P.labels[1], xc, 708, { align: 'center', dot: true }, seg(t, 3.7, 4.1));
};

/* ================= beat 6: in a mucus gel, the coated particle travels far, the bare one stays ================= */
const B6 = (() => {
  const longP = mkPath([[985, 650], [1130, 560], [1250, 600], [1380, 470], [1480, 520], [1600, 380], [1700, 300]], 12);
  // the bare particle only wanders back and forth around its spot: a short, tangled track
  const sp = [[1110, 340], [1062, 302], [1166, 318], [1072, 388], [1152, 394], [1104, 336]];
  return { box: [930, 150, 910, 620], longP, bareP: mkPath(sp, 10), s0: 44 };
})();
B[5] = (P, S, t) => {
  const box = B6.box;
  X.drawImage(once('b6', W, H, () => {
    X.save(); X.shadowColor = 'rgba(20,60,50,.18)'; X.shadowBlur = 50; X.shadowOffsetY = 26; rr(box[0], box[1] + 22, box[2], box[3], 44); X.fillStyle = '#9FD3C5'; X.fill(); X.restore();
    rr(box[0], box[1] + 22, box[2], box[3], 44); const eg = X.createLinearGradient(box[0], 0, box[0] + box[2], 0); eg.addColorStop(0, '#8CC9B9'); eg.addColorStop(0.45, '#BDE6DA'); eg.addColorStop(1, '#86C2B2'); X.fillStyle = eg; X.fill();
    X.save(); rr(...box, 44); const g = X.createLinearGradient(0, box[1], 0, box[1] + box[3]); g.addColorStop(0, '#ECF9F5'); g.addColorStop(1, '#C3EADF'); X.fillStyle = g; X.fill(); X.clip();
    L.layer(() => L.strandSet(31, box, 22, 7, { spread: 3 }), { alpha: 0.4, blur: 5 });
    L.layer(() => L.strandSet(32, box, 16, 9, { spread: 3, steps: 46 }), { alpha: 0.85 });
    X.restore();
    X.save(); rr(...box, 44); X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 3; X.stroke(); X.restore();
  }), 0, 0);
  const lp = B6.longP, s = lerp(B6.s0, lp.len, seg(t, 0.6, 4.2));
  const bp = B6.bareP, sb = bp.len * seg(t, 0.5, 4.9);
  X.save(); rr(...box, 44); X.clip();
  L.dotPath(between(lp, B6.s0, s - 40), L.A.a, 20, 6.5);
  L.dotPath(between(bp, 0, sb - 16), 'rgba(64,84,106,.72)', 16, 4.5);
  X.restore();
  const [bx, by] = at(bp, sb);
  putP(46, bx, by, { shY: 1.3 });
  tube(spline([[1030, 290], [1080, 330], [1130, 318], [1190, 372]], 8), 9, M.strand); tube(spline([[1080, 410], [1110, 360], [1150, 300], [1170, 260]], 8), 8, M.strand);
  const [cx, cy] = at(lp, s);
  putP(46, cx, cy, { coat: true, seed: 8, shY: 1.3, coatO: { n: 34, w: 0.09, nFace: 2 } });
  tagA(P.labels[0], 1110, 470, { align: 'center' }, seg(t, 2.2, 2.6));
  tagA(P.labels[1], 1826, 420, { align: 'right', dot: true }, seg(t, 4.2, 4.6));
};

/* ================= beat 7: a particle touches a gut cell and is pulled inside ================= */
const B7 = { x0: 980, x1: 1835, top: 430, n: 3 }; B7.cw = (B7.x1 - B7.x0) / B7.n; B7.mid = B7.x0 + B7.cw * 1.5;
const C7 = { n: 26, w: 0.08, nFace: 3 };
B[6] = (P, S, t) => {
  const { x0, x1, top, n, cw, mid } = B7;
  X.drawImage(once('b7', W, H, () => {
    L.mucus(x0, x1, 150, top - 30, 19, { a0: 0.22, a1: 0.32, n: 10, nBack: 9, w: 7 });
    X.save(); X.fillStyle = '#E3A89B'; rr(x0 + 4, top + 12, x1 - x0 - 8, 860 - top - 12, 24); X.fill(); X.restore();
    for (let k = 0; k < n; k++) L.cell(x0 + k * cw + 4, top, cw - 8, 860 - top, { mv: 50, mvGap: 22, mvW: 13, nucY: 0.8, skip: k === 1 ? [mid - 60, mid + 60] : null });
  }), 0, 0);
  putP(40, 1262, 236, { coat: true, seed: 12, shY: 1.4, coatO: { n: 24, w: 0.08, nFace: 3 } });
  putP(40, 1690, 290, { coat: true, seed: 13, shY: 1.4, coatO: { n: 24, w: 0.08, nFace: 3 } });
  // motion phases: arrive at the surface, sink into a pit, pinch off, vesicle moves inward
  const p1 = seg(t, 0.6, 1.9), p2 = seg(t, 1.9, 3.0), p3 = seg(t, 3.0, 3.5), p4 = seg(t, 3.6, 4.7);
  const px = mid + 10 * p4, py = t < 1.9 ? lerp(255, top - 4, p1) : t < 3.6 ? lerp(top - 4, top + 66, p2) : lerp(top + 66, top + 200, p4);
  const pitA = seg(t, 1.65, 1.95) * (1 - p3), depth = lerp(30, 124, p2), vesA = p3, vr = lerp(60, 72, p4);
  if (pitA > 0) { X.save(); X.globalAlpha = pitA; X.beginPath(); X.ellipse(mid, top + 4, 64, depth, 0, 0, Math.PI); const pg = X.createLinearGradient(0, top, 0, top + depth); pg.addColorStop(0, '#DE9F92'); pg.addColorStop(1, '#ECBBAF'); X.fillStyle = pg; X.fill(); X.restore(); }
  if (vesA > 0) { X.save(); X.globalAlpha = vesA; X.beginPath(); X.arc(px, py, vr, 0, TAU); const vg = X.createRadialGradient(px - 20, py - 25, 10, px, py, vr); vg.addColorStop(0, 'rgba(255,255,255,.7)'); vg.addColorStop(1, 'rgba(250,215,205,.6)'); X.fillStyle = vg; X.fill(); X.restore(); }
  putP(42, px, py, { coat: true, seed: 4, shadow: false, coatO: C7 });
  if (pitA > 0) { X.save(); X.globalAlpha = pitA; X.beginPath(); X.ellipse(mid, top + 4, 64, depth, 0, 0.12, Math.PI - 0.12); X.strokeStyle = '#D9918A'; X.lineWidth = 6; X.lineCap = 'round'; X.stroke(); X.restore(); }
  if (vesA > 0) { X.save(); X.globalAlpha = vesA; X.beginPath(); X.arc(px, py, vr, 0, TAU); X.strokeStyle = '#D48C83'; X.lineWidth = 5; X.stroke(); X.restore(); }
  const ta = seg(t, 0.9, 1.3);
  if (ta > 0) { const g = tagA(P.labels[1], 990, 300, {}, ta); leaderA(g.cx - 40, g.b - 4, 1050, top - 24, ta); }
  tagA(P.labels[0], x0 + 2.5 * cw, 640, { align: 'center' }, ta);
};

/* ================= beat 8: particles leave the cells and join the blood flow ================= */
const B8 = (() => {
  const x0 = 935, x1 = 1835, vx0 = x0 + 44, vx1 = x1 - 46, yc = 640, rv = 132, v = 36;
  const R = rng(4); const rbcs = []; for (let k = 0; k < 10; k++) rbcs.push({ b: k * 100 + R() * 30, y: yc + (R() - 0.5) * 150, r: 34 + R() * 6, rot: (R() - 0.5) * 1.2, tilt: 0.45 + R() * 0.35 });
  const nps = [0, 1, 2, 3].map(k => ({ b: 60 + k * 250, y: [600, 690, 590, 670][k], seed: 20 + k }));
  const ex = [{ p: mkPath([[1160, 292], [1170, 400], [1188, 515], [1205, 578]], 10), t0: 0.6, t1: 2.6, seed: 31 },
              { p: mkPath([[1480, 296], [1476, 410], [1464, 525], [1470, 600]], 10), t0: 1.0, t1: 3.0, seed: 32 }];
  return { x0, x1, vx0, vx1, yc, rv, v, rbcs, nps, ex };
})();
function vesselPath() { const { vx0, vx1, yc, rv } = B8; X.beginPath(); X.ellipse(vx0, yc, rv * 0.3, rv, 0, Math.PI / 2, Math.PI * 1.5, true); X.lineTo(vx1, yc - rv); X.ellipse(vx1, yc, rv * 0.3, rv, 0, -Math.PI / 2, Math.PI / 2); X.lineTo(vx0, yc + rv); X.closePath(); }
const CO8 = { n: 18, w: 0.1, nFace: 2 }, CX8 = { n: 16, w: 0.1, nFace: 2 };
B[7] = (P, S, t) => {
  const { x0, x1, vx0, vx1, yc, rv, v } = B8;
  if (!memo.b8f) {
    let vs; memo.b8 = once('b8', W, H, () => {
      L.layer(() => { L.cellRow(x0, x1, 80, 260, { n: 6, nucY: 0.55 }); }, {});
      const fade = X.createLinearGradient(0, 100, 0, 220); fade.addColorStop(0, L.A.bg0); fade.addColorStop(1, 'rgba(245,251,249,0)'); X.fillStyle = fade; X.fillRect(x0 - 20, 60, x1 - x0 + 40, 160);
      X.save(); X.strokeStyle = 'rgba(200,120,110,.5)'; X.lineWidth = 4; X.beginPath(); X.moveTo(x0, 352); X.lineTo(x1, 352); X.stroke(); X.restore();
      vs = L.vessel(vx0, vx1, yc, rv);
    });
    memo.b8f = once('b8f', W, H, () => { vs.front(); X.save(); X.lineCap = 'round'; X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 8; X.beginPath(); X.moveTo(1560, 750); X.lineTo(1700, 750); X.stroke(); X.restore(); head(1728, 750, 0, 30, 'rgba(255,255,255,.9)'); });
  }
  X.drawImage(memo.b8, 0, 0);
  const flowX = b => 900 + ((((b + v * t) % 1000) + 1000) % 1000);
  // exiting particles: position, and how far inside the vessel they are
  const ep = B8.ex.map(e => {
    const u = seg(t, e.t0, e.t1); let [x, y] = at(e.p, e.p.len * u);
    if (t > e.t1) { const tau = t - e.t1; x += tau < 0.8 ? v * tau * tau / 1.6 : v * (tau - 0.4); }
    return { x, y, u, inn: clamp((y - 498) / 44), e };
  });
  X.save(); vesselPath(); X.clip();
  B8.rbcs.forEach(c => L.rbc(flowX(c.b), c.y, c.r, c.rot, c.tilt));
  B8.nps.forEach(p => putP(26, flowX(p.b), p.y, { coat: true, seed: p.seed, shadow: false, coatO: CO8 }));
  ep.forEach(q => putP(24, q.x, q.y, { coat: true, seed: q.e.seed, shadow: false, coatO: CX8 }, q.inn));
  X.restore();
  X.drawImage(memo.b8f, 0, 0);
  // trails from the cell base to the vessel wall, then the particle outside the vessel
  ep.forEach(q => {
    const end = Math.min(q.e.p.len * q.u - 30, q.e.p.len * 0.8);
    if (end > 40) L.dotPath(between(q.e.p, 40, end), L.A.a, 18, 5);
    const ha = seg(q.u, 0.82, 0.95); if (ha > 0) { const [hx, hy] = at(q.e.p, q.e.p.len * 0.8 + 10), [gx, gy] = at(q.e.p, q.e.p.len * 0.8 - 10); X.save(); X.globalAlpha = ha; head(hx, hy, Math.atan2(hy - gy, hx - gx), 26, L.A.a); X.restore(); }
    putP(24, q.x, q.y, { coat: true, seed: q.e.seed, shadow: false, coatO: CX8 }, 1 - q.inn);
  });
  tagA(P.labels[0], 1830, 440, { align: 'right' }, seg(t, 0.8, 1.2));
};

/* ================= beat 9: the whole route; the camera pulls back as the four steps light up ================= */
const B9 = (() => {
  const S1 = [1030, 240], S2 = [1250, 410], S3 = [1470, 560], S4 = [1640, 700];
  const route = mkPath([S1, [1140, 300], S2, [1360, 500], S3, [1560, 640], S4], 10);
  const st = [0, 20, 40, 60].map(i => route.tab[i]);
  return { S: [S1, S2, S3, S4], route, st, anchor: [1040, 240], s0: 1.55, coat1: coatGen(S1[0], S1[1], 40, 41, { n: 12, a0: -0.4, span: 2.2, w: 0.08, nFace: 0 }),
    tags: [[1090, 172], [1320, 340], [1530, 490], [1380, 790]] };
})();
const ZK = 1.6; // sprite / cache resolution for the zoomed camera
B[8] = (P, S, t) => {
  const sc = 1 + (B9.s0 - 1) * (1 - seg(t, 0.2, 3.3)), [ax, ay] = B9.anchor;
  const world = once('b9w', Math.ceil(940 * ZK), Math.ceil(520 * ZK), () => { X.scale(ZK, ZK); X.translate(-915, -375); L.cellRow(935, 1835, 700, 172, { mv: 24, n: 7, nucY: 0.66 }); L.mucus(935, 1835, 410, 686, 23, { n: 14, w: 8 }); });
  const mask = once('b9m', W, H, () => {
    X.fillStyle = '#000'; X.fillRect(0, 0, W, H); X.globalCompositeOperation = 'destination-in';
    const gx = X.createLinearGradient(885, 0, 1890, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(50 / 1005, '#000'); gx.addColorStop(957 / 1005, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = gx; X.fillRect(0, 0, W, H);
    const gy = X.createLinearGradient(0, 878, 0, 912); gy.addColorStop(0, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = gy; X.fillRect(0, 0, W, H);
  });
  const rs = B9.route.len * seg(t, 1.3, 3.7); // how far the route has been drawn
  const [S1, S2, S3, S4] = B9.S, A = L.A;
  const stA = k => k === 0 ? 1 : clamp((rs - B9.st[k] + 60) / 50);
  group('b9buf', [0, 0, W, H], 1, () => {
    X.translate(ax, ay); X.scale(sc, sc); X.translate(-ax, -ay);
    X.drawImage(world, 915, 375, world.width / ZK, world.height / ZK);
    if (rs > 1) L.dotPath(between(B9.route, 0, rs), A.a, 20, 5.5);
    const c1 = seg(t, 0.4, 1.3);
    gelA(S1[0], S1[1], 40, c1); coatPart('b9c', B9.coat1, c1, 'back');
    putP(40, S1[0], S1[1], { shY: 1.5 }, 1, ZK);
    coatPart('b9c', B9.coat1, c1, 'front');
    putP(40, S2[0], S2[1], { coat: true, seed: 42, shadow: false, coatO: { n: 26, w: 0.08, nFace: 3 } }, stA(1), ZK);
    putP(40, S3[0], S3[1], { coat: true, seed: 43, shadow: false, coatO: { n: 26, w: 0.08, nFace: 3 } }, stA(2), ZK);
    const a4 = stA(3); if (a4 > 0) { X.save(); X.globalAlpha = a4; X.beginPath(); X.ellipse(S4[0], S4[1] + 14, 56, 40, 0, 0, Math.PI); X.fillStyle = '#E9B3A6'; X.fill(); X.restore(); }
    putP(40, S4[0], S4[1], { coat: true, seed: 44, shadow: false, coatO: { n: 26, w: 0.08, nFace: 3 } }, a4, ZK);
    X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'destination-in'; X.drawImage(mask, 0, 0); X.globalCompositeOperation = 'source-over';
  });
  // numbered steps, constant size, pinned to their place in the moving picture
  const words = P.labels.map(l => l.split(' '));
  const tagAl = [seg(t, 1.0, 1.4), clamp((rs - B9.st[1] + 20) / 40), clamp((rs - B9.st[2] + 20) / 40), clamp((rs - B9.st[3] + 40) / 40)];
  B9.tags.forEach(([x, y], k) => numTagA(words[k][0], words[k][1], ax + (x - ax) * sc, ay + (y - ay) * sc, tagAl[k]));
};

/* ================= beat 10: payloads load into particles, which fill the capsule; it closes ================= */
const B10 = (() => {
  const ys = 690, xs = [1040, 1370, 1700], r = 80, gp = 70;
  const ca = Math.cos(CAP.ang), sa = Math.sin(CAP.ang); const mx = CAP.x + ca * (J + gp / 2), my = CAP.y + sa * (J + gp / 2);
  const paths = xs.map((x, k) => mkPath([[x, ys - r - 10], [x + (mx - x) * 0.5, ys - 210 - k * 10], [mx, my + 40]], 12));
  const runs = xs.map((x, k) => mkPath([[x, ys - r - 10], [x + (mx - x) * 0.5, ys - 210 - k * 10], [mx, my + 40], [mx, my]], 12));
  const inside = [[-0.2, -0.95], [0.15, -0.4], [-0.1, 0.15], [0.2, 0.65], [-0.15, 1.1], [0.1, 0.0]];
  return { ys, xs, r, gp, mx, my, paths, runs, inside, OPEN: 1.6 * J + gp };
})();
function glassParts(k) { // back (shadow + body), payload, front (rim + shine) sprites of the payload balls, as in L3D.glassBall
  const { r } = B10, c = 140;
  const back = once('b10b', 280, 300, () => { L.cshadow(c, c + r * 1.08, r * 0.85, r * 0.17, 0.22, 10); X.save(); X.beginPath(); X.arc(c, c, r, 0, TAU); const b = X.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r); b.addColorStop(0, 'rgba(255,255,255,.75)'); b.addColorStop(0.75, 'rgba(225,244,240,.55)'); b.addColorStop(1, 'rgba(120,190,175,.6)'); X.fillStyle = b; X.fill(); X.restore(); });
  const front = once('b10f', 280, 300, () => {
    X.save(); X.beginPath(); X.arc(c, c, r, 0, TAU); X.clip();
    const rim = X.createRadialGradient(c, c, r * 0.72, c, c, r); rim.addColorStop(0, 'rgba(255,255,255,0)'); rim.addColorStop(1, 'rgba(70,150,135,.45)'); X.fillStyle = rim; X.fillRect(c - r, c - r, 2 * r, 2 * r);
    const s = X.createRadialGradient(c - r * 0.38, c - r * 0.45, 0, c - r * 0.38, c - r * 0.45, r * 0.42); s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = s; X.beginPath(); X.ellipse(c - r * 0.38, c - r * 0.45, r * 0.42, r * 0.3, -0.7, 0, TAU); X.fill(); X.restore();
    X.save(); X.strokeStyle = 'rgba(255,255,255,.9)'; X.lineWidth = 2.5; X.beginPath(); X.arc(c, c, r - 2, Math.PI * 0.15, Math.PI * 0.75); X.stroke(); X.restore(); });
  const pay = once('b10p' + k, 280, 300, () => {
    if (k === 0) L.antibody(c, c + 8, 44);
    if (k === 1) { L.cshadow(c + 10, c + 46, 32, 7.2, 0.18, 8); drawEnzyme(c + 4, c, 40, 0.3, 0.5); } // same place and size as the old icon
    if (k === 2) { const ca = Math.cos(-0.26), sa = Math.sin(-0.26); ribbonDraw(ribbonMap(PEPT, (x, y) => [c + x * ca - y * sa, c + 2 + x * sa + y * ca, ca, sa]), 0, PEPT.length - 1, 1.8); }
  });
  return { back, front, pay };
}
B[9] = (P, S, t) => {
  const { ys, xs, mx, my, paths, runs, inside, OPEN } = B10;
  const fo = 1 - seg(t, 4.5, 5.3), po = 1 - seg(t, 3.9, 4.4);
  // payloads first, then the particle shell forms around each
  xs.forEach((x, k) => {
    const g = glassParts(k), pa = seg(t, 0.3 + 0.15 * k, 1.0 + 0.15 * k) * fo, sa = seg(t, 0.9 + 0.15 * k, 1.6 + 0.15 * k) * fo;
    put(g.back, x, ys + 10, sa); put(g.pay, x, ys + 10 + (1 - pa) * 18, pa); put(g.front, x, ys + 10, sa);
    tagA(P.labels[k], x, 836, { align: 'center' }, seg(t, 1.5 + 0.1 * k, 1.9 + 0.1 * k) * fo);
  });
  // dotted routes up to the capsule, and two loaded particles per route travelling them
  paths.forEach((p, k) => { const rv = p.len * seg(t, 1.8 + 0.1 * k, 2.4 + 0.1 * k); if (rv > 2 && po > 0) { X.save(); X.globalAlpha = po; L.dotPath(between(p, 0, rv), 'rgba(14,115,102,.45)', 22, 4.5); X.restore(); } });
  const ins = inside.map(([u, v]) => [u, v, 0]);
  const movers = [];
  runs.forEach((p, k) => [0, 1].forEach(m => {
    const t0 = 2.0 + 0.2 * k + 0.5 * m, u = seg(t, t0, t0 + 1.0), slot = k * 2 + m; if (u <= 0) return;
    ins[slot][2] = seg(t, t0 + 0.85, t0 + 1.0);
    if (u < 1) { const [x, y] = at(p, p.len * u); movers.push([x, y, 1 - seg(u, 0.86, 1)]); }
  }));
  ins.sort((a, b) => a[1] - b[1]);
  capsuleA(CAP.x, CAP.y, CAP.L, CAP.R, CAP.ang, OPEN * (1 - seg(t, 4.3, 5.25)), { inside: ins });
  movers.forEach(([x, y, a]) => gsph(x, y, 20, M.pearl, { alpha: a }));
};

/* ======================= 3. sound: cue helpers and the timed events (art time) ======================= */
const PENT_A = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93]; // A4 C5 D5 E5 G5 A5 C6 D6 E6 G6 A6
// what happens when, in ART time from the film start (screen time = art time x 0.75); the cues below pick events by name
const SOUND_EVENTS = [
  {"t":0,"end":0.7,"kind":"span","what":"loop seam crossfade","beat":1},
  {"t":0,"end":2.6,"kind":"span","what":"capsule falls into gut","beat":1},
  {"t":0,"end":2.6,"kind":"span","what":"gut wall rises into view","beat":1},
  {"t":0.22,"end":0.97,"kind":"span","what":"headline rises in (3 lines)","beat":1},
  {"t":0.67,"end":1.3,"kind":"span","what":"subline rises in","beat":1},
  {"t":2.6,"end":null,"kind":"instant","what":"capsule lands on gut lining","beat":1},
  {"t":2.6,"end":3.4,"kind":"span","what":"cap slides off capsule","beat":1},
  {"t":3,"end":null,"kind":"instant","what":"protein bead 1 emerges","beat":1},
  {"t":3,"end":4.9,"kind":"span","what":"protein chain emerges","beat":1},
  {"t":3.01,"end":null,"kind":"instant","what":"capsule cracks open","beat":1},
  {"t":3.29,"end":null,"kind":"instant","what":"protein bead 2 emerges","beat":1},
  {"t":3.4,"end":3.8,"kind":"span","what":"label \"capsule\" fades in","beat":1},
  {"t":3.43,"end":null,"kind":"instant","what":"protein bead 3 emerges","beat":1},
  {"t":3.53,"end":null,"kind":"instant","what":"protein bead 4 emerges","beat":1},
  {"t":3.63,"end":null,"kind":"instant","what":"protein bead 5 emerges","beat":1},
  {"t":3.72,"end":null,"kind":"instant","what":"protein bead 6 emerges","beat":1},
  {"t":3.8,"end":null,"kind":"instant","what":"protein bead 7 emerges","beat":1},
  {"t":3.89,"end":null,"kind":"instant","what":"protein bead 8 emerges","beat":1},
  {"t":3.97,"end":null,"kind":"instant","what":"protein bead 9 emerges","beat":1},
  {"t":4.05,"end":null,"kind":"instant","what":"protein bead 10 emerges","beat":1},
  {"t":6,"end":6.7,"kind":"span","what":"crossfade into beat 2","beat":2},
  {"t":6.22,"end":6.97,"kind":"span","what":"headline rises in (3 lines)","beat":2},
  {"t":6.6,"end":8.2,"kind":"span","what":"protein drifts down","beat":2},
  {"t":6.67,"end":7.22,"kind":"span","what":"subline rises in","beat":2},
  {"t":6.9,"end":7.3,"kind":"span","what":"labels \"mucus\", \"gut lining\"","beat":2},
  {"t":6.9,"end":8.1,"kind":"span","what":"two enzymes close in","beat":2},
  {"t":8,"end":8.4,"kind":"span","what":"label \"enzymes\" fades in","beat":2},
  {"t":8.15,"end":8.4,"kind":"span","what":"enzyme jaws bite down","beat":2},
  {"t":8.4,"end":null,"kind":"instant","what":"chain breaks at two links","beat":2},
  {"t":8.4,"end":8.9,"kind":"span","what":"three fragments spring apart","beat":2},
  {"t":8.5,"end":8.9,"kind":"span","what":"enzyme jaws reopen","beat":2},
  {"t":8.7,"end":9.9,"kind":"span","what":"enzymes back away","beat":2},
  {"t":8.9,"end":10.6,"kind":"span","what":"fragments sink into mucus","beat":2},
  {"t":10.6,"end":null,"kind":"instant","what":"fragments stuck in mesh","beat":2},
  {"t":12,"end":12.7,"kind":"span","what":"crossfade into beat 3","beat":3},
  {"t":12.22,"end":12.97,"kind":"span","what":"headline rises in (3 lines)","beat":3},
  {"t":12.55,"end":13.35,"kind":"span","what":"positive (+) particle pops in","beat":3},
  {"t":12.67,"end":13.38,"kind":"span","what":"subline rises in","beat":3},
  {"t":12.95,"end":13.75,"kind":"span","what":"negative (−) particle pops in","beat":3},
  {"t":13.35,"end":14.15,"kind":"span","what":"neutral (0) particle pops in","beat":3},
  {"t":14.1,"end":14.5,"kind":"span","what":"question bubble appears (+)","beat":3},
  {"t":14.4,"end":14.8,"kind":"span","what":"question bubble appears (−)","beat":3},
  {"t":14.7,"end":15.1,"kind":"span","what":"question bubble appears (0)","beat":3},
  {"t":15.5,"end":16.1,"kind":"span","what":"question mark blinks (+)","beat":3},
  {"t":15.8,"end":16.4,"kind":"span","what":"question mark blinks (−)","beat":3},
  {"t":16.1,"end":16.7,"kind":"span","what":"question mark blinks (0)","beat":3},
  {"t":18,"end":18.7,"kind":"span","what":"crossfade into beat 4","beat":4},
  {"t":18.22,"end":18.97,"kind":"span","what":"headline rises in (3 lines)","beat":4},
  {"t":18.5,"end":21.3,"kind":"span","what":"mucin strand 1 reaches, wraps","beat":4},
  {"t":18.62,"end":21.42,"kind":"span","what":"mucin strand 2 reaches, wraps","beat":4},
  {"t":18.67,"end":19.3,"kind":"span","what":"subline rises in","beat":4},
  {"t":18.74,"end":21.54,"kind":"span","what":"mucin strand 3 reaches, wraps","beat":4},
  {"t":18.86,"end":21.66,"kind":"span","what":"mucin strand 4 reaches, wraps","beat":4},
  {"t":18.98,"end":21.78,"kind":"span","what":"mucin strand 5 reaches, wraps","beat":4},
  {"t":19.1,"end":21.9,"kind":"span","what":"mucin strand 6 reaches, wraps","beat":4},
  {"t":19.22,"end":22.02,"kind":"span","what":"mucin strand 7 reaches, wraps","beat":4},
  {"t":19.34,"end":22.14,"kind":"span","what":"mucin strand 8 reaches, wraps","beat":4},
  {"t":19.7,"end":20.1,"kind":"span","what":"label \"mucin\" fades in","beat":4},
  {"t":20.5,"end":21.9,"kind":"span","what":"fuzzy mucus coat forms","beat":4},
  {"t":20.57,"end":null,"kind":"instant","what":"strand 1 touches particle","beat":4},
  {"t":20.69,"end":null,"kind":"instant","what":"strand 2 touches particle","beat":4},
  {"t":20.81,"end":null,"kind":"instant","what":"strand 3 touches particle","beat":4},
  {"t":20.93,"end":null,"kind":"instant","what":"strand 4 touches particle","beat":4},
  {"t":21.05,"end":null,"kind":"instant","what":"strand 5 touches particle","beat":4},
  {"t":21.17,"end":null,"kind":"instant","what":"strand 6 touches particle","beat":4},
  {"t":21.29,"end":null,"kind":"instant","what":"strand 7 touches particle","beat":4},
  {"t":21.41,"end":null,"kind":"instant","what":"strand 8 touches particle","beat":4},
  {"t":24,"end":24.7,"kind":"span","what":"crossfade into beat 5","beat":5},
  {"t":24.22,"end":24.97,"kind":"span","what":"headline rises in (3 lines)","beat":5},
  {"t":24.8,"end":25.2,"kind":"span","what":"label \"bare\" fades in","beat":5},
  {"t":24.92,"end":25.62,"kind":"span","what":"stat \"−48 → −12 mV\" rises in","beat":5},
  {"t":25,"end":27.6,"kind":"span","what":"coat grows around particle","beat":5},
  {"t":25.12,"end":25.67,"kind":"span","what":"stat caption rises in","beat":5},
  {"t":25.5,"end":25.95,"kind":"span","what":"minus charge 1/9 fades","beat":5},
  {"t":25.74,"end":26.19,"kind":"span","what":"minus charge 2/9 fades","beat":5},
  {"t":25.98,"end":26.43,"kind":"span","what":"minus charge 3/9 fades","beat":5},
  {"t":26.22,"end":26.67,"kind":"span","what":"minus charge 4/9 fades","beat":5},
  {"t":26.46,"end":26.91,"kind":"span","what":"minus charge 5/9 fades","beat":5},
  {"t":26.7,"end":27.15,"kind":"span","what":"minus charge 6/9 fades","beat":5},
  {"t":26.94,"end":27.39,"kind":"span","what":"minus charge 7/9 fades","beat":5},
  {"t":27.18,"end":27.63,"kind":"span","what":"minus charge 8/9 fades","beat":5},
  {"t":27.42,"end":27.87,"kind":"span","what":"minus charge 9/9 fades","beat":5},
  {"t":27.7,"end":28.1,"kind":"span","what":"label \"coated\" fades in","beat":5},
  {"t":30,"end":30.7,"kind":"span","what":"crossfade into beat 6","beat":6},
  {"t":30.22,"end":30.97,"kind":"span","what":"headline rises in (3 lines)","beat":6},
  {"t":30.5,"end":34.9,"kind":"span","what":"bare particle jiggles in place","beat":6},
  {"t":30.6,"end":34.2,"kind":"span","what":"coated particle travels far","beat":6},
  {"t":30.92,"end":31.62,"kind":"span","what":"stat \"21×\" rises in","beat":6},
  {"t":31.12,"end":31.67,"kind":"span","what":"stat caption rises in","beat":6},
  {"t":31.54,"end":null,"kind":"instant","what":"bare particle turns (1/4)","beat":6},
  {"t":32.2,"end":32.6,"kind":"span","what":"label \"bare\" fades in","beat":6},
  {"t":32.34,"end":null,"kind":"instant","what":"bare particle turns (2/4)","beat":6},
  {"t":33.12,"end":null,"kind":"instant","what":"bare particle turns (3/4)","beat":6},
  {"t":33.75,"end":null,"kind":"instant","what":"bare particle turns (4/4)","beat":6},
  {"t":34.2,"end":34.6,"kind":"span","what":"label \"coated\" fades in","beat":6},
  {"t":36,"end":36.7,"kind":"span","what":"crossfade into beat 7","beat":7},
  {"t":36.22,"end":36.87,"kind":"span","what":"headline rises in (2 lines)","beat":7},
  {"t":36.6,"end":37.9,"kind":"span","what":"particle drifts to cell","beat":7},
  {"t":36.9,"end":37.3,"kind":"span","what":"labels \"microvilli\", \"gut cell\"","beat":7},
  {"t":37.65,"end":37.95,"kind":"span","what":"membrane dimple appears","beat":7},
  {"t":37.9,"end":null,"kind":"instant","what":"particle touches cell surface","beat":7},
  {"t":37.9,"end":39,"kind":"span","what":"particle sinks into pit","beat":7},
  {"t":39,"end":39.5,"kind":"span","what":"pit pinches off, vesicle","beat":7},
  {"t":39.6,"end":40.7,"kind":"span","what":"vesicle moves into cell","beat":7},
  {"t":42,"end":42.7,"kind":"span","what":"crossfade into beat 8","beat":8},
  {"t":42,"end":48,"kind":"span","what":"steady blood flow (36 px/s)","beat":8},
  {"t":42.22,"end":42.97,"kind":"span","what":"headline rises in (3 lines)","beat":8},
  {"t":42.6,"end":44.6,"kind":"span","what":"particle 1 exits cell base","beat":8},
  {"t":42.8,"end":43.2,"kind":"span","what":"label \"blood vessel\" fades in","beat":8},
  {"t":42.92,"end":43.62,"kind":"span","what":"stat \"≈ 35 %\" rises in","beat":8},
  {"t":43,"end":45,"kind":"span","what":"particle 2 exits cell base","beat":8},
  {"t":43.12,"end":43.67,"kind":"span","what":"stat caption rises in","beat":8},
  {"t":43.9,"end":44.15,"kind":"span","what":"particle 1 crosses into vessel","beat":8},
  {"t":44.22,"end":44.44,"kind":"span","what":"particle 2 crosses into vessel","beat":8},
  {"t":44.6,"end":45.4,"kind":"span","what":"particle 1 joins the flow","beat":8},
  {"t":45,"end":45.8,"kind":"span","what":"particle 2 joins the flow","beat":8},
  {"t":48,"end":48.7,"kind":"span","what":"crossfade into beat 9","beat":9},
  {"t":48.2,"end":51.3,"kind":"span","what":"camera pulls back","beat":9},
  {"t":48.22,"end":48.97,"kind":"span","what":"headline rises in (3 lines)","beat":9},
  {"t":48.4,"end":49.3,"kind":"span","what":"station 1: particle coated","beat":9},
  {"t":49,"end":49.4,"kind":"span","what":"step 1 COAT tag lights","beat":9},
  {"t":49.3,"end":51.7,"kind":"span","what":"route line draws","beat":9},
  {"t":50.15,"end":50.26,"kind":"span","what":"station 2 particle appears","beat":9},
  {"t":50.24,"end":50.33,"kind":"span","what":"step 2 STICK tag lights","beat":9},
  {"t":50.72,"end":50.83,"kind":"span","what":"station 3 particle appears","beat":9},
  {"t":50.81,"end":50.9,"kind":"span","what":"step 3 DIFFUSE tag lights","beat":9},
  {"t":51.29,"end":51.54,"kind":"span","what":"station 4 particle appears","beat":9},
  {"t":51.37,"end":51.7,"kind":"span","what":"step 4 ENTER tag lights","beat":9},
  {"t":54,"end":54.7,"kind":"span","what":"crossfade into beat 10","beat":10},
  {"t":54.22,"end":54.97,"kind":"span","what":"headline rises in (3 lines)","beat":10},
  {"t":54.3,"end":55,"kind":"span","what":"antibody payload appears","beat":10},
  {"t":54.45,"end":55.15,"kind":"span","what":"enzyme payload appears","beat":10},
  {"t":54.6,"end":55.3,"kind":"span","what":"peptide payload appears","beat":10},
  {"t":54.67,"end":55.37,"kind":"span","what":"lab name card rises in","beat":10},
  {"t":54.9,"end":55.6,"kind":"span","what":"particle shell forms (antibody)","beat":10},
  {"t":55.05,"end":55.75,"kind":"span","what":"particle shell forms (enzyme)","beat":10},
  {"t":55.2,"end":55.9,"kind":"span","what":"particle shell forms (peptide)","beat":10},
  {"t":55.5,"end":55.9,"kind":"span","what":"label \"antibodies\" fades in","beat":10},
  {"t":55.6,"end":56,"kind":"span","what":"label \"enzymes\" fades in","beat":10},
  {"t":55.7,"end":56.1,"kind":"span","what":"label \"peptides\" fades in","beat":10},
  {"t":55.8,"end":56.4,"kind":"span","what":"dotted route 1 draws","beat":10},
  {"t":55.9,"end":56.5,"kind":"span","what":"dotted route 2 draws","beat":10},
  {"t":56,"end":56.6,"kind":"span","what":"dotted route 3 draws","beat":10},
  {"t":56,"end":57.9,"kind":"span","what":"particles stream into capsule","beat":10},
  {"t":57,"end":null,"kind":"instant","what":"particle 1/6 drops into capsule","beat":10},
  {"t":57.2,"end":null,"kind":"instant","what":"particle 2/6 drops into capsule","beat":10},
  {"t":57.4,"end":null,"kind":"instant","what":"particle 3/6 drops into capsule","beat":10},
  {"t":57.5,"end":null,"kind":"instant","what":"particle 4/6 drops into capsule","beat":10},
  {"t":57.7,"end":null,"kind":"instant","what":"particle 5/6 drops into capsule","beat":10},
  {"t":57.9,"end":null,"kind":"instant","what":"particle 6/6 drops into capsule","beat":10},
  {"t":57.9,"end":58.4,"kind":"span","what":"dotted routes fade","beat":10},
  {"t":58.3,"end":59.25,"kind":"span","what":"cap slides shut","beat":10},
  {"t":58.5,"end":59.3,"kind":"span","what":"payload spheres fade away","beat":10},
  {"t":58.8,"end":null,"kind":"instant","what":"cap meets body, gap shut","beat":10},
  {"t":59.25,"end":null,"kind":"instant","what":"capsule fully closed","beat":10},
];

/* ======================= 4. the film ======================= */
defineFilm({
  id: 'booth_biocoating', title: 'Dressed in Mucus · booth loop',
  kicker: 'ORAL NANOPARTICLE DELIVERY', accent: 'teal', credit: 'Mathiowitz Lab · Brown University',
  size: [1920, 1080], art: 6, beat: 4.5, loop: true,
  beats: [
    { // beat 1
      head: 'Pills are the route patients prefer.',
      sub: 'Many biologic drugs can’t take it.',
      labels: ['capsule'],
      visual: 'A capsule tumbling down into the gut (a soft cross-section of the intestine, the gut lining at the bottom).',
      motion: 'Opens on the capsule falling in (the same picture beat 10 ends on). It lands near the gut lining and opens.',
      draw: (t, P, S) => B[0](P, S, t) },
    { // beat 2
      head: 'The gut breaks big molecules down.',
      sub: 'And mucus blocks the way.',
      labels: ['enzymes', 'mucus', 'gut lining'],
      note: 'mucus pores ≈ 200–500 nm · ≈ 120 µm thick in rat jejunum',
      visual: 'Gut cross-section: in the open gut, enzymes snip a protein chain into pieces; below, a thick fibrous mucus mesh lies over a row of gut-lining cells.',
      motion: 'A protein drifts down, gets cut, and the fragments stick in the mesh.',
      draw: (t, P, S) => B[1](P, S, t) },
    { // beat 3
      head: 'Nanoparticles can carry drugs across.',
      sub: 'Decades of work, no agreement on the best design.',
      labels: ['+', '−', '0'],
      note: 'positive, negative and neutral particles have each been reported to work',
      visual: 'Three nanoparticles side by side, one positive, one negative, one neutral, each with a small question mark.',
      motion: 'The three particles pop in; the question marks blink.',
      draw: (t, P, S) => B[2](P, S, t) },
    { // beat 4
      head: 'In the gut, no particle arrives bare.',
      sub: 'Mucus coats it first. We call it biocoating.',
      labels: ['mucin'],
      note: 'seen in vivo: a mucus corona around particles by electron microscopy',
      visual: 'One bare nanoparticle meeting strands of mucin that wrap around it and form a fuzzy coat.',
      motion: 'Mucin strands reach out and wrap the particle.',
      draw: (t, P, S) => B[3](P, S, t) },
    { // beat 5
      head: 'The coat neutralizes its charge.',
      stat: { v: '−48 → −12 mV', l: 'surface charge' },
      labels: ['bare', 'coated'],
      note: 'PLA nanoparticles, water vs. 0.1 % mucin, in vitro · 9 of 9 polymers moved toward neutral',
      visual: 'The particle twice: bare, ringed with minus signs; coated, with almost none. Or a charge gauge sliding from −48 toward 0.',
      motion: 'The minus signs fade as the coat closes; the gauge needle swings toward neutral.',
      draw: (t, P, S) => B[4](P, S, t) },
    { // beat 6
      head: 'Coated, it slips through mucus.',
      stat: { v: '21×', l: 'faster diffusion' },
      labels: ['bare', 'coated'],
      note: 'pre-coated vs. bare · 5 % mucin gel, in vitro',
      visual: 'A mucus mesh with two particle tracks: the bare particle stuck with a short, tangled track; the coated particle with a long, open track.',
      motion: 'Both particles move; the coated one travels far, the bare one jiggles in place.',
      draw: (t, P, S) => B[5](P, S, t) },
    { // beat 7
      head: 'Gut cells take the particles in.',
      labels: ['gut cell', 'microvilli'],
      note: 'electron microscopy: 200–1000 nm polystyrene beads inside gut cells, rat jejunum',
      visual: 'A row of gut-lining cells with microvilli on top; coated particles pass the microvilli and sit inside one cell in a small bubble (vesicle).',
      motion: 'A particle touches the cell surface and is pulled inside.',
      draw: (t, P, S) => B[6](P, S, t) },
    { // beat 8
      head: 'Over a third reached the blood.',
      stat: { v: '≈ 35 %', l: 'bioavailability' },
      labels: ['blood vessel'],
      note: 'rat isolated intestinal loops, 5 h, n = 7 · also found in liver, lungs, spleen',
      visual: 'Below the gut cells, a blood vessel with red cells and nanoparticles flowing along it.',
      motion: 'Particles exit the bottom of the cells and join the flow.',
      draw: (t, P, S) => B[7](P, S, t) },
    { // beat 9
      head: 'Design for the coat the gut adds.',
      labels: ['1 COAT', '2 STICK', '3 DIFFUSE', '4 ENTER'],
      note: 'the pathway Azagury et al. propose, Small 2022',
      visual: 'The whole route on one picture: particle gets coated, sticks to the mucus, diffuses through, enters the gut lining. Four numbered steps along the path.',
      motion: 'The camera pulls back along the route, lighting the four steps in order.',
      draw: (t, P, S) => B[8](P, S, t) },
    { // beat 10
      head: 'The goal: protein drugs by mouth.',
      sub: 'Mathiowitz Lab · Brown University',
      card: true,
      labels: ['antibodies', 'enzymes', 'peptides'],
      note: 'Azagury et al., Small 2022 · the goal, not yet shown with these drugs',
      visual: 'Three payload icons (Y-shaped antibody, enzyme blob, short peptide chain) load into nanoparticles, which pack into a capsule. The capsule is about to fall, exactly as beat 1 opens.',
      motion: 'The particles fill the capsule, it closes and drops, and the loop restarts at beat 1.',
      draw: (t, P, S) => B[9](P, S, t) },
  ],
  sound: {
    seed: 23,
    // the library bed: glass pad, sub pulse, gated glass arpeggio, tuned clicks, a quiet hat; A (key 57), the 'reich'
    // cycle moved to A: Amaj9 (beats 1-2) C#m9 (3-4) F#m9 (5-6) Dmaj7#11 (7-8) Esus (9-10)
    music: { bed: 'glassPulse', key: 57 },
    events: SOUND_EVENTS,
    cues(E, o, ev, U) {
      const { at } = U, K = U.K, KEY = 57;
      const S = x => o + x * K;
      const fx = (name, t, opt) => E.fx(name, t, opt);
      // dissolves: one soft library transition per beat change, starting 0.25 s before it, under the event cues. The
      // one into beat 1 starts before the loop point; a loop renders three passes and keeps the middle one, so its start
      // is heard at the end of the loop and its tail at the beginning, as on repeat
      const TR = [ // [effect, options]; g follows the bed, which is thin at the start and end of the loop and fullest in beats 5-7
        ['tunedSweep', { key: KEY, dir: 'down', dur: 0.9, g: 0.28, pan: 0.15 }],         // -> 1: the capsule starts to fall (loop seam)
        ['sheetSlide', { style: '3dlight', dur: 0.9, dir: 'left', g: 0.3, pan: 0.2 }],   // -> 2: the gut cross-section slides in
        ['breathBloom', { key: KEY, g: 0.25, pan: 0.3 }],                                   // -> 3: three particles
        ['lensRack', { key: KEY, g: 0.22, pan: 0.2 }],                                      // -> 4: focus on one particle
        ['tunedSweep', { key: KEY, dir: 'up', dur: 1.0, g: 0.55, pan: 0.3 }],              // -> 5: bare and coated, side by side
        ['sheetSlide', { style: '3dlight', dur: 0.8, dir: 'right', g: 0.6, pan: 0.25 }],  // -> 6: the mucus gel
        ['breathBloom', { key: KEY, pitch: -3, g: 0.46, pan: 0.3 }],                       // -> 7: the gut cells
        ['tonalSwoosh', { key: KEY, dir: 'up', g: 0.41, pan: 0.2 }],                       // -> 8: along the blood vessel
        ['lensRack', { key: KEY, dir: 'out', g: 0.40, pan: 0.25 }],                        // -> 9: the camera pulls back
        ['reverseBloom', { key: KEY, dur: 1.0, g: 0.37, pan: -0.1 }],                      // -> 10: the card (swells into the cut, lands 0.05 s after it)
      ];
      TR.forEach(([n, opt], i) => {
        const b = U.beatStart(i);
        fx(n, n === 'reverseBloom' ? b - opt.dur + 0.05 : b - 0.25, opt);
      });

      // 1: the capsule falls, lands on the gut lining, its cap slides off and the protein unfurls out of it
      fx('fallAway', S(1.0), { key: KEY, dur: 1.2, g: 0.46, pan: 0.33 });
      fx('membraneTap', S(2.6), { key: KEY, g: 0.8, pan: 0.33 });
      fx('capsuleOpen', S(2.98), { g: 0.33, pan: 0.4 });
      fx('staggerCascade', S(3.05), { key: KEY, n: 10, dur: S(4.05) - S(3.0), g: 0.44, pan: 0.2 });
      // 2: two enzymes float in and cut the chain at two links; the fragments sink into the mucus and stick
      fx('dopplerPass', S(6.9), { key: KEY, dur: S(8.15) - S(6.9), size: 0.25, g: 0.38, pan: 0.2 });
      fx('enzymeSnip', S(8.4), { style: '3dlight', g: 0.46, pan: 0.12 });
      fx('enzymeSnip', S(8.4) + 0.06, { style: '3dlight', g: 0.44, pan: 0.32, pitch: -2 });
      fx('diffuseDrift', S(8.95), { style: '3dlight', dur: S(10.6) - S(8.95), viscosity: 0.85, g: 0.54, pan: 0.28 });
      fx('gelWobble', S(10.6), { style: '3dlight', size: 0.6, g: 0.18, pan: 0.28 });
      // 3: three particles pop in (+ high, - low, 0 between); question bubbles appear; the question marks blink
      const P3 = [0.11, 0.37, 0.63];
      at(ev, /particle pops in/).forEach((e, k) => fx('overshootPop', S(e.t) + 0.12, { key: KEY, pitch: [7, -1, 4][k], g: 0.16, pan: P3[k] }));
      at(ev, /^question bubble appears/).forEach((e, k) => fx('siliconeTap', S(e.t) + 0.05, { key: KEY, size: 0.15, g: 0.48, pan: P3[k] + 0.08 }));
      at(ev, /^question mark blinks/).forEach((e, k) => fx('toggleStep', S(e.t) + 0.22, { key: KEY, pitch: [4, 2, 4][k], g: 0.44, pan: P3[k] + 0.08 }));
      // 4: mucin strands slide in from the right and touch the particle one after another; the fuzzy coat forms
      fx('sheetSlide', S(18.5), { style: '3dlight', dur: 1.4, dir: 'left', g: 0.44, pan: 0.55 });
      fx('accrete', S(19.8), { key: KEY, dur: S(21.9) - S(19.8) + 0.1, g: 0.6, pan: 0.25 });
      // 5: the charge reading lands; the minus charges cancel as the coat closes; "coated"
      fx('tuningForkPing', S(24.92) + 0.1, { key: KEY, g: 0.48, pan: -0.3 });
      at(ev, /^minus charge \d+\/9 fades/).filter((e, k) => k % 4 === 0).forEach((e, k) => fx('chargeCancel', S(e.t) + 0.1, { key: KEY + 12, style: '3dlight', pitch: [0, -3, -5][k], g: 0.26, pan: 0.55 }));
      fx('breathChime', S(27.7) + 0.05, { key: KEY, g: 0.4, pan: 0.55 });
      // 6: the stat lands; the coated particle diffuses far through the gel; the bare one bumps in place
      fx('octaveFlam', S(30.92) + 0.12, { key: KEY, g: 0.6, pan: -0.3 });
      fx('diffuseDrift', S(30.6), { style: '3dlight', dur: S(34.2) - S(30.6), viscosity: 0.05, g: 0.6, pan: 0.35 });
      at(ev, /^bare particle turns/).forEach((e, k) => fx('siliconeTap', S(e.t), { key: KEY, size: 0.4, pitch: [0, 4, -1, 7][k], g: 0.5, pan: 0.13 }));
      // 7: the particle drifts down to a cell, touches it, sinks into a pit and is swallowed; the vesicle pinches off and moves in
      fx('tonalSwoosh', S(36.6), { key: KEY, dir: 'down', dur: S(37.9) - S(36.6), g: 0.75, pan: 0.37 });
      fx('membraneTap', S(37.9), { key: KEY, pitch: 5, g: 0.6, pan: 0.37 });
      fx('engulf', S(37.9) - 0.02, { style: '3dlight', g: 0.58, pan: 0.37 });
      fx('vesiclePinch', S(39.05), { style: '3dlight', g: 0.5, pan: 0.37 });
      // 8: blood flows on the beat grid; the stat counts up; two particles cross into the vessel and are swept along
      fx('dopplerFlow', U.beatStart(7), { bpm: 60 / U.Q, dur: U.VB, g: 0.55, pan: 0.2 });
      fx('rollTicks', S(42.92), { key: KEY, dur: 0.55, n: 12, g: 0.58, pan: -0.3 });
      at(ev, /^particle \d+ crosses into vessel/).forEach((e, k) => fx('dropMerge', S(e.t) + 0.05, { style: '3dlight', pitch: [0, -2][k], g: 0.48, pan: [0.2, 0.43][k] }));
      fx('dopplerPass', S(44.6), { key: KEY, dur: S(45.8) - S(44.6), size: 0.1, g: 0.35, pan: 0.3 }); // swept along with the flow
      // 9: the route draws and the four steps light with rising glass notes on the Esus chord
      fx('lineTrace', S(49.3), { key: KEY, dur: S(51.7) - S(49.3), g: 0.50, pan: 0.3 });
      at(ev, /^step \d \w+ tag lights/).forEach((e, k) => fx('fmGlassPluck', S(e.t), { note: [76, 78, 81, 83][k], g: 0.35, pan: [0.11, 0.3, 0.48, 0.35][k] }));
      // 10: payloads appear, the card rises, particles drop into the capsule, the cap slides shut and latches
      at(ev, /payload appears$/).forEach((e, k) => fx('lpgPluck', S(e.t) + 0.15, { key: KEY, note: [69, 71, 76][k], g: 0.2, pan: [0.07, 0.34, 0.62][k] }));
      fx('chordSwellToUnison', S(54.67), { key: KEY, notes: [52, 57, 59, 64, 71], note: 69, g: 0.35, pan: -0.3 });
      at(ev, /^particle \d\/6 drops into capsule/).forEach((e, k) => fx('ceramicTap', S(e.t), { style: '3dlight', size: 0.25, pitch: -1.5 * k, g: 0.43, pan: 0.28 }));
      fx('sheetSlide', S(58.3), { style: '3dlight', dur: S(59.25) - S(58.3), dir: 'left', g: 0.3, pan: 0.28 });
      fx('softLatch', S(59.25) - 0.01, { g: 0.52, pan: 0.28 });
    },
  },
});
})();
