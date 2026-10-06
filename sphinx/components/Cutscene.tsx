'use client';
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import SceneModel from './SceneModel';
import { CHARACTERS } from '@/lib/scenes';
import { fitHeight, world } from '@/lib/world';
import { useGame } from '@/lib/store';

// Timeline (seconds): 0-5 slow dolly -> 5 Nour appears -> 8 glass wall seals -> 13 end card
export default function Cutscene(){
  const {camera}=useThree();const man=useGLTF('/models/'+CHARACTERS.player).scene.clone(),nour=useGLTF('/models/'+CHARACTERS.nour).scene.clone();
  const t=useRef(0),wall=useRef<THREE.Mesh>(null!),[ready,setReady]=useState(false);
  const s=world.spawn;
  if(!ready){fitHeight(man,1.78);fitHeight(nour,1.65);man.position.set(s.x,s.y,s.z);nour.position.set(s.x,s.y,s.z+7);nour.rotation.y=Math.PI;setReady(true)}
  useFrame((_,dt)=>{t.current+=dt;const T=t.current;
    camera.position.set(s.x+.4,s.y+1.55,s.z-1.2+Math.min(T,5)*.35);camera.lookAt(s.x,s.y+1.5,s.z+7);
    nour.visible=T>5;
    const k=THREE.MathUtils.clamp((T-8)/1.6,0,1);// hydraulic: fast start, heavy settle
    if(wall.current){wall.current.scale.y=1-Math.pow(1-k,3);wall.current.visible=k>0}
    const st=useGame.getState();
    if(T>5&&!st.flags.s1){useGame.setState({flags:{...st.flags,s1:true}})}
    if(T>13&&st.screen==='cutscene'){useGame.getState().unlock('ach_end');useGame.setState({screen:'end'})}
  });
  return <><SceneModel id="the_hallwyl_museum"/><primitive object={man}/><primitive object={nour}/>
    <mesh ref={wall} position={[s.x,s.y+1.5,s.z+3.5]}><boxGeometry args={[8,3,.15]}/><meshPhysicalMaterial transmission={.92} roughness={.05} thickness={.3} color="#aee" transparent/></mesh></>;
}
