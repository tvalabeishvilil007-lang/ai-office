import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, UserPlus, Trash2, ToggleLeft, ToggleRight,
  Users, CheckCircle2, XCircle, Clock, Search, X, RefreshCw,
  Wifi, MapPin,
} from 'lucide-react';
import { usePresence } from '../../hooks/usePresence';
import { supabase } from '../../lib/supabase';
import { useAuth, ADMIN_EMAIL } from '../../contexts/AuthContext';
import { Topbar  } from '../../components/layout/Topbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { GlassCard } from '../../components/ui/GlassCard';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// AdminPage — whitelist management panel
// Only accessible to the owner (ADMIN_EMAIL)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface AllowedUser {
  id:        string;
  email:     string;
  name:      string | null;
  is_active: boolean;
  added_at:  string;
  added_by:  string | null;
}

export function AdminPage() {
  const { user }   = useAuth();
  const { toast }  = useToast();

  const onlineUsers = usePresence();

  const [users,     setUsers]     = useState<AllowedUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [newEmail,  setNewEmail]  = useState('');
  const [newName,   setNewName]   = useState('');
  const [adding,    setAdding]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<'all' | 'active' | 'inactive'>('all');

  // ── Load users ─────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const { data, error } = await db
      .from('allowed_users')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      toast.error('Не удалось загрузить список пользователей');
    } else {
      setUsers((data ?? []) as AllowedUser[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Add user ───────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || adding) return;
    if (!email.includes('@')) { toast.error('Введите корректный email'); return; }

    setAdding(true);
    const { error } = await db
      .from('allowed_users')
      .insert({
        email,
        name:     newName.trim() || null,
        is_active: true,
        added_by: user?.email ?? ADMIN_EMAIL,
      });

    if (error) {
      if (error.code === '23505') toast.error('Этот email уже в списке');
      else toast.error('Ошибка при добавлении');
    } else {
      toast.success(`${email} добавлен`);
      setNewEmail('');
      setNewName('');
      await loadUsers(true);
    }
    setAdding(false);
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (u: AllowedUser) => {
    if (u.email === ADMIN_EMAIL) { toast.info('Нельзя деактивировать администратора'); return; }

    const { error } = await db
      .from('allowed_users')
      .update({ is_active: !u.is_active })
      .eq('id', u.id);

    if (error) {
      toast.error('Не удалось обновить статус');
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(`${u.email}: ${!u.is_active ? 'доступ открыт' : 'доступ закрыт'}`);
    }
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  const handleDelete = async (u: AllowedUser) => {
    if (u.email === ADMIN_EMAIL) { toast.info('Нельзя удалить администратора'); return; }

    const { error } = await db
      .from('allowed_users')
      .delete()
      .eq('id', u.id);

    if (error) {
      toast.error('Не удалось удалить');
    } else {
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(`${u.email} удалён`);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search || u.email.includes(search.toLowerCase()) || (u.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchFilter;
  });

  const activeCount   = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  return (
    <div className="flex h-screen bg-[#070a12] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Администрирование" />

        <main className="flex-1 overflow-y-auto p-6 pb-20">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <Shield size={18} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Управление доступами</h2>
              <p className="text-xs text-slate-500">Только вы видите эту страницу · {ADMIN_EMAIL}</p>
            </div>
            <button
              onClick={() => loadUsers(true)}
              disabled={refreshing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] transition-all"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>

          {/* ── Online users ───────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">Сейчас онлайн</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
              >
                {onlineUsers.length}
              </span>
            </div>
            <GlassCard variant="default" padding="sm">
              {onlineUsers.length === 0 ? (
                <p className="text-[11px] text-slate-600 text-center py-3">Нет активных пользователей</p>
              ) : (
                <div className="space-y-2">
                  {onlineUsers.map(u => (
                    <div key={u.userId} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                      {/* Avatar */}
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-emerald-500/20" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-200 truncate">{u.name}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                        <MapPin size={9} />
                        {u.pageLabel}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Всего пользователей', value: users.length,   icon: Users,        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
              { label: 'Активных',            value: activeCount,    icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
              { label: 'Заблокированных',     value: inactiveCount,  icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
            ].map(stat => (
              <GlassCard key={stat.label} variant="default" padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: stat.bg, border: `1px solid ${stat.color}30` }}>
                    <stat.icon size={16} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                    <p className="text-xl font-bold text-white">{loading ? '…' : stat.value}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Add user form */}
            <div>
              <GlassCard variant="default" padding="none">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <UserPlus size={14} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Дать доступ</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Email (Gmail)</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                      placeholder="user@gmail.com"
                      className={cn(
                        'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2',
                        'text-slate-200 placeholder:text-slate-600',
                        'focus:outline-none focus:border-emerald-500/40',
                        'transition-colors',
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Имя (необязательно)</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                      placeholder="Иван Иванов"
                      className={cn(
                        'w-full text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2',
                        'text-slate-200 placeholder:text-slate-600',
                        'focus:outline-none focus:border-white/[0.18]',
                        'transition-colors',
                      )}
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={!newEmail.trim() || adding}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    <UserPlus size={14} />
                    {adding ? 'Добавляю…' : 'Открыть доступ'}
                  </button>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Пользователь сможет войти через Google. Доступ можно в любой момент отозвать.
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* Users list */}
            <div className="lg:col-span-2">
              <GlassCard variant="default" padding="none">
                <div className="px-5 py-3.5 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Users size={14} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Пользователи</h3>

                  {/* Filter tabs */}
                  <div className="ml-auto flex items-center gap-1">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                          filter === f
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-500 hover:text-slate-300',
                        )}
                      >
                        {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Заблокированные'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Поиск по email или имени…"
                      className="w-full text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-8 py-2 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-white/[0.15] transition-colors"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="divide-y divide-white/[0.04]">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                      <Users size={28} className="mb-2 opacity-30" />
                      <p className="text-sm">{search ? 'Ничего не найдено' : 'Нет пользователей'}</p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {filtered.map(u => (
                        <motion.div
                          key={u.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Avatar */}
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                            style={{
                              background: u.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                              border: `1px solid ${u.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
                              color: u.is_active ? '#10b981' : '#ef4444',
                            }}
                          >
                            {(u.name?.[0] ?? u.email[0]).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-200 truncate">
                                {u.name ?? u.email.split('@')[0]}
                              </p>
                              {u.email === ADMIN_EMAIL && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 font-semibold">
                                  ADMIN
                                </span>
                              )}
                              <span
                                className={cn(
                                  'text-[9px] px-1.5 py-0.5 rounded-full font-semibold ml-auto',
                                  u.is_active
                                    ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/15',
                                )}
                              >
                                {u.is_active ? 'Активен' : 'Заблокирован'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-700">
                              <Clock size={9} />
                              <span>Добавлен {new Date(u.added_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {u.added_by && <span>· {u.added_by}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Toggle */}
                            <button
                              onClick={() => handleToggle(u)}
                              title={u.is_active ? 'Заблокировать' : 'Разблокировать'}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all"
                              style={u.is_active
                                ? { background: 'rgba(239,68,68,0.08)', color: '#ef4444' }
                                : { background: 'rgba(16,185,129,0.08)', color: '#10b981' }}
                            >
                              {u.is_active
                                ? <><ToggleRight size={13} /> Закрыть</>
                                : <><ToggleLeft  size={13} /> Открыть</>}
                            </button>

                            {/* Delete */}
                            {u.email !== ADMIN_EMAIL && (
                              <button
                                onClick={() => handleDelete(u)}
                                title="Удалить"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* SQL hint */}
          <div className="mt-4">
            <GlassCard variant="default" padding="md">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <span className="text-slate-500 font-semibold">Как это работает:</span>{' '}
                При входе через Google проверяется наличие email в таблице <code className="bg-white/[0.06] px-1 py-0.5 rounded text-slate-400">allowed_users</code>.
                Если email не найден или аккаунт заблокирован — пользователь автоматически выходит из системы.
                Ты всегда имеешь доступ как администратор.
              </p>
            </GlassCard>
          </div>

        </main>
      </div>
    </div>
  );
}
