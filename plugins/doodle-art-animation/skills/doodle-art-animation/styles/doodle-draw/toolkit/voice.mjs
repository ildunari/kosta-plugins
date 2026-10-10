// voice.mjs — narration for a doodle film. It turns each plate's narration into a voice clip, checks and times the
// clip, and writes vo/voice.json for the engine. Words come first, then the voice, then the picture: the picture is
// timed to the voice, because code can stretch to fit any timing and recorded speech cannot.
//
// usage (run in the film folder; everything is read from and written to ./vo/):
//   node voice.mjs lines script.md   reads the "## Narration" section of script.md into vo/lines.json and prints each
//                                    plate's estimated spoken length against its Dur (no audio, no cost);
//                                    --preset NAME picks a narrator preset (a Gemini voice and delivery)
//   node voice.mjs audition          a few test lines in several voices and directions -> vo/audition/<voice>-<n>.mp3
//                                    and vo/audition/audition.md (pace, loudness and flags per voice, best first);
//                                    on Gemini it compares narrator presets (--presets A,B,C names them)
//   node voice.mjs presets           lists the narrator presets: five Gemini voices, eight deliveries each
//   node voice.mjs generate          one clip per plate -> vo/clips/<fingerprint>.wav and vo/voice.json
//   node voice.mjs check             re-measures every clip against vo/lines.json and flags problems; also runs
//                                    voice_check.py (transcript against the script, voice consistency)
//   node voice.mjs lock              marks vo/voice.json locked and lengthens the plates in script.md the voice outgrew
//   node voice.mjs keys [--test]     where each provider's key was found (never the key itself); --test sends one
//                                    free request per provider to see whether the key works
// options: --dir DIR film folder (default .)   --provider P --model M --voice V   override vo/lines.json for this run
//          --only P1,P2   --retake P2 (a new take even if a clip exists)   --retakes N (automatic retakes of a clip that
//          fails a check, default 2)   --jobs N (requests at once, default 2)   --voices A,B,C (audition)
//          --preset NAME (lines; a narrator preset)   --presets A,B,C (audition; presets to compare)
//          --script FILE (lock; default the script lines.json came from)   --force (lock despite failures)
//          --facts facts.md (lines: also read its pronunciation list)   --json (print a machine-readable summary)
//
// NARRATION IN script.md. A "## Narration" section, one block per plate, keyed by the plate table's # column
// (0, I, II ... End) or by P<n>, under a "### I · Title" heading (an unheaded "I · Title" line also starts a block
// when I is in the table). Words in braces are marks: named points that beats can land on; the mark's time is
// the start of the word right after it. Square brackets are delivery tags; Gemini acts them ([short pause] 0.25 s,
// [medium pause] 0.5 s, [long pause] 1 s, [curious], [serious], [sigh] ...; see GEMINI 3.8 below for how they are
// sent). The other providers drop them, and Kokoro turns a pause tag between sentences into that much silence.
// Optional @voice, @direction, @speed, @lead and @tail lines override the film's settings for one plate. A block
// reading "(none)" has no narration.
//     ## Narration
//     ### I · Into the Blood
//     One particle slips into the vein. [short pause]
//     It is one of {count}about four hundred and thirty billion in a single milligram.
// A "## Pronunciation" section (in script.md, or facts.md with --facts) lists "- term: say it as" lines. The respelling
// is what the voice is sent; the script keeps the real word. A lowercase term matches any case; PCL matches only PCL.
//
// vo/lines.json (written by `lines`; edit it freely): { version, script, provider, model, preset (Gemini narrator
// preset, which wrote voice, direction and wpm), voice, style (documentary | explainer | short-form), wpm (target pace;
// default from the preset, else the style), direction, speed, lufs, lead, tail,
// pronounce: { term: "say" or { say, gemini, kokoro, ... } }, units: [{ id: "P1", plate: 1, key: "I", text, and
// optional voice, direction, speed, lead, tail, climax }], audition: { lines, voices, directions, presets } (all optional) }.
//
// vo/voice.json (written by generate, check and lock; read by the engine): { version: 1, provider, model, voice,
// preset (if any), style, wpm_target, lufs, locked, generated, missing: [ids without a clip], units: [{ id, plate, file (relative to
// the film folder), fp, take, voice, dur, lufs, lead, tail, text, sentences: [[start, end, "text"]], marks: { name: t },
// timing, checks: { wpm, missing, extra, flags } }] }. Times are seconds from the clip's start. plate and the n of
// P<n> are the plate's position from 0 (STORY.plates index). Clips are mono 16-bit WAV at the provider's own rate
// (24 kHz for Gemini, OpenAI and Kokoro), trimmed to 0.03 s of silence before the first word and 0.15 s after the
// last, and normalized to -20 LUFS integrated (ITU-R BS.1770) with peaks under -1 dBFS.
//
// TIMING. timing "words" (Grok, ElevenLabs, Inworld: the provider reports when each word or character is spoken, so
// sentences and marks are exact to about 0.05 s), "sentence-clips" (Kokoro: each sentence is its own request, so
// sentence starts are exact), "silence+estimate" (Gemini, OpenAI, local, fake: sentence starts are the pauses in the
// clip, matched to the script in order), or "estimate" (no usable pauses). Without word times a mark inside a sentence
// is placed by its share of the sentence's syllables, so it can be off by about 0.3 s; a mark on a sentence's first
// word is as exact as the sentence start.
//
// PROVIDERS. gemini (default; gemini-3.8-flash-tts, about $0.02 a minute in 2026 and $0.04 from 2027;
// gemini-3.8-flash-lite-tts is cheaper, and gemini-3.1-flash-tts-preview still works), openai (gpt-4o-mini-tts, about
// $0.015 a minute), local (any OpenAI-style speech server, e.g. Kokoro-FastAPI at DOODLE_TTS_BASE_URL, default
// http://localhost:8880/v1), kokoro (Kokoro-82M in-process through voice_kokoro.py and the kokoro-onnx Python package;
// free, CPU only, model files from GitHub), xai (Grok's /v1/tts, voice orion, about $0.015 a minute), elevenlabs
// (eleven_v3, voice Darian, about $0.09 a minute; a voice is a name on your account or a voice ID), inworld
// (inworld-tts-2, voice Dennis, about $0.02 a minute; inworld-tts-2-flash is cheaper and ignores directions),
// fake (synthetic tones for tests; no network, no cost). Only Gemini, OpenAI and Inworld TTS-2 take a written
// direction; Grok and ElevenLabs get the words and tags only. Tags per provider: Gemini acts them all; Grok turns
// pauses into [pause] / [long-pause] and keeps its own sound tags ([breath], [sigh], [laugh] ...); eleven_v3 acts
// [curious]-style tags and gets "..." for a pause; older ElevenLabs models and Inworld get <break time="..."/>;
// Inworld TTS-2 also acts the other tags; OpenAI and local servers drop them. docs: references/voice-providers.md.
//
// GEMINI 3.8. The 3.8 TTS models speak every word of the text they get, so nothing may be written into it for the
// voice to act on. The tool sends them the words alone through the Interactions API (POST /v1beta/interactions,
// store: false), with the direction as the text's speech_metadata style ("Say slowly, with wonder:" becomes
// "slowly, with wonder"). Tags become Gemini's angle-bracket tags: a short or medium pause is <short pause>, a long
// one <long pause>, and a vocal sound Gemini knows (sigh, breath, laugh, chuckle ...) is <sigh> and so on. Any other
// tag, like [curious], changes how the rest of the plate is read: the words after it become a new part of the same
// request, whose style is the direction plus "; curious". The older models (gemini-3.1-flash-tts-preview, the 2.5
// previews) still get one prompt of direction and words through generateContent, with the tags in square brackets.
// Clips are cached by a fingerprint of exactly what was sent (text, provider, model, voice, direction, speed), so
// generating again after editing one plate pays only for that plate. A new lufs target re-levels cached clips for free.
// Gemini has no speed setting (a speed there is ignored, with a warning). Kokoro reads faster than a narrator, so
// unless a speed is set each plate gets the speed that lands it on the target pace (measured per voice).
//
// KEYS. Looked up in this order: the provider's environment variable (GEMINI_API_KEY or GOOGLE_API_KEY,
// OPENAI_API_KEY, XAI_API_KEY, ELEVENLABS_API_KEY, INWORLD_API_KEY, DOODLE_TTS_API_KEY for a local server),
// CLAUDE_PLUGIN_OPTION_<that name>, then ~/.config/doodle-art-animation/keys.env (NAME=value lines, chmod 600;
// DOODLE_KEYS_FILE moves it). A key is never printed, and anything that looks like one is hidden in the output.
// With no key the request goes out without one: in a claude.ai cloud environment the network proxy may add the key
// itself. Only when the provider then refuses (401 or 403) does the tool say which variable to set.
// Requests go through HTTPS_PROXY when it is set. Node's own fetch ignores that variable and connects directly, which
// skips the proxy and any key it would add, so the tool opens the proxy tunnel itself.
//
// Other settings: DOODLE_TTS_PROVIDER, DOODLE_TTS_VOICE (defaults for `lines`), DOODLE_TTS_COOLDOWN (seconds to
// wait after a 429 rate limit, default 60), DOODLE_GEMINI_BASE_URL, OPENAI_BASE_URL, DOODLE_XAI_BASE_URL,
// DOODLE_ELEVENLABS_BASE_URL, DOODLE_INWORLD_BASE_URL (other servers speaking the same API; tests), DOODLE_PYTHON, DOODLE_KOKORO_DIR,
// DOODLE_TTS_FAKE_FAULT (tests: "P2:silent,P3:slow,P1:silent-once,P4:loud,P5:gap,P6:odd").
// Exit codes: 0 fine, 1 a clip failed a check or a request failed, 2 something to fix first (no lines.json, a key
// the provider refused, a missing Python package, a bad option).
import fs from 'fs'; import path from 'path'; import os from 'os'; import crypto from 'crypto';
import http from 'http'; import https from 'https'; import tls from 'tls';
import { spawn, spawnSync } from 'child_process'; import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORMAT = 1;
const TARGET_LUFS = -20, PEAK_CEIL = -1;   // every clip is normalized to this loudness, peaks kept under -1 dBFS
const LEAD = 1.5, TAIL = 0.8;              // default seconds before the first word and after the last, for script.md Dur
const PAD_IN = 0.03, PAD_OUT = 0.15;       // silence kept at a clip's edges after trimming
const MIN_GAP = 0.12;                      // a pause at least this long can be the boundary between two sentences
const SENT_GAP = 0.32;                     // silence put between sentences when the tool joins sentence clips itself
const SYL_PER_SEC = 4;                     // speaking speed used to weigh pauses against syllables in estimates
const COOLDOWN = +(process.env.DOODLE_TTS_COOLDOWN || 60);

const STYLES = {   // preset: the narrator preset a Gemini film of this style gets when none is chosen
  documentary: { wpm: 138, mood: 'calm', preset: 'charon', directions: ['Say calmly, with quiet curiosity, like a documentary narrator:',
    'Say warmly, with a little more energy, like a science explainer:'] },
  explainer: { wpm: 152, mood: 'calm', preset: 'charon-professor', directions: ['Say in a friendly, clear voice, like a science explainer:',
    'Say warmly and brightly, like a favourite teacher:'] },
  'short-form': { wpm: 160, mood: 'upbeat', preset: 'charon-lively', directions: ['Say with upbeat energy, like a short science video:',
    'Say quickly and brightly, with a hook in your voice:'] },
};
// NARRATOR PRESETS (Gemini only). A preset is a voice plus a delivery: the written direction and the pace that
// direction really reads at. Kosta chose the five voices by ear in September 2026 from all 30 of Gemini's. Each pace
// is the middle of the five voices reading the same 24-word line with that direction, rounded to 5 words a minute,
// so plate estimates and the pace check match the voice instead of the style's target: wpm on Gemini 3.8 Flash TTS,
// wpm31 on 3.1 Flash TTS (3.8 reads the same directions faster). A preset is named after the narrator (its usual
// delivery) or <narrator>-<delivery>, like charon-storyteller. When to use which: references/voice-presets.md.
const DELIVERIES = {
  plain: { wpm: 125, wpm31: 120, direction: 'Say in a calm, measured voice, at a natural conversational pace:' },
  british: { wpm: 135, wpm31: 120, direction: 'Say in a calm, measured voice with a British English accent, at a natural conversational pace:' },
  professor: { wpm: 140, wpm31: 120, direction: 'Say warmly, like a favourite professor explaining something they love, with a hint of a smile, at a natural pace:' },
  hushed: { wpm: 120, wpm31: 115, direction: 'Say softly, in a hushed and slightly awed tone, like a nature documentary narrator:' },
  wry: { wpm: 135, wpm31: 120, direction: 'Say with dry, understated wit, like a narrator who finds this quietly amusing, at a natural pace:' },
  lively: { wpm: 185, wpm31: 160, direction: 'Say with bright energy at a brisk pace, like an enthusiastic science explainer:' },
  storyteller: { wpm: 130, wpm31: 105, direction: 'Say low and intimate, like a late-night radio storyteller, unhurried but not slow:' },
  intimate: { wpm: 130, wpm31: 110, direction: 'Say warmly and intimately, in a soft, slightly husky voice, like talking to one close friend, with a playful smile, at a natural conversational pace:' },
};
const NARRATORS = {   // pitch is the median of the voice's plain read, measured
  charon: { voice: 'Charon', delivery: 'plain', sounds: 'male, mid-low (about 118 Hz), informative; the house narrator' },
  orus: { voice: 'Orus', delivery: 'plain', sounds: 'male, higher and more animated than Charon (about 150 Hz)' },
  erinome: { voice: 'Erinome', delivery: 'plain', sounds: 'female, clear and bright (about 195 Hz)' },
  leda: { voice: 'Leda', delivery: 'plain', sounds: 'female, light and youthful (about 200 Hz)' },
  pulcherrima: { voice: 'Pulcherrima', delivery: 'intimate', sounds: 'female, low, warm and slightly husky (about 135 Hz)' },
};
// a preset by name, with the pace its direction reads at on this model (3.8 and later unless it is an older one)
function preset(name, model = PROVIDERS.gemini.model) {
  const [who, how] = String(name).trim().toLowerCase().split(/-(.+)/), N = NARRATORS[who], d = how || N?.delivery;
  if (!N || !DELIVERIES[d]) throw new SetupError(`unknown preset "${name}": use a narrator (${Object.keys(NARRATORS).join(', ')}), optionally with -<delivery> (${Object.keys(DELIVERIES).join(', ')}), like charon-storyteller. node voice.mjs presets lists them`);
  const { wpm, wpm31, direction } = DELIVERIES[d];
  return { name: d === N.delivery ? who : `${who}-${d}`, narrator: who, voice: N.voice, delivery: d, direction, wpm: legacyGemini(model) ? wpm31 : wpm };
}
const KOKORO_VOICES = { calm: ['af_heart', 'bm_george', 'am_michael'], upbeat: ['af_heart', 'af_nova', 'am_puck'] };
const PROVIDERS = {
  gemini: { name: 'Gemini', model: 'gemini-3.8-flash-tts', voice: 'Charon',
    audition: { calm: ['Charon', 'Orus', 'Erinome', 'Leda', 'Pulcherrima'], upbeat: ['Charon', 'Orus', 'Erinome', 'Leda'] },
    // with no voices or directions named, a Gemini audition compares narrator presets instead of voices x directions
    presets: { calm: ['charon', 'orus', 'erinome', 'leda', 'pulcherrima'], upbeat: ['charon-lively', 'orus-lively', 'erinome-lively', 'leda-lively'] } },
  openai: { name: 'OpenAI', model: 'gpt-4o-mini-tts', voice: 'cedar', audition: { calm: ['cedar', 'marin', 'ash'], upbeat: ['coral', 'nova', 'marin'] } },
  local: { name: 'the local speech server', model: 'kokoro', voice: 'af_heart', audition: KOKORO_VOICES },
  kokoro: { name: 'Kokoro', model: 'kokoro-v1.0', voice: 'af_heart', audition: KOKORO_VOICES },
  // Grok, ElevenLabs and Inworld: calm picks from each provider's own descriptions; the upbeat picks are guesses to audition
  xai: { name: 'Grok', model: 'grok-tts', voice: 'orion', audition: { calm: ['orion', 'lux', 'perseus'], upbeat: ['eve', 'lumen', 'luna'] } },
  elevenlabs: { name: 'ElevenLabs', model: 'eleven_v3', voice: 'Darian', audition: { calm: ['Darian', 'Finley', 'Elara'], upbeat: ['Talia', 'Sawyer', 'Darian'] } },
  inworld: { name: 'Inworld', model: 'inworld-tts-2', voice: 'Dennis', audition: { calm: ['Dennis', 'Ashley', 'Malcolm'], upbeat: ['Ashley', 'Edward', 'Dennis'] } },
  fake: { name: 'the fake voice', model: 'fake-1', voice: 'fake-a', audition: { calm: ['fake-a', 'fake-b'], upbeat: ['fake-a', 'fake-c'] } },
};
// Kokoro's pace at speed 1, in words a minute of speech (pauses between sentences not counted), measured on five
// narration sentences per voice. Its speed setting is not proportional: speed 0.85 gives 0.889 of the pace and speed
// 0.7 gives 0.683 (the same on every voice measured), so KOKORO_CURVE maps speed to that fraction (0.5 and 1.3 are
// extrapolated).
const KOKORO_PACE = { af_heart: 198, af_nova: 203, am_michael: 177, am_puck: 192, bf_emma: 207, bm_george: 171 }, KOKORO_PACE_OTHER = 192;
const KOKORO_CURVE = [[0.5, 0.41], [0.7, 0.683], [0.85, 0.889], [1, 1], [1.3, 1.22]];
const KEY_VARS = { gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'], openai: ['OPENAI_API_KEY'], xai: ['XAI_API_KEY'],
  elevenlabs: ['ELEVENLABS_API_KEY'], inworld: ['INWORLD_API_KEY'], local: ['DOODLE_TTS_API_KEY'] };
