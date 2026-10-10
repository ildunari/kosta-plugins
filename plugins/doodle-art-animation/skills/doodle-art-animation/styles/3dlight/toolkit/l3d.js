// 3DLight drawing library: the matte 3D primitives, materials, accents and text layout of the style.
// Loaded after core.js. Everything is exported on window.L3D (story code usually starts with `const L = L3D;`).
// Every function draws with the global context X at the current transform, and is a pure function of its
// arguments (seeded randomness only), so frames can be captured in any order.
//
// Taken from the Brown expo booth loops (style_l3d.js, 2026-10-09) with the project panels removed. Function names,
// arguments and pixels are unchanged, so art written for the booth loops runs as is. Story-specific scene helpers
// (a calendar tray, a gut wall ...) live in the story; L3D.extend({ name }) gives art code that calls L.name a view
// of L3D with them added.
//
// The look is MATTE: highlights stay below about 0.45 white, there is no bokeh and no dark ground. Keep it that way
// when adding primitives (references/look.md).
(() => {
const NAVY = '#0F1B2D', SLATE = '#40546A', MUTE = '#5E7086', INK2 = '#22344A';
// Accent palettes. a: accent (ticks, stat gradient top, dots), t: text accent (kicker, stat gradient foot), soft: pale
// tint, bg0 / bg1: backdrop top / bottom, floor: the floor haze. amber and teal are the booth loops' accents.
const PAL = {
  amber: { a: '#E39B2D', t: '#B0640A', soft: '#F6D9A8', bg0: '#F7FAFD', bg1: '#DDE9F5', floor: 'rgba(150,176,206,.20)' },
  teal: { a: '#14917F', t: '#0E7366', soft: '#BFE6DC', bg0: '#F5FBF9', bg1: '#D4ECE5', floor: 'rgba(110,172,156,.18)' },
  blue: { a: '#3B7DD8', t: '#1F5BAA', soft: '#C8DBF3', bg0: '#F6F9FD', bg1: '#D8E5F4', floor: 'rgba(140,170,210,.20)' }, // new, not yet used in a film
};
PAL.meso = PAL.amber; PAL.bio = PAL.teal; // the booth loops' project names, so old art code that calls setA('meso') works
let A = PAL.amber;
// layout: text column starts at LX and is TW wide; right-aligned chrome (note, credit) ends at RX
const LX = 110, TW = 800, RX = 1840;
const TAU = Math.PI * 2;
// ---------- materials ----------
const M = {
  white: { hi: '#FFFFFF', mid: '#E8EEF4', lo: '#A6B5C7', rim: '#8596AC' },
  pearl: { hi: '#FFFFFF', mid: '#E3EAF2', lo: '#9EAFC3', rim: '#7E90A8' },
  amber: { hi: '#FFF0D2', mid: '#F0AC45', lo: '#B5680F', rim: '#98540A' },
  drug: { hi: '#FFFEF4', mid: '#F7E08C', lo: '#CDA43C', rim: '#B88E27' },
  teal: { hi: '#E6FFF8', mid: '#35B19E', lo: '#0C6C5F', rim: '#095A4F' },
  chain: { hi: '#FFFFFF', mid: '#C7D4E3', lo: '#6F86A1' },
  coral: { hi: '#FFEDE8', mid: '#F2927F', lo: '#B4473B', rim: '#963A31' },
  blue: { hi: '#EEF5FF', mid: '#7BA9DD', lo: '#2F5E99', rim: '#264E82' },
  grey: { hi: '#FFFFFF', mid: '#D3DAE3', lo: '#8796A8', rim: '#6F7F93' },
  red: { hi: '#FFD8D3', mid: '#DE5A52', lo: '#9C2630', rim: '#82202A' },
  gold: { hi: '#FFF6DA', mid: '#F2C14E', lo: '#B9851A', rim: '#9C6F12' },
  slateB: { hi: '#F1F5FB', mid: '#8EA6C8', lo: '#46607F', rim: '#384E69' },
  strand: { hi: '#F2FFFC', mid: '#71CDBD', lo: '#1F8C7B' },
  cell: { hi: '#FFF5F1', mid: '#F5CEC3', lo: '#D69184' },
  nuc: { hi: '#F8DAD6', mid: '#CC8B8D', lo: '#985964', rim: '#854D57' },
};

// ---------- generic helpers ----------
function wrapLines(s, maxW, o) {
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && meas(t, o) > maxW) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function poly(pts) { X.beginPath(); pts.forEach((p, k) => k ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); X.closePath(); }
function pathOpen(pts) { X.beginPath(); pts.forEach((p, k) => k ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); }
function layer(fn, o = {}) { const c = off(W, H); withCtx(c.getContext('2d'), fn); X.save(); if (o.blur) X.filter = `blur(${o.blur}px)`; X.globalAlpha = o.alpha ?? 1; X.drawImage(c, 0, 0); X.restore(); }
function spline(pts, n = 14) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); }
  }
  out.push(pts[pts.length - 1]); return out;
}
function camera(pitchDeg, dist, f, ox, oy) {
  const th = pitchDeg * Math.PI / 180, s = Math.sin(th), c = Math.cos(th); const Cy = dist * s, Cz = -dist * c;
  return (x, y, z) => { const py = y - Cy, pz = z - Cz; const zc = -py * s + pz * c, yc = py * c + pz * s; return [ox + f * x / zc, oy - f * yc / zc, f / zc]; };
}

// ---------- backdrop ----------
// the light studio backdrop: accent gradient, a soft white glow at (o.cx, o.cy), floor haze. The first two
// arguments are unused (kept for the booth code); there is no bokeh option on purpose.
function backdrop(proj, seed, o = {}) {
  const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, A.bg0); g.addColorStop(1, A.bg1); X.fillStyle = g; X.fillRect(0, 0, W, H);
  const cx = o.cx ?? 1380, cy = o.cy ?? 430;
  const r = X.createRadialGradient(cx, cy, 40, cx, cy, 1000); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(0.5, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = r; X.fillRect(0, 0, W, H);
  const f = X.createLinearGradient(0, 700, 0, H); f.addColorStop(0, 'rgba(255,255,255,0)'); f.addColorStop(1, A.floor); X.fillStyle = f; X.fillRect(0, 700, W, H - 700);
}
function cshadow(cx, cy, rx, ry, a = 0.3, blur = 16) { X.save(); X.filter = `blur(${blur}px)`; X.fillStyle = `rgba(20,36,58,${a})`; X.beginPath(); X.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, TAU); X.fill(); X.restore(); }
function ground(cx, cy, rx, ry, k = 1) { cshadow(cx, cy + ry * 0.3, rx * 1.18, ry * 1.7, 0.11 * k, 36); cshadow(cx, cy, rx * 0.97, ry * 0.85, 0.24 * k, 12); }

