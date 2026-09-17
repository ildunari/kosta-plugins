"""motion_check.py — how alive is a film?  usage: python3 motion_check.py film.mp4 [start_s] [dur_s]
Mean absolute change between frames at 192x108 grey, summed per drawing (2 frames). Targets: median >= 1.5, still < 5%."""
import subprocess, sys, numpy as np
path = sys.argv[1]; ss = sys.argv[2] if len(sys.argv) > 2 else '0'; dur = ['-t', sys.argv[3]] if len(sys.argv) > 3 else []
w, h = 192, 108
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', ss, '-i', path, *dur, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
if len(fr) < 3: sys.exit(f'motion_check: no frames read from {path} (still rendering, or not a video?)')
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2)); n = len(d) // 2 * 2
per = d[0:n:2] + d[1:n:2]
print(f'drawings {len(per)}  median {np.median(per):.2f}  p75 {np.percentile(per, 75):.2f}  still(<0.5) {(per < 0.5).mean():.0%}  max {per.max():.1f}')
print('per second:', ' '.join(f'{d[i * 24:(i + 1) * 24].mean() * 2:.1f}' for i in range(len(d) // 24)))
