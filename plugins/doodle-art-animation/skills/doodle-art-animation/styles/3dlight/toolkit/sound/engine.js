// 3DLight sound engine: the INSTRUMENTS and the offline renderer. Everything is synthesized with Web Audio in an
// OfflineAudioContext from seeded noise, so a film's sound is deterministic and needs no audio files.
//
// The split (keep it clean when the palette is replaced):
//   sound/engine.js   this file. Engine = the instrument palette (pad, bass, keys, mallet, chime; whoosh, tick, thump,
//                     pop, shimmer, swell, glide, hum, flow; kick, shaker, rim) and the mix (music and effects buses,
//                     glue compressor, limiter, a small room reverb). renderSound / renderStems render a film.
//   sound/score.js    the arranger: turns the story's music settings into a bed (pad, bass, arpeggio: one chord per
//                     beat, two bars per beat) and a soft rhythm, then calls the story's cues.
//   story.sound       the film's own settings: seed, music (chords per beat ...), rhythm, events, cues(E, o, ev, U).
// A new palette may change how instruments sound, but should keep their names and arguments (references/api.md,
// "Sound"), so existing cues keep working.
//
// Seamless loop: a looping film's score is played twice in one render (after a PRE lead-in) and only the second pass is
// kept, so reverb tails and held notes from the end of the loop flow into its start exactly as they will on repeat.
// A film that is not a loop is played once, kept from PRE, with a short fade at the very end.
// Taken from the booth loops' sound_l3d.js (2026-10-09); the instruments and the mix are unchanged.
(() => {
const SR = 48000, PRE = 3; // PRE: lead-in so cues just before a pass start stay at t >= 0
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

class Engine {
  constructor(ctx, seed = 7, stems = false) {
    this.ctx = ctx; this.r = rng(seed);
    const c = ctx;
    // master: bus sum -> gentle glue compressor -> soft ceiling -> out
    this.master = c.createGain(); this.master.gain.value = 1;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 2.2; comp.attack.value = 0.03; comp.release.value = 0.3;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.12;
    if (stems) { // analysis only: dry music bus -> channels 0-1, dry effects bus -> channels 2-3, no compressors
      c.destination.channelInterpretation = 'discrete'; this.merger = c.createChannelMerger(4); this.merger.connect(c.destination);
    } else { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 32; hp.Q.value = 0.7; this.master.connect(hp); hp.connect(comp); comp.connect(lim); lim.connect(c.destination); }
    // a small, soft room: long enough to glue, short enough to stay clean
    this.rev = c.createConvolver(); this.rev.buffer = this.impulse(2.4, 2.2);
    const revLP = c.createBiquadFilter(); revLP.type = 'lowpass'; revLP.frequency.value = 5200;
    const revOut = c.createGain(); revOut.gain.value = 0.42;
    this.rev.connect(revLP); revLP.connect(revOut); revOut.connect(this.master);
    // buses
    // music bus: a little less low end (booth screens have small speakers, and bass there only muddies)
    this.music = c.createGain(); this.music.gain.value = 1;
    const mShelf = c.createBiquadFilter(); mShelf.type = 'lowshelf'; mShelf.frequency.value = 120; mShelf.gain.value = -4;
    this.music.connect(mShelf); const musicOut = mShelf;
    // effects bus: less low end and a gentle compressor so quiet and loud cues sit closer together. Web Audio's
    // compressor adds its own make-up gain (about +8 dB at these settings), which lifts the effects, so the output
    // is trimmed 2 dB: effects land ~4 dB under the music overall (they measured ~12 dB under it before)
    this.sfx = c.createGain(); this.sfx.gain.value = 1;
    const sShelf = c.createBiquadFilter(); sShelf.type = 'lowshelf'; sShelf.frequency.value = 140; sShelf.gain.value = -6;
    const sComp = c.createDynamicsCompressor(); sComp.threshold.value = -30; sComp.knee.value = 8; sComp.ratio.value = 3; sComp.attack.value = 0.004; sComp.release.value = 0.18;
    const sfxOut = c.createGain(); sfxOut.gain.value = Math.pow(10, -2 / 20);
    this.sfx.connect(sShelf); sShelf.connect(sComp); sComp.connect(sfxOut);
    // library effects (E.fx) get the same shelf and compressor on a bus of their own. They come in 12 dB down (FX_TRIM),
    // so most sit under the threshold and g stays linear, and leave 6 dB up, so a cue at g 1 sits about level with
    // the default bed around it. The classic instruments above keep their old mix.
    this.sfxLib = c.createGain(); this.sfxLib.gain.value = 1;
    const lShelf = c.createBiquadFilter(); lShelf.type = 'lowshelf'; lShelf.frequency.value = 140; lShelf.gain.value = -6;
    const lComp = c.createDynamicsCompressor(); lComp.threshold.value = -30; lComp.knee.value = 8; lComp.ratio.value = 3; lComp.attack.value = 0.004; lComp.release.value = 0.18;
    const libOut = c.createGain(); libOut.gain.value = Math.pow(10, 6 / 20);
    this.sfxLib.connect(lShelf); lShelf.connect(lComp); lComp.connect(libOut); libOut.connect(sfxOut);
    if (stems) [musicOut, sfxOut].forEach((bus, k) => { const sp = c.createChannelSplitter(2); bus.connect(sp); sp.connect(this.merger, 0, 2 * k); sp.connect(this.merger, 1, 2 * k + 1); });
    else { musicOut.connect(this.master); sfxOut.connect(this.master); }
    // seeded noise, 4 s, two channels for stereo air
    this.noise = c.createBuffer(2, SR * 4, SR); const nr = rng(seed + 99);
    for (let ch = 0; ch < 2; ch++) { const d = this.noise.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = nr() * 2 - 1; }
    this.noiseOff = 0;
  }
  impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(SR * sec), b = c.createBuffer(2, n, SR), r = rng(4242);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) { const t = i / n; d[i] = (r() * 2 - 1) * Math.pow(1 - t, decay) * (i < SR * 0.012 ? i / (SR * 0.012) : 1); } }
    return b;
  }
  // route a node to a bus with pan and reverb send
  out(node, bus, pan = 0, send = 0.25) {
    const c = this.ctx; const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); p.connect(bus);
    if (send > 0) { const s = c.createGain(); s.gain.value = send; p.connect(s); s.connect(this.rev); }
    return p;
  }
  env(g, t, a, peak, hold, rel, curve = 'exp') { // attack-hold-release envelope on an AudioParam
    g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(peak, t + a);
    if (hold > 0) g.setValueAtTime(peak, t + a + hold);
    if (curve === 'exp') g.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); else g.linearRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  osc(type, f, t0, t1, detune = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune; o.start(t0); o.stop(t1 + 0.05); return o; }
  noiseSrc(t0, t1) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const off = (this.noiseOff = (this.noiseOff + 0.731) % 3.5); s.start(t0, off); s.stop(t1 + 0.05); return s; }

  // ---------------- music ----------------
  // warm pad: two detuned saws + a sine per note, lowpassed, slow swell
  pad(t0, dur, notes, o = {}) {
    const c = this.ctx, gain = o.gain ?? 0.016, att = o.att ?? 1.4, rel = o.rel ?? 2.2, cut = o.cut ?? 1100;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4; lp.frequency.setValueAtTime(cut * 0.7, t0); lp.frequency.linearRampToValueAtTime(cut, t0 + dur * 0.5); lp.frequency.linearRampToValueAtTime(cut * 0.75, t0 + dur + rel);
    const g = c.createGain(); this.env(g.gain, t0, att, 1, Math.max(0, dur - att), rel, 'lin'); lp.connect(g);
    this.out(g, this.music, 0, o.send ?? 0.35);
    notes.forEach((m, k) => {
      const f = mtof(m), pan = ((k % 2) ? 1 : -1) * (0.15 + 0.1 * k);
      const ng = c.createGain(); ng.gain.value = gain; const pp = c.createStereoPanner(); pp.pan.value = Math.max(-0.8, Math.min(0.8, pan)); ng.connect(pp); pp.connect(lp);
      [[-7, 'sawtooth', 0.5], [6, 'sawtooth', 0.5], [0, 'sine', 1.3]].forEach(([dt, ty, a]) => { const ob = this.osc(ty, f, t0, t0 + dur + rel, dt); const og = c.createGain(); og.gain.value = a; ob.connect(og); og.connect(ng); });
    });
  }
  bass(t0, dur, m, o = {}) {
    const c = this.ctx, f = mtof(m), g = c.createGain(); this.env(g.gain, t0, 0.5, o.gain ?? 0.05, Math.max(0, dur - 0.5), 1.4, 'lin');
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(g); this.out(g, this.music, 0, 0.08);
    const a = this.osc('sine', f, t0, t0 + dur + 1.4); a.connect(lp); const b = this.osc('triangle', f * 2, t0, t0 + dur + 1.4); const bg = c.createGain(); bg.gain.value = 0.22; b.connect(bg); bg.connect(lp);
  }
  // felt piano: soft hammer, warm harmonics, quick-ish decay
  keys(t, m, vel = 0.5, o = {}) {
    const c = this.ctx, f = mtof(m), dec = o.dec ?? (1.9 - (m - 60) * 0.02);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900 + 2600 * vel, t); lp.frequency.exponentialRampToValueAtTime(700 + 600 * vel, t + dec);
    const g = c.createGain(); this.env(g.gain, t, 0.006, 0.09 * vel * (o.gain ?? 1), 0, dec); lp.connect(g); this.out(g, o.bus || this.music, o.pan ?? 0, o.send ?? 0.3);
    [[1, 1, 0], [2, 0.32, 3], [3, 0.1, -4], [4, 0.04, 2]].forEach(([h, a, dt]) => { const ob = this.osc('sine', f * h, t, t + dec + 0.1, dt); const og = c.createGain(); og.gain.value = a; ob.connect(og); og.connect(lp); });
    const n = this.noiseSrc(t, t + 0.03), nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = Math.min(4000, f * 3); nf.Q.value = 1.2; const ng = c.createGain(); this.env(ng.gain, t, 0.002, 0.012 * vel, 0, 0.03); n.connect(nf); nf.connect(ng); ng.connect(lp);
  }
  // glass mallet: bright attack, upper partials die fast, round body
  mallet(t, m, vel = 0.5, o = {}) {
    const c = this.ctx, f = mtof(m), dec = o.dec ?? 1.5;
    const g = c.createGain(); g.gain.value = 1; this.out(g, o.bus || this.music, o.pan ?? 0, o.send ?? 0.32);
    [[1, 1, dec], [3.98, 0.22, dec * 0.18], [9.1, 0.06, dec * 0.06], [2, 0.12, dec * 0.5]].forEach(([h, a, d]) => {
      const ob = this.osc('sine', f * h, t, t + d + 0.1); const og = c.createGain(); this.env(og.gain, t, 0.003, 0.085 * vel * a * (o.gain ?? 1), 0, d); ob.connect(og); og.connect(g);
    });
  }
  // FM bell for key moments
  chime(t, m, vel = 0.5, o = {}) {
    const c = this.ctx, f = mtof(m), dec = o.dec ?? 3.2;
    const car = this.osc('sine', f, t, t + dec), mod = this.osc('sine', f * 3.5, t, t + dec), mi = c.createGain();
    mi.gain.setValueAtTime(f * 1.4, t); mi.gain.exponentialRampToValueAtTime(f * 0.05, t + dec * 0.6); mod.connect(mi); mi.connect(car.frequency);
    const g = c.createGain(); this.env(g.gain, t, 0.004, 0.06 * vel * (o.gain ?? 1), 0, dec); car.connect(g); this.out(g, o.bus || this.sfx, o.pan ?? 0, o.send ?? 0.45);
  }

  // ---------------- effects ----------------
  whoosh(t, dur, f0, f1, gain = 0.05, o = {}) {
    const c = this.ctx, n = this.noiseSrc(t, t + dur), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = o.q ?? 0.9;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * (o.peak ?? 0.55)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); const p = this.out(g, this.sfx, o.pan ?? 0, o.send ?? 0.3);
    if (o.panTo != null) { p.pan.setValueAtTime(o.pan ?? 0, t); p.pan.linearRampToValueAtTime(o.panTo, t + dur); }
  }
  tick(t, f = 2400, gain = 0.03, o = {}) {
    const c = this.ctx, n = this.noiseSrc(t, t + 0.02), hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = f; hp.Q.value = 2.5;
    const g = c.createGain(); this.env(g.gain, t, 0.0008, gain, 0, 0.018); n.connect(hp); hp.connect(g); this.out(g, this.sfx, o.pan ?? 0, o.send ?? 0.12);
    const b = this.osc('sine', f * 0.5, t, t + 0.06), bg = c.createGain(); this.env(bg.gain, t, 0.001, gain * 0.5, 0, 0.045); b.connect(bg); this.out(bg, this.sfx, o.pan ?? 0, 0.1);
  }
  thump(t, gain = 0.12, o = {}) {
    const c = this.ctx, f0 = o.f0 ?? 120, f1 = o.f1 ?? 48, s = this.osc('sine', f0, t, t + 0.6); s.frequency.exponentialRampToValueAtTime(f1, t + 0.22);
    const g = c.createGain(); this.env(g.gain, t, 0.004, gain, 0, o.dec ?? 0.45); s.connect(g); this.out(g, this.sfx, o.pan ?? 0, 0.08);
    const n = this.noiseSrc(t, t + 0.12), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.body ?? 600; const ng = c.createGain(); this.env(ng.gain, t, 0.002, gain * 0.35, 0, 0.1); n.connect(lp); lp.connect(ng); this.out(ng, this.sfx, o.pan ?? 0, 0.12);
  }
  pop(t, f = 700, gain = 0.05, o = {}) { // soft bubble: quick upward sweep
    const c = this.ctx, up = o.down ? 0.45 : 1.7, s = this.osc('sine', f, t, t + 0.25); s.frequency.setValueAtTime(f * (o.down ? 1.4 : 0.65), t); s.frequency.exponentialRampToValueAtTime(f * up, t + (o.len ?? 0.06));
    const g = c.createGain(); this.env(g.gain, t, 0.004, gain, 0, o.dec ?? 0.12); s.connect(g); this.out(g, this.sfx, o.pan ?? 0, o.send ?? 0.3);
  }
  shimmer(t, dur, notes, gain = 0.012, o = {}) { // high, soft cluster that swells and fades
    const c = this.ctx, g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * (o.peak ?? 0.4)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    this.out(g, this.sfx, o.pan ?? 0, o.send ?? 0.6);
    notes.forEach((m, k) => { const s = this.osc('sine', mtof(m), t, t + dur, (k % 2 ? 4 : -4)); const tr = c.createGain(); tr.gain.value = 0.6; const lfo = this.osc('sine', 3.1 + k * 0.7, t, t + dur); const lg = c.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(tr.gain); s.connect(tr); tr.connect(g); });
  }
  swell(t, dur, f0, f1, gain = 0.04, o = {}) { // filtered noise + tone rising (or falling)
    const c = this.ctx, n = this.noiseSrc(t, t + dur), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(f0, t); lp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * (o.peak ?? 0.85)); g.gain.linearRampToValueAtTime(0.0001, t + dur); n.connect(lp); lp.connect(g); this.out(g, this.sfx, o.pan ?? 0, o.send ?? 0.35);
    if (o.tone) { const s = this.osc('sine', o.tone[0], t, t + dur); s.frequency.exponentialRampToValueAtTime(o.tone[1], t + dur); const sg = c.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(gain * 0.5, t + dur * (o.peak ?? 0.85)); sg.gain.linearRampToValueAtTime(0.0001, t + dur); s.connect(sg); this.out(sg, this.sfx, o.pan ?? 0, 0.4); }
  }
  glide(t, dur, f0, f1, gain = 0.02, o = {}) { // soft travelling tone (a dot or particle moving)
    const c = this.ctx, s = this.osc(o.type ?? 'triangle', f0, t, t + dur); s.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut ?? 1800; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.15, dur * 0.3)); g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(lp); lp.connect(g); const p = this.out(g, this.sfx, o.pan ?? 0, o.send ?? 0.4);
    if (o.panTo != null) { p.pan.setValueAtTime(o.pan ?? 0, t); p.pan.linearRampToValueAtTime(o.panTo, t + dur); }
    if (o.wobble) { const l = this.osc('sine', o.wobble, t, t + dur); const lg = c.createGain(); lg.gain.value = f0 * 0.04; l.connect(lg); lg.connect(s.frequency); }
  }
  hum(t, dur, f = 70, gain = 0.03, o = {}) { // low warm hum (heater, machine at rest)
    const c = this.ctx, g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + (o.att ?? dur * 0.4)); g.gain.setValueAtTime(gain, t + dur - (o.rel ?? 0.6)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut ?? 360; lp.connect(g); this.out(g, this.sfx, o.pan ?? 0, 0.15);
    [[1, 1], [2, 0.35], [3, 0.12]].forEach(([h, a]) => { const s = this.osc('sine', f * h, t, t + dur); const sg = c.createGain(); sg.gain.value = a; s.connect(sg); sg.connect(lp); });
    if (o.air) { const n = this.noiseSrc(t, t + dur), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.air; bp.Q.value = 0.7; const ng = c.createGain(); ng.gain.value = 0.5; n.connect(bp); bp.connect(ng); ng.connect(lp.frequency.value > 1000 ? lp : g); }
  }
  // ---------------- soft percussion ----------------
  kick(t, gain = 0.09) { this.thump(t, gain, { f0: 92, f1: 44, dec: 0.32, body: 220 }); }
  shaker(t, gain = 0.012, pan = 0.3) {
    const c = this.ctx, n = this.noiseSrc(t, t + 0.08), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const g = c.createGain(); this.env(g.gain, t, 0.006, gain, 0, 0.055); n.connect(hp); hp.connect(g); this.out(g, this.music, pan, 0.08);
  }
  rim(t, gain = 0.02, pan = -0.25) { // a soft wooden knock
    const c = this.ctx, s = this.osc('triangle', 820, t, t + 0.08); s.frequency.exponentialRampToValueAtTime(560, t + 0.04);
    const g = c.createGain(); this.env(g.gain, t, 0.001, gain, 0, 0.06); s.connect(g); this.out(g, this.music, pan, 0.18);
    const n = this.noiseSrc(t, t + 0.02), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 3; const ng = c.createGain(); this.env(ng.gain, t, 0.0008, gain * 0.6, 0, 0.015); n.connect(bp); bp.connect(ng); this.out(ng, this.music, pan, 0.1);
  }
  flow(t, dur, gain = 0.03, o = {}) { // pulsing low current (blood flow)
    const c = this.ctx, n = this.noiseSrc(t, t + dur), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut ?? 520; lp.Q.value = 0.8;
    const am = c.createGain(); am.gain.value = 0.55; const l = this.osc('sine', o.rate ?? 1.2, t, t + dur); const lg = c.createGain(); lg.gain.value = 0.45; l.connect(lg); lg.connect(am.gain);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + (o.att ?? 0.8)); g.gain.setValueAtTime(gain, t + dur - (o.rel ?? 0.8)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(lp); lp.connect(am); am.connect(g); this.out(g, this.sfx, o.pan ?? 0, 0.25);
  }
}
// A shared-library effect (sfxlib.js, inlined by build.py before this file): E.fx('siliconeTap', t, { g, pan, pitch,
// size, dur, key, seed, send }) schedules SFXLIB.fx[name](ctx, effects bus, t, opts). g = 1 is the library's standard
// level; FX_TRIM lowers it 12 dB on the way into the library bus (this.sfxLib), so a g 1 peak (-15 dBFS in the
// library) reaches its compressor at about -27 dBFS, inside the soft knee. Without the trim every library effect sat
// 15 dB over the threshold and the 3:1 compressor squashed g: halving it lowered the cue only 2.5 dB. Now g 0.5 is
// about 6 dB quieter, as the library says. send (default 0) adds some of the room reverb. Without a seed, the effect gets its
// number among the library effects of this pass (SCORE.play resets the count per pass), so both passes of a loop
// play the same sound and a re-render is identical. An unknown name stops the render with an error.
const FX_TRIM = Math.pow(10, -12 / 20);
Engine.prototype.fx = function (name, t, o = {}) {
  const lib = typeof SFXLIB === 'object' && SFXLIB && SFXLIB.fx ? SFXLIB : null;
  if (!lib) throw new Error(`sound: effect '${name}' needs the shared sound library; copy sound-library/sfxlib.js to the toolkit as sfxlib.js and rebuild`);
  const f = lib.fx[name];
  if (typeof f !== 'function') throw new Error(`sound: no effect '${name}' in the shared sound library (it has ${Object.keys(lib.fx).length}; see sound-library/catalog.md)`);
  this.fxCount = (this.fxCount || 0) + 1;
  const { send = 0, ...opts } = o; if (opts.seed == null) opts.seed = this.fxCount;
  opts.g = (opts.g ?? 1) * FX_TRIM;
  let out = this.sfxLib;
  if (send > 0) { out = this.ctx.createGain(); out.connect(this.sfxLib); const s = this.ctx.createGain(); s.gain.value = send; out.connect(s); s.connect(this.rev); }
  f(this.ctx, out, t, opts);
};

