import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import creditsService from '@/lib/payments/credits-service'

/**
 * POST: Check if user is allowed to perform an action
 */
export async function POST(request: NextRequest) {
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

    // Get action from request
    const { action } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    // Check if action is allowed
    const result = await creditsService.canPerformAction(
      user.id,
      action as 'deploy' | 'share' | 'run_agent'
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking action:', error)
    return NextResponse.json({ error: 'Failed to check action' }, { status: 500 })
  }
}
