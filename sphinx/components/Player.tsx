'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { colliders, world } from '@/lib/world';
import { setMovement, setBreath, stopLoops } from '@/lib/audio';
import { autosave } from '@/lib/saves';

const held = new Set<string>();
const ray = new THREE.Raycaster();
const dn = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

const _v1 = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _next = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

// فحص سريع ومباشر لتجنب إجهاد المعالج
const hit = (o: THREE.Vector3, d: THREE.Vector3, far: number) => {
  if (!colliders || colliders.length === 0) return undefined;
  ray.set(o, d);
  ray.far = far;
  const intersects = ray.intersectObjects(colliders, false);
  return intersects.length > 0 ? intersects[0] : undefined;
};

function wallAhead(p: THREE.Vector3, f: THREE.Vector3, floor: number) {
  if (!colliders || colliders.length === 0) return false;
  _rayOrigin.set(p.x, floor + 0.8, p.z);
  return !!hit(_rayOrigin, f, 0.45);
}

export default function Player() {
  const { camera, gl, scene } = useThree();
  const light = useRef<THREE.SpotLight>(null!);
  const breathingRef = useRef(false);
  const bob = useRef(0), stepT = useRef(0), breathT = useRef(0), eye = useRef(1.65);
  useEffect(() => () => { stopLoops(); }, []); // leaving the scene / unmounting: silence movement + breathing
  const yaw = useRef(0), pitch = useRef(0), saveT = useRef(0), idle = useRef(0);
  const floor = useRef(0), safe = useRef(new THREE.Vector3());

  const currentScene = useGame(s => s.scene);
  const touch = useGame(s => s.touch);
  const sens = useGame(s => s.sens);
  const resp = useGame(s => s.touchResp);
  const shadows = useGame(s => s.shadows);

  // إعادة ضبط الكاميرا والأرضية فور تغير المشهد (مثل المستودع المهجور)
  useEffect(() => {
    world.cam = camera;
    world.gl = gl;
    world.scene = scene;
    (camera as THREE.PerspectiveCamera).rotation.order = 'YXZ';

    const spawn = world.spawn || { x: 0, y: 0, z: 0 };
    const initialY = spawn.y || 0;

    floor.current = initialY;
    camera.position.set(spawn.x, initialY + 1.65, spawn.z);
    safe.current.copy(camera.position);
  }, [currentScene, camera, gl, scene]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      const K = useGame.getState().keys;
      const s = useGame.getState();
      held.add(k);
      if (s.pauseOpen || s.settingsOpen) return;
      if (k === K.sprint) s.set({ sprint: true });
      if (k === K.crouch) s.set({ crouch: !s.crouch });
      if (k === K.light) s.set({ light: !s.light });
      if (k === K.phone) s.set({ phoneOpen: !s.phoneOpen });
      if (k === K.inv) s.set({ invOpen: !s.invOpen });
      if (k === K.act) s.set({ actReq: Date.now() });
      if (k === 'escape') s.set({ pauseOpen: true });
    };

    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      held.delete(k);
      if (k === useGame.getState().keys.sprint) useGame.getState().set({ sprint: false });
    };

    addEventListener('keydown', kd);
    addEventListener('keyup', ku);
    return () => {
      removeEventListener('keydown', kd);
      removeEventListener('keyup', ku);
      held.clear();
    };
  }, []);

  useEffect(() => {
    if (!touch) return;
    const el = gl.domElement;
    let id = -1, lx = 0, ly = 0;
    const k = 0.004 * (sens + 0.5) * resp;

    const d = (e: PointerEvent) => {
      if (e.clientX > innerWidth * 0.35 && id < 0) {
        id = e.pointerId;
        lx = e.clientX;
        ly = e.clientY;
      }
    };

    const m = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      yaw.current -= (e.clientX - lx) * k;
      pitch.current = THREE.MathUtils.clamp(pitch.current - (e.clientY - ly) * k, -1.3, 1.3);
      lx = e.clientX;
      ly = e.clientY;
      camera.rotation.set(pitch.current, yaw.current, 0);
    };

    const u = (e: PointerEvent) => { if (e.pointerId === id) id = -1; };

    el.addEventListener('pointerdown', d);
    el.addEventListener('pointermove', m);
    el.addEventListener('pointerup', u);
    return () => {
      el.removeEventListener('pointerdown', d);
      el.removeEventListener('pointermove', m);
      el.removeEventListener('pointerup', u);
    };
  }, [touch, sens, resp, camera, gl]);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const s = useGame.getState();
    if (s.pauseOpen || s.settingsOpen || s.invOpen || s.screen !== 'game') { setMovement('none'); setBreath(false); return; }

    const K = s.keys;
    const ix = (held.has(K.right) ? 1 : 0) - (held.has(K.left) ? 1 : 0) + s.move.x;
    const iy = (held.has(K.back) ? 1 : 0) - (held.has(K.fwd) ? 1 : 0) + s.move.y;
    const mag = Math.min(1, Math.hypot(ix, iy));
    const moving = mag > 0.1;

    if (moving) idle.current = 0;
    else {
      idle.current += dt;
      if (idle.current > 0.6 && s.sprint && !held.has(K.sprint)) useGame.setState({ sprint: false });
    }

    const run = (s.sprint || s.move.y < -0.9) && moving && !s.crouch && s.stamina > 0;
    const speed = (s.crouch ? 1.1 : run ? 3.8 : 2.2) * mag * (s.stamina <= 0 ? 0.6 : 1);

    // تحديث Stamina بحذر شديد لتجنب اللاق
    let st = s.stamina;
    if (run) st = Math.max(0, s.stamina - 20 * dt);
    else st = Math.min(100, s.stamina + (moving ? 10 : 18) * dt);

    if (Math.abs(st - s.stamina) > 5 || st === 0 || st === 100) {
      useGame.setState({ stamina: st });
    }

    let actuallyMoved = false;

    if (moving) {
      _fwd.set(ix, 0, iy).normalize().applyAxisAngle(UP, camera.rotation.y);
      _next.copy(camera.position).addScaledVector(_fwd, speed * dt);

      const blocked = wallAhead(camera.position, _fwd, floor.current);

      if (!blocked) {
        camera.position.x = _next.x;
        camera.position.z = _next.z;
        actuallyMoved = true;
      }
    }

    // فحص الأرضية لضبط الارتفاع
    _rayOrigin.set(camera.position.x, floor.current + 1.2, camera.position.z);
    const gh = hit(_rayOrigin, dn, 3.0);

    if (gh && gh.point) {
      if (Math.abs(gh.point.y - floor.current) < 2.0) {
        floor.current = gh.point.y;
      }
    } else {
      const defaultY = world.spawn?.y || 0;
      floor.current = defaultY;
    }

    eye.current += ((s.crouch ? 0.9 : 1.65) - eye.current) * Math.min(1, dt * 10);
    bob.current += dt * (run ? 12 : 6) * (moving ? 1 : 0.1);
    camera.position.y = floor.current + eye.current + Math.sin(bob.current) * (moving ? (run ? 0.03 : 0.015) : 0.002);

    world.pos = [camera.position.x, camera.position.y, camera.position.z];

    // Movement sound = a loop that plays only while the player really moves, and stops at once when they halt
    setMovement(actuallyMoved ? (s.crouch ? 'crouch' : run ? 'run' : 'walk') : 'none', run ? .9 : .6);
    // Breathing loop while stamina is empty; stops once it has recovered a bit (hysteresis)
    if (st <= 0) breathingRef.current = true; else if (st > 25) breathingRef.current = false;
    setBreath(breathingRef.current);

    saveT.current += dt;
    if (saveT.current > 30) {
      saveT.current = 0;
      autosave();
    }

    const l = light.current;
    if (l) {
      l.visible = s.light;
      l.position.copy(camera.position);
      camera.getWorldDirection(_v1);
      l.target.position.copy(camera.position).add(_v1);
      l.target.updateMatrixWorld();
    }
  });

  return (
    <>
      {!touch && <PointerLockControls pointerSpeed={0.4 + sens} />}
      <spotLight
        ref={light}
        angle={0.5}
        penumbra={0.6}
        intensity={12}
        distance={20}
        decay={1.5}
        color="#ffe9c4"
        castShadow={shadows}
      />
    </>
  );
}
