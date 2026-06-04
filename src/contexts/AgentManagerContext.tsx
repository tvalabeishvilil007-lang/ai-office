import { createContext, useContext, type ReactNode } from 'react';
import { useAgentManager, type AgentManagerReturn } from '../hooks/useAgentManager';

// ─────────────────────────────────────────────────────────────────────────────
// AgentManagerContext — app-wide agent roster (built-ins + custom)
// ─────────────────────────────────────────────────────────────────────────────

const Ctx = createContext<AgentManagerReturn | null>(null);

export function AgentManagerProvider({ children }: { children: ReactNode }) {
  const manager = useAgentManager();
  return <Ctx.Provider value={manager}>{children}</Ctx.Provider>;
}

export function useAgents(): AgentManagerReturn {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAgents must be used inside AgentManagerProvider');
  return ctx;
}
