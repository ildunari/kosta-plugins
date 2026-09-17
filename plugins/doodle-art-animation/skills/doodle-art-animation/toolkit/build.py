import sys, re, os, base64
argv = sys.argv[1:]; args = [a for i, a in enumerate(argv) if not a.startswith('--') and not (i and argv[i - 1] == '--fonts')]
opt = lambda k: argv[argv.index(k) + 1] if k in argv else None
eng = open('engine.js').read(); story = open(args[0]).read(); out = args[1]
title = re.search(r"defineStory\(\{\s*title:\s*'([^']+)'", story).group(1)
shell = open('shell.html').read()

def local_fonts(nm):
    """--fonts local | <node_modules dir>: embed @fontsource woff2 files (latin + latin-ext) as base64 @font-face rules,
    so the film needs no network. npm i @fontsource-variable/fraunces @fontsource/inter-tight @fontsource/ibm-plex-mono
    (@fontsource/fraunces works too, as static 400/500/600 faces)."""
    nm = 'node_modules' if nm == 'local' else nm
    var = os.path.join(nm, '@fontsource-variable/fraunces')
    sheets = [(var, 'opsz.css'), (var, 'opsz-italic.css')] if os.path.isdir(var) else \
        [(os.path.join(nm, '@fontsource/fraunces'), f) for f in ('400.css', '500.css', '600.css', '400-italic.css')]
    sheets += [(os.path.join(nm, '@fontsource', p), f) for p in ('inter-tight', 'ibm-plex-mono') for f in ('400.css', '600.css')]
    rules = []
    for d, f in sheets:
        if not os.path.exists(os.path.join(d, f)): sys.exit(f'--fonts local: {os.path.join(d, f)} not found (npm i the @fontsource packages here, or pass --fonts <node_modules dir>)')
        for rule in re.findall(r'@font-face\s*\{[^}]*\}', open(os.path.join(d, f)).read()):
            src = re.search(r"url\(\./files/([^)]+?latin(?:-ext)?-[^)]+?\.woff2)\)", rule)
            if not src: continue                                # other subsets (cyrillic, greek, vietnamese) are left out
            data = base64.b64encode(open(os.path.join(d, 'files', src.group(1)), 'rb').read()).decode()
            rule = re.sub(r'src:[^;]+;', f"src: url(data:font/woff2;base64,{data}) format('woff2');", rule)
            rules.append(rule.replace("'Fraunces Variable'", "'Fraunces'").replace('font-display: swap', 'font-display: block'))
    return '<style>\n' + '\n'.join(rules) + '\n</style>'

fonts = opt('--fonts')
if fonts and fonts != 'google':
    shell = re.sub(r'<!--fonts-->.*?<!--/fonts-->', lambda m: local_fonts(fonts), shell, flags=re.S)
html = shell.replace('__TITLE__', title).replace('__ENGINE__', eng).replace('__STORY__', story)
open(out, 'w').write(html); print(out, len(html)//1024, 'KB', '(fonts embedded)' if fonts and fonts != 'google' else '')
