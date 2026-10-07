'use client';
import { Component, Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as PP from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useGame } from '@/lib/store';
import { SCENES } from '@/lib/scenes';
import SceneModel from './SceneModel';
import Player from './Player';
import Cutscene from './Cutscene';
import Interactables from './Interactables';
const SSAO:any=PP.SSAO,FXAA:any=(PP as any).FXAA||PP.SMAA;
class Boundary extends Component<{children:any},{e:boolean}>{state={e:false};static getDerivedStateFromError(){return{e:true}}
  componentDidCatch(e:any){useGame.setState({err:String(e?.message||e)})}render(){return this.state.e?null:this.props.children}}
// Mood lighting: dim cool "window" key light + hemisphere fill + low environment; brightness is user-adjustable (exposure)
function Mood({ambient}:{ambient:number}){const {gl,scene}=useThree();const ex=useGame(s=>s.exposure);
  useEffect(()=>{gl.toneMappingExposure=ex},[gl,ex]);
  useEffect(()=>{const p=new THREE.PMREMGenerator(gl),t=p.fromScene(new RoomEnvironment(),.04).texture;scene.environment=t;(scene as any).environmentIntensity=.18;return()=>{scene.environment=null;t.dispose();p.dispose()}},[gl,scene]);
  return <><ambientLight intensity={.1+ambient*.6} color="#b8c4d8"/><hemisphereLight args={['#7d8ea8','#2a2018',.28]}/>
    <directionalLight position={[3,5,2]} intensity={.45} color="#a9bbe0"/><directionalLight position={[-4,3,-3]} intensity={.18} color="#e8c898"/></>}
function Limiter({fps}:{fps:number}){const {invalidate}=useThree();useEffect(()=>{const id=setInterval(invalidate,1000/fps);return()=>clearInterval(id)},[fps,invalidate]);return null}
export default function GameCanvas(){
  const {scene,quality,screen,res,fps,shadows,aa,post}=useGame();const def=SCENES[scene];
  const dpr=Math.max(.4,Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2)*res);
  return <Canvas frameloop={fps?'demand':'always'} dpr={dpr} shadows={shadows} gl={{antialias:aa!=='none'&&quality!=='low',powerPreference:'high-performance'}} camera={{fov:72,near:.05,far:120}} className="!fixed inset-0">
    {fps>0&&<Limiter fps={fps}/>}
    <color attach="background" args={[def.fog[0]]}/><fogExp2 attach="fog" args={[def.fog[0],def.fog[1]]}/>
    <Boundary><Mood ambient={def.ambient}/>
      <Suspense fallback={null}>{screen==='cutscene'?<Cutscene/>:<><SceneModel key={scene} id={scene}/><Player/><Interactables/></>}</Suspense></Boundary>
    {post&&<PP.EffectComposer multisampling={0}>
      <PP.Bloom intensity={.18} luminanceThreshold={.92}/><PP.Vignette darkness={.75} offset={.3}/>
      {quality==='high'?<SSAO samples={16} rings={4} radius={.12} intensity={14} luminanceInfluence={.5} worldDistanceThreshold={20} worldDistanceFalloff={5} worldProximityThreshold={.4} worldProximityFalloff={.1}/>:<></>}
      {aa==='smaa'?<PP.SMAA/>:aa==='fxaa'?<FXAA/>:<></>}
    </PP.EffectComposer>}
  </Canvas>}
