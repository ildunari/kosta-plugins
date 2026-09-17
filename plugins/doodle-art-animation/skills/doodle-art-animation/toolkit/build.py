import sys, re, os, glob
# usage: python3 build.py story.js film.html  -> one self-contained HTML: engine, then kit files, then the story.
# Kits: kits/_*.js (shared helpers) always, plus each kits/<name>.js the story calls as KIT.<name>. If the story refers
# to KIT in a way that can't be read (KIT[...], passing KIT around, an unknown name), every kit is included.
here = os.path.dirname(os.path.abspath(__file__)); rd = lambda p: open(p, encoding='utf-8').read()
story, out = rd(sys.argv[1]), sys.argv[2]
files = sorted(glob.glob(os.path.join(here, 'kits', '*.js')))
base = [p for p in files if os.path.basename(p).startswith('_')]
kits = {os.path.basename(p)[:-3]: p for p in files if p not in base}
used = set(re.findall(r'\bKIT\.(\w+)', story))
if used and not kits:
    sys.exit(f'build.py: {sys.argv[1]} uses KIT.{sorted(used)[0]} but no kit files were found in {os.path.join(here, "kits")}.\n'
             '  Copy the whole toolkit into the working folder: cp -R "${CLAUDE_SKILL_DIR}"/toolkit/. .')
helpers = set(re.findall(r'\bKIT\.(\w+)\s*=', ''.join(rd(p) for p in base)))
ambiguous = bool(re.search(r'\bKIT\b(?!\s*\.\s*\w)', story)) or bool(used - helpers - set(kits))
pick = files if ambiguous else base + [kits[k] for k in sorted(used & set(kits))] if used else []
title = re.search(r"defineStory\(\{\s*title:\s*'([^']+)'", story).group(1)
shell = rd(os.path.join(here, 'shell.html'))
if '__KITS__' not in shell: shell = shell.replace('__STORY__', '__KITS__\n__STORY__')   # an older shell.html
parts = {'__TITLE__': title, '__ENGINE__': rd(os.path.join(here, 'engine.js')), '__KITS__': '\n'.join(rd(p) for p in pick), '__STORY__': story}
html = re.sub('|'.join(parts), lambda m: parts[m.group(0)], shell)   # one pass, so inserted code is never re-scanned
open(out, 'w', encoding='utf-8').write(html)
names = [os.path.basename(p)[:-3] for p in pick if p not in base]
print(out, len(html) // 1024, 'KB, kits:', ('all' if ambiguous and kits else ', '.join(names) or 'none'))
