import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Decorations — all decorative elements:
//   ZoneCarpets      — glowing floor carpets under all 8 desks
//   BackWallDashboard— animated data display + Georgia time clock
//   CornerPlants     — plants in corners
//   PartitionPanels  — glass dividers
//   CoffeeCorner     — coffee area
// ─────────────────────────────────────────────────────────────────────────────

// All 8 zones metadata
export const ZONE_META = [
  { id: 'lawyer-georgia',     pos: [-5,    0, -5] as [number,number,number], color: '#f59e0b', label: 'ЮРИСТ' },
  { id: 'finance',            pos: [ 5,    0, -5] as [number,number,number], color: '#10b981', label: 'ФИНАНСЫ' },
  { id: 'marketing',          pos: [-5,    0,  2] as [number,number,number], color: '#ec4899', label: 'МАРКЕТИНГ' },
  { id: 'researcher',         pos: [ 5,    0,  2] as [number,number,number], color: '#8b5cf6', label: 'АНАЛИТИК' },
  { id: 'business-assistant', pos: [-8.5,  0, -5] as [number,number,number], color: '#3b82f6', label: 'БИЗНЕС' },
  { id: 'sales',              pos: [ 8.5,  0, -5] as [number,number,number], color: '#f97316', label: 'ПРОДАЖИ' },
  { id: 'realestate',         pos: [-8.5,  0,  2] as [number,number,number], color: '#0ea5e9', label: 'НЕДВИЖИМ.' },
  { id: 'personal-assistant', pos: [ 8.5,  0,  2] as [number,number,number], color: '#6366f1', label: 'АССИСТЕНТ' },
];

