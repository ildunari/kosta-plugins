#!/usr/bin/env python3
"""acceptance_check.py — go / no-go checks for doodle-art-animation (docs/doodle-art-animation/ACCEPTANCE.md: L1-L17 from v0.13, W1-W9 from v0.14).

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

def norm(t):
    """fold the unicode a writer (or a defeat) might use for an ASCII character we match on"""
    if t is None: return None
    for a, b in (('\u2011', '-'), ('\u2010', '-'), ('\u2012', '-'), ('\u2013', '-'), ('\u2014', '-'),
                 ('\u00a0', ' '), ('\u2019', "'"), ('\u2018', "'"), ('\u201c', '"'), ('\u201d', '"')):
        t = t.replace(a, b)
    return t

# a negation that lands on the keyword sits in front of it, in the same sentence: "do not reuse", "never stop"
NEG = r'(never|not|no longer|do not|don.t|need not|cannot|can.t|must not|no need to|was a v0\.\d+ idea)'
def _before(text, m):
    return text[max(0, text.rfind('.', 0, m.start()) + 1):m.start()]
def asserted(text, pat):
    """any match of pat that is not negated in front of it — i.e. the file really says this"""
    return [m for m in re.finditer(pat, text, re.I) if not re.search(NEG, _before(text, m), re.I)]
def denied(text, pat):
    """the file mentions pat only to negate it — the way prose defeats a keyword check"""
    return bool(re.search(pat, text, re.I)) and not asserted(text, pat)

def read(p):
    try:
        with open(p, encoding='utf-8') as f: return norm(f.read())
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
_WF = section(SKILL, r'^## Workflow')
def _step(pat):
    for m in re.finditer(r'^(?:\d+|Gate \d+)[.)] (.*?)(?=^(?:\d+|Gate \d+)[.)] |\Z)', _WF, re.M | re.S):
        if re.search(pat, m.group(1), re.I): return m.group(1)
    return ''
LSCRIPT = _step(r'scene script')            # the step that authors the plan
LGATE1 = _step(r'script-reviewer')          # the review gate
LBUILD = _step(r'build-lanes\.md')          # the step that builds the plates
LASSEMBLE = _step(r'--sheet-range')
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
        # the __brushProbe hook is a test hook, not drawing code: it may read the clock to time a sample
        drawing = re.sub(r'window\.__brushProbe[\s\S]*', '', m.group(1))
        drawing = re.sub(r'(?m)^\s*(//|\*|/\*).*$', '', drawing)   # comments are prose, not drawing code
        bad = [w for w in ['Math.random', 'Date.now', 'new Date', 'performance.now'] if w in drawing]
        check('L8', 'brush drawing code has no Math.random / Date / performance.now', not bad, ', '.join(bad))
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
    check('L11', 'a step authors the scene script', bool(LSCRIPT) and has(LSCRIPT, 'scene script'))
    check('L11', 'the user gets a short summary, not the full script',
          has(LGATE1 or LSCRIPT, 'summary') and 'show the script to the user' not in SKILL)

if want('L12'):
    ap_ = read(os.path.join(REF, 'animation-principles.md'))
    check('L12', 'references/animation-principles.md exists', ap_ is not None)
    terms = ['overlapping action', 'follow-through', 'stagger', 'hand-off', 'moving hold', 'arc', 'anticipation', 'secondary']
    miss = [t for t in terms if not has(ap_, t)]
    check('L12', 'principles file covers the agreed principles', not miss, 'missing ' + ', '.join(miss))
    check('L12', 'principles file has do / don\'t examples in engine terms',
          bool(ap_) and bool(re.search(r"\bdon[’']t\b", ap_, re.I)) and bool(re.search(r'`(kf|inv|E\.\w+|along|draw|overlay)', ap_ or '')))
    check('L12', 'the script step points to animation-principles.md', 'animation-principles.md' in LSCRIPT)

if want('L13'):
    rm = read(os.path.join(TK, 'render.mjs')) or ''
    check('L13', 'render.mjs supports --sheet-range', 'sheet-range' in rm)
    lb = LBUILD or LASSEMBLE
    check('L13', 'the build step requires range sheets and detail crops', '--sheet-range' in lb and has(lb, 'crop'))

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

AGENTS_ALL = ['script-reviewer', 'sound-designer', 'film-reviewer', 'seam-reviewer', 'audio-reviewer']
AG = {n: (read(os.path.join(PLUG, 'agents', f'{n}.md')) or '') for n in AGENTS_ALL}
AGD = {n: frontmatter(os.path.join(PLUG, 'agents', f'{n}.md')).get('description', '') for n in AGENTS_ALL}
PLAN = read(os.path.join(PLUG, 'skills', 'doodle-plan', 'SKILL.md')) or ''
BUILD = read(os.path.join(PLUG, 'skills', 'doodle-build', 'SKILL.md')) or ''
INTAKE = read(os.path.join(REF, 'intake.md')) or ''
LANES = read(os.path.join(REF, 'build-lanes.md')) or ''
WF = section(SKILL, r'^## Workflow')
def wstep(pat):
    """the workflow step whose text matches pat (a regex), or '' """
    for m in re.finditer(r'^(?:\d+|Gate \d+)[.)] (.*?)(?=^(?:\d+|Gate \d+)[.)] |\Z)', WF, re.M | re.S):
        if re.search(pat, m.group(1), re.I): return m.group(1)
    return ''

if want('W1'):
    authoring = wstep(r'writes? the scene script|scene script')
    check('W1', 'a step authors the script on its own', bool(authoring) and 'sound-designer' not in authoring,
          'the script step still mentions sound-designer' if authoring else 'no script-authoring step found')
    g1 = next((m.group(1) for m in re.finditer(r'^Gate 1[.)] (.*?)(?=^(?:\d+|Gate \d+)[.)] |\Z)', WF, re.M | re.S)), '')
    onsaved = bool(re.search(r'(never before that file exists|never before the file exists|only once .{0,40}saved|on the saved `?script\.md)', g1, re.I))
    check('W1', 'Gate 1 is a step of its own and runs script-reviewer on the saved script',
          bool(g1) and 'script-reviewer' in g1 and onsaved and not re.search(r'before anything is saved|on the topic', g1, re.I),
          'Gate 1 must name script-reviewer and say it runs on the saved script, not on the topic')
    check('W1', 'the sound plan has its own step', bool(wstep(r'sound-designer')) and wstep(r'sound-designer') != authoring)
    bad = [n for n, d in AGD.items() if re.search(r'workflow step \d', d, re.I)]
    check('W1', 'no agent description names a workflow step number', not bad, ', '.join(bad))

if want('W2'):
    need = {'script-reviewer': r'script', 'sound-designer': r'review', 'film-reviewer': r'(built|html)',
            'seam-reviewer': r'(built|html)', 'audio-reviewer': r'(mp4|audio)'}
    # a stop clause, not merely the word "stop": and nothing that licenses carrying on regardless
    STOPS = r'\b(stop|refuse|do not (start|review|continue)|don.t (start|review|continue))\b'
    # any sentence that offers a way to continue without the input defeats the rule, however it is phrased
    LICENCE = (r"(do not stop|don.t stop|never need to stop|no need to stop|proceed anyway|carry on anyway|"
               r"none worth worrying|review (it|them|what|those) anyway|a plan too|is a plan|"
               r"(review|score|describe|guess|imagine|infer)[^.\n]{0,60}(anyway|instead|provisional|without (it|one|a )))")
    for n in AGENTS_ALL:
        pre = section(AG[n], r'^## Preconditions')
        why = []
        if not pre.strip(): why.append('no "## Preconditions" section')
        else:
            if not re.search(STOPS, pre, re.I): why.append('no stop clause')
            if not re.search(need[n], pre, re.I): why.append('does not name its input')
            if asserted(pre, LICENCE): why.append('licenses carrying on without the input')
        check('W2', f'{n} has Preconditions that stop on a missing input', not why, '; '.join(why))

if want('W3'):
    tbl = section(SKILL, r'^## Phases and gates')
    hdr = next((l for l in tbl.splitlines() if l.strip().startswith('|')), '')
    check('W3', 'SKILL.md has a "## Phases and gates" table', bool(tbl.strip()) and bool(hdr))
    check('W3', 'the table says needs / produces / lanes', all(w in hdr.lower() for w in ('needs', 'produces', 'lane')), hdr[:90])
    rows = [l for l in tbl.splitlines() if l.strip().startswith('|') and '---' not in l][1:]
    want_rows = ['intake', 'substance', 'script', 'gate 1', 'sound', 'art', 'assemble', 'gate 2', 'render', 'deliver']
    missing = [w for w in want_rows if not any(w in r.lower() for r in rows)]
    check('W3', 'every phase and both gates have a row', not missing, 'missing ' + ', '.join(missing))
    g1row = next((r for r in rows if 'gate 1' in r.lower()), '')
    check('W3', "Gate 1's row needs a saved script and does not let the art lanes run",
          bool(g1row) and 'script.md' in g1row.lower() and not re.search(r'art lane', g1row, re.I)
          and not re.search(r'nothing on disk|on the topic', g1row, re.I), g1row[:110])

if want('W4'):
    check('W4', 'references/build-lanes.md exists', bool(LANES.strip()))
    miss = [k for k, ok in {'one plate per agent': bool(re.search(r'one plate', LANES, re.I)),
                            'range sheet evidence': has(LANES, 'range sheet'),
                            'no engine edits': bool(re.search(r'(never|not|no)[^.\n]{0,40}engine\.js', LANES, re.I)),
                            'shared helpers file': has(LANES, 'helpers'),
                            'assembly by the main session': bool(re.search(r'assembl', LANES, re.I)),
                            'style drift': has(LANES, 'drift')}.items() if not ok]
    check('W4', 'build-lanes.md covers the lane contract', not miss, 'missing ' + ', '.join(miss))
    check('W4', 'the build step points to build-lanes.md', 'build-lanes.md' in WF)

if want('W5'):
    sh = wstep(r'--sheet 1')   # the phase that renders the shared set
    check('W5', 'one phase renders the shared qa/ set and says the reviewers reuse it',
          bool(sh) and has(sh, 'reuse') and has(sh, 'qa/') and has(sh, 'once') and not denied(sh, r'reuse'),
          'the assemble phase must render the set once and say the reviewers reuse it')
    revs = [n for n in ('film-reviewer', 'seam-reviewer', 'audio-reviewer')
            if not (re.search(r'(reuse|already (there|in `?qa)|already sitting)', AG[n], re.I)
                    and re.search(r'qa/', AG[n]))
            or denied(AG[n], r'\breuses? the shared')]
    check('W5', 'the three reviewers say they reuse it', not revs, ', '.join(revs))

if want('W6'):
    def narrows(text):
        """a clause that really narrows the re-run: 're-run only ...' not negated, and no 're-run everything' rule"""
        hits = [m for m in re.finditer(r're-?run only', text, re.I)
                if not re.search(r'(never|not|don.t|always)\W{0,12}$', text[max(0, m.start() - 24):m.start()], re.I)]
        # a rule that demands the whole gate again defeats the narrowing, unless it is being forbidden
        whole = asserted(text, r're-?run (everything|the full gate|the whole (gate|set)|every check|all (of )?the checks)'
                               r'|every check in the gate again')
        return bool(hits) and not whole
    check('W6', 'SKILL.md narrows the re-run to the affected checks', narrows(SKILL))
    capped = bool(re.search(r'(three rounds|after three (passes|rounds))', QA, re.I)) and not denied(QA, r'(three rounds|after three)')
    check('W6', 'doodle-qa narrows it the same way, and caps the loop',
          narrows(QA) and capped and not re.search(r'no cap on the rounds|as many passes as it takes', QA, re.I),
          'needs the narrowing and a bound on the loop')

if want('W7'):
    for n in ('doodle-plan', 'doodle-build', 'doodle-qa', 'doodle-render'):
        fm = frontmatter(os.path.join(PLUG, 'skills', n, 'SKILL.md'))
        check('W7', f'skills/{n}/SKILL.md is a user command', fm.get('name') == n and bool(fm.get('description'))
              and str(fm.get('disable-model-invocation')).lower() == 'true',
              f"name={fm.get('name')} disable-model-invocation={fm.get('disable-model-invocation')}")
    check('W7', 'SKILL.md names both commands', 'doodle-plan' in SKILL and 'doodle-build' in SKILL)

if want('W8'):
    bad = [n for n, d in AGD.items() if re.search(r'proactiv', d, re.I)]
    check('W8', 'no agent description invites proactive use', not bad, ', '.join(bad))
    miss = [n for n, d in AGD.items()
            if not re.search(r'invoked by [^.]{0,160}doodle-(plan|build|qa|render)[^.]{0,160}(never|not) on its own initiative', d, re.I)
            or re.search(r'(start|invoke) yourself|without being asked|the moment', d, re.I)]
    check('W8', 'each description says which command invokes it, and that it never self-starts', not miss, ', '.join(miss))

if want('W9'):
    tp = section(INTAKE, r'^## The plan card')
    miss = [k for k, ok in {
        'section': bool(tp.strip()),
        'says a model cannot run a clock': bool(re.search(r'(cannot|can.t|no) (run a clock|timer|way to)|cannot run a clock', tp, re.I)),
        'reply cannot arrive mid-turn': bool(re.search(r'(turn ends|mid-?turn|until your turn)', tp, re.I)),
        'the wait is bounded by work': bool(re.search(r'bound(ed)? by work|is the wait', tp, re.I)),
        'never stalls': bool(re.search(r'(never blocks|carry (straight )?on|without waiting)', tp, re.I)),
        'what stays editable': bool(re.search(r'(edit|chang|revis)', tp, re.I)),
    }.items() if not ok]
    check('W9', 'intake.md says how Gate 1 really behaves', not miss, 'missing ' + ', '.join(miss))
    clockish = re.search(r"(wait|waiting) (about )?\d+ minutes", tp, re.I)
    check('W9', 'intake.md does not tell the model to wait out a clock it cannot run',
          not clockish or bool(re.search(r'(harness|supervisor)[^.]{0,120}(pause|resume|wake)', tp, re.I)),
          'a wait of N minutes is only allowed as the harness-supported exception')
    check('W9', 'intake.md does not claim a reply can arrive mid-turn',
          not re.search(r'repl(y|ies)[^.]{0,60}(reaches|arrives)[^.]{0,20}(you )?mid-?turn', tp, re.I))
    g1 = next((m.group(1) for m in re.finditer(r'^Gate 1[.)] (.*?)(?=^(?:\d+|Gate \d+)[.)] |\Z)', WF, re.M | re.S)), '')
    check('W9', 'Gate 1 in SKILL.md matches, and says what may start while the card stands',
          bool(g1) and bool(re.search(r'(cannot run a clock|bounded by work|not by time)', g1, re.I))
          and bool(re.search(r'(while the card stands|during the wait|meanwhile)', g1, re.I)),
          'Gate 1 must say the wait is work-bounded and what may start')

FIX = os.path.join(HERE, 'fixtures')
STORIES = sorted(os.path.basename(p) for p in glob.glob(os.path.join(TK, 'story*.js')))
SOUND = read(os.path.join(REF, 'sound.md')) or ''
PRINC = read(os.path.join(REF, 'animation-principles.md')) or ''
NEW_SFX = ['crunch', 'creak', 'pump', 'relay', 'hiss', 'plop', 'slosh', 'shaker', 'clink', 'pour', 'foil', 'droplet',
           'pageFlip', 'pegSnap', 'roomTone', 'rain', 'wind', 'cityHum']
# v0.16.4: the ten instruments and six stingers (sound plan S1)
NEW_MUSIC = ['marimba', 'vibes', 'musicBox', 'kalimba', 'celesta', 'glock', 'epiano', 'pluck', 'feltPiano', 'strings',
             'motif', 'success', 'question', 'oops', 'reveal', 'resolve']

if want('V1'):
    check('V1', 'toolkit/legibility_check.mjs exists', os.path.isfile(os.path.join(TK, 'legibility_check.mjs')))
    for fx in ('story_clash.js', 'story_legmiss.js'):
        check('V1', f'fixture {fx} exists', os.path.isfile(os.path.join(FIX, fx)))
if want('V2'):
    fl = section(STYLE, r'^## (Text size|Legibility|Text floors)')
    check('V2', 'style.md states the text floors and why', bool(fl) and all(n in fl for n in ('28', '22', '18', '4.5')),
          'needs a Text size / Legibility section with 28, 22, 18 px and contrast 4.5')
    roles = [r for r in ("role: 'fact'", "role: 'label'", "role: 'hud'", "role: 'decor'") if r not in ENGINE]
    check('V2', 'engine components pass text roles', not roles, 'missing ' + ', '.join(roles))
    def body(fn):
        m = re.search(r'^function ' + fn + r'\b.*?(?=^function |^const [A-Z_]+ = |\Z)', ENGINE, re.M | re.S)
        b = m.group(0) if m else ''
        # a component may take its type from a shared preset (the Journey Log's LOG.lab etc.): count the preset in
        for name in set(re.findall(r'\.\.\.([A-Z]{2,})\.', b)):
            pm = re.search(r'^const ' + name + r' = \{.*?$', ENGINE, re.M)
            if pm: b += pm.group(0)
        return b
    # the components that carry the story, and the role each must give its text
    want_roles = {'callout': 'fact', 'stat': 'fact', 'journeyLog': 'hud', 'stageDial': 'hud',
                  'frameCounter': 'decor', 'plateHeader': 'decor', 'lineChart': 'label'}
    wrong = [f'{fn} ({r})' for fn, r in want_roles.items() if f"role: '{r}'" not in body(fn)]
    check('V2', 'each story component gives its text the right role', not wrong, 'missing ' + ', '.join(wrong))
if want('V3'):
    lay = section(STYLE, r'^## Layout: bands and clearances')
    check('V3', 'style.md has "## Layout: bands and clearances"', bool(lay.strip()))
    check('V3', 'layout guidance covers bands, cards, allowed overlap and fixes',
          bool(lay) and all(re.search(p, lay, re.I) for p in (r'header band', r'journey log', r'(card|halo)', r'overlap', r're-?sequence')))
if want('V4'):
    st = section(WRITING, r'^## A story, not a tour of the source')
    check('V4', 'writing.md has "## A story, not a tour of the source"', bool(st.strip()))
    check('V4', 'it covers identity, want, obstacle, change and sections-as-obstacles',
          bool(st) and all(re.search(p, st, re.I) for p in (r'identity', r'want', r'(obstacle|stands in)', r'chang', r'(section|chapter)')))
    sr = read(os.path.join(PLUG, 'agents', 'script-reviewer.md')) or ''
    check('V4', 'script-reviewer checks for a tour of the document and hero drift',
          bool(re.search(r'tour of the (document|source|paper)', sr, re.I)) and bool(re.search(r'identity', sr, re.I)))
if want('V5'):
    ch = section(PRINC, r'^## Things that are acted on change')
    check('V5', 'animation-principles.md has "## Things that are acted on change"', bool(ch.strip()))
    check('V5', 'the scene-script format has a Changes column', bool(re.search(r'^\|[^\n]*\| Changes \|', WRITING, re.M)))
    fr = read(os.path.join(PLUG, 'agents', 'film-reviewer.md')) or ''
    check('V5', 'film-reviewer fails a key object that stays static', bool(re.search(r'(static|does not change|never changes)', fr, re.I)) and 'acted on' in fr.lower())
if want('V6'):
    sfx = section(ENGINE, r'^/\* =+ *SOUND') or ENGINE
    miss = [n for n in NEW_SFX if not re.search(r'\b' + n + r'\s*[:(=]', ENGINE)]
    check('V6', 'engine defines the new sounds', not miss, 'missing ' + ', '.join(miss))
    miss = [n for n in NEW_SFX if f'`{n}`' not in SOUND]
    check('V6', 'sound.md documents every new sound', not miss, 'missing ' + ', '.join(miss))
    check('V6', 'sound.md states the event rule and the climax lift',
          bool(re.search(r'different (kinds of )?events?[^.]{0,60}different sounds', SOUND, re.I)) and bool(re.search(r'climax', SOUND, re.I)))
    miss = [n for n in NEW_MUSIC if not re.search(r'^  ' + n + r'\(ac, out, t, o = \{\}\)', ENGINE, re.M) or f'`{n}' not in SOUND]
    check('V6', 'the instruments and stingers are in the engine and sound.md', not miss, 'missing ' + ', '.join(miss))
    vm = re.search(r'const VARIED = new Set\(\[(.*?)\]\)', ENGINE, re.S)
    miss = [n for n in NEW_MUSIC if not vm or f"'{n}'" not in vm.group(1)]
    check('V6', 'the instruments and stingers are listed in VARIED', not miss, 'missing ' + ', '.join(miss))
    check('V6', 'plates can cue them by name', 'Object.assign(SFX, INST, STING)' in ENGINE)
    check('V6', 'toolkit/cue_check.mjs exists', os.path.isfile(os.path.join(TK, 'cue_check.mjs')))
    check('V6', 'fixture story_monotone.js exists', os.path.isfile(os.path.join(FIX, 'story_monotone.js')))
    check('V6', 'variation is not seeded by call order', 'AUDIO.n++' not in ENGINE and bool(re.search(r'const sfxRng[\s\S]{0,400}AUDIO\.plate', ENGINE)))
    audio = [p for p in glob.glob(os.path.join(PLUG, '**', '*'), recursive=True) if p.lower().endswith(('.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac'))]
    check('V6', 'the plugin still ships no audio files', not audio, ', '.join(os.path.relpath(a, PLUG) for a in audio[:5]))
if want('V7'):
    fmt = {n: read(p) or '' for n, p in (('build-lanes', os.path.join(REF, 'build-lanes.md')),
                                          ('film-reviewer', os.path.join(PLUG, 'agents', 'film-reviewer.md')),
                                          ('seam-reviewer', os.path.join(PLUG, 'agents', 'seam-reviewer.md')))}
    miss = [n for n, t in fmt.items() if not (re.search(r'scene verdict', t, re.I) and all(w in t.lower() for w in ('evidence', 'reason', 'fix')))]
    check('V7', 'one scene-verdict format in the lanes and both reviewers', not miss, ', '.join(miss))
    check('V7', 'a small fix is re-checked on its own chunk', all(re.search(r'(its own chunk|only that (scene|plate|chunk))', t, re.I) for t in fmt.values()))
if want('V8'):
    check('V8', 'toolkit/story_check.mjs exists', os.path.isfile(os.path.join(TK, 'story_check.mjs')))
    for fx in ('story_drift.js', 'story_drift2.js'):
        check('V8', f'fixture {fx} exists', os.path.isfile(os.path.join(FIX, fx)))

if want('P1'):
    RENDER = read(os.path.join(TK, 'render.mjs')) or ''
    check('P1', 'render.mjs defaults to one worker per core, at most 8',
          'availableParallelism' in RENDER and bool(re.search(r'Math\.min\(8,\s*cores\)', RENDER)))
    check('P1', 'render.mjs encodes with the medium preset by default', "opt('preset', 'medium')" in RENDER)
    check('P1', 'render.mjs spreads the QA sets over several pages', bool(re.search(r'async function grabAll[\s\S]{0,400}openPage', RENDER)))
    DR = read(os.path.join(PLUG, 'skills', 'doodle-render', 'SKILL.md')) or ''
    check('P1', 'doodle-render does not hold cores back from the render', not re.search(r'\bn\s*-\s*2\b|cores?\s+minus', DR, re.I))
    for tool in ('text_check.mjs', 'legibility_check.mjs'):
        check('P1', f'{tool} takes --workers', "opt('workers'" in (read(os.path.join(TK, tool)) or ''))
    check('P1', 'text_check throws the drawing away instead of reading a pixel',
          bool(re.search(r'__tcFrame[^\n]*renderFrame\(f\);[^\n]*reset\(\)', read(os.path.join(TK, 'text_check.mjs')) or '')))
    check('P1', 'renderFrame starts every frame on plain paper', bool(re.search(r'function renderFrame\([\s\S]{0,1500}?fillRect\(0, 0, W, H\)', ENGINE)))

if want('REL'):
    pj = json.loads(read(os.path.join(PLUG, '.claude-plugin', 'plugin.json')) or '{}')
    mj = json.loads(read(os.path.join(REPO, '.claude-plugin', 'marketplace.json')) or '{}')
    mv = next((p.get('version') for p in mj.get('plugins', []) if p.get('name') == 'doodle-art-animation'), None)
    check('REL', 'plugin.json version 0.16.4', pj.get('version') == '0.16.4', str(pj.get('version')))
    check('REL', 'marketplace entry version 0.16.4', mv == '0.16.4', str(mv))

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
            # every bundled story, not just the two examples: a shipped film that snaps is read as exemplary
            bundled = sorted(os.path.basename(p) for p in glob.glob(os.path.join(TK, 'story*.js')))
            check('L3', 'bundled stories found to speed-check', len(bundled) >= 7, f'found {bundled}')
            for story in bundled:
                h = build(story)
                rc, out = run(['node', 'speed_check.mjs', h], cwd=work) if h else (9, 'build failed')
                check('L3', f'speed_check passes {story}', rc == 0 and 'SNAP' not in out, out[-300:])
            h = build('story_snap.js')
            if not h: check('L3', 'snap fixture builds', False, 'tests/doodle-art-animation/fixtures/story_snap.js missing or broken')
            else:
                rc, out = run(['node', 'speed_check.mjs', h], cwd=work)
                check('L3', 'speed_check fails the snap fixture with SNAP', rc == 1 and 'SNAP' in out, f'rc={rc} {out[-300:]}')

    def gate(item, tool, fixtures=(), word=None):
        """a tool must pass every bundled story, and fail every one of its fixtures"""
        if not os.path.isfile(os.path.join(work, tool)):
            skip(item, f'{tool} runs', f'{tool} missing'); return
        bundled = sorted(os.path.basename(p) for p in glob.glob(os.path.join(TK, 'story*.js')))
        for story in bundled:
            h = build(story)
            rc, out = run(['node', tool, h], cwd=work, timeout=3600) if h else (9, 'build failed')
            check(item, f'{tool} passes {story}', rc == 0, out[-400:])
        for fixture in fixtures:
            h = build(fixture)
            if not h: check(item, f'{fixture} builds', False, f'tests/doodle-art-animation/fixtures/{fixture} missing or broken')
            else:
                rc, out = run(['node', tool, h], cwd=work, timeout=3600)
                check(item, f'{tool} fails {fixture}', rc == 1 and (not word or word in out), f'rc={rc} {out[-300:]}')
    # story_legmiss / story_drift2: the v0.15 final review's probes (faint ink, half a line on a block, halos in
    # hatching, glyph-by-glyph text, a gradient fill; clocks, hero labels, headers and stages that drift);
    # story_monotone: one sound over and over
    if want('V1'): gate('V1', 'legibility_check.mjs', ('story_clash.js', 'story_legmiss.js'), 'CLASH')
    if want('V6'): gate('V6', 'cue_check.mjs', ('story_monotone.js',), 'FAIL    dominant')
    if want('V8'): gate('V8', 'story_check.mjs', ('story_drift.js', 'story_drift2.js'))

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
            # 'SNAP' absent only counts when motion_check actually measured the film
            measured = rc2 == 0 and re.search(r'^drawings \d+\s+median', out, re.M)
            check('L2', 'no SNAP in the whole film', bool(measured) and 'SNAP' not in out,
                  (f'motion_check did not measure the film (rc={rc2}): {out[-200:]}' if not measured
                   else str([l for l in out.splitlines() if 'spikes' in l][:1])))
        else:
            # without a render or the plate start times these three checks cannot run:
            # fail them loudly rather than let L1 and L2's medians vanish from the report
            why = f'render rc={rc}, {len(starts)} plate starts from the page probe'
            check('L2', 'title plate median >= 1.2', False, why)
            check('L1', 'end card median >= 1.2', False, why)
            check('L2', 'no SNAP in the whole film', False, why)
        rc, out = run(['node', 'text_check.mjs', ex], cwd=work)
        check('L2', 'text_check CLEAN on story_example', rc == 0 and 'CLEAN' in out, out[-300:])

    if want('P1'):
        # render.mjs, text_check and legibility_check spread frames over pages, so a frame's pixels must not depend on
        # what the same page drew before it. Every third drawing of every transition, drawn after frame 0 and after its
        # own neighbour: at most 1 level apart (Chromium's own rounding; the pan seam that leaked was 4-5 levels).
        # Each frame is read back before the next, as every tool does: two frames queued with no read in between can
        # differ by a few levels, which no tool ever does (references/render.md, "Timing your own code").
        ORDER = """const s = window.__story, g = document.querySelector('canvas').getContext('2d'), bad = [];
          const grab = () => g.getImageData(0, 0, s.width, s.height).data, draw = f => { window.__renderFrame(f); g.getImageData(0, 0, 1, 1); };
          for (const st of s.starts.slice(1)) { const f0 = Math.round(st.t * s.fps), f1 = Math.min(s.frames - 1, Math.round((st.t + (st.dur || 0)) * s.fps));
            for (let f = f0; f <= f1; f += 3) { draw(0); draw(f); const a = grab().slice();
              draw(f > 0 ? f - 1 : f + 1); draw(f); const b = grab();
              let m = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > m) m = d; }
              if (m > 1) bad.push([f, m]); } }
          return bad;"""
        for story in ('story_one_drop.js', 'story_example.js', 'story_reel.js'):
            h = build(story)
            r = probe(h, ORDER) if h else {'result': None, 'errors': ['build failed']}
            check('P1', f'{story}: transition frames do not depend on the frame drawn before',
                  r.get('result') == [] and not r.get('errors'), f"frame, max level difference: {r.get('result')} {'; '.join(r.get('errors') or [])[:200]}")

    if want('REL'):
        cmd = ['python3', os.path.join(TK, 'smoke_test.py'), '--work', os.path.join(work, 'smoke'), '--no-video']
        if nm: cmd += ['--node-modules', nm]
        rc, out = run(cmd, timeout=3600)
        check('REL', 'smoke_test passes every bundled story', rc == 0, out[-500:])
        check('REL', 'smoke_test covered story_brushes.js', 'story_brushes' in out)

# ---------------------------------------------------------------- report
order = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17',
         'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9',
         'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'P1', 'REL']
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
