import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Play, RotateCcw, Sparkles, CheckCircle2,
  Loader2, AlertCircle, Copy, Save, Check,
  Lightbulb, Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { streamMeeting } from '../../services/ai/meeting-api';
import { useAgents } from '../../contexts/AgentManagerContext';
import { supabase } from '../../lib/supabase';
import type { Agent } from '../../types';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { MobileNav } from '../../components/layout/MobileNav';
import { cn } from '../../utils/cn';
import type { MeetingEvent } from '../../services/ai/types';

// ─────────────────────────────────────────────────────────────────────────────
// MeetingPage — multi-agent meeting room
// ─────────────────────────────────────────────────────────────────────────────

// All built-in agents with real server-side prompts
const MEETING_AGENT_IDS = new Set([
  'lawyer-georgia', 'business-assistant', 'finance', 'marketing',
  'researcher', 'sales', 'realestate', 'personal-assistant',
  'hr', 'it-manager', 'copywriter', 'pr-manager',
  'accountant', 'coach', 'developer', 'operations',
]);

const TEMPLATES = [
  {
    icon: '🏢',
    label: 'Открытие бизнеса',
    topic: 'Хочу открыть бизнес в Тбилиси. Обсудите юридические, финансовые и маркетинговые аспекты запуска.',
    agents: ['lawyer-georgia', 'finance', 'marketing', 'business-assistant'],
  },
  {
    icon: '📈',
    label: 'Стратегия роста',
    topic: 'Нам нужна стратегия роста на следующий квартал: маркетинг, продажи и финансовое планирование.',
    agents: ['marketing', 'sales', 'finance', 'researcher'],
  },
  {
    icon: '👥',
    label: 'Найм команды',
    topic: 'Планируем нанять первых сотрудников. Обсудите HR-процессы, юридические аспекты и бюджет.',
    agents: ['hr', 'lawyer-georgia', 'finance', 'business-assistant'],
  },
  {
    icon: '🚀',
    label: 'Запуск продукта',
    topic: 'Готовимся к запуску нового продукта. Нужен скоординированный план по маркетингу, продажам и IT.',
    agents: ['marketing', 'sales', 'developer', 'operations'],
  },
];

type MeetingStatus = 'idle' | 'running' | 'done' | 'error';

interface AgentCard {
  agentId:   string;
  agentName: string;
  avatar:    string;
  text:      string;
  status:    'waiting' | 'speaking' | 'done';
}

// ── Agent selector chip ───────────────────────────────────────────────────────

function AgentChip({
  agent, selected, disabled, onToggle,
}: {
  agent:    Agent;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={agent.name}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200',
        'disabled:opacity-35 disabled:cursor-not-allowed',
        selected
          ? 'text-white scale-[1.04]'
          : 'text-slate-500 hover:text-slate-300 border-white/[0.07] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04]',
      )}
      style={selected ? {
        background:  `${agent.accentColor}18`,
        borderColor: `${agent.accentColor}45`,
        boxShadow:   `0 0 18px ${agent.accentColor}20`,
      } : {}}
    >
      <span className="text-xl leading-none">{agent.avatar}</span>
      <span className="text-[10px] font-semibold leading-tight text-center max-w-[52px] truncate">
        {agent.name}
      </span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-2 h-2 rounded-full"
          style={{ background: agent.accentColor }}
        />
      )}
    </button>
  );
}

// ── Progress stepper ──────────────────────────────────────────────────────────

