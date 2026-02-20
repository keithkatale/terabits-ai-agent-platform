-- Migration: Add OpenClaw-inspired agent runtime tables
-- This extends the existing schema with robust agent execution capabilities

-- Agent sessions (JSONL transcript storage)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  session_key TEXT UNIQUE NOT NULL,
  session_type TEXT DEFAULT 'runtime', -- 'runtime', 'builder', 'subagent'
  parent_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'error'
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session transcript messages (append-only log)
CREATE TABLE IF NOT EXISTS session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,
  tool_calls JSONB, -- Array of tool invocations
  tool_results JSONB, -- Array of tool results
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tool execution logs (detailed tool tracking)
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES session_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'error'
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent memory entries (vector-enabled for semantic search)
CREATE TABLE IF NOT EXISTS agent_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL, -- 'long_term', 'daily_log', 'fact', 'conversation'
  content TEXT NOT NULL,
  summary TEXT,
  embedding VECTOR(1536), -- For semantic search (OpenAI embeddings)
  importance_score FLOAT DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent tool policies (fine-grained tool access control)
CREATE TABLE IF NOT EXISTS agent_tool_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  policy_type TEXT DEFAULT 'profile', -- 'profile', 'custom', 'owner_only'
  profile TEXT, -- 'minimal', 'coding', 'messaging', 'full'
  allowed_tools TEXT[] DEFAULT '{}',
  denied_tools TEXT[] DEFAULT '{}',
  owner_only_tools TEXT[] DEFAULT '{}',
  max_tool_calls_per_turn INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id)
);

-- Lane queue (per-session execution serialization)
CREATE TABLE IF NOT EXISTS agent_run_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE NOT NULL,
  run_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'queued', -- 'queued', 'running', 'completed', 'error', 'timeout'
  priority INTEGER DEFAULT 0,
  input_message TEXT NOT NULL,
  output_message TEXT,
  error_message TEXT,
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  queued_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Subagent spawns (track sub-agent executions)
CREATE TABLE IF NOT EXISTS subagent_spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE NOT NULL,
  child_session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  label TEXT,
  status TEXT DEFAULT 'spawned', -- 'spawned', 'running', 'completed', 'error', 'timeout'
  result TEXT,
  announce_message TEXT,
  timeout_seconds INTEGER,
  spawned_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Agent context snapshots (for compaction)
CREATE TABLE IF NOT EXISTS agent_context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE NOT NULL,
  snapshot_type TEXT DEFAULT 'compaction', -- 'compaction', 'checkpoint', 'summary'
  summary TEXT NOT NULL,
  original_message_count INTEGER,
  compressed_message_count INTEGER,
  tokens_saved INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_session_key ON agent_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_created_at ON session_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_status ON tool_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_memory_entries_agent_id ON agent_memory_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_entries_memory_type ON agent_memory_entries(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_run_queue_session_id ON agent_run_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_queue_status ON agent_run_queue(status);
CREATE INDEX IF NOT EXISTS idx_agent_run_queue_run_id ON agent_run_queue(run_id);

-- Enable Row Level Security
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE subagent_spawns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own agent data)
CREATE POLICY "Users can view their own agent sessions"
  ON agent_sessions FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own agent sessions"
  ON agent_sessions FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own agent sessions"
  ON agent_sessions FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own session messages"
  ON session_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own session messages"
  ON session_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own tool executions"
  ON tool_executions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own tool executions"
  ON tool_executions FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own memory entries"
  ON agent_memory_entries FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own memory entries"
  ON agent_memory_entries FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own tool policies"
  ON agent_tool_policies FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own tool policies"
  ON agent_tool_policies FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own run queue"
  ON agent_run_queue FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own run queue"
  ON agent_run_queue FOR ALL
  USING (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own subagent spawns"
  ON subagent_spawns FOR SELECT
  USING (
    parent_session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own subagent spawns"
  ON subagent_spawns FOR ALL
  USING (
    parent_session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own context snapshots"
  ON agent_context_snapshots FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own context snapshots"
  ON agent_context_snapshots FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM agent_sessions WHERE agent_id IN (
        SELECT id FROM agents WHERE user_id = auth.uid()
      )
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_memory_entries_updated_at
  BEFORE UPDATE ON agent_memory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tool_policies_updated_at
  BEFORE UPDATE ON agent_tool_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
