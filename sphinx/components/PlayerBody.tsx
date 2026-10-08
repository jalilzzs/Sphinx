'use client';
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';

interface PlayerBodyProps {
  modelPath?: string; // مسار الموديل الكامل للشخصية
}

export function PlayerBody({ modelPath = '/models/player/character.glb' }: PlayerBodyProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  const { scene, animations } = useGLTF(modelPath);
  const { actions, names } = useAnimations(animations, groupRef);

  const currentAnim = useRef<string>('');

  // 1. إخفاء رأس الشخصية لمنع الرؤية من داخل الوجه (Head Clipping)
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const name = child.name.toLowerCase();
        if (name.includes('head') || name.includes('face') || name.includes('hair') || name.includes('eye')) {
          child.visible = false;
        } else {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      }
    });
  }, [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const s = useGame.getState();
    const isMoving = Math.hypot(s.move?.x || 0, s.move?.y || 0) > 0.1;
    const isRunning = isMoving && s.sprint;
    const isCrouching = s.crouch;

    // 2. ربط موضع الشخصية بقدمي اللاعب تحت الكاميرا مباشرة مع تعديل الارتفاع (رفع الكاميرا لمستوى عيني الشخصية بدقة)
    const camPos = camera.position;
    const eyeHeight = isCrouching ? 1.15 : 1.95; // رفعت الارتفاعات باش الكاميرا تولي بياض و في مستوى العينين الصحيح
    
    groupRef.current.position.set(camPos.x, camPos.y - eyeHeight, camPos.z);

    // 3. تدوير جسم الشخصية مع اتجاه النظر الأفقي للكاميرا (Y-Axis)
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    groupRef.current.rotation.y = euler.y;

    // 4. اختيار وتطبيق الأنيميشن بناءً على حالة الحركة
    let targetAnim = 'Idle';

    if (isCrouching) {
      targetAnim = isMoving ? 'CrouchWalk' : 'CrouchIdle';
    } else if (isRunning) {
      targetAnim = 'Run';
    } else if (isMoving) {
      targetAnim = 'Walk';
    }

    const matchedName = names.find(n => n.toLowerCase().includes(targetAnim.toLowerCase())) || names[0];

    if (matchedName && currentAnim.current !== matchedName) {
      if (currentAnim.current && actions[currentAnim.current]) {
        actions[currentAnim.current]?.fadeOut(0.2);
      }
      actions[matchedName]?.reset().fadeIn(0.2).play();
      currentAnim.current = matchedName;
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} scale={1} />
    </group>
  );
}

useGLTF.preload('/models/player/character.glb');
