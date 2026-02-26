// GET /api/scheduled-tasks?desktop_id=xxx — list scheduled tasks for the current user, optionally filtered by desktop.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const desktopId = req.nextUrl.searchParams.get('desktop_id')
  let query = supabase
    .from('scheduled_tasks')
    .select('id, desktop_id, run_at, payload, status, source, created_at, updated_at')
    .eq('user_id', user.id)
    .order('run_at', { ascending: true })

  if (desktopId?.trim()) {
    query = query.eq('desktop_id', desktopId.trim())
  }

  const { data: tasks, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: tasks ?? [] })
}
