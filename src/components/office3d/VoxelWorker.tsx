import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useWorkerAI } from './useWorkerAI';
import type { WaypointId } from './waypoints';
import type { Agent } from '../../types';

// Waypoints where the worker is seated (chair or sofa)
const SEATED_WAYPOINTS = new Set([
  'desk_lawyer', 'desk_finance', 'desk_marketing', 'desk_research',
  'desk_business', 'desk_sales', 'desk_realestate', 'desk_personal',
  'table_seat_s', 'table_seat_w', 'table_seat_e',
  'lounge_seat_a', 'lounge_seat_b',
]);

// ─────────────────────────────────────────────────────────────────────────────
// VoxelWorker — animated voxel character.
// Features:
//   • Desk typing animation when seated at own desk
//   • Neutral relaxed pose at meeting table / lounge sofa
//   • Coffee drinking animation at coffee_corner (arm raises + cup appears)
//   • Status halo ring + hover lift
// ─────────────────────────────────────────────────────────────────────────────

const SKIN: Record<string, string> = {
  'lawyer-georgia':     '#d4a574',
  'finance':            '#c8956c',
  'marketing':          '#e8b99a',
  'researcher':         '#f0ccaa',
  'sales':              '#c09060',
  'realestate':         '#daa870',
  'business-assistant': '#e8b888',
  'personal-assistant': '#f4cc9e',
  'receptionist':       '#e8b090',
  // ── New agents ────────────────────────────────────────────────────────────
  'hr':           '#e0b896',
  'it-manager':   '#f0d0b0',
  'copywriter':   '#d4a07a',
  'pr-manager':   '#f2cca8',
  'accountant':   '#c8906a',
  'coach':        '#b87848',
  'developer':    '#e8c898',
  'operations':   '#d09070',
};

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  busy:   '#f59e0b',
  idle:   '#64748b',
};

// ── Per-agent appearance ──────────────────────────────────────────────────────

const HAIR_COLOR: Record<string, string> = {
  'lawyer-georgia':     '#1a0808',
  'finance':            '#3d2000',
  'marketing':          '#7a3514',
  'researcher':         '#a8a8a8',
  'sales':              '#1e0e06',
  'realestate':         '#6a4e10',
  'business-assistant': '#0e0e0e',
  'personal-assistant': '#5a2808',
  'receptionist':       '#080818',
  // ── New agents ────────────────────────────────────────────────────────────
  'hr':           '#2a1508',
  'it-manager':   '#0e0e18',
  'copywriter':   '#8b3010',
  'pr-manager':   '#c8a020',
  'accountant':   '#1a0c06',
  'coach':        '#0a0808',
  'developer':    '#1a1218',
  'operations':   '#3a3040',
};

const LONG_HAIR   = new Set(['lawyer-georgia', 'marketing', 'personal-assistant', 'receptionist', 'pr-manager', 'copywriter']);
const HAS_GLASSES = new Set(['researcher', 'finance', 'accountant', 'coach']);
const HAS_TIE     = new Set(['lawyer-georgia', 'business-assistant', 'accountant', 'operations']);
const HAS_HEADSET = new Set(['receptionist', 'personal-assistant']);

interface VoxelWorkerProps {
  agent:       Agent;
  homeDeskId?: WaypointId;  // slot-assigned desk (overrides AGENT_DESK lookup)
  wanders?:    boolean;
  sitMin?:     number;
  sitMax?:     number;
  onClick?:    () => void;
}

