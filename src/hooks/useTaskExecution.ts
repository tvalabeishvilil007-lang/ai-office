import type { Task } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useTaskExecution — streams task execution from /api/task/execute
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskExecEvent {
  type:     'chunk' | 'progress' | 'done' | 'error';
  text?:    string;
  value?:   number;
  result?:  string;
  message?: string;
}

export async function* streamTaskExecution(
  task:   Task,
  token?: string,
): AsyncGenerator<TaskExecEvent> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch('/api/task/execute', {
      method:  'POST',
      headers,
      body:    JSON.stringify({
        taskId:      task.id,
        agentId:     task.agentId,
        title:       task.title,
        description: task.description,
      }),
    });
  } catch (err) {
    yield { type: 'error', message: String(err) };
    return;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    yield { type: 'error', message: `HTTP ${response.status}: ${body}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', message: 'ReadableStream not supported' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6)) as TaskExecEvent;
          yield event;
          if (event.type === 'done' || event.type === 'error') return;
        } catch {
          // skip malformed chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// localStorage helpers for persisting task results
export const RESULT_KEY = (taskId: string) => `task_result:${taskId}`;

export function saveTaskResult(taskId: string, result: string) {
  localStorage.setItem(RESULT_KEY(taskId), result);
}

export function loadTaskResult(taskId: string): string | null {
  return localStorage.getItem(RESULT_KEY(taskId));
}
