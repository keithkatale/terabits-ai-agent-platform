# Pricing Breakdown Summary

Complete pricing analysis for Terabits AI Agent Platform (Feb 2026)

---

## Your Current Credit Packages

| Tier | Price | Credits | Value/Credit | Monthly Users | Est. Revenue |
|------|-------|---------|--------------|---------------|-------------|
| **FREE** | $0 | 500 | N/A | TBD | $0 |
| **SMALL** | $20 | 5,000 | $0.004 | ? | ? |
| **MEDIUM** | $30 | 8,000 | $0.00375 | ? | ? |
| **LARGE** | $40 | 11,000 | $0.00364 | ? | ? |
| **XL** | $50 | 15,000 | $0.00333 | ? | ? |

---

## AI Model Costs (per 1 Million tokens)

### GEMINI MODELS (Current)

| Model | Input | Output | Avg (50/50) | Token Equiv<br/>(500 credits) | Token Equiv<br/>(5K credits) |
|-------|-------|--------|------------|------------------------------|------------------------------|
| **Gemini 3.1 Pro** | $2 | $12 | **$7** | 107,143 | 1,071,429 |
| **Gemini 3 Pro** | $2 | $12 | **$7** | 107,143 | 1,071,429 |
| **Gemini 3 Flash** | $0.50 | $3 | **$1.75** | 428,571 | 4,285,714 |
| **Gemini 3 Pro Image** | $2 | $0.134 | **$1.067** | 703,199 | 7,031,993 |

### CLAUDE MODELS (RECOMMENDED FOR AGENTS)

| Model | Input | Output | Avg (50/50) | Token Equiv<br/>(500 credits) | Token Equiv<br/>(5K credits) |
|-------|-------|--------|------------|------------------------------|------------------------------|
| **Claude Opus 4.6** | $5 | $25 | **$15** | 50,000 | 500,000 |
| **Claude Sonnet 4.6** | $3 | $15 | **$9** | 83,333 | 833,333 |
| **Claude Haiku 4.5** | $1 | $5 | **$3** | 250,000 | 2,500,000 |

---

## Actual Cost-to-You Analysis

**Assumption**: 3x markup on AI costs (covers platform overhead + 60% profit margin)

### Scenario 1: Free Tier User (500 credits/month)

| Model | Tokens Available | AI Cost | With Markup | Credits Worth | Your Loss |
|-------|-----------------|---------|------------|---------------|----------|
| Claude Sonnet | 92,593 tokens | $0.83 | $2.49 | $0.83 | **-$2.49** |
| Gemini Flash | 571,429 tokens | $1.00 | $3.00 | $1.00 | **-$3.00** |

👎 **Verdict**: Free tier is a loss leader. Mitigate with 24-hour rate limit.

---

### Scenario 2: SMALL Tier ($20 / 5K credits)

| Model | Tokens Available | AI Cost | With 2.5x Markup | Your Revenue | Profit |
|-------|-----------------|---------|-----------------|-------------|--------|
| Claude Sonnet | 925,926 tokens | $8.33 | $20.83 | $20.00 | **-$0.83** |
| Gemini Flash | 5,714,286 tokens | $10.00 | $25.00 | $20.00 | **-$5.00** |

⚠️ **Issue**: Cost is slightly higher than selling price! Need higher markup (3x) or reduce credits.

**Fix**: Increase to 2.5x works if users don't hit limits. If they use ALL tokens:
- You lose $0.83 per Small tier user
- But most users won't maximize usage

---

### Scenario 3: MEDIUM Tier ($30 / 8K credits)

| Model | Tokens Available | AI Cost @ Markup 2.5x | Your Revenue | Profit |
|-------|-----------------|------|-------------|--------|
| Claude Sonnet | 1,481,481 tokens | $13.33 | $30.00 | **+$16.67** |
| Gemini Flash | 9,142,857 tokens | $16.00 | $30.00 | **+$14.00** |

✅ **Good margin**: 33-56% profit even if user maxes out tokens.

---

### Scenario 4: LARGE Tier ($40 / 11K credits)

| Model | Tokens Available | AI Cost @ Markup 2.5x | Your Revenue | Profit |
|-------|-----------------|------|-------------|--------|
| Claude Sonnet | 2,037,037 tokens | $18.33 | $40.00 | **+$21.67** |
| Gemini Flash | 12,571,429 tokens | $22.00 | $40.00 | **+$18.00** |

✅ **Healthy margins**: 45-54% profit.

---

### Scenario 5: XL Tier ($50 / 15K credits)

