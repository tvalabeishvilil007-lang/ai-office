import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, FileText, PlayCircle,
  XCircle, Clock, Activity,
} from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useAllDocuments } from '../../hooks/useAllDocuments';
import { useAgents } from '../../contexts/AgentManagerContext';
import { formatRelativeTime } from '../../utils/formatters';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '../../utils/cn';
import type { TaskStatus } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// ActivityPanel — real-time office event feed from Supabase
// Derives events from tasks (status changes) and documents (creation)
// ─────────────────────────────────────────────────────────────────────────────

type EventType = 'task_completed' | 'task_started' | 'task_failed' | 'task_pending' | 'document_created';

interface ActivityEvent {
  id:        string;
  type:      EventType;
  agentId:   string;
  content:   string;
  timestamp: string;
}

const EVENT_CONFIG: Record<EventType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  task_completed:  { icon: <CheckCircle2 size={12} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Задача завершена'  },
  task_started:    { icon: <PlayCircle   size={12} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: 'Задача запущена'   },
  task_failed:     { icon: <XCircle      size={12} />, color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   label: 'Ошибка задачи'     },
  task_pending:    { icon: <Clock        size={12} />, color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Задача добавлена'  },
  document_created:{ icon: <FileText     size={12} />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'Документ создан'   },
};

const STATUS_TO_EVENT: Partial<Record<TaskStatus, EventType>> = {
  running: 'task_started',
  done:    'task_completed',
  failed:  'task_failed',
  pending: 'task_pending',
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

function EventSkeleton() {
  return (
    <div className="flex items-start gap-3 pl-1 pr-2 py-2">
      <div className="w-9 h-9 rounded-xl bg-white/[0.04] shrink-0 animate-pulse" />
      <div className="flex-1 pt-1 space-y-2">
        <div className="h-2.5 bg-white/[0.04] rounded-full w-1/3 animate-pulse" />
        <div className="h-2 bg-white/[0.03] rounded-full w-2/3 animate-pulse" />
        <div className="h-1.5 bg-white/[0.02] rounded-full w-1/4 animate-pulse" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ActivityPanel() {
  const { allAgents }                        = useAgents();
  const { allTasks, loading: tasksLoading } = useTasks();
  const { documents, loading: docsLoading  } = useAllDocuments();
  const loading = tasksLoading || docsLoading;

  // Derive activity events from real Supabase data
  const events = useMemo((): ActivityEvent[] => {
    const taskEvents: ActivityEvent[] = allTasks
      .map(t => {
        const eventType = STATUS_TO_EVENT[t.status];
        if (!eventType) return null;
        return {
          id:        `task-${t.id}-${t.status}`,
          type:      eventType,
          agentId:   t.agentId,
          content:   t.title,
          timestamp: t.updatedAt,
        };
      })
      .filter((e): e is ActivityEvent => e !== null);

    const docEvents: ActivityEvent[] = documents.map(d => ({
      id:        `doc-${d.id}`,
      type:      'document_created' as EventType,
      agentId:   d.agentId,
      content:   d.title,
      timestamp: d.createdAt,
    }));

    return [...taskEvents, ...docEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [allTasks, documents]);

  return (
    <GlassCard variant="dark" padding="none" className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-slate-500" />
          <h3 className="text-xs font-semibold text-slate-300">Активность офиса</h3>
        </div>
        {!loading && (
          <span className="text-[10px] text-slate-600 font-medium">
            {events.length} событий
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto py-2 px-3 min-h-0">

        {/* Loading */}
        {loading && (
          <div className="space-y-0.5">
            {[1, 2, 3, 4].map(i => <EventSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)' }}
            >
              <Activity size={18} className="text-indigo-500/50" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Активности пока нет</p>
            <p className="text-[10px] text-slate-700 leading-relaxed">
              Создайте задачи или документы — они появятся здесь
            </p>
          </div>
        )}

        {/* Events */}
        {!loading && events.length > 0 && (
          <div className="relative">
            {/* Vertical spine */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/[0.05]" />

            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {events.map((event, i) => {
                  const agent  = allAgents.find(a => a.id === event.agentId);
                  const config = EVENT_CONFIG[event.type];

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className={cn(
                        'flex items-start gap-3 pl-1 pr-2 py-2 rounded-xl',
                        'hover:bg-white/[0.03] transition-colors duration-150',
                      )}
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                        style={{ background: config.bg, border: `1px solid ${config.color}25`, color: config.color }}
                      >
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: agent?.accentColor ?? '#94a3b8' }}
                          >
                            {agent?.avatar} {agent?.name ?? 'Агент'}
                          </span>
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: config.bg, color: config.color }}
                          >
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-snug line-clamp-1">
                          {event.content}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {formatRelativeTime(event.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
