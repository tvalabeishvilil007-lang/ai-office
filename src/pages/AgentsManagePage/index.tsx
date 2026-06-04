import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Check, X,
  Zap, Lock, ChevronRight, Sparkles, Users,
} from 'lucide-react';
import { Sidebar   } from '../../components/layout/Sidebar';
import { Topbar    } from '../../components/layout/Topbar';
import { MobileNav } from '../../components/layout/MobileNav';
import { useAgents } from '../../contexts/AgentManagerContext';
import { StatusDot } from '../../components/ui/StatusDot';
import { cn } from '../../utils/cn';
import type { AgentCategory } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// AgentsManagePage — enable/disable built-ins, create/edit/delete custom agents
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT_COLORS = [
  '#3b82f6','#6366f1','#8b5cf6','#ec4899','#f43f5e',
  '#f59e0b','#10b981','#14b8a6','#06b6d4','#84cc16',
  '#f97316','#64748b',
];

const AVATARS = [
  '⚖️','💼','💰','📊','🔬','🎯','🏠','🤝',
  '🧠','🎨','💡','🚀','⚡','🌍','📝','🔧',
  '💎','🎓','🤖','👔','🏆','🌟','🔐','📱',
];

const CATEGORIES: { value: AgentCategory; label: string }[] = [
  { value: 'legal',       label: 'Юридический' },
  { value: 'business',    label: 'Бизнес'      },
  { value: 'finance',     label: 'Финансы'     },
  { value: 'marketing',   label: 'Маркетинг'   },
  { value: 'research',    label: 'Исследования'},
  { value: 'sales',       label: 'Продажи'     },
  { value: 'realestate',  label: 'Недвижимость'},
  { value: 'personal',    label: 'Персональный'},
  { value: 'hr',          label: 'HR'          },
  { value: 'tech',        label: 'Технологии'  },
  { value: 'operations',  label: 'Операции'    },
];

// ── Agent form (add / edit) ───────────────────────────────────────────────────

interface FormState {
  name:         string;
  title:        string;
  category:     AgentCategory;
  avatar:       string;
  accentColor:  string;
  description:  string;
  skillsRaw:    string; // comma-separated
  systemPrompt: string;
}

const EMPTY_FORM: FormState = {
  name: '', title: '', category: 'business', avatar: '🤖',
  accentColor: '#6366f1', description: '', skillsRaw: '', systemPrompt: '',
};

function AgentFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: FormState;
  onSave: (f: FormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM);
  const [tab,  setTab]  = useState<'basic' | 'prompt'>('basic');

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const valid = form.name.trim() && form.title.trim() && form.systemPrompt.trim();

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#0c1020',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
        }}
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                 style={{ background: `${form.accentColor}20`, border: `1px solid ${form.accentColor}40` }}>
              {form.avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{form.name || 'Новый агент'}</p>
              <p className="text-[10px] text-slate-500">{form.title || 'Должность'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1 pt-3 shrink-0">
          {(['basic', 'prompt'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      tab === t ? 'bg-white/[0.08] text-white border border-white/[0.10]'
                                : 'text-slate-500 hover:text-slate-300')}>
              {t === 'basic' ? 'Основное' : 'Системный промпт'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {tab === 'basic' ? (
            <>
              {/* Name + Title */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Имя агента *">
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                         placeholder="Например: SEO-специалист"
                         className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50" />
                </Field>
                <Field label="Должность *">
                  <input value={form.title} onChange={e => set('title', e.target.value)}
                         placeholder="Эксперт по SEO"
                         className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50" />
                </Field>
              </div>

              {/* Category */}
              <Field label="Категория">
                <select value={form.category} onChange={e => set('category', e.target.value as AgentCategory)}
                        className="w-full bg-[#0c1020] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>

              {/* Avatar */}
              <Field label="Аватар">
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map(e => (
                    <button key={e} onClick={() => set('avatar', e)}
                            className={cn('h-9 rounded-xl flex items-center justify-center text-xl transition-all',
                              form.avatar === e
                                ? 'ring-2 scale-110'
                                : 'bg-white/[0.04] hover:bg-white/[0.08]')}
                            style={form.avatar === e ? { outline: `2px solid ${form.accentColor}`, background: `${form.accentColor}20` } : undefined}>
                      {e}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Color */}
              <Field label="Цвет акцента">
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map(c => (
                    <button key={c} onClick={() => set('accentColor', c)}
                            className="w-8 h-8 rounded-xl border-2 transition-all duration-150 hover:scale-110"
                            style={{
                              background: c,
                              borderColor: form.accentColor === c ? '#fff' : 'transparent',
                              boxShadow: form.accentColor === c ? `0 0 12px ${c}` : 'none',
                            }}>
                      {form.accentColor === c && <Check size={14} className="text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Description */}
              <Field label="Описание">
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                          rows={2} placeholder="Краткое описание специализации агента"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 resize-none" />
              </Field>

              {/* Skills */}
              <Field label="Навыки (через запятую)">
                <input value={form.skillsRaw} onChange={e => set('skillsRaw', e.target.value)}
                       placeholder="SEO-оптимизация, Контент-маркетинг, Аналитика"
                       className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50" />
                {form.skillsRaw && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.skillsRaw.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-lg text-[11px] font-medium"
                            style={{ background: `${form.accentColor}18`, color: form.accentColor, border: `1px solid ${form.accentColor}30` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </>
          ) : (
            <Field label="Системный промпт *" hint="Опиши роль, поведение и ограничения агента">
              <textarea value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)}
                        rows={12} placeholder={`Ты — [имя агента], эксперт по [область].\n\nТвоя задача: ...\n\nОтвечай на русском языке, профессионально и конкретно.`}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 resize-none font-mono text-xs leading-relaxed" />
              <p className="text-[10px] text-slate-600 mt-1">{form.systemPrompt.length} символов</p>
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-3 shrink-0"
             style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 border border-white/[0.07] hover:border-white/[0.12] transition-all">
            Отмена
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className={cn('flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all',
              valid ? 'text-white hover:scale-[1.02]' : 'opacity-40 cursor-not-allowed text-slate-500')}
            style={valid ? { background: form.accentColor, boxShadow: `0 0 20px ${form.accentColor}50` } : { background: 'rgba(255,255,255,0.05)' }}
          >
            <Check size={14} /> Сохранить
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function AgentsManagePage() {
  const navigate = useNavigate();
  const { builtinAgents, customAgents, toggleBuiltin, addCustom, updateCustom, deleteCustom } = useAgents();

  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function openEdit(id: string) {
    const rec = customAgents.find(r => r.id === id);
    if (!rec) return;
    setEditingId(id);
    setShowForm(true);
  }

  function handleSave(form: FormState) {
    const skills = form.skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const data = {
      name: form.name.trim(), title: form.title.trim(), category: form.category,
      avatar: form.avatar, accentColor: form.accentColor,
      description: form.description.trim(), skills, systemPrompt: form.systemPrompt.trim(),
    };
    if (editingId) {
      updateCustom(editingId, { ...data, slug: editingId });
    } else {
      addCustom(data);
    }
    setShowForm(false);
    setEditingId(null);
  }

  function getEditForm(id: string): FormState | undefined {
    const rec = customAgents.find(r => r.id === id);
    if (!rec) return undefined;
    return {
      name: rec.name, title: rec.title, category: rec.category,
      avatar: rec.avatar, accentColor: rec.accentColor,
      description: rec.description, skillsRaw: rec.skills.join(', '),
      systemPrompt: rec.systemPrompt,
    };
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#07090f' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Управление агентами" />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8 pb-12">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">Агенты</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {builtinAgents.filter(a => a.enabled).length + customAgents.length} активных ·{' '}
                {builtinAgents.filter(a => !a.enabled).length} отключено
              </p>
            </div>
            <button
              onClick={() => { setEditingId(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}
            >
              <Plus size={14} /> Добавить агента
            </button>
          </motion.div>

          {/* ── Custom agents ───────────────────────────────────────────────── */}
          {customAgents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles size={12} className="text-indigo-400" /> Мои агенты ({customAgents.length})
              </h2>
              <div className="grid gap-2">
                {customAgents.map(rec => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-200"
                    style={{ background: `${rec.accentColor}08`, borderColor: `${rec.accentColor}25` }}
                  >
                    <button onClick={() => navigate(`/agent/${rec.slug}`)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 hover:scale-110 transition-transform"
                            style={{ background: `${rec.accentColor}18`, border: `1px solid ${rec.accentColor}35` }}>
                      {rec.avatar}
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/agent/${rec.slug}`)} role="button">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-200">{rec.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                              style={{ background: `${rec.accentColor}18`, color: rec.accentColor }}>
                          Кастомный
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{rec.title}</p>
                      {rec.skills.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {rec.skills.slice(0, 3).map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600">{s}</span>
                          ))}
                          {rec.skills.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-700">+{rec.skills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(rec.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                        <Edit3 size={13} />
                      </button>
                      {deleteConfirm === rec.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { deleteCustom(rec.id); setDeleteConfirm(null); }}
                                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all">
                            Удалить
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(rec.id)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button onClick={() => navigate(`/agent/${rec.slug}`)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Built-in agents ─────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={12} /> Встроенные агенты ({builtinAgents.length})
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {builtinAgents.map((agent, i) => (
                <div
                  key={agent.id}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3.5 transition-all duration-200',
                    !agent.enabled && 'opacity-50',
                    i < builtinAgents.length - 1 && 'border-b border-white/[0.04]',
                  )}
                  style={{ background: agent.enabled ? `${agent.accentColor}06` : 'transparent' }}
                >
                  {/* Avatar */}
                  <button onClick={() => agent.enabled && navigate(`/agent/${agent.slug}`)}
                          className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform',
                            agent.enabled ? 'hover:scale-110 cursor-pointer' : 'cursor-default')}
                          style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}${agent.enabled ? '35' : '20'}` }}>
                    {agent.avatar}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{agent.name}</p>
                      {agent.enabled
                        ? <StatusDot status={agent.status} size="sm" />
                        : <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600">Выключен</span>
                      }
                      {agent.isFeatured && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ background: `${agent.accentColor}18`, color: agent.accentColor }}>★ Главный</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{agent.title}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {agent.skills.slice(0, 3).map(s => (
                        <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600">{s.label}</span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {agent.enabled && (
                      <button onClick={() => navigate(`/agent/${agent.slug}`)}
                              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-all">
                        Открыть <ChevronRight size={10} />
                      </button>
                    )}

                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleBuiltin(agent.id)}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-all duration-300 shrink-0',
                        agent.enabled ? 'bg-indigo-500' : 'bg-white/[0.08]',
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300',
                        agent.enabled ? 'translate-x-5' : 'translate-x-0',
                      )} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Info callout ─────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                 style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <Lock size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-indigo-300">Безопасность</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Отключённые агенты не исчезают — их данные и история сохраняются.
                  Кастомные агенты используют твой системный промпт напрямую.
                  API-ключ всегда остаётся только на сервере.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Empty state for custom ───────────────────────────────────────── */}
          {customAgents.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              <button
                onClick={() => { setEditingId(null); setShowForm(true); }}
                className="w-full flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-all hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <Zap size={20} className="text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-300">Создай своего агента</p>
                  <p className="text-xs text-slate-600 mt-0.5">Задай имя, роль и системный промпт — агент появится в офисе</p>
                </div>
              </button>
            </motion.div>
          )}

        </div>
      </div>

      <MobileNav />

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <AgentFormModal
            initial={editingId ? getEditForm(editingId) : undefined}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditingId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
