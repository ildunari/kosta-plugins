#!/usr/bin/env python3
"""acceptance_check.py — go / no-go checks for doodle-art-animation v0.13 (docs/doodle-art-animation/ACCEPTANCE.md).

usage:
  python3 tests/doodle-art-animation/acceptance_check.py            # static text and file checks (seconds)
  python3 tests/doodle-art-animation/acceptance_check.py --full     # + builds, page probes, renders, timing (minutes)
  options: --only L8,L9   run only those ledger items    --node-modules PATH   where playwright lives
           --work DIR     scratch folder for builds (default: a temp folder)

Prints one line per check (PASS / FAIL / SKIP) grouped by ledger item and exits 1 if any check failed.
Only [auto] items are here; [eye] items need evidence (see ACCEPTANCE.md).
"""
import argparse, glob, json, os, re, shutil, subprocess, sys, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PLUG = os.path.join(REPO, 'plugins', 'doodle-art-animation')
SK = os.path.join(PLUG, 'skills', 'doodle-art-animation')
TK = os.path.join(SK, 'toolkit')
REF = os.path.join(SK, 'references')
HERE = os.path.dirname(os.path.abspath(__file__))

ap = argparse.ArgumentParser()
ap.add_argument('--full', action='store_true')
ap.add_argument('--only', default='')
ap.add_argument('--node-modules', default=os.environ.get('DOODLE_NODE_MODULES', ''))
ap.add_argument('--work', default='')
a = ap.parse_args()
ONLY = {s.strip().upper() for s in a.only.split(',') if s.strip()}
if a.node_modules: os.environ['DOODLE_NODE_MODULES'] = os.path.abspath(a.node_modules)

results = []   # (item, name, status, detail)
def check(item, name, ok, detail=''):
    results.append((item, name, 'PASS' if ok else 'FAIL', '' if ok else detail))
def skip(item, name, why): results.append((item, name, 'SKIP', why))
def want(item): return not ONLY or item in ONLY

def read(p):
    try:
        with open(p, encoding='utf-8') as f: return f.read()
    except FileNotFoundError: return None
def has(text, *needles, ci=True):
    if text is None: return False
    t = text.lower() if ci else text
    return all((n.lower() if ci else n) in t for n in needles)
def plugin_text():
    out = {}
    for p in glob.glob(os.path.join(PLUG, '**', '*'), recursive=True):
        if os.path.isfile(p) and p.endswith(('.md', '.js', '.mjs', '.py', '.json', '.html')) and 'node_modules' not in p:
            out[os.path.relpath(p, PLUG)] = read(p)
    return out
def frontmatter(p):
    t = read(p)
    if not t or not t.startswith('---'): return {}
    body = t.split('---', 2)[1]
    return {m.group(1): m.group(2).strip() for m in re.finditer(r'^(\w[\w-]*):\s*(.*)$', body, re.M)}
def section(text, heading_re):
    """text from a heading matching heading_re up to the next heading of the same or higher level"""
    if not text: return ''
    m = re.search(heading_re, text, re.M)
    if not m: return ''
    level = len(re.match(r'#+', m.group(0)).group(0))
    rest = text[m.end():]
    n = re.search(r'^#{1,%d} ' % level, rest, re.M)
    return rest[:n.start()] if n else rest
def workflow_step(skill, n):
    wf = section(skill, r'^## Workflow')
    m = re.search(r'^%d\. (.*?)(?=^\d+\. |\Z)' % n, wf, re.M | re.S)
    return m.group(1) if m else ''

SKILL = read(os.path.join(SK, 'SKILL.md')) or ''
QA = read(os.path.join(PLUG, 'skills', 'doodle-qa', 'SKILL.md')) or ''
MOTION = read(os.path.join(REF, 'motion.md')) or ''
STYLE = read(os.path.join(REF, 'style.md')) or ''
API = read(os.path.join(REF, 'api.md')) or ''
COMP = read(os.path.join(REF, 'components.md')) or ''
WRITING = read(os.path.join(REF, 'writing.md')) or ''
ENGINE = read(os.path.join(TK, 'engine.js')) or ''
RULES = section(SKILL, r'^## The rules that matter most')
STROKES = ['pencil-2b', 'pencil-hb', 'pencil-2h', 'cpencil', 'charcoal', 'marker', 'marker-2', 'techpen', 'spray']
LIFE = ['quadruped', 'fishSchool', 'insect', 'flock', 'figure', 'crowd']
SETTLE = ['house', 'hut', 'tent', 'tower', 'village', 'skyline', 'road', 'bridge', 'ship', 'cart', 'fields', 'market', 'map', 'ruins']
EARTH_NEW = ['river', 'volcano', 'cave', 'dunes', 'iceberg', 'flowers']
AGENTS_NEW = ['script-reviewer', 'sound-designer', 'audio-reviewer']

