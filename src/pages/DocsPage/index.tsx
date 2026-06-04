import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Trash2, X, Save,
  Edit3, ExternalLink, FileCheck, Clock,
  Plus, ChevronDown, Paperclip, Download,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAllDocuments } from '../../hooks/useAllDocuments';
import { getAgentById } from '../../data/agents';
import { useAgents } from '../../contexts/AgentManagerContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { Topbar } from '../../components/layout/Topbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { cn } from '../../utils/cn';
import type { Document, DocumentType } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// DocsPage — all documents across all agents
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Договор',
  report:   'Отчёт',
  analysis: 'Анализ',
  brief:    'Бриф',
  proposal: 'Предложение',
};

const TYPE_COLORS: Record<DocumentType, { color: string; bg: string }> = {
  contract: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  report:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  analysis: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  brief:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  proposal: { color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};

const ALL_TYPES: DocumentType[] = ['contract', 'report', 'analysis', 'brief', 'proposal'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── NewDocModal ───────────────────────────────────────────────────────────────

interface NewDocModalProps {
  onClose: () => void;
  onCreate: (agentId: string, title: string, type: DocumentType, content: string) => Promise<void>;
}

function NewDocModal({ onClose, onCreate }: NewDocModalProps) {
  const { visibleAgents } = useAgents();
  const [agentId,       setAgentId]       = useState(visibleAgents[0]?.id ?? '');
  const [title,         setTitle]         = useState('');
  const [type,          setType]          = useState<DocumentType>('brief');
  const [content,       setContent]       = useState('');
  const [saving,        setSaving]        = useState(false);
  const [typeOpen,      setTypeOpen]      = useState(false);
  const [agentOpen,     setAgentOpen]     = useState(false);
  const [importedName,  setImportedName]  = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedAgent = visibleAgents.find(a => a.id === agentId) ?? visibleAgents[0];
  const tc = TYPE_COLORS[type];

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
    const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml|yaml|yml)$/i.test(file.name);
    if (isText && file.size < 300_000) setContent(await file.text());
    setImportedName(file.name);
    e.target.value = '';
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate(agentId, title.trim(), type, content);
    setSaving(false);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-lg flex flex-col rounded-2xl overflow-visible"
        style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <Plus size={14} className="text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Новый документ</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <X size={13} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Agent selector */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1.5 block font-medium">Агент</label>
            <div className="relative">
              <button
                onClick={() => { setAgentOpen(o => !o); setTypeOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <span className="text-base">{selectedAgent.avatar}</span>
                <span className="flex-1 text-slate-200 text-sm">{selectedAgent.name}</span>
                <ChevronDown size={13} className={cn('text-slate-500 transition-transform', agentOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {agentOpen && (
                  <motion.div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                  >
                    {visibleAgents.map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setAgentId(a.id); setAgentOpen(false); }}
                        className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05]', a.id === agentId ? 'text-white' : 'text-slate-400')}
                      >
                        <span className="text-sm">{a.avatar}</span>
                        <span className="flex-1 text-left">{a.name}</span>
                        {a.id === agentId && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Hidden file input */}
          <input ref={fileRef} type="file" className="hidden"
            accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.pdf,.doc,.docx"
            onChange={handleFileImport} />

          {/* Imported-file chip */}
          {importedName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] text-blue-400"
                 style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}>
              <Paperclip size={10} />
              <span className="flex-1 truncate">{importedName}</span>
              <button onClick={() => { setImportedName(null); setContent(''); }}
                      className="text-slate-600 hover:text-slate-300 transition-colors">
                <X size={10} />
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1.5 block font-medium">Название</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                title="Импортировать файл"
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-colors text-slate-500 hover:text-slate-300 hover:border-white/[0.18]"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <Paperclip size={14} />
              </button>
              <input
                className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                placeholder="Введите название документа..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Type selector */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1.5 block font-medium">Тип</label>
            <div className="relative">
              <button
                onClick={() => { setTypeOpen(o => !o); setAgentOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: tc.bg, color: tc.color }}>
                  {TYPE_LABELS[type]}
                </span>
                <span className="flex-1" />
                <ChevronDown size={13} className={cn('text-slate-500 transition-transform', typeOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {typeOpen && (
                  <motion.div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                    style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                  >
                    {ALL_TYPES.map(t => {
                      const c = TYPE_COLORS[t];
                      return (
                        <button
                          key={t}
                          onClick={() => { setType(t); setTypeOpen(false); }}
                          className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05]', t === type ? 'text-white' : 'text-slate-400')}
                        >
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: c.bg, color: c.color }}>
                            {TYPE_LABELS[t]}
                          </span>
                          {t === type && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-[11px] text-slate-500 mb-1.5 block font-medium">Содержимое <span className="text-slate-700">(необязательно)</span></label>
            <textarea
              className="w-full h-28 px-3 py-2.5 rounded-xl text-sm text-slate-200 outline-none resize-none leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              placeholder="Начните вводить текст..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'rgba(59,130,246,0.8)', border: '1px solid rgba(59,130,246,0.5)' }}
          >
            {saving ? 'Создаём...' : 'Создать документ'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── DocViewModal ──────────────────────────────────────────────────────────────

interface DocModalProps {
  doc: Document;
  onClose: () => void;
  onSave: (id: string, title: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function downloadDoc(title: string, content: string) {
  const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title.replace(/[^\w\s-]/g, '').trim()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function DocViewModal({ doc, onClose, onSave, onDelete }: DocModalProps) {
  const navigate = useNavigate();
  const [title,   setTitle]   = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const agent = getAgentById(doc.agentId);
  const tc    = TYPE_COLORS[doc.type];

  async function handleSave() {
    setSaving(true);
    await onSave(doc.id, title, content);
    setSaving(false);
    setEditing(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0" style={{ background: tc.bg, color: tc.color }}>
            {TYPE_LABELS[doc.type]}
          </div>
          {editing ? (
            <input
              className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              value={title} onChange={e => setTitle(e.target.value)} autoFocus
            />
          ) : (
            <h3 className="flex-1 text-sm font-bold text-white truncate">{title}</h3>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {agent && (
              <button onClick={() => navigate(`/agent/${agent.slug}`)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-sm">{agent.avatar}</span>
                <ExternalLink size={10} />
              </button>
            )}
            <button onClick={() => setEditing(!editing)}
              className={cn('p-1.5 rounded-lg transition-colors', editing ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300')}
              style={{ background: editing ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)' }}>
              <Edit3 size={13} />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {editing ? (
            <textarea
              className="w-full h-full min-h-[280px] bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-sm text-slate-200 outline-none resize-none leading-relaxed font-mono"
              value={content} onChange={e => setContent(e.target.value)} placeholder="Содержимое документа..."
            />
          ) : content ? (
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600">
              <FileText size={24} className="mb-2" />
              <p className="text-sm">Документ пуст</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><Clock size={10} />{formatDate(doc.createdAt)}</span>
            <span>{doc.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadDoc(title, content)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Download size={11} />Скачать
            </button>
            <button onClick={() => onDelete(doc.id).then(onClose)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-red-400 hover:text-red-300 transition-colors"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Trash2 size={11} />Удалить
            </button>
            {editing && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: 'rgba(59,130,246,0.8)', border: '1px solid rgba(59,130,246,0.5)' }}>
                <Save size={11} />{saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── DocsPage ──────────────────────────────────────────────────────────────────

export function DocsPage() {
  const [searchParams]                          = useSearchParams();
  const { documents, loading, createDocument,
          updateDocument, deleteDocument }       = useAllDocuments();
  const [search,    setSearch]                  = useState(() => searchParams.get('q') ?? '');
  const [filterType, setFilterType]             = useState<DocumentType | 'all'>('all');
  const [activeDoc,  setActiveDoc]              = useState<Document | null>(null);
  const [newDocOpen, setNewDocOpen]             = useState(false);

  // Keep search field in sync if URL param changes externally (e.g. from Topbar)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const filtered = documents.filter(d => {
    const matchType   = filterType === 'all' || d.type === filterType;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase())
                     || d.content.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="flex h-screen bg-[#070a12] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Документы" />

        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Все документы</h2>
              <p className="text-sm text-slate-500 mt-1">
                {documents.length} документов · создано всеми агентами
              </p>
            </div>
            <button
              onClick={() => setNewDocOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'rgba(59,130,246,0.8)', border: '1px solid rgba(59,130,246,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.8)')}
            >
              <Plus size={15} />
              Новый документ
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px] max-w-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Search size={13} className="text-slate-500 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
                placeholder="Поиск по документам..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', ...ALL_TYPES] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={cn('px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all', filterType === t ? 'text-white' : 'text-slate-500 hover:text-slate-300')}
                  style={filterType === t
                    ? { background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }
                    : { background: 'rgba(255,255,255,0.02)', border: '1px solid transparent' }
                  }
                >
                  {t === 'all' ? 'Все' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <FileCheck size={24} className="text-indigo-500/60" />
              </div>
              <p className="text-sm font-semibold text-slate-400 mb-1">
                {documents.length === 0 ? 'Документов пока нет' : 'Ничего не найдено'}
              </p>
              <p className="text-xs text-slate-600 mb-4">
                {documents.length === 0 ? 'Создайте первый документ прямо сейчас' : 'Попробуйте другой запрос или фильтр'}
              </p>
              {documents.length === 0 && (
                <button
                  onClick={() => setNewDocOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                  style={{ background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.4)' }}
                >
                  <Plus size={14} /> Новый документ
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((doc, i) => {
                const agent = getAgentById(doc.agentId);
                const tc    = TYPE_COLORS[doc.type];
                return (
                  <motion.div key={doc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <GlassCard variant="default" padding="none" hoverable className="cursor-pointer group overflow-hidden" onClick={() => setActiveDoc(doc)}>
                      <div className="h-0.5 w-full" style={{ background: tc.color }} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: tc.bg, color: tc.color }}>
                            {TYPE_LABELS[doc.type]}
                          </span>
                          {agent && (
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                              style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}28` }} title={agent.name}>
                              {agent.avatar}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-200 leading-snug mb-2 line-clamp-2">{doc.title}</h4>
                        {doc.content && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-3">{doc.content}</p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-600">
                          <span className="flex items-center gap-1"><Clock size={9} />{formatDate(doc.createdAt)}</span>
                          <span>{doc.size}</span>
                        </div>
                        {/* Hover actions */}
                        <div className="flex items-center gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={e => { e.stopPropagation(); downloadDoc(doc.title, doc.content); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <Download size={10} /> Скачать
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {newDocOpen && (
          <NewDocModal
            key="new-doc"
            onClose={() => setNewDocOpen(false)}
            onCreate={async (agId, title, type, content) => {
              await createDocument(agId, { title, type, content });
            }}
          />
        )}
        {activeDoc && (
          <DocViewModal
            key={activeDoc.id}
            doc={activeDoc}
            onClose={() => setActiveDoc(null)}
            onSave={async (id, title, content) => {
              await updateDocument(id, title, content);
              setActiveDoc(prev => prev?.id === id ? { ...prev, title, content } : prev);
            }}
            onDelete={async (id) => {
              await deleteDocument(id);
              setActiveDoc(null);
            }}
          />
        )}
      </AnimatePresence>
      <MobileNav />
    </div>
  );
}
