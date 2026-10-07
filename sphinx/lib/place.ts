import * as THREE from 'three';
import { colliders, world } from './world';
import { LAYOUT } from './layout';
import type { Pz } from './puzzles';
export function free(a:number,h=1.2){const rc=new THREE.Raycaster(new THREE.Vector3(world.spawn.x,world.spawn.y+h,world.spawn.z),new THREE.Vector3(Math.cos(a),0,Math.sin(a)),0,30);const hit=colliders.length?rc.intersectObjects(colliders,false)[0]:null;return hit?hit.distance:30}
export function floorAt(x:number,y:number,z:number){const r=new THREE.Raycaster(new THREE.Vector3(x,y+1.6,z),new THREE.Vector3(0,-1,0),0,4);const h=colliders.length?r.intersectObjects(colliders,false)[0]:null;return h?h.point.y:y}
// Fallback placement (no measured layout): keep offset direction, stay inside the room, exits at the farthest wall.
export const puzzlePos=(o:[number,number],kind:string='item')=>{
  let a=Math.atan2(o[1],o[0]),want=Math.hypot(o[0],o[1]);if(kind==='exit'){a=world.farAng;want=99}
  let f=free(a);for(let k=1;f<1.6&&k<12;k++){a+=.5;f=free(a)}
  const d=Math.min(want,f*(kind==='exit'?.8:.6)),x=world.spawn.x+Math.cos(a)*d,z=world.spawn.z+Math.sin(a)*d;return new THREE.Vector3(x,floorAt(x,world.spawn.y,z)+1,z)};
// Marker position for an interactable: measured layout first, fallback otherwise. Returns floor point + (0,h,0)
export function placeOf(scene:string,p:Pz){const L=LAYOUT[scene]?.pts[p.id];if(!L)return puzzlePos(p.off,p.kind);
  const fy=floorAt(L[0],L[1],L[2]);return new THREE.Vector3(L[0],fy+(p.kind==='item'?.35:p.kind==='clue'?1.25:1.1),L[2])}
