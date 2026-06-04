import { createContext, useContext, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { AGENTS } from '../data/agents';
import type { AgentStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// AgentStatusContext — computes live agent statuses from real task data.
//
// Rules:
//   running tasks  → agent is 'busy'
//   pending tasks  → agent is 'active'   (unless already 'busy')
//   no open tasks  → agent is 'idle'     (unless static data says 'offline')
//   offline (static) always stays 'offline'
// ─────────────────────────────────────────────────────────────────────────────

export type AgentStatusMap = Record<string, AgentStatus>;

const AgentStatusContext = createContext<AgentStatusMap>({});

// Static fallback map (id → static status from agents.ts)
const STATIC_STATUS = Object.fromEntries(AGENTS.map(a => [a.id, a.status]));

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  const { allTasks } = useTasks();

  const statusMap = useMemo((): AgentStatusMap => {
    // Start from static data
    const map: AgentStatusMap = { ...STATIC_STATUS };

    for (const task of allTasks) {
      // Never override offline agents
      if (STATIC_STATUS[task.agentId] === 'offline') continue;

      if (task.status === 'running') {
        // running always wins → busy
        map[task.agentId] = 'busy';
      } else if (task.status === 'pending') {
        // pending → active (unless already marked busy by a running task)
        if (map[task.agentId] !== 'busy') {
          map[task.agentId] = 'active';
        }
      }
    }

    // Non-offline agents with no open tasks → idle
    for (const agent of AGENTS) {
      if (agent.status === 'offline') continue;
      const hasOpenTask = allTasks.some(
        t => t.agentId === agent.id && (t.status === 'running' || t.status === 'pending'),
      );
      if (!hasOpenTask) {
        map[agent.id] = 'idle';
      }
    }

    return map;
  }, [allTasks]);

  return (
    <AgentStatusContext.Provider value={statusMap}>
      {children}
    </AgentStatusContext.Provider>
  );
}

/** Returns the full status map { agentId → AgentStatus } */
export function useAgentStatuses(): AgentStatusMap {
  return useContext(AgentStatusContext);
}

/** Returns the live status for one agent (falls back to static data) */
export function useAgentStatus(agentId: string): AgentStatus {
  const map = useContext(AgentStatusContext);
  return map[agentId] ?? (STATIC_STATUS[agentId] ?? 'idle');
}
