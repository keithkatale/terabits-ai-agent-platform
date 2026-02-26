import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { AuthNavbar } from '@/components/landing/auth-navbar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardChatSidebar } from '@/components/dashboard/dashboard-chat-sidebar'
import { AssistantChat } from '@/components/dashboard/assistant-chat'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
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
        <div className="flex h-full min-h-0 flex-col">
          <AssistantChat />
        </div>
      </DashboardShell>
    )
  }

  // Unauthenticated: same chat UI as /chat, with Sign in / Sign up in the top bar
  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm pt-safe">
        <div className="flex h-12 w-full items-center justify-between gap-3 px-4 md:h-10 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image src="/server.png" alt="Terabits" width={32} height={32} priority className="h-8 w-8 shrink-0" />
            <span className="text-lg font-semibold text-foreground truncate">Terabits</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="ghost" size="icon-sm" />
            <AuthNavbar />
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden pb-safe px-safe">
        <div className="flex h-full min-h-0 flex-col">
          <AssistantChat guest />
        </div>
      </main>
    </div>
  )
}
