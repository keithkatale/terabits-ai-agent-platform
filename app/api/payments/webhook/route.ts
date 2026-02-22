import { NextRequest, NextResponse } from 'next/server'
import creditsService from '@/lib/payments/credits-service'
import { createClient } from '@/lib/supabase/server'

interface DodoWebhookPayload {
  type: string
  timestamp: string
  data: {
    subscription_id?: string
    status?: string
    metadata?: {
      userId?: string
      credits?: string
      packageId?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: DodoWebhookPayload = await request.json()

    console.log(`Received Dodo webhook: ${payload.type}`)

    // Handle different webhook event types
    switch (payload.type) {
      case 'subscription.active':
        await handleSubscriptionActive(payload)
        break

      case 'subscription.renewed':
        await handleSubscriptionRenewed(payload)
        break

      case 'payment.succeeded':
        await handlePaymentSucceeded(payload)
        break

      default:
        console.log(`Ignoring webhook type: ${payload.type}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle subscription active (initial successful payment)
 */
async function handleSubscriptionActive(payload: DodoWebhookPayload) {
  const supabase = await createClient()

  try {
    const data = payload.data
    const userId = data.metadata?.userId
    const creditsString = data.metadata?.credits
    const packageId = data.metadata?.packageId

    if (!userId || !creditsString || !packageId) {
      console.warn('Missing metadata in subscription.active webhook', data.metadata)
      return
    }

    const credits = parseInt(creditsString, 10)
    if (isNaN(credits)) {
      console.warn('Invalid credits value in metadata:', creditsString)
      return
    }

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from('dodo_payments_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('credit_package_id', packageId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!order) {
      console.warn(`No pending order found for user ${userId} and package ${packageId}`)
      // Still add credits even if order not found, as the payment was successful
      await creditsService.addCredits(
        userId,
        credits,
        data.subscription_id || 'unknown',
        `Credit purchase from subscription ${data.subscription_id}`
      )
      return
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('dodo_payments_orders')
      .update({
        status: 'completed',
        dodo_order_id: data.subscription_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    // Add credits to user
    await creditsService.addCredits(
      userId,
      credits,
      data.subscription_id || 'unknown',
      `Credit purchase: ${credits} credits`
    )

    console.log(`✅ Subscription active: Added ${credits} credits to user ${userId}`)
  } catch (error) {
    console.error('Error handling subscription.active:', error)
    throw error
  }
}

/**
 * Handle subscription renewed
 */
async function handleSubscriptionRenewed(payload: DodoWebhookPayload) {
  const supabase = await createClient()

  try {
    const data = payload.data
    const userId = data.metadata?.userId
    const creditsString = data.metadata?.credits

    if (!userId || !creditsString) {
      console.warn('Missing metadata in subscription.renewed webhook')
      return
    }

    const credits = parseInt(creditsString, 10)
    if (isNaN(credits)) {
      console.warn('Invalid credits value in metadata:', creditsString)
      return
    }

    // Add credits to user for renewal
    await creditsService.addCredits(
      userId,
      credits,
      data.subscription_id || 'unknown',
      `Subscription renewal: ${credits} credits`
    )

    console.log(`✅ Subscription renewed: Added ${credits} credits to user ${userId}`)
  } catch (error) {
    console.error('Error handling subscription.renewed:', error)
    throw error
  }
}

/**
 * Handle payment succeeded (single payment, not subscription)
 */
async function handlePaymentSucceeded(payload: DodoWebhookPayload) {
  const supabase = await createClient()

  try {
    const data = payload.data
    const userId = data.metadata?.userId
    const creditsString = data.metadata?.credits

    if (!userId || !creditsString) {
      console.warn('Missing metadata in payment.succeeded webhook')
      return
    }

    const credits = parseInt(creditsString, 10)
    if (isNaN(credits)) {
      console.warn('Invalid credits value in metadata:', creditsString)
      return
    }

    // Add credits to user
    await creditsService.addCredits(
      userId,
      credits,
      data.subscription_id || 'unknown',
      `Payment succeeded: ${credits} credits`
    )

    console.log(`✅ Payment succeeded: Added ${credits} credits to user ${userId}`)
  } catch (error) {
    console.error('Error handling payment.succeeded:', error)
    throw error
  }
}
