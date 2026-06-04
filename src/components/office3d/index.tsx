import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SceneEnvironment } from './SceneEnvironment';
import { WorkZone } from './WorkZone';
import { VoxelWorker } from './VoxelWorker';
import { Decorations } from './Decorations';
import { CityWindow } from './CityWindow';
import { FloatingParticles } from './FloatingParticles';
import { useAgents } from '../../contexts/AgentManagerContext';
import type { WaypointId } from './waypoints';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// OfficeScene3D — main 3D canvas entry point.
// 8 agent zones arranged in 2 rows × 4 columns.
// ─────────────────────────────────────────────────────────────────────────────

interface OfficeScene3DProps {
  onOpen?: (agent: Agent) => void;
}

// ── Desk slots — positions only, agents are assigned dynamically ──────────────
// Any enabled agent (up to MAX_DESK_SLOTS) gets a slot in order.
// Using key = `${slotId}-${agentId}` ensures React remounts when agent changes.

interface DeskSlot {
  slotId:     string;
  deskPos:    [number, number, number];
  waypointId: WaypointId;
  deskRotY:   number;
  wanders:    boolean;
  sitMin?:    number;
  sitMax?:    number;
}

const DESK_SLOTS: DeskSlot[] = [
  // ── Back row (facing +z toward corridor) ─────────────────────────────────
  { slotId: 'b0', deskPos: [-8.5, 0, -5], waypointId: 'desk_business',   deskRotY: 0,        wanders: true, sitMin: 12, sitMax: 22 },
  { slotId: 'b1', deskPos: [-5,   0, -5], waypointId: 'desk_lawyer',     deskRotY: 0,        wanders: true, sitMin: 10, sitMax: 20 },
  { slotId: 'b2', deskPos: [ 5,   0, -5], waypointId: 'desk_finance',    deskRotY: 0,        wanders: true, sitMin: 18, sitMax: 35 },
  { slotId: 'b3', deskPos: [ 8.5, 0, -5], waypointId: 'desk_sales',      deskRotY: 0,        wanders: true, sitMin:  8, sitMax: 16 },
  // ── Front row (facing -z toward corridor) ────────────────────────────────
  { slotId: 'f0', deskPos: [-8.5, 0,  2], waypointId: 'desk_realestate', deskRotY: Math.PI,  wanders: true, sitMin: 20, sitMax: 40 },
  { slotId: 'f1', deskPos: [-5,   0,  2], waypointId: 'desk_marketing',  deskRotY: Math.PI,  wanders: true, sitMin: 12, sitMax: 24 },
  { slotId: 'f2', deskPos: [ 5,   0,  2], waypointId: 'desk_research',   deskRotY: Math.PI,  wanders: true, sitMin: 22, sitMax: 45 },
  { slotId: 'f3', deskPos: [ 8.5, 0,  2], waypointId: 'desk_personal',   deskRotY: Math.PI,  wanders: true, sitMin: 10, sitMax: 20 },
];

// ── Soft vertical aura beam above each agent desk ────────────────────────────

