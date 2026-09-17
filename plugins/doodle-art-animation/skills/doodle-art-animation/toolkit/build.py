import sys, re, os, glob
# usage: python3 build.py story.js film.html  -> one self-contained HTML: engine, then kits/*.js (if present), then the story
here = os.path.dirname(os.path.abspath(__file__)); rd = lambda p: open(p, encoding='utf-8').read()
story, out = rd(sys.argv[1]), sys.argv[2]
kits = sorted(glob.glob(os.path.join(here, 'kits', '*.js')))
title = re.search(r"defineStory\(\{\s*title:\s*'([^']+)'", story).group(1)
shell = rd(os.path.join(here, 'shell.html'))
if '__KITS__' not in shell: shell = shell.replace('__STORY__', '__KITS__\n__STORY__')   # an older shell.html
parts = {'__TITLE__': title, '__ENGINE__': rd(os.path.join(here, 'engine.js')), '__KITS__': '\n'.join(rd(p) for p in kits), '__STORY__': story}
html = re.sub('|'.join(parts), lambda m: parts[m.group(0)], shell)   # one pass, so inserted code is never re-scanned
open(out, 'w', encoding='utf-8').write(html); print(out, len(html) // 1024, 'KB,', len(kits), 'kit files')
