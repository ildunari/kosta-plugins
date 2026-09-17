"""motion_check.py — how alive is a film?  usage: python3 motion_check.py film.mp4 [start_s] [dur_s]
Mean absolute change between frames at 192x108 grey, summed per drawing (2 frames). Targets: median >= 1.5, still < 5%.
Spikes: drawings that change more than 35 are listed. SNAP marks a run with any drawing above 75, or two in a row
above 55, at a transition that is not a hard cut: it moves too fast; soften its peak (a smaller ratio, a gentler curve).
Calibration: well-shaped arrivals (a lens snapping open over bright paper) peak at 50-63; the jarring v0.10 zooms were 90-137.
Pops: a frame-wide mean misses a mask edge that jumps (a lens opening in one drawing), so each drawing is also cut into
8x8 blocks; pops lists drawings where the share of blocks changing hard (> 40) jumps to 6% of the frame or more, and to
over 3x the drawing before: something appeared at once instead of growing in. Jerks: drawings that change more than
2.5x the drawing before (and more than 12); fine at a hard cut, a fault anywhere else. See references/motion.md, Speed limits."""
import subprocess, sys, numpy as np
path = sys.argv[1]; ss = sys.argv[2] if len(sys.argv) > 2 else '0'; dur = ['-t', sys.argv[3]] if len(sys.argv) > 3 else []
w, h = 192, 108
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', ss, '-i', path, *dur, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
if len(fr) < 3: sys.exit(f'motion_check: no frames read from {path} (still rendering, or not a video?)')
ad = np.abs(np.diff(fr, axis=0)); d = ad.mean(axis=(1, 2)); n = len(d) // 2 * 2
blk = ad[:, :104, :].reshape(len(ad), 13, 8, 24, 8).mean(axis=(2, 4)).reshape(len(ad), -1)   # 8x8 blocks
per = d[0:n:2] + d[1:n:2]
print(f'drawings {len(per)}  median {np.median(per):.2f}  p75 {np.percentile(per, 75):.2f}  still(<0.5) {(per < 0.5).mean():.0%}  max {per.max():.1f}')
print('per second:', ' '.join(f'{d[i * 24:(i + 1) * 24].mean() * 2:.1f}' for i in range(len(d) // 24)))
spk = [(i * 2 / 24 + float(ss), v) for i, v in enumerate(per) if v > 35]
runs, cur = [], []
for t, v in spk:
    if cur and t - cur[-1][0] > 0.09: runs.append(cur); cur = []
    cur.append((t, v))
if cur: runs.append(cur)
print('spikes (> 35 per drawing):', '  '.join(f"{r[0][0]:.2f}s " + '/'.join(f'{v:.0f}' for _, v in r) + (' SNAP' if any(v > 75 for _, v in r) or any(a > 55 and b > 55 for (_, a), (_, b) in zip(r, r[1:])) else '') for r in runs) or 'none')
sw = (np.maximum(blk[0:n:2], blk[1:n:2]) > 40).mean(axis=1) * 100   # % of the frame swept hard in each drawing
pops = [f'{i * 2 / 24 + float(ss):.2f}s {sw[i - 1]:.0f}%->{sw[i]:.0f}%' for i in range(1, len(sw)) if sw[i] >= 6 and sw[i] > 3 * max(sw[i - 1], 1)]
print('pops (swept area jumps from rest, % of frame):', '  '.join(pops) or 'none')
jerks = [f'{i * 2 / 24 + float(ss):.2f}s {per[i - 1]:.0f}->{per[i]:.0f}' for i in range(1, len(per)) if per[i] > 12 and per[i] > 2.5 * max(per[i - 1], 1)]
print('jerks (> 2.5x the drawing before; fine at hard cuts):', '  '.join(jerks) or 'none')
