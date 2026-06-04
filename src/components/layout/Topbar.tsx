import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Activity, CheckCircle2,
  Cpu, LogOut, Zap, Clock, X, BrainCircuit,
  AlertTriangle, Lightbulb, CalendarClock, MessageSquare, Download,
  Maximize2, Minimize2, HelpCircle,
} from 'lucide-react';
import { resetOnboarding } from '../ui/OnboardingModal';
import { usePWA } from '../../hooks/usePWA';
import { useAgents } from '../../contexts/AgentManagerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { GlobalSearch } from '../ui/GlobalSearch';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// Topbar — workspace header with live stats, search & notification bell
//
// Bell dropdown shows two sections:
//   1. AI proactive notifications (from useNotificationsContext)
//   2. Task status updates (running + recently done)
// ─────────────────────────────────────────────────────────────────────────────

interface TopbarProps {
  title?: string;
}

// ── Notification type → icon mapping ─────────────────────────────────────────

const notifTypeIcon: Record<string, React.ReactNode> = {
  deadline: <CalendarClock size={11} className="text-red-400"    />,
  alert:    <AlertTriangle  size={11} className="text-amber-400" />,
  insight:  <Lightbulb      size={11} className="text-blue-400"  />,
  reminder: <MessageSquare  size={11} className="text-indigo-400" />,
};

const notifTypeBg: Record<string, string> = {
  deadline: 'rgba(239,68,68,0.12)',
  alert:    'rgba(251,191,36,0.12)',
  insight:  'rgba(59,130,246,0.12)',
  reminder: 'rgba(99,102,241,0.12)',
};

const priorityDot: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#64748b',
};

// ─────────────────────────────────────────────────────────────────────────────

