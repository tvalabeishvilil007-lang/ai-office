import { Router, type Request, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Documents Route
//
// POST /api/documents/generate
//   • { agentId, type, title, prompt, memoryContext? }
//   • Claude Sonnet writes a full professional document
//   • Returns { content: string }
// ─────────────────────────────────────────────────────────────────────────────

export const documentsRouter = Router();

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

// ── Document type → persona & format hints ────────────────────────────────────

const TYPE_HINTS: Record<string, { label: string; format: string }> = {
  contract: {
    label: 'договор',
    format: `Используй стандартную структуру договора:
1. Преамбула (стороны, дата)
2. Предмет договора
3. Права и обязанности сторон
4. Оплата и порядок расчётов
5. Срок действия
6. Ответственность сторон
7. Форс-мажор
8. Реквизиты и подписи`,
  },
  report: {
    label: 'отчёт',
    format: `Структура отчёта:
1. Исполнительное резюме
2. Введение / контекст
3. Основная часть (факты, данные, анализ)
4. Выводы
5. Рекомендации`,
  },
  analysis: {
    label: 'аналитическую записку',
    format: `Структура анализа:
1. Краткое резюме
2. Постановка задачи
3. Методология
4. Результаты анализа
5. Риски
6. Выводы и рекомендации`,
  },
  brief: {
    label: 'бриф',
    format: `Структура брифа:
1. О компании / продукте
2. Цели и задачи
3. Целевая аудитория
4. Конкуренты
5. Бюджет и сроки
6. Ожидаемый результат`,
  },
  proposal: {
    label: 'коммерческое предложение',
    format: `Структура КП:
1. Обращение к клиенту
2. Суть предложения (оффер)
3. Выгоды для клиента
4. Описание продукта / услуги
5. Стоимость
6. Следующий шаг (CTA)`,
  },
};

const AGENT_META: Record<string, { name: string; expertise: string }> = {
  tamara:  { name: 'Тамара',  expertise: 'юридические вопросы и договорное право' },
  david:   { name: 'Дэвид',   expertise: 'финансы, бухгалтерия и бизнес-аналитика' },
  nino:    { name: 'Нино',    expertise: 'маркетинг, PR и коммуникации' },
  archil:  { name: 'Арчил',   expertise: 'стратегический анализ и исследования' },
  giorgi:  { name: 'Гиорги',  expertise: 'переговоры, партнёрства и HR' },
  luka:    { name: 'Лука',    expertise: 'IT-проекты и технические спецификации' },
  kate:    { name: 'Катэ',    expertise: 'управление проектами и планирование' },
  zuka:    { name: 'Зука',    expertise: 'стратегия и бизнес-навигация' },
  theo:    { name: 'Тео',     expertise: 'международный бизнес и внешние рынки' },
};

// ── POST /api/documents/generate ──────────────────────────────────────────────

documentsRouter.post('/documents/generate', async (req: Request, res: Response) => {
  const {
    agentId,
    type    = 'brief',
    title,
    prompt,
    memoryContext = '',
  } = req.body as {
    agentId:       string;
    type?:         string;
    title:         string;
    prompt:        string;
    memoryContext?: string;
  };

  if (!title?.trim() || !prompt?.trim()) {
    return res.status(400).json({ error: 'title and prompt are required' });
  }

  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  const meta    = AGENT_META[agentId] ?? { name: 'Агент', expertise: 'бизнес-консалтинг' };
  const hint    = TYPE_HINTS[type] ?? TYPE_HINTS.brief;
  const today   = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const systemPrompt = `Ты ${meta.name} — профессиональный AI-ассистент, специализирующийся на ${meta.expertise}.
Твоя задача — написать ${hint.label} на русском языке, профессионально и по делу.
Дата составления: ${today}.

${memoryContext ? `Контекст о бизнесе пользователя:\n${memoryContext}\n` : ''}
${hint.format}

Требования:
- Профессиональный деловой стиль
- Чёткая структура с заголовками
- Конкретные формулировки (избегай расплывчатых фраз)
- Только готовый текст документа, без пояснений от имени ассистента`;

  const userMessage = `Название документа: "${title}"

Задание: ${prompt}

Напиши полный текст документа.`;

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return res.json({ content });
  } catch (err) {
    console.error('[documents/generate]', err);
    return res.status(500).json({ error: 'Generation failed' });
  }
});
