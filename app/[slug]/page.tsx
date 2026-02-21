import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AgentPublicView } from '@/components/runtime/agent-public-view'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('name, description')
    .eq('deploy_slug', slug)
    .eq('is_deployed', true)
    .single()

  if (!agent) return { title: 'Agent Not Found' }

  return {
    title: `${agent.name} | Terabits AI`,
    description: agent.description || `Run ${agent.name} — powered by Terabits AI`,
  }
}

export default async function PublicAgentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, description, user_id, instruction_prompt, execution_context, tool_config, deploy_slug')
    .eq('deploy_slug', slug)
    .eq('is_deployed', true)
    .single()

  if (!agent) notFound()

  // Check if the current visitor is the agent owner so we can show edit controls.
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = !!user && user.id === agent.user_id

  return (
    <AgentPublicView
      slug={slug}
      agentId={agent.id}
      name={agent.name}
      description={agent.description}
      executionContext={agent.execution_context as Record<string, unknown> | null}
      isOwner={isOwner}
    />
  )
}
