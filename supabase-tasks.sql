-- ── Tasks table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id          TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','running','done','failed')),
  priority          TEXT        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','critical')),
  progress          INTEGER     NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_minutes INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_user_agent
  ON tasks (user_id, agent_id, updated_at DESC);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
