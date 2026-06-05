import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Activity, Headphones } from 'lucide-react';
import { Sidebar        } from '../../components/layout/Sidebar';
import { Topbar         } from '../../components/layout/Topbar';
import { MobileNav      } from '../../components/layout/MobileNav';
import { OfficeScene    } from '../../components/office/OfficeScene';
import { TaskList       } from '../../components/office/TaskList';
import { OfficeChat     } from '../../components/office/OfficeChat';
import { ActivityPanel  } from '../../components/office/ActivityPanel';
import { AdminChatTab   } from '../../components/office/AdminChatTab';
import { QuickTaskModal } from '../../components/office/QuickTaskModal';
import { OnboardingModal, shouldShowOnboarding } from '../../components/ui/OnboardingModal';
import { useAdminChat   } from '../../hooks/useAdminChat';
import { cn } from '../../utils/cn';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// OfficePage — immersive AI office dashboard
// ─────────────────────────────────────────────────────────────────────────────

type BottomTab = 'chat' | 'activity' | 'support';

export function OfficePage() {
  const navigate = useNavigate();
  const [tab,           setTab]           = useState<BottomTab>('chat');
  const [showWelcome,   setShowWelcome]   = useState(false);
  const [showQuickTask, setShowQuickTask] = useState(false);
  const { unread, clearUnread }           = useAdminChat();

  useEffect(() => {
    if (shouldShowOnboarding()) setShowWelcome(true);
    function onTour() { setShowWelcome(true); }
    window.addEventListener('onboarding:open', onTour);
    return () => window.removeEventListener('onboarding:open', onTour);
  }, []);

  const handleOpen = (agent: Agent) => navigate(`/agent/${agent.slug}`);

  const handleSupportTab = () => {
    setTab('support');
    clearUnread();
  };

  return (
    <>
      <div className="flex h-screen w-full overflow-hidden" style={{ background: '#040609' }}>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <Sidebar />

        {/* ── Main column ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar title="Главный офис" />

          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Office scene ───────────────────────────────────────────── */}
            <OfficeScene onOpen={handleOpen} />

            {/* ── Bottom glass bar ───────────────────────────────────────── */}
            <div
              className="relative z-10 shrink-0 flex gap-3 px-4 md:px-6 lg:px-8 py-3 md:py-4"
              style={{
                height: 'clamp(200px, 28vh, 280px)',
                background: 'rgba(4,6,14,0.90)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* Tasks — visible lg+ */}
              <div className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 h-full">
                <TaskList onAddTask={() => setShowQuickTask(true)} />
              </div>

              {/* Tabs */}
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <div className="flex items-center gap-1 mb-2.5 shrink-0">
                  <BottomTabBtn
                    active={tab === 'chat'}
                    icon={<MessageSquare size={12} />}
                    label="Офис-чат"
                    onClick={() => setTab('chat')}
                  />
                  <BottomTabBtn
                    active={tab === 'activity'}
                    icon={<Activity size={12} />}
                    label="Активность"
                    onClick={() => setTab('activity')}
                  />
                  <BottomTabBtn
                    active={tab === 'support'}
                    icon={<Headphones size={12} />}
                    label="Поддержка"
                    badge={unread > 0 ? unread : undefined}
                    onClick={handleSupportTab}
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tab}
                      className="h-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                    >
                      {tab === 'chat'     && <OfficeChat />}
                      {tab === 'activity' && <ActivityPanel />}
                      {tab === 'support'  && <AdminChatTab />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Onboarding — shown once to new users */}
      <AnimatePresence>
        {showWelcome && (
          <OnboardingModal onDismiss={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>

      {/* Quick task modal */}
      {showQuickTask && (
        <QuickTaskModal onClose={() => setShowQuickTask(false)} />
      )}

      <MobileNav />
    </>
  );
}

// ── Internal tab button ───────────────────────────────────────────────────────

function BottomTabBtn({
  active, icon, label, badge, onClick,
}: {
  active:   boolean;
  icon:     React.ReactNode;
  label:    string;
  badge?:   number;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
        'transition-all duration-200',
        active
          ? 'bg-white/[0.08] text-white border border-white/[0.12]'
          : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] border border-transparent',
      )}
    >
      {icon}
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-indigo-500 text-[8px] font-bold text-white flex items-center justify-center px-0.5">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
