'use client';
import { useEffect, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { GzGLTFLoader } from '@/lib/gzLoader';
import * as THREE from 'three';
import { SCENES } from '@/lib/scenes';
import { colliders, world } from '@/lib/world';
import { LAYOUT } from '@/lib/layout';

// BVH: makes the player's wall/floor raycasts fast even on the 1.9M-triangle bunker
(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
(THREE.Mesh.prototype as any).raycast = acceleratedRaycast;

// The compressed models store positions as 16-bit integers and have no normals:
// expand positions to float (fast raycasts), compute normals once (otherwise lit materials render black), build the BVH.
function prep(g: THREE.BufferGeometry) {
  const pa: any = g.attributes.position;
  if (pa && !(pa.array instanceof Float32Array)) {
    const f = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) { f[i * 3] = pa.getX(i); f[i * 3 + 1] = pa.getY(i); f[i * 3 + 2] = pa.getZ(i); }
    g.setAttribute('position', new THREE.BufferAttribute(f, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!(g as any).boundsTree) { try { (g as any).computeBoundsTree(); } catch (e) { console.warn('[model] BVH build failed', e); } }
}

// free GPU/CPU memory of a scene when leaving it (the bunker alone is ~70 MB)
function disposeScene(root: THREE.Object3D) {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    (m.geometry as any)?.disposeBoundsTree?.();
    m.geometry?.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((x: any) => {
      if (!x) return;
      Object.values(x).forEach((v: any) => v && v.isTexture && v.dispose());
      x.dispose();
    });
  });
}

function fix(x: any): any {
  if (!x) return x;
  if (x.isMeshBasicMaterial) {
    const m = new THREE.MeshStandardMaterial({
      map: x.map,
      color: x.color,
      vertexColors: x.vertexColors,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1,
      transparent: x.transparent,
      opacity: x.opacity,
      alphaTest: x.alphaTest
    });
    return m;
  }
  x.side = THREE.DoubleSide;
  if ('metalness' in x) {
    x.metalness = Math.min(x.metalness, 0.2);
    x.roughness = Math.max(x.roughness, 0.7);
  }
  x.needsUpdate = true;
  return x;
}

function findSpawn(box: THREE.Box3, strict: boolean) {
  const c = box.getCenter(new THREE.Vector3());
  const rc = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const N = 9;
  const cand: { p: THREE.Vector3; s: number }[] = [];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = box.min.x + ((i + 0.5) / N) * (box.max.x - box.min.x);
      const z = box.min.z + ((j + 0.5) / N) * (box.max.z - box.min.z);
      rc.set(new THREE.Vector3(x, box.max.y + 1, z), down);
      rc.far = Infinity;
      const hits = rc.intersectObjects(colliders, false);

      for (let k = 1; k < hits.length; k++) {
        const h = hits[k];
        if (strict) {
          const n = h.face?.normal.clone().transformDirection(h.object.matrixWorld);
          if (!n || n.y < 0.6) continue;
        }
        const head = hits[k - 1].point.y - h.point.y;
        if (head < 2.2 || head > 9) continue;
        cand.push({
          p: h.point.clone(),
          s: Math.hypot(x - c.x, z - c.z) + (h.point.y - box.min.y) * 0.5
        });
      }
    }
  }

  cand.sort((a, b) => a.s - b.s);
  const dirs = Array.from({ length: 8 }, (_, i) =>
    new THREE.Vector3(Math.cos((i * Math.PI) / 4), 0, Math.sin((i * Math.PI) / 4))
  );

  for (const { p } of cand.slice(0, 14)) {
    let clear = 3;
    for (const d of dirs) {
      rc.set(new THREE.Vector3(p.x, p.y + 1.2, p.z), d);
      rc.far = 3;
      const hh = rc.intersectObjects(colliders, false)[0];
      if (hh) clear = Math.min(clear, hh.distance);
    }
    if (clear >= 0.8) return p;
  }
  return cand[0]?.p || null;
}

export default function SceneModel({ id }: { id: string }) {
  const def = SCENES[id] || { file: `${id}.glb`, scale: 1 };
  
  const url = `/models/${def.file}`;
  const { scene } = useLoader(GzGLTFLoader, url) as any; // reads .glb and gzip-compressed .glb(.gz) alike
  const ref = useRef<THREE.Group>(null!);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;

    g.scale.setScalar(def.scale || 1);
    g.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(g);
    box.getSize(world.size);
    world.min.copy(box.min);

    colliders.length = 0;
    g.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        prep(m.geometry);
        colliders.push(m);
        m.frustumCulled = true;
        m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material);
      }
    });

    const L = LAYOUT[id];
    world.allow = null;

    if (def.spawn) world.spawn.set(...def.spawn);
    else if (L && L.spawn) world.spawn.set(...L.spawn);
    else {
      const p = findSpawn(box, true) || findSpawn(box, false);
      const c = box.getCenter(new THREE.Vector3());
      world.spawn.copy(p || new THREE.Vector3(c.x, box.min.y, c.z));
    }

    const rc = new THREE.Raycaster();
    const o = new THREE.Vector3(world.spawn.x, world.spawn.y + 1.2, world.spawn.z);
    const ds: { d: number; a: number }[] = [];

    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      rc.set(o, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
      rc.far = 40;
      const h = rc.intersectObjects(colliders, false)[0];
      ds.push({ d: h ? h.distance : 40, a });
    }

    ds.sort((x, y) => x.d - y.d);
    world.leash = Math.max(6, Math.min(30, (ds[27]?.d || 10) * 1.1));
    world.farAng = ds[26]?.a || 0;

    if (L) {
      const gr = L.grid;
      if (gr && gr.mask) {
        const by = Uint8Array.from(atob(gr.mask), c => c.charCodeAt(0));
        world.allow = (x, z) => {
          const i = Math.floor((x - gr.ox) / gr.c);
          const j = Math.floor((z - gr.oz) / gr.c);
          if (i < 0 || j < 0 || i >= gr.w || j >= gr.d) return false;
          const k = i * gr.d + j;
          return ((by[k >> 3] >> (7 - (k & 7))) & 1) === 1;
        };
      }
      const e = L.pts?.['m_hall'] || L.pts?.['b_door'];
      if (e) world.farAng = Math.atan2(e[2] - world.spawn.z, e[0] - world.spawn.x);
    }

    return () => {
      colliders.length = 0;
      disposeScene(g);
      useLoader.clear(GzGLTFLoader, url);
    };
  }, [id, def, scene]);

  return <primitive ref={ref} object={scene} />;
}
