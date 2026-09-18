// cue_check.mjs — lists every sound a film plays and flags a sound design that repeats itself.
// usage: node cue_check.mjs film.html [--json out.json] [--list]
// It wraps the engine's SFX (and BED) functions in the page (engine.js and the story are untouched), runs the film's
// renderAudio() once, and records every call with its time, its type, its options and the layer that asked for it:
//   cue         a plate's cues: [[t, name, opts]]
//   header      the automatic sound under a plate header (pen scratch, or the readout on a plate with no pen)
//   riser       the automatic riser before a seam
//   transition  the automatic TRANS_SFX sound of a seam (counted once, as TRANS:<type>)
//   bed         anything a plate's bed (or the automatic music bed) plays; beds loop by design and are listed apart
// Only the top-level calls count (a whoosh that calls noise and tone is one whoosh). It reports:
//   COUNT    events per type, and the share of the most-used type (a header's three typed lines count as one event)
//   DOMINANT one type is more than MAX_SHARE of all foreground events (cue, header, transition)           -> FAIL
//            (judged from MIN_EVENTS events up: in a short film a couple of cues swing the share)
//   REPEAT   identical repeats: the same type with the same options, where the sound does not vary by itself
//            (the engine's VARIED sounds re-seed on every call unless opts.seed is fixed). FAIL when one sound is
//            repeated identically more than MAX_SAME times, or identical repeats are more than MAX_REPEAT_SHARE of
//            the events
//   SERVES   one type used for events of different kinds: as a cue and also inside a transition (the same thump for
//            a contact and a camera move)                                                                    -> WARN
//   PEN      a scratch cue on a night plate (no pen in that world)                                             -> WARN
// Calibration (v0.15): The Slow Squeeze (the review film, 172 s) has scratch at 34% of 264 events and 131 identical
// repeats (tick x34, pop x28) on its own engine, and still 34% scratch rebuilt on the v0.15 engine: it fails both ways.
// The bundled stories peak at 29% where judged and have no identical repeats.
// Exit 0 when nothing fails, 1 on DOMINANT or REPEAT, 2 on setup errors (no file, no playwright, no SFX in the page).
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);

const MAX_SHARE = 0.30, MIN_EVENTS = 40, MAX_SAME = 5, MAX_REPEAT_SHARE = 0.15;

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.log('usage: node cue_check.mjs film.html [--json out.json] [--list]'); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) { console.error(`cue_check: --${k} needs a value`); process.exit(2); } return v; };
const file = path.resolve(args[0]), jsonOut = opt('json', null), list = args.includes('--list');
if (!fs.existsSync(file)) { console.error(`cue_check: ${file} not found`); process.exit(2); }
let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  try { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
  catch { console.error('cue_check: playwright not found (npm i playwright && npx playwright install chromium)'); process.exit(2); }
}

