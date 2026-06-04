import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getSystemPrompt, ALLOWED_AGENT_IDS } from '../prompts/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Meeting & Delegation Routes
//
// POST /api/delegate
//   Internal helper — checks if a query needs other agents and fetches
//   their concise responses. Used by /api/chat for auto-delegation.
//   Returns { consultations: [{ agentId, agentName, summary }] }
//
// POST /api/meeting  (SSE)
//   Full multi-agent meeting. Each agent responds sequentially, seeing
//   what previous agents said. Ends with an AI synthesis.
//
//   SSE events:
//     { type: "agent_start",  agentId, agentName, avatar }
//     { type: "agent_chunk",  agentId, text }
//     { type: "agent_done",   agentId }
//     { type: "synthesis_start" }
//     { type: "synthesis_chunk", text }
//     { type: "done" }
//     { type: "error", message }
// ─────────────────────────────────────────────────────────────────────────────

export const meetingRouter = Router();

// ── Agent metadata (server-side, mirrors src/data/agents.ts) ─────────────────

const AGENT_META: Record<string, { name: string; avatar: string; expertise: string }> = {
  'lawyer-georgia':    { name: 'Юрист',              avatar: '⚖️',  expertise: 'Грузинское право, регистрация компаний, договоры, налоги' },
  'business-assistant':{ name: 'Бизнес-ассистент',   avatar: '💼',  expertise: 'Бизнес-планирование, координация проектов, KPI' },
  'finance':           { name: 'Финансы',             avatar: '📊',  expertise: 'Финансовый анализ, P&L, бюджетирование, инвестиции' },
  'marketing':         { name: 'Маркетинг',           avatar: '📣',  expertise: 'Стратегия маркетинга, SMM, SEO, рекламные кампании' },
  'researcher':        { name: 'Исследователь',       avatar: '🔬',  expertise: 'Анализ рынка, конкуренты, Data Mining, аналитика' },
  'sales':             { name: 'Sales',               avatar: '🎯',  expertise: 'CRM, воронка продаж, cold outreach, переговоры' },
  'realestate':        { name: 'Недвижимость',        avatar: '🏢',  expertise: 'Анализ объектов, инвестиции, рынок Грузии' },
  'personal-assistant':{ name: 'Личный ассистент',    avatar: '🤝',  expertise: 'Управление временем, личные задачи, travel planning' },
  'hr':                { name: 'HR-директор',         avatar: '👥',  expertise: 'Найм, онбординг, HR-политики, трудовое право Грузии, мотивация' },
  'it-manager':        { name: 'IT-директор',         avatar: '💻',  expertise: 'IT-инфраструктура, кибербезопасность, автоматизация, AI-инструменты' },
  'copywriter':        { name: 'Копирайтер',          avatar: '✍️',  expertise: 'Продающие тексты, SEO-статьи, email-воронки, контент соцсетей' },
  'pr-manager':        { name: 'PR-менеджер',         avatar: '📢',  expertise: 'PR-стратегия, работа с прессой, кризисные коммуникации, репутация' },
  'accountant':        { name: 'Бухгалтер',           avatar: '🧾',  expertise: 'Бухгалтерия, налоги, отчётность, зарплаты, Грузия/РФ/КЗ' },
  'coach':             { name: 'Бизнес-коуч',         avatar: '🎓',  expertise: 'Лидерство, OKR, личная эффективность, психология предпринимателя' },
  'developer':         { name: 'Разработчик',         avatar: '👨‍💻', expertise: 'Веб-разработка, архитектура систем, DevOps, AI-интеграции' },
  'operations':        { name: 'Операционный директор', avatar: '⚙️', expertise: 'Бизнес-процессы, логистика, закупки, Lean/Six Sigma' },
};

// ── Clients ───────────────────────────────────────────────────────────────────

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

// ── SSE helpers ───────────────────────────────────────────────────────────────

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

// ── Internal: get single agent response (non-streaming, concise) ──────────────

