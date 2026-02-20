-- Migration: Instruction-Based Agent Execution System (Fixed)
-- Date: 2024-02-22
-- Description: Transform from workflow execution to instruction-based AI agents

-- ============================================
-- ENHANCE AGENTS TABLE
-- ============================================

-- Add instruction-based fields to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS instruction_prompt TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tool_config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_context JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS mcp_servers JSONB DEFAULT '[]';

-- Add comments
COMMENT ON COLUMN agents.instruction_prompt IS 'The core instructions/system prompt for this agent';
COMMENT ON COLUMN agents.tool_config IS 'Configuration for tools this agent can use';
COMMENT ON COLUMN agents.execution_context IS 'Default context/variables for executions';
COMMENT ON COLUMN agents.mcp_servers IS 'MCP server configurations for this agent';

-- ============================================
-- AGENT EXECUTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  
  -- Input/Output
  input JSONB NOT NULL,
  output JSONB,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, running, completed, error, cancelled
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Execution details
  tool_calls JSONB DEFAULT '[]',
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at DESC);

-- Comments
COMMENT ON TABLE agent_executions IS 'Tracks each execution/run of an agent';
COMMENT ON COLUMN agent_executions.session_id IS 'Unique session identifier for isolation';
COMMENT ON COLUMN agent_executions.input IS 'User input provided for this execution';
COMMENT ON COLUMN agent_executions.output IS 'Results/output from the execution';
COMMENT ON COLUMN agent_executions.tool_calls IS 'Array of tool calls made during execution';

-- ============================================
-- AGENT TOOLS TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_id ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_enabled ON agent_tools(agent_id, is_enabled);

-- Comments
COMMENT ON TABLE agent_tools IS 'Defines which tools an agent can use';
COMMENT ON COLUMN agent_tools.tool_name IS 'Name of the tool (e.g., web_scrape, ai_process)';
COMMENT ON COLUMN agent_tools.tool_config IS 'Tool-specific configuration';

-- ============================================
-- AGENT MCP SERVERS TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_mcp_servers_agent_id ON agent_mcp_servers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_mcp_servers_enabled ON agent_mcp_servers(agent_id, is_enabled);

-- Comments
COMMENT ON TABLE agent_mcp_servers IS 'MCP server configurations per agent';
COMMENT ON COLUMN agent_mcp_servers.server_name IS 'Name of the MCP server (e.g., apify-scraper)';
COMMENT ON COLUMN agent_mcp_servers.server_config IS 'Server-specific configuration';

-- ============================================
-- EXECUTION LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE NOT NULL,
  log_type TEXT NOT NULL, -- info, tool_call, tool_result, error, assistant_message
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created_at ON execution_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_type ON execution_logs(execution_id, log_type);

-- Comments
COMMENT ON TABLE execution_logs IS 'Detailed logs for each execution';
COMMENT ON COLUMN execution_logs.log_type IS 'Type of log entry';
COMMENT ON COLUMN execution_logs.content IS 'Log message content';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- Agent executions policies
CREATE POLICY "Users can view their own executions"
  ON agent_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own executions"
  ON agent_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions"
  ON agent_executions FOR UPDATE
  USING (auth.uid() = user_id);

-- Agent tools policies
CREATE POLICY "Users can view their agent tools"
  ON agent_tools FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their agent tools"
  ON agent_tools FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Agent MCP servers policies
CREATE POLICY "Users can view their agent MCP servers"
  ON agent_mcp_servers FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their agent MCP servers"
  ON agent_mcp_servers FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Execution logs policies
CREATE POLICY "Users can view logs for their executions"
  ON execution_logs FOR SELECT
  USING (
    execution_id IN (
      SELECT id FROM agent_executions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert execution logs"
  ON execution_logs FOR INSERT
  WITH CHECK (
    execution_id IN (
      SELECT id FROM agent_executions WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_agent_executions_updated_at ON agent_executions;
CREATE TRIGGER update_agent_executions_updated_at
  BEFORE UPDATE ON agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_tools_updated_at ON agent_tools;
CREATE TRIGGER update_agent_tools_updated_at
  BEFORE UPDATE ON agent_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_mcp_servers_updated_at ON agent_mcp_servers;
CREATE TRIGGER update_agent_mcp_servers_updated_at
  BEFORE UPDATE ON agent_mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get execution statistics for an agent
CREATE OR REPLACE FUNCTION get_agent_execution_stats(p_agent_id UUID)
RETURNS TABLE (
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  avg_execution_time_ms NUMERIC,
  total_tokens_used BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE status = 'error')::BIGINT as failed_executions,
    AVG(execution_time_ms) as avg_execution_time_ms,
    SUM(tokens_used)::BIGINT as total_tokens_used
  FROM agent_executions
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent executions for an agent
CREATE OR REPLACE FUNCTION get_recent_executions(p_agent_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  session_id TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  tokens_used INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.session_id,
    e.status,
    e.started_at,
    e.completed_at,
    e.execution_time_ms,
    e.tokens_used
  FROM agent_executions e
  WHERE e.agent_id = p_agent_id
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- This migration transforms the platform from workflow-based execution
-- to instruction-based AI agents. Key changes:
--
-- 1. Agents now store instructions (system prompts) instead of workflows
-- 2. Each execution is isolated with its own session_id
-- 3. Tools are configured per agent
-- 4. MCP servers can be attached to agents
-- 5. Detailed execution logs for debugging
--
-- The workflow_nodes and workflow_edges tables are kept for backward
-- compatibility and can be used to generate instruction_prompt.
