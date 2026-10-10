// story_check.mjs — does the story keep its own facts straight? The Journey Log, headers, stage dial and hero ID, read
// from the built film, plate by plate.
// usage: node story_check.mjs film.html [--json out.json]
//
// It loads the film (nothing is rendered), and for each plate reads `header`, `stage`, the hero's `hero(t)` label and
// the Journey Log, sampling `log(t)` and `hero(t)` every 0.25 s across the plate ({ title, rows: [[label, value], ...],
// states, state }). It fails on:
//   TIME    elapsed time runs backwards, inside a plate or from one plate to the next. Each clock row is followed on its
//           own (an ELAPSED row and a DAY row are two clocks, never compared with each other). A clock row is:
//             - any value that starts with `T+`: `T+ <n> <unit>`, compound values such as `T+ 3 h 20 min` add up, and
//               a bare `T+ 0` is 0;
//             - any row labelled ELAPSED, TIME, CLOCK, DAY or DAYS, with a value such as `40 min`, `3 h 20 min`,
//               `DAY 3`, `DAY 3 of 28` (read as 3 days), `3` or `3 of 28` under a DAY label (days), or `14:30` / `1:05:00` (h:mm
//               and h:mm:ss);
//             - any value that starts with `DAY <n>`, whatever its label.
//           Units: s, sec, second(s), min, minute(s), h, hr, hour(s), d, day(s), week(s), month(s), year(s).
//           A clock value it cannot read is listed as UNREAD (a warning), never guessed.
//   HEADER  two plates share a header number, or header numbers run backwards (title and end cards without a number are
//           skipped).
//   STAGE   a stage number above defineStory's `stages`, below 1, or out of order: stages run backwards, or a stage
//           returns after a different one. Consecutive plates may share a stage (references/style.md: "11 stages over
//           15 plates"); plates without a stage (title and end cards) are skipped.
//   HERO    the hero's identity changes: the ID in the log title (`JOURNEY LOG · <ID>`, or any `... LOG · <ID>`) or the
//           label its `hero(t)` returns changes inside a plate or between plates, or a plate's hero label and its log
//           title's ID disagree. A plate with no label (hero: () => ({ x, y }) with no `label`) is skipped.
// and warns (exit 0) on:
//   FROZEN  a log value (same row label) that does not change across three or more plates in a row: a meter that
//           never moves is either furniture or a fact the story forgot to update.
//   UNREAD  a clock value that could not be parsed.
// Rows that are not clocks (counts, sizes, SITE) are never read as time.
// Exit codes: 0 clean (warnings allowed); 1 on TIME, HEADER, STAGE or HERO; 2 on a setup error (missing file, page
// error, no playwright, a log() or hero() that throws).
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
  catch { console.error('story_check: playwright not found (npm i playwright in the film folder, or npm i -g playwright)'); process.exit(2); } }

const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.log('usage: node story_check.mjs film.html [--json out.json]'); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf('--' + k); if (i < 0) return d; const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) { console.error(`story_check: --${k} needs a value`); process.exit(2); } return v; };
const file = path.resolve(args[0]), jsonOut = opt('json', null);
if (!fs.existsSync(file)) { console.error(`story_check: ${file} not found`); process.exit(2); }

const UNIT = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
  d: 86400, day: 86400, days: 86400, wk: 604800, week: 604800, weeks: 604800, mo: 2629800, month: 2629800, months: 2629800,
  y: 31557600, yr: 31557600, yrs: 31557600, year: 31557600, years: 31557600 };
