'use client';
import { Component, Suspense, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import SceneModel from './SceneModel';
import { free } from '@/lib/place';
import { CHARACTERS } from '@/lib/scenes';
import { fitHeight, world, colliders } from '@/lib/world';
import { useGame } from '@/lib/store';
// Timeline (s): 0-5 dolly toward the hall -> 5 Nour appears -> 8 glass wall seals -> 13 end card.
// The timeline never depends on the character models: if one fails to load, a placeholder figure is shown instead.
class Safe extends Component<{fb:any;children:any},{e:boolean}>{state={e:false};static getDerivedStateFromError(){return{e:true}}componentDidCatch(e:any){console.warn('cutscene actor failed',e)}render(){return this.state.e?this.props.fb:this.props.children}}
const Fig=({o,h}:{o:React.MutableRefObject<THREE.Object3D|null>;h:number})=><group ref={o as any}><mesh position={[0,h/2,0]}><capsuleGeometry args={[.22,h-.44,6,12]}/><meshStandardMaterial color="#8a7a66"/></mesh></group>;
function Actor({file,h,o}:{file:string;h:number;o:React.MutableRefObject<THREE.Object3D|null>}){const {scene}=useGLTF('/models/'+file);const c=useMemo(()=>{const x=scene.clone(true);fitHeight(x,h);return x},[scene]);return <group ref={o as any}><primitive object={c}/></group>}
export default function Cutscene(){
  const {camera}=useThree();const man=useRef<THREE.Object3D|null>(null),nour=useRef<THREE.Object3D|null>(null),wall=useRef<THREE.Mesh>(null!),T=useRef(0),placed=useRef(false),dir=useRef(new THREE.Vector3(0,0,1)),D=useRef(6);
  useFrame((_,dt)=>{
    if(!placed.current){if(!colliders.length||!man.current||!nour.current)return;
      const a=world.farAng,s=world.spawn;dir.current.set(Math.cos(a),0,Math.sin(a));D.current=Math.max(4,Math.min(9,free(a)*.8));const th=Math.atan2(dir.current.x,dir.current.z);
      man.current.position.set(s.x,s.y,s.z);man.current.rotation.y=th;nour.current.position.set(s.x+dir.current.x*D.current,s.y,s.z+dir.current.z*D.current);nour.current.rotation.y=th+Math.PI;
      wall.current.position.set(s.x+dir.current.x*D.current*.5,s.y+1.5,s.z+dir.current.z*D.current*.5);wall.current.rotation.y=th;placed.current=true}
    T.current+=dt;const t=T.current,s=world.spawn,d=dir.current;
    camera.position.set(s.x-d.x*1.3+d.z*.4,s.y+1.6,s.z-d.z*1.3-d.x*.4).addScaledVector(d,Math.min(t,5)*.35);camera.lookAt(nour.current!.position.x,s.y+1.5,nour.current!.position.z);
    nour.current!.visible=t>5;const k=THREE.MathUtils.clamp((t-8)/1.6,0,1);wall.current.visible=k>0;wall.current.scale.y=Math.max(.001,1-Math.pow(1-k,3));
    if(t>13&&useGame.getState().screen==='cutscene'){useGame.getState().unlock('ach_end');useGame.setState({screen:'end'})}});
  return <><SceneModel id="the_hallwyl_museum"/>
    <Safe fb={<Fig o={man} h={1.78}/>}><Suspense fallback={<Fig o={man} h={1.78}/>}><Actor file={CHARACTERS.player} h={1.78} o={man}/></Suspense></Safe>
    <Safe fb={<Fig o={nour} h={1.65}/>}><Suspense fallback={<Fig o={nour} h={1.65}/>}><Actor file={CHARACTERS.nour} h={1.65} o={nour}/></Suspense></Safe>
    <mesh ref={wall} visible={false}><boxGeometry args={[8,3,.15]}/><meshPhysicalMaterial transmission={.92} roughness={.05} thickness={.3} color="#aee" transparent/></mesh></>;
}
