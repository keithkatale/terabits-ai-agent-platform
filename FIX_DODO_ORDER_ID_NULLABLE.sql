-- Fix: Make dodo_order_id nullable
-- This allows creating orders without a Dodo order ID initially
-- The ID is added later when Dodo returns the session

-- Alter the column to allow NULL
ALTER TABLE dodo_payments_orders
ALTER COLUMN dodo_order_id DROP NOT NULL;

-- Remove the NOT NULL constraint by modifying the column definition
-- The column should allow NULL initially, then be filled in later

-- Verify the change
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'dodo_payments_orders'
AND column_name = 'dodo_order_id';
