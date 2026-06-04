-- ─────────────────────────────────────────────────────────────────────────────
-- AI Office — Supabase schema
-- Run this in Supabase → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Chat sessions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id   TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT 'Новый диалог',
  preview    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_agent
  ON chat_sessions (user_id, agent_id, updated_at DESC);

-- ── Chat messages ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session
  ON chat_messages (session_id, created_at ASC);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Each user can only read/write their own data.
-- The service role key (used in Express) bypasses RLS automatically.

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Sessions: full access for the owner only
CREATE POLICY "Users own their sessions"
  ON chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages: access via owning session
CREATE POLICY "Users own messages via session"
  ON chat_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );
