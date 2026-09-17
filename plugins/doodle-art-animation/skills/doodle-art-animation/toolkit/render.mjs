// render.mjs — frame-exact capture of a Doodle Art Animation HTML file.
// usage:
//   node render.mjs film.html out.mp4 [--workers 6] [--from 0] [--to N] [--png] [--bitrate 3800k]
//   node render.mjs film.html --stills 0,120,480 [--dir qa]     single frames
//   node render.mjs film.html --sheet 1 [--dir qa]              1 frame every N seconds -> qa/contact_sheet.jpg
//   node render.mjs film.html --strips [--dir qa]               8 fps strip around every transition -> qa/strip_XX.jpg
//   node render.mjs film.html --seams [--dir qa]                both sides of every transition -> qa/seam_XX.jpg
//        top row: old plate's last drawing | the two overlaid | new plate once settled; bottom row: 4 drawings inside the transition
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
const workers = +opt('workers', 6), png = !!opt('png', false), bitrate = opt('bitrate', null);
const dir = path.resolve(opt('dir', out ? out.replace(/\.mp4$/, '') + '_frames' : 'qa'));
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none'] });
let warned = false;
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  if (process.env.DOODLE_BLOCK_FONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => process.env.DOODLE_BLOCK_FONTS === 'hang' ? null : r.abort());   // test the offline path
  await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'domcontentloaded' });   // not networkidle: a silent font server would stall it
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 });
  const warn = await page.evaluate(() => window.__fontWarning);
  if (warn && !warned) { warned = true; console.warn('\x1b[33mWARNING:', warn, '\x1b[0m'); }
  return page;
}
const first = await openPage();
const info = await first.evaluate(() => window.__story);
console.log(`${info.title}: ${info.frames} frames @ ${info.fps} fps = ${(info.frames / info.fps).toFixed(1)} s`);
const grab = async (page, f, name) => {
  const b64 = await page.evaluate(([f, t]) => window.__frameData(f, t, 0.95), [f, png ? 'image/png' : 'image/jpeg']);
  fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'));
};
const tile = (glob, cols, rows, outName, w = 480) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(dir, glob),
  '-vf', `scale=${w}:-1,tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', path.join(dir, outName)]);

if (opt('stills', null) || opt('sheet', null)) {
  const list = opt('stills', null) ? String(opt('stills')).split(',').map(Number)
    : Array.from({ length: Math.ceil(info.frames / (info.fps * +opt('sheet'))) }, (_, i) => Math.round(i * info.fps * +opt('sheet')));
  for (const f of list) await grab(first, f, `f_${String(f).padStart(5, '0')}.jpg`);
  console.log(`wrote ${list.length} stills to ${dir}`);
  if (opt('sheet', null)) { tile('f_*.jpg', 6, Math.ceil(list.length / 6), 'contact_sheet.jpg'); console.log('contact sheet:', path.join(dir, 'contact_sheet.jpg')); }
  await browser.close(); process.exit(0);
}
if (opt('seams', null)) {
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

const from = +opt('from', 0), to = Math.min(+opt('to', info.frames), info.frames);
const pages = [first]; for (let i = 1; i < workers; i++) pages.push(await openPage());
let done = 0; const t0 = Date.now(), ext = png ? 'png' : 'jpg';
await Promise.all(pages.map(async (page, w) => {
  for (let f = from; f < to; f++) {
    if (Math.floor(f / 2) % workers !== w) continue;          // frame pairs share a boil, keep them on one worker
    await grab(page, f, `${String(f).padStart(5, '0')}.${ext}`);
    if (++done % 120 === 0) console.log(`${done}/${to - from} frames · ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
}));
console.log('rendering audio…');
const wav = await first.evaluate(() => window.__audioWav());
fs.writeFileSync(path.join(dir, 'audio.wav'), Buffer.from(wav, 'base64'));
await browser.close();
if (out) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(info.fps), '-start_number', String(from),
    '-i', path.join(dir, `%05d.${ext}`), '-ss', String(from / info.fps), '-i', path.join(dir, 'audio.wav'),
    '-c:v', 'libx264', '-preset', 'slow', ...(bitrate ? ['-b:v', bitrate, '-maxrate', bitrate, '-bufsize', '8M'] : ['-crf', '16']),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: 'inherit' });
  console.log('wrote', out);
}
