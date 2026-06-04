import { cn } from '../../utils/cn';
import type { AgentStatus } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// StatusDot — animated status indicator
// status: 'active' | 'busy' | 'idle' | 'offline' | 'typing'
// ─────────────────────────────────────────────────────────────────────────────

type ExtendedStatus = AgentStatus | 'typing';

interface StatusDotProps {
  status: ExtendedStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const dotSizes = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const statusConfig: Record<ExtendedStatus, {
  color: string;
  label: string;
  pulse?: boolean;
  glow?: string;
}> = {
  active:  { color: '#34d399', label: 'онлайн',  pulse: true,  glow: 'rgba(52,211,153,0.8)' },
  busy:    { color: '#fbbf24', label: 'занят',    pulse: true,  glow: 'rgba(251,191,36,0.8)'  },
  idle:    { color: '#94a3b8', label: 'неактивен' },
  offline: { color: '#475569', label: 'офлайн'   },
  typing:  { color: '#818cf8', label: 'печатает', pulse: true,  glow: 'rgba(129,140,248,0.8)' },
};

// ── Typing indicator (three bouncing dots) ────────────────────────────────────
export function TypingIndicator({ color = '#818cf8' }: { color?: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="typing-dot inline-block w-1 h-1 rounded-full"
          style={{
            background: color,
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

// ── Main StatusDot ────────────────────────────────────────────────────────────
export function StatusDot({ status, size = 'md', className, showLabel }: StatusDotProps) {
  const cfg = statusConfig[status] ?? statusConfig.offline;

  // 'typing' renders three animated dots instead of a single circle
  if (status === 'typing') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <TypingIndicator color={cfg.color} />
        {showLabel && (
          <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 shrink-0', className)}>
      <span
        className={cn('rounded-full inline-block shrink-0', dotSizes[size])}
        style={{
          background: cfg.color,
          boxShadow: cfg.glow ? `0 0 8px ${cfg.glow}` : undefined,
          animation: cfg.pulse ? 'statusPulse 2s ease-in-out infinite' : undefined,
        }}
      />
      {showLabel && (
        <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}

// ── Status label only (text) ──────────────────────────────────────────────────
export function StatusLabel({ status }: { status: ExtendedStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.offline;
  return (
    <span className="text-[11px] font-medium" style={{ color: cfg.color }}>
      {status === 'typing' ? (
        <span className="flex items-center gap-1">
          <TypingIndicator color={cfg.color} />
          {cfg.label}
        </span>
      ) : (
        <>● {cfg.label}</>
      )}
    </span>
  );
}
