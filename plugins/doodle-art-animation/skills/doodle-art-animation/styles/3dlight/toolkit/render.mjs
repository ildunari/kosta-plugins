// Render a 3DLight film (film.html from build.py). Usage:
//   node render.mjs film.html film.mp4 [--workers N] [--fps 30] [--from A] [--to B] [--crf 16]
//        the film (or A..B seconds of it) as H.264, yuv420p, silent. Workers draw frames in parallel (default: one per
//        CPU core, at most 8) and pipe JPEG frames to ffmpeg; the segments are joined without re-encoding.
//   node render.mjs film.html --stills 0,0.3,5.99 [--dir qa]   full-size PNGs -> qa/stills/<id>_<T>.png
//   node render.mjs film.html --strip N [--dir qa]             beat N (1-based) at 8 moments, from its dissolve to its
//                                                               last frame -> qa/<id>_strip_NN.png
//   node render.mjs film.html --seam [--dir qa]                a loop's seam: the last 3 s, then the first 2.5 s -> qa/<id>_seam.png
//   node render.mjs film.html --sheet [--dir qa]               one frame per beat (its held picture) -> qa/<id>_sheet.png
// --dir defaults to qa/ next to film.html. The film's size (defineFilm size) other than 1920 x 1080 is applied by ffmpeg.
// Page errors fail the run. Fonts: the run fails when Sora is not loaded (text would be in a fallback face), unless
// --allow-fallback-fonts is given.
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { launch, openFilm, grab, dataBuf } from './browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const j = argv.indexOf('--' + k); return j < 0 ? d : (argv[j + 1] && !argv[j + 1].startsWith('--') ? argv[j + 1] : true); };
const file = argv[0];
if (!file || !/\.html?$/i.test(file)) { console.error('usage: node render.mjs film.html [film.mp4 | --stills T,T | --strip N | --seam | --sheet] [--workers N] [--fps 30] [--dir qa]'); process.exit(1); }
const outMp4 = argv[1] && !argv[1].startsWith('--') ? resolve(argv[1]) : null;
const cores = (os.availableParallelism ? os.availableParallelism() : os.cpus().length) || 4;
const workers = Math.max(1, Math.round(+opt('workers', 0)) || Math.min(8, cores));
const dir = resolve(String(opt('dir', resolve(dirname(resolve(file)), 'qa'))));
const browser = await launch();
const errLists = []; // each page's live list of page errors
const errs = { get length() { return errLists.reduce((n, l) => n + l.length, 0); }, all: () => errLists.flat() };
let INFO = null;
async function page() {
  const f = await openFilm(browser, file);
  errLists.push(f.errors);
  if (!INFO) {
    INFO = f.info;
    const ok = f.fonts && f.fonts.family && f.fonts.latin;
    if (!ok) { const msg = `fonts: Sora is not loaded (${JSON.stringify(f.fonts)}); text would draw in a fallback face. Build with --fonts local (npm i in the film folder).`; if (!opt('allow-fallback-fonts')) { console.error('FAIL ' + msg); await browser.close(); process.exit(1); } console.warn('WARNING ' + msg); }
    if (f.fonts && f.fonts.fallbackChars) console.log(`note: ${f.fonts.fallbackChars} are not in Sora and draw in the system fallback face (Inter or sans-serif)`);
  }
  return f.page;
}
const fail = () => { if (errs.length) { console.error('PAGE ERRORS:\n' + [...new Set(errs.all())].slice(0, 20).join('\n')); return true; } return false; };

async function tile(times, labels, out, o = {}) {
  const p = await page();
  const data = await p.evaluate(([times, labels, o]) => {
    const cols = o.cols || 2, w = o.w || 640, h = Math.round(w * 9 / 16), pad = 8, lab = 30; const rows = Math.ceil(times.length / cols);
    const cv = document.createElement('canvas'); cv.width = cols * (w + pad) + pad; cv.height = rows * (h + lab + pad) + pad;
    const g = cv.getContext('2d'); g.fillStyle = '#2A2A2E'; g.fillRect(0, 0, cv.width, cv.height);
    times.forEach((T, k) => { window.drawFrame(T); const x = pad + (k % cols) * (w + pad), y = pad + Math.floor(k / cols) * (h + lab + pad);
      g.fillStyle = '#FFF'; g.font = '600 20px sans-serif'; g.fillText(labels[k], x + 4, y + 21); g.drawImage(C, x, y + lab, w, h); });
    return cv.toDataURL('image/png');
  }, [times, labels, o]);
  mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, dataBuf(data)); console.log('wrote', out);
}

