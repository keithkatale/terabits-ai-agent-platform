-- Fix: Add missing RLS policy for dodo_payments_orders INSERT
-- This allows authenticated users to create their own payment orders
-- Run this in Supabase SQL Editor

-- Drop old policies
DROP POLICY IF EXISTS "Service can manage orders" ON dodo_payments_orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON dodo_payments_orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON dodo_payments_orders;

-- Recreate policies in correct order

-- 1. Users can view their own orders
CREATE POLICY "Users can view their own orders" ON dodo_payments_orders
  FOR SELECT USING (user_id = auth.uid());

-- 2. Users can insert their own orders (authenticated users only)
CREATE POLICY "Users can insert their own orders" ON dodo_payments_orders
  FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.role() = 'authenticated');

-- 3. Service role can manage all orders (for webhooks)
CREATE POLICY "Service can manage orders" ON dodo_payments_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Verify policies were created
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'dodo_payments_orders'
ORDER BY policyname;
