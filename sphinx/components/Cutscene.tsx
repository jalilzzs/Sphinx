'use client';
import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGame } from '@/lib/store';
import { world, colliders } from '@/lib/world';
import { PUZ } from '@/lib/puzzles';
import { floorAt, placeOf } from '@/lib/place';
import { sting, startEndingMusic, cry, thud, setMovement, setBreath, stopLoops, playVO } from '@/lib/audio';
import { readModel } from '@/lib/assets';
import { NOUR_URL } from '@/lib/scenes';
import { setBlink, setTear, resetEyes } from '@/lib/fx';
import { finishEnding } from '@/lib/ending';

// Two cutscenes share this component. Every camera position is computed from the CURRENT scene (spawn, floor raycasts),
// never from fixed coordinates, so the camera can never end up under the map. Neither one respawns the player:
//   intro  -> hands over to gameplay at the spawn point (chapter 1 start)
//   ending -> the Great Hall finale (greathall.glb): Nour's voice, the run, her vanishing, Salim weeping, end card
// Both are mounted (hidden behind the loading screen) while assets finish loading, but only start their timeline once the screen
// switches to 'cutscene' - i.e. after the environment AND Nour are 100 % loaded.
export default function Cutscene() {
  const kind = useGame(s => s.cutscene);
  return kind === 'ending' ? <HallEnding /> : <Intro />;
}

const INTRO = {
  en: ['You woke on cold tiles, the phone cracked in your hand.', 'Forty-seven messages to Nour. Not one answer.', 'Tonight, you find her.'],
  ar: ['استيقظتَ على بلاط بارد، والهاتف مشقوق في يدك.', 'سبع وأربعون رسالة إلى نور. ولا جواب واحد.', 'الليلة، ستجدها.'],
};
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const setSub = (txt: string) => { if (useGame.getState().sub !== txt) useGame.setState({ sub: txt }); };

// ---------------------------------------------------------------- intro (chapter 1)
function Intro() {
  const { camera } = useThree();
  const T = useRef(0), base = useRef<THREE.Vector3 | null>(null), tg = useRef<THREE.Vector3[]>([]), look = useRef(new THREE.Vector3());
  const flagged = useRef<Record<string, boolean>>({});
  const once = (k: string, fn: () => void) => { if (!flagged.current[k]) { flagged.current[k] = true; fn(); } };

  useFrame((_, dt) => {
    const s = useGame.getState();
    if ((s.screen !== 'cutscene' && s.screen !== 'loading') || !colliders.length || s.sceneReady !== s.scene) return;   // wait until THIS room is built
    if (!base.current) {
      const sp = world.spawn;
      base.current = new THREE.Vector3(sp.x, floorAt(sp.x, sp.y, sp.z) + 1.6, sp.z);
      const L = (PUZ[s.scene] || []);
      const pick = [L.find(p => p.kind === 'clue'), L.find(p => p.kind === 'code'), L.find(p => p.kind === 'exit')].filter(Boolean) as any[];
      tg.current = pick.map(p => placeOf(s.scene, p));
      if (!tg.current.length) tg.current = [base.current.clone().add(new THREE.Vector3(Math.cos(world.farAng), 0, Math.sin(world.farAng)))];
      look.current.copy(tg.current[0]);
    }
    if (s.screen === 'loading') { camera.position.copy(base.current!); camera.lookAt(look.current); return; }   // pre-pose: first-frame geometry reaches the GPU behind the loading screen
    T.current += dt; const t = T.current, b = base.current, G = tg.current;
    camera.position.set(b.x + Math.sin(t * 0.35) * 0.1, b.y + Math.cos(t * 0.5) * 0.02, b.z + Math.cos(t * 0.3) * 0.07);   // gentle sway, locked to eye height above the floor
    const seg = Math.min(G.length - 1, Math.floor(t / 3.2)), nxt = Math.min(G.length - 1, seg + 1);
    look.current.lerpVectors(G[seg], G[nxt], sm(0, 1, (t - seg * 3.2) / 3.2 * 1.2));
    camera.lookAt(look.current);
    const L = s.lang === 'ar' ? INTRO.ar : INTRO.en;
    
    // Voiceovers for Intro
    if (t >= 0.6) once('vo_intro_1', () => playVO('vo_intro_1'));
    if (t >= 3.4) once('vo_intro_2', () => playVO('vo_intro_2'));
    if (t >= 6.4) once('vo_intro_3', () => playVO('vo_intro_3'));

    setSub(t < 0.6 ? '' : t < 3.4 ? L[0] : t < 6.4 ? L[1] : t < 9.4 ? L[2] : '');
    const f = t < 1 ? 1 - t : 0;                                              // short fade-in from black
    if (Math.abs(s.fade - f) > 0.02) useGame.setState({ fade: f });
    if (t > 10) useGame.setState({ screen: 'game', sub: '', fade: 0 });         // player takes control at the spawn point
  });
  return null;
}

