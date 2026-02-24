import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WorkflowRunView } from '@/components/workflow/workflow-run-view'

export default async function WorkflowByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const bySlug = id.startsWith('w_')
  const { data: workflow } = await supabase
    .from('workflows')
    .select('*')
    .eq(bySlug ? 'slug' : 'id', id)
    .eq('user_id', user.id)
    .single()

  if (!workflow) notFound()

  return <WorkflowRunView workflow={workflow as import('@/lib/types').Workflow} />
}
