import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { MemoryEntry } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useMemory — per-agent persistent memory backed by Supabase.
//
// Loads:
//   • Personal memories  — rows where user_id = me
//   • Global memories    — rows where is_global = true (from ANY user)
//     The updated RLS policy makes both visible in one query.
//
// Exposes:
//   addMemory            — insert / upsert a key-value fact
//   deleteMemory         — remove own memory
//   toggleGlobal         — share/un-share an own memory with all users
//   extractFromConversation — call server to auto-extract facts from chat
//   memoryContext        — formatted string injected into AI system prompt
//   stats                — { total, global, contributors } for stats bar
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DbMemory {
  id:              string;
  user_id:         string;
  agent_id:        string;
  key:             string;
  value:           string;
  source:          'user' | 'agent' | 'document';
  added_at:        string;
  is_global:       boolean;
  importance:      number;
  tags:            string[];
  conversation_id: string | null;
}

function dbToMemory(m: DbMemory, myUserId: string): MemoryEntry {
  return {
    id:          m.id,
    agentId:     m.agent_id,
    key:         m.key,
    value:       m.value,
    source:      m.source,
    addedAt:     m.added_at,
    isGlobal:    m.is_global,
    importance:  m.importance ?? 5,
    tags:        m.tags ?? [],
    isOwnedByMe: m.user_id === myUserId,
  };
}

// ── Ecosystem stats ───────────────────────────────────────────────────────────

export interface MemoryStats {
  total:        number;
  global:       number;
  contributors: number;
  avgImportance: number;
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseMemoryReturn {
  memories:     MemoryEntry[];
  loading:      boolean;
  stats:        MemoryStats;
  statsLoading: boolean;

  addMemory:    (key: string, value: string, source?: MemoryEntry['source']) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleGlobal: (id: string, current: boolean) => Promise<void>;
  extractFromConversation: (
    messages: Array<{ role: string; content: string }>,
    conversationId?: string,
  ) => Promise<{ count: number }>;

  // Formatted strings for AI system prompt injection
  memoryContext:        string;    // personal context
  globalMemoryContext:  string;    // collective knowledge from all users
}

// ─────────────────────────────────────────────────────────────────────────────

export function useMemory(agentId: string): UseMemoryReturn {
  const { user } = useAuth();
  const [memories,     setMemories]     = useState<MemoryEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [stats,        setStats]        = useState<MemoryStats>({ total: 0, global: 0, contributors: 0, avgImportance: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  // Track reload so extractFromConversation can trigger a refresh
  const loadRef = useRef<() => Promise<void>>(async () => { /* no-op until mounted */ });

  // ── Load memories (own + global from others) ──────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);

      // RLS (post-ecosystem migration) returns:
      //   • all rows where user_id = me
      //   • all rows where is_global = true (any user)
      // One query handles both.
      const { data, error } = await db
        .from('agent_memories')
        .select('*')
        .eq('agent_id', agentId)
        .order('importance', { ascending: false })
        .order('added_at',   { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error('[useMemory] load:', error);
        setLoading(false);
        return;
      }

      setMemories((data as DbMemory[] ?? []).map(m => dbToMemory(m, user!.id)));
      setLoading(false);
    }

    loadRef.current = load;
    load();
    return () => { cancelled = true; };
  }, [agentId, user?.id]);

  // ── Load ecosystem stats (from server endpoint) ───────────────────────────
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;

    async function loadStats() {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/memories/stats/${agentId}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json() as MemoryStats & { total: number; global: number; contributors: number; avgImportance: number };
          setStats({
            total:         data.total        ?? 0,
            global:        data.global       ?? 0,
            contributors:  data.contributors ?? 0,
            avgImportance: data.avgImportance ?? 0,
          });
        }
      } catch {
        // Stats endpoint unavailable — silently ignore (non-critical)
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [agentId]);

  // ── Add / upsert ──────────────────────────────────────────────────────────
  const addMemory = useCallback(async (
    key:    string,
    value:  string,
    source: MemoryEntry['source'] = 'user',
  ) => {
    if (!user || !key.trim() || !value.trim()) return;

    const { data, error } = await db
      .from('agent_memories')
      .upsert(
        { user_id: user.id, agent_id: agentId, key: key.trim(), value: value.trim(), source },
        { onConflict: 'user_id,agent_id,key' },
      )
      .select('*')
      .single();

    if (error || !data) { console.error('[useMemory] add:', error); return; }

    const entry = dbToMemory(data as DbMemory, user.id);
    setMemories(prev => {
      const without = prev.filter(m => !(m.isOwnedByMe && m.key === key.trim()));
      return [entry, ...without];
    });
  }, [agentId, user?.id]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMemory = useCallback(async (id: string) => {
    await db.from('agent_memories').delete().eq('id', id).eq('user_id', user?.id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }, [user?.id]);

  // ── Toggle global sharing ─────────────────────────────────────────────────
  const toggleGlobal = useCallback(async (id: string, current: boolean) => {
    if (!user) return;

    const { error } = await db
      .from('agent_memories')
      .update({ is_global: !current })
      .eq('id', id)
      .eq('user_id', user.id);   // can only toggle own memories

    if (error) { console.error('[useMemory] toggleGlobal:', error); return; }

    setMemories(prev =>
      prev.map(m => m.id === id ? { ...m, isGlobal: !current } : m),
    );
  }, [user?.id]);

  // ── Extract from conversation ─────────────────────────────────────────────
  const extractFromConversation = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    conversationId?: string,
  ): Promise<{ count: number }> => {
    if (!user || messages.length < 2) return { count: 0 };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const res = await fetch('/api/extract-memory', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ agentId, messages, conversationId }),
      });

      if (!res.ok) {
        console.error('[useMemory] extractFromConversation HTTP', res.status);
        return { count: 0 };
      }

      const { memories: extracted, saved } = await res.json() as {
        memories: Array<{ key: string }>;
        saved:    number;
      };

      // Reload hook data so new memories appear in UI
      if (saved > 0) {
        await loadRef.current();
      }

      return { count: saved ?? extracted?.length ?? 0 };
    } catch (err) {
      console.error('[useMemory] extractFromConversation:', err);
      return { count: 0 };
    }
  }, [agentId, user?.id]);

  // ── Memory context strings for AI system prompt ───────────────────────────

  const ownMemories    = memories.filter(m =>  m.isOwnedByMe);
  const globalOthers   = memories.filter(m => !m.isOwnedByMe && m.isGlobal);

  const memoryContext = ownMemories.length === 0 ? '' :
    '--- Личный контекст о пользователе ---\n' +
    ownMemories.map(m => `${m.key}: ${m.value}`).join('\n') +
    '\n---';

  const globalMemoryContext = globalOthers.length === 0 ? '' :
    '--- Коллективные знания (изучено из опыта других пользователей) ---\n' +
    globalOthers
      .sort((a, b) => (b.importance ?? 5) - (a.importance ?? 5))
      .slice(0, 20)                                 // top 20 by importance
      .map(m => `${m.key}: ${m.value}`)
      .join('\n') +
    '\n---';

  return {
    memories,
    loading,
    stats,
    statsLoading,
    addMemory,
    deleteMemory,
    toggleGlobal,
    extractFromConversation,
    memoryContext,
    globalMemoryContext,
  };
}
