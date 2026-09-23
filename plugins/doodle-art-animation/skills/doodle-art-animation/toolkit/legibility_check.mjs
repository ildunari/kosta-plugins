// legibility_check.mjs — can the film's text actually be read? Measured on pixels, not on boxes.
// usage: node legibility_check.mjs film.html [--step 0.5] [--json out.json] [--crops DIR] [--from s --to s] [--workers N]
//
// text_check.mjs compares text boxes with each other; it cannot see text printed across line art, or grey type on a
// pink chain. This check looks at the pixels. It wraps the engine's text() and haloText() in the page (engine.js and
// the story are untouched), and every --step seconds (skipping frames inside transitions, where text is legitimately
// mid-wipe) it renders the frame twice: once as the film shows it, recording every text line drawn on the main canvas,
// and once with only the glyph FILL hidden (text() draws at alpha 0) and the film grain off. Anything the engine draws
// around the letters stays in that second render — haloText()'s stroke, a card, a backing — so it is the frame as the
// viewer sees it minus the letters themselves.
//
// What counts as a line: every text() call on the main canvas, one character or many. Single characters drawn one
// call at a time from the same place in the code, one after another in the same frame, in the same font, colour and
// opacity (textOnPath) are grouped back into the line they spell, and a lone glyph ('A', 'B' on a diagram) is judged
// too.
// For every line whose role is not 'decor' it measures:
//   size      the em size on screen, after the camera and every other canvas transform (size x scale)
//   ring      the line's glyphs alone (same font, transform, letter-spacing) as a mask, dilated by 0.12 em (at least
//             2 px), minus the glyph mask: the band a reader's eye sees right around each letter. Art between two
//             lines or behind a word gap is outside it and does not count.
//             Why 0.12 em: haloText's stroke is 0.25 em wide, so it clears 0.125 em around each letter. A wider ring
//             reaches past the halo and counts the halo's own clean edge against the art as clutter (at 0.15 em and
//             above 18-20 haloed lines on four bundled stories fail at contrast 4.6-12 although they read cleanly).
//             For a haloed line the ring stays 1 px inside the halo's edge (at least 1.5 px wide), so the halo's
//             anti-aliased rim is never counted as clutter.
//   The ring is cut into pieces along the line (half an em each; one per glyph for a line drawn glyph by glyph) and
//   judged by its WORST stretch, not its mean, so half a word on a dark block or one stroke through one word is not
//   averaged away by the clean paper under the rest of the line:
//   contrast  WCAG contrast of the text colour (blended by its alpha against that stretch's own background) against
//             the stretch's mean luminance, over every 2 em stretch; the lowest one counts
//   busy      edge density: the share of ring pixels whose grey-level gradient |dx|+|dy| > 40 (both neighbours in the
//             ring too), over every 2 em stretch; the highest one counts. Paper and cards read 0.00-0.03; a glyph halo
//             reads 0.00-0.06 over any art; line art touching unhaloed letters reads 0.07-0.55 (calibration below).
//   halo busy for haloText lines only: the edge density of a second ring, from the halo's outer edge out to 0.5 em
//             beyond it, over the whole line. A halo knocks the art back from the letters, but a halo inside dense
//             hatching or texture still leaves the word sitting in noise; one stroke passing by does not.
//   colour    the colour the call asked for, blended by its alpha (a line in rgba(..., 0.4) or at alpha 0.42 is judged
//             at that faintness). A gradient or pattern fill has no single colour: it is read off the rendered glyph
//             pixels of the first render instead (the colour on screen, alpha included).
// and reports, grouped per line (the same text in the same plate, role and font; typewriter prefixes and ticking
// numbers fold into their line) with its time span:
//   SMALL   em size below the role's floor: fact 28 px, label 22 px (the default when a call gives no role), hud 18 px
//   CLASH   contrast below 4.5, or busy above 0.06 (text printed over artwork), or halo busy above 0.35 (a haloed line
//           sunk in dense art)
// and warns (exit 0):
//   DECOR   a 'decor' line longer than 24 characters or carrying digits outside the engine's own chrome (frame counter,
//           PLATE kicker, card FIG numbers): long or numeric text is usually information, not ornament. Decor is
//           otherwise exempt, so check each one: is it really something nobody needs to read?
// Text on an opaque card has a flat background and passes: that is how legitimate overlap (writing on paper, a card
// over the art) is allowed. Text roles come from text(s, x, y, { role }) (the floors and why are in
// references/style.md); 'decor' (frame counter, figure numbers, the PLATE kicker and similar ornament) is exempt.
// Each finding names the code that drew the line (the nearest two callers of text(), e.g. "journeyLog" or
// "callout < overlay"), and repeats are grouped per plate, role, font and caller.
// A sample counts only when the line is at (or within 10% of) its own PEAK opacity and full size, so lines fading,
// popping or scaling in are not judged mid-move; a line whose peak is faint is judged at that peak, and fails. A line
// fails when at least two of its steady samples fail (or its only one does), so art that brushes past for one sample
// is not a finding. A line seen in one sample only is judged only if it is at full opacity there (a value changing or
// a word popping in, glimpsed once mid-fade, is not a line anyone was meant to read yet); a glyph that dropText is
// popping in is skipped, since the settled word is judged on its own.
// --crops DIR writes a JPEG close-up of every finding at its worst sample (the box plus margin, full resolution, text
// visible) so a reviewer can see it. --json writes every finding, every checked line and every warning with numbers.
// Exit codes: 0 clean (DECOR warnings allowed); 1 on any SMALL or CLASH; 2 on a setup error (missing file, page error,
// no playwright).
// Speed: one page, two renders per sample; a 172 s film at --step 0.5 takes about 30 s (306 frames).
//
// Calibration (v0.15, --step 0.5):
//   "The Slow Squeeze", v0.13 build (no halos; the film whose review failed all ten plates while text_check said
//   CLEAN): 368 lines, 224 CLASH and 265 SMALL (the first, mean-of-ring version: 350, 190 and 254). Flagged, as the
//   review found: plate IV callout sub "10,000 lb at about 20 °C, 5 minutes" on the platen; the Journey Log labels
//   SITE / MESOPHASE / STATE on the pink chains (worst stretch 1.25-2.6); the drug names MELOXICAM / DOLUTEGRAVIR /
//   DEXAMETHASONE on the wood (1.43-1.47); "chains stacked neat — no room to pass"; all 13-16 px text (SMALL).
//   The reviewer's probe film (tests/doodle-art-animation/fixtures/story_legmiss.js; the first version flagged one of
//   its nine lines): text at rgba 0.40 and at alpha 0.42 on paper (contrast 2.18 and 2.41); a line half on an ink
//   block (worst stretch 1.16 where the whole ring's mean reads 7.28); haloed lines in double crosshatching (halo busy
//   0.53); textOnPath grey on hatching (contrast 1.4, busy 0.53) and lone letters A and B (1.1-1.4, busy 0.55); a pale
//   gradient fill (1.01, read off its pixels). Its decor plate is a DECOR warning.
//   Halo busy on the bundled stories: at most 0.27 (a reticle tag on the water, H₂O·01; PROBE·07 on hatched ground
//   0.25; NP·01 on the red cells 0.24), so the 0.35 line sits between them and the hatching's 0.53. Unhaloed busy on
//   the bundled stories, worst 2 em stretch: 0.061 in one sample (a chart legend), otherwise at most 0.051; the
//   example's "burst" label, crossed by its own curve, reads 0.073 in 9 of 18 samples (the whole-ring
//   mean had it at 0.061 in 1 of 18).
//   Every bundled story*.js exits 0 (story_example.js once its "burst" label is moved off the curve). The fixture
//   tests/doodle-art-animation/fixtures/story_clash.js must exit 1 with CLASH (its hatched line reads contrast 1.42,
//   busy 0.55) and its card line must not be listed.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
  catch { console.error('legibility_check: playwright not found (npm i playwright in the film folder, or npm i -g playwright)'); process.exit(2); } }

