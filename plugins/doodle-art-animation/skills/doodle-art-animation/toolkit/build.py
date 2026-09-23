import sys, re, os, glob, base64, json, hashlib, shutil, subprocess
# usage: python3 build.py story.js film.html [--fonts google|local|<node_modules dir>] [--voice vo/voice.json|none] [--animatic]
# -> one self-contained HTML: narration (if any), engine, then kit files, then the story.
# Kits: kits/_*.js (shared helpers) always, plus each kits/<name>.js the story calls as KIT.<name>. If the story refers
# to KIT in a way that can't be read (KIT[...], passing KIT around, an unknown name), every kit is included.
# Papers: grounds/_*.js always, plus each grounds/<file>.js that defines a paper or paper set the story names
# (paper: 'blueprint'), with the files that define that set's two papers. A paper named by a variable
# (paper: pick) includes every paper file. The notebook's two papers are in engine.js.

# ---- fonts option (self-contained: parse_fonts_arg, local_fonts, and one substitution on the shell text) ----
def parse_fonts_arg(argv):
    """Pull --fonts VALUE / --fonts=VALUE out of argv. Returns (value or None, remaining args)."""
    rest, fonts, i = [], None, 0
    while i < len(argv):
        a = argv[i]
        if a.startswith('--fonts='): fonts = a.split('=', 1)[1]
        elif a == '--fonts':
            if i + 1 >= len(argv) or argv[i + 1].startswith('--'):
                sys.exit('usage: python3 build.py story.js film.html [--fonts google|local|<node_modules dir>]')
            fonts = argv[i + 1]; i += 1
        else: rest.append(a)
        i += 1
    if fonts == '': sys.exit('--fonts needs a value: google, local, or a node_modules directory')
    return fonts, rest

def local_fonts(nm):
    """--fonts local | <node_modules dir>: embed @fontsource woff2 files (latin + latin-ext) as base64 @font-face rules,
    so the film needs no network. `local` means ./node_modules in the current (film) folder. Install:
      npm i @fontsource-variable/fraunces @fontsource/inter-tight @fontsource/ibm-plex-mono
    Prefer @fontsource-variable/fraunces: it has the optical-size (opsz) axis, like the Google version, and renders
    identically. Static @fontsource/fraunces (400/500/600) also works but lacks opsz, so display type looks different."""
    nm = os.path.join(os.getcwd(), 'node_modules') if nm == 'local' else os.path.abspath(nm)
    var = os.path.join(nm, '@fontsource-variable', 'fraunces')
    if os.path.isdir(var): sheets = [(var, 'opsz.css'), (var, 'opsz-italic.css')]
    else:
        print('--fonts: @fontsource-variable/fraunces not found, using static @fontsource/fraunces (no opsz axis: display type will differ)', file=sys.stderr)
        sheets = [(os.path.join(nm, '@fontsource', 'fraunces'), f) for f in ('400.css', '500.css', '600.css', '400-italic.css')]
    sheets += [(os.path.join(nm, '@fontsource', p), f) for p in ('inter-tight', 'ibm-plex-mono') for f in ('400.css', '600.css')]
    rules = []
    for d, f in sheets:
        if not os.path.exists(os.path.join(d, f)):
            sys.exit(f'--fonts: {os.path.join(d, f)} not found (run npm i @fontsource-variable/fraunces @fontsource/inter-tight '
                     '@fontsource/ibm-plex-mono in the film folder, or pass --fonts <node_modules dir>)')
        for rule in re.findall(r'@font-face\s*\{[^}]*\}', open(os.path.join(d, f), encoding='utf-8').read()):
            src = re.search(r"url\(\./files/([^)]+?latin(?:-ext)?-[^)]+?\.woff2)\)", rule)
            if not src: continue                                # other subsets (cyrillic, greek, vietnamese) are left out
            with open(os.path.join(d, 'files', src.group(1)), 'rb') as fh: data = base64.b64encode(fh.read()).decode()
            rule = re.sub(r'src:[^;]+;', f"src: url(data:font/woff2;base64,{data}) format('woff2');", rule)
            rules.append(rule.replace("'Fraunces Variable'", "'Fraunces'").replace('font-display: swap', 'font-display: block'))
    return '<style>\n' + '\n'.join(rules) + '\n</style>'

def apply_fonts(shell, fonts):
    """Replace the <!--fonts-->…<!--/fonts--> block in shell.html (the Google link) with embedded faces."""
    if not fonts or fonts == 'google': return shell
    return re.sub(r'<!--fonts-->.*?<!--/fonts-->', lambda m: local_fonts(fonts), shell, flags=re.S)
