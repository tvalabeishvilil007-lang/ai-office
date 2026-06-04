import { useState, useRef } from 'react';
import { SkeletonDocs } from '../ui/Skeleton';
import { createPortal } from 'react-dom';
import { useToast } from '../ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Trash2, Eye, X,
  File, BarChart3, FileCheck, ChevronDown, Save, Paperclip, Download,
  Sparkles, Loader2, LayoutTemplate,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useDocuments } from '../../hooks/useDocuments';
import { useMemory } from '../../hooks/useMemory';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { Agent, Document, DocumentType } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// AgentTabDocuments — real documents backed by Supabase.
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPE_CONFIG: Record<DocumentType, {
  icon: React.ReactNode; color: string; label: string;
  variant: 'blue' | 'violet' | 'emerald' | 'gold' | 'sky';
}> = {
  contract: { icon: <FileCheck size={16} />, color: '#3b82f6', label: 'Договор',     variant: 'blue'    },
  report:   { icon: <BarChart3 size={16} />, color: '#10b981', label: 'Отчёт',       variant: 'emerald' },
  analysis: { icon: <FileText  size={16} />, color: '#8b5cf6', label: 'Анализ',      variant: 'violet'  },
  brief:    { icon: <File      size={16} />, color: '#f59e0b', label: 'Бриф',        variant: 'gold'    },
  proposal: { icon: <FileText  size={16} />, color: '#0ea5e9', label: 'Предложение', variant: 'sky'     },
};

const TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Договор',
  report:   'Отчёт',
  analysis: 'Анализ',
  brief:    'Бриф',
  proposal: 'Предложение',
};

// ── Download helpers ──────────────────────────────────────────────────────────

function downloadDoc(title: string, content: string) {
  const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${title.replace(/[^\w\s-]/g, '').trim()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, content: string, accentColor: string) {
  const doc      = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const margin   = 20;
  const maxW     = pageW - margin * 2;

  // Parse accent color to RGB
  const hex = accentColor.replace('#', '');
  const r   = parseInt(hex.slice(0, 2), 16);
  const g   = parseInt(hex.slice(2, 4), 16);
  const b   = parseInt(hex.slice(4, 6), 16);

  // Header bar
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageW, 18, 'F');

  // Title in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title.slice(0, 70), margin, 12);

  // Date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(dateStr, pageW - margin, 12, { align: 'right' });

  // Body text
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let y = 30;
  const lines = doc.splitTextToSize(content || '', maxW) as string[];

  for (const line of lines) {
    if (y > pageH - margin) {
      doc.addPage();
      // Repeat thin accent stripe on new pages
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, pageW, 6, 'F');
      y = 14;
      doc.setTextColor(30, 30, 40);
      doc.setFontSize(10);
    }
    doc.text(line, margin, y);
    y += 5.5;
  }

  // Footer on each page
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 180);
    doc.text(`${title} · стр. ${p} / ${totalPages}`, margin, pageH - 8);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
  }

  doc.save(`${title.replace(/[^\w\s-]/g, '').trim()}.pdf`);
}

// ── Document viewer/editor modal ──────────────────────────────────────────────

