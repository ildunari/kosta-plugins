// voice_test.mjs — tests for the narration tool (toolkit/voice.mjs). No network, no keys, no cost: it uses the fake
// voice and small pretend Gemini, OpenAI, Grok, ElevenLabs, Inworld and proxy servers on this machine.
// usage: node tests/doodle-art-animation/voice_test.mjs [--keep]
// Prints one PASS / FAIL / SKIP line per check and exits 1 if any check failed. It needs Node 18+; ffmpeg (loudness
// cross-check, MP3 auditions) and openssl (the proxy test) are used when present and skipped when not.
import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import https from 'https'; import net from 'net';
import { spawn, spawnSync } from 'child_process'; import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VOICE = path.resolve(HERE, '../../plugins/doodle-art-animation/skills/doodle-art-animation/toolkit/voice.mjs');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'doodle-voice-test-'));
const KEEP = process.argv.includes('--keep');
const results = [];
const check = (name, ok, detail = '') => { results.push([ok ? 'PASS' : 'FAIL', name, ok ? '' : detail]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -- ' + detail}`); };
const skip = (name, why) => { results.push(['SKIP', name, why]); console.log(`SKIP  ${name}  -- ${why}`); };
const has = (cmd, arg = '-version') => spawnSync(cmd, [arg], { stdio: 'ignore' }).status === 0;
const FAKE_KEY = 'AIzaSyTEST-not-a-real-key-000000000000000';

// a clean environment: no real keys, no proxy, a keys file of our own
const BASE_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) =>
  !/^(GEMINI_API_KEY|GOOGLE_API_KEY|OPENAI_API_KEY|OPENAI_BASE_URL|XAI_API_KEY|ELEVENLABS_API_KEY|INWORLD_API_KEY|DOODLE_|CLAUDE_PLUGIN_OPTION_|https?_proxy|HTTPS?_PROXY|NO_PROXY|no_proxy)/.test(k)));
BASE_ENV.DOODLE_KEYS_FILE = path.join(WORK, 'no-keys.env');
BASE_ENV.DOODLE_TTS_COOLDOWN = '0.05';
function run(dir, args, env = {}) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [VOICE, ...args, '--dir', dir], { env: { ...BASE_ENV, ...env } });
    let out = '', err = '';
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
    p.on('close', code => resolve({ code, out, err, all: out + err }));
  });
}
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
function wavInfo(file) {
  const b = fs.readFileSync(file);
  return { riff: b.toString('ascii', 0, 4) === 'RIFF', ch: b.readUInt16LE(22), rate: b.readUInt32LE(24), bits: b.readUInt16LE(34), dur: b.readUInt32LE(40) / (b.readUInt32LE(24) * 2) };
}
// PCM that looks like speech to the tool: one 150 Hz burst per sentence, 0.45 s apart
function tonePcm(text, rate = 24000) {
  const sents = text.split(/(?<=[.!?])\s+/).filter(Boolean), parts = [];
  const push = (sec, amp) => { const n = Math.round(sec * rate), b = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp * Math.sin(2 * Math.PI * 150 * i / rate) * Math.sin(Math.PI * i / n) ** 0.3 * 32767), i * 2); parts.push(b); };
  push(0.2, 0);
  sents.forEach((s, i) => { if (i) push(0.45, 0); push(0.3 + s.split(/\s+/).length * 0.4, 0.3); });
  push(0.3, 0);
  return Buffer.concat(parts);
}
function wavOf(pcm, rate = 24000, badSize = false) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(badSize ? 0xFFFFFFFF : 36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(badSize ? 0xFFFFFFFF : pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
function listen(server) { return new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port))); }

const SCRIPT = `# Script · Test Film

**Numbering.** 0 -> P0, I -> P1, II -> P2, End -> P3.

## Plate table

| # | Plate (world) | Dur | Enter | Beats |
|---|---|---|---|---|
| 0 | Title (paper) | 6.5 | – | title types |
| I | Into the Blood (paper) | 4.0 | through 1.8 | stat at {count} |
| II | The Corona (night) | 30 | lensIn 1.4 | callout |
| End | End card (night) | 5.0 | shape 1.6 | quote |

Total: 6.5 + 4.0 + 30 + 5.0 = **45.5 s**.

## Narration

### 0 · Title
(none)

### I · Into the Blood
One particle slips into the vein. [short pause]
It is one of {count}about four hundred and thirty billion in a single milligram.

### II · The Corona
@direction: Say slowly, with wonder:
Within seconds, proteins from the blood {coat}land on its PEG surface, one by one, until the particle wears a {corona}corona. Meloxicam waits inside.

### End · End card
Same polymer, same drug, and a {slow}slower road out for every molecule.

## Pronunciation

- meloxicam: mel-OX-ih-kam
- PEG: peg
`;
function film(name, script = SCRIPT) { const d = path.join(WORK, name); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'script.md'), script); return d; }