| Model | Tokens Available | AI Cost @ Markup 2.5x | Your Revenue | Profit |
|-------|-----------------|------|-------------|--------|
| Claude Sonnet | 2,777,778 tokens | $25.00 | $50.00 | **+$25.00** |
| Gemini Flash | 17,142,857 tokens | $30.00 | $50.00 | **+$20.00** |

✅ **Solid margins**: 40-50% profit.

---

## Profit Summary (All Tiers Combined)

| Tier | You Charge | Cost to You | Profit/(Loss) | Margin |
|------|-----------|-----------|---------------|--------|
| FREE (500cr) | $0 | $2.50 | **-$2.50** | ∞ loss |
| SMALL (5Kcr) | $20 | $20.83 | **-$0.83** | -4% 🚨 |
| MEDIUM (8Kcr) | $30 | $13.33 | **+$16.67** | +56% ✅ |
| LARGE (11Kcr) | $40 | $18.33 | **+$21.67** | +54% ✅ |
| XL (15Kcr) | $50 | $25.00 | **+$25.00** | +50% ✅ |

---

## Recommendation: Fix the SMALL Tier

**Option A: Increase Price to $25 (keep 5K credits)**
- Cost: $20.83 → Revenue: $25 → Profit: +$4.17 (20%)
- Users see it as fair ($20→$25 is only 25% increase)

**Option B: Reduce Credits to 4K (keep $20 price)**
- Cost: $16.67 → Revenue: $20 → Profit: +$3.33 (20%)
- Moves users toward Medium tier faster

**Option C: Increase Markup to 3x**
- Cost becomes: $20.83 × (3/2.5) = $25 → Revenue: $20 → Profit: -$5
- Won't help; need both markup and price/credits adjustment

**My Recommendation**: **Option A** ($25 for 5K) — transparent pricing with healthy 20% margin.

---

## Monthly Revenue Forecast (Example)

### Assumptions:
- 100 users total
- 80 free tier, 10 Small, 5 Medium, 3 Large, 2 XL
- Average token usage: 60% of available (conservative)

| Tier | Users | Revenue | Avg Cost | Avg Profit | Monthly Total |
|------|-------|---------|----------|------------|---------------|
| FREE | 80 | $0 | $1.50 | -$1.50 | -$120 |
| SMALL | 10 | $20 | $12.50 | +$7.50 | +$75 |
| MEDIUM | 5 | $30 | $8 | +$22 | +$110 |
| LARGE | 3 | $40 | $11 | +$29 | +$87 |
| XL | 2 | $50 | $15 | +$35 | +$70 |
| **TOTAL** | **100** | **$540** | **$48** | **+$492** | **+$222** |

**Bottom Line**: At breakeven with 100 users (if you fix Small tier), 91% profitable per user.

---

## Token-to-Credit Conversion Formula

```
Given:
  prompt_tokens = P
  completion_tokens = C
  prompt_price = $pp per token
  completion_price = $cp per token
  markup = 2.5x
  credit_value = $0.003 per credit

Calculate:
  1. AI Cost = (P × pp) + (C × cp)
  2. Platform Cost = AI Cost × 2.5
  3. Credits = max(ceil(Platform Cost ÷ 0.003), 1)
```

**Example** (Claude Sonnet, 1000 token request):
```
P = 600, C = 400
pp = $0.000003, cp = $0.000015

1. AI Cost = (600 × 0.000003) + (400 × 0.000015)
           = $0.0018 + $0.006
           = $0.0078

2. Platform Cost = $0.0078 × 2.5 = $0.0195

3. Credits = ceil($0.0195 ÷ $0.003) = ceil(6.5) = 7 credits
```

---

## Q&A

**Q: Why 2.5x markup?**
A: Covers Supabase, infrastructure, payment processing, support. 60% margin after costs is standard SaaS.

**Q: Should I adjust the markup per model?**
A: Yes! Cheap models (Flash) can have 3x markup; expensive models (Opus) can have 2x. But simpler to keep uniform for now.

**Q: What if tokens costs change?**
A: Update `token_pricing` table quarterly. No code changes needed. System recalculates automatically.

**Q: Can I offer discounts?**
A: Yes! Create a discount tier in `credit_packages` or apply post-purchase credits via API.

**Q: How do I handle overages?**
A: Current system auto-fails if user lacks credits. Could allow negative balance with debt tracking (advanced feature).

---

## Next Steps

1. **Run the migration**: `supabase db push`
2. **Update agent-executor.ts**: Add `useTokenCredits()` call
3. **Adjust SMALL tier pricing**: Increase to $25 or reduce to 4K credits
4. **Monitor**: Track actual token usage vs. estimates
5. **Communicate**: Update pricing page with transparent token-to-credit math

---

Generated: Feb 22, 2026
