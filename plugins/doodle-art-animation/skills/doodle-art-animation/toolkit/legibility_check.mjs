// legibility_check.mjs — can the film's text actually be read? Measured on pixels, not on boxes.
// usage: node legibility_check.mjs film.html [--step 0.5] [--json out.json] [--crops DIR] [--from s --to s]
//
// text_check.mjs compares text boxes with each other; it cannot see text printed across line art, or grey type on a
// pink chain. This check looks at the pixels. It wraps the engine's text() in the page (engine.js and the story are
// untouched), and every --step seconds (skipping frames inside transitions, where text is legitimately mid-wipe) it
// renders the frame twice: once as the film shows it, recording every text line drawn on the main canvas, and once
// with all text drawn at alpha 0 and the film grain off, which is the background each line is printed on. For every
// line whose role is not 'decor' it measures:
//   size      the em size on screen, after the camera and every other canvas transform (size x scale)
//   contrast  WCAG contrast of the text colour (blended by its alpha) against the mean luminance under its box
//   busy      edge density of that background: the share of pixels whose grey-level gradient |dx|+|dy| > 40, inside
//             the text box plus a small margin. A card or panel reads 0.00-0.01, plain paper 0.00-0.04; line art,
//             hatching, gauges and chains read 0.07-0.50 (calibration below).
// and reports, grouped per line (the same text in the same plate, role and font; typewriter prefixes and ticking
// numbers fold into their line) with its time span:
//   SMALL   em size below the role's floor: fact 28 px, label 22 px (the default when a call gives no role), hud 18 px
//   CLASH   contrast below 4.5, or busy above 0.06 (text printed over artwork)
// Text on an opaque card has a flat background and passes: that is how legitimate overlap (writing on paper, a card
// over the art) is allowed. Text roles come from text(s, x, y, { role }) (the floors and why are in
// references/style.md); 'decor' (frame counter, figure numbers, the PLATE kicker and similar ornament) is exempt.
// Each finding names the code that drew the line (the nearest two callers of text(), e.g. "journeyLog" or
// "callout < overlay"), and repeats are grouped per plate, role, font and caller.
// A sample counts only when the line is at (or within 10% of) its full opacity and its full size, so lines fading,
// popping or scaling in are not judged mid-move. A line fails when at least two of its steady samples fail (or its
// only one does), so art that brushes past for one sample is not a finding.
// --crops DIR writes a JPEG close-up of every finding at its worst sample (the box plus margin, full resolution, text
// visible) so a reviewer can see it. --json writes every finding and every checked line with its numbers.
// Exit codes: 0 clean; 1 on any SMALL or CLASH; 2 on a setup error (missing file, page error, no playwright).
// Speed: one page, two renders per sample; a 172 s film at --step 0.5 took 26 s (306 frames).
//
// Calibration (v0.15, on "The Slow Squeeze", the v0.13 Cowork film whose review failed all ten plates while
// text_check said CLEAN; --step 0.5; 350 lines, 192 CLASH and 254 SMALL):
//   flagged, as the review found: plate IV callout sub "10,000 lb at about 20 °C, 5 minutes" on the platen (contrast
//   2.01, busy 0.081); the Journey Log labels SITE / MESOPHASE / STATE on the pink chains (contrast 1.66-3.1, busy
//   0.13-0.25); the drug names MELOXICAM / DOLUTEGRAVIR / DEXAMETHASONE on the wood (contrast 1.45-1.47); "chains
//   stacked neat — no room to pass" over the chains (contrast 3.34, busy 0.128); all 13-16 px story and HUD text (SMALL).
//   closest to the busy line: "out in a moment" at 0.067, crossed by two chain strokes in its crop (a real clash).
//   not flagged for busy: card notes and chart legends (busy <= 0.01), plate titles on paper (busy <= 0.04).
//   The fixture tests/doodle-art-animation/fixtures/story_clash.js must exit 1 with CLASH (its hatched line reads
//   contrast 1.57, busy 0.51) and its card line must not be listed.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
  catch { console.error('legibility_check: playwright not found (npm i playwright in the film folder, or npm i -g playwright)'); process.exit(2); } }

