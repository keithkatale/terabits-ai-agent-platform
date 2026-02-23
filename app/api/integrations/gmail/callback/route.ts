/**
 * GET /api/integrations/gmail/callback
 * OAuth callback from Google. Exchanges code for tokens and stores in user_integrations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GMAIL_SEND_SCOPE } from '@/lib/integrations/gmail'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const redirectUri = `${baseUrl}/api/integrations/gmail/callback`
  const accountUrl = `${baseUrl}/dashboard/account`

  if (errorParam) {
    const errorDesc = searchParams.get('error_description') || errorParam
    return NextResponse.redirect(`${accountUrl}?gmail=denied&error=${encodeURIComponent(errorDesc)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${accountUrl}?gmail=error&error=missing_code_or_state`)
  }

  const stateCookie = request.cookies.get('gmail_oauth_state')?.value
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(`${accountUrl}?gmail=error&error=invalid_state`)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.redirect(`${accountUrl}?gmail=error&error=session_expired`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${accountUrl}?gmail=error&error=server_config`)
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    return NextResponse.redirect(`${accountUrl}?gmail=error&error=${encodeURIComponent(err.slice(0, 100))}`)
  }

  const tokens = await tokenRes.json()
  const accessToken = tokens.access_token
  const refreshToken = tokens.refresh_token
  const expiresIn = Number(tokens.expires_in) || 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error: upsertError } = await supabase
    .from('user_integrations')
    .upsert(
      {
        user_id: user.id,
        provider: 'gmail',
        access_token: accessToken,
        refresh_token: refreshToken || null,
        expires_at: expiresAt,
        scopes: [GMAIL_SEND_SCOPE],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

  const res = NextResponse.redirect(`${accountUrl}?gmail=connected`)
  res.cookies.delete('gmail_oauth_state')
  if (upsertError) {
    return NextResponse.redirect(`${accountUrl}?gmail=error&error=${encodeURIComponent(upsertError.message)}`)
  }
  return res
}
