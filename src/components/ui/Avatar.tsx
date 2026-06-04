import { cn } from '../../utils/cn';
import { StatusDot } from './StatusDot';
import type { AgentStatus } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar — agent emoji avatar with optional status indicator
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarProps {
  emoji: string;
  name: string;
  accentColor: string;
  glowColor: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: AgentStatus;
  isFeatured?: boolean;
  className?: string;
}

const sizeCfg = {
  sm: { outer: 'w-9 h-9',   text: 'text-lg',  dot: 'sm' as const },
  md: { outer: 'w-12 h-12', text: 'text-2xl', dot: 'md' as const },
  lg: { outer: 'w-16 h-16', text: 'text-3xl', dot: 'md' as const },
  xl: { outer: 'w-24 h-24', text: 'text-5xl', dot: 'lg' as const },
};

export function Avatar({
  emoji,
  name,
  accentColor,
  glowColor,
  size = 'md',
  status,
  isFeatured = false,
  className,
}: AvatarProps) {
  const cfg = sizeCfg[size];

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-2xl flex items-center justify-center select-none',
          'border transition-all duration-300',
          cfg.outer,
          cfg.text,
        )}
        style={{
          background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
          borderColor: `${accentColor}30`,
          boxShadow: isFeatured
            ? `0 0 28px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.08)`
            : `0 0 12px ${glowColor}60, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
        aria-label={name}
        role="img"
      >
        {emoji}
      </div>

      {status && (
        <StatusDot
          status={status}
          size={cfg.dot}
          className="absolute -bottom-0.5 -right-0.5 ring-2 ring-black/40"
        />
      )}
    </div>
  );
}
