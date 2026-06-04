import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// usePWA — handles service worker registration + install prompt (beforeinstallprompt)
// ─────────────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture install prompt
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // Detect app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    // Online/offline status
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('online',  online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
    return outcome === 'accepted';
  };

  /** True when install banner should be offered */
  const canInstall = !!installPrompt && !isInstalled;

  return { canInstall, isInstalled, isOnline, install };
}

/** Register service worker — call once from main.tsx */
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => { /* SW registration failed silently */ });
    });
  }
}
