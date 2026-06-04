import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Sliders, BookOpen, Upload, ToggleLeft } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { Agent } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// AgentTabTraining — interactive training & configuration panel.
// All settings are persisted in localStorage, keyed by agentId.
// ─────────────────────────────────────────────────────────────────────────────

interface TrainingSettings {
  temperature:       number;   // 0–100
  topP:              number;   // 0–100
  maxTokens:         number;   // 0–100
  contextUsage:      number;   // 0–100
  longMemory:        boolean;
  autonomousTasks:   boolean;
  proactiveInsights: boolean;
  voiceMode:         boolean;
}

const DEFAULTS: TrainingSettings = {
  temperature:       72,
  topP:              90,
  maxTokens:         60,
  contextUsage:      45,
  longMemory:        true,
  autonomousTasks:   true,
  proactiveInsights: false,
  voiceMode:         false,
};

function loadSettings(agentId: string): TrainingSettings {
  try {
    const raw = localStorage.getItem(`training:${agentId}`);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

// ── Interactive slider ────────────────────────────────────────────────────────

function SliderRow({
  label, value, unit = '%', accentColor, onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  accentColor: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-200">{value}{unit}</span>
      </div>
      {/* Track + thumb via native range input, styled over custom track */}
      <div className="relative h-4 flex items-center">
        {/* Visual track background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/[0.06]" />
        {/* Visual fill */}
        <div
          className="absolute left-0 h-1.5 rounded-full transition-all duration-75"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }}
        />
        {/* Native range — transparent, on top */}
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-4"
          style={{ zIndex: 1 }}
        />
        {/* Visible thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none transition-all duration-75"
          style={{
            left: `calc(${value}% - 7px)`,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}80`,
          }}
        />
      </div>
    </div>
  );
}

// ── Interactive toggle ────────────────────────────────────────────────────────

function ToggleRow({
  label, enabled, description, accentColor, onToggle,
}: {
  label: string;
  enabled: boolean;
  description?: string;
  accentColor: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-300">{label}</p>
        {description && <p className="text-[10px] text-slate-600 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'w-9 h-5 rounded-full relative shrink-0 transition-colors duration-200 focus:outline-none',
        )}
        style={{ background: enabled ? accentColor : 'rgba(255,255,255,0.10)' }}
        aria-pressed={enabled}
      >
        <motion.span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md"
          animate={{ left: enabled ? '18px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgentTabTrainingProps {
  agent: Agent;
}

export function AgentTabTraining({ agent }: AgentTabTrainingProps) {
  const [s, setS] = useState<TrainingSettings>(() => loadSettings(agent.id));

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(`training:${agent.id}`, JSON.stringify(s));
  }, [agent.id, s]);

  // Reload when agent changes
  useEffect(() => {
    setS(loadSettings(agent.id));
  }, [agent.id]);

  const setNum  = useCallback((key: keyof TrainingSettings) => (v: number)   => setS(p => ({ ...p, [key]: v })), []);
  const toggle  = useCallback((key: keyof TrainingSettings) => ()             => setS(p => ({ ...p, [key]: !p[key as keyof TrainingSettings] })), []);

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4 pb-4">

        {/* ── Model parameters ──────────────────────────────────────────── */}
        <GlassCard variant="dark" padding="lg" className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Sliders size={15} style={{ color: agent.accentColor }} />
            <h4 className="text-sm font-semibold text-slate-200">Параметры модели</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <SliderRow
              label="Температура (креативность)"
              value={s.temperature}
              accentColor={agent.accentColor}
              onChange={setNum('temperature')}
            />
            <SliderRow
              label="Top-P (nucleus sampling)"
              value={s.topP}
              accentColor={agent.accentColor}
              onChange={setNum('topP')}
            />
            <SliderRow
              label="Max tokens per response"
              value={s.maxTokens}
              accentColor={agent.accentColor}
              onChange={setNum('maxTokens')}
            />
            <SliderRow
              label="Context window usage"
              value={s.contextUsage}
              accentColor={agent.accentColor}
              onChange={setNum('contextUsage')}
            />
          </div>
        </GlassCard>

        {/* ── Behaviour toggles ─────────────────────────────────────────── */}
        <GlassCard variant="dark" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <ToggleLeft size={15} style={{ color: agent.accentColor }} />
            <h4 className="text-sm font-semibold text-slate-200">Поведение</h4>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label="Долгосрочная память"
              enabled={s.longMemory}
              description="Сохранять контекст между сессиями"
              accentColor={agent.accentColor}
              onToggle={toggle('longMemory')}
            />
            <ToggleRow
              label="Автономные задачи"
              enabled={s.autonomousTasks}
              description="Выполнять задачи без подтверждения"
              accentColor={agent.accentColor}
              onToggle={toggle('autonomousTasks')}
            />
            <ToggleRow
              label="Proactive insights"
              enabled={s.proactiveInsights}
              description="Предлагать идеи самостоятельно"
              accentColor={agent.accentColor}
              onToggle={toggle('proactiveInsights')}
            />
            <ToggleRow
              label="Голосовой режим"
              enabled={s.voiceMode}
              description="TTS / STT интеграция"
              accentColor={agent.accentColor}
              onToggle={toggle('voiceMode')}
            />
          </div>
        </GlassCard>

        {/* ── Knowledge base ────────────────────────────────────────────── */}
        <GlassCard variant="dark" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} style={{ color: agent.accentColor }} />
            <h4 className="text-sm font-semibold text-slate-200">База знаний</h4>
          </div>
          <div className="space-y-2 mb-4">
            {[
              { name: 'Трудовой кодекс Грузии 2024.pdf', size: '2.1 MB' },
              { name: 'Налоговое право ГЕ.pdf',           size: '890 KB' },
              { name: 'Корпоративные шаблоны.zip',        size: '4.3 MB' },
            ].map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen size={12} className="text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-400 truncate">{f.name}</span>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">{f.size}</span>
              </div>
            ))}
          </div>
          <Button variant="glass" size="xs" fullWidth leftIcon={<Upload size={12} />}>
            Загрузить документ
          </Button>
        </GlassCard>

        {/* ── Training stats ────────────────────────────────────────────── */}
        <GlassCard variant="dark" padding="lg" className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={15} style={{ color: agent.accentColor }} />
            <h4 className="text-sm font-semibold text-slate-200">Статистика обучения</h4>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Диалогов',            value: '1 247', sub: 'всего' },
              { label: 'Токенов',             value: '2.8M',  sub: 'обработано' },
              { label: 'Точность',            value: '97.3%', sub: 'оценок' },
              { label: 'Последнее обучение',  value: '3 дн',  sub: 'назад' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-bold text-white mb-0.5">{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="text-[10px] text-slate-600">{sub}</p>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
