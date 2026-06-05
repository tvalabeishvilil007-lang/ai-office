import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// WorkZone — desk + monitor + chair.
// Animated monitor screen shows per-agent data activity.
// ─────────────────────────────────────────────────────────────────────────────

interface WorkZoneProps {
  position: [number, number, number];
  rotation?: number;
  accentColor: string;
  agentId?: string;
}

// ── Animated bar chart on monitor screen ──────────────────────────────────────

function MonitorBars({
  accentColor,
  seed,
}: {
  accentColor: string;
  seed: number;
}) {
  const ref   = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 7;
  const phases = useMemo(
    () => Array.from({ length: count }, (_, i) => seed * 0.07 + i * 0.72),
    [seed],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const h = 0.04 + Math.abs(Math.sin(t * 0.65 + phases[i])) * 0.12;
      dummy.position.set(-0.15 + i * 0.05, -0.08 + h / 2, 0);
      dummy.scale.set(1, h / 0.16, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.032, 0.16, 0.002]} />
      <meshBasicMaterial color={accentColor} transparent opacity={0.85} />
    </instancedMesh>
  );
}

// ── Scrolling data lines on monitor ──────────────────────────────────────────

function MonitorLines({
  accentColor,
  seed,
}: {
  accentColor: string;
  seed: number;
}) {
  const lineRefs = useRef<(THREE.Mesh | null)[]>([]);
  const count    = 4;
  const phases   = useMemo(
    () => Array.from({ length: count }, (_, i) => seed * 0.13 + i * 1.1),
    [seed],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    lineRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const w = 0.07 + Math.abs(Math.sin(t * 0.4 + phases[i])) * 0.22;
      mesh.scale.x = w / 0.29;
    });
  });

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { lineRefs.current[i] = el; }}
          position={[0.08, 0.04 + i * 0.028, 0]}
        >
          <boxGeometry args={[0.29, 0.010, 0.002]} />
          <meshBasicMaterial
            color={i === 0 ? '#ffffff' : accentColor}
            transparent
            opacity={0.25 + i * 0.05}
          />
        </mesh>
      ))}
    </>
  );
}

// ── Blinking cursor indicator ─────────────────────────────────────────────────

function BlinkingDot({ accentColor }: { accentColor: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      Math.sin(clock.getElapsedTime() * 2.5) > 0 ? 0.9 : 0.1;
  });
  return (
    <mesh ref={ref} position={[-0.30, 0.08, 0]}>
      <boxGeometry args={[0.018, 0.018, 0.002]} />
      <meshBasicMaterial color={accentColor} transparent opacity={0.9} />
    </mesh>
  );
}

