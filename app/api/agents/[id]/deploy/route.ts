import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) + '-' + Math.random().toString(36).slice(2, 8)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.system_prompt) {
    return NextResponse.json(
      { error: 'Agent must have a system prompt before deploying. Complete the building process first.' },
      { status: 400 }
    )
  }

  const slug = agent.deploy_slug || generateSlug(agent.name)

  const { error: updateError } = await supabase
    .from('agents')
    .update({
      is_deployed: true,
      deploy_slug: slug,
      status: 'deployed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log the deploy event
  await supabase.from('execution_logs').insert({
    agent_id: id,
    status: 'deployed',
    input: { action: 'deploy', slug },
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    deploy_slug: slug,
    url: `/run/${slug}`,
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('agents')
    .update({
      is_deployed: false,
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('execution_logs').insert({
    agent_id: id,
    status: 'undeployed',
    input: { action: 'undeploy' },
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}
