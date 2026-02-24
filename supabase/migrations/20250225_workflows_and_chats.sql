-- Migration: Workflows and Chats (platform is the agent; workflows = repeatable tasks; chats = conversations)
-- Date: 2025-02-25
-- Description: Add workflows table (replaces sub-agents), chats table (conversations), and link execution_logs/messages.

-- ============================================
-- 1. WORKFLOWS TABLE
-- ============================================
-- Saved repeatable tasks: instructions + form inputs. Created when user saves from "Save this workflow?" in chat.
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  instruction_prompt TEXT NOT NULL,
  tool_config JSONB DEFAULT '{}',
  execution_context JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_slug ON workflows(slug);
CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their workflows"
  ON workflows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. CHATS TABLE
-- ============================================
-- Conversations with the platform agent. Each chat has messages; no longer tied to "sub-agents".
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their chats"
  ON chats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. EXECUTION_LOGS: add workflow_id (nullable)
-- ============================================
-- When a workflow runs, log uses same execution_logs with workflow_id set.
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow_id ON execution_logs(workflow_id) WHERE workflow_id IS NOT NULL;

-- RLS for execution_logs: ensure rows with workflow_id are visible to workflow owner.
-- (Existing policies may use agent_id; this adds coverage for workflow runs.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'execution_logs' AND policyname = 'execution_logs_workflow_select') THEN
    CREATE POLICY "execution_logs_workflow_select" ON execution_logs FOR SELECT
      USING (workflow_id IN (SELECT id FROM workflows WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'execution_logs' AND policyname = 'execution_logs_workflow_insert') THEN
    CREATE POLICY "execution_logs_workflow_insert" ON execution_logs FOR INSERT
      WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'execution_logs' AND policyname = 'execution_logs_workflow_update') THEN
    CREATE POLICY "execution_logs_workflow_update" ON execution_logs FOR UPDATE
      USING (workflow_id IN (SELECT id FROM workflows WHERE user_id = auth.uid()));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================
-- 4. MESSAGES: add chat_id (nullable)
-- ============================================
-- Chat messages can be linked to a chat instead of only agent_id.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id) WHERE chat_id IS NOT NULL;

-- RLS for messages by chat: allow if user owns the chat
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select_own_chat') THEN
    CREATE POLICY "messages_select_own_chat" ON messages FOR SELECT
      USING (
        (chat_id IS NOT NULL AND chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid()))
        OR (chat_id IS NULL AND EXISTS (SELECT 1 FROM agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_insert_own_chat') THEN
    CREATE POLICY "messages_insert_own_chat" ON messages FOR INSERT
      WITH CHECK (
        (chat_id IS NOT NULL AND chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid()))
        OR (chat_id IS NULL AND EXISTS (SELECT 1 FROM agents WHERE agents.id = messages.agent_id AND agents.user_id = auth.uid()))
      );
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMENT ON TABLE workflows IS 'Saved repeatable tasks (roadmap of actions). Created from chat when user saves a workflow.';
COMMENT ON TABLE chats IS 'Conversations with the platform agent. Messages belong to a chat.';
