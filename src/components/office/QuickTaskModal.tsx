import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ChevronDown, Flame, AlertCircle, Clock, Circle } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useToast } from '../ui/Toast';
import { useAgents } from '../../contexts/AgentManagerContext';
import { cn } from '../../utils/cn';
import type { TaskPriority } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// QuickTaskModal — create a task for any agent directly from the office view
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'critical', label: 'Критично',  icon: <Flame       size={12} />, color: '#f43f5e' },
  { value: 'high',     label: 'Высокий',   icon: <AlertCircle size={12} />, color: '#f97316' },
  { value: 'medium',   label: 'Средний',   icon: <Clock       size={12} />, color: '#3b82f6' },
  { value: 'low',      label: 'Низкий',    icon: <Circle      size={12} />, color: '#6b7280' },
];

interface QuickTaskModalProps {
  onClose: () => void;
  defaultAgentId?: string;
}

export function QuickTaskModal({ onClose, defaultAgentId }: QuickTaskModalProps) {
  const { createTask } = useTasks();
  const { toast } = useToast();
  const { visibleAgents } = useAgents();

  const activeAgents = visibleAgents.filter(a => a.status !== 'offline');

  const [agentId,      setAgentId]      = useState(defaultAgentId ?? activeAgents[0]?.id ?? '');
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [priority,     setPriority]     = useState<TaskPriority>('medium');
  const [agentOpen,    setAgentOpen]    = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [saving,       setSaving]       = useState(false);

  const selectedAgent    = visibleAgents.find(a => a.id === agentId) ?? activeAgents[0];
  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === priority)!;

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await createTask({
      agentId,
      title:       title.trim(),
      description: description.trim(),
      priority,
    });
    setSaving(false);
    toast.success(`Задача поставлена → ${selectedAgent.name}`);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 16, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{ background: '#0f1520', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Zap size={13} className="text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Быстрая задача</span>
            </div>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {/* Title */}
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Название задачи…"
              className={cn(
                'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5',
                'text-slate-200 placeholder:text-slate-600',
                'focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06]',
                'transition-all',
              )}
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание (необязательно)…"
              rows={2}
              className={cn(
                'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 resize-none',
                'text-slate-200 placeholder:text-slate-600',
                'focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06]',
                'transition-all',
              )}
            />

            {/* Agent + Priority row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Agent selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setAgentOpen(v => !v); setPriorityOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 text-xs rounded-xl px-3 py-2.5',
                    'bg-white/[0.04] border border-white/[0.08] text-slate-300',
                    'hover:border-white/[0.15] transition-colors',
                  )}
                >
                  <span className="text-sm shrink-0">{selectedAgent.avatar}</span>
                  <span className="flex-1 text-left truncate">{selectedAgent.name}</span>
                  <ChevronDown size={10} className="text-slate-500 shrink-0" />
                </button>
                <AnimatePresence>
                  {agentOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute left-0 top-full mt-1 z-30 w-full max-h-52 overflow-y-auto rounded-xl shadow-2xl"
                      style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {activeAgents.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { setAgentId(a.id); setAgentOpen(false); }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                            a.id === agentId
                              ? 'text-white bg-white/[0.08]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]',
                          )}
                        >
                          <span>{a.avatar}</span>
                          <span className="truncate">{a.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Priority selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setPriorityOpen(v => !v); setAgentOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 text-xs rounded-xl px-3 py-2.5',
                    'bg-white/[0.04] border border-white/[0.08] text-slate-300',
                    'hover:border-white/[0.15] transition-colors',
                  )}
                >
                  <span style={{ color: selectedPriority.color }}>{selectedPriority.icon}</span>
                  <span className="flex-1 text-left">{selectedPriority.label}</span>
                  <ChevronDown size={10} className="text-slate-500 shrink-0" />
                </button>
                <AnimatePresence>
                  {priorityOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute left-0 top-full mt-1 z-30 w-full rounded-xl shadow-2xl overflow-hidden"
                      style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {PRIORITY_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                            p.value === priority
                              ? 'text-white bg-white/[0.08]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]',
                          )}
                        >
                          <span style={{ color: p.color }}>{p.icon}</span>
                          {p.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{
                background: saving
                  ? 'rgba(59,130,246,0.5)'
                  : `linear-gradient(135deg, ${selectedAgent.accentColor}, ${selectedAgent.accentColor}cc)`,
              }}
            >
              {saving ? 'Создаю…' : `Поставить задачу → ${selectedAgent.name}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
