# Dodo Payments - Complete Setup Guide

## Overview

The Dodo Payments integration is now fully configured. This guide walks you through the remaining setup steps to get payments working.

---

## Step 1: Link Dodo Product IDs to Database ✅

Your Dodo product IDs need to be linked to the credit packages in your Supabase database.

### Option A: Run SQL in Supabase (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy and paste the contents of `SETUP_DODO_PRODUCTS.sql`
5. Click **RUN**

**Product IDs to link:**
- 5,000 credits → `pdt_0NZ2Nd7aaGSspgus57h5C` ($20)
- 8,000 credits → `pdt_0NZ2NXjwIZyuvyR6YHDJm` ($30) - Most Popular
- 11,000 credits → `pdt_0NZ2NJoq334gbGHYvofsW` ($40)
- 15,000 credits → `pdt_0NZ2NEYZXmDRX8QNYPFXX` ($50)

**Verify the update:**
```sql
SELECT id, credit_amount, price_usd, dodo_product_id, is_active
FROM credit_packages
ORDER BY credit_amount;
```

You should see all 4 packages with their dodo_product_id values populated.

### Option B: Via Supabase UI

1. Go to **Table Editor** → **credit_packages**
2. Click on each package row
3. Update the `dodo_product_id` field with the corresponding Dodo product ID
4. Click **Save**

---

## Step 2: Update Environment Variables ✅

Your `.env.local` should already have:

```bash
DODO_API_KEY=your_test_api_key_here
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=your_test_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If not, add these now:

**For Test Mode (Development):**
```bash
DODO_API_KEY=your_test_api_key_from_dashboard
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=your_test_webhook_secret_from_dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Live Mode (Production):**
```bash
DODO_API_KEY=your_live_api_key_from_dashboard
DODO_API_URL=https://live.dodopayments.com
DODO_WEBHOOK_SECRET=your_live_webhook_secret_from_dashboard
NEXT_PUBLIC_APP_URL=https://terabits.ai
```

---

## Step 3: Restart Development Server ✅

```bash
npm run dev
```

---

## Step 4: Test the Payment Flow ✅

### Clear Cache and Reload

1. **Clear browser cache:**
   - macOS: **Cmd+Shift+Delete**
   - Windows: **Ctrl+Shift+Delete**
2. **Reload the page**

### Test Unauthenticated User

