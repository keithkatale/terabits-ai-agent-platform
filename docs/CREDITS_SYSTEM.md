# Terabits Credits System

## Overview

Terabits uses a credit-based pricing model instead of traditional subscriptions. Users buy credit packages and consume credits when running agents.

### Why Credits?

- **Cost Control**: Users pay only for what they use
- **Predictable Costs**: We don't lose money if agents consume more API resources than expected
- **Flexible Pricing**: Easy to offer different package sizes with better rates for larger purchases
- **No Monthly Surprises**: No recurring charges; credits roll over

---

## Pricing Structure

### Free Plan
- **Cost**: $0
- **Credits/month**: 500 free credits
- **Limitations**:
  - Run agents once every 24 hours
  - Cannot deploy agents publicly
  - Cannot share agent outputs
  - Cannot export/download results

### Credit Packages (One-Time Purchase)

| Package | Price | Credits | Cost/Credit |
|---------|-------|---------|-------------|
| Small   | $20   | 5,000   | 0.4¢        |
| Medium  | $30   | 8,000   | 0.375¢      |
| Large   | $40   | 11,000  | 0.364¢      |
| XL      | $50   | 15,000  | 0.333¢      |

### Enterprise Plan
- **Cost**: $200+/month
- **Details**: Custom agents built by our team
- **Process**: Contact sales team

---

## User Journey

### 1. Sign Up (Free Plan)
```
User creates account
  ↓
Allocated 500 free credits
  ↓
Can build unlimited agents
  ↓
Can run agent once per 24 hours
  ↓
Limitations: No deploy, no share
```

### 2. Upgrade to Paid (Buy Credits)
```
User clicks "Buy Credits"
  ↓
Choose package ($20, $30, $40, $50)
  ↓
Dodo Payments checkout
  ↓
Payment successful
  ↓
Credits added to account
  ↓
Instant upgrade: Can deploy + share
  ↓
No 24-hour rate limits anymore
```

### 3. Use Credits
```
User runs agent
  ↓
Credits deducted based on:
  - Agent complexity
  - Tools used
  - API calls made
  ↓
Transaction recorded in history
  ↓
When credits = 0
  ↓
Can buy more anytime
```

---

## Credit Consumption Model

Credits are deducted based on agent execution complexity:

### Base Credit Cost
- Simple agent run: 10 credits
- Web search: +5 credits per query
- Web scrape: +3 credits per page
- Email send: +2 credits per email
- Image generation: +50 credits per image
- API call: +3 credits per request

**Note**: These are initial estimates and will be refined based on actual API costs.

### Example Scenarios

#### Free Tier User
```
User builds agent that:
  - Searches web (5 credits)
  - Scrapes 2 pages (6 credits)
  - Sends email (2 credits)
  - Total: 13 credits

User has 500 free credits
  ↓
After run: 487 credits remain
  ↓
Next run: Available tomorrow (24-hour limit)
  ↓
When free credits depleted
  ↓
Upgrade required to continue
```

#### Paid Tier User
```
Same agent run: 13 credits
User has 8,000 credits from $30 package
  ↓
After run: 7,987 credits remain
  ↓
Can run immediately again (no 24-hour limit)
  ↓
Can also deploy publicly + share outputs
```

---

## Implementation Details

### Database Schema

#### `user_credits`
```sql
- user_id (PK)
- balance: current available credits
- total_purchased: all credits ever bought
- total_used: all credits ever consumed
- free_credits_used_this_month: tracks free tier usage
- last_monthly_reset: when free credits reset
```

#### `credit_transactions`
```sql
- id: transaction UUID
- user_id: which user
- transaction_type: 'purchase' | 'usage' | 'free_monthly' | 'refund' | 'adjustment'
- credits_amount: how many (positive/negative)
- balance_before: balance before transaction
- balance_after: balance after transaction
- description: human-readable reason
- dodo_transaction_id: link to Dodo Payments
- created_at: timestamp
```

#### `dodo_payments_orders`
```sql
- id: order UUID
- user_id: who's buying
- credit_package_id: which package
- dodo_order_id: Dodo Payments order ID
- status: 'pending' | 'completed' | 'failed' | 'cancelled'
- amount_usd: price in cents
- credits_purchased: how many credits
```

#### `user_rate_limits`
```sql
- user_id: PK
- last_agent_run: when user last ran an agent
- can_deploy_agents: boolean (false for free tier)
- can_share_outputs: boolean (false for free tier)
```

### API Endpoints

#### `POST /api/payments/checkout`
Initiates credit purchase. Returns payment URL.

```javascript
// Request
{
  "packageId": "uuid-of-credit-package"
}

// Response
{
  "success": true,
  "paymentUrl": "https://dodopayments.com/pay/...",
  "orderId": "uuid-of-order",
  "expiresAt": "2025-02-23T12:00:00Z"
}
```

#### `GET /api/user/credits`
Get current credit balance and limits.

```javascript
// Response
{
  "balance": {
    "userId": "uuid",
    "balance": 487,
    "totalPurchased": 8000,
    "totalUsed": 7513,
    "freeCreditsUsedThisMonth": 12
  },
  "limits": {
    "canDeployAgents": false,
    "canShareOutputs": false,
    "lastAgentRun": "2025-02-22T10:30:00Z"
  }
}
```

#### `POST /api/user/check-action`
Check if user is allowed to perform an action.

```javascript
// Request
{
  "action": "deploy" | "share" | "run_agent"
}

// Response (allowed)
{
  "allowed": true
}

// Response (blocked)
{
  "allowed": false,
  "reason": "Upgrade required to deploy agents"
}
```

#### `POST /api/payments/webhook`
Dodo Payments calls this when payment completes. Automatically adds credits.

---

## Dodo Payments Integration