const CLOCK_LABEL = /^\s*(ELAPSED|TIME|CLOCK|DAYS?)\b/i;
/** seconds from '3 h 20 min' / '1 min 05 s' / '0' / '14:30'; null when it cannot be read */
function duration(rest, bareUnit) {
  rest = rest.replace(/,/g, '').trim();
  if (/^0+(\.0+)?$/.test(rest)) return 0;
  let m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(rest);
  if (m) return +m[1] * 3600 + +m[2] * 60 + +(m[3] || 0);
  if (bareUnit && /^\d+(\.\d+)?$/.test(rest)) return +rest * bareUnit;
  const re = /(\d+(?:\.\d+)?)\s*([a-zA-Zµ]+)\.?/g; let sum = 0, used = '', k;
  while ((k = re.exec(rest))) { const u = UNIT[k[2].toLowerCase()]; if (!u) return null; sum += +k[1] * u; used += k[0]; }
  return used && rest.replace(/[\s.]/g, '') === used.replace(/[\s.]/g, '') ? sum : null;
}
/** a clock row's value in seconds; undefined when the row is not a clock, null when it is one but cannot be read */
function elapsed(label, v) {
  let m = /^\s*T\s*\+\s*(.*)$/i.exec(v);
  if (m) return duration(m[1]);
  m = /^\s*DAY\s+(\d+(?:\.\d+)?)\b/i.exec(v);                     // 'DAY 3', 'DAY 3 of 28'
  if (m) return +m[1] * 86400;
  if (!CLOCK_LABEL.test(label)) return undefined;
  m = /^\s*(\d+(?:\.\d+)?)\s*(?:of|\/)\s*\d+/i.exec(v);                   // '3 of 28', '3/28' under a clock label
  if (m && /^\s*DAYS?\b/i.test(label)) return +m[1] * 86400;
  return duration(v, /^\s*DAYS?\b/i.test(label) ? 86400 : 0);
}
const human = s => s >= 86400 ? `${+(s / 86400).toFixed(2)} d` : s >= 3600 ? `${+(s / 3600).toFixed(2)} h` : s >= 60 ? `${+(s / 60).toFixed(2)} min` : `${+s.toFixed(1)} s`;

const browser = await chromium.launch();
let pageErrors = 0;
const bail = async msg => { console.error(msg); await browser.close(); process.exit(2); };
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { pageErrors++; console.error('PAGE ERROR:', e.message); });
await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'networkidle' });
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 }); }
catch { await bail('story_check: the film never became ready (window.__ready); open it in a browser and look at the console'); }
if (pageErrors) await bail('story_check: the page threw while loading; fix the film first');

const title = await page.evaluate(() => window.__story.title);
const N = await page.evaluate(() => STORY.stages ?? null);
const data = await page.evaluate(() => STORY.plates.map((p, i, all) => {
  const name = p.header ? `plate ${p.header.num != null ? ROMAN(p.header.num) || p.header.num : i + 1} "${p.header.title}"` : i === 0 ? 'opening' : i === all.length - 1 ? 'end card' : `plate ${i + 1} of ${all.length}`;
  const out = { i, name, start: p.start, dur: p.dur, header: p.header ? { num: p.header.num ?? null, title: p.header.title ?? null } : null,
    stage: p.stage ? { n: p.stage.n ?? null, name: p.stage.name ?? null } : null, logs: [], heroes: [], error: null };
  try {
    for (let t = 0; t <= p.dur + 1e-9; t += 0.25) { const tt = Math.min(t, p.dur - 1e-3);
      if (typeof p.log === 'function') { const L = p.log(tt) || {};
        out.logs.push({ t: +(Math.min(t, p.dur)).toFixed(2), title: String(L.title ?? ''), rows: (L.rows || []).map(([a, b]) => [String(a), String(b)]) }); }
      if (typeof p.hero === 'function') { const h = p.hero(tt) || {};
        if (h.label !== undefined && h.label !== null && String(h.label).trim()) out.heroes.push({ t: +(Math.min(t, p.dur)).toFixed(2), label: String(h.label).trim() }); }
    }
  } catch (e) { out.error = e.message; }
  return out;
}));
await browser.close();
const broken = data.find(p => p.error);
if (broken) { console.error(`story_check: log() or hero() of ${broken.name} throws: ${broken.error}`); process.exit(2); }

