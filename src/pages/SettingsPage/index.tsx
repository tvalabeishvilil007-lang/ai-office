import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, LogOut, Shield, Database, Cpu,
  CheckCircle2, AlertCircle, ChevronRight,
  Bell, Globe, Lock, Palette, Monitor, Type,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppearance, type Density, type FontSize } from '../../hooks/useAppearance';
import { GlassCard } from '../../components/ui/GlassCard';
import { Topbar } from '../../components/layout/Topbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// SettingsPage — account & application settings
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_DELAY = 0.06;

const NOTIF_KEY = 'settings:notifications';

function loadNotifSettings() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '{}'); } catch { return {}; }
}

const ACCENT_SWATCHES = [
  { color: '#6366f1', label: 'Индиго'   },
  { color: '#8b5cf6', label: 'Фиолет'   },
  { color: '#3b82f6', label: 'Синий'    },
  { color: '#10b981', label: 'Изумруд'  },
  { color: '#f59e0b', label: 'Янтарь'   },
  { color: '#ef4444', label: 'Красный'  },
  { color: '#ec4899', label: 'Розовый'  },
  { color: '#0ea5e9', label: 'Голубой'  },
];

const DENSITY_OPTIONS: { value: Density; label: string; desc: string }[] = [
  { value: 'comfortable', label: 'Просторный', desc: 'Стандартные отступы' },
  { value: 'compact',     label: 'Компактный',  desc: 'Меньше отступов, больше контента' },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Маленький' },
  { value: 'md', label: 'Средний'   },
  { value: 'lg', label: 'Большой'   },
];