# ---- end fonts option ----

# ---- narration (--voice): embed the clips of vo/voice.json, so the film plays, renders and is checked with its voice ----
USAGE = 'usage: python3 build.py story.js film.html [--fonts google|local|<node_modules dir>] [--voice vo/voice.json|none] [--animatic]'
def pop_opt(argv, name, flag=False):
    """Pull --name VALUE / --name=VALUE (or a bare --name when flag) out of argv. Returns (value or None, rest)."""
    rest, val, i = [], None, 0
    while i < len(argv):
        a = argv[i]
        if a.startswith(name + '='): val = a.split('=', 1)[1]
        elif a == name:
            if flag: val = True
            elif i + 1 >= len(argv) or argv[i + 1].startswith('--'): sys.exit(f'{name} needs a value\n{USAGE}')
            else: val = argv[i + 1]; i += 1
        else: rest.append(a)
        i += 1
    return val, rest

KBPS = 64    # Opus, mono: transparent for speech, about 0.5 MB per minute of narration

def clip_bytes(src, cache):
    """A clip as Opus in Ogg (transcoded with ffmpeg once, then cached by content), or the file itself when it is
    already Opus or ffmpeg is missing. Returns (bytes, mime)."""
    raw = open(src, 'rb').read()
    if raw[:4] == b'OggS' and b'OpusHead' in raw[:64]: return raw, 'audio/ogg'
    if not shutil.which('ffmpeg'):
        print(f'--voice: ffmpeg not found, embedding {os.path.basename(src)} uncompressed (install ffmpeg for Opus)', file=sys.stderr)
        return raw, 'audio/wav' if raw[:4] == b'RIFF' else 'application/octet-stream'
    key = hashlib.sha1(raw + str(KBPS).encode()).hexdigest()[:16]
    out = os.path.join(cache, key + '.ogg')
    if not os.path.isfile(out):
        os.makedirs(cache, exist_ok=True)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '48000', '-c:a', 'libopus',
                            '-b:a', f'{KBPS}k', '-application', 'voip', out + '.part.ogg'], capture_output=True, text=True)
        if r.returncode: sys.exit(f'--voice: ffmpeg could not read {src}:\n{r.stderr[-400:]}')
        os.replace(out + '.part.ogg', out)
    return open(out, 'rb').read(), 'audio/ogg'

def voice_script(path):
    """window.__VOICE_DATA: voice.json with each unit's clip embedded as base64 Opus. Clip paths are relative to the
    film folder (the folder holding vo/), else to voice.json's own folder."""
    try: data = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError) as e: sys.exit(f'--voice: cannot read {path}: {e}')
    vdir = os.path.dirname(os.path.abspath(path))
    film = os.path.dirname(vdir) if os.path.basename(vdir) == 'vo' else vdir
    units, secs, size = [], 0.0, 0
    for u in data.get('units', []):
        if 'id' not in u or 'file' not in u: sys.exit(f'--voice: every unit in {path} needs an "id" and a "file" (got {sorted(u)})')
        src = next((c for c in (os.path.join(film, u['file']), os.path.join(vdir, u['file']), u['file']) if os.path.isfile(c)), None)
        if not src: sys.exit(f'--voice: clip {u["file"]} for {u["id"]} not found (looked in {film} and {vdir})')
        audio, mime = clip_bytes(src, os.path.join(vdir, '.opus'))
        keep = {k: u[k] for k in ('id', 'plate', 'dur', 'sentences', 'marks', 'text', 'timing', 'lufs', 'lead', 'tail') if k in u}
        units.append({**keep, 'mime': mime, 'audio': base64.b64encode(audio).decode()})
        secs += float(u.get('dur') or 0); size += len(audio)
    head = {k: data[k] for k in ('version', 'provider', 'model', 'voice', 'style') if k in data}
    js = 'window.__VOICE_DATA = ' + json.dumps({**head, 'units': units}, ensure_ascii=False).replace('</', '<\\/') + ';'
    return js, f'voice: {len(units)} clips, {secs:.1f} s ({size // 1024} KB)'
# ---- end narration ----

