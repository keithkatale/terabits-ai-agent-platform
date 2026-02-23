/**
 * Gmail integration: OAuth token storage, refresh, and send via Gmail API.
 * Used so the platform can send email through the user's Gmail.
 */

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

export interface GmailTokens {
  access_token: string
  refresh_token: string | null
  expires_at: string | null
}

export interface StoredIntegration {
  id: string
  user_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  scopes: string[] | null
  metadata: Record<string, unknown>
}

/**
 * Build RFC 2822 message and base64url-encode for Gmail API.
 */
function buildMimeMessage(opts: {
  to: string[]
  subject: string
  body: string
  fromEmail: string
  fromName?: string
}): string {
  const { to, subject, body, fromEmail, fromName } = opts
  const from = fromName ? `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>` : fromEmail
  const toLine = to.join(', ')
  const escaped = body
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\r\n')
  const raw = [
    `From: ${from}`,
    `To: ${toLine}`,
    `Subject: ${subject.replace(/\r?\n/g, ' ') }`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    escaped,
  ].join('\r\n')
  return Buffer.from(raw, 'utf8').toString('base64url')
}

/**
 * Refresh Google OAuth access token using refresh_token.
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Gmail integration is not configured (GOOGLE_CLIENT_ID/SECRET).')
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  return {
    access_token: data.access_token,
    expires_in: Number(data.expires_in) || 3600,
  }
}

/**
 * Get a valid access token for the user's Gmail integration: use stored
 * access_token if still valid (with 60s buffer), otherwise refresh and update DB.
 */
export async function getValidGmailAccessToken(
  supabase: { from: (table: string) => { select: (...a: unknown[]) => unknown; update: (...a: unknown[]) => unknown; eq: (...a: unknown[]) => unknown } },
  userId: string
): Promise<string> {
  // Type-safe usage: we need to select and update user_integrations
  const { data: row, error: fetchError } = await (supabase as any)
    .from('user_integrations')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .maybeSingle()

  if (fetchError) throw new Error(`Failed to load Gmail integration: ${fetchError.message}`)
  if (!row?.refresh_token) throw new Error('Gmail is not connected. Connect Gmail in account settings.')

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0
  const now = Date.now()
  const bufferSeconds = 60
  if (row.access_token && expiresAt > now + bufferSeconds * 1000) {
    return row.access_token
  }

  const refreshed = await refreshAccessToken(row.refresh_token)
  const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString()

  await (supabase as any)
    .from('user_integrations')
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  return refreshed.access_token
}

/**
 * Send an email via Gmail API using the user's connected Gmail account.
 */
export async function sendEmailViaGmail(
  supabase: Parameters<typeof getValidGmailAccessToken>[0],
  userId: string,
  opts: { to: string[]; subject: string; body: string; fromName?: string }
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const accessToken = await getValidGmailAccessToken(supabase, userId)
  // Gmail API uses the authenticated user's email as sender; we don't have it here, so use a placeholder and let Gmail set it
  const raw = buildMimeMessage({
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
    fromEmail: 'noreply@terabits.ai', // Gmail API will replace with user's From
    fromName: opts.fromName,
  })
  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const err = await res.text()
    return { success: false, error: `Gmail API error: ${res.status} ${err}` }
  }
  const data = await res.json()
  return { success: true, messageId: data.id }
}

export { GMAIL_SEND_SCOPE }
