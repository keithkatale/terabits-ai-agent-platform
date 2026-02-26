// GET /api/desktops/[id] — return desktop row.
// PATCH /api/desktops/[id] — update title and project_instructions.
// DELETE /api/desktops/[id] — delete desktop, messages, execution_logs, and storage under {id}/.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreatePersonalAssistantAgent } from '@/lib/assistant-chat'

export const dynamic = 'force-dynamic'

async function listAllPathsInPrefix(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data } = await supabase.storage.from(bucket).list(prefix)
  const paths: string[] = []
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    // Items with id are files; otherwise treat as folder and recurse
    if (item.id != null) {
      paths.push(fullPath)
    } else {
      paths.push(...(await listAllPathsInPrefix(supabase, bucket, fullPath)))
    }
  }
  return paths
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { data: desktop, error } = await supabase
    .from('desktops')
    .select('id, title, project_instructions, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !desktop) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: error ? 500 : 404 })
  }

  return NextResponse.json(desktop)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as { title?: string; project_instructions?: string }
  const updates: { title?: string; project_instructions?: string; updated_at?: string } = {}
  if (typeof body.title === 'string') updates.title = body.title
  if (typeof body.project_instructions === 'string') updates.project_instructions = body.project_instructions
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }
  updates.updated_at = new Date().toISOString()

  const { data: desktop, error } = await supabase
    .from('desktops')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title, project_instructions, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(desktop!)
}

export async function DELETE(
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
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Verify desktop belongs to user
  const { data: desktop, error: fetchError } = await supabase
    .from('desktops')
    .select('id')
    .eq('id', desktopId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !desktop) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const agentId = await getOrCreatePersonalAssistantAgent(user.id)

  await supabase.from('messages').delete().eq('agent_id', agentId).eq('session_id', desktopId)
  await supabase.from('execution_logs').delete().eq('agent_id', agentId).eq('session_id', desktopId)

  const paths = await listAllPathsInPrefix(supabase, 'desktop-files', desktopId)
  if (paths.length > 0) {
    const BATCH = 1000
    for (let i = 0; i < paths.length; i += BATCH) {
      const chunk = paths.slice(i, i + BATCH)
      await supabase.storage.from('desktop-files').remove(chunk)
    }
  }

  const { error: deleteError } = await supabase
    .from('desktops')
    .delete()
    .eq('id', desktopId)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