fonts, args = parse_fonts_arg(sys.argv[1:])
voice, args = pop_opt(args, '--voice')
animatic, args = pop_opt(args, '--animatic', flag=True)
if len(args) < 2: sys.exit(USAGE)
here = os.path.dirname(os.path.abspath(__file__)); rd = lambda p: open(p, encoding='utf-8').read()
story, out = rd(args[0]), args[1]
# a story whose plates say vo: '...' picks up vo/voice.json next to it on its own; --voice none builds without narration
auto = os.path.join(os.path.dirname(os.path.abspath(args[0])), 'vo', 'voice.json')
if voice is None and re.search(r'\bvo\s*:', story) and os.path.isfile(auto): voice = auto
vjs, vnote = voice_script(voice) if voice and voice != 'none' else ('', '')
if animatic: vjs += '\nwindow.__ANIMATIC = true;'
files = sorted(glob.glob(os.path.join(here, 'kits', '*.js')))
base = [p for p in files if os.path.basename(p).startswith('_')]
kits = {os.path.basename(p)[:-3]: p for p in files if p not in base}
used = set(re.findall(r'\bKIT\.(\w+)', story))
if used and not kits:
    sys.exit(f'build.py: {args[0]} uses KIT.{sorted(used)[0]} but no kit files were found in {os.path.join(here, "kits")}.\n'
             '  Copy the whole toolkit into the working folder: cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .')
helpers = set(re.findall(r'\bKIT\.(\w+)\s*=', ''.join(rd(p) for p in base)))
ambiguous = bool(re.search(r'\bKIT\b(?!\s*\.\s*\w)', story)) or bool(used - helpers - set(kits))
pick = files if ambiguous else base + [kits[k] for k in sorted(used & set(kits))] if used else []
m = re.search(r"defineStory\(\{\s*title:\s*'([^']+)'", story)
if not m: sys.exit(f"build.py: {args[0]} has no defineStory({{ title: '...' }})")
shell = apply_fonts(rd(os.path.join(here, 'shell.html')), fonts)
if '__KITS__' not in shell: shell = shell.replace('__STORY__', '__KITS__\n__STORY__')   # an older shell.html
engine = rd(os.path.join(here, 'engine.js'))

def papers(story, engine):
    """The grounds/*.js files this story needs, and the paper names it asks for that nothing defines."""
    gfiles = sorted(glob.glob(os.path.join(here, 'grounds', '*.js')))
    gbase = [p for p in gfiles if os.path.basename(p).startswith('_')]
    where, members = {}, {}                       # paper or set name -> file; set name -> its two paper names
    for p in gfiles:
        src = rd(p)
        for n in re.findall(r"\bdefineGround\(\s*['\"](\w+)['\"]", src): where[n] = p
        for n, body in re.findall(r"\bdefinePaperSet\(\s*['\"](\w+)['\"]\s*,\s*\{([^}]*)\}", src):
            where[n] = p; members[n] = re.findall(r"\b(?:light|dark)\s*:\s*['\"](\w+)['\"]", body)
    known = set(re.findall(r"\bdefine(?:Ground|PaperSet)\(\s*['\"](\w+)['\"]", engine + story))   # the notebook, or the story's own
    named = re.findall(r"\bpaper\s*:\s*(?:['\"](\w+)['\"]|([A-Za-z_$][\w$.]*))", story)
    if any(var and not var.startswith('PAL.') for _, var in named): return gbase + [p for p in gfiles if p not in gbase], []
    need, todo, unknown = set(), [n for n, _ in named], []
    while todo:
        n = todo.pop()
        if n in where:
            if where[n] not in need: need.add(where[n])
            todo += [k for k in members.get(n, []) if k not in known and where.get(k) not in need]
        elif n not in known and n not in unknown: unknown.append(n)
    return gbase + sorted(need - set(gbase)), unknown

gpick, unknown = papers(story, engine)
for n in unknown:
    print(f"build.py: warning: paper '{n}' is not defined in engine.js, toolkit/grounds/ or the story; the film will stop at boot",
          file=sys.stderr)
if '__VOICE__' not in shell: shell = shell.replace('__ENGINE__', '__VOICE__\n__ENGINE__')
parts = {'__TITLE__': m.group(1), '__VOICE__': vjs, '__ENGINE__': engine, '__KITS__': '\n'.join(rd(p) for p in pick + gpick), '__STORY__': story}
html = re.sub('|'.join(parts), lambda mm: parts[mm.group(0)], shell)   # one pass, so inserted code is never re-scanned
open(out, 'w', encoding='utf-8').write(html)
names = [os.path.basename(p)[:-3] for p in pick if p not in base]
gnames = [os.path.basename(p)[:-3] for p in gpick if not os.path.basename(p).startswith('_')]
print(out, len(html) // 1024, 'KB, kits:', ('all' if ambiguous and kits else ', '.join(names) or 'none'),
      *(['papers:', ', '.join(gnames)] if gnames else []), '(fonts embedded)' if fonts and fonts != 'google' else '',
      ('· ' + vnote) if vnote else '', '· animatic' if animatic else '')
