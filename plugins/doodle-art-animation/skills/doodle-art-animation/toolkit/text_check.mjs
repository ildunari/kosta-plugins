// text_check.mjs — measures the film's on-screen text instead of guessing it from the story code.
// usage: node text_check.mjs film.html [--step 2] [--json text_check.json] [--workers N]
// It wraps the engine's text() in the page (engine.js and the story are untouched), steps through the film one
// drawing at a time, and follows every line of text as it types on, holds and fades. It reports:
//   READ     lines that were not fully on screen for readTime(s) = chars / 12 + 0.8 s, or that fade or get cut before they
//            finish typing (end-card small print under 16 px is listed as INFO; short numbers of 6 characters or fewer are skipped)
//   EDGE     text whose box leaves the 1920x1080 frame
//   OVERLAP  two lines whose boxes overlap (HUD vs HUD is skipped), with the time range
//   SCALE    HUD, tag or overlay text whose size changes (changes during the engine's lean-in/settle around a transition are
//            engine notes and don't count as issues; scene labels that scale are listed as INFO)
// Reading time is checked for overlay and scene text and the plate title/subtitle. Transition frames are skipped, except
// that a line still in place in the first 0.3 s of a transition (a bleed or fade) keeps counting as on screen.
// Text drawn into offscreen layers and single characters are skipped. Boxes are the text itself, not the art behind
// it, so still look at the frames for text over art or cards.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.log('usage: node text_check.mjs film.html [--step 2] [--json out.json] [--workers N]'); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) { console.error(`text_check: --${k} needs a value`); process.exit(2); } return v; };
const file = path.resolve(args[0]), step = Number(opt('step', 2)), jsonOut = opt('json', null);
// pages reading frames at once (default: one per core, at most 4); the frames are then followed in order, as on one page
const cores = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 4, workers = Number(opt('workers', Math.min(4, cores)));
if (!Number.isInteger(workers) || workers < 1) { console.error('text_check: --workers must be a whole number, 1 or more'); process.exit(2); }
if (!Number.isInteger(step) || step < 1) { console.error('text_check: --step must be a whole number of frames, 1 or more'); process.exit(2); }
if (!fs.existsSync(file)) { console.error(`text_check: ${file} not found`); process.exit(2); }

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const openPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 });
  return page;
};
const setup = () => {
  const main = cvs.getContext('2d');
  let role = 'scene';
  const tag = (fn, r) => function (...a) { const k = role; role = r; try { return fn.apply(this, a); } finally { role = k; } };
  for (const n of ['plateHeader', 'stageDial', 'journeyLog', 'frameCounter']) if (typeof window[n] === 'function') window[n] = tag(window[n], 'hud');
  if (typeof window.reticle === 'function') window.reticle = tag(window.reticle, 'reticle');
  STORY.plates.forEach(p => { if (p.overlay) p.overlay = tag(p.overlay, 'overlay'); });
  const orig = window.text;
  window.__tc = [];
  window.text = function (s, x, y, o = {}) {
    const w = orig.apply(this, arguments);
    if (!w || ctx !== main || String(s).length < 2) return w;
    const { kind = 'sans', size = 24, weight = 400, italic = false, align = 'left', ls = 0, alpha = 1, base = 'alphabetic' } = o;
    ctx.save(); setFont(kind, size, weight, italic); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.textBaseline = base;
    const m = ctx.measureText(s); ctx.restore();
    const T = ctx.getTransform(), pts = [[x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent], [x + m.actualBoundingBoxRight, y - m.actualBoundingBoxAscent],
      [x - m.actualBoundingBoxLeft, y + m.actualBoundingBoxDescent], [x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent]].map(([px, py]) => [T.a * px + T.c * py + T.e, T.b * px + T.d * py + T.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    window.__tc.push({ s: String(s), role, font: `${kind} ${size} ${weight}${italic ? 'i' : ''} ${align}`, ax: T.a * x + T.c * y + T.e, ay: T.b * x + T.d * y + T.f,
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], sc: Math.hypot(T.a, T.b), a: ctx.globalAlpha * alpha, tr: !!S.trans });
    return w;
  };
  // Only the text() calls are needed, not the pixels, so the frame's queued drawing is thrown away (reset) instead of
  // drawn: reading a pixel back made Chromium draw every frame, which took two thirds of the time. Something has to
  // empty the queue each frame, or Chromium stalls for seconds every few dozen frames (references/render.md).
  window.__tcFrame = f => { window.__tc = []; renderFrame(f); if (main.reset) main.reset(); else cvs.width = cvs.width;
    return { T: S.T, plate: STORY.plates.findIndex(p => S.T < p.start + p.dur), recs: window.__tc }; };
  return { ...window.__story, plates: STORY.plates.map((p, i, all) => ({ start: p.start, dur: p.dur,
    name: p.header ? `plate ${p.header.num != null ? ROMAN(p.header.num) : i + 1} "${p.header.title}"` : i === 0 ? 'opening' : i === all.length - 1 ? 'end card' : `plate ${i + 1} of ${all.length}` })) };
};
const page = await openPage(), info = await page.evaluate(setup);
console.log(`${info.title}: ${info.frames} frames, sampling every ${step}`);
console.log('transitions at (s):', info.starts.slice(1).map(x => x.t.toFixed(2)).join(','));

const readTime = s => s.length / 12 + 0.8, dt = step / info.fps, digits = /\d/;
const tracks = [], frames = [];
let lastT = 0;
const related = (a, b) => a.startsWith(b) || b.startsWith(a);
// renderFrame(f) depends on f alone, so the frames are read on several pages at once, then followed in film order.
// A page takes about a second to open, so each one gets at least 20 frames. One Drop (660 drawings) on 4 cores:
// 134-148 s with the old one-page pixel read, 47 s with the reset on one page, 17.5 s on 4 pages (same results).
const list = []; for (let f = 0; f < info.frames; f += step) list.push(f);
const pages = [page, ...await Promise.all(Array.from({ length: Math.max(1, Math.min(workers, Math.floor(list.length / 20))) - 1 },
  async () => { const p = await openPage(); await p.evaluate(setup); return p; }))];
const results = new Array(list.length);
let next = 0;
await Promise.all(pages.map(async p => { while (next < list.length) { const k = next++; results[k] = await p.evaluate(f => window.__tcFrame(f), list[k]); } }));
for (const { T, plate, recs } of results) {
  const used = new Set();
  for (const r of recs) {
    // Inside a transition, text only extends a line that is still in place (a bleed or fade), for up to 0.3 s.
    // Everything else inside transitions is judged on the seam sheets, not here.
    const grace = r.tr && T - info.plates[plate].start <= 0.3 + 1e-6;
    if (r.tr && !grace) continue;
    let best = null, bd = 1e9;
    for (const k of tracks) {
      if (used.has(k.id) || k.role !== r.role || k.font !== r.font || T - k.last > 3 * dt + 1e-6) continue;
      const d = Math.hypot(k.ax - r.ax, k.ay - r.ay), lim = r.role === 'scene' || r.role === 'reticle' ? 160 : 40;
      const ok = related(k.cur, r.s) || (digits.test(k.cur) && digits.test(r.s) && d < 6);
      if (ok && d < lim && d < bd) { best = k; bd = d; }
    }
    if (grace) { if (best && r.s === best.cur && r.a >= 0.9 * best.maxA) { used.add(best.id); r.id = best.id; best.last = T; if (r.s.length >= best.final.length) best.lastFull = T; } continue; }
    if (!best) { best = { id: tracks.length, role: r.role, font: r.font, first: T, full: T, lastFull: null, last: T, cur: r.s, final: r.s, plate, scales: [], edge: [], value: false, maxA: 0 }; tracks.push(best); }
    used.add(best.id); r.id = best.id;
    if (!related(best.cur, r.s)) best.value = true;
    if (r.s.length > best.final.length || (best.value && r.s !== best.cur)) { best.final = r.s; best.full = T; }
    best.cur = r.s; best.ax = r.ax; best.ay = r.ay; best.last = T;
    best.maxA = Math.max(best.maxA, r.a);
    if (r.s.length >= best.final.length && r.a >= 0.9 * best.maxA) best.lastFull = T;
    best.scales.push([T, r.sc]);
    const [x0, y0, x1, y1] = r.box;
    if (r.a >= 0.5 && (x0 < -2 || y0 < -2 || x1 > info.width + 2 || y1 > info.height + 2)) best.edge.push(T);
  }
  frames.push({ T, recs: recs.filter(r => r.a >= 0.4 && !r.tr) });
  lastT = T;
}
await browser.close();

const fmt = t => t.toFixed(2);
const label = k => `"${k.final.length > 60 ? k.final.slice(0, 57) + '...' : k.final}" (${k.role}, ${info.plates[k.plate].name})`;
const out = { read: [], readInfo: [], edge: [], overlap: [], scale: [], scaleInfo: [] };
for (const k of tracks) {
  if (/^EXP \d/.test(k.final)) continue;
  const up = (k.lastFull ?? k.first) - k.first + dt, need = readTime(k.final);
  const reads = k.role === 'overlay' || k.role === 'scene' || (k.role === 'hud' && k.font.startsWith('display'));   // HUD rows and tags are furniture
  // cut off: still typing on its last drawing, and it either faded or ended with the plate (a hard cut) or the film
  const pl = info.plates[k.plate], atEdge = k.last >= pl.start + pl.dur - 1.5 * dt || k.last >= lastT - 1e-6;
  const cut = !k.value && k.full >= k.last - 1e-6 && ((k.last - k.first > dt && k.lastFull !== null && k.lastFull < k.full) || atEdge);
  const readout = k.final.length <= 6 && digits.test(k.final);   // short ticking numbers (axis values, percentages) are read at a glance
  const size = +k.font.split(' ')[1], small = k.plate === info.plates.length - 1 && size < 16;   // end-card small print (sources, notes)
  if (reads && !k.value && !readout && k.final.length >= 3 && (cut || up + 1e-6 < need))
    (small ? out.readInfo : out.read).push({ text: k.final, role: k.role, plate: k.plate, from: k.first, up, need, cut });
  if (k.edge.length) out.edge.push({ text: k.final, role: k.role, plate: k.plate, from: k.edge[0], to: k.edge[k.edge.length - 1] });
  if (k.scales.length > 2) {
    const sc = k.scales.map(q => q[1]), v = Math.max(...sc) / Math.min(...sc) - 1, med = [...sc].sort((a, b) => a - b)[sc.length >> 1];
    const off = k.scales.filter(q => Math.abs(q[1] / med - 1) > 0.01).map(q => q[0]);
    if (v > 0.02) (k.role === 'scene' ? out.scaleInfo : out.scale).push({ text: k.final, role: k.role, plate: k.plate, change: v, from: off[0], to: off[off.length - 1] });
  }
}
const pairs = new Map();
for (const { T, recs } of frames) for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) {
  const p = recs[i], q = recs[j];
  if (p.id === q.id || (p.role === 'hud' && q.role === 'hud')) continue;
  const w = Math.min(p.box[2], q.box[2]) - Math.max(p.box[0], q.box[0]), h = Math.min(p.box[3], q.box[3]) - Math.max(p.box[1], q.box[1]);
  if (w <= 0 || h <= 0) continue;
  const small = Math.min((p.box[2] - p.box[0]) * (p.box[3] - p.box[1]), (q.box[2] - q.box[0]) * (q.box[3] - q.box[1]));
  if (w * h < 0.1 * small) continue;
  const key = [p.id, q.id].sort((a, b) => a - b).join('-'), e = pairs.get(key) || { a: tracks[Math.min(p.id, q.id)], b: tracks[Math.max(p.id, q.id)], from: T, to: T };
  e.to = T; pairs.set(key, e);
}
for (const e of pairs.values()) out.overlap.push({ a: e.a.final, b: e.b.final, roles: [e.a.role, e.b.role], plate: e.a.plate, from: e.from, to: e.to });
for (const r of out.overlap) r.plateName = info.plates[r.plate].name;

