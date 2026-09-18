// render.mjs — frame-exact capture of a Doodle Art Animation HTML file.
// usage:
//   node render.mjs film.html out.mp4 [--workers 6] [--from 0] [--to N] [--png] [--bitrate 3800k] [--crf 16] [--preset slow] [--strict-fonts]
//   node render.mjs film.html --stills 0,120,480 [--dir qa]     single frames
//   node render.mjs film.html --sheet 1 [--dir qa]              1 frame every N seconds -> qa/contact_sheet.jpg
//   node render.mjs film.html --strips [--dir qa]               8 fps strip around every transition -> qa/strip_XX.jpg
//   node render.mjs film.html --seams [--dir qa]                both sides of every transition -> qa/seam_XX.jpg
//        top row: old plate's last drawing | the two overlaid | new plate once settled; bottom row: 4 drawings inside the transition
//   node render.mjs film.html --sheet-range A-B [--fps 6] [--dir qa]         frames from A to B seconds, tiled -> qa/range_A-B.jpg
//   node render.mjs film.html --sheet-range A-B --crop x,y,w,h [--fps 6]    the same frames, cropped first -> qa/range_A-B_crop.jpg (a detail sheet; both files are written when --crop is given)
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const args = process.argv.slice(2);
const file = path.resolve(args[0]);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const out = args[1] && !args[1].startsWith('--') ? path.resolve(args[1]) : null;
const strictFonts = !!opt('strict-fonts', false);   // exit non-zero if any page fell back to other fonts
const workers = +opt('workers', 6), png = !!opt('png', false), bitrate = opt('bitrate', null), crf = String(opt('crf', 16)), preset = opt('preset', 'slow');
const dir = path.resolve(opt('dir', out ? out.replace(/\.mp4$/, '') + '_frames' : 'qa'));
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none'] });
// every page must draw with the same faces: warnings are collected per page and compared
const fontWarnings = [];
const fail = msg => { console.error('\x1b[31mERROR:', msg, '\x1b[0m'); process.exit(1); };
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // a story that throws while loading never sets __ready, so the wait below would burn its whole
  // timeout and then bury the real cause under a Playwright stack. Fail on the first error instead.
  let firstError = null, onError = null;
  const errored = new Promise(res => { onError = res; });
  page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); if (!firstError) { firstError = e.message; onError(); } });
  if (process.env.DOODLE_BLOCK_FONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => process.env.DOODLE_BLOCK_FONTS === 'hang' ? null : r.abort());   // test the offline path
  // not networkidle: a silent font server would stall it. When the first page fell back, later pages skip the font wait
  // (?nofonts) and freeze the same fallback, so they neither wait the cap again nor pick up fonts that arrive late.
  const q = fontWarnings.length && fontWarnings[0] ? '&nofonts=1' : '';
  await page.goto(pathToFileURL(file).href + '?render=1' + q, { waitUntil: 'domcontentloaded' });
  const ready = page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 });
  ready.catch(() => {});                                     // handled below; keeps the race from warning
  let state = await Promise.race([ready.then(() => 'ready'), errored.then(() => 'error')]);
  if (state === 'error') {
    // an error before __ready is usually fatal (a bad story never boots), but boot() waits for fonts first,
    // so a harmless error can land while the page is still loading. Give the page its wait before judging.
    // boot() waits for fonts (up to FONT_WAIT) before setting __ready, so give it that much and no more:
    // a fatal story is reported in seconds instead of sitting out the 90 s readiness timeout.
    state = await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000, polling: 200 })
      .then(() => 'ready').catch(() => 'stuck');
    if (state === 'stuck')
      fail(`the story threw while loading, so the film never became ready: ${firstError}\n` +
           '       (a name used before it is declared usually means the plates were concatenated in the wrong order,\n' +
           '        or a value one plate reads from another is not in helpers.js)');
  }
  const warn = (await page.evaluate(() => window.__fontWarning)) || null;
  if (warn && !fontWarnings.length) console.warn('\x1b[33mWARNING:', warn, '\x1b[0m');
  const fam = w => w && w.slice(0, w.indexOf(')'));        // compare which families are missing, not the reason text
  if (fontWarnings.length && fam(warn) !== fam(fontWarnings[0])) fail(`pages disagree on fonts (page 1: ${fontWarnings[0] || 'all loaded'}; page ${fontWarnings.length + 1}: ${warn || 'all loaded'})`);
  fontWarnings.push(warn);
  if (warn && strictFonts) fail('--strict-fonts: ' + warn);
  return page;
}
const first = await openPage();
const info = await first.evaluate(() => window.__story);
console.log(`${info.title}: ${info.frames} frames @ ${info.fps} fps = ${(info.frames / info.fps).toFixed(1)} s`);
const grab = async (page, f, name) => {
  const b64 = await page.evaluate(([f, t]) => window.__frameData(f, t, 0.95), [f, png ? 'image/png' : 'image/jpeg']);
  fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'));
};
const tile = (glob, cols, rows, outName, w = 480, crop = null) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(dir, glob),
  '-vf', `${crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` : ''}scale=${w}:-1,tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', path.join(dir, outName)]);

