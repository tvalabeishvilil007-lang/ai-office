import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Proactive Notifications Route
//
// POST /api/notifications/check
//   • Accepts { agentId, userId, memories[] }
//   • Claude Haiku scans user memories for upcoming deadlines, risks, or
//     important events and generates proactive alerts.
//   • Returns { notifications: Notification[] }
//
// GET  /api/notifications/:userId
//   • Returns stored notifications from DB (with read/unread state).
//
// POST /api/notifications/:id/read
//   • Marks a notification as read.
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsRouter = Router();

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ProactiveNotification {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  type: 'deadline' | 'reminder' | 'insight' | 'alert';
  createdAt: string;
  read: boolean;
}

const AGENT_META: Record<string, { name: string; avatar: string }> = {
  tamara:  { name: 'Тамара',  avatar: '⚖️' },
  david:   { name: 'Дэвид',   avatar: '📊' },
  nino:    { name: 'Нино',    avatar: '📣' },
  archil:  { name: 'Арчил',   avatar: '🔬' },
  giorgi:  { name: 'Гиорги',  avatar: '🤝' },
  luka:    { name: 'Лука',    avatar: '💻' },
  kate:    { name: 'Катэ',    avatar: '🎯' },
  zuka:    { name: 'Зука',    avatar: '🧭' },
  theo:    { name: 'Тео',     avatar: '🌍' },
};

// ── POST /api/notifications/check ─────────────────────────────────────────────
notificationsRouter.post('/notifications/check', async (req: Request, res: Response) => {
  const { agentId, memories = [] } = req.body as {
    agentId: string;
    memories: Array<{ key: string; value: string; importance?: number }>;
  };

  const client = getClient();
  const meta   = AGENT_META[agentId] ?? { name: agentId, avatar: '🤖' };

  // Mock mode
  if (!client || memories.length === 0) {
    return res.json({ notifications: [] });
  }

  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const memText = memories
    .slice(0, 30)
    .map(m => `• ${m.key}: ${m.value}`)
    .join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Сегодня ${today}. Ты — ${meta.name} (${meta.avatar}), AI-ассистент.

Проанализируй факты о бизнесе пользователя и найди поводы для проактивных уведомлений:
- Приближающиеся дедлайны (налоги, отчёты, договоры)
- Риски и предупреждения
- Полезные инсайты и напоминания

ФАКТЫ:
${memText}

Верни JSON-массив (не более 3 уведомлений, только реально важные):
[
  {
    "title": "Краткий заголовок (до 60 символов)",
    "body": "Подробное сообщение (1-2 предложения, конкретное)",
    "priority": "high|medium|low",
    "type": "deadline|reminder|insight|alert"
  }
]

Если нет поводов для уведомлений — верни пустой массив [].`,
      }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const parsed: Array<{ title: string; body: string; priority: string; type: string }> =
      match ? JSON.parse(match[0]) : [];

    const notifications: ProactiveNotification[] = parsed.map((n, i) => ({
      id:          `${agentId}-${Date.now()}-${i}`,
      agentId,
      agentName:   meta.name,
      agentAvatar: meta.avatar,
      title:       n.title,
      body:        n.body,
      priority:    (n.priority as 'high' | 'medium' | 'low') ?? 'medium',
      type:        (n.type as 'deadline' | 'reminder' | 'insight' | 'alert') ?? 'reminder',
      createdAt:   new Date().toISOString(),
      read:        false,
    }));

    return res.json({ notifications });
  } catch (err) {
    console.error('[notifications/check]', err);
    return res.json({ notifications: [] });
  }
});

// ── POST /api/notifications/generate ─────────────────────────────────────────
// Generate a one-off notification from the agent (e.g. after meeting synthesis)
notificationsRouter.post('/notifications/generate', async (req: Request, res: Response) => {
  const { agentId, context, type = 'insight' } = req.body as {
    agentId: string;
    context: string;
    type?: string;
  };

  const client = getClient();
  const meta   = AGENT_META[agentId] ?? { name: agentId, avatar: '🤖' };

  if (!client) {
    return res.json({ notification: null });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Ты ${meta.name}. На основе этого контекста сформулируй одно полезное уведомление пользователю.

Контекст: ${context}

Верни JSON:
{"title": "...", "body": "..."}`,
      }],
    });

    const text  = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};

    const notification: ProactiveNotification = {
      id:          `${agentId}-${Date.now()}`,
      agentId,
      agentName:   meta.name,
      agentAvatar: meta.avatar,
      title:       parsed.title ?? 'Уведомление от агента',
      body:        parsed.body  ?? context.slice(0, 100),
      priority:    'medium',
      type:        type as 'deadline' | 'reminder' | 'insight' | 'alert',
      createdAt:   new Date().toISOString(),
      read:        false,
    };

    return res.json({ notification });
  } catch (err) {
    console.error('[notifications/generate]', err);
    return res.json({ notification: null });
  }
});
