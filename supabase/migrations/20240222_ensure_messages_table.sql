-- Migration: Ensure messages table exists with all needed columns
-- Date: 2024-02-22
-- Description: Add any missing columns to messages table for chat persistence

-- The messages table should already exist, but let's ensure it has all columns
-- and add any missing ones

-- Add columns if they don't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'builder';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Ensure RLS policies exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'messages_select_own'
  ) THEN
    CREATE POLICY "messages_select_own" ON messages FOR SELECT
      USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'messages_insert_own'
  ) THEN
    CREATE POLICY "messages_insert_own" ON messages FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'messages_delete_own'
  ) THEN
    CREATE POLICY "messages_delete_own" ON messages FOR DELETE
      USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()));
  END IF;
END $$;

-- Done