if (opt('stills', null) || opt('sheet', null)) {
  const list = opt('stills', null) ? String(opt('stills')).split(',').map(Number)
    : Array.from({ length: Math.ceil(info.frames / (info.fps * +opt('sheet'))) }, (_, i) => Math.round(i * info.fps * +opt('sheet')));
  // a contact sheet tiles f_*.jpg, so clear any left from an earlier, longer run of this film:
  // qa/ outlives a single run now (the reviewers reuse it), and stale frames would be tiled in as if current
  if (opt('sheet', null)) for (const fn of fs.readdirSync(dir)) if (/^f_\d+\.jpg$/.test(fn)) fs.unlinkSync(path.join(dir, fn));
  for (const f of list) await grab(first, f, `f_${String(f).padStart(5, '0')}.jpg`);
  console.log(`wrote ${list.length} stills to ${dir}`);
  if (opt('sheet', null)) { tile('f_*.jpg', 6, Math.ceil(list.length / 6), 'contact_sheet.jpg'); console.log('contact sheet:', path.join(dir, 'contact_sheet.jpg')); }
  await browser.close(); process.exit(0);
}
if (opt('seams', null)) {
  // qa/ is reused between runs, so a film that lost a seam would otherwise leave its old sheet behind
  // for a reviewer to score. Same for --strips below.
  for (const fn of fs.readdirSync(dir)) if (/^seam_\d+_\w+\.jpg$/.test(fn)) fs.unlinkSync(path.join(dir, fn));
  const fps = info.fps, fr = t => Math.max(0, Math.min(info.frames - 1, Math.round(t * fps)));
  for (const [i, s] of info.starts.entries()) {
    if (i === 0) continue;
    const d = s.dur || 0, tag = `m${String(i).padStart(2, '0')}`, span = d || 0.6;
    const shots = [['a', fr(s.t) - 2], ['b', fr(s.t + d + s.settle)], ...[0.2, 0.4, 0.6, 0.8].map((u, k) => ['c' + k, fr(s.t + u * span)])];
    for (const [n, f] of shots) await grab(first, f, `${tag}_${n}.jpg`);
    const P = n => path.join(dir, `${tag}_${n}.jpg`), out = path.join(dir, `seam_${String(i).padStart(2, '0')}_${s.type || 'cut'}.jpg`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', P('a'), '-i', P('b'), '-i', P('c0'), '-i', P('c1'), '-i', P('c2'), '-i', P('c3'), '-filter_complex',
      '[0]scale=640:360,split[a][a2];[1]scale=640:360,split[b][b2];[a2][b2]blend=all_mode=average[o];[a][o][b]hstack=3[top];' +
      '[2]scale=480:270[c0];[3]scale=480:270[c1];[4]scale=480:270[c2];[5]scale=480:270[c3];[c0][c1][c2][c3]hstack=4[bot];[top][bot]vstack', '-frames:v', '1', out]);
    for (const fn of fs.readdirSync(dir)) if (fn.startsWith(tag + '_')) fs.unlinkSync(path.join(dir, fn));
    console.log(`seam ${i} (${s.type || 'cut'}) at ${s.t.toFixed(2)} s`);
  }
  await browser.close(); process.exit(0);
}
if (opt('strips', null)) {   // 12 frames at 8 fps, from 0.25 s before each plate start
  for (const fn of fs.readdirSync(dir)) if (/^strip_\d+_\w+\.jpg$/.test(fn)) fs.unlinkSync(path.join(dir, fn));
  const starts = info.starts.map((s, i) => ({ ...s, i })).filter(s => s.i > 0);
  for (const s of starts) {
    const tag = `s${String(s.i).padStart(2, '0')}`;
    for (let k = 0; k < 12; k++) { const f = Math.max(0, Math.round((s.t - 0.25) * info.fps) + k * 3); await grab(first, f, `${tag}_${String(k).padStart(2, '0')}.jpg`); }
    tile(`${tag}_*.jpg`, 4, 3, `strip_${String(s.i).padStart(2, '0')}_${s.type || 'cut'}.jpg`);
    for (const fn of fs.readdirSync(dir)) if (fn.startsWith(tag + '_')) fs.unlinkSync(path.join(dir, fn));
    console.log(`strip ${s.i} (${s.type || 'cut'}) at ${s.t.toFixed(2)} s`);
  }
  await browser.close(); process.exit(0);
}
if (opt('sheet-range', null)) {   // frames from A to B seconds at --fps (default 6), tiled into one grid; --crop adds a detail sheet
  const rangeArg = String(opt('sheet-range')), m = rangeArg.match(/^(-?[\d.]+)-(-?[\d.]+)$/);
  if (!m) fail(`--sheet-range needs "A-B" in seconds, e.g. --sheet-range 2-4 (got "${rangeArg}")`);
  const A = +m[1], B = +m[2];
  if (!(B > A)) fail(`--sheet-range: B must be greater than A (got "${rangeArg}")`);
  const rfps = +opt('fps', 6);
  if (!(rfps > 0)) fail(`--fps must be > 0 (got "${opt('fps', 6)}")`);
  const cropArg = opt('crop', null);
  let crop = null;
  if (cropArg) { const cm = String(cropArg).match(/^(\d+),(\d+),(\d+),(\d+)$/); if (!cm) fail(`--crop needs "x,y,w,h" in pixels (got "${cropArg}")`); crop = { x: +cm[1], y: +cm[2], w: +cm[3], h: +cm[4] }; }
  const fmtN = n => Number.isInteger(n) ? String(n) : String(n).replace(/0+$/, '').replace(/\.$/, '');
  const tag = `range_${fmtN(A)}-${fmtN(B)}`;
  const fset = new Set(); for (let t = A; t <= B + 1e-9; t += 1 / rfps) fset.add(Math.round(t * info.fps));
  const list = [...fset].filter(f => f >= 0 && f < info.frames).sort((a, b) => a - b);
  if (!list.length) fail(`--sheet-range ${rangeArg}: no frames in range (film is ${(info.frames / info.fps).toFixed(1)} s)`);
  for (const f of list) await grab(first, f, `rf_${String(f).padStart(5, '0')}.jpg`);
  const cols = Math.min(6, list.length), rows = Math.ceil(list.length / cols);
  tile('rf_*.jpg', cols, rows, `${tag}.jpg`);
  console.log(`range sheet (${list.length} frames at ${rfps} fps): ${path.join(dir, tag + '.jpg')}`);
  if (crop) { tile('rf_*.jpg', cols, rows, `${tag}_crop.jpg`, 480, crop); console.log(`range crop: ${path.join(dir, tag + '_crop.jpg')}`); }
  for (const fn of fs.readdirSync(dir)) if (fn.startsWith('rf_')) fs.unlinkSync(path.join(dir, fn));
  await browser.close(); process.exit(0);
}