// ---------- text grid ----------
const SHORTW = new Set(['a', 'an', 'in', 'of', 'to', 'at', 'by', 'the', 'is']);
function partition(s, size, maxW, k, strict = true) { // best split of s into exactly k lines, or null
  const words = s.split(' '), n = words.length, o = { w: 700, size, f: F.sora, ls: -2 };
  const wl = (a, b) => meas(words.slice(a, b).join(' '), o); let best = null;
  const rec = (start, left, acc) => {
    if (left === 1) { if (wl(start, n) <= maxW) { const parts = [...acc, [start, n]]; const ws = parts.map(([a, b]) => wl(a, b)); let sc = Math.max(...ws) + 0.35 * (Math.max(...ws) - Math.min(...ws));
      let pen = 0; parts.slice(0, -1).forEach(([a, b]) => { if (SHORTW.has(words[b - 1].toLowerCase())) pen++; }); sc += pen * 260; if (!best || sc < best.sc) best = { sc, pen, lines: parts.map(([a, b]) => words.slice(a, b).join(' ')) }; } return; }
    for (let e = start + 1; e <= n - left + 1; e++) { if (wl(start, e) > maxW) break; rec(e, left - 1, [...acc, [start, e]]); }
  };
  if (k <= n) rec(0, k, []); return best && (strict && best.pen ? null : best.lines);
}
function headLines(s) {
  for (let size = 116; size >= 104; size -= 2) for (const k of [1, 2]) { const l = partition(s, size, TW, k); if (l) return { size, lines: l }; }
  for (const strict of [true, false]) for (let size = 116; size >= 96; size -= 2) { const l = partition(s, size, TW, 3, strict); if (l) return { size, lines: l }; }
  return { size: 92, lines: wrapLines(s, TW, { w: 700, size: 92, f: F.sora, ls: -2 }) };
}
function splitBest(s, maxW, o, kMax) { // balanced split into the fewest lines (<= kMax): prefers breaks after punctuation
  const ws = s.split(' '), n = ws.length; const wl = (a, b) => meas(ws.slice(a, b).join(' '), o);
  for (let k = 1; k <= kMax; k++) {
    let best = null;
    const rec = (st, left, acc) => {
      if (left === 1) { if (wl(st, n) > maxW) return; const parts = [...acc, [st, n]]; const w = parts.map(([a, b]) => wl(a, b)); let sc = Math.max(...w);
        parts.slice(0, -1).forEach(([a, b], i) => { const last = ws[b - 1]; if (/[.,:·]$/.test(last)) sc -= 220; if (SHORTW.has(last.toLowerCase())) sc += 200; sc += 0.6 * Math.max(0, w[i + 1] - w[i]); });
        if (!best || sc < best.sc) best = { sc, l: parts.map(([a, b]) => ws.slice(a, b).join(' ')) }; return; }
      for (let e = st + 1; e <= n - left + 1; e++) { if (wl(st, e) > maxW) break; rec(e, left - 1, [...acc, [st, e]]); }
    };
    rec(0, k, []); if (best) return best.l;
  }
  return wrapLines(s, maxW, o);
}
function subLines(s, maxW, o) { return splitBest(s, maxW, o, 3); }

// ---------- callouts ----------
function tag(s, x, y, o = {}) {
  const size = o.size || 40, w = o.w || 600, padX = 24, h = size + 30;
  const m = meas(s, { w, size, f: F.sora }); const dotW = o.dot ? 30 : 0; const bw = m + padX * 2 + dotW;
  const bx = o.align === 'center' ? x - bw / 2 : o.align === 'right' ? x - bw : x, by = y - h / 2;
  X.save(); X.shadowColor = 'rgba(15,27,45,.16)'; X.shadowBlur = 24; X.shadowOffsetY = 7; rr(bx, by, bw, h, h / 2); X.fillStyle = 'rgba(255,255,255,.96)'; X.fill(); X.restore();
  X.save(); rr(bx + 0.5, by + 0.5, bw - 1, h - 1, h / 2); X.strokeStyle = 'rgba(15,27,45,.06)'; X.lineWidth = 1.5; X.stroke(); X.restore();
  let tx = bx + padX; if (o.dot) { X.fillStyle = o.dot; X.beginPath(); X.arc(tx + 9, y, 10, 0, TAU); X.fill(); tx += dotW; }
  txt(s, tx, y + size * 0.36, { w, size, f: F.sora, color: o.color || NAVY });
  return { x: bx, y: by, w: bw, h, cx: bx + bw / 2, r: bx + bw, b: by + h };
}
function leader(x1, y1, x2, y2) {
  line(x1, y1, x2, y2, 'rgba(15,27,45,.55)', 3);
  X.save(); X.fillStyle = '#FFFFFF'; X.strokeStyle = NAVY; X.lineWidth = 3.5; X.beginPath(); X.arc(x2, y2, 8, 0, TAU); X.fill(); X.stroke(); X.restore();
}

