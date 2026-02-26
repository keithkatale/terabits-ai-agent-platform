'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CreditsCounter } from './credits-counter'
import { CreditsPurchaseModalSimple } from './credits-purchase-modal-simple'
import { AccountDetailsPage } from './account-details-page'
import { ConnectedAccounts } from './connected-accounts'
import { SidebarCollapseProvider, useSidebarCollapse } from './sidebar-collapse-context'
import { HeaderTitleProvider, useHeaderTitle } from './header-title-context'
import { DashboardTabProvider, type DashboardTab } from './dashboard-tab-context'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

function SidebarColumn({ sidebar, footer }: { sidebar: React.ReactNode; footer?: React.ReactNode }) {
  const collapse = useSidebarCollapse()
  const collapsed = collapse?.collapsed ?? false
  return (
    <div
      className={cn(
        'hidden h-full shrink-0 flex-col bg-[#f7f6f3] transition-[width] duration-200 ease-out md:flex',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">{sidebar}</div>
      {footer != null && (
        <div className="shrink-0 p-3 pt-2 flex items-center justify-center gap-2">
          {footer}
        </div>
      )}
    </div>
  )
}

interface DashboardShellProps {
  user: User
  profile: Profile | null
  children: React.ReactNode
  /** When set, left sidebar is full viewport height; header + main are only in the right column (top bar ends where sidebar begins). */
  sidebar?: React.ReactNode
}

/** Renders the top bar; when sidebar is present, logo only shows when sidebar is collapsed (avoids duplication). */
function DashboardHeader({
  sidebarPresent,
  headerRight,
}: {
  sidebarPresent: boolean
  headerRight: React.ReactNode
}) {
  const { title: headerTitle } = useHeaderTitle()
  const collapse = useSidebarCollapse()
  const sidebarCollapsed = collapse?.collapsed ?? false

  const showLogoInTopBar = sidebarPresent
    ? sidebarCollapsed && !headerTitle
    : !headerTitle

  const headerLeft = headerTitle ? (
    <span className="truncate text-sm font-semibold text-foreground" title={headerTitle}>
      {headerTitle}
    </span>
  ) : showLogoInTopBar ? (
    <Link href={sidebarPresent ? '/workflow' : '/chat'} className="flex min-w-0 flex-1 items-center justify-start">
      {sidebarPresent && sidebarCollapsed ? (
        <span className="text-sm font-semibold text-foreground">Terabits</span>
      ) : (
        <Logo size="xs" withText />
      )}
    </Link>
  ) : null

  return (
    <header className="sticky top-0 z-40 shrink-0 bg-[#f7f6f3] pt-safe">
      <div className="flex h-12 w-full items-center justify-between gap-3 px-4 md:h-10 md:px-6 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center justify-start">
          {headerLeft}
        </div>
        {headerRight}
      </div>
    </header>
  )
}

/** Scrollable tab content wrapper so settings/connections/account can scroll inside the main area. */
function TabScrollArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-safe">{children}</div>
    </div>
  )
}

/** Renders header + main; must be inside HeaderTitleProvider so useHeaderTitle() sees the workflow title. */
function DashboardShellInner({ user, profile, children, sidebar, currentPage, setCurrentPage, isCreditsModalOpen, setIsCreditsModalOpen, initials }: DashboardShellProps & {
  currentPage: DashboardTab
  setCurrentPage: (p: DashboardTab) => void
  isCreditsModalOpen: boolean
  setIsCreditsModalOpen: (v: boolean) => void
  initials: string
}) {
  const headerRight = (
    <div className="flex items-center gap-3 md:gap-3">
      <ThemeToggle variant="ghost" size="icon-sm" className="touch-target flex md:size-8" />
      <CreditsCounter onCounterClick={() => setIsCreditsModalOpen(true)} />
      <button
        onClick={() => setCurrentPage('account')}
        className="touch-target flex shrink-0 items-center justify-center rounded-full bg-[#f7f6f3] text-[10px] font-medium text-account-foreground transition-colors hover:bg-[#f7f6f3]/80 md:h-7 md:w-7 md:min-h-0 md:min-w-0"
        title="Open account details"
      >
        {initials}
      </button>
    </div>
  )

  const mainContent =
    currentPage === 'account' ? (
      <AccountDetailsPage
        user={user}
        profile={profile}
        onBack={() => setCurrentPage('dashboard')}
        onOpenCreditsPurchase={() => setIsCreditsModalOpen(true)}
      />
    ) : currentPage === 'settings' ? (
      <TabScrollArea>
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, integrations, and AI agent permissions.
          </p>
          <div className="mt-6">
            <ConnectedAccounts />
          </div>
        </div>
      </TabScrollArea>
    ) : currentPage === 'connections' ? (
      <TabScrollArea>
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <ConnectedAccounts />
        </div>
      </TabScrollArea>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col bg-[#f7f6f3] p-3 pr-4 pb-4 pt-3">
        <div className="min-h-0 flex-1 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    )

  const headerAndMain = (
    <>
      <DashboardHeader sidebarPresent={sidebar != null} headerRight={headerRight} />

      <main className="min-h-0 flex-1 overflow-hidden pb-safe px-safe flex flex-col">
        {mainContent}
      </main>
    </>
  )

  if (sidebar != null) {
    return (
      <SidebarCollapseProvider>
        <div className="flex h-svh overflow-hidden">
          <SidebarColumn sidebar={sidebar} footer={headerRight} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <main className="min-h-0 flex-1 overflow-hidden pb-safe px-safe flex flex-col">
              {mainContent}
            </main>
          </div>
        </div>
        <CreditsPurchaseModalSimple
          isOpen={isCreditsModalOpen}
          onOpenChange={setIsCreditsModalOpen}
        />
      </SidebarCollapseProvider>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      {headerAndMain}
      <CreditsPurchaseModalSimple
        isOpen={isCreditsModalOpen}
        onOpenChange={setIsCreditsModalOpen}
      />
    </div>
  )
}

export function DashboardShell({ user, profile, children, sidebar }: DashboardShellProps) {
  const [currentPage, setCurrentPage] = useState<DashboardTab>('dashboard')
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false)
  const pathname = usePathname()

  // Reset to dashboard view whenever the user navigates to a different route
  useEffect(() => {
    setCurrentPage('dashboard')
  }, [pathname])

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <HeaderTitleProvider>
      <DashboardTabProvider currentTab={currentPage} setCurrentTab={setCurrentPage}>
        <DashboardShellInner
          user={user}
          profile={profile}
          sidebar={sidebar}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isCreditsModalOpen={isCreditsModalOpen}
          setIsCreditsModalOpen={setIsCreditsModalOpen}
          initials={initials}
        >
          {children}
        </DashboardShellInner>
      </DashboardTabProvider>
    </HeaderTitleProvider>
  )
}
