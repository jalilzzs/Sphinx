'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { PUZ, ITEMS } from '@/lib/puzzles';
import { placeOf } from '@/lib/place';
import { autosave } from '@/lib/saves';
import { D } from '@/lib/i18n';
import { click, paper, doorMetal, doorLocked } from '@/lib/audio';
import { Obj } from './Inventory';

export default function Interactables() {
  const { camera } = useThree();
  const scene = useGame(s => s.scene);
  const flags = useGame(s => s.flags);
  const list = PUZ[scene] || [];
  const near = useRef(-1);
  const tick = useRef(0);
  const [pos, setPos] = useState<THREE.Vector3[]>([]);

  useEffect(() => {
    setPos([]);
    const id = setTimeout(() => setPos(list.map(p => placeOf(scene, p))), 500);
    return () => clearTimeout(id);
  }, [scene]);

  useFrame((_, dt) => {
    tick.current += dt;
    if (tick.current < 0.15) return;
    tick.current = 0;

    let b = -1;
    let bd = 2.3;

    pos.forEach((p, i) => {
      if (flags[list[i].id] && list[i].kind !== 'exit') return;
      const d = Math.hypot(p.x - camera.position.x, p.z - camera.position.z) + Math.abs(p.y - camera.position.y) * 0.4;
      if (d < bd) {
        bd = d;
        b = i;
      }
    });

    near.current = b;
    const s = useGame.getState();
    const pr = b >= 0 ? (s.lang === 'ar' ? list[b].ar : list[b].en) : '';
    if (s.prompt !== pr) useGame.setState({ prompt: pr });
  });

  const act = useGame(s => s.actReq);

  useEffect(() => {
    if (!act || near.current < 0) return;
    const p = list[near.current];
    const s = useGame.getState();
    const L = s.lang;
    const t = D[L] as any;
    if (p.kind === 'item') {
      click();
      s.set({ inventory: [...s.inventory, p.give!], flags: { ...s.flags, [p.id]: true } });
      s.say(t.got + (L === 'ar' ? ITEMS[p.give!].ar : ITEMS[p.give!].en));
      autosave();
    } else if (p.kind === 'clue') {
      s.set({ flags: { ...s.flags, [p.id]: true } });
      s.say(L === 'ar' ? p.txtAr! : p.txtEn!);
      s.unlock('ach_clue');
      paper();
      autosave();
    } else {
      if (p.need && !s.inventory.includes(p.need)) {
        const it = ITEMS[p.need];
        s.say(t.locked + (L === 'ar' ? it.ar : it.en));
        doorLocked();
      } else {
        s.set({ flags: { ...s.flags, [p.id]: true }, exitReq: Date.now() });
        doorMetal();
      }
    }
  }, [act]);

  // إظهار العنصر فقط بشكل واقعي وبدون أي توهج أو نجوم
  return (
    <>
      {pos.length > 0 &&
        list.map((p, i) =>
          flags[p.id] && p.kind !== 'exit' ? null : (
            <group key={p.id} position={pos[i]}>
              {p.kind === 'item' && (
                <group scale={0.1}>
                  <Obj id={p.give!} />
                </group>
              )}
            </group>
          )
        )}
    </>
  );
}
