import { useRef, useEffect, useState, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import { useOfficeChat } from '../../hooks/useOfficeChat';
import { useAgents } from '../../contexts/AgentManagerContext';
import { formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// OfficeChat — group office chat where agents auto-reply to messages.
// User messages → Supabase. Agent replies → streamed locally via SSE.
// ─────────────────────────────────────────────────────────────────────────────

// ── SSE streaming helper ──────────────────────────────────────────────────────

async function* streamReply(message: string, agentIds: string[]) {
  const res = await fetch('/api/office-chat-reply', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, availableAgentIds: agentIds }),
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', message: 'Сервер недоступен' };
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)); } catch { /* skip */ }
      }
    }
  }
}

// ── Typing dots animation ─────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-slate-400 inline-block"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OfficeChat() {
  const { messages, loading, sending, sendMessage, addMessage } = useOfficeChat();
  const { visibleAgents } = useAgents();
  const [input,          setInput]          = useState('');
  const [typingAgent,    setTypingAgent]    = useState<Agent | null>(null);
  const [streamContent,  setStreamContent]  = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent, typingAgent]);

  const activeAgents = visibleAgents.filter(a => a.status !== 'offline');

  // ── Trigger agent reply ────────────────────────────────────────────────────
  const triggerReply = useCallback(async (userText: string) => {
    if (activeAgents.length === 0) return;

    const agentIds = activeAgents.map(a => a.id);
    let respondingAgent: Agent | null = null;
    let content = '';

    setStreamContent('');
    setTypingAgent(null);

    try {
      for await (const event of streamReply(userText, agentIds)) {
        if (event.type === 'agent') {
          respondingAgent = visibleAgents.find(a => a.id === event.agentId) ?? null;
          if (respondingAgent) setTypingAgent(respondingAgent);

        } else if (event.type === 'chunk') {
          content += event.text as string;
          setStreamContent(content);

        } else if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (e) {
      console.error('[OfficeChat] reply error:', e);
    }

    setTypingAgent(null);
    setStreamContent('');

    if (respondingAgent && content.trim()) {
      addMessage({
        id:           `agent-${Date.now()}`,
        userId:       respondingAgent.id,
        authorName:   respondingAgent.name,
        authorAvatar: respondingAgent.avatar,
        content:      content.trim(),
        createdAt:    new Date().toISOString(),
        isOwn:        false,
        accentColor:  respondingAgent.accentColor,
      });
    }
  }, [activeAgents, visibleAgents, addMessage]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || typingAgent) return;
    setInput('');
    const ok = await sendMessage(text);
    if (ok !== false) triggerReply(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        background:          'rgba(6,9,18,0.80)',
        border:              '1px solid rgba(255,255,255,0.06)',
        boxShadow:           '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        backdropFilter:      'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <MessageSquare size={13} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-300">Офис-чат</span>
        <div className="flex -space-x-1.5 ml-1">
          {activeAgents.slice(0, 4).map(a => (
            <span
              key={a.id}
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border"
              style={{ background: `${a.accentColor}25`, borderColor: `${a.accentColor}30` }}
            >
              {a.avatar}
            </span>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold" style={{ color: '#10b981' }}>
          <motion.span
            className="w-1 h-1 rounded-full bg-emerald-400 inline-block"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {activeAgents.length} онлайн
        </span>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">

        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && !typingAgent && (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <MessageSquare size={20} className="text-slate-700 mb-2" />
            <p className="text-[11px] text-slate-600">Напишите что-нибудь — агенты ответят</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isLast={i === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* Streaming agent reply */}
        <AnimatePresence>
          {typingAgent && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <div
                className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[11px] border"
                style={{
                  background:  `${typingAgent.accentColor}20`,
                  borderColor: `${typingAgent.accentColor}35`,
                }}
              >
                {typingAgent.avatar}
              </div>
              <div className="flex flex-col gap-0.5 max-w-[78%]">
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span className="font-semibold" style={{ color: typingAgent.accentColor }}>
                    {typingAgent.name}
                  </span>
                  <span className="text-slate-700">{formatTime(new Date().toISOString())}</span>
                </div>
                <div
                  className="px-2.5 py-1.5 rounded-xl rounded-tl-sm text-[11px] text-slate-300 leading-relaxed"
                  style={{
                    background:  `${typingAgent.accentColor}10`,
                    border:      `1px solid ${typingAgent.accentColor}25`,
                  }}
                >
                  {streamContent ? streamContent : <TypingDots />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 focus-within:border-blue-500/30"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={typingAgent ? `${typingAgent.name} печатает…` : 'Написать команде… (Enter)'}
            disabled={sending || !!typingAgent}
            className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-500 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !!typingAgent}
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white transition-all disabled:opacity-30"
            style={{ background: 'rgba(59,130,246,0.7)' }}
          >
            <Send size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isLast,
}: {
  msg: ReturnType<typeof useOfficeChat>['messages'][number];
  isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: isLast ? 0 : 0 }}
      className={cn('flex gap-2', msg.isOwn && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[9px] border overflow-hidden"
        style={
          msg.isOwn
            ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderColor: 'rgba(139,92,246,0.35)' }
            : {
                background:  msg.accentColor ? `${msg.accentColor}20` : 'rgba(255,255,255,0.06)',
                borderColor: msg.accentColor ? `${msg.accentColor}35` : 'rgba(255,255,255,0.08)',
              }
        }
      >
        {msg.authorAvatar
          ? <img src={msg.authorAvatar} alt="" className="w-full h-full object-cover" />
          : msg.isOwn
            ? '👤'
            : msg.authorName.slice(0, 1).toUpperCase()
        }
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-0.5 max-w-[78%]', msg.isOwn && 'items-end')}>
        <div className={cn('flex items-center gap-1.5 text-[9px]', msg.isOwn && 'flex-row-reverse')}>
          <span
            className="font-semibold"
            style={{ color: msg.isOwn ? '#a78bfa' : (msg.accentColor ?? '#94a3b8') }}
          >
            {msg.isOwn ? 'Вы' : msg.authorName}
          </span>
          <span className="text-slate-700">{formatTime(msg.createdAt)}</span>
        </div>
        <div
          className={cn(
            'px-2.5 py-1.5 rounded-xl text-[11px] text-slate-300 leading-relaxed break-words whitespace-pre-wrap',
            msg.isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm',
          )}
          style={
            msg.isOwn
              ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.20)' }
              : {
                  background:  msg.accentColor ? `${msg.accentColor}10` : 'rgba(255,255,255,0.04)',
                  border:      `1px solid ${msg.accentColor ? `${msg.accentColor}25` : 'rgba(255,255,255,0.06)'}`,
                }
          }
        >
          {msg.content}
        </div>
      </div>
    </motion.div>
  );
}
