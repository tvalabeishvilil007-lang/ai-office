-- ── Agent memory table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_memories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id   TEXT        NOT NULL,
  key        TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  source     TEXT        NOT NULL DEFAULT 'user'
                         CHECK (source IN ('user', 'agent', 'document')),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One key per user+agent (upsert on conflict)
  UNIQUE (user_id, agent_id, key)
);

CREATE INDEX IF NOT EXISTS agent_memories_user_agent
  ON agent_memories (user_id, agent_id, added_at DESC);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their memories"
  ON agent_memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
