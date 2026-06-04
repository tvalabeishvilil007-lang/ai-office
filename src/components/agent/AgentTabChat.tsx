import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Trash2, MessageSquare, Paperclip, X, FileText, Image, Brain, Copy, Check, Mic, MicOff, Sparkles, ChevronDown, ChevronUp, Pin, PinOff, ArrowRight, Zap, BookmarkPlus, Coins } from 'lucide-react';
import { useTokens } from '../../hooks/useTokens';
import { EmptyChatState } from '../ui/EmptyState';
import { MarkdownMessage } from '../ui/MarkdownMessage';
import { useChat, type ChatSession } from '../../hooks/useChat';
import { useMemory } from '../../hooks/useMemory';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useToast } from '../ui/Toast';
import { GlassCard } from '../ui/GlassCard';
import { formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { Agent } from '../../types';

// ── Attached file ─────────────────────────────────────────────────────────────

interface AttachedFile {
  name: string;
  size: string;       // e.g. "24 KB"
  type: 'text' | 'image' | 'other';
  content?: string;   // text content (for .txt / .md files)
  dataUrl?: string;   // for images (preview)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

async function readFile(file: File): Promise<AttachedFile> {
  const isText  = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml|yaml|yml)$/i.test(file.name);
  const isImage = file.type.startsWith('image/');

  const base: AttachedFile = {
    name: file.name,
    size: formatBytes(file.size),
    type: isImage ? 'image' : isText ? 'text' : 'other',
  };

  if (isText && file.size < 200_000) {
    base.content = await file.text();
  }

  if (isImage && file.size < 5_000_000) {
    base.dataUrl = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  return base;
}

interface AgentTabChatProps {
  agent: Agent;
}

export function AgentTabChat({ agent }: AgentTabChatProps) {
  return <LiveChat agent={agent} />;
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Saved / Quick prompt type ─────────────────────────────────────────────────

interface SavedPrompt { id: string; title: string; text: string }

function LiveChat({ agent }: { agent: Agent }) {
  const {
    messages, sessions, activeSessionId,
    isLoading, streamingText, error,
    consultations, isChecking, lastUsage,
    send, newSession, loadSession, deleteSession,
  } = useChat(agent.id);

  const { memories, memoryContext, globalMemoryContext, extractFromConversation } = useMemory(agent.id);
  const { checkForAgent } = useNotificationsContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const userAvatar = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;
  const userInitial = (user?.user_metadata?.full_name as string | undefined)?.slice(0, 1)
    ?? user?.email?.slice(0, 1)?.toUpperCase()
    ?? '?';

  const [input,          setInput]          = useState('');
  const [attachments,    setAttachments]    = useState<AttachedFile[]>([]);
  const [extracting,     setExtracting]     = useState(false);
  const [summarizing,    setSummarizing]    = useState(false);
  const [summaryOpen,    setSummaryOpen]    = useState(false);
  const [summaryResult,  setSummaryResult]  = useState<{ summary: string; points: string[] } | null>(null);

  // ── Quick / Saved prompts ──────────────────────────────────────────────────
  const PROMPTS_KEY = `quick_prompts:${agent.id}`;
  const [savedPrompts,   setSavedPrompts]   = useState<SavedPrompt[]>(() => {
    try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) ?? '[]') as SavedPrompt[]; }
    catch { return []; }
  });
  const [promptsOpen,    setPromptsOpen]    = useState(false);

  const saveCurrentPrompt = () => {
    const text = input.trim();
    if (!text) return;
    const title = text.length > 42 ? text.slice(0, 42) + '…' : text;
    const p: SavedPrompt = { id: crypto.randomUUID(), title, text };
    const next = [p, ...savedPrompts].slice(0, 20);
    setSavedPrompts(next);
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(next));
  };
  const deletePrompt = (id: string) => {
    const next = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(next);
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(next));
  };

  // ── Token tracking ─────────────────────────────────────────────────────────
  const { addUsage, totalTokens, stats: tokenStats } = useTokens(agent.id);
  const [tokensOpen, setTokensOpen] = useState(false);

  // Capture usage whenever the last message completes
  useEffect(() => {
    if (lastUsage) addUsage(lastUsage.inputTokens, lastUsage.outputTokens);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUsage]);

  // Pinned messages — persisted per agent in localStorage
  const pinStorageKey = `pinned_${agent.id}`;
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(pinStorageKey) ?? '[]') as string[]); }
    catch { return new Set(); }
  });
  const [pinnedOpen, setPinnedOpen] = useState(false);

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(pinStorageKey, JSON.stringify([...next]));
      return next;
    });
  };
  const pinnedMessages = messages.filter(m => pinnedIds.has(m.id));
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  // Drag-and-drop files onto chat area
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0); // track nested dragenter/dragleave

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragOver(false); }
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const parsed = await Promise.all(files.map(readFile));
    setAttachments(prev => [...prev, ...parsed]);
    inputRef.current?.focus();
  };

  // Voice input — appends final transcript to the text field
  const { isSupported: voiceSupported, isListening, interim, toggle: toggleVoice } = useVoiceInput({
    lang: 'ru-RU',
    onFinal: (transcript) => {
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
      inputRef.current?.focus();
    },
  });

  // Combine personal + global context for the AI system prompt
  const combinedMemoryContext = [memoryContext, globalMemoryContext].filter(Boolean).join('\n\n') || undefined;

  // Extract knowledge from current conversation
  const handleExtract = async () => {
    if (!messages.length || extracting) return;
    setExtracting(true);
    const apiMessages = messages.map(m => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
    const { count } = await extractFromConversation(apiMessages, activeSessionId);
    setExtracting(false);
    if (count > 0) {
      toast.success(`Извлечено ${count} ${count === 1 ? 'факт' : count < 5 ? 'факта' : 'фактов'} — сохранено в памяти`);
    } else {
      toast.info('Новых фактов для извлечения не найдено');
    }
  };

  // Summarise current session
  const handleSummarise = async () => {
    if (!messages.length || summarizing) return;
    if (summaryResult) { setSummaryOpen(o => !o); return; }
    setSummarizing(true);
    setSummaryOpen(true);
    try {
      const apiMessages = messages.map(m => ({
        role:    m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      const res = await fetch('/api/summary/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agentId: agent.id, messages: apiMessages }),
      });
      if (res.ok) {
        const data = await res.json() as { summary: string; points: string[] };
        setSummaryResult(data);
      }
    } catch { /* silent */ }
    finally { setSummarizing(false); }
  };

  // Continue conversation in a new session — forwards the summary as context
  const handleContinue = async () => {
    if (!summaryResult || isLoading) return;
    const ctxMsg = [
      `*Продолжение предыдущего диалога*`,
      ``,
      `Резюме: ${summaryResult.summary}`,
      ...(summaryResult.points.length > 0
        ? [``, `Ключевые выводы:`, ...summaryResult.points.map((p, i) => `${i + 1}. ${p}`)]
        : []),
      ``,
      `Продолжим работу с этого места.`,
    ].join('\n');
    await newSession();
    // Brief delay to let the new session become active before sending
    setTimeout(() => { void send(ctxMsg, combinedMemoryContext); }, 120);
    setSummaryOpen(false);
  };

  // Proactive notifications: check agent memories once per session on load
  useEffect(() => {
    if (memories.length === 0) return;
    const memItems = memories.slice(0, 30).map(m => ({
      key:        m.key,
      value:      m.value,
      importance: m.importance,
    }));
    checkForAgent(agent.id, memItems);
  }, [agent.id, memories.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    // Build the final message — prepend file info if any files attached
    let fullText = text;
    if (attachments.length > 0) {
      const fileParts = attachments.map(f => {
        if (f.type === 'text' && f.content) {
          return `[Документ: ${f.name} (${f.size})]\n\`\`\`\n${f.content.slice(0, 4000)}${f.content.length > 4000 ? '\n…(обрезано)' : ''}\n\`\`\``;
        }
        if (f.type === 'image') {
          return `[Изображение: ${f.name} (${f.size})]`;
        }
        return `[Файл: ${f.name} (${f.size})]`;
      });
      fullText = fileParts.join('\n\n') + (text ? '\n\n' + text : '');
    }

    setInput('');
    setAttachments([]);
    await send(fullText, combinedMemoryContext);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const parsed = await Promise.all(files.map(readFile));
    setAttachments(prev => [...prev, ...parsed]);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full gap-4 min-h-0">

      {/* ── Sessions sidebar ─────────────────────────────────────────────── */}
      <SessionsSidebar
        agent={agent}
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={loadSession}
        onNew={newSession}
        onDelete={deleteSession}
      />

      {/* ── Main chat ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <GlassCard
          variant="dark"
          padding="none"
          className="flex-1 flex flex-col min-h-0 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag-over overlay */}
          {isDragOver && (
            <div
              className="absolute inset-0 z-30 rounded-2xl flex flex-col items-center justify-center gap-3 pointer-events-none"
              style={{
                background: `${agent.accentColor}12`,
                border: `2px dashed ${agent.accentColor}60`,
                backdropFilter: 'blur(2px)',
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${agent.accentColor}20`, border: `1px solid ${agent.accentColor}40` }}
              >
                📎
              </div>
              <p className="text-sm font-semibold" style={{ color: agent.accentColor }}>
                Отпустите файлы здесь
              </p>
              <p className="text-xs text-slate-500">Текст, изображения, документы</p>
            </div>
          )}

          {/* Pinned messages panel */}
          {pinnedMessages.length > 0 && (
            <div
              className="shrink-0 mx-4 mt-3 rounded-xl overflow-hidden"
              style={{ border: `1px solid ${agent.accentColor}25`, background: `${agent.accentColor}08` }}
            >
              <button
                onClick={() => setPinnedOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold transition-colors hover:bg-white/[0.03]"
                style={{ color: agent.accentColor }}
              >
                <Pin size={11} />
                {pinnedMessages.length} закреплённых
                {pinnedOpen ? <ChevronUp size={10} className="ml-auto" /> : <ChevronDown size={10} className="ml-auto" />}
              </button>
              <AnimatePresence>
                {pinnedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${agent.accentColor}15` }}>
                      {pinnedMessages.map(m => (
                        <div key={m.id} className="flex items-start gap-2 pt-2">
                          <Pin size={9} className="shrink-0 mt-1" style={{ color: agent.accentColor }} />
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 flex-1">{m.content}</p>
                          <button onClick={() => togglePin(m.id)} className="shrink-0 text-slate-600 hover:text-rose-400 transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Empty state */}
            {messages.length === 0 && !streamingText && (
              <EmptyChatState
                key={activeSessionId}
                agent={agent}
                onPrompt={text => send(text, combinedMemoryContext)}
              />
            )}

            {/* Committed messages with date separators */}
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const msgDate = msg.timestamp ? new Date(msg.timestamp).toDateString() : null;
                const prevDate = i > 0 && messages[i - 1].timestamp
                  ? new Date(messages[i - 1].timestamp!).toDateString()
                  : null;
                const showDateSep = msgDate && msgDate !== prevDate;

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDateSep && (
                      <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-white/[0.05]" />
                        <span className="text-[10px] font-medium text-slate-600 shrink-0">
                          {formatDateSeparator(msg.timestamp!)}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
                    >
                      <Avatar isUser={isUser} agent={agent} userAvatar={userAvatar} userInitial={userInitial} />
                      <Bubble
                        isUser={isUser} agent={agent}
                        content={msg.content} timestamp={msg.timestamp}
                        isPinned={pinnedIds.has(msg.id)}
                        onPin={() => togglePin(msg.id)}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>

            {/* Delegation: checking indicator */}
            {isChecking && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl self-start"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
              >
                <div className="w-3 h-3 rounded-full border border-indigo-400/40 border-t-indigo-400 animate-spin shrink-0" />
                <span className="text-[11px] text-indigo-400">Консультируюсь с коллегами…</span>
              </motion.div>
            )}

            {/* Delegation: consultation result cards */}
            <AnimatePresence initial={false}>
              {consultations.map((c) => (
                <motion.div
                  key={c.agentId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2 items-start"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {c.avatar}
                  </div>
                  <div
                    className="flex-1 px-3 py-2 rounded-xl rounded-tl-sm text-xs text-slate-400 leading-relaxed"
                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.10)' }}
                  >
                    <span className="text-indigo-400 font-semibold mr-1.5">{c.agentName}:</span>
                    {c.summary.slice(0, 180)}{c.summary.length > 180 ? '…' : ''}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming bubble */}
            {streamingText && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <Avatar isUser={false} agent={agent} userAvatar={undefined} userInitial={undefined} />
                <Bubble isUser={false} agent={agent} content={streamingText} streaming />
              </motion.div>
            )}

            {/* Typing indicator */}
            {isLoading && !streamingText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <Avatar isUser={false} agent={agent} userAvatar={undefined} userInitial={undefined} />
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {[0, 0.18, 0.36].map(delay => (
                    <motion.span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-slate-500"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {error && (
              <p className="text-[11px] text-red-400/70 text-center">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Action strip — shown when conversation has enough messages */}
          <AnimatePresence>
            {messages.length >= 4 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pt-2 shrink-0 overflow-hidden space-y-2"
              >
                {/* Two action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExtract}
                    disabled={extracting || isLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-medium',
                      'border transition-all duration-200 disabled:opacity-40',
                    )}
                    style={{ background: 'rgba(99,102,241,0.07)', borderColor: 'rgba(99,102,241,0.18)', color: '#818cf8' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.13)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.07)'; }}
                  >
                    <Brain size={12} className={extracting ? 'animate-pulse' : ''} />
                    {extracting ? 'Извлекаю…' : 'Извлечь знания'}
                  </button>

                  <button
                    onClick={handleSummarise}
                    disabled={summarizing || isLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-medium',
                      'border transition-all duration-200 disabled:opacity-40',
                    )}
                    style={{ background: `${agent.accentColor}08`, borderColor: `${agent.accentColor}25`, color: agent.accentColor }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${agent.accentColor}14`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${agent.accentColor}08`; }}
                  >
                    <Sparkles size={12} className={summarizing ? 'animate-pulse' : ''} />
                    {summarizing ? 'Анализирую…' : 'Итоги беседы'}
                    {summaryResult && (summaryOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                  </button>
                </div>

                {/* Summary panel */}
                <AnimatePresence>
                  {summaryOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl"
                      style={{ border: `1px solid ${agent.accentColor}20`, background: `${agent.accentColor}08` }}
                    >
                      {summarizing ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-[11px]" style={{ color: agent.accentColor }}>
                          <Sparkles size={11} className="animate-pulse shrink-0" />
                          <span>{agent.name} анализирует диалог…</span>
                        </div>
                      ) : summaryResult && (
                        <div className="px-3 py-3 space-y-2">
                          <p className="text-[11px] font-semibold text-slate-300">{summaryResult.summary}</p>
                          {summaryResult.points.length > 0 && (
                            <ul className="space-y-1">
                              {summaryResult.points.map((pt, i) => (
                                <li key={i} className="flex gap-2 text-[11px] text-slate-400">
                                  <span className="mt-[5px] w-1 h-1 rounded-full shrink-0" style={{ background: agent.accentColor }} />
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          )}
                          {/* Continue in new session */}
                          <button
                            onClick={handleContinue}
                            disabled={isLoading}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 disabled:opacity-40"
                            style={{ background: `${agent.accentColor}18`, border: `1px solid ${agent.accentColor}30`, color: agent.accentColor }}
                          >
                            Продолжить в новом чате
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div className="px-4 pb-4 pt-3 border-t border-white/[0.05] shrink-0">

            {/* ── Token usage indicator ───────────────────────────────────── */}
            {totalTokens > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => setTokensOpen(o => !o)}
                  className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <Coins size={10} />
                  <span>{totalTokens.toLocaleString()} токенов сегодня</span>
                  <span className="text-slate-700">·</span>
                  <span>≈${(tokenStats.input * 3 / 1e6 + tokenStats.output * 15 / 1e6).toFixed(4)}</span>
                  {tokensOpen ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                </button>
                <AnimatePresence>
                  {tokensOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1.5 flex items-center gap-4 text-[10px] text-slate-600 pl-4">
                        <span>Вход: <b className="text-slate-500">{tokenStats.input.toLocaleString()}</b></span>
                        <span>Выход: <b className="text-slate-500">{tokenStats.output.toLocaleString()}</b></span>
                        <span>Запросов: <b className="text-slate-500">{tokenStats.calls}</b></span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Saved prompts panel ─────────────────────────────────────── */}
            <AnimatePresence>
              {promptsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-2"
                >
                  {savedPrompts.length === 0 ? (
                    <p className="text-[11px] text-slate-600 py-1.5 pl-1">
                      Нет сохранённых промптов. Напишите сообщение и нажмите <Zap size={10} className="inline" /> чтобы сохранить.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 py-1.5">
                      {savedPrompts.map(p => (
                        <div
                          key={p.id}
                          className="group flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-[11px] border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                          style={{ maxWidth: 180 }}
                          onClick={() => { setInput(p.text); setPromptsOpen(false); }}
                        >
                          <span className="truncate flex-1">{p.title}</span>
                          <button
                            onClick={e => { e.stopPropagation(); deletePrompt(p.id); }}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all ml-0.5"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Attachment chips */}
            <AnimatePresence initial={false}>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 mb-2 overflow-hidden"
                >
                  {attachments.map((f, i) => (
                    <motion.div
                      key={`${f.name}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border"
                      style={{
                        background: `${agent.accentColor}12`,
                        borderColor: `${agent.accentColor}30`,
                        color: agent.accentColor,
                      }}
                    >
                      {f.type === 'image'
                        ? <Image size={10} />
                        : <FileText size={10} />}
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <span className="text-slate-600">{f.size}</span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-600 hover:text-slate-300 transition-colors ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              'flex items-end gap-2 px-3 py-2.5 rounded-xl',
              'bg-white/[0.04] border border-white/[0.08]',
              'focus-within:border-white/[0.15] focus-within:bg-white/[0.06]',
              'transition-all duration-200',
            )}>
              {/* Saved prompts toggle */}
              <button
                onClick={() => setPromptsOpen(o => !o)}
                title="Быстрые промпты"
                className={cn(
                  'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150',
                  promptsOpen
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]',
                )}
                style={promptsOpen ? { background: agent.accentColor } : {}}
              >
                <Zap size={13} />
              </button>

              {/* Paperclip */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={isLoading}
                title="Прикрепить файл"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all duration-150 disabled:opacity-30"
              >
                <Paperclip size={14} />
              </button>

              {/* Textarea with interim voice overlay */}
              <div className="relative flex-1 min-w-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? interim || 'Слушаю…'
                      : `Спросить ${agent.name}…`
                  }
                  rows={1}
                  disabled={isLoading}
                  className={cn(
                    'w-full bg-transparent text-sm text-slate-300 placeholder:text-slate-600',
                    'outline-none resize-none leading-relaxed max-h-32 overflow-y-auto',
                    (isLoading || isListening) && 'opacity-50',
                    isListening && 'placeholder:text-indigo-400',
                  )}
                  style={{ scrollbarWidth: 'none' }}
                />
                {/* Live interim transcript badge */}
                {isListening && interim && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 text-sm leading-relaxed text-indigo-300 pointer-events-none truncate"
                  >
                    {input ? input + ' ' + interim : interim}
                  </motion.span>
                )}
              </div>

              {/* Mic button — only when Web Speech API is available */}
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  disabled={isLoading}
                  title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
                  className={cn(
                    'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    isListening
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08]',
                  )}
                  style={isListening ? {
                    background: '#ef4444',
                    boxShadow: '0 0 12px rgba(239,68,68,0.5)',
                    animation: 'statusPulse 1.2s ease-in-out infinite',
                  } : {}}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}

              {/* Save as prompt */}
              {input.trim() && (
                <button
                  onClick={saveCurrentPrompt}
                  title="Сохранить как промпт"
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-amber-400 hover:bg-amber-400/10 transition-all duration-150"
                >
                  <BookmarkPlus size={13} />
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: agent.accentColor }}
              >
                <Send size={13} />
              </button>
            </div>
            <p className="text-[10px] text-slate-700 mt-1.5 text-center">
              Enter — отправить · Shift+Enter — новая строка
              {voiceSupported && ' · 🎙 — голос'}
            </p>
          </div>

        </GlassCard>
      </div>

      {/* ── Skills sidebar ───────────────────────────────────────────────── */}
      <div className="w-44 shrink-0">
        <GlassCard variant="dark" padding="sm" className="text-xs">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
            Специализация
          </p>
          <div className="space-y-1">
            {agent.skills.map(s => (
              <button
                key={s.id}
                onClick={() => { setInput(s.label + ' — расскажи подробнее'); inputRef.current?.focus(); }}
                className="w-full flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-left"
              >
                <span className="w-1 h-1 rounded-full shrink-0 mt-0.5" style={{ background: agent.accentColor }} />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessions sidebar
// ─────────────────────────────────────────────────────────────────────────────

function SessionsSidebar({
  agent, sessions, activeId, onSelect, onNew, onDelete,
}: {
  agent: Agent;
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="w-52 shrink-0 flex flex-col gap-2 min-h-0">

      {/* New session button */}
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                   border border-white/[0.08] bg-white/[0.04] text-slate-400
                   hover:text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.07]
                   transition-all duration-150 w-full"
      >
        <Plus size={13} style={{ color: agent.accentColor }} />
        Новый диалог
      </button>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        {sessions.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-4">Нет диалогов</p>
        ) : (
          sessions.map(s => {
            const isActive = s.id === activeId;
            const isHovered = hoveredId === s.id;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative group"
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150',
                    'border text-xs',
                    isActive
                      ? 'border-white/[0.12] bg-white/[0.07] text-slate-200'
                      : 'border-transparent bg-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 hover:border-white/[0.06]',
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                      style={{ background: agent.accentColor }}
                    />
                  )}

                  {/* Title */}
                  <div className="flex items-start gap-1.5 pr-5">
                    <MessageSquare
                      size={10}
                      className="shrink-0 mt-0.5"
                      style={{ color: isActive ? agent.accentColor : 'inherit', opacity: isActive ? 1 : 0.5 }}
                    />
                    <span className="line-clamp-2 leading-snug font-medium">{s.title}</span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-600 pl-4">
                    <span>{formatRelativeDate(s.updatedAt)}</span>
                    {s.messages.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{s.messages.length} сообщ.</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Delete button — appears on hover */}
                {isHovered && (
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-lg flex items-center justify-center
                               text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={9} />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message components
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({
  isUser, agent, userAvatar, userInitial,
}: {
  isUser: boolean;
  agent: Agent;
  userAvatar?: string;
  userInitial?: string;
}) {
  return (
    <div
      className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-base border overflow-hidden"
      style={
        isUser
          ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderColor: 'rgba(139,92,246,0.3)' }
          : { background: `${agent.accentColor}18`, borderColor: `${agent.accentColor}25` }
      }
    >
      {isUser
        ? userAvatar
          ? <img src={userAvatar} alt="" className="w-full h-full object-cover" />
          : <span className="text-xs font-bold text-white">{userInitial ?? '?'}</span>
        : agent.avatar}
    </div>
  );
}

function Bubble({
  isUser, agent, content, timestamp, streaming = false, isPinned = false, onPin,
}: {
  isUser: boolean; agent: Agent; content: string; timestamp?: string;
  streaming?: boolean; isPinned?: boolean; onPin?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className={cn('flex flex-col gap-1 max-w-[72%] group/bubble', isUser && 'items-end')}>
      {/* Name + time */}
      <div className={cn('flex items-center gap-2 text-[10px]', isUser && 'flex-row-reverse')}>
        <span className="font-semibold" style={{ color: isUser ? '#a78bfa' : agent.accentColor }}>
          {isUser ? 'Вы' : agent.name}
        </span>
        {timestamp && <span className="text-slate-600">{formatTime(timestamp)}</span>}
        {isPinned && <Pin size={9} style={{ color: agent.accentColor }} />}
      </div>

      {/* Message + action buttons */}
      <div className="relative flex items-end gap-1.5">
        {/* Actions — appear on hover */}
        {!streaming && (
          <div className={cn(
            'flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-all duration-150 mb-0.5',
            isUser ? 'order-first flex-row-reverse' : 'order-last',
          )}>
            {/* Pin button */}
            {onPin && (
              <button
                onClick={onPin}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-amber-400 hover:bg-white/[0.07] transition-all"
                title={isPinned ? 'Открепить' : 'Закрепить'}
              >
                {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
              </button>
            )}
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.07] transition-all"
              title="Копировать"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          </div>
        )}

        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            isUser
              ? 'bg-indigo-600/20 border border-indigo-500/20 rounded-tr-sm text-sm text-slate-300 leading-relaxed whitespace-pre-line'
              : 'bg-white/[0.05] border border-white/[0.07] rounded-tl-sm',
          )}
        >
          {isUser ? (
            <>
              {content}
              {streaming && (
                <motion.span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full"
                  style={{ background: agent.accentColor }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </>
          ) : (
            <>
              <MarkdownMessage content={content} accentColor={agent.accentColor} />
              {streaming && (
                <motion.span
                  className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full"
                  style={{ background: agent.accentColor }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateSeparator(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  const isToday     = d.toDateString() === now.toDateString();
  const yesterday   = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday)     return 'Сегодня';
  if (isYesterday) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatRelativeDate(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60)                return 'только что';
  if (diff < 3600)              return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400)             return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 2)         return 'вчера';
  if (diff < 86400 * 7)         return `${Math.floor(diff / 86400)} д назад`;

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
