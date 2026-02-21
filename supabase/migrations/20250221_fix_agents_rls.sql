-- Migration: Fix RLS policy for guest agents
-- Date: 2025-02-21
-- Description: Allow inserting agents with NULL user_id for guest/unauthenticated building

-- First, check and disable existing policies if they're too restrictive
-- Drop the old policy if it exists and recreate it to allow guest agents
DROP POLICY IF EXISTS "Users can insert agents" ON agents;
DROP POLICY IF EXISTS "Users can update own agents" ON agents;
DROP POLICY IF EXISTS "Users can delete own agents" ON agents;
DROP POLICY IF EXISTS "Users can view own agents" ON agents;

-- Create new policies that allow guest agents (user_id = NULL)
CREATE POLICY "Allow insert agents (own or guest)"
  ON agents
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY "Allow update own or guest agents"
  ON agents
  FOR UPDATE
  USING (
    user_id IS NULL OR user_id = auth.uid()
  )
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY "Allow delete own or guest agents"
  ON agents
  FOR DELETE
  USING (
    user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY "Allow read own or guest agents"
  ON agents
  FOR SELECT
  USING (
    user_id IS NULL OR user_id = auth.uid()
  );
