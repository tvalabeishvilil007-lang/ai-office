import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// Button — premium glassmorphism button system
// ─────────────────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'ghost' | 'glass' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: cn(
    'bg-gradient-to-r from-blue-600 to-indigo-600',
    'text-white font-semibold',
    'shadow-glow-blue hover:shadow-glow-blue',
    'hover:from-blue-500 hover:to-indigo-500',
    'border border-blue-500/30',
  ),
  ghost: cn(
    'bg-transparent text-slate-300 hover:text-white',
    'hover:bg-white/[0.06]',
    'border border-transparent hover:border-white/[0.08]',
  ),
  glass: cn(
    'bg-white/[0.06] text-slate-200 hover:text-white',
    'hover:bg-white/[0.10]',
    'border border-white/[0.08] hover:border-white/[0.15]',
    'backdrop-blur-md',
  ),
  outline: cn(
    'bg-transparent text-slate-300 hover:text-white',
    'border border-white/[0.15] hover:border-white/[0.30]',
    'hover:bg-white/[0.04]',
  ),
  danger: cn(
    'bg-rose-600/20 text-rose-400 hover:text-rose-300',
    'border border-rose-500/20 hover:border-rose-500/40',
    'hover:bg-rose-600/30',
  ),
};

const sizeStyles = {
  xs: 'text-xs px-2.5 py-1.5 gap-1.5',
  sm: 'text-sm px-3.5 py-2 gap-2',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-5 py-3 gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'glass',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl',
          'font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
          'disabled:opacity-40 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
