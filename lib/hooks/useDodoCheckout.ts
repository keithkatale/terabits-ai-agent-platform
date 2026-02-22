'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Hook for managing Dodo Payments overlay checkout
 * Loads the SDK from jsDelivr CDN and provides methods to open checkout
 *
 * Dodo SDK is available at: https://cdn.jsdelivr.net/npm/dodopayments-checkout
 * When loaded via CDN, the SDK exports to window.DodoPaymentsCheckout.DodoPayments
 */
export function useDodoCheckout() {
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load Dodo Payments SDK from jsDelivr CDN
  useEffect(() => {
    // Check if SDK already loaded
    if ((window as any).DodoPaymentsCheckout?.DodoPayments) {
      // Initialize SDK
      const DodoPayments = (window as any).DodoPaymentsCheckout.DodoPayments
      DodoPayments.Initialize({
        mode: 'test', // Will be set based on environment
        displayType: 'overlay',
        onEvent: (event: any) => {
          console.log('Dodo SDK event:', event)
        },
      })
      setSdkLoaded(true)
      return
    }

    // Load SDK script from jsDelivr CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js'
    script.async = true
    script.onload = () => {
      // Initialize SDK after it loads
      try {
        const DodoPayments = (window as any).DodoPaymentsCheckout?.DodoPayments
        if (!DodoPayments) {
          console.error('DodoPayments not found after SDK load')
          setSdkLoaded(false)
          return
        }

        DodoPayments.Initialize({
          mode: 'test', // Switch to 'live' for production
          displayType: 'overlay',
          onEvent: (event: any) => {
            console.log('Dodo SDK event:', event.event_type, event)

            switch (event.event_type) {
              case 'checkout.opened':
                console.log('Checkout opened')
                break
              case 'checkout.error':
                console.error('Checkout error:', event.data?.message)
                break
              case 'checkout.closed':
                console.log('Checkout closed by user')
                break
            }
          },
        })
        setSdkLoaded(true)
      } catch (error) {
        console.error('Failed to initialize Dodo Payments SDK:', error)
        setSdkLoaded(false)
      }
    }
    script.onerror = () => {
      console.error('Failed to load Dodo Payments SDK script from CDN')
      setSdkLoaded(false)
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup: remove script if not used
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  /**
   * Open checkout overlay for a specific package
   */
  const openCheckout = useCallback(
    async (packageId: string) => {
      if (!sdkLoaded) {
        console.error('Dodo Payments SDK not loaded yet')
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

        const { checkoutUrl, orderId } = await response.json()

        console.log('Opening checkout with URL:', checkoutUrl)

        // Open checkout overlay popup
        // The SDK is accessed via window.DodoPaymentsCheckout.DodoPayments when loaded via CDN
        const DodoPayments = (window as any).DodoPaymentsCheckout?.DodoPayments
        if (!DodoPayments) {
          throw new Error('Dodo Payments SDK not available')
        }

        // Open checkout with the checkoutUrl from the backend
        DodoPayments.Checkout.open({
          checkoutUrl: checkoutUrl,
        })

        // The SDK will handle the payment flow and redirect via success_url/cancel_url
        // configured on the backend
      } catch (error) {
        console.error('Checkout error:', error)
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
