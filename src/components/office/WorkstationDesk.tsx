import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// WorkstationDesk — physical desk object in the office scene.
//
// Visual anatomy (top → bottom):
//   • Person avatar    — agent emoji in a glowing circle, sits above/behind monitor
//   • Monitor          — dark bezel, colored screen glow, status strip
//   • Stand            — thin neck
//   • Desk surface     — CSS perspective rotateX makes it look horizontal
//   • Floor glow pool  — radial light on the floor below the desk
//   • Name label       — agent name printed below the workstation
//
// The person avatar overlaps with the monitor top (negative margin),
// creating the visual of a person sitting at a desk with the monitor
// partially blocking their lower half.
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstationDeskProps {
  agent: Agent;
  isExecutive?: boolean;
  onOpen?: (agent: Agent) => void;
}

export function WorkstationDesk({ agent, isExecutive = false, onOpen }: WorkstationDeskProps) {
  const [hovered, setHovered] = useState(false);

  // Dimensions — executive is ~2× larger than regular
  const mW  = isExecutive ? 300 : 140;   // monitor width
  const mH  = isExecutive ? 184 : 88;    // monitor height
  const dW  = isExecutive ? 378 : 182;   // desk surface width
  const dH  = isExecutive ? 50  : 28;    // desk surface height (pre-perspective)
  const stH = isExecutive ? 16  : 10;    // stand height
  const bH  = isExecutive ? 18  : 13;    // bezel bar height
  const pSz = isExecutive ? 52  : 34;    // person avatar circle diameter
  const pFn = isExecutive ? 26  : 18;    // person emoji font size
  const ovr = isExecutive ? 18  : 12;    // avatar overlap into monitor top (px)

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: dW, cursor: 'pointer', userSelect: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen?.(agent)}
    >

      {/* ── Hover tooltip ─────────────────────────────────────────── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="tip"
            className="absolute z-50 pointer-events-none"
            style={{
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 10,
              width: isExecutive ? 244 : 182,
            }}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.96 }}
            transition={{ duration: 0.14 }}
          >
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: 'rgba(4,6,16,0.97)',
                border: `1px solid ${agent.accentColor}42`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.8), 0 0 30px ${agent.glowColor}`,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: `${agent.accentColor}15`, border: `1px solid ${agent.accentColor}28` }}
                >
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white leading-none">{agent.name}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: agent.accentColor }}>{agent.title}</p>
                </div>
                {agent.status === 'active' && (
                  <span
                    className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.28)', color: '#10b981' }}
                  >
                    <motion.span className="w-1 h-1 rounded-full bg-emerald-400 inline-block"
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                    онлайн
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${agent.accentColor}15` }}>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[9px] text-slate-500">
                    <CheckCircle2 size={8} className="text-emerald-500" />{agent.tasksCompleted}
                  </span>
                  {agent.activeTaskCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: agent.accentColor }}>
                      <Zap size={8} />{agent.activeTaskCount}
                    </span>
                  )}
                </div>
                <span
                  className="flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: `${agent.accentColor}18`, color: agent.accentColor, border: `1px solid ${agent.accentColor}22` }}
                >
                  Кабинет <ArrowRight size={7} />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Screen ambient glow — light radiating from the monitor ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width:  mW * 2.8,
          height: (pSz + mH) * 1.8,
          background: `radial-gradient(ellipse 46% 40% at 50% 32%, ${agent.glowColor} 0%, transparent 65%)`,
          filter: `blur(${isExecutive ? 38 : 22}px)`,
          opacity: hovered ? 1.0 : 0.55,
          transition: 'opacity 0.35s ease',
          zIndex: 0,
        }}
      />

      {/* ── Person — agent sitting at the desk ───────────────────── */}
      {/* Negative marginBottom causes the monitor to overlap the bottom
          of this circle, creating the effect of someone seated behind it  */}
      <motion.div
        animate={hovered ? { y: -4, scale: 1.08 } : { y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
        style={{
          width:  pSz,
          height: pSz,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${agent.accentColor}30, ${agent.accentColor}10)`,
          border: `${isExecutive ? 2 : 1.5}px solid ${agent.accentColor}${hovered ? '55' : '32'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: pFn,
          lineHeight: 1,
          marginBottom: -ovr,
          boxShadow: `0 0 ${hovered ? 26 : 14}px ${agent.glowColor}`,
          position: 'relative',
          zIndex: 4,
          flexShrink: 0,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {agent.avatar}
      </motion.div>

      {/* ── Monitor ──────────────────────────────────────────────── */}
      <div className="relative" style={{ zIndex: 2, flexShrink: 0 }}>
        <motion.div
          animate={{
            boxShadow: hovered
              ? `0 0 0 1px ${agent.accentColor}22, 0 0 60px ${agent.glowColor}, 0 0 120px ${agent.glowColor}`
              : `0 0 0 1px ${agent.accentColor}0e, 0 0 28px ${agent.glowColor}`,
          }}
          transition={{ duration: 0.3 }}
          style={{
            width: mW,
            height: mH,
            background: '#06080d',
            borderRadius: isExecutive ? 7 : 4,
            border: `${isExecutive ? 2 : 1.5}px solid ${agent.accentColor}${hovered ? '46' : '24'}`,
            overflow: 'hidden',
            transition: 'border-color 0.3s',
          }}
        >
          {/* Bezel bar */}
          <div style={{
            height: bH,
            background: 'rgba(0,0,0,0.52)',
            borderBottom: `1px solid ${agent.accentColor}18`,
            display: 'flex', alignItems: 'center', padding: '0 7px', gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(248,113,113,0.55)', display: 'inline-block' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,191,36,0.55)',  display: 'inline-block' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(52,211,153,0.55)',  display: 'inline-block' }} />
            {agent.status === 'active' && (
              <motion.span
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981', display: 'inline-block', marginLeft: 'auto' }}
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          {/* Screen */}
          <div style={{
            height: `calc(100% - ${bH}px)`,
            background: `linear-gradient(155deg, ${agent.accentColor}0d 0%, rgba(2,4,10,0.97) 62%)`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: `4px 8px ${isExecutive ? 22 : 14}px`,
            position: 'relative',
            gap: isExecutive ? 4 : 2,
          }}>
            {/* Scanlines */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
            }} />
            {/* Glare */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(128deg, rgba(255,255,255,0.026) 0%, transparent 42%)',
            }} />

            {/* Screen content */}
            {isExecutive && (
              <div style={{
                fontSize: 13, fontWeight: 800,
                color: agent.accentColor,
                letterSpacing: '0.06em',
                position: 'relative', zIndex: 1, textAlign: 'center',
                textShadow: `0 0 20px ${agent.glowColor}`,
              }}>
                {agent.name}
              </div>
            )}
            <div style={{
              fontSize: isExecutive ? 10 : 8,
              color: `rgba(255,255,255,0.28)`,
              position: 'relative', zIndex: 1, textAlign: 'center',
              letterSpacing: '0.04em',
            }}>
              {isExecutive ? agent.title : agent.name.split(' ')[0]}
            </div>

            {/* Status strip */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: isExecutive ? 20 : 13,
              background: `linear-gradient(90deg, transparent, ${agent.accentColor}14, transparent)`,
              borderTop: `1px solid ${agent.accentColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              {agent.activeTaskCount > 0 && (
                <>
                  <motion.span
                    style={{ width: 4, height: 4, borderRadius: '50%', background: agent.accentColor, display: 'inline-block' }}
                    animate={{ opacity: [1, 0.35, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: 0.3 }}
                  />
                  <span style={{ fontSize: 8, color: agent.accentColor, opacity: 0.72 }}>
                    {agent.activeTaskCount} задач
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Monitor stand ─────────────────────────────────────────── */}
      <div style={{
        width: isExecutive ? 3 : 2,
        height: stH,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.14), rgba(255,255,255,0.03))',
        flexShrink: 0,
      }} />

      {/* ── Desk surface — rotateX makes vertical div look horizontal ─ */}
      <div style={{
        width: dW,
        height: dH,
        transformOrigin: 'top center',
        transform: 'perspective(220px) rotateX(56deg)',
        background: isExecutive
          ? 'linear-gradient(180deg, #1b1707 0%, #110e03 50%, #0c0a02 100%)'
          : 'linear-gradient(180deg, #0d1220 0%, #08101a 50%, #05080f 100%)',
        borderRadius: '3px 3px 2px 2px',
        border: `1px solid ${agent.accentColor}${isExecutive ? '30' : '14'}`,
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Surface gloss */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent, ${agent.accentColor}0b 44%, ${agent.accentColor}14 50%, ${agent.accentColor}0b 56%, transparent)`,
        }} />
        {/* Keyboard outline */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isExecutive ? 62 : 38, height: isExecutive ? 9 : 6,
          borderRadius: 2,
          background: `${agent.accentColor}1a`,
          border: `1px solid ${agent.accentColor}12`,
        }} />
      </div>

      {/* ── Floor glow pool ───────────────────────────────────────── */}
      <div style={{
        width: dW * 1.65,
        height: 20,
        borderRadius: '50%',
        background: `radial-gradient(ellipse, ${agent.glowColor} 0%, transparent 70%)`,
        filter: `blur(${isExecutive ? 18 : 11}px)`,
        marginTop: -2,
        opacity: hovered ? 0.88 : 0.40,
        transition: 'opacity 0.35s ease',
        flexShrink: 0,
      }} />

      {/* ── Name label — below the workstation ───────────────────── */}
      <div style={{
        marginTop: 5,
        fontSize: isExecutive ? 11 : 8,
        fontWeight: 700,
        color: agent.accentColor,
        letterSpacing: '0.08em',
        opacity: isExecutive ? 0.92 : 0.62,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        textShadow: `0 0 14px ${agent.glowColor}`,
        flexShrink: 0,
      }}>
        {isExecutive ? agent.name.toUpperCase() : agent.name.split(' ')[0].toUpperCase()}
      </div>

    </div>
  );
}
