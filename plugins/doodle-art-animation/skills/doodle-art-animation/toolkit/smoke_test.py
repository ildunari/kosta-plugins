#!/usr/bin/env python3
"""smoke_test.py — automated smoke test for the Doodle Art Animation toolkit.

usage:
  python3 smoke_test.py [--work DIR] [--keep] [--workers N] [--stories a.js,b.js] [--skip x.js]
                        [--video-story story.js] [--video-seconds 3.5] [--no-video]
                        [--node-modules PATH] [--src DIR]

Which stories: every story*.js next to this script (or in --src). In a film folder, where your own
story sits beside the bundled examples, only your own stories are tested (the bundled examples are
skipped) unless --stories names them. The MP4 segment uses your own story too (story.js first).

What it checks, for each story:
  1. build.py builds it (non-zero exit fails).
  2. a probe page load: window.__ready arrives, window.__story is sane (fps, frames, size, plate starts),
     the fonts loaded (window.__fontWarning unset and document.fonts.check('500 64px Fraunces')),
     and 3 frames rendered through window.__frameData raise no page errors (errors are collected
     1.5 s after the last frame, so late async errors are seen too).
  3. render.mjs --stills renders 3 frames spread across the film: exit 0, no "PAGE ERROR:",
     each still decodes, is not blank (grey std-dev >= 2), and the three are not identical.
Then one short MP4 segment across the video story's first transition (render.mjs --from/--to):
  ffprobe frame count and duration, a stereo audio stream that is not silent (max > -60 dB, mean > -50 dB),
  and motion_check.py with loose thresholds (median >= 0.5, still <= 50%).

It never builds inside the source folder: the toolkit files are copied into --work. Without --work a temp
folder is used; it is deleted after a clean pass unless --keep is given, and kept (path printed) otherwise.
Needs: python3 + numpy, node + Playwright (chromium), ffmpeg/ffprobe, network access for Google Fonts.
Playwright is found the same way render.mjs finds it: a node_modules folder next to the copied files
(symlinked from --node-modules, or from ./node_modules in --src / the current folder), else the global npm root.
Exit code 0 = all passed, 1 = a check failed (summary printed at the end), 2 = setup problem.
"""
import argparse, concurrent.futures as cf, glob, json, os, re, shutil, signal, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_EXT = ('.js', '.mjs', '.cjs', '.py', '.html', '.css', '.json', '.txt', '.woff', '.woff2', '.ttf', '.otf')
SKIP_DIRS = re.compile(r'^(qa.*|.*_frames|node_modules|smoke.*|\.git|__pycache__|\..*)$')
BUNDLED = {'story_example.js', 'story_one_drop.js', 'story_seams.js', 'story_reel.js', 'story_gallery.js', 'story_components.js', 'story_brushes.js'}
CALL_TIMEOUT = 300
FONT_HINT = ('(font requests to fonts.googleapis.com / fonts.gstatic.com can fail or time out on a slow network; '
             'if the story itself is fine, re-run before debugging)')

PW_RESOLVE = r"""
const path = require('path'), { execFileSync } = require('child_process');
try { console.log(require.resolve('playwright', { paths: [process.cwd()] })); }
catch { console.log(require.resolve(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
"""

