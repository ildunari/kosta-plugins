// Render a 3DLight film's sound to WAV, normalized to -16 LUFS, and optionally mux it onto the rendered video.
//   node sound/render_sound.mjs film.html|story.js [--out DIR]
//        -> DIR/<id>.wav (the film, or one loop, 48 kHz 16-bit stereo) + loudness report + <id>_spectrum.png, <id>_wave.png
//   node sound/render_sound.mjs film.html --mux film.mp4 [--long N]
//        -> also DIR/<id>_sound.mp4 (video + AAC 192k) and, for a loop, DIR/<id>_sound_long.mp4: N loops (default: as many
//           as fit in 10 minutes, 13 for a 45 s loop), video repeated by stream copy, audio repeated sample-exactly
//           before one AAC encode, so there is no gap at the repeats
// DIR defaults to out_sound/ next to the input. A 45 s loop takes about 4 minutes (two passes are rendered offline).
// Loudness: integrated loudness is measured on the film played three times (for a loop, the edges then count as they
// will on repeat), one gain brings it to TARGET, and the true peak is then held under CEIL.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, openFilm } from '../browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const j = argv.indexOf('--' + k); return j < 0 ? d : (argv[j + 1] && !argv[j + 1].startsWith('--') ? argv[j + 1] : true); };
const input = argv[0];
if (!input || input.startsWith('--')) { console.error('usage: node sound/render_sound.mjs film.html|story.js [--out DIR] [--mux film.mp4] [--long N]'); process.exit(1); }
const TARGET = -16, CEIL = -1.5;
const outDir = resolve(opt('out', resolve(dirname(resolve(input)), 'out_sound'))); mkdirSync(outDir, { recursive: true });

const sh = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status) { console.error(r.stderr); throw new Error(cmd + ' failed'); } return r.stderr + r.stdout; };
function wav(file, b64, sr) {
  const pcm = Buffer.from(b64, 'base64'); const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(file, Buffer.concat([h, pcm]));
}
function measure(file) { // integrated LUFS, true peak and loudness range of the file played 3x
  const s = sh('ffmpeg', ['-hide_banner', '-nostats', '-stream_loop', '2', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const I = +s.match(/I:\s+(-?[\d.]+) LUFS/g).pop().match(/-?[\d.]+/)[0]; const TP = +s.match(/Peak:\s+(-?[\d.]+) dBFS/g).pop().match(/-?[\d.]+/)[0];
  const LRA = +(s.match(/LRA:\s+(-?[\d.]+) LU/g) || ['0']).pop().match(/-?[\d.]+/)[0];
  return { I, TP, LRA };
}

const browser = await launch();
const film = await openFilm(browser, input, { fonts: false });
const { page, info, errors } = film; const id = info.id;
const fail = () => { if (errors.length) { console.error('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n')); return true; } return false; };
const t0 = Date.now();
const raw = resolve(outDir, `_${id}_raw.wav`), fin = resolve(outDir, `${id}.wav`);
let r = await page.evaluate(() => window.renderSound({}));
if (fail()) process.exit(1);
wav(raw, r.b64, r.sr); let m = measure(raw);
let g = Math.pow(10, (TARGET - m.I) / 20); if (m.TP + 20 * Math.log10(g) > CEIL) g = Math.pow(10, (CEIL - m.TP) / 20);
r = await page.evaluate(g => window.renderSound({ gain: g, reuse: true }), g);
wav(fin, r.b64, r.sr); m = measure(fin);
console.log(`${id}: ${m.I.toFixed(1)} LUFS, true peak ${m.TP.toFixed(1)} dBTP, LRA ${m.LRA.toFixed(1)} LU, gain ${(20 * Math.log10(g)).toFixed(1)} dB, ${info.LEN} s${info.loop ? ' loop' : ''} -> ${fin}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
sh('ffmpeg', ['-y', '-v', 'error', '-i', fin, '-lavfi', 'showspectrumpic=s=1800x500:legend=1:scale=log:fscale=log:stop=12000', resolve(outDir, `${id}_spectrum.png`)]);
sh('ffmpeg', ['-y', '-v', 'error', '-i', fin, '-filter_complex', 'showwavespic=s=1800x300:split_channels=1:colors=0x3a7bd5|0x14917f', '-frames:v', '1', resolve(outDir, `${id}_wave.png`)]);
const mux = opt('mux', null);
if (mux) {
  const vid = resolve(String(mux)), one = resolve(outDir, `${id}_sound.mp4`);
  sh('ffmpeg', ['-y', '-v', 'error', '-i', vid, '-i', fin, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', one]);
  console.log('wrote', one);
  if (info.loop) {
    const n = +opt('long', Math.max(2, Math.floor(600 / info.LEN))), long = resolve(outDir, `${id}_sound_long.mp4`);
    sh('ffmpeg', ['-y', '-v', 'error', '-stream_loop', String(n - 1), '-i', vid, '-stream_loop', String(n - 1), '-i', fin, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(n * info.LEN), '-movflags', '+faststart', long]);
    console.log('wrote', long, `(${n} loops, ${n * info.LEN} s)`);
  }
}
const bad = fail(); await browser.close(); process.exit(bad ? 1 : 0);
