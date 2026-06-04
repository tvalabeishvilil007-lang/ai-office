import { motion } from 'framer-motion';
import { MessageSquare, Brain, CheckSquare, FileText, Search, Bell } from 'lucide-react';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — beautiful illustrated empty screens
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  action?: { label: string; onClick: () => void };
  hint?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  accentColor = '#6366f1',
  action,
  hint,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center h-full min-h-[200px]"
    >
      {/* Icon circle */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
        style={{
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}25`,
          boxShadow: `0 0 40px ${accentColor}15`,
        }}
      >
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at center, ${accentColor}18, transparent 70%)`,
          }}
        />
        <div style={{ color: accentColor, opacity: 0.85 }}>
          {icon}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-300 mb-1">{title}</p>
        {description && (
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{description}</p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
          style={{
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}30`,
            color: accentColor,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = `${accentColor}28`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = `${accentColor}18`;
          }}
        >
          {action.label}
        </button>
      )}

      {hint && (
        <p className="text-[10px] text-slate-600 mt-1">{hint}</p>
      )}
    </motion.div>
  );
}

// ── Preset: Empty chat ────────────────────────────────────────────────────────
export function EmptyChatState({
  agent,
  onPrompt,
}: {
  agent: Agent;
  onPrompt?: (text: string) => void;
}) {
  const quickPrompts = agent.skills.slice(0, 3).map(s => s.label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center gap-5 text-center py-10 px-6"
    >
      {/* Agent avatar */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl relative"
        style={{
          background: `${agent.accentColor}14`,
          border: `1px solid ${agent.accentColor}28`,
          boxShadow: `0 8px 32px ${agent.accentColor}20`,
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(ellipse, ${agent.accentColor}15, transparent 70%)`,
          }}
        />
        <span className="relative z-10">{agent.avatar}</span>
      </motion.div>

      <div>
        <p className="text-base font-bold text-white mb-1">{agent.name}</p>
        <p className="text-xs text-slate-500 max-w-[260px] leading-relaxed">{agent.description}</p>
      </div>

      {/* Quick-start prompts */}
      {quickPrompts.length > 0 && onPrompt && (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            Быстрый старт
          </p>
          {quickPrompts.map(p => (
            <motion.button
              key={p}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPrompt(p + ' — расскажи подробнее')}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-150"
              style={{
                border: `1px solid ${agent.accentColor}30`,
                background: `${agent.accentColor}08`,
                color: agent.accentColor,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${agent.accentColor}14`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = `${agent.accentColor}08`;
              }}
            >
              💬 {p}
            </motion.button>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-700">
        Enter — отправить · Shift+Enter — новая строка
      </p>
    </motion.div>
  );
}

// ── Preset: Empty memory ──────────────────────────────────────────────────────
export function EmptyMemoryState({ onChat }: { onChat?: () => void }) {
  return (
    <EmptyState
      title="Память пуста"
      description="Начните диалог с агентом. После 4+ сообщений появится кнопка «Извлечь знания» — агент сохранит ключевые факты о вашем бизнесе."
      icon={<Brain size={26} />}
      accentColor="#8b5cf6"
      action={onChat ? { label: 'Начать диалог', onClick: onChat } : undefined}
      hint="Знания извлекаются автоматически с помощью Claude Haiku"
    />
  );
}

// ── Preset: Empty tasks ───────────────────────────────────────────────────────
export function EmptyTasksState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      title="Нет активных задач"
      description="Задачи создаются агентом автоматически по итогам совещаний, или вы можете добавить их вручную."
      icon={<CheckSquare size={26} />}
      accentColor="#10b981"
      action={onAdd ? { label: '+ Добавить задачу', onClick: onAdd } : undefined}
    />
  );
}

// ── Preset: Empty documents ───────────────────────────────────────────────────
export function EmptyDocsState({ onGenerate }: { onGenerate?: () => void }) {
  return (
    <EmptyState
      title="Документов пока нет"
      description="Попросите агента составить договор, отчёт или презентацию — он сгенерирует документ и сохранит его здесь."
      icon={<FileText size={26} />}
      accentColor="#3b82f6"
      action={onGenerate ? { label: 'Создать документ', onClick: onGenerate } : undefined}
      hint="Поддерживаются: контракты, отчёты, финансовые модели, маркетинг-планы"
    />
  );
}

// ── Preset: Empty search ──────────────────────────────────────────────────────
export function EmptySearchState({ query }: { query: string }) {
  return (
    <EmptyState
      title={`Ничего не найдено по «${query}»`}
      description="Попробуйте изменить запрос или поищите по другому ключевому слову."
      icon={<Search size={26} />}
      accentColor="#64748b"
    />
  );
}

// ── Preset: Empty sessions ────────────────────────────────────────────────────
export function EmptySessionsState({ agentName, onNew }: { agentName: string; onNew?: () => void }) {
  return (
    <EmptyState
      title="Нет диалогов"
      description={`Начните первый разговор с ${agentName}`}
      icon={<MessageSquare size={22} />}
      accentColor="#6366f1"
      action={onNew ? { label: 'Новый диалог', onClick: onNew } : undefined}
    />
  );
}

// ── Preset: Empty notifications ───────────────────────────────────────────────
export function EmptyNotificationsState() {
  return (
    <EmptyState
      title="Нет уведомлений"
      description="Агенты будут напоминать о важных событиях и дедлайнах автоматически."
      icon={<Bell size={24} />}
      accentColor="#f59e0b"
    />
  );
}
