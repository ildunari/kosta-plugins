#!/usr/bin/env python3
"""narration_test.py — the engine's narration track, tested on the narrated example film ("Salt in Water",
docs/doodle-art-animation/examples/narrated/, Kokoro narration made by its make_voice.py).

usage:
  python3 tests/doodle-art-animation/narration_test.py [--node-modules PATH] [--work DIR] [--static]

  example      the example's voice.json and clips are well formed (Ogg Opus, sentences and marks inside each clip)
               and every clip the story asks for is in it
  build        build.py picks up vo/voice.json by itself and embeds the clips; --voice none and --animatic work
  timing       each narrated plate lasts until its narration ends plus the tail, never less than its drawing
  marks        a cue written as a mark ('gone', 'drop+0.1') lands on the word
  captions     window.__srt() and render.mjs --srt: one caption per sentence or part of one, in order, two lines
               of 42 characters at most; a full render writes film.srt next to the MP4 (checked on a short film)
  levels       audio_check.py --narrated: -16 LUFS integrated, true peak at or under -1 dBTP
  under        render.mjs --stems + audio_check.py --stems: the music and effects 15-20 dB under the voice
  segment      a short MP4 segment where the voice speaks carries an audio stream with the voice in it
  animatic     build.py --animatic boots, marks itself as an animatic and draws its placeholders
  no voice     built with --voice none: the plates keep their own dur and the marks fall back to their estimates
  unnarrated   a bundled film without narration: no captions, render.mjs --srt refuses it

--static runs the first two without a browser (python3 only). The rest also need node, Playwright
(--node-modules, DOODLE_NODE_MODULES or the global npm root), numpy and ffmpeg. Exit 1 if any check failed.
"""
import argparse, base64, json, os, re, shutil, subprocess, sys, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TK = os.path.join(REPO, 'plugins', 'doodle-art-animation', 'skills', 'doodle-art-animation', 'toolkit')
EX = os.path.join(REPO, 'docs', 'doodle-art-animation', 'examples', 'narrated')
HERE = os.path.dirname(os.path.abspath(__file__))

ap = argparse.ArgumentParser()
ap.add_argument('--node-modules', default=os.environ.get('DOODLE_NODE_MODULES', ''))
ap.add_argument('--work', default='')
ap.add_argument('--static', action='store_true')
a = ap.parse_args()

results = []
def check(name, ok, detail=''):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + ('' if ok else f'  - {detail}'))

def run(cmd, cwd=None, timeout=600):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout + p.stderr

work = os.path.abspath(a.work) if a.work else tempfile.mkdtemp(prefix='doodle_narration_')
os.makedirs(work, exist_ok=True)

# ---------------------------------------------------------------- example
story_src = open(os.path.join(EX, 'story_narrated.js'), encoding='utf-8').read()
voice = json.load(open(os.path.join(EX, 'vo', 'voice.json'), encoding='utf-8'))
units = {u['id']: u for u in voice.get('units', [])}
bad = []
for u in voice.get('units', []):
    clip = os.path.join(EX, u.get('file', ''))
    head = open(clip, 'rb').read(64) if os.path.isfile(clip) else b''
    if not (head[:4] == b'OggS' and b'OpusHead' in head): bad.append(f"{u['id']}: {u.get('file')} is not Ogg Opus")
    s = u.get('sentences') or []
    if not (u.get('dur', 0) > 0 and s and all(0 <= x[0] < x[1] <= u['dur'] + 1e-6 for x in s)
            and all(s[i][1] <= s[i + 1][0] + 1e-6 for i in range(len(s) - 1))):
        bad.append(f"{u['id']}: sentences out of order or outside the clip")
    if any(not (0 <= t <= u['dur']) for t in (u.get('marks') or {}).values()): bad.append(f"{u['id']}: a mark outside the clip")
check('example: voice.json units are well formed, every clip is Ogg Opus', not bad and len(units) >= 2, '; '.join(bad) or 'no units')
asked = set(re.findall(r"vo:\s*(?:\{\s*id:\s*)?'([^']+)'", story_src))
check('example: every clip the story asks for is in voice.json', asked and asked <= set(units), f'asked {sorted(asked)}, have {sorted(units)}')

