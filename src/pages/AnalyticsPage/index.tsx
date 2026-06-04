import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Zap, Star, TrendingUp, Users,
  BarChart3, Activity, Clock, CalendarClock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useTasks } from '../../hooks/useTasks';
import { useAgents } from '../../contexts/AgentManagerContext';
import { useAgentStatuses } from '../../contexts/AgentStatusContext';
import { StatusDot } from '../../components/ui/StatusDot';
import { GlassCard } from '../../components/ui/GlassCard';
import { Topbar } from '../../components/layout/Topbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsPage — team performance with REAL Supabase data
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = [
  { key: 'active'  as const, label: 'Активен',    color: '#10b981' },
  { key: 'busy'    as const, label: 'Занят',       color: '#f59e0b' },
  { key: 'idle'    as const, label: 'Простаивает', color: '#6b7280' },
  { key: 'offline' as const, label: 'Офлайн',      color: '#374151' },
];

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#3b82f6',
  low:      '#6b7280',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Критичный',
  high:     'Высокий',
  medium:   'Средний',
  low:      'Низкий',
};

export function AnalyticsPage() {
  const { visibleAgents }     = useAgents();
  const { allTasks, loading } = useTasks();
  const agentStatuses = useAgentStatuses();

  const onlineAgents = visibleAgents.filter(a => {
    const s = agentStatuses[a.id] ?? a.status;
    return s === 'active' || s === 'busy';
  }).length;

  const avgRating = visibleAgents.length > 0
    ? (visibleAgents.reduce((s, a) => s + a.rating, 0) / visibleAgents.length).toFixed(1)
    : '—';

  // ── Real KPIs from Supabase ─────────────────────────────────────────────────
  const totalTasks   = allTasks.length;
  const runningTasks = allTasks.filter(t => t.status === 'running').length;
  const doneTasks    = allTasks.filter(t => t.status === 'done').length;

  // ── 7-day activity chart ────────────────────────────────────────────────────
  const weekData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toISOString().split('T')[0];
      const label  = d.toLocaleDateString('ru-RU', { weekday: 'short' });
      const created = allTasks.filter(t => t.createdAt.startsWith(dayStr)).length;
      const done    = allTasks.filter(t => t.status === 'done' && t.updatedAt.startsWith(dayStr)).length;
      return { label, created, done };
    });
  }, [allTasks]);


  // ── Tasks per agent ─────────────────────────────────────────────────────────
  const agentTaskCounts = useMemo(() => visibleAgents.map(a => ({
    agent:   a,
    total:   allTasks.filter(t => t.agentId === a.id).length,
    running: allTasks.filter(t => t.agentId === a.id && t.status === 'running').length,
    done:    allTasks.filter(t => t.agentId === a.id && t.status === 'done').length,
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total), [allTasks, visibleAgents]);

  // ── Priority breakdown ──────────────────────────────────────────────────────
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    allTasks.forEach(t => { counts[t.priority] = (counts[t.priority] ?? 0) + 1; });
    return counts;
  }, [allTasks]);

  // Real ranking: sorted by total tasks from Supabase
  const maxTaskCount = Math.max(1, ...agentTaskCounts.map(x => x.total));

  // ── Deadline timeline — reads localStorage due-date map per agent ──────────
  const deadlineItems = useMemo(() => {
    type DeadlineItem = { task: (typeof allTasks)[0]; dueDate: string; agent: (typeof visibleAgents)[0] };
    const items: DeadlineItem[] = [];
    for (const agent of visibleAgents) {
      try {
        const stored = JSON.parse(
          localStorage.getItem(`tasks:due:${agent.id}`) ?? '{}',
        ) as Record<string, string>;
        for (const [taskId, dueDate] of Object.entries(stored)) {
          const task = allTasks.find(t => t.id === taskId);
          if (task && task.status !== 'done') items.push({ task, dueDate, agent });
        }
      } catch { /* skip */ }
    }
    return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [allTasks, visibleAgents]);

  const STATS = [
    { label: 'Всего задач',   value: loading ? '…' : totalTasks.toString(),   icon: BarChart3,    color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)'  },
    { label: 'Выполняется',   value: loading ? '…' : runningTasks.toString(), icon: Zap,          color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)'  },
    { label: 'Завершено',     value: loading ? '…' : doneTasks.toString(),    icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)'  },
    { label: 'Агентов онлайн', value: `${onlineAgents}/${visibleAgents.length}`,     icon: Users,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)'  },
  ];

  return (
    <div className="flex h-screen bg-[#070a12] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Аналитика" />
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Аналитика команды</h2>
            <p className="text-sm text-slate-500 mt-1">Реальные данные · обновляется автоматически</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <GlassCard variant="default" padding="md" className="h-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1.5 leading-tight">{stat.label}</p>
                      <p className="text-2xl font-bold text-white leading-none">{stat.value}</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                      <stat.icon size={17} style={{ color: stat.color }} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Left: agent performance ranking (historical) */}
            <div className="lg:col-span-2 space-y-4">

              {/* 7-day area chart — recharts */}
              <GlassCard variant="default" padding="none">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <BarChart3 size={14} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Активность за 7 дней</h3>
                  <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Создано</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Завершено</span>
                  </div>
                </div>
                <div className="px-2 py-4">
                  {allTasks.length === 0 && !loading ? (
                    <div className="h-24 flex items-center justify-center text-slate-600 text-sm">
                      Нет данных — создайте первые задачи
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={weekData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: '#0c1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                          labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Area type="monotone" dataKey="created" name="Создано"  stroke="#3b82f6" fill="url(#gradCreated)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="done"    name="Завершено" stroke="#10b981" fill="url(#gradDone)"    strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>

              {/* Agent rankings — real data from Supabase */}
              <GlassCard variant="default" padding="none">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <TrendingUp size={14} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Рейтинг агентов</h3>
                  <span className="ml-auto text-[10px] text-slate-600">по задачам</span>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center h-16">
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                  </div>
                ) : agentTaskCounts.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs text-slate-600">Создайте задачи — они появятся здесь</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {agentTaskCounts.map(({ agent, total, done }, i) => (
                      <motion.div key={agent.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 + 0.1 }}
                        className="px-5 py-3 flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600 w-5 text-center shrink-0">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                          style={{ background: `${agent.accentColor}14`, border: `1px solid ${agent.accentColor}28` }}>
                          {agent.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold text-slate-200 truncate">{agent.name}</p>
                            <StatusDot status={agent.status} size="sm" />
                          </div>
                          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ background: agent.accentColor }}
                              initial={{ width: 0 }} animate={{ width: `${(total / maxTaskCount) * 100}%` }}
                              transition={{ delay: i * 0.04 + 0.3, duration: 0.7 }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0 w-12">
                          <p className="text-sm font-bold text-white">{total}</p>
                          <p className="text-[9px] text-slate-500">{done > 0 ? `${done} готово` : 'задач'}</p>
                        </div>
                        <div className="text-right shrink-0 w-10 hidden sm:block">
                          <div className="flex items-center gap-1 justify-end">
                            <Star size={9} className="text-amber-400" />
                            <p className="text-xs font-semibold text-slate-300">{agent.rating}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">

              {/* Real tasks per agent */}
              <GlassCard variant="default" padding="none">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Clock size={14} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Задачи в работе</h3>
                </div>
                <div className="p-5">
                  {loading ? (
                    <div className="flex items-center justify-center h-16">
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    </div>
                  ) : agentTaskCounts.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-4">Нет активных задач</p>
                  ) : (
                    <div className="space-y-3">
                      {agentTaskCounts.map(({ agent, total, running, done }) => (
                        <div key={agent.id} className="flex items-center gap-3">
                          <span className="text-base shrink-0">{agent.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 truncate">{agent.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {running > 0 && <span className="text-[10px] text-blue-400">{running} в работе</span>}
                              {done > 0 && <span className="text-[10px] text-emerald-400">{done} готово</span>}
                            </div>
                          </div>
                          <span className="text-xs font-bold shrink-0" style={{ color: agent.accentColor }}>{total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Status breakdown */}
              <GlassCard variant="default" padding="none">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Activity size={14} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Статусы агентов</h3>
                </div>
                <div className="p-5 space-y-3">
                  {STATUS_CONFIG.map((cfg, i) => {
                    const count   = visibleAgents.filter(a => (agentStatuses[a.id] ?? a.status) === cfg.key).length;
                    const percent = visibleAgents.length > 0 ? Math.round((count / visibleAgents.length) * 100) : 0;
                    return (
                      <motion.div key={cfg.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 + 0.2 }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <StatusDot status={cfg.key} size="sm" />
                            <span className="text-xs text-slate-400">{cfg.label}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-300">
                            {count}<span className="text-slate-600 font-normal ml-1">({percent}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: cfg.color }}
                            initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                            transition={{ delay: i * 0.07 + 0.4, duration: 0.6 }} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Priority breakdown — pie chart */}
              {allTasks.length > 0 && (
                <GlassCard variant="default" padding="none">
                  <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Zap size={14} className="text-rose-400" />
                    <h3 className="text-sm font-bold text-white">По приоритету</h3>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-4">
                    {/* Donut chart */}
                    <PieChart width={96} height={96}>
                      <Pie
                        data={Object.entries(priorityCounts)
                          .filter(([, v]) => v > 0)
                          .map(([p, v]) => ({ name: PRIORITY_LABEL[p], value: v, color: PRIORITY_COLOR[p] }))}
                        cx={44} cy={44}
                        innerRadius={28} outerRadius={44}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {Object.entries(priorityCounts)
                          .filter(([, v]) => v > 0)
                          .map(([p]) => (
                            <Cell key={p} fill={PRIORITY_COLOR[p]} />
                          ))}
                      </Pie>
                    </PieChart>
                    {/* Legend */}
                    <div className="flex-1 space-y-1.5">
                      {Object.entries(priorityCounts).filter(([, v]) => v > 0).map(([p, count]) => (
                        <div key={p} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[p] }} />
                            <span className="text-[11px] text-slate-400">{PRIORITY_LABEL[p]}</span>
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: PRIORITY_COLOR[p] }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Avg rating */}
              <GlassCard variant="default" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 mb-1">Средний рейтинг команды</p>
                    <p className="text-2xl font-bold text-white">{avgRating}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Star size={17} className="text-amber-400" />
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* ── Deadline timeline ────────────────────────────────────────── */}
          {deadlineItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <GlassCard variant="default" padding="none">
                <div
                  className="px-5 py-3.5 flex items-center gap-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <CalendarClock size={14} className="text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Дедлайны</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500">
                    {deadlineItems.length} задач с дедлайном
                  </span>
                </div>

                {/* Horizontal timeline */}
                <div className="px-5 py-4 overflow-x-auto">
                  <div className="flex gap-3 min-w-max pb-1">
                    {deadlineItems.map(({ task, dueDate, agent }, i) => {
                      const now    = new Date();
                      const due    = new Date(dueDate);
                      const diff   = due.getTime() - now.getTime();
                      const days   = diff / (1000 * 60 * 60 * 24);
                      const color  = days < 0 ? '#f87171' : days < 1 ? '#fb923c' : days <= 3 ? '#fbbf24' : '#64748b';
                      const label  = days < 0
                        ? `просрочено ${Math.abs(Math.ceil(days))} д.`
                        : days < 1 ? 'сегодня'
                        : days <= 1.5 ? 'завтра'
                        : `через ${Math.ceil(days)} д.`;

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex flex-col gap-1.5 w-44 shrink-0"
                        >
                          {/* Date chip */}
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold w-fit"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                          >
                            <CalendarClock size={9} />
                            {due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            <span className="opacity-70 font-normal">· {label}</span>
                          </div>

                          {/* Task card */}
                          <div
                            className="rounded-xl p-3"
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${color}30`,
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-sm leading-none">{agent.avatar}</span>
                              <span className="text-[10px] font-semibold" style={{ color: agent.accentColor }}>
                                {agent.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-snug line-clamp-2">{task.title}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                                style={{
                                  background: task.status === 'running' ? 'rgba(59,130,246,0.12)' : 'rgba(107,114,128,0.1)',
                                  color: task.status === 'running' ? '#60a5fa' : '#9ca3af',
                                }}
                              >
                                {task.status === 'running' ? 'В работе' : 'Ожидает'}
                              </span>
                            </div>
                          </div>

                          {/* Connector line */}
                          {i < deadlineItems.length - 1 && (
                            <div className="absolute" style={{ display: 'none' }} />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Timeline rail */}
                  <div className="relative mt-1 h-px bg-white/[0.05]">
                    {deadlineItems.map(({ dueDate }, i) => {
                      const earliest = new Date(deadlineItems[0].dueDate).getTime();
                      const latest   = new Date(deadlineItems[deadlineItems.length - 1].dueDate).getTime();
                      const span     = Math.max(latest - earliest, 1);
                      const pos      = ((new Date(dueDate).getTime() - earliest) / span) * 100;
                      const now      = new Date();
                      const due      = new Date(dueDate);
                      const days     = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                      const color    = days < 0 ? '#f87171' : days < 1 ? '#fb923c' : days <= 3 ? '#fbbf24' : '#64748b';
                      return (
                        <div
                          key={i}
                          className="absolute -top-1 w-2 h-2 rounded-full -translate-x-1/2"
                          style={{ left: `${pos}%`, background: color, boxShadow: `0 0 6px ${color}` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

        </main>
      </div>
      <MobileNav />
    </div>
  );
}
