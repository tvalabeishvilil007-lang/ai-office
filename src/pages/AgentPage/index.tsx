import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ListTodo,
  FileText,
  Brain,
  GraduationCap,
  ArrowLeft,
  Star,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useAgents } from '../../contexts/AgentManagerContext';
import { useAgentStatus } from '../../contexts/AgentStatusContext';
import { useCountUp } from '../../hooks/useCountUp';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { MobileNav } from '../../components/layout/MobileNav';
import { OfficeBackground } from '../../components/office/OfficeBackground';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AgentTabChat      } from '../../components/agent/AgentTabChat';
import { AgentTabTasks     } from '../../components/agent/AgentTabTasks';
import { AgentTabDocuments } from '../../components/agent/AgentTabDocuments';
import { AgentTabMemory    } from '../../components/agent/AgentTabMemory';
import { AgentTabTraining  } from '../../components/agent/AgentTabTraining';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// AgentPage — individual agent workspace
// Tabs: Chat | Tasks | Documents | Memory | Training
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'chat' | 'tasks' | 'documents' | 'memory' | 'training';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'chat',      label: 'Чат',         icon: <MessageSquare  size={14} /> },
  { id: 'tasks',     label: 'Задачи',      icon: <ListTodo       size={14} /> },
  { id: 'documents', label: 'Документы',   icon: <FileText       size={14} /> },
  { id: 'memory',    label: 'Память',      icon: <Brain          size={14} /> },
  { id: 'training',  label: 'Обучение',    icon: <GraduationCap  size={14} /> },
];

export function AgentPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  const { getBySlug } = useAgents();
  const agent = getBySlug(slug ?? '');
  const liveStatus = useAgentStatus(agent?.id ?? '');

  // Inject agent accent color as CSS custom property → all child elements can use var(--agent-accent)
  useEffect(() => {
    if (!agent) return;
    document.documentElement.style.setProperty('--agent-accent', agent.accentColor);
    document.documentElement.style.setProperty('--agent-glow',   agent.glowColor);
    return () => {
      document.documentElement.style.removeProperty('--agent-accent');
      document.documentElement.style.removeProperty('--agent-glow');
    };
  }, [agent?.accentColor, agent?.glowColor]);

  // Animated counters for quick stats
  const tasksDisplay  = useCountUp(agent?.tasksCompleted  ?? 0, { duration: 900, delay: 300 });
  const activeDisplay = useCountUp(agent?.activeTaskCount ?? 0, { duration: 700, delay: 400 });
  const ratingDisplay = useCountUp(agent?.rating          ?? 0, { duration: 800, delay: 350, decimals: 1 });

  // ── 404 fallback ──────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090f] text-slate-400">
        <div className="text-center">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-lg font-semibold text-slate-300 mb-2">Агент не найден</p>
          <Button variant="glass" size="sm" onClick={() => navigate('/')}>
            Вернуться в офис
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090f]">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main column ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={agent.name} />

        <div className="flex-1 relative overflow-hidden">
          {/* Background (subtler on agent page) */}
          <div className="opacity-50">
            <OfficeBackground />
          </div>

          {/* Content */}
          <div className="absolute inset-0 z-10 flex flex-col overflow-hidden">

            {/* ── Agent header bar ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={cn(
                'shrink-0 flex items-center gap-4 px-6 py-4',
                'border-b border-white/[0.05]',
                'bg-black/20 backdrop-blur-xl',
              )}
            >
              {/* Back button */}
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<ArrowLeft size={13} />}
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-slate-300 mr-1"
              >
                Офис
              </Button>

              {/* Divider */}
              <div className="h-5 w-px bg-white/[0.08]" />

              {/* Agent identity */}
              <Avatar
                emoji={agent.avatar}
                name={agent.name}
                accentColor={agent.accentColor}
                glowColor={agent.glowColor}
                size="md"
                status={liveStatus}
                isFeatured={agent.isFeatured}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white leading-none">{agent.name}</h2>
                  {agent.isFeatured && (
                    <Star size={12} fill="currentColor" style={{ color: agent.accentColor }} />
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: agent.accentColor }}>
                  {agent.title}
                </p>
              </div>

              {/* Quick stats — animated on mount */}
              <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="text-slate-400 font-medium tabular-nums">{tasksDisplay}</span> выполнено
                </span>
                {agent.activeTaskCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Zap size={12} className="text-blue-400" />
                    <span className="text-slate-400 font-medium tabular-nums">{activeDisplay}</span> активных
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  <span className="text-slate-400 font-medium tabular-nums">{ratingDisplay}</span>
                </span>
              </div>

              <StatusBadge status={liveStatus} />
            </motion.div>

            {/* ── Tab bar ──────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={cn(
                'shrink-0 flex items-center gap-1 px-3 py-2',
                'border-b border-white/[0.05] bg-black/10',
                'overflow-x-auto',
              )}
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0',
                    'transition-all duration-200',
                    activeTab === tab.id
                      ? 'text-white bg-white/[0.08] border border-white/[0.10]'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
                  )}
                >
                  <span
                    className="transition-colors"
                    style={activeTab === tab.id ? { color: agent.accentColor } : {}}
                  >
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>

                  {/* Active indicator */}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                      style={{ background: agent.accentColor }}
                    />
                  )}
                </button>
              ))}
            </motion.div>

            {/* ── Tab content ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === 'chat'      && <AgentTabChat      agent={agent} />}
                  {activeTab === 'tasks'     && <AgentTabTasks     agent={agent} />}
                  {activeTab === 'documents' && <AgentTabDocuments agent={agent} />}
                  {activeTab === 'memory'    && <AgentTabMemory    agent={agent} />}
                  {activeTab === 'training'  && <AgentTabTraining  agent={agent} />}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
