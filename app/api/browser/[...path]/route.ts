/**
 * API proxy for the browser worker.
 *
 * Auth strategy (two-tier, fast):
 *  1. Client sends a short-lived proxy token via X-Browser-Token header.
 *     Tokens are issued by /api/browser/token and stored in memory for 1 hour.
 *     This avoids a Supabase round-trip on every interact/screenshot call.
 *  2. The /token endpoint does the full Supabase auth check (once per session open).
 *
 * For SSE stream endpoints (/stream) the token is passed as ?token= query param
 * because EventSource doesn't support custom headers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── In-memory token store (per process) ──────────────────────────────────────
// token → { userId, expiresAt }
const proxyTokens = new Map<string, { userId: string; expiresAt: number }>()

function issueToken(userId: string): string {
  const token = `bt_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
  proxyTokens.set(token, { userId, expiresAt: Date.now() + 60 * 60 * 1000 }) // 1h
  // Prune expired tokens lazily
  if (proxyTokens.size > 1000) {
    const now = Date.now()
    for (const [k, v] of proxyTokens) if (v.expiresAt < now) proxyTokens.delete(k)
  }
  return token
}

function validateToken(token: string | null): string | null {
  if (!token) return null
  const entry = proxyTokens.get(token)
  if (!entry || entry.expiresAt < Date.now()) { proxyTokens.delete(token ?? ''); return null }
  return entry.userId
}

// ── Worker helpers ─────────────────────────────────────────────────────────────

function workerUrl(path: string): string {
  const base = process.env.BROWSER_WORKER_URL?.trim().replace(/\/$/, '')
  if (!base) throw new Error('BROWSER_WORKER_URL is not configured')
  return `${base}/${path}`
}

function workerHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const secret = process.env.BROWSER_WORKER_SECRET?.trim()
  if (secret) h['Authorization'] = `Bearer ${secret}`
  return h
}

// ── Token issuance endpoint ────────────────────────────────────────────────────
// POST /api/browser/token  →  { token }
// Called once when the browser panel opens. Does full Supabase auth.
export async function POST_token(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.ENABLE_BROWSER_AUTOMATION !== 'true') {
    return NextResponse.json({ error: 'Browser automation not enabled' }, { status: 503 })
  }
  const token = issueToken(user.id)
  return NextResponse.json({ token })
}

// ── Main proxy ─────────────────────────────────────────────────────────────────

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const workerPath = path.join('/')

  // Special sub-path: POST /api/browser/token
  if (workerPath === 'token' && req.method === 'POST') {
    return POST_token(req)
  }

  // Auth: accept either a proxy token (fast) or fall back to Supabase (slow, first call)
  const rawToken = req.headers.get('x-browser-token') ??
    new URL(req.url).searchParams.get('token')

  let userId = validateToken(rawToken)

  if (!userId) {
    // Fall back to full Supabase check (e.g. for the first call before token is issued)
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      userId = user.id
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (process.env.ENABLE_BROWSER_AUTOMATION !== 'true') {
    return NextResponse.json({ error: 'Browser automation is not enabled' }, { status: 503 })
  }

  const isStream = workerPath.endsWith('/stream')

  try {
    let body: string | undefined
    if (req.method !== 'GET' && req.method !== 'DELETE') body = await req.text()

    const resp = await fetch(workerUrl(workerPath), {
      method: req.method,
      headers: workerHeaders(),
      body,
      signal: isStream ? undefined : AbortSignal.timeout(15_000),
    })

    if (isStream) {
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Browser proxy error: ${msg}` }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
export const DELETE = handler
