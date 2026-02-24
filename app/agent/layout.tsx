import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardChatSidebar } from '@/components/dashboard/dashboard-chat-sidebar'

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell
      user={user}
      profile={profile}
      sidebar={<DashboardChatSidebar user={user} profile={profile} />}
    >
      {children}
    </DashboardShell>
  )
}
