import { NextRequest, NextResponse } from 'next/server'
import dodoClient, { type WebhookPayload } from '@/lib/payments/dodo-client'
import creditsService from '@/lib/payments/credits-service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-dodo-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Verify webhook signature
    if (!dodoClient.verifyWebhookSignature(rawBody, signature)) {
      console.warn('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook payload
    const payload: WebhookPayload = dodoClient.parseWebhookPayload(rawBody)

    // Handle different webhook events
    switch (payload.status) {
      case 'completed':
        await handlePaymentCompleted(payload)
        break

      case 'failed':
        await handlePaymentFailed(payload)
        break

      case 'cancelled':
        await handlePaymentCancelled(payload)
        break

      default:
        console.warn(`Unknown webhook status: ${payload.status}`)
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
 * Handle successful payment
 */
async function handlePaymentCompleted(payload: WebhookPayload) {
  const supabase = await createClient()

  try {
    // Get order from database
    const { data: order, error: orderError } = await supabase
      .from('dodo_payments_orders')
      .select('*')
      .eq('dodo_order_id', payload.orderId)
      .single()

    if (orderError || !order) {
      throw new Error(`Order not found: ${payload.orderId}`)
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('dodo_payments_orders')
      .update({
        status: 'completed',
        payment_method: payload.metadata?.paymentMethod as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    // Add credits to user
    await creditsService.addCredits(
      order.user_id,
      order.credits_purchased,
      payload.orderId,
      `Credit purchase: $${(payload.amount / 100).toFixed(2)}`
    )

    console.log(`Payment completed for user ${order.user_id}: ${order.credits_purchased} credits`)
  } catch (error) {
    console.error('Error handling payment completion:', error)
    throw error
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payload: WebhookPayload) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('dodo_payments_orders')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('dodo_order_id', payload.orderId)

    if (error) {
      throw error
    }

    console.log(`Payment failed: ${payload.orderId}`)
  } catch (error) {
    console.error('Error handling payment failure:', error)
    throw error
  }
}

/**
 * Handle cancelled payment
 */
async function handlePaymentCancelled(payload: WebhookPayload) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('dodo_payments_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('dodo_order_id', payload.orderId)

    if (error) {
      throw error
    }

    console.log(`Payment cancelled: ${payload.orderId}`)
  } catch (error) {
    console.error('Error handling payment cancellation:', error)
    throw error
  }
}
