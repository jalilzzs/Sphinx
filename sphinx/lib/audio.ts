// Web Audio manager.
// - Everything is unlocked by the first user gesture (browser autoplay policy) and ALL mp3 files are decoded up-front, so playback is instant.
// - walk / run / breath are LOOPS that are started and stopped explicitly (they were long recordings being re-triggered every step, so they piled up and never stopped).
// - paper / door_metal / door_locked are one-shots. Any missing file falls back to a short synthesized sound.
import { useGame } from './store';

let ctx: AudioContext | null = null, master: GainNode, bgm: GainNode, sfx: GainNode, started = false;
const buf: Record<string, AudioBuffer> = {};
const pending: Record<string, Promise<void>> = {};
const FILES = ['walk', 'run', 'breath', 'paper', 'door_metal', 'door_locked', 'ending', 'cry'];   // ending / cry are optional files: missing -> synth fallback

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new C({ latencyHint: 'interactive' });
    master = ctx.createGain(); bgm = ctx.createGain(); sfx = ctx.createGain();
    bgm.connect(master); sfx.connect(master); master.connect(ctx.destination);
    applyVol();
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); // silent tick: fully unlocks iOS Safari
    s.buffer = b; s.connect(ctx.destination); s.start(0);
    FILES.forEach(load); load('ambient');
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) { stopLoops(); ctx.suspend().catch(() => {}); } else ctx.resume().catch(() => {});
    });
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  if (!started) { started = true; load('ambient').then(ambient); }
}

export function applyVol() {
  if (!ctx) return;
  const s = useGame.getState();
  master.gain.value = s.master; bgm.gain.value = s.bgm * .5; sfx.gain.value = s.sfx;
}

const decode = (data: ArrayBuffer) => new Promise<AudioBuffer>((res, rej) => {
  const p: any = ctx!.decodeAudioData(data, res, rej); // callback form works on old Safari, promise form on new ones
  p?.catch?.(() => {});
});
function load(n: string): Promise<void> {
  if (!ctx) return Promise.resolve();
  return pending[n] ??= fetch(`/audio/${n}.mp3`)
    .then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))
    .then(decode)
    .then(b => { buf[n] = b; })
    .catch(e => { if (n !== 'ambient') console.warn('[audio] could not load', n, e); });
}

// Resolves once the given sounds are decoded (a missing file just resolves too, the synth fallback is used then).
export const audioReady = (names: string[]) => Promise.all(names.map(load)).then(() => {});

// ---------- one-shots (instant when the buffer is decoded, synth fallback otherwise) ----------
function shot(n: string, vol: number, fb?: () => void) {
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const b = buf[n];
  if (!b) { load(n); fb?.(); return; }
  const s = ctx.createBufferSource(), g = ctx.createGain();
  g.gain.value = vol; s.buffer = b; s.connect(g).connect(sfx); s.start();
}

// ---------- loops ----------
type Loop = { src: AudioBufferSourceNode; g: GainNode; name: string };
const loops: Record<string, Loop> = {};
function loopOn(key: string, name: string, vol: number, rate = 1) {
  if (!ctx) return;
  const b = buf[name]; if (!b) { load(name); return; }
  const t = ctx.currentTime, l = loops[key];
  if (l && l.name === name) { l.g.gain.cancelScheduledValues(t); l.g.gain.setTargetAtTime(vol, t, .03); l.src.playbackRate.value = rate; return; }
  loopOff(key);
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = b; src.loop = true; src.playbackRate.value = rate; g.gain.value = 0;
  src.connect(g).connect(sfx); src.start(); g.gain.setTargetAtTime(vol, t, .02);
  loops[key] = { src, g, name };
}
function loopOff(key: string, tc = .01) {
  const l = loops[key]; if (!l || !ctx) return;
  delete loops[key];
  const t = ctx.currentTime;
  l.g.gain.cancelScheduledValues(t); l.g.gain.setTargetAtTime(0, t, tc);   // silent within ~40 ms
  try { l.src.stop(t + tc * 5 + .02); } catch {}
}
export function stopLoops() { Object.keys(loops).forEach(k => loopOff(k)); mv = 'none'; br = false; }