PROBE = r"""
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
const file = path.resolve(process.argv[2]);
const errors = [], fonts = [];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // a page error before __ready usually means the story never boots: give it 3 s of grace, then stop waiting
  let bail; const errored = new Promise(r => { bail = r; });
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); setTimeout(() => bail('errored'), 3000); });
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'domcontentloaded' });
  const ready = await Promise.race([
    page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 }).then(() => 'ready'),
    errored]).catch(e => { errors.push('never ready: ' + e.message.split('\n')[0]); return 'timeout'; });
  const isReady = await page.evaluate(() => window.__ready === true);
  if (ready === 'errored' && !isReady) errors.push('never ready: page error before window.__ready');
  const story = await page.evaluate(() => window.__story ?? null);
  if (isReady) {
    const f = await page.evaluate(() => ({ warning: window.__fontWarning ?? null, fraunces: document.fonts.check('500 64px Fraunces') }));
    if (f.warning) fonts.push('window.__fontWarning: ' + (typeof f.warning === 'string' ? f.warning : JSON.stringify(f.warning)));
    if (!f.fraunces) fonts.push("document.fonts.check('500 64px Fraunces') is false after ready");
    // render a few frames so errors thrown after boot (in draw code, or async callbacks) are observed
    const n = story && story.frames > 0 ? story.frames : 1;
    for (const u of [0.1, 0.5, 0.9]) {
      const fr = Math.min(n - 1, Math.round(n * u));
      try { await page.evaluate(fr => { window.__frameData(fr); return true; }, fr); }
      catch (e) { errors.push(`__frameData(${fr}) threw: ` + e.message.split('\n')[0]); }
    }
    await sleep(1500);
  }
  console.log(JSON.stringify({ story, errors, fonts }));
} finally { await browser.close(); }
"""


def run(cmd, cwd, timeout=CALL_TIMEOUT):
    """Run a command, return (exit code, combined stdout+stderr).
    On timeout the whole process group (node plus its Chromium children) is killed and the output so far is kept."""
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    try:
        out, err = p.communicate(timeout=timeout)
        return p.returncode, (out or '') + (err or '')
    except subprocess.TimeoutExpired:
        try:
            os.killpg(p.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        out, err = p.communicate()
        return 124, (out or '') + (err or '') + f'\nTIMEOUT after {timeout}s (process group killed): {" ".join(cmd)}'


def excerpt(out, n=600):
    """The useful part of a failing command's output: its error lines first, then the tail."""
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    errs = [l for l in lines if re.search(r'error|exception|traceback|timeout', l, re.I) and not l.startswith('at ')][:4]
    tail = '\n'.join(lines[-4:])
    return ('\n'.join(errs) + ('\n...\n' if errs else '') + tail)[-n:] if lines else '(no output)'


def grey(path, w=192, h=108):
    """Decode an image to a small grey numpy array with ffmpeg (no PIL needed)."""
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'],
                         capture_output=True).stdout
    if len(raw) != w * h:
        return None
    return np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float32)


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def copy_toolkit(src, work, nm):
    """Copy the toolkit (top-level source files plus small source subfolders such as kits/) into work."""
    os.makedirs(work, exist_ok=True)
    for name in sorted(os.listdir(src)):
        p = os.path.join(src, name)
        if os.path.isfile(p) and name.endswith(SRC_EXT):
            shutil.copy2(p, os.path.join(work, name))
        elif os.path.isdir(p) and not SKIP_DIRS.match(name):
            size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(p) for f in fs)
            if size < 20 * 1024 * 1024:
                shutil.copytree(p, os.path.join(work, name), dirs_exist_ok=True)
    link = os.path.join(work, 'node_modules')
    if nm:
        if os.path.islink(link):          # a stale link from an earlier run in the same --work
            os.unlink(link)
        if not os.path.exists(link):
            os.symlink(nm, link)
    with open(os.path.join(work, '_smoke_probe.mjs'), 'w') as f:
        f.write(PROBE)


def check_story_meta(s):
    """Sanity checks on window.__story. Returns a list of problems."""
    bad = []
    if not isinstance(s, dict):
        return ['window.__story missing']
    fps, frames = s.get('fps'), s.get('frames')
    if not is_num(fps) or not 12 <= fps <= 60:
        bad.append(f'fps {fps!r} not in 12..60')
    if not isinstance(frames, int) or isinstance(frames, bool) or frames <= 0:
        bad.append(f'frames {frames!r} is not a positive integer')
    elif is_num(fps) and fps > 0 and not 1 <= frames / fps <= 1800:
        bad.append(f'duration {frames / fps:.1f}s outside 1..1800 s')
    if not (is_num(s.get('width')) and s['width'] > 0 and is_num(s.get('height')) and s['height'] > 0):
        bad.append(f"canvas size {s.get('width')}x{s.get('height')} invalid")
    starts = s.get('starts') or []
    if not starts:
        bad.append('no plates in __story.starts')
    ts = [st.get('t') if isinstance(st, dict) else None for st in starts]
    if any(not is_num(t) for t in ts):
        bad.append(f'non-numeric plate start times {ts}')
    else:
        if ts and abs(ts[0]) > 1e-6:
            bad.append(f'first plate starts at {ts[0]} not 0')
        if any(b < a for a, b in zip(ts, ts[1:])):
            bad.append(f'plate start times not increasing {ts}')
        if is_num(fps) and isinstance(frames, int) and fps > 0 and ts and ts[-1] >= frames / fps:
            bad.append(f'last plate starts at {ts[-1]} s, after the film ends ({frames / fps:.1f} s)')
    return bad


