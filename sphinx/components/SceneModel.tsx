'use client';
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SCENES } from '@/lib/scenes';
import { colliders, world } from '@/lib/world';

export default function SceneModel({id}:{id:string}){
  const def=SCENES[id];const {scene}=useGLTF(`/models/${def.file}`);const ref=useRef<THREE.Group>(null!);
  useEffect(()=>{
    const g=ref.current;g.scale.setScalar(def.scale);g.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(g);box.getSize(world.size);world.min.copy(box.min);
    // spawn: centre of footprint, raycast down to find the floor
    const c=box.getCenter(new THREE.Vector3());const rc=new THREE.Raycaster(new THREE.Vector3(c.x,box.max.y,c.z),new THREE.Vector3(0,-1,0));
    colliders.length=0;g.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){colliders.push(m);m.frustumCulled=true;if(m.material){(m.material as any).envMapIntensity=.4}}});
    const hit=rc.intersectObjects(colliders,false)[0];
    world.spawn.set(def.spawn?.[0]??c.x,def.spawn?.[1]??(hit?hit.point.y:box.min.y),def.spawn?.[2]??c.z);
    return()=>{colliders.length=0};
  },[id]);
  return <primitive ref={ref} object={scene}/>;
}