const from = +opt('from', 0), to = Math.min(+opt('to', info.frames), info.frames);
const pages = [first]; for (let i = 1; i < workers; i++) pages.push(await openPage());
let done = 0; const t0 = Date.now(), ext = png ? 'png' : 'jpg';
// audio renders on its own thread (OfflineAudioContext), so start it now instead of after the frames: ~20 s saved on a 3-minute film
let audioError = null;                                       // held until the frames finish, so a failure can't abort mid-render unhandled
const audio = first.evaluate(() => window.__audioWav()).then(wav => {
  fs.writeFileSync(path.join(dir, 'audio.wav'), Buffer.from(wav, 'base64'));
  console.log(`audio: ${((Date.now() - t0) / 1000).toFixed(1)} s after start, ${(wav.length * 0.75 / 1048576).toFixed(1)} MB wav`); })
  .catch(e => { audioError = e; });
await Promise.all(pages.map(async (page, w) => {
  for (let f = from; f < to; f++) {
    if (Math.floor(f / 2) % workers !== w) continue;          // frame pairs share a boil, keep them on one worker
    await grab(page, f, `${String(f).padStart(5, '0')}.${ext}`);
    if (++done % 120 === 0) console.log(`${done}/${to - from} frames · ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
}));
const tf = Date.now() - t0;
console.log(`frames: ${(tf / 1000).toFixed(1)} s, ${(tf / Math.max(1, done)).toFixed(0)} ms/frame with ${workers} workers`);
await audio;
if (audioError) { await browser.close(); throw audioError; }
await browser.close();
if (out) {
  const te = Date.now();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(info.fps), '-start_number', String(from),
    '-i', path.join(dir, `%05d.${ext}`), '-ss', String(from / info.fps), '-i', path.join(dir, 'audio.wav'),
    '-c:v', 'libx264', '-preset', preset, ...(bitrate ? ['-b:v', bitrate, '-maxrate', bitrate, '-bufsize', '8M'] : ['-crf', crf]),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: 'inherit' });
  const mb = fs.statSync(out).size / 1048576, perMin = mb / (((to - from) / info.fps) / 60);
  console.log(`wrote ${out}: ${mb.toFixed(0)} MB (${perMin.toFixed(0)} MB/min), encode ${((Date.now() - te) / 1000).toFixed(0)} s, total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  // the grain and gate weave change every drawing, so constant-quality encodes spend their bits on noise
  if (!bitrate && perMin > 100 && (to - from) / info.fps >= 10) console.warn('\x1b[33mlarge file: use --bitrate 3800k for anything you share (≈ 30 MB/min)\x1b[0m');
}
