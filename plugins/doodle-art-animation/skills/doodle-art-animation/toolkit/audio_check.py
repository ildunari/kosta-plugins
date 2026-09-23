"""audio_check.py — is the film's sound in range?
usage: python3 audio_check.py film.mp4 [--starts 3.2,8.0,...] [--profile] [--silent]

Measures the audio track with ffmpeg and numpy and prints PASS / WARN / FAIL lines.
  level     RMS mean (what `ffmpeg -af volumedetect` calls mean_volume), target -21..-18 dB
            (warns outside -21.5..-17.5; outside -23..-16 it also says to adjust gains)
  peak      sample peak, target about -3 dB (warn above -1 or below -6)
  loudness  EBU R128 integrated loudness and true peak (reported; warn if true peak > 0 dBTP)
  range     EBU R128 loudness range (LRA); below 6 LU warns: the film is flat from start to end, lift the climax
  clipping  runs of 6+ samples at full scale -> FAIL; runs of 3-5 -> WARN (decoding AAC near 0 dBFS
            can overshoot into a few full-scale samples without real clipping in the WAV)
  stereo    side/mid ratio; one channel, or channels the same (side/mid < -35 dB) -> FAIL, below -20 dB warns "nearly mono"
  silence   stretches of 1.5 s or more below -50 dBFS, or 0.5 s or more at the very start -> WARN
  duration  audio vs video length, difference over 0.2 s             -> FAIL
  cues      with --starts (transition times in seconds): the nearest sound onset to each; none within 0.25 s warns,
            unless the level swells instead: a climb of 6 dB or more within 0.5 s, starting in the transition's
            first 0.3 s. That is how the engine builds a seam (the riser stops, the bed ducks, the new plate's pad
            rises from zero), so its soft seams pass as a swell rather than warning for a missing attack.
Exit code 1 only on hard failures (no audio, mono, clipping, duration mismatch). --profile prints dB per second.
--silent: the film was made with defineStory({ silent: true }); it passes when the track is silence of the right
length, and fails if any sound got in."""
import json, subprocess, sys
import numpy as np

args = sys.argv[1:]
if not args or args[0].startswith('-'):
    sys.exit(__doc__)
path = args[0]
opt = lambda k: args[args.index(k) + 1] if k in args and args.index(k) + 1 < len(args) else None
starts = [float(s) for s in (opt('--starts') or '').split(',') if s.strip()]
fails, warns = [], []
def line(kind, name, msg):
    print(f'{kind:<5} {name:<9} {msg}')
    (fails if kind == 'FAIL' else warns if kind == 'WARN' else []).append(name)
db = lambda x: 20 * np.log10(max(float(x), 1e-10))

probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
                                  capture_output=True, text=True).stdout or '{}')
streams = probe.get('streams', [])
if not streams:
    sys.exit(f'audio_check: cannot read {path}')
aud = [s for s in streams if s['codec_type'] == 'audio']
vid = [s for s in streams if s['codec_type'] == 'video' and s.get('disposition', {}).get('attached_pic') != 1]
if not aud:
    line('FAIL', 'audio', 'no audio stream')
    sys.exit(1)
a = aud[0]; ch, sr = int(a['channels']), int(a['sample_rate'])
print(f'{path}: {a["codec_name"]} {sr} Hz, {ch} ch' + (f', video {vid[0]["codec_name"]}' if vid else ''))

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-map', '0:a:0', '-f', 's16le', '-acodec', 'pcm_s16le', '-'],
                     capture_output=True).stdout
x = np.frombuffer(raw, np.int16).reshape(-1, ch).astype(np.float32) / 32768
if len(x) < sr * 0.1:
    line('FAIL', 'audio', 'audio stream is empty')
    sys.exit(1)
adur = len(x) / sr

