import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// usePresence — Supabase Realtime Presence
//
// Every logged-in user broadcasts their state to the 'office:presence' channel.
// The hook returns a list of all currently online users (useful for admin panel).
// ─────────────────────────────────────────────────────────────────────────────

export interface OnlineUser {
  userId:   string;
  email:    string;
  name:     string;
  avatar?:  string;
  page:     string;
  pageLabel:string;
  onlineAt: string;
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

export function usePresence(): OnlineUser[] {
  const { user }    = useAuth();
  const location    = useLocation();
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('office:presence', {
      config: { presence: { key: user.id } },
    });

    channelRef.current = channel;

    const syncOnline = () => {
      const state = channel.presenceState<Omit<OnlineUser, 'userId'>>();
      const users: OnlineUser[] = [];
      for (const [userId, presences] of Object.entries(state)) {
        const p = (presences as unknown[])[0] as Omit<OnlineUser, 'userId'>;
        if (p) users.push({ userId, ...p });
      }
      // Sort: most recently joined first
      users.sort((a, b) => b.onlineAt.localeCompare(a.onlineAt));
      setOnline(users);
    };

    channel
      .on('presence', { event: 'sync'  }, syncOnline)
      .on('presence', { event: 'join'  }, syncOnline)
      .on('presence', { event: 'leave' }, syncOnline)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            email:    user.email ?? '',
            name:     (user.user_metadata?.full_name as string | undefined)
                        ?? user.email?.split('@')[0]
                        ?? 'Пользователь',
            avatar:   (user.user_metadata?.avatar_url as string | undefined) ?? '',
            page:     location.pathname,
            pageLabel: getPageLabel(location.pathname),
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Re-track on page change
  useEffect(() => {
    if (!user || !channelRef.current) return;
    channelRef.current.track({
      email:    user.email ?? '',
      name:     (user.user_metadata?.full_name as string | undefined)
                  ?? user.email?.split('@')[0]
                  ?? 'Пользователь',
      avatar:   (user.user_metadata?.avatar_url as string | undefined) ?? '',
      page:     location.pathname,
      pageLabel: getPageLabel(location.pathname),
      onlineAt: new Date().toISOString(),
    });
  }, [location.pathname, user?.id]);

  return online;
}