function MeetingProgress({
  cards, synthesis,
}: {
  cards:     AgentCard[];
  synthesis: string;
}) {
  const done    = cards.filter(c => c.status === 'done').length;
  const total   = cards.length;
  const speaking = cards.find(c => c.status === 'speaking');

  return (
    <div className="flex items-center gap-3">
      {/* Steps */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
        {cards.map((card, i) => (
          <div key={card.agentId} className="flex items-center gap-1.5 shrink-0">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
              )}
              style={{
                background: card.status === 'done'
                  ? 'rgba(16,185,129,0.2)'
                  : card.status === 'speaking'
                    ? 'rgba(99,102,241,0.25)'
                    : 'rgba(255,255,255,0.05)',
                border: card.status === 'done'
                  ? '1px solid rgba(16,185,129,0.4)'
                  : card.status === 'speaking'
                    ? '1px solid rgba(99,102,241,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                color: card.status === 'done'
                  ? '#10b981'
                  : card.status === 'speaking'
                    ? '#818cf8'
                    : '#475569',
              }}
            >
              {card.status === 'done' ? <Check size={10} /> : card.avatar}
            </div>
            {i < cards.length - 1 && (
              <div className="w-4 h-px" style={{ background: card.status === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)' }} />
            )}
          </div>
        ))}
        {/* Synthesis step */}
        {synthesis && (
          <>
            <div className="w-4 h-px" style={{ background: 'rgba(99,102,241,0.3)' }} />
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
              <Sparkles size={10} className="text-indigo-400" />
            </div>
          </>
        )}
      </div>

      {/* Counter */}
      <span className="text-[11px] font-medium shrink-0" style={{ color: speaking ? '#818cf8' : '#475569' }}>
        {speaking
          ? `${speaking.agentName} отвечает…`
          : synthesis
            ? 'Синтез…'
            : `${done} / ${total}`}
      </span>
    </div>
  );
}

// ── Streaming agent response card ─────────────────────────────────────────────

