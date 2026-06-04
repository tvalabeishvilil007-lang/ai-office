import { useState, useCallback, useRef, useEffect } from 'react';
import { streamAgentChat } from '../services/ai/chat-api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Message } from '../types';
import type { ApiChatMessage } from '../services/ai/types';

// ─────────────────────────────────────────────────────────────────────────────
// Local row shapes — mirror the Supabase table columns we use.
// ─────────────────────────────────────────────────────────────────────────────

interface DbSession {
  id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  chat_messages: DbMessage[];
}

interface DbMessage {
  id: string;
  session_id: string;
  role: 'user' | 'agent';
  content: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat session type exposed to the UI
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTitle(msgs: Message[]): string {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'Новый диалог';
  const t = first.content.trim();
  return t.length > 48 ? t.slice(0, 48) + '…' : t;
}

function makePreview(msgs: Message[]): string {
  const last = [...msgs].reverse().find(m => m.role !== 'system');
  return (last?.content ?? '').slice(0, 90);
}

function dbSessionToLocal(s: DbSession, agentId: string): ChatSession {
  return {
    id: s.id,
    title: s.title,
    preview: s.preview,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    messages: (s.chat_messages ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(m => ({
        id: m.id,
        role: m.role,
        agentId,
        content: m.content,
        timestamp: m.created_at,
      })),
  };
}

// Supabase client cast — bypasses strict generic inference for dynamic queries.
// Row Level Security on the server enforces the real access control.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─────────────────────────────────────────────────────────────────────────────

export interface ConsultationCard {
  agentId:   string;
  agentName: string;
  avatar:    string;
  summary:   string;
}

export interface TokenUsage {
  inputTokens:  number;
  outputTokens: number;
}

export interface UseChatReturn {
  messages:       Message[];
  sessions:       ChatSession[];
  activeSessionId: string;
  isLoading:      boolean;
  streamingText:  string;
  error:          string | null;
  consultations:  ConsultationCard[];   // auto-delegation results
  isChecking:     boolean;              // true while delegation pre-flight runs
  lastUsage:      TokenUsage | null;    // token usage from last message
  send:           (text: string, memoryContext?: string) => Promise<void>;
  newSession:     () => Promise<void>;
  loadSession:    (id: string) => void;
  deleteSession:  (id: string) => Promise<void>;
  clearHistory:   () => Promise<void>;
}

export function useChat(agentId: string): UseChatReturn {
  const { user, session: authSession } = useAuth();

  const [sessions,       setSessions]     = useState<ChatSession[]>([]);
  const [activeId,       setActiveId]     = useState<string>('');
  const [isLoading,      setIsLoading]    = useState(false);
  const [streamingText,  setStreaming]     = useState('');
  const [error,          setError]         = useState<string | null>(null);
  const [dbReady,        setDbReady]       = useState(false);
  const [consultations,  setConsultations] = useState<ConsultationCard[]>([]);
  const [isChecking,     setIsChecking]    = useState(false);
  const [lastUsage,      setLastUsage]     = useState<TokenUsage | null>(null);

  // Stable ref — avoids stale closure in async send
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Unique suffix per hook instance — prevents channel name collisions
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8));

  // ── Load sessions on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data, error: dbErr } = await db
        .from('chat_sessions')
        .select('*, chat_messages(*)')
        .eq('agent_id', agentId)
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (dbErr) { console.error('[useChat] load:', dbErr); return; }

      const rows = data as DbSession[] | null;

      if (!rows || rows.length === 0) {
        const newId = await createSessionInDb(user!.id, agentId);
        if (cancelled || !newId) return;
        setSessions([{
          id: newId,
          title: 'Новый диалог',
          preview: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
        }]);
        setActiveId(newId);
        setDbReady(true);
        return;
      }

