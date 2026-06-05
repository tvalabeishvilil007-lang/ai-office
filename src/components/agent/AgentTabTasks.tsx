import { useState, useRef, createContext, useContext } from 'react';
import { SkeletonKanban } from '../ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, AlertCircle, Flame,
  Trash2, Circle, X, ChevronDown, ChevronUp, GripVertical, CalendarClock,
  Check, Square, Layers, MoveRight, ListTodo, FileText, Loader2, Copy, Maximize2,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTasks } from '../../hooks/useTasks';
import { streamTaskExecution, saveTaskResult, loadTaskResult } from '../../hooks/useTaskExecution';
import { streamAgentChat } from '../../services/ai/chat-api';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatRelativeTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { Agent, Task, TaskPriority, TaskStatus } from '../../types';

// ── Execution state context — avoids prop drilling through Kanban columns ──────

interface ExecState { text: string; progress: number }
const ExecContext = createContext<Map<string, ExecState>>(new Map());

// ─────────────────────────────────────────────────────────────────────────────
// AgentTabTasks — Kanban board (Очередь | Выполняется | Готово)
//                with due-date / deadline support (stored in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_ICON: Record<TaskPriority, React.ReactNode> = {
  critical: <Flame       size={11} className="text-rose-400"   />,
  high:     <AlertCircle size={11} className="text-orange-400" />,
  medium:   <Clock       size={11} className="text-blue-400"   />,
  low:      <Circle      size={11} className="text-slate-500"  />,
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критично', high: 'Высокий', medium: 'Средний', low: 'Низкий',
};

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'pending', label: 'Очередь',      color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
  { id: 'running', label: 'Выполняется',  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)'  },
  { id: 'done',    label: 'Готово',       color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
];

// ── Deadline urgency helpers ──────────────────────────────────────────────────

type Urgency = 'overdue' | 'today' | 'soon' | 'future';

function getUrgency(dueDate: string): Urgency {
  const now  = new Date();
  const due  = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days < 0)   return 'overdue';
  if (days < 1)   return 'today';
  if (days <= 3)  return 'soon';
  return 'future';
}

const URGENCY_STYLE: Record<Urgency, { color: string; bg: string; label: string }> = {
  overdue: { color: '#f87171', bg: 'rgba(239,68,68,0.15)',   label: 'Просрочено' },
  today:   { color: '#fb923c', bg: 'rgba(249,115,22,0.15)',  label: 'Сегодня'    },
  soon:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  label: 'Скоро'      },
  future:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: ''           },
};

function DeadlineBadge({ dueDate }: { dueDate: string }) {
  const urgency = getUrgency(dueDate);
  const style   = URGENCY_STYLE[urgency];

  const formatted = new Date(dueDate).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short',
  });

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      <CalendarClock size={8} />
      {formatted}
      {style.label && <span className="opacity-75">· {style.label}</span>}
    </span>
  );
}

// ── Subtask helpers ───────────────────────────────────────────────────────────

interface Subtask { id: string; text: string; done: boolean }

function loadSubtasks(taskId: string): Subtask[] {
  try { return JSON.parse(localStorage.getItem(`task_subtasks:${taskId}`) ?? '[]') as Subtask[]; }
  catch { return []; }
}
function persistSubtasks(taskId: string, list: Subtask[]) {
  localStorage.setItem(`task_subtasks:${taskId}`, JSON.stringify(list));
}

// ── New task form ─────────────────────────────────────────────────────────────

