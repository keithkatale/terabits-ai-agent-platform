# Dodo Payments Overlay Checkout Setup Guide

## Overview

This guide covers the complete setup for Dodo Payments overlay checkout integration with popup modal display (no page navigation required).

## Architecture

```
User clicks "Buy Credits"
        ↓
Frontend calls POST /api/payments/checkout
        ↓
Backend creates order record + checkout session
        ↓
Backend returns checkoutUrl
        ↓
Frontend opens DodoPayments.Checkout.open(checkoutUrl)
        ↓
Popup modal displays payment form
        ↓
User enters payment details
        ↓
Payment processed
        ↓
Webhook fired: POST /api/payments/webhook
        ↓
Backend verifies signature, adds credits
        ↓
Frontend redirect to /payments/success
```

## Product IDs (Already Created in Dodo Dashboard)

```
5,000 Credits   → pdt_0NZ2Nd7aaGSspgus57h5C  ($20)
8,000 Credits   → pdt_0NZ2NXjwIZyuvyR6YHDJm  ($30)
11,000 Credits  → pdt_0NZ2NJoq334gbGHYvofsW  ($40)
15,000 Credits  → pdt_0NZ2NEYZXmDRX8QNYPFXX  ($50)
```

## Setup Steps

### 1. Get API Key (Test Mode)

1. Go to https://dashboard.dodopayments.com
2. Navigate to **Developer** → **API Keys**
3. You should see TEST and LIVE tabs
4. In **TEST** tab, click "Create API Key"
5. Copy the key (starts with `sk_test_`)
6. Add to `.env.local`:

```bash
DODO_API_KEY=sk_test_xxxxx
```

### 2. Get Webhook Secret (Test Mode)

1. In Dodo dashboard, go to **Webhooks**
2. Click "Create Webhook"
3. Enter webhook URL:
   ```
   https://localhost:3000/api/payments/webhook
   ```
   (for production: `https://terabits.ai/api/payments/webhook`)
4. Select events:
   - ✓ `checkout.session.completed`
   - ✓ `checkout.session.failed`
   - ✓ `checkout.session.expired`
5. Copy the webhook secret (starts with `wh_test_`)
6. Add to `.env.local`:

```bash
DODO_WEBHOOK_SECRET=wh_test_xxxxx
```

### 3. Configure Environment Variables

Create/update `.env.local` with:

```bash
# Dodo Payments (Test Mode)
DODO_API_KEY=sk_test_xxxxx
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=wh_test_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Database Migration

The migration creates these tables:
- `credit_packages` - Product definitions
- `user_credits` - Per-user balances
- `credit_transactions` - Transaction audit trail
- `dodo_payments_orders` - Payment records
- `user_rate_limits` - Free tier restrictions

Run the migration:

```bash
# Via Supabase CLI
supabase db push

# Or manually in Supabase dashboard:
# Copy and run the SQL from: supabase/migrations/20250222_add_credits_system.sql
```

The migration automatically inserts credit packages with correct pricing.

### 5. Link Dodo Product IDs to Database (Optional)

If packages weren't created by migration, update them:

```sql
-- In Supabase SQL editor or psql:
UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2Nd7aaGSspgus57h5C'
WHERE credit_amount = 5000;

UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2NXjwIZyuvyR6YHDJm'
WHERE credit_amount = 8000;

UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2NJoq334gbGHYvofsW'
WHERE credit_amount = 11000;

UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2NEYZXmDRX8QNYPFXX'
WHERE credit_amount = 15000;
```

## Files Involved

### Frontend
- `components/landing/pricing-section.tsx` - Pricing page with "Buy Credits" buttons
- `lib/hooks/useDodoCheckout.ts` - SDK loading + checkout handler
- `lib/hooks/useAuth.ts` - User authentication check
- `app/payments/success/page.tsx` - Success page (redirected after payment)
- `app/payments/cancel/page.tsx` - Cancellation page (user closed modal)

### Backend
- `lib/payments/dodo-client.ts` - Dodo API client
- `app/api/payments/checkout/route.ts` - Creates checkout session
- `app/api/payments/webhook/route.ts` - Handles payment completion
- `lib/payments/credits-service.ts` - Credit balance management
- `app/api/user/credits/route.ts` - Get user balance
- `app/api/user/check-action/route.ts` - Check if action allowed

### Database
- `supabase/migrations/20250222_add_credits_system.sql` - Schema + RLS policies

### Configuration
- `.env.dodo.example` - Template for env variables

## How It Works

### User Flow

1. **View Pricing**
   - User lands on `/#pricing`
   - Sees free plan and 4 credit packages
   - SDK automatically loads in background

2. **Click "Buy Credits"**
   - Frontend checks if user is authenticated
   - If not: redirect to `/auth/sign-up?redirect=/pricing`
   - If yes: call `POST /api/payments/checkout`

3. **Backend Creates Checkout Session**
   - Validate package exists and is active
   - Create `dodo_payments_orders` record (status: pending)
   - Call Dodo API: `POST /api/v1/checkout/sessions`
   - Return `checkoutUrl` to frontend

4. **Frontend Opens Popup**
   - Call `DodoPayments.Checkout.open({ checkoutUrl })`
   - Popup modal displays (no page navigation)
   - User enters payment details

5. **Payment Processing**
   - Dodo processes payment
   - SDK fires `onSuccess` or `onError` event
   - If successful: webhook fires automatically

6. **Webhook Verification**
   - POST `/api/payments/webhook`
   - Backend verifies HMAC-SHA256 signature
   - If valid: add credits to user account
   - Update order status to 'completed'
   - Grant deploy/share privileges

7. **Success Redirect**
   - Frontend redirects to `/payments/success?orderId=xxx`
   - Show success message
   - User can go to dashboard or home

## Testing in Test Mode

### Test Credit Card Numbers

Dodo provides test card numbers for testing:

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Exp: 12/25
CVC: 123
```

**Declined Payment:**
```
Card: 4000 0000 0000 0002
Exp: 12/25
CVC: 123
```

### Test Webhook

1. In Dodo dashboard, go to **Webhooks**
2. Find your test webhook
3. Click **Test** button
4. Select event type: `checkout.session.completed`
5. Click **Send**
6. Check backend logs for webhook receipt

### Local Testing Checklist

- [ ] `.env.local` has all 4 Dodo variables
- [ ] User can see pricing page
- [ ] "Buy Credits" button loads SDK (check browser console)
- [ ] Unauthenticated user redirected to signup
- [ ] Authenticated user can click "Buy Credits"
- [ ] Popup modal appears (no page nav)
- [ ] Can enter test card details
- [ ] Webhook fires (check Dodo dashboard logs)
- [ ] Credits added to user account
- [ ] Redirected to success page
- [ ] Can see updated balance

## API Endpoints

### POST /api/payments/checkout

Create checkout session for popup.

**Request:**
```json
{
  "packageId": "pkg-8k"
}
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.dodopayments.com/session/cks_123abc",
  "sessionId": "cks_123abc",
  "orderId": "order-uuid"
}
```

**Errors:**
- 401 Unauthorized - User not authenticated
- 400 Bad Request - Missing packageId or package not active
- 500 Server Error - Failed to create session

### POST /api/payments/webhook

Dodo webhook endpoint (called automatically by Dodo).

**Headers:**
```
Authorization: Bearer sk_test_xxxxx (from Dodo)
X-Dodo-Signature: HMAC-SHA256(raw_body, webhook_secret)
```

**Payload:**
```json
{
  "id": "cks_123abc",
  "status": "completed",
  "amount": 3000,
  "metadata": {
    "userId": "user-uuid",
    "packageId": "pkg-8k",
    "credits": 8000
  },
  "timestamp": "2025-02-22T10:30:00Z"
}
```

### GET /api/user/credits

Get user's current balance and privileges.

**Response:**
```json
{
  "balance": {
    "userId": "user-uuid",
    "balance": 8000,
    "totalPurchased": 8000,
    "totalUsed": 0,
    "freeCreditsUsedThisMonth": 0
  },
  "limits": {
    "canDeployAgents": true,
    "canShareOutputs": true,
    "lastAgentRun": "2025-02-22T10:30:00Z"
  }
}
```

### POST /api/user/check-action

Check if user can perform an action (deploy/share/run_agent).

**Request:**
```json
{
  "action": "deploy"
}
```

**Response (Allowed):**
```json
{
  "allowed": true
}
```

**Response (Blocked):**
```json
{
  "allowed": false,
  "reason": "Upgrade required to deploy agents"
}
```

## SDK Initialization

The `useDodoCheckout` hook automatically:

1. Loads the Dodo SDK script
2. Initializes with test mode
3. Provides `openCheckout()` method
4. Handles loading state

```typescript
const { openCheckout, isProcessing, sdkLoaded } = useDodoCheckout()
```

## Webhook Signature Verification

Dodo uses HMAC-SHA256:

```typescript
const crypto = require('crypto')
const expectedSignature = crypto
  .createHmac('sha256', DODO_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex')

const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
)
```

## Switching to Production

When ready for live payments:

1. **Create Live API Key in Dodo Dashboard**
   - Go to Developer → API Keys → LIVE tab
   - Create API key (starts with `sk_live_`)

2. **Create Live Webhook**
   - Webhooks → Create Webhook
   - URL: `https://terabits.ai/api/payments/webhook`
   - Get webhook secret (starts with `wh_live_`)