const KEY_NAMES = { gemini: 'Gemini', openai: 'OpenAI', xai: 'Grok (xAI)', elevenlabs: 'ElevenLabs', inworld: 'Inworld', local: 'Local server' };
// about what the voice costs, in US dollars (read 2026-09-22, Gemini 3.8 on 2026-09-23; prices change, so these are
// estimates). later: [date, prices] is a price Google has announced from that date on
const PRICE = { 'gemini-3.8-flash-tts': { in: 0.5e-6, out: 9e-6, later: ['2027-01-01', { in: 1e-6, out: 18e-6 }] },
  'gemini-3.8-flash-lite-tts': { in: 0.5e-6, out: 6e-6, later: ['2027-01-01', { in: 1e-6, out: 12e-6 }] },
  'gemini-3.1-flash-tts-preview': { in: 1e-6, out: 20e-6 }, 'gemini-2.5-flash-preview-tts': { in: 0.5e-6, out: 10e-6 },
  'gemini-2.5-pro-preview-tts': { in: 1e-6, out: 20e-6 }, 'gpt-4o-mini-tts': { perSec: 0.00025 }, 'tts-1': { perChar: 15e-6 }, 'tts-1-hd': { perChar: 30e-6 },
  'grok-tts': { perChar: 15e-6 }, eleven_v3: { perChar: 100e-6 }, eleven_multilingual_v2: { perChar: 100e-6 }, eleven_flash_v2_5: { perChar: 50e-6 },
  eleven_flash_v2: { perChar: 50e-6 }, eleven_turbo_v2_5: { perChar: 50e-6 }, 'inworld-tts-2': { perChar: 25e-6 }, 'inworld-tts-2-flash': { perChar: 15e-6 } };

// ---------------------------------------------------------------- output, errors, options
class SetupError extends Error {}          // exit 2: something to fix before anything can run
class Retryable extends Error {}           // a bad answer worth asking again for (no audio, not audio)
class KeyProblem extends SetupError {
  constructor(provider, key, status, text) {
    const P = KEY_NAMES[provider] || provider, vars = KEY_VARS[provider] || [];
    super(key ? `${P} refused the key found in ${key.where} (${status}): ${text}`
      : `${P} refused the request (${status}) and no key was found. Set ${vars[0]} in your environment, or put a line ` +
        `${vars[0]}=... in ${keysFile()} (then chmod 600 it). In a claude.ai cloud environment, add the key to the ` +
        `environment's settings. ${P} said: ${text}`);
  }
}
const SECRETS = new Set();
const redact = s => { let t = String(s); for (const k of SECRETS) if (k.length >= 8) t = t.split(k).join('[hidden]');
  return t.replace(/AIza[0-9A-Za-z_-]{30,}/g, '[hidden]').replace(/\b(sk|xai)[-_][A-Za-z0-9_-]{20,}/g, '[hidden]'); };
const out = (...a) => process.stdout.write(redact(a.join(' ')) + '\n');
const note = (...a) => process.stderr.write(redact(a.join(' ')) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;

process.stdout.on('error', e => { if (e.code === 'EPIPE') process.exit(process.exitCode ?? 0); throw e; });   // piped into head
const BOOL = new Set(['force', 'json', 'test', 'help']);
const argv = process.argv.slice(2), cmd = argv[0], flags = {}, pos = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { pos.push(a); continue; }
  const k = a.slice(2);
  if (BOOL.has(k)) { flags[k] = true; continue; }
  if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) { note(`voice: --${k} needs a value`); process.exit(2); }
  flags[k] = argv[++i];
}
const DIR = path.resolve(flags.dir || '.'), VO = path.join(DIR, 'vo'), LINES = path.join(VO, 'lines.json'), VOICE = path.join(VO, 'voice.json');
const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

// ---------------------------------------------------------------- keys
function keysFile() {
  return process.env.DOODLE_KEYS_FILE || path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'doodle-art-animation', 'keys.env');
}
let FILEKEYS = null;
function fileKeys() {
  if (FILEKEYS) return FILEKEYS;
  FILEKEYS = {};
  let txt = ''; try { txt = fs.readFileSync(keysFile(), 'utf8'); } catch { return FILEKEYS; }
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2]; if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (v) FILEKEYS[m[1]] = v;
  }
  return FILEKEYS;
}
for (const vars of Object.values(KEY_VARS)) for (const n of vars)          // every key we might see, so none is ever printed
  for (const v of [process.env[n], process.env['CLAUDE_PLUGIN_OPTION_' + n], fileKeys()[n]]) if (v) { SECRETS.add(v); SECRETS.add(Buffer.from(v).toString('base64')); }
let warnedPerm = false;
function findKey(provider) {
  const vars = KEY_VARS[provider] || [];
  for (const n of vars) {
    if (process.env[n]) return { value: process.env[n], where: `the ${n} environment variable` };
    if (process.env['CLAUDE_PLUGIN_OPTION_' + n]) return { value: process.env['CLAUDE_PLUGIN_OPTION_' + n], where: 'the plugin settings' };
  }
  for (const n of vars) if (fileKeys()[n]) {
    try { if (!warnedPerm && process.platform !== 'win32' && (fs.statSync(keysFile()).mode & 0o077)) {
      warnedPerm = true; note(`voice: ${keysFile()} can be read by other users of this computer; run: chmod 600 "${keysFile()}"`); } } catch {}
    return { value: fileKeys()[n], where: keysFile() };
  }
  return null;
}

