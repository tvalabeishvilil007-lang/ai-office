import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getSystemPrompt } from '../prompts/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/task/execute  (SSE)
//
// Body: { taskId, agentId, title, description? }
//
// SSE events:
//   { type: 'chunk',    text: string }
//   { type: 'progress', value: number }   // 0-100
//   { type: 'done',     result: string }
//   { type: 'error',    message: string }
//
// Flow:
//   1. Mark task status = 'running', progress = 5  in Supabase
//   2. Stream Claude response
//   3. Mark task status = 'done',    progress = 100 in Supabase
// ─────────────────────────────────────────────────────────────────────────────

export const tasksRouter = Router();

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveUserId(req: Request): Promise<string | null> {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return 'anonymous';
  const token = header.slice(7);
  const admin = getSupabaseAdmin();
  if (!admin) return 'anonymous';
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

function openSse(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function emit(res: Response, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

tasksRouter.post('/task/execute', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { taskId, agentId, title, description } = req.body as {
    taskId?:      string;
    agentId?:     string;
    title?:       string;
    description?: string;
  };

  if (!taskId || !agentId || !title) {
    res.status(400).json({ error: 'taskId, agentId, title required' });
    return;
  }

  openSse(res);

  const admin = getSupabaseAdmin();

  // Mark as running
  if (admin) {
    await admin.from('tasks').update({
      status: 'running', progress: 5, updated_at: new Date().toISOString(),
    }).eq('id', taskId);
  }
  emit(res, { type: 'progress', value: 5 });

  const client = getClient();

  // ── Mock mode ───────────────────────────────────────────────────────────────
  if (!client) {
    const mockText = `[Демо] Выполняю задачу "${title}". Подключите API-ключ для реального выполнения агентом.`;
    for (const word of mockText.split(' ')) {
      emit(res, { type: 'chunk', text: word + ' ' });
      await new Promise(r => setTimeout(r, 60));
    }
    if (admin) {
      await admin.from('tasks').update({
        status: 'done', progress: 100, updated_at: new Date().toISOString(),
      }).eq('id', taskId);
    }
    emit(res, { type: 'progress', value: 100 });
    emit(res, { type: 'done', result: mockText });
    res.end();
    return;
  }

  const systemPrompt = getSystemPrompt(agentId);
  if (!systemPrompt) {
    emit(res, { type: 'error', message: `Unknown agent: ${agentId}` });
    res.end();
    return;
  }

  try {
    const taskPrompt = description?.trim()
      ? `Задача: ${title}\n\nОписание: ${description}\n\nВыполни эту задачу максимально конкретно и структурированно. Дай готовый результат, а не план.`
      : `Задача: ${title}\n\nВыполни эту задачу максимально конкретно и структурированно. Дай готовый результат, а не план.`;

    let result  = '';
    let charCnt = 0;

    const stream = client.messages.stream({
      model:      'claude-sonnet-4-6',
      system:     systemPrompt,
      messages:   [{ role: 'user', content: taskPrompt }],
      max_tokens: 1500,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        result  += chunk;
        charCnt += chunk.length;
        emit(res, { type: 'chunk', text: chunk });
        // Smooth progress 5 → 90 based on output length (assume ~1500 chars avg)
        const progress = Math.min(90, 5 + Math.round((charCnt / 1500) * 85));
        emit(res, { type: 'progress', value: progress });
      }
    }

    if (admin) {
      await admin.from('tasks').update({
        status: 'done', progress: 100, updated_at: new Date().toISOString(),
      }).eq('id', taskId);
    }
    emit(res, { type: 'progress', value: 100 });
    emit(res, { type: 'done', result });
    res.end();

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[task/execute]', msg);
    if (admin) {
      await admin.from('tasks').update({
        status: 'pending', progress: 0, updated_at: new Date().toISOString(),
      }).eq('id', taskId);
    }
    emit(res, { type: 'error', message: msg });
    res.end();
  }
});
