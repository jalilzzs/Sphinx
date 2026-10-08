'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGame } from '@/lib/store';
import { Obj } from './Inventory';

export function FPVArms() {
  const groupRef = useRef<THREE.Group>(null!);
  const armGroupRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF('/models/player/hands.glb');

  // استنساخ مجسم العظام (SkinnedMesh) بطريقة صحيحة لمنع اختفاء اليدين
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  // إحداثيات تمركز اليدين أمام الكاميرا [يمين/يسار، أسفل/أعلى، قريب/بعيد]
  const posOffset = useMemo(() => new THREE.Vector3(0.18, -0.28, -0.4), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // 1. مطابقة الكاميرا في كل إطار
    groupRef.current.position.copy(state.camera.position);
    groupRef.current.quaternion.copy(state.camera.quaternion);

    // 2. قراءة حالة الحركة المباشرة من الستور
    const g = useGame.getState();
    const isMoving = Math.hypot(g.move?.x || 0, g.move?.y || 0) > 0.1;
    const isRunning = isMoving && g.sprint;

    // 3. تأرجح اليدين أثناء المشي والركض
    if (armGroupRef.current) {
      if (isMoving) {
        const speed = isRunning ? 12 : 7;
        const amount = isRunning ? 0.025 : 0.012;
        const t = state.clock.getElapsedTime() * speed;

        armGroupRef.current.position.y = posOffset.y + Math.sin(t) * amount;
        armGroupRef.current.position.x = posOffset.x + Math.cos(t / 2) * (amount * 0.8);
      } else {
        // العودة السلسة للوضع الطبيعي عند التوقف
        armGroupRef.current.position.y = THREE.MathUtils.lerp(
          armGroupRef.current.position.y,
          posOffset.y,
          delta * 6
        );
        armGroupRef.current.position.x = THREE.MathUtils.lerp(
          armGroupRef.current.position.x,
          posOffset.x,
          delta * 6
        );
      }
    }
  });

  const equippedItem = useGame(s => (s as any).equippedItem);

  return (
    <group ref={groupRef}>
      <group ref={armGroupRef} position={posOffset.toArray()} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} scale={0.4} />

        {/* إظهار الغرض المجهز في اليد */}
        {equippedItem && (
          <group position={[0.1, 0.05, 0.2]} rotation={[0.2, 0.5, 0]} scale={0.3}>
            <Obj id={equippedItem} />
          </group>
        )}
      </group>
    </group>
  );
}

useGLTF.preload('/models/player/hands.glb');