### Setup Steps

1. **Create Dodo Payments Account**
   - Go to https://dodopayments.com
   - Create account and verify email

2. **Create Credit Products in Dodo Dashboard**
   ```
   Product 1:
   - Name: "5000 Credits"
   - Price: $20.00 USD
   - Description: "5,000 credits for agent runs"

   Product 2:
   - Name: "8000 Credits"
   - Price: $30.00 USD
   - Description: "8,000 credits for agent runs"

   Product 3:
   - Name: "11000 Credits"
   - Price: $40.00 USD
   - Description: "11,000 credits for agent runs"

   Product 4:
   - Name: "15000 Credits"
   - Price: $50.00 USD
   - Description: "15,000 credits for agent runs"
   ```

3. **Get API Keys**
   - Get API Key from Dodo dashboard
   - Get Webhook Secret
   - Copy both to `.env.local`

4. **Configure Webhook**
   - Webhook URL: `https://yourdomain.com/api/payments/webhook`
   - Enable: payment.completed, payment.failed, payment.cancelled

5. **Test in Sandbox**
   - Use `https://sandbox.dodopayments.com/api` in `.env.local`
   - Make test purchase
   - Verify webhook is received and credits added

6. **Deploy to Production**
   - Switch to `https://api.dodopayments.com` in `.env`
   - Verify webhook in production dashboard
   - Start accepting real payments

### Environment Variables

```bash
DODO_API_KEY=pk_live_xxxxx
DODO_API_URL=https://api.dodopayments.com
DODO_WEBHOOK_SECRET=wh_secret_xxxxx
NEXT_PUBLIC_APP_URL=https://terabits.ai
```

---

## Free Tier Monthly Reset

Every month (on signup anniversary), free tier users get:
- 500 new credits
- `free_credits_used_this_month` resets to 0

Implementation:
- Check `last_monthly_reset` before running agent
- If > 30 days, add 500 credits and reset counter
- Record as 'free_monthly' transaction

---

## Upgrade Flow (Free → Paid)

1. Free user clicks "Buy Credits"
2. System checks if user is on free tier
3. Shows credit packages with pricing
4. User selects package (e.g., $30 for 8,000 credits)
5. Redirects to Dodo Payments checkout
6. Payment successful
7. Webhook called → Credits added to account
8. System grants privileges:
   - `can_deploy_agents = true`
   - `can_share_outputs = true`
9. User sees "Upgrade successful" message
10. All paid features now available

---

## Preventing Abuse

### Free Tier Rate Limiting
```typescript
// Check: Can only run once per 24 hours
const lastRun = await getLastAgentRun(userId)
if (!isPaidUser && lastRun && hoursSince(lastRun) < 24) {
  throw new Error("Free tier: 1 run per 24 hours")
}
```

### Insufficient Credits
```typescript
// Check: Enough balance
if (userCredits < requiredCredits) {
  throw new Error("Insufficient credits")
}
```

### Privilege Checks
```typescript
// Before deployment
const allowed = await canPerformAction(userId, 'deploy')
if (!allowed) {
  throw new Error("Upgrade required")
}
```

---

## Monitoring & Analytics

### Key Metrics
- Total users on free tier
- Total users with credits
- Avg credits purchased
- Monthly recurring revenue (MRR) from paid users
- Credit consumption rate per user
- Most expensive agent type (in credits)

### Queries

```sql
-- Revenue per month
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(amount_usd) / 100.0 as revenue,
  COUNT(*) as transactions
FROM dodo_payments_orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month DESC;

-- Top credit consumers
SELECT
  user_id,
  SUM(ABS(credits_amount)) as total_used
FROM credit_transactions
WHERE transaction_type = 'usage'
GROUP BY user_id
ORDER BY total_used DESC
LIMIT 10;

-- Free vs paid users
SELECT
  (SELECT COUNT(*) FROM user_credits WHERE balance <= 500) as free_tier_users,
  (SELECT COUNT(*) FROM user_credits WHERE total_purchased > 0) as paid_users;
```

---

## Future Enhancements

1. **Usage-Based Pricing**
   - Charge per API call made (more granular)
   - Charge per token used in LLM calls
   - Adjust rates based on model (GPT-4 costs more than 3.5)

2. **Subscriptions**
   - Optional: $50/month for 10,000 monthly credits
   - Auto-refill at start of month
   - Unused credits roll over (up to 3 months)

3. **Discounts**
   - Volume discounts: Buy 50K+ credits, get 20% off
   - Team plans: 5 users for $100/month
   - Annual prepay: Pay for 12 months, get 2 free

4. **Overage Protection**
   - Free tier: Soft cap at 500 credits, pause execution
   - Paid tier: Optional hard cap to prevent surprises

5. **Credits Marketplace**
   - Users can buy/sell credits to each other
   - Enables credit pooling for teams

---

## Troubleshooting

### Payment Failed
- Check Dodo API key is correct
- Verify webhook URL is accessible
- Check webhook secret in env vars
- Look at Dodo dashboard for error details

### Credits Not Added
- Check webhook is being called
- Verify signature verification passes
- Check database for `dodo_payments_orders` record
- Look at server logs for errors

### User Locked Out (Free Tier)
- They've used 500 monthly credits
- Option 1: Buy credits (immediately upgraded)
- Option 2: Wait for monthly reset (next signup date)
- Admin can manually adjust if needed

### Incorrect Credit Cost
- Adjust pricing in `credits-service.ts`
- Create migration to add credit cost to tool definitions
- Update based on actual API costs

---

## References

- [Dodo Payments Docs](https://docs.dodopayments.com)
- [Dodo API Reference](https://docs.dodopayments.com/api)
- [Subscription Features](https://docs.dodopayments.com/features/subscription)