const fails = [], warns = [];
const idOf = s => { const m = /LOG\s*·\s*(.+?)\s*$/i.exec(s); return m ? m[1] : null; };
const prevE = new Map();   // clock row label -> { e, val, where }: each clock followed on its own
const logIds = [], heroIds = [], unread = new Map();
for (const p of data) {
  const series = new Map();
  for (const L of p.logs) for (const [lab, val] of L.rows) {
    const e = elapsed(lab, val);
    if (e === null) { const k = `${p.i}|${lab}|${val.replace(/\d+/g, '#')}`; if (!unread.has(k)) unread.set(k, { plate: p.name, t: L.t, label: lab, value: val }); }
    else if (e !== undefined) { const key = lab.trim().toUpperCase(); (series.get(key) || series.set(key, []).get(key)).push({ t: L.t, e, val, lab }); }
  }
  // TIME: within the plate, then across the seam from the last plate that carried the same clock
  const sums = [];
  for (const [key, es] of series) {
    let within = null;
    for (let k = 1; k < es.length; k++) if (es[k].e < es[k - 1].e - 1e-9) { within = [es[k - 1], es[k]]; break; }
    if (within) fails.push({ kind: 'TIME', plate: p.name, msg: `${es[0].lab} runs backwards inside the plate: "${within[0].val}" at ${within[0].t} s -> "${within[1].val}" at ${within[1].t} s` });
    const pe = prevE.get(key);
    if (pe && es[0].e < pe.e - 1e-9)
      fails.push({ kind: 'TIME', plate: p.name, msg: `${es[0].lab} runs backwards across plates: ${pe.where} ends at "${pe.val}" (${human(pe.e)}), this plate starts at "${es[0].val}" (${human(es[0].e)})` });
    const last = es[es.length - 1]; prevE.set(key, { e: last.e, val: last.val, where: p.name });
    sums.push(es[0].val === last.val ? es[0].val : `${es[0].val} .. ${last.val}`);
  }
  // HERO: the log title's ID and the hero() label, each steady inside the plate, and the same as each other
  const pid = [...new Set(p.logs.map(L => idOf(L.title)).filter(Boolean))], hid = [...new Set(p.heroes.map(h => h.label))];
  if (pid.length > 1) fails.push({ kind: 'HERO', plate: p.name, msg: `hero ID in the log title changes inside the plate: ${pid.join(' -> ')}` });
  if (hid.length > 1) fails.push({ kind: 'HERO', plate: p.name, msg: `hero() label changes inside the plate: ${hid.join(' -> ')}` });
  if (pid.length && hid.length && !hid.includes(pid[pid.length - 1]))
    fails.push({ kind: 'HERO', plate: p.name, msg: `hero() label "${hid.join('/')}" and the log title's ID "${pid.join('/')}" disagree` });
  if (pid.length) logIds.push({ plate: p.name, id: pid[pid.length - 1], first: pid[0] });
  if (hid.length) heroIds.push({ plate: p.name, id: hid[hid.length - 1], first: hid[0] });
  p.summary = { header: p.header && p.header.num != null ? String(p.header.num) : '-', stage: p.stage ? `${p.stage.n}${p.stage.name ? ' ' + p.stage.name : ''}` : '-',
    id: [...new Set([...hid, ...pid])].join('/') || '-', elapsed: sums.join(', ') || '-' };
}
// both sources in film order, as one identity: a log-only plate followed by a hero-only plate must still agree
const anyIds = [];
for (const p of data) { const ids = [...logIds, ...heroIds].filter(x => x.plate === p.name); if (!ids.length) continue;
  anyIds.push({ plate: p.name, first: ids[0].first, id: ids[ids.length - 1].id }); }
for (let k = 1; k < anyIds.length; k++) if (anyIds[k].first !== anyIds[k - 1].id
    && !fails.some(f => f.kind === 'HERO' && f.plate === anyIds[k].plate))
  fails.push({ kind: 'HERO', plate: anyIds[k].plate, msg: `hero identity changes: ${anyIds[k - 1].id} (${anyIds[k - 1].plate}) -> ${anyIds[k].first}` });
for (const [what, ids] of [['the log title', logIds], ['hero() label', heroIds]])
  for (let k = 1; k < ids.length; k++) if (ids[k].first !== ids[k - 1].id)
    fails.push({ kind: 'HERO', plate: ids[k].plate, msg: `hero ID in ${what} changes: ${ids[k - 1].id} (${ids[k - 1].plate}) -> ${ids[k].first}` });
