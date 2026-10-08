'use client';
import React, { useState, Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useGame } from '@/lib/store';
import { ITEMS, RECIPES } from '@/lib/puzzles';
import { autosave } from '@/lib/saves';
import { click } from '@/lib/audio';

// Catch loading or 404 errors for GLB models and fallback to geometric shapes
class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('GLB model failed to load, falling back to geometric shape:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Procedural fallback shapes
function ProceduralObj({ id }: { id: string }) {
  const it = ITEMS[id];
  if (!it) return null;
  const m = <meshStandardMaterial color={it.color} metalness={0.6} roughness={0.35} />;

  return (
    <group>
      {it.shape === 'vial' ? (
        <>
          <mesh><cylinderGeometry args={[0.5, 0.5, 1, 24]} />{m}</mesh>
          <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[0.2, 0.2, 0.3, 16]} /><meshStandardMaterial color="#555" /></mesh>
        </>
      ) : it.shape === 'pendant' ? (
        <>
          <mesh><torusGeometry args={[0.5, 0.08, 16, 32]} />{m}</mesh>
          <mesh position={[0, -0.5, 0]}><octahedronGeometry args={[0.35]} />{m}</mesh>
        </>
      ) : it.shape === 'cells' ? (
        <>
          <mesh position={[-0.3, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 1.1, 16]} />{m}</mesh>
          <mesh position={[0.3, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 1.1, 16]} />{m}</mesh>
        </>
      ) : it.shape === 'card' ? (
        <mesh><boxGeometry args={[1.4, 0.9, 0.04]} />{m}</mesh>
      ) : (
        <>
          <mesh><boxGeometry args={[1.3, 0.8, 0.35]} />{m}</mesh>
          <mesh position={[-0.3, 0.1, 0.2]}><cylinderGeometry args={[0.18, 0.18, 0.05, 16]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.3, 0.1, 0.2]}><cylinderGeometry args={[0.18, 0.18, 0.05, 16]} /><meshStandardMaterial color="#222" /></mesh>
        </>
      )}
    </group>
  );
}

// Render GLB model
function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} scale={0.85} position={[0, 0, 0]} />;
}

// Combined 3D Object Renderer
export function Obj({ id }: { id: string }) {
  const it = ITEMS[id];
  if (!it) return null;

  const fallback = <ProceduralObj id={id} />;
  const modelUrl = (it as any).model || `/models/items/${id}.glb`;

  return (
    <ModelErrorBoundary key={id} fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBModel url={modelUrl} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

export default function Inventory() {
  const g = useGame();
  const ar = g.lang === 'ar';
  const [sel, setSel] = useState(0);
  const [comb, setComb] = useState(false);

  const combine = (a: string, b: string) => {
    const r = RECIPES[a + '+' + b] || RECIPES[b + '+' + a];
    setComb(false);
    if (!r) {
      g.say(ar ? 'لا يمكن دمجهما.' : 'These do not combine.');
      return;
    }
    g.set({ inventory: [...g.inventory.filter(x => x !== a && x !== b), r] });
    setSel(0);
    g.unlock('ach_craft');
    click();
    autosave();
  };

  const cur = g.inventory[sel];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-3"
      onPointerDown={e => e.target === e.currentTarget && g.set({ invOpen: false })}
    >
      <div className="glass p-5 w-full max-w-xl max-h-[92vh] overflow-auto">
        <div className="flex justify-between mb-3">
          <h3 className="font-display text-2xl">{ar ? 'الحقيبة' : 'Inventory'}</h3>
          <button onClick={() => g.set({ invOpen: false })}>✕</button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => {
            const id = g.inventory[i];
            return id ? (
              <button
                key={i}
                draggable
                onDragStart={e => e.dataTransfer.setData('i', String(i))}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const a = g.inventory[+e.dataTransfer.getData('i')];
                  if (a && a !== id) combine(a, id);
                }}
                onClick={() => {
                  if (comb && cur && i !== sel) combine(cur, id);
                  else setSel(i);
                }}
                className={`aspect-square glass text-xs p-1 ${i === sel ? '!border-gold' : ''}`}
              >
                {ar ? ITEMS[id].ar : ITEMS[id].en}
              </button>
            ) : (
              <div key={i} className="aspect-square glass opacity-40" />
            );
          })}
        </div>

        {cur && (
          <div className="grid grid-cols-[150px_1fr] gap-4 mt-4 items-center">
            <div className="h-40 rounded-xl overflow-hidden bg-black/40 touch-none">
              <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[2, 3, 4]} intensity={2} />
                <Obj id={cur} />
                <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={2} />
              </Canvas>
            </div>
            <div>
              <b>{ar ? ITEMS[cur].ar : ITEMS[cur].en}</b>
              <p className="text-sm text-white/60 my-2">{ar ? ITEMS[cur].dAr : ITEMS[cur].dEn}</p>
              <button
                className={`btn !py-2 text-sm ${comb ? '!border-gold' : ''}`}
                onClick={() => setComb(!comb)}
              >
                {ar ? 'دمج' : 'Combine'}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-white/40 mt-3">
          {ar
            ? 'اسحب عنصراً فوق آخر، أو اضغط دمج ثم اختر عنصراً ثانياً. اسحب المجسّم لتدويره 360°.'
            : 'Drag one item onto another, or tap Combine then a second item. Drag the preview to rotate 360°.'}
        </p>
      </div>
    </div>
  );
}
