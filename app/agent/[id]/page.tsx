import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AgentBuilder } from '@/components/agent-builder/agent-builder'
import { AgentPublicView } from '@/components/runtime/agent-public-view'

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Allow unauthenticated users to view and build agents (guest agents have user_id = NULL)
  // Auth will be required when they try to deploy
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (!agent) {
    notFound()
  }

  // When an agent is deployed, development is considered done.
  // Even the owner sees the deployed view — the builder chat is hidden.
  // An amber banner lets the owner return to the builder to edit/undeploy.
  if (agent.is_deployed && agent.deploy_slug) {
    return (
      <AgentPublicView
        slug={agent.deploy_slug}
        name={agent.name}
        description={agent.description}
        executionContext={agent.execution_context as Record<string, unknown> | null}
        isOwner
        agentId={agent.id}
      />
    )
  }

  return <AgentBuilder agent={agent} />
}
