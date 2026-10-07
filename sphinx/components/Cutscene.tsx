'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import SceneModel from './SceneModel';
import { free } from './Interactables';
import { CHARACTERS } from '@/lib/scenes';
import { fitHeight, world, colliders } from '@/lib/world';
import { useGame } from '@/lib/store';
// Timeline (s): 0-5 dolly toward the hall -> 5 Nour appears -> 8 glass wall seals -> 13 end card
export default function Cutscene(){
  const {camera}=useThree();const mg=useGLTF('/models/'+CHARACTERS.player),ng=useGLTF('/models/'+CHARACTERS.nour);
  const man=useMemo(()=>mg.scene.clone(true),[mg]),nour=useMemo(()=>ng.scene.clone(true),[ng]);
  const wall=useRef<THREE.Mesh>(null!),T=useRef(0),placed=useRef(false),dir=useRef(new THREE.Vector3(0,0,1)),D=useRef(6);
  useFrame((_,dt)=>{
    if(!placed.current){if(!colliders.length)return;           // wait until the museum is ready (spawn computed)
      const a=world.farAng,s=world.spawn;dir.current.set(Math.cos(a),0,Math.sin(a));D.current=Math.max(4,Math.min(9,free(a)*.8));
      const th=Math.atan2(dir.current.x,dir.current.z);fitHeight(man,1.78);fitHeight(nour,1.65);
      man.position.set(s.x,s.y,s.z);man.rotation.y=th;nour.position.set(s.x+dir.current.x*D.current,s.y,s.z+dir.current.z*D.current);nour.rotation.y=th+Math.PI;
      wall.current.position.set(s.x+dir.current.x*D.current*.5,s.y+1.5,s.z+dir.current.z*D.current*.5);wall.current.rotation.y=th;placed.current=true}
    T.current+=dt;const t=T.current,s=world.spawn,d=dir.current;
    camera.position.set(s.x-d.x*1.3+d.z*.4,s.y+1.55,s.z-d.z*1.3-d.x*.4).addScaledVector(d,Math.min(t,5)*.35);camera.lookAt(nour.position.x,s.y+1.5,nour.position.z);
    nour.visible=t>5;const k=THREE.MathUtils.clamp((t-8)/1.6,0,1);wall.current.visible=k>0;wall.current.scale.y=Math.max(.001,1-Math.pow(1-k,3));
    if(t>13&&useGame.getState().screen==='cutscene'){useGame.getState().unlock('ach_end');useGame.setState({screen:'end'})}});
  return <><SceneModel id="the_hallwyl_museum"/><primitive object={man}/><primitive object={nour} visible={false}/>
    <mesh ref={wall} visible={false}><boxGeometry args={[8,3,.15]}/><meshPhysicalMaterial transmission={.92} roughness={.05} thickness={.3} color="#aee" transparent/></mesh></>;
}
