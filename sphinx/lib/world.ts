import * as THREE from 'three';
export const colliders:THREE.Object3D[]=[];
export const world={spawn:new THREE.Vector3(),size:new THREE.Vector3(10,3,10),min:new THREE.Vector3(),pos:[0,0,0] as number[],restore:null as number[]|null,gl:null as any,scene:null as any,allow:null as null|((x:number,z:number)=>boolean),t0:Date.now(),focus:null as null|{x:number;y:number;z:number;until:number},leash:12,farAng:0,cam:null as THREE.Camera|null};
export function fitHeight(o:THREE.Object3D,h:number){const b=new THREE.Box3().setFromObject(o),s=h/Math.max(.001,b.max.y-b.min.y);o.scale.multiplyScalar(s);const nb=new THREE.Box3().setFromObject(o);o.position.y-=nb.min.y;return o}
