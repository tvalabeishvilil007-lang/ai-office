import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { OfficePage        } from '../pages/OfficePage';
import { AgentPage         } from '../pages/AgentPage';
import { LoginPage         } from '../pages/LoginPage';
import { TeamPage          } from '../pages/TeamPage';
import { AnalyticsPage     } from '../pages/AnalyticsPage';
import { DocsPage          } from '../pages/DocsPage';
import { SettingsPage      } from '../pages/SettingsPage';
import { MeetingPage       } from '../pages/MeetingPage';
import { AdminPage         } from '../pages/AdminPage';
import { MyDayPage         } from '../pages/MyDayPage';
import { AgentsManagePage  } from '../pages/AgentsManagePage';
import { useAuth        } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Auth guard — wraps protected routes.
// Shows login page if not authenticated, loading screen while checking.
// ─────────────────────────────────────────────────────────────────────────────

function RequireAuth() {
  const { session, loading, isAllowed, accessDenied, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  // Signed in but not on the whitelist
  if (accessDenied || !isAllowed) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            🔒
          </div>
          <h1 className="text-xl font-bold text-white">Доступ закрыт</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ваш аккаунт <span className="text-slate-200">{session.user.email}</span> не в списке
            разрешённых пользователей. Обратитесь к администратору.
          </p>
          <button
            onClick={signOut}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

// Only the admin can access /admin
function RequireAdmin() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

// ─────────────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    // All real pages require auth + whitelist check
    element: <RequireAuth />,
    children: [
      { path: '/',            element: <OfficePage    /> },
      { path: '/agent/:slug', element: <AgentPage     /> },
      { path: '/team',        element: <TeamPage      /> },
      { path: '/reports',     element: <AnalyticsPage /> },
      { path: '/docs',        element: <DocsPage      /> },
      { path: '/settings',    element: <SettingsPage  /> },
      { path: '/meeting',     element: <MeetingPage   /> },
      { path: '/my-day',      element: <MyDayPage         /> },
      { path: '/agents',      element: <AgentsManagePage  /> },
      // Admin panel — nested behind RequireAdmin
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin', element: <AdminPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
