import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { chatRouter }          from './routes/chat.js';
import { memoryRouter }        from './routes/memory.js';
import { meetingRouter }       from './routes/meeting.js';
import { notificationsRouter } from './routes/notifications.js';
import { documentsRouter }     from './routes/documents.js';
import { summaryRouter }       from './routes/summary.js';
import { officeChatRouter }    from './routes/officeChat.js';
import { tasksRouter }         from './routes/tasks.js';

// ─────────────────────────────────────────────────────────────────────────────
// AI-Office Express Server
//
// Dev:  tsx watch server/index.ts  → port 3001
//       Vite proxies /api/* → here
//
// Prod: node dist-server/index.js
//       Serves built frontend from dist/ + handles /api/*
// ─────────────────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT    = Number(process.env.PORT ?? 3001);

// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS: in dev allow Vite dev server; in prod same-origin → no CORS needed.
app.use(
  cors({
    origin: IS_PROD
      ? false
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  }),
);

app.use(express.json({ limit: '12mb' }));

// ── Health check (Railway uses this to verify the app is running) ─────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: IS_PROD ? 'production' : 'development' });
});

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api', chatRouter);
app.use('/api', memoryRouter);
app.use('/api', meetingRouter);
app.use('/api', notificationsRouter);
app.use('/api', documentsRouter);
app.use('/api', summaryRouter);
app.use('/api', officeChatRouter);
app.use('/api', tasksRouter);

// ── Static frontend (production only) ────────────────────────────────────────
// dist-server/index.js is one level below the repo root, so dist/ is at ../dist

if (IS_PROD) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // SPA fallback — React Router handles all non-API routes
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const keyStatus = process.env.ANTHROPIC_API_KEY
    ? '✓ ANTHROPIC_API_KEY loaded'
    : '✗ ANTHROPIC_API_KEY missing — set it in .env';

  console.log(`\n🟢  AI-Office server  →  http://localhost:${PORT}`);
  console.log(`    ${keyStatus}`);
  console.log(`    Mode: ${IS_PROD ? 'production' : 'development'}\n`);
});
