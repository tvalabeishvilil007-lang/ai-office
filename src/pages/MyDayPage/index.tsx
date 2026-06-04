import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sun, CalendarClock, CheckCircle2, Clock,
  AlertTriangle, Flame, Circle, ArrowRight,
  Zap, Coins, TrendingUp, Users, MessageSquare,
  Star, ChevronRight, Activity, Building2,
} from 'lucide-react';
import { Sidebar   } from '../../components/layout/Sidebar';
import { Topbar    } from '../../components/layout/Topbar';
import { MobileNav } from '../../components/layout/MobileNav';
import { useTasks  } from '../../hooks/useTasks';
import { useAgents } from '../../contexts/AgentManagerContext';
import { getDayTotals, estimateCost } from '../../hooks/useTokens';
import { useAgentStatuses } from '../../contexts/AgentStatusContext';
import { StatusDot } from '../../components/ui/StatusDot';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// MyDayPage — personal dashboard
// ─────────────────────────────────────────────────────────────────────────────

type Urgency = 'overdue' | 'today' | 'soon' | 'future';

function getUrgency(dueDate: string): Urgency {
  const diff = new Date(dueDate).getTime() - Date.now();
  const days  = diff / (1000 * 60 * 60 * 24);
  if (days < 0)  return 'overdue';
  if (days < 1)  return 'today';
  if (days <= 3) return 'soon';
  return 'future';
}

const URGENCY: Record<Urgency, { color: string; bg: string; label: string }> = {
  overdue: { color: '#f87171', bg: 'rgba(239,68,68,0.12)',   label: 'Просрочено' },
  today:   { color: '#fb923c', bg: 'rgba(249,115,22,0.12)',  label: 'Сегодня'    },
  soon:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  label: 'Скоро'      },
  future:  { color: '#64748b', bg: 'rgba(100,116,139,0.08)', label: 'Позже'      },
};

function useGreeting() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const h = time.getHours();
  const word = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const icon = h < 6 ? '🌙' : h < 12 ? '🌅' : h < 18 ? '☀️' : '🌆';
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return { word, icon, dateStr, timeStr };
}

