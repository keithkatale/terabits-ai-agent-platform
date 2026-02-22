# Dodo Payments SDK Fix

## Issue Found

The SDK was trying to load from an incorrect CDN URL and the API endpoint needed correction.

### Errors Fixed

1. **SDK CDN URL**: Was `https://js.dodopayments.com/dodo-checkout.js` (doesn't exist)
   - Fixed to: `https://checkout.dodopayments.com/lib/checkout.js`

2. **API Endpoint**: Was using separate test/live domains
   - Fixed to: Both use `https://api.dodopayments.com` (API key determines test/live mode)

3. **SDK Initialization**: Was using old SDK object name
   - Fixed to: Use `DodoCheckout` instead of `DodoPayments`

## Required Changes to .env.local

Your current setup has the right API key but WRONG URL. Update to:

```bash
# Correct Configuration
DODO_API_KEY=0LKqBtq4F7sQjeoI.gdw5R5KANvcFHNEC_h9hLtMn5heu0a__sHd0ETa9TR2zT3IP
DODO_API_URL=https://api.dodopayments.com  # Changed from old URL
DODO_WEBHOOK_SECRET=whsec_y3HybBR+rwSmL5yoyyqvcIf6cxfn5F0M
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**KEY CHANGE**:
- ❌ OLD: `DODO_API_URL=https://api.dodopayments.com`
- ✅ NEW: `DODO_API_URL=https://api.dodopayments.com` (same, but API key mode determines test/live)

## Files Updated

1. `lib/hooks/useDodoCheckout.ts`
   - Fixed SDK CDN URL
   - Updated initialization to use `DodoCheckout`
   - Fixed callback method names

2. `lib/payments/dodo-client.ts`
   - Corrected base URL to use API endpoint for both modes
   - API key prefix (sk_test_ or sk_live_) determines environment

3. `.env.dodo.example`
   - Updated documentation with correct URLs

## How Dodo Determines Test vs Live

Dodo uses the **API Key prefix** to determine environment, NOT the URL:

- `sk_test_xxx...` → Test environment
- `sk_live_xxx...` → Live environment

The API endpoint is always: `https://api.dodopayments.com`

## Testing Now

1. Update `.env.local` with the corrected API URL
2. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
3. Reload the page
4. Click "Buy Credits"
5. Popup should appear without errors

## SDK Loading Flow (Fixed)

```
Browser loads page
  ↓
useDodoCheckout hook activates
  ↓
Loads script: https://checkout.dodopayments.com/lib/checkout.js
  ↓
Script loads successfully
  ↓
Initialize DodoCheckout with public key
  ↓
SDK ready for checkout
  ↓
User clicks "Buy Credits"
  ↓
openCheckout() called
  ↓
Popup appears
```

## Next: Verify API Key Prefix

Your API key starts with: `0LKqBtq4F7sQjeoI` (seems wrong - should be `sk_test_` or `sk_live_`)

This suggests the API key format might be incorrect. Please verify in Dodo dashboard:

1. Go to Dashboard → Developer → API Keys
2. Make sure you're looking at TEST tab (for development)
3. Copy the full key (should start with `sk_test_`)
4. Update DODO_API_KEY in .env.local

If the key format is different, it's possible Dodo updated their key format. Contact Dodo support if you're unsure.

## Webhook Configuration

Webhook URL should be:
```
https://localhost:3000/api/payments/webhook
```

(Use ngrok for local testing: `ngrok http 3000` then use `https://yourngrok.url/api/payments/webhook`)

## Quick Checklist

- [ ] Update `DODO_API_URL` to `https://api.dodopayments.com`
- [ ] Verify API key starts with `sk_test_` or `sk_live_`
- [ ] Clear browser cache
- [ ] Reload page
- [ ] Check browser console (should no longer show SDK loading errors)
- [ ] Try clicking "Buy Credits"
- [ ] Popup should appear

## Support

If you still see errors:

1. Check browser console for error messages
2. Verify API key format in Dodo dashboard
3. Contact Dodo support: support@dodopayments.com
4. Dodo docs: https://docs.dodopayments.com