// Movement: call every frame; only acts when the state changes.
let mv = 'none', mvVol = -1;
export function setMovement(kind: 'none' | 'walk' | 'run' | 'crouch', vol = .6) {
  if (kind === mv && Math.abs(vol - mvVol) < .05) return;
  mv = kind; mvVol = vol;
  if (kind === 'none') loopOff('move');
  else if (kind === 'run') loopOn('move', 'run', vol);
  else if (kind === 'crouch') loopOn('move', 'walk', vol * .5, .8);
  else loopOn('move', 'walk', vol);
}
// Heavy breathing while stamina is empty.
let br = false;
export function setBreath(on: boolean, vol = .9) {
  if (on === br) return;
  br = on;
  if (on) loopOn('breath', 'breath', vol); else loopOff('breath', .12);
}

// ---------- named effects ----------
const synth = (f: number, d: number, type: OscillatorType = 'sine', v = .2) => {
  if (!ctx) return; const c = ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(sfx); o.start(t); o.stop(t + d + .02);
};
export const click = () => synth(520, .08);
export const paper = (v = .8) => shot('paper', v, () => synth(300, .15, 'triangle'));
export const doorMetal = (v = .9) => shot('door_metal', v, () => synth(140, .4, 'square', .15));
export const doorLocked = (v = .9) => shot('door_locked', v, () => synth(110, .2, 'square', .15));
export const ring = (n = 4) => {
  if (!ctx) return; const c = ctx;
  for (let i = 0; i < n; i++) [0, .25].forEach(o => {
    const t = c.currentTime + i * 1.1 + o, os = c.createOscillator(), g = c.createGain();
    os.frequency.value = o ? 740 : 880; g.gain.setValueAtTime(.3, t); g.gain.setValueAtTime(0, t + .2);
    os.connect(g).connect(sfx); os.start(t); os.stop(t + .22);
  });
};
export const sting = () => {
  if (!ctx) return; const c = ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2);
  g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.4); o.connect(g).connect(sfx); o.start(t); o.stop(t + 1.5);
};

// Salim's crying: plays /public/audio/cry.mp3 once (not looped). If the file is missing, a synthesized sobbing is used.
let cryNode: { src: AudioBufferSourceNode; g: GainNode } | null = null;
export function cry(vol = 1) {
  if (!ctx) return; const c = ctx;
  if (c.state !== 'running') c.resume().catch(() => {});
  stopCry(.05);
  const b = buf.cry;
  if (b) {
    const src = c.createBufferSource(), g = c.createGain(), t = c.currentTime;
    src.buffer = b; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .25);
    src.connect(g).connect(sfx); src.start(t); cryNode = { src, g };
    src.onended = () => { if (cryNode?.src === src) cryNode = null; };
    return;
  }
  load('cry');
  // fallback: filtered-noise sobs, ~every 0.9 s, each a quick rise and slow fall
  const len = c.sampleRate * 8, nb = c.createBuffer(1, len, c.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  src.buffer = nb; bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 1.6;
  g.gain.setValueAtTime(0, t);
  for (let k = 0; k < 8; k++) { const o = t + .2 + k * .95 + (k % 3) * .08; g.gain.setValueAtTime(0, o); g.gain.linearRampToValueAtTime(vol * .5, o + .12); g.gain.exponentialRampToValueAtTime(.001, o + .75); }
  src.connect(bp).connect(g).connect(sfx); src.start(t); src.stop(t + 8); cryNode = { src, g };
}
export function stopCry(tc = .3) {
  if (!ctx || !cryNode) return; const n = cryNode, t = ctx.currentTime; cryNode = null;
  n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, tc);
  try { n.src.stop(t + tc * 5 + .05); } catch {}
}
// dull thud of two knees hitting the floor
export const thud = () => { synth(62, .35, 'sine', .45); synth(48, .45, 'triangle', .3); };

