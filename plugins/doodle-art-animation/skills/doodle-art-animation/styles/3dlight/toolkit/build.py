"""Build one self-contained 3DLight film page.

usage: python3 build.py story.js film.html [--fonts local|google|<node_modules dir>]

Inlines core.js, l3d.js, beats.js, the shared sound library sfxlib.js (when the toolkit has a copy), sound/engine.js,
sound/score.js and the story into shell.html, so film.html needs nothing else (render.mjs draws its frames,
sound/render_sound.mjs renders its sound).

Fonts (the style uses one face, Sora):
  --fonts local       embed @fontsource-variable/sora (latin + latin-ext woff2, with their unicode ranges) as data URLs,
                      from ./node_modules, the story's folder or the toolkit folder (npm i in the film folder installs
                      it from package.json). The film then plays and renders offline. This is the default when found.
  --fonts <dir>       the same, from that node_modules directory
  --fonts google      link Sora from Google Fonts instead (needs the network at render time; the Google build of Sora
                      may differ slightly from the npm one, so do not mix the two within one film's renders)
"""
import sys, os, re, base64

USAGE = 'usage: python3 build.py story.js film.html [--fonts local|google|<node_modules dir>]'
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(p, encoding='utf-8').read()

def pop_opt(argv, name):
    rest, val, i = [], None, 0
    while i < len(argv):
        a = argv[i]
        if a.startswith(name + '='): val = a.split('=', 1)[1]
        elif a == name:
            if i + 1 >= len(argv) or argv[i + 1].startswith('--'): sys.exit(f'{name} needs a value\n{USAGE}')
            val = argv[i + 1]; i += 1
        else: rest.append(a)
        i += 1
    return val, rest

SORA = os.path.join('@fontsource-variable', 'sora')

def find_node_modules(story):
    for d in (os.getcwd(), os.path.dirname(os.path.abspath(story)), here):
        nm = os.path.join(d, 'node_modules')
        if os.path.isfile(os.path.join(nm, SORA, 'wght.css')): return nm
    return None

def local_fonts(nm):
    css = os.path.join(nm, SORA, 'wght.css')
    if not os.path.isfile(css):
        sys.exit(f'--fonts: {css} not found. Run `npm i` in the film folder (package.json lists @fontsource-variable/sora), '
                 'or pass --fonts <node_modules dir>, or --fonts google.')
    rules = []
    for rule in re.findall(r'@font-face\s*\{[^}]*\}', rd(css)):
        src = re.search(r"url\(\./files/([^)]+?\.woff2)\)", rule)
        if not src: continue
        with open(os.path.join(nm, SORA, 'files', src.group(1)), 'rb') as fh: data = base64.b64encode(fh.read()).decode()
        rule = re.sub(r'url\(\./files/[^)]+\)', f'url(data:font/woff2;base64,{data})', rule)
        rules.append(rule.replace('font-display: swap', 'font-display: block'))
    if not rules: sys.exit(f'--fonts: no woff2 faces found in {css}')
    return '<style>\n' + '\n'.join(rules) + '\n</style>', len(rules)

GOOGLE = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
          '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@100..800&display=block">')

def main():
    fonts, args = pop_opt(sys.argv[1:], '--fonts')
    if len(args) != 2: sys.exit(USAGE)
    story_path, out = args
    story = rd(story_path)
    if not re.search(r'\bdefineFilm\s*\(', story): sys.exit(f'build.py: {story_path} has no defineFilm({{ ... }}) call')
    m = re.search(r"\bdefineFilm\s*\(\s*\{[\s\S]*?\btitle\s*:\s*(['\"])(.*?)\1", story)
    title = m.group(2) if m else os.path.splitext(os.path.basename(story_path))[0]
    if fonts in (None, 'local'):
        nm = find_node_modules(story_path)
        if nm: fonts_html, n = local_fonts(nm); note = f'fonts: Sora embedded ({n} faces from {nm})'
        elif fonts == 'local': sys.exit('--fonts local: no node_modules with @fontsource-variable/sora in the current folder, the story folder '
                                        'or the toolkit folder. Run `npm i` in the film folder, or pass --fonts <dir> or --fonts google.')
        else: fonts_html, note = GOOGLE, 'fonts: Google Fonts link (no local @fontsource-variable/sora found; run `npm i` to embed)'
    elif fonts == 'google': fonts_html, note = GOOGLE, 'fonts: Google Fonts link'
    else: fonts_html, n = local_fonts(os.path.abspath(fonts)); note = f'fonts: Sora embedded ({n} faces from {fonts})'
    esc = lambda s: s.replace('</script', '<\\/script')
    parts = {
        '__TITLE__': title.replace('&', '&amp;').replace('<', '&lt;'),
        '__FONTS__': fonts_html,
        '__CORE__': esc(rd(os.path.join(here, 'core.js'))),
        '__L3D__': esc(rd(os.path.join(here, 'l3d.js'))),
        '__BEATS__': esc(rd(os.path.join(here, 'beats.js'))),
        # the plugin's shared effect library (a copy of sound-library/sfxlib.js), so cues can name its effects; '' if absent
        '__SFXLIB__': esc(rd(os.path.join(here, 'sfxlib.js'))) if os.path.isfile(os.path.join(here, 'sfxlib.js')) else '',
        '__SOUND__': esc(rd(os.path.join(here, 'sound', 'engine.js')) + '\n' + rd(os.path.join(here, 'sound', 'score.js'))),
        '__STORY__': esc(story),
    }
    html = re.sub('|'.join(parts), lambda mm: parts[mm.group(0)], rd(os.path.join(here, 'shell.html')))  # one pass
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(html)
    print(f'{out}  {len(html) // 1024} KB  "{title}"  {note}')

main()
