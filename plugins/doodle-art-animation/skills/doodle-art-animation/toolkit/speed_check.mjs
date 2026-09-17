// speed_check.mjs — how fast is a film's camera and transition motion, measured from ENGINE VALUES (not pixels;
// motion_check.py stays the pixel-based check on a rendered clip).
// usage: node speed_check.mjs film.html [--json out.json]
//
// What it measures, per seam (a plate start after the first, i.e. every transition):
//   - the transition's own eased progress `p` (0..1) across its clock, sampled every 1/12 s of transition time
//     ("per drawing" — see "Units" below);
//   - the same scale / mask-edge / pan quantities TRANS[type] computes for its own xf (read via the engine's own
//     `window.__seamProbe(i, u)` hook, which reuses TRANS's own formulas — E, zlerp, lerp, coverR — rather than
//     re-implementing them): a camera-scale ratio (log-scale, so a 2x-in and a 2x-out read as the same size step),
//     a mask/edge travel in px (lens ring, iris curtain, shape window, page crease, roll edge, wipe front, the
//     falling-drop y of bleed), and a sheet-pan in px (the `pan` preset's own offset).
//   - each plate's own camera(t) across its whole life (`window.__camProbe(i, t)`: camOf() folded with the
//     engine's momentum()/entryShift() lean into and out of a cut — no transition xf), to catch a camera jump
//     within a plate and the camera's velocity just before/after every cut (a stall at a cut, motion.md /
//     film-grammar.md F8).
// `__seamProbe`'s numbers are the transition's OWN tunable ramp (dur, ease, k, dive, curve, ...); a plate's own
// camera move is a separate, additive thing on screen and is reported separately by the camera-jump lines, not
// multiplied into the seam number — see the header comment on the two hooks in engine.js for why.
//
// Units ("per drawing"). Transitions (and the half second on either side) render on ONES in the engine — a new
// drawing every raw frame (references/motion.md, "Transitions"). motion_check.py, however, always sums two
// consecutive raw frames into one "drawing" value, regardless of ones/twos — that is the unit its own numbers
// (median, spikes, SNAP) are calibrated in, and the unit motion.md's speed limits are written against. So this
// script samples engine values every 1/12 s (two raw frames' worth of transition time) and calls that a
// "drawing" too, to stay comparable — even though, during a transition, two engine drawings (1/24 s apart) fall
// inside that span. See "Calibration" below for the cross-check against motion_check.py on rendered clips.
//
// Verdicts, per (2-drawing) seam step, against references/motion.md "Speed limits" compounded over two true
// engine drawings (see "Doubling note" by the constants below):
//   scale    ok < ~10%, FAST ~10-13%, SNAP > ~18% log-scale change (motion.md: 5% per true drawing)
//   sheet pan (`pan`'s own motion-blurred slide)  ok < 500 px, FAST 500-650 px, SNAP > 900 px (motion.md: 250 px)
//   mask edge (lens, iris, shape window, wipe front, page crease, roll edge, the falling drop)
//            ok < 180 px near the transition's first/last ~3 drawings, < 400 px elsewhere; FAST to 1.3x; SNAP
//            beyond 1.8x (motion.md: 90 px near the ends, 200 px at the peak, per true drawing)
//   jerk     a drawing's rate more than 2.5x the one before it (and itself above the FAST line) is reported as a
//            jerk on top of whatever verdict the rate alone gets (mirrors motion_check.py's "jerks" line).
// Camera-jump section (a plate's ordinary life, mostly on twos: one true drawing per STEP) uses motion.md's own
// per-drawing numbers directly: scale ok < 5%, pan ok < 40 px, same FAST/SNAP shape.
// FAST is a warning: the shot is faster than the reference default, which is allowed — a film sets its own pace
// (references/motion.md, "Pace is a choice"). SNAP is the only failure: motion.md's own ceiling, "never snap or
// pop", crossed by a clear margin. `hard cut` / `cut` transitions (dur 0, or no `enter` at all) are exempt, same
// as motion_check.py's cut exemption.
//
// Camera-jump lines (informational, not part of the exit code): for each plate, the largest per-drawing scale/pan
// step from __camProbe across its own life, and, at every cut, the camera's speed in the last drawing before it
// and the first drawing after — flagged "stall?" when one side is clearly moving (> 15 px/s equivalent, i.e. more
// than about 1.25 px per drawing) and the other is near zero, the F8 shape in film-grammar.md. These are leads,
// like motion_check.py's pops/jerks: look at the actual drawings before calling a real problem.
//
// Exit codes: 0 clean (FAST allowed); 1 if any SNAP; 2 on a setup error (missing file, page error, no playwright).
//
// Calibration (re-derive by hand with the commands below; numbers are from the v0.13 toolkit):
//   story_example.js and story_one_drop.js (the shaped v0.12 seams, which motion_check.py already passes with no
//   SNAP) exit 0 here too, every seam `ok` (no FAST hit in either film — the shaped seams have real margin, not
//   just no SNAP). tests/doodle-art-animation/fixtures/story_snap.js has one healthy `lensIn` (reads `ok`) and one
//   deliberately-too-fast `zoom` (dur 0.25 s vs the 1.9 s / k4 minimum, linear ease instead of `arriveSoft`):
//   this script measures it at scale log-step 0.54 (SNAP ceiling 0.18) and exits 1 with SNAP.
//   Cross-check, rendering just that seam and running the pixel checker on it:
//     node render.mjs story_snap.html seam.mp4 --from 132 --to 165 && python3 motion_check.py seam.mp4
//   -> "spikes ... 0.50s 42/120 SNAP", "jerks ... 0.58s 42->120": motion_check.py's own SNAP line (a drawing
//   above 75, or two in a row above 55) trips at the same instant this script's peak drawing (2/3 of the zoom)
//   does. The same render/check on story_example.js's lensIn seam (`--from 384 --to 444`, seam 2 above, `ok`
//   here) gives motion_check.py "spikes ... 39/51/57" with no SNAP and no jerks — the two checks agree on which
//   seam is the problem, even though their units differ (this script: engine ratios/px; motion_check.py: mean
//   grey-level change per drawing).

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
  catch { console.error('speed_check: playwright not found (set DOODLE_NODE_MODULES or npm i -g playwright)'); process.exit(2); } }

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('usage: node speed_check.mjs film.html [--json out.json]'); process.exit(2); }
const jsonOut = (() => { const i = args.indexOf('--json'); return i >= 0 ? args[i + 1] : null; })();

