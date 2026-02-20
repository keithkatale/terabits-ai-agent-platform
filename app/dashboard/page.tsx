import { createClient } from '@/lib/supabase/server'
import { AgentList } from '@/components/dashboard/agent-list'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My AI Employees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your team of AI employees. Create new ones or check on existing work.
        </p>
      </div>
      <AgentList agents={agents ?? []} />
    </div>
  )
}
