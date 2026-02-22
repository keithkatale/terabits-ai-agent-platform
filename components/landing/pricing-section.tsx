'use client'

import { Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useDodoCheckout } from '@/lib/hooks/useDodoCheckout'
import { useAuth } from '@/lib/hooks/useAuth'
import { useState, useEffect } from 'react'

interface CreditPackage {
  id: string
  price: number // Mapped from price_usd
  credits: number // Mapped from credit_amount
  costPerCredit: number // Mapped from cost_per_credit
  dodo_product_id: string
  is_active: boolean
  popular?: boolean
}

export function PricingSection() {
  const { openCheckout, isProcessing } = useDodoCheckout()
  const { user } = useAuth()
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)

  // Fetch credit packages from database
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        // Query Supabase directly to get packages
        const response = await fetch('/api/packages', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          const data = await response.json()
          // Map database fields to component fields and mark popular package
          const mappedPackages = data.map((pkg: any) => ({
            id: pkg.id,
            price: pkg.price_usd, // Map price_usd to price
            credits: pkg.credit_amount, // Map credit_amount to credits
            costPerCredit: pkg.cost_per_credit, // Map cost_per_credit to costPerCredit
            dodo_product_id: pkg.dodo_product_id,
            is_active: pkg.is_active,
            popular: pkg.credit_amount === 8000, // 8000 credits package is popular
          }))
          setPackages(mappedPackages)
        } else {
          // Fallback to hardcoded packages if API fails
          setPackages(getFallbackPackages())
        }
      } catch (error) {
        console.error('Failed to fetch packages:', error)
        setPackages(getFallbackPackages())
      } finally {
        setLoadingPackages(false)
      }
    }

    fetchPackages()
  }, [])

  const handleBuyCredits = async (packageId: string) => {
    // Check if user is authenticated
    if (!user) {
      // Redirect to signup
      window.location.href = '/auth/sign-up?redirect=/pricing'
      return
    }

    setSelectedPackageId(packageId)
    await openCheckout(packageId)
    setSelectedPackageId(null)
  }

  // Fallback packages in case database fetch fails
  const getFallbackPackages = (): CreditPackage[] => [
    {
      id: 'fallback-1',
      price: 20,
      credits: 5000,
      costPerCredit: 0.004,
      dodo_product_id: 'pdt_0NZ2Nd7aaGSspgus57h5C',
      is_active: true,
    },
    {
      id: 'fallback-2',
      price: 30,
      credits: 8000,
      costPerCredit: 0.00375,
      dodo_product_id: 'pdt_0NZ2NXjwIZyuvyR6YHDJm',
      is_active: true,
      popular: true,
    },
    {
      id: 'fallback-3',
      price: 40,
      credits: 11000,
      costPerCredit: 0.00364,
      dodo_product_id: 'pdt_0NZ2NJoq334gbGHYvofsW',
      is_active: true,
    },
    {
      id: 'fallback-4',
      price: 50,
      credits: 15000,
      costPerCredit: 0.00333,
      dodo_product_id: 'pdt_0NZ2NEYZXmDRX8QNYPFXX',
      is_active: true,
    },
  ]

  // Use fetched packages or fallback
  const creditPackages = packages.length > 0 ? packages : getFallbackPackages()
  return (
    <section id="pricing" className="w-full bg-background py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Pay as You Grow
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free. Buy credits only when you need them. No subscriptions, no surprises.
          </p>
        </div>

        {/* Pricing Structure */}
        <div className="space-y-16">
          {/* Free Tier */}
          <div className="border border-border rounded-xl p-8 md:p-12 bg-card">
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-foreground mb-2">Free Plan</h3>
                <p className="text-muted-foreground">Perfect for getting started and learning</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Features */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground mb-4">What's included:</h4>
                  <div className="space-y-3">
                    {[
                      'Build unlimited agents',
                      '500 free credits per month',
                      'Execution logs & monitoring',
                      'View agent outputs',
                      'Community support',
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Limitations */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground mb-4">Limitations:</h4>
                  <div className="space-y-3">
                    {[
                      'Run agents once every 24 hours',
                      'Cannot deploy agents publicly',
                      'Cannot share data outputs',
                      'Export requires upgrade',
                    ].map((limitation, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded border border-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/auth/sign-up">
                  <Button variant="outline" size="lg">
                    Start Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Credit Packages */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
              Buy Credits as Needed
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {creditPackages.map((pkg, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col rounded-xl border transition-all ${
                    pkg.popular
                      ? 'border-primary bg-primary/5 md:scale-105'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Popular Badge */}
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Best Value
                      </div>
                    </div>
                  )}

                  <div className="p-6 flex flex-col h-full">
                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-bold text-foreground">${pkg.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">One-time purchase</p>
                    </div>

                    {/* Credits */}
                    <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-foreground">{pkg.credits.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pkg.costPerCredit.toFixed(4)}¢ per credit
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button
                        onClick={() => handleBuyCredits(pkg.id)}
                        disabled={isProcessing && selectedPackageId === pkg.id}
                        className="w-full"
                        variant={pkg.popular ? 'default' : 'outline'}
                        size="lg"
                      >
                        {isProcessing && selectedPackageId === pkg.id ? 'Opening Checkout...' : 'Buy Credits'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Credits never expire and roll over each month
            </p>
          </div>

          {/* Enterprise */}
          <div className="border border-primary rounded-xl p-8 md:p-12 bg-primary/5">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-3xl font-bold text-foreground mb-4">Enterprise</h3>
              <p className="text-muted-foreground mb-6">
                Custom agents built by our team with dedicated support and advanced integrations.
              </p>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-bold text-foreground">$200+</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  'Dedicated team of AI builders',
                  'Custom agent architecture',
                  'Advanced API integrations',
                  'SLA & uptime guarantees',
                  'Custom training & onboarding',
                  '24/7 priority support',
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Link href="mailto:sales@terabits.ai">
                <Button variant="default" size="lg">
                  Contact Sales Team
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 pt-16 border-t border-border">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            How Credits Work
          </h3>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Flexible Usage</h4>
              <p className="text-sm text-muted-foreground">
                Use credits for any agent execution. Each run consumes credits based on complexity and tools used.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">No Subscriptions</h4>
              <p className="text-sm text-muted-foreground">
                Pay only for what you use. Buy more credits anytime. No recurring charges.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Instant Upgrades</h4>
              <p className="text-sm text-muted-foreground">
                Free plan users get upgraded instantly when they purchase credits. No waiting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
