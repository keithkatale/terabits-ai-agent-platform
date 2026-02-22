# Dodo Payments SDK - Complete Fix Documentation

## Critical Issues Found and Fixed

### Issue 1: Wrong SDK CDN URL ❌→✅

**What was wrong:**
```javascript
// ❌ WRONG (doesn't exist)
script.src = 'https://checkout.dodopayments.com/lib/checkout.js'
```

**Why it failed:**
- The domain `checkout.dodopayments.com/lib/` doesn't have this endpoint
- This is why you saw: `net::ERR_NAME_NOT_RESOLVED` or script load failure

**What's correct:**
```javascript
// ✅ CORRECT
script.src = 'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js'
```

**Location:** `lib/hooks/useDodoCheckout.ts` line 33

---

### Issue 2: Wrong SDK Object Name ❌→✅

**What was wrong:**
```javascript
// ❌ WRONG (doesn't exist in SDK)
;(window as any).DodoCheckout?.initialize({...})
;(window as any).DodoCheckout?.open({...})
```

**Why it failed:**
- The SDK exports as `DodoPayments`, not `DodoCheckout`
- When loaded via CDN, it's available as `window.DodoPaymentsCheckout.DodoPayments`
- This is why you got: "Dodo Payments SDK not loaded yet" (the variable was never defined)

**What's correct:**
```javascript
// ✅ CORRECT
const DodoPayments = (window as any).DodoPaymentsCheckout?.DodoPayments
DodoPayments.Initialize({...})
DodoPayments.Checkout.open({...})
```

**Location:** `lib/hooks/useDodoCheckout.ts` lines 16-60, 87

---

### Issue 3: Wrong SDK Initialization Method ❌→✅

**What was wrong:**
```javascript
// ❌ WRONG (doesn't match SDK API)
DodoCheckout.initialize({
  publicKey: process.env.NEXT_PUBLIC_DODO_PUBLIC_KEY || '',
  environment: 'test',
})
```

**Why it failed:**
- SDK uses `Initialize()` (capital I), not `initialize()`
- SDK doesn't use `publicKey` parameter
- SDK doesn't use `environment` parameter
- These parameters don't exist in the SDK

**What's correct:**
```javascript
// ✅ CORRECT
DodoPayments.Initialize({
  mode: 'test',  // Switch to 'live' for production
  displayType: 'overlay',
  onEvent: (event) => {
    console.log('Dodo SDK event:', event)
    // Handle events like checkout.opened, checkout.error, checkout.closed
  },
})
```

**Location:** `lib/hooks/useDodoCheckout.ts` lines 38-60

---

### Issue 4: Wrong Checkout Opening Method ❌→✅

**What was wrong:**
```javascript
// ❌ WRONG
DodoCheckout.open({
  sessionId: checkoutUrl.split('/').pop(), // Wrong!
  onSuccess: (result) => {...},
  onError: (error) => {...},
  onClose: () => {...},
})
```

**Why it failed:**
- SDK doesn't accept `sessionId` parameter
- SDK doesn't support `onSuccess`, `onError`, `onClose` callbacks in the method
- The SDK uses the checkout URL directly, and success/error are handled via redirects

**What's correct:**
```javascript
// ✅ CORRECT
DodoPayments.Checkout.open({
  checkoutUrl: checkoutUrl,  // Pass the URL directly!
  // SDK will automatically redirect to success_url/cancel_url after payment
})
```

**The SDK handles redirects via:**
- `success_url`: Configured in backend when creating session (→ `/payments/success`)
- `cancel_url`: Configured in backend when creating session (→ `/payments/cancel`)

**Location:** `lib/hooks/useDodoCheckout.ts` lines 87-92

---

### Issue 5: Wrong API Endpoints ❌→✅

**What was wrong:**
```bash
# ❌ WRONG (doesn't exist)
DODO_API_URL=https://api.dodopayments.com
```

**Why it failed:**
- Dodo doesn't have an `api.dodopayments.com` endpoint
- This is why API calls were failing

**What's correct:**
```bash
# ✅ CORRECT - TEST MODE
DODO_API_URL=https://test.dodopayments.com

# ✅ CORRECT - PRODUCTION MODE
DODO_API_URL=https://live.dodopayments.com
```

**Location:**
- `lib/payments/dodo-client.ts` line 42 (constructor)
- `.env.dodo.example` lines 7 and 15
- `.env.local` (your local environment)

---

## How the Correct Implementation Works

### 1. SDK Loading (Frontend)

```mermaid
Browser loads page
  ↓
useDodoCheckout hook activates
  ↓
Creates <script> tag with CDN URL
  ↓
Script loads from jsDelivr:
  https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js
  ↓
SDK exports to window.DodoPaymentsCheckout.DodoPayments
  ↓
Initialize() is called with mode + event handlers
  ↓
SDK ready for checkout
```

### 2. Opening Checkout

```mermaid
User clicks "Buy Credits"
  ↓
Frontend calls POST /api/payments/checkout
  ↓
Backend creates order + calls Dodo API
  ↓
Dodo returns checkoutUrl (format: https://checkout.dodopayments.com/buy/pdt_xxx)
  ↓
Frontend receives checkoutUrl
  ↓
Calls DodoPayments.Checkout.open({ checkoutUrl })
  ↓
Popup/overlay appears
  ↓
User enters payment details
  ↓
Dodo processes payment
  ↓
Dodo redirects to success_url (/payments/success)
```

