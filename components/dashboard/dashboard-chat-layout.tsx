'use client'

import { DashboardChatSidebar } from './dashboard-chat-sidebar'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

export function DashboardChatLayout({
  children,
  user,
  profile,
}: {
  children: React.ReactNode
  user?: User | null
  profile?: Profile | null
}) {
  return (
    <div className="flex h-[calc(100vh-2.5rem)]">
      <DashboardChatSidebar user={user} profile={profile} />
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}
