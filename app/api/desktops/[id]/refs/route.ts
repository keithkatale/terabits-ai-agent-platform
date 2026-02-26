// GET: list ref folder names (list prefix {desktopId}/refs/, return top-level folder names).
// POST: body { name: string }; create ref by uploading .keep to refs/{name}/.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureDesktopOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  desktopId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('desktops')
    .select('id')
    .eq('id', desktopId)
    .eq('user_id', userId)
    .single()
  return !!data
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

  const { id: desktopId } = await params
  if (!desktopId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const owned = await ensureDesktopOwnership(supabase, desktopId, user.id)
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const prefix = `${desktopId}/refs`
  const { data: listData, error } = await supabase.storage.from('desktop-files').list(prefix)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const refs = (listData ?? [])
    .filter((item) => item.id == null)
    .map((item) => item.name)
    .filter(Boolean)
  return NextResponse.json({ refs })
}

export async function POST(
  req: NextRequest,
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

  const owned = await ensureDesktopOwnership(supabase, desktopId, user.id)
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as { name?: string }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  if (name.includes('/') || name.includes('..')) {
    return NextResponse.json({ error: 'Invalid ref name' }, { status: 400 })
  }

  const objectPath = `${desktopId}/refs/${name}/.keep`
  const { error: uploadError } = await supabase.storage
    .from('desktop-files')
    .upload(objectPath, Buffer.from(''), { contentType: 'application/octet-stream', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }
  return NextResponse.json({ name, path: `refs/${name}` })
}