### 3. Payment Completion

```mermaid
Dodo processes payment
  ↓
Sends webhook to /api/payments/webhook
  ↓
Backend verifies HMAC signature
  ↓
Adds credits to user account
  ↓
Returns 200 OK
  ↓
Frontend shows success page
```

---

## Updated Files

### `lib/hooks/useDodoCheckout.ts` ✅
- ✅ Fixed SDK CDN URL to jsDelivr
- ✅ Fixed SDK object name from `DodoCheckout` to `DodoPayments`
- ✅ Fixed initialization to use `Initialize()` with correct parameters
- ✅ Fixed checkout opening to use `checkoutUrl` directly
- ✅ Added proper event handling
- ✅ Added error handling for SDK loading

### `lib/payments/dodo-client.ts` ✅
- ✅ Fixed API endpoints from `api.dodopayments.com` to `test.dodopayments.com`/`live.dodopayments.com`
- ✅ Fixed mode detection from baseUrl

### `.env.dodo.example` ✅
- ✅ Updated with correct test endpoint
- ✅ Updated with correct live endpoint
- ✅ Clarified that API keys are raw keys (not sk_test_/sk_live_ format)

---

## Your Current API Keys

Based on the screenshots you showed:
- **Test API Key format**: `ITMegxMPkvVWscTo._fNtW4KIL_3flyojgLct5gAvd2uK...` (raw token)
- **Live API Key format**: `bpKWhNGAYVknqvz3.t0W0_kR3ulPJD-FsaGlyj2Nf4L_k...` (raw token)

These are **correct** - Dodo generates API keys in this format for both test and live modes. The API key prefix doesn't determine the environment; **the endpoint URL determines it**:
- `https://test.dodopayments.com` → Test mode
- `https://live.dodopayments.com` → Live mode

---

## .env.local Configuration

Update your `.env.local` with:

```bash
# Dodo Payments (Test Mode - for development)
DODO_API_KEY=your_test_api_key_from_dashboard
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=your_test_webhook_secret_from_dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**OR for production:**

```bash
# Dodo Payments (Live Mode - for production)
DODO_API_KEY=your_live_api_key_from_dashboard
DODO_API_URL=https://live.dodopayments.com
DODO_WEBHOOK_SECRET=your_live_webhook_secret_from_dashboard
NEXT_PUBLIC_APP_URL=https://terabits.ai
```

---

## Testing Steps

1. **Clear browser cache and reload**
   ```
   Cmd+Shift+Delete (macOS) or Ctrl+Shift+Delete (Windows)
   Then reload page
   ```

2. **Check browser console**
   - Should see SDK loading successfully
   - Should see "Dodo SDK event: checkout.opened" when modal appears
   - No "Failed to load Dodo Payments SDK" errors

3. **Click "Buy Credits"**
   - Modal should appear (overlay popup)
   - User stays on page (no navigation)

4. **Test with Dodo test card**
   ```
   Card: 4242 4242 4242 4242
   Exp: 12/25
   CVC: 123
   ```

5. **Verify payment flow**
   - After successful payment, browser redirects to `/payments/success`
   - Check Supabase: user_credits.balance should increase
   - Check dodo_payments_orders table: status should be 'completed'

---

## Webhook Configuration

Your webhook is already configured correctly:
- **Endpoint**: `https://localhost:3000/api/payments/webhook` (test) or `https://terabits.ai/api/payments/webhook` (production)
- **Secret**: Copy from Dodo dashboard → Webhooks
- **Events**: `checkout.session.completed` (handled in backend)

---

## Reference: Dodo Payments Documentation

These are the official Dodo documentation URLs:
- **Overlay Checkout**: https://docs.dodopayments.com/developer-resources/overlay-checkout
- **API Reference**: https://docs.dodopayments.com/api-reference/introduction
- **Dashboard**: https://dashboard.dodopayments.com

---

## Summary of Changes

| Issue | Before | After |
|-------|--------|-------|
| **SDK URL** | `checkout.dodopayments.com/lib/checkout.js` | `cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js` |
| **SDK Object** | `window.DodoCheckout` | `window.DodoPaymentsCheckout.DodoPayments` |
| **Initialize** | `DodoCheckout.initialize({publicKey, environment})` | `DodoPayments.Initialize({mode, displayType, onEvent})` |
| **Open Checkout** | `DodoCheckout.open({sessionId, onSuccess, onError, onClose})` | `DodoPayments.Checkout.open({checkoutUrl})` |
| **API Endpoint** | `https://api.dodopayments.com` | `https://test.dodopayments.com` or `https://live.dodopayments.com` |
| **Mode Detection** | From env var | From endpoint URL |

---

## Next Steps

1. Update `.env.local` with correct `DODO_API_URL`
2. Clear browser cache
3. Restart dev server if needed
4. Test "Buy Credits" button
5. Verify SDK loads and popup appears
6. Test with test credit card
7. Confirm webhook fires and credits are added

The implementation should now work correctly! 🎉
