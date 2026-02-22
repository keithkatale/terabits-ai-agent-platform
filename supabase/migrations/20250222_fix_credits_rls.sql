-- Fix missing INSERT policy on user_credits for service_role
-- Without this, the webhook handler cannot create credits records for new users

-- Add INSERT policy (was missing from original migration)
DROP POLICY IF EXISTS "Service can insert user credits" ON user_credits;
CREATE POLICY "Service can insert user credits" ON user_credits
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Also fix UPDATE policy to use WITH CHECK instead of just USING (belt-and-suspenders)
DROP POLICY IF EXISTS "Service can update user credits" ON user_credits;
CREATE POLICY "Service can update user credits" ON user_credits
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Ensure user_rate_limits also has full access for service_role
DROP POLICY IF EXISTS "Service can manage rate limits" ON user_rate_limits;
CREATE POLICY "Service can manage rate limits" ON user_rate_limits
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
