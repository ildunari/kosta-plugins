// 3DLight smoke test: builds each story, draws stills, and fails on what would ruin a render.
//   node smoke_test.mjs [story.js ...] [--work DIR] [--fonts local|google|<node_modules dir>]
// Stories: the ones named, else ./story*.js in the current folder, else examples/story_*.js. Output goes to DIR
// (default ./qa_smoke): <id>.html, stills <id>_<T>.png, and a seam pair <id>_seam.png.
// Per film it checks, and FAILS on:
//   - a build error or any page error (exceptions, console errors);
//   - fonts: Sora not loaded, so text would draw in a fallback face (document.fonts: a Sora face with status 'loaded');
//   - blank or near-uniform frames: 6 stills (one held picture in each of 6 beats spread over the film), each must show
//     detail in the art area (x 940-1840, y 80-900) and a light ground (this style never uses dark grounds);
//   - a beat with no art: every beat's held picture (art only) must show more than the bare ground's glow;
//   - determinism: a still drawn again after the others must be identical (drawFrame(T) is a pure function of T);
//   - text that collides: headline, sub, stat and stat label must not overlap each other or leave the text column;
//   - the seam (loops only): the last beat's end picture must be the first beat's opening picture (art only, no text):
//     their difference must be no bigger than the art's ordinary frame-to-frame steps (90th percentile, at least 0.6/255);
//   - library effects (sound.fx) that the shared sound library does not have.
// It WARNS on characters Sora does not cover (they draw in the system fallback face) and on slow frames (> 400 ms).
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, openFilm, dataBuf } from './browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const j = argv.indexOf('--' + k); return j < 0 ? d : argv[j + 1]; };
const work = resolve(opt('work', 'qa_smoke')); mkdirSync(work, { recursive: true });
const fonts = opt('fonts', null);
const named = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const own = readdirSync('.').filter(f => /^story.*\.js$/.test(f)).map(f => resolve(f));
const stories = named.length ? named.map(f => resolve(f)) : own.length ? own : readdirSync(resolve(here, 'examples')).filter(f => /^story_.*\.js$/.test(f)).map(f => resolve(here, 'examples', f));

