import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// GlassCard — reusable glassmorphism container
// ─────────────────────────────────────────────────────────────────────────────

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /** Intensity of the glass effect */
  variant?: 'default' | 'dark' | 'elevated';
  /** Hover interaction */
  hoverable?: boolean;
  /** Inner padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Optional glow color (rgba string) */
  glow?: string;
}

const paddingMap = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

const variantMap = {
  default:  'bg-white/[0.04] border border-white/[0.07] backdrop-blur-xl',
  dark:     'bg-black/30 border border-white/[0.05] backdrop-blur-2xl',
  elevated: 'bg-white/[0.06] border border-white/[0.10] backdrop-blur-xl shadow-glass-lg',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      padding = 'md',
      glow,
      className,
      style,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-2xl relative overflow-hidden',
          variantMap[variant],
          paddingMap[padding],
          hoverable && 'glass-hover cursor-pointer',
          className,
        )}
        style={{
          boxShadow: glow
            ? `0 0 32px ${glow}, 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`
            : undefined,
          ...style,
        }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);

GlassCard.displayName = 'GlassCard';
