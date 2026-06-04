import { motion } from 'framer-motion';
import { Zap, Shield, Brain, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AGENTS } from '../../data/agents';

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage — premium entrance gate for AI Office
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Brain,  label: 'Умная команда',      desc: 'AI-агенты с долгосрочной памятью' },
  { icon: Zap,    label: 'Мгновенный старт',   desc: 'Задачи выполняются автономно' },
  { icon: Shield, label: 'Ваши данные',         desc: 'Изолированный персональный офис' },
  { icon: Users,  label: 'Вся команда здесь',  desc: `${AGENTS.length} AI-сотрудников готовы` },
];

// First 6 non-offline agents for the preview row
const PREVIEW_AGENTS = AGENTS.filter(a => a.status !== 'offline').slice(0, 6);

export function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: '#040609' }}
    >

      {/* ── Animated background orbs ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700, height: 700,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -60%)',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Secondary glow — left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400,
            top: '20%', left: '5%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Tertiary glow — right */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 350, height: 350,
            bottom: '15%', right: '8%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.2, 1], x: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[420px]"
      >

        {/* Logo badge */}
        <motion.div
          className="flex justify-center mb-7"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 40px rgba(99,102,241,0.45), 0 0 80px rgba(99,102,241,0.15)',
            }}
          >
            <Zap size={28} className="text-white" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
        >
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            AI Office
          </h1>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Ваш персональный виртуальный офис<br />из профессиональных AI-сотрудников
          </p>
        </motion.div>

        {/* Agent preview row */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          {PREVIEW_AGENTS.map((agent, i) => (
            <motion.div
              key={agent.id}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border"
              style={{
                background: `${agent.accentColor}15`,
                borderColor: `${agent.accentColor}30`,
                boxShadow: `0 0 12px ${agent.accentColor}20`,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              title={agent.name}
            >
              {agent.avatar}
            </motion.div>
          ))}
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#475569' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            +{AGENTS.length - PREVIEW_AGENTS.length}
          </motion.div>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(6,9,18,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-px p-px"
               style={{ background: 'rgba(255,255,255,0.04)' }}>
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                className="flex flex-col gap-1.5 px-4 py-4"
                style={{ background: 'rgba(6,9,18,0.95)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 + i * 0.07 }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(99,102,241,0.12)' }}
                  >
                    <Icon size={12} className="text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300">{label}</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

          {/* Sign in section */}
          <div className="px-6 py-6 space-y-4">
            {/* Google button */}
            <motion.button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl
                         bg-white hover:bg-slate-50 active:bg-slate-100
                         text-slate-900 font-semibold text-sm
                         transition-all duration-150 shadow-lg"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Войти через Google
            </motion.button>

            <p className="text-[10px] text-slate-700 text-center">
              Нажимая кнопку, вы соглашаетесь с условиями использования сервиса
            </p>
          </div>
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          className="text-center text-[11px] text-slate-700 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Ваши данные изолированы и защищены · Supabase RLS
        </motion.p>

      </motion.div>
    </div>
  );
}
