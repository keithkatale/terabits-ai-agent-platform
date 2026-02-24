-- Add Gemini 2.5 Flash to token_pricing so /api/chat/run and credit calculation work without "Using default pricing" fallback.
-- See https://ai.google.dev/gemini-api/docs/models

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
) VALUES (
  'gemini-2.5-flash',
  'gemini',
  'flash',
  0.0000005,
  0.000003,
  2.5,
  0.003,
  1,
  'Gemini 2.5 Flash: price-performance, reasoning; $0.50/$3 per 1M tokens'
)
ON CONFLICT (model_name) DO UPDATE SET
  prompt_token_price_usd = EXCLUDED.prompt_token_price_usd,
  completion_token_price_usd = EXCLUDED.completion_token_price_usd,
  updated_at = NOW(),
  notes = EXCLUDED.notes;