// ---------------------------------------------------------------- HTTP (through HTTPS_PROXY when set)
function proxyFor(host) {
  const p = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!p) return null;
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  for (let e of list(process.env.NO_PROXY || process.env.no_proxy)) {
    e = e.toLowerCase();
    if (e === '*' || h === e || h.endsWith('.' + e.replace(/^\*?\./, ''))) return null;
    const c = e.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/), ip = h.match(/^\d+\.\d+\.\d+\.\d+$/);
    if (c && ip) { const n = s => s.split('.').reduce((a, b) => a * 256 + +b, 0), bits = +c[2];
      if (bits === 0 || Math.floor(n(h) / 2 ** (32 - bits)) === Math.floor(n(c[1]) / 2 ** (32 - bits))) return null; }
  }
  if (h === 'localhost' || /^127\./.test(h) || h === '::1') return null;
  // "host:port" with no scheme is common; an address that cannot be read is an error, never a direct connection
  let u = null; try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(p) ? p : 'http://' + p); } catch {}
  if (!u || !u.hostname || !/^https?:$/.test(u.protocol))
    throw new SetupError('HTTPS_PROXY is set but is not a proxy address this tool can use (expected http://host:port or https://host:port)');
  return u;
}
function tunnel(proxy, host, port) {
  return new Promise((resolve, reject) => {
    const headers = { host: `${host}:${port}` };
    if (proxy.username) headers['proxy-authorization'] = 'Basic ' + Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64');
    const secure = proxy.protocol === 'https:', ph = proxy.hostname.replace(/^\[|\]$/g, '');
    const req = (secure ? https : http).request({ hostname: ph, port: +proxy.port || (secure ? 443 : 80), method: 'CONNECT', path: `${host}:${port}`,
      headers, timeout: 30000, ...(secure ? { servername: ph } : {}) });
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); return reject(new Error(`the network proxy refused the connection to ${host} (${res.statusCode})`)); }
      const s = tls.connect({ socket, servername: host }, () => resolve(s));
      s.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('the network proxy did not answer')));
    req.on('error', reject);
    req.end();
  });
}
async function request(url, { method = 'GET', headers = {}, body = null, timeout = 180000 } = {}) {
  const u = new URL(url), secure = u.protocol === 'https:', port = +u.port || (secure ? 443 : 80), proxy = secure ? proxyFor(u.hostname) : null;
  const opts = { method, hostname: u.hostname.replace(/^\[|\]$/g, ''), port, path: u.pathname + u.search, timeout,
    headers: { ...headers, ...(body != null ? { 'content-length': Buffer.byteLength(body) } : {}) } };
  // through the proxy: our own TLS socket inside a CONNECT tunnel. createConnection is only honoured when no agent is
  // given; with agent: false Node quietly opens its own direct connection, which skips the proxy (and any key it adds)
  if (proxy) { const sock = await tunnel(proxy, opts.hostname, port); opts.createConnection = () => sock; opts.headers.host = u.host; }
  else opts.agent = false;
  return new Promise((resolve, reject) => {
    const req = (secure ? https : http).request(opts, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new Error(`no answer within ${timeout / 1000} s`)));
    req.on('error', reject);
    if (body != null) req.write(body);
    req.end();
  });
}
function retryAfter(res) {
  const h = +res.headers['retry-after']; if (h > 0) return Math.min(120, h);
  const m = res.body.toString().match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/); return m ? Math.min(120, +m[1]) : null;
}
// one API call with the waits a provider asks for: 429 -> wait and retry (3 times), 5xx and network errors -> retry twice
async function call(provider, key, url, opts) {
  const P = PROVIDERS[provider]?.name || provider;
  let n429 = 0, n5xx = 0, nNet = 0;
  for (;;) {
    let res;
    try { res = await request(url, opts); }
    catch (e) {
      if (nNet++ < (opts.netTries ?? 2)) { await sleep(Math.min(COOLDOWN, 3) * 1000 * nNet); continue; }
      const u = new URL(url);
      throw new Error(`could not reach ${u.host}: ${e.message}` + (/^(localhost|127\.)/.test(u.hostname) ? ' (is the local speech server running? DOODLE_TTS_BASE_URL says where it is)' : ''));
    }
    if (res.status >= 200 && res.status < 300) return res;
    const text = res.body.toString().slice(0, 400).replace(/\s+/g, ' ');
    if (res.status === 401 || res.status === 403) throw new KeyProblem(provider, key, res.status, text);
    if (res.status === 429 && n429++ < 3) {
      const wait = retryAfter(res) ?? COOLDOWN;
      note(`voice: ${P} is rate-limiting requests (429); waiting ${wait} s, then trying again`);
      await sleep(wait * 1000); continue;
    }
    if (res.status >= 500 && n5xx++ < 2) { await sleep(Math.min(COOLDOWN, 5) * 1000 * n5xx); continue; }
    throw new Error(`${P} answered ${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------- text: sentences, words, marks, tags, syllables
const PAUSES = { 'short pause': 0.25, 'medium pause': 0.5, 'long pause': 1.0, pause: 0.5 };
function pauseOf(tag) {
  const t = tag.trim().toLowerCase();
  if (t in PAUSES) return PAUSES[t];
  const m = t.match(/^(?:pause|break)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?$/);
  return m ? +m[1] / (m[2] === 'ms' ? 1000 : 1) : 0;
}
const ABBR = new Set(['e.g.', 'i.e.', 'vs.', 'dr.', 'mr.', 'mrs.', 'ms.', 'st.', 'no.', 'fig.', 'approx.', 'ca.', 'cf.', 'al.', 'prof.']);
function syllables(w) {
  const core = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9%]+$/g, '');
  if (/\d/.test(core)) return Math.max(1, Math.round((core.match(/\d/g) || []).length * 1.5)) + (core.includes('%') ? 2 : 0) + (core.match(/[.,]\d/g) || []).length;
  if (/^[A-Z]{2,5}s?$/.test(core)) return [...core.replace(/s$/, '')].reduce((n, c) => n + (c === 'W' ? 3 : 1), 0);
  return core.split(/[-–]/).reduce((n, part) => {
    let x = part.toLowerCase().replace(/[^a-z]/g, '');
    if (!x) return n;
    if (x.length <= 3) return n + 1;
    x = x.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = x.match(/[aeiouy]{1,2}/g);
    return n + Math.max(1, m ? m.length : 1);
  }, 0);
}
// parse one plate's narration into sentences of words, with marks (a word index) and delivery tags kept in order
function parseText(raw, where = 'narration') {
  const tags = [], seen = new Set(), sents = [];
  const toks = String(raw).replace(/\s+/g, ' ').trim()
    .replace(/\[([^\]\n]{1,60})\]/g, (_, t) => { tags.push(t.trim()); return ` \u0001${tags.length - 1}\u0001 `; })
    .split(' ').filter(Boolean);
  let cur = null, pend = [];
  const open = () => (cur ||= { toks: [], words: [], marks: {}, pauseBefore: 0, pauseAfter: 0, pauses: 0 });
  const close = () => {
    if (!cur) return;
    if (cur.words.length) sents.push(cur);
    else if (sents.length) { const s = sents.at(-1); s.pauseAfter += cur.pauseBefore; s.pauses += cur.pauseBefore; s.toks.push(...cur.toks); }
    else if (cur.toks.length) sents.push(cur);          // tags only, no words: kept so the caller can refuse it
    cur = null;
  };
  for (const tok of toks) {
    open();
    const tg = tok.match(/^\u0001(\d+)\u0001$/);
    if (tg) {
      const t = tags[+tg[1]], p = pauseOf(t);
      cur.toks.push({ tag: t });
      if (p) { if (cur.words.length) { cur.words.at(-1).after += p * SYL_PER_SEC; cur.pauses += p; } else cur.pauseBefore += p; }
      continue;
    }
    const names = [];
    const w = tok.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, n) => { names.push(n); return ''; });
    for (const n of names) { if (seen.has(n)) throw new SetupError(`${where}: the mark {${n}} is used twice`); seen.add(n); }
    pend.push(...names);
    if (!/[A-Za-z0-9]/.test(w)) {                        // a dash or other punctuation on its own
      if (w) { cur.toks.push({ text: w }); if (cur.words.length) cur.words.at(-1).after += 1.5; }
      continue;
    }
    for (const n of pend) cur.marks[n] = cur.words.length;
    pend = [];
    cur.words.push({ text: w, syl: syllables(w), after: /([,;:—–]|\.\.\.|…)["'”’)\]]*$/.test(w) ? 1.5 : 0 });
    cur.toks.push({ text: w });
    const bare = w.toLowerCase().replace(/["'”’)\]]+$/, '');
    if (/[.!?]$/.test(bare) && !ABBR.has(bare) && !/(\.\.\.|…)$/.test(bare)) close();
  }
  close();
  if (pend.length) throw new SetupError(`${where}: the mark {${pend[0]}} has no word after it (a mark goes right before the word it times)`);
  for (const s of sents) {
    s.src = s.toks.map(t => t.tag != null ? `[${t.tag}]` : t.text).join(' ');
    s.plain = s.toks.filter(t => t.tag == null).map(t => t.text).join(' ');
    s.weight = s.words.reduce((a, w) => a + w.syl + w.after, 0);
  }
  const words = sents.reduce((a, s) => a + s.words.length, 0);
  const pauses = sents.reduce((a, s, i) => a + (i ? s.pauseBefore : 0) + s.pauses, 0);
  return { sents, words, pauses, marks: [...seen] };
}
function sayAs(pron, provider) {
  return Object.entries(pron || {}).map(([term, v]) => [term, typeof v === 'string' ? v : (v?.[provider] ?? v?.say ?? v?.default)])
    .filter(([t, s]) => t && s).sort((a, b) => b[0].length - a[0].length);
}
function applyPron(text, pairs) {
  for (const [term, say] of pairs) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, term === term.toLowerCase() ? 'gi' : 'g'), say);
  }
  return text;
}
const NAMED_PAUSE = new Set(['short pause', 'medium pause', 'long pause']);
const geminiTag = t => { const p = pauseOf(t); return p && !NAMED_PAUSE.has(t.trim().toLowerCase()) ? (p < 0.4 ? 'short pause' : p < 0.8 ? 'medium pause' : 'long pause') : t; };
// Gemini 3.8 (see GEMINI 3.8 at the top). Models before it take the direction and words as one prompt
const legacyGemini = model => /^gemini-(2\.5|3\.1)-/.test(model);
// the vocal sounds Gemini 3.8 acts inline, from its TTS guide; it has a short and a long pause but no medium one
const VOCAL = new Set(['argh', 'breath', 'heavy breath', 'exhales', 'cackle', 'cheer', 'chuckle', 'chuckles', 'cough', 'cry',
  'gasp', 'giggle', 'groan', 'growl', 'grunt', 'grr', 'hiss', 'laugh', 'laughter', 'moan', 'pant', 'pff', 'phew', 'scream',
  'shout', 'shriek', 'sigh', 'sighs', 'sneeze', 'snicker', 'snort', 'sob', 'throat-clearing', 'tsk', 'whimper', 'whispers',
  'whispering', 'yawn']);
const geminiStyle = d => String(d || '').trim().replace(/[:.]\s*$/, '').replace(/^say\s+/i, '').trim();
// a plate's words for Gemini 3.8 as parts of one request: pauses and vocal sounds become <tags> in the words, and any
// other tag starts a new part that is read with that tag added to the style
function geminiTurns(parsed, pairs) {
  const turns = [{ tag: null, words: [] }];
  for (const s of parsed.sents) for (const t of s.toks) {
    if (t.tag == null) { turns.at(-1).words.push(t.text); continue; }
    const low = t.tag.trim().toLowerCase(), p = pauseOf(low);
    if (p) turns.at(-1).words.push(p < 0.8 ? '<short pause>' : '<long pause>');
    else if (VOCAL.has(low)) turns.at(-1).words.push(`<${low}>`);
    else {                                 // the step to a new part is a pause of about a second already
      const w = turns.at(-1).words; while (/^<(short|long) pause>$/.test(w.at(-1))) w.pop();
      turns.push({ tag: t.tag.trim(), words: [] });
    }
  }
  return turns.map(t => ({ tag: t.tag, text: applyPron(t.words.join(' '), pairs) }))
    .filter(t => /[A-Za-z0-9]/.test(t.text.replace(/<[^>]*>/g, '')));
}

// ---------------------------------------------------------------- audio: WAV, loudness, speech and pauses
function readWav(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Retryable('the answer is not a WAV file');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), start = p + 8;
    let size = buf.readUInt32LE(p + 4);
    if (id === 'data') { if (!size || size === 0xFFFFFFFF || start + size > buf.length) size = buf.length - start; data = buf.subarray(start, start + size); break; }
    if (id === 'fmt ') {
      fmt = { format: buf.readUInt16LE(start), ch: buf.readUInt16LE(start + 2), rate: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) };
      if (fmt.format === 0xFFFE && size >= 26) fmt.format = buf.readUInt16LE(start + 24);
    }
    p = start + size + (size & 1);
  }
  if (!fmt || !data) throw new Retryable('a WAV file with no audio in it');
  const { ch, bits, format } = fmt, bps = bits / 8, n = Math.floor(data.length / (bps * ch)), x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < ch; c++) {
      const o = (i * ch + c) * bps;
      s += format === 3 ? (bits === 64 ? data.readDoubleLE(o) : data.readFloatLE(o))
        : bits === 16 ? data.readInt16LE(o) / 32768 : bits === 24 ? data.readIntLE(o, 3) / 8388608 : bits === 32 ? data.readInt32LE(o) / 2147483648 : (data[o] - 128) / 128;
    }
    x[i] = s / ch;
  }
  return { samples: x, rate: fmt.rate };
}
function pcm16le(buf) { const n = buf.length >> 1, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(i * 2) / 32768; return x; }
function wavBuffer(x, rate) {
  const n = x.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  return b;
}
function biquad(x, b0, b1, b2, a1, a2) {
  const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o; }
  return y;
}
// integrated loudness (ITU-R BS.1770-4) of a mono clip: K-weighting, 400 ms blocks every 100 ms, gates at -70 LUFS and -10 LU
function lufs(x, rate) {
  let K = Math.tan(Math.PI * 1681.974450955533 / rate);
  const Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416, Q1 = 0.7071752369554196;
  let a0 = 1 + K / Q1 + K * K;
  let y = biquad(x, (Vh + Vb * K / Q1 + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q1 + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q1 + K * K) / a0);
  K = Math.tan(Math.PI * 38.13547087602444 / rate); const Q2 = 0.5003270373238773; a0 = 1 + K / Q2 + K * K;
  y = biquad(y, 1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q2 + K * K) / a0);
  const B = Math.round(0.4 * rate), S = Math.round(0.1 * rate), cs = new Float64Array(y.length + 1), ms = [];
  for (let i = 0; i < y.length; i++) cs[i + 1] = cs[i] + y[i] * y[i];
  if (y.length < B) ms.push(cs[y.length] / Math.max(1, y.length));
  else for (let a = 0; a + B <= y.length; a += S) ms.push((cs[a + B] - cs[a]) / B);
  const L = z => -0.691 + 10 * Math.log10(z), mean = a => a.reduce((s, z) => s + z, 0) / a.length;
  const g1 = ms.filter(z => z > 0 && L(z) > -70);
  if (!g1.length) return -Infinity;
  const rel = L(mean(g1)) - 10, g2 = g1.filter(z => L(z) > rel);
  return L(mean(g2));
}
const peakDb = x => { let m = 0; for (const v of x) { const a = Math.abs(v); if (a > m) m = a; } return m > 0 ? 20 * Math.log10(m) : -Infinity; };
// where the speech is: 10 ms frames above a threshold set from the clip's own level; pauses of MIN_GAP or more between
function speechMap(x, rate) {
  const n = Math.max(1, Math.round(rate * 0.01)), F = Math.ceil(x.length / n), hop = n / rate, db = new Float32Array(F);
  for (let f = 0; f < F; f++) { let s = 0; const a = f * n, b = Math.min(x.length, a + n); for (let i = a; i < b; i++) s += x[i] * x[i]; db[f] = 10 * Math.log10(s / Math.max(1, b - a) + 1e-12); }
  const sorted = Float32Array.from(db).sort(), p95 = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? -120;
  const thr = Math.min(-40, Math.max(-62, p95 - 38));
  const runs = []; let i = 0;
  while (i < F) { if (db[i] <= thr) { i++; continue; } let j = i; while (j < F && db[j] > thr) j++; if ((j - i) * hop >= 0.03) runs.push([i, j]); i = j; }
  if (!runs.length) return { onset: null, offset: null, gaps: [], thr };
  const gaps = [];
  for (let k = 1; k < runs.length; k++) { const g0 = runs[k - 1][1] * hop, g1 = runs[k][0] * hop; if (g1 - g0 >= MIN_GAP) gaps.push([g0, g1]); }
  return { onset: runs[0][0] * hop, offset: Math.min(x.length / rate, runs.at(-1)[1] * hop), gaps, thr };
}
// sentence [start, end] times from the pauses in a clip: sentence boundaries are matched in order to the pauses
// nearest their expected place (by syllables), preferring long pauses; a boundary with no pause is estimated
function alignSentences(sents, m) {
  const N = sents.length, on = m.onset, off = m.offset, span = Math.max(0.01, off - on);
  if (N === 1) return { times: [[on, off]], matched: 0 };
  const w = sents.map(s => s.weight), gapW = sents.map((s, k) => k ? SENT_GAP * SYL_PER_SEC + s.pauseBefore * SYL_PER_SEC : 0);
  const total = w.reduce((a, b) => a + b, 0) + gapW.reduce((a, b) => a + b, 0);
  const exp = []; let acc = 0;
  for (let k = 0; k < N - 1; k++) { acc += w[k]; exp.push(on + span * (acc + gapW[k + 1] / 2) / total); acc += gapW[k + 1]; }
  const G = m.gaps.filter(g => g[0] > on + 0.05 && g[1] < off - 0.05), B = N - 1, SKIP = 0.9, INF = 1e9;
  const cost = (k, g) => 4 * Math.abs((G[g][0] + G[g][1]) / 2 - exp[k]) / span - Math.min(1, G[g][1] - G[g][0]);
  const dp = Array.from({ length: B + 1 }, () => new Float64Array(G.length + 1).fill(INF)), how = Array.from({ length: B + 1 }, () => new Int8Array(G.length + 1));
  for (let g = 0; g <= G.length; g++) dp[0][g] = 0;
  for (let k = 1; k <= B; k++) for (let g = 0; g <= G.length; g++) {
    let best = dp[k - 1][g] + SKIP, h = 2;                                   // boundary k-1 has no pause
    if (g > 0 && dp[k][g - 1] < best) { best = dp[k][g - 1]; h = 0; }       // pause g-1 is not a boundary
    if (g > 0 && dp[k - 1][g - 1] + cost(k - 1, g - 1) < best) { best = dp[k - 1][g - 1] + cost(k - 1, g - 1); h = 1; }
    dp[k][g] = best; how[k][g] = h;
  }
  const bnd = new Array(B); let k = B, g = G.length, matched = 0;
  while (k > 0) { const h = how[k][g]; if (h === 0) g--; else if (h === 1) { bnd[k - 1] = G[g - 1]; matched++; k--; g--; } else { bnd[k - 1] = null; k--; } }
  for (let j = 0; j < B; j++) if (!bnd[j]) {                                   // an estimated boundary stays between its neighbours
    const lo = j ? (bnd[j - 1] ? bnd[j - 1][1] : on) : on, hi = bnd.slice(j + 1).find(Boolean)?.[0] ?? off;
    const t = hi - lo > 0.1 ? Math.min(hi - 0.05, Math.max(lo + 0.05, exp[j])) : (lo + hi) / 2; bnd[j] = [t, t];
  }
  return { times: sents.map((s, j) => [j ? bnd[j - 1][1] : on, j < B ? bnd[j][0] : off]), matched };
}
function markTimes(sents, times, words = null) {
  const marks = {}; let base = 0;
  sents.forEach((s, j) => {
    const [a, b] = times[j];
    for (const [name, wi] of Object.entries(s.marks)) {
      if (words) { marks[name] = r3(words[base + wi][0]); continue; }            // the provider said when the word starts
      const before = s.words.slice(0, wi).reduce((t, w) => t + w.syl + w.after, 0);
      marks[name] = r3(a + (b - a) * (s.weight ? before / s.weight : 0));
    }
    base += s.words.length;
  });
  return marks;
}
// the start and end of each of our words from the provider's own timing. Grok and ElevenLabs time every character
// they were sent, Inworld every word. What they timed can differ from our words (a respelling, a tag, a number they
// wrote out), so both sides are cut down to letters and digits and matched with a longest-common-subsequence
// alignment; each of our words takes the times of its matched letters, and a word with nothing matched is placed
// between its neighbours by its syllables. Returns null when too little matched to trust (then the pauses are used).
// timed: { chars: [[c, start, end]] } or { words: [[word, start, end]] }, in seconds from the start of the audio
function wordTimes(parsed, pairs, timed) {
  const ours = parsed.sents.flatMap(s => s.words.map(w => ({ w, key: applyPron(w.text, pairs).toLowerCase().replace(/[^a-z0-9]/g, '') })));
  const theirs = [];
  if (timed?.chars) for (const [c, t0, t1] of timed.chars) { const k = String(c).toLowerCase().replace(/[^a-z0-9]/g, ''); for (const ch of k) theirs.push([ch, t0, t1]); }
  else if (timed?.words) for (const [w, t0, t1] of timed.words) {
    const k = String(w).toLowerCase().replace(/[^a-z0-9]/g, ''), d = (t1 - t0) / Math.max(1, k.length);
    [...k].forEach((ch, i) => theirs.push([ch, t0 + d * i, t0 + d * (i + 1)]));
  }
  const A = ours.flatMap((o, wi) => [...o.key].map(ch => [ch, wi])), n = A.length, m = theirs.length;
  if (!n || !m || n * m > 3e7) return null;
  const W = m + 1, L = new Uint16Array((n + 1) * W);                   // L[i][j]: longest match of A[i..] and theirs[j..]
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * W + j] = A[i][0] === theirs[j][0] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
  if (L[0] < 0.6 * n) return null;
  const span = ours.map(() => null);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (A[i][0] === theirs[j][0] && L[i * W + j] === L[(i + 1) * W + j + 1] + 1) {
      const wi = A[i][1], [, t0, t1] = theirs[j];
      span[wi] = span[wi] ? [Math.min(span[wi][0], t0), Math.max(span[wi][1], t1)] : [t0, t1]; i++; j++;
    } else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) i++; else j++;
  }
  for (let k = 0; k < span.length; k++) {                               // words with nothing matched: share the gap
    if (span[k]) continue;
    let e = k; while (e < span.length && !span[e]) e++;
    const lo = k ? span[k - 1][1] : (span[e]?.[0] ?? 0), hi = e < span.length ? span[e][0] : lo;
    const syl = ours.slice(k, e).map(o => o.w.syl), tot = syl.reduce((a, b) => a + b, 0) || 1; let t = lo;
    for (let q = k; q < e; q++) { const d = (hi - lo) * syl[q - k] / tot; span[q] = [t, t + d]; t += d; }
    k = e - 1;
  }
  return span.map(([a, b]) => [r3(a), r3(Math.max(a, b))]);
}

// ---------------------------------------------------------------- providers
const byIdFault = new Map();
function fakeFault(id) {
  for (const f of list(process.env.DOODLE_TTS_FAKE_FAULT)) {
    const [u, kind] = f.split(':');
    if (u !== id) continue;
    if (kind.endsWith('-once')) { const n = (byIdFault.get(id) || 0) + 1; byIdFault.set(id, n); return n === 1 ? kind.replace('-once', '') : null; }
    return kind;
  }
  return null;
}
const chunksOf = (parsed, pairs) => parsed.sents.map((s, i) => ({ text: applyPron(s.plain, pairs), pauseBefore: i ? s.pauseBefore : 0 }));
// join sentence clips with SENT_GAP (plus any pause tag) between them; returns the exact sentence times
function joinChunks(parts, rate, speed = 1) {
  const pieces = [], times = []; let t = 0;
  parts.forEach((x, i) => {
    const m = speechMap(x.samples, rate), a = m.onset == null ? 0 : Math.floor(m.onset * rate), b = m.offset == null ? 0 : Math.ceil(m.offset * rate);
    if (i) { const gap = Math.round((SENT_GAP / speed + x.pauseBefore) * rate); pieces.push(new Float32Array(gap)); t += gap / rate; }
    const seg = x.samples.subarray(a, b); pieces.push(seg); times.push([t, t + seg.length / rate]); t += seg.length / rate;
  });
  const y = new Float32Array(pieces.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of pieces) { y.set(p, o); o += p.length; }
  return { samples: y, times };
}
const ADAPTERS = {
  gemini: {
    direction: () => true, speed: false,
    // 3.8 on: the words alone, in parts (turns), each with its style; text is what the fingerprint and sidecar record
    prepare(parsed, pairs, plan) {
      if (legacyGemini(plan.model)) return { text: applyPron(parsed.sents.map(s => s.toks.map(t => t.tag != null ? `[${geminiTag(t.tag)}]` : t.text).join(' ')).join(' '), pairs) };
      const turns = geminiTurns(parsed, pairs);
      return { turns, text: turns.map(t => (t.tag ? `[${t.tag}] ` : '') + t.text).join(' ') };
    },
    async synth(plan) {
      const key = findKey('gemini'), base = (process.env.DOODLE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
      const headers = { 'content-type': 'application/json' }; if (key) headers['x-goog-api-key'] = key.value;
      const audioOf = (mime = '', b64) => { const buf = Buffer.from(b64, 'base64');
        return /wav/i.test(mime) ? readWav(buf) : decodeAudio(buf, +(mime.match(/rate=(\d+)/)?.[1] || 24000)); };
      let j;
      const json = res => { try { return JSON.parse(res.body.toString()); } catch { throw new Retryable('Gemini answered with something that is not JSON'); } };
      if (!plan.turns) {                                  // 3.1 and the 2.5 previews: the direction, then the words
        const dir = (plan.direction || '').trim(), prompt = dir ? `${/[:.!?]$/.test(dir) ? dir : dir + ':'} ${plan.text}` : plan.text;
        const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: plan.voice } } } } });
        j = json(await call('gemini', key, `${base}/models/${encodeURIComponent(plan.model)}:generateContent`, { method: 'POST', headers, body }));
        const parts = j?.candidates?.[0]?.content?.parts || [], audio = parts.find(p => p.inlineData?.data);
        if (!audio) {
          const txt = parts.map(p => p.text).filter(Boolean).join(' ').slice(0, 120), why = j?.candidates?.[0]?.finishReason;
          throw new Retryable(`Gemini returned no audio${why ? ` (finish reason ${why})` : ''}${txt ? `; it wrote text instead: "${txt}"` : ''}`);
        }
        const u = j.usageMetadata || {};
        return { ...audioOf(audio.inlineData.mimeType, audio.inlineData.data), tokens: { in: u.promptTokenCount || 0, out: u.candidatesTokenCount || 0 } };
      }
      const style = geminiStyle(plan.direction);
      const content = plan.turns.map(t => { const s = [style, t.tag].filter(Boolean).join('; ');
        return { type: 'text', text: t.text, ...(s ? { annotations: [{ type: 'speech_metadata', style: s }] } : {}) }; });
      const body = JSON.stringify({ model: plan.model, input: [{ type: 'user_input', content }], response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: plan.voice }] }, store: false });
      j = json(await call('gemini', key, `${base}/interactions`, { method: 'POST', headers, body }));
      const parts = [...(j?.steps || []).flatMap(s => s?.content || []), ...(j?.outputs || [])];
      const audio = parts.filter(p => p?.type === 'audio' && p.data).at(-1);
      if (!audio) {
        const txt = parts.map(p => p?.text).filter(Boolean).join(' ').slice(0, 120);
        throw new Retryable(`Gemini returned no audio${j?.status && j.status !== 'completed' ? ` (status ${j.status})` : ''}${txt ? `; it wrote text instead: "${txt}"` : ''}`);
      }
      const u = j.usage || {};
      return { ...audioOf(audio.mime_type || audio.mimeType, audio.data), tokens: { in: u.total_input_tokens || 0, out: u.total_output_tokens || 0 } };
    },
  },
  openai: {
    direction: plan => /^gpt-/.test(plan.model),
    prepare: (parsed, pairs) => ({ text: applyPron(parsed.sents.map(s => s.plain).join(' '), pairs) }),
    async synth(plan, cfg) {
      const local = cfg.provider === 'local', key = findKey(local ? 'local' : 'openai');
      if (!local && /realtime|audio-preview/i.test(plan.model)) throw new SetupError(`${plan.model} is a realtime or chat model; voice.mjs uses OpenAI's plain speech endpoint (/audio/speech). Use gpt-4o-mini-tts, tts-1 or tts-1-hd.`);
      if (!local && /^tts-1/.test(plan.model) && /^(ballad|verse|marin|cedar)$/.test(plan.voice)) throw new SetupError(`${plan.model} has no voice ${plan.voice} (it is only on gpt-4o-mini-tts); pick alloy, ash, coral, echo, fable, nova, onyx, sage or shimmer`);
      const base = (local ? process.env.DOODLE_TTS_BASE_URL || 'http://localhost:8880/v1' : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const body = { model: plan.model, voice: plan.voice, input: plan.text, response_format: 'wav' };
      if (this.direction(plan) && plan.direction) body.instructions = plan.direction.replace(/:\s*$/, '.');
      if (plan.speed && plan.speed !== 1) body.speed = plan.speed;
      const headers = { 'content-type': 'application/json' }; if (key) headers.authorization = `Bearer ${key.value}`;
      const res = await call(cfg.provider, key, `${base}/audio/speech`, { method: 'POST', headers, body: JSON.stringify(body) });
      return { ...readWav(res.body), chars: plan.text.length };
    },
  },
  kokoro: {
    direction: () => false, deterministic: true,
    prepare: (parsed, pairs) => ({ chunks: chunksOf(parsed, pairs) }),
    async synthMany(plans) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doodle-kokoro-')), jobs = [];
      const lang = v => ({ a: 'en-us', b: 'en-gb', e: 'es', f: 'fr-fr', h: 'hi', i: 'it', j: 'ja', p: 'pt-br', z: 'cmn' })[v[0]] || 'en-us';
      plans.forEach((p, i) => p.chunks.forEach((c, k) => jobs.push({ out: path.join(tmp, `${i}_${k}.wav`), text: c.text, voice: p.voice, speed: p.speed || 1, lang: lang(p.voice) })));
      try {
        await new Promise((resolve, reject) => {
          const py = spawn(process.env.DOODLE_PYTHON || 'python3', [path.join(HERE, 'voice_kokoro.py')], { stdio: ['pipe', 'pipe', 'inherit'] });
          let done = 0, buf = '';
          py.stdout.on('data', d => { buf += d; const lines = buf.split('\n'); buf = lines.pop(); done += lines.filter(l => l.includes('"done"')).length;
            if (jobs.length > 3 && done % 5 === 0 && lines.length) note(`voice: Kokoro ${done}/${jobs.length} sentences`); });
          py.on('error', e => reject(new SetupError(`could not run ${process.env.DOODLE_PYTHON || 'python3'} for Kokoro: ${e.message}`)));
          py.on('close', code => code === 0 ? resolve() : reject(code === 3 ? new SetupError('Kokoro needs the kokoro-onnx Python package: python3 -m pip install kokoro-onnx')
            : code === 4 ? new SetupError('the Kokoro model files could not be downloaded (see above)') : code === 5 ? new SetupError('unknown Kokoro voice (see above)')
            : new Error(`voice_kokoro.py stopped with exit code ${code}`)));
          py.stdin.end(JSON.stringify({ jobs }));
        });
        let j = 0;
        return plans.map(p => {
          const parts = p.chunks.map(c => ({ ...readWav(fs.readFileSync(jobs[j++].out)), pauseBefore: c.pauseBefore }));
          const rate = parts[0].rate, joined = joinChunks(parts, rate, p.speed || 1);
          return { samples: joined.samples, rate, sentences: joined.times };
        });
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    },
  },
  fake: {
    direction: () => false,                        // not deterministic, so it retakes failures like a network voice
    prepare: (parsed, pairs) => ({ chunks: chunksOf(parsed, pairs) }),
    // a stand-in voice for tests: each syllable is a 0.25 s hum, words are 0.05 s apart, sentences 0.4 s apart
    async synth(plan) {
      const rate = 24000, fault = fakeFault(plan.id), speed = (plan.speed || 1) * (fault === 'slow' ? 0.4 : 1);
      const f0 = (110 + (plan.voice.charCodeAt(plan.voice.length - 1) % 5) * 12) * (fault === 'odd' ? 1.6 : 1);   // one pitch per voice; 'odd' is another person
      const pieces = [], truth = []; let t = 0;
      const add = (sec, fn) => { const n = Math.round(sec * rate), y = new Float32Array(n); if (fn) for (let i = 0; i < n; i++) y[i] = fn(i / rate, sec); pieces.push(y); t += sec; };
      add(0.2);
      plan.chunks.forEach((c, i) => {
        if (i) add(0.4 / speed + c.pauseBefore);
        const s0 = t, words = c.text.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w));
        words.forEach((w, k) => {
          if (k) add(0.05 / speed);
          if (fault === 'gap' && k === Math.floor(words.length / 2)) add(2.0);
          add(syllables(w) * 0.25 / speed, (u, d) => { const env = Math.sin(Math.PI * Math.min(1, u / d)) ** 0.5;
            return 0.3 * env * (Math.sin(2 * Math.PI * f0 * u) + 0.5 * Math.sin(4 * Math.PI * f0 * u) + 0.25 * Math.sin(6 * Math.PI * f0 * u)); });
          if (/[,;:]$/.test(w)) add(0.09 / speed);
        });
        truth.push([s0, t]);
      });
      add(0.3);
      const y = new Float32Array(pieces.reduce((n, p) => n + p.length, 0)); let o = 0;
      for (const p of pieces) { y.set(p, o); o += p.length; }
      const gain = fault === 'silent' ? 0 : fault === 'loud' ? 4 : fault === 'quiet' ? 0.2 : 1;
      for (let i = 0; i < y.length; i++) y[i] = gain ? Math.max(-1, Math.min(1, y[i] * gain)) : (((i * 2654435761) >>> 0) / 4294967296 - 0.5) * 1e-5;
      return { samples: y, rate, truth };
    },
  },
};
ADAPTERS.local = ADAPTERS.openai;

