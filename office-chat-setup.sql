-- ─────────────────────────────────────────────────────────────────────────────
-- office_messages — shared group chat for the whole office
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS office_messages (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name   text        NOT NULL DEFAULT 'Пользователь',
  author_avatar text        NOT NULL DEFAULT '',
  content       text        NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE office_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all messages
CREATE POLICY "office_messages_select"
  ON office_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only insert their own messages
CREATE POLICY "office_messages_insert"
  ON office_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "office_messages_delete"
  ON office_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE office_messages;
