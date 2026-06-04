import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, CheckCircle2, Zap, Monitor } from 'lucide-react';
import type { Agent } from '../../types';
import { Avatar } from '../ui/Avatar';
import { StatusBadge, Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// AgentCard — workstation / desk visual style
//
// Featured (Юрист Грузии): Executive desk — large monitor, gold glow
// Regular: Compact workstation card — subtle screen light, tight layout
//
// Visual-only — navigation via onOpen prop (no router inside)
// ─────────────────────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: Agent;
  index?: number;
  onOpen?: (agent: Agent) => void;
}

// ── Shared stat ────────────────────────────────────────────────────────────────
function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label?: string }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {icon}
      <span className="font-bold text-slate-300">{value}</span>
      {label && <span className="text-slate-600 text-[10px]">{label}</span>}
    </div>
  );
}

// ── Featured — Executive desk card ────────────────────────────────────────────
function FeaturedAgentCard({ agent, onOpen }: { agent: Agent; onOpen?: (a: Agent) => void }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4 }}
      className="relative w-full overflow-hidden rounded-3xl cursor-pointer"
      style={{
        background: `linear-gradient(145deg,
          rgba(16,18,32,0.95) 0%,
          rgba(10,12,24,0.98) 60%,
          rgba(14,16,28,0.96) 100%)`,
        border: `1px solid ${agent.accentColor}35`,
        boxShadow: `
          0 0 0 1px ${agent.accentColor}18,
          0 20px 60px rgba(0,0,0,0.7),
          0 0 80px ${agent.glowColor},
          inset 0 1px 0 rgba(255,255,255,0.08),
          inset 0 0 40px rgba(0,0,0,0.3)
        `,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      onClick={() => onOpen?.(agent)}
    >
      {/* Background ambient glow sweep */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 50%, ${agent.accentColor}10 0%, transparent 55%),
            radial-gradient(ellipse 60% 80% at 80% 20%, ${agent.accentColor}06 0%, transparent 50%)
          `,
        }}
      />

      {/* Monitor screen — top section */}
      <div
        className="relative"
        style={{
          background: `linear-gradient(180deg,
            rgba(8,12,26,0.95) 0%,
            rgba(6,9,20,0.9) 100%)`,
          borderBottom: `1px solid ${agent.accentColor}20`,
        }}
      >
        {/* Screen top bar */}
        <div
          className="flex items-center gap-1.5 px-4 pt-3 pb-2"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
        >
          <Monitor size={10} className="text-slate-600" />
          <span className="text-[9px] text-slate-600 font-mono tracking-wider">
            WORKSTATION · {agent.id.toUpperCase()}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500/60" />
            <span className="w-2 h-2 rounded-full bg-amber-500/60" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
          </div>
        </div>

        {/* Screen content */}
        <div className="p-5 flex gap-5 items-start">
          <Avatar
            emoji={agent.avatar}
            name={agent.name}
            accentColor={agent.accentColor}
            glowColor={agent.glowColor}
            size="xl"
            status={agent.status}
            isFeatured
          />

          <div className="flex-1 min-w-0">
            {/* Badge row */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${agent.accentColor}18`,
                  border: `1px solid ${agent.accentColor}30`,
                  color: agent.accentColor,
                }}
              >
                <Star size={8} fill="currentColor" />
                ГЛАВНЫЙ АГЕНТ
              </span>
              <StatusBadge status={agent.status} />
            </div>

            <h2 className="text-2xl font-extrabold text-white leading-tight tracking-tight">
              {agent.name}
            </h2>
            <p
              className="text-sm font-semibold mt-0.5 mb-3"
              style={{ color: agent.accentColor }}
            >
              {agent.title}
            </p>

            <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-2 mb-4">
              {agent.description}
            </p>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map((s) => (
                <Badge key={s.id} variant="gold" size="xs">
                  {s.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Screen bottom glow line */}
        <div
          className="h-px mx-5 mb-0"
          style={{
            background: `linear-gradient(90deg,
              transparent 0%,
              ${agent.accentColor}40 30%,
              ${agent.accentColor}60 50%,
              ${agent.accentColor}40 70%,
              transparent 100%)`,
          }}
        />
      </div>

      {/* Desk surface — bottom section */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-5">
          <Stat
            icon={<CheckCircle2 size={13} className="text-emerald-400" />}
            value={agent.tasksCompleted}
            label="выполнено"
          />
          <Stat
            icon={<Zap size={13} className="text-blue-400" />}
            value={agent.activeTaskCount}
            label="активных"
          />
          <Stat
            icon={<Star size={12} className="text-amber-400" fill="currentColor" />}
            value={agent.rating}
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          rightIcon={<ArrowRight size={14} />}
          onClick={(e) => { e.stopPropagation(); onOpen?.(agent); }}
          style={{
            background: `linear-gradient(135deg, ${agent.accentColor}dd, ${agent.accentColor}aa)`,
            borderColor: `${agent.accentColor}40`,
            boxShadow: `0 0 20px ${agent.glowColor}`,
          }}
        >
          Открыть кабинет
        </Button>
      </div>
    </motion.article>
  );
}

// ── Regular — Compact workstation card ────────────────────────────────────────
function RegularAgentCard({
  agent,
  index = 0,
  onOpen,
}: {
  agent: Agent;
  index?: number;
  onOpen?: (a: Agent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.15 + index * 0.07,
      }}
      whileHover={{ y: -5, scale: 1.015 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{
        background: `linear-gradient(160deg,
          rgba(12,15,28,0.96) 0%,
          rgba(8,10,20,0.98) 100%)`,
        border: `1px solid ${hovered ? agent.accentColor + '35' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered
          ? `0 4px 32px rgba(0,0,0,0.6), 0 0 24px ${agent.glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`
          : `0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
      onClick={() => onOpen?.(agent)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Screen glow bleed from top */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none transition-opacity duration-300"
        style={{
          height: '55%',
          background: `radial-gradient(ellipse 90% 70% at 50% 0%,
            ${agent.glowColor} 0%,
            transparent 70%)`,
          opacity: 0.6,
        }}
      />
      {/* Hover: intensify glow */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          height: '55%',
          background: `radial-gradient(ellipse 90% 70% at 50% 0%,
            ${agent.glowColor} 0%,
            transparent 70%)`,
        }}
      />

      {/* Monitor top bar */}
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{
          background: `linear-gradient(90deg,
            ${agent.accentColor}10 0%,
            transparent 100%)`,
          borderBottom: `1px solid ${agent.accentColor}15`,
        }}
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-sm shrink-0"
          style={{
            background: `${agent.accentColor}18`,
            border: `1px solid ${agent.accentColor}25`,
          }}
        >
          {agent.avatar}
        </div>
        <span
          className="text-[10px] font-bold tracking-widest uppercase truncate"
          style={{ color: agent.accentColor }}
        >
          {agent.name}
        </span>
        <div className="ml-auto shrink-0">
          <StatusBadge status={agent.status} className="text-[9px] px-1.5 py-0.5" />
        </div>
      </div>

      {/* Card body */}
      <div className="px-3 pt-3 pb-2">
        {/* Role */}
        <p className="text-[11px] text-slate-500 mb-2 leading-tight">
          {agent.title}
        </p>

        {/* Description — compact */}
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
          {agent.description}
        </p>

        {/* Skills — max 2 + count */}
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.skills.slice(0, 2).map((s) => (
            <Badge key={s.id} size="xs" className="text-[9px]">
              {s.label}
            </Badge>
          ))}
          {agent.skills.length > 2 && (
            <Badge size="xs" className="text-[9px]">
              +{agent.skills.length - 2}
            </Badge>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-3 mb-0 h-px"
        style={{
          background: `linear-gradient(90deg,
            transparent 0%, ${agent.accentColor}25 50%, transparent 100%)`,
        }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Stat
            icon={<CheckCircle2 size={10} className="text-emerald-400" />}
            value={agent.tasksCompleted}
          />
          {agent.activeTaskCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px] font-semibold"
              style={{ color: agent.accentColor }}
            >
              <Zap size={9} />
              {agent.activeTaskCount}
            </span>
          )}
        </div>

        <button
          className={cn(
            'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg',
            'transition-all duration-200',
            'opacity-60 group-hover:opacity-100',
          )}
          style={{
            color: agent.accentColor,
            background: `${agent.accentColor}12`,
            border: `1px solid ${agent.accentColor}20`,
          }}
          onClick={(e) => { e.stopPropagation(); onOpen?.(agent); }}
        >
          Кабинет
          <ArrowRight size={10} />
        </button>
      </div>
    </motion.article>
  );
}

// ── Public export ──────────────────────────────────────────────────────────────
export function AgentCard({ agent, index, onOpen }: AgentCardProps) {
  return agent.isFeatured
    ? <FeaturedAgentCard agent={agent} onOpen={onOpen} />
    : <RegularAgentCard  agent={agent} index={index} onOpen={onOpen} />;
}