# ---------------------------------------------------------------- static checks
if want('L3'):
    check('L3', 'toolkit/speed_check.mjs exists', os.path.isfile(os.path.join(TK, 'speed_check.mjs')))
    pc = section(MOTION, r'^## Pace is a choice')
    check('L3', 'motion.md has "## Pace is a choice"', bool(pc.strip()))
    check('L3', 'Pace section says numbers are defaults and only snaps are hard failures',
          has(pc, 'default') and has(pc, 'taste') and has(pc, 'snap'), 'needs "default", "taste" and "snap"')
    check('L3', 'SKILL.md mentions speed_check', 'speed_check' in SKILL)
    check('L3', 'seam-reviewer mentions speed_check', 'speed_check' in (read(os.path.join(PLUG, 'agents', 'seam-reviewer.md')) or ''))

if want('L4'):
    banned = [r'"The Water Cycle"', r'Opus 5 "Water', r'\*\*Reference:\*\*', r'from the reference', r"the reference's",
              r'reference cloud', r'the reference measures']
    hits = [f'{rel}: {pat}' for rel, t in plugin_text().items() if t for pat in banned if re.search(pat, t, re.I)]
    check('L4', 'no Water Cycle film reference in the plugin', not hits, '; '.join(hits[:8]))
    check('L4', 'One Drop example still listed in SKILL.md', 'story_one_drop.js' in SKILL)
    check('L4', 'motion targets still stated (median 1.5 per drawing)', has(SKILL + MOTION, 'median') and '1.5' in (SKILL + MOTION))

if want('L5'):
    check('L5', 'SKILL.md says "one tracked hero subject"', has(SKILL, 'one tracked hero subject'))
    check('L5', 'SKILL.md defines plates as scenes', bool(re.search(r'scenes?\W{0,4}\s*\(?(we call them|called)?\s*\**plates|plates\**\W{0,4}\s*(are|=|mean)\s*(the\s*)?scenes|scenes?[^.]{0,40}\bcall(s|ed)?\b[^.]{0,10}plates', SKILL, re.I)),
          'expected e.g. "scenes (we call them plates)" or "plates are scenes"')
    old = [s for s in ['one small tracked', 'Something small', '(a molecule, a particle, a photon)'] if s.lower() in SKILL.lower()]
    check('L5', 'old small-hero wording removed', not old, ', '.join(old))
    check('L5', 'writing.md does not require a small hero', not re.search(r'\bsmall\b[^.\n]{0,40}\bhero\b|\bhero\b[^.\n]{0,30}\b(is|must be|should be) small', WRITING, re.I))

if want('L6'):
    check('L6', 'SKILL.md says "night paper"', has(SKILL, 'night paper'))
    check('L6', 'microscope-world sentence removed', 'dark navy "microscope" world' not in SKILL)
    night = re.search(r'^\|\s*\*\*Night\*\*\s*\|(.*)$', STYLE, re.M)
    check('L6', 'style.md night row covers inside/hidden/abstract views', bool(night) and has(night.group(1), 'abstract'),
          'the **Night** row should name abstract (and hidden/inside) views')

if want('L7') or want('L14'):
    art = next((p for p in SKILL.split('\n\n') if 'ink primitives' in p or 'primitives' in p), '')
    missing = [n for n in ['`pen`', '`ink`', '`hatch`', '`shade`', '`stipple`', '`scribble`', '`speckle`', '`shape.*`', '`brush.*`', '`wash`'] if n not in art]
    check('L7', 'art paragraph names every primitive', not missing, 'missing ' + ', '.join(missing))
    miss = [n for n in ['brush', 'KIT.life', 'KIT.settle', 'animation-principles.md', 'intake.md'] if n not in RULES]
    check('L14', 'key rules mention brushes, new kits, principles and intake', not miss, 'missing ' + ', '.join(miss))

