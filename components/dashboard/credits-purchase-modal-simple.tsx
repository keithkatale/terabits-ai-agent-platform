'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Zap } from 'lucide-react'
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
  dodo_product_id?: string
}

export function CreditsPurchaseModalSimple({ isOpen, onOpenChange }: CreditsPurchaseModalProps) {
  const [credits, setCredits] = useState<number | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const { sdkLoaded, isProcessing, openCheckout } = useDodoCheckout()
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)

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

  const handlePayment = async () => {
    if (!selectedPackageId) return
    if (!sdkLoaded) {
      alert('Payment system is still loading. Please try again in a moment.')
      return
    }

    await openCheckout(selectedPackageId)

    // Refresh credits after a short delay
    setTimeout(() => {
      fetchData()
    }, 2000)
  }

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId)

  // Calculate token equivalents for different models
  const tokenEstimates = credits ? {
    geminiFlash: Math.floor(credits * 8570),
    claudeSonnet: Math.floor(credits * 926),
    claudeOpus: Math.floor(credits * 55),
  } : null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-4">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-lg">Buy Credits</DialogTitle>
          <DialogDescription className="text-xs">
            Purchase credits to run more AI agents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Current Credits */}
          {isLoadingCredits ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border border-primary/30 bg-primary/8 p-3">
              <p className="text-xs font-medium text-muted-foreground">Your Credits</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {credits?.toLocaleString() ?? '0'}
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ ${(credits ? credits * 0.003 : 0).toFixed(2)} USD
              </p>
            </div>
          )}

          {/* Package Selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Select a Plan</p>

            {isLoadingPackages ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No packages available</p>
            ) : (
              <div className="grid gap-2 grid-cols-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`relative flex flex-col rounded-md border-2 p-2 text-left transition-all ${
                      selectedPackageId === pkg.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-border bg-card'
                    }`}
                  >
                    {/* Price */}
                    <div className="mb-1">
                      <span className="text-xl font-bold text-foreground">${pkg.price_usd}</span>
                      <p className="text-xs text-muted-foreground">One-time</p>
                    </div>

                    {/* Credits */}
                    <div className="mb-2 flex-1 rounded-sm bg-primary/10 p-1.5">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="font-semibold text-foreground text-xs">
                          {pkg.credit_amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${(pkg.price_usd / pkg.credit_amount).toFixed(4)}/ea
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!selectedPackageId || isProcessing || !sdkLoaded}
              className="flex-1 h-8 text-xs"
            >
              {!sdkLoaded ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Loading
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Processing
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