// ---------------------------------------------------------------- lines
{
  const d = film('lines');
  const r = await run(d, ['lines', 'script.md', '--provider', 'fake']);
  check('lines: exits 0', r.code === 0, r.all);
  const L = fs.existsSync(path.join(d, 'vo/lines.json')) ? readJson(path.join(d, 'vo/lines.json')) : { units: [] };
  check('lines: one unit per narrated plate, numbered by position', JSON.stringify(L.units.map(u => [u.id, u.plate, u.key])) === JSON.stringify([['P1', 1, 'I'], ['P2', 2, 'II'], ['P3', 3, 'End']]), JSON.stringify(L.units));
  check('lines: marks stay in the text', /\{count\}about/.test(L.units[0]?.text || ''), L.units[0]?.text);
  check('lines: @direction applies to its plate only', L.units[1]?.direction === 'Say slowly, with wonder:' && !L.units[0]?.direction, JSON.stringify(L.units));
  check('lines: pronunciation list read', L.pronounce?.meloxicam === 'mel-OX-ih-kam' && L.pronounce?.PEG === 'peg', JSON.stringify(L.pronounce));
  check('lines: the table says plate I is too short for its words', /P1\s+I\s.*short/.test(r.out), r.out);
  check('lines: provider and default voice written', L.provider === 'fake' && L.voice === 'fake-a' && L.style === 'documentary', JSON.stringify(L));
  for (const [name, text, want] of [
    ['a mark used twice', 'One {a}word and {a}another.', /used twice/],
    ['a mark with no word after it', 'One word at the end {late}', /no word after it/],
  ]) {
    const e = film('lines-bad-' + name.replace(/\W+/g, '-'), SCRIPT.replace('Same polymer, same drug, and a {slow}slower road out for every molecule.', text));
    const x = await run(e, ['lines', 'script.md', '--provider', 'fake']);
    check(`lines: refuses ${name}`, x.code === 2 && want.test(x.err), x.all);
  }
  const e = film('lines-bad-key', SCRIPT.replace('### End · End card', '### Credits · End card'));
  const x = await run(e, ['lines', 'script.md', '--provider', 'fake']);
  check('lines: refuses a block for a plate that is not in the table', x.code === 2 && /not a plate/.test(x.err), x.all);
  const n = film('lines-none', '# Script\n\nNo narration here.\n');
  const y = await run(n, ['lines', 'script.md']);
  check('lines: explains a missing Narration section', y.code === 2 && /## Narration/.test(y.err), y.all);
  const f = film('lines-edge', SCRIPT.replace('Meloxicam waits inside.', 'Meloxicam waits inside.\n1953 — the year the double helix was found.\n<!-- TODO: check\nthe pacing here -->\nIt waits.')
    .replace('| I | Into the Blood (paper) | 4.0 |', '| I | Into the Blood (paper) | 4–6 |'));
  const z = await run(f, ['lines', 'script.md', '--provider', 'fake']);
  const Z = fs.existsSync(path.join(f, 'vo/lines.json')) ? readJson(path.join(f, 'vo/lines.json')) : { units: [] };
  check('lines: a narration line starting "1953 —" is not a new plate', z.code === 0 && Z.units.map(u => u.id).join() === 'P1,P2,P3' && /1953 — the year .* It waits\.$/.test(Z.units[1]?.text || ''), z.all + JSON.stringify(Z.units));
  check('lines: an HTML comment over several lines is not spoken', !/TODO|pacing/.test(JSON.stringify(Z.units)), JSON.stringify(Z.units));
  check('lines: a Dur range is read as its upper end', /^P1\s+I\s.*\s6\.0 s\s/m.test(z.out), z.out);
  fs.writeFileSync(path.join(f, 'script.md'), fs.readFileSync(path.join(f, 'script.md'), 'utf8').replace('@direction: Say slowly, with wonder:\n', '').replace('- PEG: peg\n', ''));
  const z2 = await run(f, ['lines', 'script.md']), Z2 = readJson(path.join(f, 'vo/lines.json'));
  check('lines: an @direction or pronunciation taken out of script.md is gone', z2.code === 0 && Z2.units[1].direction === undefined && !('PEG' in Z2.pronounce) && Z2.pronounce.meloxicam, JSON.stringify(Z2));
  const bad = await run(f, ['generate', '--retakes', 'abc']);
  check('options: a --retakes that is not a number is refused (exit 2)', bad.code === 2 && /--retakes needs a whole number/.test(bad.err), bad.all);
}

// ---------------------------------------------------------------- generate, cache, check, lock with the fake voice
let ffmpegClip = null;
{
  const d = film('fake');
  await run(d, ['lines', 'script.md', '--provider', 'fake']);
  const g = await run(d, ['generate']);
  check('generate: exits 0', g.code === 0, g.all);
  const V = readJson(path.join(d, 'vo/voice.json'));
  check('voice.json: version 1, provider, not locked', V.version === 1 && V.provider === 'fake' && V.locked === false && Array.isArray(V.units), JSON.stringify(V).slice(0, 300));
  check('voice.json: one unit per narrated plate', V.units.map(u => u.id).join() === 'P1,P2,P3', V.units.map(u => u.id).join());
  let ok = true, why = '';
  for (const u of V.units) {
    const f = path.join(d, u.file), w = fs.existsSync(f) ? wavInfo(f) : null;
    if (!w || !w.riff || w.ch !== 1 || w.bits !== 16 || Math.abs(w.dur - u.dur) > 0.01) { ok = false; why += `${u.id} wav ${JSON.stringify(w)}; `; }
    if (Math.abs(u.lufs - -20) > 0.3) { ok = false; why += `${u.id} lufs ${u.lufs}; `; }
    if (!/^vo\/clips\/[0-9a-f]{12}\.wav$/.test(u.file) || u.plate !== +u.id.slice(1)) { ok = false; why += `${u.id} file/plate ${u.file} ${u.plate}; `; }
    if (!u.sentences.every(s => s.length === 3 && typeof s[2] === 'string' && s[0] < s[1] && s[1] <= u.dur)) { ok = false; why += `${u.id} sentences ${JSON.stringify(u.sentences)}; `; }
    if (u.sentences[0][0] > 0.06 || u.dur - u.sentences.at(-1)[1] > 0.2) { ok = false; why += `${u.id} trim ${u.sentences[0][0]} ${u.dur - u.sentences.at(-1)[1]}; `; }
  }
  check('clips: mono 16-bit WAV, -20 LUFS, trimmed, sentences as [start, end, text]', ok, why);
  ffmpegClip = path.join(WORK, 'ebur128.wav'); fs.copyFileSync(path.join(d, V.units[1].file), ffmpegClip);   // later tests re-level the film's clips
  let worst = 0;
  for (const u of V.units) { const m = readJson(path.join(d, 'vo/clips', u.fp + '.json')); u.sentences.forEach((s, i) => { worst = Math.max(worst, Math.abs(s[0] - m.truth[i][0]), Math.abs(s[1] - m.truth[i][1])); }); }
  check('timing: sentence times found from the pauses within 0.05 s', worst <= 0.05, `worst error ${worst.toFixed(3)} s`);
  const p1 = V.units[0], p2 = V.units[1];
  check('marks: each mark lands inside its sentence', p1.marks.count > p1.sentences[1][0] && p1.marks.count < p1.sentences[1][1]
    && p2.marks.coat > p2.sentences[0][0] && p2.marks.corona > p2.marks.coat && p2.marks.corona < p2.sentences[0][1], JSON.stringify([p1.marks, p2.marks, p1.sentences, p2.sentences]));
  check('marks and tags are not in the spoken text', !/[{}[\]]/.test(V.units.map(u => u.text).join(' ')), V.units.map(u => u.text).join(' '));
  const side = readJson(path.join(d, 'vo/clips', p2.fp + '.json'));
  check('pronunciation: the respelling is what was sent', /mel-OX-ih-kam waits/.test(side.sent) && /its peg surface/.test(side.sent), side.sent);
  check('timing label: silence+estimate for a whole-plate clip', V.units.every(u => u.timing === 'silence+estimate'), V.units.map(u => u.timing).join());

  const clips = () => fs.readdirSync(path.join(d, 'vo/clips')).filter(f => f.endsWith('.wav')).length, before = clips();
  const g2 = await run(d, ['generate']);
  check('cache: generating again makes no new clips', g2.code === 0 && clips() === before && !/new clip/.test(g2.err), g2.all);
  const L = readJson(path.join(d, 'vo/lines.json'));
  L.units[2].text = 'Same polymer, same drug, and a {slow}much slower road out.';
  fs.writeFileSync(path.join(d, 'vo/lines.json'), JSON.stringify(L, null, 2));
  const c = await run(d, ['check']);
  check('check: an edited plate without a new clip is stale (exit 1)', c.code === 1 && /stale/.test(c.out), c.all);
  const g3 = await run(d, ['generate']);
  check('cache: editing one plate regenerates only that plate', g3.code === 0 && /1 new clip .*P3\b/.test(g3.err) && clips() === before + 1, g3.all);
  const c2 = await run(d, ['check']);
  check('check: exits 0 when every clip is fresh and passes', c2.code === 0, c2.all);

  const lk = await run(d, ['lock']);
  const V2 = readJson(path.join(d, 'vo/voice.json')), md = fs.readFileSync(path.join(d, 'script.md'), 'utf8');
  const durOf = key => parseFloat(md.split('\n').find(l => l.startsWith(`| ${key} |`)).split('|')[3]);
  const need1 = V2.units[0].lead + V2.units[0].dur + V2.units[0].tail;
  check('lock: voice.json locked', lk.code === 0 && V2.locked === true && !!V2.locked_at, lk.all);
  check('lock: a plate the voice outgrew is lengthened in script.md', durOf('I') >= need1 - 0.001 && durOf('I') < need1 + 0.11, `Dur ${durOf('I')}, needs ${need1}`);
  check('lock: a plate with room to spare keeps its Dur', durOf('II') === 30 && durOf('0') === 6.5, md);
  const tot = md.match(/^Total: (.*) = \*\*([\d.]+) s\*\*/m);
  check('lock: the Total line is recomputed', !!tot && Math.abs(+tot[2] - (6.5 + durOf('I') + 30 + durOf('End'))) < 0.01, tot?.[0]);
  const lk2 = await run(d, ['lock']);
  check('lock: locking again changes nothing', lk2.code === 0 && fs.readFileSync(path.join(d, 'script.md'), 'utf8') === md, lk2.all);

  const au = await run(d, ['audition', '--voices', 'fake-a,fake-b']);
  const aj = fs.existsSync(path.join(d, 'vo/audition/audition.json')) ? readJson(path.join(d, 'vo/audition/audition.json')) : { results: [], lines: [] };
  check('audition: two files, a table and the glossary line', au.code === 0 && aj.results.length === 2 && aj.results.every(x => fs.existsSync(path.join(d, x.file)))
    && fs.existsSync(path.join(d, 'vo/audition/audition.md')) && aj.lines.some(l => /meloxicam, PEG/.test(l)), au.all);
  check('audition: no pause tag leads a line', aj.lines.every(l => !/^\[/.test(l)), JSON.stringify(aj.lines));

  const vj = () => readJson(path.join(d, 'vo/voice.json'));
  const rt = await run(d, ['generate', '--retake', 'P1'], { DOODLE_TTS_FAKE_FAULT: 'P1:slow' });
  check('lock: a new take of a locked plate unlocks voice.json', vj().locked === false && vj().units[0].take > V2.units[0].take, rt.all + JSON.stringify(vj()).slice(0, 200));
  await run(d, ['generate', '--retake', 'P1']);
  const relock = await run(d, ['lock']);
  const L2 = readJson(path.join(d, 'vo/lines.json')), oldText = vj().units[2].text;
  L2.units[2].text = 'Same polymer, same drug, and a {slow}far slower road out.';
  fs.writeFileSync(path.join(d, 'vo/lines.json'), JSON.stringify(L2, null, 2));
  const ck = await run(d, ['check']), lk3 = await run(d, ['lock']);
  check('lock: an edit after locking unlocks, and lock then refuses', relock.code === 0 && ck.code === 1 && lk3.code === 1 && vj().locked === false, ck.all + lk3.all);
  check('stale: a stale plate keeps the words and times of its own clip', vj().units[2].text === oldText && vj().units[2].checks.flags[0].startsWith('fail: stale'), JSON.stringify(vj().units[2]));
  L2.units[2].text = 'Same polymer, same drug, and a {slow}much slower road out.'; L2.lufs = -16;
  fs.writeFileSync(path.join(d, 'vo/lines.json'), JSON.stringify(L2, null, 2));
  const n0 = clips(), lu = await run(d, ['check']);
  check('loudness: a new lufs target re-levels the cached clips without new ones', lu.code === 0 && clips() === n0 && vj().units.every(u => Math.abs(u.lufs + 16) <= 0.3), lu.all + vj().units.map(u => u.lufs).join());
}

// ---------------------------------------------------------------- failures and retakes
{
  const d = film('faults');
  await run(d, ['lines', 'script.md', '--provider', 'fake']);
  const g = await run(d, ['generate'], { DOODLE_TTS_FAKE_FAULT: 'P1:silent-once' });
  const V = readJson(path.join(d, 'vo/voice.json'));
  check('retake: a silent first take is retaken automatically', g.code === 0 && /retaking P1/.test(g.err) && V.units[0].take === 2 && !V.units[0].checks.flags.length, g.all);
  const s = await run(d, ['generate', '--retake', 'P2', '--retakes', '0'], { DOODLE_TTS_FAKE_FAULT: 'P2:silent' });
  const V2 = readJson(path.join(d, 'vo/voice.json'));
  check('check: a silent clip fails (exit 1)', s.code === 1 && V2.units[1].checks.flags.some(f => /^fail: no speech/.test(f)), s.all);
  const l = await run(d, ['lock']);
  check('lock: refuses while a clip fails', l.code === 1 && readJson(path.join(d, 'vo/voice.json')).locked === false, l.all);
  const sl = await run(d, ['generate', '--retake', 'P2', '--retakes', '0'], { DOODLE_TTS_FAKE_FAULT: 'P2:slow' });
  check('check: a clip far longer than its words fails', sl.code === 1 && /fail: .*expected/.test(sl.out), sl.all);
  const gp = await run(d, ['generate', '--retake', 'P2'], { DOODLE_TTS_FAKE_FAULT: 'P2:gap' });
  check('check: an unplanned long silence is flagged', gp.code === 0 && /warn: [\d.]+ s of silence/.test(gp.out), gp.all);
  const ld = await run(d, ['generate', '--retake', 'P3'], { DOODLE_TTS_FAKE_FAULT: 'P3:loud' });
  check('check: a take much louder than the others is flagged', /P3.*louder than the others|louder than the others/.test(ld.out), ld.all);
}

// ---------------------------------------------------------------- Gemini request format, retries and key handling
{
  const seen = []; let mode = 'ok', calls = 0;
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => {
      calls++;
      const j = body ? JSON.parse(body) : {}; seen.push({ url: req.url, headers: req.headers, body: j });
      const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (mode === '429-once' && calls === 1) return send(429, { error: { code: 429, details: [{ retryDelay: '0.05s' }] }, retryDelay: '0.05s' });
      if (mode === 'text-once' && calls === 1) return send(200, { candidates: [{ content: { parts: [{ text: 'I cannot read that.' }] }, finishReason: 'OTHER' }] });
      if (req.method === 'GET') return send(200, { models: [], data: [] });
      if (mode === '403') return send(403, { error: { code: 403, message: `API key not valid: ${req.headers['x-goog-api-key'] || 'none'}` } });
      const text = j.contents[0].parts[0].text.replace(/^Say[^:]*:\s*/, '').replace(/\[[^\]]*\]/g, '');
      send(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: tonePcm(text).toString('base64') } }] } }],
        usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 250 } });
    });
  });
  const port = await listen(srv), env = { DOODLE_GEMINI_BASE_URL: `http://127.0.0.1:${port}/v1beta` };
  const d = film('gemini');
  await run(d, ['lines', 'script.md', '--provider', 'gemini']);
  mode = '429-once'; calls = 0;
  const g = await run(d, ['generate', '--jobs', '1'], env);
  check('gemini: generate works against the API format', g.code === 0, g.all);
  const req = seen.find(s => s.body.contents?.[0]?.parts?.[0]?.text?.includes('vein'));
  const cfg = req?.body.generationConfig;
  check('gemini: the model is in the URL and the voice in speechConfig', /\/v1beta\/models\/gemini-3\.1-flash-tts-preview:generateContent$/.test(req?.url || '')
    && cfg?.responseModalities?.[0] === 'AUDIO' && cfg?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName === 'Charon', JSON.stringify(req));
  const t = req?.body.contents[0].parts[0].text || '';
  check('gemini: direction first, pause tags kept, marks removed', /^Say in a calm, measured voice, at a natural conversational pace: One particle/.test(t) && t.includes('[short pause]') && !/[{}]/.test(t), t);
  check('gemini: no key header when no key is set (the cloud proxy may add it)', seen.every(s => !('x-goog-api-key' in s.headers)), JSON.stringify(seen.map(s => Object.keys(s.headers))));
  check('gemini: a 429 is waited out and retried', /rate-limiting/.test(g.err) && seen.length >= 4, g.all);
  check('gemini: the per-plate direction is sent for that plate', seen.some(s => /^Say slowly, with wonder: Within seconds/.test(s.body.contents?.[0]?.parts?.[0]?.text || '')), '');
  const V = readJson(path.join(d, 'vo/voice.json'));
  check('gemini: 24 kHz clips with sentence times from the pauses', V.units.every(u => wavInfo(path.join(d, u.file)).rate === 24000) && V.units[0].sentences.length === 2
    && V.units[0].sentences[1][0] > V.units[0].sentences[0][1], JSON.stringify(V.units[0]));
  check('gemini: cost estimated from the token counts', /about \$0\.0\d+/.test(g.out), g.out);
  const GL = readJson(path.join(d, 'vo/lines.json')); GL.units[0].speed = 0.8; fs.writeFileSync(path.join(d, 'vo/lines.json'), JSON.stringify(GL, null, 2));
  const n0 = seen.length, sp = await run(d, ['generate'], env);
  check('gemini: a speed is ignored with a warning, not paid for with a new take', sp.code === 0 && /no speed setting/.test(sp.err) && seen.length === n0, sp.all);

  mode = 'text-once'; calls = 0; seen.length = 0;
  const tx = await run(d, ['generate', '--retake', 'P1', '--jobs', '1'], env);
  check('gemini: an answer without audio is asked again', tx.code === 0 && seen.length === 2 && /retaking P1/.test(tx.err), tx.all);

  mode = '403'; seen.length = 0;
  const e1 = await run(d, ['generate', '--retake', 'P1'], env);
  check('gemini: a 403 with no key says which variable to set (exit 2)', e1.code === 2 && /no key was found\. Set GEMINI_API_KEY/.test(e1.err) && /keys\.env/.test(e1.err), e1.all);
  const e2 = await run(d, ['generate', '--retake', 'P1'], { ...env, GEMINI_API_KEY: FAKE_KEY });
  check('gemini: a key in the environment is sent as x-goog-api-key', seen.some(s => s.headers['x-goog-api-key'] === FAKE_KEY), '');
  check('gemini: a refused key says where it came from', e2.code === 2 && /refused the key found in the GEMINI_API_KEY environment variable/.test(e2.err), e2.all);
  check('keys: a key echoed back by the provider is never printed', !e2.all.includes(FAKE_KEY) && e2.all.includes('[hidden]'), e2.all);
  const kf = path.join(WORK, 'keys.env');
  fs.writeFileSync(kf, `# test\nexport GEMINI_API_KEY="${FAKE_KEY}"\nOPENAI_API_KEY=sk-test-${'x'.repeat(30)}\n`); fs.chmodSync(kf, 0o644);
  const k = await run(d, ['keys'], { DOODLE_KEYS_FILE: kf });
  check('keys: keys.env is read and named, never printed', k.code === 0 && k.out.includes(`found in ${kf}`) && !k.all.includes(FAKE_KEY) && !k.all.includes('sk-test-'), k.all);
  check('keys: warns when keys.env can be read by other users', /chmod 600/.test(k.err), k.all);
  mode = 'ok'; seen.length = 0;
  const kt = await run(d, ['keys', '--test'], { ...env, DOODLE_KEYS_FILE: kf, OPENAI_BASE_URL: `http://127.0.0.1:${port}/v1`, DOODLE_TTS_BASE_URL: `http://127.0.0.1:${port}/v1` });
  check('keys --test: a free request with the key from keys.env', /Gemini: works \(key from/.test(kt.out) && seen.some(s => s.headers['x-goog-api-key'] === FAKE_KEY && /models\?pageSize=1/.test(s.url)), kt.all);
  srv.close();
}

