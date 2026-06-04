import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// FloatingParticles — data-stream particles drifting through the office.
// Three groups: indigo dots, purple sparks, cyan data points.
// Uses InstancedMesh for performance (no per-particle re-renders).
// ─────────────────────────────────────────────────────────────────────────────

interface GroupConfig {
  count:     number;
  color:     string;
  size:      number;
  speed:     number;
  spreadX:   number;
  spreadZ:   number;
  maxY:      number;
  opacity:   number;
}

const GROUPS: GroupConfig[] = [
  { count: 65, color: '#818cf8', size: 0.055, speed: 0.45, spreadX: 18, spreadZ: 14, maxY: 7.5, opacity: 0.55 },
  { count: 35, color: '#a78bfa', size: 0.038, speed: 0.28, spreadX: 15, spreadZ: 11, maxY: 6.0, opacity: 0.50 },
  { count: 25, color: '#22d3ee', size: 0.042, speed: 0.60, spreadX: 16, spreadZ: 12, maxY: 5.5, opacity: 0.45 },
];

function ParticleGroup({ count, color, size, speed, spreadX, spreadZ, maxY, opacity }: GroupConfig) {
  const ref  = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { ox, oy, oz, sp, ph } = useMemo(() => {
    const ox = new Float32Array(count);
    const oy = new Float32Array(count);
    const oz = new Float32Array(count);
    const sp = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      ox[i] = (Math.random() - 0.5) * spreadX;
      oy[i] = Math.random() * maxY;
      oz[i] = (Math.random() - 0.5) * spreadZ;
      sp[i] = speed * (0.6 + Math.random() * 0.8);
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { ox, oy, oz, sp, ph };
  }, [count, spreadX, spreadZ, maxY, speed]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const y  = (oy[i] + t * sp[i]) % maxY;
      const sx = ox[i] + Math.sin(t * 0.35 + ph[i]) * 0.5;
      const sz = oz[i] + Math.cos(t * 0.28 + ph[i] * 1.3) * 0.5;
      const s  = size * (0.65 + Math.sin(t * 2.2 + ph[i]) * 0.35);
      dummy.position.set(sx, y + 0.1, sz);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
}

export function FloatingParticles() {
  return (
    <>
      {GROUPS.map((g, i) => <ParticleGroup key={i} {...g} />)}
    </>
  );
}