// ---------- 3D primitives ----------
function gsph(x, y, r, c, o = {}) {
  X.save(); X.globalAlpha = o.alpha ?? 1;
  const g = X.createRadialGradient(x - r * 0.34, y - r * 0.4, r * 0.02, x - r * 0.08, y - r * 0.1, r * 1.12);
  g.addColorStop(0, c.hi); g.addColorStop(0.42, c.mid); g.addColorStop(0.86, c.lo); g.addColorStop(1, c.rim || c.lo);
  X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); X.clip();
  const b = X.createRadialGradient(x + r * 0.1, y + r * 1.2, 0, x + r * 0.1, y + r * 1.2, r * 0.95); b.addColorStop(0, 'rgba(255,255,255,.28)'); b.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = b; X.fillRect(x - r, y - r, 2 * r, 2 * r);
  if (o.spec !== false) {
    const hx = x - r * 0.36, hy = y - r * 0.45; const s = X.createRadialGradient(hx, hy, 0, hx, hy, r * 0.42);
    s.addColorStop(0, 'rgba(255,255,255,.42)'); s.addColorStop(0.45, 'rgba(255,255,255,.14)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    X.fillStyle = s; X.beginPath(); X.ellipse(hx, hy, r * 0.44, r * 0.3, -0.7, 0, TAU); X.fill();
  }
  X.restore();
}
function tube(pts, w, c, o = {}) {
  const P = () => pathOpen(pts);
  X.save(); X.lineCap = 'round'; X.lineJoin = 'round'; X.globalAlpha = o.alpha ?? 1;
  P(); X.strokeStyle = c.lo; X.lineWidth = w; X.stroke();
  P(); X.strokeStyle = c.mid; X.lineWidth = w * 0.7; X.stroke();
  X.translate(-w * 0.1, -w * 0.15); P(); X.strokeStyle = c.hi; X.lineWidth = w * 0.24; X.globalAlpha = (o.alpha ?? 1) * 0.45; X.stroke();
  X.restore();
}
function disc2d(sx, sy, rx, ry, hp, pal, o = {}) {
  X.save(); X.globalAlpha = o.alpha ?? 1;
  X.beginPath(); X.moveTo(sx - rx, sy); X.lineTo(sx - rx, sy + hp); X.ellipse(sx, sy + hp, rx, ry, 0, Math.PI, 0, true); X.lineTo(sx + rx, sy); X.ellipse(sx, sy, rx, ry, 0, 0, Math.PI, false); X.closePath();
  const g = X.createLinearGradient(sx - rx, 0, sx + rx, 0); g.addColorStop(0, pal.lo); g.addColorStop(0.38, pal.mid); g.addColorStop(0.55, pal.hi2 || pal.mid); g.addColorStop(1, pal.lo); X.fillStyle = g; X.fill();
  const tg = X.createRadialGradient(sx - rx * 0.3, sy - ry * 0.5, 1, sx, sy, rx * 1.05); tg.addColorStop(0, pal.hi); tg.addColorStop(0.6, pal.top || pal.mid); tg.addColorStop(1, pal.lo2 || pal.lo);
  X.fillStyle = tg; X.beginPath(); X.ellipse(sx, sy, rx, ry, 0, 0, TAU); X.fill();
  if (o.score) { X.strokeStyle = 'rgba(120,60,0,.28)'; X.lineWidth = Math.max(1.2, rx * 0.07); X.beginPath(); X.moveTo(sx - rx * 0.78, sy); X.lineTo(sx + rx * 0.78, sy); X.stroke(); X.strokeStyle = 'rgba(255,255,255,.55)'; X.lineWidth = Math.max(1, rx * 0.04); X.beginPath(); X.moveTo(sx - rx * 0.76, sy + ry * 0.12); X.lineTo(sx + rx * 0.76, sy + ry * 0.12); X.stroke(); }
  X.strokeStyle = 'rgba(255,255,255,.45)'; X.lineWidth = Math.max(1, rx * 0.05); X.beginPath(); X.ellipse(sx, sy, rx * 0.96, ry * 0.93, 0, 0.12 * Math.PI, 0.88 * Math.PI); X.stroke();
  const hx = sx - rx * 0.36, hy = sy - ry * 0.4; const s = X.createRadialGradient(hx, hy, 0, hx, hy, rx * 0.45); s.addColorStop(0, 'rgba(255,255,255,.35)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  X.fillStyle = s; X.beginPath(); X.ellipse(hx, hy, rx * 0.45, ry * 0.42, 0, 0, TAU); X.fill();
  X.restore();
}
const PILL = { hi: '#FFF1D4', mid: '#EFA841', hi2: '#F8CB7C', top: '#F3B455', lo: '#B4660E', lo2: '#D58A22' };
function speck(x, y, r, pal = M.drug) { gsph(x, y, r, pal, { spec: r > 5 }); }

// matte white tablet (implant disc) with pale-yellow drug specks; cut = [a1, a2] removes the front wedge
function tablet(cx, cy, rx, ry, h, o = {}) {
  const seed = o.seed || 7; const sp = o.speck || M.drug;
  if (o.shadow !== false) ground(cx, cy + h + ry * 0.05, rx * 1.02, ry * 1.05, o.shadowK || 1);
  const cut = o.cut; const a1 = cut ? cut[0] : 0, a2 = cut ? cut[1] : 0;
  const pt = (a, dz = 0) => [cx + rx * Math.cos(a), cy + ry * Math.sin(a) + dz];
  const sideG = () => { const g = X.createLinearGradient(cx - rx, 0, cx + rx, 0); g.addColorStop(0, '#A9B8CA'); g.addColorStop(0.15, '#D6DFE9'); g.addColorStop(0.4, '#FFFFFF'); g.addColorStop(0.7, '#EAF0F6'); g.addColorStop(1, '#9DAEC2'); return g; };
  const wall = (s, e) => {
    X.beginPath(); X.ellipse(cx, cy, rx, ry, 0, s, e, false); const [ex, ey] = pt(e, h); X.lineTo(ex, ey); X.ellipse(cx, cy + h, rx, ry, 0, e, s, true); X.closePath();
    X.fillStyle = sideG(); X.fill(); const v = X.createLinearGradient(0, cy, 0, cy + h + ry); v.addColorStop(0, 'rgba(15,27,45,0)'); v.addColorStop(1, 'rgba(15,27,45,.12)'); X.fillStyle = v; X.fill();
  };
  if (cut) { wall(0, a1); wall(a2, Math.PI); } else wall(0, Math.PI);
  if (cut) {
    const face = (a, dark, fs) => {
      const [px, py] = pt(a); X.save(); X.beginPath(); X.moveTo(cx, cy); X.lineTo(px, py); X.lineTo(px, py + h); X.lineTo(cx, cy + h); X.closePath();
      const g = X.createLinearGradient(cx, cy, px, py + h); g.addColorStop(0, dark ? '#E1E8F0' : '#F3F6F9'); g.addColorStop(1, dark ? '#CDD7E2' : '#E3E9F0'); X.fillStyle = g; X.fill(); X.clip();
      const r = rng(fs); const dx = px - cx, dy = py - cy; const n = Math.round(rx * 0.11);
      for (let k = 0; k < n; k++) { const u = 0.04 + r() * 0.94, v = 0.1 + r() * 0.8; speck(cx + dx * u, cy + dy * u + v * h, (o.sr || 7) * (0.6 + r() * 0.6), sp); }
      X.restore();
    };
    face(a2, false, seed + 11); face(a1, true, seed + 23);
  }
  // top face
  X.save(); X.beginPath();
  if (cut) { X.moveTo(cx, cy); X.ellipse(cx, cy, rx, ry, 0, a2, a1 + TAU, false); X.closePath(); } else X.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  const tg = X.createRadialGradient(cx - rx * 0.25, cy - ry * 0.6, 10, cx, cy, rx * 1.05); tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(0.6, o.topMid || '#F1F5F9'); tg.addColorStop(1, '#D3DCE7');
  X.fillStyle = tg; X.fill(); X.clip();
  if (o.specks !== false) { const r = rng(seed); const n = o.n || Math.round(rx * 0.32); for (let k = 0; k < n; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.94; speck(cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, (o.sr || 7) * (0.55 + r() * 0.6), sp); } }
  // faint softbox sheen on the top (kept low so the look stays matte)
  X.globalAlpha = 0.16; const sg = X.createLinearGradient(cx - rx, cy - ry, cx - rx * 0.2, cy + ry); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.45, 'rgba(255,255,255,.9)'); sg.addColorStop(0.6, 'rgba(255,255,255,0)'); X.fillStyle = sg; X.fillRect(cx - rx, cy - ry, 2 * rx, 2 * ry);
  X.restore();
  X.save(); X.strokeStyle = 'rgba(110,130,155,.35)'; X.lineWidth = 1.5; X.beginPath(); if (cut) X.ellipse(cx, cy, rx, ry, 0, a2, a1 + TAU, false); else X.ellipse(cx, cy, rx, ry, 0, 0, TAU); X.stroke();
  X.strokeStyle = 'rgba(255,255,255,.95)'; X.lineWidth = Math.max(2, rx * 0.008); X.beginPath(); if (cut) { X.ellipse(cx, cy + 2, rx - 2, ry - 2, 0, 0.05, a1); X.moveTo(...pt(a2, 2)); X.ellipse(cx, cy + 2, rx - 2, ry - 2, 0, a2, Math.PI - 0.05); } else X.ellipse(cx, cy + 2, rx - 2, ry - 2, 0, 0.05, Math.PI - 0.05); X.stroke();
  if (cut) { X.strokeStyle = 'rgba(255,255,255,.95)'; X.lineWidth = 2.5; X.beginPath(); X.moveTo(...pt(a2)); X.lineTo(cx, cy); X.lineTo(...pt(a1)); X.stroke(); X.strokeStyle = 'rgba(110,130,155,.35)'; X.lineWidth = 2; X.beginPath(); X.moveTo(cx, cy); X.lineTo(cx, cy + h); X.stroke(); }
  X.restore();
}
// generic steel / matte cylinder (vertical), top centre (cx, cy)
function steelG(x0, x1, warm) {
  const g = X.createLinearGradient(x0, 0, x1, 0);
  const st = warm ? ['#9A560C', '#C97F22', '#EAAE58', '#F3C886', '#E9A443', '#B8701A', '#8E4F0A'] : ['#7F8D9F', '#B2BDCA', '#E2E8EF', '#EDF1F5', '#CFD7E0', '#96A4B6', '#718094'];
  [0, 0.12, 0.34, 0.48, 0.66, 0.88, 1].forEach((p, k) => g.addColorStop(p, st[k])); return g;
}
function cylinder(cx, cy, rx, ry, h, o = {}) {
  X.save();
  X.beginPath(); X.moveTo(cx - rx, cy); X.lineTo(cx - rx, cy + h); X.ellipse(cx, cy + h, rx, ry, 0, Math.PI, 0, true); X.lineTo(cx + rx, cy); X.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); X.closePath();
  X.fillStyle = o.side || steelG(cx - rx, cx + rx, o.warm); X.fill();
  const v = X.createLinearGradient(0, cy, 0, cy + h + ry); v.addColorStop(0, 'rgba(15,27,45,0)'); v.addColorStop(1, `rgba(15,27,45,${o.dark ?? 0.12})`); X.fillStyle = v; X.fill();
  if (o.top !== false) {
    const tg = X.createRadialGradient(cx - rx * 0.3, cy - ry * 0.5, 4, cx, cy, rx * 1.05); tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(0.6, o.topMid || '#E2E8EF'); tg.addColorStop(1, o.topLo || '#AEBACA');
    X.fillStyle = tg; X.beginPath(); X.ellipse(cx, cy, rx, ry, 0, 0, TAU); X.fill();
    X.strokeStyle = 'rgba(255,255,255,.9)'; X.lineWidth = 2.5; X.beginPath(); X.ellipse(cx, cy + 1.5, rx - 1.5, ry - 1.5, 0, 0.05, Math.PI - 0.05); X.stroke();
  }
  X.restore();
}
function glossArrow(x, y0, y1, w, col) { // vertical arrow pointing down, extruded and matte-shaded (the name is historical)
  const hw = w / 2, hh = w * 1.15, hx = w * 1.05; const d = [Math.max(4, w * 0.14), -Math.max(3, w * 0.1)];
  const shape = (dx, dy) => [[x - hw + dx, y0 + dy], [x + hw + dx, y0 + dy], [x + hw + dx, y1 - hh + dy], [x + hx + dx, y1 - hh + dy], [x + dx, y1 + dy], [x - hx + dx, y1 - hh + dy], [x - hw + dx, y1 - hh + dy]];
  X.save(); X.filter = 'blur(10px)'; poly(shape(14, 18)); X.fillStyle = 'rgba(20,36,58,.18)'; X.fill(); X.restore();
  poly(shape(d[0], d[1])); X.fillStyle = col.lo; X.fill();
  poly(shape(0, 0)); const g = X.createLinearGradient(x - hx, 0, x + hx, 0); g.addColorStop(0, col.lo); g.addColorStop(0.35, col.mid); g.addColorStop(0.5, col.hi); g.addColorStop(0.75, col.mid); g.addColorStop(1, col.lo); X.fillStyle = g; X.fill();
}

