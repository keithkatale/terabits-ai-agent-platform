/**
 * GET  /api/browser-sessions        — list user's saved platform sessions
 * POST /api/browser-sessions        — save a session (after user completes login)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSessionState, decryptSessionState } from '@/lib/browser-session-crypto'

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

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data, error: dbErr } = await admin
    .from('browser_sessions')
    .select('id, platform, platform_label, platform_url, created_at, updated_at, last_used_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (process.env.ENABLE_BROWSER_AUTOMATION !== 'true') {
    return NextResponse.json({ error: 'Browser automation not enabled' }, { status: 503 })
  }

  const { sessionId, platform, platformLabel, platformUrl } = await req.json()
  if (!sessionId || !platform || !platformLabel || !platformUrl) {
    return NextResponse.json({ error: 'sessionId, platform, platformLabel, platformUrl required' }, { status: 400 })
  }

  // Fetch the current storageState from the worker
  let storageState: unknown
  try {
    const resp = await fetch(workerUrl(`session/${sessionId}/state`), {
      headers: workerHeaders(),
      signal: AbortSignal.timeout(15_000),
    })
    if (!resp.ok) throw new Error(`Worker returned ${resp.status}`)
    const data = await resp.json()
    if (!data.success || !data.storageState) throw new Error('No storage state returned')
    storageState = data.storageState
  } catch (e) {
    return NextResponse.json({
      error: `Failed to fetch session state from browser: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 502 })
  }

  // Validate the state has at least some cookies (i.e. user actually logged in)
  const state = storageState as { cookies?: unknown[] }
  if (!state.cookies || state.cookies.length === 0) {
    return NextResponse.json({
      error: 'No cookies found — are you sure you completed the login?',
    }, { status: 422 })
  }

  // Encrypt before storing
  const encrypted = encryptSessionState(storageState)

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { error: dbErr } = await admin
    .from('browser_sessions')
    .upsert({
      user_id: user.id,
      platform,
      platform_label: platformLabel,
      platform_url: platformUrl,
      storage_state_encrypted: encrypted,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ success: true, platform, platformLabel })
}
