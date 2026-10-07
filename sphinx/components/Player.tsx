'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/lib/store';
import { colliders, world } from '@/lib/world';
import { step, breath } from '@/lib/audio';
import { autosave } from '@/lib/saves';

const held = new Set<string>();
const ray = new THREE.Raycaster();
const dn = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

// متجهات ثابته لإعادة الاستخدام في الذاكرة لتفادي الـ Lag
const _v1 = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _next = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

const hit = (o: THREE.Vector3, d: THREE.Vector3, far: number) => {
  ray.set(o, d);
  ray.far = far;
  return colliders.length ? ray.intersectObjects(colliders, false)[0] : undefined;
};

// تحسين فحص الحوائط: فحص سريع على مستوى الخصر (1 إلى 3 فحوصات كحد أقصى بدلاً من 9)
function wallAhead(p: THREE.Vector3, f: THREE.Vector3, floor: number) {
  _rayOrigin.set(p.x, floor + 0.8, p.z);
  if (hit(_rayOrigin, f, 0.45)) return true;
  
  _v1.copy(f).applyAxisAngle(UP, 0.4);
  if (hit(_rayOrigin, _v1, 0.45)) return true;
  
  _v1.copy(f).applyAxisAngle(UP, -0.4);
  if (hit(_rayOrigin, _v1, 0.45)) return true;
  
  return false;
}

export default function Player() {
  const { camera, gl, scene } = useThree();
  const light = useRef<THREE.SpotLight>(null!);
  const bob = useRef(0), stepT = useRef(0), breathT = useRef(0), eye = useRef(1.65);
  const yaw = useRef(0), pitch = useRef(0), saveT = useRef(0), idle = useRef(0);
  const floor = useRef(0), nofloor = useRef(0), safe = useRef(new THREE.Vector3());
  const lastStaminaSync = useRef(0);

  const touch = useGame(s => s.touch);
  const sens = useGame(s => s.sens);
  const resp = useGame(s => s.touchResp);
  const shadows = useGame(s => s.shadows);

  useEffect(() => {
    world.cam = camera;
    world.gl = gl;
    world.scene = scene;
    (camera as THREE.PerspectiveCamera).rotation.order = 'YXZ';
    const r = world.restore;
    const p = r && (r[0] || r[1] || r[2]) ? r : null;
    world.restore = null;
    floor.current = p ? p[1] - 1.65 : world.spawn.y;
    camera.position.set(p ? p[0] : world.spawn.x, p ? p[1] : world.spawn.y + 1.8, p ? p[2] : world.spawn.z);
    safe.current.copy(camera.position);
  }, [camera, gl, scene]);

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
    const k = 0.005 * (sens + 0.5) * resp;

    const d = (e: PointerEvent) => {
      if (e.clientX > innerWidth * 0.4 && id < 0) {
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
    if (s.pauseOpen || s.settingsOpen || s.invOpen) return;

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

    const run = (s.sprint || s.move.y < -0.92) && moving && !s.crouch && s.stamina > 0;
    const speed = (s.crouch ? 1 : run ? 4.2 : 2.1) * mag * (s.stamina <= 0 ? 0.6 : 1);

    // تحديث اللياقة البدنية (Stamina) بدون خنق React
    const st = run ? Math.max(0, s.stamina - 22 * dt) : Math.min(100, s.stamina + (moving ? 9 : 16) * dt);
    if (Math.abs(st - lastStaminaSync.current) > 3 || st === 0 || st === 100) {
      lastStaminaSync.current = st;
      useGame.setState({ stamina: st });
    }
    if (st <= 0 && s.sprint) useGame.setState({ sprint: false });

    // الحركة والاصطدامات بالاستعانة بالمتجهات الجاهزة
    if (moving) {
      _fwd.set(ix, 0, iy).normalize().applyAxisAngle(UP, camera.rotation.y);
      _next.copy(camera.position).addScaledVector(_fwd, speed * dt);

      _rayOrigin.set(_next.x, floor.current + 1, _next.z);
      const fh = hit(_rayOrigin, dn, 2.5);
      const ok = (world.allow ? world.allow(_next.x, _next.z) : Math.hypot(_next.x - world.spawn.x, _next.z - world.spawn.z) < world.leash) &&
        fh && fh.point.y > floor.current - 0.7 && fh.point.y < floor.current + 0.6 &&
        !wallAhead(camera.position, _fwd, floor.current);

      if (ok) {
        camera.position.x = _next.x;
        camera.position.z = _next.z;
      }
    }

    // فحص الأرضية
    _rayOrigin.set(camera.position.x, floor.current + 1, camera.position.z);
    const gh = hit(_rayOrigin, dn, 2.5);
    if (gh) {
      floor.current = gh.point.y;
      nofloor.current = 0;
      if (!world.allow || world.allow(camera.position.x, camera.position.z)) safe.current.copy(camera.position);
    } else {
      nofloor.current += dt;
      if (nofloor.current > 0.5) {
        camera.position.copy(safe.current);
        floor.current = safe.current.y - eye.current;
        nofloor.current = 0;
      }
    }

    // هزاز الكاميرا وحركة التنفس
    eye.current += ((s.crouch ? 1 : 1.65) - eye.current) * Math.min(1, dt * 8);
    bob.current += dt * (run ? 13 : 7) * (moving ? 1 : 0.2) * (st <= 0 ? 1.6 : 1);
    camera.position.y = floor.current + eye.current + Math.sin(bob.current) * (st <= 0 ? 0.06 : moving ? (run ? 0.045 : 0.02) : 0.004);

    world.pos = [camera.position.x, camera.position.y, camera.position.z];

    if (moving) {
      stepT.current -= dt;
      if (stepT.current <= 0) {
        stepT.current = run ? 0.3 : 0.5;
        step(s.crouch ? 0.2 : run ? 1 : 0.6);
      }
    }

    if (st <= 0) {
      breathT.current -= dt;
      if (breathT.current <= 0) {
        breathT.current = 1.2;
        breath(1);
      }
    }

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
        angle={0.55}
        penumbra={0.7}
        intensity={14}
        distance={22}
        decay={1.4}
        color="#ffe9c4"
        castShadow={shadows}
      />
    </>
  );
}
