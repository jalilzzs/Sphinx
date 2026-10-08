'use client';
import { Component, Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import * as PP from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useGame } from '@/lib/store';
import { SCENES } from '@/lib/scenes';
import SceneModel from './SceneModel';
import Player from './Player';
import Cutscene from './Cutscene';
import Interactables from './Interactables';
import { FPVArms } from './FPVArms';

const SSAO: any = PP.SSAO, FXAA: any = (PP as any).FXAA || PP.SMAA;

class Boundary extends Component<{ children: any }, { e: boolean }> {
  state = { e: false };
  static getDerivedStateFromError() { return { e: true }; }
  componentDidCatch(e: any) { useGame.setState({ err: String(e?.message || e) }); }
  render() { return this.state.e ? null : this.props.children; }
}

// مكون مراقبة التحميل الفعلي للموديلات والبيئة
function LoaderSync() {
  const { active, progress } = useProgress();

  useEffect(() => {
    // التحويل التلقائي فور اكتمال تحميل ملفات الـ 3D بنسبة 100%
    if (!active && progress === 100) {
      const s = useGame.getState();
      if (s.screen === 'loading') {
        const targetScreen = (s as any).targetScreen || 'cutscene';
        useGame.setState({ screen: targetScreen });
      }
    }
  }, [active, progress]);

  return null;
}

// إضاءة المشهد العامة مع إمكانية تعديل السطوع (Exposure)
function Mood({ ambient }: { ambient: number }) {
  const { gl, scene } = useThree();
  const ex = useGame(s => s.exposure);
  useEffect(() => { gl.toneMappingExposure = ex; }, [gl, ex]);
  useEffect(() => {
    const p = new THREE.PMREMGenerator(gl);
    const t = p.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = t;
    (scene as any).environmentIntensity = 0.18;
    return () => { scene.environment = null; t.dispose(); p.dispose(); };
  }, [gl, scene]);

  return (
    <>
      <ambientLight intensity={0.1 + ambient * 0.6} color="#b8c4d8" />
      <hemisphereLight args={['#7d8ea8', '#2a2018', 0.28]} />
      <directionalLight position={[3, 5, 2]} intensity={0.45} color="#a9bbe0" />
      <directionalLight position={[-4, 3, -3]} intensity={0.18} color="#e8c898" />
    </>
  );
}

function Limiter({ fps }: { fps: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    const id = setInterval(invalidate, 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

export default function GameCanvas() {
  const { scene, quality, screen, res, fps, shadows, aa, post } = useGame();
  const def = SCENES[scene] || { fog: ['#0c0b0e', 0.05], ambient: 0.2 };
  const dpr = Math.max(0.4, Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2) * res);

  return (
    <Canvas
      frameloop={fps ? 'demand' : 'always'}
      dpr={dpr}
      shadows={shadows}
      gl={{ antialias: aa !== 'none' && quality !== 'low', powerPreference: 'high-performance' }}
      camera={{ fov: 72, near: 0.05, far: 120 }}
      className="!fixed inset-0"
    >
      {fps > 0 && <Limiter fps={fps} />}
      <color attach="background" args={[def.fog[0]]} />
      <fogExp2 attach="fog" args={[def.fog[0], def.fog[1]]} />
      
      <Boundary>
        <Mood ambient={def.ambient} />
        <Suspense fallback={null}>
          {/* مزامن التحميل الحقيقي */}
          <LoaderSync />

          {/* مجسم الغرفة 3D ينعرض دائماً في الخلفية للكاتسين وللعب */}
          <SceneModel key={scene} id={scene} />

          {/* إذا كنا في مرحلة الكاتسين نعرض تحريك الكاميرا والقصة، وإذا انتهت نعرض حركة اللاعب واليدين والتفاعلات */}
          {screen === 'cutscene' ? (
            <Cutscene />
          ) : (
            <>
              <Player />
              <FPVArms />
              <Interactables />
            </>
          )}
        </Suspense>
      </Boundary>

      {/* المؤثرات البصرية وإعدادات الجرافيكس */}
      {post && (
        <PP.EffectComposer multisampling={0}>
          <PP.Bloom intensity={0.18} luminanceThreshold={0.92} />
          <PP.Vignette darkness={0.75} offset={0.3} />
          {quality === 'high' ? (
            <SSAO samples={16} rings={4} radius={0.12} intensity={14} luminanceInfluence={0.5} worldDistanceThreshold={20} worldDistanceFalloff={5} worldProximityThreshold={0.4} worldProximityFalloff={0.1} />
          ) : null}
          {aa === 'smaa' ? <PP.SMAA /> : aa === 'fxaa' ? <FXAA /> : null}
        </PP.EffectComposer>
      )}
    </Canvas>
  );
}