const USAGE = 'usage: node legibility_check.mjs film.html [--step 0.5] [--json out.json] [--crops DIR] [--from s --to s]';
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.log(USAGE); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) { console.error(`legibility_check: --${k} needs a value`); process.exit(2); } return v; };
const file = path.resolve(args[0]), step = Number(opt('step', 0.5)), jsonOut = opt('json', null), cropDir = opt('crops', null);
const from = Number(opt('from', 0)), to = opt('to', null) === null ? Infinity : Number(opt('to', null));
if (!(step > 0)) { console.error('legibility_check: --step must be a number of seconds above 0'); process.exit(2); }
if (!(from >= 0) || !(to > from)) { console.error('legibility_check: --from/--to must be seconds with from < to'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`legibility_check: ${file} not found`); process.exit(2); }

// thresholds (see the header): role floors in on-screen px, contrast, edge density
const FLOOR = { fact: 28, label: 22, hud: 18 }, MIN_CR = 4.5, MAX_BUSY = 0.06, GRAD = 40;

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
let pageErrors = 0;
const bail = async (msg) => { console.error(msg); await browser.close(); process.exit(2); };
try {
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { pageErrors++; console.error('PAGE ERROR:', e.message); });
await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'networkidle' });
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 }); }
catch { await bail('legibility_check: the film never became ready (window.__ready); open it in a browser and look at the console'); }

