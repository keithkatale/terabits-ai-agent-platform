# Credit System Integration Guide

Complete guide to token-based credit deduction in Terabits AI Agent Platform.

## Overview

The credit system ties user costs directly to **actual AI token usage**:

1. User runs an agent with Claude/Gemini model
2. Model uses X prompt tokens + Y completion tokens
3. Calculate cost: `(X × prompt_price) + (Y × completion_price) × 2.5 markup`
4. Convert to credits: `cost ÷ $0.003 per credit`
5. Deduct from user balance

**Example**: A 1,000-token request with Claude Sonnet costs ~2 credits.

---

## Architecture

### Files & Their Purpose

| File | Purpose |
|------|---------|
| `lib/payments/token-to-credit-converter.ts` | Core logic: tokens → credits calculation |
| `lib/payments/use-token-credits.ts` | Integration hooks for agent-executor |
| `app/api/pricing/models/route.ts` | Public API: pricing info & cost estimation |
| `supabase/migrations/20250222_add_token_tracking_to_executions.sql` | Schema: new columns on agent_executions |

### Database Schema

#### `agent_executions` (new columns)
```sql
prompt_tokens INTEGER         -- Tokens sent to model
completion_tokens INTEGER     -- Tokens returned by model
total_tokens INTEGER          -- Generated column (prompt + completion)
ai_cost_usd DECIMAL(10,6)     -- Raw provider cost
platform_cost_usd DECIMAL     -- Cost after 2.5x markup
credits_consumed INTEGER      -- Final credit deduction
```

#### `token_pricing` (new table)
```sql
model_name TEXT               -- 'claude-sonnet-4-6', 'gemini-3-1-pro', etc.
prompt_token_price_usd        -- Price per prompt token
completion_token_price_usd    -- Price per completion token
platform_markup_multiplier    -- Default 2.5x
credit_value_usd              -- Default $0.003 per credit
minimum_credit_cost INTEGER   -- Minimum 1 credit per execution
```

Seeded with current rates for:
- ✅ Gemini 3.1 Pro, 3 Pro, 3 Flash, 3 Pro Image
- ✅ Claude Opus 4.6, Sonnet 4.6, Haiku 4.5

---

## Integration Steps

### 1. Run the Migration

```bash
# Apply the migration to create new tables/columns
supabase migration up

# Or manually in Supabase dashboard:
# Copy contents of: supabase/migrations/20250222_add_token_tracking_to_executions.sql
```

### 2. Update Agent Executor

In `lib/execution-engine/agent-executor.ts`, after calling `streamText()`:

```typescript
import { useTokenCredits, checkCreditAvailability } from '@/lib/payments/use-token-credits'

// BEFORE execution: check if user has enough credits
const creditCheck = await checkCreditAvailability(
  userId,
  1000, // estimated tokens
  'claude-sonnet-4-6'
)

if (!creditCheck.hasEnoughCredits) {
  throw new Error(`Insufficient credits. Need ${creditCheck.shortfall} more.`)
}

// EXECUTE the agent
const result = await streamText({
  model: geminiModel,
  // ... other params
})

// AFTER execution: process token usage and deduct credits
await useTokenCredits({
  modelName: 'claude-sonnet-4-6',
  promptTokens: result.usage?.promptTokens || 0,
  completionTokens: result.usage?.completionTokens || 0,
  executionId: execution.id,
  userId: userId,
  agentId: agentId,
})
```

### 3. Update Rate Limiting Middleware

In your pre-execution checks:

```typescript
// Already implemented, just needs to be called:
const canRun = await creditsService.canPerformAction(userId, 'run_agent')
if (!canRun.allowed) {
  return NextResponse.json(
    { error: canRun.reason },
    { status: 429 }
  )
}

// After successful execution:
await creditsService.updateLastAgentRun(userId)
```

---

## Usage Examples

### Example 1: Calculate Cost for a Request

```typescript
import { tokenConverter } from '@/lib/payments/token-to-credit-converter'

const cost = await tokenConverter.calculateCredits('claude-sonnet-4-6', {
  promptTokens: 200,
  completionTokens: 150,
})

console.log(cost)
// {
//   aiCostUsd: 0.000750,
//   platformCostUsd: 0.001875,
//   creditsConsumed: 1,
//   creditsValue: "1 credit = $0.0030"
// }
```

### Example 2: Estimate Monthly Cost

```typescript
const estimate = await tokenConverter.estimateMonthlyCost(
  'claude-sonnet-4-6',
  10000, // estimated daily tokens
  30 // days per month
)

console.log(estimate)
// {
//   estimatedMonthlyTokens: 300000,
//   estimatedMonthlyCost: 0.45,
//   estimatedMonthlyCredits: 150,
//   recommendedPlan: "Small ($20 - 5K credits)"
// }
```

### Example 3: Batch Calculate Multiple Requests

```typescript
const batch = await tokenConverter.calculateBatchCredits([
  { modelName: 'claude-sonnet-4-6', usage: { promptTokens: 100, completionTokens: 50 } },
  { modelName: 'gemini-3-flash', usage: { promptTokens: 200, completionTokens: 100 } },
  { modelName: 'claude-haiku-4-5', usage: { promptTokens: 50, completionTokens: 30 } },
])

// Returns array of cost calculations for each request
```

### Example 4: Get Pricing for UI Display

