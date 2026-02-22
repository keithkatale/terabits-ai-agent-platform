# Credit-Based Pricing Implementation Summary

## Overview
Replaced traditional subscription pricing with a credit-based model using Dodo Payments. Users buy credit packages on-demand and consume credits when running agents.

## Files Created

### UI Components
- `components/landing/pricing-section.tsx` - New credit-based pricing page with free plan + 4 packages

### Database
- `supabase/migrations/20250222_add_credits_system.sql` - Tables for credits, transactions, orders, rate limits

### Payment Processing
- `lib/payments/dodo-client.ts` - Dodo Payments API client
- `app/api/payments/checkout/route.ts` - Initiate payment
- `app/api/payments/webhook/route.ts` - Handle payment completion

### Credits Management
- `lib/payments/credits-service.ts` - Balance, deductions, privilege checks
- `app/api/user/credits/route.ts` - Get balance endpoint
- `app/api/user/check-action/route.ts` - Check if action allowed

### Configuration & Docs
- `.env.dodo.example` - Environment variable template
- `docs/CREDITS_SYSTEM.md` - Complete system documentation

## Key Changes

### Pricing Model
- **Free Plan**: 500 credits/month, 1 run per 24 hours, no deploy/share
- **Paid Plans**: $20 (5K credits), $30 (8K), $40 (11K), $50 (15K)
- **Enterprise**: $200+/month for custom builds

### Limitations by Tier
Free users: Cannot deploy publicly, cannot share outputs, 1 run per 24 hours
Paid users: All features unlocked, unlimited runs, can deploy and share

### Database Schema
- `credit_packages`: Product definitions
- `user_credits`: Per-user balance
- `credit_transactions`: Audit trail
- `dodo_payments_orders`: Payment history
- `user_rate_limits`: Free tier restrictions

## API Endpoints

### POST /api/payments/checkout
Initiates credit purchase, returns Dodo payment URL

### GET /api/user/credits
Get user's balance and rate limit status

### POST /api/user/check-action
Check if user can perform action (deploy/share/run_agent)

### POST /api/payments/webhook
Dodo Payments webhook - adds credits on payment success

## Dodo Payments Setup

1. Create account at https://dodopayments.com
2. Add 4 products (5K, 8K, 11K, 15K credit packages)
3. Configure webhook: https://yourdomain.com/api/payments/webhook
4. Get API Key and Webhook Secret
5. Add to .env:
   - DODO_API_KEY
   - DODO_API_URL=https://api.dodopayments.com
   - DODO_WEBHOOK_SECRET
   - NEXT_PUBLIC_APP_URL

## Implementation Checklist

- [x] Create pricing UI
- [x] Database schema
- [x] Dodo Payments client
- [x] Payment APIs
- [x] Credits service
- [x] Endpoint to check permissions
- [ ] Frontend integration (upgrade modals)
- [ ] Agent execution integration (credit deduction)
- [ ] Dashboard credit display
- [ ] Production testing and deployment

## Next Steps

1. Add upgrade modal component for blocked actions
2. Integrate credit deduction into agent execution
3. Display credit balance in dashboard
4. Test with Dodo sandbox environment
5. Deploy and monitor in production

See `docs/CREDITS_SYSTEM.md` for complete documentation.