// the three providers that report timing. Each returns the audio, its word times (see wordTimes) and the characters billed.
const baseUrl = (v, d) => (process.env[v] || d).replace(/\/+$/, '');
const decodeAudio = (buf, rate) => buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' ? readWav(buf) : { samples: pcm16le(buf), rate };
const clampSpeed = (s, lo, hi, P) => { const v = Math.min(hi, Math.max(lo, s || 1)); if (Math.abs(v - (s || 1)) > 1e-6) note(`voice: ${P} takes speeds from ${lo} to ${hi}; using ${v}`); return v; };
function tooLong(plan, max, P) {
  if (plan.text.length > max) throw new SetupError(`${plan.id}: its narration is ${plan.text.length} characters and ${P} takes at most ${max} in one request; split it across two plates`);
}
function parseJson(res, P) { try { return JSON.parse(res.body.toString()); } catch { throw new Retryable(`${P} answered with something that is not JSON`); } }
// our tags for each provider: a pause tag becomes that provider's pause, other tags are kept where the voice acts them
function tagText(parsed, pairs, tag) {
  return applyPron(parsed.sents.map(s => s.toks.map(t => t.tag != null ? tag(t.tag) : t.text).filter(Boolean).join(' ')).join(' '), pairs).replace(/\s+/g, ' ').trim();
}
const GROK_TAGS = new Set(['pause', 'long-pause', 'breath', 'inhale', 'exhale', 'sigh', 'laugh', 'chuckle', 'hum', 'tsk', 'giggle', 'cry']);
const breakTag = (t, max = 10) => { const p = pauseOf(t); return p ? `<break time="${Math.min(max, p)}s" />` : null; };
ADAPTERS.xai = {
  direction: () => false,
  prepare: (parsed, pairs) => ({ text: tagText(parsed, pairs, t => { const p = pauseOf(t), k = t.trim().toLowerCase();
    return p ? (p >= 0.8 ? '[long-pause]' : '[pause]') : GROK_TAGS.has(k) ? `[${k}]` : ''; }) }),
  async synth(plan) {
    tooLong(plan, 15000, 'Grok');
    const key = findKey('xai'), rate = 24000, body = { text: plan.text, voice_id: plan.voice, language: 'en', with_timestamps: true,
      output_format: { codec: 'pcm', sample_rate: rate } };
    if (plan.model && plan.model !== PROVIDERS.xai.model) body.model = plan.model;
    if (plan.speed && plan.speed !== 1) body.speed = clampSpeed(plan.speed, 0.7, 1.5, 'Grok');
    const headers = { 'content-type': 'application/json' }; if (key) headers.authorization = `Bearer ${key.value}`;
    const res = await call('xai', key, `${baseUrl('DOODLE_XAI_BASE_URL', 'https://api.x.ai/v1')}/tts`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!/json/i.test(res.headers['content-type'] || '')) return { ...decodeAudio(res.body, rate), chars: plan.text.length };
    const j = parseJson(res, 'Grok'), b64 = j.audio ?? j.audio_base64 ?? j.data;
    if (!b64) throw new Retryable('Grok returned no audio');
    const ts = j.audio_timestamps || j.timestamps || {}, cs = ts.graph_chars || ts.chars || [], tt = ts.graph_times || ts.times || [];
    // one time per character; if only starts are given, a character ends where the next begins
    // xAI's guide shows [start, end] pairs and its API reference { start, end } objects; plain start times also work
    const se = t => Array.isArray(t) ? [t[0], t[1]] : t && typeof t === 'object' ? [t.start, t.end] : [t, undefined];
    const chars = cs.map((c, i) => { const [s, e] = se(tt[i]); return [c, +s, +(e ?? se(tt[i + 1])[0] ?? s + 0.08)]; }).filter(c => Number.isFinite(c[1]) && Number.isFinite(c[2]));
    const ms = chars.length && chars.at(-1)[2] > 600;                          // times in milliseconds
    return { ...decodeAudio(Buffer.from(b64, 'base64'), rate), chars: plan.text.length,
      words: chars.length ? wordTimes(plan.parsed, plan.pairs, { chars: ms ? chars.map(([c, s, e]) => [c, s / 1000, e / 1000]) : chars }) : null };
  },
};
const ELEVEN_ID = /^[A-Za-z0-9]{20}$/;
// the replacements ElevenLabs names for its retiring default voices (Voice Library voices, used by ID when they are not
// on the account); from its "default voices" help page, read 2026-09-23
const ELEVEN_KNOWN = { darian: 'gOupLcAkjEnguROwi4oS', sawyer: '8dEUmyPMdDdK91vboYih', finley: 'fnYMz3F5gMEDGMWcH1ex',
  eldrin: '6WwXjDDEMyNmFG95zycZ', elara: 'WQP7cQUF5aAS6Axh5yaa', talia: 'OZ0L6eISlOejga3XjDFt' };
