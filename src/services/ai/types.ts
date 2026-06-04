// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the AI chat service layer.
// These mirror the server SSE protocol — no Anthropic SDK imports here.
// ─────────────────────────────────────────────────────────────────────────────

/** Message shape sent to /api/chat */
export interface ApiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** SSE events received from /api/chat */
export type StreamEvent =
  | { type: 'chunk';           text: string }
  | { type: 'done';            input_tokens?: number; output_tokens?: number }
  | { type: 'error';           message: string }
  // Auto-delegation events
  | { type: 'delegate_check' }
  | { type: 'delegate_result'; agentId: string; agentName: string; avatar: string; summary: string };

/** SSE events received from /api/meeting */
export type MeetingEvent =
  | { type: 'agent_start';     agentId: string; agentName: string; avatar: string }
  | { type: 'agent_chunk';     agentId: string; text: string }
  | { type: 'agent_done';      agentId: string }
  | { type: 'synthesis_start' }
  | { type: 'synthesis_chunk'; text: string }
  | { type: 'done' }
  | { type: 'error';           message: string };
