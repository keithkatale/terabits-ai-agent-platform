// GET: list files under {desktopId}/{path}/ (path = uploads | output | refs/RefName).
// POST: upload file via multipart (path + file) or JSON (path, content, filename).

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export type ListItem = { name: string; path: string; folder?: boolean }

/** List only direct children of prefix (one level): files and folders. Uses RPC; falls back to storage.list(). */
async function listShallow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucketId: string,
  prefix: string
): Promise<ListItem[]> {
  const { data, error } = await supabase.rpc('list_storage_direct', {
    p_bucket_id: bucketId,
    p_prefix: prefix,
  })
  if (!error && data != null) {
    return (data as { name: string; path: string; is_folder: boolean }[]).map((row) => ({
      name: row.name,
      path: row.path,
      folder: row.is_folder,
    }))
  }
  const { data: listData, error: listError } = await supabase.storage.from(bucketId).list(prefix, { limit: 1000 })
  if (listError) return []
  const items: ListItem[] = []
  for (const item of listData ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    items.push({ name: item.name, path: fullPath, folder: item.id == null })
  }
  return items
}

async function listRecursive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string
): Promise<{ name: string; path: string }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) return []
  const files: { name: string; path: string }[] = []
  const folderPrefixs: string[] = []
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id != null) {
      files.push({ name: item.name, path: fullPath })
    } else {
      folderPrefixs.push(fullPath)
    }
  }
  const subResults = await Promise.all(
    folderPrefixs.map((p) => listRecursive(supabase, bucket, p))
  )
  for (const sub of subResults) {
    files.push(...sub)
  }
  return files
}

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

  const allowedPaths = ['uploads', 'output', 'refs']
  const pathParam = req.nextUrl.searchParams.get('path')
  if (!pathParam || !pathParam.trim()) {
    return NextResponse.json({ error: 'path query param required (e.g. uploads, output, refs/RefName)' }, { status: 400 })
  }
  const path = pathParam.trim().replace(/^\/+|\/+$/g, '')
  const top = path.split('/')[0]
  if (!allowedPaths.includes(top)) {
    return NextResponse.json({ error: 'path must be uploads, output, or refs/RefName' }, { status: 400 })
  }

  const owned = await ensureDesktopOwnership(supabase, desktopId, user.id)
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const prefix = `${desktopId}/${path}`
  const shallow = req.nextUrl.searchParams.get('depth') === '1' || req.nextUrl.searchParams.get('shallow') === '1'
  const bucketId = 'desktop-files'
  const items = shallow
    ? await listShallow(supabase, bucketId, prefix)
    : await listRecursive(supabase, bucketId, prefix)
  return NextResponse.json({ path, items })
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

  const contentType = req.headers.get('content-type') ?? ''
  let path: string
  let filename: string
  let body: Buffer

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const pathVal = formData.get('path')
    const file = formData.get('file') as File | null
    if (!pathVal || typeof pathVal !== 'string' || !file) {
      return NextResponse.json({ error: 'path and file required in multipart form' }, { status: 400 })
    }
    path = pathVal.trim().replace(/^\/+|\/+$/g, '')
    filename = file.name || 'file'
    body = Buffer.from(await file.arrayBuffer())
  } else if (contentType.includes('application/json')) {
    const json = await req.json().catch(() => ({})) as { path?: string; content?: string; filename?: string }
    path = (json.path ?? '').trim().replace(/^\/+|\/+$/g, '')
    filename = (json.filename ?? 'file').trim() || 'file'
    const content = json.content
    if (content == null) {
      return NextResponse.json({ error: 'content required in JSON body' }, { status: 400 })
    }
    body = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content), 'utf-8')
  } else {
    return NextResponse.json({ error: 'Content-Type must be multipart/form-data or application/json' }, { status: 400 })
  }

  if (!path) path = 'uploads'
  const safePath = path.split('/').filter(Boolean).join('/')
  const objectPath = `${desktopId}/${safePath}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('desktop-files')
    .upload(objectPath, body, { contentType: 'application/octet-stream', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }
  return NextResponse.json({ path: objectPath, filename })
}