if (opt('stills')) {
  const p = await page(); mkdirSync(resolve(dir, 'stills'), { recursive: true });
  for (const T of String(opt('stills')).split(',').map(Number)) { const f = resolve(dir, 'stills', `${INFO.id}_${T.toFixed(2)}.png`); writeFileSync(f, dataBuf(await grab(p, T, 'image/png'))); console.log('wrote', f); }
} else if (opt('strip')) {
  await page(); const { BEAT, ART, K, N } = INFO;
  const b = +opt('strip') - 1; if (!(b >= 0 && b < N)) { console.error(`--strip takes a beat number 1..${N}`); process.exit(1); }
  const ts = [0, 0.35, 0.8, 1.5, 2.5, 3.5, 4.75, 5.99].map(t => t * ART / 6); // art time
  await tile(ts.map(t => b * BEAT + t / K), ts.map(t => `beat ${b + 1}  art t = ${t.toFixed(2)}  (screen ${(t / K).toFixed(2)} s)`), resolve(dir, `${INFO.id}_strip_${String(b + 1).padStart(2, '0')}.png`));
} else if (opt('seam')) {
  await page(); const L = INFO.LEN;
  if (!INFO.loop) { console.error('--seam: this film is not a loop (loop: false), so it has no seam'); process.exit(1); }
  const ts = [L - 3, L - 1.5, L - 0.5, L - 1 / INFO.fps, 0, 0.3, 0.8, 2.5];
  await tile(ts, ts.map(T => `T = ${T.toFixed(2)} s`), resolve(dir, `${INFO.id}_seam.png`));
} else if (opt('sheet')) {
  await page(); const { BEAT, ART, K, N } = INFO; const ta = Math.max(0, ART - 0.6);
  const ts = Array.from({ length: N }, (_, i) => i * BEAT + ta / K);
  await tile(ts, ts.map((T, i) => `beat ${i + 1}  (T = ${T.toFixed(2)} s)`), resolve(dir, `${INFO.id}_sheet.png`), { cols: Math.min(5, N), w: 480 });
} else if (outMp4) {
  await (await page()).close();
  const fps = +opt('fps', INFO.fps || 30), from = +opt('from', 0), to = +opt('to', INFO.LEN); const n = Math.round((to - from) * fps);
  const [ow, oh] = INFO.size; const scale = ow !== 1920 || oh !== 1080 ? ['-vf', `scale=${ow}:${oh}:flags=lanczos`] : [];
  mkdirSync(dirname(outMp4), { recursive: true });
  const per = Math.ceil(n / workers); const segs = []; const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(n, a + per); if (a >= b) return;
    const seg = `${outMp4}.part${w}.mp4`; segs[w] = seg;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', ...scale, '-c:v', 'libx264', '-preset', 'medium', '-crf', String(opt('crf', 16)), '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((ok, ko) => ff.on('close', c => (c ? ko(new Error('ffmpeg exit ' + c)) : ok())));
    const p = await page();
    for (let f = a; f < b; f++) {
      const d = dataBuf(await grab(p, from + f / fps));
      if (!ff.stdin.write(d)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 150 === 0) console.log(`${done}/${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      if (errs.length) break;
    }
    ff.stdin.end(); await closed; await p.close();
  }));
  if (!fail()) {
    const list = `${outMp4}.parts.txt`; writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
    await new Promise((ok, ko) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', outMp4], { stdio: 'inherit' }).on('close', c => (c ? ko(new Error('concat failed')) : ok())));
    segs.filter(Boolean).concat([list]).forEach(f => existsSync(f) && unlinkSync(f));
    console.log(`wrote ${outMp4}  (${n} frames at ${fps} fps = ${(n / fps).toFixed(3)} s, in ${((Date.now() - t0) / 1000).toFixed(0)} s with ${workers} workers)`);
  }
} else { console.error('nothing to do: give an output .mp4 or --stills, --strip N, --seam, --sheet'); process.exit(1); }
const bad = fail(); await browser.close(); process.exit(bad ? 1 : 0);
