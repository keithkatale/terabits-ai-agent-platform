-- Migration: scheduled_tasks for Phase 3 Desktop Workspace
-- Tasks run at run_at via cron; RLS so users only see their own.

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desktop_id UUID NOT NULL REFERENCES desktops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT scheduled_tasks_status_check CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_desktop_id ON scheduled_tasks(desktop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_run_at_status ON scheduled_tasks(run_at) WHERE status = 'pending';

ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own scheduled_tasks"
  ON scheduled_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE scheduled_tasks IS 'Tasks to run at run_at (cron); payload holds task/description for chat/run.';
