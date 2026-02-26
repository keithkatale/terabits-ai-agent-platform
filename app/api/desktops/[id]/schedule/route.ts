// GET /api/desktops/[id]/schedule — list scheduled tasks for this desktop (user must own desktop).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: desktopId } = await params
  if (!desktopId) {
    return NextResponse.json({ error: 'desktop id required' }, { status: 400 })
  }

  const { data: desktop, error: desktopError } = await supabase
    .from('desktops')
    .select('id')
    .eq('id', desktopId)
    .eq('user_id', user.id)
    .single()

  if (desktopError || !desktop) {
    return NextResponse.json({ error: 'Desktop not found' }, { status: 404 })
  }

  const { data: tasks, error } = await supabase
    .from('scheduled_tasks')
    .select('id, desktop_id, run_at, payload, status, source, created_at, updated_at')
    .eq('desktop_id', desktopId)
    .eq('user_id', user.id)
    .order('run_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: tasks ?? [] })
}
