import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AgentStatusProvider } from './contexts/AgentStatusContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { AgentManagerProvider } from './contexts/AgentManagerContext';
import { ToastProvider } from './components/ui/Toast';
import { SplashScreen } from './components/ui/SplashScreen';
import { ModeProvider } from './contexts/ModeContext';
import { router } from './router';

// ─────────────────────────────────────────────────────────────────────────────
// App — root component.
// AuthProvider wraps everything so useAuth() works in any component.
// AgentStatusProvider computes live agent statuses from real task data.
// NotificationsProvider holds proactive AI notifications (shared state).
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
    <SplashScreen />
    <ModeProvider>
    <AuthProvider>
      <AgentStatusProvider>
        <NotificationsProvider>
          <ToastProvider>
            <SidebarProvider>
              <AgentManagerProvider>
                <RouterProvider router={router} />
              </AgentManagerProvider>
            </SidebarProvider>
          </ToastProvider>
        </NotificationsProvider>
      </AgentStatusProvider>
    </AuthProvider>
    </ModeProvider>
    </>
  );
}