// A library voice on the music bus (or on `bus`, such as a ducked bed group): E.voice('glassPad', t, { notes, dur, g }).
// The beds in score.js play the library's instrument voices through it. Seeds count per pass like E.fx, separately.
Engine.prototype.voice = function (name, t, o = {}, bus = null) {
  const lib = typeof SFXLIB === 'object' && SFXLIB && SFXLIB.fx ? SFXLIB : null, f = lib && lib.fx[name];
  if (typeof f !== 'function') throw new Error(`sound: the music bed needs the library voice '${name}' (sound-library/sfxlib.js, copied into the toolkit as sfxlib.js)`);
  this.voiceCount = (this.voiceCount || 0) + 1;
  const { send = 0, ...opts } = o; if (opts.seed == null) opts.seed = 7919 + this.voiceCount;
  let out = bus || this.music;
  if (send > 0) { const g = this.ctx.createGain(); g.connect(out); const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.rev); out = g; }
  f(this.ctx, out, t, opts);
};

// music timing for a film: two bars per visual beat, four quarter notes per bar (4.5 s beats: 106.7 BPM, 2.25 s bars)
function timing(info) { const BPM = 480 / info.BEAT, Q = 60 / BPM, BAR = 4 * Q; return { BPM, Q, BAR, VB: 2 * BAR, LEN: info.LEN, N: info.N, K: info.BEAT / info.ART }; }
window.SOUND_ENGINE = { Engine, mtof, rng, SR, PRE, timing };

