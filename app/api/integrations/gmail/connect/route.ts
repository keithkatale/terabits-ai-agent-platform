/**
 * GET /api/integrations/gmail/connect
 * Redirects the user to Google OAuth consent for Gmail send scope.
 * Requires auth. Call from account/settings "Connect Gmail".
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { GMAIL_SEND_SCOPE } from '@/lib/integrations/gmail'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Gmail integration is not configured (GOOGLE_CLIENT_ID missing).' },
      { status: 503 }
    )
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/integrations/gmail/callback`
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SEND_SCOPE,
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`
  const res = NextResponse.redirect(url)
  res.cookies.set('gmail_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
