'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Global flag to track if SDK initialization has been attempted
 * Prevents multiple initializations across component mounts
 */
let sdkInitialized = false
let sdkInitPromise: Promise<boolean> | null = null

/**
 * Initialize Dodo Payments SDK globally (once per app)
 * Per documentation: Initialize SDK once when app loads, not on every component render
 */
function initializeDodoSDK(): Promise<boolean> {
  // Return existing initialization promise if already in progress
  if (sdkInitPromise) {
    return sdkInitPromise
  }

  // Check if already initialized
  if (sdkInitialized && (window as any).DodoPaymentsCheckout?.DodoPayments) {
    return Promise.resolve(true)
  }

  sdkInitPromise = new Promise((resolve) => {
    // Check if SDK script already exists in DOM
    const existingScript = document.querySelector('script[src*="dodopayments-checkout"]')
    if (existingScript) {
      // Script already loaded, try initializing
      if ((window as any).DodoPaymentsCheckout?.DodoPayments) {
        initializeSDK()
        sdkInitialized = true
        resolve(true)
        return
      }
    }

    // Load SDK script from jsDelivr CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js'
    script.async = true

    script.onload = () => {
      try {
        initializeSDK()
        sdkInitialized = true
        resolve(true)
      } catch (error) {
        console.error('Failed to initialize Dodo Payments SDK:', error)
        resolve(false)
      }
    }

    script.onerror = () => {
      console.error('Failed to load Dodo Payments SDK from CDN')
      resolve(false)
    }

    document.head.appendChild(script)
  })

  return sdkInitPromise
}

/**
 * Initialize the SDK with proper event handlers
 * Per documentation: Always initialize SDK with onEvent callback
 */
function initializeSDK() {
  const DodoPayments = (window as any).DodoPaymentsCheckout?.DodoPayments
  if (!DodoPayments) {
    throw new Error('DodoPayments not found in window')
  }

  DodoPayments.Initialize({
    mode: process.env.NEXT_PUBLIC_DODO_MODE || 'test',
    displayType: 'overlay',
    onEvent: (event: any) => {
      console.log('[Dodo Event]', event.event_type, event.data)

      switch (event.event_type) {
        case 'checkout.opened':
          console.log('✅ Checkout overlay opened')
          break
        case 'checkout.form_ready':
          // Per documentation: "form is ready to receive user input"
          // This fires when the overlay is fully rendered and interactive
          console.log('✅ Checkout form ready for input')
          break
        case 'checkout.payment_page_opened':
          console.log('✅ Payment page opened')
          break
        case 'checkout.customer_details_submitted':
          console.log('✅ Customer details submitted')
          break
        case 'checkout.closed':
          console.log('ℹ️ Checkout closed by user')
          break
        case 'checkout.redirect':
          console.log('↗️ Checkout will redirect')
          break
        case 'checkout.error':
          console.error('❌ Checkout error:', event.data?.message)
          break
        case 'checkout.link_expired':
          console.warn('⚠️ Checkout link expired')
          break
      }
    },
  })
}

/**
 * Hook for managing Dodo Payments overlay checkout
 * Initializes SDK once globally, then provides checkout functionality
 *
 * Per documentation best practices:
 * - Initialize once when app loads (not on every component mount)
 * - Listen to checkout.form_ready to know when form is interactive
 * - Handle all relevant events for complete UX
 */
export function useDodoCheckout() {
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const initAttempted = useRef(false)

  // Initialize SDK once (global initialization)
  useEffect(() => {
    if (initAttempted.current) return
    initAttempted.current = true

    initializeDodoSDK().then((success) => {
      setSdkLoaded(success)
    })
  }, [])

  /**
   * Open checkout overlay for a specific package
   * Per documentation: Pass checkoutUrl to DodoPayments.Checkout.open()
   */
  const openCheckout = useCallback(
    async (packageId: string) => {
      if (!sdkLoaded) {
        console.error('Dodo Payments SDK not loaded')
        return
      }

      if (isProcessing) {
        return
      }

      setIsProcessing(true)

      try {
        // Call backend to create checkout session
        const response = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create checkout session')
        }

        const { checkoutUrl } = await response.json()
        console.log('Opening checkout...')

        const DodoPayments = (window as any).DodoPaymentsCheckout?.DodoPayments
        if (!DodoPayments) {
          throw new Error('Dodo Payments SDK not available')
        }

        // Open overlay checkout
        // Per documentation: Pass checkoutUrl directly
        DodoPayments.Checkout.open({
          checkoutUrl: checkoutUrl,
          options: {
            showTimer: true,
            showSecurityBadge: true,
          },
        })

        // Note: Processing state is kept true until checkout closes
        // The SDK handles the full payment flow and redirects
      } catch (error) {
        console.error('Failed to open checkout:', error)
        alert(
          error instanceof Error ? error.message : 'Failed to open checkout. Please try again.'
        )
        setIsProcessing(false)
      }
    },
    [sdkLoaded, isProcessing]
  )

  return {
    sdkLoaded,
    isProcessing,
    openCheckout,
  }
}
