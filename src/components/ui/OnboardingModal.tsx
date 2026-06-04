import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, MessageSquare, MessagesSquare,
  BotMessageSquare, ChevronRight, ChevronLeft, X,
  Zap, Sparkles, Brain, ListTodo, FileText, BarChart3,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingModal — multi-step guided tour for new users
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ai-office-onboarded-v2';

export function shouldShowOnboarding(): boolean {
  try { return !localStorage.getItem(STORAGE_KEY); }
  catch { return false; }
}

export function markOnboarded() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
}

export function resetOnboarding() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ── Tour steps ────────────────────────────────────────────────────────────────

interface Step {
  id:      string;
  visual:  React.ReactNode;
  tag:     string;
  title:   string;
  desc:    string;
  tip?:    string;
  cta?:    { label: string; path: string };
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    tag: 'Добро пожаловать',
    title: 'Твой AI‑офис\nготов к работе',
    desc: 'Здесь работает твоя команда AI-сотрудников. Каждый специализируется в своей области и готов помочь прямо сейчас.',
    visual: (
      <div className="relative flex items-center justify-center h-full">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }} />
        </div>
        {/* Center logo */}
        <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center z-10"
             style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}>
          <Zap size={36} className="text-white" />
        </div>
        {/* Orbiting agents */}
        {[
          { emoji: '⚖️', angle: 0,   r: 72, color: '#3b82f6' },
          { emoji: '💼', angle: 60,  r: 72, color: '#6366f1' },
          { emoji: '💰', angle: 120, r: 72, color: '#10b981' },
          { emoji: '📊', angle: 180, r: 72, color: '#f59e0b' },
          { emoji: '🔬', angle: 240, r: 72, color: '#ec4899' },
          { emoji: '🎯', angle: 300, r: 72, color: '#06b6d4' },
        ].map(({ emoji, angle, r, color }) => {
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          return (
            <motion.div
              key={angle}
              className="absolute w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{
                left: `calc(50% + ${x}px - 20px)`,
                top:  `calc(50% + ${y}px - 20px)`,
                background: `${color}20`,
                border: `1px solid ${color}40`,
              }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2 + angle * 0.005, repeat: Infinity, delay: angle * 0.01 }}
            >
              {emoji}
            </motion.div>
          );
        })}
      </div>
    ),
  },
  {
    id: 'office',
    tag: 'Главная',
    title: '3D Офис —\nтвоя штаб-квартира',
    desc: 'На главной странице — интерактивный 3D-офис. Каждая фигурка за столом — это AI-сотрудник.',
    tip: 'Кликни на фигурку мышью — откроется рабочее пространство агента',
    visual: (
      <div className="relative flex items-center justify-center h-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-56 h-40 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <Building2 size={30} className="text-blue-400" />
          </div>
          {/* Mini office mockup */}
          <div className="grid grid-cols-4 gap-2">
            {['⚖️','💼','💰','📊'].map((e, i) => (
              <motion.div key={i}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                {e}
              </motion.div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">← нажми на фигурку →</p>
        </div>
      </div>
    ),
  },
  {
    id: 'navigation',
    tag: 'Навигация',
    title: 'Все разделы\nв левой панели',
    desc: 'Сайдбар слева — главная навигация. Можно свернуть стрелкой для большего пространства.',
    visual: (
      <div className="relative flex items-center justify-center h-full">
        <div className="relative z-10 w-48 rounded-2xl overflow-hidden"
             style={{ background: '#0c1020', border: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { icon: <Building2  size={13} />, label: 'Офис',       color: '#60a5fa', active: true  },
            { icon: <Users      size={13} />, label: 'Команда',    color: '#a78bfa', active: false },
            { icon: <MessagesSquare size={13} />, label: 'Совещание', color: '#34d399', active: false },
            { icon: <BarChart3  size={13} />, label: 'Аналитика',  color: '#fbbf24', active: false },
            { icon: <FileText   size={13} />, label: 'Документы',  color: '#f87171', active: false },
            { icon: <BotMessageSquare size={13} />, label: 'Агенты', color: '#a78bfa', active: false },
          ].map(({ icon, label, color, active }, i) => (
            <motion.div
              key={label}
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium"
              style={{
                background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: active ? '#fff' : '#64748b',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              animate={active ? {} : { opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
            >
              <span style={{ color: active ? color : undefined }}>{icon}</span>
              {label}
              {active && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: color }} />}
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'chat',
    tag: 'Агенты',
    title: 'Рабочее пространство\nкаждого агента',
    desc: 'Кликни на любого агента → откроется его персональный кабинет с пятью вкладками.',
    visual: (
      <div className="relative flex items-center justify-center h-full">
        <div className="relative z-10 w-52 rounded-2xl overflow-hidden"
             style={{ background: '#0c1020', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Agent header */}
          <div className="flex items-center gap-2 px-3 py-2.5"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(99,102,241,0.08)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                 style={{ background: 'rgba(99,102,241,0.2)' }}>⚖️</div>
            <div>
              <p className="text-xs font-bold text-white leading-none">Юрист Грузии</p>
              <p className="text-[10px] text-indigo-400">Онлайн</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex px-2 py-1.5 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { icon: <MessageSquare size={10} />, label: 'Чат',     active: true  },
              { icon: <ListTodo      size={10} />, label: 'Задачи',  active: false },
              { icon: <FileText      size={10} />, label: 'Документы', active: false },
              { icon: <Brain         size={10} />, label: 'Память',  active: false },
            ].map(({ icon, label, active }) => (
              <div key={label}
                   className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-medium"
                   style={{
                     background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                     color: active ? '#fff' : '#475569',
                   }}>
                {icon}{label}
              </div>
            ))}
          </div>
          {/* Chat messages */}
          <div className="p-2 space-y-1.5">
            <div className="flex justify-end">
              <div className="px-2 py-1.5 rounded-xl text-[10px] text-white max-w-[75%]"
                   style={{ background: 'rgba(99,102,241,0.7)' }}>
                Как зарегистрировать ООО?
              </div>
            </div>
            <div className="flex">
              <div className="px-2 py-1.5 rounded-xl text-[10px] text-slate-300 max-w-[80%]"
                   style={{ background: 'rgba(255,255,255,0.06)' }}>
                Для регистрации ООО в Грузии нужно…
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'meeting',
    tag: 'Совещание',
    title: 'Собери агентов\nна совещание',
    desc: 'Выбери 2–5 агентов, задай тему. Они обсудят её по очереди, видя ответы друг друга, и выдадут единый план.',
    tip: 'Идеально для стратегических решений, где нужно несколько точек зрения',
    visual: (
      <div className="relative flex items-center justify-center h-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-32 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {['⚖️','💼','💰'].map((e, i) => (
              <motion.div key={i}
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}>
                {e}
              </motion.div>
            ))}
          </div>
          {/* Connecting dots */}
          <div className="flex items-center gap-1">
            {[0,1,2,3,4].map(i => (
              <motion.div key={i}
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
          <div className="px-3 py-1.5 rounded-xl text-[11px] text-emerald-400 font-medium"
               style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            ✦ Итоговый план действий
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'custom',
    tag: 'Свои агенты',
    title: 'Создай\nсвоего агента',
    desc: 'В разделе «Агенты» можно создать AI-сотрудника с любым системным промптом — HR, копирайтер, аналитик данных, что угодно.',
    tip: 'Системный промпт — это инструкция для AI. Чем точнее, тем лучше результат',
    cta: { label: 'Создать агента', path: '/agents' },
    visual: (
      <div className="relative flex items-center justify-center h-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-40 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <BotMessageSquare size={30} className="text-violet-400" />
          </div>
          {/* Prompt preview */}
          <div className="w-48 rounded-xl p-3"
               style={{ background: '#0a0d1a', border: '1px solid rgba(139,92,246,0.2)' }}>
            <p className="text-[9px] text-violet-400 font-semibold mb-1.5">Системный промпт</p>
            {['Ты — HR-специалист…', 'Помогаешь с вакансиями', 'Оцениваешь резюме'].map((line, i) => (
              <motion.p key={i} className="text-[10px] text-slate-500 leading-relaxed"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}>
                {line}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  onDismiss: () => void;
}

export function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  const navigate  = useNavigate();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  function finish(path?: string) {
    markOnboarded();
    onDismiss();
    if (path) navigate(path);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(2,4,14,0.90)', backdropFilter: 'blur(16px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => finish()}
      />

      {/* Card */}
      <motion.div
        className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #0d1120 0%, #080c18 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
          maxHeight: '90vh',
        }}
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => finish()}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <X size={14} />
        </button>

        {/* Visual area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
            className="h-52 relative overflow-hidden shrink-0"
            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {current.visual}
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + '-text'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="px-6 pt-5 pb-4"
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 text-[10px] font-bold tracking-wide"
                 style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', color: '#818cf8' }}>
              <Sparkles size={9} />
              {current.tag}
            </div>

            {/* Title */}
            <h2 className="text-xl font-extrabold text-white leading-tight mb-2 tracking-tight whitespace-pre-line">
              {current.title}
            </h2>

            {/* Desc */}
            <p className="text-sm text-slate-400 leading-relaxed">
              {current.desc}
            </p>

            {/* Tip */}
            {current.tip && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl"
                   style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <span className="text-indigo-400 text-[11px] mt-0.5">💡</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{current.tip}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center gap-3 shrink-0">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === step ? 20 : 6,
                  height:     6,
                  background: i === step ? '#6366f1' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          {/* Back */}
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Next / Finish */}
          {isLast ? (
            <button
              onClick={() => finish(current.cta?.path)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
            >
              {current.cta ? current.cta.label : 'Начать работу'}
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(99,102,241,0.8)', border: '1px solid rgba(99,102,241,0.4)' }}
            >
              Далее
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