def check_story(story, work, out_dir):
    """Build, probe and render 3 stills for one story. Returns a result dict."""
    import numpy as np
    stem = os.path.splitext(story)[0]
    res = {'story': story, 'problems': [], 'meta': None, 'stills': []}
    P = res['problems']
    html = f'smoke_{stem}.html'
    code, out = run([sys.executable, 'build.py', story, html], work)
    if code != 0:
        P.append(f'build.py exit {code}: {excerpt(out)}')
        return res
    code, out = run(['node', '_smoke_probe.mjs', html], work, timeout=150)
    info = None
    for line in reversed(out.splitlines()):
        if line.startswith('{'):
            try:
                info = json.loads(line)
                break
            except ValueError:
                pass
    if code != 0 or info is None:
        P.append(f'probe exit {code}: {excerpt(out)}')
        return res
    font_err = False
    for e in info['errors']:
        P.append(f'on load: {e}')
        font_err |= 'fonts.g' in e or 'font' in e.lower()
    for e in info.get('fonts', []):
        P.append(f'fonts: {e}')
        font_err = True
    if font_err:
        P.append(f'fonts: {FONT_HINT}')
    meta = res['meta'] = info['story']
    P += check_story_meta(meta)
    if not meta or not isinstance(meta.get('frames'), int) or meta['frames'] <= 0:
        return res
    n = meta['frames']
    frames = sorted({min(n - 1, max(0, round(n * u))) for u in (0.2, 0.5, 0.8)})
    qa = os.path.join(out_dir, stem)
    shutil.rmtree(qa, ignore_errors=True)
    code, out = run(['node', 'render.mjs', html, '--stills', ','.join(map(str, frames)), '--dir', qa], work)
    if code != 0:
        P.append(f'render.mjs --stills exit {code}: {excerpt(out)}')
    P += [f'render: {l.strip()}' for l in out.splitlines() if 'PAGE ERROR' in l]
    imgs = []
    for f in frames:
        p = os.path.join(qa, f'f_{f:05d}.jpg')
        if not os.path.exists(p):
            P.append(f'still for frame {f} not written')
            continue
        g = grey(p)
        if g is None:
            P.append(f'still for frame {f} does not decode')
            continue
        sd = float(g.std())
        res['stills'].append({'frame': f, 'file': p, 'bytes': os.path.getsize(p), 'grey_std': round(sd, 2)})
        if sd < 2:
            P.append(f'still for frame {f} looks blank (grey std-dev {sd:.1f} < 2)')
        imgs.append(g)
    if len(imgs) == 3:
        diffs = [float(np.abs(a - b).mean()) for a, b in ((imgs[0], imgs[1]), (imgs[1], imgs[2]), (imgs[0], imgs[2]))]
        if max(diffs) < 1.0:
            P.append(f'the three stills are nearly identical (mean abs diff {max(diffs):.2f})')
    if res['stills']:
        tiles = [s['file'] for s in res['stills']]
        sheet = os.path.join(out_dir, f'sheet_{stem}.jpg')
        ins = sum((['-i', t] for t in tiles), [])
        if len(tiles) > 1:
            flt = ''.join(f'[{i}]scale=480:270[s{i}];' for i in range(len(tiles))) + \
                  ''.join(f'[s{i}]' for i in range(len(tiles))) + f'hstack={len(tiles)}'
        else:
            flt = 'scale=480:270'
        run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', flt, '-frames:v', '1', sheet], work)
    return res


