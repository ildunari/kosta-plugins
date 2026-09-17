#!/usr/bin/env python3
"""smoke_test.py — automated smoke test for the Doodle Art Animation toolkit.

usage:
  python3 smoke_test.py [--work DIR] [--workers N] [--stories a.js,b.js] [--skip x.js]
                        [--video-story story_example.js] [--video-seconds 3.5] [--no-video]
                        [--node-modules PATH] [--src DIR]

What it checks, for every story*.js next to this script (or in --src):
  1. build.py builds it (non-zero exit fails).
  2. a probe page load: no page errors, window.__story is sane (fps, frames, size, plate starts).
  3. render.mjs --stills renders 3 frames spread across the film: exit 0, no "PAGE ERROR:",
     each still decodes, is not blank (grey std-dev), and the three are not identical.
Then, for one story, a short MP4 segment across its first transition (render.mjs --from/--to):
  ffprobe frame count and duration, a stereo audio stream that is not silent, and motion_check.py
  with loose thresholds (median >= 0.5, still <= 50%).

It never builds inside the source folder: the toolkit files are copied into --work (default: a new temp dir).
Needs: python3 + numpy, node + Playwright (chromium), ffmpeg/ffprobe, network access for Google Fonts.
Playwright is found the same way render.mjs finds it: a node_modules folder next to the copied files
(symlinked from --node-modules, or from ./node_modules in --src / the current folder), else the global npm root.
Exit code 0 = all passed, 1 = something failed (summary printed at the end), 2 = setup problem.
"""
import argparse, concurrent.futures as cf, glob, json, os, re, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_EXT = ('.js', '.mjs', '.cjs', '.py', '.html', '.css', '.json', '.txt', '.woff', '.woff2', '.ttf', '.otf')
SKIP_DIRS = re.compile(r'^(qa.*|.*_frames|node_modules|smoke.*|\.git|__pycache__|\..*)$')
CALL_TIMEOUT = 300

PROBE = r"""
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
const file = path.resolve(process.argv[2]);
const errors = [];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  // a page error before __ready usually means the story never boots: give it 3 s of grace, then stop waiting
  let bail; const errored = new Promise(r => { bail = r; });
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); setTimeout(() => bail('errored'), 3000); });
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto(pathToFileURL(file).href + '?render=1', { waitUntil: 'networkidle' });
  const ready = await Promise.race([
    page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 }).then(() => 'ready'),
    errored]).catch(e => { errors.push('never ready: ' + e.message.split('\n')[0]); return 'timeout'; });
  if (ready === 'errored' && !(await page.evaluate(() => window.__ready === true))) errors.push('never ready: page error before window.__ready');
  const story = await page.evaluate(() => window.__story ?? null);
  console.log(JSON.stringify({ story, errors }));
} finally { await browser.close(); }
"""


def run(cmd, cwd, timeout=CALL_TIMEOUT):
    """Run a command, return (exit code, combined output). A timeout counts as a failure."""
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or '') + (p.stderr or '')
    except subprocess.TimeoutExpired as e:
        out = (e.stdout or b'') if isinstance(e.stdout, bytes) else (e.stdout or '').encode()
        return 124, out.decode(errors='replace') + f'\nTIMEOUT after {timeout}s: {" ".join(cmd)}'


def excerpt(out, n=600):
    """The useful part of a failing command's output: its error lines first, then the tail."""
    lines = [l.strip() for l in out.splitlines() if l.strip()]
    errs = [l for l in lines if re.search(r'error|exception|traceback', l, re.I) and not l.startswith('at ')][:4]
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


def copy_toolkit(src, work, node_modules):
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
    nm = node_modules or next((c for c in (os.path.join(src, 'node_modules'), os.path.join(os.getcwd(), 'node_modules'))
                               if os.path.isdir(c)), None)
    link = os.path.join(work, 'node_modules')
    if nm and not os.path.exists(link):
        os.symlink(os.path.abspath(nm), link)
    with open(os.path.join(work, '_smoke_probe.mjs'), 'w') as f:
        f.write(PROBE)
    return nm