// HEADER: numbers unique and rising
const hdr = data.filter(p => p.header && typeof p.header.num === 'number');
for (let k = 0; k < hdr.length; k++) {
  const dup = hdr.slice(0, k).find(q => q.header.num === hdr[k].header.num);
  if (dup) fails.push({ kind: 'HEADER', plate: hdr[k].name, msg: `header number ${hdr[k].header.num} is used again (first by ${dup.name})` });
  else if (k && hdr[k].header.num < hdr[k - 1].header.num)
    fails.push({ kind: 'HEADER', plate: hdr[k].name, msg: `header numbers run backwards: ${hdr[k - 1].name} is ${hdr[k - 1].header.num}, this plate is ${hdr[k].header.num}` });
}
// STAGE: within 1..stages, rising, a stage may span consecutive plates but never return after a different one
const staged = data.filter(p => p.stage && p.stage.n != null), seen = new Map();
for (let k = 0; k < staged.length; k++) {
  const p = staged[k], n = p.stage.n, prev = k ? staged[k - 1] : null, lab = q => `${q.name} (stage ${q.stage.n}${q.stage.name ? ' ' + q.stage.name : ''})`;
  if (typeof n !== 'number' || n < 1 || (N != null && n > N))
    fails.push({ kind: 'STAGE', plate: p.name, msg: `stage ${n} is outside 1..${N ?? '?'} (defineStory's stages is ${N ?? 'not set'})` });
  if (prev && n === prev.stage.n) continue;   // the same stage over consecutive plates
  if (seen.has(n)) fails.push({ kind: 'STAGE', plate: p.name, msg: `stage ${n} returns after a different one: ${lab(seen.get(n))}, then ${lab(prev)}, then ${lab(p)}` });
  else if (prev && n < prev.stage.n) fails.push({ kind: 'STAGE', plate: p.name, msg: `stages run backwards: ${lab(prev)} -> ${lab(p)}` });
  if (!seen.has(n)) seen.set(n, p);
}
// FROZEN: a row label whose value never changes across 3+ plates in a row (only plates carrying that row count)
const labels = new Set(data.flatMap(p => p.logs.flatMap(L => L.rows.map(r => r[0]))));
for (const lab of labels) {
  let run = [];
  const flush = () => { if (run.length >= 3) warns.push({ kind: 'FROZEN', plate: run[0].name, msg: `"${lab}" stays "${run[0].v}" across ${run.length} plates: ${run.map(r => r.name).join(', ')}` }); run = []; };
  for (const p of data) {
    const vals = new Set(p.logs.flatMap(L => L.rows.filter(r => r[0] === lab).map(r => r[1])));
    if (!vals.size) { flush(); continue; }
    const v = vals.size === 1 ? [...vals][0] : null;
    if (v === null || (run.length && run[0].v !== v)) flush();
    if (v !== null) run.push({ name: p.name, v });
  }
  flush();
}
for (const u of unread.values()) warns.push({ kind: 'UNREAD', plate: u.plate, msg: `cannot read "${u.label}: ${u.value}" as elapsed time (at ${u.t} s); write it as T+ <n> <unit>, <n> <unit> or DAY <n>` });

console.log(`${title ?? path.basename(file)}: ${data.length} plates, ${data.filter(p => p.logs.length).length} with a Journey Log, stages ${N ?? '-'}`);
for (const p of data) console.log(`  ${p.name.padEnd(34)} #${String(p.summary.header).padEnd(4)} stage ${String(p.summary.stage).padEnd(18)} hero ${String(p.summary.id).padEnd(12)} elapsed ${p.summary.elapsed}`);
for (const f of fails) console.log(`${f.kind.padEnd(7)} ${f.plate}: ${f.msg}`);
for (const w of warns) console.log(`${w.kind.padEnd(7)} ${w.plate}: ${w.msg}  (warning)`);
const count = k => fails.filter(f => f.kind === k).length;
console.log(`result: ${fails.length ? 'ISSUES' : 'CLEAN'} (time ${count('TIME')}, header ${count('HEADER')}, stage ${count('STAGE')}, hero ${count('HERO')}; warnings ${warns.length})`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ stages: N, plates: data.map(({ logs, heroes, ...p }) => p), fails, warns }, null, 1));
process.exit(fails.length ? 1 : 0);
