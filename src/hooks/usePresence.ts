import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// usePresence — Supabase Realtime Presence
//
// Uses a module-level singleton so only ONE channel is ever created,
// even if the hook is used in multiple components simultaneously.
// ─────────────────────────────────────────────────────────────────────────────

export interface OnlineUser {
  userId:    string;
  email:     string;
  name:      string;
  avatar?:   string;
  page:      string;
  pageLabel: string;
  onlineAt:  string;
}

const PAGE_LABELS: Record<string, string> = {
  '/':         'Офис',
  '/agents':   'Агенты',
  '/meeting':  'Совещание',
  '/settings': 'Настройки',
  '/admin':    'Админ',
  '/my-day':   'Мой день',
  '/team':     'Команда',
  '/docs':     'Документы',
  '/reports':  'Аналитика',
};

function getPageLabel(path: string): string {
  if (path.startsWith('/agent/')) return 'Агент: ' + path.split('/agent/')[1];
  return PAGE_LABELS[path] ?? path;
}

// ── Module-level singleton ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _channel: any = null;
let _online: OnlineUser[] = [];
const _listeners = new Set<(u: OnlineUser[]) => void>();

function notifyListeners() {
  _listeners.forEach(fn => fn([..._online]));
}

function syncState(channel: ReturnType<typeof supabase.channel>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = channel.presenceState() as Record<string, any[]>;
  const users: OnlineUser[] = [];
  for (const [userId, presences] of Object.entries(state)) {
    const p = presences[0] as Omit<OnlineUser, 'userId'> | undefined;
    if (p) users.push({ userId, ...p });
  }
  users.sort((a, b) => b.onlineAt.localeCompare(a.onlineAt));
  _online = users;
  notifyListeners();
}

// ── Public hook ───────────────────────────────────────────────────────────────

export function usePresence(): OnlineUser[] {
  const { user }    = useAuth();
  const location    = useLocation();
  const [online, setOnline] = useState<OnlineUser[]>(_online);
  const trackedRef  = useRef(false);

  // Subscribe to state changes
  useEffect(() => {
    const listener = (u: OnlineUser[]) => setOnline(u);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // Create the singleton channel once
  useEffect(() => {
    if (!user || _channel) return;

    _channel = supabase.channel('office:presence', {
      config: { presence: { key: user.id } },
    });

    _channel
      .on('presence', { event: 'sync'  }, () => syncState(_channel))
      .on('presence', { event: 'join'  }, () => syncState(_channel))
      .on('presence', { event: 'leave' }, () => syncState(_channel))
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          trackedRef.current = true;
          await _channel.track({
            email:     user.email ?? '',
            name:      (user.user_metadata?.full_name as string | undefined)
                         ?? user.email?.split('@')[0] ?? 'Пользователь',
            avatar:    (user.user_metadata?.avatar_url as string | undefined) ?? '',
            page:      location.pathname,
            pageLabel: getPageLabel(location.pathname),
            onlineAt:  new Date().toISOString(),
          });
        }
      });

    return () => {
      if (_channel) {
        supabase.removeChannel(_channel);
        _channel = null;
        _online  = [];
      }
    };
  }, [user?.id]);

  // Update page on navigation
  useEffect(() => {
    if (!user || !_channel || !trackedRef.current) return;
    _channel.track({
      email:     user.email ?? '',
      name:      (user.user_metadata?.full_name as string | undefined)
                   ?? user.email?.split('@')[0] ?? 'Пользователь',
      avatar:    (user.user_metadata?.avatar_url as string | undefined) ?? '',
      page:      location.pathname,
      pageLabel: getPageLabel(location.pathname),
      onlineAt:  new Date().toISOString(),
    });
  }, [location.pathname, user?.id]);

  return online;
}