const browser = await chromium.launch();
let res;
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await page.goto(pathToFileURL(file).href + '?render=1');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 });
  res = await page.evaluate(async () => {
    if (typeof SFX !== 'object' || typeof renderAudio !== 'function') return { error: 'no SFX / renderAudio in the page (not a doodle film?)' };
    if (STORY.silent) return { silent: true, plates: STORY.plates.length };
    const L = [], hasTag = typeof AUDIO === 'object' && 'tag' in AUDIO, varied = typeof VARIED === 'object' ? [...VARIED] : [];
    let depth = 0, role = null, parent = null;
    const plates = STORY.plates.map(p => ({ start: p.start, dur: p.dur, dark: !!p.dark, pen: p.pen, hd: p.header ? p.start + headerDelay(p) : null, title: p.header ? p.header.title : null }));
    const plateAt = t => { let k = 0; plates.forEach((p, i) => { if (t >= p.start - 1e-6) k = i; }); return k; };
    const clean = o => { try { return JSON.stringify(o || {}, (k, v) => typeof v === 'function' ? 'fn' : typeof v === 'number' ? +v.toFixed(4) : v); } catch { return '{}'; } };
    const guess = (k, t) => {                                    // an engine without AUDIO.tag: tell the layers apart by time
      if (k === 'riser') return 'riser';
      if (k === 'scratch') { const p = plates[plateAt(t + 0.36)]; if (p.hd != null && [0, 0.15, 0.7].some(d => Math.abs(t - p.hd - d) < 1e-4)) return 'header'; }
      return 'cue';
    };
    const wrap = (obj, prefix) => { for (const k of Object.keys(obj)) { const f = obj[k]; if (typeof f !== 'function') continue;
      obj[k] = function (ac, out, t, o) {
        const tag = role || (hasTag ? AUDIO.tag : guess(k, t));
        L.push({ k: prefix + k, t: +(+t).toFixed(3), tag, depth, parent, o: clean(o), seeded: !!(o && o.seed != null), plate: plateAt(+t + 1e-6) });
        const pp = parent; if (depth === 0) parent = prefix + k; depth++;
        try { return f.apply(this, arguments); } finally { depth--; parent = pp; } }; } };
    wrap(SFX, ''); if (typeof BED === 'object') wrap(BED, 'BED.');
    for (const k of Object.keys(TRANS_SFX)) { const f = TRANS_SFX[k];
      TRANS_SFX[k] = function (ac, o, t, d, tr) { L.push({ k: 'TRANS:' + k, t: +(+t).toFixed(3), tag: 'transition', depth: 0, parent: null, o: clean({ dur: d, dir: tr && tr.dir }), seeded: false, plate: plateAt(t + 1e-6), trans: true });
        const r0 = role, p0 = parent; role = 'transition'; parent = 'TRANS:' + k; depth++;
        try { return f.apply(this, arguments); } finally { depth--; role = r0; parent = p0; } }; }
    const bedWrap = f => function (ac, out, t0, dur) { const r0 = role; role = 'bed'; try { return f.apply(this, arguments); } finally { role = r0; } };
    STORY.plates.forEach(p => { if (typeof p.bed === 'function') p.bed = bedWrap(p.bed); });
    if (typeof autoBed === 'function') { const ab = autoBed; window.autoBed = p => { const b = ab(p); return b ? bedWrap(b) : b; }; }
    await renderAudio();
    return { L, plates, varied, hasTag, title: STORY.title, total: TOTAL_T };
  });
} catch (e) { console.error('cue_check:', e.message); await browser.close(); process.exit(2); }
await browser.close();
if (res.error) { console.error('cue_check:', res.error); process.exit(2); }
if (res.silent) { console.log(`silent film (${res.plates} plates): no sounds`); console.log('result: PASS'); process.exit(0); }

const { L, plates, varied } = res, V = new Set(varied);
const top = L.filter(e => e.depth === 0);
// a header's kicker, title and subtitle type on as one event: count it once per plate; a seam's riser is part of its
// transition sound (counted as the TRANS: event)
const seenHeader = new Set();
const fg = top.filter(e => e.tag !== 'bed' && e.tag !== 'riser' && !(e.tag === 'header' && (seenHeader.has(e.plate) || !seenHeader.add(e.plate)))), beds = top.filter(e => e.tag === 'bed'), risers = top.filter(e => e.tag === 'riser');
const count = {}, byTag = {};
for (const e of fg) { count[e.k] = (count[e.k] || 0) + 1; (byTag[e.k] ||= {})[e.tag] = (byTag[e.k][e.tag] || 0) + 1; }
const types = Object.entries(count).sort((a, b) => b[1] - a[1]);
const [domType, domN] = types[0] || ['-', 0], share = fg.length ? domN / fg.length : 0;

// identical repeats: same type + same options, for sounds that do not vary on their own (or whose seed is fixed)
const groups = new Map();
for (const e of fg) { if (e.trans || (V.has(e.k) && !e.seeded)) continue;
  const key = e.k + ' ' + e.o; const g = groups.get(key) || { k: e.k, o: e.o, times: [] }; g.times.push(e.t); groups.set(key, g); }
