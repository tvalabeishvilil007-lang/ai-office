import { useState, useCallback } from 'react';
import { AGENTS } from '../data/agents';
import type { Agent, AgentCategory } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useAgentManager — manages built-in enable/disable + custom agents
//
// Storage keys:
//   'ao_disabled_agents'  → string[]  (IDs of disabled built-in agents)
//   'ao_custom_agents'    → CustomAgentRecord[]
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomAgentRecord {
  id: string;          // always starts with 'custom-'
  slug: string;
  name: string;
  title: string;
  category: AgentCategory;
  avatar: string;      // emoji
  accentColor: string; // hex
  description: string;
  skills: string[];    // just label strings
  systemPrompt: string;
  createdAt: string;
}

export interface AgentManagerReturn {
  /** All currently visible agents (enabled built-ins + enabled custom) */
  visibleAgents: Agent[];
  /** Every agent regardless of enabled state — built-ins + custom (for lookups, history) */
  allAgents: Agent[];
  /** Built-in agents, each with .enabled flag */
  builtinAgents: Array<Agent & { enabled: boolean }>;
  /** Raw custom agent records */
  customAgents: CustomAgentRecord[];
  /** Toggle a built-in agent on/off */
  toggleBuiltin: (id: string) => void;
  /** Add a new custom agent */
  addCustom: (data: Omit<CustomAgentRecord, 'id' | 'slug' | 'createdAt'>) => void;
  /** Update an existing custom agent */
  updateCustom: (id: string, data: Partial<Omit<CustomAgentRecord, 'id' | 'createdAt'>>) => void;
  /** Delete a custom agent */
  deleteCustom: (id: string) => void;
  /** Find any agent (built-in or custom) by slug */
  getBySlug: (slug: string) => Agent | undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readDisabled(): Set<string> {
  try {
    const raw = localStorage.getItem('ao_disabled_agents');
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function writeDisabled(ids: Set<string>) {
  try { localStorage.setItem('ao_disabled_agents', JSON.stringify([...ids])); } catch {}
}

function readCustom(): CustomAgentRecord[] {
  try {
    const raw = localStorage.getItem('ao_custom_agents');
    return raw ? (JSON.parse(raw) as CustomAgentRecord[]) : [];
  } catch { return []; }
}

function writeCustom(agents: CustomAgentRecord[]) {
  try { localStorage.setItem('ao_custom_agents', JSON.stringify(agents)); } catch {}
}

/** Convert a CustomAgentRecord into an Agent for use across the app */
export function customRecordToAgent(r: CustomAgentRecord): Agent {
  const hex = r.accentColor;
  const rgb = hexToRgb(hex);
  return {
    id:              r.id,
    slug:            r.slug,
    name:            r.name,
    title:           r.title,
    category:        r.category,
    status:          'active',
    tier:            'core',
    isFeatured:      false,
    avatar:          r.avatar,
    accentColor:     hex,
    glowColor:       rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.30)` : 'rgba(99,102,241,0.30)',
    skills:          r.skills.map((label, i) => ({ id: `cs${i}`, label })),
    description:     r.description,
    tasksCompleted:  0,
    activeTaskCount: 0,
    rating:          5.0,
    isCustom:        true,
    systemPrompt:    r.systemPrompt,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function uid() {
  return 'custom-' + Math.random().toString(36).slice(2, 10);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAgentManager(): AgentManagerReturn {
  const [disabledIds, setDisabledIds] = useState<Set<string>>(() => readDisabled());
  const [customRecs,  setCustomRecs]  = useState<CustomAgentRecord[]>(() => readCustom());

  // Built-in agents annotated with enabled flag
  const builtinAgents = AGENTS.map(a => ({ ...a, enabled: !disabledIds.has(a.id) }));

  // Convert custom records → Agent objects
  const customAgentObjs = customRecs.map(customRecordToAgent);

  // Visible = enabled built-ins + all custom
  const visibleAgents: Agent[] = [
    ...AGENTS.filter(a => !disabledIds.has(a.id)),
    ...customAgentObjs,
  ];

  // All = every built-in (incl. disabled) + all custom — for lookups/history
  const allAgents: Agent[] = [...AGENTS, ...customAgentObjs];

  const toggleBuiltin = useCallback((id: string) => {
    setDisabledIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeDisabled(next);
      return next;
    });
  }, []);

  const addCustom = useCallback((data: Omit<CustomAgentRecord, 'id' | 'slug' | 'createdAt'>) => {
    const id   = uid();
    const slug = id;
    const rec: CustomAgentRecord = { ...data, id, slug, createdAt: new Date().toISOString() };
    setCustomRecs(prev => { const next = [...prev, rec]; writeCustom(next); return next; });
  }, []);

  const updateCustom = useCallback((id: string, data: Partial<Omit<CustomAgentRecord, 'id' | 'createdAt'>>) => {
    setCustomRecs(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...data } : r);
      writeCustom(next);
      return next;
    });
  }, []);

  const deleteCustom = useCallback((id: string) => {
    setCustomRecs(prev => { const next = prev.filter(r => r.id !== id); writeCustom(next); return next; });
  }, []);

  const getBySlug = useCallback((slug: string): Agent | undefined => {
    return visibleAgents.find(a => a.slug === slug)
      ?? AGENTS.find(a => a.slug === slug); // fallback: disabled built-in still accessible via URL
  }, [visibleAgents]);

  return { visibleAgents, allAgents, builtinAgents, customAgents: customRecs, toggleBuiltin, addCustom, updateCustom, deleteCustom, getBySlug };
}