// Doubling note: STEP (1/12 s) is ONE true engine drawing during a plate's ordinary life (twos, 12/s), but TWO
// true engine drawings during a transition (ones, 24/s — references/motion.md, "Transitions"). motion.md's
// speed-limit numbers (5% scale, 40/250 px pan, 90/200 px mask edge) are stated per true engine drawing. The
// per-seam metrics below always fall inside a transition, so their "ok" ceiling is motion.md's limit compounded
// over two drawings (roughly double for a small percentage, exactly double for a px distance); the camera-jump
// section (a plate's ordinary life) uses motion.md's numbers directly, one drawing per STEP.
const STEP = 1 / 12;                          // seconds per "drawing" — see header, "Units"
const SCALE = { ok: 0.10, fast: 0.13, snap: 0.18 };            // log-scale per (2-drawing) seam step; 5%+5% compounded ~= 0.0976
const PAN_BLUR = { ok: 500, fast: 650, snap: 900 };            // px per (2-drawing) seam step (`pan`'s own sheet-slide is always motion-blurred)
const MASK_EDGE = { ok: 180, fast: 234, snap: 324 };           // px per (2-drawing) seam step, near the transition's ends
const MASK_PEAK = { ok: 400, fast: 520, snap: 720 };           // px per (2-drawing) seam step, mid-transition
const CAM_SCALE = { ok: 0.05, fast: 0.065, snap: 0.09 };       // camera-jump section: one true drawing per STEP
const CAM_PAN = { ok: 40, fast: 52, snap: 72 };                // camera-jump section: one true drawing per STEP
const JERK_RATIO = 2.5;
const EDGE_DRAWINGS = 3;                      // "first and last three drawings" in motion.md, approximated in our unit

