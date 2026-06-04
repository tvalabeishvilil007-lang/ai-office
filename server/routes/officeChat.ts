import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt, ALLOWED_AGENT_IDS } from '../prompts/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/office-chat-reply
//
// Called when a user sends a message in the office group chat.
// Picks the most relevant agent based on message content and streams
// their response back as SSE.
//
// No user auth required — this is an internal office feature.
// ─────────────────────────────────────────────────────────────────────────────

export const officeChatRouter = Router();

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

const isMock = () => !process.env.ANTHROPIC_API_KEY;

// ── Keyword routing — picks the most relevant agent ───────────────────────────

function pickAgentId(message: string, available: string[]): string {
  const m = message.toLowerCase();

  const rules: [RegExp, string][] = [
    [/юрист|договор|закон|право|суд|регистрац|нотариус|иск|штраф/,            'lawyer-georgia'],
    [/финанс|деньги|бюджет|расход|доход|налог|p&l|бухгалтер|прибыл|убыток/,   'finance'],
    [/маркетинг|реклама|smm|контент|бренд|продвиж|seo|аудитория|охват/,       'marketing'],
    [/продаж|клиент|crm|сделк|лид|переговор|скрипт|конверс|воронк/,           'sales'],
    [/недвижимост|квартир|аренд|объект|помещ|офис.*куп|метр|застройщ/,        'realestate'],
    [/исследован|анализ|данн|рынок|конкурент|тренд|статистик|отчёт|report/,   'researcher'],
    [/план|задач|встреч|расписан|организ|координ|проект|дедлайн|kpi/,         'business-assistant'],
    [/личн|напомн|travel|поездк|билет|отель|покупк|помоч|организ.*личн/,      'personal-assistant'],
  ];

  for (const [regex, agentId] of rules) {
    if (regex.test(m) && available.includes(agentId)) return agentId;
  }

  // Fallback: random from available agents
  const pool = available.filter(id => ALLOWED_AGENT_IDS.includes(id));
  return pool[Math.floor(Math.random() * pool.length)] ?? ALLOWED_AGENT_IDS[0];
}

// ── Route ─────────────────────────────────────────────────────────────────────

officeChatRouter.post('/office-chat-reply', async (req: Request, res: Response) => {
  const { message, availableAgentIds } = req.body as {
    message?: unknown;
    availableAgentIds?: unknown;
  };

  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const available =
    Array.isArray(availableAgentIds) && availableAgentIds.length > 0
      ? availableAgentIds.filter((x): x is string => typeof x === 'string')
      : [...ALLOWED_AGENT_IDS];

  const agentId    = pickAgentId(message, available);
  const systemPrompt = getSystemPrompt(agentId);

  if (!systemPrompt) {
    res.status(400).json({ error: 'Could not resolve agent' });
    return;
  }

  // ── SSE ──
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // First: tell client which agent is responding
  emit({ type: 'agent', agentId });

  if (isMock()) {
    emit({ type: 'chunk', text: 'Привет! Работаю в демо-режиме — задайте ANTHROPIC_API_KEY для реальных ответов.' });
    emit({ type: 'done' });
    res.end();
    return;
  }

  const client = getClient()!;

  try {
    const officeNote =
      '\n\nТы сейчас в офисном групповом чате. Отвечай коротко и по делу — максимум 3 абзаца. ' +
      'Не здоровайся заново, если тема уже понятна. Будь конкретным и практичным.';

    const stream = client.messages.stream({
      model:      'claude-sonnet-4-6',
      system:     systemPrompt + officeNote,
      messages:   [{ role: 'user', content: message.trim() }],
      max_tokens: 1024,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        emit({ type: 'chunk', text: event.delta.text });
      }
    }

    emit({ type: 'done' });
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('[office-chat-reply] error:', msg);
    emit({ type: 'error', message: 'Ошибка AI-провайдера' });
    res.end();
  }
});
