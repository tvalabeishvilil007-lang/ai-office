import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useCountUp — animates a number from 0 to `target` on mount / value change
//
// Usage:
//   const displayed = useCountUp(agent.tasksCompleted, { duration: 800 });
// ─────────────────────────────────────────────────────────────────────────────

interface UseCountUpOptions {
  duration?: number;   // ms, default 700
  decimals?: number;   // decimal places, default 0
  delay?: number;      // start delay in ms, default 0
}

export function useCountUp(
  target: number,
  { duration = 700, decimals = 0, delay = 0 }: UseCountUpOptions = {},
): string {
  const [current, setCurrent] = useState(0);
  const frameRef              = useRef<number | null>(null);
  const startRef              = useRef<number | null>(null);
  const prevTarget            = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;

    if (from === target) return;

    const startAnimation = () => {
      startRef.current = null;

      const animate = (timestamp: number) => {
        if (startRef.current === null) startRef.current = timestamp;
        const elapsed  = timestamp - startRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(from + (target - from) * eased);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrent(target);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    };

    const timer = delay > 0
      ? setTimeout(startAnimation, delay)
      : (startAnimation(), undefined);

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return current.toFixed(decimals);
}
