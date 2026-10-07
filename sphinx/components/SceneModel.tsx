'use client';
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SCENES } from '@/lib/scenes';
import { colliders, world } from '@/lib/world';

// Find a real interior floor point: it has a ceiling above it (so it is not the roof/terrain), enough headroom, and open space around it.
function findSpawn(box:THREE.Box3,strict:boolean){
  const c=box.getCenter(new THREE.Vector3()),rc=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),N=9,cand:{p:THREE.Vector3;s:number}[]=[];
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const x=box.min.x+(i+.5)/N*(box.max.x-box.min.x),z=box.min.z+(j+.5)/N*(box.max.z-box.min.z);
    rc.set(new THREE.Vector3(x,box.max.y+1,z),down);rc.far=Infinity;const hits=rc.intersectObjects(colliders,false);
    for(let k=1;k<hits.length;k++){const h=hits[k];
      if(strict){const n=h.face?.normal.clone().transformDirection(h.object.matrixWorld);if(!n||n.y<.6)continue}
      const head=hits[k-1].point.y-h.point.y;if(head<2.2||head>9)continue;
      cand.push({p:h.point.clone(),s:Math.hypot(x-c.x,z-c.z)+(h.point.y-box.min.y)*.5})}}
  cand.sort((a,b)=>a.s-b.s);
  const dirs=Array.from({length:8},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4)));
  for(const {p} of cand.slice(0,14)){let clear=3;
    for(const d of dirs){rc.set(new THREE.Vector3(p.x,p.y+1.2,p.z),d);rc.far=3;const hh=rc.intersectObjects(colliders,false)[0];if(hh)clear=Math.min(clear,hh.distance)}
    if(clear>=.8)return p}
  return cand[0]?.p||null;
}
export default function SceneModel({id}:{id:string}){
  const def=SCENES[id];const {scene}=useGLTF(`/models/${def.file}`);const ref=useRef<THREE.Group>(null!);
  useEffect(()=>{
    const g=ref.current;g.scale.setScalar(def.scale);g.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(g);box.getSize(world.size);world.min.copy(box.min);
    colliders.length=0;g.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){colliders.push(m);m.frustumCulled=true;
      (Array.isArray(m.material)?m.material:[m.material]).forEach((x:any)=>{if(!x)return;x.side=THREE.DoubleSide;if('metalness' in x){x.metalness=Math.min(x.metalness,.25);x.roughness=Math.max(x.roughness,.55)}x.envMapIntensity=.7;x.needsUpdate=true})}});
    if(def.spawn)world.spawn.set(...def.spawn);
    else{const p=findSpawn(box,true)||findSpawn(box,false);const c=box.getCenter(new THREE.Vector3());world.spawn.copy(p||new THREE.Vector3(c.x,box.min.y,c.z))}
    // room extent: 32 horizontal rays from spawn -> leash radius (invisible boundary) + direction of the farthest wall (exit side)
    const rc=new THREE.Raycaster(),o=new THREE.Vector3(world.spawn.x,world.spawn.y+1.2,world.spawn.z),ds:{d:number;a:number}[]=[];
    for(let i=0;i<32;i++){const a=i/32*Math.PI*2;rc.set(o,new THREE.Vector3(Math.cos(a),0,Math.sin(a)));rc.far=40;const h=rc.intersectObjects(colliders,false)[0];ds.push({d:h?h.distance:40,a})}
    ds.sort((x,y)=>x.d-y.d);world.leash=Math.max(6,Math.min(30,ds[27].d*1.1));world.farAng=ds[26].a;
    return()=>{colliders.length=0};
  },[id]);
  return <primitive ref={ref} object={scene}/>;
}