def check_story_meta(s):
    """Sanity checks on window.__story. Returns a list of problems."""
    bad = []
    if not isinstance(s, dict):
        return ['window.__story missing']
    fps, frames = s.get('fps'), s.get('frames')
    if not isinstance(fps, (int, float)) or not 12 <= fps <= 60:
        bad.append(f'fps {fps!r} not in 12..60')
    if not isinstance(frames, int) or frames <= 0:
        bad.append(f'frames {frames!r} is not a positive integer')
    elif isinstance(fps, (int, float)) and fps > 0 and not 1 <= frames / fps <= 1800:
        bad.append(f'duration {frames / fps:.1f}s outside 1..1800 s')
    if not (isinstance(s.get('width'), (int, float)) and s['width'] > 0 and isinstance(s.get('height'), (int, float)) and s['height'] > 0):
        bad.append(f"canvas size {s.get('width')}x{s.get('height')} invalid")
    starts = s.get('starts') or []
    if not starts:
        bad.append('no plates in __story.starts')
    ts = [st.get('t') for st in starts]
    if any(not isinstance(t, (int, float)) for t in ts):
        bad.append(f'non-numeric plate start times {ts}')
    else:
        if ts and abs(ts[0]) > 1e-6:
            bad.append(f'first plate starts at {ts[0]} not 0')
        if any(b < a for a, b in zip(ts, ts[1:])):
            bad.append(f'plate start times not increasing {ts}')
        if isinstance(fps, (int, float)) and isinstance(frames, int) and fps > 0 and ts and ts[-1] >= frames / fps:
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
    code, out = run(['node', '_smoke_probe.mjs', html], work)
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
    P += [f'on load: {e}' for e in info['errors']]
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
        if sd < 6:
            P.append(f'still for frame {f} looks blank (grey std-dev {sd:.1f} < 6)')
        imgs.append(g)
    if len(imgs) == 3:
        diffs = [float(np.abs(a - b).mean()) for a, b in ((imgs[0], imgs[1]), (imgs[1], imgs[2]), (imgs[0], imgs[2]))]
        if max(diffs) < 1.0:
            P.append(f'the three stills are nearly identical (mean abs diff {max(diffs):.2f})')
    if res['stills']:
        tiles = [s['file'] for s in res['stills']]
        sheet = os.path.join(out_dir, f'sheet_{stem}.jpg')
        ins = sum((['-i', t] for t in tiles), [])
        flt = ''.join(f'[{i}]scale=480:270[s{i}];' for i in range(len(tiles))) + ''.join(f'[s{i}]' for i in range(len(tiles))) + f'hstack={len(tiles)}' if len(tiles) > 1 else 'scale=480:270'
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
    for x in (mp4,):
        if os.path.exists(x):
            os.remove(x)
    t0 = time.time()
    code, out = run(['node', 'render.mjs', html, mp4, '--workers', str(workers), '--from', str(frm), '--to', str(to), '--bitrate', '3800k'], work, timeout=600)
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
        P.append(f'ffprobe failed: {out.strip()[-300:]}')
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
        m = re.search(r'max_volume:\s*(-?[\d.]+|-inf) dB', out)
        mx = float(m.group(1)) if m and m.group(1) != '-inf' else -999.0
        res['audio_max_db'] = mx
        if mx < -60:
            P.append(f'audio is silent (max volume {mx} dB)')
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


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', default=HERE, help='folder with engine.js, build.py, render.mjs and the stories (default: this script\'s folder)')
    ap.add_argument('--work', default=None, help='scratch folder for builds and QA output (default: new temp dir)')
    ap.add_argument('--workers', type=int, default=int(os.environ.get('SMOKE_WORKERS', 3)),
                    help='parallel story checks and render.mjs --workers for the MP4 (default 3, env SMOKE_WORKERS)')
    ap.add_argument('--stories', default=None, help='comma-separated story files (default: every story*.js in --src)')
    ap.add_argument('--skip', default='', help='comma-separated story files to leave out')
    ap.add_argument('--video-story', default=None, help='story for the MP4 segment (default: story_example.js, else the first story)')
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
        print('smoke_test: missing', ', '.join(missing))
        return 2
    skip = {s.strip() for s in a.skip.split(',') if s.strip()}
    stories = [s.strip() for s in a.stories.split(',')] if a.stories else \
        sorted(os.path.basename(p) for p in glob.glob(os.path.join(src, 'story*.js')))
    stories = [s for s in stories if s not in skip]
    if not stories:
        print(f'smoke_test: no story*.js files in {src}')
        return 2
    work = os.path.abspath(a.work) if a.work else tempfile.mkdtemp(prefix='doodle-smoke-')
    if work == src:
        print('smoke_test: --work must be a different folder from --src (try --work qa_smoke)')
        return 2
    if os.path.commonpath([work, src]) == src and os.path.exists(os.path.join(src, '..', 'SKILL.md')):
        print('smoke_test: --work must not be inside the plugin toolkit folder (never build films in the plugin)')
        return 2
    out_dir = os.path.join(work, 'smoke_qa')
    os.makedirs(out_dir, exist_ok=True)
    nm = copy_toolkit(src, work, a.node_modules)
    workers = max(1, a.workers)
    print(f'smoke_test: {len(stories)} stories from {src}\n  work dir {work}\n  playwright from {nm or "global npm root"}; workers {workers}')

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
            m = r['meta'] or {}
            tag = 'PASS' if not r['problems'] else 'FAIL'
            dur = f"{m['frames'] / m['fps']:.1f}s" if m.get('frames') and m.get('fps') else '?'
            print(f"  [{tag}] {s}: {m.get('title', '?')!r} {m.get('frames', '?')} frames ({dur}), stills "
                  + ', '.join(f"f{x['frame']} std {x['grey_std']}" for x in r['stills']))
            for p in r['problems']:
                print(f'         - {p}')

    video = None
    if not a.no_video:
        vs = a.video_story or ('story_example.js' if 'story_example.js' in stories else stories[0])
        meta = (results.get(vs) or {}).get('meta')
        if vs not in results:
            video = {'story': vs, 'problems': [f'--video-story {vs} was not among the checked stories']}
        elif not meta or check_story_meta(meta):
            video = {'story': vs, 'problems': ['skipped: the story failed its load checks']}
        else:
            video = check_video(vs, work, out_dir, workers, a.video_seconds, meta)
        tag = 'PASS' if not video['problems'] else 'FAIL'
        extra = ', '.join(f'{k} {video[k]}' for k in ('from', 'to', 'video_frames', 'video_seconds', 'audio_channels',
                                                       'audio_max_db', 'motion_median', 'motion_still_pct', 'seconds') if k in video)
        print(f"  [{tag}] MP4 segment of {vs}: {extra}")
        for p in video['problems']:
            print(f'         - {p}')

    failed = [s for s, r in results.items() if r['problems']] + (['MP4 segment'] if video and video['problems'] else [])
    with open(os.path.join(out_dir, 'summary.json'), 'w') as f:
        json.dump({'stories': results, 'video': video, 'failed': failed, 'seconds': round(time.time() - t0, 1)}, f, indent=1)
    print(f'\nsmoke_test: {len(stories) - len([s for s in failed if s in results])}/{len(stories)} stories passed'
          + ('' if video is None else f", MP4 segment {'failed' if video['problems'] else 'passed'}")
          + f' in {time.time() - t0:.0f}s. Sheets and summary.json in {out_dir}')
    if failed:
        print('FAILED: ' + ', '.join(failed))
        return 1
    print('OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
