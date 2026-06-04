import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

export function SceneEnvironment() {
  const pulseRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      pulseRef.current.intensity = 5 + Math.sin(clock.getElapsedTime() * 0.7) * 1.2;
    }
  });

  return (
    <group>

      {/* ══ GLOBAL LIGHTING ══════════════════════════════════════════ */}

      {/* Strong ambient — base fill, everything visible */}
      <ambientLight intensity={1.8} color="#d0d8ff" />

      {/* Hemisphere — sky warm, ground cool */}
      <hemisphereLight args={['#9090ee', '#303060', 1.2]} />

      {/* Main key light — overhead-front, defines shapes + shadows */}
      <directionalLight
        position={[3, 14, 10]}
        intensity={2.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-10}
      />

      {/* Fill from left */}
      <directionalLight position={[-8, 6, 8]}  intensity={1.0} color="#c0ccff" />
      {/* Fill from right */}
      <directionalLight position={[ 8, 6, 8]}  intensity={0.8} color="#c0ccff" />
      {/* Rim from behind */}
      <directionalLight position={[0,  5, -12]} intensity={0.6} color="#8888cc" />

      {/* ══ FLOOR ════════════════════════════════════════════════════ */}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <MeshReflectorMaterial
          blur={[400, 150]}
          resolution={512}
          mixBlur={0.9}
          mixStrength={0.65}
          roughness={0.85}
          depthScale={1.1}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
          color="#12122e"
          metalness={0.85}
          mirror={0}
        />
      </mesh>

      <Grid
        position={[0, 0.004, 0]}
        args={[30, 24]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#3535a0"
        sectionSize={4}
        sectionThickness={1.2}
        sectionColor="#5050cc"
        fadeDistance={26}
        fadeStrength={1.0}
        infiniteGrid={false}
      />

      {/* ══ BACK WALL ════════════════════════════════════════════════ */}

      <mesh position={[0, 4.5, -8.5]} receiveShadow>
        <planeGeometry args={[30, 9]} />
        <meshStandardMaterial color="#181836" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Neon strip — top */}
      <mesh position={[0, 8.88, -8.44]}>
        <boxGeometry args={[30, 0.12, 0.07]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={4.0} />
      </mesh>
      {/* Neon strip — mid */}
      <mesh position={[0, 4.2, -8.44]}>
        <boxGeometry args={[30, 0.06, 0.05]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={3.0} />
      </mesh>

      {/* Wall illumination lights */}
      <pointLight position={[-6, 4, -7.5]} color="#8080ff" intensity={18} distance={14} decay={2} />
      <pointLight position={[ 0, 4, -7.5]} color="#8080ff" intensity={18} distance={14} decay={2} />
      <pointLight position={[ 6, 4, -7.5]} color="#8080ff" intensity={18} distance={14} decay={2} />

      {/* ══ SIDE WALLS ═══════════════════════════════════════════════ */}

      {/* Left */}
      <mesh position={[-11, 4.5, -1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 9]} />
        <meshStandardMaterial color="#161630" roughness={0.8} />
      </mesh>
      <mesh position={[-10.93, 8.88, -1]}>
        <boxGeometry args={[0.10, 0.12, 20]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3.5} />
      </mesh>
      <pointLight position={[-10, 3.5, -5]} color="#06b6d4" intensity={14} distance={14} decay={2} />
      <pointLight position={[-10, 3.5,  3]} color="#06b6d4" intensity={14} distance={14} decay={2} />

      {/* Right */}
      <mesh position={[11, 4.5, -1]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 9]} />
        <meshStandardMaterial color="#161630" roughness={0.8} />
      </mesh>
      <mesh position={[10.93, 8.88, -1]}>
        <boxGeometry args={[0.10, 0.12, 20]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3.5} />
      </mesh>
      <pointLight position={[10, 3.5, -5]} color="#06b6d4" intensity={14} distance={14} decay={2} />
      <pointLight position={[10, 3.5,  3]} color="#06b6d4" intensity={14} distance={14} decay={2} />

      {/* ══ CEILING ══════════════════════════════════════════════════ */}

      <mesh position={[0, 9, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#10102a" roughness={1} />
      </mesh>

      {/* Ceiling panels — 3 rows × 3 cols, stronger */}
      {([-5.5, -0.5, 4.5] as number[]).flatMap((pz, zi) =>
        ([-5, 0, 5] as number[]).map((cx, ci) => (
          <group key={`c-${zi}-${ci}`} position={[cx, 8.6, pz]}>
            <mesh>
              <boxGeometry args={[2.8, 0.12, 0.85]} />
              <meshStandardMaterial color="#1a1a3a" metalness={0.5} roughness={0.5} />
            </mesh>
            {/* Bright emissive panel */}
            <mesh position={[0, -0.065, 0]}>
              <boxGeometry args={[2.55, 0.025, 0.70]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#e8eeff"
                emissiveIntensity={3.0}
              />
            </mesh>
            {/* Strong downward light */}
            <pointLight
              position={[0, -0.5, 0]}
              color="#e0eaff"
              intensity={35}
              distance={12}
              decay={2}
            />
          </group>
        ))
      )}

      {/* ══ CORRIDOR FLOOR STRIPS ════════════════════════════════════ */}

      <mesh position={[-1.5, 0.006, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.10, 12]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.85} />
      </mesh>
      <mesh position={[1.5, 0.006, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.10, 12]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.85} />
      </mesh>

      {/* Corridor fill lights */}
      <pointLight position={[0, 3, -5]}  color="#a0a0ff" intensity={12} distance={10} decay={2} />
      <pointLight position={[0, 3,  2]}  color="#a0a0ff" intensity={12} distance={10} decay={2} />
      <pointLight position={[0, 4, -1.2]} color="#9090dd" intensity={10} distance={12} decay={2} />

      {/* ══ PULSING ORB ══════════════════════════════════════════════ */}

      <pointLight
        ref={pulseRef}
        position={[0, 2.2, -1.2]}
        color="#a78bfa"
        intensity={5}
        distance={8}
        decay={2}
      />

      {/* ══ HOLO PILLAR ══════════════════════════════════════════════ */}
      <HoloPillar />

    </group>
  );
}

function HoloPillar() {
  const ringRef  = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const coreRef  = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current)  ringRef.current.rotation.y  =  t * 0.8;
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.5;
      ring2Ref.current.rotation.x =  t * 0.3;
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.92 + Math.sin(t * 2) * 0.08);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.70 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <group position={[0, 0, -1.2]}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.24, 0.30, 0.18, 16]} />
        <meshStandardMaterial color="#20204a" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <torusGeometry args={[0.24, 0.025, 8, 32]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      <mesh ref={coreRef} position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#a5b4fc" transparent opacity={0.70} />
      </mesh>
      <mesh ref={ringRef} position={[0, 1.1, 0]}>
        <torusGeometry args={[0.42, 0.028, 8, 48]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 1.1, 0]}>
        <torusGeometry args={[0.33, 0.020, 8, 40]} />
        <meshBasicMaterial color="#a78bfa" />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.1, 8]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.65} />
      </mesh>
      <pointLight position={[0, 1.8, 0]} color="#a78bfa" intensity={6} distance={7} decay={2} />
    </group>
  );
}