export function SettingsPage() {
  const { user, signOut }                                  = useAuth();
  const { settings: appearance, update: updateAppearance } = useAppearance();
  const [signingOut, setSigningOut] = useState(false);
  const [notif, setNotif] = useState<Record<string, boolean>>(() => ({
    task_done:   true,
    new_message: true,
    system:      false,
    ...loadNotifSettings(),
  }));

  const toggleNotif = (key: string) => {
    setNotif(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Пользователь';
  const email     = user?.email ?? '';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials  = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  const sections = [
    {
      title: 'Внешний вид',
      icon: Palette,
      iconColor: '#ec4899',
      iconBg: 'rgba(236,72,153,0.12)',
      content: (
        <div className="space-y-5">

          {/* Density */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Monitor size={13} className="text-slate-500" />
              <p className="text-xs font-semibold text-slate-300">Плотность интерфейса</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DENSITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateAppearance({ density: opt.value })}
                  className={cn(
                    'flex flex-col gap-0.5 px-4 py-3 rounded-xl border text-left transition-all duration-150',
                    appearance.density === opt.value
                      ? 'border-indigo-500/50 text-white'
                      : 'border-white/[0.07] text-slate-400 hover:border-white/[0.14] hover:text-slate-300',
                  )}
                  style={appearance.density === opt.value ? { background: 'rgba(99,102,241,0.12)' } : { background: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-[10px] opacity-60">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Type size={13} className="text-slate-500" />
              <p className="text-xs font-semibold text-slate-300">Размер шрифта</p>
            </div>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateAppearance({ fontSize: opt.value })}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-xs font-semibold transition-all duration-150',
                    appearance.fontSize === opt.value
                      ? 'border-indigo-500/50 text-white'
                      : 'border-white/[0.07] text-slate-400 hover:border-white/[0.14] hover:text-slate-300',
                  )}
                  style={appearance.fontSize === opt.value ? { background: 'rgba(99,102,241,0.12)' } : { background: 'rgba(255,255,255,0.03)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent colour */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Palette size={13} className="text-slate-500" />
              <p className="text-xs font-semibold text-slate-300">Акцентный цвет интерфейса</p>
              <span className="text-[10px] text-slate-600">(влияет на активные элементы)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_SWATCHES.map(s => (
                <button
                  key={s.color}
                  onClick={() => updateAppearance({ accentColor: s.color })}
                  title={s.label}
                  className="w-8 h-8 rounded-xl border-2 transition-all duration-150 hover:scale-110"
                  style={{
                    background: s.color,
                    borderColor: appearance.accentColor === s.color ? '#fff' : 'transparent',
                    boxShadow: appearance.accentColor === s.color ? `0 0 12px ${s.color}80` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Профиль',
      icon: User,
      iconColor: '#6366f1',
      iconBg: 'rgba(99,102,241,0.12)',
      content: (
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover"
                style={{ border: '2px solid rgba(99,102,241,0.3)' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.3)',
                }}
              >
                {initials}
              </div>
            )}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0b0f1a]"
              style={{ background: '#10b981' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white leading-tight">{displayName}</p>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                Professional Plan
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                Google OAuth
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'AI-конфигурация',
      icon: Cpu,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59,130,246,0.12)',
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-200">AI-провайдер</p>
              <p className="text-xs text-slate-500 mt-0.5">Используется для ответов агентов</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 12px' }}>
              Anthropic Claude
            </div>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-200">Статус API-ключа</p>
              <p className="text-xs text-slate-500 mt-0.5">Ключ хранится только на сервере</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
              <AlertCircle size={13} />
              Демо-режим
            </div>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-200">Безопасность ключей</p>
              <p className="text-xs text-slate-500 mt-0.5">API-ключи никогда не передаются клиенту</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <CheckCircle2 size={13} />
              Защищено
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'База данных',
      icon: Database,
      iconColor: '#10b981',
      iconBg: 'rgba(16,185,129,0.12)',
      content: (
        <div className="space-y-3">
          {[
            { label: 'Суbase проект', value: 'AI Office', ok: true },
            { label: 'Аутентификация',  value: 'Row Level Security', ok: true },
            { label: 'Хранилище чатов', value: 'Supabase Postgres', ok: true },
            { label: 'Хранилище задач', value: 'Supabase Postgres', ok: true },
            { label: 'Хранилище памяти', value: 'Supabase Postgres', ok: true },
            { label: 'Хранилище документов', value: 'Supabase Postgres', ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between py-1.5">
              <p className="text-xs text-slate-400">{label}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{value}</span>
                {ok
                  ? <CheckCircle2 size={12} className="text-emerald-500" />
                  : <AlertCircle  size={12} className="text-red-400" />
                }
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Уведомления',
      icon: Bell,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.12)',
      content: (
        <div className="space-y-3">
          {[
            { key: 'task_done',   label: 'Задача выполнена',      desc: 'Когда агент завершит задачу' },
            { key: 'new_message', label: 'Новое сообщение',        desc: 'Ответы агентов в чате' },
            { key: 'system',      label: 'Системные уведомления',  desc: 'Обновления платформы' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(key)}
                className="w-9 h-5 rounded-full relative shrink-0 transition-colors duration-200 focus:outline-none"
                style={{ background: notif[key] ? '#3b82f6' : 'rgba(255,255,255,0.10)' }}
                aria-pressed={notif[key]}
              >
                <motion.span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md"
                  animate={{ left: notif[key] ? '18px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-[#070a12] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Настройки" />

        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Настройки</h2>
            <p className="text-sm text-slate-500 mt-1">Управление аккаунтом и конфигурацией</p>
          </div>

          <div className="max-w-2xl space-y-4">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * SECTION_DELAY }}
              >
                <GlassCard variant="default" padding="none">
                  {/* Section header */}
                  <div
                    className="px-5 py-3.5 flex items-center gap-3"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: section.iconBg }}
                    >
                      <section.icon size={14} style={{ color: section.iconColor }} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{section.title}</h3>
                  </div>

                  <div className="px-5 py-4">
                    {section.content}
                  </div>
                </GlassCard>
              </motion.div>
            ))}

            {/* Placeholder quick links */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sections.length * SECTION_DELAY }}
            >
              <GlassCard variant="default" padding="none">
                <div
                  className="px-5 py-3.5 flex items-center gap-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(99,102,241,0.12)' }}
                  >
                    <Shield size={14} style={{ color: '#6366f1' }} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Безопасность</h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    { icon: Globe, label: 'Конфиденциальность', desc: 'Управление данными и приватностью' },
                    { icon: Lock, label: 'Двухфакторная аутентификация', desc: 'Дополнительный слой защиты' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <button
                      key={label}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <Icon size={14} className="text-slate-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-300">{label}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 font-medium px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          Скоро
                        </span>
                        <ChevronRight size={13} className="text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Danger zone */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (sections.length + 1) * SECTION_DELAY }}
            >
              <GlassCard
                variant="default"
                padding="none"
                className="overflow-hidden"
                style={{ border: '1px solid rgba(239,68,68,0.12)' }}
              >
                <div
                  className="px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(239,68,68,0.08)', background: 'rgba(239,68,68,0.04)' }}
                >
                  <h3 className="text-sm font-bold text-red-400">Аккаунт</h3>
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Выйти из системы</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Завершить текущую сессию · {email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 transition-all disabled:opacity-50"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
                    }}
                  >
                    <LogOut size={14} />
                    {signingOut ? 'Выходим...' : 'Выйти'}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
