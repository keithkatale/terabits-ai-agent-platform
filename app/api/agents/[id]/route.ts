import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { id: agentId } = await params

    // Load agent (guest agents have user_id = NULL)
    const { data: agent } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Allow deletion if: user owns the agent OR it's a guest agent (user_id = NULL)
    if (agent.user_id && (!user || agent.user_id !== user.id)) {
      return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 404 })
    }

    // Delete agent (cascade will handle related records)
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)

    if (error) {
      console.error('Error deleting agent:', error)
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/agents/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { id: agentId } = await params
    const body = await req.json()

    // Load agent (guest agents have user_id = NULL)
    const { data: agent } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Allow updates if: user owns the agent OR it's a guest agent (user_id = NULL)
    // Once authenticated, guest agents are linked to the user on first deploy
    if (agent.user_id && (!user || agent.user_id !== user.id)) {
      return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 404 })
    }

    // Update agent
    const { data: updatedAgent, error } = await supabase
      .from('agents')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating agent:', error)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('Error in PATCH /api/agents/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
