import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Memory Ecosystem Routes
//
// POST /api/extract-memory
//   • Calls Claude (Haiku — fast & cheap) to extract key facts from a
//     conversation. Auto-saves to Supabase via service role if configured.
//   • Returns { memories: ExtractedMemory[], saved: number }
//
// GET  /api/memories/stats/:agentId
//   • Returns aggregate stats from agent_ecosystem_stats view.
//   • Used by the Memory tab stats bar.
// ─────────────────────────────────────────────────────────────────────────────

export const memoryRouter = Router();

// ── Clients (lazy) ────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
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

// ── Auth helper ───────────────────────────────────────────────────────────────

async function resolveUserId(req: Request): Promise<string | null> {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) return null;

  const token  = header.slice(7);
  const admin  = getSupabaseAdmin();
  if (!admin) return 'anonymous';

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedMemory {
  key:        string;
  value:      string;
  importance: number;
  tags:       string[];
  is_global:  boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/extract-memory
// Body: { agentId, messages: [{role:"user"|"assistant", content:string}], conversationId? }
// ─────────────────────────────────────────────────────────────────────────────

memoryRouter.post('/extract-memory', async (req: Request, res: Response) => {
  // Auth
  const userId = await resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized — please sign in' });
    return;
  }

  const { agentId, messages, conversationId } = req.body as {
    agentId?:        unknown;
    messages?:       unknown;
    conversationId?: unknown;
  };

  // Validate
  if (typeof agentId !== 'string' || !agentId) {
    res.status(400).json({ error: 'agentId required' });
    return;
  }
  if (!Array.isArray(messages) || messages.length < 2) {
    res.status(400).json({ error: 'messages array with at least 2 items required' });
    return;
  }

  // Without API key, return empty (mock mode)
  const client = getAnthropicClient();
  if (!client) {
    res.json({ memories: [], saved: 0, mode: 'mock' });
    return;
  }

  // Build conversation text
  const conversationText = (messages as Array<{ role: string; content: string }>)
    .slice(-30)  // last 30 messages max (cost cap)
    .map(m => `${m.role === 'user' ? 'Пользователь' : 'Агент'}: ${m.content.slice(0, 800)}`)
    .join('\n\n');

  const extractionPrompt = `Ты — система извлечения знаний. Проанализируй диалог ниже и выдели важные факты.

АГЕНТ: ${agentId}
ДИАЛОГ:
${conversationText}

Верни JSON-массив. Каждый элемент:
{
  "key":        "Короткий ключ (5–50 символов)",
  "value":      "Сам факт — кратко, 1–2 предложения",
  "importance": число от 1 до 10,
  "tags":       ["тег1", "тег2"],
  "is_global":  true или false
}

Правила:
- is_global = true → факт полезен ВСЕМ пользователям платформы (законы, налоги, рыночные данные, бизнес-правила Грузии и т.д.)
- is_global = false → личная информация о конкретном пользователе (имя, компания, предпочтения)
- Извлеки 3–8 самых важных фактов. Если фактов нет — верни []
- Верни ТОЛЬКО валидный JSON-массив, никакого лишнего текста

Пример:
[
  {"key": "Компания пользователя", "value": "Запускает SaaS-платформу AI Офис в Грузии", "importance": 8, "tags": ["user", "company", "startup"], "is_global": false},
  {"key": "НДС Грузия 2025", "value": "Стандартная ставка НДС в Грузии — 18%. Малый бизнес (доход до 100k GEL/год) освобождён.", "importance": 9, "tags": ["tax", "georgia", "vat"], "is_global": true}
]`;

  let memories: ExtractedMemory[] = [];

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',  // Fast + cheap for extraction
      max_tokens: 1024,
      messages:   [{ role: 'user', content: extractionPrompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed: unknown[] = JSON.parse(jsonMatch[0]);
      memories = parsed
        .filter((m): m is Record<string, unknown> =>
          typeof m === 'object' && m !== null &&
          typeof (m as Record<string, unknown>).key   === 'string' &&
          typeof (m as Record<string, unknown>).value === 'string',
        )
        .map(m => ({
          key:        String(m.key).slice(0, 100),
          value:      String(m.value).slice(0, 600),
          importance: Math.min(10, Math.max(1, Number(m.importance) || 5)),
          tags:       Array.isArray(m.tags)
            ? (m.tags as unknown[]).slice(0, 5).map(String)
            : [],
          is_global:  Boolean(m.is_global),
        }));
    }
  } catch (err) {
    console.error('[extract-memory] Claude error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Extraction failed — Claude error' });
    return;
  }

  // Auto-save to Supabase via service role key
  let saved = 0;
  const admin = getSupabaseAdmin();

  if (admin && userId !== 'anonymous' && memories.length > 0) {
    const rows = memories.map(m => ({
      user_id:         userId,
      agent_id:        agentId,
      key:             m.key,
      value:           m.value,
      importance:      m.importance,
      tags:            m.tags,
      is_global:       m.is_global,
      source:          'agent',
      conversation_id: typeof conversationId === 'string' ? conversationId : null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, data } = await (admin as any)
      .from('agent_memories')
      .upsert(rows, { onConflict: 'user_id,agent_id,key' })
      .select('id');

    if (error) {
      console.error('[extract-memory] Supabase upsert error:', error);
    } else {
      saved = Array.isArray(data) ? data.length : memories.length;
    }
  }

  res.json({ memories, saved });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/memories/stats/:agentId
// Returns aggregate stats from agent_ecosystem_stats view.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pdf/memory
// Body: { agentId, pdfBase64, fileName }  (JSON, up to 10 MB)
//
// Uses Claude to read the PDF and extract key facts → saves to agent_memories
// ─────────────────────────────────────────────────────────────────────────────

memoryRouter.post('/pdf/memory', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { agentId, pdfBase64, fileName } = req.body as {
    agentId?:   unknown;
    pdfBase64?: unknown;
    fileName?:  unknown;
  };

  if (typeof agentId   !== 'string' || !agentId)   { res.status(400).json({ error: 'agentId required' });   return; }
  if (typeof pdfBase64 !== 'string' || !pdfBase64) { res.status(400).json({ error: 'pdfBase64 required' }); return; }

  const client = getAnthropicClient();
  if (!client) { res.json({ memories: [], saved: 0, mode: 'mock' }); return; }

  const name = typeof fileName === 'string' ? fileName : 'document.pdf';

  const prompt = `Ты — система извлечения знаний. Изучи этот PDF-документ («${name}») и извлеки 5-15 ключевых фактов, понятий, данных или правил.

Верни ТОЛЬКО JSON-массив без лишнего текста:
[
  {
    "key":        "Краткий заголовок факта (5-60 символов)",
    "value":      "Суть факта — 1-3 предложения",
    "importance": число 1-10,
    "tags":       ["тег1", "тег2"],
    "is_global":  true или false
  }
]

Правила:
- is_global = true → обобщённые знания (законы, стандарты, рыночные данные, методологии)
- is_global = false → специфичные для пользователя данные (его компания, проекты, контакты)
- Если документ пустой или нечитаем — верни []`;

  let memories: ExtractedMemory[] = [];

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'document',
            source: { type: 'base64', media_type: 'application/pdf' as const, data: pdfBase64 },
          } as unknown as { type: 'text'; text: string },   // SDK type workaround
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed: unknown[] = JSON.parse(jsonMatch[0]);
      memories = parsed
        .filter((m): m is Record<string, unknown> =>
          typeof m === 'object' && m !== null &&
          typeof (m as Record<string, unknown>).key   === 'string' &&
          typeof (m as Record<string, unknown>).value === 'string',
        )
        .map(m => ({
          key:        String(m.key).slice(0, 100),
          value:      String(m.value).slice(0, 600),
          importance: Math.min(10, Math.max(1, Number(m.importance) || 5)),
          tags:       Array.isArray(m.tags) ? (m.tags as unknown[]).slice(0, 5).map(String) : [],
          is_global:  Boolean(m.is_global),
        }));
    }
  } catch (err) {
    console.error('[pdf/memory] Claude error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'PDF extraction failed' });
    return;
  }

  let saved = 0;
  const admin = getSupabaseAdmin();

  if (admin && userId !== 'anonymous' && memories.length > 0) {
    const rows = memories.map(m => ({
      user_id:    userId,
      agent_id:   agentId,
      key:        m.key,
      value:      m.value,
      importance: m.importance,
      tags:       [...m.tags, 'pdf', name.replace(/\.[^.]+$/, '').slice(0, 20)],
      is_global:  m.is_global,
      source:     'document',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from('agent_memories')
      .upsert(rows, { onConflict: 'user_id,agent_id,key' })
      .select('id');

    if (error) console.error('[pdf/memory] Supabase upsert error:', error);
    else saved = Array.isArray(data) ? data.length : memories.length;
  }

  res.json({ memories, saved });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/memories/stats/:agentId
// Returns aggregate stats from agent_ecosystem_stats view.
// ─────────────────────────────────────────────────────────────────────────────

memoryRouter.get('/memories/stats/:agentId', async (req: Request, res: Response) => {
  const admin = getSupabaseAdmin();

  if (!admin) {
    // No Supabase config — return zeros
    res.json({ total: 0, global: 0, contributors: 0, avgImportance: 0 });
    return;
  }

  const { agentId } = req.params;
  if (!agentId) {
    res.status(400).json({ error: 'agentId param required' });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('agent_ecosystem_stats')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    console.error('[memories/stats] error:', error);
    res.status(500).json({ error: 'Stats query failed' });
    return;
  }

  res.json({
    total:          Number(data?.total_memories  ?? 0),
    global:         Number(data?.global_memories ?? 0),
    contributors:   Number(data?.contributors    ?? 0),
    avgImportance:  Number(data?.avg_importance  ?? 0),
  });
});
