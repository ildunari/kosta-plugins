#!/usr/bin/env python3
"""effects_test.py — the ambiences, effects and writing sounds added in sound build S2 (v0.16.6).

usage:
  python3 tests/doodle-art-animation/effects_test.py [--node-modules PATH] [--work DIR]

  exist        every new SFX and BED entry is a function, and every new effect is in VARIED
  pen          penOf picks the writing sound from the plate's paper (a paper, a set, the registry's sfx.header) and
               plate.pen still overrides it (a name, true, false, 'none')
  render       fixtures/story_sounds.js (one of each new sound) renders with no page error, twice to the same sound,
               with no clipped samples and every cue audible
  cue_check    the fixture passes cue_check.mjs

Needs node and Playwright (--node-modules, or DOODLE_NODE_MODULES, or the global npm root). Exit 1 if any check failed.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TK = os.path.join(REPO, 'plugins', 'doodle-art-animation', 'skills', 'doodle-art-animation', 'toolkit')
HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, 'fixtures')
NEW_FX = ['pencil', 'chalk', 'marker', 'quill', 'charcoal', 'techPen', 'typewriter', 'eraser', 'stamp', 'tear', 'counter', 'sonify',
          'sparkle', 'pipette', 'centrifuge', 'syringe', 'pills', 'fizz', 'bubbles', 'squelch', 'heartbeat', 'beep', 'zap', 'magnet']
NEW_BEDS = ['body', 'underwater', 'forest', 'ocean', 'fire', 'clockRoom', 'micro', 'vinyl']

ap = argparse.ArgumentParser()
ap.add_argument('--node-modules', default=os.environ.get('DOODLE_NODE_MODULES', ''))
ap.add_argument('--work', default='')
a = ap.parse_args()

results = []
def check(name, ok, detail=''):
    results.append((name, ok, detail)); print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok or not detail else '  -- ' + detail))
def run(cmd, cwd=None, timeout=600):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout); return p.returncode, p.stdout + p.stderr

nm = a.node_modules or run(['npm', 'root', '-g'])[1].strip()
if not os.path.isdir(os.path.join(nm, 'playwright')):
    check('playwright found', False, f'no playwright in {nm} (pass --node-modules)'); sys.exit(1)
os.environ['DOODLE_NODE_MODULES'] = os.path.abspath(nm)
work = a.work or tempfile.mkdtemp(prefix='doodle-effects-')
tk = os.path.join(work, 'tk'); shutil.copytree(TK, tk, dirs_exist_ok=True)
shutil.copy2(os.path.join(FIX, 'story_sounds.js'), tk)
if not os.path.exists(os.path.join(tk, 'node_modules')): os.symlink(os.path.abspath(nm), os.path.join(tk, 'node_modules'))
rc, out = run([sys.executable, 'build.py', 'story_sounds.js', 'story_sounds.html'], cwd=tk)
check('story_sounds.js builds', rc == 0, out[-300:])
if rc: sys.exit(1)

BODY = """
const fx = %s, beds = %s, out = {};
out.missing = [...fx.filter(n => typeof SFX[n] !== 'function'), ...beds.filter(n => typeof BED[n] !== 'function').map(n => 'BED.' + n)];
out.notVaried = fx.filter(n => !VARIED.has(n));
const cases = [[{}, 'scratch'], [{ dark: true }, 'readout'], [{ paper: 'graph' }, 'pencil'], [{ paper: 'chalkboard', dark: true }, 'chalk'],
  [{ paper: 'whiteboard' }, 'marker'], [{ paper: 'blueprint', dark: true }, 'techPen'], [{ paper: 'kraft' }, 'charcoal'], [{ paper: 'parchment' }, 'quill'],
  [{ paper: 'fluorescence', dark: true }, 'readout'], [{ pen: 'marker' }, 'marker'], [{ pen: true, dark: true }, 'scratch'], [{ pen: false }, 'readout'],
  [{ pen: 'none' }, null], [{ pen: true, paper: 'graph' }, 'pencil'], [{ _ground: { sfx: { header: 'quill' } } }, 'quill']];
