import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, CheckCircle2, Zap,
  Settings2, X, FileText, Brain, GraduationCap,
  PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import { useAgents }      from '../../contexts/AgentManagerContext';
import { useAgentStatus } from '../../contexts/AgentStatusContext';
import { useCountUp }     from '../../hooks/useCountUp';
import { Sidebar }        from '../../components/layout/Sidebar';
import { Topbar }         from '../../components/layout/Topbar';
import { MobileNav }      from '../../components/layout/MobileNav';
import { OfficeBackground } from '../../components/office/OfficeBackground';
import { Avatar }         from '../../components/ui/Avatar';
import { StatusBadge }    from '../../components/ui/Badge';
import { Button }         from '../../components/ui/Button';
import { AgentTabChat }       from '../../components/agent/AgentTabChat';
import { AgentTabTasks }      from '../../components/agent/AgentTabTasks';
import { AgentTabDocuments }  from '../../components/agent/AgentTabDocuments';
import { AgentTabMemory }     from '../../components/agent/AgentTabMemory';
import { AgentTabTraining }   from '../../components/agent/AgentTabTraining';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// AgentPage — simplified split view: chat (left) + tasks (right)
// Advanced panel slides in for Docs / Memory / Training
// ─────────────────────────────────────────────────────────────────────────────

type AdvancedTab = 'documents' | 'memory' | 'training';

const ADVANCED_TABS: { id: AdvancedTab; label: string; icon: React.ReactNode }[] = [
  { id: 'documents', label: 'Документы', icon: <FileText      size={13} /> },
  { id: 'memory',    label: 'Память',    icon: <Brain         size={13} /> },
  { id: 'training',  label: 'Обучение',  icon: <GraduationCap size={13} /> },
];

export function AgentPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();

  const { getBySlug } = useAgents();
  const agent         = getBySlug(slug ?? '');
  const liveStatus    = useAgentStatus(agent?.id ?? '');

  const [showTasks,    setShowTasks]    = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab,  setAdvancedTab]  = useState<AdvancedTab>('documents');

  useEffect(() => {
    if (!agent) return;
    document.documentElement.style.setProperty('--agent-accent', agent.accentColor);
    document.documentElement.style.setProperty('--agent-glow',   agent.glowColor);
    return () => {
      document.documentElement.style.removeProperty('--agent-accent');
      document.documentElement.style.removeProperty('--agent-glow');
    };
  }, [agent?.accentColor, agent?.glowColor]);

  const tasksDisplay  = useCountUp(agent?.tasksCompleted  ?? 0, { duration: 900, delay: 300 });
  const activeDisplay = useCountUp(agent?.activeTaskCount ?? 0, { duration: 700, delay: 400 });
  const ratingDisplay = useCountUp(agent?.rating          ?? 0, { duration: 800, delay: 350, decimals: 1 });

  if (!agent) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07090f] text-slate-400">
        <div className="text-center">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-lg font-semibold text-slate-300 mb-2">Агент не найден</p>
          <Button variant="glass" size="sm" onClick={() => navigate('/')}>Вернуться в офис</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090f]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={agent.name} />

        <div className="flex-1 relative overflow-hidden">
          <div className="opacity-50"><OfficeBackground /></div>

          <div className="absolute inset-0 z-10 flex flex-col overflow-hidden">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/[0.05] bg-black/20 backdrop-blur-xl"
            >
              <Button
                variant="ghost" size="xs"
                leftIcon={<ArrowLeft size={13} />}
                onClick={() => navigate('/')}
                className="text-slate-500 hover:text-slate-300"
              >
                Офис
              </Button>
              <div className="h-5 w-px bg-white/[0.08]" />

              <Avatar
                emoji={agent.avatar} name={agent.name}
                accentColor={agent.accentColor} glowColor={agent.glowColor}
                size="md" status={liveStatus} isFeatured={agent.isFeatured}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-white">{agent.name}</h2>
                  {agent.isFeatured && <Star size={11} fill="currentColor" style={{ color: agent.accentColor }} />}
                </div>
                <p className="text-[11px]" style={{ color: agent.accentColor }}>{agent.title}</p>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span className="text-slate-400 font-medium">{tasksDisplay}</span>
                </span>
                {agent.activeTaskCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Zap size={11} className="text-blue-400" />
                    <span className="text-slate-400 font-medium">{activeDisplay}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-amber-400" fill="currentColor" />
                  <span className="text-slate-400 font-medium">{ratingDisplay}</span>
                </span>
              </div>

              <StatusBadge status={liveStatus} />

              {/* Toggle task panel */}
              <button
                onClick={() => setShowTasks(v => !v)}
                title={showTasks ? 'Скрыть задачи' : 'Показать задачи'}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  showTasks
                    ? 'text-white bg-white/[0.08]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]',
                )}
              >
                {showTasks ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              </button>

              {/* Advanced settings */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                title="Документы, память, обучение"
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  showAdvanced
                    ? 'text-white bg-white/[0.08]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]',
                )}
              >
                <Settings2 size={15} />
              </button>
            </motion.div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">

              {/* ── Chat (always visible) ─────────────────────────────────── */}
              <div className="flex-1 min-w-0 overflow-hidden p-3 md:p-4">
                <AgentTabChat agent={agent} />
              </div>

              {/* ── Tasks panel (toggle) ───────────────────────────────────── */}
              <AnimatePresence initial={false}>
                {showTasks && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 340, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="shrink-0 overflow-hidden border-l border-white/[0.05]"
                    style={{ background: 'rgba(4,6,14,0.60)' }}
                  >
                    <div className="w-[340px] h-full p-3 md:p-4 overflow-hidden">
                      <AgentTabTasks agent={agent} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Advanced panel (slide-over) ────────────────────────────── */}
              <AnimatePresence>
                {showAdvanced && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 bg-black/40"
                      onClick={() => setShowAdvanced(false)}
                    />

                    {/* Drawer */}
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                      className="absolute right-0 top-0 bottom-0 z-30 w-full max-w-lg flex flex-col"
                      style={{
                        background: '#0a0f1e',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Drawer header */}
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0">
                        <span className="text-sm font-semibold text-slate-200 flex-1">Расширенные функции</span>
                        {/* Tab switcher */}
                        <div className="flex items-center gap-1">
                          {ADVANCED_TABS.map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setAdvancedTab(tab.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                advancedTab === tab.id
                                  ? 'text-white bg-white/[0.10] border border-white/[0.12]'
                                  : 'text-slate-500 hover:text-slate-300',
                              )}
                            >
                              {tab.icon}
                              <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowAdvanced(false)}
                          className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Drawer content */}
                      <div className="flex-1 overflow-hidden p-4">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={advancedTab}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.15 }}
                            className="h-full"
                          >
                            {advancedTab === 'documents' && <AgentTabDocuments agent={agent} />}
                            {advancedTab === 'memory'    && <AgentTabMemory    agent={agent} />}
                            {advancedTab === 'training'  && <AgentTabTraining  agent={agent} />}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