// ---------------------------------------------------------------- narrator presets (Gemini voice + delivery)
{
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => {
      const j = body ? JSON.parse(body) : {}; seen.push(j);
      const text = j.contents[0].parts[0].text.replace(/^Say[^:]*:\s*/, '').replace(/\[[^\]]*\]/g, '');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: tonePcm(text).toString('base64') } }] } }],
        usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 250 } }));
    });
  });
  const port = await listen(srv), env = { DOODLE_GEMINI_BASE_URL: `http://127.0.0.1:${port}/v1beta` };
  const lj = d => readJson(path.join(d, 'vo/lines.json'));
  const pl = await run(WORK, ['presets', '--json']), P = pl.code === 0 ? JSON.parse(pl.out) : [];
  check('presets: five narrators with eight deliveries each, all Gemini', P.length === 40 && P.every(q => q.provider === 'gemini' && q.direction && q.wpm > 0)
    && ['charon', 'orus', 'erinome', 'leda', 'pulcherrima'].every(n => P.some(q => q.preset === n)), pl.all);
  check('presets: a narrator alone means its usual delivery', P.find(q => q.preset === 'pulcherrima')?.delivery === 'intimate' && P.find(q => q.preset === 'charon')?.delivery === 'plain'
    && !P.some(q => q.preset === 'charon-plain'), JSON.stringify(P.slice(0, 2)));

  const d = film('presets');
  const r0 = await run(d, ['lines', 'script.md', '--provider', 'gemini']), L0 = lj(d);
  check('presets: a new Gemini film gets its style\'s preset (documentary: charon)', r0.code === 0 && L0.preset === 'charon' && L0.voice === 'Charon' && L0.wpm === 120
    && /^Say in a calm, measured voice/.test(L0.direction) && /preset charon/.test(r0.out), JSON.stringify(L0) + r0.all);
  const r1 = await run(d, ['lines', 'script.md', '--preset', 'Orus-Storyteller']), L1 = lj(d);
  check('lines --preset: sets the voice, direction and pace', r1.code === 0 && L1.preset === 'orus-storyteller' && L1.voice === 'Orus' && L1.wpm === 105
    && /late-night radio storyteller/.test(L1.direction) && L1.units.length === 3, JSON.stringify(L1) + r1.all);
  fs.writeFileSync(path.join(d, 'vo/lines.json'), JSON.stringify({ ...L1, direction: 'Say it my way:' }, null, 2));
  const r2 = await run(d, ['lines', 'script.md']), L2 = lj(d);
  check('lines: a kept preset leaves hand edits alone', r2.code === 0 && L2.preset === 'orus-storyteller' && L2.direction === 'Say it my way:' && L2.voice === 'Orus', JSON.stringify(L2));
  const r3 = await run(d, ['lines', 'script.md', '--preset', 'charon-plain']), L3 = lj(d);
  check('lines --preset: charon-plain is charon', r3.code === 0 && L3.preset === 'charon' && L3.voice === 'Charon', JSON.stringify(L3));
  const r4 = await run(d, ['lines', 'script.md', '--style', 'short-form']), L4 = lj(d);
  check('lines --style: a film on its style\'s preset moves to the new style\'s preset', r4.code === 0 && L4.preset === 'charon-lively' && L4.wpm === 160 && L4.style === 'short-form', JSON.stringify(L4));
  const bad = await run(d, ['lines', 'script.md', '--preset', 'hal-9000']);
  check('lines --preset: an unknown preset is an error that lists the narrators (exit 2)', bad.code === 2 && /unknown preset "hal-9000".*charon, orus/.test(bad.err), bad.all);
  const mix = await run(d, ['lines', 'script.md', '--preset', 'leda', '--provider', 'openai']);
  check('lines --preset: refuses another provider (exit 2)', mix.code === 2 && /Gemini voice/.test(mix.err), mix.all);

  await run(d, ['lines', 'script.md', '--preset', 'pulcherrima']);
  seen.length = 0;
  const g = await run(d, ['generate', '--jobs', '1'], env), V = g.code === 0 ? readJson(path.join(d, 'vo/voice.json')) : {};
  const sent = seen.map(j => [j.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName, j.contents[0].parts[0].text]);
  check('presets: generate sends the preset\'s voice and direction, and voice.json names it', g.code === 0 && V.preset === 'pulcherrima' && V.wpm_target === 110
    && sent.length === 3 && sent.every(([v, t]) => v === 'Pulcherrima' && /^Say (warmly and intimately|slowly, with wonder)/.test(t))
    && sent.filter(([, t]) => /^Say warmly and intimately/.test(t)).length === 2, JSON.stringify(sent) + g.all);
  check('presets: a plate\'s own @direction still wins', sent.some(([, t]) => /^Say slowly, with wonder: Within seconds/.test(t)), JSON.stringify(sent));

  seen.length = 0;
  const a = await run(d, ['audition', '--presets', 'orus-wry,leda-lively'], env), A = a.code === 0 ? readJson(path.join(d, 'vo/audition/audition.json')) : {};
  const pairs = [...new Set(seen.map(j => `${j.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName}|${j.contents[0].parts[0].text.split(':')[0]}`))].sort();
  check('audition --presets: one voice and direction per preset, files named after them', a.code === 0 && JSON.stringify(A.presets) === '["orus-wry","leda-lively"]'
    && A.results.every(x => /^(orus-wry|leda-lively)\.(mp3|wav)$/.test(path.basename(x.file)))
    && JSON.stringify(pairs) === JSON.stringify(['Leda|Say with bright energy at a brisk pace, like an enthusiastic science explainer', 'Orus|Say with dry, understated wit, like a narrator who finds this quietly amusing, at a natural pace']),
    JSON.stringify(pairs) + a.all);
  const md = fs.readFileSync(path.join(d, 'vo/audition/audition.md'), 'utf8');
  check('audition --presets: audition.md has a Preset column', /\| Preset \| Voice \| Direction/.test(md) && /\| orus-wry \| Orus \|/.test(md), md);
  seen.length = 0;
  const ad = await run(d, ['audition'], env), AD = ad.code === 0 ? readJson(path.join(d, 'vo/audition/audition.json')) : {};
  check('audition: on Gemini with nothing named, it compares the narrators in the style\'s mood (short-form: lively)', ad.code === 0
    && JSON.stringify(AD.presets) === '["charon-lively","orus-lively","erinome-lively","leda-lively"]', ad.all);
  await run(d, ['lines', 'script.md', '--style', 'documentary']);
  const ac = await run(d, ['audition'], env), AC = ac.code === 0 ? readJson(path.join(d, 'vo/audition/audition.json')) : {};
  check('audition: a calm style compares the five narrators in their usual delivery', ac.code === 0 && JSON.stringify(AC.presets) === '["charon","orus","erinome","leda","pulcherrima"]', ac.all);
  const fk = film('presets-fake'); await run(fk, ['lines', 'script.md', '--provider', 'fake']);
  check('presets: a film on another provider gets no preset', !('preset' in lj(fk)), JSON.stringify(lj(fk)));
  srv.close();
}