function verdict(v, lim) { return v > lim.snap ? 'SNAP' : v > lim.ok ? 'FAST' : 'ok'; }
const lnScale = (a, b) => Math.abs(Math.log(b / a));
const fmt = n => (Math.round(n * 100) / 100).toString();

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  const url = pathToFileURL(path.resolve(file)).href + '?render=1';
  try { await page.goto(url, { waitUntil: 'domcontentloaded' }); }
  catch (e) { console.error('speed_check: could not load', file, '-', e.message); await browser.close(); process.exit(2); }
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 }); }
  catch { console.error('speed_check: window.__ready never became true (page error?)', pageErrors.join('; ')); await browser.close(); process.exit(2); }
  const hasProbes = await page.evaluate(() => typeof window.__seamProbe === 'function' && typeof window.__camProbe === 'function');
  if (!hasProbes) { console.error('speed_check: window.__seamProbe / __camProbe not found — engine.js is missing the probe hooks'); await browser.close(); process.exit(2); }
  const info = await page.evaluate(() => window.__story);
  console.log(`${info.title}: ${info.starts.length} plates, ${info.frames} frames @ ${info.fps} fps`);

  let anySnap = false;
  const report = { film: file, seams: [], cameraJumps: [], cuts: [] };

  // ---- per-seam transition speed ----
  for (let i = 1; i < info.starts.length; i++) {
    const s = info.starts[i], type = s.type, dur = s.dur || 0;
    if (!type || type === 'cut' || dur <= 0) { console.log(`seam ${i} @ ${s.t.toFixed(2)}s: cut — exempt`); continue; }
    const n = Math.max(2, Math.round(dur / STEP) + 1);
    const us = Array.from({ length: n }, (_, k) => Math.min(1, k * STEP / dur));
    if (us[us.length - 1] < 1) us.push(1);
    const samples = await page.evaluate(([i, us]) => us.map(u => window.__seamProbe(i, u)), [i, us]);

    const metrics = [];   // { key, kind: 'scale'|'pan'|'mask', k, v, near }
    for (let k = 1; k < samples.length; k++) {
      const a = samples[k - 1], b = samples[k], nearEdge = k <= EDGE_DRAWINGS || k >= samples.length - EDGE_DRAWINGS;
      for (const key of ['scaleOld', 'scaleNew']) if (a[key] > 0 && b[key] > 0) metrics.push({ key, kind: 'scale', k, v: lnScale(a[key], b[key]) });
      for (const key of ['panOff']) if (a[key] != null && b[key] != null) metrics.push({ key, kind: 'pan', k, v: Math.abs(b[key] - a[key]) });
      for (const key of ['maskR', 'frontPos', 'creaseX', 'rollY', 'dropY']) if (a[key] != null && b[key] != null) metrics.push({ key, kind: nearEdge ? 'edge' : 'peak', k, v: Math.abs(b[key] - a[key]) });
    }
    // jerks: a metric's rate far above the one before it on the same key
    const byKey = {};
    for (const m of metrics) (byKey[m.key] ||= []).push(m);
    const jerks = [];
    for (const [key, ms] of Object.entries(byKey)) for (let j = 1; j < ms.length; j++)
      if (ms[j].v > (ms[j].kind === 'scale' ? SCALE.ok : ms[j].kind === 'pan' ? PAN_BLUR.ok : MASK_EDGE.ok) && ms[j].v > JERK_RATIO * Math.max(ms[j - 1].v, 1e-6))
        jerks.push(`${key}@${ms[j].k}`);

    let worst = { verdict: 'ok', v: 0, key: null, k: 0 };
    for (const m of metrics) {
      const lim = m.kind === 'scale' ? SCALE : m.kind === 'pan' ? PAN_BLUR : m.kind === 'edge' ? MASK_EDGE : MASK_PEAK;
      const vd = verdict(m.v, lim);
      const rank = { ok: 0, FAST: 1, SNAP: 2 };
      if (rank[vd] > rank[worst.verdict] || (rank[vd] === rank[worst.verdict] && m.v > worst.v)) worst = { verdict: vd, v: m.v, key: m.key, k: m.k };
    }
    if (jerks.length && worst.verdict === 'ok') worst = { ...worst, verdict: 'FAST' };
    if (worst.verdict === 'SNAP') anySnap = true;

    const peakByKey = {};
    for (const m of metrics) { const cur = peakByKey[m.key]; if (!cur || m.v > cur.v) peakByKey[m.key] = m; }
    const peakStr = Object.entries(peakByKey).map(([k, m]) => `${k} ${fmt(m.v)}${m.kind === 'scale' ? '' : 'px'}`).join(', ');
    console.log(`seam ${i} @ ${s.t.toFixed(2)}s (${type}, dur ${dur.toFixed(2)}s): ${worst.verdict}` +
      (worst.verdict !== 'ok' ? ` — ${worst.key} peak ${fmt(worst.v)} at drawing ${worst.k}/${n - 1}` : '') +
      (peakStr ? `  [${peakStr}]` : '') + (jerks.length ? `  jerks: ${jerks.join(', ')}` : ''));
    report.seams.push({ i, t: s.t, type, dur, verdict: worst.verdict, worst, peaks: peakByKey, jerks });
  }

  // ---- per-plate camera(t) across its life, and velocity just before/after each cut ----
  let lastCams = null;
  for (let i = 0; i < info.starts.length; i++) {
    const plDur = (info.starts[i + 1] ? info.starts[i + 1].t : info.frames / info.fps) - info.starts[i].t;
    const n = Math.max(2, Math.round(plDur / STEP) + 1);
    const ts = Array.from({ length: n }, (_, k) => Math.min(plDur, k * STEP));
    const cams = await page.evaluate(([i, ts]) => ts.map(t => window.__camProbe(i, t)), [i, ts]);
    let peak = { v: 0, kind: null };
    for (let k = 1; k < cams.length; k++) {
      const a = cams[k - 1], b = cams[k];
      const dScale = lnScale(Math.max(a.s, 1e-6), Math.max(b.s, 1e-6)), dPan = Math.hypot(b.dx - a.dx, b.dy - a.dy);
      if (dScale > peak.v && dScale > CAM_SCALE.ok) peak = { v: dScale, kind: 'scale' };
      if (dPan > peak.v && dPan > CAM_PAN.ok) peak = { v: dPan, kind: 'pan' };
    }
    if (peak.kind) { console.log(`camera plate ${i}: jump — ${peak.kind} ${fmt(peak.v)}${peak.kind === 'scale' ? '' : 'px'} per drawing`); report.cameraJumps.push({ i, ...peak }); }
    if (i > 0 && lastCams) {
      // "before" = the previous plate's own last two samples (its end); "after" = this plate's first two (its start).
      // A stall (F8) is only meaningful at a plain cut or no-carry hand-off: a lensIn/zoom/etc. is SUPPOSED to arrest
      // the old camera's momentum as part of its own effect (that ramp is __seamProbe's job, not this one's).
      const before = lastCams[lastCams.length - 1], justBefore = lastCams[lastCams.length - 2] || before;
      const prevSpeed = Math.hypot(before.dx - justBefore.dx, before.dy - justBefore.dy) / STEP;
      const after = cams[1] || cams[0], justAfter = cams[0];
      const afterSpeed = Math.hypot(after.dx - justAfter.dx, after.dy - justAfter.dy) / STEP;
      const cutLike = !info.starts[i].type || info.starts[i].type === 'cut';
      const stall = cutLike && ((prevSpeed > 15 && afterSpeed < 3) || (afterSpeed > 15 && prevSpeed < 3));
      console.log(`cut at plate ${i}: camera ${fmt(prevSpeed)} px/s before -> ${fmt(afterSpeed)} px/s after` + (stall ? '  stall? (F8)' : ''));
      report.cuts.push({ i, prevSpeed, afterSpeed, stall });
    }
    lastCams = cams;
  }

  await browser.close();
  if (jsonOut) { const fs = await import('fs'); fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2)); console.log('wrote', jsonOut); }
  process.exit(anySnap ? 1 : 0);
}
main().catch(e => { console.error('speed_check: error:', e && e.stack || e); process.exit(2); });
