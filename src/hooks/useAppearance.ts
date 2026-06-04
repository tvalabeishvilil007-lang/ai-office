import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useAppearance — persists and applies interface appearance settings
//
// Settings stored in localStorage under 'settings:appearance':
//   density:     'comfortable' | 'compact'
//   accentColor: hex string (e.g. '#6366f1')
//   fontSize:    'sm' | 'md' | 'lg'
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'settings:appearance';

export type Density    = 'comfortable' | 'compact';
export type FontSize   = 'sm' | 'md' | 'lg';

export interface AppearanceSettings {
  density:     Density;
  accentColor: string;
  fontSize:    FontSize;
}

const DEFAULTS: AppearanceSettings = {
  density:     'comfortable',
  accentColor: '#6366f1',
  fontSize:    'md',
};

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '13px',
  md: '14px',
  lg: '15.5px',
};

function load(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) as Partial<AppearanceSettings> : {}) };
  } catch {
    return DEFAULTS;
  }
}

function applyToDOM(settings: AppearanceSettings) {
  const body = document.body;

  // Density
  if (settings.density === 'compact') {
    body.classList.add('density-compact');
  } else {
    body.classList.remove('density-compact');
  }

  // Font size
  body.style.fontSize = FONT_SIZE_MAP[settings.fontSize];

  // Accent colour (custom property for components that read it)
  document.documentElement.style.setProperty('--app-accent', settings.accentColor);
}

export function useAppearance() {
  const [settings, setSettings] = useState<AppearanceSettings>(load);

  // Apply on mount + whenever settings change
  useEffect(() => {
    applyToDOM(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, update };
}

/** Call once at app startup to apply saved appearance before first paint */
export function initAppearance() {
  applyToDOM(load());
}