// ---------------------------------------------------------------- OpenAI and a local OpenAI-style server
{
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => { const j = JSON.parse(body || '{}'); seen.push({ url: req.url, headers: req.headers, body: j });
      if (j.voice === 'bad') { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"unknown voice bad"}}'); }
      res.writeHead(200, { 'content-type': 'audio/wav' }); res.end(wavOf(tonePcm(j.input || 'x'), 24000, true)); });
  });
  const port = await listen(srv), d = film('openai');
  await run(d, ['lines', 'script.md', '--provider', 'openai']);
  const g = await run(d, ['generate'], { OPENAI_BASE_URL: `http://127.0.0.1:${port}/v1`, OPENAI_API_KEY: 'sk-test-' + 'y'.repeat(30) });
  const r = seen.find(s => /vein/.test(s.body.input || ''));
  check('openai: /audio/speech with model, voice, wav and instructions', g.code === 0 && r?.url === '/v1/audio/speech' && r.body.model === 'gpt-4o-mini-tts' && r.body.voice === 'cedar'
    && r.body.response_format === 'wav' && /^Say calmly/.test(r.body.instructions || '') && !/\[|\{/.test(r.body.input), g.all + JSON.stringify(r));
  check('openai: the key goes in a Bearer header and is not printed', r?.headers.authorization === 'Bearer sk-test-' + 'y'.repeat(30) && !g.all.includes('y'.repeat(30)), '');
  check('openai: a streamed WAV with no real size is read', readJson(path.join(d, 'vo/voice.json')).units.every(u => u.dur > 1), '');
  seen.length = 0;
  const e = film('local');
  await run(e, ['lines', 'script.md', '--provider', 'local']);
  const gl = await run(e, ['generate'], { DOODLE_TTS_BASE_URL: `http://127.0.0.1:${port}/v1` });
  const q = seen[0];
  check('local: same API at DOODLE_TTS_BASE_URL, no key, no instructions, slowed Kokoro', gl.code === 0 && q?.body.model === 'kokoro' && q.body.voice === 'af_heart'
    && !q.headers.authorization && !q.body.instructions && q.body.speed > 0.7 && q.body.speed < 0.95, gl.all + JSON.stringify(q?.body));
  const ab = await run(e, ['audition', '--voices', 'af_heart,bad'], { DOODLE_TTS_BASE_URL: `http://127.0.0.1:${port}/v1` });
  const aj = fs.existsSync(path.join(e, 'vo/audition/audition.json')) ? readJson(path.join(e, 'vo/audition/audition.json')) : { results: [] };
  check('audition: a voice the server refuses is reported, not dropped (exit 1)', ab.code === 1 && /bad A1: FAILED/.test(ab.out)
    && aj.results.some(x => x.voice === 'bad' && x.flags.some(f => /no clip/.test(f))) && aj.results.some(x => x.voice === 'af_heart' && x.file), ab.all + JSON.stringify(aj.results));
  srv.close();
}

// ---------------------------------------------------------------- Grok, ElevenLabs and Inworld: word timing from the provider
// speech that looks like the text to the tool, with the times a provider would report: each word is a tone burst,
// tags are timed as zero-length characters (some providers echo them), sentences are 0.45 s apart
function speak(text, rate = 24000) {
  const toks = text.replace(/<break[^>]*>/g, ' \u0002 ').split(/\s+/).filter(Boolean), parts = [], chars = [], words = []; let t = 0.2;
  const push = (sec, amp) => { const n = Math.round(sec * rate), b = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp * Math.sin(2 * Math.PI * 150 * i / rate) * Math.sin(Math.PI * i / n) ** 0.3 * 32767), i * 2); parts.push(b); };
  push(0.2, 0);
  for (const tok of toks) {
    if (!/[A-Za-z0-9]/.test(tok) || /^\[.*\]$/.test(tok)) { for (const c of tok.replace('\u0002', '<break/>')) chars.push([c, t, t]); push(0.25, 0); t += 0.25; continue; }
    const d = 0.3 + 0.06 * tok.length; push(d, 0.3);
    [...tok].forEach((c, i) => chars.push([c, t + d * i / tok.length, t + d * (i + 1) / tok.length]));
    words.push([tok.replace(/[^A-Za-z0-9'-]/g, ''), t, t + d]); t += d;
    const gap = /[.!?]["']?$/.test(tok) ? 0.45 : 0.1; push(gap, 0); chars.push([' ', t, t + gap]); t += gap;
  }
  push(0.3, 0);
  return { pcm: Buffer.concat(parts), chars, words };
}
function pretend(handler) {
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => { let j = {}; try { j = JSON.parse(body || '{}'); } catch {} const r = { url: req.url, method: req.method, headers: req.headers, body: j }; seen.push(r);
      const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      handler(r, send); });
  });
  return { srv, seen };
}
// the timing checks shared by the three: exact word times -> timing "words", and marks at the start of their word
function timingChecks(name, d, seen, textOf) {
  const V = readJson(path.join(d, 'vo/voice.json')), p1 = V.units[0], p2 = V.units[1];
  check(`${name}: timing comes from the provider's word times`, V.units.every(u => u.timing === 'words'), V.units.map(u => u.timing).join());
  const req = seen.find(s => /vein/.test(textOf(s.body) || ''));
  const sp = speak(textOf(req?.body) || ''), w0 = sp.words[0][1], about = sp.words.find(w => w[0] === 'about')?.[1];
  const err = Math.abs((p1.marks.count - p1.sentences[0][0]) - (about - w0));
  check(`${name}: a mark lands on its word (within 0.02 s)`, err < 0.02, `error ${err.toFixed(3)} s; ${JSON.stringify([p1.marks, p1.sentences])}`);
  check(`${name}: marks keep their order inside a sentence`, p2.marks.coat > p2.sentences[0][0] && p2.marks.corona > p2.marks.coat && p2.marks.corona < p2.sentences[0][1], JSON.stringify([p2.marks, p2.sentences]));
  const side = readJson(path.join(d, 'vo/clips', p2.fp + '.json'));
  check(`${name}: the respelling is sent and still lines up`, /mel-OX-ih-kam/.test(side.sent) && Array.isArray(side.words) && side.words.length === p2.text.split(/\s+/).length, side.sent + ' ' + (side.words || []).length);
}
{
  const { srv, seen } = pretend((r, send) => {
    if (r.method === 'GET') return send(200, { data: [] });
    if (!r.headers.authorization) return send(401, { code: 'unauthorized', error: 'Incorrect API key provided: missing.' });
    const sp = speak(r.body.text);
    send(200, { audio: sp.pcm.toString('base64'), content_type: 'audio/pcm', duration: sp.pcm.length / 48000,
      audio_timestamps: { graph_chars: sp.chars.map(c => c[0]), graph_times: sp.chars.map(c => ({ start: c[1], end: c[2] })) } });
  });
  const port = await listen(srv), env = { DOODLE_XAI_BASE_URL: `http://127.0.0.1:${port}/v1` }, key = 'xai-' + 'g'.repeat(40);
  const d = film('xai');
  await run(d, ['lines', 'script.md', '--provider', 'xai']);
  const e = await run(d, ['generate'], env);
  check('grok: no key and a 401 says to set XAI_API_KEY (exit 2)', e.code === 2 && /Set XAI_API_KEY/.test(e.err), e.all);
  seen.length = 0;
  const g = await run(d, ['generate'], { ...env, XAI_API_KEY: key });
  const r = seen.find(s => /vein/.test(s.body.text || ''));
  check('grok: POST /v1/tts with voice_id, language, timestamps and a Bearer key', g.code === 0 && r?.url === '/v1/tts' && r.body.voice_id === 'orion' && r.body.language === 'en'
    && r.body.with_timestamps === true && r.headers.authorization === `Bearer ${key}` && !g.all.includes(key), g.all + JSON.stringify(r?.body));
  check('grok: a short pause becomes [pause], marks and other tags are removed, no direction', /vein\. \[pause\] It is/.test(r?.body.text || '') && !/[{}]/.test(r?.body.text || '') && !('instructions' in (r?.body || {})), r?.body.text);
  timingChecks('grok', d, seen, b => b?.text);
  check('grok: cost estimated per character', /about \$0\.00\d+/.test(g.out), g.out);
  srv.close();
}
{
  const VID = 'AbCdEfGhIjKlMnOpQrSt';
  const { srv, seen } = pretend((r, send) => {
    if (!r.headers['xi-api-key']) return send(401, { detail: { status: 'invalid_api_key', message: 'Invalid API key' } });
    if (r.method === 'GET') return send(200, { voices: [{ voice_id: VID, name: 'Darian - Warm Storyteller' }, { voice_id: 'ZyXwVuTsRqPoNmLkJiHg', name: 'Elara' }] });
    const sp = speak(r.body.text);
    send(200, { audio_base64: sp.pcm.toString('base64'), alignment: { characters: sp.chars.map(c => c[0]),
      character_start_times_seconds: sp.chars.map(c => c[1]), character_end_times_seconds: sp.chars.map(c => c[2]) } });
  });
  const port = await listen(srv), env = { DOODLE_ELEVENLABS_BASE_URL: `http://127.0.0.1:${port}/v1` }, key = 'sk_' + 'e'.repeat(48);
  const d = film('elevenlabs');
  await run(d, ['lines', 'script.md', '--provider', 'elevenlabs']);
  const e = await run(d, ['generate'], env);
  check('elevenlabs: no key and a 401 says to set ELEVENLABS_API_KEY (exit 2)', e.code === 2 && /Set ELEVENLABS_API_KEY/.test(e.err), e.all);
  seen.length = 0;
  const g = await run(d, ['generate'], { ...env, ELEVENLABS_API_KEY: key });
  const r = seen.find(s => /vein/.test(s.body.text || ''));
  check('elevenlabs: the voice name is looked up, then /with-timestamps as 24 kHz PCM', g.code === 0 && /^\/v2\/voices\?/.test(seen[0]?.url || '')
    && r?.url === `/v1/text-to-speech/${VID}/with-timestamps?output_format=pcm_24000` && r.body.model_id === 'eleven_v3' && r.headers['xi-api-key'] === key && !g.all.includes(key), g.all + JSON.stringify(r));
  check('elevenlabs: v3 gets "..." for a pause and no direction', /vein\. \.\.\. It is/.test(r?.body.text || '') && !/\[short pause\]|Say calmly/.test(r?.body.text || ''), r?.body.text);
  timingChecks('elevenlabs', d, seen, b => b?.text);
  const n = await run(d, ['generate', '--retake', 'P1', '--voice', 'Nobody'], { ...env, ELEVENLABS_API_KEY: key });
  check('elevenlabs: an unknown voice name lists the voices on the account (exit 2)', n.code === 2 && /no voice called "Nobody"/.test(n.err) && /Elara/.test(n.err), n.all);
  seen.length = 0;
  const kn = await run(d, ['generate', '--retake', 'P1', '--voice', 'Finley'], { ...env, ELEVENLABS_API_KEY: key });
  check('elevenlabs: a known narrator not on the account is used by its ID', kn.code === 0 && seen.some(s => /\/text-to-speech\/fnYMz3F5gMEDGMWcH1ex\//.test(s.url)), kn.all);
  seen.length = 0;
  const v2 = film('elevenlabs-v2');
  await run(v2, ['lines', 'script.md', '--provider', 'elevenlabs', '--model', 'eleven_multilingual_v2', '--voice', VID]);
  const g2 = await run(v2, ['generate', '--only', 'P1'], { ...env, ELEVENLABS_API_KEY: key });
  const r2 = seen.find(s => /vein/.test(s.body.text || ''));
  check('elevenlabs: older models get <break time>, and a voice ID skips the lookup', g2.code === 0 && /<break time="0\.25s" \/>/.test(r2?.body.text || '') && !seen.some(s => s.method === 'GET'), g2.all + r2?.body.text);
  srv.close();
}
{
  const { srv, seen } = pretend((r, send) => {
    if (!/^Basic \S+$/.test(r.headers.authorization || '')) return send(401, { code: 16, message: 'Unauthenticated' });
    if (r.method === 'GET') return send(200, { voices: [] });
    const sp = speak(r.body.text);
    send(200, { audioContent: wavOf(sp.pcm).toString('base64'), usage: { processedCharactersCount: r.body.text.length },
      timestampInfo: { wordAlignment: { words: sp.words.map(w => w[0]), wordStartTimeSeconds: sp.words.map(w => w[1]), wordEndTimeSeconds: sp.words.map(w => w[2]) } } });
  });
  const port = await listen(srv), env = { DOODLE_INWORLD_BASE_URL: `http://127.0.0.1:${port}` }, key = Buffer.from('abc123:' + 's'.repeat(30)).toString('base64');
  const d = film('inworld');
  await run(d, ['lines', 'script.md', '--provider', 'inworld']);
  const e = await run(d, ['generate'], env);
  check('inworld: no key and a 401 says to set INWORLD_API_KEY (exit 2)', e.code === 2 && /Set INWORLD_API_KEY/.test(e.err), e.all);
  seen.length = 0;
  const g = await run(d, ['generate'], { ...env, INWORLD_API_KEY: key });
  const r = seen.find(s => /vein/.test(s.body.text || ''));
  check('inworld: POST /tts/v1/voice with voiceId, modelId, word timestamps, LINEAR16 and a Basic key', g.code === 0 && r?.url === '/tts/v1/voice' && r.body.voiceId === 'Dennis'
    && r.body.modelId === 'inworld-tts-2' && r.body.timestampType === 'WORD' && r.body.audioConfig?.audioEncoding === 'LINEAR16' && r.headers.authorization === `Basic ${key}` && !g.all.includes(key), g.all + JSON.stringify(r?.body));
  check('inworld: the direction goes in instruction and a pause becomes <break>', /^Say calmly/.test(r?.body.instruction || '') && /vein\. <break time="0\.25s" \/> It is/.test(r?.body.text || ''), JSON.stringify(r?.body));
  timingChecks('inworld', d, seen, b => b?.text);
  seen.length = 0;
  const g2 = await run(d, ['generate', '--retake', 'P1'], { ...env, INWORLD_API_KEY: 'abc123:' + 's'.repeat(30) });
  check('inworld: an "id:secret" key is Base64-encoded for the Basic header', g2.code === 0 && seen[0]?.headers.authorization === `Basic ${key}` && !g2.all.includes('s'.repeat(30)), g2.all);
  const kt = await run(d, ['keys', '--test'], { ...env, INWORLD_API_KEY: key, DOODLE_GEMINI_BASE_URL: `http://127.0.0.1:${port}/nothing`,
    DOODLE_XAI_BASE_URL: `http://127.0.0.1:${port}/v1`, DOODLE_ELEVENLABS_BASE_URL: `http://127.0.0.1:${port}/v1` });
  check('keys --test: Inworld works; providers with no key are reported, not counted as failures', /Inworld: works \(key from the INWORLD_API_KEY/.test(kt.out)
    && /Grok \(xAI\) refused the request \(401\) and no key was found/.test(kt.out), kt.all);
  srv.close();
}
{
  const d = film('openai-realtime');
  await run(d, ['lines', 'script.md', '--provider', 'openai', '--model', 'gpt-realtime']);
  const g = await run(d, ['generate'], { OPENAI_BASE_URL: 'http://127.0.0.1:9/v1' });
  check('openai: a realtime model is refused before any request (exit 2)', g.code === 2 && /plain speech endpoint/.test(g.err), g.all);
}

// ---------------------------------------------------------------- requests go through HTTPS_PROXY (Node's fetch would not)
if (!has('openssl', 'version')) skip('proxy: HTTPS requests use HTTPS_PROXY', 'openssl not found');
else {
  const cert = path.join(WORK, 'cert.pem'), key = path.join(WORK, 'key.pem');
  const o = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '2', '-subj', '/CN=gemini.test', '-addext', 'subjectAltName=DNS:gemini.test'], { stdio: 'ignore' });
  if (o.status !== 0) skip('proxy: HTTPS requests use HTTPS_PROXY', 'openssl could not make a certificate');
  else {
    const hits = [], connects = [];
    const api = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req, res) => { hits.push({ url: req.url, host: req.headers.host, key: req.headers['x-goog-api-key'] }); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"models":[]}'); });
    const apiPort = await listen(api);
    const proxy = http.createServer((q, s) => { s.writeHead(405); s.end(); });
    proxy.on('connect', (req, sock, head) => {                    // a CONNECT proxy that adds nothing and sends gemini.test to our server
      connects.push(req.url);
      const up = net.connect(apiPort, '127.0.0.1', () => { sock.write('HTTP/1.1 200 Connection Established\r\n\r\n'); up.write(head); up.pipe(sock); sock.pipe(up); });
      up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy());
    });
    const pPort = await listen(proxy);
    const r = await run(film('proxy'), ['keys', '--test'], { HTTPS_PROXY: `http://127.0.0.1:${pPort}`, NO_PROXY: 'localhost,127.0.0.1', NODE_EXTRA_CA_CERTS: cert,
      DOODLE_GEMINI_BASE_URL: 'https://gemini.test/v1beta', OPENAI_BASE_URL: 'https://gemini.test/v1', DOODLE_TTS_BASE_URL: 'https://gemini.test/v1' });
    check('proxy: HTTPS requests go through the HTTPS_PROXY tunnel', connects.includes('gemini.test:443') && hits.some(h => h.url === '/v1beta/models?pageSize=1') && /Gemini: works/.test(r.out), r.all + JSON.stringify({ connects, hits }));
    check('proxy: the Host header names the API host', hits.every(h => h.host === 'gemini.test'), JSON.stringify(hits));
    connects.length = 0;
    const r2 = await run(film('proxy2'), ['keys', '--test'], { HTTPS_PROXY: `127.0.0.1:${pPort}`, NO_PROXY: 'localhost,127.0.0.1', NODE_EXTRA_CA_CERTS: cert,
      DOODLE_GEMINI_BASE_URL: 'https://gemini.test/v1beta', OPENAI_BASE_URL: 'https://gemini.test/v1', DOODLE_TTS_BASE_URL: 'https://gemini.test/v1' });
    check('proxy: an HTTPS_PROXY written without http:// is used too', connects.includes('gemini.test:443') && /Gemini: works/.test(r2.out), r2.all);
    const r3 = await run(film('proxy3'), ['keys', '--test'], { HTTPS_PROXY: 'http://', DOODLE_GEMINI_BASE_URL: 'https://gemini.test/v1beta',
      OPENAI_BASE_URL: 'https://gemini.test/v1', DOODLE_TTS_BASE_URL: 'https://gemini.test/v1' });
    check('proxy: an HTTPS_PROXY that is not an address is an error, never a direct connection', /HTTPS_PROXY is set but/.test(r3.out) && r3.code === 1, r3.all);
    api.close(); proxy.close();
  }
}

