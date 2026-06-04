-- ── Enable Realtime for tasks table ──────────────────────────────────────────
-- Run this in the Supabase SQL Editor to allow live updates via .channel()
--
-- Without this, postgres_changes subscriptions receive no events even though
-- the channel connects successfully.

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Chat messages — needed for live chat sync across tabs / devices
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Optional: documents and memories
-- ALTER PUBLICATION supabase_realtime ADD TABLE documents;
-- ALTER PUBLICATION supabase_realtime ADD TABLE agent_memories;
