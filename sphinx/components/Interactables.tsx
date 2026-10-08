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
  const fx = useGame(s => s.fx);
  const sprites = useRef<(THREE.Sprite | null)[]>([]);

  useEffect(() => {
    setPos([]);
    const id = setTimeout(() => setPos(list.map(p => placeOf(scene, p))), 500);
    return () => clearTimeout(id);
  }, [scene]);

  // an interactable is active unless it is hidden (showIf) or already used up (switch / code / container)
  const active = (p: Pz) => !(p.showIf && !flags[p.showIf]) && !((p.kind === 'switch' || p.kind === 'code' || p.kind === 'container') && flags[p.id]);

  useFrame(({ clock }, dt) => {
    // subtle shimmer: a soft additive glint that breathes slowly (static when effects are Off), only drawn when you are fairly close
    const tt = clock.elapsedTime;
    sprites.current.forEach((sp, i) => {
      if (!sp || !pos[i]) return;
      const d = camera.position.distanceTo(pos[i]), near = d < 9;
      sp.visible = near;
      if (!near) return;
      const pulse = fx > 0 ? 0.5 + 0.5 * Math.sin(tt * 1.8 + i * 1.7) : 0.5;
      const k = d < reach ? 1.35 : 1;                                  // a touch brighter once you can interact
      (sp.material as THREE.SpriteMaterial).opacity = (0.16 + 0.2 * pulse) * k;
      sp.scale.setScalar((0.11 + 0.035 * pulse) * k);
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
        <sprite key={p.id} position={pos[i]} ref={el => { sprites.current[i] = el; }} renderOrder={5}>
          <spriteMaterial map={glowTex()} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.25} color={p.kind === 'exit' ? '#ffb9a2' : p.kind === 'clue' ? '#bfe4ee' : '#ffe2a8'} />
        </sprite>
      ) : null)}
    </>
  );
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
