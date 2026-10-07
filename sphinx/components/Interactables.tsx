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
// distance from spawn to the nearest wall in direction a
export function free(a:number,h=1.2){const rc=new THREE.Raycaster(new THREE.Vector3(world.spawn.x,world.spawn.y+h,world.spawn.z),new THREE.Vector3(Math.cos(a),0,Math.sin(a)),0,30);const hit=colliders.length?rc.intersectObjects(colliders,false)[0]:null;return hit?hit.distance:30}
// Places an interactable inside the room: keeps the offset's direction, but never closer than 40% to a wall; exits go to the farthest wall.
export const puzzlePos=(o:[number,number],kind:string='item')=>{
  let a=Math.atan2(o[1],o[0]),want=Math.hypot(o[0],o[1]);if(kind==='exit'){a=world.farAng;want=99}
  let f=free(a);for(let k=1;f<1.6&&k<12;k++){a+=.5;f=free(a)}
  const d=Math.min(want,f*(kind==='exit'?.8:.6)),x=world.spawn.x+Math.cos(a)*d,z=world.spawn.z+Math.sin(a)*d;
  const r=new THREE.Raycaster(new THREE.Vector3(x,world.spawn.y+1.9,z),new THREE.Vector3(0,-1,0),0,4);const h=colliders.length?r.intersectObjects(colliders,false)[0]:null;
  return new THREE.Vector3(x,(h?h.point.y:world.spawn.y)+1,z)};
export default function Interactables(){
  const {camera}=useThree();const scene=useGame(s=>s.scene),flags=useGame(s=>s.flags);const list=PUZ[scene]||[];const near=useRef(-1),tick=useRef(0);
  const [pos,setPos]=useState<THREE.Vector3[]>([]);useEffect(()=>{setPos([]);const id=setTimeout(()=>setPos(list.map(p=>puzzlePos(p.off,p.kind))),500);return()=>clearTimeout(id)},[scene]);
  useFrame((_,dt)=>{tick.current+=dt;if(tick.current<.15)return;tick.current=0;let b=-1,bd=2.4;pos.forEach((p,i)=>{if(flags[list[i].id]&&list[i].kind!=='exit')return;const d=p.distanceTo(camera.position);if(d<bd){bd=d;b=i}});
    near.current=b;const s=useGame.getState(),pr=b>=0?(s.lang==='ar'?list[b].ar:list[b].en):'';if(s.prompt!==pr)useGame.setState({prompt:pr})});
  const act=useGame(s=>s.actReq);
  useEffect(()=>{if(!act||near.current<0)return;const p=list[near.current],s=useGame.getState(),L=s.lang,t=D[L] as any;click();
    if(p.kind==='item'){s.set({inventory:[...s.inventory,p.give!],flags:{...s.flags,[p.id]:true}});s.say(t.got+(L==='ar'?ITEMS[p.give!].ar:ITEMS[p.give!].en));autosave()}
    else if(p.kind==='clue'){s.set({flags:{...s.flags,[p.id]:true}});s.say(L==='ar'?p.txtAr!:p.txtEn!);s.unlock('ach_clue');autosave()}
    else{if(p.need&&!s.inventory.includes(p.need)){const it=ITEMS[p.need];s.say(t.locked+(L==='ar'?it.ar:it.en))}else{s.set({flags:{...s.flags,[p.id]:true},exitReq:Date.now()})}}},[act]);
  return <>{pos.length>0&&list.map((p,i)=>(flags[p.id]&&p.kind!=='exit')?null:<group key={p.id} position={pos[i]}><mesh><sphereGeometry args={[.1,12,12]}/><meshBasicMaterial color={p.kind==='item'?'#c9a45c':p.kind==='clue'?'#6fc3c5':'#a8423b'}/></mesh><pointLight intensity={1.2} distance={3} color={p.kind==='clue'?'#6fc3c5':'#c9a45c'}/></group>)}</>}
