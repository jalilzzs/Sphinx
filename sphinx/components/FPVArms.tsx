'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { Obj } from './Inventory'; // لإظهار الغرض المحمول في اليد

export function FPVArms() {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF('/models/player/hands.glb');
  const g = useGame();

  // متغيرات لتعديل مكان وتأرجح اليدين
  const posOffset = new THREE.Vector3(0.2, -0.35, -0.45); // [يمين/يسار، أسفل/أعلى، قريب/بعيد]

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // 1. اتباع حركة ومكان الكاميرا دائمًا
    groupRef.current.position.copy(state.camera.position);
    groupRef.current.quaternion.copy(state.camera.quaternion);

    // 2. حساب حركة التأرجح (Head & Hand Bobbing) أثناء المشي والجري
    // يمكنك تعديل الخصائص حسب حالة الحركة في store
    const isMoving = (g as any).isMoving || false;
    const isRunning = (g as any).isRunning || false;

    if (isMoving) {
      const speed = isRunning ? 12 : 7;
      const amount = isRunning ? 0.02 : 0.01;
      const t = state.clock.getElapsedTime() * speed;

      // حركة موجية للأعلى والأسفل وللجانبين
      groupRef.current.children[0].position.y = posOffset.y + Math.sin(t) * amount;
      groupRef.current.children[0].position.x = posOffset.x + Math.cos(t / 2) * (amount * 0.8);
    } else {
      // العودة السلسة للوضع الطبيعي عند التوقف
      groupRef.current.children[0].position.y = THREE.MathUtils.lerp(
        groupRef.current.children[0].position.y,
        posOffset.y,
        delta * 5
      );
      groupRef.current.children[0].position.x = THREE.MathUtils.lerp(
        groupRef.current.children[0].position.x,
        posOffset.x,
        delta * 5
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* تموضع اليدين بالنسبة لزاوية رؤية الكاميرا */}
      <group position={posOffset.toArray()} rotation={[0, Math.PI, 0]}>
        <primitive object={scene.clone()} scale={0.4} />

        {/* 3. إظهار الغرض المجهز حالياً في اليد اليمنى (مثل الكشاف أو المفتاح) */}
        {(g as any).equippedItem && (
          <group position={[0.1, 0.05, 0.2]} rotation={[0.2, 0.5, 0]} scale={0.3}>
            <Obj id={(g as any).equippedItem} />
          </group>
        )}
      </group>
    </group>
  );
}

// تحضير مسبق للموديل لمنع التأخير عند التحميل
useGLTF.preload('/models/player/hands.glb');
