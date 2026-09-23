"""audio_check.py — is the film's sound in range?
usage: python3 audio_check.py film.mp4 [--starts 3.2,8.0,...] [--profile] [--silent] [--narrated [--lufs -16] [--stems qa]]

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
length, and fails if any sound got in.
--narrated: the film has a voice track, so the level targets are the narration ones (sound.md, "Narration"): about
-16 LUFS integrated (--lufs sets another, e.g. -14 for short-form uploads), true peak at or under -1 dBTP. The RMS level
and loudness range targets are for films without narration and are only reported.
--stems DIR (with --narrated): the folder `node render.mjs film.html --stems --dir DIR` wrote (stem_voice.wav,
stem_rest.wav, speech.json). Compares the two stems' momentary loudness (400 ms windows) while the voice speaks:
  under     how far the music, beds and effects sit under the voice, as the median over the speaking moments;
            target 15-20 dB (under 15 the music competes with the words, over 20 it vanishes), outside it warns
  masked    the moments the median hides: any stretch of 0.8 s or more while the voice speaks where the music and
            effects come within 10 dB of it (a loud cue or a bed swell on the words) warns, with its times"""
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
narrated = '--narrated' in args
target = float(opt('--lufs') or -16)
rms, peak = db(np.sqrt(np.mean(x ** 2))), db(np.abs(x).max())
if narrated:   # the voice sets the level: the engine brings the whole track to the target and limits the peaks
    line('INFO', 'level', f'mean {rms:.1f} dB, peak {peak:.1f} dB (narrated: judged by loudness and true peak below)')
else:
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
if lufs is not None and narrated:
    ok_l, ok_p = abs(lufs - target) <= 1, (tp if tp is not None else -99) <= -1
    line('PASS' if ok_l else 'WARN', 'loudness', f'{lufs:.1f} LUFS integrated (narrated target {target:.0f} ±1)'
         + ('' if ok_l else ' - the engine sets this itself: was the film built with its narration and rendered by render.mjs?'))
    line('PASS' if ok_p else 'WARN', 'truepeak', f'{tp} dBTP (narrated target -1 or lower)' + ('' if ok_p else ' - too hot for web delivery'))
    if lra is not None: line('INFO', 'range', f'loudness range {lra:.1f} LU (not judged for a narrated film: the voice sets the level)')
elif lufs is not None:
    line('WARN' if (tp or -99) > 0 else 'PASS', 'loudness', f'{lufs:.1f} LUFS integrated, range {lra} LU, true peak {tp} dBTP'
         + (' - true peak above 0 dBTP' if (tp or -99) > 0 else ''))
if lra is not None and not narrated:
    line('PASS' if lra >= 6 else 'WARN', 'range', f'loudness range {lra:.1f} LU (target 6 or more)'
         + ('' if lra >= 6 else ' - flat from start to end: give the climax a lift (sound.md, "Dynamics")'))

# music under the voice, from the two stems of a narrated film (render.mjs --stems)
if narrated and opt('--stems'):
    import os, re
    sd = opt('--stems')
    def momentary(f):   # [(end time of the 400 ms window, momentary loudness LUFS)] every 100 ms
        r = subprocess.run(['ffmpeg', '-nostats', '-v', 'verbose', '-i', f, '-af', 'ebur128=framelog=verbose', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
        return {round(float(t), 1): float(m) for t, m in re.findall(r't:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+)', r)}
    try:
        mv, mr = momentary(os.path.join(sd, 'stem_voice.wav')), momentary(os.path.join(sd, 'stem_rest.wav'))
        spans = json.load(open(os.path.join(sd, 'speech.json')))
    except (OSError, ValueError) as e:
        mv, mr, spans = {}, {}, []
        line('WARN', 'under', f'cannot read the stems in {sd} ({e}): write them with node render.mjs film.html --stems --dir {sd}')
    d = np.array([m - mr[t] for t, m in mv.items() if t in mr and m > -45 and any(a + 0.4 <= t <= b for a, b in spans)])
    if len(d) >= 5:
        med = float(np.median(d)); ok = 15 <= med <= 20
        line('PASS' if ok else 'WARN', 'under', f'music and effects {med:.1f} dB under the voice while it speaks (target 15-20; '
             f'closest 10% of moments {np.percentile(d, 10):.1f} dB)' + ('' if ok else ' - the music competes with the words: raise defineStory({ voice: { duck } }) or lower the beds'
             if med < 15 else ' - the music all but vanishes under the voice: lower defineStory({ voice: { duck } })'))
    elif mv:
        line('WARN', 'under', f'only {len(d)} speaking moments to compare: are these the stems of this film?')
    # stretches where the rest comes within 10 dB of the voice while it speaks (every 100 ms moment, 400 ms windows)
    close = sorted(t for t, m in mv.items() if t in mr and m > -45 and m - mr[t] < 10 and any(a + 0.4 <= t <= b for a, b in spans))
    runs, cur = [], []
    for t in close:
        if cur and t - cur[-1] > 0.15:
            runs.append(cur); cur = []
        cur.append(t)
    if cur:
        runs.append(cur)
    runs = [(r[0] - 0.4, r[-1]) for r in runs if r[-1] - r[0] + 0.4 >= 0.8]
    if len(d) >= 5:
        line('WARN' if runs else 'PASS', 'masked', f'{len(runs)} stretch{"es" if len(runs) != 1 else ""} where the music and effects come within 10 dB of the voice: '
             + ', '.join(f'{a:.1f}-{b:.1f} s' for a, b in runs[:8]) + ' - lower the cue or bed there, or move it off the words (cue_check.mjs lists loud cues on words)'
             if runs else 'the music and effects stay more than 10 dB under the voice throughout')

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
