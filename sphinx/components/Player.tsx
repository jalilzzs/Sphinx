'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { colliders, world } from '@/lib/world';

const keys=new Set<string>();const ray=new THREE.Raycaster();const dn=new THREE.Vector3(0,-1,0);
let ac:AudioContext|null=null;
function step(vol:number){if(vol<=0)return;ac??=new AudioContext();const b=ac.createBuffer(1,2205,44100),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);const s=ac.createBufferSource(),g=ac.createGain();g.gain.value=vol*.25;s.buffer=b;s.connect(g).connect(ac.destination);s.start()}
function breath(vol:number){ac??=new AudioContext();const o=ac.createOscillator(),g=ac.createGain();o.type='sawtooth';o.frequency.value=90;g.gain.value=0;g.gain.linearRampToValueAtTime(vol*.05,ac.currentTime+.4);g.gain.linearRampToValueAtTime(0,ac.currentTime+.9);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+1)}

export default function Player(){
  const {camera,gl}=useThree();const light=useRef<THREE.SpotLight>(null!);const bob=useRef(0),stepT=useRef(0),breathT=useRef(0),eye=useRef(1.65);
  const yaw=useRef(0),pitch=useRef(0);const touch=useGame(s=>s.touch);const sens=useGame(s=>s.sens);
  useEffect(()=>{(camera as THREE.PerspectiveCamera).rotation.order='YXZ';camera.position.set(world.spawn.x,world.spawn.y+1.65,world.spawn.z);
    const kd=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();keys.add(k);const s=useGame.getState();
      if(k==='shift')s.set({sprint:true});if(k==='c')s.set({crouch:!s.crouch});if(k==='f')s.set({light:!s.light});if(k==='p')s.set({phoneOpen:!s.phoneOpen});if(k==='i')s.set({invOpen:!s.invOpen})};
    const ku=(e:KeyboardEvent)=>{keys.delete(e.key.toLowerCase());if(e.key==='Shift')useGame.getState().set({sprint:false})};
    addEventListener('keydown',kd);addEventListener('keyup',ku);return()=>{removeEventListener('keydown',kd);removeEventListener('keyup',ku)}},[camera]);
  // touch look: drag on the right half of the canvas
  useEffect(()=>{if(!touch)return;const el=gl.domElement;let id=-1,lx=0,ly=0;
    const dn_=(e:PointerEvent)=>{if(e.clientX>innerWidth*.4&&id<0){id=e.pointerId;lx=e.clientX;ly=e.clientY}};
    const mv=(e:PointerEvent)=>{if(e.pointerId!==id)return;yaw.current-=(e.clientX-lx)*.005*(sens+.5);pitch.current=THREE.MathUtils.clamp(pitch.current-(e.clientY-ly)*.005*(sens+.5),-1.3,1.3);lx=e.clientX;ly=e.clientY;camera.rotation.set(pitch.current,yaw.current,0)};
    const up=(e:PointerEvent)=>{if(e.pointerId===id)id=-1};
    el.addEventListener('pointerdown',dn_);el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);return()=>{el.removeEventListener('pointerdown',dn_);el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up)}},[touch,sens,camera,gl]);

  useFrame((_,dt)=>{dt=Math.min(dt,.05);const s=useGame.getState();
    let ix=(keys.has('d')?1:0)-(keys.has('a')?1:0)+s.move.x,iy=(keys.has('s')?1:0)-(keys.has('w')?1:0)+s.move.y;
    const mag=Math.min(1,Math.hypot(ix,iy));const moving=mag>.08;
    const wantSprint=(s.sprint||s.move.y<-.92)&&moving&&!s.crouch&&s.stamina>0;
    const speed=(s.crouch?1:wantSprint?4.2:2.1)*mag*(s.stamina<=0?.6:1);
    let st=s.stamina;st=wantSprint?Math.max(0,st-22*dt):Math.min(100,st+(moving?9:16)*dt);
    if(st!==s.stamina)useGame.setState({stamina:st});
    if(st<=0&&s.sprint)useGame.setState({sprint:false});
    if(moving){const f=new THREE.Vector3(ix,0,iy).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),camera.rotation.y);
      const from=camera.position.clone();from.y-=.5;ray.set(from,f);ray.far=.5;const blocked=colliders.length&&ray.intersectObjects(colliders,false).length>0;
      if(!blocked)camera.position.addScaledVector(f,speed*dt)}
    // ground snap
    ray.set(new THREE.Vector3(camera.position.x,camera.position.y+.3,camera.position.z),dn);ray.far=4;const h=colliders.length?ray.intersectObjects(colliders,false)[0]:null;
    const targetEye=s.crouch?1.0:1.65;eye.current+=(targetEye-eye.current)*Math.min(1,dt*8);
    const gy=h?h.point.y:world.spawn.y;
    bob.current+=dt*(wantSprint?13:7)*(moving?1:.2)*(st<=0?1.6:1);
    const amp=st<=0?.06:moving?(wantSprint?.045:.02):.004;
    camera.position.y=gy+eye.current+Math.sin(bob.current)*amp;
    // footsteps: crouching has a smaller audible radius
    if(moving){stepT.current-=dt;if(stepT.current<=0){stepT.current=wantSprint?.3:.5;step(s.sfx*(s.crouch?.25:wantSprint?1:.6))}}
    if(st<=0){breathT.current-=dt;if(breathT.current<=0){breathT.current=1.2;breath(s.sfx)}}
    // flashlight follows the camera
    const l=light.current;if(l){l.visible=s.light;l.position.copy(camera.position);const d=new THREE.Vector3();camera.getWorldDirection(d);l.target.position.copy(camera.position).add(d);l.target.updateMatrixWorld()}
  });
  return <>{!touch&&<PointerLockControls pointerSpeed={.4+sens}/>}
    <spotLight ref={light} angle={.5} penumbra={.6} intensity={60} distance={25} decay={1.6} color="#ffe9c4" castShadow={false}/>
    <primitive object={new THREE.Object3D()}/></>;
}
