import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar — animated progress indicator
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;          // 0–100
  color?: string;         // hex or rgb
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };

export function ProgressBar({
  value,
  color = '#3b82f6',
  size = 'sm',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-white/[0.06] overflow-hidden', sizeMap[size])}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-400 w-8 shrink-0 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
