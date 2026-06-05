import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAgentManager, type AgentManagerReturn } from '../hooks/useAgentManager';
import { useMode } from './ModeContext';

// ─────────────────────────────────────────────────────────────────────────────
// AgentManagerContext — app-wide agent roster (built-ins + custom)
// Filters visibleAgents by current work/study mode.
// ─────────────────────────────────────────────────────────────────────────────

const Ctx = createContext<AgentManagerReturn | null>(null);

export function AgentManagerProvider({ children }: { children: ReactNode }) {
  const manager    = useAgentManager();
  const { mode }   = useMode();

  // Filter visible agents by mode: work agents have mode=undefined/'work', study agents have mode='study'
  const filtered = useMemo<AgentManagerReturn>(() => ({
    ...manager,
    visibleAgents: manager.visibleAgents.filter(a => (a.mode ?? 'work') === mode),
  }), [manager, mode]);

  return <Ctx.Provider value={filtered}>{children}</Ctx.Provider>;
}

export function useAgents(): AgentManagerReturn {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAgents must be used inside AgentManagerProvider');
  return ctx;
}
