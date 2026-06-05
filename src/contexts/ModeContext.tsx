import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AppMode } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// ModeContext — work / study mode switcher
// Persisted in localStorage so it survives page refresh.
// ─────────────────────────────────────────────────────────────────────────────

interface ModeCtx {
  mode:       AppMode;
  toggleMode: () => void;
  isStudy:    boolean;
}

const ModeContext = createContext<ModeCtx>({
  mode: 'work', toggleMode: () => {}, isStudy: false,
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    return (localStorage.getItem('app_mode') as AppMode | null) ?? 'work';
  });

  const toggleMode = () => {
    setMode(prev => {
      const next = prev === 'work' ? 'study' : 'work';
      localStorage.setItem('app_mode', next);
      return next;
    });
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode, isStudy: mode === 'study' }}>
      {children}
    </ModeContext.Provider>
  );
}

export const useMode = () => useContext(ModeContext);
