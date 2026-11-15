/**
 * Asteroid mascot scene (Three.js). Framework-agnostic: no React in here.
 * The React wrapper (Mascot3D.tsx) imports this file lazily so Three.js
 * ends up in its own chunk and is bundled locally (works offline).
 */
import {
  BufferAttribute,
  CircleGeometry,
  ConeGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { MASCOT_POSES, POSE_KEYS } from './mascotStates';
import type { MascotPose, MascotState } from './mascotStates';

export interface AsteroidScene {
  /** Smoothly blend to another mood. */
  setState: (state: MascotState) => void;
  /** Replay the pop-in animation. */
  replayEntrance: () => void;
  /** Stop the loop and free every GPU resource. Always call on unmount. */
  dispose: () => void;
}

/** Ambient floating motion (the "swing / pitch / roll" layer). */
const AMBIENT = { swing: 0.35, pitch: 0.12, roll: 0.08, speed: 1 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/* ---------- Asteroid body ---------- */

interface Crater {
  x: number;
  y: number;
  z: number;
  /** Radius on the unit sphere */
  r: number;
  /** Depth */
  d: number;
}

/** 8 craters: 6 around the face area and 2 on the back (visible when it spins). */
const CRATERS: Crater[] = [
  { x: -0.46, y: 0.58, z: 0.67, r: 0.27, d: 0.24 },
  { x: 0.5, y: 0.55, z: 0.67, r: 0.22, d: 0.2 },
  { x: -0.54, y: -0.56, z: 0.63, r: 0.29, d: 0.25 },
  { x: 0.74, y: -0.34, z: 0.58, r: 0.23, d: 0.2 },
  { x: -0.85, y: 0.14, z: 0.51, r: 0.21, d: 0.19 },
  { x: 0.06, y: 0.9, z: 0.43, r: 0.22, d: 0.19 },
  { x: -0.48, y: 0.34, z: -0.81, r: 0.32, d: 0.24 },
  { x: 0.48, y: -0.36, z: -0.8, r: 0.3, d: 0.23 },
].map((c) => {
  // Normalize the crater directions so they lie on the unit sphere
  const len = Math.hypot(c.x, c.y, c.z) || 1;
  return { ...c, x: c.x / len, y: c.y / len, z: c.z / len };
});

function buildAsteroidGeometry(): IcosahedronGeometry {
  const geo = new IcosahedronGeometry(1.32, 6);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const len = Math.hypot(vx, vy, vz) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const nz = vz / len;

    // Keeps the eyes, cheeks and mouth area smooth (no craters or bumps there)
    const faceDist = Math.hypot(nx * 0.95, (ny + 0.06) * 1.25, (nz - 0.97) * 1.35);
    let faceGuard = Math.min(1, Math.max(0, (faceDist - 0.42) / 0.18));
    faceGuard = faceGuard * faceGuard * (3 - 2 * faceGuard);

    // Slightly irregular, rock-like silhouette
    const rawLump =
      0.075 * Math.sin(nx * 2.4 + 0.5) * Math.cos(ny * 2.1 - 0.3) +
      0.05 * Math.sin(nz * 3.0 + nx * 1.8) +
      0.025 * Math.cos(ny * 4.2 + nz * 3.6);
    const lump = 1 + rawLump * (0.25 + 0.75 * faceGuard);

    let craterDisp = 0;
    let shade = 1;
    for (const c of CRATERS) {
      const t = Math.hypot(nx - c.x, ny - c.y, nz - c.z) / c.r;
      if (t >= 1.38) continue;
      if (t < 1) {
        // Bowl of the crater
        const bowl = Math.max(0, Math.cos(t * Math.PI * 0.5));
        craterDisp -= c.d * Math.pow(bowl, 0.75);
        shade = Math.min(shade, 0.35 + 0.65 * Math.pow(Math.max(0, t), 2.1));
      } else {
        // Raised rim around the crater
        const rimWave = Math.sin((1 - (t - 1) / 0.38) * Math.PI);
        craterDisp += c.d * 0.36 * rimWave;
        shade = Math.max(shade, 1 + 0.15 * rimWave);
      }
    }
    craterDisp *= faceGuard;
    shade = 1 + (shade - 1) * faceGuard;

    const finalR = 1.32 * lump + craterDisp;
    pos.setXYZ(i, nx * finalR * 1.15, ny * finalR * 0.96, nz * finalR * 0.9);

    // Warm stone gray with subtle grain
    const grain = 0.96 + 0.08 * Math.abs(Math.sin(nx * 19.3 + ny * 27.1 + nz * 13.7));
    const s = shade * grain;
    colors[i * 3] = Math.min(1, 0.64 * s);
    colors[i * 3 + 1] = Math.min(1, 0.62 * s);
    colors[i * 3 + 2] = Math.min(1, 0.6 * s);
  }

  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Scene factory ---------- */

/** Throws if WebGL is not available: the caller should catch and show a fallback. */
export function createAsteroidScene(
  container: HTMLElement,
  initialState: MascotState = 'idle',
): AsteroidScene {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = reduceMotion ? 0.35 : 1;

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 60);

  scene.add(new HemisphereLight(0xfff4d8, 0x6b52c9, 0.58));
  const keyLight = new DirectionalLight(0xffffff, 1.32);
  keyLight.position.set(5, 6, 5);
  scene.add(keyLight);
  const rimLight = new PointLight(0x9db6ff, 1.05, 40);
  rimLight.position.set(-6, 2, -3);
  scene.add(rimLight);

  /* Body */
  const body = new Mesh(
    buildAsteroidGeometry(),
    new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.04 }),
  );
  const star = new Group();
  star.add(body);

  /* Face */
  const face = new Group();
  face.position.set(0, -0.05, 1.16);
  star.add(face);

  const dark = new MeshStandardMaterial({ color: 0x2a1738, roughness: 0.25 });

  const makeEye = (side: number) => {
    const g = new Group();
    const eye = new Mesh(new SphereGeometry(0.17, 20, 16), dark);
    eye.scale.set(0.9, 1.25, 0.4);
    g.add(eye);
    const glint = new Mesh(new SphereGeometry(0.05, 10, 8), new MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(0.04, 0.08, 0.07);
    g.add(glint);
    g.position.set(side * 0.42, 0.12, 0);
    face.add(g);
    return g;
  };
  const eyeL = makeEye(-1);
  const eyeR = makeEye(1);

  const mouth = new Group();
  mouth.position.set(0, -0.22, 0.03);
  face.add(mouth);
  const smileArc = new Mesh(new TorusGeometry(0.2, 0.035, 8, 28, Math.PI), dark);
  smileArc.rotation.z = Math.PI;
  mouth.add(smileArc);
  const mouthFill = new Mesh(
    new CircleGeometry(0.2, 24, Math.PI, Math.PI),
    new MeshBasicMaterial({ color: 0x8a2f55 }),
  );
  mouthFill.position.z = -0.01;
  mouth.add(mouthFill);

  const cheekMat = new MeshBasicMaterial({ color: 0xff8fb1, transparent: true, opacity: 0.5, depthWrite: false });
  for (const side of [-1, 1]) {
    const cheek = new Mesh(new CircleGeometry(0.17, 20), cheekMat);
    cheek.scale.set(1, 0.7, 1);
    cheek.position.set(side * 0.64, -0.12, -0.075);
    cheek.rotation.y = side * 0.46;
    face.add(cheek);
  }
  scene.add(star);

/* Sparkles (happy / celebrating) */
  const sparks: Mesh<OctahedronGeometry, MeshBasicMaterial>[] = [];
  for (let i = 0; i < 10; i++) {
    const spark = new Mesh(
      new OctahedronGeometry(0.1),
      new MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0, depthWrite: false }),
    );
    scene.add(spark);
    sparks.push(spark);
  }

  /* Water drop (thirsty) */
  const drop = new Group();
  const blue = new MeshStandardMaterial({ color: 0x5ec8ff, roughness: 0.2 });
  const dropBody = new Mesh(new SphereGeometry(0.14, 14, 12), blue);
  dropBody.scale.y = 1.25;
  drop.add(dropBody);
  const dropTip = new Mesh(new ConeGeometry(0.1, 0.24, 14), blue);
  dropTip.position.y = 0.24;
  drop.add(dropTip);
  scene.add(drop);

  /* State */
  let stateName: MascotState = initialState;
  let target: MascotPose = MASCOT_POSES[initialState];
  const cur: MascotPose = { ...target };

  /* Interaction */
  let px = 0;
  let py = 0;
  let lookX = 0;
  let lookY = 0;
  let impulse = 0;

  const onPointerMove = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    px = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
    py = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
  };
  const onClick = () => {
    impulse = 1;
  };
  window.addEventListener('pointermove', onPointerMove);
  container.addEventListener('click', onClick);

  /* Sizing */
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 1.1, 9.5 / Math.min(1, camera.aspect * 1.2));
    camera.lookAt(0, -0.3, 0);
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  /* Animation loop (paused while off-screen or in a hidden tab) */
  let entry = 0;
  let t = 0;
  let ambientT = 0;
  let spinT = 0;
  let nextBlink = 2;
  let blinkAt = -9;
  let last = 0;
  let rafId = 0;
  let running = false;
  let onScreen = true;
  let disposed = false;

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    // Blend the current pose toward the target pose
    const f = 1 - Math.exp(-dt * 6);
    for (const k of POSE_KEYS) cur[k] += (target[k] - cur[k]) * f;
    lookX += (px - lookX) * f;
    lookY += (py - lookY) * f;
    impulse = Math.max(0, impulse - dt * 1.6);

    // Hop with squash and stretch
    const phase = t * cur.speed;
    const u = Math.abs(Math.sin(phase));
    const kk = Math.min(1, cur.bob * 3) * motion;
    const hop = u * cur.bob * motion + Math.sin(impulse * Math.PI) * 0.9;
    const ground = Math.pow(1 - u, 4);
    const sy =
      1 +
      kk * (0.1 * u - 0.16 * ground) +
      Math.sin(impulse * Math.PI) * 0.1 -
      (impulse > 0.85 ? (impulse - 0.85) * 0.8 : 0);

    // Breathing and pop-in entrance
    const breath = 1 + 0.018 * Math.sin(t * 2.1);
    const enter = entry < 1 ? Math.max(0, easeOutBack(entry)) : 1;
    if (entry < 1) entry = Math.min(1, entry + dt / 1.1);
    const sc = cur.scale * enter * breath;
    star.scale.set(sc / Math.sqrt(sy), sc * sy, sc / Math.sqrt(sy));
    star.position.y = hop;

    // Full turn while celebrating
    let spin = 0;
    if (stateName === 'celebrating' && !reduceMotion) {
      spinT += dt;
      const c = spinT % 3.4;
      spin = c < 1.1 ? easeInOut(c / 1.1) * Math.PI * 2 : 0;
    }

    // Ambient floating motion
    ambientT += dt * AMBIENT.speed;
    const swing = Math.sin(ambientT * 0.5) * AMBIENT.swing * motion;
    const pitch = Math.cos(ambientT * 0.4) * AMBIENT.pitch * motion;
    const roll = Math.sin(ambientT * 0.21) * AMBIENT.roll * motion;

    star.rotation.set(
      lookY * 0.18 + pitch,
      lookX * 0.4 + spin + swing,
      cur.tilt + roll + Math.sin(phase * 0.5) * 0.05 * motion * Math.min(1, cur.bob * 4),
    );

    // Blink
    if (t > nextBlink) {
      blinkAt = t;
      nextBlink = t + 2.5 + Math.random() * 3;
    }
    const bt = (t - blinkAt) / 0.15;
    const blink = bt < 1 ? 1 - Math.sin(bt * Math.PI) : 1;
    eyeL.scale.y = eyeR.scale.y = Math.max(0.08, cur.eye * blink);

    // Mouth and cheeks
    mouth.scale.set(1 + 0.35 * cur.open, cur.smile === 0 ? 0.01 : cur.smile, 1);
    mouthFill.visible = cur.open > 0.05 && cur.smile > 0.1;
    mouthFill.scale.y = Math.max(0.01, cur.open);
    cheekMat.opacity = cur.cheek * 0.8;

    // Sparkles
    sparks.forEach((s, idx) => {
      const ang = (idx / sparks.length) * Math.PI * 2 + t * 0.8;
      const rr = 2.5 + 0.25 * Math.sin(t * 2 + idx);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + idx * 1.7);
      s.position.set(
      Math.cos(ang) * rr,
      Math.sin(ang) * rr * 0.3 + hop * 0.5,
      Math.sin(ang) * rr,
      );
      s.scale.setScalar(0.5 + pulse);
      s.rotation.y = t * 2 + idx;
      s.rotation.z = t + idx;
      s.material.opacity = cur.spark * pulse;
      s.visible = cur.spark > 0.02;
    });

    // Water drop
    const fall = (t * 0.55) % 1;
    drop.visible = cur.drop > 0.02;
    drop.position.set(1.9, 2.0 - fall * 1.1, 0.5);
    drop.scale.setScalar(cur.drop * (1 - fall * 0.45));

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || disposed || !onScreen || document.hidden) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const intersectionObserver = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    if (onScreen) start();
    else stop();
  });
  intersectionObserver.observe(container);

  start();

  return {
    setState(state) {
      stateName = state;
      target = MASCOT_POSES[state];
      spinT = 0;
    },
    replayEntrance() {
      entry = 0;
    },
    dispose() {
      disposed = true;
      stop();
      window.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
