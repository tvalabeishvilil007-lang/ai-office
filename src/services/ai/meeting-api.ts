import type { MeetingEvent } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// meeting-api.ts — SSE client for /api/meeting
//
// Yields MeetingEvent objects as agents respond sequentially.
// Frontend only: no API keys, no model names here.
// ─────────────────────────────────────────────────────────────────────────────

export async function* streamMeeting(
  topic:        string,
  agentIds:     string[],
  token?:       string,
  memoryContext?: string,
): AsyncGenerator<MeetingEvent> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/meeting', {
    method:  'POST',
    headers,
    body:    JSON.stringify({ topic, agentIds, memoryContext }),
  });

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
          const event = JSON.parse(line.slice(6)) as MeetingEvent;
          yield event;
          if (event.type === 'done' || event.type === 'error') return;
        } catch {
          // malformed chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
