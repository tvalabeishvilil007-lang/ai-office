import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Flame, AlertCircle, Circle, ListTodo, Plus, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useToast } from '../ui/Toast';
import { AGENTS } from '../../data/agents';
import { ProgressBar } from '../ui/ProgressBar';
import { cn } from '../../utils/cn';
import { formatRelativeTime } from '../../utils/formatters';
import type { Task, TaskPriority, TaskStatus } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// TaskList — live task panel backed by Supabase
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY: Record<TaskPriority, { icon: React.ReactNode; color: string }> = {
  critical: { icon: <Flame      size={10} />, color: '#f43f5e' },
  high:     { icon: <AlertCircle size={10} />, color: '#f97316' },
  medium:   { icon: <Clock      size={10} />, color: '#3b82f6' },
  low:      { icon: <Circle     size={10} />, color: '#6b7280' },
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  running: '#3b82f6',
  pending: '#6b7280',
  done:    '#10b981',
  failed:  '#f43f5e',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  running: 'Live',
  pending: 'Ожидает',
  done:    'Готово',
  failed:  'Ошибка',
};

function TaskRow({
  task, onDone, onDelete,
}: {
  task: Task;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const agent    = AGENTS.find((a) => a.id === task.agentId);
  const priority = PRIORITY[task.priority];
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl group',
        'hover:bg-white/[0.03] transition-colors duration-150',
      )}
    >
      {/* Agent avatar */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
        style={{
          background: agent ? `${agent.accentColor}12` : 'rgba(255,255,255,0.04)',
          border: agent ? `1px solid ${agent.accentColor}20` : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {agent?.avatar ?? '🤖'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + priority */}
        <div className="flex items-start gap-1.5 mb-1">
          <p className={cn(
            'text-[11px] font-semibold leading-snug flex-1',
            task.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-300',
          )}>
            {task.title}
          </p>
          <span style={{ color: priority.color }} className="shrink-0 mt-0.5">
            {priority.icon}
          </span>
        </div>

        {/* Progress */}
        {task.status === 'running' && (
          <ProgressBar
            value={task.progress}
            color={agent?.accentColor ?? '#3b82f6'}
            size="xs"
            showLabel
            className="mb-1"
          />
        )}

        {/* Meta */}
        <div className="flex items-center gap-1.5 text-[9px]">
          <span
            className="flex items-center gap-0.5 font-semibold"
            style={{ color: STATUS_COLOR[task.status] }}
          >
            {task.status === 'running' && (
              <motion.span
                className="inline-block w-1 h-1 rounded-full"
                style={{ background: STATUS_COLOR[task.status] }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
            {STATUS_LABEL[task.status]}
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-600 truncate">{agent?.name}</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-700">{formatRelativeTime(task.updatedAt)}</span>
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
          >
            {task.status !== 'done' && (
              <button
                onClick={() => onDone(task.id)}
                title="Отметить выполненной"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
              >
                <CheckCheck size={12} />
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              title="Удалить"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TaskList({ onAddTask }: { onAddTask?: () => void }) {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { allTasks, loading, updateStatus, deleteTask } = useTasks();

  const sorted = [...allTasks].sort((a, b) => {
    const o: Record<TaskStatus, number> = { running: 0, pending: 1, done: 2, failed: 3 };
    return o[a.status] - o[b.status];
  });
  const running = sorted.filter((t) => t.status === 'running').length;

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(6,9,18,0.80)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <ListTodo size={13} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-300">Задачи</span>
        {running > 0 && (
          <span
            className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              color: '#60a5fa',
            }}
          >
            <motion.span
              className="w-1 h-1 rounded-full bg-blue-400 inline-block"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            {running} live
          </span>
        )}
        {/* Divider + Go to agent */}
        <div className="flex-1" />
        <button
          onClick={() => onAddTask ? onAddTask() : navigate('/team')}
          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
        >
          <Plus size={9} /> Добавить
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1 min-h-0">

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-1 px-3 py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-2.5 py-2">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] shrink-0 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-white/[0.04] rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-white/[0.03] rounded-full w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
            >
              <ListTodo size={18} className="text-blue-500/60" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1">Нет задач</p>
            <p className="text-[10px] text-slate-700 leading-relaxed">
              Откройте агента и создайте первую задачу
            </p>
            <button
              onClick={() => navigate('/team')}
              className="mt-3 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Перейти к команде →
            </button>
          </div>
        )}

        {/* Task rows */}
        {!loading && sorted.length > 0 && (
          <AnimatePresence mode="popLayout">
            {sorted.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onDone={id => {
                  updateStatus(id, 'done', 100);
                  toast.success('Задача выполнена ✓');
                }}
                onDelete={id => {
                  deleteTask(id);
                  toast.info('Задача удалена');
                }}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
