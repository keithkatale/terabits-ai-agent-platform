/**
 * POST /api/browser-sessions/[platform]/restore
 * Creates a new live browser session pre-loaded with the user's saved cookies.
 * Called by the browser-automation tool before running tasks on a platform.
 * Returns: { sessionId, url, title }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSessionState } from '@/lib/browser-session-crypto'

function workerUrl(path: string) {
  const base = process.env.BROWSER_WORKER_URL?.trim().replace(/\/$/, '')
  if (!base) throw new Error('BROWSER_WORKER_URL not configured')
  return `${base}/${path}`
}

function workerHeaders() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const s = process.env.BROWSER_WORKER_SECRET?.trim()
  if (s) h['Authorization'] = `Bearer ${s}`
  return h
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (process.env.ENABLE_BROWSER_AUTOMATION !== 'true') {
    return NextResponse.json({ error: 'Browser automation not enabled' }, { status: 503 })
  }

  const { platform } = await params
  const { startUrl } = await req.json().catch(() => ({}))

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  // Load encrypted session from DB
  const { data, error: dbErr } = await admin
    .from('browser_sessions')
    .select('storage_state_encrypted, platform_url, last_used_at')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .single()

  if (dbErr || !data) {
    return NextResponse.json({
      error: `No saved session for platform "${platform}". Connect it first in Settings → Connected Accounts.`,
    }, { status: 404 })
  }

  // Decrypt
  let storageState: unknown
  try {
    storageState = decryptSessionState(data.storage_state_encrypted)
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt session — please reconnect the account.' }, { status: 500 })
  }

  // Restore on the worker
  try {
    const resp = await fetch(workerUrl('sessions/restore'), {
      method: 'POST',
      headers: workerHeaders(),
      body: JSON.stringify({
        storageState,
        startUrl: startUrl ?? data.platform_url,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!resp.ok) throw new Error(`Worker returned ${resp.status}`)
    const result = await resp.json()
    if (!result.success) throw new Error(result.error)

    // Update last_used_at
    await admin
      .from('browser_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('platform', platform)

    return NextResponse.json({ success: true, sessionId: result.sessionId, url: result.url, title: result.title })
  } catch (e) {
    return NextResponse.json({
      error: `Failed to restore session: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 502 })
  }
}
