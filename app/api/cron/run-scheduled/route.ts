// Vercel Cron: run scheduled_tasks where status = 'pending' and run_at <= now().
// Secured by CRON_SECRET header. Hits POST /api/chat/run with synthetic message from payload.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function getOrigin(): string {
  const v = process.env.VERCEL_URL
  if (v) return `https://${v}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

function userMessageFromPayload(payload: unknown): string {
  if (payload == null) return 'Run scheduled task.'
  if (typeof payload === 'string') return payload
  if (typeof payload === 'object' && payload !== null) {
    const o = payload as Record<string, unknown>
    const task = o.task ?? o.message ?? o.description
    if (typeof task === 'string') return task
    if (typeof o.message === 'string') return o.message
    if (typeof o.description === 'string') return o.description
  }
  return typeof payload === 'object' ? JSON.stringify(payload) : String(payload)
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const { data: tasks, error: fetchError } = await admin
    .from('scheduled_tasks')
    .select('id, desktop_id, user_id, payload')
    .eq('status', 'pending')
    .lte('run_at', now)
    .order('run_at', { ascending: true })
    .limit(10)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!tasks?.length) {
    return NextResponse.json({ ok: true, run: 0 })
  }

  const origin = getOrigin()
  let completed = 0
  let failed = 0

  for (const task of tasks) {
    const { error: updateError } = await admin
      .from('scheduled_tasks')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (updateError) {
      failed++
      continue
    }

    const message = userMessageFromPayload(task.payload)
    const body = {
      sessionId: task.desktop_id,
      messages: [{ role: 'user' as const, content: message }],
      scheduled_task_id: task.id,
    }

    try {
      const res = await fetch(`${origin}/api/chat/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET!,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        await admin
          .from('scheduled_tasks')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', task.id)
        failed++
        continue
      }

      // Consume stream to completion so the run actually finishes
      const reader = res.body?.getReader()
      if (reader) {
        try {
          while (true) {
            const { done } = await reader.read()
            if (done) break
          }
        } finally {
          reader.releaseLock()
        }
      }

      await admin
        .from('scheduled_tasks')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', task.id)
      completed++
    } catch (err) {
      await admin
        .from('scheduled_tasks')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
      failed++
    }
  }

  return NextResponse.json({ ok: true, run: tasks.length, completed, failed })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
