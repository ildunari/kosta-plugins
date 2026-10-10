// Analysis: render a film's dry music and effects stems (no compressors, no limiter), for analyze_stems.py.
//   node sound/stems.mjs film.html|story.js [--out DIR]
//   -> DIR/<id>_music.f32, DIR/<id>_sfx.f32 (stereo float32, 48 kHz, one film or loop) and DIR/<id>_events.json
//      (the story's events with K, the screen seconds per art second, and the film length). DIR defaults to out_sound/.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { launch, openFilm } from '../browser.mjs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const j = argv.indexOf('--' + k); return j < 0 ? d : (argv[j + 1] ?? d); };
const input = argv[0];
if (!input || input.startsWith('--')) { console.error('usage: node sound/stems.mjs film.html|story.js [--out DIR]'); process.exit(1); }
const outDir = resolve(opt('out', resolve(dirname(resolve(input)), 'out_sound'))); mkdirSync(outDir, { recursive: true });
const browser = await launch();
const { page, info, errors } = await openFilm(browser, input, { fonts: false });
const r = await page.evaluate(() => window.renderStems({}));
const ev = await page.evaluate(() => (window.FILM.sound && window.FILM.sound.events) || []);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
for (const k of ['music', 'sfx']) writeFileSync(resolve(outDir, `${info.id}_${k}.f32`), Buffer.from(r[k], 'base64'));
writeFileSync(resolve(outDir, `${info.id}_events.json`), JSON.stringify({ id: info.id, K: info.BEAT / info.ART, LEN: info.LEN, sr: r.sr, events: ev }));
console.log(`stems written: ${outDir}/${info.id}_{music,sfx}.f32, ${info.id}_events.json`); await browser.close();