function rod(x1, y1, x2, y2, r, o = {}) { // matte implant rod (capsule shape) with drug specks, screen space
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
  X.save(); X.filter = 'blur(10px)'; X.translate((x1 + x2) / 2 + 6, (y1 + y2) / 2 + r * 0.95); X.rotate(a); rr(-L / 2 - r, -r * 0.55, L + 2 * r, r * 1.1, r * 0.55); X.fillStyle = 'rgba(20,36,58,.3)'; X.fill(); X.restore();
  X.save(); X.translate(x1, y1); X.rotate(a);
  rr(-r, -r, L + 2 * r, 2 * r, r); const g = X.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#E7EDF4'); g.addColorStop(0.22, '#FFFFFF'); g.addColorStop(0.5, '#EEF2F7'); g.addColorStop(0.85, '#B9C6D5'); g.addColorStop(1, '#93A4B8'); X.fillStyle = g; X.fill();
  X.save(); X.clip(); const r2 = rng(o.seed || 5); for (let k = 0; k < L / 9; k++) { const u = -r * 0.6 + r2() * (L + r * 1.2), v = (r2() - 0.5) * 1.5 * r; X.globalAlpha = 0.85; speck(u, v, Math.max(2.5, r * 0.15 * (0.6 + r2() * 0.6))); } X.restore();
  X.globalAlpha = 0.4; X.strokeStyle = '#FFFFFF'; X.lineWidth = Math.max(2, r * 0.18); X.lineCap = 'round'; X.beginPath(); X.moveTo(0, -r * 0.48); X.lineTo(L, -r * 0.48); X.stroke();
  X.restore();
}

