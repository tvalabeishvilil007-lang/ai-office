import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Toast system — lightweight, no external deps.
// Usage:
//   const { toast } = useToast();
//   toast.success('Задача создана');
//   toast.error('Ошибка сохранения');
//   toast.info('Документ скачан');
// ─────────────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastAPI {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
  warning: (msg: string) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={14} />,
  error:   <XCircle      size={14} />,
  info:    <Info         size={14} />,
  warning: <AlertTriangle size={14} />,
};

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: 'rgba(16,185,129,0.30)', icon: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  error:   { border: 'rgba(239,68,68,0.30)',  icon: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
  info:    { border: 'rgba(59,130,246,0.30)', icon: '#60a5fa', bg: 'rgba(59,130,246,0.08)' },
  warning: { border: 'rgba(245,158,11,0.30)', icon: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
};

// ── Single toast ──────────────────────────────────────────────────────────────

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const c = COLORS[item.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -8,  scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl min-w-[260px] max-w-[360px] shadow-2xl"
      style={{
        background: `rgba(10,14,28,0.96)`,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: c.bg, color: c.icon }}
      >
        {ICONS[item.type]}
      </div>

      {/* Message */}
      <p className="flex-1 text-xs font-medium text-slate-200 leading-snug">
        {item.message}
      </p>

      {/* Close */}
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]); // max 5 at once
    timers.current[id] = setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  const api: ToastAPI = {
    success: (msg) => show('success', msg),
    error:   (msg) => show('error',   msg),
    info:    (msg) => show('info',    msg),
    warning: (msg) => show('warning', msg),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 items-end pointer-events-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <AnimatePresence mode="popLayout">
            {toasts.map(t => (
              <div key={t.id} className="pointer-events-auto">
                <ToastCard item={t} onDismiss={dismiss} />
              </div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): { toast: ToastAPI } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return { toast: ctx };
}
