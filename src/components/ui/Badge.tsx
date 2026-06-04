import { cn } from '../../utils/cn';
import type { AgentStatus } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Badge — status / skill / label chip
// ─────────────────────────────────────────────────────────────────────────────

// Status badge
interface StatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

const statusConfig: Record<AgentStatus, { label: string; bg: string; text: string; dot: string }> = {
  active:  { label: 'Активен',  bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  busy:    { label: 'Занят',    bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  idle:    { label: 'Ожидает', bg: 'bg-slate-500/10',   text: 'text-slate-400',   dot: 'bg-slate-400'   },
  offline: { label: 'Оффлайн', bg: 'bg-slate-700/20',   text: 'text-slate-500',   dot: 'bg-slate-600'   },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          cfg.dot,
          status === 'active' && 'status-pulse',
        )}
      />
      {cfg.label}
    </span>
  );
}

// Generic badge (for skills, labels, tiers)
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'violet' | 'gold' | 'emerald' | 'rose' | 'sky' | 'orange';
  size?: 'xs' | 'sm';
  className?: string;
}

const badgeVariants = {
  default: 'bg-white/[0.06] text-slate-300 border-white/[0.08]',
  blue:    'bg-blue-500/10 text-blue-300 border-blue-500/20',
  violet:  'bg-violet-500/10 text-violet-300 border-violet-500/20',
  gold:    'bg-amber-500/10 text-amber-300 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  rose:    'bg-rose-500/10 text-rose-300 border-rose-500/20',
  sky:     'bg-sky-500/10 text-sky-300 border-sky-500/20',
  orange:  'bg-orange-500/10 text-orange-300 border-orange-500/20',
};

const sizeVariants = {
  xs: 'text-[10px] px-2 py-0.5',
  sm: 'text-xs px-2.5 py-1',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        badgeVariants[variant],
        sizeVariants[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
