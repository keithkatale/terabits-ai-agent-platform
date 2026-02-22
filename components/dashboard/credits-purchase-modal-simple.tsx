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

  const handleBuyCredits = async (packageId: string) => {
    if (!sdkLoaded) {
      alert('Payment system is still loading. Please try again in a moment.')
      return
    }

    setSelectedPackageId(packageId)
    await openCheckout(packageId)
    setSelectedPackageId(null)

    // Refresh credits after a short delay
    setTimeout(() => {
      fetchData()
    }, 2000)
  }

  // Calculate token equivalents for different models
  const tokenEstimates = credits ? {
    geminiFlash: Math.floor(credits * 8570),
    claudeSonnet: Math.floor(credits * 926),
    claudeOpus: Math.floor(credits * 55),
  } : null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
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
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Select a Plan</p>

            {isLoadingPackages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No packages available</p>
            ) : (
              <div className="grid gap-4 grid-cols-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handleBuyCredits(pkg.id)}
                    disabled={!sdkLoaded || isProcessing}
                    className={`relative flex flex-col rounded-xl border-2 p-5 text-left transition-all ${
                      selectedPackageId === pkg.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-border bg-card'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">${pkg.price_usd}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">One-time purchase</p>
                    </div>

                    {/* Credits */}
                    <div className="mb-4 flex-1 rounded-lg bg-primary/10 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground text-sm">
                          {pkg.credit_amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${(pkg.price_usd / pkg.credit_amount).toFixed(4)}/credit
                      </p>
                    </div>

                    {/* Button */}
                    <div className="w-full">
                      {!sdkLoaded ? (
                        <span className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading...
                        </span>
                      ) : isProcessing && selectedPackageId === pkg.id ? (
                        <span className="inline-flex items-center justify-center gap-2 text-xs text-primary font-medium">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Opening...
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-primary group-hover:underline">
                          Buy Credits →
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
