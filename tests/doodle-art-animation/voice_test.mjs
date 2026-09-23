// voice_test.mjs — tests for the narration tool (toolkit/voice.mjs). No network, no keys, no cost: it uses the fake
// voice and small pretend Gemini, OpenAI and proxy servers on this machine.
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
  ffmpegClip = path.join(d, V.units[1].file);
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
  check('gemini: direction first, pause tags kept, marks removed', /^Say calmly, with quiet curiosity, like a documentary narrator: One particle/.test(t) && t.includes('[short pause]') && !/[{}]/.test(t), t);
  check('gemini: no key header when no key is set (the cloud proxy may add it)', seen.every(s => !('x-goog-api-key' in s.headers)), JSON.stringify(seen.map(s => Object.keys(s.headers))));
  check('gemini: a 429 is waited out and retried', /rate-limiting/.test(g.err) && seen.length >= 4, g.all);
  check('gemini: the per-plate direction is sent for that plate', seen.some(s => /^Say slowly, with wonder: Within seconds/.test(s.body.contents?.[0]?.parts?.[0]?.text || '')), '');
  const V = readJson(path.join(d, 'vo/voice.json'));
  check('gemini: 24 kHz clips with sentence times from the pauses', V.units.every(u => wavInfo(path.join(d, u.file)).rate === 24000) && V.units[0].sentences.length === 2
    && V.units[0].sentences[1][0] > V.units[0].sentences[0][1], JSON.stringify(V.units[0]));
  check('gemini: cost estimated from the token counts', /about \$0\.0\d+/.test(g.out), g.out);

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

// ---------------------------------------------------------------- OpenAI and a local OpenAI-style server
{
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => { const j = JSON.parse(body || '{}'); seen.push({ url: req.url, headers: req.headers, body: j });
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
  srv.close();
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
}

const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.filter(r => r[0] === 'PASS').length} passed, ${failed} failed, ${results.filter(r => r[0] === 'SKIP').length} skipped`);
if (!KEEP && !failed) fs.rmSync(WORK, { recursive: true, force: true }); else console.log(`work folder kept: ${WORK}`);
process.exit(failed ? 1 : 0);
