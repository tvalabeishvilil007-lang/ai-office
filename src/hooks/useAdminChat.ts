import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// useAdminChat — per-user thread with the admin.
// Users see only their own messages; admin sees all via server routes.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface AdminMessage {
  id:           string;
  userId:       string;
  userName:     string;
  content:      string;
  isFromAdmin:  boolean;
  createdAt:    string;
}

interface DbMsg {
  id:            string;
  user_id:       string;
  user_name:     string;
  content:       string;
  is_from_admin: boolean;
  created_at:    string;
}

function dbToMsg(r: DbMsg): AdminMessage {
  return {
    id:          r.id,
    userId:      r.user_id,
    userName:    r.user_name,
    content:     r.content,
    isFromAdmin: r.is_from_admin,
    createdAt:   r.created_at,
  };
}

// ── User hook (their own thread) ──────────────────────────────────────────────

export function useAdminChat() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [unread,   setUnread]   = useState(0);
  const suffix = useRef(Math.random().toString(36).slice(2, 8));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await db
          .from('admin_messages')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: true })
          .limit(200);

        if (cancelled) return;

        if (!error && data) {
          const msgs = (data as DbMsg[]).map(dbToMsg);
          setMessages(msgs);
          setUnread(msgs.filter(m => m.isFromAdmin).length);
        }
      } catch {
        // table may not exist yet or network error — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`admin_msg:${user.id}:${suffix.current}`)
      .on(
        'postgres_changes' as any,
        {
          event:  'INSERT',
          schema: 'public',
          table:  'admin_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: DbMsg }) => {
          if (cancelled) return;
          const msg = dbToMsg(payload.new);
          setMessages(prev =>
            prev.some(m => m.id === msg.id) ? prev : [...prev, msg],
          );
          // Browser notification for admin replies
          if (msg.isFromAdmin) {
            setUnread(n => n + 1);
            if (Notification.permission === 'granted') {
              new Notification('Ответ от администратора', {
                body: msg.content.slice(0, 120),
                icon: '/icons/icon-192.png',
              });
            }
          }
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user?.id]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    const name = (user.user_metadata?.full_name as string | undefined)
      ?? user.email?.split('@')[0]
      ?? 'Пользователь';

    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: AdminMessage = {
      id: tempId, userId: user.id, userName: name,
      content: content.trim(), isFromAdmin: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await db
      .from('admin_messages')
      .insert({
        user_id:       user.id,
        user_name:     name,
        user_email:    user.email ?? '',
        content:       content.trim(),
        is_from_admin: false,
      })
      .select('*')
      .single();

    setSending(false);

    if (error || !data) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    }

    setMessages(prev => prev.map(m => m.id === tempId ? dbToMsg(data as DbMsg) : m));
    // Request notification permission when first message is sent
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return true;
  }, [user?.id, session]);

  const clearUnread = useCallback(() => setUnread(0), []);

  return { messages, loading, sending, unread, sendMessage, clearUnread };
}

// ── Admin inbox types (loaded via server API) ─────────────────────────────────

export interface AdminInboxUser {
  userId:      string;
  userName:    string;
  userEmail:   string;
  lastMessage: string;
  lastAt:      string;
  unreadCount: number;
}

export async function fetchAdminInbox(token: string): Promise<AdminInboxUser[]> {
  const res = await fetch('/api/admin/inbox', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json() as { users?: AdminInboxUser[] };
  return json.users ?? [];
}

export async function fetchAdminThread(
  userId: string,
  token: string,
): Promise<AdminMessage[]> {
  const res = await fetch(`/api/admin/thread/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json() as { messages?: DbMsg[] };
  return (json.messages ?? []).map(dbToMsg);
}

export async function sendAdminReply(
  userId: string,
  content: string,
  token: string,
): Promise<AdminMessage | null> {
  const res = await fetch('/api/admin/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { message?: DbMsg };
  return json.message ? dbToMsg(json.message) : null;
}
