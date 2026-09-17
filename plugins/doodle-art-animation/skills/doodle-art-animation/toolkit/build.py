import sys, re, os, glob, base64
# usage: python3 build.py story.js film.html [--fonts google|local|<node_modules dir>]
# -> one self-contained HTML: engine, then kit files, then the story.
# Kits: kits/_*.js (shared helpers) always, plus each kits/<name>.js the story calls as KIT.<name>. If the story refers
# to KIT in a way that can't be read (KIT[...], passing KIT around, an unknown name), every kit is included.

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

fonts, args = parse_fonts_arg(sys.argv[1:])
if len(args) < 2: sys.exit('usage: python3 build.py story.js film.html [--fonts google|local|<node_modules dir>]')
here = os.path.dirname(os.path.abspath(__file__)); rd = lambda p: open(p, encoding='utf-8').read()
story, out = rd(args[0]), args[1]
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
parts = {'__TITLE__': m.group(1), '__ENGINE__': rd(os.path.join(here, 'engine.js')), '__KITS__': '\n'.join(rd(p) for p in pick), '__STORY__': story}
html = re.sub('|'.join(parts), lambda mm: parts[mm.group(0)], shell)   # one pass, so inserted code is never re-scanned
open(out, 'w', encoding='utf-8').write(html)
names = [os.path.basename(p)[:-3] for p in pick if p not in base]
print(out, len(html) // 1024, 'KB, kits:', ('all' if ambiguous and kits else ', '.join(names) or 'none'),
      '(fonts embedded)' if fonts and fonts != 'google' else '')