// porthole: a magnified round window into the tablet
function porthole(cx, cy, r, fn) {
  X.save(); X.shadowColor = 'rgba(20,36,58,.22)'; X.shadowBlur = 60; X.shadowOffsetY = 26; X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(cx, cy, r + 26, 0, TAU); X.fill(); X.restore();
  const rg = X.createLinearGradient(cx - r, cy - r, cx + r, cy + r); rg.addColorStop(0, '#FFFFFF'); rg.addColorStop(0.55, '#E5EBF2'); rg.addColorStop(1, '#AEBCCC'); X.fillStyle = rg; X.beginPath(); X.arc(cx, cy, r + 26, 0, TAU); X.fill();
  const bg2 = X.createLinearGradient(cx - r, cy - r, cx + r, cy + r); bg2.addColorStop(0, '#A9B8C9'); bg2.addColorStop(1, '#FFFFFF'); X.fillStyle = bg2; X.beginPath(); X.arc(cx, cy, r + 7, 0, TAU); X.fill();
  X.save(); X.beginPath(); X.arc(cx, cy, r, 0, TAU); X.clip();
  const ig = X.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 10, cx, cy, r * 1.1); ig.addColorStop(0, '#FFFFFF'); ig.addColorStop(1, '#E3EAF2'); X.fillStyle = ig; X.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  fn();
  const sh = X.createRadialGradient(cx, cy + r * 0.2, r * 0.7, cx, cy + r * 0.1, r * 1.12); sh.addColorStop(0, 'rgba(15,27,45,0)'); sh.addColorStop(1, 'rgba(15,27,45,.26)'); X.fillStyle = sh; X.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  X.globalAlpha = 0.35; const gl = X.createLinearGradient(cx - r, cy - r, cx, cy); gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = gl; X.beginPath(); X.ellipse(cx - r * 0.35, cy - r * 0.5, r * 0.55, r * 0.22, -0.6, 0, TAU); X.fill();
  X.restore();
}
function tangle(seed, cx, cy, rw, rh, n, w, steps = 34, stepLen = 20) {
  const r = rng(seed); const chains = [];
  for (let c = 0; c < n; c++) {
    let x = cx + (r() - 0.5) * rw * 1.2, y = cy + (r() - 0.5) * rh * 1.2, a = r() * TAU, va = 0; const pts = [];
    for (let k = 0; k < steps; k++) {
      pts.push([x, y]); va += (r() - 0.5) * 0.55; va *= 0.86; a += va;
      const dx = (x - cx) / rw, dy = (y - cy) / rh; if (dx * dx + dy * dy > 0.8) { const toC = Math.atan2(cy - y, cx - x); let df = toC - a; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU; a += df * 0.4; }
      x += Math.cos(a) * stepLen; y += Math.sin(a) * stepLen;
    }
    chains.push(spline(pts, 4));
  }
  chains.forEach(ch => { X.save(); X.filter = 'blur(6px)'; X.globalAlpha = 0.16; X.translate(5, 11); pathOpen(ch); X.lineWidth = w; X.strokeStyle = '#1D3046'; X.lineCap = 'round'; X.lineJoin = 'round'; X.stroke(); X.restore(); tube(ch, w, M.chain); });
}
function stack(cx, cy, len, nStems, gap, w, ang) { // one chain folded into parallel stems
  const pts = []; const half = len / 2;
  for (let s = 0; s < nStems; s++) {
    const y = (s - (nStems - 1) / 2) * gap; const dir = s % 2 ? -1 : 1;
    pts.push([-half * dir, y]); pts.push([half * dir, y]);
    if (s < nStems - 1) { for (let k = 1; k < 8; k++) { const t = k / 8 * Math.PI; pts.push([half * dir + Math.sin(t) * gap * 0.5 * dir, y + gap / 2 - Math.cos(t) * gap / 2]); } }
  }
  const c = Math.cos(ang), s = Math.sin(ang); const P = pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  X.save(); X.filter = 'blur(6px)'; X.globalAlpha = 0.2; X.translate(6, 12); pathOpen(P); X.lineWidth = w; X.strokeStyle = '#1D3046'; X.lineJoin = 'round'; X.stroke(); X.restore();
  tube(P, w, M.chain);
}

function dotPath(pts, col, step = 18, r = 4.5) {
  let acc = 0; X.fillStyle = col;
  for (let k = 1; k < pts.length; k++) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; const L = Math.hypot(x1 - x0, y1 - y0); while (acc <= L) { const t = acc / L; X.beginPath(); X.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, 0, TAU); X.fill(); acc += step; } acc -= L; }
}

