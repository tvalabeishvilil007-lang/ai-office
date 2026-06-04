import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, Trash2, User, Bot, FileText, X,
  Globe, Lock, Sparkles, Star, Tag, Users, Database,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { useMemory } from '../../hooks/useMemory';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { Agent, MemoryEntry } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// AgentTabMemory — full learning ecosystem UI
//
// Sections:
//   Stats bar      — total / global / contributors counts
//   Личная память  — my own memories, toggle global sharing, delete
//   Глобальные     — memories from ALL users marked is_global, read-only
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<MemoryEntry['source'], { icon: React.ReactNode; label: string; color: string }> = {
  user:     { icon: <User     size={10} />, label: 'Добавлено вами',   color: '#6366f1' },
  agent:    { icon: <Bot      size={10} />, label: 'Извлечено из чата', color: '#3b82f6' },
  document: { icon: <FileText size={10} />, label: 'Из документа',     color: '#10b981' },
};

// ── Importance stars ──────────────────────────────────────────────────────────

function ImportanceDots({ value }: { value: number }) {
  const filled = Math.round((value ?? 5) / 2);   // 1-10 → 1-5 dots
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={8}
          fill={i < filled ? 'currentColor' : 'none'}
          className={i < filled ? 'text-amber-400' : 'text-slate-700'}
        />
      ))}
    </div>
  );
}

// ── Tag chips ─────────────────────────────────────────────────────────────────

function TagChips({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {tags.slice(0, 4).map(t => (
        <span
          key={t}
          className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
        >
          <Tag size={7} /> {t}
        </span>
      ))}
    </div>
  );
}

// ── Memory card ───────────────────────────────────────────────────────────────

function MemoryCard({
  entry,
  agent,
  onDelete,
  onToggleGlobal,
}: {
  entry:          MemoryEntry;
  agent:          Agent;
  onDelete?:      (id: string) => void;
  onToggleGlobal?: (id: string, current: boolean) => void;
}) {
  const src = SOURCE_CONFIG[entry.source];
  const isGlobal     = entry.isGlobal ?? false;
  const isOwnedByMe  = entry.isOwnedByMe !== false;  // default true for backward compat

  return (
    <GlassCard variant="default" padding="none" hoverable className="group overflow-hidden">
      <div className="flex items-stretch">
        {/* Accent strip — blue for global, agent color for personal */}
        <div
          className="w-1 shrink-0"
          style={{ background: isGlobal && !isOwnedByMe ? '#3b82f6' : agent.accentColor }}
        />

        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Key */}
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {entry.key}
                </p>
                {isGlobal && (
                  <span
                    className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}
                  >
                    <Globe size={8} /> Глобальное
                  </span>
                )}
              </div>

              {/* Value */}
              <p className="text-sm text-slate-300 leading-relaxed">{entry.value}</p>

              {/* Tags */}
              <TagChips tags={entry.tags ?? []} />
            </div>

            {/* Actions (own memories only) */}
            {isOwnedByMe && (
              <div className={cn(
                'flex items-center gap-1 shrink-0',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
              )}>
                {/* Toggle global */}
                {onToggleGlobal && (
                  <button
                    onClick={() => onToggleGlobal(entry.id, isGlobal)}
                    title={isGlobal ? 'Скрыть от других' : 'Поделиться со всеми'}
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                      isGlobal
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-slate-600 hover:text-blue-400 hover:bg-blue-500/10',
                    )}
                  >
                    {isGlobal ? <Globe size={12} /> : <Lock size={12} />}
                  </button>
                )}

                {/* Delete */}
                {onDelete && (
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer meta */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: src.color }}>
              {src.icon} {src.label}
            </span>
            <span className="text-[10px] text-slate-700">·</span>
            <span className="text-[10px] text-slate-600">{formatDate(entry.addedAt)}</span>
            <span className="text-[10px] text-slate-700">·</span>
            <ImportanceDots value={entry.importance ?? 5} />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Section with collapse ─────────────────────────────────────────────────────

