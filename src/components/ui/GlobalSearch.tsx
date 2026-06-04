import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, MessageSquare, ArrowRight, Loader2,
  Building2, Users, BarChart3, FileText, Settings,
  MessagesSquare, Sun, Shield,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAgents } from '../../contexts/AgentManagerContext';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// GlobalSearch — Ctrl+K search: agents + navigation + chat history
// ─────────────────────────────────────────────────────────────────────────────

interface MsgHit {
  kind:      'message';
  messageId: string;
  sessionId: string;
  agentId:   string;
  content:   string;
  role:      'user' | 'agent';
}
interface AgentHit {
  kind:    'agent';
  agentId: string;
}
interface NavHit {
  kind:  'nav';
  label: string;
  to:    string;
  icon:  React.ReactNode;
}

type Hit = MsgHit | AgentHit | NavHit;

const NAV_ITEMS = [
  { label: 'Мой день',          to: '/my-day',   icon: <Sun            size={13} /> },
  { label: 'Офис',              to: '/',          icon: <Building2      size={13} /> },
  { label: 'Команда',           to: '/team',      icon: <Users          size={13} /> },
  { label: 'Совещание',         to: '/meeting',   icon: <MessagesSquare size={13} /> },
  { label: 'Аналитика',         to: '/reports',   icon: <BarChart3      size={13} /> },
  { label: 'Документы',         to: '/docs',      icon: <FileText       size={13} /> },
  { label: 'Настройки',         to: '/settings',  icon: <Settings       size={13} /> },
  { label: 'Администрирование', to: '/admin',     icon: <Shield         size={13} /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function Snippet({ text, query }: { text: string; query: string }) {
  const q   = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <span>{text.slice(0, 120)}{text.length > 120 ? '…' : ''}</span>;
  const start  = Math.max(0, idx - 40);
  const end    = Math.min(text.length, idx + q.length + 80);
  const before = (start > 0 ? '…' : '') + text.slice(start, idx);
  const match  = text.slice(idx, idx + q.length);
  const after  = text.slice(idx + q.length, end) + (end < text.length ? '…' : '');
  return (
    <span>
      {before}
      <mark className="bg-yellow-400/20 text-yellow-200 rounded px-0.5">{match}</mark>
      {after}
    </span>
  );
}

export function GlobalSearch() {
  const { user }                  = useAuth();
  const navigate                  = useNavigate();
  const { visibleAgents }         = useAgents();
  const [open,    setOpen]        = useState(false);
  const [query,   setQuery]       = useState('');
  const [msgHits, setMsgHits]     = useState<MsgHit[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selIdx,  setSelIdx]      = useState(0);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Keyboard shortcut + custom event ─────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    }
    function onEvent() { setOpen(true); }
    document.addEventListener('keydown', onKey);
    window.addEventListener('global-search:open', onEvent);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('global-search:open', onEvent);
    };
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setMsgHits([]); setSelIdx(0); }
  }, [open]);

  // ── Local: match agents ───────────────────────────────────────────────────
  const agentHits: AgentHit[] = query.trim().length < 1 ? [] : visibleAgents.filter(a => {
    const q = query.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q) ||
      a.skills.some(s => s.label.toLowerCase().includes(q))
    );
  }).map(a => ({ kind: 'agent', agentId: a.id }));

  // ── Local: match navigation ───────────────────────────────────────────────
  const navHits: NavHit[] = query.trim().length < 1 ? [] : NAV_ITEMS.filter(
    n => n.label.toLowerCase().includes(query.toLowerCase()),
  ).map(n => ({ kind: 'nav', label: n.label, to: n.to, icon: n.icon }));

  // ── Supabase: search chat messages ───────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user) { setMsgHits([]); return; }
    setLoading(true);
    try {
      const { data } = await db
        .from('chat_messages')
        .select('id, session_id, role, content, created_at, chat_sessions(agent_id, user_id)')
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      const rows = (data ?? []) as Array<{
        id: string; session_id: string; role: 'user' | 'agent'; content: string;
        chat_sessions?: { agent_id: string; user_id: string } | null;
      }>;
      setMsgHits(
        rows
          .filter(r => r.chat_sessions?.user_id === user.id)
          .map(r => ({
            kind:      'message',
            messageId: r.id,
            sessionId: r.session_id,
            agentId:   r.chat_sessions?.agent_id ?? '',
            content:   r.content,
            role:      r.role,
          })),
      );
    } catch (err) {
      console.error('[GlobalSearch]', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // ── Flat list for keyboard nav ────────────────────────────────────────────
  const allHits: Hit[] = [...navHits, ...agentHits, ...msgHits.slice(0, 12)];
  useEffect(() => { setSelIdx(0); }, [query]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(h: Hit) {
    if (h.kind === 'nav') { navigate(h.to); setOpen(false); return; }
    if (h.kind === 'agent') {
      const agent = visibleAgents.find(a => a.id === h.agentId);
      if (agent) navigate(`/agent/${agent.slug}`);
      setOpen(false); return;
    }
    const agent = visibleAgents.find(a => a.id === h.agentId);
    if (agent) navigate(`/agent/${agent.slug}`);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(s + 1, allHits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelIdx(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && allHits[selIdx]) goTo(allHits[selIdx]);
  }

  if (typeof document === 'undefined') return null;

  // Quick suggestions (shown when query is empty)
  const quickAgents = visibleAgents.filter(a => a.status === 'active').slice(0, 4);

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {open && createPortal(
        <motion.div
          key="gs-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(16px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <motion.div
            initial={{ scale: 0.97, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0c1020', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {loading
                ? <Loader2 size={15} className="text-slate-500 shrink-0 animate-spin" />
                : <Search  size={15} className="text-slate-500 shrink-0" />
              }
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Поиск агентов, разделов, сообщений…"
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
              />
              {query && (
                <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="text-slate-600 hover:text-slate-400">
                  <X size={14} />
                </button>
              )}
              <kbd className="text-[10px] text-slate-600 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.07]">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[460px] overflow-y-auto">

              {/* ── Empty state: quick suggestions ── */}
              {!query.trim() && (
                <div className="p-4">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Быстрый доступ</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {quickAgents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => { navigate(`/agent/${agent.slug}`); setOpen(false); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors hover:bg-white/[0.05]"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}30` }}
                        >
                          {agent.avatar}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-300 truncate">{agent.name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{agent.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-slate-700">
                    <kbd className="bg-white/[0.05] border border-white/[0.07] px-1.5 py-0.5 rounded">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="bg-white/[0.05] border border-white/[0.07] px-1.5 py-0.5 rounded">K</kbd>
                    <span className="ml-1">— открыть в любом месте</span>
                  </div>
                </div>
              )}

              {/* ── Navigation hits ── */}
              {navHits.length > 0 && (
                <div>
                  <SectionHeader label="Навигация" />
                  {navHits.map(h => {
                    const idx = globalIdx; globalIdx++;
                    return (
                      <HitRow key={h.to} selected={idx === selIdx} onClick={() => goTo(h)} onHover={() => setSelIdx(idx)}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 shrink-0"
                             style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {h.icon}
                        </div>
                        <span className="text-sm text-slate-200">{h.label}</span>
                        {idx === selIdx && <ArrowRight size={12} className="text-slate-600 shrink-0 ml-auto" />}
                      </HitRow>
                    );
                  })}
                </div>
              )}

              {/* ── Agent hits ── */}
              {agentHits.length > 0 && (
                <div>
                  <SectionHeader label="Агенты" />
                  {agentHits.map(h => {
                    const agent = visibleAgents.find(a => a.id === h.agentId);
                    if (!agent) return null;
                    const idx = globalIdx; globalIdx++;
                    return (
                      <HitRow key={h.agentId} selected={idx === selIdx} onClick={() => goTo(h)} onHover={() => setSelIdx(idx)}>
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
                              style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}30` }}>
                          {agent.avatar}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200">{agent.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{agent.title}</p>
                        </div>
                        {idx === selIdx && <ArrowRight size={12} className="text-slate-600 shrink-0" />}
                      </HitRow>
                    );
                  })}
                </div>
              )}

              {/* ── Message hits ── */}
              {msgHits.length > 0 && (
                <div>
                  <SectionHeader label={`Сообщения (${msgHits.length})`} />
                  {msgHits.slice(0, 10).map(h => {
                    const agent = visibleAgents.find(a => a.id === h.agentId);
                    const idx = globalIdx; globalIdx++;
                    return (
                      <HitRow key={h.messageId} selected={idx === selIdx} onClick={() => goTo(h)} onHover={() => setSelIdx(idx)}>
                        <MessageSquare size={12} className="mt-0.5 shrink-0"
                          style={{ color: h.role === 'agent' ? agent?.accentColor : '#64748b' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-600 mb-0.5">
                            {h.role === 'user' ? 'Вы' : agent?.name} · {agent?.avatar}
                          </p>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            <Snippet text={h.content} query={query} />
                          </p>
                        </div>
                        {idx === selIdx && <ArrowRight size={12} className="text-slate-600 shrink-0 mt-0.5" />}
                      </HitRow>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {query.trim() && allHits.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                  <Search size={22} className="mb-2 opacity-30" />
                  <p className="text-xs">Ничего не найдено</p>
                  <p className="text-[11px] mt-1 text-slate-700">«{query}»</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] text-slate-700">
                {allHits.length > 0 ? `${allHits.length} результатов` : 'Поиск по агентам, разделам и чатам'}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-700">
                <span>↑↓</span><span>навигация</span>
                <span className="mx-1 opacity-40">·</span>
                <span>↵</span><span>открыть</span>
              </div>
            </div>
          </motion.div>
        </motion.div>,
        document.body,
      )}
    </AnimatePresence>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 sticky top-0" style={{ background: '#0c1020', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function HitRow({
  children, selected, onClick, onHover,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
        selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]',
      )}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
    >
      {children}
    </button>
  );
}