function filmParts(film) {
  film = film || window.FILM; const info = window.FILM_INFO;
  if (!film || !info) throw new Error('renderSound: no film (load a story that calls defineFilm first)');
  if (!window.SCORE) throw new Error('renderSound: sound/score.js is not loaded');
  const loop = info.loop, LEN = info.LEN, passes = loop ? 2 : 1, total = PRE + LEN * passes + (loop ? 0 : 2);
  return { film, info, loop, LEN, passes, total, seed: (film.sound && film.sound.seed) ?? 7 };
}
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

// A look-ahead peak limiter for the kept pass: the gain g[i] keeps every sample under `ceil` (linear) after `gain`.
// Each reduction starts 4 ms before its peak (a sliding minimum, then a 4 ms average, so it never falls short at the
// peak) and recovers over about 60 ms. For a loop the window and the recovery wrap around the end, so the seam stays
// seamless. A few sharp effect onsets lose a few dB; the rest of the film is untouched. reduction = the deepest, in dB.
function limiter(a, b, s0, n, gain, ceil, loop) {
  const W = Math.max(1, Math.round(SR * 0.004)), need = new Float32Array(n + W);
  for (let i = 0; i < n + W; i++) {
    const k = i < n ? i : loop ? i - n : -1; if (k < 0) { need[i] = 1; continue; }
    const pk = Math.max(Math.abs(a[s0 + k]), Math.abs(b[s0 + k])) * gain; need[i] = pk > ceil ? ceil / pk : 1;
  }
  const m = new Float32Array(n), dq = new Int32Array(n + W); let h = 0, t = 0;   // m[i] = min(need[i .. i + W])
  for (let i = n + W - 1; i >= 0; i--) {
    while (t > h && need[dq[t - 1]] >= need[i]) t--; dq[t++] = i;
    while (dq[h] > i + W) h++;
    if (i < n) m[i] = need[dq[h]];
  }
  const mAt = j => (j >= 0 && j < n ? m[j] : loop ? m[((j % n) + n) % n] : 1);
  const avg = new Float32Array(n); let sum = 0;                    // avg[i] = mean(m[i - W .. i]) <= need[i]
  for (let j = -W; j <= 0; j++) sum += mAt(j);
  for (let i = 0; i < n; i++) { avg[i] = sum / (W + 1); sum += mAt(i + 1) - mAt(i - W); }
  const g = new Float32Array(n), k = 1 - Math.exp(-1 / (SR * 0.06)); let env = 1, low = 1;
  for (let lap = 0; lap < (loop ? 2 : 1); lap++)                    // a loop runs twice, so the recovery wraps the seam
    for (let i = 0; i < n; i++) { env = avg[i] < env ? avg[i] : env + (avg[i] - env) * k; g[i] = env; if (env < low) low = env; }
  return { g, reduction: -20 * Math.log10(low) };
}
// window.renderSound(opts) renders window.FILM's sound: { sr, peak, b64 } = the film (one loop) as 16-bit stereo PCM.
// opts.gain scales the result; opts.ceil (linear, e.g. 0.79 for -2 dBFS) runs the result through limiter() so no
// sample passes it; opts.reuse rescales the last render instead of rendering again; opts.bedOnly and opts.noRhythm
// leave out the cues or the rhythm.
window.renderSound = async (opts = {}) => {
  const p = filmParts(opts.film);
  let buf = opts.reuse && window.__lastRender && window.__lastRender.id === p.info.id ? window.__lastRender.buf : null;
  if (!buf) {
    const ctx = new OfflineAudioContext(2, Math.round(SR * p.total), SR);
    const E = new Engine(ctx, p.seed);
    for (let pass = 0; pass < p.passes; pass++) window.SCORE.play(E, PRE + pass * p.LEN, p.film, opts);
    buf = await ctx.startRendering(); window.__lastRender = { id: p.info.id, buf };
  }
  const a = buf.getChannelData(0), b = buf.getChannelData(1), s0 = Math.round(SR * (PRE + p.LEN * (p.passes - 1))), n = Math.round(SR * p.LEN);
  const fade = p.loop ? 0 : Math.round(SR * 1.0);
  const gain = opts.gain ?? 1; const pcm = new Int16Array(n * 2); let peak = 0;
  const lim = opts.ceil ? limiter(a, b, s0, n, gain, opts.ceil, p.loop) : null;
  for (let i = 0; i < n; i++) {
    const f = (fade && i > n - fade ? (n - i) / fade : 1) * (lim ? lim.g[i] : 1);
    const l = a[s0 + i] * gain * f, r = b[s0 + i] * gain * f; peak = Math.max(peak, Math.abs(l), Math.abs(r));
    pcm[2 * i] = Math.max(-32767, Math.min(32767, Math.round(l * 32767))); pcm[2 * i + 1] = Math.max(-32767, Math.min(32767, Math.round(r * 32767)));
  }
  return { sr: SR, peak, reduction: lim ? lim.reduction : 0, b64: b64(new Uint8Array(pcm.buffer)) };
};
// analysis: dry music and effects stems of the kept pass, as two base64 Float32 interleaved stereo buffers
window.renderStems = async (opts = {}) => {
  const p = filmParts(opts.film);
  const ctx = new OfflineAudioContext(4, Math.round(SR * p.total), SR);
  const E = new Engine(ctx, p.seed, true);
  for (let pass = 0; pass < p.passes; pass++) window.SCORE.play(E, PRE + pass * p.LEN, p.film, {});
  const buf = await ctx.startRendering(); const s0 = Math.round(SR * (PRE + p.LEN * (p.passes - 1))), n = Math.round(SR * p.LEN);
  const enc = c0 => { const f = new Float32Array(n * 2), a = buf.getChannelData(c0), b = buf.getChannelData(c0 + 1); for (let i = 0; i < n; i++) { f[2 * i] = a[s0 + i]; f[2 * i + 1] = b[s0 + i]; } return b64(new Uint8Array(f.buffer)); };
  return { sr: SR, music: enc(0), sfx: enc(2) };
};
})();