const USAGE = 'usage: node legibility_check.mjs film.html [--step 0.5] [--json out.json] [--crops DIR] [--from s --to s] [--workers N]';
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.log(USAGE); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) { console.error(`legibility_check: --${k} needs a value`); process.exit(2); } return v; };
const file = path.resolve(args[0]), step = Number(opt('step', 0.5)), jsonOut = opt('json', null), cropDir = opt('crops', null);
const from = Number(opt('from', 0)), to = opt('to', null) === null ? Infinity : Number(opt('to', null));
// pages measuring frames at once (default: one per core, at most 4); the results are then read in film order
const cores = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 4, workers = Number(opt('workers', Math.min(4, cores)));
if (!Number.isInteger(workers) || workers < 1) { console.error('legibility_check: --workers must be a whole number, 1 or more'); process.exit(2); }
if (!(step > 0)) { console.error('legibility_check: --step must be a number of seconds above 0'); process.exit(2); }
if (!(from >= 0) || !(to > from)) { console.error('legibility_check: --from/--to must be seconds with from < to'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`legibility_check: ${file} not found`); process.exit(2); }

// thresholds (see the header): role floors in on-screen px, contrast, edge density (ring and halo's outer ring),
// the gradient step that counts as an edge, the ring width and the outer ring's reach (em), the stretch sizes (em)
const FLOOR = { fact: 28, label: 22, hud: 18 }, MIN_CR = 4.5, MAX_BUSY = 0.06, MAX_HALO_BUSY = 0.35, GRAD = 40, RING = 0.12;
const OUTER = 0.5, BIN = 0.5, CR_SPAN = 2, BUSY_SPAN = 2, DECOR_LEN = 24;

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
let pageErrors = 0;
const bail = async (msg) => { console.error(msg); await browser.close(); process.exit(2); };
try {
const openPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { pageErrors++; console.error('PAGE ERROR:', e.message); });
  await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'networkidle' });
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 }); }
  catch { await bail('legibility_check: the film never became ready (window.__ready); open it in a browser and look at the console'); }
  return page;
};
const page = await openPage();

