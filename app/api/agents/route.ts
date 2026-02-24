// GET /api/agents — list current user's agents (for sidebar). Excludes Personal Assistant.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PERSONAL_ASSISTANT_NAME } from '@/lib/assistant-chat'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, slug, name, updated_at')
    .eq('user_id', user.id)
    .neq('name', PERSONAL_ASSISTANT_NAME)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('GET /api/agents:', error)
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 })
  }

  return NextResponse.json({ agents: agents ?? [] })
}
