// Web Audio manager. Must be unlocked by a user gesture (browser autoplay policy). Looks for /public/audio/<name>.mp3, else uses synth fallbacks.
import { useGame } from './store';

let ctx: AudioContext | null = null, master: GainNode, bgm: GainNode, sfx: GainNode, started = false;
const buf: Record<string, AudioBuffer | null> = {};

export function unlockAudio() {
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new C();
    master = ctx.createGain();
    bgm = ctx.createGain();
    sfx = ctx.createGain();
    bgm.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    applyVol();
  }
  if (ctx.state !== 'running') ctx.resume();
  if (!started) {
    started = true;
    ambient();
  }
}

export function applyVol() {
  if (!ctx) return;
  const s = useGame.getState();
  master.gain.value = s.master;
  bgm.gain.value = s.bgm * .5;
  sfx.gain.value = s.sfx;
}

async function file(n: string) {
  if (n in buf) return buf[n];
  try {
    const r = await fetch(`/audio/${n}.mp3`);
    if (!r.ok) throw 0;
    buf[n] = await ctx!.decodeAudioData(await r.arrayBuffer());
  } catch {
    buf[n] = null;
  }
  return buf[n];
}

// تشغيل صوت سريع (مرة واحدة عند استدعائه مثل الخطوة، الباب، الورقة)
function playOneShot(n: string, vol: number, fb: (v: number) => void) {
  if (!ctx) return;
  file(n).then(b => {
    if (b && ctx) {
      const s = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = vol;
      s.buffer = b;
      s.connect(g).connect(sfx);
      s.start();
    } else fb(vol);
  });
}

function ambient() {
  file('ambient').then(b => {
    if (b && ctx) {
      const s = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = .8;
      s.buffer = b;
      s.loop = true;
      s.connect(g).connect(bgm);
      s.start();
    } else if (ctx) {
      const c = ctx, f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 220;
      f.connect(bgm);
      [55, 55.7, 82.4].forEach(hz => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.value = hz;
        g.gain.value = .12;
        o.connect(g).connect(f);
        o.start();
      });
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = .07;
      lg.gain.value = 90;
      l.connect(lg).connect(f.frequency);
      l.start();
    }
  });
}

// دوال الأصوات الأساسية (تشتغل فوراً عند استدعائها في الكود)

export const step = (v: number) => playOneShot('walk', v * .5, v => {
  if (v <= 0) return;
  const c = ctx!, b = c.createBuffer(1, 2205, 44100), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const s = c.createBufferSource(), g = c.createGain();
  g.gain.value = v * .4;
  s.buffer = b;
  s.connect(g).connect(sfx);
  s.start();
});

export const run = (v: number) => playOneShot('run', v * .7, v => step(v));

export const breath = (v = .5) => playOneShot('breath', v, () => {
  if (!ctx) return;
  const c = ctx, o = c.createOscillator(), g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.value = 90;
  g.gain.value = v * .08;
  o.connect(g).connect(sfx);
  o.start();
  o.stop(c.currentTime + .5);
});

export const paper = (v = .6) => playOneShot('paper', v, () => click());

export const doorMetal = (v = .7) => playOneShot('door_metal', v, () => click());

export const doorLocked = (v = .7) => playOneShot('door_locked', v, () => click());

export const reload = (v = .7) => playOneShot('reload', v, () => click());

export const shoot = (v = .8) => playOneShot('shoot', v, v => {
  if (!ctx) return;
  const c = ctx, o = c.createOscillator(), g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(150, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3);
  g.gain.setValueAtTime(v, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3);
  o.connect(g).connect(sfx);
  o.start();
  o.stop(c.currentTime + 0.3);
});

export const ring = (n = 4) => {
  if (!ctx) return;
  const c = ctx;
  for (let i = 0; i < n; i++) [0, .25].forEach(o => {
    const t = c.currentTime + i * 1.1 + o, os = c.createOscillator(), g = c.createGain();
    os.frequency.value = o ? 740 : 880;
    g.gain.setValueAtTime(.3, t);
    g.gain.setValueAtTime(0, t + .2);
    os.connect(g).connect(sfx);
    os.start(t);
    os.stop(t + .22);
  });
};

export const click = () => {
  if (!ctx) return;
  const c = ctx, o = c.createOscillator(), g = c.createGain();
  o.frequency.value = 520;
  g.gain.setValueAtTime(.2, c.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .08);
  o.connect(g).connect(sfx);
  o.start();
  o.stop(c.currentTime + .1);
});
