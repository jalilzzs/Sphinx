'use client';
import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGame } from '@/lib/store';
import { world, colliders } from '@/lib/world';
import { PUZ } from '@/lib/puzzles';
import { free, floorAt, placeOf } from '@/lib/place';
import { D } from '@/lib/i18n';
import { sting, doorMetal, startEndingMusic } from '@/lib/audio';
import { finishEnding } from '@/lib/ending';

// Two cutscenes share this component. Every camera position is computed from the CURRENT scene (spawn, floor raycasts),
// never from fixed coordinates, so the camera can never end up under the map. Neither one respawns the player:
//   intro  -> hands over to gameplay at the spawn point (chapter 1 start)
//   ending -> the game's official ending (fade to black, melancholic theme, end card)
export default function Cutscene() {
  const kind = useGame(s => s.cutscene);
  return kind === 'ending' ? <Ending /> : <Intro />;
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
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (s.screen !== 'cutscene' || !colliders.length) return;           // wait until the room is ready
    if (!base.current) {
      const sp = world.spawn;
      base.current = new THREE.Vector3(sp.x, floorAt(sp.x, sp.y, sp.z) + 1.6, sp.z);
      const L = (PUZ[s.scene] || []);
      const pick = [L.find(p => p.kind === 'clue'), L.find(p => p.kind === 'code'), L.find(p => p.kind === 'exit')].filter(Boolean) as any[];
      tg.current = pick.map(p => placeOf(s.scene, p));
      if (!tg.current.length) tg.current = [base.current.clone().add(new THREE.Vector3(Math.cos(world.farAng), 0, Math.sin(world.farAng)))];
      look.current.copy(tg.current[0]);
    }
    T.current += dt; const t = T.current, b = base.current, G = tg.current;
    camera.position.set(b.x + Math.sin(t * 0.35) * 0.1, b.y + Math.cos(t * 0.5) * 0.02, b.z + Math.cos(t * 0.3) * 0.07);   // gentle sway, locked to eye height above the floor
    const seg = Math.min(G.length - 1, Math.floor(t / 3.2)), nxt = Math.min(G.length - 1, seg + 1);
    look.current.lerpVectors(G[seg], G[nxt], sm(0, 1, (t - seg * 3.2) / 3.2 * 1.2));
    camera.lookAt(look.current);
    const L = s.lang === 'ar' ? INTRO.ar : INTRO.en;
    setSub(t < 0.6 ? '' : t < 3.4 ? L[0] : t < 6.4 ? L[1] : t < 9.4 ? L[2] : '');
    const f = t < 1 ? 1 - t : 0;                                              // short fade-in from black
    if (Math.abs(s.fade - f) > 0.02) useGame.setState({ fade: f });
    if (t > 10) useGame.setState({ screen: 'game', sub: '', fade: 0 });         // player takes control at the spawn point
  });
  return null;
}

// ---------------------------------------------------------------- ending (official game ending)
class Safe extends Component<{ fb: any; children: any }, { e: boolean }> {
  state = { e: false }; static getDerivedStateFromError() { return { e: true }; }
  componentDidCatch(e: any) { console.warn('[ending] Nour model failed, using a placeholder figure', e); }
  render() { return this.state.e ? this.props.fb : this.props.children; }
}
const Figure = () => <mesh position={[0, 0.82, 0]}><capsuleGeometry args={[0.2, 1.2, 6, 12]} /><meshStandardMaterial color="#c9b8a8" transparent /></mesh>;

function Nour({ vis }: { vis: React.MutableRefObject<number> }) {
  const { scene, animations } = useGLTF('/models/beautiful_young_woman_wearing_a_floral_dress.glb') as any;
  const ref = useRef<THREE.Group>(null!);
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
  useFrame((st, dt) => {
    mixer?.update(dt);
    const v = vis.current, op = v >= 1 ? 1 : Math.max(0, v * (0.65 + 0.35 * Math.sin(st.clock.elapsedTime * 38)));   // flickers as she fades
    body.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach((x: any) => { x.transparent = true; x.opacity = op; x.depthWrite = v > 0.98; }); });
    if (ref.current) ref.current.visible = v > 0.01;
  });
  return <group ref={ref}><primitive object={body} /></group>;
}

