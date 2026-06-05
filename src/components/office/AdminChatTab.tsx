import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ArrowLeft, Circle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  useAdminChat,
  fetchAdminInbox, fetchAdminThread, sendAdminReply,
  type AdminInboxUser, type AdminMessage,
} from '../../hooks/useAdminChat';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// AdminChatTab — second tab in OfficePage bottom bar.
//   • Regular user  → sees own thread with admin
//   • Admin         → sees inbox of all users, can open any thread and reply
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined ?? '';

export function AdminChatTab() {
  const { user } = useAuth();
  const isAdmin = !!user && !!ADMIN_EMAIL && user.email === ADMIN_EMAIL;

  if (isAdmin) return <AdminInboxView />;
  return <UserThreadView />;
}

// ── USER VIEW ─────────────────────────────────────────────────────────────────

function UserThreadView() {
  const { messages, loading, sending, sendMessage, clearUnread } = useAdminChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearUnread();
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    await sendMessage(text);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[0.06] shrink-0">
        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
          <User size={12} className="text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-200">Администратор</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Circle size={5} className="fill-emerald-400" /> онлайн
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600">
            <MessageSquare size={24} className="opacity-30" />
            <span className="text-[11px]">Напишите администратору</span>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isOwn={!msg.isFromAdmin} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Сообщение администратору…"
          className="flex-1 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all shrink-0"
        >
          <Send size={12} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ── ADMIN INBOX VIEW ──────────────────────────────────────────────────────────

function AdminInboxView() {
  const { user, session } = useAuth();
  const [inbox,        setInbox]        = useState<AdminInboxUser[]>([]);
  const [selected,     setSelected]     = useState<AdminInboxUser | null>(null);
  const [thread,       setThread]       = useState<AdminMessage[]>([]);
  const [reply,        setReply]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread,setLoadingThread]= useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const token = session?.access_token ?? '';

  // Load inbox
  useEffect(() => {
    if (!token) return;
    setLoadingInbox(true);
    fetchAdminInbox(token).then(users => {
      setInbox(users);
      setLoadingInbox(false);
    });
  }, [token]);

  // Realtime: new messages in any thread
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('admin_inbox_watch')
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        () => {
          // Refresh inbox
          if (token) fetchAdminInbox(token).then(setInbox);
          // If viewing a thread, refresh it
          if (selected && token) {
            fetchAdminThread(selected.userId, token).then(msgs => {
              setThread(msgs);
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            });
          }
          // Browser notification for new user messages
          if (Notification.permission === 'granted') {
            new Notification('Новое сообщение от пользователя', {
              body: 'Проверьте входящие в AI Office',
              icon: '/icons/icon-192.png',
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, selected?.userId, token]);

  // Load selected thread
  useEffect(() => {
    if (!selected || !token) return;
    setLoadingThread(true);
    fetchAdminThread(selected.userId, token).then(msgs => {
      setThread(msgs);
      setLoadingThread(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
  }, [selected?.userId, token]);

  const handleReply = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    const msg = await sendAdminReply(selected.userId, reply.trim(), token);
    setSending(false);
    if (msg) {
      setReply('');
      setThread(prev => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  // ── Inbox list ──────────────────────────────────────────────────────────────

  if (!selected) {
    return (
      <div className="h-full flex flex-col">
        <div className="text-xs font-semibold text-slate-300 pb-2 mb-2 border-b border-white/[0.06] shrink-0">
          Входящие
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loadingInbox && (
            <div className="flex items-center justify-center h-16">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          )}
          {!loadingInbox && inbox.length === 0 && (
            <div className="flex items-center justify-center h-16 text-[11px] text-slate-600">
              Нет сообщений
            </div>
          )}
          {inbox.map(u => (
            <button
              key={u.userId}
              onClick={() => setSelected(u)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-300">
                {u.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-200 truncate">{u.userName}</span>
                  <span className="text-[9px] text-slate-600 shrink-0">
                    {new Date(u.lastAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="text-[10px] text-slate-500 truncate">{u.lastMessage}</span>
                  {u.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[16px] h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center px-1">
                      {u.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Thread view ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[0.06] shrink-0">
        <button
          onClick={() => setSelected(null)}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <ArrowLeft size={13} />
        </button>
        <div className="w-6 h-6 rounded-full bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
          {selected.userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-200 truncate">{selected.userName}</div>
          <div className="text-[9px] text-slate-500 truncate">{selected.userEmail}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {loadingThread && (
          <div className="flex items-center justify-center h-16">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}
        {thread.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.isFromAdmin} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="flex gap-2 pt-2 shrink-0">
        <input
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
          placeholder={`Ответить ${selected.userName}…`}
          className="flex-1 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
        <button
          onClick={handleReply}
          disabled={!reply.trim() || sending}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all shrink-0"
        >
          <Send size={12} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Shared message bubble ─────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn }: { msg: AdminMessage; isOwn: boolean }) {
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
          isOwn
            ? 'rounded-tr-sm text-white'
            : 'rounded-tl-sm text-slate-200',
        )}
        style={{
          background: isOwn
            ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
            : 'rgba(255,255,255,0.06)',
          border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {msg.content}
        <div className={cn('text-[9px] mt-1', isOwn ? 'text-indigo-200/60' : 'text-slate-600')}>
          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