def check_video(story, work, out_dir, workers, seconds, meta):
    """Render a short MP4 segment across the story's first transition and check it."""
    P = []
    stem = os.path.splitext(story)[0]
    html = f'smoke_{stem}.html'
    fps, n = meta['fps'], meta['frames']
    count = max(24, round(seconds * fps))
    starts = meta.get('starts') or []
    t1 = starts[1]['t'] if len(starts) > 1 else n / fps / 2
    frm = max(0, min(n - count, round(t1 * fps) - count // 3))
    to = min(n, frm + count)
    count = to - frm
    mp4 = os.path.join(out_dir, f'segment_{stem}.mp4')
    if os.path.exists(mp4):
        os.remove(mp4)
    t0 = time.time()
    code, out = run(['node', 'render.mjs', html, mp4, '--workers', str(workers), '--from', str(frm), '--to', str(to),
                     '--bitrate', '3800k'], work, timeout=600)
    res = {'story': story, 'from': frm, 'to': to, 'seconds': round(time.time() - t0, 1), 'problems': P}
    if code != 0:
        P.append(f'render.mjs segment exit {code}: {excerpt(out)}')
    P += [f'render: {l.strip()}' for l in out.splitlines() if 'PAGE ERROR' in l]
    shutil.rmtree(mp4[:-4] + '_frames', ignore_errors=True)
    if not os.path.exists(mp4):
        P.append('segment mp4 not written')
        return res
    code, out = run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                     'stream=codec_type,channels,nb_read_frames,duration:format=duration', '-of', 'json', mp4], work)
    try:
        pr = json.loads(out)
    except ValueError:
        P.append(f'ffprobe failed: {excerpt(out, 300)}')
        return res
    v = [s for s in pr.get('streams', []) if s.get('codec_type') == 'video']
    a = [s for s in pr.get('streams', []) if s.get('codec_type') == 'audio']
    want = count / fps
    if not v:
        P.append('no video stream')
    else:
        nf = int(v[0].get('nb_read_frames', 0))
        res['video_frames'] = nf
        if abs(nf - count) > 1:
            P.append(f'video has {nf} frames, expected {count}')
        vd = float(v[0].get('duration') or pr.get('format', {}).get('duration') or 0)
        res['video_seconds'] = round(vd, 3)
        if abs(vd - want) > 0.15:
            P.append(f'video lasts {vd:.2f}s, expected {want:.2f}s')
    if not a:
        P.append('no audio stream')
    else:
        res['audio_channels'] = a[0].get('channels')
        if a[0].get('channels') != 2:
            P.append(f"audio has {a[0].get('channels')} channels, expected 2 (stereo)")
        ad = float(a[0].get('duration') or 0)
        res['audio_seconds'] = round(ad, 3)
        if ad < want * 0.8:
            P.append(f'audio lasts {ad:.2f}s, expected about {want:.2f}s')
        code, out = run(['ffmpeg', '-v', 'info', '-nostats', '-i', mp4, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], work)
        db = {}
        for k in ('max', 'mean'):
            m = re.search(rf'{k}_volume:\s*(-?[\d.]+|-inf) dB', out)
            db[k] = float(m.group(1)) if m and m.group(1) != '-inf' else -999.0
        res['audio_max_db'], res['audio_mean_db'] = db['max'], db['mean']
        if meta.get('silent'):                               # defineStory({ silent: true }): silence is the point
            if db['max'] >= -60:
                P.append(f"story is silent but the audio has sound (max volume {db['max']} dB)")
        else:
            if db['max'] < -60:
                P.append(f"audio is silent (max volume {db['max']} dB < -60)")
            if db['mean'] < -50:
                P.append(f"audio is nearly silent (mean volume {db['mean']} dB < -50)")
    code, out = run([sys.executable, 'motion_check.py', mp4], work)
    m = re.search(r'median\s+([\d.]+).*?still\(<0\.5\)\s+(\d+)%', out)
    if code != 0 or not m:
        P.append(f'motion_check failed (exit {code}): {excerpt(out, 300)}')
    else:
        med, still = float(m.group(1)), int(m.group(2))
        res['motion_median'], res['motion_still_pct'] = med, still
        if med < 0.5:
            P.append(f'motion median {med} < 0.5 (loose smoke threshold; film target is 1.5)')
        if still > 50:
            P.append(f'{still}% of drawings are still (> 50%, loose smoke threshold; film target is < 5%)')
    return res


