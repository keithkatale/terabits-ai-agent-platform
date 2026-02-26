// GET /api/chat/stream?runId=xxx — SSE stream of events for an accepted run (assistant_run_events).
// Auth: user must own the run. Polls events until job status is completed|error|timeout.

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()
function sse(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

const POLL_MS = 500
const TERMINAL_STATUSES = ['completed', 'error', 'timeout']

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const runId = req.nextUrl.searchParams.get('runId')
  if (!runId) {
    return new Response(JSON.stringify({ error: 'runId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: job, error: jobError } = await supabase
    .from('assistant_run_jobs')
    .select('run_id, status, user_id')
    .eq('run_id', runId)
    .single()

  if (jobError || !job || job.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Run not found or access denied' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(sse(data))
        } catch (e) {
          const err = e as { code?: string; name?: string }
          if (err?.code === 'ERR_INVALID_STATE' || err?.name === 'InvalidStateError') return
          throw e
        }
      }

      let lastSequence = -1
      let done = false

      while (!done) {
        const client = await createClient()
        const { data: events, error: eventsError } = await client
          .from('assistant_run_events')
          .select('sequence, type, payload')
          .eq('run_id', runId)
          .gt('sequence', lastSequence)
          .order('sequence', { ascending: true })

        if (eventsError) {
          send({ type: 'error', error: 'Failed to fetch events', timestamp: Date.now() })
          break
        }

        for (const ev of events ?? []) {
          lastSequence = ev.sequence
          const payload = (ev.payload as Record<string, unknown>) ?? {}
          send({ type: ev.type, ...payload, timestamp: payload.timestamp ?? Date.now() })
        }

        const { data: jobRow } = await client
          .from('assistant_run_jobs')
          .select('status')
          .eq('run_id', runId)
          .single()

        if (jobRow && TERMINAL_STATUSES.includes(jobRow.status)) {
          done = true
        } else {
          await new Promise((r) => setTimeout(r, POLL_MS))
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
