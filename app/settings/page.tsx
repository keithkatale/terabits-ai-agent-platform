import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConnectedAccounts } from '@/components/dashboard/connected-accounts'

export const metadata = { title: 'Settings — Terabits' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, integrations, and AI agent permissions.
        </p>
      </div>

      <div className="space-y-10">
        <ConnectedAccounts />
      </div>
    </div>
  )
}