// ---------------------------------------------------------------- ending: the Great Hall (greathall.glb)
class Safe extends Component<{ fb: any; children: any }, { e: boolean }> {
  state = { e: false }; static getDerivedStateFromError() { return { e: true }; }
  componentDidCatch(e: any) { console.warn('[ending] Nour model failed, using a placeholder figure', e); }
  render() { return this.state.e ? this.props.fb : this.props.children; }
}
const Figure = () => <mesh position={[0, 0.82, 0]}><capsuleGeometry args={[0.2, 1.2, 6, 12]} /><meshStandardMaterial color="#c9b8a8" transparent /></mesh>;

function Nour() {
  const { scene, animations } = readModel(NOUR_URL) as any;   // already downloaded + parsed by the loading gate: never streams in mid-cutscene
  const body = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Object3D;
    c.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.frustumCulled = false; m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone(); });
    c.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c, true), k = 1.65 / Math.max(0.01, b.max.y - b.min.y);
    c.scale.multiplyScalar(k); c.position.y = -b.min.y * k;
    return c;
  }, [scene]);
  const mixer = useMemo(() => (animations?.length ? new THREE.AnimationMixer(body) : null), [body]);
  useEffect(() => { if (mixer) { const clip = animations.find((a: any) => /idle|stand/i.test(a.name)) || animations[0]; mixer.clipAction(clip).play(); } return () => { mixer?.stopAllAction(); }; }, [mixer]);
  useFrame((_, dt) => { mixer?.update(dt); });
  return <primitive object={body} />;
}

// Subtitles (Nour's lines are her voice from the dark; Salim's are his own).
const HALL = {
  en: {
    n1: 'Nour: Salim... Salim... Are you here?',
    s1: "Salim: Yes! Yes, I'm here my love! Where are you? Are you okay?",
    n2: 'Nour: Yes, I am here my dear. Come to me.',
    s2: 'Salim: No! No! No! Nour, where did you go?! Nour, where are you?!',
  },
  ar: {
    n1: 'نور: سليم... سليم... هل أنت هنا؟',
    s1: 'سليم: نعم! نعم، أنا هنا يا حبيبتي! أين أنتِ؟ هل أنتِ بخير؟',
    n2: 'نور: نعم، أنا هنا يا عزيزي. تعالَ إليّ.',
    s2: 'سليم: لا! لا! لا! نور، إلى أين ذهبتِ؟! نور، أين أنتِ؟!',
  },
};

// Timeline (seconds). Everything is derived from the spawn point at the START of the corridor; the hall runs along +x.
const NOUR_DIST = 19.5;      // Nour stands this far down the hall from the spawn (far end, still on the floor)
const NOUR_BACK = 2.2;       // ...and drifts this much further back into the dark while she vanishes
const STOP_GAP = 4.2;        // Salim halts this far short of where she stood
const EYE = 1.7, EYE_KNEE = 0.62;
const T_N1 = 1.6, T_S1 = 5.4, T_APPEAR = 9.0, T_N2 = 9.6, T_RUN = 13.8;
const RUN = { v: 4.2, ta: 1.0, td: 1.2 };         // top speed (m/s), ramp-up, braking
const REC0 = 1.6, REC_LEN = 2.4;                  // Nour starts receding 1.6 s into the run, takes 2.4 s to vanish
const YELL = 5.6, KNEE_LEN = 1.5, WEEP = 5.2, FADE_LEN = 3.0;

