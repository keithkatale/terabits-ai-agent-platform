# Dodo Payments - Quick Start (3 Steps)

## 🚀 Do This Right Now

### Step 1: Link Dodo Product IDs (2 minutes)

**Go to your Supabase Dashboard:**
1. https://app.supabase.com
2. Select your project
3. **SQL Editor** → **New Query**
4. **Copy and paste this SQL:**

```sql
UPDATE credit_packages SET dodo_product_id = 'pdt_0NZ2Nd7aaGSspgus57h5C' WHERE credit_amount = 5000;
UPDATE credit_packages SET dodo_product_id = 'pdt_0NZ2NXjwIZyuvyR6YHDJm' WHERE credit_amount = 8000;
UPDATE credit_packages SET dodo_product_id = 'pdt_0NZ2NJoq334gbGHYvofsW' WHERE credit_amount = 11000;
UPDATE credit_packages SET dodo_product_id = 'pdt_0NZ2NEYZXmDRX8QNYPFXX' WHERE credit_amount = 15000;
```

5. **Click RUN**
6. **Verify:** Run this to check:
```sql
SELECT id, credit_amount, dodo_product_id FROM credit_packages ORDER BY credit_amount;
```

✅ You should see all 4 packages with dodo_product_id values

---

### Step 2: Update Environment (1 minute)

**In your `.env.local`:**

Make sure these are set:
```bash
DODO_API_KEY=your_test_api_key_here
DODO_API_URL=https://test.dodopayments.com
DODO_WEBHOOK_SECRET=your_test_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

✅ Double-check `DODO_API_URL=https://test.dodopayments.com` (NOT `api.dodopayments.com`)

---

### Step 3: Test It (5 minutes)

```bash
# Restart your dev server
npm run dev
```

Then in browser:

1. **Clear cache:** Cmd+Shift+Delete (or Ctrl+Shift+Delete on Windows)
2. **Go to:** http://localhost:3000/#pricing
3. **Click:** "Buy Credits" button (any package)
4. **Look for:** Popup to appear (no errors in console)
5. **Use test card:**
   ```
   Card: 4242 4242 4242 4242
   Exp: 12/25
   CVC: 123
   ```
6. **Should redirect to:** `/payments/success` ✅

---

## ✅ Success Indicators

You'll see in the console:
```
✅ Dodo SDK event: checkout.opened
✅ Opening checkout with URL: https://checkout.dodopayments.com/buy/...
```

And in the app:
- Popup appears (overlay modal)
- User stays on page (no redirect during payment)
- After payment, redirect to `/payments/success`
- No red errors in console

---

## ❌ If Something Goes Wrong

### "Package not found" error
→ SQL didn't run successfully in Supabase
→ Go back to Step 1, verify all 4 UPDATE statements ran

### "Failed to load Dodo Payments SDK"
→ Check `.env.local` has correct `DODO_API_URL`
→ Restart dev server
→ Clear browser cache

### Popup doesn't appear
→ Check browser console (F12) for errors
→ Verify SDK loaded (look for "Dodo SDK event" message)
→ Check Network tab for SDK loading from jsDelivr

### Payment stuck / doesn't complete
→ Wait 30 seconds and try again
→ Use different test card (try the declined one to test error handling)

---

## 📚 Full Documentation

If you need more details:

- **`DODO_SETUP_COMPLETE.md`** — Full setup guide
- **`FIXES_SUMMARY.md`** — What was fixed and why
- **`DODO_TEST_CHECKLIST.md`** — Detailed testing instructions

---

## 🎯 What Changed

**SDK Loading:**
```javascript
// Before: ❌ Wrong CDN
script.src = 'https://checkout.dodopayments.com/lib/checkout.js'

// After: ✅ Correct CDN
script.src = 'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js'
```

**SDK Object:**
```javascript
// Before: ❌ Wrong
window.DodoCheckout

// After: ✅ Correct
window.DodoPaymentsCheckout.DodoPayments
```

**API Endpoint:**
```bash
# Before: ❌ Wrong
DODO_API_URL=https://api.dodopayments.com

# After: ✅ Correct
DODO_API_URL=https://test.dodopayments.com
```

**Packages:**
```javascript
// Before: ❌ Hardcoded in frontend, not in database
const creditPackages = [{ id: 'pkg-5k', ... }]

// After: ✅ Fetched from database
GET /api/packages → Returns real packages with Dodo product IDs
```

---

## 🎉 That's It!

You should now be able to:
1. ✅ See pricing page with credit packages
2. ✅ Click "Buy Credits" and see popup
3. ✅ Complete test payment
4. ✅ Get redirected to success page
5. ✅ See credits added to account

**Next:** Read the full guides to understand the system, test more scenarios, then switch to live mode.

Good luck! 🚀