function DocModal({
  doc, agent, onClose, onSave, onDelete,
}: {
  doc: Document;
  agent: Agent;
  onClose: () => void;
  onSave: (id: string, title: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const { toast }           = useToast();
  const { memoryContext }   = useMemory(agent.id);
  const [title,      setTitle]      = useState(doc.title);
  const [content,    setContent]    = useState(doc.content);
  const [saving,     setSaving]     = useState(false);
  const [edited,     setEdited]     = useState(false);
  const [regenOpen,  setRegenOpen]  = useState(false);
  const [regenText,  setRegenText]  = useState('');
  const [generating, setGenerating] = useState(false);

  const cfg = DOC_TYPE_CONFIG[doc.type];

  const handleSave = async () => {
    setSaving(true);
    await onSave(doc.id, title, content);
    setSaving(false);
    setEdited(false);
  };

  const handleRegen = async () => {
    if (!regenText.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/documents/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          agentId:       agent.id,
          type:          doc.type,
          title:         title.trim(),
          prompt:        regenText.trim(),
          memoryContext,
        }),
      });
      if (!res.ok) throw new Error();
      const { content: generated } = await res.json() as { content: string };
      setContent(generated);
      setEdited(true);
      setRegenOpen(false);
      setRegenText('');
      toast.success('Документ перегенерирован — проверьте и сохраните');
    } catch {
      toast.error('Не удалось сгенерировать');
    } finally {
      setGenerating(false);
    }
  };

  return createPortal((
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#0f1520', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${cfg.color}15`, color: cfg.color }}
          >
            {cfg.icon}
          </div>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setEdited(true); }}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-200 outline-none"
          />
          <div className="flex items-center gap-2">
            {/* AI regenerate toggle */}
            <button
              onClick={() => setRegenOpen(o => !o)}
              title="Перегенерировать с ИИ"
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                regenOpen
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08]',
              )}
              style={regenOpen ? { background: agent.accentColor } : {}}
            >
              <Sparkles size={11} />
              ИИ
            </button>
            {edited && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
                style={{ background: agent.accentColor }}
              >
                <Save size={11} /> {saving ? 'Сохраняю…' : 'Сохранить'}
              </button>
            )}
            <button
              onClick={() => onDelete(doc.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-400 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Regenerate panel */}
        <AnimatePresence>
          {regenOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              style={{ borderBottom: `1px solid ${agent.accentColor}20` }}
            >
              <div
                className="flex gap-2 px-5 py-3"
                style={{ background: `${agent.accentColor}08` }}
              >
                <textarea
                  autoFocus
                  value={regenText}
                  onChange={e => setRegenText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRegen(); } }}
                  placeholder="Что изменить или переписать? (Enter — запустить)"
                  rows={2}
                  className={cn(
                    'flex-1 text-xs bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2',
                    'text-slate-300 placeholder:text-slate-600 resize-none',
                    'focus:outline-none focus:border-white/[0.14]',
                  )}
                />
                <button
                  onClick={handleRegen}
                  disabled={!regenText.trim() || generating}
                  className="self-end flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: agent.accentColor, minWidth: '88px' }}
                >
                  {generating
                    ? <><Loader2 size={11} className="animate-spin" /> Пишу…</>
                    : <><Sparkles size={11} /> Создать</>
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content editor */}
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); setEdited(true); }}
          placeholder="Содержимое документа…"
          className={cn(
            'flex-1 px-5 py-4 bg-transparent text-sm text-slate-300 leading-relaxed',
            'outline-none resize-none placeholder:text-slate-700',
            generating && 'opacity-40 pointer-events-none',
          )}
        />

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-600">
          <span>{formatDate(doc.createdAt)} · {doc.size}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { downloadDoc(title, content); toast.info(`Скачан: ${title}.txt`); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Download size={10} /> TXT
            </button>
            <button
              onClick={() => { downloadPDF(title, content, agent.accentColor); toast.info(`PDF скачан: ${title}`); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
              style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}30`, color: agent.accentColor }}
            >
              <Download size={10} /> PDF
            </button>
            <Badge size="xs" variant={cfg.variant}>{cfg.label}</Badge>
          </div>
        </div>
      </motion.div>
    </motion.div>
  ), document.body);
}

// ── New document form ─────────────────────────────────────────────────────────

// ── Document templates ────────────────────────────────────────────────────────

const DOC_TEMPLATES: {
  label: string; emoji: string;
  type: DocumentType; title: string; prompt: string;
}[] = [
  { label: 'NDA',         emoji: '🔏', type: 'contract',  title: 'Соглашение о неразглашении (NDA)', prompt: 'Составь стандартное соглашение о неразглашении конфиденциальной информации между двумя сторонами' },
  { label: 'Оферта',      emoji: '📋', type: 'contract',  title: 'Договор публичной оферты',         prompt: 'Составь договор публичной оферты для интернет-магазина или SaaS-сервиса' },
  { label: 'Отчёт продаж',emoji: '📊', type: 'report',    title: 'Отчёт о продажах за период',       prompt: 'Составь отчёт о продажах с разделами: исполнительное резюме, динамика, топ-продукты, рекомендации' },
  { label: 'SWOT-анализ', emoji: '🔬', type: 'analysis',  title: 'SWOT-анализ компании',             prompt: 'Проведи SWOT-анализ: сильные стороны, слабые стороны, возможности, угрозы' },
  { label: 'Маркетинг-бриф', emoji: '🎯', type: 'brief', title: 'Маркетинговый бриф',               prompt: 'Составь маркетинговый бриф: цели кампании, целевая аудитория, каналы продвижения, бюджет, KPI' },
  { label: 'КП',          emoji: '💼', type: 'proposal',  title: 'Коммерческое предложение',         prompt: 'Составь убедительное коммерческое предложение с оффером, выгодами, ценой и призывом к действию' },
  { label: 'Устав проекта',emoji: '🗂', type: 'brief',   title: 'Устав проекта',                     prompt: 'Составь устав проекта: цели, объём работ, стейкхолдеры, ресурсы, риски, критерии успеха' },
  { label: 'Финплан',     emoji: '💰', type: 'analysis',  title: 'Финансовый план на квартал',       prompt: 'Составь финансовый план с прогнозом доходов, расходов, EBITDA и ключевых метрик' },
];

function NewDocForm({
  agent, onClose, onCreate,
}: {
  agent: Agent;
  onClose: () => void;
  onCreate: (title: string, type: DocumentType, content: string) => Promise<void>;
}) {
  const { memoryContext } = useMemory(agent.id);

  const [title,         setTitle]         = useState('');
  const [type,          setType]          = useState<DocumentType>('brief');
  const [typeOpen,      setTypeOpen]      = useState(false);
  const [content,       setContent]       = useState('');
  const [aiPrompt,      setAiPrompt]      = useState('');
  const [generating,    setGenerating]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [importedName,  setImportedName]  = useState<string | null>(null);
  const [aiError,       setAiError]       = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyTemplate = (tpl: typeof DOC_TEMPLATES[number]) => {
    setTitle(tpl.title);
    setType(tpl.type);
    setAiPrompt(tpl.prompt);
    setTemplatesOpen(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
    const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml|yaml|yml)$/i.test(file.name);
    if (isText && file.size < 300_000) setContent(await file.text());
    setImportedName(file.name);
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!title.trim() || !aiPrompt.trim() || generating) return;
    setGenerating(true);
    setAiError('');
    try {
      const res = await fetch('/api/documents/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          agentId: agent.id,
          type,
          title:   title.trim(),
          prompt:  aiPrompt.trim(),
          memoryContext,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { content: generated } = await res.json() as { content: string };
      setContent(generated);
    } catch {
      setAiError('Не удалось сгенерировать — проверьте подключение');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate(title.trim(), type, content);
    setSaving(false);
    onClose();
  };

  return createPortal((
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#0f1520', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="text-sm font-semibold text-slate-200">Новый документ</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-3">

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileImport}
          />

          {/* Imported-file chip */}
          {importedName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px]"
                 style={{ background: `${agent.accentColor}10`, borderColor: `${agent.accentColor}30`, color: agent.accentColor }}>
              <Paperclip size={10} />
              <span className="flex-1 truncate">{importedName}</span>
              <button onClick={() => { setImportedName(null); setContent(''); }}
                      className="text-slate-600 hover:text-slate-300 transition-colors">
                <X size={10} />
              </button>
            </div>
          )}

          {/* Templates button + picker */}
          <div>
            <button
              type="button"
              onClick={() => setTemplatesOpen(o => !o)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                templatesOpen
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08]',
              )}
              style={templatesOpen ? { background: agent.accentColor, border: `1px solid ${agent.accentColor}` } : {}}
            >
              <LayoutTemplate size={11} />
              Шаблоны
              <ChevronDown
                size={10}
                className="transition-transform duration-200"
                style={{ transform: templatesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            <AnimatePresence>
              {templatesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-4 gap-1.5 pt-2">
                    {DOC_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={cn(
                          'flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-center transition-all duration-150',
                          'bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] hover:border-white/[0.16]',
                          'text-slate-400 hover:text-slate-200',
                        )}
                      >
                        <span className="text-base leading-none">{tpl.emoji}</span>
                        <span className="text-[10px] font-medium leading-tight">{tpl.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Title + type row */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Импортировать файл"
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-colors text-slate-500 hover:text-slate-300 hover:border-white/[0.18]"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <Paperclip size={14} />
            </button>

            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название документа…"
              className={cn(
                'flex-1 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2',
                'text-slate-200 placeholder:text-slate-600',
                'focus:outline-none focus:border-white/[0.18]',
              )}
            />

            {/* Type picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeOpen(v => !v)}
                className={cn(
                  'flex items-center gap-2 text-xs rounded-lg px-3 py-2',
                  'bg-white/[0.04] border border-white/[0.08] text-slate-300',
                  'hover:border-white/[0.18] transition-colors whitespace-nowrap',
                )}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DOC_TYPE_CONFIG[type].color }} />
                {TYPE_LABELS[type]}
                <ChevronDown size={10} className="text-slate-500 ml-1" />
              </button>
              <AnimatePresence>
                {typeOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {(Object.keys(TYPE_LABELS) as DocumentType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setType(t); setTypeOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors',
                          t === type ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]',
                        )}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DOC_TYPE_CONFIG[t].color }} />
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── AI generation panel ── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${agent.accentColor}25`, background: `${agent.accentColor}08` }}
          >
            {/* Panel header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: `1px solid ${agent.accentColor}18` }}
            >
              <Sparkles size={11} style={{ color: agent.accentColor }} />
              <span className="text-[11px] font-semibold" style={{ color: agent.accentColor }}>
                Сгенерировать с ИИ
              </span>
              <span className="text-[10px] text-slate-600 ml-1">— {agent.name} напишет документ за вас</span>
            </div>

            {/* Prompt input + button */}
            <div className="flex gap-2 p-2.5">
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                placeholder={`Опишите что нужно написать… (Enter — сгенерировать)`}
                rows={2}
                className={cn(
                  'flex-1 text-xs bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2',
                  'text-slate-300 placeholder:text-slate-600 resize-none',
                  'focus:outline-none focus:border-white/[0.14]',
                )}
              />
              <button
                onClick={handleGenerate}
                disabled={!title.trim() || !aiPrompt.trim() || generating}
                className={cn(
                  'shrink-0 self-end flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold',
                  'transition-all duration-200 disabled:opacity-40',
                )}
                style={{
                  background:   generating ? `${agent.accentColor}40` : agent.accentColor,
                  color:        '#fff',
                  minWidth:     '88px',
                }}
              >
                {generating
                  ? <><Loader2 size={11} className="animate-spin" /> Пишу…</>
                  : <><Sparkles size={11} /> Создать</>
                }
              </button>
            </div>

            {/* Error */}
            {aiError && (
              <p className="px-3 pb-2.5 text-[10px] text-rose-400">{aiError}</p>
            )}

            {/* Success hint */}
            {content && !generating && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 pb-2.5 text-[10px]"
                style={{ color: agent.accentColor }}
              >
                ✓ Документ сгенерирован — отредактируйте при необходимости и нажмите «Создать»
              </motion.p>
            )}
          </div>

          {/* Content textarea */}
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Содержимое документа… или используйте ИИ-генерацию выше"
              rows={9}
              className={cn(
                'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2',
                'text-slate-300 placeholder:text-slate-600 resize-none',
                'focus:outline-none focus:border-white/[0.18]',
                'transition-all duration-300',
                generating && 'opacity-50',
              )}
            />
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={20} className="animate-spin" style={{ color: agent.accentColor }} />
                  <span className="text-xs text-slate-500">{agent.name} пишет…</span>
                </div>
              </div>
            )}
          </div>

          {/* Create button */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || saving || generating}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: agent.accentColor }}
          >
            {saving ? 'Сохраняю…' : 'Создать документ'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  ), document.body);
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgentTabDocumentsProps {
  agent: Agent;
}