# ---------------------------------------------------------------- build (no browser)
tk = os.path.join(work, 'tk')
shutil.copytree(TK, tk, dirs_exist_ok=True, ignore=shutil.ignore_patterns('node_modules', 'qa*', '*_frames'))
story = os.path.join(EX, 'story_narrated.js')
def build(out, *extra):
    rc, log = run([sys.executable, 'build.py', story, out, *extra], cwd=tk)
    html = open(os.path.join(tk, out), encoding='utf-8').read() if rc == 0 else ''
    return rc, log, html
rc, log, html = build('film.html')
check('build: vo/voice.json is picked up by itself and every clip embedded',
      rc == 0 and f'voice: {len(units)} clips' in log and html.count('"audio": "T2dnUw') == len(units), log[-300:])   # T2dnUw = base64 of OggS
rc, log, nov = build('novoice.html', '--voice', 'none')
check('build: --voice none builds without narration', rc == 0 and 'window.__VOICE_DATA = ' not in nov and 'voice:' not in log, log[-300:])
rc, log, anim = build('animatic.html', '--animatic')
check('build: --animatic marks the film as an animatic', rc == 0 and 'window.__ANIMATIC = true;' in anim and '· animatic' in log, log[-300:])

# ---------------------------------------------------------------- browser checks
if not a.static:
    nm = a.node_modules or run(['npm', 'root', '-g'])[1].strip()
    if not os.path.isdir(os.path.join(nm, 'playwright')):
        check('playwright found', False, f'no playwright in {nm} (pass --node-modules)')
    else:
        os.environ['DOODLE_NODE_MODULES'] = os.path.abspath(nm)
        if not os.path.exists(os.path.join(tk, 'node_modules')): os.symlink(os.path.abspath(nm), os.path.join(tk, 'node_modules'))
        def probe(html, body):
            rc, out = run(['node', os.path.join(HERE, 'probe.mjs'), os.path.join(tk, html), body], timeout=300)
            try: return json.loads(out.strip().splitlines()[-1])
            except Exception: return {'result': None, 'errors': [out[-300:]]}
        def lines(out, name): return [l for l in out.splitlines() if l.split()[1:2] == [name]]

        r = probe('film.html', """
          const P = STORY.plates, v = window.__voice();
          const wav = await window.__audioWav();
          const plink = P[1].cues.find(c => c[1] === 'plink'), foil = P[0].cues.find(c => c[1] === 'foil');
          return { story: window.__story, warnings: v.warnings, units: v.units,
            plates: P.map(p => ({ dur: p.dur, min: p.durMin ?? null, voice: p.voice.filter(x => x.unit).map(x => ({ end: x.at + x.dur, tail: x.tail })) })),
            gone: mark('gone', P[1]), plink: plink && plink[0], drop: mark('drop', P[0]), foil: foil && foil[0],
            srt: window.__srt(), loud: window.__loudness, wav };""")
        v = r.get('result') or {}
        check('timing: the narrated film boots with no page errors and no narration warnings',
              bool(v) and not r.get('errors') and not v.get('warnings') and v['story'].get('narrated') is True,
              str(r.get('errors') or v.get('warnings'))[:300])
        if v:
            wav = os.path.join(work, 'film.wav')
            with open(wav, 'wb') as f: f.write(base64.b64decode(v.pop('wav')))
            ok, why = True, []
            for i, p in enumerate(v['plates']):
                if not p['voice']: continue
                last = p['voice'][-1]; need = last['end'] + (last['tail'] if last.get('tail') is not None else 0.8)   # 0.8: VOICE.tail
                if abs(p['dur'] - max(p['min'] or 0, need)) > 1e-6: ok = False; why.append(f'plate {i}: dur {p["dur"]:.3f}, expected {max(p["min"] or 0, need):.3f}')
            check('timing: each narrated plate lasts until its narration ends plus the tail, or its drawing minimum', ok, '; '.join(why))
            check('timing: the voice re-times a plate (plate I is longer than its drawing minimum)',
                  v['plates'][1]['dur'] > v['plates'][1]['min'] + 1, str(v['plates'][1]))
            st = [s['t'] for s in v['story']['starts']]
            check('timing: plates follow each other with no gap', all(abs(st[i + 1] - st[i] - v['plates'][i]['dur']) < 1e-6 for i in range(len(st) - 1)), str(st))
            check("marks: the cue written 'gone' lands on the word", v['plink'] is not None and abs(v['plink'] - v['gone']) < 1e-6,
                  f"plink {v['plink']}, mark {v['gone']}")
            check("marks: the cue written 'drop+0.1' lands 0.1 s after the word", v['foil'] is not None and abs(v['foil'] - v['drop'] - 0.1) < 1e-6,
                  f"foil {v['foil']}, mark {v['drop']}")
            caps = [c for c in v['srt'].strip().split('\n\n') if c.strip()]
            ts = lambda s: sum(float(x) * m for x, m in zip(s.replace(',', '.').split(':'), (3600, 60, 1)))
            spans = [[ts(t) for t in c.splitlines()[1].split(' --> ')] for c in caps]
            texts = [c.splitlines()[2:] for c in caps]
            n_sent = sum(len(u['sentences']) for u in v['units'])
            check('captions: at least one caption per sentence, in order, two lines of 42 characters at most',
                  len(caps) >= n_sent and all(a0 < a1 <= b0 + 1e-3 for (a0, a1), (b0, _) in zip(spans, spans[1:] + [[1e9, 0]]))
                  and all(1 <= len(t) <= 2 and all(len(x) <= 42 for x in t) for t in texts),
                  f'{len(caps)} captions for {n_sent} sentences')
            first = v['units'][0]['sentences'][0][0]
            check('captions: the first caption starts with the first word', bool(spans) and abs(spans[0][0] - first) < 0.002, f'{spans[:1]} vs {first}')
            check('levels: the engine brought the track to its target', bool(v.get('loud')) and v['loud']['target'] == -16, str(v.get('loud')))
            rc, out = run([sys.executable, os.path.join(tk, 'audio_check.py'), wav, '--narrated'])
            ln, lp = lines(out, 'loudness'), lines(out, 'truepeak')
            check('levels: audio_check --narrated passes loudness (-16 LUFS) and true peak (-1 dBTP)',
                  rc == 0 and ln and ln[0].startswith('PASS') and lp and lp[0].startswith('PASS'), (ln + lp + [out[-300:]])[0])

        rc, out = run(['node', 'render.mjs', 'film.html', '--stems', '--dir', 'qa_stems'], cwd=tk)
        check('under: render.mjs --stems writes the voice, the rest and the speech times', rc == 0 and all(
            os.path.isfile(os.path.join(tk, 'qa_stems', f)) for f in ('stem_voice.wav', 'stem_rest.wav', 'speech.json')), out[-300:])
        if rc == 0:
            rc, out = run([sys.executable, 'audio_check.py', os.path.join(work, 'film.wav'), '--narrated', '--stems', 'qa_stems'], cwd=tk)
            lu = lines(out, 'under')
            check('under: the music and effects sit 15-20 dB under the voice while it speaks', bool(lu) and lu[0].startswith('PASS'), (lu or [out[-300:]])[0])

        rc, out = run(['node', 'render.mjs', 'film.html', '--srt', 'captions.srt'], cwd=tk)
        srt = open(os.path.join(tk, 'captions.srt'), encoding='utf-8').read() if os.path.isfile(os.path.join(tk, 'captions.srt')) else ''
        check('captions: render.mjs --srt writes the same captions', rc == 0 and v and srt == v.get('srt'), out[-300:])

        if v:   # two seconds of plate I while the voice speaks
            f0 = round((v['units'][1]['t0'] + 0.3) * v['story']['fps'])
            seg = os.path.join(tk, 'seg.mp4')
            rc, out = run(['node', 'render.mjs', 'film.html', seg, '--from', str(f0), '--to', str(f0 + 48), '--workers', '2', '--bitrate', '2000k'], cwd=tk, timeout=900)
            ok = rc == 0 and os.path.isfile(seg)
            if ok:
                _, vol = run(['ffmpeg', '-nostats', '-i', seg, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'])
                m = re.search(r'mean_volume:\s*(-?[\d.]+)', vol)
                ok = bool(m) and float(m.group(1)) > -35
                out = f'mean volume {m.group(1) if m else "?"} dB'
            check('segment: an MP4 segment where the voice speaks carries the voice', ok, out[-300:])

        # a full render writes film.srt next to the MP4: tried on a 3-second film with a one-sentence clip
        mini = os.path.join(work, 'mini'); os.makedirs(os.path.join(mini, 'vo'), exist_ok=True)
        u0 = units['P0']; shutil.copy2(os.path.join(EX, u0['file']), os.path.join(mini, 'vo', 'P0.ogg'))
        json.dump({'version': 1, 'provider': 'kokoro', 'units': [{**u0, 'file': 'vo/P0.ogg'}]}, open(os.path.join(mini, 'vo', 'voice.json'), 'w'))
        with open(os.path.join(mini, 'story_mini.js'), 'w') as f:
            f.write("const M0 = { dur: 1, vo: { id: 'P0', at: 0.3, tail: 0.3 }, draw(t) { ink([[400, 540], [lerp(400, 1500, clamp(t / 4)), 540]], { w: 4 }); } };\n"
                    "defineStory({ title: 'Mini', stages: 0, plates: [M0] });\nboot();\n")
        rc, out = run([sys.executable, 'build.py', os.path.join(mini, 'story_mini.js'), 'mini.html'], cwd=tk)
        if rc == 0: rc, out = run(['node', 'render.mjs', 'mini.html', 'mini.mp4', '--workers', '2', '--bitrate', '2000k'], cwd=tk, timeout=900)
        msrt = os.path.join(tk, 'mini.srt')
        check('captions: a full render writes film.srt next to the MP4', rc == 0 and os.path.isfile(msrt) and u0['sentences'][0][2].split()[0] in open(msrt).read(), out[-300:])

        r = probe('animatic.html', """const s = window.__story; window.__renderFrame(Math.round((s.starts[2].t + 3) * s.fps));
          return { animatic: s.animatic, narrated: s.narrated, frames: s.frames };""")
        va = r.get('result') or {}
        check('animatic: builds, boots and draws its placeholders with the narration', not r.get('errors') and va.get('animatic') is True
              and va.get('narrated') is True and v and va.get('frames') == v['story']['frames'], str(r.get('errors') or va)[:300])
        rc, out = run(['node', 'render.mjs', 'film.html', '--animatic', '--stills', '0,500', '--dir', 'qa_anim'], cwd=tk)
        check('animatic: render.mjs --animatic draws stills', rc == 0 and 'animatic' in out and os.path.isfile(os.path.join(tk, 'qa_anim', 'f_00500.jpg')), out[-300:])

        r = probe('novoice.html', """const P = STORY.plates;
          return { narrated: window.__story.narrated, durs: P.map(p => p.dur), gone: mark('gone', P[1]), srt: window.__srt() };""")
        vn = r.get('result') or {}
        want = [float(x) for x in re.findall(r'^\s*dur: ([\d.]+)', story_src, re.M)]   # each plate's own dur, in order
        check('no voice: the plates keep their own dur and the marks use their estimates',
              not r.get('errors') and vn.get('narrated') is False and vn.get('durs') == want and vn.get('gone') == 5.2 and vn.get('srt') == '',
              str(r.get('errors') or vn)[:300] + f' (want durs {want})')

        rc, _ = run([sys.executable, 'build.py', 'story_one_drop.js', 'one_drop.html'], cwd=tk)
        r = probe('one_drop.html', "return { narrated: window.__story.narrated, units: window.__voice().units.length, srt: window.__srt() };") if rc == 0 else {}
        vo = r.get('result') or {}
        rc, out = run(['node', 'render.mjs', 'one_drop.html', '--srt'], cwd=tk)
        check('unnarrated: a film without narration has no captions, and render.mjs --srt refuses it',
              vo.get('narrated') is False and vo.get('units') == 0 and vo.get('srt') == '' and rc != 0 and 'no narration' in out, str(vo) + out[-200:])

n_fail = sum(1 for _, ok, _ in results if not ok)
print(f'\n{len(results) - n_fail} passed, {n_fail} failed' + ('  (static only)' if a.static else ''))
if not a.work and not n_fail: shutil.rmtree(work, ignore_errors=True)
sys.exit(1 if n_fail else 0)