const setup = ({ GRAD, RING, OUTER, BIN, CR_SPAN, BUSY_SPAN, DECOR_LEN }) => {
  const main = cvs.getContext('2d'), origText = window.text, origHalo = window.haloText;
  const nc = document.createElement('canvas').getContext('2d');
  const rgba = c => { nc.fillStyle = '#000'; nc.fillStyle = c; const s = nc.fillStyle;
    if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)).concat(1);
    const v = s.match(/[\d.]+/g).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; };
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  let hide = false, rec = [], decor = [], halo = [], last = null;
  // which code drew the line: the nearest two named callers above text() (e.g. "journeyLog", "callout", "overlay"),
  // and the exact call site (file:line:col of the nearest three frames) that groups glyph-by-glyph calls
  const SKIP = /^(forEach|map|withAlpha|withCamera|parallax|layer|fn|drawPlate|renderFrame|__legibility|eval|__lgText|__lgHalo)$|^UtilityScript/;
  const caller = () => { const out = [], site = [];
    for (const l of (new Error().stack || '').split('\n').slice(3)) {
      if (site.length < 3 && !/__lg(Text|Halo)/.test(l)) site.push(l.trim());
      const m = /^\s*at (?:Object\.|window\.|Array\.)?([\w$.]+) \(/.exec(l);
      if (!m || SKIP.test(m[1])) continue; if (out.length < 2) out.push(m[1]); if (out.length === 2 && site.length === 3) break; }
    return { via: out.join(' < ') || 'story', site: site.join('|') }; };
  // haloText: note the halo's width while its own text() call runs (the wrapper below reads it)
  window.haloText = function __lgHalo(s, x, y, o = {}) {
    const on = !!s && o.halo !== false && (o.alpha ?? 1) > 0;
    halo.push(on ? (o.haloWidth ?? 0.25) : 0); try { return origHalo.apply(this, arguments); } finally { halo.pop(); } };
  const alphaOf = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha').get;
  window.text = function __lgText(s, x, y, o = {}) {
    if (hide) { const ga = ctx.globalAlpha; ctx.globalAlpha = 0; try { return origText.apply(this, arguments); } finally { ctx.globalAlpha = ga; } }
    const w = origText.apply(this, arguments);
    const str = String(s ?? '');
    if (!w || ctx !== main || !str.trim()) {
      // a space inside a glyph-by-glyph line keeps the line going (textOnPath draws its spaces too)
      if (!(last && ctx === main && str && !str.trim())) last = null; else last.s += str;
      return w; }
    const { kind = 'sans', size = 24, weight = 400, italic = false, color = PAL.ink, align = 'left', ls = 0, alpha = 1, base = 'alphabetic', role = 'label' } = o;
    const { via, site } = caller();
    // dropText pops a word in glyph by glyph (scaling and fading each one in): the settled word is its own call and is
    // judged; a glyph mid-pop is not a line
    if (str.trim().length === 1 && /\bdropText\b/.test(via)) { last = null; return w; }
    if (role === 'decor') { last = null;
      if ((str.length > DECOR_LEN || (str.trim().length > 1 && /\d/.test(str))) && !/frameCounter|plateHeader|^card\b/.test(via) && !/^\s*FIG\b/.test(str)) decor.push({ s: str, via, size });
      return w; }
    ctx.save(); setFont(kind, size, weight, italic); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.textBaseline = base;
    const m = ctx.measureText(str); ctx.restore();
    const T = ctx.getTransform(), sc = Math.hypot(T.a, T.b), M = [T.a, T.b, T.c, T.d, T.e, T.f];
    const L = x - m.actualBoundingBoxLeft, R = x + m.actualBoundingBoxRight, U = y - m.actualBoundingBoxAscent, D = y + m.actualBoundingBoxDescent;
    const pts = [[L, U], [R, U], [L, D], [R, D]].map(([px, py]) => [T.a * px + T.c * py + T.e, T.b * px + T.d * py + T.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const col = typeof color === 'string' ? rgba(color) : null, a = alphaOf.call(ctx) * alpha * (col ? col[3] : 1);   // the real alpha, not a plate's relative view (engine relAlpha)
    const hw = halo.length ? halo[halo.length - 1] : 0, font = `${kind} ${size} w${weight}${italic ? 'i' : ''}`;
    const part = { s: str, x, y, M, L, R, size, draw: { font: `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT[kind]}`, ls, align, base },
      c: [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] };
    // one glyph right after another from the same call site, same look: the same line, drawn a glyph at a time
    if (str.trim().length === 1 && last && last.site === site && last.role === role && last.font === font && last.hw === hw
      && Math.abs(last.a - a) < 0.02 && String(last.col) === String(col && col.slice(0, 3))) {
      last.s += str; last.parts.push(part); last.em = Math.max(last.em, size * sc);
      last.box = [Math.min(last.box[0], box[0]), Math.min(last.box[1], box[1]), Math.max(last.box[2], box[2]), Math.max(last.box[3], box[3])];
      return w; }
    const r = { s: str, parts: [part], role, via, site, font, em: size * sc, ax: T.a * x + T.c * y + T.e, ay: T.b * x + T.d * y + T.f,
      box, a, col: col && col.slice(0, 3), hw };
    rec.push(r); last = str.trim().length === 1 ? r : null;
    return w;
  };
  const plateAt = T => { const i = STORY.plates.findIndex(p => T < p.start + p.dur); return i < 0 ? STORY.plates.length - 1 : i; };
  // mask(r, x0, y0, w, h, grow): the line's glyphs alone (same font, transform, letter-spacing) drawn into a w x h
  // screen-pixel window at (x0, y0), as coverage 0-255; grow > 0 also strokes them with a round join 2*grow px wide
  // (a dilation by grow px)
  const MC = document.createElement('canvas'), mg = MC.getContext('2d', { willReadFrequently: true });
  const mask = (r, x0, y0, w, h, grow) => {
    if (MC.width < w || MC.height < h) { MC.width = Math.max(MC.width, w); MC.height = Math.max(MC.height, h); }
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalAlpha = 1; mg.clearRect(0, 0, w, h);
    for (const p of r.parts) {
      const [a, b, c, d, e, f] = p.M, sc = Math.hypot(a, b) || 1;
      mg.setTransform(a, b, c, d, e - x0, f - y0); mg.font = p.draw.font; mg.letterSpacing = p.draw.ls + 'px'; mg.textAlign = p.draw.align; mg.textBaseline = p.draw.base;
      mg.fillStyle = '#fff'; mg.fillText(p.s, p.x, p.y);
      if (grow > 0) { mg.strokeStyle = '#fff'; mg.lineWidth = 2 * grow / sc; mg.lineJoin = 'round'; mg.lineCap = 'round'; mg.strokeText(p.s, p.x, p.y); }
    }
    const px = mg.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = px[i * 4 + 3];
    return out;
  };
  // which stretch of the line a screen pixel belongs to: half-em bins along the baseline of a one-call line; for a
  // line drawn glyph by glyph, the nearest glyph (in drawing order)
  const binner = r => {
    if (r.parts.length === 1) {
      const p = r.parts[0], [a, b, c, d, e, f] = p.M, det = a * d - b * c || 1, bw = BIN * p.size, nb = Math.max(1, Math.ceil((p.R - p.L) / bw));
      return { nb, per: 1 / BIN, of: (sx, sy) => { const lx = (d * (sx - e) - c * (sy - f)) / det; return Math.max(0, Math.min(nb - 1, Math.floor((lx - p.L) / bw))); } };
    }
    const cs = r.parts.map(p => p.c), ems = r.parts.map(p => Math.max(0.3, (p.R - p.L) / p.size)), mean = ems.reduce((s, v) => s + v, 0) / ems.length;
    return { nb: cs.length, per: 1 / mean, of: (sx, sy) => { let k = 0, best = Infinity;
      for (let i = 0; i < cs.length; i++) { const dd = (cs[i][0] - sx) ** 2 + (cs[i][1] - sy) ** 2; if (dd < best) { best = dd; k = i; } } return k; } };
  };
  // the worst window of `span` em over per-bin sums: windows below 35% of the median window's pixel count (a line's
  // ragged ends) are not judged on their own
  const windows = (bins, k) => { const out = [];
    for (let i = 0; i + k <= Math.max(k, bins.length); i++) { const w = { m: 0, sl: 0, sr: 0, sg: 0, sb: 0, edge: 0 };
      for (let j = i; j < Math.min(bins.length, i + k); j++) for (const q in w) w[q] += bins[j][q];
      out.push(w); if (i + k >= bins.length) break; }
    const ms = out.map(w => w.m).sort((a, b) => a - b), med = ms[ms.length >> 1] || 0;
    return out.filter(w => w.m >= Math.max(8, 0.35 * med)); };
  window.__legibility = f => {
    hide = false; rec = []; decor = []; last = null; renderFrame(f);
    const T = S.T, trans = !!S.trans, plate = plateAt(T), recs = rec, dec = decor; rec = []; decor = []; last = null;
    if (trans || !recs.length) return { T, plate, trans, recs: [], decor: trans ? [] : dec };
    // a gradient or pattern fill: its colour is read off the glyphs as rendered, so keep this render's pixels
    const vis = recs.some(r => !r.col) ? main.getImageData(0, 0, W, H).data : null;
    const gr = STORY.grain; STORY.grain = 0; hide = true;
    try { renderFrame(f); } finally { hide = false; STORY.grain = gr; last = null; }
    const out = [];
    for (const r of recs) {
      // the ring: the glyphs dilated by RING em (at least 2 px), minus the glyphs themselves, in screen pixels; for a
      // haloed line also the outer ring, from the halo's edge (hw/2 em) to OUTER em beyond it
      const dil = r.hw ? Math.max(1.5, Math.min(RING * r.em, (r.hw / 2) * r.em - 1)) : Math.max(2, RING * r.em), hin = r.hw ? Math.max(dil, (r.hw / 2) * r.em + 1) : 0, hout = r.hw ? hin + OUTER * r.em : 0;
      const pad = Math.ceil(Math.max(dil, hout)) + 2;
      const bx0 = Math.floor(r.box[0] - pad), by0 = Math.floor(r.box[1] - pad), bx1 = Math.ceil(r.box[2] + pad), by1 = Math.ceil(r.box[3] + pad);
      const x0 = Math.max(0, bx0), y0 = Math.max(0, by0), x1 = Math.min(W, bx1), y1 = Math.min(H, by1), w = x1 - x0, h = y1 - y0;
      if (w < 4 || h < 4 || w * h < 0.5 * (bx1 - bx0) * (by1 - by0)) continue;   // mostly off-frame: text_check's EDGE, not ours
      const glyph = mask(r, x0, y0, w, h, 0), grown = mask(r, x0, y0, w, h, dil);
      const hi = r.hw ? mask(r, x0, y0, w, h, hin) : null, ho = r.hw ? mask(r, x0, y0, w, h, hout) : null;
      const d = main.getImageData(x0, y0, w, h).data, n = w * h, Y = new Float32Array(n);
      for (let i = 0; i < n; i++) Y[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      const B = binner(r), bins = Array.from({ length: B.nb }, () => ({ m: 0, sl: 0, sr: 0, sg: 0, sb: 0, edge: 0 }));
      const In = (M, i) => M[i] > 127;
      let om = 0, oedge = 0;
      for (let yy = 1; yy < h; yy++) for (let xx = 1; xx < w; xx++) { const i = yy * w + xx;
        const edge = () => Math.abs(Y[i] - Y[i - 1]) + Math.abs(Y[i] - Y[i - w]) > GRAD;
        if (In(grown, i) && !In(glyph, i)) {
          const bn = bins[B.of(x0 + xx + 0.5, y0 + yy + 0.5)], R = d[i * 4], G = d[i * 4 + 1], Bl = d[i * 4 + 2];
          bn.sl += lum(R, G, Bl); bn.sr += R; bn.sg += G; bn.sb += Bl; bn.m++;
          if (In(grown, i - 1) && In(grown, i - w) && edge()) bn.edge++; }   // both neighbours inside the ring too
        if (ho && In(ho, i) && !In(hi, i)) { om++; if (In(ho, i - 1) && In(ho, i - w) && !In(hi, i - 1) && !In(hi, i - w) && edge()) oedge++; }
      }
      const m = bins.reduce((s, b) => s + b.m, 0);
      if (m < 8) continue;
      // the text colour: as asked (then blended by alpha), or read off the core of the rendered glyphs
      let col = r.col, a = Math.min(1, r.a), sampled = false;
      if (!col && vis) { let n1 = 0, s = [0, 0, 0];
        for (const thr of [250, 128]) { n1 = 0; s = [0, 0, 0];
          for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { if (glyph[yy * w + xx] < thr) continue; const j = ((y0 + yy) * W + x0 + xx) * 4; s[0] += vis[j]; s[1] += vis[j + 1]; s[2] += vis[j + 2]; n1++; }
          if (n1 >= 6) break; }
        if (n1) { col = s.map(v => v / n1); a = 1; sampled = true; } }
      if (!col) col = [0, 0, 0];
      const crOf = w => { const bg = [w.sr / w.m, w.sg / w.m, w.sb / w.m], c = col.map((v, k) => v * a + bg[k] * (1 - a));   // the colour actually on screen
        const lt = lum(...c), lb = w.sl / w.m; return (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); };
      const all = bins.reduce((s, b) => { for (const q in s) s[q] += b[q]; return s; }, { m: 0, sl: 0, sr: 0, sg: 0, sb: 0, edge: 0 });
      const kc = Math.max(1, Math.round(CR_SPAN * B.per)), kb = Math.max(1, Math.round(BUSY_SPAN * B.per));
      const wc = windows(bins, kc), wb = windows(bins, kb);
      const cr = Math.min(crOf(all), ...wc.map(crOf)), busy = Math.max(all.edge / all.m, ...wb.map(w => w.edge / w.m));
      out.push({ s: r.s, role: r.role, via: r.via, font: r.font, em: +r.em.toFixed(1), a: +r.a.toFixed(2), ax: r.ax, ay: r.ay,
        box: r.box.map(Math.round), cr: +cr.toFixed(2), crMean: +crOf(all).toFixed(2), busy: +busy.toFixed(3), busyMean: +(all.edge / all.m).toFixed(3),
        halo: r.hw ? +(om ? oedge / om : 0).toFixed(3) : null, sampled, glyphs: r.parts.length > 1 ? r.parts.length : undefined });
    }
    return { T, plate, trans, recs: out, decor: dec };
  };
  window.__legibilityCrop = (f, box, q = 0.92) => {
    renderFrame(f);
    const c = document.createElement('canvas'), mg = Math.max(40, Math.round((box[3] - box[1]) * 1.2));
    const x0 = Math.max(0, box[0] - mg), y0 = Math.max(0, box[1] - mg), x1 = Math.min(W, box[2] + mg), y1 = Math.min(H, box[3] + mg);
    c.width = x1 - x0; c.height = y1 - y0; c.getContext('2d').drawImage(cvs, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q).split(',')[1];
  };
  return { ...window.__story, plates: STORY.plates.map((p, i, all) => ({ start: p.start, dur: p.dur,
    name: p.header ? `plate ${p.header.num != null ? ROMAN(p.header.num) || p.header.num : i + 1} "${p.header.title}"` : i === 0 ? 'opening' : i === all.length - 1 ? 'end card' : `plate ${i + 1} of ${all.length}` })) };
};
const SETUP_ARGS = { GRAD, RING, OUTER, BIN, CR_SPAN, BUSY_SPAN, DECOR_LEN }, info = await page.evaluate(setup, SETUP_ARGS);
if (pageErrors) await bail('legibility_check: the page threw while loading; fix the film first');

const t0 = Date.now(), fps = info.fps, dur = info.frames / fps, last = Math.min(dur, to);
console.log(`${info.title}: ${dur.toFixed(1)} s, sampling every ${step} s${from > 0 || to < Infinity ? ` from ${from} to ${last.toFixed(1)} s` : ''}`);
const samples = [], decorSeen = new Map();
let skipped = 0;
// renderFrame(f) depends on f alone, so the frames are measured on several pages at once and read back in film order.
// Each page gets at least 10 frames (a page takes about a second to open). One Drop (110 frames) on 4 cores: 45 s -> 16 s (same results).
const Ts = []; for (let T = from; T < last - 1e-9; T += step) Ts.push(T);
const pages = [page, ...await Promise.all(Array.from({ length: Math.max(1, Math.min(workers, Math.floor(Ts.length / 10))) - 1 },
  async () => { const p = await openPage(); await p.evaluate(setup, SETUP_ARGS); return p; }))];
const measured = new Array(Ts.length);
let next = 0;
await Promise.all(pages.map(async p => { while (next < Ts.length) { const k = next++, f = Math.min(info.frames - 1, Math.round(Ts[k] * fps));
  measured[k] = { f, r: await p.evaluate(f => window.__legibility(f), f) }; } }));
for (const { f, r } of measured) {
  for (const x of r.decor) { const k = `${r.plate}|${x.via}|${x.s.replace(/\d/g, '#')}`;
    const D = decorSeen.get(k) || decorSeen.set(k, { plate: r.plate, via: x.via, text: x.s, size: x.size, from: r.T, to: r.T }).get(k);
    D.to = r.T; if (x.s.length > D.text.length) D.text = x.s; }
  if (r.trans) { skipped++; continue; }
  for (const x of r.recs) x.f = f;
  samples.push(r);
}
if (pageErrors) await bail('legibility_check: the page threw while rendering; fix the film first');

// group into lines: same plate, role and font; digits folded (a ticking number is one line); a typewriter prefix at the
// same anchor folds into the full line it grows into
const norm = s => s.replace(/\d/g, '#');
const byPlate = new Map();
for (const smp of samples) for (const r of smp.recs) { r.T = smp.T; r.plate = smp.plate;
  const k = `${r.plate}|${r.role}|${r.font}|${r.via}`; (byPlate.get(k) || byPlate.set(k, []).get(k)).push(r); }
const lines = new Map();
for (const [k, recs] of byPlate) {
  for (const r of recs) {
    // (in place, or a moment later and nearby: a callout typing on while it follows the hero)
    const longer = recs.find(q => q.s.length > r.s.length && q.s.startsWith(r.s) && q.T >= r.T && (Math.hypot(q.ax - r.ax, q.ay - r.ay) < 12
      || (q.T > r.T && q.T - r.T <= 3 * step + 1e-6 && Math.hypot(q.ax - r.ax, q.ay - r.ay) < 200
          // ...unless the short text is still on screen at that later moment: then it is a label of its own ('1' beside '10')
          && !recs.some(z => z.T === q.T && z.s === r.s))));
    if (longer) continue;   // a partial: judged as the full line
    const key = `${k}|${norm(r.s)}`, L = lines.get(key) || lines.set(key, { plate: r.plate, role: r.role, via: r.via, font: r.font, text: r.s, recs: [] }).get(key);
    L.recs.push(r); if (r.s.length >= L.text.length) L.text = r.s;
  }
}
const fmt = t => t.toFixed(1);
const findings = [], checked = [];
for (const L of lines.values()) {
  // steady = at (or near) the line's own peak opacity and full size: a line popping in, fading or scaling up is judged
  // once it has arrived; a line whose peak is faint is judged at that faint peak
  const maxA = Math.max(...L.recs.map(r => r.a)), maxEm = Math.max(...L.recs.map(r => r.em));
  const steady = L.recs.filter(r => r.a >= 0.9 * maxA && r.em >= 0.9 * maxEm);
  if (!steady.length) continue;
  const floor = FLOOR[L.role] ?? FLOOR.label;
  const bad = r => r.cr < MIN_CR || r.busy > MAX_BUSY || (r.halo !== null && r.halo > MAX_HALO_BUSY);
  const small = steady.filter(r => r.em + 0.05 < floor), clash = steady.filter(bad);
  // a line seen in one sample only is judged there only at full opacity: a faint line glimpsed once is mid-fade (a
  // value changing, a word popping in); a faint line that holds for two samples or more is judged at its faint peak
  if (steady.length === 1 && maxA < 0.9) continue;
  const need = Math.min(2, steady.length);
  const row = { plate: L.plate, plateName: info.plates[L.plate].name, role: L.role, via: L.via, font: L.font, text: L.text,
    from: Math.min(...steady.map(r => r.T)), to: Math.max(...steady.map(r => r.T)), samples: steady.length, alpha: +maxA.toFixed(2),
    em: Math.min(...steady.map(r => r.em)), cr: Math.min(...steady.map(r => r.cr)), busy: Math.max(...steady.map(r => r.busy)),
    halo: steady[0].halo === null ? null : Math.max(...steady.map(r => r.halo)), sampled: steady.some(r => r.sampled) };
  checked.push(row);
  if (small.length >= need) findings.push({ ...row, kind: 'SMALL', floor, bad: small.length, worst: small.reduce((a, b) => b.em < a.em ? b : a) });
  if (clash.length >= need) {
    const score = r => Math.max(MIN_CR / r.cr, r.busy / MAX_BUSY, r.halo === null ? 0 : r.halo / MAX_HALO_BUSY);   // how far past the line
    const worst = clash.reduce((a, b) => score(b) > score(a) ? b : a);
    findings.push({ ...row, kind: 'CLASH', bad: clash.length, worst, lowContrast: clash.some(r => r.cr < MIN_CR), busyBg: clash.some(r => r.busy > MAX_BUSY),
      busyHalo: clash.some(r => r.halo !== null && r.halo > MAX_HALO_BUSY), score: +score(worst).toFixed(2) });
  }
}
findings.sort((a, b) => a.from - b.from || a.kind.localeCompare(b.kind));
const q = s => `"${s.length > 60 ? s.slice(0, 57) + '...' : s}"`;
for (const x of findings) {
  const span = `${fmt(x.from)}-${fmt(x.to)} s`, where = `${x.plateName}, ${x.role} (${x.via})`, w = x.worst;
  if (x.kind === 'SMALL') console.log(`SMALL   ${span}  ${where}  ${q(x.text)}  ${w.em} px on screen, floor ${x.floor} px  (${x.font}, ${x.bad}/${x.samples} samples)`);
  else console.log(`CLASH   ${span}  ${where}  ${q(x.text)}  contrast ${w.cr}${w.cr < MIN_CR ? ` < ${MIN_CR}` : ''}${w.crMean !== w.cr ? ` (mean ${w.crMean})` : ''}`
    + `, busy ${w.busy}${w.busy > MAX_BUSY ? ` > ${MAX_BUSY}` : ''}${w.halo !== null ? `, halo busy ${w.halo}${w.halo > MAX_HALO_BUSY ? ` > ${MAX_HALO_BUSY}` : ''}` : ''}`
    + `${w.a < 0.9 ? `, alpha ${w.a}` : ''}${w.sampled ? ', colour read off the pixels (gradient or pattern fill)' : ''}`
    + `  (${w.em} px, worst at ${fmt(w.T)} s, ${x.bad}/${x.samples} samples)`);
}
// one warning per plate and caller, with a few of its lines
const wmap = new Map();
for (const D of decorSeen.values()) { const k = `${D.plate}|${D.via}`;
  const G = wmap.get(k) || wmap.set(k, { plate: D.plate, plateName: info.plates[D.plate].name, via: D.via, from: D.from, to: D.to, size: D.size, texts: [] }).get(k);
  G.from = Math.min(G.from, D.from); G.to = Math.max(G.to, D.to); G.size = Math.max(G.size, D.size); G.texts.push(D.text); }
const warns = [...wmap.values()];
for (const G of warns) console.log(`DECOR   ${fmt(G.from)}-${fmt(G.to)} s  ${G.plateName}, decor (${G.via})  ${G.texts.slice(0, 3).map(q).join(', ')}${G.texts.length > 3 ? ` and ${G.texts.length - 3} more` : ''}`
  + `  (up to ${G.size} px): long or numeric 'decor' text usually carries information; if anyone needs to read it, give it a real role  (warning)`);
if (cropDir && findings.length) {
  fs.mkdirSync(path.resolve(cropDir), { recursive: true });
  let i = 0;
  for (const x of findings) {
    const slug = x.text.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'text';
    const name = `${String(++i).padStart(3, '0')}_${x.kind}_${fmt(x.worst.T)}s_${slug}.jpg`;
    fs.writeFileSync(path.join(path.resolve(cropDir), name), Buffer.from(await page.evaluate(([f, b]) => window.__legibilityCrop(f, b), [x.worst.f, x.worst.box]), 'base64'));
    x.crop = path.join(cropDir, name);
  }
  console.log(`crops: ${findings.length} close-ups in ${cropDir}`);
}
const nS = findings.filter(x => x.kind === 'SMALL').length, nC = findings.length - nS;
console.log(`result: ${findings.length ? 'ISSUES' : 'CLEAN'} (clash ${nC}, small ${nS}; decor warnings ${warns.length}; ${checked.length} lines checked in ${samples.length} frames, `
  + `${skipped} transition frames skipped, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ title: info.title, step,
  thresholds: { floor: FLOOR, contrast: MIN_CR, busy: MAX_BUSY, haloBusy: MAX_HALO_BUSY, gradient: GRAD, ring: RING, outer: OUTER },
  plates: info.plates, findings: findings.map(({ worst, ...x }) => ({ ...x, worst: { T: worst.T, f: worst.f, em: worst.em, a: worst.a, cr: worst.cr, crMean: worst.crMean,
    busy: worst.busy, busyMean: worst.busyMean, halo: worst.halo, box: worst.box } })), lines: checked, warnings: warns }, null, 1));
await browser.close();
process.exit(findings.length ? 1 : 0);
} catch (e) { console.error('legibility_check:', e.message); await browser.close(); process.exit(2); }
