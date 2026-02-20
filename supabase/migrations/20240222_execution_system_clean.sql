-- Migration: Add Execution System (Clean - Only New Stuff)
-- Date: 2024-02-22
-- Description: Add instruction-based execution without touching existing tables

-- ============================================
-- STEP 1: ADD COLUMNS TO AGENTS TABLE
-- ============================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS instruction_prompt TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tool_config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS mcp_servers JSONB DEFAULT '[]';

-- ============================================
-- STEP 2: CREATE AGENT_EXECUTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  tool_calls JSONB DEFAULT '[]',
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);

ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own executions"
  ON agent_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own executions"
  ON agent_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions"
  ON agent_executions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: CREATE AGENT_TOOLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  tool_config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_id ON agent_tools(agent_id);

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their agent tools"
  ON agent_tools FOR ALL
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- ============================================
-- STEP 4: CREATE AGENT_MCP_SERVERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agent_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  server_name TEXT NOT NULL,
  server_config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, server_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_mcp_servers_agent_id ON agent_mcp_servers(agent_id);

ALTER TABLE agent_mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their agent MCP servers"
  ON agent_mcp_servers FOR ALL
  USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- ============================================
-- DONE - NO CHANGES TO EXISTING TABLES
-- ============================================