if '--silent' in args:
    # the engine renders silence in stereo; a one-channel file means the render or the encode collapsed it
    if ch < 2:
        line('FAIL', 'stereo', 'mono file (1 channel): a silent film still carries a stereo track')
    pk = db(np.abs(x).max())
    line('PASS' if pk < -60 else 'FAIL', 'silent', f'peak {pk:.1f} dB' + ('' if pk < -60 else ' - the film was made silent, but sound got in'))
    vdur = float(vid[0].get('duration') or probe['format']['duration']) if vid else adur
    line('FAIL' if vid and abs(adur - vdur) > 0.2 else 'PASS', 'duration', f'audio {adur:.2f} s, video {vdur:.2f} s')
    print(f'result: {"FAIL" if fails else "PASS"} ({len(fails)} fail, 0 warn)')
    sys.exit(1 if fails else 0)

# level and peak
rms, peak = db(np.sqrt(np.mean(x ** 2))), db(np.abs(x).max())
line('PASS' if -21.5 <= rms <= -17.5 else 'WARN', 'level',
     f'mean {rms:.1f} dB (target -21..-18)' + ('' if -23 <= rms <= -16 else ' - out of range, adjust cue gains / music gain'))
line('PASS' if -6 <= peak <= -1 else 'WARN', 'peak',
     f'peak {peak:.1f} dB (target about -3)' + (' - too hot, little headroom' if peak > -1 else ' - quiet, room to raise' if peak < -6 else ''))