```typescript
// In a page component or API route
import { getPricingInfo } from '@/lib/payments/use-token-credits'

const pricing = await getPricingInfo('claude-sonnet-4-6')

console.log(pricing.exampleCosts)
// {
//   '100 tokens': { creditsConsumed: 1, aiCostUsd: 0.00006, ... },
//   '500 tokens': { creditsConsumed: 1, aiCostUsd: 0.0003, ... },
//   '1000 tokens': { creditsConsumed: 1, aiCostUsd: 0.0006, ... }
// }
```

### Example 5: Check Credit Availability Before Execution

```typescript
import { checkCreditAvailability } from '@/lib/payments/use-token-credits'

const check = await checkCreditAvailability(
  userId,
  2000, // estimated tokens
  'claude-opus-4-6'
)

if (!check.hasEnoughCredits) {
  console.log(`Need ${check.shortfall} more credits`)
  // Show upgrade page
}
```

---

## API Endpoints

### GET /api/pricing/models

Returns all model pricing and credit packages.

**Response:**
```json
{
  "models": {
    "CLAUDE": {
      "SONNET": {
        "modelName": "claude-sonnet-4-6",
        "promptPricePerMillionTokens": 3,
        "completionPricePerMillionTokens": 15,
        "averagePrice": 9,
        "creditValue": 0.003,
        "exampleCosts": {
          "100_tokens": 1,
          "500_tokens": 1,
          "1000_tokens": 1,
          "5000_tokens": 5
        }
      }
    }
  },
  "creditPackages": [ ... ],
  "creditValueUsd": 0.003,
  "platformMarkupMultiplier": 2.5
}
```

### POST /api/pricing/estimate

Estimate cost for hypothetical usage.

**Request:**
```json
{
  "modelName": "claude-sonnet-4-6",
  "promptTokens": 500,
  "completionTokens": 300
}
```

**Response:**
```json
{
  "modelName": "claude-sonnet-4-6",
  "promptTokens": 500,
  "completionTokens": 300,
  "totalTokens": 800,
  "aiCostUsd": 0.003,
  "platformCostUsd": 0.0075,
  "creditsConsumed": 3,
  "creditsValue": "1 credit = $0.0030"
}
```

---

## Pricing Configuration

All pricing is stored in the `token_pricing` table and can be updated without code changes.

### Current Rates (Feb 2026)

| Model | Input | Output | Avg | Credits for 1K tokens |
|-------|-------|--------|-----|----------------------|
| Claude Opus 4.6 | $5 | $25 | $15M | 5 |
| Claude Sonnet 4.6 | $3 | $15 | $9M | 3 |
| Claude Haiku 4.5 | $1 | $5 | $3M | 1 |
| Gemini 3.1 Pro | $2 | $12 | $7M | 2 |
| Gemini 3 Flash | $0.50 | $3 | $1.75M | 0.5→1min |

### To Update Pricing

```sql
-- Update Claude Sonnet pricing
UPDATE token_pricing
SET prompt_token_price_usd = 0.000004,  -- New $4/1M rate
    completion_token_price_usd = 0.000018, -- New $18/1M rate
    updated_at = NOW()
WHERE model_name = 'claude-sonnet-4-6'
  AND is_active = true;
```

---

## Profit Margins

Current configuration: **2.5x markup** on AI costs

| Plan | Cost to Us | Markup | You Charge | Profit |
|------|-----------|--------|-----------|--------|
| Free (500 credits/mo) | $0.75 | 2.5x | $0 | **-$0.75** |
| Small ($20 / 5K) | $3.75 | 2.5x | $20 | **+$16.25** |
| Medium ($30 / 8K) | $6 | 2.5x | $30 | **+$24** |
| Large ($40 / 11K) | $8.25 | 2.5x | $40 | **+$31.75** |
| XL ($50 / 15K) | $11.25 | 2.5x | $50 | **+$38.75** |

**Free tier note**: -$0.75/user is customer acquisition cost (1 month worth). Most free users won't hit the limit.

---

## Monitoring & Analytics

### Dashboard Queries

**Top token consumers (past 7 days):**
```sql
SELECT
  user_id,
  SUM(total_tokens) as total_tokens,
  SUM(credits_consumed) as total_credits_used,
  COUNT(*) as execution_count
FROM agent_executions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_tokens DESC
LIMIT 10;
```

**Revenue from paid tier (past month):**
```sql
SELECT
  SUM(credits_consumed) as total_credits_consumed,
  COUNT(*) as execution_count,
  AVG(credits_consumed) as avg_credits_per_run
FROM agent_executions ae
WHERE ae.created_at > NOW() - INTERVAL '30 days'
  AND EXISTS (
    SELECT 1 FROM user_rate_limits url
    WHERE url.user_id = ae.user_id
    AND url.can_deploy_agents = true
  );
```

---

## Future Enhancements

- [ ] Real-time token usage streaming during execution
- [ ] Cost prediction before execution
- [ ] Per-tool token cost breakdown (web_search: 2x more tokens, etc.)
- [ ] Batch API integration (50% discount on tokens)
- [ ] Prompt caching (0.1x token cost for cache hits)
- [ ] Usage alerts ("You've used 80% of your monthly credits")
- [ ] Team/org billing (pool credits across team)

---

## Troubleshooting

**Q: Credits showing as 0 after execution?**
A: Check that `token_pricing` table has an active entry for your model name.

**Q: Calculation seems off?**
A: Verify prompt/completion token counts from model response. Some models include system tokens differently.

**Q: How do I test without depleting real credits?**
A: Create a test user and use the `tokenConverter.clearCache()` method to reload pricing from DB.

---

## Support

For questions about pricing, credit calculations, or integration:
- Email: support@terabits.ai
- Docs: See CLAUDE.md in project root
