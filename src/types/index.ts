// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for AI Office
// Designed for scalability: white-label, multi-tenant, marketplace, subscriptions
// ─────────────────────────────────────────────────────────────────────────────

// ── Agent ─────────────────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'busy' | 'idle' | 'offline';

export type AgentTier = 'core' | 'premium' | 'enterprise';

export type AgentCategory =
  | 'legal'
  | 'business'
  | 'finance'
  | 'marketing'
  | 'research'
  | 'sales'
  | 'realestate'
  | 'personal'
  | 'hr'
  | 'tech'
  | 'operations'
  | 'education';

export type AppMode = 'work' | 'study';

export interface AgentSkill {
  id: string;
  label: string;
}

export interface Agent {
  id: string;
  slug: string;           // URL-friendly, e.g. "lawyer-georgia"
  name: string;           // Display name
  title: string;          // Role title
  category: AgentCategory;
  status: AgentStatus;
  tier: AgentTier;
  isFeatured: boolean;    // Юрист Грузии — центральный агент
  avatar: string;         // Emoji или URL аватара
  accentColor: string;    // Tailwind color class (hex or class)
  glowColor: string;      // rgba for glow effects
  skills: AgentSkill[];
  description: string;
  tasksCompleted: number;
  activeTaskCount: number;
  rating: number;         // 0–5
  // Mode: 'work' (default) or 'study'
  mode?: AppMode;
  // Custom agent fields
  isCustom?: boolean;
  systemPrompt?: string;  // For custom agents — passed to server
  enabled?: boolean;      // UI-only: disabled agents are hidden
}

// ── Task ──────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;       // 0–100
  createdAt: string;      // ISO date string
  updatedAt: string;
  estimatedMinutes?: number;
}

// ── Message / Chat ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'agent' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  agentId?: string;
  content: string;
  timestamp: string;
}

// ── Office Activity ────────────────────────────────────────────────────────────

export type ActivityType =
  | 'task_started'
  | 'task_completed'
  | 'document_created'
  | 'message_sent'
  | 'agent_joined'
  | 'analysis_done';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  agentId: string;
  content: string;
  timestamp: string;
}

// ── Document ──────────────────────────────────────────────────────────────────

export type DocumentType = 'contract' | 'report' | 'analysis' | 'brief' | 'proposal';

export interface Document {
  id: string;
  agentId: string;
  title: string;
  type: DocumentType;
  content: string;
  createdAt: string;
  size: string;         // e.g. "24 KB"
}

// ── Memory entry ──────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  agentId: string;
  key: string;
  value: string;
  addedAt: string;
  source: 'user' | 'agent' | 'document';
  // Ecosystem fields (added by supabase-ecosystem.sql)
  isGlobal?: boolean;       // true = shared with ALL users
  importance?: number;      // 1-10 (set by AI during extraction)
  tags?: string[];          // category labels e.g. ["legal","tax","georgia"]
  isOwnedByMe?: boolean;    // false = came from another user's global memory
}

// ── Ecosystem stats (from agent_ecosystem_stats view) ─────────────────────────

export interface EcosystemStats {
  agentId: string;
  totalMemories: number;
  globalMemories: number;
  contributors: number;
  avgImportance: number;
}

// ── User / Auth (stubs for future SaaS) ───────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'manager' | 'user';
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  plan: SubscriptionPlan;
  workspaceId: string;
  avatarUrl?: string;
  // Future: enabledAgentIds, featureFlags, whitelabelConfig, etc.
}

// ── Workspace (future multi-tenant) ───────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  logoUrl?: string;
  plan: SubscriptionPlan;
  ownerId: string;
  // Future: whitelabel branding, domain, billing, seat count
}