// ---------- biology and lab objects ----------
function ellSph(x, y, rx, ry, c, o) { X.save(); X.translate(x, y); X.scale(1, ry / rx); gsph(0, 0, rx, c, o); X.restore(); }
// two-part hard capsule; ang in radians; gap opens the cap along the axis
function capsule3d(cx, cy, L, R, ang, o = {}) {
  const gap = o.gap || 0, a = o.alpha ?? 1, j = L * 0.1;
  X.save(); X.globalAlpha = a; X.translate(cx, cy); X.rotate(ang);
  const shell = (x0, x1, r, roundL, roundR, st) => {
    X.beginPath(); if (roundL) { X.moveTo(x0 + r, -r); } else X.moveTo(x0, -r);
    X.lineTo(x1 - (roundR ? r : 0), -r); if (roundR) X.arc(x1 - r, 0, r, -Math.PI / 2, Math.PI / 2); else X.lineTo(x1, r);
    X.lineTo(x0 + (roundL ? r : 0), r); if (roundL) X.arc(x0 + r, 0, r, Math.PI / 2, Math.PI * 1.5); else X.lineTo(x0, -r); X.closePath();
    const g = X.createLinearGradient(0, -r, 0, r); [0, 0.22, 0.5, 0.85, 1].forEach((p, k) => g.addColorStop(p, st[k])); X.fillStyle = g; X.fill();
  };
  const WHITE = ['#DCE4EC', '#FFFFFF', '#EEF2F6', '#B7C4D2', '#97A8BB'], TEAL = ['#41B7A4', '#A6E8DC', '#22A08C', '#0D6F62', '#0A584E'];
  if (gap > 0) { // open body: interior visible at the mouth
    shell(-L / 2, j, R, true, false, WHITE);
    X.beginPath(); X.ellipse(j, 0, R * 0.26, R, 0, 0, TAU); X.fillStyle = '#E9EEF3'; X.fill();
    X.beginPath(); X.ellipse(j, 0, R * 0.2, R * 0.86, 0, 0, TAU); const ig = X.createLinearGradient(0, -R, 0, R); ig.addColorStop(0, '#8FA0B4'); ig.addColorStop(1, '#C9D4DF'); X.fillStyle = ig; X.fill();
    (o.inside || []).forEach(([u, v]) => gsph(j - 4 + u * R * 0.12, v * R * 0.6, R * 0.2, M.pearl));
    const c0 = j + gap, cL = L / 2 + j * 0.6;
    shell(c0, c0 + cL, R * 1.05, false, true, TEAL);
    X.beginPath(); X.ellipse(c0, 0, R * 0.27, R * 1.05, 0, 0, TAU); X.fillStyle = '#0C6A5D'; X.fill();
    X.beginPath(); X.ellipse(c0 + 2, 0, R * 0.2, R * 0.9, 0, 0, TAU); const cg = X.createLinearGradient(0, -R, 0, R); cg.addColorStop(0, '#2E8F80'); cg.addColorStop(1, '#8FD6C9'); X.fillStyle = cg; X.fill();
  } else {
    shell(-L / 2, j, R, true, true, WHITE);
    shell(-j * 0.6, L / 2, R * 1.05, false, true, TEAL);
    X.beginPath(); X.ellipse(-j * 0.6, 0, R * 0.16, R * 1.05, 0, Math.PI / 2, Math.PI * 1.5); X.strokeStyle = 'rgba(255,255,255,.55)'; X.lineWidth = 2.5; X.stroke();
  }
  X.globalAlpha = a * 0.85; X.strokeStyle = '#FFFFFF'; X.lineCap = 'round'; X.lineWidth = R * 0.14; X.beginPath(); X.moveTo(-L / 2 + R * 0.9, -R * 0.5); X.lineTo(j - 8, -R * 0.5); X.stroke();
  const cs = gap > 0 ? j + gap + R * 0.3 : -j * 0.6 + 14, ce = gap > 0 ? j + gap + L / 2 + j * 0.6 - R * 0.9 : L / 2 - R * 0.9;
  X.globalAlpha = a * 0.7; X.beginPath(); X.moveTo(cs, -R * 0.52); X.lineTo(ce, -R * 0.52); X.stroke();
  X.restore();
}
function strandSet(seed, box, n, w, o = {}) {
  const R = rng(seed); const [bx, by, bw, bh] = box;
  for (let i = 0; i < n; i++) {
    let x = bx - 40 + R() * (bw + 80) * (o.fromLeft ? 0.1 : 1), y = by + R() * bh, a = (o.dir ?? 0) + (R() - 0.5) * (o.spread ?? 1.6), va = 0; const pts = [];
    for (let k = 0; k < (o.steps || 40); k++) { pts.push([x, y]); va += (R() - 0.5) * 0.35; va *= 0.85; a += va; x += Math.cos(a) * 26; y += Math.sin(a) * 26;
      if (y < by - 10) a += 0.25; if (y > by + bh + 10) a -= 0.25; }
    tube(spline(pts, 3), w * (0.8 + R() * 0.4), o.pal || M.strand);
  }
}
function mucus(x0, x1, y0, y1, seed, o = {}) {
  X.save(); X.beginPath(); X.moveTo(x0, y1); for (let x = x0; x <= x1; x += 16) X.lineTo(x, y0 + Math.sin(x * 0.011 + seed) * 12 + Math.sin(x * 0.029 + 1) * 6); X.lineTo(x1, y1); X.closePath();
  const g = X.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(160,222,206,${o.a0 ?? 0.38})`); g.addColorStop(1, `rgba(110,196,176,${o.a1 ?? 0.5})`); X.fillStyle = g; X.fill();
  X.save(); X.clip();
  layer(() => strandSet(seed + 1, [x0, y0, x1 - x0, y1 - y0], o.nBack ?? 14, 7), { alpha: 0.35, blur: 3 });
  layer(() => strandSet(seed + 2, [x0, y0, x1 - x0, y1 - y0], o.n ?? 12, o.w ?? 8), { alpha: 0.85 });
  X.restore();
  X.strokeStyle = 'rgba(255,255,255,.75)'; X.lineWidth = 3; X.beginPath(); for (let x = x0; x <= x1; x += 16) { const yy = y0 + Math.sin(x * 0.011 + seed) * 12 + Math.sin(x * 0.029 + 1) * 6; x === x0 ? X.moveTo(x, yy) : X.lineTo(x, yy); } X.stroke();
  X.restore();
}
function cell(x, y, w, h, o = {}) {
  X.save(); rr(x, y, w, h, Math.min(30, w * 0.16));
  const g = X.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, M.cell.lo); g.addColorStop(0.28, M.cell.mid); g.addColorStop(0.45, M.cell.hi); g.addColorStop(0.75, M.cell.mid); g.addColorStop(1, M.cell.lo); X.fillStyle = g; X.fill();
  const v = X.createLinearGradient(0, y, 0, y + h); v.addColorStop(0, 'rgba(255,255,255,.3)'); v.addColorStop(0.5, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(140,50,50,.14)'); X.fillStyle = v; X.fill();
  if (o.nuc !== false) { X.clip(); ellSph(x + w / 2, y + h * (o.nucY ?? 0.72), w * 0.25, Math.min(h * 0.14, w * 0.2), M.nuc); }
  X.restore();
  if (o.mv) { for (let mx = x + 12; mx < x + w - 8; mx += o.mvGap || 14) { if (o.skip && mx > o.skip[0] && mx < o.skip[1]) continue; tube([[mx, y + 6], [mx, y - o.mv]], o.mvW || 9, M.cell); } }
}
function cellRow(x0, x1, y, h, o = {}) {
  const n = o.n || Math.round((x1 - x0) / 130), cw = (x1 - x0) / n;
  X.save(); X.fillStyle = '#E3A89B'; rr(x0 + 4, y + 10, x1 - x0 - 8, h - 10, 20); X.fill(); X.restore();
  const out = []; for (let k = 0; k < n; k++) { const x = x0 + k * cw + 3; cell(x, y, cw - 6, h, { ...o, skip: o.skipCell === k ? o.skip : null }); out.push([x, cw - 6]); } return out;
}
function coat(x, y, r, seed, o = {}) {
  const R = rng(seed); const n = o.n || 44; const back = [], front = [], face = [];
  for (let i = 0; i < n; i++) {
    const a0 = (o.a0 ?? 0) + R() * (o.span ?? TAU), span = 0.5 + R() * 1.2, base = r * (1.03 + R() * 0.16), amp = r * (0.03 + R() * 0.12), wig = 6 + R() * 10, ph = R() * 10;
    const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) { const a = a0 + span * t; const rad = base + Math.sin(t * Math.PI) * amp + Math.sin(t * wig + ph) * r * 0.025; pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]); }
    (R() < 0.55 ? front : back).push(pts);
  }
  for (let i = 0; i < (o.nFace ?? 7); i++) { const a = R() * TAU, d = r * (0.3 + R() * 0.55); const cx2 = x + Math.cos(a) * d, cy2 = y + Math.sin(a) * d; const ta = a + Math.PI / 2 + (R() - 0.5); const L2 = r * (0.4 + R() * 0.4); const pts = []; for (let t = -1; t <= 1.0001; t += 0.1) pts.push([cx2 + Math.cos(ta) * L2 * t + Math.sin(t * 6 + i) * r * 0.04, cy2 + Math.sin(ta) * L2 * t + Math.cos(t * 5 + i) * r * 0.04]); face.push(pts); }
  const w = Math.max(3, r * (o.w ?? 0.05));
  return {
    back: () => layer(() => back.forEach(p => tube(p, w, M.strand)), { alpha: 0.5 }),
    front: () => { layer(() => face.forEach(p => tube(p, w * 0.8, M.strand)), { alpha: 0.22, blur: 1 }); layer(() => front.forEach(p => tube(p, w, M.strand)), { alpha: 0.9 }); },
  };
}
function gel(x, y, r) { const g = X.createRadialGradient(x, y, r * 0.9, x, y, r * 1.32); g.addColorStop(0, 'rgba(150,220,204,.0)'); g.addColorStop(0.3, 'rgba(150,220,204,.32)'); g.addColorStop(1, 'rgba(150,220,204,0)'); X.fillStyle = g; X.beginPath(); X.arc(x, y, r * 1.35, 0, TAU); X.fill(); }
function particle(x, y, r, o = {}) {
  if (o.shadow !== false) cshadow(x + r * 0.1, y + r * (o.shY ?? 1.25), r * 0.85, r * 0.2, 0.22, Math.max(4, r * 0.12));
  let c = null; if (o.coat) { c = coat(x, y, r, o.seed || 3, o.coatO || {}); gel(x, y, r); c.back(); }
  gsph(x, y, r, o.pal || M.pearl);
  if (c) c.front();
}
function minusPill(x, y, s = 1, a = 1) {
  X.save(); X.globalAlpha = a; X.shadowColor = 'rgba(20,36,58,.2)'; X.shadowBlur = 6; X.shadowOffsetY = 3; rr(x - 18 * s, y - 6 * s, 36 * s, 12 * s, 6 * s); const g = X.createLinearGradient(0, y - 6 * s, 0, y + 6 * s); g.addColorStop(0, '#8DB6E6'); g.addColorStop(0.5, '#3F78BF'); g.addColorStop(1, '#2A5794'); X.fillStyle = g; X.fill(); X.restore();
  X.save(); X.globalAlpha = a * 0.8; X.strokeStyle = '#FFFFFF'; X.lineWidth = 2.5 * s; X.lineCap = 'round'; X.beginPath(); X.moveTo(x - 12 * s, y - 2.5 * s); X.lineTo(x + 10 * s, y - 2.5 * s); X.stroke(); X.restore();
}
function enzyme(x, y, s, ang, o = {}) {
  const mouth = o.mouth ?? 0.42;
  cshadow(x + 6, y + s * 1.15, s * 0.8, s * 0.18, 0.18, 8);
  X.save(); X.translate(x, y); X.rotate(ang);
  X.beginPath(); X.arc(0, 0, s, mouth, TAU - mouth); X.lineTo(s * 0.12, 0); X.closePath();
  const g = X.createRadialGradient(-s * 0.35, -s * 0.4, s * 0.05, -s * 0.05, -s * 0.05, s * 1.1); g.addColorStop(0, '#F3F7FD'); g.addColorStop(0.45, '#97AFD2'); g.addColorStop(0.9, '#4D688C'); g.addColorStop(1, '#3E5675'); X.fillStyle = g; X.fill();
  const h = X.createRadialGradient(-s * 0.4, -s * 0.45, 0, -s * 0.4, -s * 0.45, s * 0.4); h.addColorStop(0, 'rgba(255,255,255,.9)'); h.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = h; X.beginPath(); X.arc(-s * 0.4, -s * 0.45, s * 0.4, 0, TAU); X.fill();
  X.restore();
}
function beads(pts, r, pal = M.gold) { if (pts.length > 1) { X.save(); X.strokeStyle = '#B98A2A'; X.lineWidth = r * 0.35; X.lineCap = 'round'; pathOpen(pts); X.stroke(); X.restore(); } pts.forEach(([x, y]) => gsph(x, y, r, pal)); }
function antibody(x, y, s, ang = 0) {
  X.save(); X.translate(x, y); X.rotate(ang);
  const pal = { hi: '#F2F7FF', mid: '#7FA6DA', lo: '#2F5894' };
  tube([[0, s * 0.95], [0, 0]], s * 0.36, pal); tube([[0, 0], [-s * 0.7, -s * 0.75]], s * 0.36, pal); tube([[0, 0], [s * 0.7, -s * 0.75]], s * 0.36, pal);
  gsph(0, 0, s * 0.24, { hi: '#FFFFFF', mid: '#8FB2E0', lo: '#3A649E' });
  X.restore();
}
function glassBall(x, y, r, inner) {
  cshadow(x, y + r * 1.08, r * 0.85, r * 0.17, 0.22, 10);
  X.save(); X.beginPath(); X.arc(x, y, r, 0, TAU); const b = X.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); b.addColorStop(0, 'rgba(255,255,255,.75)'); b.addColorStop(0.75, 'rgba(225,244,240,.55)'); b.addColorStop(1, 'rgba(120,190,175,.6)'); X.fillStyle = b; X.fill(); X.restore();
  inner();
  X.save(); X.beginPath(); X.arc(x, y, r, 0, TAU); X.clip();
  const rim = X.createRadialGradient(x, y, r * 0.72, x, y, r); rim.addColorStop(0, 'rgba(255,255,255,0)'); rim.addColorStop(1, 'rgba(70,150,135,.45)'); X.fillStyle = rim; X.fillRect(x - r, y - r, 2 * r, 2 * r);
  const s = X.createRadialGradient(x - r * 0.38, y - r * 0.45, 0, x - r * 0.38, y - r * 0.45, r * 0.42); s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = s; X.beginPath(); X.ellipse(x - r * 0.38, y - r * 0.45, r * 0.42, r * 0.3, -0.7, 0, TAU); X.fill();
  X.restore();
  X.save(); X.strokeStyle = 'rgba(255,255,255,.9)'; X.lineWidth = 2.5; X.beginPath(); X.arc(x, y, r - 2, Math.PI * 0.15, Math.PI * 0.75); X.stroke(); X.restore();
}
function rbc(x, y, r, rot, tilt = 0.55) {
  X.save(); X.translate(x, y); X.rotate(rot); X.scale(1, tilt);
  const g = X.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, '#B2313A'); g.addColorStop(0.4, '#D24E4F'); g.addColorStop(0.72, '#F08A80'); g.addColorStop(0.9, '#D4554F'); g.addColorStop(1, '#A92C35'); X.fillStyle = g; X.beginPath(); X.arc(0, 0, r, 0, TAU); X.fill();
  X.strokeStyle = 'rgba(255,220,214,.7)'; X.lineWidth = r * 0.1; X.beginPath(); X.arc(0, 0, r * 0.78, Math.PI * 1.05, Math.PI * 1.6); X.stroke();
  X.restore();
}
function villi(x0, x1, base, seed, o = {}) {
  const R = rng(seed); const sp = o.sp || 64;
  for (let x = x0; x <= x1; x += sp) {
    const by = base(x), hgt = (o.h || 190) * (0.8 + R() * 0.35), w = (o.w || 58) * (0.9 + R() * 0.2), lean = (x - 1385) * -0.06;
    const tx = x + lean, ty = by - hgt;
    X.save(); X.beginPath(); X.moveTo(x - w / 2, by + 30); X.bezierCurveTo(x - w / 2, by - hgt * 0.5, tx - w / 2, ty + w * 0.2, tx - w / 2, ty + w / 2); X.arc(tx, ty + w / 2, w / 2, Math.PI, 0); X.bezierCurveTo(tx + w / 2, ty + w * 0.2, x + w / 2, by - hgt * 0.5, x + w / 2, by + 30); X.closePath();
    const g = X.createLinearGradient(x - w / 2, 0, x + w / 2, 0); const c = o.pal || M.cell; g.addColorStop(0, c.lo); g.addColorStop(0.32, c.mid); g.addColorStop(0.48, c.hi); g.addColorStop(0.8, c.mid); g.addColorStop(1, c.lo); X.fillStyle = g; X.fill();
    const v = X.createLinearGradient(0, ty, 0, by); v.addColorStop(0, 'rgba(255,255,255,.25)'); v.addColorStop(1, 'rgba(150,60,60,.18)'); X.fillStyle = v; X.fill(); X.restore();
  }
}
function vessel(x0, x1, yc, rv) {
  cshadow((x0 + x1) / 2, yc + rv + 14, (x1 - x0) * 0.48, 22, 0.2, 18);
  X.save(); X.beginPath(); X.ellipse(x0, yc, rv * 0.3, rv, 0, Math.PI / 2, Math.PI * 1.5, true); X.lineTo(x1, yc - rv); X.ellipse(x1, yc, rv * 0.3, rv, 0, -Math.PI / 2, Math.PI / 2); X.lineTo(x0, yc + rv); X.closePath();
  const g = X.createLinearGradient(0, yc - rv, 0, yc + rv); g.addColorStop(0, '#B8414A'); g.addColorStop(0.45, '#E06D66'); g.addColorStop(1, '#A93841'); X.fillStyle = g; X.fill(); X.restore();
  return {
    front: () => {
      X.save(); X.beginPath(); X.ellipse(x0, yc, rv * 0.3, rv, 0, Math.PI / 2, Math.PI * 1.5, true); X.lineTo(x1, yc - rv); X.ellipse(x1, yc, rv * 0.3, rv, 0, -Math.PI / 2, Math.PI / 2); X.lineTo(x0, yc + rv); X.closePath();
      const f = X.createLinearGradient(0, yc - rv, 0, yc + rv); f.addColorStop(0, 'rgba(255,214,208,.75)'); f.addColorStop(0.18, 'rgba(255,236,232,.25)'); f.addColorStop(0.7, 'rgba(255,236,232,.06)'); f.addColorStop(1, 'rgba(160,50,60,.35)'); X.fillStyle = f; X.fill();
      X.strokeStyle = 'rgba(170,60,70,.6)'; X.lineWidth = 3; X.stroke(); X.restore();
      X.save(); X.globalAlpha = 0.8; X.strokeStyle = '#FFFFFF'; X.lineCap = 'round'; X.lineWidth = 7; X.beginPath(); X.moveTo(x0 + rv * 0.5, yc - rv * 0.7); X.lineTo(x1 - rv * 0.4, yc - rv * 0.7); X.stroke(); X.restore();
      // cut end: wall ring
      X.save(); X.beginPath(); X.ellipse(x0, yc, rv * 0.3, rv, 0, 0, TAU); X.ellipse(x0, yc, rv * 0.22, rv * 0.84, 0, 0, TAU, true); X.fillStyle = '#EE9A92'; X.fill('evenodd'); X.strokeStyle = 'rgba(170,60,70,.5)'; X.lineWidth = 2; X.stroke(); X.restore();
    },
  };
}
function numTag(n, word, x, y, o = {}) { // numbered step tag; o.pal colours the number ball (default M.teal)
  const size = 40, h = size + 30, padX = 16; const m = meas(word, { w: 700, size, f: F.sora, ls: 2 }); const bw = 54 + 14 + m + padX * 2;
  X.save(); X.shadowColor = 'rgba(15,27,45,.16)'; X.shadowBlur = 24; X.shadowOffsetY = 7; rr(x, y - h / 2, bw, h, h / 2); X.fillStyle = 'rgba(255,255,255,.96)'; X.fill(); X.restore();
  gsph(x + 8 + 27, y, 27, o.pal || M.teal, { spec: false }); txt(String(n), x + 35, y + 14, { w: 700, size: 38, f: F.sora, color: '#FFFFFF', align: 'center' });
  txt(word, x + 8 + 54 + 14, y + 14, { w: 700, size, f: F.sora, color: NAVY, ls: 2 });
  return { x, w: bw };
}
// a view of L3D with story-specific helpers added: const L = L3D.extend({ calTray, CAL }); L.gsph and L.calTray both work
function extend(extra) { return Object.assign(Object.create(window.L3D), extra); }
// accent: a PAL name ('amber', 'teal', 'blue') or a custom object { a, t, soft, bg0, bg1, floor } (missing keys from teal)
function setA(p) {
  const next = typeof p === 'object' && p ? { ...PAL.teal, ...p } : PAL[p];
  if (!next) throw new Error(`L3D.setA: unknown accent '${p}' (use ${Object.keys(PAL).filter(k => k !== 'meso' && k !== 'bio').join(', ')} or an object)`);
  A = next;
}
window.L3D = { antibody, backdrop, beads, camera, capsule3d, cell, cellRow, coat, cshadow, cylinder, disc2d, dotPath, ellSph, enzyme, gel, glassBall, glossArrow,
  ground, gsph, headLines, layer, leader, minusPill, mucus, numTag, particle, partition, pathOpen, poly, porthole, rbc, rod, speck, spline, splitBest, stack,
  steelG, strandSet, subLines, tablet, tag, tangle, tube, vessel, villi, wrapLines, extend, setA,
  PAL, M, PILL, NAVY, SLATE, MUTE, INK2, LX, TW, RX, TAU, get A() { return A; } };
})();
