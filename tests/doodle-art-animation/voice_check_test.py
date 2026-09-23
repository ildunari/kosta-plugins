#!/usr/bin/env python3
"""voice_check_test.py - tests for toolkit/voice_check.py, with no network, keys or cost.

run: python3 tests/doodle-art-animation/voice_check_test.py

Makes a five-plate film with voice.mjs's fake voice and plants one fault per plate (a missing word, a direction read
aloud plus another person's voice, a wrong-speed clip, a silent clip, and a clean clip whose transcript spells its
numbers and acronym differently), then checks that voice_check.py catches each fault and passes the clean clip. A
pretend Gemini server answers the transcript and listening-pass requests. Needs Node 18+ and numpy.
Prints one PASS / FAIL line per check and exits 1 if any failed.
"""
import http.server, json, os, re, shutil, subprocess, sys, tempfile, threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TOOLKIT = os.path.join(ROOT, 'plugins', 'doodle-art-animation', 'skills', 'doodle-art-animation', 'toolkit')
VOICE_MJS, VOICE_CHECK = os.path.join(TOOLKIT, 'voice.mjs'), os.path.join(TOOLKIT, 'voice_check.py')
WORK = tempfile.mkdtemp(prefix='doodle-voice-check-')
ENV = {k: v for k, v in os.environ.items()
       if not re.match(r'(GEMINI_API_KEY|GOOGLE_API_KEY|DOODLE_|CLAUDE_PLUGIN_OPTION_|https?_proxy|HTTPS?_PROXY|NO_PROXY|no_proxy)', k)}
ENV['DOODLE_KEYS_FILE'] = os.path.join(WORK, 'no-keys.env')
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(f'{"PASS" if ok else "FAIL"}  {name}' + ('' if ok else f'  -- {detail}'))


def run(cmd, env=None):
    p = subprocess.run(cmd, capture_output=True, text=True, env={**ENV, **(env or {})})
    return p.returncode, p.stdout + p.stderr


SCRIPT = """# Test film

## Plate table

| # | Plate (world) | Dur | Enter | Beats |
|---|---|---|---|---|
| I | One (paper) | 8 | - | - |
| II | Two (paper) | 8 | - | - |
| III | Three (paper) | 8 | - | - |
| IV | Four (paper) | 8 | - | - |
| End | End (paper) | 8 | - | - |

## Narration

### I · One
One particle slips into the vein and drifts toward the liver.

### II · Two
Proteins from the blood land on its surface, one by one, until it is coated.

### III · Three
The polymer swells slowly in water, and the drug begins to leave the core.

### IV · Four
Nothing here should be heard at all, because this clip is silent.

### End · End
It is one of 430 billion in a single milligram, and PCL holds 25% of the drug.
"""

film = os.path.join(WORK, 'film')
os.makedirs(film)
open(os.path.join(film, 'script.md'), 'w').write(SCRIPT)
code, out = run(['node', VOICE_MJS, 'lines', 'script.md', '--provider', 'fake', '--dir', film])
check('setup: voice.mjs lines', code == 0, out)
code, out = run(['node', VOICE_MJS, 'generate', '--retakes', '0', '--dir', film], {'DOODLE_TTS_FAKE_FAULT': 'P1:odd,P2:slow,P3:silent'})
check('setup: voice.mjs generate made five clips (two fail its own checks)', code == 1 and os.path.exists(os.path.join(film, 'vo', 'voice.json')), out)
V = json.load(open(os.path.join(film, 'vo', 'voice.json')))
text = {u['id']: u['text'] for u in V['units']}

transcripts = {
    'P0': text['P0'].replace(' toward', ''),                                          # one word missing
    'P1': 'Say calmly, with quiet curiosity: ' + text['P1'],                          # the direction read aloud
    'P2': text['P2'],
    'P4': 'It is one of four hundred and thirty billion in a single milligram, and P C L holds twenty five percent of the drug.',
}
tfile = os.path.join(WORK, 'transcripts.json')
json.dump(transcripts, open(tfile, 'w'))

# ---------------------------------------------------------------- standalone, all checks
res_path = os.path.join(WORK, 'res.json')
code, out = run([sys.executable, VOICE_CHECK, os.path.join(film, 'vo', 'voice.json'), '--transcripts', tfile, '--json', res_path])
check('voice_check: exits 1 when a clip fails', code == 1, out)
R = json.load(open(res_path))['units']
fl = {k: ' | '.join(v['flags']) for k, v in R.items()}
check('words: a planted missing word fails and is named', R['P0']['missing'] == ['toward'] and 'fail: 1 word of the script not heard: toward' in fl['P0'], json.dumps(R['P0']))
check('words: a direction read aloud fails as extra words', re.search(r'fail: 5 words heard that are not in the script', fl['P1']) is not None, fl['P1'])
check('voice: another person\'s voice is flagged', 'different voice' in fl['P1'] and 'pitch' in fl['P1'], fl['P1'])
check('voice: the other clips are not flagged as a different voice', not any('different voice' in fl[k] for k in ('P0', 'P2', 'P4')), json.dumps(fl))
check('pace: a wrong-speed clip fails', re.search(r'fail: pace \d+ words a minute .* too slow', fl['P2']) is not None, fl['P2'])
check('silence: a silent clip fails', 'fail: no speech in the clip' in fl['P3'], fl['P3'])
check('words: digits, "%" and a spelled-out acronym match the script', R['P4']['missing'] == [] and R['P4']['extra'] == [], json.dumps(R['P4']))
check('clean clip: no flags', fl['P4'] == '', fl['P4'])
check('pitch measured on the fake voice (134 Hz)', abs((R['P4'].get('pitch_hz') or 0) - 134) < 4, json.dumps(R['P4']))

