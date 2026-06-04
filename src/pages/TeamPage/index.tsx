import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, CheckCircle2, Star, Zap } from 'lucide-react';
import { StatusDot } from '../../components/ui/StatusDot';
import { useAgents } from '../../contexts/AgentManagerContext';
import { useTasks } from '../../hooks/useTasks';
import { GlassCard } from '../../components/ui/GlassCard';
import { Topbar } from '../../components/layout/Topbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { useAgentStatuses } from '../../contexts/AgentStatusContext';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// TeamPage — all agents overview
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  active:  'Активен',
  busy:    'Занят',
  idle:    'Простаивает',
  offline: 'Офлайн',
};

export function TeamPage() {
  const navigate = useNavigate();
  const agentStatuses = useAgentStatuses();
  const { visibleAgents } = useAgents();
  const { allTasks } = useTasks();

  // Real per-agent task counts from Supabase
  const taskStats = useMemo(() => {
    const map: Record<string, { completed: number; active: number }> = {};
    for (const t of allTasks) {
      if (!map[t.agentId]) map[t.agentId] = { completed: 0, active: 0 };
      if (t.status === 'done')    map[t.agentId].completed += 1;
      if (t.status === 'running') map[t.agentId].active    += 1;
    }
    return map;
  }, [allTasks]);

  return (
    <div className="flex h-screen bg-[#070a12] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Команда" />
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Ваши AI-сотрудники</h2>
            <p className="text-sm text-slate-500 mt-1">
              {visibleAgents.filter(a => a.status !== 'offline').length} активных · {visibleAgents.length} всего
            </p>
          </div>

          {/* Agent grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleAgents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard
                  variant="default"
                  padding="none"
                  hoverable
                  className="cursor-pointer overflow-hidden group"
                  onClick={() => navigate(`/agent/${agent.slug}`)}
                >
                  {/* Accent top bar */}
                  <div className="h-1 w-full" style={{ background: agent.accentColor }} />

                  <div className="p-5">
                    {/* Avatar + status */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border"
                        style={{ background: `${agent.accentColor}14`, borderColor: `${agent.accentColor}28` }}
                      >
                        {agent.avatar}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium"
                           style={{ color: (agentStatuses[agent.id] ?? agent.status) === 'active' ? '#10b981' : (agentStatuses[agent.id] ?? agent.status) === 'busy' ? '#f59e0b' : '#6b7280' }}>
                        <StatusDot status={agentStatuses[agent.id] ?? agent.status} size="sm" />
                        {STATUS_LABEL[agentStatuses[agent.id] ?? agent.status]}
                      </div>
                    </div>

                    {/* Name + title */}
                    <h3 className="text-sm font-bold text-slate-200 leading-tight">{agent.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">{agent.title}</p>

                    {/* Stats row — real Supabase counts */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        {taskStats[agent.id]?.completed ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={10} className="text-blue-400" />
                        {taskStats[agent.id]?.active ?? 0} задач
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={10} className="text-amber-400" />
                        {agent.rating}
                      </span>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1">
                      {agent.skills.slice(0, 2).map(s => (
                        <span
                          key={s.id}
                          className="text-[10px] px-2 py-0.5 rounded-full border"
                          style={{ borderColor: `${agent.accentColor}30`, color: agent.accentColor, background: `${agent.accentColor}10` }}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hover footer */}
                  <div className={cn(
                    'px-5 py-3 border-t border-white/[0.05] flex items-center gap-2',
                    'text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity',
                  )} style={{ color: agent.accentColor }}>
                    <MessageSquare size={11} />
                    Открыть чат
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

        </main>
      </div>
      <MobileNav />
    </div>
  );
}