def setup_error(msg):
    print(f'smoke_test: setup problem: {msg}')
    return 2


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', default=HERE, help='folder with engine.js, build.py, render.mjs and the stories (default: this script\'s folder)')
    ap.add_argument('--work', default=None, help='scratch folder for builds and QA output (default: a new temp folder)')
    ap.add_argument('--keep', action='store_true', help='keep the temp work folder even when everything passed')
    ap.add_argument('--workers', type=int, default=int(os.environ.get('SMOKE_WORKERS', 3)),
                    help='parallel story checks and render.mjs --workers for the MP4 (default 3, env SMOKE_WORKERS)')
    ap.add_argument('--stories', default=None, help='comma-separated story files (default: your own story*.js; the bundled examples when there are none)')
    ap.add_argument('--skip', default='', help='comma-separated story files to leave out')
    ap.add_argument('--video-story', default=None, help='story for the MP4 segment (default: your own story, else story_example.js)')
    ap.add_argument('--video-seconds', type=float, default=3.5, help='length of the MP4 segment (default 3.5)')
    ap.add_argument('--no-video', action='store_true', help='skip the MP4 segment')
    ap.add_argument('--node-modules', default=os.environ.get('SMOKE_NODE_MODULES'), help='node_modules folder that contains playwright')
    a = ap.parse_args()

    src = os.path.abspath(a.src)
    missing = [t for t in ('ffmpeg', 'ffprobe', 'node') if not shutil.which(t)]
    for f in ('engine.js', 'build.py', 'render.mjs', 'motion_check.py', 'shell.html'):
        if not os.path.exists(os.path.join(src, f)):
            missing.append(f'{src}/{f}')
    try:
        import numpy  # noqa: F401
    except ImportError:
        missing.append('python numpy (pip install numpy)')
    if missing:
        return setup_error('missing ' + ', '.join(missing))

    # which stories
    found = sorted(os.path.basename(p) for p in glob.glob(os.path.join(src, 'story*.js')))
    own = [s for s in found if s not in BUNDLED]
    skip = {s.strip() for s in a.skip.split(',') if s.strip()}
    if a.stories:
        stories = [s.strip() for s in a.stories.split(',') if s.strip()]
        unknown = [s for s in stories if not os.path.isfile(os.path.join(src, s))]
        if unknown:
            return setup_error(f'--stories not found in {src}: {", ".join(unknown)}')
    else:
        stories = own or found
    stories = [s for s in stories if s not in skip]
    if not stories:
        return setup_error(f'no story*.js files to test in {src}')
    video_story = None
    if not a.no_video:
        if a.video_story:
            video_story = a.video_story
            if not os.path.isfile(os.path.join(src, video_story)):
                return setup_error(f'--video-story not found in {src}: {video_story}')
            if video_story not in stories:
                stories.append(video_story)
        else:
            own_tested = [s for s in stories if s not in BUNDLED]
            pref = (['story.js'] if 'story.js' in own_tested else []) + own_tested + \
                   [s for s in ('story_example.js', 'story_one_drop.js') if s in stories] + stories
            video_story = pref[0]

    # node_modules / playwright
    nm = a.node_modules
    if nm:
        nm = os.path.abspath(nm)
        if not os.path.isdir(os.path.join(nm, 'playwright')):
            return setup_error(f'--node-modules {nm} does not exist or has no playwright/ folder')
    else:
        nm = next((os.path.abspath(c) for c in (os.path.join(src, 'node_modules'), os.path.join(os.getcwd(), 'node_modules'))
                   if os.path.isdir(os.path.join(c, 'playwright'))), None)

    # work folder
    temp = a.work is None
    work = tempfile.mkdtemp(prefix='doodle-smoke-') if temp else os.path.abspath(a.work)
    if work == src:
        return setup_error('--work must be a different folder from --src (try --work qa_smoke)')
    if os.path.commonpath([work, src]) == src and os.path.exists(os.path.join(src, '..', 'SKILL.md')):
        return setup_error('--work must not be inside the plugin toolkit folder (never build films in the plugin)')
    out_dir = os.path.join(work, 'smoke_qa')
    os.makedirs(out_dir, exist_ok=True)
    copy_toolkit(src, work, nm)
    code, out = run(['node', '-e', PW_RESOLVE], work, timeout=60)
    if code != 0:
        if temp:
            shutil.rmtree(work, ignore_errors=True)
        return setup_error('playwright is not installed where render.mjs can find it (pass --node-modules, or '
                           'npm i playwright && npx playwright install chromium). ' + excerpt(out, 200))
    pw = out.strip().splitlines()[-1]
    workers = max(1, a.workers)
    tested_note = '' if a.stories or not own else f' (your own; bundled examples skipped: {len(found) - len(own)})'
    print(f'smoke_test: {len(stories)} stories from {src}{tested_note}\n  work dir {work}\n  playwright {pw}; workers {workers}')

    t0 = time.time()
    results = {}
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(check_story, s, work, out_dir): s for s in stories}
        for fu in cf.as_completed(futs):
            s = futs[fu]
            try:
                r = fu.result()
            except Exception as e:  # a bug in the smoke test itself should still report, not hang
                r = {'story': s, 'problems': [f'smoke test crashed: {e!r}'], 'meta': None, 'stills': []}
            results[s] = r
            m = r['meta'] if isinstance(r['meta'], dict) else {}
            tag = 'PASS' if not r['problems'] else 'FAIL'
            fr, fps = m.get('frames'), m.get('fps')
            dur = f'{fr / fps:.1f}s' if is_num(fr) and is_num(fps) and fps > 0 else '?'
            print(f"  [{tag}] {s}: {m.get('title', '?')!r} {fr if fr is not None else '?'} frames ({dur}), stills "
                  + (', '.join(f"f{x['frame']} std {x['grey_std']}" for x in r['stills']) or 'none'))
            for p in r['problems']:
                print(f'         - {p}')

    video = None
    if video_story:
        vs = video_story
        meta = (results.get(vs) or {}).get('meta')
        if not meta or check_story_meta(meta):
            video = {'story': vs, 'problems': ['skipped: the story failed its load checks']}
        else:
            video = check_video(vs, work, out_dir, workers, a.video_seconds, meta)
        tag = 'PASS' if not video['problems'] else 'FAIL'
        extra = ', '.join(f'{k} {video[k]}' for k in ('from', 'to', 'video_frames', 'video_seconds', 'audio_channels', 'audio_max_db',
                                                       'audio_mean_db', 'motion_median', 'motion_still_pct', 'seconds') if k in video)
        print(f"  [{tag}] MP4 segment of {vs}: {extra}")
        for p in video['problems']:
            print(f'         - {p}')

    failed = [s for s, r in results.items() if r['problems']] + (['MP4 segment'] if video and video['problems'] else [])
    with open(os.path.join(out_dir, 'summary.json'), 'w') as f:
        json.dump({'stories': results, 'video': video, 'failed': failed, 'seconds': round(time.time() - t0, 1)}, f, indent=1)
    n_bad = len([s for s in failed if s in results])
    print(f'\nsmoke_test: {len(stories) - n_bad}/{len(stories)} stories passed'
          + ('' if video is None else f", MP4 segment {'failed' if video['problems'] else 'passed'}")
          + f' in {time.time() - t0:.0f}s.')
    if temp and not failed and not a.keep:
        shutil.rmtree(work, ignore_errors=True)
        print('temp work folder removed (use --keep or --work DIR to keep the sheets)')
    else:
        print(f'sheets, stills and summary.json kept in {out_dir}')
    if failed:
        print('FAILED: ' + ', '.join(failed))
        return 1
    print('OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