console.log(`\n${tracks.length} text lines followed across ${frames.length} drawings`);
const readMsg = r => r.cut ? 'CUT OFF while still typing (it fades, or the plate or film ends, before the last characters appear)' : `fully up ${fmt(r.up)} s, needs ${fmt(r.need)} s`;
for (const r of out.read) console.log(`READ    ${fmt(r.from)} s  ${readMsg(r)}  ${label({ final: r.text, role: r.role, plate: r.plate })}`);
for (const r of out.readInfo) console.log(`INFO    ${fmt(r.from)} s  end-card small print ${readMsg(r)}  ${label({ final: r.text, role: r.role, plate: r.plate })}`);
for (const r of out.edge) console.log(`EDGE    ${fmt(r.from)}-${fmt(r.to)} s  ${label({ final: r.text, role: r.role, plate: r.plate })}`);
for (const r of out.overlap) console.log(`OVERLAP ${fmt(r.from)}-${fmt(r.to)} s  "${r.a.slice(0, 40)}" (${r.roles[0]}) x "${r.b.slice(0, 40)}" (${r.roles[1]}), ${r.plateName}`);
const groups = new Map();
for (const r of out.scale) {
  const pl = info.plates[r.plate], end = pl.start + pl.dur;
  r.lean = r.from >= end - 0.5 || r.to <= pl.start + 1.5;   // the engine's lean-in before a zoomy cut, or the settle after one
  const key = `${r.plate}|${fmt(r.from)}|${fmt(r.to)}|${r.lean}`, g = groups.get(key) || { ...r, texts: [] };
  g.texts.push(r.text); g.change = Math.max(g.change, r.change); groups.set(key, g);
}
for (const g of groups.values()) console.log(`SCALE   ${fmt(g.from)}-${fmt(g.to)} s  ${g.role} text changes size ${(g.change * 100).toFixed(1)}%`
  + (g.lean ? ' during the engine lean-in/settle around a transition (engine note)' : ' outside transitions') + `  (${info.plates[g.plate].name}, ${g.texts.length} lines: "${g.texts.slice(0, 3).join('", "')}"${g.texts.length > 3 ? ', ...' : ''})`);
for (const r of out.scaleInfo) console.log(`INFO    scene label scales with the camera ${(r.change * 100).toFixed(1)}%  ${label({ final: r.text, role: r.role, plate: r.plate })}`);
const scaleIssues = [...groups.values()].filter(g => !g.lean).length, leanNotes = groups.size - scaleIssues;
const n = out.read.length + out.edge.length + out.overlap.length + scaleIssues;
console.log(`result: ${n ? 'ISSUES' : 'CLEAN'} (read ${out.read.length}, edge ${out.edge.length}, overlap ${out.overlap.length}, scale ${scaleIssues}; `
  + `engine notes ${leanNotes}, info ${out.readInfo.length + out.scaleInfo.length})`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ plates: info.plates, ...out, scaleGroups: [...groups.values()] }, null, 1));
process.exit(0);
