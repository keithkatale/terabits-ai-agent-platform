import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import creditsService from '@/lib/payments/credits-service'

/**
 * GET: Fetch user's credit balance and account info
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get credit balance (initialize if not exists)
    let balance = await creditsService.getBalance(user.id)

    if (!balance) {
      // Initialize default credits for new users
      balance = {
        userId: user.id,
        balance: 500,
        totalPurchased: 0,
        totalUsed: 0,
        freeCreditsUsedThisMonth: 0,
        lastMonthlyReset: new Date().toISOString(),
      }
    }

    // Get rate limits (initialize if not exists)
    let limits = await creditsService.getRateLimits(user.id)
    if (!limits) {
      limits = {
        canDeployAgents: false,
        canShareOutputs: false,
        lastAgentRun: null,
      }
    }

    return NextResponse.json({
      balance,
      limits,
    })
  } catch (error) {
    console.error('Error fetching credits:', error)
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
  }
}