const info = await page.evaluate(({ GRAD }) => {
  const main = cvs.getContext('2d'), orig = window.text;
  const nc = document.createElement('canvas').getContext('2d');
  const rgba = c => { nc.fillStyle = '#000'; nc.fillStyle = c; const s = nc.fillStyle;
    if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)).concat(1);
    const v = s.match(/[\d.]+/g).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; };
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  let hide = false, rec = [];
  // which code drew the line: the nearest two named callers above text() (e.g. "journeyLog", "callout", "overlay")
  const via = () => { const out = [];
    for (const l of (new Error().stack || '').split('\n').slice(3)) { const m = /^\s*at (?:Object\.|window\.|Array\.)?([\w$.]+) \(/.exec(l);
      if (!m || /^(forEach|map|withAlpha|withCamera|parallax|layer|fn|drawPlate|renderFrame|__legibility|eval)$|^UtilityScript/.test(m[1])) continue; out.push(m[1]); if (out.length === 2) break; }
    return out.join(' < ') || 'story'; };
  window.text = function (s, x, y, o = {}) {
    if (hide) { const ga = ctx.globalAlpha; ctx.globalAlpha = 0; try { return orig.apply(this, arguments); } finally { ctx.globalAlpha = ga; } }
    const w = orig.apply(this, arguments);
    const str = String(s ?? '');
    if (!w || ctx !== main || str.trim().length < 2) return w;
    const { kind = 'sans', size = 24, weight = 400, italic = false, color = PAL.ink, align = 'left', ls = 0, alpha = 1, base = 'alphabetic', role = 'label' } = o;
    if (role === 'decor') return w;
    ctx.save(); setFont(kind, size, weight, italic); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.textBaseline = base;
    const m = ctx.measureText(str); ctx.restore();
    const T = ctx.getTransform(), sc = Math.hypot(T.a, T.b);
    const pts = [[x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y - m.actualBoundingBoxAscent],
      [x - m.actualBoundingBoxLeft, y + m.actualBoundingBoxDescent], [x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent]].map(([px, py]) => [T.a * px + T.c * py + T.e, T.b * px + T.d * py + T.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), col = typeof color === 'string' ? rgba(color) : [0, 0, 0, 1];
    rec.push({ s: str, role, via: via(), font: `${kind} ${size} w${weight}${italic ? 'i' : ''}`, em: size * sc, ax: T.a * x + T.c * y + T.e, ay: T.b * x + T.d * y + T.f,
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], a: ctx.globalAlpha * alpha * col[3], col: col.slice(0, 3) });
    return w;
  };
  const plateAt = T => { const i = STORY.plates.findIndex(p => T < p.start + p.dur); return i < 0 ? STORY.plates.length - 1 : i; };
  window.__legibility = f => {
    hide = false; rec = []; renderFrame(f);
    const T = S.T, trans = !!S.trans, plate = plateAt(T), recs = rec; rec = [];
    if (trans || !recs.length) return { T, plate, trans, recs: [] };
    const gr = STORY.grain; STORY.grain = 0; hide = true;
    try { renderFrame(f); } finally { hide = false; STORY.grain = gr; }
    const out = [];
    for (const r of recs) {
      if (r.a < 0.3) continue;
      const hgt = r.box[3] - r.box[1], pad = Math.max(3, Math.round(hgt * 0.12));
      const bx0 = Math.floor(r.box[0] - pad), by0 = Math.floor(r.box[1] - pad), bx1 = Math.ceil(r.box[2] + pad), by1 = Math.ceil(r.box[3] + pad);
      const x0 = Math.max(0, bx0), y0 = Math.max(0, by0), x1 = Math.min(W, bx1), y1 = Math.min(H, by1), w = x1 - x0, h = y1 - y0;
      if (w < 4 || h < 4 || w * h < 0.5 * (bx1 - bx0) * (by1 - by0)) continue;   // mostly off-frame: text_check's EDGE, not ours
      const d = main.getImageData(x0, y0, w, h).data, n = w * h, Y = new Float32Array(n);
      let sl = 0, sr = 0, sg = 0, sb = 0;
      for (let i = 0; i < n; i++) { const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
        Y[i] = 0.299 * R + 0.587 * G + 0.114 * B; sl += lum(R, G, B); sr += R; sg += G; sb += B; }
      let edge = 0, m = 0;
      for (let yy = 1; yy < h; yy++) for (let xx = 1; xx < w; xx++) { const i = yy * w + xx; if (Math.abs(Y[i] - Y[i - 1]) + Math.abs(Y[i] - Y[i - w]) > GRAD) edge++; m++; }
      const bg = [sr / n, sg / n, sb / n], a = Math.min(1, r.a), c = r.col.map((v, k) => v * a + bg[k] * (1 - a));   // the colour actually on screen
      const lt = lum(...c), lb = sl / n, cr = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
      out.push({ s: r.s, role: r.role, via: r.via, font: r.font, em: +r.em.toFixed(1), a: +r.a.toFixed(2), ax: r.ax, ay: r.ay,
        box: r.box.map(Math.round), cr: +cr.toFixed(2), busy: +(edge / Math.max(1, m)).toFixed(3) });
    }
    return { T, plate, trans, recs: out };
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
}, { GRAD });
if (pageErrors) await bail('legibility_check: the page threw while loading; fix the film first');

