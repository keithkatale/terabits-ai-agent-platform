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
    <div className="flex h-[calc(100vh-2.5rem)] bg-[#f7f6f3] gap-0">
      <DashboardChatSidebar user={user} profile={profile} />
      <div className="min-w-0 flex-1 flex flex-col p-3 pr-4 pb-4 pt-3">
        <div className="min-h-0 flex-1 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}