if want('L8'):
    bs = re.search(r'p5\.brush', ENGINE)
    check('L8', 'engine.js credits p5.brush', bool(bs))
    for fn in ['brush.stroke', 'brush.wash', 'brush.hatch', 'brush.field']:
        name = fn.split('.')[1]
        check('L8', f'engine defines {fn}', bool(re.search(r'\bbrush\b[\s\S]{0,20000}\b%s\s*[:(=]' % name, ENGINE)) and bool(re.search(r'\b(const|let|var)\s+brush\b', ENGINE)))
    check('L8', 'engine defines a global wash', bool(re.search(r'^(function wash\b|const wash\s*=)', ENGINE, re.M)))
    miss = [s for s in STROKES if f"'{s}'" not in ENGINE and f'"{s}"' not in ENGINE]
    check('L8', 'engine has every stroke type', not miss, 'missing ' + ', '.join(miss))
    m = re.search(r'BRUSHES[^\n]*\n([\s\S]*?)(?=\n/\* ={5,})', ENGINE)
    check('L8', 'brush section found (a "BRUSHES" banner)', bool(m))
    if m:
        bad = [w for w in ['Math.random', 'Date.now', 'new Date', 'performance.now'] if w in m.group(1)]
        check('L8', 'brush section has no Math.random / Date / performance.now', not bad, ', '.join(bad))
    check('L8', 'engine exposes window.__brushProbe', '__brushProbe' in ENGINE)
    miss = [s for s in STROKES + ['brush.stroke', 'brush.wash', 'brush.hatch', 'brush.field'] if s not in API]
    check('L8', 'api.md documents every brush name', not miss, 'missing ' + ', '.join(miss))
    br = section(STYLE, r'^## Brushes')
    check('L8', 'style.md "## Brushes" credits p5.brush and allows washes under the ink', has(br, 'p5.brush', 'wash', 'under'))
    check('L8', 'toolkit/story_brushes.js exists', os.path.isfile(os.path.join(TK, 'story_brushes.js')))
    smoke = read(os.path.join(TK, 'smoke_test.py')) or ''
    check('L8', 'smoke_test knows story_brushes.js as bundled', 'story_brushes.js' in smoke)

if want('L9'):
    for kit, names in [('life', LIFE), ('settle', SETTLE)]:
        t = read(os.path.join(TK, 'kits', f'{kit}.js'))
        check('L9', f'kits/{kit}.js defines KIT.{kit}', bool(t) and f'KIT.{kit}' in t)
        ret = re.findall(r'return\s*\{([^}]*)\}\s*;?\s*\}\)\(\)', t or '')
        exported = set(re.findall(r'\w+', ret[-1])) if ret else set()
        miss = [n for n in names if n not in exported]
        check('L9', f'KIT.{kit} returns {len(names)} components', not miss, 'missing ' + ', '.join(miss))
    et = read(os.path.join(TK, 'kits', 'earth.js')) or ''
    ret = re.findall(r'return\s*\{([^}]*)\}\s*;?\s*\}\)\(\)', et)
    exported = set(re.findall(r'\w+', ret[-1])) if ret else set()
    miss = [n for n in EARTH_NEW if n not in exported]
    check('L9', 'KIT.earth returns the new nature components', not miss, 'missing ' + ', '.join(miss))
    gal = read(os.path.join(TK, 'story_gallery.js')) or ''
    allnew = [f'life.{n}' for n in LIFE] + [f'settle.{n}' for n in SETTLE] + [f'earth.{n}' for n in EARTH_NEW]
    miss = [n for n in allnew if n not in COMP]
    check('L9', 'components.md lists every new component', not miss, 'missing ' + ', '.join(miss))
    miss = [n for n in allnew if f'KIT.{n}' not in gal]
    check('L9', 'story_gallery.js shows every new component', not miss, 'missing ' + ', '.join(miss))

