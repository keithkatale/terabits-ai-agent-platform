'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Plus, Search, PanelLeftClose, PanelLeft, ChevronDown, Workflow, MoreVertical, Trash2, Settings, Plug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebarCollapse } from '@/components/dashboard/sidebar-collapse-context'
import { useDashboardTab } from '@/components/dashboard/dashboard-tab-context'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface Desktop {
  id: string
  title: string | null
  project_instructions: string | null
  created_at: string
  updated_at: string
}

interface WorkflowSummary {
  id: string
  slug?: string
  name: string
  updated_at: string
}

export function DashboardChatSidebar({
  user,
  profile,
}: {
  user?: User | null
  profile?: Profile | null
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Prefer session from path /chat/[id]; fall back to legacy ?session=
  const pathSession = pathname?.startsWith('/chat/') && pathname !== '/chat' && pathname !== '/chat/new'
    ? pathname.replace(/^\/chat\//, '').split('/')[0]
    : null
  const currentDesktopId = pathSession ?? searchParams.get('session')
  const [desktops, setDesktops] = useState<Desktop[]>([])
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [desktopsOpen, setDesktopsOpen] = useState(true)
  const [workflowsOpen, setWorkflowsOpen] = useState(true)
  const [creatingDesktop, setCreatingDesktop] = useState(false)
  const router = useRouter()

  const sidebarCollapse = useSidebarCollapse()
  const collapsed = sidebarCollapse?.collapsed ?? false
  const tabContext = useDashboardTab()

  useEffect(() => {
    fetch('/api/desktops')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.desktops?.length) setDesktops(d.desktops)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/workflows')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.workflows?.length) setWorkflows(d.workflows)
      })
      .catch(() => {})
  }, [])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const handleNewDesktop = async () => {
    if (creatingDesktop) return
    setCreatingDesktop(true)
    try {
      const res = await fetch('/api/desktops', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.id) {
        setDesktops((prev) => [{ id: data.id, title: null, project_instructions: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev])
        tabContext?.setCurrentTab('dashboard')
        router.push(`/chat/${data.id}`)
      }
    } finally {
      setCreatingDesktop(false)
    }
  }

  const handleDeleteDesktop = async (desktopId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this desktop? This cannot be undone.')) return
    const res = await fetch(`/api/desktops/${encodeURIComponent(desktopId)}`, { method: 'DELETE' })
    if (res.ok) {
      setDesktops((prev) => prev.filter((d) => d.id !== desktopId))
      if (currentDesktopId === desktopId) {
        router.push('/chat')
      }
    }
  }

  return (
    <aside
      role={collapsed ? 'button' : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onClick={collapsed && sidebarCollapse ? () => sidebarCollapse.toggle() : undefined}
      onKeyDown={collapsed && sidebarCollapse ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sidebarCollapse.toggle(); } } : undefined}
      className={cn(
        'flex h-full min-w-0 max-w-full shrink-0 flex-col bg-[#f7f6f3]',
        collapsed ? 'w-full items-center cursor-pointer' : 'w-[260px]'
      )}
      title={collapsed ? 'Click to expand sidebar' : undefined}
    >
      {/* 1. Logo (and collapse button) */}
      <div className={cn(
        'flex shrink-0 items-center gap-2 p-3',
        collapsed && 'w-full flex-col justify-center gap-2 px-0 py-3'
      )}>
        <Link
          href="/chat"
          className={cn(
            'flex items-center gap-2',
            collapsed ? 'justify-center' : 'min-w-0 flex-1'
          )}
        >
          <Logo size={collapsed ? 'sm' : 'xs'} withText={!collapsed} />
        </Link>
        {sidebarCollapse && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); sidebarCollapse.toggle(); }}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground',
              collapsed ? 'h-9 w-9' : 'h-8 w-8'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* 2. New Desktop */}
      <div className={cn('shrink-0', collapsed ? 'w-full flex justify-center px-0' : 'px-3')}>
        <button
          type="button"
          onClick={handleNewDesktop}
          disabled={creatingDesktop}
          className={cn(
            'flex w-full rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground disabled:opacity-50',
            collapsed ? 'h-10 w-10 items-center justify-center' : 'items-center gap-2'
          )}
          title="New Desktop"
          aria-label="New Desktop"
        >
          <Plus className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-5 w-5')} />
          {!collapsed && <span className="text-sm font-medium text-foreground">New Desktop</span>}
        </button>
      </div>

      {/* 3. Search / Chat */}
      <div className={cn('shrink-0', collapsed ? 'w-full flex justify-center px-0' : 'px-3')}>
        <Link
          href="/chat"
          onClick={() => tabContext?.setCurrentTab('dashboard')}
          className={cn(
            'flex rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground',
            collapsed ? 'h-10 w-10 items-center justify-center' : 'items-center gap-2'
          )}
          title="Chat"
          aria-label="Chat"
        >
          <Search className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-5 w-5')} />
          {!collapsed && <span className="text-sm font-medium text-foreground">Search</span>}
        </Link>
      </div>

      {/* Desktops + Workflows — only when expanded */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <button
            onClick={() => setDesktopsOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-white/60"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', desktopsOpen ? '' : '-rotate-90')} />
            Desktops
          </button>
          {desktopsOpen && (
            <ul className="mt-1 space-y-0.5">
              {desktops.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">No desktops yet</li>
              ) : (
                desktops.slice(0, 15).map((d) => (
                  <li key={d.id} className="group flex items-center rounded-xl py-0.5 pr-0.5">
                    <Link
                      href={`/chat/${encodeURIComponent(d.id)}`}
                      onClick={() => tabContext?.setCurrentTab('dashboard')}
                      className={cn(
                        'min-w-0 flex-1 rounded-xl py-2 pl-3 pr-1 text-sm text-foreground transition-colors hover:bg-white/70',
                        currentDesktopId === d.id && 'bg-white/90 text-foreground'
                      )}
                      title={d.title ?? 'Desktop'}
                    >
                      <span className="block truncate">{d.title?.trim() || 'New desktop'}</span>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                          aria-label="Desktop options"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="right">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => handleDeleteDesktop(d.id, e)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))
              )}
            </ul>
          )}

          <button
            onClick={() => setWorkflowsOpen((o) => !o)}
            className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-white/60"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', workflowsOpen ? '' : '-rotate-90')} />
            Workflows
          </button>
          {workflowsOpen && (
            <ul className="mt-1 space-y-0.5">
              {workflows.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">No workflows yet</li>
              ) : (
                workflows.slice(0, 20).map((w) => {
                  const workflowPath = `/workflow/${w.slug ?? w.id}`
                  return (
                    <li key={w.id}>
                      <Link
                        href={workflowPath}
                        onClick={() => tabContext?.setCurrentTab('dashboard')}
                        className={cn(
                          'flex items-center gap-2 rounded-xl py-2 pl-3 pr-2 text-sm text-foreground transition-colors hover:bg-white/70',
                          pathname === workflowPath && 'bg-white/90'
                        )}
                        title={w.name}
                      >
                        <Workflow className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{w.name}</span>
                      </Link>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </div>
      )}

      {/* Spacer when collapsed so profile stays at bottom */}
      {collapsed && <div className="min-h-0 flex-1" />}

      {/* Settings + Connected Accounts — in-app tabs (like account) */}
      <div className={cn('shrink-0 px-3 pb-1 space-y-0.5', collapsed && 'flex flex-col items-center px-0')}>
        {tabContext ? (
          <>
            <button
              type="button"
              onClick={() => tabContext.setCurrentTab('settings')}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/70',
                tabContext.currentTab === 'settings' ? 'bg-white/90 text-foreground' : 'text-muted-foreground',
                collapsed && 'h-10 w-10 justify-center px-0'
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </button>
            <button
              type="button"
              onClick={() => tabContext.setCurrentTab('connections')}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/70',
                tabContext.currentTab === 'connections' ? 'bg-white/90 text-foreground' : 'text-muted-foreground',
                collapsed && 'h-10 w-10 justify-center px-0'
              )}
              title="Connected Accounts"
            >
              <Plug className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Connected Accounts</span>}
            </button>
          </>
        ) : (
          <>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/70',
                pathname === '/settings' ? 'bg-white/90 text-foreground' : 'text-muted-foreground',
                collapsed && 'h-10 w-10 justify-center px-0'
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </Link>
            <Link
              href="/settings#connected"
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/70',
                'text-muted-foreground',
                collapsed && 'h-10 w-10 justify-center px-0'
              )}
              title="Connected Accounts"
            >
              <Plug className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Connected Accounts</span>}
            </Link>
          </>
        )}
      </div>

      {/* 4. Account / profile at bottom */}
      <div className={cn('shrink-0 p-3', collapsed && 'w-full flex justify-center px-0')}>
        <Link
          href="/chat"
          className={cn(
            'flex rounded-xl transition-colors hover:bg-white/70',
            collapsed ? 'h-10 w-10 items-center justify-center p-0' : 'items-center gap-3 px-2 py-2'
          )}
          title="Account"
        >
          <div className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-white/90 text-sm font-medium text-foreground',
            collapsed ? 'h-9 w-9' : 'h-9 w-9'
          )}>
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.full_name || user?.email?.split('@')[0] || 'Account'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.plan === 'free' ? 'Free plan' : profile?.plan ?? 'Free plan'}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  )
}
