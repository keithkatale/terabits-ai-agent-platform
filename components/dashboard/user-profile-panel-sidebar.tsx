'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface UserProfilePanelSidebarProps {
  user: User
  profile: Profile | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface CreditsData {
  balance: {
    balance: number
    totalPurchased: number
    totalUsed: number
    freeCreditsUsedThisMonth: number
    lastMonthlyReset: string
  }
  limits: {
    canDeployAgents: boolean
    canShareOutputs: boolean
    lastAgentRun: string | null
  }
}

export function UserProfilePanelSidebar({
  user,
  profile,
  isOpen,
  onOpenChange,
}: UserProfilePanelSidebarProps) {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchCreditsData()
    }
  }, [isOpen])

  const fetchCreditsData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/user/credits')
      if (!response.ok) {
        throw new Error('Failed to fetch credits data')
      }
      const data = await response.json()
      setCreditsData(data)
    } catch (err) {
      console.error('Error fetching credits:', err)
      setError('Failed to load credits information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      onOpenChange(false)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isPaidUser = creditsData?.limits?.canDeployAgents ?? false

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-14 bottom-0 z-40 w-full bg-background border-l border-border transition-all duration-300 ease-in-out md:relative md:top-0 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:w-0'
        } md:w-[420px] overflow-hidden`}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 z-10">
          <h2 className="text-lg font-semibold text-foreground">Account Details</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 pb-8">
            {/* User Info */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-card p-5">
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </h3>
                <p className="text-base font-semibold text-foreground">
                  {profile?.full_name ?? 'User'}
                </p>
              </div>
              <div className="space-y-1 pt-2 border-t border-border/30">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </h3>
                <p className="text-sm text-foreground break-all">{user.email}</p>
              </div>
            </div>

            {/* Credits Section */}
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Credits</h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
                  {error}
                </div>
              ) : creditsData ? (
                <div className="space-y-4">
                  {/* Current Balance */}
                  <div className="rounded-lg border border-primary/30 bg-primary/8 p-6">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Available Credits
                    </p>
                    <p className="mt-3 text-4xl font-bold text-primary">
                      {creditsData.balance.balance.toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      ≈ ${(creditsData.balance.balance * 0.003).toFixed(2)} USD value
                    </p>
                  </div>

                  {/* Credit Details */}
                  <div className="space-y-3 rounded-lg border border-border/50 bg-card p-5">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Total Purchased</span>
                      <span className="font-semibold text-foreground">
                        {creditsData.balance.totalPurchased.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/30 py-2">
                      <span className="text-sm text-muted-foreground">Total Used</span>
                      <span className="font-semibold text-foreground">
                        {creditsData.balance.totalUsed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/30 py-2">
                      <span className="text-sm text-muted-foreground">Free This Month</span>
                      <span className="font-semibold text-foreground">
                        {creditsData.balance.freeCreditsUsedThisMonth.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Plan Status */}
                  <div className="rounded-lg border border-border/50 bg-card p-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Plan Status
                    </p>
                    <div className="mt-3 flex items-center gap-2.5">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          isPaidUser ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="text-sm font-semibold text-foreground">
                        {isPaidUser ? 'Paid Plan' : 'Free Plan'}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {isPaidUser
                        ? 'You have full access to all features including deployment and sharing.'
                        : 'Limited to 1 agent run per 24 hours. Upgrade to deploy and share agents.'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm sticky bottom-0 p-6 space-y-2">
          <Button
            variant="outline"
            className="w-full h-10 rounded-md"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            variant="destructive"
            className="w-full h-10 rounded-md"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    </>
  )
}
