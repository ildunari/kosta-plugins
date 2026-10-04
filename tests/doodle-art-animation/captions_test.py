#!/usr/bin/env python3
"""captions_test.py — captions of a narrated film: where they break, how they are timed, the caption styles burned into
the picture, and the subtitle track a full render puts in the MP4. Tested on the narrated example ("Salt in Water",
docs/doodle-art-animation/examples/narrated/) and variants of its voice.json made in the work folder.

usage:
  python3 tests/doodle-art-animation/captions_test.py [--node-modules PATH] [--work DIR] [--static]

  static      the engine names its caption styles, fonts, backgrounds and animations; shell.html links the caption
              faces; build.py keeps voice.json's word times; render.mjs knows --captions and --no-cc-track
  breaks      every caption is one or two lines of 42 characters at most, in order, never overlapping; a long sentence
              is cut after its comma, not after a word like "a", "the" or "of", and a number keeps its unit
  replace     captions.replace rewrites a spoken form for the reader, inside the time of the words it replaces
  timing      with word times in voice.json a caption starts on its first word exactly; without them, by syllables
  styles      each named style draws into the bottom of the frame and nowhere else; pos=top moves them; a plate can
              hide or move them; the words and type animations reveal the caption as it is spoken; frames stay pure
  render      render.mjs --captions names the style it burns in; a bad style stops it with the list of styles; a full
              render puts the captions in the MP4 as a subtitle track (not when they are burned in, or with
              --no-cc-track); a film without narration warns and renders as before

--static runs the first group without a browser. The rest need node, Playwright (--node-modules, DOODLE_NODE_MODULES
or the global npm root), ffmpeg and ffprobe, and network access for Google Fonts. Exit 1 if any check failed.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TK = os.path.join(REPO, 'plugins', 'doodle-art-animation', 'skills', 'doodle-art-animation', 'toolkit')
EX = os.path.join(REPO, 'docs', 'doodle-art-animation', 'examples', 'narrated')
HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = ['notebook', 'scrap', 'tape', 'marker', 'margin', 'field', 'broadcast', 'social']

ap = argparse.ArgumentParser()
ap.add_argument('--node-modules', default=os.environ.get('DOODLE_NODE_MODULES', ''))
ap.add_argument('--work', default='')
ap.add_argument('--static', action='store_true')
a = ap.parse_args()

results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + ('' if ok else f'  - {detail}'))

def run(cmd, cwd=None, timeout=600):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout + p.stderr

work = os.path.abspath(a.work) if a.work else tempfile.mkdtemp(prefix='doodle_captions_')
os.makedirs(work, exist_ok=True)
rd = lambda p: open(p, encoding='utf-8').read()

# ---------------------------------------------------------------- static
eng, shell, build, render = (rd(os.path.join(TK, f)) for f in ('engine.js', 'shell.html', 'build.py', 'render.mjs'))
m = re.search(r'const CAPTION_STYLES = \{(.*?)\n\};', eng, re.S)
names = re.findall(r'^\s*(\w+): \{ font', m.group(1), re.M) if m else []
check('static: the engine names the eight caption styles', names == STYLES, str(names))
check('static: five fonts, six backgrounds, six animations',
      all(f"{k}: {{ kind" in eng for k in ('sans', 'serif', 'mono', 'hand', 'script'))
      and "CAPTION_BGS = ['halo', 'scrap', 'tape', 'marker', 'band', 'outline']" in eng
      and "CAPTION_ANIMS = ['cut', 'fade', 'rise', 'type', 'words', 'highlight']" in eng)
check('static: shell.html links the caption faces (Patrick Hand, Caveat)', 'family=Patrick+Hand' in shell and 'family=Caveat' in shell)
check("static: build.py keeps voice.json's word times", re.search(r"keep = \{k: u\[k\] for k in \([^)]*'words'", build) is not None)
check('static: render.mjs knows --captions and --no-cc-track', "opt('captions'" in render and "opt('no-cc-track'" in render and 'mov_text' in render)

# ---------------------------------------------------------------- variants of the example (no browser)
tk = os.path.join(work, 'tk')
shutil.copytree(TK, tk, dirs_exist_ok=True, ignore=shutil.ignore_patterns('node_modules', 'qa*', '*_frames'))
voice = json.load(open(os.path.join(EX, 'vo', 'voice.json'), encoding='utf-8'))
story_src = rd(os.path.join(EX, 'story_narrated.js'))
LONG = 'At 20 °C about 36 g of it dissolves in every 100 mL of water, and the rest of the pinch stays on the bottom of the beaker.'
def variant(name, story_extra='', words=False, long=False):
    """a copy of the example in work/<name>/ (story, vo/voice.json, clips), built to tk/<name>.html"""
    d = os.path.join(work, name); os.makedirs(os.path.join(d, 'vo'), exist_ok=True)
    v = json.loads(json.dumps(voice))
    for u in v['units']:
        src = os.path.join(EX, u['file']); u['file'] = 'vo/' + os.path.basename(src); shutil.copy2(src, os.path.join(d, u['file']))
        if long and u['id'] == 'P3': u['sentences'][1][2] = LONG
        if words and u['id'] == 'P2':                       # uneven word times, so a caption that follows them is told apart
            ws = []
            for a0, b0, text in u['sentences']:
                n = len(text.split()); ws += [[round(a0 + (b0 - a0) * (k / n) ** 1.4, 3), round(a0 + (b0 - a0) * ((k + 0.8) / n) ** 1.4, 3)] for k in range(n)]
            u['words'] = ws; u['timing'] = 'words'
    json.dump(v, open(os.path.join(d, 'vo', 'voice.json'), 'w'))
    src = re.sub(r"defineStory\(\{\s*title:\s*'[^']*',", lambda m: m.group(0) + ' ' + story_extra, story_src, count=1)   # build.py wants the title first
    open(os.path.join(d, 'story.js'), 'w').write(src)
    rc, out = run([sys.executable, 'build.py', os.path.join(d, 'story.js'), name + '.html'], cwd=tk)
    return rc, out, v
REP = "captions: { replace: { 'sodium and chloride ions': 'Na⁺ and Cl⁻ ions', 'one by one,': 'one at a time,' } },"
rc0, out0, _ = variant('plain')
rc1, out1, vlong = variant('long', REP, long=True)
rc2, out2, vexact = variant('exact', words=True)
check('build: the example and its variants build with their narration', rc0 == 0 and rc1 == 0 and rc2 == 0 and 'voice: 4 clips' in out2, (out0 + out1 + out2)[-400:])

# ---------------------------------------------------------------- browser checks
if not a.static:
    nm = a.node_modules or run(['npm', 'root', '-g'])[1].strip()
    if not os.path.isdir(os.path.join(nm, 'playwright')):
        check('playwright found', False, f'no playwright in {nm} (pass --node-modules)')
    else:
        os.environ['DOODLE_NODE_MODULES'] = os.path.abspath(nm)
        if not os.path.exists(os.path.join(tk, 'node_modules')): os.symlink(os.path.abspath(nm), os.path.join(tk, 'node_modules'))
        def probe(html, body, query=''):
            rc, out = run(['node', os.path.join(HERE, 'probe.mjs'), os.path.join(tk, html), body, query], timeout=600)
            try: return json.loads(out.strip().splitlines()[-1])
            except Exception: return {'result': None, 'errors': [out[-300:]]}
        LEAD = {'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'and', 'or', 'with'}

        # breaks and replace, on the long variant
        r = probe('long.html', 'return { caps: window.__captions(), units: window.__voice().units };')
        v = r.get('result') or {}
        caps = (v.get('caps') or {}).get('captions') or []
        lines = [c['text'].split('\n') for c in caps]
        check('breaks: the film boots and has captions', caps and not r.get('errors'), str(r.get('errors'))[:300])
        check('breaks: every caption is one or two lines of 42 characters at most',
              caps and all(1 <= len(t) <= 2 and all(0 < len(x) <= 42 for x in t) for t in lines), str([t for t in lines if len(t) > 2 or any(len(x) > 42 for x in t)])[:300])
        check('breaks: captions are in order and never overlap', all(c['t0'] < c['t1'] <= n['t0'] + 1e-6 for c, n in zip(caps, caps[1:])), str([(c['t0'], c['t1']) for c in caps])[:300])
        ends = [w for t in lines for w in (x.split()[-1].lower() for x in t[:-1])] + [c['text'].split()[-1].lower() for c, n in zip(caps, caps[1:]) if c['unit'] == n['unit'] and not re.search(r'[.!?]$', c['text'])]
        check('breaks: no line or caption ends on a word like "a", "the" or "of"', not any(w in LEAD for w in ends), str(ends))
        sent = next((c for c in caps if c['text'].startswith('Water molecules')), None)
        check('breaks: the long sentence is cut after its comma ("one at a time," then "and carry each away ...")',
              sent is not None and sent['text'].replace('\n', ' ').endswith('one at a time,') and any(c['text'].startswith('and carry each away') for c in caps),
              str([c['text'] for c in caps if c['unit'] == 'P2']))
        flat = [x for t in lines for x in t]
        check('breaks: a number keeps its unit on the same line (20 °C, 36 g, 100 mL)', all(any(u in x for x in flat) for u in ('20 °C', '36 g', '100 mL')), str(flat[-6:]))
        first = min((s[0] for u in v.get('units', []) for s in u['sentences']), default=None)   # __voice() gives film times
        check('breaks: the first caption starts with the first word', caps and first is not None and abs(caps[0]['t0'] - first) < 1e-3, f"{caps[:1]} vs {first}")
        na = next((c for c in caps if 'Na⁺ and Cl⁻ ions' in c['text'].replace('\n', ' ')), None)
        s1 = next((s for u in v.get('units', []) if u['id'] == 'P2' for s in [u['sentences'][0]]), None)
        check('replace: captions.replace rewrites the spoken words for the reader, inside the sentence\'s time',
              na is not None and 'sodium' not in na['text'] and s1 is not None and s1[0] - 1e-3 <= na['t0'] and na['t1'] <= s1[1] + 0.5   # + the chaining to the next caption
              and any('one at a time,' in c['text'] for c in caps), str([c['text'] for c in caps if c['unit'] == 'P2']))
        srt = probe('long.html', 'return window.__srt();').get('result') or ''
        check('replace: the .srt carries the same captions', 'Na⁺ and Cl⁻ ions' in srt.replace('\n', ' ') and srt.count('-->') == len(caps), srt[:200])

        # timing: word times from voice.json
        r = probe('exact.html', 'return { caps: window.__captions().captions, units: window.__voice().units };')
        v = r.get('result') or {}
        u2 = next((u for u in v.get('units', []) if u['id'] == 'P2'), None)
        ws = next((u['words'] for u in vexact['units'] if u['id'] == 'P2'), [])
        words2 = ' '.join(s[2] for s in next(u for u in vexact['units'] if u['id'] == 'P2')['sentences']).split()
        k_and = next((k for k in range(len(words2)) if words2[k] == 'and' and words2[k + 1] == 'carry'), None)
        c_and = next((c for c in v.get('caps', []) if c['text'].startswith('and carry')), None)
        check('timing: with word times in voice.json a caption starts on its first word exactly',
              u2 and c_and and k_and is not None and abs(c_and['t0'] - (u2['t0'] + ws[k_and][0])) < 1e-3,
              f"{c_and and c_and['t0']} vs {u2 and k_and is not None and u2['t0'] + ws[k_and][0]}")
        r0 = probe('plain.html', 'return window.__captions().captions;')
        c_est = next((c for c in r0.get('result') or [] if c['text'].startswith('and carry')), None)
        check('timing: without word times the same caption is placed by syllables (a different time)', c_est and c_and and abs(c_est['t0'] - c_and['t0']) > 0.05, str([c_est and c_est['t0'], c_and and c_and['t0']]))

        # styles, drawn into the frame: compared with the same frame without captions, in page
        r = probe('plain.html', """
          const caps = captions(), c = caps.find(c => c.lines.length === 2) || caps[0], f = Math.round(((c.t0 + c.t1) / 2 + 0.3) * FPS);
          const g = cvs.getContext('2d'), grab = n => { renderFrame(n); return g.getImageData(0, 0, W, H).data; };
          const band = (A, B, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y += 2) for (let x = 0; x < W; x += 2) { const i = (y * W + x) * 4; s += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]); n += 3; } return s / n; };
          for (const F of Object.values(CAPTION_FONTS)) await document.fonts.load(`${F.weight} ${F.size}px "${F.face}"`);
          CC.on = false; const off = grab(f), out = {};
          for (const name of Object.keys(CAPTION_STYLES)) { CC.on = true; CC.style = captionStyle(name); const on = grab(f);
            out[name] = { bottom: band(on, off, 840, 1070), top: band(on, off, 0, 760) }; }
          CC.style = captionStyle('style=notebook,pos=top'); const top = grab(f); out.posTop = { bottom: band(top, off, 840, 1070), top: band(top, off, 200, 420) };
          const pl = STORY.plates.find(p => p.start <= f / FPS && f / FPS < p.start + p.dur);
          CC.style = captionStyle('notebook'); pl.captions = false; out.hidden = band(grab(f), off, 840, 1070);
          pl.captions = { pos: 'top' }; const mv = grab(f); out.moved = { bottom: band(mv, off, 840, 1070), top: band(mv, off, 200, 420) }; delete pl.captions;
          const fr = t => Math.round(t * FPS), diffAt = t => { CC.on = true; const on = grab(fr(t)); CC.on = false; const bare = grab(fr(t)); CC.on = true; return band(on, bare, 840, 1070); };
          for (const name of ['words', 'type']) { CC.style = captionStyle('anim=' + name); out[name] = [diffAt(c.t0 + 0.12), diffAt(c.t1 - 0.12)]; }
          CC.style = captionStyle('anim=cut'); out.cutBefore = diffAt(c.t0 - 0.05);
          CC.on = true; CC.style = captionStyle('tape'); const p1 = grab(f); grab(0); grab(f + 7); const p2 = grab(f);
          let same = true; for (let i = 0; i < p1.length; i++) if (p1[i] !== p2[i]) { same = false; break; }
          out.pure = same; out.frame = f; out.text = c.text; out.fontWarning = window.__fontWarning || null;
          return out;""")
        v = r.get('result') or {}
        check('styles: the film boots and every style draws without a page error', v and not r.get('errors'), str(r.get('errors'))[:300])
        bad = {k: v[k] for k in STYLES if k in v and not (v[k]['bottom'] > 2 and v[k]['top'] == 0)}
        check('styles: each of the eight styles draws into the bottom of the frame and nowhere else', v and all(k in v for k in STYLES) and not bad, str(bad or v)[:400])
        check('styles: pos=top puts them under the header band instead', v.get('posTop') and v['posTop']['top'] > 2 and v['posTop']['bottom'] == 0, str(v.get('posTop')))
        check('styles: a plate with captions: false hides them; captions: { pos: "top" } moves them',
              v.get('hidden') == 0 and v.get('moved') and v['moved']['top'] > 2 and v['moved']['bottom'] == 0, str([v.get('hidden'), v.get('moved')]))
        check('styles: words and type reveal the caption as it is spoken (less drawn early than late)',
              all(v.get(k) and v[k][0] < v[k][1] * 0.8 for k in ('words', 'type')), str([v.get('words'), v.get('type')]))
        check('styles: cut shows nothing before the caption starts', v.get('cutBefore') == 0, str(v.get('cutBefore')))
        check('styles: a frame with captions is the same whatever was drawn before it', v.get('pure') is True)

        r = probe('plain.html', "return { font: window.__fontWarning || null, caveat: document.fonts.check('600 58px Caveat'), story: window.__story.captions };", 'captions=margin')
        v = r.get('result') or {}
        check('styles: a style in the script font loads its face at boot (no font warning)', v and v.get('font') is None and v.get('caveat') is True
              and v.get('story') == {'burned': True, 'style': 'margin', 'font': 'script', 'bg': 'halo', 'anim': 'type'}, str(r.get('errors') or v)[:300])

        # render.mjs
        rc, out = run(['node', 'render.mjs', 'plain.html', '--stills', '300', '--dir', 'qa_cc', '--captions', 'tape'], cwd=tk)
        check('render: --captions names the style it burns in', rc == 0 and 'captions burned in (tape: hand, tape, words)' in out, out[-300:])
        rc, out = run(['node', 'render.mjs', 'plain.html', '--stills', '300', '--dir', 'qa_cc', '--captions', 'nosuch'], cwd=tk, timeout=300)
        check('render: a style that does not exist stops the render and lists the styles', rc != 0 and "no style 'nosuch'" in out and 'notebook' in out, out[-300:])

        # a full render puts the captions in the MP4 as a subtitle track: a 3-second film with a one-sentence clip
        mini = os.path.join(work, 'mini'); os.makedirs(os.path.join(mini, 'vo'), exist_ok=True)
        u0 = next(u for u in voice['units'] if u['id'] == 'P0'); shutil.copy2(os.path.join(EX, u0['file']), os.path.join(mini, 'vo', 'P0.ogg'))
        json.dump({'version': 1, 'provider': 'kokoro', 'units': [{**u0, 'file': 'vo/P0.ogg'}]}, open(os.path.join(mini, 'vo', 'voice.json'), 'w'))
        open(os.path.join(mini, 'story_mini.js'), 'w').write(
            "const M0 = { dur: 1, vo: { id: 'P0', at: 0.3, tail: 0.3 }, draw(t) { ink([[400, 540], [lerp(400, 1500, clamp(t / 4)), 540]], { w: 4 });\n"
            "  text('a label where the captions go', 960, 985, { kind: 'display', size: 30, align: 'center' }); } };\n"
            "defineStory({ title: 'Mini', stages: 0, plates: [M0] });\nboot();\n")
        def streams(mp4):
            rc, out = run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'csv=p=0', mp4])
            return sorted(out.split()) if rc == 0 else ['ffprobe failed: ' + out[-200:]]
        rc, out = run([sys.executable, 'build.py', os.path.join(mini, 'story_mini.js'), 'mini.html'], cwd=tk)
        if rc == 0: rc, out = run(['node', 'render.mjs', 'mini.html', 'mini.mp4', '--workers', '2', '--bitrate', '2000k'], cwd=tk, timeout=900)
        st = streams(os.path.join(tk, 'mini.mp4')) if rc == 0 else []
        check('render: a full render writes film.srt and puts the captions in the MP4 as a subtitle track',
              rc == 0 and os.path.isfile(os.path.join(tk, 'mini.srt')) and 'mov_text,subtitle' in st and 'h264,video' in st and 'aac,audio' in st, str(st) + out[-300:])
        rc, out = run(['node', 'render.mjs', 'mini.html', 'mini_cc.mp4', '--workers', '2', '--bitrate', '2000k', '--captions', 'broadcast'], cwd=tk, timeout=900)
        st2 = streams(os.path.join(tk, 'mini_cc.mp4')) if rc == 0 else []
        rc3, out3 = run(['node', 'render.mjs', 'mini.html', 'mini_nocc.mp4', '--workers', '2', '--bitrate', '2000k', '--no-cc-track'], cwd=tk, timeout=900)
        st3 = streams(os.path.join(tk, 'mini_nocc.mp4')) if rc3 == 0 else []
        check('render: no subtitle track when the captions are burned in, or with --no-cc-track',
              rc == 0 and rc3 == 0 and st2 and st3 and not any('subtitle' in s for s in st2 + st3) and os.path.isfile(os.path.join(tk, 'mini_cc.srt')), str([st2, st3]) + (out + out3)[-300:])

        # text_check with the captions drawn in names the plate whose captions cover its text, and only then
        rc, out = run(['node', 'text_check.mjs', 'mini.html', '--captions', 'broadcast', '--workers', '1'], cwd=tk, timeout=600)
        rc2, out2 = run(['node', 'text_check.mjs', 'mini.html', '--workers', '1'], cwd=tk, timeout=600)
        check('text_check: with --captions it reports a caption covering a label, and not without',
              rc == 0 and re.search(r'^CAPTION .*1 caption covers "a label where the captions go"', out, re.M) is not None and 'caption 1,' in out
              and rc2 == 0 and 'CAPTION' not in out2, (out + out2)[-500:])

        rc, _ = run([sys.executable, 'build.py', 'story_one_drop.js', 'one_drop.html'], cwd=tk)
        if rc == 0: rc, out = run(['node', 'render.mjs', 'one_drop.html', '--stills', '100', '--dir', 'qa_od', '--captions'], cwd=tk)
        check('render: a film without narration warns that there is nothing to burn in, and renders as before',
              rc == 0 and 'no narration, so there are no captions' in out and os.path.isfile(os.path.join(tk, 'qa_od', 'f_00100.jpg')), out[-300:])

n_fail = sum(1 for _, ok, _ in results if not ok)
print(f'\n{len(results) - n_fail} passed, {n_fail} failed' + ('  (static only)' if a.static else ''))
if not a.work and not n_fail: shutil.rmtree(work, ignore_errors=True)
sys.exit(1 if n_fail else 0)