1. Go to the pricing page (http://localhost:3000/#pricing)
2. Click "Buy Credits" button
3. **Should redirect to signup** - this is correct!
4. Sign up with a test account

### Test Authenticated User

1. After signing up, go back to pricing page
2. Click "Buy Credits" on any package
3. **Popup should appear** (overlay modal, no page navigation)
4. **Form should show**: "Enter card details"

### Test with Dodo Test Card

Use these test card numbers:

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiration: 12/25 (or any future date)
CVC: 123
```

**Declined Payment (to test error handling):**
```
Card: 4000 0000 0000 0002
Expiration: 12/25
CVC: 123
```

### Verify Payment Completed

1. **After successful payment:**
   - Browser redirects to `/payments/success`
   - Shows "Payment Successful!" message
   - No errors in console

2. **Check database:**
   ```sql
   -- Check user balance increased
   SELECT balance FROM user_credits WHERE user_id = 'YOUR_USER_ID';

   -- Check order was created
   SELECT * FROM dodo_payments_orders ORDER BY created_at DESC LIMIT 1;

   -- Check transaction recorded
   SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 1;
   ```

---

## Files Changed/Created

### New Files
- ✅ `app/api/packages/route.ts` - Endpoint to fetch credit packages
- ✅ `SETUP_DODO_PRODUCTS.sql` - SQL to link Dodo product IDs
- ✅ `DODO_SETUP_COMPLETE.md` - This setup guide

### Fixed Files
- ✅ `lib/hooks/useDodoCheckout.ts` - SDK loading & initialization fixed
- ✅ `lib/payments/dodo-client.ts` - API endpoints corrected
- ✅ `components/landing/pricing-section.tsx` - Now fetches packages from database
- ✅ `.env.dodo.example` - Updated with correct endpoints

### Existing Files (Already Configured)
- ✅ `app/api/payments/checkout/route.ts` - Creates checkout sessions
- ✅ `app/api/payments/webhook/route.ts` - Handles payment webhooks
- ✅ `supabase/migrations/20250222_add_credits_system.sql` - Database schema
- ✅ `app/payments/success/page.tsx` - Success page
- ✅ `app/payments/cancel/page.tsx` - Cancellation page

---

## How It All Works Together

```
1. User clicks "Buy Credits"
   ↓
2. PricingSection fetches packages from GET /api/packages
   ↓
3. User clicks specific package button
   ↓
4. openCheckout() is called from useDodoCheckout hook
   ↓
5. Frontend calls POST /api/payments/checkout with packageId
   ↓
6. Backend queries database for package
   ↓
7. Backend calls Dodo API to create checkout session
   ↓
8. Dodo returns checkoutUrl: https://checkout.dodopayments.com/buy/pdt_xxx
   ↓
9. Frontend calls DodoPayments.Checkout.open({ checkoutUrl })
   ↓
10. Popup/overlay appears (user stays on page)
    ↓
11. User enters payment details with test card
    ↓
12. Dodo processes payment
    ↓
13. Dodo sends webhook to POST /api/payments/webhook
    ↓
14. Backend verifies signature and adds credits
    ↓
15. Frontend redirects to /payments/success
    ↓
16. User sees "Payment Successful!" and credits are added
```

---

## Troubleshooting

### Error: "Package not found"

**Cause:** Credit packages don't exist in database or have wrong IDs

**Fix:**
1. Run `SETUP_DODO_PRODUCTS.sql` to link Dodo product IDs
2. Verify: Query `credit_packages` table - should have 4 rows with `dodo_product_id` populated

### Error: "Failed to load Dodo Payments SDK script from CDN"

**Cause:** Browser can't reach jsDelivr CDN

**Fix:**
1. Check network tab in DevTools
2. Verify CDN request: `https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js`
3. Check browser extensions (ad blockers)
4. Try in incognito mode

### Popup doesn't appear

**Cause:** SDK didn't initialize or `checkoutUrl` is invalid

**Fix:**
1. Check console for errors
2. Verify SDK loaded: Look for "Dodo SDK event" messages
3. Check `checkoutUrl` starts with `https://checkout.dodopayments.com/buy/`

### Payment stuck/never completes

**Cause:** Network timeout or Dodo server issue

**Fix:**
1. Wait 30 seconds and try again
2. Check Dodo status: https://status.dodopayments.com
3. Check browser console for errors
4. Try different test card

### Credits not added after payment

**Cause:** Webhook not fired or signature verification failed

**Fix:**
1. Check Dodo dashboard → Webhooks → Logs
2. Verify webhook was sent
3. Check server logs for webhook receipt
4. Verify `DODO_WEBHOOK_SECRET` matches in Dodo dashboard

---

## Environment Summary

| Component | Test Mode | Live Mode |
|-----------|-----------|-----------|
| **SDK URL** | `https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js` | Same |
| **API Endpoint** | `https://test.dodopayments.com` | `https://live.dodopayments.com` |
| **API Key** | `sk_test_...` (from TEST tab) | `sk_live_...` (from LIVE tab) |
| **Webhook Secret** | `wh_test_...` (from TEST tab) | `wh_live_...` (from LIVE tab) |
| **App URL** | `http://localhost:3000` | `https://terabits.ai` |

---

## Next Steps

1. ✅ **Immediate:** Run `SETUP_DODO_PRODUCTS.sql` to link product IDs
2. ✅ **Today:** Test the full payment flow with test cards
3. ✅ **This week:** Test with real cards (still in test mode)
4. ✅ **When ready:** Switch to live mode by updating env vars
5. ✅ **Then:** Monitor webhook delivery and credit transactions

---

## Important Notes

- **Sandbox Testing:** All payments in test mode are simulated - no real charges
- **Test Cards:** Only the provided test cards work in test mode
- **Product IDs:** Already created in your Dodo dashboard - don't create new ones
- **Webhooks:** Dodo automatically sends webhooks - no setup needed beyond configuration
- **Signature Verification:** Backend verifies all webhooks with HMAC-SHA256

---

## Support & Documentation

- **Dodo Payments Docs:** https://docs.dodopayments.com
- **Overlay Checkout Docs:** https://docs.dodopayments.com/developer-resources/overlay-checkout
- **API Reference:** https://docs.dodopayments.com/api-reference/introduction
- **Status Page:** https://status.dodopayments.com

---

## Verification Checklist

- [ ] Ran `SETUP_DODO_PRODUCTS.sql` to populate `dodo_product_id` fields
- [ ] `.env.local` has correct `DODO_API_URL=https://test.dodopayments.com`
- [ ] Restarted dev server
- [ ] Cleared browser cache
- [ ] Pricing page loads without errors
- [ ] Can click "Buy Credits" and popup appears
- [ ] Test payment with card `4242 4242 4242 4242` completes
- [ ] Redirected to `/payments/success`
- [ ] User balance increased in dashboard
- [ ] Database shows order and transaction records

Once all items are checked, the payment system is fully operational! 🎉
