import * as THREE from 'three';
export const colliders:THREE.Object3D[]=[];
export const world={spawn:new THREE.Vector3(),size:new THREE.Vector3(10,3,10),min:new THREE.Vector3(),pos:[0,0,0] as number[],restore:null as number[]|null,cam:null as THREE.Camera|null};
export function fitHeight(o:THREE.Object3D,h:number){const b=new THREE.Box3().setFromObject(o),s=h/Math.max(.001,b.max.y-b.min.y);o.scale.multiplyScalar(s);const nb=new THREE.Box3().setFromObject(o);o.position.y-=nb.min.y;return o}