export function WorkZone({ position, rotation = 0, accentColor, agentId }: WorkZoneProps) {
  const [x, y, z] = position;

  // Deterministic seed per agent for animation variety
  const seed = useMemo(() => {
    if (!agentId) return 0;
    return agentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  }, [agentId]);

  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]}>

      {/* ────────────────────── DESK ────────────────────────────── */}

      <mesh position={[0, 0.70, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 0.07, 0.95]} />
        <meshStandardMaterial color="#3a3a60" roughness={0.2} metalness={0.55} />
      </mesh>

      {/* Glowing front edge */}
      <mesh position={[0, 0.705, 0.478]}>
        <boxGeometry args={[1.83, 0.03, 0.018]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={3.5} />
      </mesh>

      {/* Desk legs */}
      {([[-0.83, -0.41], [0.83, -0.41], [-0.83, 0.41], [0.83, 0.41]] as [number,number][]).map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.34, lz]} castShadow>
          <boxGeometry args={[0.07, 0.70, 0.07]} />
          <meshStandardMaterial color="#28284a" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}

      {/* ────────────────────── MONITOR ─────────────────────────── */}

      <mesh position={[0, 0.80, -0.10]}>
        <boxGeometry args={[0.07, 0.18, 0.07]} />
        <meshStandardMaterial color="#404068" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.715, -0.10]}>
        <boxGeometry args={[0.32, 0.028, 0.18]} />
        <meshStandardMaterial color="#404068" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Monitor outer frame */}
      <mesh position={[0, 1.04, -0.11]} castShadow>
        <boxGeometry args={[0.86, 0.56, 0.055]} />
        <meshStandardMaterial color="#30305a" roughness={0.25} metalness={0.80} />
      </mesh>

      {/* Screen base color */}
      <mesh position={[0, 1.04, -0.082]}>
        <boxGeometry args={[0.75, 0.45, 0.008]} />
        <meshBasicMaterial color="#020218" />
      </mesh>

      {/* Subtle color wash */}
      <mesh position={[0, 1.04, -0.077]}>
        <boxGeometry args={[0.73, 0.43, 0.002]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.08} />
      </mesh>

      {/* Animated data content */}
      <group position={[0, 1.04, -0.072]}>
        <MonitorBars  accentColor={accentColor} seed={seed} />
        <MonitorLines accentColor={accentColor} seed={seed} />
        <BlinkingDot  accentColor={accentColor} />
      </group>

      {/* Scanline */}
      <MonitorScanLine accentColor={accentColor} />

      {/* Monitor screen casts light forward */}
      <pointLight
        position={[0, 1.04, 0.55]}
        color={accentColor}
        intensity={5}
        distance={3.5}
        decay={2}
      />

      {/* Monitor frame neon border (bottom edge) */}
      <mesh position={[0, 0.818, -0.082]}>
        <boxGeometry args={[0.84, 0.025, 0.01]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={2.0} />
      </mesh>

      {/* ────────────────────── SECOND MONITOR ─────────────────────────── */}

      <group position={[0.68, 0, -0.08]} rotation={[0, -0.40, 0]}>
        {/* Stand column */}
        <mesh position={[0, 0.80, -0.06]}>
          <boxGeometry args={[0.045, 0.14, 0.045]} />
          <meshStandardMaterial color="#404068" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Stand base */}
        <mesh position={[0, 0.715, -0.06]}>
          <boxGeometry args={[0.22, 0.022, 0.14]} />
          <meshStandardMaterial color="#404068" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Outer frame */}
        <mesh position={[0, 1.00, -0.07]} castShadow>
          <boxGeometry args={[0.60, 0.42, 0.042]} />
          <meshStandardMaterial color="#30305a" roughness={0.25} metalness={0.80} />
        </mesh>
        {/* Screen base */}
        <mesh position={[0, 1.00, -0.046]}>
          <boxGeometry args={[0.52, 0.34, 0.006]} />
          <meshBasicMaterial color="#020218" />
        </mesh>
        {/* Color wash */}
        <mesh position={[0, 1.00, -0.042]}>
          <boxGeometry args={[0.50, 0.32, 0.002]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.14} />
        </mesh>
        {/* Bottom accent strip */}
        <mesh position={[0, 0.788, -0.046]}>
          <boxGeometry args={[0.58, 0.020, 0.008]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.8} />
        </mesh>
      </group>

      {/* ────────────────────── KEYBOARD ────────────────────────── */}

      <mesh position={[0, 0.728, 0.18]}>
        <boxGeometry args={[0.56, 0.025, 0.22]} />
        <meshStandardMaterial color="#38386a" roughness={0.50} metalness={0.45} />
      </mesh>
      {[0.06, 0.01, -0.04, -0.08].map((dz, row) => (
        <mesh key={row} position={[0, 0.742, 0.18 + dz]}>
          <boxGeometry args={[0.48, 0.008, 0.025]} />
          <meshBasicMaterial color="#6868aa" transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.740, 0.18]}>
        <boxGeometry args={[0.50, 0.005, 0.18]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.22} />
      </mesh>

      {/* Mouse */}
      <mesh position={[0.34, 0.726, 0.18]}>
        <boxGeometry args={[0.10, 0.024, 0.14]} />
        <meshStandardMaterial color="#38386a" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* ────────────────────── DESK PLANT ─────────────────────────── */}

      {/* Pot */}
      <mesh position={[-0.80, 0.757, 0.28]}>
        <cylinderGeometry args={[0.042, 0.034, 0.044, 8]} />
        <meshStandardMaterial color="#2a1808" roughness={0.9} metalness={0} />
      </mesh>
      {/* Foliage */}
      <mesh position={[-0.80, 0.798, 0.28]}>
        <sphereGeometry args={[0.056, 7, 7]} />
        <meshStandardMaterial color="#1a6030" roughness={0.75} emissive="#0a2a14" emissiveIntensity={0.5} />
      </mesh>
      {/* Upright leaf */}
      <mesh position={[-0.80, 0.844, 0.266]} rotation={[0.3, 0.4, 0]}>
        <boxGeometry args={[0.022, 0.050, 0.009]} />
        <meshStandardMaterial color="#22783a" roughness={0.7} emissive="#0d3a1a" emissiveIntensity={0.4} />
      </mesh>

      {/* ────────────────────── CHAIR ───────────────────────────── */}

      <mesh position={[0, 0.46, 0.80]} castShadow>
        <boxGeometry args={[0.78, 0.10, 0.72]} />
        <meshStandardMaterial color="#2c2c52" roughness={0.70} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.86, 1.10]} castShadow>
        <boxGeometry args={[0.74, 0.70, 0.09]} />
        <meshStandardMaterial color="#2c2c52" roughness={0.65} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.86, 1.048]}>
        <boxGeometry args={[0.55, 0.050, 0.012]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={2.5} />
      </mesh>
      {([-0.42, 0.42] as number[]).map((ax, i) => (
        <mesh key={i} position={[ax, 0.64, 0.80]}>
          <boxGeometry args={[0.08, 0.07, 0.52]} />
          <meshStandardMaterial color="#34345e" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, 0.80]}>
        <cylinderGeometry args={[0.048, 0.048, 0.48, 8]} />
        <meshStandardMaterial color="#242445" metalness={0.88} roughness={0.2} />
      </mesh>
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <mesh
            key={i}
            position={[Math.sin(rad) * 0.34, 0.048, 0.80 + Math.cos(rad) * 0.34]}
            rotation={[0, -rad, 0]}
          >
            <boxGeometry args={[0.068, 0.048, 0.36]} />
            <meshStandardMaterial color="#242445" metalness={0.88} roughness={0.3} />
          </mesh>
        );
      })}

      {/* Zone lights removed — ambient from SceneEnvironment covers desks */}

    </group>
  );
}

// ── Scan line that sweeps vertically ─────────────────────────────────────────

function MonitorScanLine({ accentColor }: { accentColor: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.82 + ((t * 0.35) % 0.44);
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.12 + Math.sin(t * 4) * 0.06;
  });
  return (
    <mesh ref={ref} position={[0, 1.04, -0.072]}>
      <boxGeometry args={[0.72, 0.018, 0.001]} />
      <meshBasicMaterial color={accentColor} transparent opacity={0.18} depthWrite={false} />
    </mesh>
  );
}
