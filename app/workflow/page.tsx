import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Workflow, Plus } from 'lucide-react'

export default async function WorkflowsListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workflows } = await supabase
    .from('workflows')
    .select('id, slug, name, description, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-semibold text-foreground">Workflows</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Repeatable tasks you saved from chat. Run them anytime with a form.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!workflows?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Workflow className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">No workflows yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              When you do a task in chat and it can be repeated, we’ll offer to save it as a workflow. You’ll get a form to run it anytime.
            </p>
            <Link href="/chat" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Go to chat
            </Link>
          </div>
        ) : (
          <ul className="space-y-2 max-w-2xl">
            {workflows.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/workflow/${w.slug ?? w.id}`}
                  className="block rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-foreground">{w.name}</span>
                  {w.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{w.description}</p>}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Updated {w.updated_at ? new Date(w.updated_at).toLocaleDateString() : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
