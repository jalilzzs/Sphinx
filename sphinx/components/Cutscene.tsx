'use client';
import React, { Component, Suspense, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CHARACTERS } from '@/lib/scenes';
import { fitHeight, world } from '@/lib/world';
import { useGame } from '@/lib/store';

class Safe extends Component<{ fb: any; children: any }, { e: boolean }> {
  state = { e: false };
  static getDerivedStateFromError() { return { e: true }; }
  componentDidCatch(e: any) { console.warn('cutscene actor failed', e); }
  render() { return this.state.e ? this.props.fb : this.props.children; }
}

const Fig = ({ o, h }: { o: React.MutableRefObject<THREE.Object3D | null>; h: number }) => (
  <group ref={o as any}>
    <mesh position={[0, h / 2, 0]}>
      <capsuleGeometry args={[0.22, h - 0.44, 6, 12]} />
      <meshStandardMaterial color="#8a7a66" />
    </mesh>
  </group>
);

function Actor({ file, h, o }: { file: string; h: number; o: React.MutableRefObject<THREE.Object3D | null> }) {
  const { scene } = useGLTF('/models/' + file);
  const c = useMemo(() => {
    const x = scene.clone(true);
    fitHeight(x, h);
    return x;
  }, [scene]);
  return <group ref={o as any}><primitive object={c} /></group>;
}

export default function Cutscene() {
  const { camera } = useThree();
  const sceneId = useGame(s => s.scene);
  const man = useRef<THREE.Object3D | null>(null);
  const T = useRef(0);
  const placed = useRef(false);
  const [textIndex, setTextIndex] = useState(0);

  // نصوص وسيناريو القصة حسب المشهد الحالي
  const storyLines: Record<string, { title: string; subtitles: string[] }> = {
    bathroom_interior: {
      title: "الفصل الأول: الاستيقاظ والمغسلة",
      subtitles: [
        "استيقظت في هذا الحمام المظلم... رأسي يؤلمني ولا أذكر كيف وصلت إلى هنا.",
        "هناك شيء يتلألأ فوق المغسلة... ورقة مطوية بخط يد غريب!",
        "مكتوب في الورقة: 'إذا أردت رؤية نور حية... اتبع العنوان إلى المستودع المهجور.'",
        "المرآة المكسورة تعكس شيئاً خفياً... اجمع الأغراض وافتح الباب قبل فوات الأوان!"
      ]
    },
    abandoned_warehouse_-_interior_scene: {
      title: "الفصل الثاني: المستودع المهجور",
      subtitles: [
        "وصلت إلى المستودع المهجور... الأصوات هنا تبعث على القشعريرة.",
        "الهاتف يرن في جيبي... رسالة جديدة من رقم مجهول!",
        "ابحث عن الأدلة الخفية لتكشف مكان المخبأ."
      ]
    }
  };

  const currentStory = storyLines[sceneId] || {
    title: "مستجدات البحث",
    subtitles: ["استمر في استكشاف المكان وحل الألغاز للوصول للحقيقة..."]
  };

  useFrame((_, dt) => {
    T.current += dt;
    const t = T.current;
    const s = world.spawn || { x: 0, y: 0, z: 0 };

    // تثبيت موضع الشخصية في نقطة البداية
    if (!placed.current && man.current) {
      man.current.position.set(s.x, s.y, s.z);
      placed.current = true;
    }

    // حركة الكاميرا السينمائية حول الغرفة والمغسلة
    if (sceneId === 'bathroom_interior') {
      if (t < 4) {
        // المرحة 1: دوران بطيء حول الشخصية
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, s.x + Math.sin(t * 0.5) * 2.2, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, s.y + 1.6, 0.05);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, s.z + Math.cos(t * 0.5) * 2.2, 0.05);
        camera.lookAt(s.x, s.y + 1.2, s.z);
      } else {
        // المرحلة 2: زوم واقتراب ناعم نحو اتجاه المغسلة/الأمام
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, s.x + 0.8, 0.03);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, s.y + 1.4, 0.03);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, s.z - 1.2, 0.03);
        camera.lookAt(s.x, s.y + 1.1, s.z - 2.5);
      }
    } else {
      // حركة عامة لبقية المشاهد
      camera.position.set(s.x + Math.sin(t * 0.3) * 3, s.y + 1.7, s.z + Math.cos(t * 0.3) * 3);
      camera.lookAt(s.x, s.y + 1.2, s.z);
    }
  });

  const finishCutscene = () => {
    useGame.setState({ screen: 'game' });
  };

  return (
    <>
      {/* مجسم اللاعب يُعرض في الكاتسين */}
      <Safe fb={<Fig o={man} h={1.78} />}>
        <Suspense fallback={<Fig o={man} h={1.78} />}>
          <Actor file={CHARACTERS.player} h={1.78} o={man} />
        </Suspense>
      </Safe>

      {/* واجهة النص والأزرار فوق المشهد الـ 3D */}
      <Html fullscreen className="pointer-events-auto select-none flex flex-col justify-between p-6 md:p-10 text-white dir-rtl">
        {/* عنوان الفصل */}
        <div className="text-center mt-4">
          <h1 className="text-2xl md:text-4xl font-bold text-amber-500 tracking-wider mb-1 drop-shadow-md">
            {currentStory.title}
          </h1>
          <div className="w-20 h-1 bg-amber-600 mx-auto rounded-full"></div>
        </div>

        {/* النص السينمائي للقصة */}
        <div className="bg-black/70 backdrop-blur-md border border-amber-900/50 p-6 rounded-2xl max-w-2xl mx-auto my-auto text-center shadow-2xl">
          <p className="text-lg md:text-2xl font-medium leading-relaxed text-gray-100 transition-all duration-500">
            "{currentStory.subtitles[textIndex]}"
          </p>
        </div>

        {/* أزرار التحكم بالتنقل والتخطي */}
        <div className="flex justify-between items-center mb-4 max-w-4xl mx-auto w-full">
          <button
            onClick={finishCutscene}
            className="px-5 py-2.5 bg-gray-900/80 hover:bg-gray-800 text-gray-300 rounded-xl text-sm border border-gray-700 transition"
          >
            تخطي (Skip)
          </button>

          {textIndex < currentStory.subtitles.length - 1 ? (
            <button
              onClick={() => setTextIndex(prev => prev + 1)}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl shadow-lg transition"
            >
              التالي ←
            </button>
          ) : (
            <button
              onClick={finishCutscene}
              className="px-7 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold rounded-xl shadow-xl transition transform hover:scale-105"
            >
              بدء التحقيق واللعب ➔
            </button>
          )}
        </div>
      </Html>
    </>
  );
}
