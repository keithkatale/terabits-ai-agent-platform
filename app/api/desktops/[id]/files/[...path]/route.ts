// GET: path = params.path joined by /. If last segment is "zip" (e.g. .../files/uploads/zip), list all objects
// under the folder prefix, zip them, and return application/zip with Content-Disposition attachment; else signed URL or stream.
// DELETE: path = params.path joined by /. Delete object or all objects under prefix.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export const dynamic = 'force-dynamic'

const BUCKET = 'desktop-files'

async function listAllPathsInPrefix(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data } = await supabase.storage.from(bucket).list(prefix)
  const paths: string[] = []
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id != null) {
      paths.push(fullPath)
    } else {
      paths.push(...(await listAllPathsInPrefix(supabase, bucket, fullPath)))
    }
  }
  return paths
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
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: desktopId, path: pathSegments } = await params
  if (!desktopId || !pathSegments?.length) {
    return NextResponse.json({ error: 'id and path required' }, { status: 400 })
  }

  const owned = await ensureDesktopOwnership(supabase, desktopId, user.id)
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const path = pathSegments.join('/')
  const fullPrefix = `${desktopId}/${path}`

  const lastSegment = pathSegments[pathSegments.length - 1]
  if (lastSegment === 'zip') {
    const folderPath = pathSegments.slice(0, -1).join('/')
    const folderPrefix = folderPath ? `${desktopId}/${folderPath}` : desktopId
    const objectPaths = await listAllPathsInPrefix(supabase, BUCKET, folderPrefix)
    const zip = new JSZip()
    for (const objectPath of objectPaths) {
      const { data: blob, error } = await supabase.storage.from(BUCKET).download(objectPath)
      if (error || !blob) continue
      const relativePath = objectPath.startsWith(`${desktopId}/`) ? objectPath.slice(desktopId.length + 1) : objectPath
      zip.file(relativePath, blob)
    }
    const zipBlob = await zip.generateAsync({ type: 'nodebuffer' })
    const filename = (folderPath ? folderPath.split('/').pop() : 'files') + '.zip'
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const { data: listData } = await supabase.storage.from(BUCKET).list(fullPrefix)
  const isFolder = listData && listData.length > 0 && listData.some((i) => i.id == null)
  if (isFolder) {
    return NextResponse.json({ error: 'Path is a folder; append /zip to download as zip' }, { status: 400 })
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(fullPrefix, 60)
  if (signed?.signedUrl) {
    return NextResponse.redirect(signed.signedUrl)
  }
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(fullPrefix)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  const buffer = Buffer.from(await blob.arrayBuffer())
  const name = pathSegments[pathSegments.length - 1] ?? 'file'
  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `inline; filename="${name}"`,
    },
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: desktopId, path: pathSegments } = await params
  if (!desktopId || !pathSegments?.length) {
    return NextResponse.json({ error: 'id and path required' }, { status: 400 })
  }

  const owned = await ensureDesktopOwnership(supabase, desktopId, user.id)
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const path = pathSegments.join('/')
  const fullPrefix = `${desktopId}/${path}`

  const paths = await listAllPathsInPrefix(supabase, BUCKET, fullPrefix)
  const toRemove = paths.length > 0 ? paths : [fullPrefix]
  const BATCH = 1000
  for (let i = 0; i < toRemove.length; i += BATCH) {
    const chunk = toRemove.slice(i, i + BATCH)
    await supabase.storage.from(BUCKET).remove(chunk)
  }
  return NextResponse.json({ ok: true })
}
