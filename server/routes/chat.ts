import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getSystemPrompt, ALLOWED_AGENT_IDS } from '../prompts/index.js';
import { streamMockResponse } from '../mock/generator.js';
import { getDelegations, type Consultation } from './meeting.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
//
// Body:
//   { agentId: string, messages: { role: "user"|"assistant", content: string }[] }
//
// Headers:
//   Authorization: Bearer <supabase_access_token>   (required when auth is on)
//
// Response: text/event-stream (SSE)
//   data: { type: "chunk",   text: string }
//   data: { type: "done"                  }
//   data: { type: "error",   message: string }
//
// Mode selection (automatic):
//   • ANTHROPIC_API_KEY set   → real AI via Anthropic SDK
//   • ANTHROPIC_API_KEY unset → mock streaming response (demo mode)
//
// Auth mode (automatic):
//   • SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set → verify JWT before streaming
//   • Keys not set → auth skipped (dev / demo mode)
// ─────────────────────────────────────────────────────────────────────────────

export const chatRouter = Router();

// ── Supabase admin client (server-side only, service role key) ────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Anthropic client (lazy — only if API key is present) ─────────────────────

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

const isMockMode = () => !process.env.ANTHROPIC_API_KEY;
const isAuthMode = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Auth middleware ───────────────────────────────────────────────────────────

async function verifyToken(req: Request): Promise<{ userId: string } | null> {
  // Auth is optional — if Supabase keys aren't configured, skip verification.
  if (!isAuthMode()) return { userId: 'anonymous' };

  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice(7);
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  return { userId: data.user.id };
}

// ── Validation helpers ────────────────────────────────────────────────────────

interface RawMessage { role: unknown; content: unknown }

function isValidMessages(raw: unknown): raw is Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  if (raw.length > 200) return false;
  return (raw as RawMessage[]).every(
    (m) =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.length > 0 &&
      m.content.length < 32_000,
  );
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

function openSse(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sseChunk(res: Response, text: string) {
  res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
}

function sseDone(res: Response) {
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}

function sseError(res: Response, message: string) {
  res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
  res.end();
}

// ── Route ─────────────────────────────────────────────────────────────────────

chatRouter.post('/chat', async (req: Request, res: Response) => {
  // ── Auth check ──
  const auth = await verifyToken(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized — please sign in' });
    return;
  }

  const { agentId, messages, memoryContext, customSystemPrompt } = req.body as {
    agentId?: unknown;
    messages?: unknown;
    memoryContext?: string;
    customSystemPrompt?: string;
  };

  // ── Validate agentId ──
  const isCustomAgent = typeof agentId === 'string' && agentId.startsWith('custom-');
  if (typeof agentId !== 'string' || (!isCustomAgent && !ALLOWED_AGENT_IDS.includes(agentId))) {
    res.status(400).json({
      error: `Unknown agentId. Allowed: ${ALLOWED_AGENT_IDS.join(', ')}`,
    });
    return;
  }

  // ── Custom agents must supply their system prompt ──
  if (isCustomAgent && (!customSystemPrompt || typeof customSystemPrompt !== 'string')) {
    res.status(400).json({ error: 'Custom agents must include customSystemPrompt in the request body' });
    return;
  }

  // ── Validate messages ──
  if (!isValidMessages(messages)) {
    res.status(400).json({ error: 'Invalid messages array' });
    return;
  }

  // ── Open SSE stream ──
  openSse(res);

  // ── Mock mode (no API key) ──
  if (isMockMode()) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    // For custom agents in mock mode, use the first built-in agent ID as a stand-in
    await streamMockResponse(isCustomAgent ? 'lawyer-georgia' : agentId, lastUserMsg, res);
    return;
  }

  // ── Real AI mode ──
  const client      = getClient()!;
  const basePrompt  = isCustomAgent ? customSystemPrompt! : getSystemPrompt(agentId)!;

  try {
    // ── Delegation: check if other agents should be consulted ──────────────
    // Only trigger for the last user message (not for very short queries)
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    let consultations: Consultation[] = [];

    if (!isCustomAgent && lastUserMsg.length > 30) {
      // Fire-and-forget delegation check (non-blocking for short queries)
      // Skipped for custom agents — they're not in the delegation map
      try {
        // Signal to frontend that we're checking
        res.write(`data: ${JSON.stringify({ type: 'delegate_check' })}\n\n`);

        consultations = await getDelegations(client, agentId, lastUserMsg);

        // Emit each consultation result so the UI can show them
        for (const c of consultations) {
          res.write(`data: ${JSON.stringify({
            type:      'delegate_result',
            agentId:   c.agentId,
            agentName: c.agentName,
            avatar:    c.avatar,
            summary:   c.summary,
          })}\n\n`);
        }
      } catch (delegateErr) {
        // Delegation failure is non-critical — continue without it
        console.warn('[chat] delegation check failed:', delegateErr);
      }
    }

    // ── Build enriched system prompt ───────────────────────────────────────
    let systemPrompt = basePrompt;

    if (memoryContext) {
      systemPrompt += `\n\n${memoryContext}`;
    }

    if (consultations.length > 0) {
      const consultContext = consultations
        .map(c => `${c.agentName} (${c.agentId}):\n${c.summary}`)
        .join('\n\n---\n\n');
      systemPrompt += `\n\n--- Консультации с коллегами-агентами ---\n${consultContext}\n---\nИспользуй эту информацию в своём ответе, при необходимости ссылайся на коллег.`;
    }

    // ── Stream main response ───────────────────────────────────────────────
    const stream = client.messages.stream({
      model:  'claude-sonnet-4-6',
      system: systemPrompt,
      messages,
      max_tokens: 2048,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        sseChunk(res, event.delta.text);
      }
    }

    // Emit usage stats before closing the stream
    try {
      const final = await stream.finalMessage();
      res.write(`data: ${JSON.stringify({
        type: 'done',
        input_tokens:  final.usage.input_tokens,
        output_tokens: final.usage.output_tokens,
      })}\n\n`);
    } catch {
      sseDone(res);
      return;
    }
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[chat] Anthropic error:', msg);
    sseError(res, 'Ошибка AI-провайдера. Попробуйте снова.');
  }
});

// ── Health check ──────────────────────────────────────────────────────────────

chatRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    mode: isMockMode() ? 'mock' : 'live',
    auth: isAuthMode() ? 'supabase' : 'disabled',
    agents: ALLOWED_AGENT_IDS,
    keyConfigured: !isMockMode(),
  });
});
