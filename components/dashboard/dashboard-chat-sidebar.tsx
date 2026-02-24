'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Plus, Search, PanelLeftClose, PanelLeft, ChevronDown, Workflow, MoreVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebarCollapse } from '@/components/dashboard/sidebar-collapse-context'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface Session {
  sessionId: string
  preview: string
  updatedAt: string
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
  const currentSession = searchParams.get('session')
  const [sessions, setSessions] = useState<Session[]>([])
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [recentOpen, setRecentOpen] = useState(true)
  const [workflowsOpen, setWorkflowsOpen] = useState(true)

  const sidebarCollapse = useSidebarCollapse()
  const collapsed = sidebarCollapse?.collapsed ?? false

  useEffect(() => {
    fetch('/api/chat/sessions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.sessions?.length) setSessions(d.sessions)
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

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    const res = await fetch(`/api/chat/session?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      if (currentSession === sessionId) {
        window.location.href = '/chat'
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
        'flex h-full min-w-0 max-w-full shrink-0 flex-col border-r border-border bg-background dark:bg-input/30',
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
              'flex shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
              collapsed ? 'h-9 w-9' : 'h-8 w-8'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* 2. New chat */}
      <div className={cn('shrink-0', collapsed ? 'w-full flex justify-center px-0' : 'px-3')}>
        <Link
          href="/chat/new"
          className={cn(
            'flex rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            collapsed ? 'h-10 w-10 items-center justify-center' : 'items-center gap-2'
          )}
          title="New chat"
          aria-label="New chat"
        >
          <Plus className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-5 w-5')} />
          {!collapsed && <span className="text-sm font-medium text-foreground">New chat</span>}
        </Link>
      </div>

      {/* 3. Search / Chat */}
      <div className={cn('shrink-0', collapsed ? 'w-full flex justify-center px-0' : 'px-3')}>
        <Link
          href="/chat"
          className={cn(
            'flex rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            collapsed ? 'h-10 w-10 items-center justify-center' : 'items-center gap-2'
          )}
          title="Chat"
          aria-label="Chat"
        >
          <Search className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-5 w-5')} />
          {!collapsed && <span className="text-sm font-medium text-foreground">Search</span>}
        </Link>
      </div>

      {/* Recent + Workflows — only when expanded */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <button
            onClick={() => setRecentOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', recentOpen ? '' : '-rotate-90')} />
            Recent
          </button>
          {recentOpen && (
            <ul className="mt-1 space-y-0.5">
              {sessions.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">No conversations yet</li>
              ) : (
                sessions.slice(0, 15).map((s) => (
                  <li
                    key={s.sessionId}
                    className={cn(
                      'group flex items-center rounded-r-lg border-l-2 py-0.5 pr-0.5',
                      currentSession === s.sessionId ? 'border-primary' : 'border-transparent'
                    )}
                  >
                    <Link
                      href={`/chat?session=${encodeURIComponent(s.sessionId)}`}
                      className={cn(
                        'min-w-0 flex-1 rounded-r-md py-2 pl-3 pr-1 text-sm text-foreground transition-colors hover:bg-secondary/50',
                        currentSession === s.sessionId && 'bg-secondary'
                      )}
                      title={s.preview}
                    >
                      <span className="block truncate">{s.preview || 'Conversation'}</span>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                          aria-label="Conversation options"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="right">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => handleDeleteSession(s.sessionId, e)}
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
            className="mt-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50"
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
                        className={cn(
                          'flex items-center gap-2 rounded-r-lg border-l-2 py-2 pl-3 pr-2 text-sm text-foreground transition-colors hover:bg-secondary/50',
                          pathname === workflowPath ? 'border-primary bg-secondary' : 'border-transparent'
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

      {/* 4. Account / profile at bottom */}
      <div className={cn('shrink-0 p-3', collapsed && 'w-full flex justify-center px-0')}>
        <Link
          href="/chat"
          className={cn(
            'flex rounded-lg transition-colors hover:bg-secondary/50',
            collapsed ? 'h-10 w-10 items-center justify-center p-0' : 'items-center gap-3 px-2 py-2'
          )}
          title="Account"
        >
          <div className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-foreground ring-2 ring-primary/30',
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
