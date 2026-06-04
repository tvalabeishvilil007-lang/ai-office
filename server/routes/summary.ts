import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Summary Route
//
// POST /api/summary/session
//   • { agentId, messages[] }
//   • Claude Haiku extracts 3-7 key points from the conversation
//   • Returns { summary: string, points: string[] }
// ─────────────────────────────────────────────────────────────────────────────

export const summaryRouter = Router();

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

const AGENT_META: Record<string, { name: string }> = {
  tamara: { name: 'Тамара'  },
  david:  { name: 'Дэвид'   },
  nino:   { name: 'Нино'    },
  archil: { name: 'Арчил'   },
  giorgi: { name: 'Гиорги'  },
  luka:   { name: 'Лука'    },
  kate:   { name: 'Катэ'    },
  zuka:   { name: 'Зука'    },
  theo:   { name: 'Тео'     },
};

summaryRouter.post('/summary/session', async (req: Request, res: Response) => {
  const { agentId, messages = [] } = req.body as {
    agentId: string;
    messages: Array<{ role: string; content: string }>;
  };

  if (messages.length < 2) {
    return res.json({ summary: '', points: [] });
  }

  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  const meta = AGENT_META[agentId] ?? { name: 'Агент' };

  // Build transcript (max last 40 messages to fit context)
  const transcript = messages
    .slice(-40)
    .map(m => `${m.role === 'user' ? 'Пользователь' : meta.name}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role:    'user',
        content: `Проанализируй этот диалог и сделай краткое резюме.

ДИАЛОГ:
${transcript}

Верни JSON:
{
  "summary": "Одно предложение — о чём был разговор",
  "points": [
    "Ключевой вывод 1",
    "Ключевой вывод 2",
    "Ключевой вывод 3"
  ]
}

Не более 5 пунктов. Конкретно и по делу.`,
      }],
    });

    const text  = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) as { summary: string; points: string[] } : { summary: '', points: [] };

    return res.json({
      summary: parsed.summary ?? '',
      points:  Array.isArray(parsed.points) ? parsed.points : [],
    });
  } catch (err) {
    console.error('[summary/session]', err);
    return res.status(500).json({ error: 'Summary failed' });
  }
});
