// GET /api/workflows/[id]/runs — list execution history for a workflow (execution_logs where workflow_id = id)

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bySlug = id.startsWith('w_')
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id')
    .eq(bySlug ? 'slug' : 'id', id)
    .eq('user_id', user.id)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30', 10), 50)

  const { data: runs, error } = await supabase
    .from('execution_logs')
    .select('id, session_id, lane, status, input, output, error, started_at, completed_at, created_at, credits_used')
    .eq('workflow_id', workflow.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('GET /api/workflows/[id]/runs:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(runs ?? [])
}
