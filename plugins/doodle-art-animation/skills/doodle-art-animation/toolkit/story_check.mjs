// story_check.mjs — does the story keep its own facts straight? The Journey Log, stage dial and hero ID, read from
// the built film, plate by plate.
// usage: node story_check.mjs film.html [--json out.json]
//
// It loads the film (nothing is rendered), and for each plate reads `header`, `stage` and the Journey Log, sampling
// `log(t)` every 0.25 s across the plate ({ title, rows: [[label, value], ...], states, state }). It fails on:
//   TIME    elapsed time runs backwards, inside a plate or from one plate to the next. Elapsed is any log value that
//           starts with `T+`: `T+ <n> <unit>`, compound values such as `T+ 3 h 20 min` add up, and a bare `T+ 0` is 0.
//           Units: s, sec, second(s), min, minute(s), h, hr, hour(s), d, day(s), week(s), month(s), year(s).
//           A `T+` value it cannot read is listed as UNREAD (a warning), never guessed.
//   STAGE   a stage number `n` used by more than one plate (title and end cards have no stage and are skipped).
//   HERO    the hero ID in the log title (`JOURNEY LOG · <ID>`, or any `... LOG · <ID>`) changes between plates.
// and warns (exit 0) on:
//   FROZEN  a log value (same row label) that does not change across three or more plates in a row: a meter that
//           never moves is either furniture or a fact the story forgot to update.
//   UNREAD  a `T+` value that could not be parsed.
// Rows without `T+` (counts, sizes, `DAY 3 of 28`) are not read as elapsed time.
// Exit codes: 0 clean (warnings allowed); 1 on TIME, STAGE or HERO; 2 on a setup error (missing file, page error,
// no playwright, a log() that throws).
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
/** seconds from 'T+ 3 h 20 min' / 'T+ 1 min 05 s' / 'T+ 0'; null when it cannot be read */
function elapsed(v) {
  const m = /^\s*T\s*\+\s*(.*)$/i.exec(v); if (!m) return undefined;
  const rest = m[1].replace(/,/g, '').trim();
  if (/^0+(\.0+)?$/.test(rest)) return 0;
  const re = /(\d+(?:\.\d+)?)\s*([a-zA-Zµ]+)\.?/g; let sum = 0, used = '', k;
  while ((k = re.exec(rest))) { const u = UNIT[k[2].toLowerCase()]; if (!u) return null; sum += +k[1] * u; used += k[0]; }
  return used && rest.replace(/[\s.]/g, '') === used.replace(/[\s.]/g, '') ? sum : null;
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
const data = await page.evaluate(() => STORY.plates.map((p, i, all) => {
  const name = p.header ? `plate ${p.header.num != null ? ROMAN(p.header.num) || p.header.num : i + 1} "${p.header.title}"` : i === 0 ? 'opening' : i === all.length - 1 ? 'end card' : `plate ${i + 1} of ${all.length}`;
  const out = { i, name, start: p.start, dur: p.dur, header: p.header ? { num: p.header.num ?? null, title: p.header.title ?? null } : null,
    stage: p.stage ? { n: p.stage.n ?? null, name: p.stage.name ?? null } : null, logs: [], error: null };
  if (typeof p.log === 'function') {
    try { for (let t = 0; t <= p.dur + 1e-9; t += 0.25) { const L = p.log(Math.min(t, p.dur - 1e-3)) || {};
      out.logs.push({ t: +(Math.min(t, p.dur)).toFixed(2), title: String(L.title ?? ''), rows: (L.rows || []).map(([a, b]) => [String(a), String(b)]) }); } }
    catch (e) { out.error = e.message; }
  }
  return out;
}));
await browser.close();
const broken = data.find(p => p.error);
if (broken) { console.error(`story_check: log() of ${broken.name} throws: ${broken.error}`); process.exit(2); }

const fails = [], warns = [];
const idOf = s => { const m = /LOG\s*·\s*(.+?)\s*$/i.exec(s); return m ? m[1] : null; };
let prevE = null, prevWhere = null;
const ids = [], stages = new Map(), unread = new Map();
for (const p of data) {
  const es = [];
  for (const L of p.logs) for (const [lab, val] of L.rows) {
    const e = elapsed(val);
    if (e === null) { const k = `${p.i}|${val.replace(/\d+/g, '#')}`; if (!unread.has(k)) unread.set(k, { plate: p.name, t: L.t, label: lab, value: val }); }
    else if (e !== undefined) es.push({ t: L.t, e, val });
  }
  // TIME: within the plate, then across the seam from the last plate that had an elapsed value
  let within = null;
  for (let k = 1; k < es.length; k++) if (es[k].e < es[k - 1].e - 1e-9) { within = [es[k - 1], es[k]]; break; }
  if (within) fails.push({ kind: 'TIME', plate: p.name, msg: `elapsed runs backwards inside the plate: "${within[0].val}" at ${within[0].t} s -> "${within[1].val}" at ${within[1].t} s` });
  if (es.length && prevE && es[0].e < prevE.e - 1e-9)
    fails.push({ kind: 'TIME', plate: p.name, msg: `elapsed runs backwards across plates: ${prevWhere} ends at "${prevE.val}" (${human(prevE.e)}), this plate starts at "${es[0].val}" (${human(es[0].e)})` });
  if (es.length) { prevE = es[es.length - 1]; prevWhere = p.name; }
  // HERO
  const pid = [...new Set(p.logs.map(L => idOf(L.title)).filter(Boolean))];
  if (pid.length > 1) fails.push({ kind: 'HERO', plate: p.name, msg: `hero ID changes inside the plate: ${pid.join(' -> ')}` });
  if (pid.length) ids.push({ plate: p.name, id: pid[pid.length - 1], first: pid[0] });
  // STAGE
  if (p.stage && p.stage.n != null) (stages.get(p.stage.n) || stages.set(p.stage.n, []).get(p.stage.n)).push(p);
  p.summary = { stage: p.stage ? `${p.stage.n}${p.stage.name ? ' ' + p.stage.name : ''}` : '-', id: pid.join('/') || '-',
    elapsed: es.length ? (es[0].val === es[es.length - 1].val ? es[0].val : `${es[0].val} .. ${es[es.length - 1].val}`) : '-' };
}
for (let k = 1; k < ids.length; k++) if (ids[k].first !== ids[k - 1].id)
  fails.push({ kind: 'HERO', plate: ids[k].plate, msg: `hero ID in the log title changes: ${ids[k - 1].id} (${ids[k - 1].plate}) -> ${ids[k].first}` });
for (const [n, ps] of stages) if (ps.length > 1)
  fails.push({ kind: 'STAGE', plate: ps[1].name, msg: `stage ${n} is used by ${ps.length} plates: ${ps.map(p => `${p.name}${p.stage.name ? ` (${p.stage.name})` : ''}`).join(', ')}` });
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
for (const u of unread.values()) warns.push({ kind: 'UNREAD', plate: u.plate, msg: `cannot read "${u.label}: ${u.value}" as elapsed time (at ${u.t} s); write it as T+ <n> <unit>` });

console.log(`${title ?? path.basename(file)}: ${data.length} plates, ${data.filter(p => p.logs.length).length} with a Journey Log`);
for (const p of data) console.log(`  ${p.name.padEnd(34)} stage ${String(p.summary.stage).padEnd(18)} hero ${String(p.summary.id).padEnd(10)} elapsed ${p.summary.elapsed}`);
for (const f of fails) console.log(`${f.kind.padEnd(7)} ${f.plate}: ${f.msg}`);
for (const w of warns) console.log(`${w.kind.padEnd(7)} ${w.plate}: ${w.msg}  (warning)`);
console.log(`result: ${fails.length ? 'ISSUES' : 'CLEAN'} (time ${fails.filter(f => f.kind === 'TIME').length}, stage ${fails.filter(f => f.kind === 'STAGE').length}, `
  + `hero ${fails.filter(f => f.kind === 'HERO').length}; warnings ${warns.length})`);
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ plates: data.map(({ logs, ...p }) => p), fails, warns }, null, 1));
process.exit(fails.length ? 1 : 0);
