import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { nodes, edges } = await request.json()
    const { id: agentId } = await params

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await supabase.from('workflow_nodes').delete().eq('agent_id', agentId)
    await supabase.from('workflow_edges').delete().eq('agent_id', agentId)

    if (nodes && nodes.length > 0) {
      const nodesToInsert = nodes.map((node: any) => ({
        agent_id: agentId,
        node_id: node.id,
        node_type: node.type,
        label: node.data?.label || 'Untitled',
        position_x: node.position.x,
        position_y: node.position.y,
        data: {
          ...node.data,
          config: node.data?.config || {},
          nodeTypeKey: node.data?.nodeTypeKey || node.type
        }
      }))

      await supabase.from('workflow_nodes').insert(nodesToInsert)
    }

    if (edges && edges.length > 0) {
      const edgesToInsert = edges.map((edge: any) => ({
        agent_id: agentId,
        edge_id: edge.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        label: edge.label || null,
        edge_type: edge.type || 'default',
        data: edge.data || {}
      }))

      await supabase.from('workflow_edges').insert(edgesToInsert)
    }

    return NextResponse.json({ 
      success: true,
      nodeCount: nodes?.length || 0,
      edgeCount: edges?.length || 0
    })
  } catch (error) {
    console.error('Error saving workflow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: agentId } = await params

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const { data: nodes } = await supabase
      .from('workflow_nodes')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })

    const { data: edges } = await supabase
      .from('workflow_edges')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })

    return NextResponse.json({ 
      nodes: nodes || [],
      edges: edges || []
    })
  } catch (error) {
    console.error('Error fetching workflow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