      const mapped = rows.map(s => dbSessionToLocal(s, agentId));
      setSessions(mapped);
      setActiveId(mapped[0].id);
      setDbReady(true);
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, user?.id]);

  // ── Realtime — sync messages across tabs / devices ─────────────────────────
  // Subscribe to INSERT events on the active session.  Deduplicates against
  // messages we already rendered locally (sent in this tab).
  useEffect(() => {
    if (!activeId) return;

    const channel = supabase
      .channel(`chat_messages:${activeId}:${channelSuffix.current}`)
      .on(
        'postgres_changes' as any,
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_messages',
          filter: `session_id=eq.${activeId}`,
        },
        (payload: { new: DbMessage }) => {
          const row = payload.new;
          // Skip messages we already have (sent by this tab)
          const session = sessionsRef.current.find(s => s.id === row.session_id);
          if (!session) return;
          if (session.messages.some(m => m.id === row.id)) return;

          const incoming: Message = {
            id:        row.id,
            role:      row.role,
            agentId,
            content:   row.content,
            timestamp: row.created_at,
          };
          setSessions(prev => prev.map(s =>
            s.id !== row.session_id ? s : {
              ...s,
              messages:  [...s.messages, incoming],
              updatedAt: row.created_at,
            },
          ));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId, agentId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const sortedSessions = sessions.slice().sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt));
  const activeSession = sessions.find(s => s.id === activeId) ?? sessions[0];
  const messages = activeSession?.messages ?? [];

  // ── DB helpers ─────────────────────────────────────────────────────────────

  async function createSessionInDb(userId: string, agId: string): Promise<string | null> {
    const { data, error: dbErr } = await db
      .from('chat_sessions')
      .insert({ user_id: userId, agent_id: agId, title: 'Новый диалог', preview: '' })
      .select('id')
      .single();
    if (dbErr || !data) { console.error('[useChat] createSession:', dbErr); return null; }
    return (data as { id: string }).id;
  }

  const updateSessionMeta = useCallback(async (sessionId: string, msgs: Message[]) => {
    const title   = makeTitle(msgs);
    const preview = makePreview(msgs);
    const now     = new Date().toISOString();

    await db
      .from('chat_sessions')
      .update({ title, preview, updated_at: now })
      .eq('id', sessionId);

    setSessions(prev => prev.map(s =>
      s.id !== sessionId ? s : { ...s, title, preview, updatedAt: now, messages: msgs },
    ));
  }, []);

  // ── Session management ─────────────────────────────────────────────────────

  const newSession = useCallback(async () => {
    if (!user) return;
    const newId = await createSessionInDb(user.id, agentId);
    if (!newId) return;
    const fresh: ChatSession = {
      id: newId,
      title: 'Новый диалог',
      preview: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions(prev => [fresh, ...prev]);
    setActiveId(newId);
    setError(null);
    setStreaming('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, user?.id]);

  const loadSession = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
    setStreaming('');
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await db.from('chat_sessions').delete().eq('id', id);

    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeId && next.length > 0) {
        const fallback = [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        setActiveId(fallback.id);
      }
      return next;
    });
  }, [activeId]);

  // Auto-create session if all were deleted
  useEffect(() => {
    if (dbReady && sessions.length === 0 && user) {
      newSession();
    }
  }, [dbReady, sessions.length, user, newSession]);

  const clearHistory = useCallback(async () => {
    await deleteSession(activeId);
  }, [deleteSession, activeId]);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = useCallback(async (text: string, memoryContext?: string) => {
    if (!text.trim() || isLoading || !user) return;
    setError(null);

    const sessionId   = activeId;
    const currentMsgs = sessionsRef.current.find(s => s.id === sessionId)?.messages ?? [];

    // Persist user message
    const { data: userRow, error: userErr } = await db
      .from('chat_messages')
      .insert({ session_id: sessionId, role: 'user', content: text.trim() })
      .select('id, created_at')
      .single();

    if (userErr || !userRow) {
      setError('Не удалось сохранить сообщение');
      return;
    }

    const { id: uId, created_at: uAt } = userRow as { id: string; created_at: string };

    const userMsg: Message = {
      id: uId,
      role: 'user',
      agentId,
      content: text.trim(),
      timestamp: uAt,
    };

    const withUser = [...currentMsgs, userMsg];
    setSessions(prev => prev.map(s =>
      s.id !== sessionId ? s : { ...s, messages: withUser, updatedAt: new Date().toISOString() },
    ));

    const apiMessages: ApiChatMessage[] = withUser.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    setIsLoading(true);
    setStreaming('');
    setConsultations([]);
    setIsChecking(false);
    let accumulated = '';

    try {
      const token = authSession?.access_token;

      // For custom agents, pull their system prompt from localStorage
      let customSystemPrompt: string | undefined;
      if (agentId.startsWith('custom-')) {
        try {
          const recs = JSON.parse(localStorage.getItem('ao_custom_agents') ?? '[]') as Array<{ id: string; systemPrompt: string }>;
          customSystemPrompt = recs.find(r => r.id === agentId)?.systemPrompt;
        } catch { /* ignore */ }
      }

      for await (const event of streamAgentChat(agentId, apiMessages, token, memoryContext, customSystemPrompt)) {
        if (event.type === 'chunk') {
          accumulated += event.text;
          setStreaming(accumulated);
          setIsChecking(false);          // delegation done, main stream started
        } else if (event.type === 'delegate_check') {
          setIsChecking(true);
        } else if (event.type === 'delegate_result') {
          setIsChecking(false);
          setConsultations(prev => [
            ...prev,
            { agentId: event.agentId, agentName: event.agentName, avatar: event.avatar, summary: event.summary },
          ]);
        } else if (event.type === 'error') {
          throw new Error(event.message);
        } else if (event.type === 'done') {
          if (event.input_tokens !== undefined && event.output_tokens !== undefined) {
            setLastUsage({ inputTokens: event.input_tokens, outputTokens: event.output_tokens });
          }
          break;
        }
      }

      // Persist agent response
      const { data: agentRow } = await db
        .from('chat_messages')
        .insert({ session_id: sessionId, role: 'agent', content: accumulated })
        .select('id, created_at')
        .single();

      const ar = agentRow as { id: string; created_at: string } | null;
      const assistantMsg: Message = {
        id: ar?.id ?? crypto.randomUUID(),
        role: 'agent',
        agentId,
        content: accumulated,
        timestamp: ar?.created_at ?? new Date().toISOString(),
      };

      await updateSessionMeta(sessionId, [...withUser, assistantMsg]);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(msg);

      const { data: errRow } = await db
        .from('chat_messages')
        .insert({ session_id: sessionId, role: 'agent', content: `⚠️ Ошибка: ${msg}` })
        .select('id, created_at')
        .single();

      const er = errRow as { id: string; created_at: string } | null;
      const errMsg: Message = {
        id: er?.id ?? crypto.randomUUID(),
        role: 'agent',
        agentId,
        content: `⚠️ Ошибка: ${msg}`,
        timestamp: er?.created_at ?? new Date().toISOString(),
      };
      await updateSessionMeta(sessionId, [...withUser, errMsg]);

    } finally {
      setIsLoading(false);
      setStreaming('');
    }
  }, [agentId, activeId, isLoading, user, authSession, updateSessionMeta]);

  return {
    messages,
    sessions: sortedSessions,
    activeSessionId: activeId,
    isLoading,
    streamingText,
    error,
    consultations,
    isChecking,
    lastUsage,
    send,
    newSession,
    loadSession,
    deleteSession,
    clearHistory,
  };
}
