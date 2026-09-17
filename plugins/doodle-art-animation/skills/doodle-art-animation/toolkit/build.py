import sys, re
eng = open('engine.js').read(); story = open(sys.argv[1]).read(); out = sys.argv[2]
title = re.search(r"defineStory\(\{\s*title:\s*'([^']+)'", story).group(1)
html = open('shell.html').read().replace('__TITLE__', title).replace('__ENGINE__', eng).replace('__STORY__', story)
open(out, 'w').write(html); print(out, len(html)//1024, 'KB')
