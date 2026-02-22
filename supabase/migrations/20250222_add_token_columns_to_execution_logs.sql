/**
 * Migration: Add Dedicated Token Columns to execution_logs
 * Date: 2025-02-22
 * Purpose: Enable direct SQL queries on token usage without accessing JSONB output
 *
 * Previously, token data was nested: output.tokens_used, output.prompt_tokens, etc.
 * This prevents efficient queries and cross-system calculations.
 *
 * Now adding top-level columns for:
 * - prompt_tokens: AI API input tokens
 * - completion_tokens: AI API output tokens
 * - total_tokens: sum of prompt + completion (set directly, not GENERATED)
 * - credits_used: platform credits deducted from user account
 */

-- Add dedicated token and credit columns to execution_logs
ALTER TABLE execution_logs
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- Indexes for analytics and reporting queries
CREATE INDEX IF NOT EXISTS idx_execution_logs_total_tokens
  ON execution_logs(agent_id, total_tokens)
  WHERE total_tokens > 0;

CREATE INDEX IF NOT EXISTS idx_execution_logs_credits_used
  ON execution_logs(agent_id, credits_used)
  WHERE credits_used > 0;

-- Combined index for cost analysis (tokens × credits)
CREATE INDEX IF NOT EXISTS idx_execution_logs_agent_tokens_credits
  ON execution_logs(agent_id, created_at, total_tokens, credits_used)
  WHERE status = 'completed';