const t0 = Date.now(), fps = info.fps, dur = info.frames / fps, last = Math.min(dur, to);
console.log(`${info.title}: ${dur.toFixed(1)} s, sampling every ${step} s${from > 0 || to < Infinity ? ` from ${from} to ${last.toFixed(1)} s` : ''}`);
const samples = [];
let skipped = 0;
for (let T = from; T < last - 1e-9; T += step) {
  const f = Math.min(info.frames - 1, Math.round(T * fps));
  const r = await page.evaluate(f => window.__legibility(f), f);
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
      || (q.T > r.T && q.T - r.T <= 3 * step + 1e-6 && Math.hypot(q.ax - r.ax, q.ay - r.ay) < 200)));
    if (longer) continue;   // a partial: judged as the full line
    const key = `${k}|${norm(r.s)}`, L = lines.get(key) || lines.set(key, { plate: r.plate, role: r.role, via: r.via, font: r.font, text: r.s, recs: [] }).get(key);
    L.recs.push(r); if (r.s.length >= L.text.length) L.text = r.s;
  }
}
const fmt = t => t.toFixed(1);
const findings = [], checked = [];
for (const L of lines.values()) {
  // steady = at full opacity and full size: a line popping in, fading or scaling up is judged once it has arrived
  const maxA = Math.max(...L.recs.map(r => r.a)), maxEm = Math.max(...L.recs.map(r => r.em));
  const steady = L.recs.filter(r => r.a >= 0.9 * maxA && r.a >= 0.5 && r.em >= 0.9 * maxEm);
  if (!steady.length) continue;
  const floor = FLOOR[L.role] ?? FLOOR.label;
  const small = steady.filter(r => r.em + 0.05 < floor), clash = steady.filter(r => r.cr < MIN_CR || r.busy > MAX_BUSY);
  const need = Math.min(2, steady.length);
  const row = { plate: L.plate, plateName: info.plates[L.plate].name, role: L.role, via: L.via, font: L.font, text: L.text,
    from: Math.min(...steady.map(r => r.T)), to: Math.max(...steady.map(r => r.T)), samples: steady.length,
    em: Math.min(...steady.map(r => r.em)), cr: Math.min(...steady.map(r => r.cr)), busy: Math.max(...steady.map(r => r.busy)) };
  checked.push(row);
  if (small.length >= need) findings.push({ ...row, kind: 'SMALL', floor, bad: small.length, worst: small.reduce((a, b) => b.em < a.em ? b : a) });
  if (clash.length >= need) {
    const score = r => Math.max(MIN_CR / r.cr, r.busy / MAX_BUSY);   // how far past the line
    const worst = clash.reduce((a, b) => score(b) > score(a) ? b : a);
    findings.push({ ...row, kind: 'CLASH', bad: clash.length, worst, lowContrast: clash.some(r => r.cr < MIN_CR), busyBg: clash.some(r => r.busy > MAX_BUSY),
      score: +score(worst).toFixed(2) });
  }
}
findings.sort((a, b) => a.from - b.from || a.kind.localeCompare(b.kind));
const q = s => `"${s.length > 60 ? s.slice(0, 57) + '...' : s}"`;
for (const x of findings) {
  const span = `${fmt(x.from)}-${fmt(x.to)} s`, where = `${x.plateName}, ${x.role} (${x.via})`;
  if (x.kind === 'SMALL') console.log(`SMALL   ${span}  ${where}  ${q(x.text)}  ${x.worst.em} px on screen, floor ${x.floor} px  (${x.font}, ${x.bad}/${x.samples} samples)`);
  else console.log(`CLASH   ${span}  ${where}  ${q(x.text)}  contrast ${x.worst.cr}${x.worst.cr < MIN_CR ? ` < ${MIN_CR}` : ''}, busy ${x.worst.busy}${x.worst.busy > MAX_BUSY ? ` > ${MAX_BUSY}` : ''}`
    + `  (${x.worst.em} px, worst at ${fmt(x.worst.T)} s, ${x.bad}/${x.samples} samples)`);
}
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
console.log(`result: ${findings.length ? 'ISSUES' : 'CLEAN'} (clash ${nC}, small ${nS}; ${checked.length} lines checked in ${samples.length} frames, `
  + `${skipped} transition frames skipped, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ title: info.title, step, thresholds: { floor: FLOOR, contrast: MIN_CR, busy: MAX_BUSY, gradient: GRAD },
  plates: info.plates, findings: findings.map(({ worst, ...x }) => ({ ...x, worst: { T: worst.T, f: worst.f, em: worst.em, cr: worst.cr, busy: worst.busy, box: worst.box } })), lines: checked }, null, 1));
await browser.close();
process.exit(findings.length ? 1 : 0);
} catch (e) { console.error('legibility_check:', e.message); await browser.close(); process.exit(2); }
