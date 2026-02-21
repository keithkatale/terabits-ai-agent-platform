-- Migration: Allow guest agents (nullable user_id)
-- Date: 2025-02-21
-- Description: Allow agents to be created without a user_id for guest/unauthenticated building

-- Make user_id nullable to support guest agents
ALTER TABLE agents ALTER COLUMN user_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN agents.user_id IS 'Owner of this agent. NULL for guest agents created without authentication.';
