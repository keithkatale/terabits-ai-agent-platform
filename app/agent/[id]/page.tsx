import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AgentBuilder } from '@/components/agent-builder/agent-builder'

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (!agent) {
    notFound()
  }

  return (
    <AgentBuilder agent={agent} />
  )
}
