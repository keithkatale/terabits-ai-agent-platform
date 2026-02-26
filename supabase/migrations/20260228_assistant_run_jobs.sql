-- Assistant run jobs: accept-then-run for long-lived chat runs.
-- Worker polls this table, runs streamText, writes events to assistant_run_events.
-- session_id = desktop id (same as messages.session_id).

CREATE TABLE IF NOT EXISTS assistant_run_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES desktops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'error', 'timeout')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_assistant_run_jobs_status ON assistant_run_jobs(status) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_assistant_run_jobs_run_id ON assistant_run_jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_assistant_run_jobs_session_id ON assistant_run_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_run_jobs_created_at ON assistant_run_jobs(created_at DESC);

ALTER TABLE assistant_run_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assistant run jobs"
  ON assistant_run_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistant run jobs"
  ON assistant_run_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Worker uses service role to UPDATE; no user policy for UPDATE needed for app.

-- Stream events for SSE replay by runId (worker writes, client reads via stream endpoint)
CREATE TABLE IF NOT EXISTS assistant_run_events (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES assistant_run_jobs(run_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_run_events_run_sequence ON assistant_run_events(run_id, sequence);

ALTER TABLE assistant_run_events ENABLE ROW LEVEL SECURITY;

-- Users can only read events for runs they own (via run_id -> assistant_run_jobs.user_id)
CREATE POLICY "Users can view events for own runs"
  ON assistant_run_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assistant_run_jobs j
      WHERE j.run_id = assistant_run_events.run_id AND j.user_id = auth.uid()
    )
  );

-- Worker uses service role to INSERT events.

COMMENT ON TABLE assistant_run_jobs IS 'Queued assistant chat runs; worker processes and writes to assistant_run_events.';
COMMENT ON TABLE assistant_run_events IS 'SSE stream events per run_id for GET /api/chat/stream.';