let elevenVoices = null;
async function elevenVoice(name, key) {
  if (ELEVEN_ID.test(name)) return name;
  const headers = key ? { 'xi-api-key': key.value } : {};
  elevenVoices ||= call('elevenlabs', key, `${baseUrl('DOODLE_ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io/v1').replace(/\/v1$/, '')}/v2/voices?page_size=100`, { headers, timeout: 30000 })
    .then(r => parseJson(r, 'ElevenLabs').voices || []);
  const vs = await elevenVoices, n = name.toLowerCase();
  const v = vs.find(x => x.name?.toLowerCase() === n) || vs.find(x => x.name?.toLowerCase().split(/\s+[-–—(]|,/)[0].trim() === n);
  if (!v && ELEVEN_KNOWN[n]) return ELEVEN_KNOWN[n];
  if (!v) throw new SetupError(`ElevenLabs has no voice called "${name}" on this account. Use a voice ID, or one of: ${vs.map(x => x.name).slice(0, 25).join(', ') || '(none listed)'}. Voices from the Voice Library must be added to your account first.`);
  return v.voice_id;
}
ADAPTERS.elevenlabs = {
  direction: () => false,
  // eleven_v3 acts audio tags like [curious] and ignores <break>, so a pause becomes an ellipsis; the older models
  // take <break time="..."/> (at most 3 s) and would read other tags aloud
  prepare: (parsed, pairs, plan) => ({ text: /v3/.test(plan.model) ? tagText(parsed, pairs, t => pauseOf(t) ? '...' : `[${t}]`) : tagText(parsed, pairs, t => breakTag(t, 3) || '') }),
  async synth(plan) {
    tooLong(plan, /v3/.test(plan.model) ? 5000 : 10000, 'ElevenLabs');
    const key = findKey('elevenlabs'), rate = 24000, voice = await elevenVoice(plan.voice, key);
    const body = { text: plan.text, model_id: plan.model, voice_settings: { stability: /v3/.test(plan.model) ? 0.5 : 0.6, similarity_boost: 0.75,
      ...(plan.speed && plan.speed !== 1 ? { speed: clampSpeed(plan.speed, 0.7, 1.2, 'ElevenLabs') } : {}) } };
    const headers = { 'content-type': 'application/json' }; if (key) headers['xi-api-key'] = key.value;
    const res = await call('elevenlabs', key, `${baseUrl('DOODLE_ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io/v1')}/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=pcm_${rate}`,
      { method: 'POST', headers, body: JSON.stringify(body) });
    const j = parseJson(res, 'ElevenLabs');
    if (!j.audio_base64) throw new Retryable('ElevenLabs returned no audio');
    const al = j.alignment || j.normalized_alignment, cs = al?.characters || [];
    const chars = cs.map((c, i) => [c, +al.character_start_times_seconds[i], +(al.character_end_times_seconds?.[i] ?? al.character_start_times_seconds[i])]);
    return { ...decodeAudio(Buffer.from(j.audio_base64, 'base64'), rate), chars: plan.text.length, words: chars.length ? wordTimes(plan.parsed, plan.pairs, { chars }) : null };
  },
};
ADAPTERS.inworld = {
  // inworld-tts-2 follows a written direction and plain-English tags like [curious]; the Flash model ignores both
  direction: plan => !/flash/i.test(plan.model),
  prepare: (parsed, pairs, plan) => ({ text: tagText(parsed, pairs, t => breakTag(t, 10) || (/flash/i.test(plan.model) ? '' : `[${t}]`)) }),
  async synth(plan) {
    tooLong(plan, 2000, 'Inworld');
    const key = findKey('inworld'), rate = 24000;
    const body = { text: plan.text, voiceId: plan.voice, modelId: plan.model, timestampType: 'WORD',
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: rate, ...(plan.speed && plan.speed !== 1 ? { speakingRate: clampSpeed(plan.speed, 0.5, 1.5, 'Inworld') } : {}) } };
    if (plan.direction) body.instruction = plan.direction.replace(/:\s*$/, '.');
    // the key from Inworld's portal is already Base64 and is sent as it is; an "id:secret" pair is encoded here
    const headers = { 'content-type': 'application/json' };
    if (key) headers.authorization = `Basic ${key.value.includes(':') ? Buffer.from(key.value).toString('base64') : key.value}`;
    const res = await call('inworld', key, `${baseUrl('DOODLE_INWORLD_BASE_URL', 'https://api.inworld.ai')}/tts/v1/voice`, { method: 'POST', headers, body: JSON.stringify(body) });
    const j = parseJson(res, 'Inworld');
    if (!j.audioContent) throw new Retryable('Inworld returned no audio');
    const wa = j.timestampInfo?.wordAlignment, ws = wa?.words || [];
    const words = ws.map((w, i) => [w, +wa.wordStartTimeSeconds[i], +wa.wordEndTimeSeconds[i]]).filter(w => Number.isFinite(w[1]));
    return { ...decodeAudio(Buffer.from(j.audioContent, 'base64'), rate), chars: plan.text.length, words: words.length ? wordTimes(plan.parsed, plan.pairs, { words }) : null };
  },
};

