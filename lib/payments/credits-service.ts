/**
 * Credits Service
 * Manages user credits, transactions, and balance
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface CreditBalance {
  userId: string
  balance: number
  totalPurchased: number
  totalUsed: number
  freeCreditsUsedThisMonth: number
  lastMonthlyReset: string | null
}

export interface CreditTransaction {
  id: string
  userId: string
  transactionType: 'purchase' | 'usage' | 'free_monthly' | 'refund' | 'adjustment'
  creditsAmount: number
  balanceBefore: number
  balanceAfter: number
  description?: string
  dodoTransactionId?: string
  createdAt: string
}

class CreditsService {
  private supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>

  async initSupabase() {
    if (!this.supabase) {
      // Use service role client (bypasses RLS) — required for webhook handlers
      // Falls back to regular client if SUPABASE_SERVICE_ROLE_KEY is not set
      this.supabase = createAdminClient() ?? await createClient()
    }
    return this.supabase!
  }

  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<CreditBalance | null> {
    const supabase = await this.initSupabase()

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching credit balance:', error)
      return null
    }

    return {
      userId: data.user_id,
      balance: data.balance,
      totalPurchased: data.total_purchased || 0,
      totalUsed: data.total_used || 0,
      freeCreditsUsedThisMonth: data.free_credits_used_this_month || 0,
      lastMonthlyReset: data.last_monthly_reset,
    }
  }

  /**
   * Deduct credits from user balance (usage)
   */
  async deductCredits(
    userId: string,
    amount: number,
    description?: string,
    agentId?: string,
    executionLogId?: string
  ): Promise<{ success: boolean; balanceAfter: number }> {
    const supabase = await this.initSupabase()

    // Get current balance
    const balance = await this.getBalance(userId)
    if (!balance) {
      throw new Error('User credits not found')
    }

    if (balance.balance < amount) {
      throw new Error('Insufficient credits')
    }

    const newBalance = balance.balance - amount

    // Update balance
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        balance: newBalance,
        total_used: (balance.totalUsed || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating credits:', updateError)
      throw updateError
    }

    // Record transaction
    await this.recordTransaction(
      userId,
      'usage',
      -amount,
      balance.balance,
      newBalance,
      description || 'Agent execution',
      agentId,
      executionLogId
    )

    return { success: true, balanceAfter: newBalance }
  }

  /**
   * Add credits from purchase
   */
  async addCredits(
    userId: string,
    amount: number,
    dodoTransactionId?: string,
    description?: string
  ): Promise<{ success: boolean; balanceAfter: number }> {
    const supabase = await this.initSupabase()

    // Get current balance
    let balance = await this.getBalance(userId)

    // If user doesn't have a credits record, initialize it
    if (!balance) {
      console.log(`Initializing credits for new user: ${userId}`)
      const { error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          balance: 0,
          total_purchased: 0,
          total_used: 0,
          free_credits_used_this_month: 0,
          last_monthly_reset: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error initializing user credits:', insertError)
        throw insertError
      }

      // Fetch the newly created balance
      balance = await this.getBalance(userId)
      if (!balance) {
        throw new Error('Failed to initialize user credits')
      }
    }

    const newBalance = balance.balance + amount

    // Update balance
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        balance: newBalance,
        total_purchased: (balance.totalPurchased || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating credits:', updateError)
      throw updateError
    }

    // Record transaction
    await this.recordTransaction(
      userId,
      'purchase',
      amount,
      balance.balance,
      newBalance,
      description || 'Credit purchase',
      undefined,
      undefined,
      dodoTransactionId
    )

    // Grant deploy and share privileges
    await this.grantPaidTierPrivileges(userId)

    console.log(`✅ Added ${amount} credits to user ${userId}, new balance: ${newBalance}`)

    return { success: true, balanceAfter: newBalance }
  }

  /**
   * Record a credit transaction
   */
  private async recordTransaction(
    userId: string,
    transactionType: 'purchase' | 'usage' | 'free_monthly' | 'refund' | 'adjustment',
    creditsAmount: number,
    balanceBefore: number,
    balanceAfter: number,
    description: string,
    agentId?: string,
    executionLogId?: string,
    dodoTransactionId?: string
  ) {
    const supabase = await this.initSupabase()

    const { error } = await supabase.from('credit_transactions').insert({
      user_id: userId,
      agent_id: agentId,
      execution_log_id: executionLogId,
      transaction_type: transactionType,
      credits_amount: creditsAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description,
      dodo_transaction_id: dodoTransactionId,
    })

    if (error) {
      console.error('Error recording transaction:', error)
      // Don't throw - transaction recording failure shouldn't block credit usage
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string, limit = 50): Promise<CreditTransaction[]> {
    const supabase = await this.initSupabase()

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching transactions:', error)
      return []
    }

    return data.map((tx) => ({
      id: tx.id,
      userId: tx.user_id,
      transactionType: tx.transaction_type,
      creditsAmount: tx.credits_amount,
      balanceBefore: tx.balance_before,
      balanceAfter: tx.balance_after,
      description: tx.description,
      dodoTransactionId: tx.dodo_transaction_id,
      createdAt: tx.created_at,
    }))
  }

  /**
   * Grant paid tier privileges (deploy + share)
   */
  async grantPaidTierPrivileges(userId: string) {
    const supabase = await this.initSupabase()

    const { error } = await supabase
      .from('user_rate_limits')
      .upsert(
        {
          user_id: userId,
          can_deploy_agents: true,
          can_share_outputs: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Error granting privileges:', error)
    }
  }

  /**
   * Check if user can perform action (has credits and privileges)
   */
  async canPerformAction(
    userId: string,
    action: 'deploy' | 'share' | 'run_agent'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const balance = await this.getBalance(userId)
    if (!balance) {
      return { allowed: false, reason: 'User credits not initialized' }
    }

    if (action === 'deploy') {
      const limits = await this.getRateLimits(userId)
      if (!limits?.canDeployAgents) {
        return { allowed: false, reason: 'Upgrade required to deploy agents' }
      }
    }

    if (action === 'share') {
      const limits = await this.getRateLimits(userId)
      if (!limits?.canShareOutputs) {
        return { allowed: false, reason: 'Upgrade required to share outputs' }
      }
    }

    if (action === 'run_agent') {
      if (balance.balance <= 0) {
        return { allowed: false, reason: 'Insufficient credits' }
      }

      // Check 24-hour rate limit for free tier
      const limits = await this.getRateLimits(userId)
      if (!limits?.canDeployAgents) {
        // Free tier - check last run time
        if (limits?.lastAgentRun) {
          const lastRun = new Date(limits.lastAgentRun).getTime()
          const now = new Date().getTime()
          const hoursSinceRun = (now - lastRun) / (1000 * 60 * 60)
          if (hoursSinceRun < 24) {
            return {
              allowed: false,
              reason: `Free tier limited to 1 run per 24 hours. Next run available in ${Math.ceil(24 - hoursSinceRun)} hours.`,
            }
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Get user's rate limits
   */
  async getRateLimits(userId: string) {
    const supabase = await this.initSupabase()

    const { data, error } = await supabase
      .from('user_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // Return default free tier limits if record doesn't exist
      return {
        canDeployAgents: false,
        canShareOutputs: false,
        lastAgentRun: null,
      }
    }

    return {
      canDeployAgents: data.can_deploy_agents,
      canShareOutputs: data.can_share_outputs,
      lastAgentRun: data.last_agent_run,
    }
  }

  /**
   * Update last agent run time
   */
  async updateLastAgentRun(userId: string) {
    const supabase = await this.initSupabase()

    const { error } = await supabase
      .from('user_rate_limits')
      .upsert(
        {
          user_id: userId,
          last_agent_run: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Error updating last agent run:', error)
    }
  }
}

// Export singleton
const creditsService = new CreditsService()
export default creditsService