function AgentBeam({ x, z, color }: { x: number; z: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
      0.038 + Math.sin(t * 0.85 + x * 0.7) * 0.015;
  });
  return (
    <mesh ref={meshRef} position={[x, 4.5, z]}>
      <cylinderGeometry args={[0.05, 0.28, 9, 10, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export function OfficeScene3D({ onOpen }: OfficeScene3DProps) {
  const { visibleAgents } = useAgents();

  // Dynamic desk assignment: first N enabled agents (excl. receptionist) fill the slots
  const deskAgents = visibleAgents
    .filter(a => a.id !== 'receptionist')
    .slice(0, DESK_SLOTS.length);

  // Pair each agent with its assigned slot
  const activeZones = deskAgents.map((agent, i) => ({ agent, ...DESK_SLOTS[i] }));

  const activeAgentCount = visibleAgents.filter(a => a.status === 'active').length;

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      style={{ background: '#04040e', width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault fov={48} position={[0, 9, 15]} near={0.1} far={90} />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={6}
        maxDistance={24}
        minPolarAngle={0.20}
        maxPolarAngle={Math.PI / 2.4}
        target={[0, 0.5, -0.5]}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      <Suspense fallback={null}>
        {/* ── Environment ── */}
        <SceneEnvironment />

        {/* ── City windows — 2 per side wall, symmetrical ── */}
        {/* Right wall (x ≈ +11, faces -X) */}
        <CityWindow position={[10.85, 3.6, -4.0]} rotationY={-Math.PI / 2} seed={11} />
        <CityWindow position={[10.85, 3.6,  1.5]} rotationY={-Math.PI / 2} seed={22} />
        {/* Left wall (x ≈ -11, faces +X) */}
        <CityWindow position={[-10.85, 3.6, -4.0]} rotationY={Math.PI / 2} seed={33} />
        <CityWindow position={[-10.85, 3.6,  1.5]} rotationY={Math.PI / 2} seed={44} />

        {/* ── Furniture zones ── */}
        {activeZones.map((zone) => (
          <WorkZone
            key={`desk-${zone.slotId}-${zone.agent.id}`}
            position={zone.deskPos}
            rotation={zone.deskRotY}
            accentColor={zone.agent.accentColor}
            agentId={zone.agent.id}
          />
        ))}

        {/* ── Workers ── */}
        {activeZones.map((zone) => (
          <VoxelWorker
            key={`worker-${zone.slotId}-${zone.agent.id}`}
            agent={zone.agent}
            homeDeskId={zone.waypointId}
            wanders={zone.wanders}
            sitMin={zone.sitMin}
            sitMax={zone.sitMax}
            onClick={() => onOpen?.(zone.agent)}
          />
        ))}

        {/* ── Receptionist — permanent, never wanders ── */}
        {(() => {
          const agent = visibleAgents.find(a => a.id === 'receptionist');
          return agent ? (
            <VoxelWorker
              key="receptionist"
              agent={agent}
              wanders={false}
              onClick={() => onOpen?.(agent)}
            />
          ) : null;
        })()}

        {/* ── Decorations ── */}
        <Decorations />

        {/* ── Floating data particles ── */}
        <FloatingParticles />

        {/* ── Agent aura beams above each active desk ── */}
        {activeZones.map((zone) => (
          <AgentBeam
            key={`beam-${zone.slotId}-${zone.agent.id}`}
            x={zone.deskPos[0]}
            z={zone.deskPos[2]}
            color={zone.agent.accentColor}
          />
        ))}

        {/* ── Status board ── */}
        <StatusBoard activeAgents={activeAgentCount} />

        {/* ── Post-processing: bloom for neon glow ── */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.45}
            luminanceSmoothing={0.90}
            intensity={0.55}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

// ── Status board ──────────────────────────────────────────────────────────────

function StatusBoard({ activeAgents }: { activeAgents: number }) {

  return (
    <group position={[-6, 5.5, -7.8]}>
      <mesh>
        <boxGeometry args={[2.8, 1.4, 0.04]} />
        <meshStandardMaterial color="#06061a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Neon border */}
      <mesh position={[0, 0.69, 0.025]}>
        <boxGeometry args={[2.78, 0.02, 0.01]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      <mesh position={[0, -0.69, 0.025]}>
        <boxGeometry args={[2.78, 0.02, 0.01]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      <mesh position={[-1.39, 0, 0.025]}>
        <boxGeometry args={[0.02, 1.38, 0.01]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      <mesh position={[1.39, 0, 0.025]}>
        <boxGeometry args={[0.02, 1.38, 0.01]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>

      {/* Screen */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[2.6, 1.2, 0.01]} />
        <meshBasicMaterial color="#0a0a28" transparent opacity={0.9} />
      </mesh>

      {/* Active agent dots */}
      {Array.from({ length: activeAgents }).map((_, i) => (
        <mesh key={i} position={[-0.9 + i * 0.22, 0.15, 0.03]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      ))}
    </group>
  );
}
