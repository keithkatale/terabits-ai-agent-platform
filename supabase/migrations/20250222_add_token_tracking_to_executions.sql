/**
 * Migration: Add Token Tracking & Credit Consumption to Agent Executions
 * Date: 2025-02-22
 * Purpose: Track AI token usage and calculate credit costs based on actual API usage
 */

-- Add token tracking columns to agent_executions
ALTER TABLE agent_executions
ADD COLUMN prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN completion_tokens INTEGER DEFAULT 0,
ADD COLUMN total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
ADD COLUMN ai_cost_usd DECIMAL(10,6) DEFAULT 0,
ADD COLUMN platform_markup_multiplier DECIMAL(3,2) DEFAULT 2.5,
ADD COLUMN platform_cost_usd DECIMAL(10,6) DEFAULT 0,
ADD COLUMN credits_consumed INTEGER DEFAULT 0;

-- Index for credit tracking and reporting
CREATE INDEX idx_agent_executions_credits_consumed
  ON agent_executions(user_id, credits_consumed)
  WHERE credits_consumed > 0;

CREATE INDEX idx_agent_executions_tokens_used
  ON agent_executions(user_id, total_tokens)
  WHERE total_tokens > 0;

-- Token pricing configuration table (updated quarterly as rates change)
CREATE TABLE IF NOT EXISTS token_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identification
  model_name TEXT UNIQUE NOT NULL,      -- e.g., 'gemini-3-1-pro', 'claude-sonnet-4-6'
  model_family TEXT NOT NULL,           -- e.g., 'gemini', 'claude'
  model_tier TEXT NOT NULL,             -- e.g., 'flash', 'pro', 'sonnet'

  -- Per-token pricing (in USD)
  prompt_token_price_usd DECIMAL(12,10) NOT NULL,      -- per token
  completion_token_price_usd DECIMAL(12,10) NOT NULL,  -- per token (usually higher)

  -- Platform economics
  platform_markup_multiplier DECIMAL(3,2) DEFAULT 2.5,  -- 2.5x = cover costs + 60% margin
  credit_value_usd DECIMAL(8,6) DEFAULT 0.003,          -- What 1 credit is worth ($0.003)
  minimum_credit_cost INTEGER DEFAULT 1,                -- Minimum 1 credit per execution

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for pricing lookup
CREATE INDEX idx_token_pricing_active
  ON token_pricing(model_name)
  WHERE is_active = true;

-- Seed with current rates (Gemini)
INSERT INTO token_pricing (
  model_name,
  model_family,
  model_tier,
  prompt_token_price_usd,
  completion_token_price_usd,
  platform_markup_multiplier,
  credit_value_usd,
  minimum_credit_cost,
  notes
) VALUES
  -- Gemini Models
  ('gemini-3-1-pro-preview', 'gemini', 'pro',
   0.000002, 0.000012,
   2.5, 0.003, 1,
   'Gemini 3.1 Pro: $2/$12 per 1M tokens'),

  ('gemini-3-pro-preview', 'gemini', 'pro',
   0.000002, 0.000012,
   2.5, 0.003, 1,
   'Gemini 3 Pro: $2/$12 per 1M tokens'),

  ('gemini-3-flash-preview', 'gemini', 'flash',
   0.0000005, 0.000003,
   2.5, 0.003, 1,
   'Gemini 3 Flash: $0.50/$3 per 1M tokens'),

  ('gemini-3-pro-image-preview', 'gemini', 'image',
   0.000002, 0.000000134,
   2.5, 0.003, 2,
   'Gemini 3 Pro Image: $2 text / $0.134 image per 1M tokens'),

  -- Claude Models (Recommended for agents)
  ('claude-opus-4-6', 'claude', 'opus',
   0.000005, 0.000025,
   2.5, 0.003, 1,
   'Claude Opus 4.6: $5/$25 per 1M tokens - Best for reasoning'),

  ('claude-sonnet-4-6', 'claude', 'sonnet',
   0.000003, 0.000015,
   2.5, 0.003, 1,
   'Claude Sonnet 4.6: $3/$15 per 1M tokens - Balanced'),

  ('claude-haiku-4-5', 'claude', 'haiku',
   0.000001, 0.000005,
   2.5, 0.003, 1,
   'Claude Haiku 4.5: $1/$5 per 1M tokens - Fast & cheap');

-- Audit table for pricing changes
CREATE TABLE IF NOT EXISTS token_pricing_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_id UUID NOT NULL REFERENCES token_pricing(id),
  changed_by TEXT,
  old_prompt_price DECIMAL(12,10),
  new_prompt_price DECIMAL(12,10),
  old_completion_price DECIMAL(12,10),
  new_completion_price DECIMAL(12,10),
  old_markup DECIMAL(3,2),
  new_markup DECIMAL(3,2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only see their own execution tokens/credits
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own execution tokens"
  ON agent_executions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can update pricing
CREATE POLICY "Admins can manage token pricing"
  ON token_pricing
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@terabits.%'
    )
  );

-- Grant permissions
GRANT SELECT ON token_pricing TO authenticated;
GRANT SELECT ON token_pricing_audit TO authenticated;
GRANT SELECT, UPDATE ON agent_executions TO authenticated;