if want('L10'):
    check('L10', 'FEEDBACK.md removed', not os.path.exists(os.path.join(SK, 'FEEDBACK.md')))
    check('L10', 'no Feedback Loop section / FEEDBACK.md mention', 'FEEDBACK' not in SKILL and '## Feedback Loop' not in SKILL)
    check('L10', 'SKILL.md says to suggest a plugin change', has(SKILL, 'plugin change'))

if want('L11'):
    s3 = workflow_step(SKILL, 3)
    check('L11', 'step 3 says "scene script"', has(s3, 'scene script'))
    check('L11', 'step 3 asks for a short summary, not the full script', has(s3, 'summary') and 'show the script to the user' not in s3)

if want('L12'):
    ap_ = read(os.path.join(REF, 'animation-principles.md'))
    check('L12', 'references/animation-principles.md exists', ap_ is not None)
    terms = ['overlapping action', 'follow-through', 'stagger', 'hand-off', 'moving hold', 'arc', 'anticipation', 'secondary']
    miss = [t for t in terms if not has(ap_, t)]
    check('L12', 'principles file covers the agreed principles', not miss, 'missing ' + ', '.join(miss))
    check('L12', 'principles file has do / don\'t examples in engine terms',
          bool(ap_) and bool(re.search(r"\bdon[’']t\b", ap_, re.I)) and bool(re.search(r'`(kf|inv|E\.\w+|along|draw|overlay)', ap_ or '')))
    check('L12', 'step 3 points to animation-principles.md', 'animation-principles.md' in workflow_step(SKILL, 3))

if want('L13'):
    rm = read(os.path.join(TK, 'render.mjs')) or ''
    check('L13', 'render.mjs supports --sheet-range', 'sheet-range' in rm)
    s5 = workflow_step(SKILL, 5)
    check('L13', 'step 5 requires range sheets and detail crops', '--sheet-range' in s5 and has(s5, 'crop'))

if want('L15') or want('L16'):
    for n in AGENTS_NEW:
        fm = frontmatter(os.path.join(PLUG, 'agents', f'{n}.md'))
        check('L15' if n == 'script-reviewer' else 'L16', f'agents/{n}.md with name + description', fm.get('name') == n and bool(fm.get('description')))
    ar = read(os.path.join(PLUG, 'agents', 'audio-reviewer.md'))
    check('L16', 'audio-reviewer says it cannot listen and uses measurements',
          bool(ar) and bool(re.search(r"can(no|')t (listen|hear)", ar, re.I)) and has(ar, 'audio_check', 'spectrogram'))
    miss = [n for n in AGENTS_NEW if n not in SKILL]
    check('L15', 'SKILL.md names the three new agents', not miss, 'missing ' + ', '.join(miss))
    miss = [n for n in AGENTS_NEW + ['film-reviewer', 'seam-reviewer'] if n not in QA]
    check('L16', 'doodle-qa names all five agents', not miss, 'missing ' + ', '.join(miss))

if want('L17'):
    it = read(os.path.join(REF, 'intake.md'))
    check('L17', 'references/intake.md exists', it is not None)
    miss = [k for k, ok in {
        'permission first': has(it, 'before i start') or has(it, 'permission'),
        '3-7 questions': bool(it) and bool(re.search(r'3\s*(–|-|to)\s*7', it)),
        '(Recommended)': has(it, '(Recommended)', ci=False),
        'Other': has(it, 'Other', ci=False),
        'question tool / plain text': has(it, 'AskUserQuestion') and has(it, 'plain text'),
        'skip on just make it': has(it, 'just make it'),
    }.items() if not ok]
    check('L17', 'intake.md covers the agreed flow', not miss, 'missing ' + ', '.join(miss))
    s0 = workflow_step(SKILL, 0)
    check('L17', 'workflow step 0 points to intake.md', 'intake.md' in s0)

if want('REL'):
    pj = json.loads(read(os.path.join(PLUG, '.claude-plugin', 'plugin.json')) or '{}')
    mj = json.loads(read(os.path.join(REPO, '.claude-plugin', 'marketplace.json')) or '{}')
    mv = next((p.get('version') for p in mj.get('plugins', []) if p.get('name') == 'doodle-art-animation'), None)
    check('REL', 'plugin.json version 0.13.0', pj.get('version') == '0.13.0', str(pj.get('version')))
    check('REL', 'marketplace entry version 0.13.0', mv in (None, '0.13.0'), str(mv))

