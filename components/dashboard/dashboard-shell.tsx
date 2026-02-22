'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { CreditsCounter } from './credits-counter'
import { CreditsPurchaseModalSimple } from './credits-purchase-modal-simple'
import { AccountDetailsPage } from './account-details-page'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface DashboardShellProps {
  user: User
  profile: Profile | null
  children: React.ReactNode
}

export function DashboardShell({ user, profile, children }: DashboardShellProps) {
  const pathname = usePathname()
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'account'>('dashboard')
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'My Employees' },
  ]

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <Logo size="md" withText />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => setCurrentPage('dashboard')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-foreground hover:bg-secondary/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Credits Counter - Opens Purchase Modal */}
            <CreditsCounter onCounterClick={() => setIsCreditsModalOpen(true)} />

            <Link href="/agent/new">
              <Button size="sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M12 5v14M5 12h14" /></svg>
                New Employee
              </Button>
            </Link>

            {/* Profile Icon - Navigates to Account Page */}
            <button
              onClick={() => setCurrentPage('account')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              title="Open account details"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {currentPage === 'account' ? (
          <AccountDetailsPage
            user={user}
            profile={profile}
            onBack={() => setCurrentPage('dashboard')}
            onOpenCreditsPurchase={() => setIsCreditsModalOpen(true)}
          />
        ) : (
          children
        )}
      </main>

      {/* Credits Purchase Modal */}
      <CreditsPurchaseModalSimple
        isOpen={isCreditsModalOpen}
        onOpenChange={setIsCreditsModalOpen}
      />
    </div>
  )
}
