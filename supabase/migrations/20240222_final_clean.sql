-- Clean Migration: Add Execution System
-- Run this in Supabase SQL Editor

-- Step 1: Add columns to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS instruction_prompt TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tool_config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS mcp_servers JSONB DEFAULT '[]';

-- Step 2: Create agent_executions table
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

CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);

ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own executions" ON agent_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own executions" ON agent_executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own executions" ON agent_executions FOR UPDATE USING (auth.uid() = user_id);

-- Step 3: Create agent_tools table
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

CREATE INDEX idx_agent_tools_agent_id ON agent_tools(agent_id);

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage agent tools" ON agent_tools FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Step 4: Create agent_mcp_servers table
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

CREATE INDEX idx_agent_mcp_servers_agent_id ON agent_mcp_servers(agent_id);

ALTER TABLE agent_mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage mcp servers" ON agent_mcp_servers FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- Step 5: Create execution_logs table
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  log_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key AFTER table is created
ALTER TABLE execution_logs ADD CONSTRAINT fk_execution_logs_execution 
  FOREIGN KEY (execution_id) REFERENCES agent_executions(id) ON DELETE CASCADE;

CREATE INDEX idx_execution_logs_execution_id ON execution_logs(execution_id);

ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- Now create policies using the correct column name
CREATE POLICY "Users view execution logs" ON execution_logs FOR SELECT 
  USING (execution_id IN (SELECT id FROM agent_executions WHERE user_id = auth.uid()));

CREATE POLICY "Users insert execution logs" ON execution_logs FOR INSERT 
  WITH CHECK (execution_id IN (SELECT id FROM agent_executions WHERE user_id = auth.uid()));
