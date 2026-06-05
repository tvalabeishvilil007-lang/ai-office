import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Settings, Zap, ChevronRight, ChevronLeft,
  MessagesSquare, Shield, BotMessageSquare, Headphones,
} from 'lucide-react';
import { StatusDot } from '../ui/StatusDot';
import { useAuth } from '../../contexts/AuthContext';
import { useAgentStatuses } from '../../contexts/AgentStatusContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAgents } from '../../contexts/AgentManagerContext';
import { usePresence } from '../../hooks/usePresence';
import { useMode } from '../../contexts/ModeContext';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — premium dark glass navigation, collapsible on laptops
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',        icon: Building2,       label: 'Офис',      exact: true  },
  { to: '/agents',  icon: BotMessageSquare, label: 'Агенты',   exact: false },
  { to: '/meeting', icon: MessagesSquare,  label: 'Совещание', exact: false },
];

export function Sidebar() {
  const { user, isAdmin } = useAuth();
  const agentStatuses         = useAgentStatuses();
  const { collapsed, toggle } = useSidebar();
  const { visibleAgents }     = useAgents();
  const navigate              = useNavigate();
  const { mode, toggleMode, isStudy } = useMode();
  const sidebarAgents = visibleAgents
    .filter(a => a.status !== 'offline' && (a.mode ?? 'work') === mode)
    .slice(0, 6);

  // Broadcast presence for all authenticated pages
  usePresence();

  const openSupport = () => {
    navigate('/');
    setTimeout(() => window.dispatchEvent(new Event('support:open')), 50);
  };

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Пользователь';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials  = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden md:flex shrink-0 flex-col h-full relative z-20 overflow-hidden"
      style={{
        width: collapsed ? 64 : 280,
        transition: 'width 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        background: 'rgba(4,6,14,0.92)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div
        className="px-3 pt-5 pb-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2 mb-0">
          {/* Logo — always visible */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}
          >
            <Zap size={17} className="text-white" />
          </div>

          {/* Title — fades out when collapsed */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="brand-text"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-sm font-extrabold text-white tracking-tight leading-none whitespace-nowrap">
                  AI Office
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 tracking-wide whitespace-nowrap">
                  Virtual Workforce Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle button */}
          <button
            onClick={toggle}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
            className={cn(
              'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
              'text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]',
              'transition-all duration-200',
              collapsed && 'mx-auto',
            )}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="px-2 pt-3 space-y-0.5 shrink-0">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.p
              key="nav-label"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[9px] font-semibold text-slate-700 uppercase tracking-[0.2em] px-2 mb-2 overflow-hidden"
            >
              Навигация
            </motion.p>
          )}
        </AnimatePresence>

        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200 group relative',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300',
              )
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }
                : {
                    background: 'transparent',
                    border: '1px solid transparent',
                  }
            }
          >
            {({ isActive }) => (
              <>
                {/* Active left accent */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: '#3b82f6' }}
                  />
                )}
                <Icon
                  size={16}
                  className="shrink-0 transition-colors"
                  style={{ color: isActive ? '#60a5fa' : undefined }}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 whitespace-nowrap">{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-dot"
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#3b82f6' }}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Work / Study toggle ──────────────────────────────────────────── */}
      <div className="px-2 mt-1 shrink-0">
        <button
          onClick={toggleMode}
          title={collapsed ? (isStudy ? 'Учёба' : 'Работа') : undefined}
          className={cn(
            'w-full flex items-center py-2 rounded-xl text-xs font-semibold transition-all duration-200',
            collapsed ? 'justify-center px-0' : 'gap-2 px-3',
          )}
          style={{
            background: isStudy ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.10)',
            border: `1px solid ${isStudy ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.20)'}`,
            color: isStudy ? '#a78bfa' : '#60a5fa',
          }}
        >
          <span className="text-base leading-none">{isStudy ? '📚' : '💼'}</span>
          {!collapsed && (
            <span className="flex-1 text-left">{isStudy ? 'Учёба' : 'Работа'}</span>
          )}
          {!collapsed && (
            <span className="text-[9px] opacity-60">{isStudy ? '→ Работа' : '→ Учёба'}</span>
          )}
        </button>
      </div>

      {/* ── Поддержка (opens support tab in office) ─────────────────────── */}
      <div className="px-2 mt-0.5 shrink-0">
        <button
          onClick={openSupport}
          title={collapsed ? 'Поддержка' : undefined}
          className={cn(
            'w-full flex items-center py-2.5 rounded-xl text-sm font-medium',
            'transition-all duration-200 text-slate-500 hover:text-slate-300',
            'hover:bg-white/[0.04]',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          )}
          style={{ border: '1px solid transparent' }}
        >
          <Headphones size={16} className="shrink-0" />
          {!collapsed && <span className="flex-1 text-left whitespace-nowrap">Поддержка</span>}
        </button>
      </div>

      {/* ── Admin link — only visible to owner ─────────────────────────── */}
      {isAdmin && (
        <div className="px-2 mt-1 shrink-0">
          <NavLink
            to="/admin"
            title={collapsed ? 'Администрирование' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200 group relative',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive ? 'text-white' : 'text-rose-500/70 hover:text-rose-400',
              )
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'transparent', border: '1px solid transparent' }
            }
          >
            <Shield size={16} className="shrink-0" />
            {!collapsed && <span className="flex-1 whitespace-nowrap">Администрирование</span>}
          </NavLink>
        </div>
      )}

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div
        className="mx-3 my-3 shrink-0"
        style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }}
      />

      {/* ── Agent roster — hidden when collapsed ───────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="agents"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-2 flex-1 overflow-y-auto min-h-0"
          >
            <p className="text-[9px] font-semibold text-slate-700 uppercase tracking-[0.2em] px-2 mb-2">
              Сотрудники
            </p>
            <div className="space-y-0.5">
              {sidebarAgents.map((agent) => (
                <NavLink
                  key={agent.id}
                  to={`/agent/${agent.slug}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-xl',
                      'transition-all duration-150 group',
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-300',
                    )
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }
                      : { background: 'transparent', border: '1px solid transparent' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-sm shrink-0"
                        style={{
                          background: `${agent.accentColor}18`,
                          border: `1px solid ${agent.accentColor}${isActive ? '35' : '20'}`,
                        }}
                      >
                        {agent.avatar}
                      </span>
                      <span className="text-xs font-medium truncate flex-1">{agent.name}</span>
                      <StatusDot status={agentStatuses[agent.id] ?? agent.status} size="sm" />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer when collapsed so user section pins to bottom */}
      {collapsed && <div className="flex-1" />}

      {/* ── User ───────────────────────────────────────────────────────── */}
      <div
        className="px-2 py-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <NavLink
          to="/settings"
          title={collapsed ? displayName : undefined}
          className={cn(
            'w-full flex items-center py-2.5 rounded-xl transition-all duration-200 group',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          )}
          style={{ border: '1px solid transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
          }}
        >
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-xl object-cover shrink-0"
              style={{ border: '1px solid rgba(99,102,241,0.3)' }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 12px rgba(99,102,241,0.3)',
              }}
            >
              {initials}
            </div>
          )}

          {/* Name + role — only when expanded */}
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-slate-300 leading-none truncate">{displayName}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Владелец</p>
              </div>
              <Settings size={13} className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
            </>
          )}
        </NavLink>
      </div>
    </motion.aside>
  );
}