function HallEnding() {
  const { camera } = useThree();
  const T = useRef(0), I = useRef<any>(null);
  const nourG = useRef<THREE.Group>(null!), light = useRef<THREE.PointLight>(null!);
  const flagged = useRef<Record<string, boolean>>({});
  const bl = useRef({ at: 2.6, t0: -10, dur: 0.28 });
  const once = (k: string, fn: () => void) => { if (!flagged.current[k]) { flagged.current[k] = true; fn(); } };

  useEffect(() => () => { stopLoops(); resetEyes(); const c = camera as THREE.PerspectiveCamera; if (c.fov !== 72) { c.fov = 72; c.updateProjectionMatrix(); } }, [camera]);

  // Realistic blinking: lids close fast, hold a beat, open slower. Quick and frequent while running, slow and heavy while crying.
  const blink = (t: number, mode: 'idle' | 'run' | 'weep') => {
    const b = bl.current;
    if (t >= b.at && t > b.t0 + b.dur) {
      b.t0 = t; b.dur = mode === 'weep' ? 0.55 + Math.random() * 0.3 : 0.22 + Math.random() * 0.1;
      const gap = mode === 'run' ? 0.7 + Math.random() * 0.9 : mode === 'weep' ? 1.0 + Math.random() * 0.9 : 2.6 + Math.random() * 2.2;
      b.at = t + b.dur + (mode === 'run' && Math.random() < 0.3 ? 0.12 : gap);           // sometimes a quick double blink
    }
    const u = (t - b.t0) / b.dur; if (u < 0 || u > 1) return 0;
    const up = 0.32, hold = 0.12;
    return u < up ? sm(0, 1, u / up) : u < up + hold ? 1 : 1 - sm(0, 1, (u - up - hold) / (1 - up - hold));
  };

  useFrame((_, dt) => {
    const s = useGame.getState();
    const ready = colliders.length > 0 && !!nourG.current && s.sceneReady === s.scene;
    if (!ready || (s.screen !== 'cutscene' && s.screen !== 'loading')) return;

    if (!I.current) {                                                        // one-time setup from the real scene
      const sp = world.spawn.clone(), nx = sp.x + NOUR_DIST, nz = sp.z, fy = floorAt(sp.x, sp.y, sp.z);
      const L = NOUR_DIST - STOP_GAP, { v, ta, td } = RUN, tc = L / v - (ta + td) / 2;
      I.current = { sp, nx, nz, fy, y: fy + EYE, L, tc, tr: ta + tc + td };
      nourG.current.rotation.y = Math.atan2(-1, 0);                          // she faces him (looking back along -x)
    }
    const R = I.current, { sp, nx, nz, L, tr } = R;

    if (s.screen === 'loading') {                                            // warm-up: first-frame view is rendered (and uploaded to the GPU) behind the loading screen
      camera.position.set(sp.x, R.y, sp.z); camera.lookAt(nx, R.fy + 1.5, nz);
      nourG.current.position.set(nx, R.fy - 0.5, nz);                        // Nour is "on stage" (so her textures upload) but swallowed by the dark + hidden below
      nourG.current.visible = true; setOpacity(nourG.current, 0.001, 0);
      return;
    }

    T.current += Math.min(dt, 0.05);
    const t = T.current, lang = (s.lang === 'ar' ? 'ar' : 'en') as 'en' | 'ar', H = HALL[lang];
    const tau = t - T_RUN;                                                  // run time
    const tS = T_RUN + tr;                                                  // moment Salim stops
    const tK = tS + YELL;                                                   // moment he drops to his knees
    const tF = tK + KNEE_LEN + WEEP;                                        // fade-out start

    // ---- dialogue / subtitles ----
    setSub(t < T_N1 ? '' : t < T_N1 + 3.4 ? H.n1 : t < T_S1 ? '' : t < T_S1 + 3.6 ? H.s1 : t < T_N2 ? '' : t < T_N2 + 3.8 ? H.n2 : t < tS + 0.15 ? '' : t < tS + YELL - 0.2 ? H.s2 : '');

    // ---- dialogue voiceovers ----
    if (t >= T_N1) once('vo_nour_1', () => playVO('vo_nour_1'));
    if (t >= T_S1) once('vo_salim_1', () => playVO('vo_salim_1'));
    if (t >= T_N2) once('vo_nour_2', () => playVO('vo_nour_2'));
    if (t >= tS + 0.15) once('vo_salim_2', () => playVO('vo_salim_2'));

    // ---- run profile (accelerate, cruise, brake) ----
    const { v, ta, td } = RUN;
    const rem = Math.max(0, tr - tau);
    const runX = tau <= 0 ? 0 : tau >= tr ? L : tau < ta ? 0.5 * v / ta * tau * tau : tau < ta + R.tc ? 0.5 * v * ta + v * (tau - ta) : L - 0.5 * v / td * rem * rem;
    const runV = tau <= 0 || tau >= tr ? 0 : tau < ta ? v * tau / ta : tau < ta + R.tc ? v : v * rem / td;
    const sp01 = runV / v;                                                  // 0..1 speed fraction

    // ---- Nour: appears at the far end, then recedes into the dark and vanishes ----
    const ap = sm(T_APPEAR, T_APPEAR + 1.3, t);
    const rk = Math.min(1, Math.max(0, (tau - REC0) / REC_LEN));
    let vis = ap * (ap < 1 ? 0.7 + 0.3 * Math.sin(t * 46) : 1);              // flickers into existence
    vis *= 1 - sm(0.25, 0.95, rk) * (rk > 0.8 ? 0.7 + 0.3 * Math.sin(t * 50) : 1);   // ...and out
    if (rk >= 1) vis = 0;
    const dark = sm(0, 0.75, rk);                                           // her colours sink into black before she disappears
    const nxx = nx + NOUR_BACK * sm(0, 1, rk), nyy = floorAt(nxx, R.fy + 0.5, nz);
    nourG.current.position.set(nxx, nyy, nz);
    setOpacity(nourG.current, vis, dark);
    nourG.current.visible = vis > 0.01;
    if (light.current) light.current.intensity = 9 * vis * (rk > 0.5 ? 0.6 + 0.4 * Math.sin(t * 40) : 1);
    if (t > T_APPEAR) once('appear', () => sting());
    if (rk >= 0.9) once('gone', () => sting());

    // ---- camera ----
    const floor = floorAt(sp.x + runX, R.y - EYE + 0.4, sp.z);
    R.y += (floor + EYE - R.y) * Math.min(1, dt * 6);
    let cx = sp.x + runX, cy = R.y, cz = sp.z, roll = 0;
    let lx = nx, ly = R.fy + 1.5, lz = nz;                                    // default: eyes on the far end of the hall

    if (t < T_RUN) {                                                        // standing at the start of the corridor, listening
      cy += Math.sin(t * 1.3) * 0.006;
      if (t > T_S1 && t < T_APPEAR) { lz += Math.sin((t - T_S1) * 1.1) * 1.6; ly += Math.sin((t - T_S1) * 0.8) * 0.15; }   // searching the dark for her
      lz += Math.sin(t * 0.45) * 0.25;
    } else if (t < tS) {                                                    // running toward her
      const w = 17;                                                         // step rate
      cy += Math.sin(tau * w) * 0.05 * sp01;
      cz += Math.sin(tau * w * 0.5) * 0.035 * sp01;
      roll = Math.sin(tau * w * 0.5) * 0.014 * sp01;
      lx = nxx; ly = nyy + 1.5 + Math.sin(tau * w) * 0.02; lz = nz;
    } else if (t < tK) {                                                    // she is gone: frantic search of the darkness
      const u = t - tS, dec = Math.exp(-u * 0.15);
      cy += Math.sin(u * 2.2) * 0.008;
      lx = cx + 7; ly = R.fy + 1.4 + Math.sin(u * 3.3) * 0.5; lz = nz + Math.sin(u * 2.7) * 5.5 * dec;
      cx += Math.sin(u * 20) * 0.004;
    } else {                                                                // falls to his knees and weeps
      const u = (t - tK) / KNEE_LEN, w = t - tK - KNEE_LEN;
      const fall = u < 1 ? u * u : 1 - 0.04 * Math.exp(-w * 6) * Math.sin(w * 20);
      const kd = sm(0, 1, Math.min(1, u));
      const sob = w > 0 ? Math.pow(Math.max(0, Math.sin(w * 5.4 + Math.sin(w * 1.3))), 3) * Math.min(1, w) : 0;
      cy = R.y - (EYE - EYE_KNEE) * fall - sob * 0.03;
      cx += 0.35 * kd + Math.sin(t * 37) * 0.004 * sob;
      roll = 0.07 * kd + Math.sin(t * 9) * 0.004 * sob;
      lx = cx + 2; ly = cy - 1.25 * kd - sob * 0.12; lz = cz + Math.sin(t * 0.6) * 0.15;
    }
    camera.position.set(cx, cy, cz);
    camera.lookAt(lx, ly, lz);
    if (roll) camera.rotateZ(roll);
    const pc = camera as THREE.PerspectiveCamera, fov = 72 + 6 * sp01;     // the view widens slightly with speed
    if (Math.abs(pc.fov - fov) > 0.05) { pc.fov = fov; pc.updateProjectionMatrix(); }

    // ---- movement audio ----
    if (tau > 0.25 && t < tS - 0.5) setMovement('run', 0.8); else setMovement('none');
    setBreath(t > tS - 0.3 && t < tK, 0.7);

    // ---- eyes: natural blinks the whole way, quick while running, slow & heavy while crying; tears rise once he breaks ----
    if (t > T_APPEAR - 0.25 && t < T_APPEAR + 0.45) once('slowblink', () => { bl.current.t0 = t; bl.current.dur = 0.7; bl.current.at = t + 3; });   // "did I just see that?"
    setBlink(blink(t, t >= tK ? 'weep' : t > T_RUN - 0.5 ? 'run' : 'idle'));
    setTear(t < tK - 1.5 ? 0 : sm(tK - 1.5, tK + 3, t) * (1 - 0.15 * Math.sin(t * 1.7)));

    // ---- the moment he drops to his knees: sad theme + crying start together ----
    if (t >= tK) once('knees', () => { setMovement('none'); startEndingMusic(); cry(); });
    if (t >= tK + KNEE_LEN * 0.8) once('thud', () => thud());

    // ---- fade out into the end card ----
    const f = t < 1.2 ? 1 - t / 1.2 : sm(tF, tF + FADE_LEN, t);
    if (Math.abs(s.fade - f) > 0.015) useGame.setState({ fade: f });
    if (t > tF + FADE_LEN + 0.6) finishEnding();                             // black screen, ending card, SPHINX, "To be continued..."
  });

  return <>
    <group ref={nourG} position={[0, -500, 0]}>
      <Safe fb={<Figure />}><Suspense fallback={<Figure />}><Nour /></Suspense></Safe>
      <pointLight ref={light} position={[0, 1.8, 1.3]} color="#ffe2cc" intensity={0} distance={11} decay={2} />
    </group>
  </>;
}

// opacity + darkness for every material under Nour (works for the model and for the placeholder figure)
function setOpacity(g: THREE.Object3D, v: number, dark: number) {
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((x: any) => {
      x.transparent = true; x.opacity = v; x.depthWrite = v > 0.98;
      if (x.color) x.color.setScalar(1 - 0.9 * dark);
    });
  });
}