export function Topbar({ title = 'Главный офис' }: TopbarProps) {
  const { user, signOut }       = useAuth();
  const navigate                = useNavigate();
  const { allTasks }            = useTasks();
  const { canInstall, install } = usePWA();
  const { visibleAgents }       = useAgents();
  const activeAgents = visibleAgents.filter(a => a.status === 'active').length;
  const {
    notifications: aiNotifs,
    unreadCount:   aiUnread,
    markAsRead,
    dismiss,
    markAllRead,
  }                             = useNotificationsContext();

  const [bellOpen,      setBellOpen]      = useState(false);
  const [tab,           setTab]           = useState<'ai' | 'tasks'>('ai');
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const bellRef                           = useRef<HTMLDivElement>(null);

  // ── Fullscreen toggle ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Real stats from Supabase
  const runningTasks  = allTasks.filter(t => t.status === 'running').length;
  const doneTasks     = allTasks.filter(t => t.status === 'done').length;
  const notifTasks    = [
    ...allTasks.filter(t => t.status === 'running'),
    ...allTasks.filter(t => t.status === 'done').slice(0, 5),
  ].slice(0, 8);
  const taskUnread    = runningTasks;
  const totalUnread   = aiUnread + taskUnread;

  // Auto-switch to ai tab when new AI notifs arrive
  useEffect(() => {
    if (aiUnread > 0 && bellOpen) setTab('ai');
  }, [aiUnread]);

  // Close bell dropdown when clicking outside
  useEffect(() => {
    if (!bellOpen) return;
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [bellOpen]);

  const displayName = (user?.user_metadata?.full_name as string | undefined)
    ?? user?.email?.split('@')[0]
    ?? 'User';
  const initials  = displayName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
      className={cn(
        'h-20 shrink-0 flex items-center gap-5 px-6',
        'bg-black/25 backdrop-blur-xl',
        'border-b border-white/[0.06]',
        'relative z-20',
      )}
    >
      {/* ── Page title ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-base font-bold text-white tracking-tight truncate">{title}</h1>
      </div>

      {/* ── Live stats chips ────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2">
        <StatChip icon={<Activity size={12} className="text-emerald-400" />} label={`${activeAgents} активных`} color="emerald" />
        <StatChip icon={<Cpu size={12} className="text-blue-400" />}         label={`${runningTasks} задач`}     color="blue"    />
        <StatChip icon={<CheckCircle2 size={12} className="text-slate-400" />} label={`${doneTasks} выполнено`} color="slate"   />
      </div>

      {/* ── Spacer ─────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('global-search:open'))}
        className={cn(
          'hidden lg:flex items-center gap-2 w-64 px-3.5 py-2.5 rounded-xl text-left',
          'bg-white/[0.05] border border-white/[0.08]',
          'hover:bg-white/[0.08] hover:border-white/[0.14]',
          'transition-all duration-200 cursor-text',
        )}
      >
        <Search size={14} className="text-slate-500 shrink-0" />
        <span className="flex-1 text-sm text-slate-600">Поиск по офису…</span>
        <kbd className="text-[9px] text-slate-600 font-medium bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.07]">
          Ctrl K
        </kbd>
      </button>
      <GlobalSearch />

      {/* ── Help / tour button ─────────────────────────────────────────── */}
      <button
        onClick={() => { resetOnboarding(); navigate('/'); window.dispatchEvent(new CustomEvent('onboarding:open')); }}
        title="Краткий тур по приложению"
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
          'bg-white/[0.04] border border-white/[0.07]',
          'hover:bg-white/[0.08] hover:border-white/[0.14]',
          'text-slate-400 hover:text-slate-200 transition-all duration-200',
        )}
      >
        <HelpCircle size={14} />
      </button>

      {/* ── Fullscreen toggle ───────────────────────────────────────────── */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Выйти из полного экрана (Esc)' : 'На весь экран'}
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
          'bg-white/[0.04] border border-white/[0.07]',
          'hover:bg-white/[0.08] hover:border-white/[0.14]',
          'text-slate-400 hover:text-slate-200 transition-all duration-200',
        )}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>

      {/* ── PWA install button ──────────────────────────────────────────── */}
      {canInstall && (
        <button
          onClick={install}
          title="Установить приложение"
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium',
            'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300',
            'hover:bg-indigo-500/25 hover:border-indigo-500/50 transition-all duration-200',
          )}
        >
          <Download size={12} />
          Установить
        </button>
      )}

      {/* ── Notifications bell ──────────────────────────────────────────── */}
      <div ref={bellRef} className="relative">
        <button
          onClick={() => setBellOpen(o => !o)}
          className={cn(
            'relative w-8 h-8 rounded-xl flex items-center justify-center',
            'bg-white/[0.04] border border-white/[0.07]',
            'hover:bg-white/[0.07] hover:border-white/[0.12]',
            'text-slate-400 hover:text-slate-200 transition-all duration-200',
          )}
          aria-label="Уведомления"
        >
          <Bell size={15} />
          {totalUnread > 0 && (
            <span className="notif-badge absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-blue-500 ring-1 ring-black/60 text-[9px] font-bold text-white flex items-center justify-center px-0.5">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>

        {/* ── Dropdown ── */}
        <AnimatePresence>
          {bellOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute right-0 top-10 w-80 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: '#0c1020',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Tab switcher */}
                  <button
                    onClick={() => setTab('ai')}
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all duration-150',
                      tab === 'ai'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    <BrainCircuit size={11} />
                    ИИ
                    {aiUnread > 0 && (
                      <span className="ml-0.5 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                        {aiUnread}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTab('tasks')}
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all duration-150',
                      tab === 'tasks'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    <Cpu size={11} />
                    Задачи
                    {taskUnread > 0 && (
                      <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center">
                        {taskUnread}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {tab === 'ai' && aiNotifs.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors px-1"
                    >
                      Прочитать все
                    </button>
                  )}
                  <button
                    onClick={() => setBellOpen(false)}
                    className="p-0.5 text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div className="max-h-72 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {tab === 'ai' ? (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.12 }}
                    >
                      {aiNotifs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                          <BrainCircuit size={22} className="mb-2 opacity-30" />
                          <p className="text-xs text-center px-4">
                            Агенты анализируют ваши данные и пришлют уведомления о дедлайнах и возможностях
                          </p>
                        </div>
                      ) : (
                        aiNotifs.map(n => (
                          <motion.div
                            key={n.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer relative"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            onClick={() => markAsRead(n.id)}
                          >
                            {/* Unread indicator */}
                            {!n.read && (
                              <span
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                                style={{ background: priorityDot[n.priority] }}
                              />
                            )}

                            {/* Type icon */}
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: notifTypeBg[n.type] ?? 'rgba(99,102,241,0.12)' }}
                            >
                              {notifTypeIcon[n.type]}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] text-slate-500">
                                  {n.agentAvatar} {n.agentName}
                                </span>
                              </div>
                              <p className={cn(
                                'text-xs leading-tight mb-0.5',
                                n.read ? 'text-slate-400' : 'text-slate-200 font-medium',
                              )}>
                                {n.title}
                              </p>
                              <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                                {n.body}
                              </p>
                            </div>

                            {/* Dismiss */}
                            <button
                              onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                              className="shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 text-slate-700 hover:text-slate-400 transition-all"
                            >
                              <X size={10} />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tasks"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.12 }}
                    >
                      {notifTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                          <Cpu size={20} className="mb-2 opacity-40" />
                          <p className="text-xs">Нет активных задач</p>
                        </div>
                      ) : (
                        notifTasks.map(task => {
                          const agent     = visibleAgents.find(a => a.id === task.agentId);
                          const isRunning = task.status === 'running';
                          return (
                            <div
                              key={task.id}
                              className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            >
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: isRunning ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)' }}
                              >
                                {isRunning
                                  ? <Zap size={11} className="text-blue-400" />
                                  : <CheckCircle2 size={11} className="text-emerald-400" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-200 truncate leading-tight">
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {agent && (
                                    <span className="text-[10px] text-slate-600">
                                      {agent.avatar} {agent.name}
                                    </span>
                                  )}
                                  <span
                                    className="text-[10px] font-semibold"
                                    style={{ color: isRunning ? '#60a5fa' : '#34d399' }}
                                  >
                                    {isRunning ? 'Выполняется' : 'Готово'}
                                  </span>
                                </div>
                                {isRunning && task.progress > 0 && (
                                  <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
                                <Clock size={9} />
                                {new Date(task.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {tab === 'tasks' && notifTasks.length > 0 && (
                  <button
                    onClick={() => { navigate('/reports'); setBellOpen(false); }}
                    className="w-full py-2.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Все задачи →
                  </button>
                )}
                {tab === 'ai' && aiNotifs.length > 0 && (
                  <p className="text-center text-[10px] text-slate-700 py-2">
                    Уведомления обновляются при открытии агентов
                  </p>
                )}
                {tab === 'ai' && aiNotifs.length === 0 && (
                  <p className="text-center text-[10px] text-slate-700 py-2">
                    Откройте агента, чтобы получить персональные уведомления
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── User avatar + sign out ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center',
          'bg-gradient-to-br from-indigo-500 to-violet-600',
          'text-[11px] font-bold text-white shrink-0',
          'border border-white/[0.12]',
        )}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <span className="text-xs font-medium text-slate-300 hidden sm:block max-w-[96px] truncate">
          {displayName}
        </span>
        <button
          onClick={signOut}
          title="Выйти"
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center',
            'bg-white/[0.04] border border-white/[0.07]',
            'hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400',
            'text-slate-500 transition-all duration-200',
          )}
        >
          <LogOut size={14} />
        </button>
      </div>
    </motion.header>
  );
}

// ── Internal: stat chip ───────────────────────────────────────────────────────

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  color: 'emerald' | 'blue' | 'slate';
}

const chipColors = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  slate:   'bg-white/[0.04] border-white/[0.07] text-slate-400',
};

function StatChip({ icon, label, color }: StatChipProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium',
      chipColors[color],
    )}>
      {icon}
      {label}
    </div>
  );
}