export function Decorations() {
  return (
    <>
      <ZoneCarpets />
      <OfficeLogoSign />
      <BackWallDashboard />
      <HoloMeetingTable />
      <CornerPlants />
      <PartitionPanels />
      <CoffeeCorner />

      {/* ── Server racks — back wall corners ── */}
      <ServerRack position={[-9.2, 0, -8.15]} />
      <ServerRack position={[ 9.2, 0, -8.15]} />

      {/* ── Filing shelves — along side walls ── */}
      <FilingShelf position={[-10.55, 0, -5.5]} rotY={ Math.PI / 2} seed={1} />
      <FilingShelf position={[-10.55, 0,  0.2]} rotY={ Math.PI / 2} seed={2} />
      <FilingShelf position={[ 10.55, 0, -5.5]} rotY={-Math.PI / 2} seed={3} />
      <FilingShelf position={[ 10.55, 0,  0.2]} rotY={-Math.PI / 2} seed={4} />

      {/* ── Reception area — right wall ── */}
      <ReceptionArea />

      {/* ── Ceiling LED strip lights ── */}
      <CeilingLights />

      {/* ── Lounge zone — left side near entrance ── */}
      <LoungeArea />

      {/* ── Security cameras ── */}
      <SecurityCamera position={[-10.5, 8.3, -8.0]} rotY={ Math.PI / 4}  />
      <SecurityCamera position={[ 10.5, 8.3, -8.0]} rotY={-Math.PI / 4}  />
      <SecurityCamera position={[-10.5, 8.3,  3.5]} rotY={ Math.PI / 2}  />
      <SecurityCamera position={[ 10.5, 8.3,  3.5]} rotY={-Math.PI / 2}  />
      <SecurityCamera position={[-5,    8.3,  8.8]} rotY={ Math.PI * 0.9} />
      <SecurityCamera position={[ 5,    8.3,  8.8]} rotY={-Math.PI * 0.9} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZONE CARPETS
// ─────────────────────────────────────────────────────────────────────────────

function ZoneCarpets() {
  return (
    <>
      {ZONE_META.map(({ id, pos, color }) => (
        <group key={id} position={[pos[0], 0, pos[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
            <planeGeometry args={[3.0, 2.6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.12}
              transparent
              opacity={0.25}
              roughness={0.9}
            />
          </mesh>
          {([
            { p: [0,  0.006, -1.32] as [number,number,number], r: 0,           w: 3.0 },
            { p: [0,  0.006,  1.32] as [number,number,number], r: 0,           w: 3.0 },
            { p: [-1.52, 0.006, 0]  as [number,number,number], r: Math.PI / 2, w: 2.6 },
            { p: [ 1.52, 0.006, 0]  as [number,number,number], r: Math.PI / 2, w: 2.6 },
          ]).map((strip, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, strip.r, 0]} position={strip.p}>
              <planeGeometry args={[strip.w, 0.06]} />
              <meshBasicMaterial color={color} transparent opacity={0.65} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BACK WALL DASHBOARD (with Georgia time)
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedBars({ count = 16 }: { count?: number }) {
  const ref    = useRef<THREE.InstancedMesh>(null);
  const dummy  = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(
    () => Array.from({ length: count }, (_, i) => i * 0.45 + Math.random() * 0.3),
    [count],
  );

  useEffect(() => {
    if (!ref.current) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.setHSL(0.55 + (i / count) * 0.20, 0.85, 0.60);
      ref.current.setColorAt(i, color);
    }
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t     = clock.getElapsedTime();
    const total = (count - 1) * 0.38;
    for (let i = 0; i < count; i++) {
      const h = 0.12 + Math.abs(Math.sin(t * 0.75 + phases[i])) * 0.85;
      dummy.position.set(-total / 2 + i * 0.38, h / 2 - 0.50, 0);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.28, 1, 0.015]} />
      <meshBasicMaterial vertexColors transparent opacity={0.90} />
    </instancedMesh>
  );
}

// Georgia time hook — updates every second
function useGeorgiaTime() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tbilisi = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tbilisi' }));
      const hh = String(tbilisi.getHours()).padStart(2, '0');
      const mm = String(tbilisi.getMinutes()).padStart(2, '0');
      const ss = String(tbilisi.getSeconds()).padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}`);
      const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
      const d = days[tbilisi.getDay()];
      const day = String(tbilisi.getDate()).padStart(2, '0');
      const mo  = String(tbilisi.getMonth() + 1).padStart(2, '0');
      setDate(`${d} ${day}.${mo}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return { time, date };
}

function BackWallDashboard() {
  const scanRef  = useRef<THREE.Mesh>(null);
  const glowRef  = useRef<THREE.Mesh>(null);
  const { time, date } = useGeorgiaTime();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Scan line sweeps full height
    if (scanRef.current) {
      scanRef.current.position.y = -1.3 + ((t * 0.5) % 2.6);
      (scanRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.18 + Math.sin(t * 3) * 0.08;
    }
    // Ambient glow pulses with clock
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.06 + Math.sin(t * 0.5) * 0.03;
    }
  });

  return (
    <group position={[0, 5.8, -8.2]}>

      {/* ── Frame ── */}
      <mesh>
        <boxGeometry args={[7.2, 3.0, 0.10]} />
        <meshStandardMaterial color="#111128" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Neon frame border — 4 edges */}
      {([
        { p: [0,  1.52, 0.06] as [number,number,number], s: [7.18, 0.04, 0.01] as [number,number,number] },
        { p: [0, -1.52, 0.06] as [number,number,number], s: [7.18, 0.04, 0.01] as [number,number,number] },
        { p: [-3.61, 0, 0.06] as [number,number,number], s: [0.04, 3.0,  0.01] as [number,number,number] },
        { p: [ 3.61, 0, 0.06] as [number,number,number], s: [0.04, 3.0,  0.01] as [number,number,number] },
      ] as Array<{ p: [number,number,number]; s: [number,number,number] }>).map((b, i) => (
        <mesh key={i} position={b.p}>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={3.0} />
        </mesh>
      ))}

      {/* ── Screen background ── */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[6.9, 2.7, 0.01]} />
        <meshBasicMaterial color="#02020e" />
      </mesh>

      {/* Subtle indigo glow wash */}
      <mesh ref={glowRef} position={[0, 0, 0.062]}>
        <boxGeometry args={[6.9, 2.7, 0.001]} />
        <meshBasicMaterial color="#4040c0" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/* ── Subtle background bars (decorative, low opacity) ── */}
      <group position={[0, -0.5, 0.065]}>
        <AnimatedBars count={18} />
      </group>

      {/* ── Horizontal divider lines ── */}
      <mesh position={[0,  0.72, 0.07]}>
        <boxGeometry args={[6.6, 0.008, 0.002]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, -0.72, 0.07]}>
        <boxGeometry args={[6.6, 0.008, 0.002]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.35} />
      </mesh>

      {/* Vertical dividers separating sections */}
      <mesh position={[-2.1, 0, 0.07]}>
        <boxGeometry args={[0.006, 2.6, 0.002]} />
        <meshBasicMaterial color="#4040aa" transparent opacity={0.5} />
      </mesh>
      <mesh position={[2.1, 0, 0.07]}>
        <boxGeometry args={[0.006, 2.6, 0.002]} />
        <meshBasicMaterial color="#4040aa" transparent opacity={0.5} />
      </mesh>

      {/* ── MAIN CLOCK — center, full height ── */}
      <Html
        position={[0, 0.05, 0.12]}
        center
        distanceFactor={4.8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          textAlign: 'center',
          fontFamily: '"Courier New", "Lucida Console", monospace',
          width: 340,
        }}>
          {/* Header */}
          <div style={{
            fontSize: 11,
            color: '#6366f1',
            letterSpacing: '0.30em',
            textTransform: 'uppercase',
            marginBottom: 6,
            opacity: 0.9,
          }}>
            🇬🇪 &nbsp; ТБИЛИСИ &nbsp; · &nbsp; UTC +4
          </div>

          {/* Main time */}
          <div style={{
            fontSize: 88,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.08em',
            lineHeight: 1,
            textShadow: '0 0 24px #818cf8, 0 0 48px #6366f180',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {time}
          </div>

          {/* Date row */}
          <div style={{
            fontSize: 14,
            color: '#a5b4fc',
            letterSpacing: '0.22em',
            marginTop: 8,
            textShadow: '0 0 8px #818cf860',
          }}>
            {date}
          </div>
        </div>
      </Html>

      {/* ── LEFT PANEL — status ── */}
      <Html
        position={[-2.85, 0.05, 0.10]}
        center
        distanceFactor={4.8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          textAlign: 'center',
          fontFamily: 'monospace',
          width: 130,
        }}>
          <div style={{ fontSize: 8, color: '#6366f1', letterSpacing: '0.2em', marginBottom: 10 }}>СИСТЕМА</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#a5b4fc', textShadow: '0 0 10px #6366f1' }}>AI</div>
          <div style={{ fontSize: 9, color: '#10b981', letterSpacing: '0.15em', marginTop: 4 }}>● ONLINE</div>
          <div style={{ fontSize: 7, color: 'rgba(160,160,200,0.55)', marginTop: 6, letterSpacing: '0.1em' }}>8 АГЕНТОВ</div>
        </div>
      </Html>

      {/* ── RIGHT PANEL — metrics ── */}
      <Html
        position={[2.85, 0.05, 0.10]}
        center
        distanceFactor={4.8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          textAlign: 'center',
          fontFamily: 'monospace',
          width: 130,
        }}>
          <div style={{ fontSize: 8, color: '#6366f1', letterSpacing: '0.2em', marginBottom: 8 }}>МЕТРИКИ</div>
          {[
            { label: 'ЗАДАЧИ',  value: '247', color: '#10b981' },
            { label: 'АПТАЙМ',  value: '99%', color: '#f59e0b' },
            { label: 'СЕССИЙ',  value: '1.2K', color: '#818cf8' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color, textShadow: `0 0 8px ${color}80` }}>{value}</div>
              <div style={{ fontSize: 7, color: 'rgba(160,160,200,0.6)', letterSpacing: '0.12em' }}>{label}</div>
            </div>
          ))}
        </div>
      </Html>

      {/* ── Scan line ── */}
      <mesh ref={scanRef} position={[0, 0, 0.14]}>
        <boxGeometry args={[6.8, 0.04, 0.001]} />
        <meshBasicMaterial color="#a5b4fc" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      {/* Glow light cast into room */}
      <pointLight position={[0, -1.6, 0.6]} color="#6366f1" intensity={10} distance={7} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OFFICE LOGO SIGN — neon "AI OFFICE" above the dashboard
// ─────────────────────────────────────────────────────────────────────────────

function OfficeLogoSign() {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const t = clock.getElapsedTime();
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        3.5 + Math.sin(t * 0.8) * 0.5;
    }
  });

  return (
    // Positioned above the dashboard (dashboard is at y=5.8, height 3.0 → top at y=7.3)
    <group position={[0, 8.05, -8.12]}>
      {/* Sign backing plate */}
      <mesh>
        <boxGeometry args={[8.4, 0.72, 0.07]} />
        <meshStandardMaterial color="#060614" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Top neon strip */}
      <mesh ref={glowRef} position={[0, 0.375, 0.038]}>
        <boxGeometry args={[8.36, 0.028, 0.01]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={3.5} />
      </mesh>
      {/* Bottom neon strip */}
      <mesh position={[0, -0.375, 0.038]}>
        <boxGeometry args={[8.36, 0.028, 0.01]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={3.5} />
      </mesh>
      {/* Left cap */}
      <mesh position={[-4.21, 0, 0.038]}>
        <boxGeometry args={[0.028, 0.72, 0.01]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={3.5} />
      </mesh>
      {/* Right cap */}
      <mesh position={[4.21, 0, 0.038]}>
        <boxGeometry args={[0.028, 0.72, 0.01]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={3.5} />
      </mesh>

      {/* HTML text — full-width logo */}
      <Html center distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: '"Courier New", "Lucida Console", monospace',
          fontWeight: 900,
          fontSize: 38,
          letterSpacing: '0.45em',
          color: '#ffffff',
          textShadow: '0 0 18px #818cf8, 0 0 36px #6366f180, 0 0 60px #4040ff40',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          paddingRight: '0.45em', /* compensate letter-spacing on last char */
        }}>
          ◈ &nbsp;AI OFFICE&nbsp; ◈
        </div>
      </Html>

      {/* Downward light wash */}
      <pointLight position={[0, -0.5, 0.3]} color="#818cf8" intensity={6} distance={6} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HOLOGRAPHIC MEETING TABLE — lounge area centre
// ─────────────────────────────────────────────────────────────────────────────

function HoloMeetingTable() {
  const ring1Ref  = useRef<THREE.Mesh>(null);
  const ring2Ref  = useRef<THREE.Mesh>(null);
  const ring3Ref  = useRef<THREE.Mesh>(null);
  const coreRef   = useRef<THREE.Mesh>(null);
  const beamRef   = useRef<THREE.Mesh>(null);
  const discRef   = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) ring1Ref.current.rotation.y  =  t * 0.70;
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.50;
      ring2Ref.current.rotation.x =  t * 0.25;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z =  t * 0.35;
      ring3Ref.current.rotation.y =  t * 0.18;
    }
    if (coreRef.current) {
      const s = 0.88 + Math.sin(t * 2.0) * 0.12;
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(t * 1.4) * 0.15;
    }
    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.04 + Math.abs(Math.sin(t * 0.6)) * 0.04;
    }
    if (discRef.current) {
      (discRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.10 + Math.sin(t * 1.8) * 0.05;
      const ds = 0.92 + Math.sin(t * 1.2) * 0.08;
      discRef.current.scale.set(ds, ds, 1);
    }
  });

  return (
    <group position={[0, 0, 5.8]}>

      {/* ── Table surface ── */}
      <mesh position={[0, 0.74, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.065, 48]} />
        <meshStandardMaterial color="#0e0e28" roughness={0.08} metalness={0.95} />
      </mesh>

      {/* Glowing edge ring */}
      <mesh position={[0, 0.773, 0]}>
        <torusGeometry args={[1.5, 0.022, 8, 80]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={3.2} />
      </mesh>

      {/* Glass top surface */}
      <mesh position={[0, 0.774, 0]}>
        <cylinderGeometry args={[1.48, 1.48, 0.008, 48]} />
        <meshStandardMaterial color="#3030aa" transparent opacity={0.22} metalness={0.95} roughness={0.05} />
      </mesh>

      {/* Central column */}
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.058, 0.072, 0.74, 12]} />
        <meshStandardMaterial color="#1e1e42" metalness={0.92} roughness={0.15} />
      </mesh>

      {/* Star base — 4 arms */}
      {[0, 90, 180, 270].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <mesh key={i} position={[Math.sin(rad) * 0.52, 0.04, Math.cos(rad) * 0.52]} rotation={[0, -rad, 0]}>
            <boxGeometry args={[0.09, 0.045, 1.04]} />
            <meshStandardMaterial color="#1e1e42" metalness={0.92} roughness={0.2} />
          </mesh>
        );
      })}

      {/* Chairs — 6 seats evenly spaced */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const cx  = Math.sin(rad) * 2.0;
        const cz  = Math.cos(rad) * 2.0;
        return (
          <group key={i} position={[cx, 0, cz]} rotation={[0, Math.PI - rad, 0]}>
            {/* Seat */}
            <mesh position={[0, 0.46, 0]}>
              <boxGeometry args={[0.55, 0.07, 0.52]} />
              <meshStandardMaterial color="#1a1a36" roughness={0.7} metalness={0.3} />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0.76, 0.25]}>
              <boxGeometry args={[0.53, 0.55, 0.07]} />
              <meshStandardMaterial color="#1a1a36" roughness={0.65} metalness={0.3} />
            </mesh>
            {/* Neon accent strip on chair back */}
            <mesh position={[0, 0.76, 0.213]}>
              <boxGeometry args={[0.40, 0.035, 0.008]} />
              <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2.0} />
            </mesh>
            {/* Chair pole */}
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.44, 6]} />
              <meshStandardMaterial color="#181830" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* ── Hologram above table ── */}
      <group position={[0, 2.05, 0]}>

        {/* Core orb */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.30, 20, 20]} />
          <meshBasicMaterial color="#a5b4fc" transparent opacity={0.55} />
        </mesh>

        {/* Ring 1 — equatorial */}
        <mesh ref={ring1Ref}>
          <torusGeometry args={[0.58, 0.024, 8, 64]} />
          <meshBasicMaterial color="#6366f1" />
        </mesh>

        {/* Ring 2 — tilted 60° */}
        <group rotation={[Math.PI / 3, 0, 0]}>
          <mesh ref={ring2Ref}>
            <torusGeometry args={[0.46, 0.018, 8, 52]} />
            <meshBasicMaterial color="#818cf8" />
          </mesh>
        </group>

        {/* Ring 3 — tilted 120° + roll */}
        <group rotation={[Math.PI * 2 / 3, Math.PI / 5, 0]}>
          <mesh ref={ring3Ref}>
            <torusGeometry args={[0.36, 0.014, 8, 44]} />
            <meshBasicMaterial color="#a78bfa" />
          </mesh>
        </group>

        {/* Projection beam (cone) */}
        <mesh ref={beamRef} position={[0, -1.15, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[1.48, 2.3, 40, 1, true]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>

        {/* Hologram base disc on table surface */}
        <mesh ref={discRef} position={[0, -1.275, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.48, 48]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.10} depthWrite={false} />
        </mesh>

        {/* Inner disc rings (static decorative) */}
        {[0.45, 0.85, 1.20].map((r, i) => (
          <mesh key={i} position={[0, -1.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.008, 6, 40]} />
            <meshBasicMaterial color="#818cf8" transparent opacity={0.20 - i * 0.05} />
          </mesh>
        ))}

        {/* Vertical stem */}
        <mesh position={[0, -1.03, 0]}>
          <cylinderGeometry args={[0.010, 0.010, 1.3, 6]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.55} />
        </mesh>

        {/* Hologram light source */}
        <pointLight color="#8080ff" intensity={8} distance={6} decay={2} />
      </group>

      {/* Floor glow under table */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 48]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.07} depthWrite={false} />
      </mesh>

    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CORNER PLANTS
// ─────────────────────────────────────────────────────────────────────────────

function VoxelPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.19, 0.44, 8]} />
        <meshStandardMaterial color="#7c3d12" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.04, 8]} />
        <meshStandardMaterial color="#3d2002" roughness={1.0} />
      </mesh>
      <mesh position={[0, 0.80, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.72, 6]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.8} />
      </mesh>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const h   = 0.48 + (i % 3) * 0.22;
        return (
          <mesh
            key={i}
            position={[Math.sin(rad) * 0.32, 0.50 + h * 0.35, Math.cos(rad) * 0.32]}
            rotation={[0.4, rad, 0.65]}
            castShadow
          >
            <boxGeometry args={[0.50, 0.07, 0.22]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#2d7a2e' : '#1d6020'} roughness={0.8} />
          </mesh>
        );
      })}
      <pointLight position={[0, 0.8, 0]} color="#22c55e" intensity={1.5} distance={2.5} decay={2} />
    </group>
  );
}

function CornerPlants() {
  // Moved to x=±10 to avoid overlap with new x=±8.5 zones
  const positions: [number, number, number][] = [
    [-10.0, 0, -7.0],
    [ 10.0, 0, -7.0],
    [-10.0, 0,  5.5],
    [ 10.0, 0,  5.5],
  ];
  return (
    <>
      {positions.map((pos, i) => <VoxelPlant key={i} position={pos} />)}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PARTITION PANELS — glass dividers
// ─────────────────────────────────────────────────────────────────────────────

function PartitionPanels() {
  // Panels between zone columns (separating x≈5 zones from x≈8.5 zones)
  // and short end panels near outer walls
  const panels: Array<{ pos: [number,number,number]; size: [number,number,number]; rotY: number; color?: string }> = [
    // Back row — between x=-5 and x=-8.5 zones
    { pos: [-6.9, 0, -3.8], size: [0.07, 1.7, 2.2], rotY: 0, color: '#6366f1' },
    // Back row — between x=5 and x=8.5 zones
    { pos: [ 6.9, 0, -3.8], size: [0.07, 1.7, 2.2], rotY: 0, color: '#6366f1' },
    // Front row — between x=-5 and x=-8.5 zones
    { pos: [-6.9, 0,  1.0], size: [0.07, 1.7, 2.2], rotY: 0, color: '#06b6d4' },
    // Front row — between x=5 and x=8.5 zones
    { pos: [ 6.9, 0,  1.0], size: [0.07, 1.7, 2.2], rotY: 0, color: '#06b6d4' },
  ];

  return (
    <>
      {panels.map(({ pos, size, rotY, color = '#4060dd' }, i) => (
        <group key={i} position={pos} rotation={[0, rotY, 0]}>
          <mesh position={[0, size[1] / 2, 0]} castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.16}
              metalness={0.9}
              roughness={0.05}
            />
          </mesh>
          <mesh position={[0, size[1] + 0.02, 0]}>
            <boxGeometry args={[size[0] + 0.01, 0.04, size[2]]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
          </mesh>
          <mesh position={[0, 0.025, 0]}>
            <boxGeometry args={[0.12, 0.05, size[2]]} />
            <meshStandardMaterial color="#1e1e40" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. COFFEE CORNER
// ─────────────────────────────────────────────────────────────────────────────

function CoffeeCorner() {
  return (
    <group position={[-7.5, 0, 5.5]}>

      <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.07, 0.75]} />
        <meshStandardMaterial color="#2a2a4a" roughness={0.3} metalness={0.6} />
      </mesh>
      {[[-0.88, -0.32], [0.88, -0.32], [-0.88, 0.32], [0.88, 0.32]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.43, lz]} castShadow>
          <boxGeometry args={[0.07, 0.88, 0.07]} />
          <meshStandardMaterial color="#1a1a36" metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.885, 0.378]}>
        <boxGeometry args={[1.98, 0.025, 0.015]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.0} />
      </mesh>

      <mesh position={[-0.60, 1.20, -0.08]} castShadow>
        <boxGeometry args={[0.50, 0.65, 0.42]} />
        <meshStandardMaterial color="#1e1e38" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.60, 1.32, 0.14]}>
        <boxGeometry args={[0.26, 0.22, 0.01]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>
      {[-0.08, 0, 0.08].map((bx, i) => (
        <mesh key={i} position={[-0.60 + bx, 1.04, 0.22]}>
          <cylinderGeometry args={[0.035, 0.035, 0.025, 10]} />
          <meshStandardMaterial
            color={i === 1 ? '#f59e0b' : '#2a2a50'}
            emissive={i === 1 ? '#f59e0b' : '#000000'}
            emissiveIntensity={i === 1 ? 1.5 : 0}
          />
        </mesh>
      ))}
      <mesh position={[-0.60, 1.00, 0.22]}>
        <cylinderGeometry args={[0.025, 0.02, 0.12, 8]} />
        <meshStandardMaterial color="#303050" metalness={0.9} roughness={0.1} />
      </mesh>

      {[
        { x: 0.30, h: 0.26, c: '#1a1a36' },
        { x: 0.55, h: 0.22, c: '#22223a' },
        { x: 0.78, h: 0.30, c: '#1a1a36' },
      ].map(({ x, h, c }, i) => (
        <group key={i} position={[x, 0.88, 0.0]}>
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.075, 0.065, h, 10]} />
            <meshStandardMaterial color={c} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, h + 0.005, 0]}>
            <torusGeometry args={[0.075, 0.008, 6, 20]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      <group position={[0.85, 0.88, -0.1]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.10, 0.08, 0.28, 8]} />
          <meshStandardMaterial color="#7c3d12" roughness={0.9} />
        </mesh>
        {[0, 90, 180, 270].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <mesh key={i} position={[Math.sin(rad) * 0.14, 0.34, Math.cos(rad) * 0.14]} rotation={[0.4, rad, 0.5]}>
              <boxGeometry args={[0.26, 0.05, 0.12]} />
              <meshStandardMaterial color="#1d6020" roughness={0.8} />
            </mesh>
          );
        })}
      </group>

      <group position={[0, 1.72, -0.36]}>
        <mesh>
          <boxGeometry args={[1.5, 0.38, 0.05]} />
          <meshStandardMaterial color="#0e0e28" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.20, 0.028]}>
          <boxGeometry args={[1.48, 0.025, 0.01]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
        </mesh>
        <mesh position={[0, -0.20, 0.028]}>
          <boxGeometry args={[1.48, 0.025, 0.01]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
        </mesh>
        <Html position={[0, 0, 0.06]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 800, fontSize: 12, color: '#fbbf24', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
            ☕ COFFEE & BREAK
          </div>
        </Html>
      </group>

      <pointLight position={[0, 2.2, 0]} color="#f97316" intensity={6} distance={4} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. SERVER RACK — back wall corners with blinking LEDs
// ─────────────────────────────────────────────────────────────────────────────

function ServerRack({ position, rotY = 0 }: { position: [number,number,number]; rotY?: number }) {
  const ledGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ledGroupRef.current) return;
    ledGroupRef.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const speed = 0.9 + (i * 0.41) % 3.1;
      const v = Math.sin(t * speed + i * 0.97);
      // Distribution: mostly green, some amber, rare red
      if (i % 11 === 6) {
        mat.color.set(v > 0.65 ? '#ef4444' : '#1a0000');
      } else if (i % 7 === 4) {
        mat.color.set(v > 0.20 ? '#f59e0b' : '#1a0a00');
      } else {
        mat.color.set(v > -0.25 ? '#10b981' : '#001508');
      }
    });
  });

  const UNITS = 8;

  return (
    <group position={position} rotation={[0, rotY, 0]}>

      {/* Outer case */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 2.02, 0.52]} />
        <meshStandardMaterial color="#060614" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Front panel */}
      <mesh position={[0, 1.0, 0.255]}>
        <boxGeometry args={[0.60, 1.98, 0.01]} />
        <meshStandardMaterial color="#0a0a22" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Rack unit horizontal rail lines */}
      {Array.from({ length: UNITS + 1 }, (_, i) => (
        <mesh key={i} position={[0, 0.03 + i * 0.245, 0.257]}>
          <boxGeometry args={[0.58, 0.007, 0.003]} />
          <meshBasicMaterial color="#18183a" />
        </mesh>
      ))}

      {/* Drive bays per unit */}
      {Array.from({ length: UNITS }, (_, ui) => (
        <group key={ui} position={[0, 0.15 + ui * 0.245, 0.258]}>
          {([-0.20, -0.07, 0.07, 0.20] as number[]).map((bx, bi) => (
            <mesh key={bi} position={[bx, 0, 0]}>
              <boxGeometry args={[0.085, 0.068, 0.003]} />
              <meshStandardMaterial color="#111130" metalness={0.7} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* LED indicators — right column */}
      <group ref={ledGroupRef} position={[0.24, 0, 0.259]}>
        {Array.from({ length: UNITS * 2 }, (_, i) => (
          <mesh key={i} position={[0, 0.10 + Math.floor(i / 2) * 0.245 + (i % 2) * 0.09, 0]}>
            <sphereGeometry args={[0.011, 5, 5]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        ))}
      </group>

      {/* Top status screen */}
      <mesh position={[0, 1.975, 0.258]}>
        <boxGeometry args={[0.44, 0.13, 0.004]} />
        <meshBasicMaterial color="#001508" />
      </mesh>
      <mesh position={[0, 1.975, 0.260]}>
        <boxGeometry args={[0.40, 0.09, 0.001]} />
        <meshBasicMaterial color="#0a2a14" />
      </mesh>

      {/* Ventilation slots — top */}
      {([-0.20, -0.07, 0.07, 0.20] as number[]).map((gx, gi) => (
        <mesh key={gi} position={[gx, 2.025, 0.05]}>
          <boxGeometry args={[0.055, 0.01, 0.38]} />
          <meshStandardMaterial color="#04040e" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Side rails */}
      {([-1, 1] as const).map((side, i) => (
        <mesh key={i} position={[side * 0.305, 1.0, 0.01]}>
          <boxGeometry args={[0.013, 2.0, 0.48]} />
          <meshStandardMaterial color="#14143a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Neon accent — top edge */}
      <mesh position={[0, 2.026, 0.24]}>
        <boxGeometry args={[0.60, 0.016, 0.01]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2.8} />
      </mesh>

      {/* Cable bundle base */}
      <mesh position={[0.12, 0.04, 0.10]} rotation={[Math.PI / 2, 0, 0.3]}>
        <cylinderGeometry args={[0.032, 0.032, 0.18, 6]} />
        <meshStandardMaterial color="#1a1a40" roughness={0.9} />
      </mesh>

      {/* Floor glow */}
      <mesh position={[0, 0.004, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.60, 0.50]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.07} depthWrite={false} />
      </mesh>

      <pointLight position={[0, 2.5, 0.5]} color="#10b981" intensity={4} distance={4} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. FILING SHELVES — document cabinets along side walls
// ─────────────────────────────────────────────────────────────────────────────

const FOLDER_COLORS = [
  '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#16a34a', '#db2777', '#ea580c',
  '#0d9488', '#4f46e5', '#c2410c', '#15803d',
];

// Slightly lighten a #rrggbb hex colour for the visible spine face
function lightenHex(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 38).toString(16).padStart(2, '0');
  const g = Math.min(255, ((n >>  8) & 0xff) + 38).toString(16).padStart(2, '0');
  const b = Math.min(255, ( n        & 0xff) + 38).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function FilingShelf({ position, rotY = 0, seed = 0 }: {
  position: [number,number,number]; rotY?: number; seed?: number;
}) {
  // Deterministic pseudo-random from seed (pure, safe in JSX)
  const rng = (i: number) => {
    const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const SHELVES = 5;

  // ── Render one item slot: binder / book / paper-stack ─────────────────────
  const renderItem = (si: number, fi: number, xPos: number, shelfY: number) => {
    const t     = rng(si * 71 + fi * 37);
    const color = FOLDER_COLORS[Math.floor(rng(si * 53 + fi * 13) * FOLDER_COLORS.length)];
    const tilt  = (rng(si * 19 + fi) - 0.5) * 0.09;

    if (t < 0.62) {
      // ── BINDER (62%) — body + raised spine plate + white label + coloured tab ──
      const w    = 0.062 + rng(si * 31 + fi) * 0.055;
      const h    = 0.21  + rng(si * 17 + fi * 7) * 0.11;
      const face = lightenHex(color);

      return (
        <group key={fi} position={[xPos, shelfY + h / 2 + 0.025, 0.04]} rotation={[0, 0, tilt]}>

          {/* Binder body */}
          <mesh castShadow>
            <boxGeometry args={[w, h, 0.26]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>

          {/* Visible front-face / spine — slightly lighter shade */}
          <mesh position={[0, 0, 0.131]}>
            <boxGeometry args={[w - 0.005, h - 0.008, 0.004]} />
            <meshStandardMaterial color={face} roughness={0.60} metalness={0.08} />
          </mesh>

          {/* White label rectangle on spine */}
          <mesh position={[0, -h * 0.13, 0.134]}>
            <boxGeometry args={[w * 0.68, h * 0.24, 0.002]} />
            <meshStandardMaterial color="#f0f0ea" roughness={1.0} />
          </mesh>

          {/* Horizontal rule lines inside label (simulate printed text) */}
          {[0.25, 0.45, 0.65].map((yf, li) => (
            <mesh key={li} position={[0, -h * 0.13 + h * 0.24 * (yf - 0.5), 0.136]}>
              <boxGeometry args={[w * 0.52, 0.005, 0.001]} />
              <meshBasicMaterial color="#aaaaaa" transparent opacity={0.7} />
            </mesh>
          ))}

          {/* Coloured index tab — sticks up from top */}
          <mesh position={[w * 0.10, h / 2 + 0.020, 0.124]}>
            <boxGeometry args={[w * 0.48, 0.040, 0.012]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.55} />
          </mesh>

          {/* Tab shadow crease */}
          <mesh position={[w * 0.10, h / 2 + 0.001, 0.125]}>
            <boxGeometry args={[w * 0.48, 0.003, 0.008]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.30} />
          </mesh>

        </group>
      );

    } else if (t < 0.82) {
      // ── BOOK (20%) — cover + horizontal spine text lines ──
      const w = 0.048 + rng(si * 23 + fi) * 0.030;
      const h = 0.27  + rng(si * 11 + fi * 5) * 0.09;

      return (
        <group key={fi} position={[xPos, shelfY + h / 2 + 0.025, 0.065]} rotation={[0, 0, tilt]}>

          {/* Book body */}
          <mesh castShadow>
            <boxGeometry args={[w, h, 0.21]} />
            <meshStandardMaterial color={color} roughness={0.90} />
          </mesh>

          {/* Title block (top third of spine) */}
          <mesh position={[0, h * 0.28, 0.107]}>
            <boxGeometry args={[w * 0.80, h * 0.16, 0.001]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.72} />
          </mesh>

          {/* Horizontal spine text lines */}
          {[0.50, 0.63, 0.73, 0.82].map((yf, li) => (
            <mesh key={li} position={[0, h * (yf - 0.5), 0.107]}>
              <boxGeometry args={[w * (li < 2 ? 0.72 : 0.55), 0.006, 0.001]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
            </mesh>
          ))}

          {/* Left edge highlight (spine binding) */}
          <mesh position={[-w / 2 + 0.003, 0, 0.01]}>
            <boxGeometry args={[0.005, h - 0.012, 0.22]} />
            <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.14} />
          </mesh>

          {/* Top edge (pages) */}
          <mesh position={[0, h / 2 - 0.003, 0]}>
            <boxGeometry args={[w - 0.01, 0.005, 0.19]} />
            <meshStandardMaterial color="#e8e8e0" roughness={1} />
          </mesh>

        </group>
      );

    } else {
      // ── PAPER STACK (18%) — fanned sheets + coloured top cover ──
      const w      = 0.10 + rng(si * 41 + fi) * 0.06;
      const pCount = 6 + Math.floor(rng(si * 13 + fi * 9) * 5);

      return (
        <group key={fi} position={[xPos, shelfY + 0.025, 0.07]}>

          {/* Individual paper sheets (thin boxes, slight random offset) */}
          {Array.from({ length: pCount }, (_, pi) => {
            const isTop = pi === pCount - 1;
            return (
              <mesh key={pi} position={[
                (rng(pi * 7  + fi + si * 2) - 0.5) * 0.014,
                pi * 0.008,
                (rng(pi * 11 + fi + si * 3) - 0.5) * 0.020,
              ]}>
                <boxGeometry args={[w, 0.007, 0.20 + rng(pi * 3 + si) * 0.03]} />
                <meshStandardMaterial
                  color={isTop ? color : '#e2e2ec'}
                  roughness={0.95}
                />
              </mesh>
            );
          })}

          {/* Right-edge paper stack strip (depth cue for the pages) */}
          <mesh position={[w / 2 - 0.004, pCount * 0.004, 0]}>
            <boxGeometry args={[0.005, pCount * 0.008 + 0.005, 0.20]} />
            <meshBasicMaterial color="#c8c8d8" transparent opacity={0.55} />
          </mesh>

          {/* Left-edge strip */}
          <mesh position={[-w / 2 + 0.004, pCount * 0.004, 0]}>
            <boxGeometry args={[0.005, pCount * 0.008 + 0.005, 0.20]} />
            <meshBasicMaterial color="#c8c8d8" transparent opacity={0.40} />
          </mesh>

        </group>
      );
    }
  };

  // Shelf geometry constants
  const W  = 1.20;
  const D  = 0.36;
  const TH = 0.018;

  return (
    <group position={position} rotation={[0, rotY, 0]}>

      {/* ── Open-front frame — no solid front face so documents are visible ── */}

      {/* Back panel */}
      <mesh position={[0, 1.10, -D / 2 + TH / 2]}>
        <boxGeometry args={[W, 2.20, TH]} />
        <meshStandardMaterial color="#060618" metalness={0.78} roughness={0.4} />
      </mesh>

      {/* Left side panel */}
      <mesh position={[-W / 2 + TH / 2, 1.10, 0]}>
        <boxGeometry args={[TH, 2.20, D]} />
        <meshStandardMaterial color="#0e0e2e" metalness={0.82} roughness={0.3} />
      </mesh>

      {/* Right side panel */}
      <mesh position={[W / 2 - TH / 2, 1.10, 0]}>
        <boxGeometry args={[TH, 2.20, D]} />
        <meshStandardMaterial color="#0e0e2e" metalness={0.82} roughness={0.3} />
      </mesh>

      {/* Base */}
      <mesh position={[0, TH / 2, 0]}>
        <boxGeometry args={[W, TH, D]} />
        <meshStandardMaterial color="#0e0e2e" metalness={0.82} roughness={0.3} />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 2.20 - TH / 2, 0]}>
        <boxGeometry args={[W, TH, D]} />
        <meshStandardMaterial color="#1e1e42" metalness={0.80} roughness={0.25} />
      </mesh>

      {/* Neon strip — top front edge */}
      <mesh position={[0, 2.205, D / 2 - 0.004]}>
        <boxGeometry args={[W - 0.02, 0.010, 0.008]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={2.0} />
      </mesh>

      {/* ── Shelf boards + documents ── */}
      {Array.from({ length: SHELVES }, (_, si) => {
        const shelfY   = 0.06 + si * (2.20 - TH * 2 - 0.06) / SHELVES;
        const innerW   = W - TH * 2;
        const numItems = 4 + Math.floor(rng(si * 10) * 4);
        const spacing  = innerW / numItems;

        return (
          <group key={si}>

            {/* Shelf board */}
            <mesh position={[0, shelfY, 0]}>
              <boxGeometry args={[innerW, TH, D - 0.01]} />
              <meshStandardMaterial color="#141436" metalness={0.65} roughness={0.5} />
            </mesh>

            {/* Front edge glow strip */}
            <mesh position={[0, shelfY + TH / 2 + 0.004, D / 2 - 0.006]}>
              <boxGeometry args={[innerW, TH / 2, 0.006]} />
              <meshStandardMaterial color="#3535a0" emissive="#3535a0" emissiveIntensity={0.9} />
            </mesh>

            {/* Documents — distributed evenly across shelf width */}
            {Array.from({ length: numItems }, (_, fi) => {
              const xPos = -innerW / 2 + spacing * (fi + 0.5) + (rng(si * 7 + fi * 3) - 0.5) * 0.006;
              return renderItem(si, fi, xPos, shelfY);
            })}

          </group>
        );
      })}

      <pointLight position={[0, 1.80, D / 2 + 0.30]} color="#8080ff" intensity={2.5} distance={3.5} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. RECEPTION AREA — entrance desk + info board + front arch
// ─────────────────────────────────────────────────────────────────────────────

function ReceptionArea() {
  return (
    // Desk faces +z toward entrance — admin stands behind counter facing visitors
    <group position={[9.0, 0, 8.5]}>

      {/* ══ DESK ════════════════════════════════════════════════════════ */}

      {/* Centre counter */}
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.80, 0.92, 0.62]} />
        <meshStandardMaterial color="#0b0b22" metalness={0.90} roughness={0.14} />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 0.932, 0]}>
        <boxGeometry args={[2.80, 0.016, 0.62]} />
        <meshStandardMaterial color="#18183c" metalness={0.96} roughness={0.06} />
      </mesh>
      {/* Front LED strip bottom */}
      <mesh position={[0, 0.016, 0.314]}>
        <boxGeometry args={[2.78, 0.018, 0.006]} />
        <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={3.5} />
      </mesh>
      {/* Front LED strip top */}
      <mesh position={[0, 0.90, 0.314]}>
        <boxGeometry args={[2.78, 0.012, 0.006]} />
        <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={2.8} />
      </mesh>

      {/* Left wing */}
      <group position={[-1.65, 0, -0.12]} rotation={[0, Math.PI / 5.5, 0]}>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[1.05, 0.88, 0.56]} />
          <meshStandardMaterial color="#0b0b22" metalness={0.90} roughness={0.14} />
        </mesh>
        <mesh position={[0, 0.90, 0]}>
          <boxGeometry args={[1.05, 0.016, 0.56]} />
          <meshStandardMaterial color="#18183c" metalness={0.96} roughness={0.06} />
        </mesh>
        <mesh position={[0, 0.016, 0.285]}>
          <boxGeometry args={[1.03, 0.018, 0.006]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={3.0} />
        </mesh>
      </group>

      {/* Right wing */}
      <group position={[1.65, 0, -0.12]} rotation={[0, -Math.PI / 5.5, 0]}>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[1.05, 0.88, 0.56]} />
          <meshStandardMaterial color="#0b0b22" metalness={0.90} roughness={0.14} />
        </mesh>
        <mesh position={[0, 0.90, 0]}>
          <boxGeometry args={[1.05, 0.016, 0.56]} />
          <meshStandardMaterial color="#18183c" metalness={0.96} roughness={0.06} />
        </mesh>
        <mesh position={[0, 0.016, 0.285]}>
          <boxGeometry args={[1.03, 0.018, 0.006]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={3.0} />
        </mesh>
      </group>

      {/* Tablet / thin panel on desk — replaces bulky monitor */}
      <group position={[0, 0.938, -0.12]}>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.52, 0.34, 0.014]} />
          <meshStandardMaterial color="#0e0e28" metalness={0.86} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.18, 0.010]}>
          <boxGeometry args={[0.47, 0.29, 0.002]} />
          <meshBasicMaterial color="#030b24" />
        </mesh>
        <mesh position={[0, 0.18, 0.012]}>
          <boxGeometry args={[0.45, 0.27, 0.001]} />
          <meshBasicMaterial color="#0a2550" transparent opacity={0.80} />
        </mesh>
        {/* Thin stand */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.28, 0.06, 0.012]} />
          <meshStandardMaterial color="#1a1a36" metalness={0.82} roughness={0.3} />
        </mesh>
        <pointLight position={[0, 0.3, 0.3]} color="#4060ff" intensity={2} distance={1.5} decay={2} />
      </group>

      {/* Nameplate */}
      <Html position={[0, 0.52, 0.316]} center distanceFactor={4.5} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontWeight: 900,
          fontSize: 14,
          letterSpacing: '0.28em',
          color: '#a5b4fc',
          textShadow: '0 0 10px #6366f1',
          whiteSpace: 'nowrap',
        }}>◈ &nbsp;AI OFFICE&nbsp; ◈</div>
      </Html>

      {/* Floor glow */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 1.4]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0.4, 0.5]} color="#6366f1" intensity={6} distance={4} decay={2} />



    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CEILING LED STRIP LIGHTS — 4 rows spanning the full office width
// ─────────────────────────────────────────────────────────────────────────────

function CeilingLights() {
  const Y = 8.82;
  const COLOR = '#b8ccff';

  // 4 rows: over back desks, corridor, front desks, open area
  const ROWS: number[] = [-5, -1.2, 2.0, 5.5];

  return (
    <>
      {ROWS.map((z, ri) => (
        <group key={ri} position={[0, Y, z]}>

          {/* Strip panel body */}
          <mesh>
            <boxGeometry args={[19.0, 0.044, 0.28]} />
            <meshStandardMaterial color="#0a0a22" metalness={0.85} roughness={0.2} />
          </mesh>

          {/* Emissive diffuser face */}
          <mesh position={[0, -0.024, 0]}>
            <boxGeometry args={[18.8, 0.006, 0.22]} />
            <meshStandardMaterial
              color={COLOR}
              emissive={COLOR}
              emissiveIntensity={2.0}
              roughness={0.5}
            />
          </mesh>

          {/* End caps */}
          <mesh position={[-9.52, 0, 0]}>
            <boxGeometry args={[0.04, 0.044, 0.28]} />
            <meshStandardMaterial color="#1a1a3a" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[ 9.52, 0, 0]}>
            <boxGeometry args={[0.04, 0.044, 0.28]} />
            <meshStandardMaterial color="#1a1a3a" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Suspension wires — 3 points per row */}
          {([-7, 0, 7] as number[]).map((wx, wi) => (
            <mesh key={wi} position={[wx, 0.16, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.32, 4]} />
              <meshStandardMaterial color="#1a1a36" metalness={0.92} roughness={0.3} />
            </mesh>
          ))}

          {/* Point lights distributed along strip */}
          {([-7, -3.5, 0, 3.5, 7] as number[]).map((lx, li) => (
            <pointLight key={li} position={[lx, -0.3, 0]} color={COLOR} intensity={4} distance={7} decay={2} />
          ))}
        </group>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. LOUNGE AREA — waiting sofas + coffee table (left side, near entrance)
// ─────────────────────────────────────────────────────────────────────────────

function Sofa({ position, rotY = 0 }: { position: [number,number,number]; rotY?: number }) {
  const W     = 1.85;
  const BODY  = '#0d0d24';
  const CUSH  = '#13132e';
  const ACCENT = '#6366f1';

  return (
    <group position={position} rotation={[0, rotY, 0]}>

      {/* Seat base */}
      <mesh position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[W, 0.24, 0.72]} />
        <meshStandardMaterial color={BODY} roughness={0.75} metalness={0.08} />
      </mesh>

      {/* Back rest */}
      <mesh position={[0, 0.56, -0.28]} castShadow>
        <boxGeometry args={[W, 0.56, 0.16]} />
        <meshStandardMaterial color={BODY} roughness={0.75} metalness={0.08} />
      </mesh>

      {/* Left armrest */}
      <mesh position={[-W / 2 + 0.095, 0.44, 0]} castShadow>
        <boxGeometry args={[0.17, 0.34, 0.72]} />
        <meshStandardMaterial color={BODY} roughness={0.75} metalness={0.08} />
      </mesh>
      {/* Right armrest */}
      <mesh position={[W / 2 - 0.095, 0.44, 0]} castShadow>
        <boxGeometry args={[0.17, 0.34, 0.72]} />
        <meshStandardMaterial color={BODY} roughness={0.75} metalness={0.08} />
      </mesh>

      {/* 3 seat cushions */}
      {([-0.56, 0, 0.56] as number[]).map((cx, i) => (
        <mesh key={i} position={[cx, 0.41, 0.06]}>
          <boxGeometry args={[0.54, 0.10, 0.60]} />
          <meshStandardMaterial color={CUSH} roughness={0.82} />
        </mesh>
      ))}

      {/* 3 back cushions */}
      {([-0.56, 0, 0.56] as number[]).map((cx, i) => (
        <mesh key={i} position={[cx, 0.60, -0.20]}>
          <boxGeometry args={[0.50, 0.38, 0.13]} />
          <meshStandardMaterial color={CUSH} roughness={0.82} />
        </mesh>
      ))}

      {/* Neon accent strip — top of backrest */}
      <mesh position={[0, 0.862, -0.28]}>
        <boxGeometry args={[W - 0.06, 0.012, 0.007]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={2.8} />
      </mesh>

      {/* 4 legs */}
      {([
        [-W / 2 + 0.14,  0.28] as [number, number],
        [ W / 2 - 0.14,  0.28] as [number, number],
        [-W / 2 + 0.14, -0.28] as [number, number],
        [ W / 2 - 0.14, -0.28] as [number, number],
      ]).map(([lx, lz], i) => (
        <mesh key={i} position={[lx, -0.04, lz]}>
          <boxGeometry args={[0.055, 0.10, 0.055]} />
          <meshStandardMaterial color="#18183a" metalness={0.88} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function LoungeArea() {
  return (
    <group>

      {/* ── Area rug ── */}
      <mesh position={[-5.0, 0.006, 7.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.6, 3.2]} />
        <meshStandardMaterial color="#160e38" transparent opacity={0.60} roughness={0.95} />
      </mesh>
      {/* Rug neon border */}
      {([
        { p: [-5.0, 0.007, 6.22] as [number,number,number], r: 0,           w: 4.6 },
        { p: [-5.0, 0.007, 9.38] as [number,number,number], r: 0,           w: 4.6 },
        { p: [-7.28, 0.007, 7.8] as [number,number,number], r: Math.PI / 2, w: 3.2 },
        { p: [-2.72, 0.007, 7.8] as [number,number,number], r: Math.PI / 2, w: 3.2 },
      ]).map((b, i) => (
        <mesh key={i} position={b.p} rotation={[-Math.PI / 2, b.r, 0]}>
          <planeGeometry args={[b.w, 0.07]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* ── Sofa A — faces +z (back toward back wall) ── */}
      <Sofa position={[-5.0, 0, 6.90]} rotY={0} />

      {/* ── Sofa B — faces -z (toward sofa A) ── */}
      <Sofa position={[-5.0, 0, 8.70]} rotY={Math.PI} />

      {/* ── Coffee table ── */}
      <group position={[-5.0, 0, 7.80]}>
        {/* Top */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <boxGeometry args={[0.95, 0.040, 0.56]} />
          <meshStandardMaterial color="#09091e" metalness={0.94} roughness={0.08} />
        </mesh>
        {/* Glass inlay */}
        <mesh position={[0, 0.402, 0]}>
          <boxGeometry args={[0.85, 0.006, 0.47]} />
          <meshStandardMaterial color="#2828a0" transparent opacity={0.35} metalness={0.95} roughness={0.04} />
        </mesh>
        {/* Glowing edge */}
        <mesh position={[0, 0.401, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.44, 0.46, 52]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.70} />
        </mesh>
        {/* 4 legs */}
        {([[-0.39, -0.24], [0.39, -0.24], [-0.39, 0.24], [0.39, 0.24]] as [number,number][]).map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.19, lz]}>
            <cylinderGeometry args={[0.020, 0.020, 0.38, 6]} />
            <meshStandardMaterial color="#1a1a38" metalness={0.90} roughness={0.2} />
          </mesh>
        ))}
        <pointLight position={[0, 0.7, 0]} color="#6366f1" intensity={4} distance={3.5} decay={2} />
      </group>

      {/* ── Side accent table with glowing orb ── */}
      <group position={[-7.0, 0, 7.80]}>
        <mesh position={[0, 0.50, 0]}>
          <cylinderGeometry args={[0.20, 0.20, 0.038, 16]} />
          <meshStandardMaterial color="#09091e" metalness={0.94} roughness={0.08} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.020, 0.020, 0.50, 6]} />
          <meshStandardMaterial color="#1a1a38" metalness={0.90} roughness={0.2} />
        </mesh>
        {/* Orb */}
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.090, 14, 14]} />
          <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={2.0}
            transparent opacity={0.88} roughness={0.04} metalness={0.7} />
        </mesh>
        <pointLight position={[0, 0.85, 0]} color="#818cf8" intensity={4} distance={2.5} decay={2} />
      </group>

    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. SECURITY CAMERAS — wall / corner mounted, blinking red LED
// ─────────────────────────────────────────────────────────────────────────────

function SecurityCamera({ position, rotY = 0 }: { position: [number,number,number]; rotY?: number }) {
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ledRef.current) return;
    const t   = clock.getElapsedTime();
    // Slow 0.9s blink: on ~60%, off ~40%
    const on  = Math.sin(t * Math.PI / 0.9) > -0.25;
    (ledRef.current.material as THREE.MeshBasicMaterial).color.set(on ? '#ef4444' : '#1a0000');
    (ledRef.current.material as THREE.MeshBasicMaterial).opacity = on ? 1.0 : 0.15;
  });

  return (
    <group position={position} rotation={[0, rotY, 0]}>

      {/* Wall/ceiling bracket */}
      <mesh position={[0, 0.08, 0.04]}>
        <boxGeometry args={[0.06, 0.16, 0.08]} />
        <meshStandardMaterial color="#111128" metalness={0.90} roughness={0.3} />
      </mesh>
      {/* Bracket arm */}
      <mesh position={[0, -0.04, 0.10]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.035, 0.035, 0.14]} />
        <meshStandardMaterial color="#111128" metalness={0.90} roughness={0.3} />
      </mesh>

      {/* Camera body — angled down ~20° to see the room */}
      <group rotation={[-0.38, 0, 0]}>
        {/* Main body */}
        <mesh position={[0, 0, 0.12]} castShadow>
          <boxGeometry args={[0.10, 0.085, 0.20]} />
          <meshStandardMaterial color="#0a0a1e" metalness={0.88} roughness={0.25} />
        </mesh>
        {/* Lens housing */}
        <mesh position={[0, 0, 0.222]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.030, 0.034, 0.040, 12]} />
          <meshStandardMaterial color="#06060e" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Lens glass */}
        <mesh position={[0, 0, 0.244]}>
          <circleGeometry args={[0.022, 14]} />
          <meshStandardMaterial color="#080830" metalness={1.0} roughness={0.0}
            transparent opacity={0.90} />
        </mesh>
        {/* Lens inner glow */}
        <mesh position={[0, 0, 0.243]}>
          <circleGeometry args={[0.014, 14]} />
          <meshBasicMaterial color="#102040" transparent opacity={0.70} />
        </mesh>

        {/* Red LED indicator — top-right corner of body */}
        <mesh ref={ledRef} position={[0.035, 0.030, 0.222]}>
          <sphereGeometry args={[0.008, 7, 7]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={1.0} />
        </mesh>
      </group>

    </group>
  );
}
