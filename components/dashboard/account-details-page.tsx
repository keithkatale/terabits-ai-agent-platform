'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Mail, CheckCircle, XCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { useRouter, useSearchParams } from 'next/navigation'

interface AccountDetailsPageProps {
  user: User
  profile: Profile | null
  onBack: () => void
  onOpenCreditsPurchase: () => void
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

export function AccountDetailsPage({
  user,
  profile,
  onBack,
  onOpenCreditsPurchase,
}: AccountDetailsPageProps) {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [gmailMessage, setGmailMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    fetchCreditsData()
  }, [])

  useEffect(() => {
    fetch('/api/integrations/gmail/status')
      .then((r) => r.json())
      .then((d) => setGmailConnected(d.connected))
      .catch(() => setGmailConnected(false))
  }, [])

  useEffect(() => {
    const gmail = searchParams.get('gmail')
    if (!gmail) return
    if (gmail === 'connected') {
      setGmailConnected(true)
      setGmailMessage('Gmail connected. You can send email through your Gmail from agents.')
    } else if (gmail === 'denied' || gmail === 'error') {
      const err = searchParams.get('error') || (gmail === 'denied' ? 'Access was denied.' : 'Something went wrong.')
      setGmailMessage(err)
    }
    const u = new URL(window.location.href)
    u.searchParams.delete('gmail')
    u.searchParams.delete('error')
    window.history.replaceState({}, '', u.pathname + u.search)
  }, [searchParams])

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

  const handleGmailConnect = () => {
    window.location.href = '/api/integrations/gmail/connect'
  }

  const handleGmailDisconnect = async () => {
    try {
      const res = await fetch('/api/integrations/gmail/disconnect', { method: 'POST' })
      if (res.ok) {
        setGmailConnected(false)
        setGmailMessage(null)
      }
    } catch {
      setGmailMessage('Failed to disconnect Gmail.')
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      onBack()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isPaidUser = creditsData?.limits?.canDeployAgents ?? false

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Page Header with Back Button */}
      <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-foreground">Account Details</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="flex flex-col gap-8">
            {/* User Info */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-card p-6">
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </h3>
                <p className="text-base font-semibold text-foreground">
                  {profile?.full_name ?? 'User'}
                </p>
              </div>
              <div className="space-y-1 pt-4 border-t border-border/30">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </h3>
                <p className="text-sm text-foreground break-all">{user.email}</p>
              </div>
            </div>

            {/* Appearance / Theme */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Theme</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Switch between dark and light mode
                </p>
              </div>
              <ThemeToggle variant="outline" size="icon" />
            </div>

            {/* Gmail integration */}
            <div className="rounded-lg border border-border/50 bg-card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Gmail</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect your Gmail so agents can send email on your behalf (from your Gmail address).
              </p>
              {gmailMessage && (
                <p className={`text-xs flex items-center gap-1.5 ${gmailMessage.startsWith('Gmail connected') ? 'text-green-700' : 'text-destructive'}`}>
                  {gmailMessage.startsWith('Gmail connected') ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {gmailMessage}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {gmailConnected === null ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                  </span>
                ) : gmailConnected ? (
                  <>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                      Connected
                    </span>
                    <Button variant="outline" size="sm" onClick={handleGmailDisconnect}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={handleGmailConnect}>
                    Connect Gmail
                  </Button>
                )}
              </div>
            </div>

            {/* Credits Section */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Credits</h2>
                <Button onClick={onOpenCreditsPurchase} size="sm">
                  Buy Credits
                </Button>
              </div>

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

            {/* Actions */}
            <div className="space-y-2 border-t border-border/30 pt-6">
              <Button
                variant="outline"
                className="w-full h-10 rounded-md"
                onClick={onBack}
              >
                Back to Dashboard
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
        </div>
      </div>
    </div>
  )
}