# ---------------------------------------------------------------- full checks (build, probe, render)
def run(cmd, cwd=None, timeout=1800):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout + p.stderr

if a.full:
    work = os.path.abspath(a.work) if a.work else tempfile.mkdtemp(prefix='doodle_accept_')
    os.makedirs(work, exist_ok=True)
    for p in glob.glob(os.path.join(TK, '*')):
        d = os.path.join(work, os.path.basename(p))
        if os.path.isdir(p): shutil.copytree(p, d, dirs_exist_ok=True)
        else: shutil.copy2(p, d)
    for p in glob.glob(os.path.join(HERE, 'fixtures', '*.js')): shutil.copy2(p, work)
    nm = os.environ.get('DOODLE_NODE_MODULES')
    if nm and not os.path.exists(os.path.join(work, 'node_modules')): os.symlink(nm, os.path.join(work, 'node_modules'))
    built = {}
    def build(story):
        if story in built: return built[story]
        if not os.path.isfile(os.path.join(work, story)): built[story] = None; return None
        html = story.replace('.js', '.html')
        rc, out = run(['python3', 'build.py', story, html], cwd=work)
        built[story] = os.path.join(work, html) if rc == 0 else None
        if rc: print(f'build {story} failed:\n{out[-800:]}')
        return built[story]
    def probe(html, body):
        rc, out = run(['node', os.path.join(HERE, 'probe.mjs'), html, body], timeout=600)
        try: return json.loads(out.strip().splitlines()[-1])
        except Exception: return {'result': None, 'errors': [out[-400:]]}
    FRAME_TIME = """const s = window.__story, n = 24, ts = [];
      for (let i = 0; i < n; i++) { const f = Math.floor((i + 0.5) * s.frames / n); const t0 = performance.now(); window.__renderFrame(f); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b); return { median: ts[n >> 1], starts: s.starts, frames: s.frames, fps: s.fps };"""

    ex = build('story_example.js')
    check('L2', 'story_example builds', bool(ex))

    if want('L3'):
        sc = os.path.join(work, 'speed_check.mjs')
        if not os.path.isfile(sc): skip('L3', 'speed_check runs', 'speed_check.mjs missing')
        else:
            for story in ['story_example.js', 'story_one_drop.js']:
                h = build(story)
                rc, out = run(['node', 'speed_check.mjs', h], cwd=work) if h else (9, 'build failed')
                check('L3', f'speed_check passes {story}', rc == 0 and 'SNAP' not in out, out[-300:])
            h = build('story_snap.js')
            if not h: check('L3', 'snap fixture builds', False, 'tests/doodle-art-animation/fixtures/story_snap.js missing or broken')
            else:
                rc, out = run(['node', 'speed_check.mjs', h], cwd=work)
                check('L3', 'speed_check fails the snap fixture with SNAP', rc == 1 and 'SNAP' in out, f'rc={rc} {out[-300:]}')

    if want('L8'):
        bh = build('story_brushes.js')
        check('L8', 'story_brushes builds', bool(bh))
        if bh:
            kinds = STROKES + ['wash', 'hatch', 'field']
            r = probe(bh, "const k = %s, out = {}; for (const x of k) { const a = window.__brushProbe(x, 0), b = window.__brushProbe(x, 0); out[x] = [a.hash, b.hash, a.ms]; } return out;" % json.dumps(kinds))
            res = r.get('result') or {}
            check('L8', 'brush probe runs with no page errors', bool(res) and not r.get('errors'), '; '.join(r.get('errors') or [])[:300])
            nondet = [k for k in kinds if k not in res or res[k][0] != res[k][1]]
            check('L8', 'every brush is deterministic', not nondet, 'differs/missing: ' + ', '.join(nondet))
            if ex:
                base = (probe(ex, FRAME_TIME).get('result') or {}).get('median')
                heavy = (probe(bh, FRAME_TIME).get('result') or {}).get('median')
                ok = bool(base and heavy and heavy <= 1.5 * base)
                check('L8', 'brush story frame time <= 1.5x example', ok, f'example {base} ms, brushes {heavy} ms')

    if want('L9'):
        gh = build('story_gallery.js')
        check('L9', 'gallery builds', bool(gh))
        if gh:
            names = [f'life.{n}' for n in LIFE] + [f'settle.{n}' for n in SETTLE] + [f'earth.{n}' for n in EARTH_NEW]
            r = probe(gh, "return %s.filter(n => { const [k, c] = n.split('.'); return !(KIT[k] && typeof KIT[k][c] === 'function'); });" % json.dumps(names))
            check('L9', 'every new component is a function in the built gallery', r.get('result') == [] and not r.get('errors'),
                  f"missing {r.get('result')} errors {r.get('errors')}")
            rc, out = run(['node', 'render.mjs', gh, '--sheet', '2', '--dir', os.path.join(work, 'qa_gallery')], cwd=work)
            check('L9', 'gallery renders with no page errors', rc == 0 and 'PAGE ERROR' not in out, out[-300:])

    if want('L13') and ex:
        d = os.path.join(work, 'qa_range')
        rc, out = run(['node', 'render.mjs', ex, '--sheet-range', '2-4', '--fps', '6', '--dir', d], cwd=work)
        check('L13', '--sheet-range writes range_2-4.jpg', rc == 0 and os.path.isfile(os.path.join(d, 'range_2-4.jpg')), out[-300:])

    if (want('L1') or want('L2')) and ex:
        mp4 = os.path.join(work, 'example.mp4')
        rc, out = run(['node', 'render.mjs', ex, mp4, '--workers', '6', '--bitrate', '3800k'], cwd=work, timeout=3600)
        check('L2', 'story_example renders', rc == 0 and os.path.isfile(mp4), out[-300:])
        info = probe(ex, FRAME_TIME).get('result') or {}
        starts = [s['t'] for s in info.get('starts', [])]
        total = info.get('frames', 0) / max(info.get('fps', 24), 1)
        def median(t0, t1):
            rc, out = run(['python3', 'motion_check.py', mp4, f'{t0:.2f}', f'{t1 - t0:.2f}'], cwd=work)
            m = re.search(r'median ([\d.]+)', out)
            return float(m.group(1)) if m else None, out
        if rc == 0 and len(starts) >= 2:
            md, _ = median(0, starts[1])
            check('L2', 'title plate median >= 1.2', md is not None and md >= 1.2, f'median {md}')
            md, _ = median(starts[-1], total)
            check('L1', 'end card median >= 1.2', md is not None and md >= 1.2, f'median {md}')
            rc2, out = run(['python3', 'motion_check.py', mp4], cwd=work)
            check('L2', 'no SNAP in the whole film', 'SNAP' not in out, [l for l in out.splitlines() if 'spikes' in l][:1])
        rc, out = run(['node', 'text_check.mjs', ex], cwd=work)
        check('L2', 'text_check CLEAN on story_example', rc == 0 and 'CLEAN' in out, out[-300:])

    if want('REL'):
        cmd = ['python3', os.path.join(TK, 'smoke_test.py'), '--work', os.path.join(work, 'smoke'), '--no-video']
        if nm: cmd += ['--node-modules', nm]
        rc, out = run(cmd, timeout=3600)
        check('REL', 'smoke_test passes every bundled story', rc == 0, out[-500:])
        check('REL', 'smoke_test covered story_brushes.js', 'story_brushes' in out)

# ---------------------------------------------------------------- report
order = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'REL']
col = {'PASS': '\033[32m', 'FAIL': '\033[31m', 'SKIP': '\033[33m'}
tty = sys.stdout.isatty()
for item in order:
    for it, name, st, det in results:
        if it != item: continue
        tag = f"{col[st]}{st}\033[0m" if tty else st
        print(f'{tag}  {it:<4} {name}' + (f'  — {det}' if det else ''))
n = {s: sum(r[2] == s for r in results) for s in ('PASS', 'FAIL', 'SKIP')}
print(f"\n{n['PASS']} passed, {n['FAIL']} failed, {n['SKIP']} skipped" + ('' if a.full else '  (static only; add --full for builds and renders)'))
sys.exit(1 if n['FAIL'] else 0)
