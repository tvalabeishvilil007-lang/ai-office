import { motion } from 'framer-motion';
import { AGENTS } from '../../data/agents';
import { OfficeScene3D } from '../office3d';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// OfficeScene — wrapper that mounts the 3D canvas.
// Preserves the same flex-1 container and onOpen prop contract.
// ─────────────────────────────────────────────────────────────────────────────

interface OfficeSceneProps {
  onOpen?: (agent: Agent) => void;
}

export function OfficeScene({ onOpen }: OfficeSceneProps) {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">

      {/* ── 3D canvas — fills available space ── */}
      <OfficeScene3D onOpen={onOpen} />

      {/* ── HUD chip — top right ── */}
      <motion.div
        className="absolute top-2 right-3 z-30 pointer-events-none max-w-[calc(100%-24px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background:     'rgba(4,4,20,0.85)',
            border:         '1px solid rgba(99,102,241,0.25)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold shrink-0" style={{ color: '#10b981' }}>
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {AGENTS.filter(a => a.status === 'active').length} онлайн
          </span>
          <span className="text-[10px] text-slate-600 shrink-0">·</span>
          <span className="text-[10px] font-semibold hidden sm:inline" style={{ color: 'rgba(129,140,248,0.80)' }}>
            AI‑Офис активен
          </span>
        </div>
      </motion.div>

      {/* ── Controls hint — bottom left ── */}
      <motion.div
        className="absolute bottom-2 left-3 z-30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.8 }}
      >
        <p className="text-[9px] text-slate-700">
          Перетащите для поворота · Колесо — зум · Клик по сотруднику — открыть
        </p>
      </motion.div>

    </div>
  );
}
