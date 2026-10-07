'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { PUZ, ITEMS } from '@/lib/puzzles';
import { placeOf } from '@/lib/place';
import { autosave } from '@/lib/saves';
import { D } from '@/lib/i18n';
import { click } from '@/lib/audio';
import { Obj } from './Inventory';
export default function Interactables(){
  const {camera}=useThree();const scene=useGame(s=>s.scene),flags=useGame(s=>s.flags);const list=PUZ[scene]||[];const near=useRef(-1),tick=useRef(0);
  const [pos,setPos]=useState<THREE.Vector3[]>([]);useEffect(()=>{setPos([]);const id=setTimeout(()=>setPos(list.map(p=>placeOf(scene,p))),500);return()=>clearTimeout(id)},[scene]);
  useFrame((_,dt)=>{tick.current+=dt;if(tick.current<.15)return;tick.current=0;let b=-1,bd=2.3;pos.forEach((p,i)=>{if(flags[list[i].id]&&list[i].kind!=='exit')return;const d=Math.hypot(p.x-camera.position.x,p.z-camera.position.z)+Math.abs(p.y-camera.position.y)*.4;if(d<bd){bd=d;b=i}});
    near.current=b;const s=useGame.getState(),pr=b>=0?(s.lang==='ar'?list[b].ar:list[b].en):'';if(s.prompt!==pr)useGame.setState({prompt:pr})});
  const act=useGame(s=>s.actReq);
  useEffect(()=>{if(!act||near.current<0)return;const p=list[near.current],s=useGame.getState(),L=s.lang,t=D[L] as any;click();
    if(p.kind==='item'){s.set({inventory:[...s.inventory,p.give!],flags:{...s.flags,[p.id]:true}});s.say(t.got+(L==='ar'?ITEMS[p.give!].ar:ITEMS[p.give!].en));autosave()}
    else if(p.kind==='clue'){s.set({flags:{...s.flags,[p.id]:true}});s.say(L==='ar'?p.txtAr!:p.txtEn!);s.unlock('ach_clue');autosave()}
    else{if(p.need&&!s.inventory.includes(p.need)){const it=ITEMS[p.need];s.say(t.locked+(L==='ar'?it.ar:it.en))}else{s.set({flags:{...s.flags,[p.id]:true},exitReq:Date.now()})}}},[act]);
  // markers: items are shown as small rotating props with a glint; clues/exits as soft glints (no placeholder spheres)
  return <>{pos.length>0&&list.map((p,i)=>(flags[p.id]&&p.kind!=='exit')?null:<group key={p.id} position={pos[i]}>
    {p.kind==='item'&&<group scale={.1}><Obj id={p.give!}/></group>}
    <Sparkles count={p.kind==='exit'?18:10} scale={p.kind==='exit'?[.8,1.6,.8]:[.45,.45,.45]} size={p.kind==='exit'?2.5:3} speed={.35} color={p.kind==='clue'?'#9fd8da':p.kind==='exit'?'#e07a6e':'#e8cd8f'}/>
    <pointLight intensity={.5} distance={2.2} color={p.kind==='clue'?'#9fd8da':'#e8c98a'}/></group>)}</>}