async function consultAgent(
  client: Anthropic,
  agentId: string,
  question: string,
  priorContext?: string,
): Promise<string> {
  const basePrompt = getSystemPrompt(agentId);
  if (!basePrompt) return '';

  const systemPrompt = priorContext
    ? `${basePrompt}\n\n--- Контекст от других участников совещания ---\n${priorContext}\n---\nДобавь СВОЮ экспертизу по теме. Не повторяй то, что уже сказано. Отвечай конкретно и структурированно.`
    : `${basePrompt}\n\nОтвечай кратко (200-400 слов), конкретно и структурированно. Только твоя область экспертизы.`;

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    system:     systemPrompt,
    messages:   [{ role: 'user', content: question }],
    max_tokens: 1024,
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/delegate
// Body: { primaryAgentId, userQuery, messages }
// Returns: { consultations: [{ agentId, agentName, avatar, summary }] }
// Called by /api/chat to enrich primary agent's context.
// ─────────────────────────────────────────────────────────────────────────────

export interface Consultation {
  agentId:   string;
  agentName: string;
  avatar:    string;
  summary:   string;
}

export async function getDelegations(
  client: Anthropic,
  primaryAgentId: string,
  userQuery: string,
): Promise<Consultation[]> {

  const otherAgents = ALLOWED_AGENT_IDS
    .filter(id => id !== primaryAgentId && AGENT_META[id])
    .map(id => `${id}: ${AGENT_META[id]?.expertise}`)
    .join('\n');

  // Quick Haiku call to decide if delegation is needed
  const classifyResponse = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages:   [{
      role:    'user',
      content: `Primary agent: ${primaryAgentId} (${AGENT_META[primaryAgentId]?.expertise})
User query: "${userQuery.slice(0, 400)}"

Other agents:
${otherAgents}

Which agents (if any) should enrich the answer? Only include if CLEARLY beneficial.
Return JSON only: { "agents": ["id1", "id2"] }
Return empty array for simple questions. Max 2 agents.`,
    }],
  });

  const classText = classifyResponse.content[0]?.type === 'text'
    ? classifyResponse.content[0].text
    : '{"agents":[]}';

  let agentsToConsult: string[] = [];
  try {
    const match = classText.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { agents?: unknown };
      if (Array.isArray(parsed.agents)) {
        agentsToConsult = parsed.agents
          .filter((id): id is string => typeof id === 'string' && ALLOWED_AGENT_IDS.includes(id))
          .slice(0, 2);
      }
    }
  } catch {
    return [];
  }

  if (agentsToConsult.length === 0) return [];

  // Parallel consultation calls
  const results = await Promise.allSettled(
    agentsToConsult.map(async agentId => {
      const summary = await consultAgent(client, agentId, userQuery);
      const meta    = AGENT_META[agentId]!;
      return { agentId, agentName: meta.name, avatar: meta.avatar, summary } satisfies Consultation;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Consultation> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(c => c.summary.length > 0);
}

meetingRouter.post('/delegate', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { primaryAgentId, userQuery } = req.body as { primaryAgentId?: string; userQuery?: string };

  if (!primaryAgentId || !userQuery) {
    res.status(400).json({ error: 'primaryAgentId and userQuery required' });
    return;
  }

  const client = getClient();
  if (!client) {
    res.json({ consultations: [], mode: 'mock' });
    return;
  }

  const consultations = await getDelegations(client, primaryAgentId, userQuery);
  res.json({ consultations });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meeting  (SSE)
// Body: { topic, agentIds: string[], memoryContext? }
// ─────────────────────────────────────────────────────────────────────────────

meetingRouter.post('/meeting', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { topic, agentIds, memoryContext } = req.body as {
    topic?:         string;
    agentIds?:      unknown;
    memoryContext?: string;
  };

  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    res.status(400).json({ error: 'topic required (min 3 chars)' });
    return;
  }

  if (!Array.isArray(agentIds) || agentIds.length < 2) {
    res.status(400).json({ error: 'agentIds array with at least 2 agents required' });
    return;
  }

  const validIds = (agentIds as unknown[])
    .filter((id): id is string => typeof id === 'string' && ALLOWED_AGENT_IDS.includes(id))
    .slice(0, 5);   // max 5 agents in a meeting

  if (validIds.length < 1) {
    res.status(400).json({ error: 'No valid agentIds' });
    return;
  }

  openSse(res);

  const client = getClient();

  // ── Mock mode ──────────────────────────────────────────────────────────────
  if (!client) {
    for (const agentId of validIds) {
      const meta = AGENT_META[agentId] ?? { name: agentId, avatar: '🤖' };
      emit(res, { type: 'agent_start', agentId, agentName: meta.name, avatar: meta.avatar });
      await new Promise(r => setTimeout(r, 300));
      const mockText = `[Демо] ${meta.name} анализирует тему: "${topic}". В реальном режиме здесь будет развёрнутый ответ с учётом специализации агента.`;
      for (const word of mockText.split(' ')) {
        emit(res, { type: 'agent_chunk', agentId, text: word + ' ' });
        await new Promise(r => setTimeout(r, 60));
      }
      emit(res, { type: 'agent_done', agentId });
    }
    emit(res, { type: 'synthesis_start' });
    const synthMock = 'Это демо-режим. Подключите API-ключ для полноценного совещания агентов.';
    for (const word of synthMock.split(' ')) {
      emit(res, { type: 'synthesis_chunk', text: word + ' ' });
      await new Promise(r => setTimeout(r, 80));
    }
    emit(res, { type: 'done' });
    res.end();
    return;
  }

  // ── Real AI mode ───────────────────────────────────────────────────────────

  const agentResponses: Array<{ agentId: string; agentName: string; text: string }> = [];

  try {
    const userTopic = memoryContext
      ? `${topic}\n\n(Контекст о пользователе: ${memoryContext})`
      : topic;

    // Each agent responds sequentially, seeing prior agents' responses
    for (const agentId of validIds) {
      const meta       = AGENT_META[agentId] ?? { name: agentId, avatar: '🤖' };
      const basePrompt = getSystemPrompt(agentId);
      if (!basePrompt) continue;

      // Build context from prior agents
      const priorContext = agentResponses.length > 0
        ? agentResponses
            .map(r => `${r.agentName}:\n${r.text}`)
            .join('\n\n---\n\n')
        : '';

      const systemPrompt = priorContext
        ? `${basePrompt}

--- Совещание агентов AI Офис ---
Тема: ${topic}

Другие агенты уже высказались:
${priorContext}

Добавь свою экспертизу. Не повторяй сказанное — развивай, дополняй, указывай на риски или возможности из твоей области. Структурируй ответ с заголовками.`
        : `${basePrompt}

--- Совещание агентов AI Офис ---
Тема: ${topic}

Ты выступаешь первым. Дай развёрнутый анализ с позиции своей экспертизы. Структурируй ответ с заголовками.`;

      emit(res, { type: 'agent_start', agentId, agentName: meta.name, avatar: meta.avatar });

      let agentText = '';

      const stream = client.messages.stream({
        model:    'claude-sonnet-4-6',
        system:   systemPrompt,
        messages: [{ role: 'user', content: userTopic }],
        max_tokens: 1200,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          agentText += event.delta.text;
          emit(res, { type: 'agent_chunk', agentId, text: event.delta.text });
        }
      }

      emit(res, { type: 'agent_done', agentId });
      agentResponses.push({ agentId, agentName: meta.name, text: agentText });
    }

    // ── Synthesis ─────────────────────────────────────────────────────────────
    if (agentResponses.length > 1) {
      emit(res, { type: 'synthesis_start' });

      const allResponses = agentResponses
        .map(r => `## ${r.agentName}\n${r.text}`)
        .join('\n\n---\n\n');

      const synthStream = client.messages.stream({
        model:  'claude-sonnet-4-6',
        system: 'Ты — фасилитатор совещания. Твоя задача: объединить мнения всех экспертов в чёткий, действенный план.',
        messages: [{
          role:    'user',
          content: `Тема совещания: "${topic}"

Мнения экспертов:
${allResponses}

Составь итоговый план действий:
1. Ключевые выводы (bullet points)
2. Конкретные шаги (с кто за что отвечает)
3. Риски и как их снизить
4. Первые 3 действия на этой неделе

Будь конкретен. Используй имена агентов при необходимости.`,
        }],
        max_tokens: 1000,
      });

      for await (const event of synthStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          emit(res, { type: 'synthesis_chunk', text: event.delta.text });
        }
      }
    }

    emit(res, { type: 'done' });
    res.end();

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[meeting] error:', msg);
    emit(res, { type: 'error', message: 'Ошибка сервера — ' + msg });
    res.end();
  }
});