const browser = await launch();
let failed = 0;
for (const story of stories) {
  const P = [], warn = [], info = [];
  const html = resolve(work, basename(story).replace(/\.js$/, '') + '.html');
  try { execFileSync('python3', [resolve(here, 'build.py'), story, html, ...(fonts ? ['--fonts', fonts] : [])], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { P.push('build: ' + String(e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')); report(story, P, warn, info); continue; }
  let film;
  try { film = await openFilm(browser, html); } catch (e) { P.push('page: ' + String(e.message).split('\n').slice(0, 4).join(' | ')); report(story, P, warn, info); continue; }
  const { page, info: I, fonts: F, errors } = film;
  if (!(F && F.family && F.latin)) P.push(`fonts: Sora is not loaded (${JSON.stringify(F)}); build with --fonts local after npm i, or check the network for --fonts google`);
  if (F && F.fallbackChars) warn.push(`fonts: ${F.fallbackChars} not in Sora; they draw in the system fallback face (Inter or sans-serif)`);
  // library effects named in sound.fx
  const lib = await page.evaluate(() => { const fx = (window.FILM.sound && window.FILM.sound.fx) || []; const has = typeof SFXLIB === 'object' && SFXLIB && SFXLIB.fx; return { names: fx.map(c => c.fx), missing: fx.map(c => c.fx).filter(n => !(has && typeof SFXLIB.fx[n] === 'function')), has: !!has }; });
  if (lib.missing.length) P.push(`sound.fx: ${[...new Set(lib.missing)].join(', ')} not in the shared sound library${lib.has ? '' : ' (toolkit/sfxlib.js is missing)'}`);
  // stills: the held picture of 6 beats spread over the film
  const beats = [...new Set(Array.from({ length: 6 }, (_, k) => Math.round(k * (I.N - 1) / 5)))];
  const times = beats.map(i => +(i * I.BEAT + Math.max(0, I.ART - 0.6) / I.K).toFixed(3));
  while (times.length < 6) times.push(+(times.length * I.LEN / 6 + 0.37).toFixed(3));
  const stats = await page.evaluate(times => {
    const lum = (d, x0, y0, x1, y1) => { let s = 0, s2 = 0, n = 0, a = 0; for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * 1920 + x) * 4; const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; s2 += l * l; a += d[i + 3]; n++; } const m = s / n; return { mean: m, std: Math.sqrt(Math.max(0, s2 / n - m * m)), alpha: a / n }; };
    const out = []; let first = null;
    for (const T of times) {
      const t0 = Date.now(); window.drawFrame(T); const ms = Date.now() - t0;
      const d = C.getContext('2d').getImageData(0, 0, 1920, 1080).data; if (!first) first = new Uint8ClampedArray(d);
      out.push({ T, ms, all: lum(d, 0, 0, 1920, 1080), art: lum(d, 940, 80, 1840, 900), ground: lum(d, 0, 0, 1920, 60) });
    }
    window.drawFrame(times[0]); const d = C.getContext('2d').getImageData(0, 0, 1920, 1080).data; let diff = 0; for (let i = 0; i < d.length; i++) if (d[i] !== first[i]) diff++;
    return { out, redraw: diff };
  }, times);
  const bad = (f, msg) => { const l = stats.out.filter(f); if (l.length) P.push(`stills ${l.map(s => 'T=' + s.T).join(', ')}: ${msg(l[0])}`); };
  bad(s => s.all.alpha < 250, s => `transparent frame (alpha ${s.all.alpha.toFixed(0)}); the backdrop was not drawn`);
  bad(s => s.all.std < 4 || s.art.std < 3, s => `blank or near-uniform (luminance std ${s.all.std.toFixed(1)} overall, ${s.art.std.toFixed(1)} in the art area)`);
  bad(s => s.ground.mean < 170, s => `dark ground (top band luminance ${s.ground.mean.toFixed(0)} of 255); 3DLight grounds stay light`);
  if (stats.redraw) P.push(`determinism: T=${times[0]} drawn again after other frames differs in ${stats.redraw} bytes (state carried between frames?)`);
  // every beat draws art: its held picture (art only) must show detail in the art zone, not just the ground's glow
  const empty = await page.evaluate(([N, ta]) => Array.from({ length: N }, (_, i) => { window.drawArtFrame(i, ta); const d = C.getContext('2d').getImageData(940, 80, 900, 820).data; let s = 0, s2 = 0, n = 0; for (let k = 0; k < d.length; k += 8) { const l = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; s += l; s2 += l * l; n++; } const m = s / n; return Math.sqrt(Math.max(0, s2 / n - m * m)); }), [I.N, Math.max(0, I.ART - 0.6)]);
  const bare = empty.map((v, i) => [i + 1, v]).filter(([, v]) => v < 7);
  if (bare.length) P.push(`art: beat ${bare.map(([i]) => i).join(', ')} draws nothing in the art zone (luminance std ${bare.map(([, v]) => v.toFixed(1)).join('/')}, the bare ground is about 4); every beat needs art`);
  const slow = stats.out.slice(1).filter(s => s.ms > 400); if (slow.length) warn.push(`speed: ${slow.map(s => `T=${s.T} ${s.ms} ms`).join(', ')} (cache static parts; keep a frame under about 250 ms)`);
  info.push(`stills ${times.join(', ')} s, art-area detail ${stats.out.map(s => s.art.std.toFixed(0)).join('/')}, ${Math.round(stats.out.slice(1).reduce((a, s) => a + s.ms, 0) / Math.max(1, stats.out.length - 1))} ms per frame`);
  for (const T of times) { const d = await page.evaluate(T => { window.drawFrame(T); return C.toDataURL('image/png'); }, T); writeFileSync(resolve(work, `${I.id}_${T.toFixed(2)}.png`), dataBuf(d)); }
  // text layout
  const lay = await page.evaluate(n => Array.from({ length: n }, (_, i) => window.textLayout(i)), I.N);
  lay.forEach((boxes, i) => {
    const col = boxes.filter(b => b.kind !== 'note');
    col.forEach(b => { if (b.x1 > 925) P.push(`text: beat ${i + 1} ${b.kind} runs to x ${b.x1}, into the art (the text column ends near 920)`); });
    for (let a = 0; a < col.length; a++) for (let b = a + 1; b < col.length; b++) { const A = col[a], B = col[b]; if (A.y1 > B.y0 && B.y1 > A.y0 && A.x1 > B.x0 && B.x1 > A.x0) P.push(`text: beat ${i + 1} ${A.kind} (y ${A.y0}-${A.y1}) overlaps ${B.kind} (y ${B.y0}-${B.y1}); shorten the words or drop the sub or stat`); }
  });
  // seam (the loop rule): the last beat's end picture must be the first beat's opening picture. Compared on the art
  // alone (backdrop + art, no text), against the art's ordinary frame-to-frame steps.
  if (I.loop) {
    const fps = I.fps || 30, da = I.K / fps; // one frame in art time
    const pairs = [[[I.N - 1, I.ART], [0, 0]]];
    for (let i = 0; i < I.N; i++) for (const ta of [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]) pairs.push([[i, ta], [i, ta + da]]);
    const diffs = await page.evaluate(pairs => {
      const grabA = ([i, t]) => { window.drawArtFrame(i, t); return C.getContext('2d').getImageData(0, 0, 1920, 1080).data.slice(); };
      return pairs.map(([a, b]) => { const A = grabA(a), B = grabA(b); let s = 0; for (let k = 0; k < A.length; k += 4) s += Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]); return s / (A.length / 4 * 3); });
    }, pairs);
    const seam = diffs[0], ord = diffs.slice(1).sort((a, b) => a - b), p90 = ord[Math.floor(ord.length * 0.9)], med = ord[Math.floor(ord.length / 2)];
    const limit = Math.max(0.6, p90);
    (seam > limit ? P : info).push(`seam: last beat's end picture vs first beat's opening ${seam.toFixed(3)}, ordinary art steps median ${med.toFixed(3)}, 90th pct ${p90.toFixed(3)} (limit ${limit.toFixed(3)})` + (seam > limit ? '; the last beat must end on the first beat\'s opening picture' : ''));
    const d = await page.evaluate(([N, ART]) => { const cv = document.createElement('canvas'); cv.width = 1928; cv.height = 548; const g = cv.getContext('2d'); g.fillStyle = '#2A2A2E'; g.fillRect(0, 0, cv.width, cv.height); window.drawArtFrame(N - 1, ART); g.drawImage(C, 4, 4, 956, 538); window.drawArtFrame(0, 0); g.drawImage(C, 968, 4, 956, 538); return cv.toDataURL('image/png'); }, [I.N, I.ART]);
    writeFileSync(resolve(work, `${I.id}_seam.png`), dataBuf(d));
  }
  if (errors.length) P.push(...[...new Set(errors)].slice(0, 8).map(e => 'page error: ' + e));
  await page.close();
  report(story, P, warn, info, I);
}
function report(story, P, warn, info, I) {
  console.log(`\n${P.length ? 'FAIL' : 'PASS'}  ${basename(story)}${I ? `  (${I.id}: ${I.N} beats, ${I.LEN} s${I.loop ? ' loop' : ''})` : ''}`);
  P.forEach(l => console.log('  FAIL  ' + l)); warn.forEach(l => console.log('  warn  ' + l)); info.forEach(l => console.log('  ok    ' + l));
  if (P.length) failed++;
}
await browser.close();
console.log(`\n${stories.length - failed}/${stories.length} films passed  (output in ${work})`);
process.exit(failed ? 1 : 0);
