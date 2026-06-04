import { createContext, useContext, type ReactNode } from 'react';
import { useNotifications, type UseNotificationsReturn } from '../hooks/useNotifications';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsContext
//
// Provides a single shared notifications state across:
//   • Topbar      — shows bell badge + dropdown
//   • AgentTabChat — triggers checkForAgent when memories load
// ─────────────────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<UseNotificationsReturn | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useNotifications();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): UseNotificationsReturn {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext: missing <NotificationsProvider>');
  return ctx;
}
