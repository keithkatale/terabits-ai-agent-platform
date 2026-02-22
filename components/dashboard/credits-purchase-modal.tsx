'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useDodoCheckout } from '@/lib/hooks/useDodoCheckout'

interface CreditsPurchaseModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface CreditPackage {
  id: string
  price_usd: number
  credit_amount: number
  is_active: boolean
}

export function CreditsPurchaseModal({ isOpen, onOpenChange }: CreditsPurchaseModalProps) {
  const [credits, setCredits] = useState<number | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null)
  const { sdkLoaded, isProcessing, openCheckout } = useDodoCheckout()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setIsLoadingCredits(true)
    setIsLoadingPackages(true)
    try {
      // Fetch current credits
      const creditsRes = await fetch('/api/user/credits')
      if (creditsRes.ok) {
        const data = await creditsRes.json()
        setCredits(data.balance?.balance ?? 0)
      }

      // Fetch packages
      const packagesRes = await fetch('/api/packages')
      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.filter((pkg: CreditPackage) => pkg.is_active))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoadingCredits(false)
      setIsLoadingPackages(false)
    }
  }

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!sdkLoaded) {
      alert('Payment system is still loading. Please try again in a moment.')
      return
    }

    await openCheckout(pkg.id)

    // Refresh credits after a short delay to allow payment to process
    setTimeout(() => {
      fetchData()
    }, 2000)
  }

  // Calculate token equivalents for different models
  const tokenEstimates = credits ? {
    geminiFlash: Math.floor(credits * 8570), // 8.57K tokens per credit for Flash
    claudeSonnet: Math.floor(credits * 926), // 926 tokens per credit for Sonnet
    claudeOpus: Math.floor(credits * 55), // 55 tokens per credit for Opus
  } : null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buy Credits</DialogTitle>
          <DialogDescription>
            Purchase credits to run more AI agents or upgrade your plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Credits */}
          {isLoadingCredits ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border border-primary/30 bg-primary/8 p-6">
              <p className="text-sm font-medium text-muted-foreground">Your Current Credits</p>
              <p className="mt-3 text-3xl font-bold text-primary">
                {credits?.toLocaleString() ?? '0'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                ≈ ${(credits ? credits * 0.003 : 0).toFixed(2)} USD value
              </p>

              {/* Token Estimates */}
              {tokenEstimates && (
                <div className="mt-4 space-y-2 border-t border-primary/20 pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Token Estimates
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium">Gemini 3 Flash:</span> ~{tokenEstimates.geminiFlash.toLocaleString()} tokens
                    </p>
                    <p>
                      <span className="font-medium">Claude Sonnet:</span> ~{tokenEstimates.claudeSonnet.toLocaleString()} tokens
                    </p>
                    <p>
                      <span className="font-medium">Claude Opus:</span> ~{tokenEstimates.claudeOpus.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Package Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Select a Plan</p>

            {isLoadingPackages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No packages available</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      selectedPackage?.id === pkg.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <p className="font-semibold text-foreground">
                      ${pkg.price_usd}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pkg.credit_amount.toLocaleString()} credits
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ${(pkg.price_usd / pkg.credit_amount).toFixed(4)}/credit
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPackage && handlePurchase(selectedPackage)}
              disabled={!selectedPackage || isProcessing || !sdkLoaded}
              className="flex-1"
            >
              {!sdkLoaded ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Continue to Pay $${selectedPackage?.price_usd || '0'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
