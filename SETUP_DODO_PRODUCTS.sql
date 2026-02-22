-- Update credit packages with Dodo Payments product IDs
-- Run this in Supabase SQL editor if packages already exist without dodo_product_id values

-- Update 5000 credits package
UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2Nd7aaGSspgus57h5C'
WHERE credit_amount = 5000;

-- Update 8000 credits package
UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2NXjwIZyuvyR6YHDJm'
WHERE credit_amount = 8000;

-- Update 11000 credits package
UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2NJoq334gbGHYvofsW'
WHERE credit_amount = 11000;

-- Update 15000 credits package
UPDATE credit_packages
SET dodo_product_id = 'pdt_0NZ2NEYZXmDRX8QNYPFXX'
WHERE credit_amount = 15000;

-- Verify the updates
SELECT id, credit_amount, price_usd, dodo_product_id, is_active FROM credit_packages ORDER BY credit_amount;