3. **Update Environment Variables**

```bash
DODO_API_KEY=sk_live_xxxxx
DODO_API_URL=https://live.dodopayments.com
DODO_WEBHOOK_SECRET=wh_live_xxxxx
NEXT_PUBLIC_APP_URL=https://terabits.ai
```

4. **Update SDK Mode**
   - `useDodoCheckout.ts` will automatically detect `live` mode from base URL
   - No code changes needed!

5. **Test with Real Card**
   - Use actual credit card for test
   - Process will be identical to test flow

## Troubleshooting

### SDK Not Loading
- Check browser console for errors
- Verify Dodo CDN is accessible
- Check network tab for `dodo-checkout.js`

### Checkout Modal Doesn't Open
- Check `checkoutUrl` is valid (starts with `https://checkout.dodopayments.com/session/`)
- Verify SDK loaded successfully (`window.DodoPayments` exists)
- Check browser console for errors

### Webhook Not Firing
- Verify webhook URL is correct and accessible
- Check Dodo dashboard webhook logs
- Verify webhook secret matches env var
- For local testing: use ngrok to expose localhost to internet

### Credits Not Added
- Check webhook was received (Dodo dashboard)
- Verify signature verification passed (check logs)
- Check if order status is 'pending' (webhook should update to 'completed')
- Verify user exists in auth.users

### Payment Declined
- Verify card number is correct test card
- Check Dodo dashboard for error details
- If test card not working: try different test card number

## Monitoring

### Key Metrics to Watch
- Payment success rate
- Webhook delivery success
- Failed signature verifications
- Checkout session creation errors
- Credit balance anomalies

### Useful Queries

```sql
-- Recent payments
SELECT * FROM dodo_payments_orders
WHERE status = 'completed'
ORDER BY updated_at DESC
LIMIT 10;

-- Users by credit balance
SELECT user_id, balance, total_purchased
FROM user_credits
ORDER BY balance DESC;

-- Transaction history for user
SELECT * FROM credit_transactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

## Support

For Dodo Payments issues:
- Docs: https://docs.dodopayments.com
- Support: support@dodopayments.com
- Dashboard: https://dashboard.dodopayments.com

For Terabits issues:
- Support: support@terabits.ai
- Email: hello@terabits.ai