// ---------------------------------------------------------------- settings, plans, clips
function readJson(file, what) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw new SetupError(`${what} (${file}) is not valid JSON: ${e.message}`); }
}
function readLines() {
  const L = readJson(LINES, 'vo/lines.json');
  if (!L) throw new SetupError(`no vo/lines.json in ${DIR} yet. Write the narration into script.md ("## Narration"), then run: node voice.mjs lines script.md`);
  if (!Array.isArray(L.units)) throw new SetupError('vo/lines.json has no "units" list');
  return L;
}
function intFlag(k, def, min) {
  if (flags[k] == null) return def;
  const v = Number(flags[k]);
  if (!Number.isInteger(v) || v < min) throw new SetupError(`--${k} needs a whole number of at least ${min} (it was given "${flags[k]}")`);
  return v;
}
function runConfig(L) {
  const provider = flags.provider || L.provider || process.env.DOODLE_TTS_PROVIDER || 'gemini';
  if (!ADAPTERS[provider]) throw new SetupError(`unknown provider "${provider}" (this version knows ${Object.keys(ADAPTERS).join(', ')})`);
  const own = provider === (L.provider || provider), P = PROVIDERS[provider], style = L.style || 'documentary';
  if (!STYLES[style]) throw new SetupError(`unknown style "${style}" (use ${Object.keys(STYLES).join(', ')})`);
  const model = flags.model || (own && L.model) || P.model, speed = +(own && L.speed) || 0;
  const pre = L.preset && provider === 'gemini' ? preset(L.preset, model) : null;    // lines.json's own fields still win
  return { provider, own, style, model, preset: pre?.name, voice: flags.voice || (own && L.voice) || pre?.voice || P.voice,
    wpm: +L.wpm || pre?.wpm || STYLES[style].wpm, direction: L.direction ?? pre?.direction ?? STYLES[style].directions[0],
    // Kokoro reads faster than a narrator, so unless lines.json or the plate sets a speed, each plate gets the speed
    // that lands it on the style's pace (kokoroSpeed); Gemini has no speed and follows the direction instead
    speed: speed || 1, autoSpeed: !speed && (provider === 'kokoro' || (provider === 'local' && /kokoro/i.test(model))),
    lufs: +L.lufs || TARGET_LUFS, lead: L.lead ?? LEAD, tail: L.tail ?? TAIL, pron: L.pronounce || {},
    jobs: intFlag('jobs', 2, 1), retakes: intFlag('retakes', 2, 0) };
}
// the Kokoro speed at which a plate lasts as long as the target pace says. The pause after each sentence is fixed
// (SENT_GAP / speed), so the words themselves are read a little faster than the target
function kokoroSpeed(parsed, voice, wpm) {
  const C = KOKORO_CURVE, pace = KOKORO_PACE[voice] || KOKORO_PACE_OTHER, total = parsed.words / wpm * 60;
  // Kokoro also stops for about 0.2 s at each comma, semicolon, colon or dash (at speed 1)
  const commas = parsed.sents.reduce((n, s) => n + (s.plain.match(/[,;:—–]/g) || []).length, 0), gaps = parsed.sents.length - 1;
  const speedFor = f => { let k = 1; while (k < C.length - 1 && f > C[k][1]) k++;
    const [s0, f0] = C[k - 1], [s1, f1] = C[k]; return Math.min(1.3, Math.max(0.5, s0 + (f - f0) * (s1 - s0) / (f1 - f0))); };
  let speed = 0.85;
  for (let i = 0; i < 4; i++) speed = speedFor(parsed.words * 60 / Math.max(0.3 * total, total - (gaps * SENT_GAP + commas * 0.2) / speed) / pace);
  return r2(speed);
}
const warned = new Set(), warnOnce = m => { if (!warned.has(m)) { warned.add(m); note('voice: ' + m); } };
function planUnit(u, cfg) {
  const A = ADAPTERS[cfg.provider], parsed = parseText(u.text || '', u.id);
  if (!parsed.words) throw new SetupError(`${u.id}: the narration has no words`);
  const voice = flags.voice || (cfg.own && u.voice) || cfg.voice;
  let speed = +u.speed || (cfg.autoSpeed ? kokoroSpeed(parsed, voice, cfg.wpm) : cfg.speed);
  if (A.speed === false && speed !== 1) {                 // it would cost a new take and change nothing
    warnOnce(`${u.id}: ${PROVIDERS[cfg.provider].name} has no speed setting, so speed ${speed} is ignored; ask for a slower or faster read in the direction instead`);
    speed = 1;
  }
  const plan = { id: u.id, plate: u.plate, key: u.key, parsed, provider: cfg.provider, model: cfg.model,
    voice, direction: u.direction ?? cfg.direction, speed, lead: +(u.lead ?? cfg.lead), tail: +(u.tail ?? cfg.tail) };
  plan.pairs = sayAs(cfg.pron, cfg.provider);
  Object.assign(plan, A.prepare(parsed, plan.pairs, plan));
  if (!A.direction(plan)) plan.direction = '';
  // settings outside lines.json that change the audio too: the Kokoro model file, and which local server answers
  const src = cfg.provider === 'kokoro' ? process.env.DOODLE_KOKORO_MODEL : cfg.provider === 'local' ? process.env.DOODLE_TTS_BASE_URL : '';
  plan.fp = crypto.createHash('sha256').update(JSON.stringify([FORMAT, plan.provider, plan.model, plan.voice, plan.direction, plan.speed,
    plan.text ?? plan.chunks, ...(src ? [src] : [])])).digest('hex').slice(0, 12);
  plan.expected = parsed.words / cfg.wpm * 60 + parsed.pauses;
  return plan;
}
function cost(meta) {
  let p = PRICE[meta.model]; if (!p) return null;
  if (p.later && (meta.created || new Date().toISOString()).slice(0, 10) >= p.later[0]) p = { ...p, ...p.later[1] };
  if (p.out && meta.tokens) return meta.tokens.in * p.in + meta.tokens.out * p.out;
  if (p.out) return meta.dur * 33 * p.out;          // Gemini bills about 33 audio tokens a second of speech (measured)
  if (p.perSec) return meta.dur * p.perSec;
  if (p.perChar) return (meta.chars || 0) * p.perChar;
  return null;
}
// trim, normalize and save one synthesized clip, with a sidecar of what was sent and measured
function saveClip(plan, cfg, res, take, clipDir) {
  const rate = res.rate, m = speechMap(res.samples, rate), meta = { fp: plan.fp, id: plan.id, provider: plan.provider, model: plan.model,
    voice: plan.voice, direction: plan.direction, speed: plan.speed, sent: plan.text ?? plan.chunks.map(c => c.text).join(' '), take,
    created: new Date().toISOString(), rate, tokens: res.tokens, chars: res.chars, target_lufs: cfg.lufs };
  let y, a = 0;
  if (m.onset == null) { y = res.samples; meta.raw_lufs = null; meta.raw_peak = null; }
  else {
    a = Math.max(0, Math.floor((m.onset - PAD_IN) * rate));
    y = res.samples.slice(a, Math.min(res.samples.length, Math.ceil((m.offset + PAD_OUT) * rate)));
    const f = Math.min(Math.round(0.005 * rate), y.length >> 1);
    for (let i = 0; i < f; i++) { y[i] *= i / f; y[y.length - 1 - i] *= i / f; }
    const raw = lufs(y, rate), pk = peakDb(y);
    let gain = cfg.lufs - raw; if (pk + gain > PEAK_CEIL) { gain = PEAK_CEIL - pk; meta.limited = r2(cfg.lufs - raw - gain); }
    const g = 10 ** (gain / 20); for (let i = 0; i < y.length; i++) y[i] *= g;
    Object.assign(meta, { raw_lufs: r2(raw), raw_peak: r2(pk), gain: r2(gain) });
  }
  const shift = t => r3(Math.max(0, Math.min(y.length / rate, t - a / rate)));
  if (res.sentences) meta.sentences = res.sentences.map(([s, e]) => [shift(s), shift(e)]);
  if (res.words) meta.words = res.words.map(([s, e]) => [shift(s), shift(e)]);
  if (res.truth) meta.truth = res.truth.map(([s, e]) => [shift(s), shift(e)]);
  meta.dur = r3(y.length / rate); meta.cost = cost(meta);
  fs.mkdirSync(clipDir, { recursive: true });
  fs.writeFileSync(path.join(clipDir, plan.fp + '.wav'), wavBuffer(y, rate));
  fs.writeFileSync(path.join(clipDir, plan.fp + '.json'), JSON.stringify(meta, null, 1));
  return meta;
}
// a cached clip made for another loudness target is turned up or down here, at no cost, instead of being made again
function regain(fp, cfg, clipDir) {
  const jf = path.join(clipDir, fp + '.json'), meta = readJson(jf, 'a clip sidecar');
  if (!meta || meta.raw_lufs == null || (meta.target_lufs ?? TARGET_LUFS) === cfg.lufs) return;
  const wf = path.join(clipDir, fp + '.wav'), w = readWav(fs.readFileSync(wf)), y = w.samples, now = lufs(y, w.rate), pk = peakDb(y);
  let gain = cfg.lufs - now; delete meta.limited;
  if (pk + gain > PEAK_CEIL) { gain = PEAK_CEIL - pk; meta.limited = r2(cfg.lufs - now - gain); }
  const g = 10 ** (gain / 20); for (let i = 0; i < y.length; i++) y[i] *= g;
  fs.writeFileSync(wf, wavBuffer(y, w.rate));
  Object.assign(meta, { gain: r2((meta.gain || 0) + gain), target_lufs: cfg.lufs });
  fs.writeFileSync(jf, JSON.stringify(meta, null, 1));
}
// what the engine gets for one plate, measured from the clip on disk
function describe(plan, cfg, clipDir) {
  const meta = readJson(path.join(clipDir, plan.fp + '.json'), 'a clip sidecar') || {};
  const w = readWav(fs.readFileSync(path.join(clipDir, plan.fp + '.wav'))), m = speechMap(w.samples, w.rate), fl = [];
  const s = plan.parsed.sents; let times, timing, words = null;
  if (m.onset == null) { fl.push('fail: no speech in the clip (the provider returned silence)'); times = s.map(() => [0, 0]); timing = 'estimate'; }
  else if (meta.words?.length === plan.parsed.words) {                      // the provider said when every word starts
    words = meta.words; timing = 'words'; let k = 0;
    times = s.map(x => { const a = words[k][0], b = words[k + x.words.length - 1][1]; k += x.words.length; return [a, b]; });
  }
  else if (meta.sentences?.length === s.length) { times = meta.sentences; timing = 'sentence-clips'; }
  else { const al = alignSentences(s, m); times = al.times; timing = al.matched || s.length === 1 ? 'silence+estimate' : 'estimate'; }
  let wpm = 0;
  if (m.onset != null) {
    const speech = m.offset - m.onset, ratio = speech / Math.max(0.1, plan.expected);
    wpm = Math.round(plan.parsed.words * 60 / Math.max(0.1, speech - plan.parsed.pauses));
    const target = cfg.wpm, dev = wpm / target - 1;
    if (speech > 1.8 * plan.expected + 0.8) fl.push(`fail: ${r2(speech)} s is ${r2(ratio)}x the ${r2(plan.expected)} s expected for ${plan.parsed.words} words (the direction may have been read aloud, or words repeated)`);
    else if (speech < 0.5 * plan.expected - 0.3) fl.push(`fail: ${r2(speech)} s is only ${r2(ratio)}x the ${r2(plan.expected)} s expected for ${plan.parsed.words} words (words may be missing)`);
    else if (Math.abs(dev) > 0.15 && plan.parsed.words >= 8) fl.push(`warn: pace ${wpm} words a minute against a target of ${target} (${dev > 0 ? '+' : ''}${Math.round(dev * 100)}%)`);
    const allowed = 1.2 + Math.max(0, ...s.flatMap(x => [x.pauseBefore, x.pauseAfter]), ...s.flatMap(x => x.words.map(q => q.after / SYL_PER_SEC)));
    for (const [g0, g1] of m.gaps) if (g1 - g0 > allowed) fl.push(`warn: ${r2(g1 - g0)} s of silence at ${r2(g0)} s that the script does not ask for`);
    if (meta.limited) fl.push(`warn: loud peaks kept this clip ${meta.limited} dB under the loudness target`);
    if (meta.raw_peak != null && meta.raw_peak > -0.1) fl.push('warn: the audio from the provider touches full scale (it may be clipped)');
    if (meta.raw_lufs != null && meta.raw_lufs < -40) fl.push(`warn: a very quiet take (${meta.raw_lufs} LUFS before normalizing)`);
  }
  return {
    id: plan.id, plate: plan.plate, file: path.relative(DIR, path.join(clipDir, plan.fp + '.wav')).split(path.sep).join('/'), fp: plan.fp,
    take: meta.take || 1, voice: plan.voice, dur: r3(w.samples.length / w.rate), lufs: m.onset == null ? null : r2(lufs(w.samples, w.rate)),
    lead: plan.lead, tail: plan.tail, text: s.map(x => x.plain).join(' '),
    sentences: s.map((x, j) => [r3(times[j][0]), r3(times[j][1]), x.plain]), marks: markTimes(s, times, words), timing,
    checks: { wpm, missing: [], extra: [], flags: fl }, _raw: meta.raw_lufs, _cost: meta.cost, _truth: meta.truth,
  };
}
// film-wide checks: a take much louder or quieter than the others before normalizing often sounds like another person
function filmChecks(units) {
  const raw = units.map(u => u._raw).filter(v => v != null).sort((a, b) => a - b);
  if (raw.length < 3) return;
  const med = raw[raw.length >> 1];
  for (const u of units) if (u._raw != null && Math.abs(u._raw - med) > 4)
    u.checks.flags.push(`warn: this take came out ${r2(Math.abs(u._raw - med))} LU ${u._raw > med ? 'louder' : 'quieter'} than the others before normalizing (it may sound like a different take)`);
}
async function pool(items, n, fn) {
  const res = new Array(items.length); let i = 0, fatal = null;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length && !fatal) { const k = i++; try { res[k] = await fn(items[k], k); } catch (e) { if (e instanceof SetupError) fatal = e; else res[k] = { error: e }; } }
  }));
  if (fatal) throw fatal;
  return res;
}
// synthesize and save every plan, with automatic retakes of clips that fail a check; returns the new sidecars
async function produce(plans, cfg, clipDir) {
  const A = ADAPTERS[cfg.provider], made = new Map(), errors = new Map(), takes = new Map();
  for (const p of plans) { const old = readJson(path.join(clipDir, p.fp + '.json'), 'a clip sidecar'); takes.set(p.fp, old?.take || 0); }
  let todo = plans;
  for (let round = 0; todo.length && round <= cfg.retakes; round++) {
    if (round) note(`voice: retaking ${todo.map(p => p.id).join(', ')} (take ${round + 1})`);
    const results = A.synthMany ? await A.synthMany(todo, cfg) : await pool(todo, cfg.jobs, p => A.synth(p, cfg));
    const again = [];
    todo.forEach((p, k) => {
      const r = results[k];
      if (!r || r.error) { errors.set(p.fp, { id: p.id, voice: p.voice, error: r?.error || new Error('no result') }); if (r?.error instanceof Retryable) again.push(p); return; }
      errors.delete(p.fp);
      takes.set(p.fp, takes.get(p.fp) + 1);
      const meta = saveClip(p, cfg, r, takes.get(p.fp), clipDir), d = describe(p, cfg, clipDir);
      made.set(p.fp, meta);
      if (d.checks.flags.some(f => f.startsWith('fail')) && !A.deterministic) again.push(p);
      if (d.checks.flags.some(f => f.startsWith('fail'))) { meta.failed = true; fs.writeFileSync(path.join(clipDir, p.fp + '.json'), JSON.stringify(meta, null, 1)); }
    });
    todo = again;
  }
  return { made, errors };
}
const printTable = (head, rows) => {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  out(head.map((h, i) => h.padEnd(w[i])).join('  ').trimEnd());
  for (const r of rows) out(r.map((c, i) => String(c).padEnd(w[i])).join('  ').trimEnd());
};
const dollars = x => x == null ? 'unknown' : x === 0 ? 'nothing' : x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`;

// ---------------------------------------------------------------- script.md: plate table, narration, pronunciation
function splitRow(line) {
  const t = line.replace(/\r$/, '').trim(), cells = []; let cur = '';
  for (let i = 0; i < t.length; i++) { if (t[i] === '\\' && t[i + 1] === '|') { cur += '\\|'; i++; } else if (t[i] === '|') { cells.push(cur); cur = ''; } else cur += t[i]; }
  cells.push(cur);
  if (t.startsWith('|')) cells.shift();
  if (t.endsWith('|') && !t.endsWith('\\|')) cells.pop();
  return cells;
}
const cellKey = c => c.replace(/[*`_]/g, '').trim().toLowerCase();
// a Dur cell: "10.5", "10.5 s", or a range like "4–6" (read as its upper end, the most the plate may take)
const durCell = c => { const n = String(c || '').match(/\d+(?:\.\d+)?/g); return n ? Math.max(...n.map(Number)) : NaN; };
function plateTable(md) {
  const L = md.split('\n');
  for (let h = 0; h < L.length - 1; h++) {
    if (!/^\s*\|/.test(L[h])) continue;
    const head = splitRow(L[h]).map(cellKey), dur = head.findIndex(c => /^dur\b/.test(c));
    if (head[0] !== '#' || dur < 0 || !/^\s*\|?\s*:?-{2,}/.test(L[h + 1])) continue;
    const rows = [];
    for (let i = h + 2; i < L.length && /^\s*\|/.test(L[i]); i++) {
      const c = splitRow(L[i]); rows.push({ line: i, key: cellKey(c[0] || ''), label: (c[0] || '').replace(/[*`]/g, '').trim(), dur: durCell(c[dur]) });
    }
    return { durCol: dur, rows };
  }
  return null;
}
// HTML comments are removed first, even across lines (their line breaks are kept, so line numbers stay right)
const noComments = md => md.replace(/<!--[\s\S]*?-->/g, c => c.replace(/[^\n]/g, ''));
function narrationBlocks(md, table) {
  const L = noComments(md).split(/\r?\n/), s = L.findIndex(l => /^##\s+narration\b/i.test(l));
  if (s < 0) return null;
  // a block starts at a "### I · Title" heading, or at an unheaded "I · Title" line whose key is a row of the plate
  // table (so a narration line like "1953 — the year ..." stays narration)
  const rowKey = k => table?.rows.some(r => r.key === k.replace(/[*`_]/g, '').toLowerCase());
  const blocks = []; let b = null;
  for (let i = s + 1; i < L.length; i++) {
    const l = L[i];
    if (/^#{1,2}\s/.test(l)) break;
    const h = l.match(/^###\s+(.+)$/), m = !h && l.match(/^(\S+)\s+[·•|:—–-]\s*(.*)$/), plan = m && rowKey(m[1]) ? m : null;
    if (h || plan) {
      if (h && /^pronunciation\b/i.test(h[1].trim())) { b = null; continue; }
      const key = h ? h[1].trim().split(/\s*[·•|:—–]\s*|\s+-\s+|\s+/)[0] : plan[1];
      blocks.push(b = { key: key.replace(/[*`]/g, ''), line: i + 1, text: [], opts: {} }); continue;
    }
    if (!b) continue;
    const o = l.match(/^\s*@(voice|direction|speed|lead|tail|climax)\b\s*[:=]?\s*(.*)$/i);
    if (o) { b.opts[o[1].toLowerCase()] = /^(speed|lead|tail)$/i.test(o[1]) ? +o[2] : o[1].toLowerCase() === 'climax' ? true : o[2].trim(); continue; }
    const t = l.replace(/^\s*>\s?/, '').replace(/[*`]/g, '').trim();
    if (t) b.text.push(t);
  }
  return blocks;
}
function pronunciations(md) {
  const L = noComments(md).split(/\r?\n/), res = {}, s = L.findIndex(l => /^#{2,4}\s+pronunciation/i.test(l));
  if (s < 0) return res;
  const level = L[s].match(/^#+/)[0].length;
  for (let i = s + 1; i < L.length; i++) {
    const hm = L[i].match(/^(#+)\s/); if (hm && hm[1].length <= level) break;
    let m = L[i].match(/^\s*[-*]\s*(.+?)\s*(?:→|->|:|=)\s*(.+?)\s*$/);
    if (!m && /^\s*\|/.test(L[i]) && !/^\s*\|?\s*:?-{2,}/.test(L[i])) { const c = splitRow(L[i]).map(x => x.trim()); if (c.length >= 2 && !/^(term|word)$/i.test(c[0])) m = [null, c[0], c[1]]; }
    if (m) { const term = m[1].replace(/[*`"]/g, '').trim(), say = m[2].replace(/[*`"]/g, '').trim(); if (term && say && !/^(say|say it as|pronunciation)$/i.test(say)) res[term] = say; }
  }
  return res;
}
const ROMAN = s => { const v = { i: 1, v: 5, x: 10, l: 50, c: 100 }; let n = 0; for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };

// ---------------------------------------------------------------- commands
async function cmdLines() {
  const script = pos[0] || 'script.md', sp = path.resolve(DIR, script);
  if (!fs.existsSync(sp)) throw new SetupError(`${sp} not found`);
  const md = fs.readFileSync(sp, 'utf8'), table = plateTable(md), blocks = narrationBlocks(md, table);
  if (!blocks) throw new SetupError(`${script} has no "## Narration" section. Add one, one block per plate:\n\n## Narration\n### I · Into the Blood\nOne particle slips into the vein. [short pause]\nIt is one of {count}about four hundred and thirty billion in a single milligram.\n`);
  const old = readJson(LINES, 'vo/lines.json') || {};
  const units = [];
  for (const b of blocks) {
    const text = b.text.join(' ').trim();
    if (!text || /^\(?(none|no narration|silent|—|–|-)\)?\.?$/i.test(text)) continue;
    const k = b.key.toLowerCase(), notPlate = `${script} line ${b.line}: "${b.key}" is not a plate in the plate table (use its # value, like I or End, or P<n>)`;
    let plate;
    if (table && table.rows.some(r => r.key === k)) plate = table.rows.findIndex(r => r.key === k);
    else if (/^p\d+$/.test(k)) plate = +k.slice(1);
    else if (table) throw new SetupError(notPlate);
    else if (/^\d+$/.test(k)) plate = +k;
    else if (/^[ivxlc]+$/.test(k)) plate = ROMAN(k);
    else throw new SetupError(notPlate);
    if (table && plate >= table.rows.length) throw new SetupError(`${script} line ${b.line}: ${b.key} is past the last plate (the table has ${table.rows.length}, P0 to P${table.rows.length - 1})`);
    const id = 'P' + plate;
    if (units.some(u => u.id === id)) throw new SetupError(`${script} line ${b.line}: plate ${b.key} has two narration blocks (one block per plate)`);
    parseText(text, `${script} plate ${b.key}`);                       // refuse broken marks now, not after paying for audio
    const u = { id, plate, key: b.key, text };                          // script.md is the only source of these, so a
    for (const k2 of ['voice', 'direction', 'speed', 'lead', 'tail', 'climax']) {   // line taken out of it is gone
      const v = b.opts[k2]; if (v === undefined || v === '') continue;
      if (typeof v === 'number' && !(Number.isFinite(v) && (k2 === 'speed' ? v > 0 : v >= 0)))
        throw new SetupError(`${script} plate ${b.key}: @${k2} needs a number${k2 === 'speed' ? ' above 0' : ' of seconds'}`);
      u[k2] = v;
    }
    units.push(u);
  }
  if (!units.length) throw new SetupError(`the Narration section of ${script} has no narration in it`);
  units.sort((a, b) => a.plate - b.plate);
  if (flags.preset && flags.provider && flags.provider !== 'gemini') throw new SetupError(`--preset picks a Gemini voice, so it cannot go with --provider ${flags.provider}`);
  const provider = flags.provider || (flags.preset && 'gemini') || old.provider || process.env.DOODLE_TTS_PROVIDER || 'gemini';
  if (!PROVIDERS[provider]) throw new SetupError(`unknown provider "${provider}"`);
  const same = provider === (old.provider || provider), style = flags.style || old.style || 'documentary';
  if (!STYLES[style]) throw new SetupError(`unknown style "${style}" (use ${Object.keys(STYLES).join(', ')})`);
  // the narrator preset (Gemini only): one named now replaces the voice, direction and pace; one kept from an earlier
  // run leaves them as lines.json has them (edits included); a film with no voice chosen yet gets its style's preset,
  // and so does one whose style changes while it still has the old style's preset
  const envVoice = provider === (process.env.DOODLE_TTS_PROVIDER || 'gemini') && process.env.DOODLE_TTS_VOICE;
  const keep = same && old.preset && !(flags.style && flags.style !== old.style && old.preset === STYLES[old.style || 'documentary']?.preset);
  const model = flags.model || (same && old.model) || PROVIDERS[provider].model;
  const pre = provider !== 'gemini' ? null : flags.preset ? preset(flags.preset, model) : keep ? preset(old.preset, model)
    : !flags.voice && !(same && old.voice && !old.preset) && !envVoice ? preset(STYLES[style].preset, model) : null;
  const fresh = pre && (flags.preset || !keep);
  // a kept preset on a new model (3.1 to 3.8) takes that model's pace, unless the pace was set by hand
  const repace = keep && old.model && old.model !== model && +old.wpm === preset(old.preset, old.model).wpm;
  const facts = flags.facts || old.facts, fp2 = facts && path.resolve(DIR, facts);           // remembered for later runs
  if (fp2 && !fs.existsSync(fp2)) throw new SetupError(`${fp2} not found (--facts)`);
  const pron = { ...(fp2 ? pronunciations(fs.readFileSync(fp2, 'utf8')) : {}), ...pronunciations(md) };
  const L = { version: FORMAT, script, ...(facts ? { facts } : {}), provider, model,
    ...(pre ? { preset: pre.name } : {}),
    voice: flags.voice || (fresh && pre.voice) || (same && old.voice) || envVoice || PROVIDERS[provider].voice,
    style, ...(fresh || repace ? { wpm: pre.wpm } : old.wpm ? { wpm: old.wpm } : {}),
    direction: fresh ? pre.direction : (pre ? old.direction : flags.style && flags.style !== old.style ? null : old.direction) ?? STYLES[style].directions[0],
    ...(old.speed ? { speed: old.speed } : {}), lufs: old.lufs ?? TARGET_LUFS, lead: old.lead ?? LEAD, tail: old.tail ?? TAIL, pronounce: pron, units,
    ...(old.audition ? { audition: old.audition } : {}) };
  fs.mkdirSync(VO, { recursive: true });
  fs.writeFileSync(LINES, JSON.stringify(L, null, 2) + '\n');
  const cfg = runConfig(L), rows = [], res = [];
  for (const u of units) {
    const p = parseText(u.text, u.id), spoken = p.words / cfg.wpm * 60 + p.pauses;
    const need = +(u.lead ?? cfg.lead) + spoken + +(u.tail ?? cfg.tail), row = table?.rows[u.plate], dur = row?.dur;
    const verdict = !Number.isFinite(dur) ? '?' : need > dur + 0.05 ? `${r2(need - dur)} s short` : dur - need > 3 ? `${r2(dur - need)} s spare` : 'fits';
    rows.push([u.id, u.key, p.words, `${spoken.toFixed(1)} s`, `${need.toFixed(1)} s`, Number.isFinite(dur) ? `${dur.toFixed(1)} s` : '?', verdict, Object.keys(p.sents.reduce((a, s) => ({ ...a, ...s.marks }), {})).join(' ')]);
    res.push({ id: u.id, words: p.words, spoken: r2(spoken), need: r2(need), dur, marks: p.marks });
  }
  if (flags.json) { out(JSON.stringify({ lines: path.relative(DIR, LINES), wpm: cfg.wpm, units: res }, null, 1)); return 0; }
  out(`wrote ${path.relative(DIR, LINES) || LINES}: ${units.length} plates, ${cfg.provider} ${cfg.model}, ${cfg.preset ? `preset ${cfg.preset} (voice ${cfg.voice})` : `voice ${cfg.voice}`}, ${style} at ${cfg.wpm} words a minute`);
  if (Object.keys(pron).length) out(`pronunciation: ${Object.entries(pron).map(([t, s]) => `${t} -> ${typeof s === 'string' ? s : JSON.stringify(s)}`).join(', ')}`);
  out('');
  printTable(['id', '#', 'words', 'spoken', 'needs', 'Dur', 'plate', 'marks'], rows);
  out(`\n"needs" is the lead-in (${cfg.lead} s) + the spoken time + the tail (${cfg.tail} s). A plate that is short needs a longer Dur or fewer words.`);
  return 0;
}

async function build(cfg, L, { synth }) {
  const clipDir = path.join(VO, 'clips'), only = new Set(list(flags.only)), retake = new Set(list(flags.retake));
  const plans = L.units.map(u => planUnit(u, cfg));
  for (const id of [...only, ...retake]) if (!plans.some(p => p.id === id)) throw new SetupError(`${id} is not in vo/lines.json (it has ${plans.map(p => p.id).join(', ')})`);
  let made = new Map(), errors = new Map(), cached = 0;
  if (synth) {
    const todo = plans.filter(p => (!only.size || only.has(p.id)) && (retake.has(p.id) || !fs.existsSync(path.join(clipDir, p.fp + '.wav'))
      || readJson(path.join(clipDir, p.fp + '.json'), 'a clip sidecar')?.failed && !ADAPTERS[cfg.provider].deterministic));
    cached = plans.filter(p => (!only.size || only.has(p.id))).length - todo.length;
    if (todo.length) note(`voice: ${todo.length} new clip${todo.length > 1 ? 's' : ''} from ${PROVIDERS[cfg.provider].name} (${cfg.model}, ${todo.map(p => p.id).join(' ')})${cached ? `; ${cached} unchanged, reused` : ''}`);
    ({ made, errors } = await produce(todo, cfg, clipDir));
  }
  const prev = readJson(VOICE, 'vo/voice.json'), prevUnits = new Map((prev?.units || []).map(u => [u.id, u])), units = [], missing = [];
  for (const p of plans) {
    if (fs.existsSync(path.join(clipDir, p.fp + '.wav'))) { regain(p.fp, cfg, clipDir); units.push(describe(p, cfg, clipDir)); continue; }
    const old = prevUnits.get(p.id);
    if (old && old.fp && fs.existsSync(path.join(DIR, old.file))) {
      // an older clip whose text or settings changed: kept exactly as it was, so its times still match its own words
      const kept = (old.checks?.flags || []).filter(f => !f.startsWith('fail: stale'));
      units.push({ ...old, checks: { ...(old.checks || {}), flags: ['fail: stale: the narration or its settings changed after this clip was made; run generate', ...kept] } });
      continue;
    }
    missing.push(p.id);
  }
  filmChecks(units);
  // the lock holds only while every clip is the very one that was locked (a retake keeps the fingerprint, so the
  // take and length are compared too) and nothing fails
  const same = (a, b) => a && ['fp', 'take', 'dur', 'plate', 'lead', 'tail'].every(k => a[k] === b[k]);
  const unchanged = prev?.locked && !missing.length && units.length === prev.units.length && units.every(u => same(prevUnits.get(u.id), u))
    && !units.some(u => u.checks.flags.some(f => f.startsWith('fail')));
  const V = { version: FORMAT, provider: cfg.provider, model: cfg.model, voice: cfg.voice, ...(cfg.preset ? { preset: cfg.preset } : {}), style: cfg.style, wpm_target: cfg.wpm, lufs: cfg.lufs,
    locked: !!unchanged, ...(unchanged ? { locked_at: prev.locked_at } : {}), generated: new Date().toISOString(), missing,
    units: units.map(u => { const { _raw, _cost, _truth, ...rest } = u; return rest; }) };
  fs.mkdirSync(VO, { recursive: true });
  fs.writeFileSync(VOICE, JSON.stringify(V, null, 2) + '\n');
  return { V, units, made, errors, cached, missing };
}
function report(r, cfg, verb) {
  const { units, made, errors, missing } = r;
  const fails = units.filter(u => u.checks.flags.some(f => f.startsWith('fail'))), spent = [...made.values()].reduce((a, m) => a + (m.cost || 0), 0);
  if (flags.json) {
    out(JSON.stringify({ voice: path.relative(DIR, VOICE), units: units.map(u => ({ id: u.id, dur: u.dur, wpm: u.checks.wpm, timing: u.timing, flags: u.checks.flags, new: [...made.values()].some(m => m.fp === u.fp) })),
      missing, errors: Object.fromEntries([...errors.values()].map(e => [e.id, e.error.message])), cost: Math.round(spent * 1e4) / 1e4 }, null, 1));
  } else {
    printTable(['id', 'dur', 'wpm', 'timing', 'clip', 'flags'], units.map(u => [u.id, `${u.dur.toFixed(2)} s`, u.checks.wpm, u.timing,
      [...made.values()].some(m => m.fp === u.fp) ? `new, take ${u.take}` : 'kept', u.checks.flags.length ? u.checks.flags[0] + (u.checks.flags.length > 1 ? ` (+${u.checks.flags.length - 1} more)` : '') : 'ok']));
    for (const u of units) for (const f of u.checks.flags.slice(1)) out(`  ${u.id} ${f}`);
    for (const e of errors.values()) out(`${e.id}: FAILED: ${e.error.message}`);
    const failedIds = new Set([...errors.values()].map(e => e.id)), none = missing.filter(id => !failedIds.has(id));
    if (none.length) out(`no clip yet for ${none.join(', ')}${verb === 'check' ? ' (run generate)' : ''}`);
    const total = units.reduce((a, u) => a + u.dur, 0);
    out(`${verb === 'check' ? 'checked' : 'wrote'} ${path.relative(DIR, VOICE)}: ${units.length} clips, ${total.toFixed(1)} s of narration${made.size ? `; ${made.size} new, ${spent ? `about ${dollars(spent)}` : 'at no cost'}` : ''}`);
  }
  return fails.length || errors.size || (verb === 'check' && missing.length) ? 1 : 0;
}
async function cmdGenerate() {
  const L = readLines(), cfg = runConfig(L), r = await build(cfg, L, { synth: true });
  const code = report(r, cfg, 'generate');
  if (!flags.json) out(code ? 'Fix or retake the failures (--retake P<n>), then run check.' : 'Next: node voice.mjs lock (after listening to the checks), then build the film.');
  return code;
}
async function cmdCheck() {
  const L = readLines(), cfg = runConfig(L), r = await build(cfg, L, { synth: false });
  const vc = path.join(HERE, 'voice_check.py');
  if (fs.existsSync(vc) && r.units.length) {                     // the deeper checks (transcript, voice consistency), when present
    const tmp = path.join(os.tmpdir(), `doodle-voice-check-${process.pid}.json`);
    const p = spawnSync(process.env.DOODLE_PYTHON || 'python3', [vc, VOICE, '--lines', LINES, '--json', tmp, '--no-basic'], { stdio: ['ignore', 'inherit', 'inherit'], cwd: DIR });
    const res = readJson(tmp, 'voice_check output'); fs.rmSync(tmp, { force: true });
    if (p.status !== 0 && !res) note('voice: voice_check.py failed; only the built-in checks ran');
    for (const u of r.units) { const x = res?.units?.[u.id]; if (!x) continue;
      for (const k of ['missing', 'extra']) if (Array.isArray(x[k])) u.checks[k] = x[k];
      if (Array.isArray(x.flags)) u.checks.flags.push(...x.flags); }
    if (res) {
      r.V.units = r.units.map(u => { const { _raw, _cost, _truth, ...rest } = u; return rest; });
      if (r.units.some(u => u.checks.flags.some(f => f.startsWith('fail')))) { r.V.locked = false; delete r.V.locked_at; }
      fs.writeFileSync(VOICE, JSON.stringify(r.V, null, 2) + '\n');
    }
  }
  return report(r, cfg, 'check');
}
async function cmdLock() {
  const L = readLines(), cfg = runConfig(L), r = await build(cfg, L, { synth: false });
  const fails = r.units.filter(u => u.checks.flags.some(f => f.startsWith('fail')));
  if ((fails.length || r.missing.length) && !flags.force) {
    report(r, cfg, 'check');
    out(`not locked: ${[...fails.map(u => u.id), ...r.missing.map(id => id + ' (no clip)')].join(', ')} ${fails.length + r.missing.length > 1 ? 'need' : 'needs'} fixing first (or --force)`);
    return 1;
  }
  r.V.locked = true; r.V.locked_at = new Date().toISOString();
  fs.writeFileSync(VOICE, JSON.stringify(r.V, null, 2) + '\n');
  const sp = path.resolve(DIR, flags.script || L.script || 'script.md'), rows = [];
  let msg = `script.md not found at ${sp}; plate durations not updated`;
  if (fs.existsSync(sp)) {
    const md = fs.readFileSync(sp, 'utf8'), T = plateTable(md);
    if (!T) msg = `${path.basename(sp)} has no plate table with # and Dur columns; plate durations not updated`;
    else {
      const eol = md.includes('\r\n') ? '\r\n' : '\n', lines = md.split(/\r?\n/); let changed = 0;
      for (const u of r.units) {
        const row = T.rows[u.plate]; if (!row) continue;
        const need = Math.ceil((u.lead + u.dur + u.tail) * 10) / 10, before = row.dur;
        if (Number.isFinite(before) && need > before + 0.05) {
          const cells = splitRow(lines[row.line]); cells[T.durCol] = ` ${need.toFixed(1)} `; lines[row.line] = '|' + cells.join('|') + '|'; row.dur = need; changed++;
        }
        rows.push([u.id, row.label, `${u.dur.toFixed(1)} s`, `${need.toFixed(1)} s`, Number.isFinite(before) ? `${before.toFixed(1)} s` : '?', Number.isFinite(before) ? `${row.dur.toFixed(1)} s` : '?',
          Number.isFinite(before) && row.dur - need > 2 ? `the voice ends ${r2(row.dur - need)} s before the plate does` : '']);
      }
      if (changed) {
        const ti = lines.findIndex(l => /^Total:/.test(l)), durs = T.rows.map(x => x.dur);
        const m = ti >= 0 && lines[ti].match(/^Total:\s*([\d.\s+]+)=\s*\*\*\s*([\d.]+)\s*s\s*\*\*(.*)$/);
        if (m && m[1].split('+').length === durs.length && durs.every(Number.isFinite))
          lines[ti] = `Total: ${durs.map(d => d.toFixed(1)).join(' + ')} = **${durs.reduce((a, b) => a + b, 0).toFixed(1)} s**${m[3]}`;
        fs.writeFileSync(sp, lines.join(eol));
      }
      msg = changed ? `lengthened ${changed} plate${changed > 1 ? 's' : ''} in ${path.basename(sp)} to fit the voice` : `every plate in ${path.basename(sp)} already fits its voice`;
    }
  }
  if (flags.json) { out(JSON.stringify({ locked: true, script: msg, plates: rows }, null, 1)); return 0; }
  if (rows.length) printTable(['id', '#', 'voice', 'needs', 'Dur was', 'Dur now', 'note'], rows);
  out(`locked ${path.relative(DIR, VOICE)} (${r.units.length} clips); ${msg}`);
  return 0;
}
function pickAuditionLines(L, cfg) {
  // candidates: a plate's sentences taken in order until they hold at least 10 words (short lines make noisy checks)
  const all = [];
  L.units.forEach((u, ui) => {
    let acc = [];
    parseText(u.text, u.id).sents.forEach((s, si, arr) => {
      acc.push(s);
      const words = acc.reduce((n, x) => n + x.words.length, 0);
      if (words >= 10 || si === arr.length - 1) {
        all.push({ ui, si, words, weight: acc.reduce((n, x) => n + x.weight, 0), src: acc.map(x => x.src).join(' ').replace(/^(\[[^\]]*\]\s*)+/, '') });
        acc = [];
      }
    });
  });
  const picked = [], add = c => { if (c && !picked.includes(c)) picked.push(c); };
  add(all[0]);                                                                                      // the opening hook
  add(all.filter(c => c.words >= 6 && !picked.includes(c)).sort((a, b) => b.weight / b.words - a.weight / a.words)[0]);       // the densest line
  const num = c => (c.src.match(/\d|\b(hundred|thousand|million|billion|trillion|percent|half|twice|times|dozen)\b/gi) || []).length;
  add(all.filter(c => num(c) && !picked.includes(c)).sort((a, b) => num(b) - num(a))[0]);          // a line with numbers
  const ci = L.units.findIndex(u => u.climax), cu = ci >= 0 ? ci : Math.max(0, L.units.length - 2);
  add(all.find(c => c.ui === cu && !picked.includes(c)) || all.filter(c => !picked.includes(c)).at(-1)); // the climax
  const lines = picked.sort((a, b) => a.ui - b.ui || a.si - b.si).map(c => c.src);
  const terms = Object.keys(cfg.pron);
  if (terms.length) lines.push(`Here are a few of the words in this film: ${terms.join(', ')}.`);
  return lines;
}
async function cmdAudition() {
  const L = readLines(), cfg = runConfig(L), A = ADAPTERS[cfg.provider], au = L.audition || {}, dir = path.join(VO, 'audition'), clipDir = path.join(dir, 'clips');
  const texts = au.lines?.length ? au.lines : pickAuditionLines(L, cfg);
  // narrator presets (Gemini): each is one voice with its own direction, named on --presets or in lines.json, or the
  // provider's default set when no voices or directions are named either
  const named = flags.presets ? list(flags.presets) : flags.voices || flags.voice ? null : cfg.own && au.presets?.length ? au.presets : null;
  if (named && cfg.provider !== 'gemini') throw new SetupError(`presets are Gemini voices; this film uses ${PROVIDERS[cfg.provider].name}`);
  const presets = (named || (!flags.voices && !flags.voice && !(cfg.own && (au.voices?.length || au.directions?.length)) && PROVIDERS[cfg.provider].presets?.[STYLES[cfg.style].mood]) || []).map(n => preset(n, cfg.model));
  const voices = presets.length ? [...new Set(presets.map(q => q.voice))]
    : flags.voices ? list(flags.voices) : flags.voice ? [flags.voice] : cfg.own && au.voices?.length ? au.voices : PROVIDERS[cfg.provider].audition[STYLES[cfg.style].mood];
  const probe = planUnit({ id: 'A', text: texts[0] }, { ...cfg, voice: voices[0] });
  const directions = presets.length ? [...new Set(presets.map(q => q.direction))]
    : A.direction(probe) ? (au.directions?.length ? au.directions : STYLES[cfg.style].directions) : [''];
  const combos = [], plansFor = (v, d, w) => texts.map((t, i) => planUnit({ id: `A${i + 1}`, text: t, voice: v, direction: d }, { ...cfg, voice: v, direction: d, wpm: w || cfg.wpm, own: true }));
  if (presets.length) for (const q of presets) combos.push({ voice: q.voice, di: directions.indexOf(q.direction), direction: q.direction, preset: q.name, wpm: q.wpm, plans: plansFor(q.voice, q.direction, q.wpm) });
  else for (const v of voices) directions.forEach((d, di) => combos.push({ voice: v, di, direction: d, plans: plansFor(v, d) }));
  const all = combos.flatMap(c => c.plans), todo = all.filter((p, i) => all.findIndex(q => q.fp === p.fp) === i && !fs.existsSync(path.join(clipDir, p.fp + '.wav')));
  out(`audition: ${texts.length} lines x ${presets.length ? `${presets.length} narrator presets` : `${voices.length} voices x ${directions.length} direction${directions.length > 1 ? 's' : ''}`} with ${PROVIDERS[cfg.provider].name} (${cfg.model}); ${todo.length} new clips`);
  const { made, errors } = await produce(todo, { ...cfg, retakes: Math.min(cfg.retakes, 1) }, clipDir);
  for (const e of errors.values()) out(`${e.voice} ${e.id}: FAILED: ${e.error.message}`);
  const ff = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0, rows = [], json = [];
  for (const c of combos) {
    const ds = c.plans.filter(p => fs.existsSync(path.join(clipDir, p.fp + '.wav'))).map(p => describe(p, { ...cfg, voice: c.voice, ...(c.wpm ? { wpm: c.wpm } : {}) }, clipDir));
    const lost = c.plans.length - ds.length, lostFlag = `fail: ${lost} of ${c.plans.length} lines have no clip (see the FAILED lines)`;
    if (!ds.length) { json.push({ ...(c.preset ? { preset: c.preset } : {}), voice: c.voice, direction: c.direction, file: null, wpm: null, raw_lufs: null, flags: [lostFlag], score: 1000 }); continue; }
    const parts = ds.map(d => readWav(fs.readFileSync(path.join(DIR, d.file)))), rate = parts[0].rate, gap = new Float32Array(Math.round(0.8 * rate));
    const y = new Float32Array(parts.reduce((n, p) => n + p.samples.length + gap.length, 0)); let o = 0;
    for (const p of parts) { y.set(p.samples, o); o += p.samples.length + gap.length; }
    const name = c.preset || `${c.voice}-${c.di + 1}`, wav = path.join(dir, name + '.wav');
    fs.writeFileSync(wav, wavBuffer(y, rate));
    let file = wav;
    if (ff && spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', path.join(dir, name + '.mp3')]).status === 0) { fs.rmSync(wav); file = path.join(dir, name + '.mp3'); }
    const words = c.plans.reduce((n, p) => n + p.parsed.words, 0), speech = ds.reduce((n, d) => n + (d.sentences.at(-1)[1] - d.sentences[0][0]), 0);
    const wpm = Math.round(words * 60 / Math.max(0.1, speech)), flagsAll = [...(lost ? [lostFlag] : []), ...ds.flatMap(d => d.checks.flags.map(f => `${d.id} ${f}`))];
    const raws = ds.map(d => d._raw).filter(v => v != null), raw = raws.length ? r2(raws.reduce((a, b) => a + b, 0) / raws.length) : null;
    const target = c.wpm || cfg.wpm, score = flagsAll.filter(f => / fail/.test(f)).length * 10 + flagsAll.length + Math.abs(wpm / target - 1) * 10;
    json.push({ ...(c.preset ? { preset: c.preset } : {}), voice: c.voice, direction: c.direction, file: path.relative(DIR, file), wpm, raw_lufs: raw, flags: flagsAll, score: r2(score) });
  }
  json.sort((a, b) => a.score - b.score);
  const spent = [...made.values()].reduce((a, m) => a + (m.cost || 0), 0);
  const md = [`# Voice audition`, '', `${PROVIDERS[cfg.provider].name}, ${cfg.model}; ${cfg.style} style, target ${presets.length ? "each preset's own pace" : `${cfg.wpm} words a minute`}${cfg.autoSpeed ? ' (Kokoro speed set line by line to match it)' : cfg.speed !== 1 ? ` (speed ${cfg.speed})` : ''}. Made ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC; new clips cost about ${dollars(spent)}.`, '',
    'Lines (read back to back in every file, 0.8 s apart):', '', ...texts.map((t, i) => `${i + 1}. ${t}`), '',
    ...(directions[0] ? ['Directions:', '', ...directions.map((d, i) => `${i + 1}. ${d}`), ''] : []),
    'Best first, by the automatic checks only (fewest flags, pace nearest the target). Listen before choosing; the checks cannot hear tone.', '',
    `| ${presets.length ? 'Preset | ' : ''}Voice | Direction | Pace (wpm) | Loudness before normalizing (LUFS) | Flags | File |`, `|${presets.length ? '---|' : ''}---|---|---|---|---|---|`,
    ...json.map(j => `| ${presets.length ? `${j.preset} | ` : ''}${j.voice} | ${directions[0] ? directions.indexOf(j.direction) + 1 : '-'} | ${j.wpm ?? '-'} | ${j.raw_lufs ?? '-'} | ${j.flags.length || 'none'} | ${j.file ? path.basename(j.file) : 'none'} |`), '',
    ...(json.some(j => j.flags.length) ? ['Flags (A1 is line 1, and so on):', '', ...json.filter(j => j.flags.length).map(j => `- ${j.file ? path.basename(j.file) : `${j.voice} (no file)`}: ${j.flags.join('; ')}`), ''] : [])];
  fs.writeFileSync(path.join(dir, 'audition.md'), md.join('\n'));
  fs.writeFileSync(path.join(dir, 'audition.json'), JSON.stringify({ provider: cfg.provider, model: cfg.model, lines: texts, directions, ...(presets.length ? { presets: presets.map(q => q.name) } : {}), results: json }, null, 1) + '\n');
  if (flags.json) out(JSON.stringify({ results: json, cost: spent }, null, 1));
  else {
    printTable([...(presets.length ? ['preset'] : []), 'voice', 'dir', 'wpm', 'raw LUFS', 'flags', 'file'], json.map(j => [...(presets.length ? [j.preset] : []), j.voice, directions[0] ? directions.indexOf(j.direction) + 1 : '-', j.wpm ?? '-', j.raw_lufs ?? '-', j.flags.length || 'none', j.file || 'none']));
    out(`wrote ${path.relative(DIR, path.join(dir, 'audition.md'))}${ff ? '' : ' (ffmpeg not found, so the files are WAV, not MP3)'}; new clips cost about ${dollars(spent)}`);
  }
  return errors.size ? 1 : 0;
}
function cmdPresets() {
  const all = Object.keys(NARRATORS).flatMap(n => [preset(n), ...Object.keys(DELIVERIES).filter(d => d !== NARRATORS[n].delivery).map(d => preset(`${n}-${d}`))]);
  if (flags.json) { out(JSON.stringify(all.map(q => ({ preset: q.name, provider: 'gemini', voice: q.voice, delivery: q.delivery, wpm: q.wpm, wpm_3_1: DELIVERIES[q.delivery].wpm31, direction: q.direction, sounds: NARRATORS[q.narrator].sounds })), null, 1)); return 0; }
  out('Narrator presets (Gemini). Name a narrator for its usual delivery, or <narrator>-<delivery> for another, like charon-storyteller.');
  out('Use: node voice.mjs lines script.md --preset NAME, or compare a few: node voice.mjs audition --presets A,B,C. Which to pick: references/voice-presets.md\n');
  printTable(['narrator', 'Gemini voice', 'usual delivery', 'sounds'], Object.entries(NARRATORS).map(([n, N]) => [n, N.voice, N.delivery, N.sounds]));
  out('');
  printTable(['delivery', 'pace', 'on 3.1', 'direction (the style on 3.8; said before the words on 3.1)'], Object.entries(DELIVERIES).map(([d, D]) => [d, `${D.wpm} wpm`, `${D.wpm31} wpm`, D.direction]));
  return 0;
}
async function cmdKeys() {
  const rows = [];
  for (const p of Object.keys(KEY_VARS)) { const k = findKey(p); rows.push([KEY_NAMES[p], k ? `found in ${k.where}` : 'not set', KEY_VARS[p].join(' or ')]); }
  printTable(['provider', 'key', 'variable'], rows);
  const kf = keysFile(); out(`keys file: ${kf}${fs.existsSync(kf) ? '' : ' (not there)'}`);
  if (!findKey('gemini')) out('Without a Gemini key, requests go out with no key; in a claude.ai cloud environment the network proxy may add one. Run keys --test to see.');
  if (!flags.test) return 0;
  const tests = [
    ['gemini', () => `${(process.env.DOODLE_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '')}/models?pageSize=1`, k => k ? { 'x-goog-api-key': k.value } : {}],
    ['openai', () => `${(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')}/models`, k => k ? { authorization: `Bearer ${k.value}` } : {}],
    ['local', () => `${(process.env.DOODLE_TTS_BASE_URL || 'http://localhost:8880/v1').replace(/\/+$/, '')}/models`, k => k ? { authorization: `Bearer ${k.value}` } : {}],
    ['xai', () => `${baseUrl('DOODLE_XAI_BASE_URL', 'https://api.x.ai/v1')}/tts/voices`, k => k ? { authorization: `Bearer ${k.value}` } : {}],
    ['elevenlabs', () => `${baseUrl('DOODLE_ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io/v1').replace(/\/v1$/, '')}/v2/voices?page_size=1`, k => k ? { 'xi-api-key': k.value } : {}],
    ['inworld', () => `${baseUrl('DOODLE_INWORLD_BASE_URL', 'https://api.inworld.ai')}/voices/v1/voices`, k => k ? { authorization: `Basic ${k.value.includes(':') ? Buffer.from(k.value).toString('base64') : k.value}` } : {}],
  ];
  let bad = 0;
  for (const [p, url, hdr] of tests) {
    const k = findKey(p);
    try { await call(p, k, url(), { headers: hdr(k), timeout: 20000, netTries: 0 }); out(`${KEY_NAMES[p]}: works${k ? ` (key from ${k.where})` : ' (no key sent; the network added one or none is needed)'}`); }
    // counted as a failure: Gemini (the default), a key that was found and refused, or a local server that was named
    catch (e) { if (p === 'gemini' || k || (p === 'local' && process.env.DOODLE_TTS_BASE_URL)) bad++; out(`${KEY_NAMES[p]}: ${e.message.split('. ')[0]}`); }
  }
  return bad ? 1 : 0;
}

const COMMANDS = { lines: cmdLines, generate: cmdGenerate, check: cmdCheck, lock: cmdLock, audition: cmdAudition, presets: cmdPresets, keys: cmdKeys };
if (!COMMANDS[cmd] || flags.help) {
  out('usage: node voice.mjs lines script.md [--preset NAME] | audition [--presets A,B] | generate | check | lock | presets | keys [--test]   (see the top of voice.mjs)');
  process.exit(cmd && !flags.help ? 2 : 0);
}
try { process.exitCode = await COMMANDS[cmd](); }
catch (e) { note('voice: ' + (e instanceof SetupError ? e.message : e.stack || e.message)); process.exitCode = e instanceof SetupError ? 2 : 1; }
