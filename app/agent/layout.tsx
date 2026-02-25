import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardChatSidebar } from '@/components/dashboard/dashboard-chat-sidebar'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell
      user={{ id: user.id, email: user.email ?? undefined }}
      profile={profile}
      sidebar={<DashboardChatSidebar user={{ id: user.id, email: user.email ?? undefined }} profile={profile} />}
    >
      {children}
    </DashboardShell>
  )
}
