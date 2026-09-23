#!/usr/bin/env python3
"""regression_test.py — the toolkit gaps found while making the biocoating film ("Dressed in Mucus", v0.16.1).

usage:
  python3 tests/doodle-art-animation/regression_test.py [--node-modules PATH] [--work DIR] [--static]

  story parts   smoke_test.py skips story_tail.js, files assemble.sh concatenates, and files contained in story.js
  audio swell   audio_check.py --starts passes a seam that dips and swells (the engine's own), still warns on a flat one
  alpha         a plate that writes ctx.globalAlpha = 1 fades with its transition (fixtures/story_alpha.js)
  zoom default  a zoom with no dir dives in
  pan twice     speed_check.mjs warns TWICE when a pan shows the hero twice across a scale jump (fixtures/story_pan_twice.js)

The first two need python3, numpy and ffmpeg; the rest also need node and Playwright (--node-modules, or
DOODLE_NODE_MODULES, or the global npm root). --static runs only the first two. Exit 1 if any check failed.
"""
import argparse, importlib.util, json, os, re, shutil, subprocess, sys, tempfile, wave

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TK = os.path.join(REPO, 'plugins', 'doodle-art-animation', 'skills', 'doodle-art-animation', 'toolkit')
HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, 'fixtures')

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

work = os.path.abspath(a.work) if a.work else tempfile.mkdtemp(prefix='doodle_regress_')
os.makedirs(work, exist_ok=True)

# ---------------------------------------------------------------- story parts (smoke_test.py)
spec = importlib.util.spec_from_file_location('smoke_test', os.path.join(TK, 'smoke_test.py'))
smoke = importlib.util.module_from_spec(spec); spec.loader.exec_module(smoke)
film = os.path.join(work, 'film_folder'); os.makedirs(film, exist_ok=True)
files = {
    'helpers.js': 'const HERO = [1, 2];\n',
    'plate_0_title.js': 'const P0 = { dur: 3, draw() {} };\n',
    'story_sound.js': 'P0.cues = [[1, "pop"]];\n',                        # a part named like a story, read by assemble.sh
    'story_tail.js': "defineStory({ title: 'Film', stages: 1, plates: [P0] });\nboot();\n",
    'story_head.js': 'const HEAD_ONLY = 1;\n',                             # not in assemble.sh, but inside story.js
    'story_other.js': "defineStory({ title: 'Other', stages: 1, plates: [] });\nboot();\n",
    'assemble.sh': '#!/bin/sh\nset -e\ncat helpers.js plate_0_title.js \\\n    story_sound.js story_tail.js > story.js\n',
}
for n, t in files.items():
    with open(os.path.join(film, n), 'w') as f: f.write(t)
with open(os.path.join(film, 'story.js'), 'w') as f:
    f.write(files['story_head.js'] + ''.join(files[n] for n in ('helpers.js', 'plate_0_title.js', 'story_sound.js', 'story_tail.js')))
names = sorted(n for n in os.listdir(film) if n.startswith('story') and n.endswith('.js'))
story_parts = getattr(smoke, 'story_parts', None)
check('story parts: smoke_test.py has story_parts()', story_parts is not None, 'smoke_test.py tests every story*.js, story_tail.js included')
if story_parts:
    parts = story_parts(film, names)
    check('story parts: story_tail.js, the assembled parts and a contained file are skipped',
          parts == {'story_tail.js', 'story_sound.js', 'story_head.js'}, f'got {sorted(parts)}')
    check('story parts: story.js and an independent story are still tested', 'story.js' not in parts and 'story_other.js' not in parts, f'got {sorted(parts)}')
    check('story parts: the bundled examples are all stories', not story_parts(TK, sorted(n for n in os.listdir(TK) if re.match(r'story.*\.js$', n))))

# ---------------------------------------------------------------- audio swell (audio_check.py)
try:
    import numpy as np
except ImportError:
    np = None
if np is None or not shutil.which('ffmpeg'):
    check('audio swell: numpy and ffmpeg available', False, 'install numpy and ffmpeg')
