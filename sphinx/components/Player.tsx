'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
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

// Eye height above the floor (metres). The body model is placed at (camera - eye), so camera and body always stay in sync.
const EYE_STAND = 1.95, EYE_CROUCH = 1.15;

function wallAhead(p: THREE.Vector3, f: THREE.Vector3, floor: number) {
  if (!colliders || colliders.length === 0) return false;
  _rayOrigin.set(p.x, floor + 0.8, p.z);
  return !!hit(_rayOrigin, f, 0.45);
}

// First-person body: it exists only to cast the player's shadow and is NEVER drawn to the camera
// (colour + depth writes are off, so no pelvis / legs / head can ever appear on screen).
function PlayerBody() {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  const shadows = useGame(s => s.shadows);
  const { scene, animations } = useGLTF('/models/algerian_man.glb') as any;
  const { actions, names } = useAnimations(animations, groupRef);
  const currentAnim = useRef<string>('');

  // Own copy of the model (the cached one is shared with the cutscenes, so it must not be edited),
  // scaled to a 1.85 m body and lowered so its feet sit at y = 0.
  const body = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Object3D;
    c.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone();
    });
    c.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(c, true);
    const k = 1.85 / Math.max(0.01, b.max.y - b.min.y);
    c.scale.multiplyScalar(k);
    c.position.y = -b.min.y * k;
    return c;
  }, [scene]);

  useEffect(() => {
    body.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.visible = shadows;              // shadows off -> nothing to render at all
      m.castShadow = true; m.receiveShadow = false;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x: any) => { x.colorWrite = false; x.depthWrite = false; });
    });
  }, [body, shadows]);

  useFrame(() => {
    if (!groupRef.current) return;
    const s = useGame.getState();
    const isMoving = Math.hypot(s.move?.x || 0, s.move?.y || 0) > 0.1;
    const isRunning = isMoving && s.sprint;
    const isCrouching = s.crouch;

    // Anchored to the GROUND under the player (not to the camera/pelvis), directly below the camera
    groupRef.current.position.set(camera.position.x, world.floor, camera.position.z);

    // The model faces +Z while the camera looks down -Z, so turn the body by 180 deg to face the view direction
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    groupRef.current.rotation.y = euler.y + Math.PI;

    let targetAnim = 'Idle';
    if (isCrouching) targetAnim = isMoving ? 'CrouchWalk' : 'CrouchIdle';
    else if (isRunning) targetAnim = 'Run';
    else if (isMoving) targetAnim = 'Walk';
    const matched = names.find((n: string) => n.toLowerCase().includes(targetAnim.toLowerCase())) || names[0];
    if (matched && currentAnim.current !== matched) {
      if (currentAnim.current && actions[currentAnim.current]) actions[currentAnim.current]?.fadeOut(0.15);
      actions[matched]?.reset().fadeIn(0.15).play();
      currentAnim.current = matched;
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={body} />
    </group>
  );
}

export default function Player() {
  const { camera, gl, scene } = useThree();
  const light = useRef<THREE.SpotLight>(null!);
  const breathingRef = useRef(false);
  const bob = useRef(0), stepT = useRef(0), breathT = useRef(0), eye = useRef(EYE_STAND);
  useEffect(() => () => { stopLoops(); }, []); // unmounting: silence movement + breathing
  const yaw = useRef(0), pitch = useRef(0), saveT = useRef(0), idle = useRef(0);
  const floor = useRef(0), safe = useRef(new THREE.Vector3());

  const currentScene = useGame(s => s.scene);
  const screen = useGame(s => s.screen);
  const touch = useGame(s => s.touch);
  const sens = useGame(s => s.sens);
  const resp = useGame(s => s.touchResp);
  const shadows = useGame(s => s.shadows);

  // إعادة ضبط الكاميرا ومزامنة الزوايا فور تغيير المشهد أو الشاشة (حل تجمد Continue)
  useEffect(() => {
    world.cam = camera;
    world.gl = gl;
    world.scene = scene;
    
    // ضبط حد رؤية الكاميرا القريب لرؤية الأيدي والصدر القريبين
    const persCam = camera as THREE.PerspectiveCamera;
    persCam.rotation.order = 'YXZ';
    persCam.near = 0.05;
    persCam.updateProjectionMatrix();

    const spawn = world.spawn || { x: 0, y: 0, z: 0 };
    const initialY = spawn.y || 0;

    floor.current = initialY;
    camera.position.set(spawn.x, initialY + EYE_STAND, spawn.z);
    safe.current.copy(camera.position);

    // مزامنة زوايا yaw و pitch مع تدوير الكاميرا
    yaw.current = camera.rotation.y;
    pitch.current = camera.rotation.x;
  }, [currentScene, screen, camera, gl, scene]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      const K = useGame.getState().keys;
      const s = useGame.getState();
      held.add(k);
      if (s.pauseOpen || s.settingsOpen || s.card || s.lock) return;
      if (k === K.sprint?.toLowerCase()) s.set({ sprint: true });
      if (k === K.crouch?.toLowerCase()) s.set({ crouch: !s.crouch });
      if (k === K.light?.toLowerCase()) s.set({ light: !s.light });
      if (k === K.phone?.toLowerCase()) s.set({ phoneOpen: !s.phoneOpen });
      if (k === K.inv?.toLowerCase()) s.set({ invOpen: !s.invOpen });
      if (k === K.act?.toLowerCase()) s.set({ actReq: Date.now() });
      if (k === 'escape') s.set({ pauseOpen: true });
    };

    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      held.delete(k);
      const K = useGame.getState().keys;
      if (k === K.sprint?.toLowerCase()) useGame.getState().set({ sprint: false });
    };

    addEventListener('keydown', kd);
    addEventListener('keyup', ku);
    return () => {
      removeEventListener('keydown', kd);
      removeEventListener('keyup', ku);
      held.clear();
    };
  }, []);

  // تحكم التاتش على الهاتف ومعالجة حصر اللمس
  useEffect(() => {
    if (!touch) return;
    const el = gl.domElement;
    let id = -1, lx = 0, ly = 0;
    const k = 0.004 * (sens + 0.5) * resp;

    const d = (e: PointerEvent) => {
      const s = useGame.getState();
      if (s.pauseOpen || s.settingsOpen || s.invOpen || s.phoneOpen || s.card || s.lock || s.screen !== 'game') return;

      if (e.clientX > innerWidth * 0.35 && id < 0) {
        id = e.pointerId;
        lx = e.clientX;
        ly = e.clientY;

        yaw.current = camera.rotation.y;
        pitch.current = camera.rotation.x;
      }
    };

    const m = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const s = useGame.getState();
      if (s.pauseOpen || s.settingsOpen || s.invOpen || s.phoneOpen || s.card || s.lock || s.screen !== 'game') {
        id = -1;
        return;
      }

      yaw.current -= (e.clientX - lx) * k;
      pitch.current = THREE.MathUtils.clamp(pitch.current - (e.clientY - ly) * k, -1.3, 1.3);
      lx = e.clientX;
      ly = e.clientY;
      camera.rotation.set(pitch.current, yaw.current, 0);
    };

    const resetTouch = (e: PointerEvent) => {
      if (e.pointerId === id) id = -1;
    };

    el.addEventListener('pointerdown', d);
    el.addEventListener('pointermove', m);
    el.addEventListener('pointerup', resetTouch);
    el.addEventListener('pointercancel', resetTouch);
    el.addEventListener('pointerleave', resetTouch);

    return () => {
      el.removeEventListener('pointerdown', d);
      el.removeEventListener('pointermove', m);
      el.removeEventListener('pointerup', resetTouch);
      el.removeEventListener('pointercancel', resetTouch);
      el.removeEventListener('pointerleave', resetTouch);
    };
  }, [touch, sens, resp, camera, gl]);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const s = useGame.getState();
    if (s.pauseOpen || s.settingsOpen || s.invOpen || s.card || s.lock || s.screen !== 'game') { setMovement('none'); setBreath(false); return; }

    // Environmental focus event: the camera turns toward something important (a door that just opened, a clue…) and the player is held for a moment
    if (world.focus) {
      if (performance.now() < world.focus.until) {
        setMovement('none'); setBreath(false);
        const f = world.focus, dx = f.x - camera.position.x, dy = f.y - camera.position.y, dz = f.z - camera.position.z;
        const ty = Math.atan2(-dx, -dz), tp = Math.max(-0.6, Math.min(0.6, Math.atan2(dy, Math.hypot(dx, dz))));
        let d = ty - camera.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        const k = 1 - Math.exp(-dt * 3.5);
        camera.rotation.y += d * k; camera.rotation.x += (tp - camera.rotation.x) * k;
        yaw.current = camera.rotation.y; pitch.current = camera.rotation.x;
        return;
      }
      world.focus = null; useGame.setState({ bars: false });
    }

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

    // تحديث Stamina
    let st = s.stamina;
    if (run) {
      st = Math.max(0, s.stamina - 22 * dt);
    } else {
      st = Math.min(100, s.stamina + (moving ? 10 : 18) * dt);
    }

    if (Math.abs(st - s.stamina) > 0.05) {
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

    eye.current += ((s.crouch ? EYE_CROUCH : EYE_STAND) - eye.current) * Math.min(1, dt * 10);
    bob.current += dt * (run ? 12 : 6) * (moving ? 1 : 0.1);
    camera.position.y = floor.current + eye.current + Math.sin(bob.current) * (moving ? (run ? 0.03 : 0.015) : 0.002);

    world.pos = [camera.position.x, camera.position.y, camera.position.z];
    world.floor = floor.current;

    // أصوات الحركة والتنفس
    setMovement(actuallyMoved ? (s.crouch ? 'crouch' : run ? 'run' : 'walk') : 'none', run ? 0.9 : 0.6);
    
    if (st <= 0) breathingRef.current = true;
    else if (st > 25) breathingRef.current = false;
    
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
      <PlayerBody />
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

useGLTF.preload('/models/algerian_man.glb');
