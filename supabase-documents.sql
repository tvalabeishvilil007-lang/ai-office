-- ── Documents table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id   TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'brief'
                         CHECK (type IN ('contract','report','analysis','brief','proposal')),
  content    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_user_agent
  ON documents (user_id, agent_id, updated_at DESC);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their documents"
  ON documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
