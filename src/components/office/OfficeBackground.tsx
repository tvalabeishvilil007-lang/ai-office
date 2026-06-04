import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// OfficeBackground — warm premium office interior illustration.
//
// Philosophy: OFFICE FIRST. This is the room. Agents (people) are overlaid on
// top via AgentStation in OfficeScene. This file draws walls, floor, light.
//
// SVG viewBox 0 0 1440 720, preserveAspectRatio="xMidYMid slice"
// At 1640×744 viewport → scale=1.139, y-crop=38px each side
//
// Floor line sits at SVG y=310 → scene ≈ 44% from top.
// All agents are positioned at ≥43% scene height = ON the floor. ✓
//
// Layers:
//   1. Warm dark base (visible walnut-brown — not pitch black)
//   2. SVG: ceiling + LED strips, bookshelf, wood panels,
//           4-pane city windows, warm floor, depth-correct desk silhouettes
//   3. CSS lamp glow pools (strong amber radials)
//   4. City window blue spill
//   5. Subtle plant tints
//   6. Animated slow warm orbs
//   7. Edge vignette (light — only sides & top)
// ─────────────────────────────────────────────────────────────────────────────

export function OfficeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>

      {/* ── 1. Warm walnut base ────────────────────────────────── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #1e1408 0%, #261c0b 38%, #211a0e 100%)',
      }} />

      {/* ── 2. Office SVG ──────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* City night sky */}
          <linearGradient id="bgCitySky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#020810" />
            <stop offset="55%"  stopColor="#051020" />
            <stop offset="100%" stopColor="#091828" />
          </linearGradient>

          {/* Glass window tint */}
          <linearGradient id="bgGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(25,55,110,0.20)" />
            <stop offset="100%" stopColor="rgba(10,30,65,0.08)" />
          </linearGradient>

          {/* Warm ceiling glow */}
          <radialGradient id="bgCeilGlow" cx="50%" cy="0%" r="55%">
            <stop offset="0%"   stopColor="rgba(255,215,140,0.32)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Floor warm center */}
          <radialGradient id="bgFloorGlow" cx="50%" cy="0%" r="60%">
            <stop offset="0%"   stopColor="rgba(255,180,70,0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Walnut desk top */}
          <linearGradient id="bgDesk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2e2208" />
            <stop offset="100%" stopColor="#1c1506" />
          </linearGradient>
        </defs>

        {/* ══ CEILING ══════════════════════════════════════════ */}
        <rect x="0" y="0" width="1440" height="58" fill="#171009" />
        <rect x="0" y="0" width="1440" height="58" fill="url(#bgCeilGlow)" />

        {/* LED ceiling panels */}
        {[100, 310, 535, 770, 1015, 1240].map((x, i) => (
          <g key={i}>
            <rect x={x} y="9" width="122" height="28" rx="3" fill="#0e0a06" />
            <rect x={x + 7} y="13" width="108" height="20" rx="2" fill="rgba(255,235,185,0.90)" />
            {/* Light cone */}
            <path
              d={`M${x + 7} 33 L${x - 50} 140 L${x + 172} 140 L${x + 115} 33 Z`}
              fill="rgba(255,215,140,0.065)"
            />
          </g>
        ))}

        {/* Crown molding */}
        <rect x="0" y="56" width="1440" height="4" fill="rgba(255,190,80,0.09)" />

        {/* ══ BACK WALL BASE ═══════════════════════════════════ */}
        {/* The wall area: y=60 to y=310 (above new floor line at y=310) */}
        <rect x="0" y="60" width="1440" height="250" fill="#221608" />

        {/* ══ BOOKSHELF — LEFT (x 0–290) ══════════════════════ */}
        <rect x="0"   y="60"  width="290" height="250" fill="#1a1208" />
        <rect x="6"   y="66"  width="278" height="238" fill="#160f07" />
        <rect x="148" y="66"  width="5"   height="238" fill="#201508" />

        {/* Shelf boards */}
        {[66, 148, 232, 310].map((y, i) => (
          <g key={i}>
            <rect x="6" y={y} width="278" height="8" fill="#2a1c08" />
            <rect x="6" y={y} width="278" height="2" fill="rgba(255,200,100,0.18)" />
          </g>
        ))}

        {/* Books — shelf 1 */}
        {[
          { x: 10,  w: 24, h: 72, c: '#5e220f' },
          { x: 36,  w: 17, h: 65, c: '#1a3065' },
          { x: 55,  w: 26, h: 78, c: '#1a3d22' },
          { x: 83,  w: 15, h: 60, c: '#5a4212' },
          { x: 100, w: 22, h: 74, c: '#3a1a52' },
          { x: 124, w: 14, h: 56, c: '#382c18' },
          { x: 153, w: 21, h: 72, c: '#1a3065' },
          { x: 176, w: 25, h: 78, c: '#5e220f' },
          { x: 203, w: 17, h: 64, c: '#1a3d22' },
          { x: 222, w: 23, h: 76, c: '#5a4212' },
          { x: 247, w: 15, h: 66, c: '#3a1a52' },
          { x: 264, w: 12, h: 58, c: '#382c18' },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={74} width={b.w} height={b.h} rx="1" fill={b.c} opacity="0.82" />
        ))}

        {/* Books — shelf 2 */}
        {[
          { x: 10,  w: 29, h: 74, c: '#3a2c10' },
          { x: 41,  w: 16, h: 62, c: '#1a4230' },
          { x: 59,  w: 23, h: 78, c: '#4e1a1a' },
          { x: 84,  w: 18, h: 66, c: '#1a2c52' },
          { x: 104, w: 30, h: 78, c: '#284012' },
          { x: 153, w: 19, h: 70, c: '#5a3212' },
          { x: 174, w: 25, h: 76, c: '#1a1a52' },
          { x: 201, w: 16, h: 62, c: '#3a1a1a' },
          { x: 219, w: 29, h: 78, c: '#1a3d22' },
          { x: 250, w: 21, h: 68, c: '#4a3c12' },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={156} width={b.w} height={b.h} rx="1" fill={b.c} opacity="0.76" />
        ))}

        {/* Books — shelf 3, with plant */}
        {[
          { x: 10,  w: 27, h: 70, c: '#2a2018' },
          { x: 39,  w: 21, h: 60, c: '#1a3065' },
          { x: 62,  w: 14, h: 68, c: '#4e2018' },
          { x: 78,  w: 18, h: 54, c: '#1a4028' },
          { x: 162, w: 23, h: 70, c: '#5a4012' },
          { x: 187, w: 29, h: 72, c: '#1a2c52' },
          { x: 218, w: 15, h: 62, c: '#3a1a1a' },
          { x: 235, w: 20, h: 76, c: '#1a3d22' },
          { x: 257, w: 25, h: 66, c: '#4a2c18' },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={240} width={b.w} height={b.h} rx="1" fill={b.c} opacity="0.70" />
        ))}
        {/* Plant on shelf 3 */}
        <rect x="98" y="270" width="18" height="20" rx="2" fill="#1e1408" />
        <ellipse cx="107" cy="270" rx="11" ry="4" fill="#221808" />
        <path d="M107 270 Q97 255 92 242" stroke="#122210" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M107 270 Q108 252 115 240" stroke="#122210" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M107 270 Q118 258 124 245" stroke="#0e1d0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Bookshelf edge shadow */}
        <rect x="284" y="60" width="6" height="250" fill="rgba(0,0,0,0.40)" />

        {/* ══ WOOD PANEL WALL — CENTER (x 290–840) ════════════ */}
        <rect x="290" y="60" width="550" height="250" fill="#271a08" />
        {/* Vertical panel grooves */}
        {Array.from({ length: 25 }).map((_, i) => (
          <rect key={i} x={290 + i * 21.5 + 20} y="60" width="2" height="250" fill="rgba(0,0,0,0.22)" />
        ))}
        <rect x="290" y="60"  width="550" height="4" fill="rgba(255,185,80,0.11)" />
        <rect x="290" y="307" width="550" height="3" fill="rgba(255,165,65,0.08)" />

        {/* Wall sconce left */}
        <rect x="388" y="102" width="6" height="42" fill="#2e2008" rx="1" />
        <ellipse cx="391" cy="102" rx="19" ry="8" fill="#362608" />
        <ellipse cx="391" cy="110" rx="34" ry="26" fill="rgba(255,190,80,0.12)" />

        {/* Company logo niche */}
        <rect x="380" y="125" width="174" height="90" rx="9" fill="rgba(20,14,5,0.72)" />
        <rect x="380" y="125" width="174" height="90" rx="9" fill="none" stroke="rgba(255,180,80,0.16)" strokeWidth="1" />
        <circle cx="422" cy="170" r="25" fill="rgba(99,102,241,0.20)" />
        <circle cx="422" cy="170" r="25" fill="none" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" />
        <rect x="458" y="157" width="84" height="8"  rx="2" fill="rgba(255,255,255,0.20)" />
        <rect x="458" y="171" width="62" height="6"  rx="2" fill="rgba(255,255,255,0.12)" />
        <rect x="458" y="183" width="74" height="5"  rx="2" fill="rgba(255,255,255,0.08)" />

        {/* Wall sconce right */}
        <rect x="628" y="102" width="6" height="42" fill="#2e2008" rx="1" />
        <ellipse cx="631" cy="102" rx="19" ry="8" fill="#362608" />
        <ellipse cx="631" cy="110" rx="34" ry="26" fill="rgba(255,190,80,0.12)" />

        {/* ══ WINDOWS — RIGHT WALL (x 840–1440) ══════════════ */}
        <rect x="840" y="60" width="600" height="254" fill="#1a1208" />

        {/* City sky behind glass */}
        <rect x="852" y="68" width="576" height="236" fill="url(#bgCitySky)" />

        {/* Mountain silhouette */}
        <path
          d="M852 304 Q898 234 956 250 Q1016 220 1068 238 Q1120 200 1175 222 Q1228 186 1288 208 Q1335 180 1395 200 L1428 208 L1428 310 L852 310 Z"
          fill="#040710" opacity="0.94"
        />

        {/* TV tower */}
        <line x1="1150" y1="222" x2="1150" y2="158" stroke="#050810" strokeWidth="3" />
        <polygon points="1150,150 1154,164 1146,164" fill="#050810" />
        <circle cx="1150" cy="153" r="3.5" fill="rgba(255,110,50,0.80)" />

        {/* City buildings */}
        {[
          { x: 860,  w: 38, h: 90,  lights: [[865,225],[877,210],[884,197]] },
          { x: 904,  w: 30, h: 115, lights: [[908,214],[918,200],[910,187]] },
          { x: 940,  w: 44, h: 80,  lights: [[946,237],[958,224],[950,212]] },
          { x: 990,  w: 36, h: 128, lights: [[995,204],[1004,192],[997,180]] },
          { x: 1034, w: 28, h: 100, lights: [[1038,224],[1046,210],[1040,198]] },
          { x: 1068, w: 50, h: 145, lights: [[1074,196],[1086,184],[1096,200],[1072,208]] },
          { x: 1125, w: 32, h: 90,  lights: [[1129,225],[1139,210],[1131,198]] },
          { x: 1183, w: 43, h: 122, lights: [[1189,200],[1201,188],[1193,176],[1205,206]] },
          { x: 1233, w: 34, h: 104, lights: [[1239,215],[1249,202],[1241,190]] },
          { x: 1275, w: 46, h: 88,  lights: [[1281,232],[1293,220],[1300,208]] },
          { x: 1327, w: 36, h: 112, lights: [[1333,207],[1342,196],[1335,185]] },
          { x: 1370, w: 30, h: 94,  lights: [[1374,225],[1384,212],[1376,200]] },
          { x: 1403, w: 22, h: 78,  lights: [[1407,240],[1415,228]] },
        ].map((bld, bi) => (
          <g key={bi}>
            <rect
              x={bld.x} y={310 - bld.h}
              width={bld.w} height={bld.h}
              fill={bi % 3 === 0 ? '#040910' : bi % 3 === 1 ? '#050a12' : '#03080f'}
            />
            {bld.lights.map(([lx, ly], li) => (
              <rect key={li} x={lx} y={ly} width={7} height={5} rx="1"
                fill={li % 2 === 0 ? 'rgba(255,200,100,0.62)' : 'rgba(160,200,255,0.46)'} />
            ))}
          </g>
        ))}

        {/* Extra scattered city lights */}
        {[
          [862, 264, 'rgba(255,200,100,0.44)'],
          [925, 254, 'rgba(160,200,255,0.38)'],
          [978, 268, 'rgba(255,180,80,0.50)'],
          [1043,256, 'rgba(200,220,255,0.34)'],
          [1102,265, 'rgba(255,200,100,0.42)'],
          [1158,252, 'rgba(160,200,255,0.44)'],
          [1242,260, 'rgba(255,180,80,0.46)'],
          [1296,268, 'rgba(200,220,255,0.36)'],
          [1354,256, 'rgba(255,200,100,0.44)'],
          [1404,263, 'rgba(160,200,255,0.38)'],
        ].map(([x, y, c], i) => (
          <rect key={i} x={x as number} y={y as number} width="8" height="5" rx="1" fill={c as string} />
        ))}

        {/* Glass tint & top reflection */}
        <rect x="852" y="68" width="576" height="236" fill="url(#bgGlass)" />
        <rect x="852" y="68" width="576" height="3" fill="rgba(255,255,255,0.08)" />

        {/* Window frame */}
        <rect x="840"  y="60"  width="12"  height="254" fill="#201608" />
        <rect x="1428" y="60"  width="12"  height="254" fill="#201608" />
        <rect x="840"  y="60"  width="600" height="10"  fill="#201608" />
        <rect x="840"  y="312" width="600" height="10"  fill="#281e08" />
        {[1007, 1163, 1318].map((x, i) => (
          <rect key={i} x={x} y="68" width="9" height="236" fill="#201608" />
        ))}
        <rect x="852" y="180" width="576" height="7" fill="#201608" />

        {/* ══ FLOOR (y=310 → bottom) ══════════════════════════ */}
        {/* Floor line sits at scene ≈44% — all agents positioned ≥43% */}
        <rect x="0" y="310" width="1440" height="410" fill="#1a1610" />
        <rect x="0" y="310" width="1440" height="410" fill="url(#bgFloorGlow)" />

        {/* Parquet horizontal depth lines */}
        {[28, 68, 125, 205, 322, 488].map((dy, i) => (
          <line key={i}
            x1="0"    y1={310 + dy}
            x2="1440" y2={310 + dy}
            stroke="rgba(255,165,65,0.042)"
            strokeWidth={0.4 + i * 0.22}
          />
        ))}

        {/* Perspective converging lines */}
        {[-680, -360, -140, 0, 140, 360, 680, 1000, 1320, 1680].map((dx, i) => (
          <line key={i}
            x1={720}   y1={310}
            x2={720 + dx} y2={720}
            stroke="rgba(255,165,65,0.028)"
            strokeWidth="0.8"
          />
        ))}

        {/* Parquet plank lines */}
        {[90, 220, 350, 470, 590, 710, 840, 960, 1080, 1200, 1320, 1400].map((x, i) => (
          <line key={i}
            x1={x}          y1="310"
            x2={720 + (x - 720) * 2.6} y2="720"
            stroke="rgba(255,165,65,0.020)" strokeWidth="0.7"
          />
        ))}

        {/* Floor center warm shine */}
        <ellipse cx="720" cy="430" rx="340" ry="90" fill="rgba(255,190,80,0.05)" />

        {/* ══ DESKS — aligned with agent positions ════════════ */}
        {/*
            New compressed layout (38% narrower, centered at 45%):
            Back: 26%→374, 46%→662, 65%→936
            Mid:  22%→317, 68%→979
            Near: 20%→288, 70%→1008
            Exec: 45%→648
        */}

        {/* Far-back desks — low opacity: AgentStation SVG provides its own desk */}
        {[
          { cx: 374,  w: 110, y: 312 },
          { cx: 662,  w: 108, y: 310 },
          { cx: 936,  w: 112, y: 312 },
        ].map((d, i) => (
          <g key={i}>
            <rect x={d.cx - d.w/2} y={d.y} width={d.w} height={14} rx="2" fill="url(#bgDesk)" opacity="0.28" />
            <rect x={d.cx - d.w/2} y={d.y} width={d.w} height={2}  fill="rgba(255,195,80,0.08)" />
          </g>
        ))}

        {/* Mid desks */}
        {[
          { cx: 317,  w: 145, y: 368 },
          { cx: 979,  w: 148, y: 366 },
        ].map((d, i) => (
          <g key={i}>
            <rect x={d.cx - d.w/2} y={d.y} width={d.w} height={17} rx="2" fill="url(#bgDesk)" opacity="0.24" />
            <rect x={d.cx - d.w/2} y={d.y} width={d.w} height={2}  fill="rgba(255,190,75,0.07)" />
          </g>
        ))}

        {/* Near desks */}
        {[
          { cx: 288,  w: 178, y: 442 },
          { cx: 1008, w: 180, y: 440 },
        ].map((d, i) => (
          <g key={i}>
            <rect x={d.cx - d.w/2} y={d.y} width={d.w} height={21} rx="2" fill="url(#bgDesk)" opacity="0.20" />
            <rect x={d.cx - d.w/2} y={d.y} width={d.w} height={2}  fill="rgba(255,190,75,0.06)" />
          </g>
        ))}

        {/* Executive desk — warm walnut area hint, 45% center */}
        <rect x="432" y="548" width="432" height="32" rx="3" fill="url(#bgDesk)" opacity="0.35" />
        <rect x="432" y="548" width="432" height="3"  fill="rgba(245,158,11,0.14)" />
        <rect x="432" y="580" width="432" height="9"  rx="1" fill="#141008" opacity="0.40" />
        <ellipse cx="648" cy="544" rx="60" ry="12" fill="rgba(245,158,11,0.06)" />

        {/* ══ FOREGROUND STRIP ════════════════════════════════ */}
        <rect x="0" y="706" width="1440" height="14" fill="#151210" opacity="0.90" />
      </svg>

      {/* ── 3. LAMP GLOW POOLS — warm but controlled ──────────── */}

      {/* Central ambient room fill — subtle, not dominating */}
      <div className="absolute" style={{
        left: '50%', top: '55%',
        transform: 'translate(-50%, -50%)',
        width: 900, height: 400,
        background: 'radial-gradient(ellipse, rgba(255,185,70,0.07) 0%, transparent 68%)',
        filter: 'blur(50px)',
      }} />

      {/* Executive desk — warm gold, visible but not fire */}
      <div className="absolute" style={{
        left: '45%', top: '68%',
        transform: 'translate(-50%, -50%)',
        width: 480, height: 260,
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.14) 0%, transparent 62%)',
        filter: 'blur(38px)',
      }} />

      {/* Left cluster lamps — tracks mid-left agent at 22% */}
      <div className="absolute" style={{
        left: '22%', top: '52%',
        transform: 'translate(-50%, -50%)',
        width: 280, height: 200,
        background: 'radial-gradient(ellipse, rgba(255,180,65,0.10) 0%, transparent 65%)',
        filter: 'blur(28px)',
      }} />

      {/* Right cluster lamps — tracks mid-right agent at 68% */}
      <div className="absolute" style={{
        left: '68%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 270, height: 195,
        background: 'radial-gradient(ellipse, rgba(255,175,60,0.09) 0%, transparent 65%)',
        filter: 'blur(26px)',
      }} />

      {/* Ceiling warm wash — from LED panels */}
      <div className="absolute" style={{
        left: '50%', top: '0%',
        transform: 'translateX(-50%)',
        width: 1100, height: 240,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,130,0.10) 0%, transparent 70%)',
        filter: 'blur(28px)',
      }} />

      {/* Wall sconce glows — subtle warm spots */}
      <div className="absolute" style={{
        left: '28%', top: '18%',
        transform: 'translate(-50%, -50%)',
        width: 110, height: 80,
        background: 'radial-gradient(ellipse, rgba(255,195,80,0.16) 0%, transparent 70%)',
        filter: 'blur(14px)',
      }} />
      <div className="absolute" style={{
        left: '45%', top: '18%',
        transform: 'translate(-50%, -50%)',
        width: 110, height: 80,
        background: 'radial-gradient(ellipse, rgba(255,195,80,0.16) 0%, transparent 70%)',
        filter: 'blur(14px)',
      }} />

      {/* ── 4. City window blue spill ─────────────────────────── */}
      <div className="absolute" style={{
        right: 0, top: '0%',
        width: '42%', height: '52%',
        background: 'linear-gradient(270deg, rgba(12,38,108,0.12) 0%, transparent 100%)',
      }} />

      {/* ── 5. Plant silhouettes (corners) ───────────────────── */}
      <div className="absolute" style={{
        left: '-3%', top: '50%',
        width: 220, height: 340,
        background: 'radial-gradient(ellipse at 55% 25%, rgba(14,40,10,0.55) 0%, transparent 65%)',
        filter: 'blur(10px)',
      }} />
      <div className="absolute" style={{
        right: '0%', top: '56%',
        width: 190, height: 280,
        background: 'radial-gradient(ellipse at 45% 25%, rgba(11,34,8,0.50) 0%, transparent 65%)',
        filter: 'blur(9px)',
      }} />

      {/* ── 6. Slow warm breathing orbs ──────────────────────── */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 400, height: 300,
          top: '24%', left: '26%',
          background: 'radial-gradient(ellipse, rgba(200,138,48,0.060) 0%, transparent 70%)',
          filter: 'blur(46px)',
        }}
        animate={{ y: [0, -18, 0], x: [0, 11, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 320, height: 230,
          top: '38%', right: '20%',
          background: 'radial-gradient(ellipse, rgba(180,118,40,0.055) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* ── 7. Light vignette — sides only, VERY soft ────────── */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 112% 80% at 50% 40%,
          transparent 40%,
          rgba(10,7,3,0.45) 100%)`,
      }} />

    </div>
  );
}
