'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { PUZ, INTRO, nextHint, type Pz } from '@/lib/puzzles';
import { placeOf } from '@/lib/place';
import { interact, think } from '@/lib/engine';

// Invisible hotspots (no floor items, no glints): the player has to look around, and the character's monologue nudges them when they stall.
export default function Interactables() {
  const { camera } = useThree();
  const scene = useGame(s => s.scene);
  const flags = useGame(s => s.flags);
  const inv = useGame(s => s.inventory);
  const list = PUZ[scene] || [];
  const near = useRef(-1), tick = useRef(0);
  const [pos, setPos] = useState<THREE.Vector3[]>([]);
  const reach = scene === 'bathroom_interior' ? 1.2 : 1.8;   // markers sit on the wall/furniture surface; the bathroom is tiny so its hotspots are close together
  const sprites = useRef<(THREE.Sprite | null)[]>([]);   // soft halo
  const stars = useRef<(THREE.Sprite | null)[]>([]);     // crisp rotating sparkle

  useEffect(() => {
    setPos([]);
    const id = setTimeout(() => setPos(list.map(p => placeOf(scene, p))), 500);
    return () => clearTimeout(id);
  }, [scene]);

  // an interactable is active unless it is hidden (showIf) or already used up (switch / code / container)
  const active = (p: Pz) => !(p.showIf && !flags[p.showIf]) && !((p.kind === 'switch' || p.kind === 'code' || p.kind === 'container') && flags[p.id]);

  useFrame(({ clock }, dt) => {
    // Clear, smooth glint. Every interactable pulses between dim and very bright on a ~2 s cycle (opacity, brightness and size together),
    // each one on its own phase so they never blink in unison. The halo is drawn above 1.0 brightness so the bloom pass makes it shine,
    // ignores fog (still readable in the dark scenes) and is nudged toward the camera so a wall can never swallow half of it.
    const tt = clock.elapsedTime;
    sprites.current.forEach((sp, i) => {
      const st = stars.current[i];
      if (!sp || !st || !pos[i]) return;
      const d = camera.position.distanceTo(pos[i]), vis = d < 16;
      sp.visible = st.visible = vis;
      if (!vis) return;
      const ph = tt * 3.1 + i * 1.9, pulse = 0.5 + 0.5 * Math.sin(ph);            // smooth 0..1
      const e = pulse * pulse * (3 - 2 * pulse);                                    // eased: lingers at both ends, so the rise/fall is obvious
      const k = d < reach ? 1.3 : 1;                                                // brighter and bigger once you can interact
      const far = Math.min(2.4, Math.max(1, d * 0.16));                             // keep it readable from across the room
      sp.position.copy(pos[i]).lerp(camera.position, Math.min(0.5, 0.09 / Math.max(0.2, d)));
      st.position.copy(sp.position);
      const m = sp.material as THREE.SpriteMaterial, bright = (0.7 + 1.5 * e) * k;
      m.opacity = Math.min(1, 0.16 + 0.84 * e);
      m.color.copy(base(list[i])).multiplyScalar(bright);
      sp.scale.setScalar((0.2 + 0.16 * e) * k * far);
      const sm2 = st.material as THREE.SpriteMaterial;
      sm2.opacity = Math.min(1, 0.1 + 0.9 * e);
      sm2.rotation = tt * 0.6 + i;
      sm2.color.copy(base(list[i])).multiplyScalar(1.2 + 1.6 * e);
      st.scale.setScalar((0.1 + 0.28 * e) * k * far);
    });
    tick.current += dt;
    if (tick.current < 0.15) return;
    tick.current = 0;
    let b = -1, bd = reach;
    pos.forEach((p, i) => {
      if (!active(list[i])) return;
      const d = Math.hypot(p.x - camera.position.x, p.z - camera.position.z) + Math.abs(p.y - camera.position.y) * 0.25;
      if (d < bd) { bd = d; b = i; }
    });
    near.current = b;
    const s = useGame.getState();
    const pr = b >= 0 ? (s.lang === 'ar' ? list[b].ar : list[b].en) : '';
    if (s.prompt !== pr) useGame.setState({ prompt: pr });
  });

  const act = useGame(s => s.actReq);
  useEffect(() => {
    if (!act || near.current < 0) return;
    interact(list[near.current]);
  }, [act]);

  // progress tracking, opening thought and stall hints
  useEffect(() => { useGame.setState({ lastProgress: Date.now() }); }, [flags, inv]);
  useEffect(() => {
    const key = 'mono_' + scene;
    const id = setTimeout(() => {
      const s = useGame.getState();
      if (s.screen !== 'game' || s.flags[key]) return;
      think(INTRO[scene], 5500);
      useGame.setState(x => ({ flags: { ...x.flags, [key]: true } }));
    }, 2200);
    return () => clearTimeout(id);
  }, [scene]);
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGame.getState();
      if (s.screen !== 'game' || s.pauseOpen || s.settingsOpen || s.invOpen || s.phoneOpen || s.card || s.lock || s.mono || world_focus()) return;
      if (Date.now() - s.lastProgress > 55000) {
        const h = nextHint(scene, s.flags, s.inventory);
        if (h) { think(h, 6500); useGame.setState({ lastProgress: Date.now() - 15000 }); }  // next nudge in ~40 s
      }
    }, 4000);
    return () => clearInterval(id);
  }, [scene]);

  return (
    <>
      {pos.length > 0 && list.map((p, i) => (active(p) && pos[i]) ? (
        <group key={p.id}>
          <sprite position={pos[i]} ref={el => { sprites.current[i] = el; }} renderOrder={5} scale={0.25}>
            <spriteMaterial map={glowTex()} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.4} color={base(p)} fog={false} toneMapped={false} />
          </sprite>
          <sprite position={pos[i]} ref={el => { stars.current[i] = el; }} renderOrder={6} scale={0.2}>
            <spriteMaterial map={starTex()} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.4} color={base(p)} fog={false} toneMapped={false} />
          </sprite>
        </group>
      ) : null)}
    </>
  );
}

const _c = new Map<string, THREE.Color>();
const base = (p: Pz) => { const k = p.kind; let c = _c.get(k); if (!c) { c = new THREE.Color(k === 'exit' ? '#ffb9a2' : k === 'clue' ? '#bfe4ee' : '#ffe2a8'); _c.set(k, c); } return c; };

// a crisp 4-point sparkle (long vertical/horizontal rays + bright core)
let _star: THREE.CanvasTexture | null = null;
function starTex() {
  if (!_star) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!; g.translate(64, 64);
    const ray = (rot: number, len: number, w: number) => { g.save(); g.rotate(rot); const l = g.createLinearGradient(-len, 0, len, 0); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(.5, 'rgba(255,255,255,1)'); l.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = l; g.beginPath(); g.ellipse(0, 0, len, w, 0, 0, 7); g.fill(); g.restore(); };
    ray(0, 62, 3.2); ray(Math.PI / 2, 62, 3.2); ray(Math.PI / 4, 34, 2); ray(-Math.PI / 4, 34, 2);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(0, 0, 16, 0, 7); g.fill();
    _star = new THREE.CanvasTexture(c);
  }
  return _star;
}

// one shared soft radial glow texture
let _glow: THREE.CanvasTexture | null = null;
function glowTex() {
  if (!_glow) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.25, 'rgba(255,220,150,.55)'); r.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c);
  }
  return _glow;
}
import { world } from '@/lib/world';
const world_focus = () => !!world.focus;
