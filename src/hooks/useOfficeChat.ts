import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// useOfficeChat — shared office group chat backed by Supabase.
// All authenticated users of the same workspace see the same messages.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface OfficeChatMessage {
  id:           string;
  userId:       string;
  authorName:   string;
  authorAvatar: string;
  content:      string;
  createdAt:    string;
  isOwn:        boolean; // true if sent by current user
  accentColor?: string;  // for agent reply messages
}

interface DbOfficeMessage {
  id:            string;
  user_id:       string;
  author_name:   string;
  author_avatar: string;
  content:       string;
  created_at:    string;
}

function dbToMsg(row: DbOfficeMessage, myUserId: string): OfficeChatMessage {
  return {
    id:           row.id,
    userId:       row.user_id,
    authorName:   row.author_name,
    authorAvatar: row.author_avatar,
    content:      row.content,
    createdAt:    row.created_at,
    isOwn:        row.user_id === myUserId,
  };
}

export function useOfficeChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OfficeChatMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  // Unique channel suffix per instance
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await db
        .from('office_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(80);

      if (cancelled) return;
      if (error) {
        console.error('[useOfficeChat] load:', error);
        setLoading(false);
        return;
      }

      setMessages((data as DbOfficeMessage[] ?? []).map(r => dbToMsg(r, userId)));
      setLoading(false);
    }

    load();

    // Realtime: append new messages as they arrive
    const channel = supabase
      .channel(`office_messages:${channelSuffix.current}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'office_messages' },
        (payload: { new: DbOfficeMessage }) => {
          if (cancelled) return;
          const incoming = dbToMsg(payload.new, user.id);
          setMessages(prev => {
            // Dedup — our optimistic insert might have added it already
            if (prev.some(m => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    const authorName   = (user.user_metadata?.full_name as string | undefined)
      ?? user.email?.split('@')[0]
      ?? 'Пользователь';
    const authorAvatar = (user.user_metadata?.avatar_url as string | undefined) ?? '';

    setSending(true);

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: OfficeChatMessage = {
      id:           tempId,
      userId:       user.id,
      authorName,
      authorAvatar,
      content:      content.trim(),
      createdAt:    new Date().toISOString(),
      isOwn:        true,
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await db
      .from('office_messages')
      .insert({
        user_id:       user.id,
        author_name:   authorName,
        author_avatar: authorAvatar,
        content:       content.trim(),
      })
      .select('*')
      .single();

    setSending(false);

    if (error || !data) {
      console.error('[useOfficeChat] send:', error);
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    }

    // Replace optimistic with real record
    const real = dbToMsg(data as DbOfficeMessage, user.id);
    setMessages(prev => prev.map(m => m.id === tempId ? real : m));
    return true;
  }, [user?.id]);

  // Inject a message directly into local state (used for agent replies)
  const addMessage = useCallback((msg: OfficeChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  return { messages, loading, sending, sendMessage, addMessage };
}
