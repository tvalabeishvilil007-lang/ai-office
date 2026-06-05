import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// SplashScreen — branding intro shown once per session on app load.
// Shows for ~2.4s then fades out, revealing the app behind it.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'splash_shown';

export function SplashScreen() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY));

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: '#040609' }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.14) 0%, transparent 70%)',
            }}
          />

          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Content */}
          <div className="relative flex flex-col items-center gap-5 select-none">

            {/* Top decorative line */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 120, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #6366f1, transparent)' }}
            />

            {/* Main title */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="text-center"
            >
              <div
                style={{
                  fontFamily: '"Courier New", "Lucida Console", monospace',
                  fontWeight: 900,
                  fontSize: 'clamp(28px, 6vw, 52px)',
                  letterSpacing: '0.35em',
                  color: '#ffffff',
                  textShadow: '0 0 24px #818cf8, 0 0 60px #6366f180',
                  paddingRight: '0.35em',
                }}
              >
                ◈ &nbsp;AI OFFICE&nbsp; ◈
              </div>
            </motion.div>

            {/* By Lasha */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="flex items-center gap-2"
            >
              <div className="h-px w-8" style={{ background: 'rgba(99,102,241,0.4)' }} />
              <span
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 'clamp(13px, 2vw, 17px)',
                  fontWeight: 500,
                  letterSpacing: '0.18em',
                  background: 'linear-gradient(90deg, #a5b4fc, #818cf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                by Lasha
              </span>
              <div className="h-px w-8" style={{ background: 'rgba(99,102,241,0.4)' }} />
            </motion.div>

            {/* Bottom decorative line */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 120, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #6366f1, transparent)' }}
            />

            {/* Subtle loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex gap-1.5 mt-1"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: '#4f46e5' }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
