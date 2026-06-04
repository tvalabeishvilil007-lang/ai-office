import type { ApiChatMessage, StreamEvent } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// chat-api.ts — frontend service layer.
//
// Knows only:
//   • The /api/chat endpoint URL
//   • The SSE event format
//
// Does NOT know:
//   • Anthropic API keys (server-side only)
//   • Model names
//   • System prompts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a chat request and yield SSE stream events as an async generator.
 * Pass the Supabase access token so the server can verify the user.
 */
export async function* streamAgentChat(
  agentId: string,
  messages: ApiChatMessage[],
  token?: string,
  memoryContext?: string,
  customSystemPrompt?: string,
): AsyncGenerator<StreamEvent> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ agentId, messages, memoryContext, customSystemPrompt }),
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

      // SSE messages are separated by double newline
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          yield event;
          if (event.type === 'done' || event.type === 'error') return;
        } catch {
          // malformed JSON chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