out.pen = cases.map(([p, want]) => { const got = penOf(p); return got === want ? null : JSON.stringify(p) + ' -> ' + got + ', want ' + want; }).filter(Boolean);
const b1 = await renderAudio(), b2 = await renderAudio(), L1 = b1.getChannelData(0), R1 = b1.getChannelData(1), L2 = b2.getChannelData(0), R2 = b2.getChannelData(1);
let same = L1.length === L2.length, diff = 0, clip = 0, peak = 0;
for (let i = 0; i < L1.length; i++) { diff = Math.max(diff, Math.abs(L1[i] - L2[i]), Math.abs(R1[i] - R2[i])); const v = Math.max(Math.abs(L1[i]), Math.abs(R1[i])); peak = Math.max(peak, v); if (v > 0.999) clip++; }
const rms = (t0, t1) => { let s = 0, n = 0; for (let i = Math.floor(t0 * b1.sampleRate); i < Math.min(L1.length, t1 * b1.sampleRate); i++) { s += L1[i] * L1[i] + R1[i] * R1[i]; n += 2; } return 10 * Math.log10(s / Math.max(1, n) + 1e-12); };
out.quiet = [];
for (const p of STORY.plates) { for (const [ct, name] of (p.cues || [])) { const db = rms(p.start + ct, p.start + ct + 0.5); if (db < -60) out.quiet.push(name + ' ' + db.toFixed(1)); }
  if (p.bed) { const db = rms(p.start + 1, p.start + p.dur - 0.5); if (db < -60) out.quiet.push('bed at ' + p.start.toFixed(1) + ' ' + db.toFixed(1)); } }
out.same = same; out.diff = diff; out.clip = clip; out.peakDb = 20 * Math.log10(peak + 1e-12);
return out;""" % (json.dumps(NEW_FX), json.dumps(NEW_BEDS))
rc, o = run(['node', os.path.join(HERE, 'probe.mjs'), os.path.join(tk, 'story_sounds.html'), BODY], timeout=600)
try: r = json.loads(o.strip().splitlines()[-1])
except Exception: r = {'result': None, 'errors': [o[-400:]]}
v = r.get('result') or {}
check('render: probe runs with no page errors', bool(v) and not r.get('errors'), str(r.get('errors'))[:400])
if v:
    check('exist: every new SFX and BED entry is a function', not v['missing'], ', '.join(v['missing']))
    check('exist: every new effect varies per call (VARIED)', not v['notVaried'], ', '.join(v['notVaried']))
    check('pen: the writing sound follows the paper, and plate.pen overrides it', not v['pen'], '; '.join(v['pen']))
    # Chromium's offline audio graph is not bit-exact between two renders (main's own engine differs by up to about
    # 1e-6, measured on story_one_drop), so the same film must render within 1e-4 (-80 dB) of itself
    check('render: the same film renders the same sound twice (within 1e-4)', v['same'] and v['diff'] < 1e-4, f"max difference {v['diff']:.2g}")
    check('render: no clipped samples', v['clip'] == 0, f"{v['clip']} samples, peak {v['peakDb']:.1f} dB")
    check('render: every cue and bed is audible', not v['quiet'], ', '.join(v['quiet']))
rc, out = run(['node', 'cue_check.mjs', 'story_sounds.html'], cwd=tk, timeout=600)
check('cue_check: the fixture passes', rc == 0 and 'result: FAIL' not in out, out[-500:])

n_fail = sum(1 for _, ok, _ in results if not ok)
print(f'\n{len(results) - n_fail} passed, {n_fail} failed')
if not a.work and not n_fail: shutil.rmtree(work, ignore_errors=True)
sys.exit(1 if n_fail else 0)
