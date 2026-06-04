import { useState, useCallback, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications — proactive AI notifications from agents
//
// • Stores notifications in localStorage so they survive page reloads
// • `checkForAgent(agentId, memories)` calls the server, which uses Claude
//   Haiku to scan memories for deadlines / risks / insights → returns alerts
// • Respects a 30-minute cooldown per agent so we don't spam the API
// • Exposes markAsRead, dismiss, dismissAll
// ─────────────────────────────────────────────────────────────────────────────

export interface ProactiveNotification {
  id:          string;
  agentId:     string;
  agentName:   string;
  agentAvatar: string;
  title:       string;
  body:        string;
  priority:    'high' | 'medium' | 'low';
  type:        'deadline' | 'reminder' | 'insight' | 'alert';
  createdAt:   string;
  read:        boolean;
}

type MemoryItem = { key: string; value: string; importance?: number };

const STORAGE_KEY   = 'ai_office_notifications';
const COOLDOWN_KEY  = 'ai_office_notif_cooldown';
const COOLDOWN_MS   = 30 * 60 * 1000;  // 30 minutes
const MAX_STORED    = 50;               // cap stored notifications

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): ProactiveNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProactiveNotification[];
  } catch {
    return [];
  }
}

function saveToStorage(notifs: ProactiveNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, MAX_STORED)));
  } catch {
    // storage quota — ignore
  }
}

function loadCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCooldowns(cd: Record<string, number>) {
  try {
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cd));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UseNotificationsReturn {
  notifications: ProactiveNotification[];
  unreadCount:   number;
  checking:      boolean;

  /** Call when agent tab opens with memories loaded */
  checkForAgent: (agentId: string, memories: MemoryItem[]) => Promise<void>;

  markAsRead:    (id: string)  => void;
  dismiss:       (id: string)  => void;
  dismissAll:    ()            => void;
  markAllRead:   ()            => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<ProactiveNotification[]>(loadFromStorage);
  const [checking,      setChecking]      = useState(false);
  const cooldownsRef                      = useRef<Record<string, number>>(loadCooldowns());

  // Sync state → localStorage whenever notifications change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  // ── Check one agent ────────────────────────────────────────────────────────
  const checkForAgent = useCallback(async (agentId: string, memories: MemoryItem[]) => {
    if (memories.length === 0) return;

    // Cooldown check
    const now = Date.now();
    const lastCheck = cooldownsRef.current[agentId] ?? 0;
    if (now - lastCheck < COOLDOWN_MS) return;

    setChecking(true);
    try {
      const res = await fetch('/api/notifications/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agentId, memories }),
      });
      if (!res.ok) return;

      const { notifications: incoming } = await res.json() as {
        notifications: ProactiveNotification[];
      };

      if (incoming.length > 0) {
        setNotifications(prev => {
          // Deduplicate by title to avoid re-adding same alerts
          const existingTitles = new Set(prev.map(n => n.title));
          const fresh = incoming.filter(n => !existingTitles.has(n.title));
          if (fresh.length === 0) return prev;
          return [...fresh, ...prev];
        });
      }

      // Update cooldown
      cooldownsRef.current = { ...cooldownsRef.current, [agentId]: now };
      saveCooldowns(cooldownsRef.current);
    } catch (err) {
      console.error('[useNotifications] checkForAgent:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    checking,
    checkForAgent,
    markAsRead,
    dismiss,
    dismissAll,
    markAllRead,
  };
}