function Section({
  title, count, icon, children, defaultOpen = true, emptyText,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  emptyText: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 mb-2 text-left group/section"
      >
        <span className="text-slate-500 group-hover/section:text-slate-300 transition-colors">
          {icon}
        </span>
        <span className="text-xs font-semibold text-slate-400 group-hover/section:text-slate-300 transition-colors flex-1">
          {title}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.05] text-slate-500">
          {count}
        </span>
        <span className="text-slate-600">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {count === 0 ? (
              <p className="text-xs text-slate-600 text-center py-6">{emptyText}</p>
            ) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add memory form ───────────────────────────────────────────────────────────

function AddMemoryForm({
  agent, onClose, onAdd,
}: {
  agent: Agent;
  onClose: () => void;
  onAdd: (key: string, value: string) => Promise<void>;
}) {
  const [key,    setKey]    = useState('');
  const [value,  setValue]  = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!key.trim() || !value.trim()) return;
    setSaving(true);
    await onAdd(key, value);
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-4"
    >
      <GlassCard variant="default" padding="md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300">Добавить запись</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2">
          <input
            autoFocus
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Ключ (напр. «Имя», «Компания», «Предпочтения»)…"
            className={cn(
              'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2',
              'text-slate-200 placeholder:text-slate-600',
              'focus:outline-none focus:border-white/[0.18]',
            )}
          />
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Значение (напр. «Лаша», «AI Офис», «предпочитает короткие ответы»)…"
            rows={2}
            className={cn(
              'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2',
              'text-slate-200 placeholder:text-slate-600 resize-none',
              'focus:outline-none focus:border-white/[0.18]',
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!key.trim() || !value.trim() || saving}
            className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: agent.accentColor }}
          >
            {saving ? 'Сохраняю…' : 'Сохранить в память'}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface AgentTabMemoryProps {
  agent: Agent;
}

export function AgentTabMemory({ agent }: AgentTabMemoryProps) {
  const { toast }           = useToast();
  const { session: authSes } = useAuth();
  const {
    memories, loading,
    stats, statsLoading,
    addMemory, deleteMemory, toggleGlobal,
  } = useMemory(agent.id);

  const [showForm,     setShowForm]     = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);

  const ownMemories  = memories.filter(m =>  m.isOwnedByMe !== false);
  const globalOthers = memories.filter(m =>  m.isOwnedByMe === false && m.isGlobal);

  const handleDelete = async (id: string) => {
    await deleteMemory(id);
    toast.success('Запись удалена');
  };

  const handleToggleGlobal = async (id: string, current: boolean) => {
    await toggleGlobal(id, current);
    toast.success(current ? 'Скрыто от других пользователей' : 'Теперь видно всем пользователям платформы');
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 8 * 1024 * 1024) {
      toast.error('PDF слишком большой (максимум 8 МБ)');
      return;
    }

    setPdfUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/pdf/memory', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(authSes?.access_token ? { Authorization: `Bearer ${authSes.access_token}` } : {}),
        },
        body: JSON.stringify({ agentId: agent.id, pdfBase64: base64, fileName: file.name }),
      });

      if (!res.ok) throw new Error('Server error');
      const data = await res.json() as { saved: number };
      toast.success(`PDF обработан — ${data.saved} фактов сохранено в память`);
    } catch {
      toast.error('Не удалось извлечь данные из PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">

      {/* Hidden PDF input */}
      <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-200">Память агента</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.07]">
            {memories.length} записей
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* PDF import */}
          <button
            onClick={() => pdfRef.current?.click()}
            disabled={pdfUploading}
            title="Загрузить PDF в память"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400',
              'hover:bg-emerald-500/20 disabled:opacity-40',
            )}
          >
            {pdfUploading
              ? <><Loader2 size={11} className="animate-spin" /> Читаю PDF…</>
              : <><FileText size={11} /> PDF в память</>
            }
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: `${agent.accentColor}22`,
              border: `1px solid ${agent.accentColor}44`,
              color: agent.accentColor,
            }}
          >
            <Plus size={12} /> Добавить
          </button>
        </div>
      </div>

      {/* ── Ecosystem stats bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {[
          {
            label: 'Всего записей',
            value: statsLoading ? '…' : String(stats.total || memories.length),
            icon: <Database size={13} />,
            color: agent.accentColor,
          },
          {
            label: 'Глобальных',
            value: statsLoading ? '…' : String(stats.global),
            icon: <Globe size={13} />,
            color: '#3b82f6',
          },
          {
            label: 'Участников',
            value: statsLoading ? '…' : String(stats.contributors || 1),
            icon: <Users size={13} />,
            color: '#10b981',
          },
        ].map(({ label, value, icon, color }) => (
          <GlassCard key={label} variant="dark" padding="sm">
            <div className="flex items-center gap-2 mb-1" style={{ color }}>
              {icon}
              <span className="text-lg font-bold text-white">{value}</span>
            </div>
            <p className="text-[10px] text-slate-500">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Info banner ─────────────────────────────────────────────────────── */}
      <GlassCard variant="dark" padding="sm" className="shrink-0">
        <div className="flex items-start gap-2 text-xs text-slate-400">
          <Brain size={14} className="shrink-0 mt-0.5" style={{ color: agent.accentColor }} />
          <p>
            <span className="text-slate-300 font-medium">{agent.name}</span>{' '}
            использует эту память в каждом разговоре.{' '}
            <span className="text-slate-500">
              Личные данные — только у вас. Глобальные записи помогают всем пользователям платформы.
            </span>
          </p>
        </div>
      </GlassCard>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5">

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <AddMemoryForm
              agent={agent}
              onClose={() => setShowForm(false)}
              onAdd={addMemory}
            />
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          </div>
        )}

        {/* ── Section 1: Personal memories ─────────────────────────────────── */}
        {!loading && (
          <Section
            title="Личная память"
            count={ownMemories.length}
            icon={<Lock size={13} />}
            emptyText="Нет личных записей — добавьте первую или извлеките из чата"
          >
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {ownMemories.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <MemoryCard
                      entry={entry}
                      agent={agent}
                      onDelete={handleDelete}
                      onToggleGlobal={handleToggleGlobal}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Section>
        )}

        {/* ── Section 2: Global knowledge from other users ──────────────────── */}
        {!loading && (
          <Section
            title="Коллективные знания"
            count={globalOthers.length}
            icon={<Globe size={13} />}
            defaultOpen={globalOthers.length > 0}
            emptyText="Пока никто не поделился глобальными знаниями для этого агента"
          >
            <div className="space-y-2">
              {/* How it works hint */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.12)' }}>
                <Sparkles size={11} className="text-blue-400 shrink-0" />
                <p className="text-[10px] text-slate-500">
                  Агент автоматически использует эти знания — они накоплены от всех пользователей платформы
                </p>
              </div>

              <AnimatePresence initial={false}>
                {globalOthers.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <MemoryCard
                      entry={entry}
                      agent={agent}
                      // No delete / toggle for others' memories
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}