const same = [...groups.values()].filter(g => g.times.length > 1).sort((a, b) => b.times.length - a.times.length);
const repeats = same.reduce((s, g) => s + g.times.length - 1, 0), repShare = fg.length ? repeats / fg.length : 0;
const maxSame = same.length ? same[0].times.length : 0;

// one type serving events of different kinds: a cue sound that also plays inside a transition
const inTrans = {};
for (const e of L) if (e.tag === 'transition' && e.depth > 0 && e.parent) (inTrans[e.k] ||= new Set()).add(e.parent.replace('TRANS:', ''));
const PRIMS = new Set(['tone', 'noise']);                      // building blocks, not events
const serves = Object.keys(inTrans).filter(k => !PRIMS.has(k) && (byTag[k] || {}).cue).map(k => ({ k, transitions: [...inTrans[k]], cues: fg.filter(e => e.k === k && e.tag === 'cue').map(e => e.t) }));
const pen = fg.filter(e => e.k === 'scratch' && e.tag === 'cue' && plates[e.plate].dark);

const fmt = t => t.toFixed(2);
console.log(`${res.title}: ${fg.length} sound events (${beds.length} more inside beds, ${risers.length} risers counted with their seams), ${types.length} types, ${res.total.toFixed(1)} s`
  + (res.hasTag ? '' : '  [older engine: layers told apart by time]'));
if (list) for (const e of top) console.log(`  ${fmt(e.t).padStart(7)} s  plate ${String(e.plate).padEnd(2)} ${e.tag.padEnd(10)} ${e.k.padEnd(16)} ${e.o === '{}' ? '' : e.o.slice(0, 90)}`);
console.log('COUNT   ' + types.map(([k, n]) => `${k} ${n}` + (Object.keys(byTag[k]).length > 1 || byTag[k].cue == null ? ` (${Object.entries(byTag[k]).map(([t, m]) => `${t} ${m}`).join(', ')})` : '')).join(', '));
if (beds.length) { const bc = {}; for (const e of beds) bc[e.k] = (bc[e.k] || 0) + 1;
  console.log('BEDS    ' + Object.entries(bc).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')); }
const failShare = fg.length >= MIN_EVENTS && share > MAX_SHARE;
console.log(`${failShare ? 'FAIL' : 'PASS'}    dominant: ${domType} is ${(share * 100).toFixed(0)}% of events (limit ${MAX_SHARE * 100}%${fg.length < MIN_EVENTS ? `, not judged under ${MIN_EVENTS} events` : ''})`);
const failRep = maxSame > MAX_SAME || repShare > MAX_REPEAT_SHARE;
console.log(`${failRep ? 'FAIL' : 'PASS'}    identical repeats: ${repeats} (${(repShare * 100).toFixed(0)}% of events, limit ${MAX_REPEAT_SHARE * 100}%); most repeated ${maxSame}x (limit ${MAX_SAME})`);
for (const g of same.slice(0, 8)) console.log(`REPEAT  ${g.k} ${g.o === '{}' ? '(default options)' : g.o.slice(0, 70)} x${g.times.length} at ${g.times.slice(0, 8).map(fmt).join(', ')}${g.times.length > 8 ? ', ...' : ''} s`);
for (const s of serves) console.log(`WARN    serves: ${s.k} plays as a cue (${s.cues.slice(0, 6).map(fmt).join(', ')} s) and inside the ${s.transitions.join('/')} transition sound; give the camera move and the on-screen event different sounds`);
if (pen.length) console.log(`WARN    pen: scratch cue on a night plate (no pen there) at ${pen.slice(0, 8).map(e => fmt(e.t)).join(', ')} s`);
const fail = failShare || failRep;
console.log(`result: ${fail ? 'FAIL' : serves.length || pen.length ? 'WARN' : 'PASS'}`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ title: res.title, events: top, counts: count, byTag, dominant: { type: domType, share },
  repeats: { total: repeats, share: repShare, groups: same }, serves, pen, beds: beds.length, limits: { MAX_SHARE, MIN_EVENTS, MAX_SAME, MAX_REPEAT_SHARE } }, null, 1));
process.exit(fail ? 1 : 0);
