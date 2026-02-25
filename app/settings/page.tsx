import { redirect } from 'next/navigation'
import { ConnectedAccounts } from '@/components/dashboard/connected-accounts'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export const metadata = { title: 'Settings — Terabits' }

export default async function SettingsPage() {
  const user = await getCurrentUser()
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