function ambient() {
  if (!ctx) return; const c = ctx;
  if (buf.ambient) { const s = c.createBufferSource(), g = c.createGain(); g.gain.value = .8; s.buffer = buf.ambient; s.loop = true; s.connect(g).connect(bgm); s.start(); return; }
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.connect(bgm);
  [55, 55.7, 82.4].forEach(hz => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = hz; g.gain.value = .12; o.connect(g).connect(f); o.start(); });
  const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = .07; lg.gain.value = 90; l.connect(lg).connect(f.frequency); l.start();
}

// ---------- Ending theme: slow, melancholic piano-and-pad piece (Am - F - Dm - E), generated live.
// If /public/audio/ending.mp3 exists it is used instead. Fades the ambient bed out while it plays.
let endBus: GainNode | null = null;
export function startEndingMusic() {
  if (!ctx || endBus) return;
  const c = ctx, t0 = c.currentTime + 0.15;
  if (!buf.ending) load('ending');
  const bus = c.createGain(); bus.gain.setValueAtTime(0, c.currentTime); bus.gain.linearRampToValueAtTime(1, t0 + 5);
  endBus = bus;
  bgm.gain.cancelScheduledValues(c.currentTime); bgm.gain.setTargetAtTime(0, c.currentTime, 1.2);   // ambient bed fades out
  if (buf.ending) { const s = c.createBufferSource(); s.buffer = buf.ending; s.connect(bus); bus.connect(master); s.start(t0); return; }
  // long, dark reverb (generated impulse response)
  const len = Math.floor(c.sampleRate * 3.4), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
  const conv = c.createConvolver(); conv.buffer = ir;
  const wet = c.createGain(), dry = c.createGain(); wet.gain.value = 0.6; dry.gain.value = 0.65;
  bus.connect(dry).connect(master); bus.connect(conv).connect(wet).connect(master);
  const pad = (f: number, t: number, d: number, v: number) => {
    [-5, 5].forEach(det => {
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 1.8); g.gain.setValueAtTime(v, t + d - 1.9); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(lp).connect(g).connect(bus); o.start(t); o.stop(t + d + 0.1);
    });
  };
  const bell = (f: number, t: number, d: number, v: number) => {
    [1, 2].forEach((m, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f * m; const vv = v / (i + 1.8);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vv, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
      o.connect(g).connect(bus); o.start(t); o.stop(t + d + 0.1);
    });
  };
  const chords: [number[], number[]][] = [
    [[110, 164.81, 220, 261.63], [659.25, 523.25, 587.33, 440]],      // Am
    [[87.31, 174.61, 220, 261.63], [523.25, 440, 523.25, 698.46]],    // F
    [[73.42, 146.83, 220, 293.66], [587.33, 698.46, 440, 587.33]],    // Dm
    [[82.41, 164.81, 246.94, 329.63], [493.88, 415.3, 493.88, 659.25]], // E
  ];
  const beat = [0.7, 2.3, 3.9, 5.1], L = 6.6;
  for (let cyc = 0; cyc < 2; cyc++) chords.forEach(([notes, mel], k) => {
    const t = t0 + (cyc * 4 + k) * L;
    notes.forEach(f => pad(f, t, L + 1.2, 0.05));
    mel.forEach((f, i) => bell(f, t + beat[i], 3.4, 0.16));
  });
  bus.gain.setValueAtTime(1, t0 + 8 * L - 4); bus.gain.linearRampToValueAtTime(0, t0 + 8 * L + 1);
}
export function stopEndingMusic() {
  if (!ctx) return;
  stopCry();
  if (endBus) { const t = ctx.currentTime; endBus.gain.cancelScheduledValues(t); endBus.gain.setTargetAtTime(0, t, 0.4); endBus = null; }
  applyVol();
}
