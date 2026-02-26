-- Migration: Desktops (HappyCapy-style workspace per conversation)
-- One desktop = one workspace with chat, uploads, output, project instructions.
-- desktop id is used as session_id for messages and execution_logs.

CREATE TABLE IF NOT EXISTS desktops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  project_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desktops_user_id ON desktops(user_id);
CREATE INDEX IF NOT EXISTS idx_desktops_updated_at ON desktops(updated_at DESC);

ALTER TABLE desktops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their desktops"
  ON desktops FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE desktops IS 'Workspace per conversation (HappyCapy-style). id is used as session_id for messages.';
