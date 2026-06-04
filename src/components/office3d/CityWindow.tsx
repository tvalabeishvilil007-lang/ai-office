import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// CityWindow — night-city window mounted on the right side wall.
// Shows a stylised city silhouette with flickering building lights.
// ─────────────────────────────────────────────────────────────────────────────

const BUILDING_SEED = 42;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Building {
  x: number;
  w: number;
  h: number;
  lights: Array<{ lx: number; ly: number; color: string }>;
}

function useBuildings(count: number, totalW: number): Building[] {
  return useMemo(() => {
    const rng = seededRandom(BUILDING_SEED);
    const buildings: Building[] = [];
    let cursor = -totalW / 2;
    for (let i = 0; i < count; i++) {
      const w = 0.18 + rng() * 0.32;
      const h = 0.15 + rng() * 0.80;
      const gap = 0.02 + rng() * 0.08;
      const cx = cursor + gap + w / 2;
      cursor = cx + w / 2;

      // lights on building face
      const lights: Building['lights'] = [];
      const rows = Math.floor(h / 0.14);
      const cols = Math.floor(w  / 0.12);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng() < 0.55) {
            const warm = rng() < 0.6;
            lights.push({
              lx: -w / 2 + 0.06 + c * 0.12 + rng() * 0.02,
              ly: 0.08 + r * 0.14,
              color: warm ? '#ffd580' : '#a0d0ff',
            });
          }
        }
      }

      buildings.push({ x: cx, w, h, lights });
    }
    return buildings;
  }, [count, totalW]);
}

function BuildingLights({
  buildings,
  winH,
}: {
  buildings: Building[];
  winH: number;
}) {
  type LightEntry = { cx: number; cy: number; color: string; phase: number };
  const entries = useMemo<LightEntry[]>(() => {
    const rng = seededRandom(BUILDING_SEED + 1);
    return buildings.flatMap((b) =>
      b.lights.map((l) => ({
        cx: b.x + l.lx,
        cy: l.ly - winH * 0.22,
        color: l.color,
        phase: rng() * Math.PI * 2,
      })),
    );
  }, [buildings, winH]);

  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    entries.forEach((e, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const flicker =
        e.phase % 1.1 < 0.05 ? Math.sin(t * 30 + e.phase) * 0.5 + 0.5 : 1;
      const on = Math.sin(t * 0.08 + e.phase) > -0.7;
      (mesh.material as THREE.MeshBasicMaterial).opacity = on ? 0.8 * flicker : 0.1;
    });
  });

  return (
    <>
      {entries.map((e, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          position={[e.cx, e.cy, 0.005]}
        >
          <boxGeometry args={[0.045, 0.045, 0.001]} />
          <meshBasicMaterial color={e.color} transparent opacity={0.8} />
        </mesh>
      ))}
    </>
  );
}

interface CityWindowProps {
  position: [number, number, number];
  rotationY: number;
  seed?: number;
}

export function CityWindow({ position, rotationY, seed = 42 }: CityWindowProps) {
  const winW  = 3.2;
  const winH  = 2.2;
  const buildings = useBuildings(18, winW * 0.95);

  const stars = useMemo(() => {
    const rng = seededRandom(seed + 99);
    return Array.from({ length: 30 }, () => ({
      x: (rng() - 0.5) * winW * 0.9,
      y:  0.2 + rng() * (winH * 0.45),
      s: 0.010 + rng() * 0.016,
    }));
  }, [winW, winH, seed]);

  const moonRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (moonRef.current) {
      (moonRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.88 + Math.sin(clock.getElapsedTime() * 0.3 + seed * 0.5) * 0.06;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>

      {/* Outer frame */}
      <mesh>
        <boxGeometry args={[winW + 0.22, winH + 0.22, 0.10]} />
        <meshStandardMaterial color="#0e0e24" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Neon frame edges */}
      {[
        { p: [0,  (winH + 0.22) / 2, 0.056] as [number,number,number], s: [winW + 0.22, 0.03, 0.01] as [number,number,number] },
        { p: [0, -(winH + 0.22) / 2, 0.056] as [number,number,number], s: [winW + 0.22, 0.03, 0.01] as [number,number,number] },
        { p: [-(winW + 0.22) / 2, 0, 0.056] as [number,number,number], s: [0.03, winH + 0.22, 0.01] as [number,number,number] },
        { p: [ (winW + 0.22) / 2, 0, 0.056] as [number,number,number], s: [0.03, winH + 0.22, 0.01] as [number,number,number] },
      ].map((e, i) => (
        <mesh key={i} position={e.p}>
          <boxGeometry args={e.s} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.5} />
        </mesh>
      ))}

      {/* Night sky background */}
      <mesh position={[0, 0, 0.052]}>
        <boxGeometry args={[winW, winH, 0.005]} />
        <meshBasicMaterial color="#020514" />
      </mesh>

      {/* Stars */}
      {stars.map((st, i) => (
        <mesh key={i} position={[st.x, st.y, 0.058]}>
          <boxGeometry args={[st.s, st.s, 0.001]} />
          <meshBasicMaterial color="#e8f4ff" transparent opacity={0.7 + Math.random() * 0.3} />
        </mesh>
      ))}

      {/* Moon */}
      <mesh ref={moonRef} position={[winW * 0.32, winH * 0.28, 0.062]}>
        <circleGeometry args={[0.13, 16]} />
        <meshBasicMaterial color="#ddeeff" transparent opacity={0.88} />
      </mesh>
      {/* Moon crescent shadow */}
      <mesh position={[winW * 0.32 + 0.055, winH * 0.28 + 0.02, 0.064]}>
        <circleGeometry args={[0.11, 16]} />
        <meshBasicMaterial color="#020514" transparent opacity={0.9} />
      </mesh>

      {/* City glow at horizon */}
      <mesh position={[0, -winH * 0.14, 0.060]}>
        <boxGeometry args={[winW, winH * 0.35, 0.002]} />
        <meshBasicMaterial color="#1a0a40" transparent opacity={0.65} />
      </mesh>

      {/* Building silhouettes */}
      {buildings.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, -winH * 0.5 + b.h / 2, 0.065]}
        >
          <boxGeometry args={[b.w, b.h, 0.003]} />
          <meshBasicMaterial color="#06061a" />
        </mesh>
      ))}

      {/* Building lights */}
      <group position={[0, -winH * 0.5, 0.068]}>
        <BuildingLights buildings={buildings} winH={winH} />
      </group>

      {/* Window pane glare (subtle reflection) */}
      <mesh position={[0.4, 0.3, 0.075]}>
        <boxGeometry args={[0.06, winH * 0.7, 0.001]} />
        <meshBasicMaterial color="#a0d8ff" transparent opacity={0.04} />
      </mesh>

      {/* Ambient glow cast into room */}
      <pointLight position={[-0.5, 0, 0.3]} color="#0a1840" intensity={4} distance={5} decay={2} />
    </group>
  );
}
