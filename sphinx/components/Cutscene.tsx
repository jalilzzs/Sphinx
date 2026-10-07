'use client';
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';

export default function Cutscene() {
  const { camera } = useThree();
  const time = useRef(0);
  const target = useRef(new THREE.Vector3(0, 1.2, 0));

  useEffect(() => {
    // وضع الكاميرا الابتدائي داخل الحمام
    camera.position.set(0, 1.6, 1.2);
    camera.lookAt(0, 1.2, -0.5);
  }, [camera]);

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;

    // حركة سينمائية هادئة محصورة تماماً داخل الحمام (المدة الكلية: 10 ثوانٍ)
    if (t < 3.5) {
      // المشهد 1: حركة بطيئة نحو المغسلة والمرآة
      camera.position.x = Math.sin(t * 0.3) * 0.3;
      camera.position.y = 1.6 + Math.cos(t * 0.4) * 0.03;
      camera.position.z = 1.2 - t * 0.08;
      target.current.set(0, 1.3, -0.8);
    } else if (t < 7.0) {
      // المشهد 2: دوران قصير جداً وبطيء داخل حدود الغرفة
      const angle = (t - 3.5) * 0.2;
      camera.position.x = Math.sin(angle) * 0.5;
      camera.position.z = Math.cos(angle) * 0.5 + 0.3;
      camera.position.y = 1.55;
      target.current.set(0, 1.1, 0);
    } else if (t < 10.0) {
      // المشهد 3: العودة لمنظور عين اللاعب للتهيؤ للعب
      const p = (t - 7.0) / 3.0;
      camera.position.lerpVectors(new THREE.Vector3(0, 1.5, 0.6), new THREE.Vector3(0, 1.65, 0), p);
      target.current.set(0, 1.5, -1);
    } else {
      // انتهاء الكاتسين -> التحويل لوضع اللعب وعرض أزرار الـ HUD فوراً
      useGame.getState().set({ screen: 'game' });
    }

    camera.lookAt(target.current);
  });

  return null;
}
