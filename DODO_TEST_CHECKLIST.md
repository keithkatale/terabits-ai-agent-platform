# Dodo Payments - Testing Checklist

## Critical Fixes Applied ✅

1. **SDK URL**: Changed from `checkout.dodopayments.com/lib/checkout.js` → `cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js`
2. **SDK Object**: Changed from `DodoCheckout` → `DodoPayments`
3. **Initialization**: Changed from `.initialize()` → `.Initialize()` with proper parameters
4. **Checkout Opening**: Changed from session ID extraction → pass `checkoutUrl` directly
5. **API Endpoints**: Changed from `api.dodopayments.com` → `test.dodopayments.com` / `live.dodopayments.com`

---

## Pre-Testing Setup

### 1. Update `.env.local`

```bash
# Dodo Payments (Test Mode)
DODO_API_KEY=your_test_api_key_here
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=your_test_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Get these from:** https://dashboard.dodopayments.com
- API Key: Dashboard → Developer → API Keys (TEST tab)
- Webhook Secret: Dashboard → Webhooks

### 2. Clear Browser Cache & Restart Dev Server

```bash
# In browser:
Cmd+Shift+Delete (macOS) or Ctrl+Shift+Delete (Windows)
Then reload page

# Restart dev server (if needed):
npm run dev
```

---

## Testing Steps

### Step 1: Verify SDK Loads Successfully ✅

1. Open browser DevTools (F12)
2. Go to Console tab
3. Load your app
4. Look for **success message** (not error):
   ```
   ✅ Dodo SDK event: checkout.opened
   (or similar - should NOT see "Failed to load Dodo Payments SDK")
   ```

**If you see error:**
- Check Network tab → look for `dodopayments-checkout` CDN request
- Verify it loaded with status 200
- Check console for detailed error message

### Step 2: Click "Buy Credits" Button ✅

1. Navigate to pricing section (or wherever "Buy Credits" button is)
2. If not authenticated, sign up first
3. Click "Buy Credits" button (e.g., for 5K credits)
4. Watch for popup to appear

**Expected behavior:**
- Popup/overlay appears (stays on same page, no navigation)
- Form shows "Enter card details" or similar
- No errors in console

### Step 3: Test Payment with Test Card ✅

Use Dodo's test card:
```
Card Number: 4242 4242 4242 4242
Expiration: 12/25 (or any future date)
CVC: 123
```

1. Fill in the payment form
2. Click "Complete Payment" or similar button
3. Wait for processing...

**Expected behavior:**
- Payment completes quickly
- Browser redirects to `/payments/success`
- Shows "Payment Successful!" message
- No errors in console

### Step 4: Verify Credits Added ✅

1. Check your account/dashboard
2. Verify balance increased by expected amount (e.g., +5000 credits)
3. Check database (if accessible):
   ```sql
   SELECT balance FROM user_credits WHERE user_id = 'YOUR_USER_ID';
   ```

**Expected:**
- Balance increased
- Order status is 'completed'
- Credits deducted/available

### Step 5: Test Failed Payment ✅

Use Dodo's decline test card:
```
Card Number: 4000 0000 0000 0002
Expiration: 12/25
CVC: 123
```

1. Click "Buy Credits" again
2. Enter decline card
3. Submit payment

**Expected behavior:**
- Payment is declined
- Popup closes or shows error
- Browser does NOT redirect
- Can try again

### Step 6: Test Payment Cancellation ✅

1. Click "Buy Credits"
2. Close the popup (X button or click outside)

**Expected behavior:**
- Popup closes
- Redirects to `/payments/cancel` (optional, based on your implementation)
- Can try again later

---

## Console Output - What to Look For

### ✅ Success Indicators

```
✅ Dodo SDK loaded successfully
✅ Dodo SDK event: checkout.opened
✅ Opening checkout with URL: https://checkout.dodopayments.com/buy/pdt_xxx
✅ Payment processing...
✅ Redirecting to success page
```

### ❌ Error Indicators (If you see these, there's still an issue)

```
❌ Failed to load Dodo Payments SDK script from CDN
❌ Dodo Payments SDK not loaded yet
❌ DodoPayments not found after SDK load
❌ Failed to create checkout session
❌ Dodo Payments SDK not available
❌ 404 errors from dodopayments.com
```

---

## Troubleshooting

### "Failed to load Dodo Payments SDK"

**Causes:**
- Browser blocked CDN request
- jsDelivr CDN is down (unlikely but possible)
- Network connectivity issue

**Fix:**
1. Check Network tab in DevTools
2. Look for request to `cdn.jsdelivr.net`
3. If blocked: check browser extensions (ad blockers?)
4. Try accessing jsDelivr in browser: https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js

### "Dodo Payments SDK not loaded yet"

**Cause:**
- SDK took too long to load
- SDK failed to initialize

**Fix:**
1. Check console for SDK load errors
2. Try clicking button again after waiting a few seconds
3. Hard refresh (Cmd+Shift+R)

### Popup doesn't appear

**Causes:**
- SDK didn't initialize properly
- `checkoutUrl` is invalid
- Popup blocked by browser settings

**Fix:**
1. Check console: "Opening checkout with URL:" message
2. Verify URL format: `https://checkout.dodopayments.com/buy/pdt_xxx`
3. Check browser popup blocker settings
4. Check console for errors

### Payment never completes / stuck on payment screen

**Causes:**
- Network timeout
- Dodo server issue
- Test card not working

**Fix:**
1. Wait 30 seconds and try again
2. Try different test card
3. Check Dodo status page

### Credits not added after successful payment

**Causes:**
- Webhook not firing
- Webhook signature verification failing
- Order not found in database

**Fix:**
1. Check Dodo dashboard → Webhooks → Logs
2. Verify webhook was sent
3. Check server logs for webhook receipt
4. Verify order exists in `dodo_payments_orders` table

---

## Quick Reference

| Environment | SDK URL | API Endpoint | Mode |
|---|---|---|---|
| **Development** | cdn.jsdelivr.net/npm/... | https://test.dodopayments.com | test |
| **Production** | cdn.jsdelivr.net/npm/... | https://live.dodopayments.com | live |

**Important:** Both test and live use the SAME SDK URL. Only the API endpoint changes.

---

## Files Changed

✅ `lib/hooks/useDodoCheckout.ts` - SDK loading & initialization
✅ `lib/payments/dodo-client.ts` - API endpoints
✅ `.env.dodo.example` - Configuration template

## Documentation

📄 `DODO_SDK_FIXES_DETAILED.md` - Comprehensive explanation of all fixes
📄 `DODO_OVERLAY_CHECKOUT_SETUP.md` - Original setup guide
📄 `DODO_TEST_CHECKLIST.md` - This file

---

## Need Help?

- **Dodo Docs**: https://docs.dodopayments.com
- **API Reference**: https://docs.dodopayments.com/api-reference/introduction
- **Overlay Checkout**: https://docs.dodopayments.com/developer-resources/overlay-checkout
- **Status Page**: https://status.dodopayments.com

Good luck with testing! 🚀