function NewTaskForm({ agent, onClose, onCreate }: {
  agent: Agent;
  onClose: () => void;
  onCreate: (
    title: string, description: string, priority: TaskPriority,
    mins?: number, dueDate?: string,
  ) => Promise<void>;
}) {
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [priority,     setPriority]     = useState<TaskPriority>('medium');
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [mins,         setMins]         = useState('');
  const [dueDate,      setDueDate]      = useState('');
  const [saving,       setSaving]       = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate(
      title.trim(), description.trim(), priority,
      mins ? Number(mins) : undefined,
      dueDate || undefined,
    );
    setSaving(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <GlassCard variant="default" padding="md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300">Новая задача</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Название задачи…"
            className="w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-white/[0.18]"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание (необязательно)…"
            rows={2}
            className="w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-white/[0.18]"
          />

          {/* Priority + estimated time row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setPriorityOpen(v => !v)}
                className="w-full flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:border-white/[0.18] transition-colors"
              >
                <span className="flex-1 text-left">{PRIORITY_LABEL[priority]}</span>
                <ChevronDown size={10} className="text-slate-500 shrink-0" />
              </button>
              <AnimatePresence>
                {priorityOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute left-0 top-full mt-1 z-20 w-full rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setPriority(p); setPriorityOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                          p === priority ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]',
                        )}
                      >
                        {PRIORITY_ICON[p]}{PRIORITY_LABEL[p]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <input
              value={mins}
              onChange={e => setMins(e.target.value.replace(/\D/g, ''))}
              placeholder="Минут"
              className="w-24 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-white/[0.18]"
            />
          </div>

          {/* Due date row */}
          <div className="flex items-center gap-2">
            <CalendarClock size={13} className="text-slate-500 shrink-0" />
            <label className="text-[11px] text-slate-500 shrink-0">Дедлайн:</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className={cn(
                'flex-1 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5',
                'text-slate-300 focus:outline-none focus:border-white/[0.18] transition-colors',
                '[color-scheme:dark]',
              )}
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
            className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: agent.accentColor }}
          >
            {saving ? 'Создаю…' : 'Создать задачу'}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Sortable task card ────────────────────────────────────────────────────────

function SortableTaskCard({ task, agent, onStatusChange, onDelete, dueDate, overlay = false,
  isSelected, onToggleSelect, selectionMode }: {
  task: Task; agent: Agent;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  dueDate?: string;
  overlay?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task} agent={agent}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        dueDate={dueDate}
        dragHandleProps={{ ...attributes, ...listeners }}
        overlay={overlay}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        selectionMode={selectionMode}
      />
    </div>
  );
}