# ---------------------------------------------------------------- through voice.mjs check (merged into voice.json)
code, out = run(['node', VOICE_MJS, 'check', '--dir', film], {'DOODLE_VOICE_TRANSCRIPTS': tfile})
V2 = json.load(open(os.path.join(film, 'vo', 'voice.json')))
u = {x['id']: x for x in V2['units']}
check('voice.mjs check: exits 1 and merges the missing word into voice.json', code == 1 and u['P0']['checks']['missing'] == ['toward'], out + json.dumps(u['P0']['checks']))
check('voice.mjs check: no duplicate pace or silence flags', len(u['P2']['checks']['flags']) == 1 and not any(f.startswith('fail: pace') for f in u['P2']['checks']['flags']) and sum('no speech' in f for f in u['P3']['checks']['flags']) == 1,
      json.dumps({k: u[k]['checks']['flags'] for k in ('P2', 'P3')}))
check('voice.mjs check: the different voice reaches voice.json', any('different voice' in f for f in u['P1']['checks']['flags']), json.dumps(u['P1']['checks']))
check('voice.mjs check: a fake film with no transcripts makes no requests', run(['node', VOICE_MJS, 'check', '--dir', film], {'DOODLE_GEMINI_BASE_URL': 'http://127.0.0.1:9'})[0] == 1, '')

# ---------------------------------------------------------------- the pretend Gemini: transcripts and the listening pass
seen = []


class Gemini(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['content-length'])))
        parts = body['contents'][0]['parts']
        prompt = parts[1]['text']
        seen.append({'path': self.path, 'key': self.headers.get('x-goog-api-key'), 'audio': parts[0]['inline_data']['mime_type'], 'prompt': prompt})
        if prompt.startswith('Transcribe'):
            ans = 'One particle slips into the vein and drifts toward the liver.'
        else:
            ans = json.dumps({'direction_match': 2, 'mispronounced': ['liver'], 'odd_pauses': [], 'glitches': ['a click at 1.2 s'], 'notes': 'Rushed.'})
        data = json.dumps({'candidates': [{'content': {'parts': [{'text': ans}]}}], 'usageMetadata': {'promptTokenCount': 300, 'candidatesTokenCount': 40}}).encode()
        self.send_response(200)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


srv = http.server.HTTPServer(('127.0.0.1', 0), Gemini)
threading.Thread(target=srv.serve_forever, daemon=True).start()
real = os.path.join(WORK, 'real')
shutil.copytree(film, real)
V3 = json.load(open(os.path.join(real, 'vo', 'voice.json')))
V3['provider'] = 'gemini'                                                        # pretend these clips came from Gemini
json.dump(V3, open(os.path.join(real, 'vo', 'voice.json'), 'w'))
code, out = run([sys.executable, VOICE_CHECK, os.path.join(real, 'vo', 'voice.json'), '--only', 'P0', '--listen', '--json', res_path],
                {'DOODLE_GEMINI_BASE_URL': f'http://127.0.0.1:{srv.server_port}'})
R = json.load(open(res_path))
p0 = R['units']['P0']
check('gemini: a transcript and a listening pass were asked for, with the audio attached', len(seen) == 2 and all(s['audio'] == 'audio/wav' and 'gemini-2.5-flash:generateContent' in s['path'] for s in seen), json.dumps(seen)[:400])
check('gemini: no key header when no key is set (the cloud proxy adds it)', all(s['key'] is None for s in seen), json.dumps(seen)[:200])
check('gemini: the transcript is compared with the script', p0.get('transcript', '').startswith('One particle') and p0['missing'] == [], json.dumps(p0))
check('listen: scores returned and a low score, glitch and mispronounced word warn', p0.get('listen', {}).get('direction_match') == 2
      and sum(f.startswith('warn: the listening pass') for f in p0['flags']) == 3, json.dumps(p0))
check('listen: a warning alone does not fail the clip', code == 0 and R['cost'] > 0, out)
srv.shutdown()

code, out = run([sys.executable, VOICE_CHECK, os.path.join(real, 'vo', 'voice.json'), '--only', 'P0', '--json', res_path],
                {'DOODLE_GEMINI_BASE_URL': 'http://127.0.0.1:9'})
check('gemini unreachable: a note, and the other checks still run', code == 0 and 'word check was skipped' in out and 'P0' in json.load(open(res_path))['units'], out)
code, out = run([sys.executable, VOICE_CHECK, os.path.join(WORK, 'nothing.json')])
check('a missing voice.json exits 2', code == 2 and 'voice.mjs generate' in out, out)

shutil.rmtree(WORK, ignore_errors=True)
print(f'\n{sum(results)}/{len(results)} passed')
sys.exit(0 if all(results) else 1)
