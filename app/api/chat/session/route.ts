// GET /api/chat/session?sessionId=xxx — load messages for an assistant chat session.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOrCreatePersonalAssistantAgent } from '@/lib/assistant-chat'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const agentId = await getOrCreatePersonalAssistantAgent(user.id)

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, role, content, message_type, metadata, created_at')
    .eq('agent_id', agentId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Optional: last run id for this session (so client can show share link)
  const { data: lastRun } = await supabase
    .from('execution_logs')
    .select('id')
    .eq('agent_id', agentId)
    .eq('session_id', sessionId)
    .eq('lane', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const runIds = (messages ?? [])
    .filter((m) => m.role === 'assistant' && (m.metadata as { runId?: string } | null)?.runId)
    .map((m) => (m.metadata as { runId: string }).runId)
  let stepsByRunId: Record<string, { id: string; type: string; message: string; toolData?: { name: string; state: string; input?: unknown; output?: unknown } }[]> = {}
  if (runIds.length > 0) {
    const { data: logs } = await supabase
      .from('execution_logs')
      .select('id, output')
      .in('id', runIds)
    const outputSteps = (log: { output?: { steps?: unknown[] } }) => (log?.output && Array.isArray((log.output as { steps?: unknown[] }).steps) ? (log.output as { steps: unknown[] }).steps : []) as { id: string; type: string; message: string; toolData?: { name: string; state: string; input?: unknown; output?: unknown } }[]
    logs?.forEach((log) => {
      stepsByRunId[log.id] = outputSteps(log)
    })
  }

  return NextResponse.json({
    sessionId,
    messages: (messages ?? []).map((m) => {
      const meta = (m.metadata ?? {}) as { runId?: string }
      const steps = meta.runId ? (stepsByRunId[meta.runId] ?? []) : []
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        message_type: m.message_type ?? 'text',
        metadata: m.metadata ?? {},
        created_at: m.created_at,
        steps,
      }
    }),
    lastRunId: lastRun?.id ?? null,
  })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const agentId = await getOrCreatePersonalAssistantAgent(user.id)

  await supabase.from('messages').delete().eq('agent_id', agentId).eq('session_id', sessionId)
  await supabase.from('execution_logs').delete().eq('agent_id', agentId).eq('session_id', sessionId)

  return NextResponse.json({ ok: true })
}
