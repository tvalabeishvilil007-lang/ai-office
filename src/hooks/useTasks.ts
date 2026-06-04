import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskStatus, TaskPriority } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useTasks — real task management backed by Supabase.
// Each user sees only their own tasks (Row Level Security).
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DbTask {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

function dbToTask(t: DbTask): Task {
  return {
    id: t.id,
    agentId: t.agent_id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    estimatedMinutes: t.estimated_minutes ?? undefined,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export interface CreateTaskInput {
  agentId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  estimatedMinutes?: number;
}

export interface UseTasks {
  tasks: Task[];
  loading: boolean;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateStatus: (id: string, status: TaskStatus, progress?: number) => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  // All user tasks across all agents (for global TaskList panel)
  allTasks: Task[];
}

export function useTasks(agentId?: string): UseTasks {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Unique suffix per hook instance — prevents channel name collisions when
  // multiple components call useTasks() simultaneously (Topbar + TaskList + AgentTabTasks).
  const channelSuffix = useRef(Math.random().toString(36).slice(2, 8));

  // ── Load tasks ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await db
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });

      if (cancelled) return;
      if (error) { console.error('[useTasks] load:', error); setLoading(false); return; }

      setAllTasks((data as DbTask[] ?? []).map(dbToTask));
      setLoading(false);
    }

    load();

    // ── Realtime subscription ──────────────────────────────────────────────
    // Each hook instance gets a unique channel name so multiple simultaneous
    // callers don't conflict with each other.
    const channel = supabase
      .channel(`tasks:${user.id}:${channelSuffix.current}`)
      .on(
        'postgres_changes' as any,
        {
          event:  '*',
          schema: 'public',
          table:  'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => { if (!cancelled) load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Filter to this agent
  const tasks = agentId
    ? allTasks.filter(t => t.agentId === agentId)
    : allTasks;

  // ── Create ─────────────────────────────────────────────────────────────────
  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    if (!user) return null;

    const { data, error } = await db
      .from('tasks')
      .insert({
        user_id:           user.id,
        agent_id:          input.agentId,
        title:             input.title,
        description:       input.description ?? '',
        priority:          input.priority ?? 'medium',
        status:            'pending',
        progress:          0,
        estimated_minutes: input.estimatedMinutes ?? null,
      })
      .select('*')
      .single();

    if (error || !data) { console.error('[useTasks] create:', error); return null; }

    const task = dbToTask(data as DbTask);
    setAllTasks(prev => [task, ...prev]);
    return task;
  }, [user?.id]);

  // ── Update status ──────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (
    id: string,
    status: TaskStatus,
    progress?: number,
  ) => {
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status, updated_at: now };
    if (progress !== undefined) update.progress = progress;
    if (status === 'done') update.progress = 100;

    await db.from('tasks').update(update).eq('id', id);

    setAllTasks(prev => prev.map(t =>
      t.id !== id ? t : {
        ...t,
        status,
        progress: status === 'done' ? 100 : (progress ?? t.progress),
        updatedAt: now,
      },
    ));
  }, []);

  // ── Update progress ────────────────────────────────────────────────────────
  const updateProgress = useCallback(async (id: string, progress: number) => {
    const now = new Date().toISOString();
    await db.from('tasks').update({ progress, updated_at: now }).eq('id', id);
    setAllTasks(prev => prev.map(t =>
      t.id !== id ? t : { ...t, progress, updatedAt: now },
    ));
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteTask = useCallback(async (id: string) => {
    await db.from('tasks').delete().eq('id', id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return { tasks, allTasks, loading, createTask, updateStatus, updateProgress, deleteTask };
}
