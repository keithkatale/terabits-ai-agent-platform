/**
 * Dodo Payments API Client
 * Handles all payment-related operations with Dodo Payments
 * Using overlay checkout with popup modal (no page navigation required)
 */

interface DodoConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
}

interface CreateCheckoutSessionParams {
  productId: string // Dodo product ID (e.g., pdt_0NZ2Nd7aaGSspgus57h5C)
  credits: number
  userId: string
  packageId: string
}

interface CreateCheckoutSessionResponse {
  sessionId: string
  checkoutUrl: string
}

interface WebhookPayload {
  id: string
  status: 'completed' | 'failed' | 'cancelled' | 'pending'
  amount: number
  metadata?: Record<string, unknown>
  timestamp: string
}

class DodoPaymentsClient {
  private apiKey: string
  private baseUrl: string
  private webhookSecret?: string
  private mode: 'test' | 'live' = 'test' // Default to test mode

  constructor(config: DodoConfig) {
    this.apiKey = config.apiKey
    // Use correct Dodo API endpoints:
    // Test: https://test.dodopayments.com
    // Live: https://live.dodopayments.com
    this.baseUrl = config.baseUrl || 'https://test.dodopayments.com'
    this.webhookSecret = config.webhookSecret
    // Determine mode from baseUrl
    this.mode = this.baseUrl?.includes('live') ? 'live' : 'test'
  }

  /**
   * Create a checkout session for overlay/popup checkout
   * Returns a checkout URL to be opened in the Dodo Payments SDK popup
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResponse> {
    const endpoint = `${this.baseUrl}/checkouts`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          product_cart: [
            {
              product_id: params.productId,
              quantity: 1,
            },
          ],
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
          metadata: {
            userId: params.userId,
            packageId: params.packageId,
            credits: String(params.credits),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Dodo Payments error:', errorData)
        throw new Error(`Dodo Payments API error: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return {
        sessionId: data.session_id,
        checkoutUrl: data.checkout_url,
      }
    } catch (error) {
      console.error('Failed to create Dodo checkout session:', error)
      throw error
    }
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId: string) {
    const endpoint = `${this.baseUrl}/checkouts/${sessionId}`

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get checkout session:', error)
      throw error
    }
  }

  /**
   * Verify webhook signature (HMAC-SHA256)
   * Dodo uses: signature = HMAC-SHA256(raw_body, webhook_secret)
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured')
      return false
    }

    try {
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch (error) {
      console.error('Signature verification error:', error)
      return false
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: string): WebhookPayload {
    try {
      return JSON.parse(payload)
    } catch (error) {
      console.error('Failed to parse webhook payload:', error)
      throw error
    }
  }

  /**
   * Get current mode (test or live)
   */
  getMode(): 'test' | 'live' {
    return this.mode
  }

  /**
   * Get SDK configuration for frontend initialization
   * This tells the Dodo SDK what mode to operate in
   */
  getSDKConfig() {
    return {
      mode: this.mode,
      displayType: 'overlay',
    }
  }
}

// Initialize and export singleton
const dodoClient = new DodoPaymentsClient({
  apiKey: process.env.DODO_API_KEY || '',
  // Use test endpoint by default, switch to live in production with env var
  baseUrl: process.env.DODO_API_URL || 'https://test.dodopayments.com',
  webhookSecret: process.env.DODO_WEBHOOK_SECRET,
})

export default dodoClient
export type { CreateCheckoutSessionParams, CreateCheckoutSessionResponse, WebhookPayload }