function Ending() {
  const { camera } = useThree();
  const T = useRef(0), I = useRef<any>(null), vis = useRef(1), nourG = useRef<THREE.Group>(null!), wall = useRef<THREE.Mesh>(null!), dust = useRef<THREE.Points>(null!);
  const flagged = useRef<Record<string, boolean>>({});
  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.4; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.random() * 1.7; p[i * 3 + 2] = Math.sin(a) * r; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); (g as any).userData.base = p.slice(); return g;
  }, []);
  const once = (k: string, fn: () => void) => { if (!flagged.current[k]) { flagged.current[k] = true; fn(); } };

  useFrame((_, dt) => {
    const s = useGame.getState();
    if (s.screen !== 'cutscene' || !colliders.length || !nourG.current) return;
    if (!I.current) {                                                      // set up from the real scene geometry
      const sp = world.spawn, a = world.farAng, d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const Dm = Math.max(2.5, Math.min(8, free(a) * 0.75)), fy = floorAt(sp.x, sp.y, sp.z);
      const nx = sp.x + d.x * Dm, nz = sp.z + d.z * Dm, ny = floorAt(nx, fy + 0.5, nz);
      nourG.current.position.set(nx, ny, nz); nourG.current.rotation.y = Math.atan2(-d.x, -d.z);                 // she faces him
      wall.current.position.set(sp.x + d.x * Dm * 0.62, 0, sp.z + d.z * Dm * 0.62); wall.current.rotation.y = Math.atan2(d.x, d.z);
      I.current = { sp, d, Dm, fy, y: fy + 1.65, ny, top: ny + 3.1 };
    }
    const { sp, d, Dm, ny } = I.current;
    T.current += dt; const t = T.current, lang = s.lang as 'en' | 'ar', dd = D[lang] as any;

    // camera: walks toward her at eye height above the floor (re-measured every frame), stops short of the glass
    const walk = Math.min(t * 0.85, Dm * 0.46), cx = sp.x + d.x * walk, cz = sp.z + d.z * walk;
    const fl = floorAt(cx, I.current.y - 1.65 + 0.4, cz);
    I.current.y += (fl + 1.65 - I.current.y) * Math.min(1, dt * 6);
    const shake = t > 10 ? (Math.sin(t * 31) * 0.006 + Math.sin(t * 17) * 0.004) : 0;
    camera.position.set(cx + shake, I.current.y + Math.sin(t * 6) * (t < 5.5 ? 0.012 : 0.003), cz);
    camera.lookAt(sp.x + d.x * Dm, ny + 1.5 + Math.sin(t * 0.8) * 0.03, sp.z + d.z * Dm);

    // dialogue (unchanged lines)
    setSub(t < 0.8 ? '' : t < 3.6 ? dd.s1 : t < 7.4 ? dd.s2 : t < 11 ? dd.s3 : '');

    // glass wall seals between them
    const k = sm(6.4, 7.8, t);
    wall.current.visible = k > 0; wall.current.scale.set(1, Math.max(0.001, k), 1); wall.current.position.y = I.current.top - 1.5 * k;
    if (t > 6.4) once('wall', () => { doorMetal(1); sting(); });
    if (t > 7.6) once('bars', () => useGame.setState({ bars: true }));

    // Nour dissolves in front of him
    vis.current = t < 8.2 ? 1 : Math.max(0, 1 - (t - 8.2) / 2.6);
    if (t > 8.2) once('dust', () => sting());
    const pts = dust.current;
    if (pts) {
      const m = pts.material as THREE.PointsMaterial, base = (dustGeo as any).userData.base as Float32Array, pos = dustGeo.attributes.position as THREE.BufferAttribute, e = Math.max(0, t - 8.2);
      m.opacity = t < 8.2 ? 0 : Math.min(0.8, e * 1.2) * (1 - sm(10.4, 12.2, t));
      for (let i = 0; i < 60; i++) { pos.setY(i, (base[i * 3 + 1] + e * (0.25 + (i % 7) * 0.05)) % 2.2); pos.setX(i, base[i * 3] + Math.sin(e * 1.4 + i) * 0.06); }
      pos.needsUpdate = true; pts.visible = t >= 8.2;
    }
    if (t > 9.4) once('music', () => startEndingMusic());
    if (t > 10.9) once('flash', () => useGame.setState({ flash: Date.now() }));

    // fade to black, then the end card (never back to gameplay)
    const f = t < 1.2 ? 1 - t / 1.2 : sm(11.6, 14.6, t);
    if (Math.abs(s.fade - f) > 0.015) useGame.setState({ fade: f });
    if (t > 15) finishEnding();
  });

  return <>
    <group ref={nourG}>
      <Safe fb={<Figure />}><Suspense fallback={<Figure />}><Nour vis={vis} /></Suspense></Safe>
      <points ref={dust} geometry={dustGeo} visible={false}>
        <pointsMaterial size={0.05} color="#d8ecff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
    <mesh ref={wall} visible={false}><boxGeometry args={[6, 3, 0.1]} /><meshStandardMaterial color="#a9d6de" transparent opacity={0.28} roughness={0.1} metalness={0.2} emissive="#1b3a40" side={THREE.DoubleSide} /></mesh>
  </>;
}
