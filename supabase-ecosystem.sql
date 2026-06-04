-- ─────────────────────────────────────────────────────────────────────────────
-- AI Office — Learning Ecosystem Schema
-- Run AFTER supabase-memory.sql
--
-- Adds to agent_memories:
--   • is_global      — memory visible to ALL users (cross-user learning)
--   • importance     — 1-10 score set by AI during extraction
--   • tags           — category labels (["legal","tax","georgia"] etc.)
--   • conversation_id — which chat session produced this memory
--
-- Updates RLS so users can read global memories from any user.
-- Adds agent_ecosystem_stats view for Memory tab stats bar.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend agent_memories columns ─────────────────────────────────────────

ALTER TABLE agent_memories
  ADD COLUMN IF NOT EXISTS is_global        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS importance       SMALLINT    NOT NULL DEFAULT 5
    CHECK (importance BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS tags             TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conversation_id  TEXT        DEFAULT NULL;

-- ── 2. Replace RLS policies ───────────────────────────────────────────────────
-- Old policy was a single FOR ALL — replace with explicit per-operation policies
-- so SELECT can include global memories from other users.

DROP POLICY IF EXISTS "Users own their memories"    ON agent_memories;
DROP POLICY IF EXISTS "read_own_and_global"         ON agent_memories;
DROP POLICY IF EXISTS "insert_own"                  ON agent_memories;
DROP POLICY IF EXISTS "update_own"                  ON agent_memories;
DROP POLICY IF EXISTS "delete_own"                  ON agent_memories;

-- SELECT: own memories OR any global memory
CREATE POLICY "read_own_and_global"
  ON agent_memories
  FOR SELECT
  USING (auth.uid() = user_id OR is_global = true);

-- INSERT: only own records
CREATE POLICY "insert_own"
  ON agent_memories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: only own records
CREATE POLICY "update_own"
  ON agent_memories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: only own records
CREATE POLICY "delete_own"
  ON agent_memories
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. Stats view ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW agent_ecosystem_stats AS
SELECT
  agent_id,
  COUNT(*)                                         AS total_memories,
  COUNT(*) FILTER (WHERE is_global = true)         AS global_memories,
  COUNT(DISTINCT user_id)                          AS contributors,
  ROUND(AVG(importance)::NUMERIC, 1)               AS avg_importance,
  MAX(added_at)                                    AS last_updated
FROM agent_memories
GROUP BY agent_id;

-- ── 4. Performance index for global memory queries ────────────────────────────

CREATE INDEX IF NOT EXISTS agent_memories_global_idx
  ON agent_memories (agent_id, importance DESC)
  WHERE is_global = true;

-- ── 5. Enable realtime (idempotent) ──────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'agent_memories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_memories;
  END IF;
END $$;
