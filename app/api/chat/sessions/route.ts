// GET /api/chat/sessions — list recent assistant chat sessions (conversations).
// Conversation name (preview) is derived from the first user message in the session,
// similar to how agents are named from the conversation that creates them.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrCreatePersonalAssistantAgent } from '@/lib/assistant-chat'

export const dynamic = 'force-dynamic'

const PREVIEW_MAX_LENGTH = 80

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agentId = await getOrCreatePersonalAssistantAgent(user.id)

  // Fetch all messages ascending so we can take the first user message per session (and its AI-generated title if set)
  const { data: messages } = await supabase
    .from('messages')
    .select('session_id, content, role, created_at, metadata')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: true })

  if (!messages?.length) {
    return NextResponse.json({ sessions: [] })
  }

  const bySession = new Map<string, { firstUserContent: string | null; firstUserMetadata: Record<string, unknown> | null; latestAt: string }>()
  for (const m of messages) {
    const sid = m.session_id
    if (!sid) continue
    if (!bySession.has(sid)) {
      bySession.set(sid, { firstUserContent: null, firstUserMetadata: null, latestAt: m.created_at ?? '' })
    }
    const rec = bySession.get(sid)!
    if (m.role === 'user' && rec.firstUserContent == null) {
      rec.firstUserContent = (m.content ?? '').trim()
      rec.firstUserMetadata = (m.metadata as Record<string, unknown>) ?? null
    }
    rec.latestAt = m.created_at ?? rec.latestAt
  }

  const sessions = Array.from(bySession.entries(), ([sessionId, { firstUserContent, firstUserMetadata, latestAt }]) => {
    const aiTitle = firstUserMetadata && typeof firstUserMetadata.sessionTitle === 'string'
      ? (firstUserMetadata.sessionTitle as string).trim()
      : null
    const preview = aiTitle || (firstUserContent?.slice(0, PREVIEW_MAX_LENGTH).trim() || '').trim() || 'New conversation'
    return { sessionId, preview, updatedAt: latestAt }
  })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 30)

  return NextResponse.json({ sessions })
}