function AgentResponseCard({ card }: { card: AgentCard }) {
  const { visibleAgents } = useAgents();
  const agent  = visibleAgents.find(a => a.id === card.agentId);
  const color  = agent?.accentColor ?? '#6366f1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="rounded-2xl overflow-hidden h-full flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: card.status === 'speaking'
            ? `1px solid ${color}40`
            : card.status === 'done'
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid rgba(255,255,255,0.04)',
          boxShadow: card.status === 'speaking' ? `0 0 24px ${color}12` : 'none',
          transition: 'border 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}28` }}
          >
            {card.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white leading-none truncate">{card.agentName}</p>
            {agent && <p className="text-[10px] mt-0.5 truncate" style={{ color: `${color}bb` }}>{agent.title}</p>}
          </div>
          <div className="shrink-0">
            {card.status === 'waiting' && (
              <span className="flex items-center gap-1 text-[10px] text-slate-700">
                <Loader2 size={9} className="animate-spin" /> ждёт
              </span>
            )}
            {card.status === 'speaking' && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                говорит
              </span>
            )}
            {card.status === 'done' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                <CheckCircle2 size={9} /> готово
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-4 py-3 text-[13px] text-slate-300 leading-relaxed whitespace-pre-line overflow-y-auto max-h-52">
          {card.text || (
            card.status === 'waiting'
              ? <span className="text-slate-700">Ожидает очереди…</span>
              : <span className="text-slate-600">Формулирует ответ…</span>
          )}
          {card.status === 'speaking' && card.text && (
            <motion.span
              className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
              style={{ background: color }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.55, repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Synthesis card ────────────────────────────────────────────────────────────

function SynthesisCard({
  text, streaming, onCopy, copied,
}: {
  text:      string;
  streaming: boolean;
  onCopy:    () => void;
  copied:    boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'rgba(99,102,241,0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)' }}
          >
            <Sparkles size={14} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Итоговый план действий</p>
            <p className="text-[10px] text-indigo-400 mt-0.5">AI-синтез всех мнений</p>
          </div>
          {streaming && (
            <span className="flex items-center gap-1.5 text-[10px] text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Формирую…
            </span>
          )}
          {!streaming && text && (
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', color: copied ? '#10b981' : '#818cf8' }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          )}
        </div>
        <div className="px-4 py-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {text}
          {streaming && (
            <motion.span
              className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full bg-indigo-400"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.55, repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MeetingPage() {
  const { session, user }  = useAuth();
  const { visibleAgents }  = useAgents();

  // Only built-in agents with server prompts
  const meetingAgents = visibleAgents.filter(a => MEETING_AGENT_IDS.has(a.id));

  const [topic,          setTopic]          = useState('');
  const [selectedIds,    setSelectedIds]    = useState<string[]>([]);
  const [status,         setStatus]         = useState<MeetingStatus>('idle');
  const [agentCards,     setAgentCards]     = useState<AgentCard[]>([]);
  const [synthesis,      setSynthesis]      = useState('');
  const [synthStreaming,  setSynthStreaming] = useState(false);
  const [errorMsg,       setErrorMsg]       = useState('');
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [elapsed,        setElapsed]        = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canStart = topic.trim().length >= 5 && selectedIds.length >= 2 && status === 'idle';

  // Timer
  useEffect(() => {
    if (status === 'running') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (status === 'running') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [agentCards, synthesis, status]);

  const toggleAgent = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 5 ? [...prev, id] : prev,
    );
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTopic(tpl.topic);
    // Only select agents that are enabled
    const available = tpl.agents.filter(id => meetingAgents.some(a => a.id === id));
    setSelectedIds(available.slice(0, 5));
  };

  const handleStart = async () => {
    if (!canStart) return;
    setStatus('running');
    setErrorMsg('');
    setSynthesis('');
    setSynthStreaming(false);
    setSaved(false);

    const initialCards: AgentCard[] = selectedIds.map(id => {
      const meta = visibleAgents.find(a => a.id === id);
      return {
        agentId:   id,
        agentName: meta?.name ?? id,
        avatar:    meta?.avatar ?? '🤖',
        text:      '',
        status:    'waiting',
      };
    });
    setAgentCards(initialCards);

    try {
      for await (const event of streamMeeting(topic, selectedIds, session?.access_token)) {
        handleEvent(event);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ошибка соединения');
      setStatus('error');
    }
  };

  function handleEvent(event: MeetingEvent) {
    switch (event.type) {
      case 'agent_start':
        setAgentCards(prev => prev.map(c =>
          c.agentId === event.agentId ? { ...c, status: 'speaking' } : c,
        ));
        break;
      case 'agent_chunk':
        setAgentCards(prev => prev.map(c =>
          c.agentId === event.agentId ? { ...c, text: c.text + event.text } : c,
        ));
        break;
      case 'agent_done':
        setAgentCards(prev => prev.map(c =>
          c.agentId === event.agentId ? { ...c, status: 'done' } : c,
        ));
        break;
      case 'synthesis_start':
        setSynthStreaming(true);
        break;
      case 'synthesis_chunk':
        setSynthesis(prev => prev + event.text);
        break;
      case 'done':
        setSynthStreaming(false);
        setStatus('done');
        break;
      case 'error':
        setErrorMsg(event.message);
        setSynthStreaming(false);
        setStatus('error');
        break;
    }
  }

  const handleReset = () => {
    setStatus('idle');
    setAgentCards([]);
    setSynthesis('');
    setSynthStreaming(false);
    setErrorMsg('');
    setSaved(false);
    setCopied(false);
    setElapsed(0);
  };

  const handleCopy = useCallback(() => {
    const text = agentCards.map(c => `${c.agentName}:\n${c.text}`).join('\n\n---\n\n')
      + (synthesis ? `\n\n---\n\nИтоговый план:\n${synthesis}` : '');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [agentCards, synthesis]);

  const handleSave = useCallback(async () => {
    if (!user || saving || saved) return;
    setSaving(true);

    const content = agentCards.map(c =>
      `## ${c.agentName}\n\n${c.text}`,
    ).join('\n\n---\n\n')
      + (synthesis ? `\n\n---\n\n## Итоговый план действий\n\n${synthesis}` : '');

    const agentId = selectedIds[0] ?? 'business-assistant';
    const title   = `Совещание: ${topic.slice(0, 60)}${topic.length > 60 ? '…' : ''}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    await db.from('documents').insert({
      user_id:  user.id,
      agent_id: agentId,
      title,
      type:    'report',
      content,
    });

    setSaving(false);
    setSaved(true);
  }, [user, saving, saved, agentCards, synthesis, selectedIds, topic]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex h-screen bg-[#070a12] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Совещание" />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 pb-24 md:pb-6">

            <AnimatePresence mode="wait">

              {/* ── Setup screen ───────────────────────────────────────── */}
              {status === 'idle' && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-5"
                >
                  {/* Header */}
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                           style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                        <Users size={16} className="text-indigo-400" />
                      </div>
                      Совещание агентов
                    </h2>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Задайте тему — агенты последовательно выскажутся, видя мнения друг друга.
                      В конце AI сформирует единый план действий.
                    </p>
                  </div>

                  {/* Templates */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                      <Lightbulb size={11} /> Быстрый старт
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TEMPLATES.map(tpl => (
                        <button
                          key={tpl.label}
                          onClick={() => applyTemplate(tpl)}
                          className="flex flex-col gap-1.5 p-3 rounded-xl text-left transition-all duration-150 hover:scale-[1.02]"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <span className="text-xl">{tpl.icon}</span>
                          <span className="text-[11px] font-semibold text-slate-300 leading-tight">{tpl.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic textarea */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      Тема совещания
                    </p>
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <textarea
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="Например: «Хочу открыть кофейню в Тбилиси — с чего начать?»"
                        rows={3}
                        className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 resize-none outline-none leading-relaxed"
                      />
                      <div className="px-4 pb-2 text-right">
                        <span className={cn('text-[10px]', topic.length < 5 ? 'text-slate-700' : 'text-slate-600')}>
                          {topic.length} симв.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agent selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                        Участники
                      </p>
                      <span className="text-[10px] text-slate-600">
                        {selectedIds.length} / 5 выбрано · мин. 2
                      </span>
                    </div>
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                        {meetingAgents.map(agent => (
                          <AgentChip
                            key={agent.id}
                            agent={agent}
                            selected={selectedIds.includes(agent.id)}
                            disabled={!selectedIds.includes(agent.id) && selectedIds.length >= 5}
                            onToggle={() => toggleAgent(agent.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Start button */}
                  <button
                    onClick={handleStart}
                    disabled={!canStart}
                    className={cn(
                      'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl',
                      'text-sm font-bold text-white transition-all duration-200',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      canStart && 'hover:scale-[1.01]',
                    )}
                    style={{
                      background: canStart
                        ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                        : 'rgba(255,255,255,0.05)',
                      boxShadow: canStart ? '0 0 32px rgba(99,102,241,0.3)' : 'none',
                    }}
                  >
                    <Play size={15} fill="currentColor" />
                    Начать совещание
                  </button>
                </motion.div>
              )}

              {/* ── Meeting in progress / done / error ─────────────────── */}
              {(status === 'running' || status === 'done' || status === 'error') && (
                <motion.div
                  key="meeting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {/* Topic header */}
                  <div
                    className="flex items-start gap-4 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Тема совещания</p>
                      <p className="text-sm font-semibold text-slate-300 leading-snug line-clamp-2">{topic}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedIds.map(id => {
                          const a = visibleAgents.find(ag => ag.id === id);
                          return a ? (
                            <span key={id} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                  style={{ background: `${a.accentColor}18`, color: a.accentColor }}>
                              {a.avatar} {a.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Timer + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {elapsed > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                          <Clock size={10} /> {formatTime(elapsed)}
                        </span>
                      )}
                      {status === 'done' && (
                        <>
                          <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.09)',
                              color: copied ? '#10b981' : '#94a3b8',
                            }}
                          >
                            {copied ? <Check size={10} /> : <Copy size={10} />}
                            {copied ? 'Скопировано' : 'Копировать'}
                          </button>
                          {user && (
                            <button
                              onClick={handleSave}
                              disabled={saving || saved}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-60"
                              style={{
                                background: saved ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                                border: `1px solid ${saved ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)'}`,
                                color: saved ? '#10b981' : '#818cf8',
                              }}
                            >
                              {saving ? <Loader2 size={10} className="animate-spin" />
                                : saved ? <Check size={10} /> : <Save size={10} />}
                              {saving ? 'Сохраняю…' : saved ? 'Сохранено' : 'Сохранить'}
                            </button>
                          )}
                          <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-300 border border-white/[0.07] hover:bg-white/[0.05] transition-all"
                          >
                            <RotateCcw size={10} /> Новое
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress stepper */}
                  <div
                    className="px-4 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <MeetingProgress cards={agentCards} synthesis={synthesis} />
                  </div>

                  {/* Agent response grid — 2 columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {agentCards.map(card => (
                      <AgentResponseCard key={card.agentId} card={card} />
                    ))}
                  </div>

                  {/* Error */}
                  {status === 'error' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <AlertCircle size={13} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-400 flex-1">{errorMsg}</p>
                      <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-300 underline shrink-0">
                        Повторить
                      </button>
                    </motion.div>
                  )}

                  {/* Synthesis */}
                  <AnimatePresence>
                    {(synthesis || synthStreaming) && (
                      <SynthesisCard
                        text={synthesis}
                        streaming={synthStreaming}
                        onCopy={handleCopy}
                        copied={copied}
                      />
                    )}
                  </AnimatePresence>

                  <div ref={bottomRef} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
