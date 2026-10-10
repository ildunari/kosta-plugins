// 3DLight core: the canvas and the generic 2D helpers every film and l3d.js use.
// Loaded first. These are classic-script globals (not modules), so story code can call them directly.
//
//   C        the film canvas (<canvas id="c">, 1920 x 1080 design space)
//   X        the current 2D context. ALWAYS draw through X and never cache it: withCtx() swaps it to draw offscreen.
//   W, H     1920, 1080
//   F.sora   the one typeface of the style ("Sora Variable" when fonts are embedded, "Sora" from Google Fonts)
//
// Taken unchanged from the booth loop's frames.js (only the helpers the style uses; fit and arrow are kept for stories).
const C = document.getElementById('c');
let X = C.getContext('2d');
const W = 1920, H = 1080;

const F = {
  // "Sora Variable" is the @fontsource family (build.py --fonts local); "Sora" is the Google Fonts family.
  // Characters outside Sora's latin and latin-ext ranges (→ ≈ ×...) fall back to Inter or the system sans.
  sora: '"Sora Variable", Sora, Inter, sans-serif',
};

/* ---------- helpers ---------- */
// seeded random numbers (mulberry32): rng(seed) returns a function giving 0..1. Never use Math.random.
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// set X.font: weight, size (px), family, stretch, letter spacing (px)
function font(w, s, f, st = 'normal', ls = 0) { X.font = `${w} ${s}px ${f}`; X.fontStretch = st; X.letterSpacing = `${ls}px`; }
// draw one line of text; returns its width. o: { w, size, f, color, align, base, st, ls, alpha, glow, glowColor }
function txt(s, x, y, o = {}) {
  const { w = 400, size = 40, f = F.sora, color = '#000', align = 'left', base = 'alphabetic', st = 'normal', ls = 0, alpha = 1, glow = 0, glowColor = color } = o;
  X.save(); font(w, size, f, st, ls); X.fillStyle = color; X.textAlign = align; X.textBaseline = base; X.globalAlpha = alpha;
  if (glow) { X.shadowBlur = glow; X.shadowColor = glowColor; }
  X.fillText(s, x, y); const m = X.measureText(s).width; X.restore(); return m;
}
// width of a line of text with the same options as txt
function meas(s, o = {}) { const { w = 400, size = 40, f = F.sora, st = 'normal', ls = 0 } = o; X.save(); font(w, size, f, st, ls); const m = X.measureText(s).width; X.restore(); return m; }
// largest size (stepping down by 2 from o.size) at which s fits in maxW
function fit(s, maxW, o) { let size = o.size; while (size > 10 && meas(s, { ...o, size }) > maxW) size -= 2; return size; }
// rounded-rectangle path (call X.fill() or X.stroke() after)
function rr(x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, r); }
function line(x1, y1, x2, y2, color, w = 2, dash = null) { X.save(); X.strokeStyle = color; X.lineWidth = w; X.lineCap = 'round'; if (dash) X.setLineDash(dash); X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke(); X.restore(); }
// arrow head with its tip at (x, y), pointing along ang (radians)
function head(x, y, ang, size, color) { X.save(); X.translate(x, y); X.rotate(ang); X.fillStyle = color; X.beginPath(); X.moveTo(0, 0); X.lineTo(-size, -size * 0.55); X.lineTo(-size * 0.78, 0); X.lineTo(-size, size * 0.55); X.closePath(); X.fill(); X.restore(); }
function arrow(x1, y1, x2, y2, color, w = 6, hs = 26, dash = null) { const a = Math.atan2(y2 - y1, x2 - x1); line(x1, y1, x2 - Math.cos(a) * hs * 0.6, y2 - Math.sin(a) * hs * 0.6, color, w, dash); head(x2, y2, a, hs, color); }
// offscreen canvas, and drawing into another context: withCtx(c.getContext('2d'), () => { ...draw with X... })
function off(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function withCtx(ctx, fn) { const prev = X; X = ctx; try { fn(); } finally { X = prev; } }
// mix two hex colours ('A3B2C4' or '#A3B2C4'), t = 0..1 -> 'rgb(r,g,b)'
function mix(a, b, t) { const pa = a.match(/\w\w/g).map(v => parseInt(v, 16)), pb = b.match(/\w\w/g).map(v => parseInt(v, 16)); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`; }
