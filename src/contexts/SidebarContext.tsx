import { createContext, useContext, useState, type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SidebarContext — shared collapsed/expanded state, persisted in localStorage
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });

const STORAGE_KEY = 'sidebar_collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
    catch { return false; }
  });

  const toggle = () => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
