import { NavLink } from 'react-router-dom';
import { Building2, Users, MessagesSquare, Settings, Sun } from 'lucide-react';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// MobileNav — fixed bottom navigation bar, visible only on mobile (< md)
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/my-day',  icon: Sun,            label: 'Мой день',  exact: false },
  { to: '/',        icon: Building2,      label: 'Офис',      exact: true  },
  { to: '/team',    icon: Users,          label: 'Команда',   exact: false },
  { to: '/meeting', icon: MessagesSquare, label: 'Совещание', exact: false },
  { to: '/settings',icon: Settings,       label: 'Настройки', exact: false },
];

export function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 py-1"
      style={{
        background: 'rgba(4,6,14,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
        paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))',
      }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-0 flex-1',
              isActive ? 'text-white' : 'text-slate-600 hover:text-slate-400',
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200"
                style={
                  isActive
                    ? { background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.3)' }
                    : { background: 'transparent', border: '1px solid transparent' }
                }
              >
                <Icon size={15} style={isActive ? { color: '#60a5fa' } : {}} />
              </div>
              <span className={cn('text-[9px] font-medium leading-none truncate max-w-full', isActive ? 'text-blue-400' : '')}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