function useAllDeadlines() {
  return useMemo(() => {
    const items: { taskId: string; agentId: string; dueDate: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('tasks:due:')) continue;
      const agentId = key.slice('tasks:due:'.length);
      try {
        const map = JSON.parse(localStorage.getItem(key)!) as Record<string, string>;
        Object.entries(map).forEach(([taskId, dueDate]) => items.push({ taskId, agentId, dueDate }));
      } catch { /* skip */ }
    }
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────

export function MyDayPage() {
  const navigate          = useNavigate();
  const deadlines         = useAllDeadlines();
  const tokenTotals       = getDayTotals();
  const { allTasks }      = useTasks();
  const agentStatuses     = useAgentStatuses();
  const { visibleAgents } = useAgents();
  const { word, icon, dateStr, timeStr } = useGreeting();

  const running  = allTasks.filter(t => t.status === 'running');
  const done     = allTasks.filter(t => t.status === 'done');
  const pending  = allTasks.filter(t => t.status === 'pending');
  const overdue  = deadlines.filter(d => getUrgency(d.dueDate) === 'overdue');

  const upcomingDeadlines = useMemo(() =>
    deadlines.filter(d => getUrgency(d.dueDate) !== 'future').slice(0, 6),
  [deadlines]);

  const activeAgents = visibleAgents.filter(a => a.status === 'active');
  const todayCost    = estimateCost(tokenTotals.input, tokenTotals.output);

  const PRIORITY_ICON: Record<string, React.ReactNode> = {
    critical: <Flame        size={11} className="text-rose-400"   />,
    high:     <AlertTriangle size={11} className="text-orange-400" />,
    medium:   <Clock        size={11} className="text-blue-400"   />,
    low:      <Circle       size={11} className="text-slate-500"  />,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#07090f' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Мой день" />

        {/* ── Scrollable content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Hero header ──────────────────────────────────────────────── */}
          <div
            className="relative px-8 py-8 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.04) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {/* Ambient blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
                   style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)' }} />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15"
                   style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }} />
            </div>

            <div className="relative flex items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {icon === '🌅' || icon === '☀️'
                    ? <Sun size={28} className="text-amber-400 shrink-0" />
                    : <span className="text-3xl leading-none">{icon}</span>
                  }
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">{word}!</h1>
                </div>
                <p className="text-slate-400 text-sm capitalize">{dateStr}</p>
                {overdue.length > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                       style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    <AlertTriangle size={12} />
                    {overdue.length} просроченных задач
                  </div>
                )}
              </div>

              {/* Live clock */}
              <div className="text-right shrink-0">
                <p className="text-4xl font-extrabold text-white tabular-nums tracking-tight leading-none">{timeStr}</p>
                <p className="text-xs text-slate-600 mt-1">местное время</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6 pb-10">

            {/* ── Stat cards row ────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {[
                {
                  label: 'Выполняется',
                  value: running.length,
                  icon: <Zap size={16} />,
                  color: '#3b82f6',
                  pulse: running.length > 0,
                },
                {
                  label: 'В очереди',
                  value: pending.length,
                  icon: <Clock size={16} />,
                  color: '#8b5cf6',
                  pulse: false,
                },
                {
                  label: 'Завершено',
                  value: done.length,
                  icon: <CheckCircle2 size={16} />,
                  color: '#10b981',
                  pulse: false,
                },
                {
                  label: 'Агентов онлайн',
                  value: activeAgents.length,
                  icon: <Users size={16} />,
                  color: '#f59e0b',
                  pulse: false,
                },
              ].map(({ label, value, icon: ic, color, pulse }) => (
                <div
                  key={label}
                  className="rounded-2xl px-4 py-4 flex items-center gap-3"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}25`,
                  }}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: `${color}18`, color }}>
                      {ic}
                    </div>
                    {pulse && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400"
                            style={{ animation: 'statusPulse 2s ease-in-out infinite' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white leading-none">{value}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: `${color}cc` }}>{label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* ── Agent roster ─────────────────────────────────────────── */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users size={12} /> Команда сейчас
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {visibleAgents.slice(0, 6).map((agent, i) => {
                    const status = agentStatuses[agent.id] ?? agent.status;
                    return (
                      <button
                        key={agent.id}
                        onClick={() => navigate(`/agent/${agent.slug}`)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150',
                          'hover:bg-white/[0.04]',
                          i < visibleAgents.slice(0, 6).length - 1 && 'border-b border-white/[0.04]',
                        )}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                             style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}25` }}>
                          {agent.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{agent.name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{agent.title}</p>
                        </div>
                        <StatusDot status={status} size="sm" />
                      </button>
                    );
                  })}
                </div>
                <NavLink to="/team" className="mt-2 flex items-center justify-center gap-1.5 py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Все сотрудники <ArrowRight size={11} />
                </NavLink>
              </motion.div>

              {/* ── Deadlines + Tokens column ─────────────────────────────── */}
              <div className="space-y-5">

                {/* Deadlines */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CalendarClock size={12} /> Дедлайны
                  </h2>
                  {upcomingDeadlines.length === 0 ? (
                    <div className="rounded-2xl px-4 py-5 text-center"
                         style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs text-emerald-400 font-medium">Нет срочных задач!</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Отличная работа 🎉</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingDeadlines.map(({ taskId, agentId, dueDate }) => {
                        const task    = allTasks.find(t => t.id === taskId);
                        const agent   = visibleAgents.find(a => a.id === agentId);
                        const urgency = getUrgency(dueDate);
                        const style   = URGENCY[urgency];
                        if (!task) return null;
                        return (
                          <div key={taskId}
                               className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                               style={{ background: style.bg, borderColor: `${style.color}30` }}>
                            <span className="shrink-0">{PRIORITY_ICON[task.priority]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{task.title}</p>
                              {agent && <p className="text-[10px] text-slate-500">{agent.avatar} {agent.name}</p>}
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                                  style={{ background: `${style.color}20`, color: style.color }}>
                              {style.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* Token usage */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Coins size={12} /> Токены сегодня
                  </h2>
                  {tokenTotals.calls === 0 ? (
                    <div className="rounded-2xl px-4 py-5 text-center"
                         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <MessageSquare size={18} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-600">Откройте агента и начните чат</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl px-4 py-4 space-y-3"
                         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: 'Входящих',  value: tokenTotals.input.toLocaleString(),  color: '#60a5fa' },
                          { label: 'Исходящих', value: tokenTotals.output.toLocaleString(), color: '#a78bfa' },
                          { label: 'Стоимость', value: `$${todayCost.toFixed(4)}`,           color: '#34d399' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <p className="text-sm font-bold" style={{ color }}>{value}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                      {Object.entries(tokenTotals.agentBreakdown).length > 0 && (
                        <div className="border-t border-white/[0.05] pt-3 space-y-1.5">
                          {Object.entries(tokenTotals.agentBreakdown).map(([agentId, s]) => {
                            const agent   = visibleAgents.find(a => a.id === agentId);
                            const total   = s.input + s.output;
                            const allTotal = tokenTotals.input + tokenTotals.output;
                            const pct     = allTotal > 0 ? (total / allTotal) * 100 : 0;
                            return (
                              <div key={agentId}>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                                  <span>{agent?.avatar ?? '🤖'}</span>
                                  <span className="flex-1 truncate">{agent?.name ?? agentId}</span>
                                  <span className="text-slate-400">{total.toLocaleString()}</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                                  <div className="h-full rounded-full bg-indigo-500/60 transition-all duration-700"
                                       style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>

              </div>
            </div>

            {/* ── Quick actions ─────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Star size={12} /> Быстрый доступ
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Весь офис',    icon: <Building2     size={16} />, to: '/',         color: '#3b82f6' },
                  { label: 'Команда',      icon: <Users         size={16} />, to: '/team',     color: '#8b5cf6' },
                  { label: 'Аналитика',    icon: <TrendingUp    size={16} />, to: '/reports',  color: '#10b981' },
                  { label: 'Активность',   icon: <Activity      size={16} />, to: '/reports',  color: '#f59e0b' },
                ].map(({ label, icon: ic, to, color }) => (
                  <NavLink
                    key={label}
                    to={to}
                    className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-center transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: `${color}15`, color }}>
                      {ic}
                    </div>
                    <span className="text-xs font-medium text-slate-300">{label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>

            {/* ── Featured agents ───────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap size={12} /> Топ агенты
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleAgents.filter(a => a.isFeatured || a.status === 'active').slice(0, 3).map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => navigate(`/agent/${agent.slug}`)}
                    className="flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.01] group"
                    style={{
                      background: `${agent.accentColor}08`,
                      border: `1px solid ${agent.accentColor}20`,
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                         style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}35` }}>
                      {agent.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-200">{agent.name}</p>
                        <StatusDot status={agentStatuses[agent.id] ?? agent.status} size="sm" />
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: agent.accentColor }}>{agent.title}</p>
                      <p className="text-[10px] text-slate-600 mt-1 line-clamp-1">{agent.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