else:
    SR = 48000
    def wav(name, env):
        """8 s of stereo noise shaped by env(t) in dB, as a 16-bit WAV"""
        t = np.arange(8 * SR) / SR
        rng = np.random.default_rng(7)
        x = rng.standard_normal((len(t), 2)) * 10 ** (env(t)[:, None] / 20) * 0.35
        p = os.path.join(work, name)
        with wave.open(p, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
        return p
    flat = wav('flat.wav', lambda t: np.full_like(t, -24.0))
    # the engine's seam: the bed ducks 10 dB at the cut, then the new pad swells back over half a second
    swell = wav('swell.wav', lambda t: -24 - 10 * np.clip((5.6 - t) / 0.5, 0, 1) * (t >= 5.0))
    onset = wav('onset.wav', lambda t: np.where((t >= 5.02) & (t < 5.3), -12.0, -26.0))
    for name, path, want in (('flat bed warns', flat, 'WARN'), ('dip and swell passes', swell, 'PASS'), ('sharp onset passes', onset, 'PASS')):
        rc, out = run([sys.executable, os.path.join(TK, 'audio_check.py'), path, '--starts', '5.0'])
        ln = next((l for l in out.splitlines() if l.split()[1:2] == ['cues']), '')
        check(f'audio swell: {name}', rc == 0 and ln.startswith(want), ln or out[-300:])

# ---------------------------------------------------------------- browser checks
if a.static:
    pass
else:
    nm = a.node_modules or run(['npm', 'root', '-g'])[1].strip()
    if not os.path.isdir(os.path.join(nm, 'playwright')):
        check('playwright found', False, f'no playwright in {nm} (pass --node-modules)')
    else:
        os.environ['DOODLE_NODE_MODULES'] = os.path.abspath(nm)
        tk = os.path.join(work, 'tk')
        shutil.copytree(TK, tk, dirs_exist_ok=True)
        for f in ('story_alpha.js', 'story_pan_twice.js'): shutil.copy2(os.path.join(FIX, f), tk)
        if not os.path.exists(os.path.join(tk, 'node_modules')): os.symlink(os.path.abspath(nm), os.path.join(tk, 'node_modules'))
        def build(story):
            rc, out = run([sys.executable, 'build.py', story, story.replace('.js', '.html')], cwd=tk)
            check(f'{story} builds', rc == 0, out[-300:])
            return story.replace('.js', '.html') if rc == 0 else None
        def probe(html, body):
            rc, out = run(['node', os.path.join(HERE, 'probe.mjs'), os.path.join(tk, html), body], timeout=300)
            try: return json.loads(out.strip().splitlines()[-1])
            except Exception: return {'result': None, 'errors': [out[-300:]]}

        h = build('story_alpha.js')
        if h:
            LUM = """const s = window.__story, g = document.getElementById('stage').getContext('2d');
              const lum = (x, y) => { const d = g.getImageData(x - 4, y - 4, 9, 9).data; let v = 0;
                for (let i = 0; i < d.length; i += 4) v += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; return v / 81; };
              const at = (i, p) => Math.round((s.starts[i].t + p * s.starts[i].dur) * s.fps), out = {};
              window.__renderFrame(at(1, 0) - 3); out.before = lum(960, 540);
              window.__renderFrame(at(1, 0.7)); out.zoom = lum(960, 540);
              window.__renderFrame(at(2, 0.15)); out.fadeDraw = lum(1400, 540); out.fadeOverlay = lum(520, 540);
              window.__renderFrame(s.frames - 2); out.afterDraw = lum(1400, 540); out.afterOverlay = lum(520, 540);
              return out;"""
            r = probe(h, LUM); v = r.get('result') or {}
            check('alpha: probe runs with no page errors', bool(v) and not r.get('errors'), str(r.get('errors'))[:300])
            if v:
                check('alpha: the fixture draws its blocks black outside transitions',
                      max(v['before'], v['afterDraw'], v['afterOverlay']) < 60, str(v))
                # zoom in at p 0.7: the old plate is at about 45% (1 - in2(0.78)); it was fully black before the fix
                check('alpha: the old plate fades through a zoom even after ctx.globalAlpha = 1', v['zoom'] > 80, f"centre lum {v['zoom']:.0f}")
                # crossfade at p 0.15: the new plate is at about 1%; its blocks were fully black before the fix
                check('alpha: the new plate (draw and overlay) fades in through a crossfade',
                      v['fadeDraw'] > 150 and v['fadeOverlay'] > 150, f"draw {v['fadeDraw']:.0f}, overlay {v['fadeOverlay']:.0f}")
            r = probe(h, """const tr = STORY.plates[1].enter, keep = tr.dir; delete tr.dir;
              const q = window.__seamProbe(1, 0.5); tr.dir = 'out'; const o = window.__seamProbe(1, 0.5); tr.dir = keep;
              return { none: q.scaleOld, out: o.scaleOld };""")
            v = r.get('result') or {}
            check('zoom default: a zoom with no dir dives in (the old plate grows)', (v.get('none') or 0) > 1.2, str(v))
            check("zoom default: dir 'out' still pulls back (the old plate shrinks)", 0 < (v.get('out') or 9) < 0.8, str(v))

        # ---------------------------------------------------------------- instruments and stingers (v0.16.2)
        h = build('story_one_drop.js')
        if h:
            r = probe(h, open(os.path.join(HERE, 'instrument_probe.js')).read()); v = r.get('result') or {}
            check('instruments: the probe runs with no page errors', bool(v) and not r.get('errors'), str(r.get('errors'))[:300])
            if v:
                bad = [t for t in v['tuning'] if abs(t[2]) > 5]
                check(f"instruments: every note of the ten instruments is within 5 cents by FFT (worst {v['worst']:.2f})",
                      len(v['tuning']) >= 60 and not bad, str(bad[:6]))
                nv = [k for k, x in v['varied'].items() if not (x['seedRepeats'] and x['callsDiffer'])]
                check('instruments: a fixed seed repeats one exact note and plain calls vary', len(v['varied']) == 10 and not nv, str(nv))
                quiet = [k for k, pk in v['stingers'].items() if not 0.01 < pk < 1]
                check('stingers: all six render sound without clipping', len(v['stingers']) == 6 and not quiet, str(v['stingers']))
                check('instruments: deg plays note() of the film key in the home octave', abs(v['deg']) < 0.01, str(v['deg']))

        # ---------------------------------------------------------------- the score: tempo grid and beds (sound build S3)
        SCORE = """const s = window.__story, b = await renderAudio(), L = b.getChannelData(0); let pk = 0;
          for (let i = 0; i < L.length; i += 7) pk = Math.max(pk, Math.abs(L[i]));
          const m = s.music, off = m ? s.starts.map(x => Math.abs(((x.t - m.t0) / m.bar - Math.round((x.t - m.t0) / m.bar)) * m.bar)) : [];
          return { total: s.frames / s.fps, music: m, worst: Math.max(0, ...off), peak: pk,
            motif: STORY.plates.map(p => motifCues(p).length), tension: STORY.plates.map(p => +tensionOf(p).toFixed(2)) };"""
        src = open(os.path.join(tk, 'story_one_drop.js')).read()
        h = build('story_one_drop.js')
        base = (probe(h, SCORE).get('result') or {}) if h else {}
        check('score: classic (no style) keeps the film untimed and gridless', base.get('music') is None and abs(base.get('total', 0) - 55) < 0.05, str(base)[:200])
        for style in ('notebook', 'lofi', 'calm'):
            open(os.path.join(tk, f'story_score_{style}.js'), 'w').write(src.replace("music: { tonic: 220 }",
                f"music: {{ tonic: 220, style: '{style}', motif: {{ degs: [2, 3, 4, 6] }} }}").replace('const P1 = {', 'const P1 = { motif: true,', 1))
            h = build(f'story_score_{style}.js')
            if not h: continue
            r = probe(h, SCORE); v = r.get('result') or {}
            check(f'score {style}: renders with no page errors', bool(v) and not r.get('errors'), str(r.get('errors'))[:300])
            if v:
                check(f"score {style}: every plate starts within 25 ms of a bar line (bpm {(v['music'] or {}).get('bpm')})",
                      bool(v['music']) and v['worst'] <= 0.025, str(v)[:300])
                check(f'score {style}: plates only grow, by less than a bar each', 55 <= v['total'] <= 55 + 6 * v['music']['bar'], str(v['total']))
                check(f'score {style}: the motif plays on the hero plate and resolves on the end card', v['motif'][1] == 1 and v['motif'][-1] == 1, str(v['motif']))
                check(f"score {style}: tension rises to the climax", v['tension'][0] < max(v['tension']) == 1, str(v['tension']))
                check(f'score {style}: audible and unclipped', 0.05 < v['peak'] < 1, str(v['peak']))

        h = build('story_pan_twice.js')
        if h:
            rc, out = run(['node', 'speed_check.mjs', h], cwd=tk)
            check('pan twice: speed_check warns TWICE with the size jump, and still exits 0',
                  rc == 0 and bool(re.search(r'TWICE\s+seam 1: .* size jumps 1[23]\.\d+x', out)), out[-400:])
        h = build('story_one_drop.js')
        if h:
            rc, out = run(['node', 'speed_check.mjs', h], cwd=tk)
            check('pan twice: a bundled film with a clean pan gets no TWICE', rc == 0 and 'TWICE' not in out, out[-300:])

n_fail = sum(1 for _, ok, _ in results if not ok)
print(f'\n{len(results) - n_fail} passed, {n_fail} failed' + ('  (static only)' if a.static else ''))
if not a.work and not n_fail: shutil.rmtree(work, ignore_errors=True)
sys.exit(1 if n_fail else 0)
