-- Credits System for Terabits
-- Tracks user credits, transactions, and pricing information

-- Enum for credit transaction types
CREATE TYPE credit_transaction_type AS ENUM (
  'purchase',        -- User bought credits
  'usage',           -- User consumed credits
  'free_monthly',    -- Monthly free credit allocation
  'refund',          -- Credit refund
  'adjustment'       -- Admin adjustment
);

-- Credit packages (for display/reference)
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd INTEGER NOT NULL,  -- e.g., 20, 30, 40, 50
  credit_amount INTEGER NOT NULL,  -- e.g., 5000, 8000, 11000, 15000
  cost_per_credit DECIMAL(10, 6) NOT NULL,  -- Pre-calculated
  dodo_product_id TEXT UNIQUE,  -- Reference to Dodo Payments product
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User credits balance
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 500,  -- Free tier starts with 500 credits
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  free_credits_used_this_month INTEGER DEFAULT 0,
  last_monthly_reset TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Credit transactions history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  execution_log_id UUID REFERENCES execution_logs(id) ON DELETE SET NULL,
  transaction_type credit_transaction_type NOT NULL,
  credits_amount INTEGER NOT NULL,  -- Can be positive or negative
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  dodo_transaction_id TEXT,  -- Reference to Dodo Payments transaction
  metadata JSONB,  -- Additional context (e.g., credit package purchased)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dodo Payments integration
CREATE TABLE IF NOT EXISTS dodo_payments_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_package_id UUID REFERENCES credit_packages(id),
  dodo_order_id TEXT UNIQUE,  -- Dodo Payments order ID (nullable - filled in after Dodo API call)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, failed, cancelled
  amount_usd INTEGER NOT NULL,  -- Price in cents
  credits_purchased INTEGER NOT NULL,
  payment_method TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Free tier restrictions tracker
CREATE TABLE IF NOT EXISTS user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_agent_run TIMESTAMPTZ,  -- Timestamp of last agent run
  consecutive_free_runs INTEGER DEFAULT 0,  -- For 24-hour free tier limit
  can_deploy_agents BOOLEAN DEFAULT false,
  can_share_outputs BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_dodo_payments_orders_user_id ON dodo_payments_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_dodo_payments_orders_status ON dodo_payments_orders(status);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);

-- Enable RLS
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodo_payments_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: credit_packages (public read)
CREATE POLICY "Anyone can view credit packages" ON credit_packages
  FOR SELECT USING (true);

-- RLS Policies: user_credits (users can only see their own)
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can update user credits" ON user_credits
  FOR UPDATE USING (auth.role() = 'service_role');

-- RLS Policies: credit_transactions (users can only see their own)
CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can insert transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- RLS Policies: dodo_payments_orders (users can only see their own)
CREATE POLICY "Users can view their own orders" ON dodo_payments_orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own orders" ON dodo_payments_orders
  FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.role() = 'authenticated');

CREATE POLICY "Service can manage orders" ON dodo_payments_orders
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies: user_rate_limits (users can only see their own)
CREATE POLICY "Users can view their own rate limits" ON user_rate_limits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage rate limits" ON user_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default credit packages
INSERT INTO credit_packages (price_usd, credit_amount, cost_per_credit)
VALUES
  (20, 5000, 0.004000),
  (30, 8000, 0.003750),
  (40, 11000, 0.003636),
  (50, 15000, 0.003333)
ON CONFLICT DO NOTHING;
