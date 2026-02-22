# Dodo Payments Overlay Checkout Implementation

## Summary

Implemented **popup modal checkout** for Dodo Payments with the following features:
- No page navigation required (stays on current page)
- Dodo product IDs linked to all 4 credit packages
- Test mode configured and ready for testing
- Complete webhook integration for payment confirmation
- Automatic credit addition on successful payment

## Product IDs Configured

```
5,000 Credits   → pdt_0NZ2Nd7aaGSspgus57h5C ($20)
8,000 Credits   → pdt_0NZ2NXjwIZyuvyR6YHDJm ($30)
11,000 Credits  → pdt_0NZ2NJoq334gbGHYvofsW ($40)
15,000 Credits  → pdt_0NZ2NEYZXmDRX8QNYPFXX ($50)
```

## Files Created/Updated

### Frontend Components
- `components/landing/pricing-section.tsx` - Updated with "Buy Credits" button handler + Dodo product IDs
- `lib/hooks/useDodoCheckout.ts` - NEW: SDK loading + checkout popup handler
- `lib/hooks/useAuth.ts` - NEW: User authentication check
- `app/payments/success/page.tsx` - NEW: Success page after payment
- `app/payments/cancel/page.tsx` - NEW: Cancellation page

### Backend APIs
- `lib/payments/dodo-client.ts` - Updated for overlay checkout:
  - Changed from `createOrder()` to `createCheckoutSession()`
  - Uses `POST /api/v1/checkout/sessions`
  - Returns checkout URL for popup
  - Supports test/live mode detection
- `app/api/payments/checkout/route.ts` - Updated to create overlay sessions
- `app/api/payments/webhook/route.ts` - No changes (works as-is)

### Configuration
- `.env.dodo.example` - Updated with test mode URLs + setup instructions

### Documentation
- `docs/DODO_OVERLAY_CHECKOUT_SETUP.md` - NEW: Complete setup + testing guide

## How It Works

### User Journey
1. User clicks "Buy Credits" button
2. Dodo SDK popup appears (no page navigation)
3. User enters payment details in popup
4. Payment processed
5. Webhook confirms payment
6. Credits automatically added
7. Popup closes, user redirected to success page

### Architecture
```
User clicks "Buy Credits"
    ↓
checks user authentication
    ↓
fetch /api/payments/checkout
    ↓
Backend creates order + session
    ↓
Returns checkoutUrl
    ↓
Frontend: DodoPayments.Checkout.open(checkoutUrl)
    ↓
Popup modal appears
    ↓
Payment successful
    ↓
Webhook fires automatically
    ↓
Credits added, order marked complete
    ↓
Redirect to /payments/success
```

## Environment Setup

### Test Mode Configuration
```bash
DODO_API_KEY=sk_test_xxxxx         # From Dashboard → API Keys (TEST)
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=wh_test_xxxxx  # From Dashboard → Webhooks
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Get Credentials
1. **API Key**: Dashboard → Developer → API Keys (TEST tab) → Create → Copy `sk_test_xxxxx`
2. **Webhook Secret**: Dashboard → Webhooks → Create → Enter webhook URL → Copy secret `wh_test_xxxxx`
3. **Webhook URL**: `https://localhost:3000/api/payments/webhook` (for local testing)

## Testing Checklist

- [ ] Setup `.env.local` with all 4 variables
- [ ] Run database migration (`supabase db push`)
- [ ] Pricing page visible at `/#pricing`
- [ ] Unauthenticated click → redirects to signup
- [ ] Authenticated click → popup appears
- [ ] SDK loads without errors (check console)
- [ ] Test card payment successful:
  ```
  Card: 4242 4242 4242 4242
  Exp: 12/25
  CVC: 123
  ```
- [ ] Webhook fires (check Dodo dashboard logs)
- [ ] Credits added to user account
- [ ] Redirected to success page
- [ ] Balance updated in dashboard

## Test Cards Available

**Success:**
- 4242 4242 4242 4242

**Decline:**
- 4000 0000 0000 0002

## SDK Usage

```typescript
const { openCheckout, isProcessing, sdkLoaded } = useDodoCheckout()

// Open checkout for a package
await openCheckout(packageId)
```

The hook automatically:
- Loads Dodo SDK from CDN
- Initializes in test/live mode (based on env var)
- Handles popup lifecycle
- Manages processing state

## Key Differences from Order-Based Approach

| Feature | Order-Based | Overlay Checkout |
|---------|------------|------------------|
| Page Navigation | Yes (redirect) | No (popup) |
| SDK Required | No | Yes |
| Session Creation | Simple order | Checkout session |
| API Endpoint | `/v1/orders` | `/v1/checkout/sessions` |
| User Experience | Leave page → return | Stay on page, popup appears |
| Webhook Integration | Manual confirmation | Automatic on completion |
| Test Mode | Sandbox URL | Test URL |

## API Changes

### Old (Order-Based)
```
POST /api/v1/orders
{
  amount: cents
  currency: "USD"
  description: "..."
}
Response: { id, paymentUrl, expiresAt }
```

### New (Overlay Checkout)
```
POST /api/v1/checkout/sessions
{
  mode: "payment"
  success_url: "..."
  cancel_url: "..."
  line_items: [{ price: productId, quantity: 1 }]
  metadata: { userId, packageId, credits }
}
Response: { id, url }  // url → checkoutUrl for popup
```

## Webhook Integration

Remains unchanged - Dodo automatically fires webhook when:
- ✓ Payment completed
- ✗ Payment failed
- ✗ Session expired

Backend verifies HMAC-SHA256 signature and adds credits.

## Next Steps

1. Add API key and webhook secret to `.env.local`
2. Run database migration
3. Test with test cards
4. Verify webhook delivers successfully
5. When ready: switch to live mode (just change env vars)

## Switching to Production

When ready for live payments:

1. Create live API key in Dodo dashboard
2. Create live webhook with production URL
3. Update env vars:
```bash
DODO_API_KEY=sk_live_xxxxx
DODO_API_URL=https://live.dodopayments.com
DODO_WEBHOOK_SECRET=wh_live_xxxxx
NEXT_PUBLIC_APP_URL=https://terabits.ai
```

That's it! Code automatically detects production mode from base URL.

## Documentation

See `docs/DODO_OVERLAY_CHECKOUT_SETUP.md` for:
- Complete setup instructions
- Test webhook procedures
- Troubleshooting guide
- Production deployment steps
- Monitoring and analytics queries

## Support

- Dodo Docs: https://docs.dodopayments.com
- Dodo Support: support@dodopayments.com
- Terabits Support: support@terabits.ai
