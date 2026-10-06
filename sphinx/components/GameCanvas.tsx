'use client';
import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as PP from '@react-three/postprocessing';
import { useGame } from '@/lib/store';
import { SCENES } from '@/lib/scenes';
import SceneModel from './SceneModel';
import Player from './Player';
import Cutscene from './Cutscene';
import Interactables from './Interactables';
const SSAO:any=PP.SSAO,FXAA:any=(PP as any).FXAA||PP.SMAA;
function Limiter({fps}:{fps:number}){const {advance}=useThree();
  useEffect(()=>{let id=0,last=0;const iv=1000/fps;const loop=(t:number)=>{id=requestAnimationFrame(loop);if(t-last>=iv){last=t;advance(t/1000)}};id=requestAnimationFrame(loop);return()=>cancelAnimationFrame(id)},[fps,advance]);return null}
export default function GameCanvas(){
  const {scene,quality,screen,res,fps,shadows,aa,post}=useGame();const def=SCENES[scene];
  const dpr=Math.max(.4,Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2)*res);
  return <Canvas frameloop={fps?'never':'always'} dpr={dpr} shadows={shadows} gl={{antialias:aa!=='none'&&quality!=='low',powerPreference:'high-performance'}} camera={{fov:72,near:.05,far:120}} className="!fixed inset-0">
    {fps>0&&<Limiter fps={fps}/>}
    <color attach="background" args={[def.fog[0]]}/><fogExp2 attach="fog" args={[def.fog[0],def.fog[1]]}/>
    <ambientLight intensity={def.ambient}/><hemisphereLight args={['#6b7a8a','#1a1410',def.ambient*.6]}/>
    <Suspense fallback={null}>{screen==='cutscene'?<Cutscene/>:<><SceneModel key={scene} id={scene}/><Player/><Interactables/></>}</Suspense>
    {post&&<PP.EffectComposer multisampling={0}>
      <PP.Bloom intensity={.35} luminanceThreshold={.7}/><PP.Vignette darkness={.7} offset={.3}/>
      {quality==='high'?<SSAO samples={16} rings={4} radius={.12} intensity={14} luminanceInfluence={.5} worldDistanceThreshold={20} worldDistanceFalloff={5} worldProximityThreshold={.4} worldProximityFalloff={.1}/>:<></>}
      {aa==='smaa'?<PP.SMAA/>:aa==='fxaa'?<FXAA/>:<></>}
    </PP.EffectComposer>}
  </Canvas>}
