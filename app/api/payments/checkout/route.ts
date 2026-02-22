import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import dodoClient from '@/lib/payments/dodo-client'

/**
 * POST /api/payments/checkout
 * Creates a Dodo Payments checkout session for overlay/popup checkout
 * Returns the checkout URL to open in the Dodo SDK popup
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

    // Get request body
    const { packageId } = await request.json()

    if (!packageId) {
      return NextResponse.json({ error: 'Missing packageId' }, { status: 400 })
    }

    // Fetch credit package details
    const { data: package_, error: pkgError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkgError || !package_) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (!package_.is_active) {
      return NextResponse.json({ error: 'Package is not available' }, { status: 400 })
    }

    // Verify package has a Dodo product ID
    if (!package_.dodo_product_id) {
      console.error(`Package ${packageId} has no dodo_product_id configured`)
      return NextResponse.json({ error: 'Package configuration error' }, { status: 400 })
    }

    // Create order record in database
    const { data: order, error: orderError } = await supabase
      .from('dodo_payments_orders')
      .insert({
        user_id: user.id,
        credit_package_id: packageId,
        amount_usd: package_.price_usd * 100, // Store in cents
        credits_purchased: package_.credit_amount,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating order record:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create checkout session with Dodo Payments
    try {
      const session = await dodoClient.createCheckoutSession({
        productId: package_.dodo_product_id, // Use Dodo product ID
        credits: package_.credit_amount,
        userId: user.id,
        packageId: packageId,
      })

      // Update order with Dodo checkout session ID
      const { error: updateError } = await supabase
        .from('dodo_payments_orders')
        .update({
          dodo_order_id: session.sessionId,
        })
        .eq('id', order.id)

      if (updateError) {
        console.warn('Error updating order with session ID:', updateError)
        // Don't fail - order is still valid without session ID in DB
      }

      // Return checkout URL for popup overlay
      return NextResponse.json({
        success: true,
        checkoutUrl: session.checkoutUrl, // URL to open in DodoPayments.Checkout.open()
        sessionId: session.sessionId,
        orderId: order.id,
      })
    } catch (dodoError) {
      console.error('Dodo Payments API error:', dodoError)

      // Mark order as failed
      await supabase
        .from('dodo_payments_orders')
        .update({ status: 'failed' })
        .eq('id', order.id)

      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