export function AgentTabDocuments({ agent }: AgentTabDocumentsProps) {
  const { toast } = useToast();
  const { documents, loading, createDocument, updateDocument, deleteDocument } = useDocuments(agent.id);
  const [showNew,    setShowNew]    = useState(false);
  const [activeDoc,  setActiveDoc]  = useState<Document | null>(null);

  const handleDelete = (id: string) => {
    deleteDocument(id);
    if (activeDoc?.id === id) setActiveDoc(null);
  };

  return (
    <div className="h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-200">Документы</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.07]">
            {documents.length} файлов
          </span>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: agent.accentColor + '22', border: `1px solid ${agent.accentColor}44`, color: agent.accentColor }}
        >
          <Plus size={12} /> Создать
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && <SkeletonDocs />}

        {/* Empty */}
        {!loading && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600">
            <FileText size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Нет документов — создайте первый</p>
          </div>
        )}

        {/* Grid */}
        {!loading && documents.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {documents.map((doc, i) => {
                const cfg = DOC_TYPE_CONFIG[doc.type];
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard variant="default" padding="md" hoverable className="group h-full cursor-pointer"
                      onClick={() => setActiveDoc(doc)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`, color: cfg.color }}
                        >
                          {cfg.icon}
                        </div>
                        <Badge size="xs" variant={cfg.variant}>{cfg.label}</Badge>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-200 leading-snug mb-1 line-clamp-2">
                        {doc.title}
                      </h4>

                      {doc.content && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 leading-snug">
                          {doc.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2 mb-3">
                        <span>{formatDate(doc.createdAt)}</span>
                        <span>{doc.size}</span>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={e => { e.stopPropagation(); setActiveDoc(doc); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          <Eye size={11} /> Открыть
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); downloadDoc(doc.title, doc.content); toast.info(`Скачан: ${doc.title}.txt`); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          <Download size={11} /> Скачать
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-rose-500 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={11} /> Удалить
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNew && (
          <NewDocForm
            agent={agent}
            onClose={() => setShowNew(false)}
            onCreate={async (title, type, content) => {
              await createDocument({ title, type, content });
            }}
          />
        )}
        {activeDoc && (
          <DocModal
            doc={activeDoc}
            agent={agent}
            onClose={() => setActiveDoc(null)}
            onSave={updateDocument}
            onDelete={id => { handleDelete(id); setActiveDoc(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