# EBU R128
er = subprocess.run(['ffmpeg', '-nostats', '-v', 'info', '-i', path, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                    capture_output=True, text=True).stderr
summ = er[er.rfind('Summary:'):]
grab = lambda key: next((float(l.split(':')[1].split()[0]) for l in summ.splitlines() if l.strip().startswith(key + ':')), None)
lufs, lra, tp = grab('I'), grab('LRA'), grab('Peak')
if lufs is not None:
    line('WARN' if (tp or -99) > 0 else 'PASS', 'loudness', f'{lufs:.1f} LUFS integrated, range {lra} LU, true peak {tp} dBTP'
         + (' - true peak above 0 dBTP' if (tp or -99) > 0 else ''))
if lra is not None:
    line('PASS' if lra >= 6 else 'WARN', 'range', f'loudness range {lra:.1f} LU (target 6 or more)'
         + ('' if lra >= 6 else ' - flat from start to end: give the climax a lift (sound.md, "Dynamics")'))

# clipping: consecutive samples at full scale. 6+ is real clipping; 3-5 can be AAC decode overshoot near 0 dBFS.
full = np.abs(x) >= 0.999
long_runs = short_runs = 0
for c in range(ch):
    e = np.diff(np.r_[0, full[:, c].astype(np.int8), 0])
    n = np.flatnonzero(e == -1) - np.flatnonzero(e == 1)
    long_runs += int(np.sum(n >= 6)); short_runs += int(np.sum((n >= 3) & (n < 6)))
nfull = int(full.sum())
if long_runs:
    line('FAIL', 'clipping', f'{long_runs} clipped runs of 6+ samples ({nfull} samples at full scale)')
elif short_runs:
    line('WARN', 'clipping', f'{short_runs} short full-scale runs (3-5 samples): likely AAC overshoot near 0 dBFS, lower the peak')
else:
    line('PASS', 'clipping', f'none ({nfull} isolated full-scale samples)')

# stereo
if ch < 2:
    line('FAIL', 'stereo', 'mono file (1 channel)')
else:
    L, R = x[:, 0], x[:, 1]
    side = db(np.sqrt(np.mean(((L - R) / 2) ** 2))) - db(np.sqrt(np.mean(((L + R) / 2) ** 2)))
    corr = float(np.corrcoef(L, R)[0, 1]) if L.std() > 0 and R.std() > 0 else 1.0
    bal = db(np.sqrt(np.mean(L ** 2))) - db(np.sqrt(np.mean(R ** 2)))
    if side < -35 or corr >= 0.998:
        line('FAIL', 'stereo', f'left and right are the same (side/mid {side:.0f} dB, correlation {corr:.3f}): mono in a stereo file')
    else:
        line('PASS' if side >= -20 and abs(bal) <= 3 else 'WARN', 'stereo',
             f'side/mid {side:.1f} dB, L/R correlation {corr:.2f}, balance L-R {bal:+.1f} dB'
             + (' - nearly mono' if side < -20 else '') + (' - lopsided' if abs(bal) > 3 else ''))

# silence: 50 ms windows
win = sr // 20
nw = len(x) // win
wr = np.sqrt((x[:nw * win] ** 2).mean(axis=1).reshape(nw, win).mean(axis=1))
wdb = 20 * np.log10(np.maximum(wr, 1e-10))
quiet, gaps, i = wdb < -50, [], 0
while i < nw:
    if quiet[i]:
        j = i
        while j < nw and quiet[j]: j += 1
        if (j - i) * 0.05 >= 1.5 or (i == 0 and (j - i) * 0.05 >= 0.5): gaps.append((i * 0.05, j * 0.05))
        i = j
    else: i += 1
if gaps:
    line('WARN', 'silence', ', '.join(f'{s:.1f}-{e:.1f} s' for s, e in gaps[:8]) + (' ...' if len(gaps) > 8 else ''))
else:
    line('PASS', 'silence', 'no silent stretch of 1.5 s or more')

# duration
if vid:
    vdur = float(vid[0].get('duration') or probe['format']['duration'])
    diff = adur - vdur
    line('FAIL' if abs(diff) > 0.2 else 'PASS', 'duration', f'audio {adur:.2f} s, video {vdur:.2f} s (diff {diff:+.2f} s)')
else:
    line('INFO', 'duration', f'audio {adur:.2f} s (no video stream)')

# cue timing: onsets = a 50 ms window at least 6 dB above the previous 250 ms
if starts:
    prev = np.array([wdb[max(0, k - 5):k].mean() if k else wdb[0] for k in range(nw)])
    on = np.where((wdb - prev >= 6) & (wdb > -45))[0] * 0.05
    def swell(s):
        """the biggest climb (dB) from a window starting in [s - 0.1, s + 0.3] s to the loudest window up to 0.5 s later"""
        best = None
        for i in range(max(0, int(round((s - 0.1) / 0.05))), min(nw - 2, int(round((s + 0.3) / 0.05))) + 1):
            seg = wdb[i + 1:i + 11]
            j = int(np.argmax(seg))
            if seg[j] > -45 and (best is None or seg[j] - wdb[i] > best[0]):
                best = (float(seg[j] - wdb[i]), i * 0.05 - s, (i + 1 + j) * 0.05 - s)
        return best
    for s in starts:
        near = on[np.abs(on - s) <= 0.5]
        d = near[np.argmin(np.abs(near - s))] - s if len(near) else None
        sw = swell(s) if d is None or abs(d) > 0.25 else None
        if d is not None and abs(d) <= 0.25:
            line('PASS', 'cues', f'transition {s:.2f} s: nearest onset {d:+.2f} s')
        elif sw and sw[0] >= 6:
            line('PASS', 'cues', f'transition {s:.2f} s: swells {sw[0]:.0f} dB from {sw[1]:+.2f} s to {sw[2]:+.2f} s (a soft seam, no sharp onset)')
        elif d is not None:
            line('WARN', 'cues', f'transition {s:.2f} s: nearest onset {d:+.2f} s')
        else:
            line('WARN', 'cues', f'transition {s:.2f} s: no clear sound onset or swell within 0.5 s')

if '--profile' in args:
    print('dB per second:', ' '.join(f'{20 * np.log10(max(np.sqrt((x[k * sr:(k + 1) * sr] ** 2).mean()), 1e-10)):.0f}'
                                     for k in range(int(adur))))
print(f'result: {"FAIL" if fails else "WARN" if warns else "PASS"} ({len(fails)} fail, {len(warns)} warn)')
sys.exit(1 if fails else 0)
