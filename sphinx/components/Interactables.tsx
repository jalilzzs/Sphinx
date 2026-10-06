'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { PUZ, ITEMS } from '@/lib/puzzles';
import { colliders, world } from '@/lib/world';
import { autosave } from '@/lib/saves';
import { D } from '@/lib/i18n';
import { click } from '@/lib/audio';
export const puzzlePos=(o:[number,number])=>{const r=new THREE.Raycaster(new THREE.Vector3(world.spawn.x+o[0],world.spawn.y+3,world.spawn.z+o[1]),new THREE.Vector3(0,-1,0));const h=colliders.length?r.intersectObjects(colliders,false)[0]:null;return new THREE.Vector3(world.spawn.x+o[0],(h?h.point.y:world.spawn.y)+1.1,world.spawn.z+o[1])};
export default function Interactables(){
  const {camera}=useThree();const scene=useGame(s=>s.scene),flags=useGame(s=>s.flags);const list=PUZ[scene]||[];const near=useRef<number>(-1);const tick=useRef(0);
  const [pos,setPos]=useState<THREE.Vector3[]>([]);useEffect(()=>{setPos([]);const id=setTimeout(()=>setPos(list.map(p=>puzzlePos(p.off))),500);return()=>clearTimeout(id)},[scene]);
  useFrame((_,dt)=>{tick.current+=dt;if(tick.current<.15)return;tick.current=0;let b=-1,bd=2.4;pos.forEach((p,i)=>{if(flags[list[i].id]&&list[i].kind!=='exit')return;const d=p.distanceTo(camera.position);if(d<bd){bd=d;b=i}});
    near.current=b;const s=useGame.getState(),L=s.lang,pr=b>=0?(L==='ar'?list[b].ar:list[b].en):'';if(s.prompt!==pr)useGame.setState({prompt:pr})});
  const act=useGame(s=>s.actReq);
  useEffect(()=>{if(!act||near.current<0)return;const p=list[near.current],s=useGame.getState(),L=s.lang,t=D[L] as any;click();
    if(p.kind==='item'){s.set({inventory:[...s.inventory,p.give!],flags:{...s.flags,[p.id]:true}});s.say(t.got+(L==='ar'?ITEMS[p.give!].ar:ITEMS[p.give!].en));autosave()}
    else if(p.kind==='clue'){s.set({flags:{...s.flags,[p.id]:true}});s.say(L==='ar'?p.txtAr!:p.txtEn!);s.unlock('ach_clue');autosave()}
    else{if(p.need&&!s.inventory.includes(p.need)){const it=ITEMS[p.need];s.say(t.locked+(L==='ar'?it.ar:it.en))}else{s.set({flags:{...s.flags,[p.id]:true}});s.set({exitReq:Date.now()})}}},[act]);
  return <>{pos.length>0&&list.map((p,i)=>(flags[p.id]&&p.kind!=='exit')?null:<group key={p.id} position={pos[i]}><mesh><sphereGeometry args={[.07,12,12]}/><meshBasicMaterial color={p.kind==='item'?'#c9a45c':p.kind==='clue'?'#6fc3c5':'#a8423b'}/></mesh><pointLight intensity={.6} distance={2.5} color={p.kind==='clue'?'#6fc3c5':'#c9a45c'}/></group>)}</>}
