// sfxlib_test.mjs: render every effect in sfxlib.js offline and check it. Usage:
//   node sfxlib_test.mjs [--only a,b] [--json report.json] [--wav dir] [--lib other/sfxlib.js]
// For each effect: it renders with seed 1, seed 1 again and seed 2, then checks that
//   - every sample is finite and the effect is not silent;
//   - the peak at g = 1 sits in the shared band (-22 to -5 dBFS), so effects mix at a predictable level;
//   - the same seed gives the same sound (within 1e-4: Chromium's offline audio is not bit-exact between renders);
//   - a different seed gives a different sound (no two plays identical), unless meta.fixed is true;
//   - it ends within meta.dur + 1.5 s;
//   - its meta is complete, its tags come from the vocabularies (2 to 4 use tags, 2 to 5 feel tags), and its name
//     does not collide with a Doodle Draw engine sound;
// and that every style's toolkit/sfxlib.js is the same as this folder's sfxlib.js (node sync.mjs copies it).
// --wav writes each effect as <name>.wav for listening. Exits 1 on any failure.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
let chromium;
for (const p of [process.env.PLAYWRIGHT_MODULE, resolve(here, 'node_modules/playwright/index.mjs'), '/opt/node22/lib/node_modules/playwright/index.mjs', 'playwright']) {
  if (!p) continue; try { ({ chromium } = await import(p)); break; } catch { /* next */ }
}
if (!chromium) { console.error('sfxlib_test: playwright not found (npm i playwright, or set PLAYWRIGHT_MODULE)'); process.exit(2); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage(); const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.setContent('<html><body></body></html>');
await page.addScriptTag({ content: readFileSync(opt('lib') ? resolve(opt('lib')) : resolve(here, 'sfxlib.js'), 'utf8') });

// names the Doodle Draw engine already uses (a library effect must not shadow them)
const engine = resolve(here, '../styles/doodle-draw/toolkit/engine.js');
const taken = new Set();
if (existsSync(engine)) {
  const src = readFileSync(engine, 'utf8');
  for (const table of ['SFX', 'INST', 'STING', 'BED', 'TRANS_SFX']) {
    const i = src.indexOf(`const ${table} = {`); if (i < 0) continue;
    let d = 0, j = src.indexOf('{', i), end = j; for (; end < src.length; end++) { if (src[end] === '{') d++; else if (src[end] === '}' && --d === 0) break; }
    for (const m of src.slice(j + 1, end).matchAll(/^\s{2}([A-Za-z_]\w*)\s*[(:]/gm)) taken.add(m[1]);
  }
}
const STYLES = ['3dlight', 'doodle-draw'];
const names = await page.evaluate(() => Object.keys(window.SFXLIB.fx));
const V = await page.evaluate(() => ({ uses: window.SFXLIB.uses || [], feels: window.SFXLIB.feels || [], tones: window.SFXLIB.tones || [] }));
const only = opt('only') ? opt('only').split(',') : null;
const wavDir = opt('wav'); if (wavDir) mkdirSync(wavDir, { recursive: true });
const SR = 48000;
function wav(file, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  writeFileSync(file, b);
}
const rows = []; let fails = 0;
for (const name of names) {
  if (only && !only.includes(name)) continue;
  const r = await page.evaluate(async ([name, SR]) => {
    const m = window.SFXLIB.meta[name], len = (m.dur || 1) + 1.5;
    const go = async seed => { const ac = new OfflineAudioContext(2, Math.ceil(SR * (len + 0.1)), SR); window.SFXLIB.fx[name](ac, ac.destination, 0.05, { seed }); const b = await ac.startRendering(); return [b.getChannelData(0), b.getChannelData(1)]; };
    const a = await go(1), a2 = await go(1), b = await go(2);
    let finite = true, peak = 0, sum = 0, last = 0, d12 = 0, dv = 0;
    for (let c = 0; c < 2; c++) for (let i = 0; i < a[c].length; i++) { const v = a[c][i]; if (!Number.isFinite(v)) finite = false; const av = Math.abs(v); if (av > peak) peak = av; sum += v * v; if (av > 1e-3) last = Math.max(last, i);
      d12 = Math.max(d12, Math.abs(v - a2[c][i])); dv = Math.max(dv, Math.abs(v - b[c][i])); }
    // brightness: zero-crossing rate of the loudest 0.2 s, as a rough spectral centroid in Hz
    let pi = 0, pv = 0; const L = a[0], R = a[1]; for (let i = 0; i < L.length; i++) { const v = Math.abs(L[i] + R[i]); if (v > pv) { pv = v; pi = i; } }
    let zc = 0; const w0 = Math.max(0, pi - SR * 0.05 | 0), w1 = Math.min(L.length - 1, w0 + SR * 0.2 | 0); for (let i = w0 + 1; i < w1; i++) if ((L[i - 1] + R[i - 1] >= 0) !== (L[i] + R[i] >= 0)) zc++;
    return { meta: m, finite, peak, rms: Math.sqrt(sum / (2 * Math.max(1, last))), end: last / SR, d12, dv, len, bright: zc / 2 / ((w1 - w0) / SR), L: Array.from(L), R: Array.from(R) };
  }, [name, SR]);
  const m = r.meta, why = [];
  const db = v => 20 * Math.log10(Math.max(v, 1e-9));
  if (!r.finite) why.push('non-finite samples');
  if (r.peak < 1e-3) why.push('silent');
  else if (db(r.peak) < -22 || db(r.peak) > -5) why.push(`peak ${db(r.peak).toFixed(1)} dBFS outside -22..-5`);
  if (r.d12 > 1e-4) why.push(`same seed differs by ${r.d12.toExponential(1)}`);
  if (!m.fixed && r.dv < 1e-3) why.push('a different seed sounds identical');
  if (r.end > r.len - 0.05) why.push(`still sounding at ${r.end.toFixed(2)} s (meta.dur ${m.dur})`);
  if (!lib_ok(m)) why.push('meta incomplete (family, styles, desc, events, dur)');
  const tagErr = tags_ok(m); if (tagErr) why.push(tagErr);
  if (taken.has(name)) why.push('name collides with a Doodle Draw engine sound');
  if (why.length) fails++;
  rows.push({ name, family: m.family, styles: m.styles.join('+'), peak: +db(r.peak).toFixed(1), rms: +db(r.rms).toFixed(1), end: +r.end.toFixed(2), bright: Math.round(r.bright), ok: !why.length, why: why.join('; ') });
  if (wavDir) wav(resolve(wavDir, name + '.wav'), r.L.slice(0, Math.ceil((r.end + 0.15) * SR)), r.R.slice(0, Math.ceil((r.end + 0.15) * SR)));
}
// tags: 2 to 4 use tags and 2 to 5 feel tags, every tag from the library's vocabularies (lib.uses, lib.feels, lib.tones)
function tags_ok(m) {
  const t = m.tags || [], u = t.filter(x => V.uses.includes(x)), f = t.filter(x => V.feels.includes(x)), odd = t.filter(x => !V.uses.includes(x) && !V.feels.includes(x) && !V.tones.includes(x));
  if (odd.length) return `tags not in the vocabulary: ${odd.join(', ')} (lib.uses, lib.feels, lib.tones in sfxlib.js)`;
  if (u.length < 2 || u.length > 4) return `${u.length} use tags (needs 2 to 4 of: ${V.uses.join(', ')})`;
  if (f.length < 2 || f.length > 5) return `${f.length} feel tags (needs 2 to 5)`;
  return '';
}
function lib_ok(m) { return m && m.family && Array.isArray(m.styles) && m.styles.length && m.styles.every(s => STYLES.includes(s)) && m.desc && m.events && m.dur > 0; }
await browser.close();
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('effect', 18) + pad('family', 11) + pad('styles', 22) + pad('peak', 7) + pad('rms', 7) + pad('end s', 7) + pad('~Hz', 7) + 'result');
for (const r of rows) console.log(pad(r.name, 18) + pad(r.family, 11) + pad(r.styles, 22) + pad(r.peak, 7) + pad(r.rms, 7) + pad(r.end, 7) + pad(r.bright, 7) + (r.ok ? 'PASS' : 'FAIL  ' + r.why));
if (errs.length) { console.error('PAGE ERRORS:\n' + errs.join('\n')); fails++; }
if (!opt('lib')) {   // the toolkit copies must match the library
  const lib = readFileSync(resolve(here, 'sfxlib.js'), 'utf8'), styles = resolve(here, '../styles');
  for (const id of existsSync(styles) ? readdirSync(styles) : []) {
    const f = resolve(styles, id, 'toolkit', 'sfxlib.js');
    if (existsSync(resolve(styles, id, 'toolkit')) && (!existsSync(f) || readFileSync(f, 'utf8') !== lib)) { console.error(`FAIL  styles/${id}/toolkit/sfxlib.js differs from sfxlib.js (run node sync.mjs)`); fails++; }
  }
}
console.log(`\n${rows.length - rows.filter(r => !r.ok).length} passed, ${rows.filter(r => !r.ok).length} failed`);
if (opt('json')) writeFileSync(opt('json'), JSON.stringify(rows, null, 1));
process.exit(fails ? 1 : 0);