export function VoxelWorker({ agent, homeDeskId, wanders = false, sitMin, sitMax, onClick }: VoxelWorkerProps) {
  const { motionState, tick, posRef, rotRef, currentWaypointRef } = useWorkerAI({
    agentId: agent.id,
    homeDeskId,
    wanders,
    sitMinSec: sitMin,
    sitMaxSec: sitMax,
  });

  const groupRef    = useRef<THREE.Group>(null);
  const bodyRef     = useRef<THREE.Group>(null);
  const leftLegRef  = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef  = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const glowRef     = useRef<THREE.Mesh>(null);
  const statusRef   = useRef<THREE.Mesh>(null);
  const cupRef      = useRef<THREE.Mesh>(null);  // coffee cup mesh

  // Hover state — refs to avoid re-renders
  const hoveredRef  = useRef(false);
  const hoverYRef   = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  // Sitting pose progress: 0 = standing, 1 = fully seated
  const sittingProgressRef = useRef(1); // start seated

  // Stagger phase per worker
  const phase = useRef(Math.random() * Math.PI * 2);

  const statusColor = STATUS_COLOR[agent.status] ?? '#64748b';

  useFrame((_, delta) => {
    tick(delta);

    const t   = (performance.now() / 1000) + phase.current;
    const isW = motionState === 'walking';
    const wp  = currentWaypointRef.current;

    // ── Seated check ─────────────────────────────────────────────────────────
    const inChair = !isW && SEATED_WAYPOINTS.has(wp ?? '');

    const spTarget = inChair ? 1 : 0;
    sittingProgressRef.current = lerp(sittingProgressRef.current, spTarget, 2.2 * delta);
    const sp = sittingProgressRef.current;

    // Sitting offsets.
    // Negative seatLegX → legs swing toward LOCAL +Z (FORWARD under the desk / sofa).
    // Positive would swing them backward — that was the original bug.
    // -0.75 ≈ 43°: feet rest near floor for desk chairs.
    // -0.82 ≈ 47°: slightly more reclined for sofas.
    const onSofa    = wp === 'lounge_seat_a' || wp === 'lounge_seat_b';
    const seatBodyY = sp * (onSofa ? -0.16 : -0.24);
    const seatLegX  = sp * (onSofa ? -0.82 : -0.75);

    // ── Hover lift ────────────────────────────────────────────────────────────
    const targetY = hoveredRef.current ? 0.18 : 0;
    hoverYRef.current = lerp(hoverYRef.current, targetY, 8 * delta);

    if (groupRef.current) {
      groupRef.current.position.copy(posRef.current);
      groupRef.current.position.y = posRef.current.y + hoverYRef.current;
      groupRef.current.rotation.y = rotRef.current;
    }

    const ease = 6 * delta;

    if (isW) {
      // ── Walking ───────────────────────────────────────────────────────────
      const freq = 6;
      if (leftLegRef.current)  leftLegRef.current.rotation.x  =  Math.sin(t * freq) * 0.45;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * freq) * 0.45;
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = -Math.sin(t * freq) * 0.30;
      if (rightArmRef.current) rightArmRef.current.rotation.x =  Math.sin(t * freq) * 0.30;
      if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(t * freq * 2)) * 0.022;
      if (glowRef.current)
        (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(t * 4) * 0.04;
      if (cupRef.current) cupRef.current.visible = false;

    } else {
      // ── Idle / seated ─────────────────────────────────────────────────────

      // Body: breathing on top of sitting offset
      if (bodyRef.current) bodyRef.current.position.y = seatBodyY + Math.sin(t * 1.3) * 0.025;

      // Legs: lerp toward seated / standing
      if (leftLegRef.current)
        leftLegRef.current.rotation.x  = lerp(leftLegRef.current.rotation.x,  seatLegX, ease);
      if (rightLegRef.current)
        rightLegRef.current.rotation.x = lerp(rightLegRef.current.rotation.x, seatLegX, ease);

      // ── Coffee corner: drinking animation ──────────────────────────────────
      const atCoffee = wp === 'coffee_corner';

      if (atCoffee) {
        // Right arm raises to face in a slow ~7s cycle
        const drinkSin = Math.sin(t * 0.85 + phase.current);
        const armTarget = drinkSin > 0 ? -drinkSin * 2.25 : 0;  // only raise, never backward
        if (rightArmRef.current)
          rightArmRef.current.rotation.x = lerp(rightArmRef.current.rotation.x, armTarget, 2.5 * delta);
        if (leftArmRef.current)
          leftArmRef.current.rotation.x  = lerp(leftArmRef.current.rotation.x, 0, ease);
        if (cupRef.current) cupRef.current.visible = true;

      } else {
        // ── Regular arm animation (typing at desk / neutral elsewhere) ────
        if (cupRef.current) cupRef.current.visible = false;

        // Typing only when seated AT OWN DESK (not table seat / lounge / coffee)
        const atDesk = inChair
          && !wp?.startsWith('table_seat')
          && !wp?.startsWith('lounge_seat');
        const typingBase  = atDesk ? -0.22 : 0;
        const typingAmp   = atDesk ? 0.09  : 0;
        const typingSpeed = 4.8 + (phase.current % 1.0);
        const leftTarget  = typingBase + Math.sin(t * typingSpeed) * typingAmp;
        const rightTarget = typingBase + Math.sin(t * typingSpeed + 1.1) * typingAmp;
        if (leftArmRef.current)
          leftArmRef.current.rotation.x  = lerp(leftArmRef.current.rotation.x,  leftTarget,  ease);
        if (rightArmRef.current)
          rightArmRef.current.rotation.x = lerp(rightArmRef.current.rotation.x, rightTarget, ease);
      }

      if (glowRef.current)
        (glowRef.current.material as THREE.MeshBasicMaterial).opacity = hoveredRef.current ? 0.22 : 0.09;
    }

    // Status ring — pulse when active, scale on hover
    if (statusRef.current) {
      const baseScale = agent.status === 'active'
        ? 0.92 + Math.sin(t * 2.2) * 0.08
        : 1.0;
      const hoverScale = hoveredRef.current ? 1.25 : 1.0;
      const s = lerp(statusRef.current.scale.x, baseScale * hoverScale, 6 * delta);
      statusRef.current.scale.set(s, s, 1);
      (statusRef.current.material as THREE.MeshBasicMaterial).opacity =
        hoveredRef.current ? 0.95 : (agent.status === 'idle' ? 0.4 : 0.75);
    }
  });

  const accent     = agent.accentColor;
  const skin       = SKIN[agent.id] ?? '#d4a574';
  const isW        = motionState === 'walking';
  const hairColor  = HAIR_COLOR[agent.id]  ?? '#1a1010';
  const longHair   = LONG_HAIR.has(agent.id);
  const hasGlasses = HAS_GLASSES.has(agent.id);
  const hasTie     = HAS_TIE.has(agent.id);
  const hasHeadset = HAS_HEADSET.has(agent.id);

  return (
    <group ref={groupRef}>

      {/* Clickable hit area */}
      <mesh
        position={[0, 0.9, 0]}
        onClick={onClick}
        onPointerEnter={() => {
          document.body.style.cursor = 'pointer';
          hoveredRef.current = true;
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default';
          hoveredRef.current = false;
          setIsHovered(false);
        }}
      >
        <boxGeometry args={[0.7, 1.8, 0.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── Status ring ── */}
      <mesh ref={statusRef} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.40, 0.035, 6, 28]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.75} />
      </mesh>

      {/* ── Hover ring ── */}
      {isHovered && (
        <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.025, 6, 28]} />
          <meshBasicMaterial color={accent} transparent opacity={0.45} />
        </mesh>
      )}

      <group ref={bodyRef}>

        {/* ── Head ── */}
        <mesh position={[0, 1.55, 0]} castShadow>
          <boxGeometry args={[0.40, 0.40, 0.40]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Face screen */}
        <mesh position={[0, 1.60, 0.205]}>
          <boxGeometry args={[0.22, 0.15, 0.01]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={isW ? 0.9 : (isHovered ? 1.2 : 0.5)}
            roughness={0.1}
          />
        </mesh>

        {/* ── Hair (top) ── */}
        <mesh position={[0, 1.772, 0]}>
          <boxGeometry args={[0.40, 0.055, 0.40]} />
          <meshStandardMaterial color={hairColor} roughness={0.85} />
        </mesh>
        {/* Hair (back panel — long-hair agents) */}
        {longHair && (
          <mesh position={[0, 1.608, -0.218]}>
            <boxGeometry args={[0.38, 0.30, 0.060]} />
            <meshStandardMaterial color={hairColor} roughness={0.85} />
          </mesh>
        )}

        {/* ── Eyes ── */}
        <mesh position={[-0.058, 1.628, 0.213]}>
          <boxGeometry args={[0.038, 0.028, 0.002]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.058, 1.628, 0.213]}>
          <boxGeometry args={[0.038, 0.028, 0.002]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
        {/* Mouth */}
        <mesh position={[0, 1.567, 0.213]}>
          <boxGeometry args={[0.068, 0.012, 0.002]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.42} />
        </mesh>

        {/* ── Glasses (researcher, finance) ── */}
        {hasGlasses && (
          <>
            <mesh position={[-0.063, 1.627, 0.216]}>
              <boxGeometry args={[0.056, 0.040, 0.004]} />
              <meshBasicMaterial color={accent} transparent opacity={0.42} />
            </mesh>
            <mesh position={[0.063, 1.627, 0.216]}>
              <boxGeometry args={[0.056, 0.040, 0.004]} />
              <meshBasicMaterial color={accent} transparent opacity={0.42} />
            </mesh>
            {/* Bridge */}
            <mesh position={[0, 1.627, 0.216]}>
              <boxGeometry args={[0.022, 0.007, 0.003]} />
              <meshBasicMaterial color={accent} transparent opacity={0.65} />
            </mesh>
          </>
        )}

        {/* ── Headset (receptionist, personal-assistant) ── */}
        {hasHeadset && (
          <>
            {/* Left ear cup */}
            <mesh position={[-0.224, 1.55, 0]}>
              <boxGeometry args={[0.050, 0.065, 0.038]} />
              <meshStandardMaterial color="#202042" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Right ear cup */}
            <mesh position={[0.224, 1.55, 0]}>
              <boxGeometry args={[0.050, 0.065, 0.038]} />
              <meshStandardMaterial color="#202042" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Headband */}
            <mesh position={[0, 1.766, 0]}>
              <boxGeometry args={[0.42, 0.032, 0.032]} />
              <meshStandardMaterial color="#202042" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Mic boom */}
            <mesh position={[-0.23, 1.516, 0.074]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.010, 0.078, 0.010]} />
              <meshStandardMaterial color="#101028" roughness={0.3} metalness={0.9} />
            </mesh>
            {/* Mic tip glow */}
            <mesh position={[-0.23, 1.500, 0.124]}>
              <sphereGeometry args={[0.016, 6, 6]} />
              <meshBasicMaterial color={accent} transparent opacity={0.9} />
            </mesh>
          </>
        )}

        {/* ── Torso ── */}
        <mesh position={[0, 1.00, 0]} castShadow>
          <boxGeometry args={[0.42, 0.55, 0.30]} />
          <meshStandardMaterial color={accent} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Chest stripe */}
        <mesh position={[0, 1.00, 0.155]}>
          <boxGeometry args={[0.26, 0.08, 0.01]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
        </mesh>

        {/* ── Tie (lawyer-georgia, business-assistant) ── */}
        {hasTie && (
          <>
            {/* Knot */}
            <mesh position={[0, 1.105, 0.157]}>
              <boxGeometry args={[0.055, 0.052, 0.007]} />
              <meshStandardMaterial color="#e8e8f4" roughness={0.3} />
            </mesh>
            {/* Blade */}
            <mesh position={[0, 0.940, 0.157]}>
              <boxGeometry args={[0.046, 0.210, 0.007]} />
              <meshStandardMaterial color="#e8e8f4" roughness={0.3} />
            </mesh>
          </>
        )}

        {/* ── Left arm ── */}
        <group ref={leftArmRef} position={[-0.33, 1.20, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.45, 0.18]} />
            <meshStandardMaterial color={accent} roughness={0.6} metalness={0.1} />
          </mesh>
        </group>

        {/* ── Right arm + coffee cup ── */}
        <group ref={rightArmRef} position={[0.33, 1.20, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <boxGeometry args={[0.18, 0.45, 0.18]} />
            <meshStandardMaterial color={accent} roughness={0.6} metalness={0.1} />
          </mesh>

          {/* Coffee cup — appears at coffee_corner, follows hand */}
          <mesh ref={cupRef} position={[0, -0.46, 0.10]} visible={false}>
            {/* Cup body */}
            <cylinderGeometry args={[0.038, 0.032, 0.065, 10]} />
            <meshStandardMaterial color="#e8d8c0" roughness={0.6} metalness={0.1} />
          </mesh>
          {/* Cup rim glow (accent ring) — also hidden via parent's visible flag */}
          {/* Note: we animate visibility on cupRef mesh only; the group remains */}
        </group>

        {/* ── Left leg ── */}
        <group ref={leftLegRef} position={[-0.13, 0.70, 0]}>
          <mesh position={[0, -0.33, 0]} castShadow>
            <boxGeometry args={[0.20, 0.50, 0.20]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.61, 0.05]}>
            <boxGeometry args={[0.20, 0.09, 0.28]} />
            <meshStandardMaterial color="#111120" roughness={0.9} />
          </mesh>
        </group>

        {/* ── Right leg ── */}
        <group ref={rightLegRef} position={[0.13, 0.70, 0]}>
          <mesh position={[0, -0.33, 0]} castShadow>
            <boxGeometry args={[0.20, 0.50, 0.20]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.61, 0.05]}>
            <boxGeometry args={[0.20, 0.09, 0.28]} />
            <meshStandardMaterial color="#111120" roughness={0.9} />
          </mesh>
        </group>

      </group>

      {/* ── Ground shadow glow ── */}
      <mesh ref={glowRef} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color={accent} transparent opacity={0.09} />
      </mesh>

      {/* ── Floating label ── */}
      <Html position={[0, 2.25, 0]} center distanceFactor={10} occlude={false}>
        <div
          onClick={onClick}
          style={{
            background: isHovered ? 'rgba(4,4,26,0.96)' : 'rgba(4,4,18,0.88)',
            border: `1px solid ${accent}${isHovered ? '90' : '50'}`,
            borderRadius: 8,
            padding: '4px 10px',
            backdropFilter: 'blur(10px)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            userSelect: 'none',
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
            boxShadow: isHovered ? `0 0 12px ${accent}40` : 'none',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: 'system-ui, sans-serif', lineHeight: 1.35 }}>
            {agent.avatar} {agent.name}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(160,160,200,0.75)', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
            {isW ? '🚶 в движении' : agent.title}
          </div>
        </div>
      </Html>

    </group>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1);
}