function TaskCard({ task, agent, onStatusChange, onDelete, dragHandleProps, dueDate, overlay,
  isSelected, onToggleSelect, selectionMode }: {
  task: Task; agent: Agent;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
  dueDate?: string;
  overlay?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}) {
  const [menuOpen,          setMenuOpen]          = useState(false);
  const [subtasksOpen,      setSubtasksOpen]      = useState(false);
  const [subtasks,          setSubtasks]          = useState<Subtask[]>(() => loadSubtasks(task.id));
  const [newSubtaskText,    setNewSubtaskText]     = useState('');
  const [resultOpen,        setResultOpen]         = useState(false);
  const [fullScreen,        setFullScreen]         = useState(false);
  const [copied,            setCopied]             = useState(false);
  const [subtaskStream,     setSubtaskStream]      = useState<Map<string, string>>(new Map());
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const { session } = useAuth();

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const execMap = useContext(ExecContext);
  const execState = execMap.get(task.id);
  const savedResult = task.status === 'done' ? loadTaskResult(task.id) : null;

  const updateSubtasks = (next: Subtask[]) => {
    setSubtasks(next);
    persistSubtasks(task.id, next);
  };

  // Execute a subtask via AI — streams response, marks done on finish
  const executeSubtask = async (sub: Subtask) => {
    const token = session?.access_token;
    setSubtaskStream(prev => new Map(prev).set(sub.id, ''));

    const prompt = `Подзадача: ${sub.text}\n\nВыполни эту подзадачу конкретно и кратко. Дай готовый результат без лишних вступлений.`;

    let result = '';
    try {
      for await (const event of streamAgentChat(
        task.agentId,
        [{ role: 'user', content: prompt }],
        token,
      )) {
        if (event.type === 'chunk' && event.text) {
          result += event.text;
          const id = sub.id;
          setSubtaskStream(prev => new Map(prev).set(id, result));
        } else if (event.type === 'done') {
          localStorage.setItem(`subtask_result:${sub.id}`, result);
          // Mark subtask as done using functional update to avoid stale closure
          setSubtasks(prev => {
            const updated = prev.map(s => s.id === sub.id ? { ...s, done: true } : s);
            persistSubtasks(task.id, updated);
            return updated;
          });
          setSubtaskStream(prev => { const m = new Map(prev); m.delete(sub.id); return m; });
        } else if (event.type === 'error') {
          setSubtaskStream(prev => { const m = new Map(prev); m.delete(sub.id); return m; });
        }
      }
    } catch {
      setSubtaskStream(prev => { const m = new Map(prev); m.delete(sub.id); return m; });
    }
  };

  const addSubtask = () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    const newSub: Subtask = { id: crypto.randomUUID(), text, done: false };
    updateSubtasks([...subtasks, newSub]);
    setNewSubtaskText('');
    subtaskInputRef.current?.focus();
    setSubtasksOpen(true);
    executeSubtask(newSub);
  };
  const toggleSubtask = (id: string) =>
    updateSubtasks(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));
  const deleteSubtask = (id: string) =>
    updateSubtasks(subtasks.filter(s => s.id !== id));

  const doneCount  = subtasks.filter(s => s.done).length;
  const totalSubs  = subtasks.length;

  const nextStatus: Partial<Record<TaskStatus, { label: string; status: TaskStatus }>> = {
    pending: { label: 'Запустить',    status: 'running' },
    running: { label: 'Завершить',    status: 'done'    },
    failed:  { label: 'Перезапустить', status: 'running' },
  };
  const next = nextStatus[task.status];

  // Deadline urgency for card border accent
  const urgency      = dueDate && task.status !== 'done' ? getUrgency(dueDate) : null;
  const urgencyColor = urgency ? URGENCY_STYLE[urgency].color : undefined;

  return (
    <div
      className={cn(
        'rounded-xl p-3 space-y-2 cursor-auto select-none',
        'border transition-all duration-200',
        overlay   ? 'shadow-2xl rotate-1 scale-105' : 'hover:border-white/[0.12]',
        isSelected && 'ring-1 ring-inset',
      )}
      style={{
        background:   overlay ? '#1e2336' : 'rgba(255,255,255,0.03)',
        borderColor:  isSelected
          ? agent.accentColor
          : urgencyColor
            ? `${urgencyColor}50`
            : overlay
              ? `${agent.accentColor}40`
              : 'rgba(255,255,255,0.07)',
        boxShadow: overlay
          ? `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${agent.glowColor}`
          : urgency === 'overdue'
            ? '0 0 0 1px rgba(239,68,68,0.2)'
            : undefined,
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        {/* Selection checkbox (shown in bulk-select mode) */}
        {selectionMode && (
          <button
            onClick={() => onToggleSelect?.(task.id)}
            className="mt-0.5 shrink-0 transition-colors"
            style={{ color: isSelected ? agent.accentColor : '#475569' }}
          >
            {isSelected
              ? <Check size={13} className="opacity-100" />
              : <Square size={13} className="opacity-60" />
            }
          </button>
        )}

        {/* Drag handle */}
        {!selectionMode && (
          <button
            className="mt-0.5 text-slate-700 hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
            {...(dragHandleProps ?? {})}
          >
            <GripVertical size={13} />
          </button>
        )}

        {/* Priority icon */}
        <span className="mt-0.5 shrink-0">{PRIORITY_ICON[task.priority]}</span>

        {/* Title */}
        <p className={cn(
          'text-xs font-semibold leading-snug flex-1 min-w-0',
          task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-200',
        )}>
          {task.title}
        </p>

        {/* Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-all"
          >
            <ChevronDown size={10} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-6 z-20 min-w-[130px] rounded-xl overflow-hidden shadow-2xl"
                style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {next && (
                  <button
                    onClick={() => { onStatusChange(task.id, next.status); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06] transition-colors"
                  >
                    {next.label}
                  </button>
                )}
                {task.status !== 'failed' && task.status !== 'done' && (
                  <button
                    onClick={() => { onStatusChange(task.id, 'failed'); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-white/[0.06] transition-colors"
                  >
                    Отметить ошибку
                  </button>
                )}
                <button
                  onClick={() => { onDelete(task.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={10} /> Удалить
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-[10px] text-slate-500 leading-relaxed pl-8 line-clamp-2">{task.description}</p>
      )}

      {/* Live execution stream */}
      {execState && (
        <div className="pl-8 space-y-1.5">
          <ProgressBar value={execState.progress} color={agent.accentColor} size="sm" showLabel />
          {execState.text && (
            <div
              className="text-[10px] text-slate-400 leading-relaxed max-h-20 overflow-y-auto rounded-lg p-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {execState.text}
              <span className="inline-block w-1.5 h-3 ml-0.5 rounded-sm animate-pulse" style={{ background: agent.accentColor }} />
            </div>
          )}
        </div>
      )}

      {/* Progress bar (non-executing running tasks) */}
      {task.status === 'running' && !execState && (
        <div className="pl-8 flex items-center gap-2">
          <Loader2 size={10} className="animate-spin text-blue-400 shrink-0" />
          <ProgressBar value={task.progress} color={agent.accentColor} size="sm" showLabel />
        </div>
      )}

      {/* Result toggle for completed tasks */}
      {task.status === 'done' && savedResult && (
        <div className="pl-8">
          {/* Header row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setResultOpen(o => !o)}
              className="flex items-center gap-1.5 text-[10px] transition-colors flex-1 min-w-0"
              style={{ color: resultOpen ? agent.accentColor : '#64748b' }}
            >
              <FileText size={10} className="shrink-0" />
              {resultOpen ? 'Скрыть результат' : 'Результат агента'}
              {resultOpen ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>
            {/* Copy button */}
            <button
              onClick={() => copyResult(savedResult)}
              title="Копировать результат"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all shrink-0"
              style={{
                background: copied ? `${agent.accentColor}22` : 'rgba(255,255,255,0.04)',
                color:      copied ? agent.accentColor : '#64748b',
                border:     `1px solid ${copied ? agent.accentColor + '44' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <Copy size={8} />
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
            {/* Fullscreen button */}
            <button
              onClick={() => setFullScreen(true)}
              title="Открыть полностью"
              className="p-1 rounded text-slate-700 hover:text-slate-400 transition-colors shrink-0"
            >
              <Maximize2 size={9} />
            </button>
          </div>

          {/* Inline preview */}
          <AnimatePresence>
            {resultOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-1.5"
              >
                <div
                  className="text-[10px] text-slate-300 leading-relaxed max-h-52 overflow-y-auto rounded-lg p-2.5 whitespace-pre-wrap"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${agent.accentColor}20` }}
                >
                  {savedResult}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Full-screen result modal */}
      <AnimatePresence>
        {fullScreen && savedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setFullScreen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{ scale: 0.95,    opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
              style={{ background: '#0e1628', border: `1px solid ${agent.accentColor}35` }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center gap-3 px-5 py-3.5 shrink-0 border-b border-white/[0.06]">
                <span className="text-sm font-semibold text-slate-200 flex-1 truncate">
                  {task.title}
                </span>
                <button
                  onClick={() => copyResult(savedResult)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: copied ? `${agent.accentColor}22` : 'rgba(255,255,255,0.06)',
                    color:      copied ? agent.accentColor : '#94a3b8',
                    border:     `1px solid ${copied ? agent.accentColor + '44' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <Copy size={11} />
                  {copied ? 'Скопировано ✓' : 'Копировать'}
                </button>
                <button
                  onClick={() => setFullScreen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              {/* Modal body */}
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {savedResult}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Subtasks section ─────────────────────────────────────────────── */}
      <div className="pl-8">
        {/* Toggle row */}
        <button
          onClick={() => setSubtasksOpen(o => !o)}
          className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          <ListTodo size={10} />
          {totalSubs > 0
            ? <span>{doneCount}/{totalSubs} подзадач</span>
            : <span className="opacity-60">Добавить подзадачи</span>
          }
          {totalSubs > 0 && (subtasksOpen ? <ChevronUp size={9} /> : <ChevronDown size={9} />)}
        </button>

        {/* Subtask mini-progress bar */}
        {totalSubs > 0 && !subtasksOpen && (
          <div className="mt-1 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${totalSubs ? (doneCount / totalSubs) * 100 : 0}%`, background: agent.accentColor }}
            />
          </div>
        )}

        {/* Subtask list */}
        <AnimatePresence>
          {subtasksOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-1.5 space-y-1"
            >
              {subtasks.map(s => {
                const isExecuting   = subtaskStream.has(s.id);
                const streamText    = subtaskStream.get(s.id) ?? '';
                const subtaskResult = !isExecuting && s.done
                  ? localStorage.getItem(`subtask_result:${s.id}`)
                  : null;

                return (
                  <div key={s.id} className="space-y-0.5">
                    <div className="group flex items-center gap-1.5">
                      <button
                        onClick={() => toggleSubtask(s.id)}
                        className="shrink-0 transition-colors"
                        style={{ color: s.done ? agent.accentColor : isExecuting ? '#f59e0b' : '#475569' }}
                      >
                        {isExecuting
                          ? <Loader2 size={11} className="animate-spin" />
                          : s.done
                            ? <Check size={11} />
                            : <Square size={11} />
                        }
                      </button>
                      <span className={cn(
                        'text-[11px] flex-1',
                        s.done && !isExecuting ? 'text-slate-600 line-through' : 'text-slate-300',
                      )}>
                        {s.text}
                      </span>
                      {subtaskResult && (
                        <button
                          onClick={() => navigator.clipboard.writeText(subtaskResult)}
                          className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-slate-400 transition-all shrink-0"
                          title="Копировать результат"
                        >
                          <Copy size={9} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteSubtask(s.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-400 transition-all shrink-0"
                      >
                        <X size={9} />
                      </button>
                    </div>

                    {/* Live stream */}
                    {isExecuting && streamText && (
                      <div
                        className="ml-4 text-[9px] text-slate-400 leading-relaxed max-h-16 overflow-y-auto rounded p-1.5"
                        style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${agent.accentColor}40` }}
                      >
                        {streamText}
                        <span className="inline-block w-1 h-2.5 ml-0.5 align-middle animate-pulse rounded-sm" style={{ background: agent.accentColor }} />
                      </div>
                    )}

                    {/* Saved result (collapsed by default, shown on hover/expand) */}
                    {subtaskResult && (
                      <div
                        className="ml-4 text-[9px] text-slate-500 leading-relaxed max-h-12 overflow-hidden rounded p-1.5 cursor-pointer hover:max-h-40 transition-all duration-300"
                        style={{ background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${agent.accentColor}25` }}
                        title="Наведи чтобы развернуть"
                      >
                        {subtaskResult}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Add subtask input */}
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-[11px] shrink-0" />
                <input
                  ref={subtaskInputRef}
                  value={newSubtaskText}
                  onChange={e => setNewSubtaskText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                  placeholder="Новая подзадача…"
                  className="flex-1 text-[11px] bg-transparent border-b border-white/[0.07] focus:border-white/[0.18] outline-none text-slate-400 placeholder:text-slate-700 py-0.5 transition-colors"
                />
                <button onClick={addSubtask} disabled={!newSubtaskText.trim()}
                  className="text-slate-700 hover:text-slate-400 transition-colors disabled:opacity-30 shrink-0">
                  <Plus size={10} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 pl-8 text-[10px] text-slate-600">
        <span>{formatRelativeTime(task.updatedAt)}</span>
        {task.estimatedMinutes && task.status !== 'done' && (
          <span className="flex items-center gap-0.5">
            <Clock size={8} /> ~{task.estimatedMinutes} мин
          </span>
        )}
        {task.status === 'failed' && (
          <Badge size="xs" variant="rose">Ошибка</Badge>
        )}
        {dueDate && task.status !== 'done' && <DeadlineBadge dueDate={dueDate} />}
        {dueDate && task.status === 'done' && (
          <span className="text-slate-700 flex items-center gap-0.5">
            <CalendarClock size={8} />
            {new Date(dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, agent, onStatusChange, onDelete, dueDates,
  selectedIds, onToggleSelect, selectionMode }: {
  col: typeof COLUMNS[number];
  tasks: Task[];
  agent: Agent;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  dueDates: Record<string, string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}) {
  // Count overdue tasks in this column
  const overdueCount = tasks.filter(t =>
    dueDates[t.id] && t.status !== 'done' && getUrgency(dueDates[t.id]) === 'overdue',
  ).length;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl mb-1 shrink-0"
        style={{ background: col.bg, borderBottom: `1px solid ${col.color}20` }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
        <span className="text-[11px] font-semibold" style={{ color: col.color }}>{col.label}</span>
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${col.color}18`, color: col.color }}
        >
          {tasks.length}
        </span>
        {/* Overdue indicator */}
        {overdueCount > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
            {overdueCount} просроч.
          </span>
        )}
      </div>

      {/* Droppable cards list */}
      <div
        className="flex-1 overflow-y-auto rounded-b-xl p-2 space-y-2 min-h-[80px]"
        style={{ background: col.bg }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tasks.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                <SortableTaskCard
                  task={task} agent={agent}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  dueDate={dueDates[task.id]}
                  isSelected={selectedIds.has(task.id)}
                  onToggleSelect={onToggleSelect}
                  selectionMode={selectionMode}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-16 text-[10px] text-slate-700">
              Перетащите задачу сюда
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentTabTasks({ agent }: { agent: Agent }) {
  const { tasks, loading, createTask, updateStatus, deleteTask } = useTasks(agent.id);
  const { session } = useAuth();
  const [showForm,      setShowForm]      = useState(false);
  const [activeTaskId,  setActiveTaskId]  = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [execMap,       setExecMap]       = useState<Map<string, ExecState>>(new Map());

  async function executeTask(task: Task) {
    const token = session?.access_token;

    setExecMap(prev => new Map(prev).set(task.id, { text: '', progress: 5 }));

    try {
      for await (const event of streamTaskExecution(task, token)) {
        if (event.type === 'chunk') {
          setExecMap(prev => {
            const m = new Map(prev);
            const cur = m.get(task.id) ?? { text: '', progress: 5 };
            m.set(task.id, { ...cur, text: cur.text + (event.text ?? '') });
            return m;
          });
        } else if (event.type === 'progress') {
          setExecMap(prev => {
            const m = new Map(prev);
            const cur = m.get(task.id) ?? { text: '', progress: 0 };
            m.set(task.id, { ...cur, progress: event.value ?? cur.progress });
            return m;
          });
        } else if (event.type === 'done') {
          if (event.result) saveTaskResult(task.id, event.result);
          setExecMap(prev => { const m = new Map(prev); m.delete(task.id); return m; });
        } else if (event.type === 'error') {
          console.error('[executeTask]', event.message);
          setExecMap(prev => { const m = new Map(prev); m.delete(task.id); return m; });
        }
      }
    } catch {
      setExecMap(prev => { const m = new Map(prev); m.delete(task.id); return m; });
    }
  }

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => { setSelectedIds(new Set()); setSelectionMode(false); };
  const bulkDelete = () => {
    selectedIds.forEach(id => { deleteTask(id); });
    clearSelection();
  };
  const bulkMove = (status: TaskStatus) => {
    selectedIds.forEach(id => updateStatus(id, status));
    clearSelection();
  };

  // ── Due dates — stored in localStorage keyed by agentId ───────────────────
  const DUE_DATES_KEY = `tasks:due:${agent.id}`;
  const [dueDates, setDueDates] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(DUE_DATES_KEY) ?? '{}') as Record<string, string>; }
    catch { return {}; }
  });

  function saveDueDate(taskId: string, date: string | undefined) {
    setDueDates(prev => {
      const next = { ...prev };
      if (date) next[taskId] = date;
      else delete next[taskId];
      localStorage.setItem(DUE_DATES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const targetTask  = tasks.find(t => t.id === String(over.id));
    const draggedTask = tasks.find(t => t.id === String(active.id));
    if (!targetTask || !draggedTask) return;

    if (targetTask.status !== draggedTask.status) {
      updateStatus(draggedTask.id, targetTask.status);
    }
  };

  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;

  const handleCreate = async (
    title: string, description: string, priority: TaskPriority,
    mins?: number, dueDate?: string,
  ) => {
    const task = await createTask({ agentId: agent.id, title, description, priority, estimatedMinutes: mins });
    if (!task) return;
    if (dueDate) saveDueDate(task.id, dueDate);
    // Auto-execute: fire-and-forget (runs in background while user continues)
    executeTask(task);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    saveDueDate(id, undefined);
  };

  if (loading) {
    return <SkeletonKanban />;
  }

  return (
    <div className="h-full flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Задачи</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.07]">
            {tasks.length} всего
          </span>
          {Object.entries(dueDates).some(([id, d]) => {
            const t = tasks.find(x => x.id === id);
            return t && t.status !== 'done' && getUrgency(d) === 'overdue';
          }) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <CalendarClock size={9} /> Есть просроченные
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk-select toggle */}
          <button
            onClick={() => { setSelectionMode(v => !v); setSelectedIds(new Set()); }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
              selectionMode
                ? 'text-white'
                : 'bg-white/[0.05] border border-white/[0.07] text-slate-500 hover:text-slate-300',
            )}
            style={selectionMode ? { background: agent.accentColor } : {}}
          >
            <Layers size={11} /> {selectionMode ? 'Выбрано' : 'Выбрать'}
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: `${agent.accentColor}22`, border: `1px solid ${agent.accentColor}44`, color: agent.accentColor }}
          >
            <Plus size={12} /> Новая задача
          </button>
        </div>
      </div>

      {/* New task form */}
      <AnimatePresence>
        {showForm && (
          <NewTaskForm agent={agent} onClose={() => setShowForm(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>

      {/* Kanban columns */}
      <ExecContext.Provider value={execMap}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-3 gap-3 min-h-0 overflow-hidden">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={byStatus(col.id)}
              agent={agent}
              onStatusChange={updateStatus}
              onDelete={handleDelete}
              dueDates={dueDates}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              selectionMode={selectionMode}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              agent={agent}
              onStatusChange={updateStatus}
              onDelete={handleDelete}
              dueDate={dueDates[activeTask.id]}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>
      </ExecContext.Provider>

      {/* ── Bulk-action floating bar ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: '#0e1628',
              border: `1px solid ${agent.accentColor}35`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            <span className="text-xs font-semibold mr-1" style={{ color: agent.accentColor }}>
              {selectedIds.size} задач
            </span>
            <span className="text-slate-700 text-xs">→ переместить в:</span>
            {COLUMNS.map(col => (
              <button
                key={col.id}
                onClick={() => bulkMove(col.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                style={{ background: `${col.color}18`, border: `1px solid ${col.color}30`, color: col.color }}
              >
                <MoveRight size={10} /> {col.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={bulkDelete}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <Trash2 size={10} /> Удалить
            </button>
            <button
              onClick={clearSelection}
              className="text-slate-600 hover:text-slate-400 transition-colors p-1"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
