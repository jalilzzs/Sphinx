'use client';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, SSAO } from '@react-three/postprocessing';
import { useGame } from '@/lib/store';
import { SCENES } from '@/lib/scenes';
import SceneModel from './SceneModel';
import Player from './Player';
import Cutscene from './Cutscene';

export default function GameCanvas(){
  const {scene,quality,screen}=useGame();const def=SCENES[scene];const q=quality;
  return <Canvas dpr={q==='low'?[.6,1]:q==='med'?[1,1.5]:[1,2]} gl={{antialias:q!=='low',powerPreference:'high-performance'}} camera={{fov:72,near:.05,far:120}} className="!fixed inset-0">
    <color attach="background" args={[def.fog[0]]}/><fogExp2 attach="fog" args={[def.fog[0],def.fog[1]]}/>
    <ambientLight intensity={def.ambient}/><hemisphereLight args={['#6b7a8a','#1a1410',def.ambient*.6]}/>
    <Suspense fallback={null}>
      {screen==='cutscene'?<Cutscene/>:<><SceneModel key={scene} id={scene}/><Player/></>}
    </Suspense>
    {q!=='low'&&<EffectComposer multisampling={0}>
      <Bloom intensity={.35} luminanceThreshold={.7}/><Vignette darkness={.7} offset={.3}/>
      {q==='high'?<SSAO radius={.12} intensity={14} luminanceInfluence={.5}/>:<></>}
    </EffectComposer>}
  </Canvas>;
}
