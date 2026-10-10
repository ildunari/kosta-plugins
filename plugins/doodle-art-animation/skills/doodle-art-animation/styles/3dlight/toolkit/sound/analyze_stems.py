"""Compare a film's dry effects stem against its dry music stem (after `node sound/stems.mjs`):
overall loudness of each, low-end share, and how far each effect rises above the music around it
(a 0.35 s window after each event in the story's sound.events; screen time = art time x K).

usage: python3 sound/analyze_stems.py out_sound/<id>        (the prefix stems.mjs wrote: <id>_music.f32, _sfx.f32, _events.json)
Needs numpy and ffmpeg. Effects that sit far below the music (a median under about -6 dB) will not be heard on booth
speakers; effects far above it (over +10 dB) jump out.
"""
import sys, json, re, subprocess
import numpy as np
if len(sys.argv) != 2: sys.exit(__doc__)
pre = sys.argv[1]
meta = json.load(open(pre + '_events.json'))
sr, K, LEN = meta['sr'], meta['K'], meta['LEN']
st = {k: np.fromfile(f'{pre}_{k}.f32', dtype=np.float32).reshape(-1, 2) for k in ('music', 'sfx')}
def lufs(k):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-stream_loop', '2', '-i', f'{pre}_{k}.f32',
                        '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])
m = st['music'].mean(1); s = st['sfx'].mean(1)
F = np.fft.rfftfreq(len(m), 1 / sr)
def band(x, lo, hi):
    X = np.fft.rfft(x); X[(F < lo) | (F >= hi)] = 0; return np.fft.irfft(X, len(x))
for k, x in (('music', m), ('sfx', s)):
    tot = (x ** 2).sum() + 1e-20; lo = (band(x, 0, 150) ** 2).sum()
    print(f'{k:5s}: {lufs(k):6.1f} LUFS dry, {100 * lo / tot:4.1f}% of energy below 150 Hz')
mh, sh = band(m, 250, 16000), band(s, 250, 16000)  # what a small speaker reproduces
def rms(x, a, b):
    a = int(max(0, a) * sr); b = int(min(LEN, b) * sr); return np.sqrt((x[a:b] ** 2).mean() + 1e-12) if b > a else 1e-6
rows = []
for e in meta['events']:
    t = e['t'] * K % LEN
    rows.append((20 * np.log10(rms(sh, t, t + 0.35) / rms(mh, t, t + 0.35)), t, e.get('what', '')[:60]))
if not rows: sys.exit('no events in the story (sound.events): nothing to compare per event')
rows.sort(); ds = np.array([r[0] for r in rows])
print(f'effect vs music above 250 Hz, per event (dB): median {np.median(ds):.1f}, 10th pct {np.percentile(ds, 10):.1f}, 90th {np.percentile(ds, 90):.1f}')
print('quietest 12:'); [print(f'  {d:6.1f} dB  {t:5.2f} s  {w}') for d, t, w in rows[:12]]
print('loudest 6:'); [print(f'  {d:6.1f} dB  {t:5.2f} s  {w}') for d, t, w in rows[-6:]]