// ---------------------------------------------------------------- loudness against ffmpeg's EBU R128 meter
if (!has('ffmpeg')) skip('loudness: matches ffmpeg ebur128', 'ffmpeg not found');
else {
  const f = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', ffmpegClip, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(f.stderr || '').matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].at(-1);
  check('loudness: -20 LUFS by ffmpeg ebur128 too (within 0.3 LU)', !!m && Math.abs(+m[1] + 20) <= 0.3, m ? m[1] : f.stderr.slice(-300));
}

// ---------------------------------------------------------------- Kokoro (only when asked: it downloads a 325 MB model)
if (process.env.DOODLE_TEST_KOKORO !== '1') skip('kokoro: in-process sentence clips', 'set DOODLE_TEST_KOKORO=1 (needs kokoro-onnx and a 325 MB model download)');
else {
  const d = film('kokoro');
  await run(d, ['lines', 'script.md', '--provider', 'kokoro']);
  const g = await run(d, ['generate'], { DOODLE_KOKORO_DIR: process.env.DOODLE_KOKORO_DIR || '' });
  const V = fs.existsSync(path.join(d, 'vo/voice.json')) ? readJson(path.join(d, 'vo/voice.json')) : { units: [] };
  check('kokoro: clips with exact sentence times', g.code === 0 && V.units.length === 3 && V.units.every(u => u.timing === 'sentence-clips'), g.all);
  // comma-heavy plates still come out slower than the others, so the film's average pace is what is held to 10%
  const avg = V.units.reduce((n, u) => n + u.checks.wpm, 0) / Math.max(1, V.units.length);
  check('kokoro: the speed chosen per plate keeps the average pace within 10% of the target', Math.abs(avg / V.wpm_target - 1) <= 0.1, V.units.map(u => u.checks.wpm).join());
}

const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.filter(r => r[0] === 'PASS').length} passed, ${failed} failed, ${results.filter(r => r[0] === 'SKIP').length} skipped`);
if (!KEEP && !failed) fs.rmSync(WORK, { recursive: true, force: true }); else console.log(`work folder kept: ${WORK}`);
process.exit(failed ? 1 : 0);
