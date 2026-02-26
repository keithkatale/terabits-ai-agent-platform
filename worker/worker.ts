/**
 * Agent worker: polls assistant_run_jobs, runs streamText, writes events to assistant_run_events.
 * Run from app root: npx tsx worker/worker.ts
 * Uses NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY, etc.
 */

import { streamText, stepCountIs, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { createAdminClient } from '../lib/supabase/admin'
import { getEnabledTools, getAssistantToolConfig } from '../lib/tools/catalog'
import { getWorkspaceTools } from '../lib/tools/workspace-tools'
import { runWithExecutionContext } from '../lib/execution-context'
import { normalizeUsage, addUsage } from '../lib/ai/usage'
import creditsService from '../lib/payments/credits-service'

const POLL_INTERVAL_MS = 5000

type JobPayload = {
  sessionId: string
  messages: unknown[]
  systemPrompt: string
  userId: string
  desktopId: string | null
  assistantAgentId: string | null
  connectPlatform: string | null
  isGuest: boolean
}

function toPlainObject(x: unknown): unknown {
  if (x == null) return undefined
  if (typeof x !== 'object') return x
  if (Array.isArray(x)) return x.map(toPlainObject)
  const o = x as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(o)) out[k] = toPlainObject(o[k])
  return out
}

async function claimNextJob(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  const { data: rows } = await admin
    .from('assistant_run_jobs')
    .select('id, run_id, payload, user_id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
  const job = rows?.[0]
  if (!job) return null
  const { data: updated, error } = await admin
    .from('assistant_run_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select()
    .single()
  if (error || !updated) return null
  return updated as { id: string; run_id: string; payload: JobPayload; user_id: string }
}

async function appendEvent(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  runId: string,
  sequence: number,
  type: string,
  payload: Record<string, unknown>
) {
  await admin.from('assistant_run_events').insert({
    run_id: runId,
    sequence,
    type,
    payload: { ...payload, timestamp: payload.timestamp ?? Date.now() },
  })
}

async function runOneJob(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  job: { run_id: string; payload: JobPayload; user_id: string }
) {
  const { run_id, payload, user_id } = job
  const {
    sessionId,
    messages,
    systemPrompt,
    userId,
    desktopId,
    assistantAgentId,
    connectPlatform,
    isGuest,
  } = payload

  let sequence = 0
  const send = (ev: Record<string, unknown>) => appendEvent(admin, run_id, sequence++, ev.type as string, ev)

  let modelMessages: { role: 'user' | 'assistant' | 'system'; content: unknown }[]
  try {
    modelMessages = await convertToModelMessages(messages)
  } catch {
    modelMessages = (messages as { role: string; content?: string }[]).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : '',
    }))
  }

  const catalogTools = getEnabledTools(getAssistantToolConfig())
  const assistantOnlyTools: Record<string, ReturnType<typeof tool>> = {
    list_workflows: tool({
      description: "List the user's saved workflows.",
      inputSchema: z.object({}).optional(),
      execute: async () => {
        const { data: rows } = await admin
          .from('workflows')
          .select('id, slug, name, description')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(50)
        return { workflows: rows ?? [], count: (rows ?? []).length }
      },
    }),
    offer_save_workflow: tool({
      description: 'Offer to save the task as a repeatable workflow.',
      inputSchema: z.object({
        suggestedName: z.string(),
        description: z.string(),
        instructionPrompt: z.string(),
        inputFields: z.array(z.object({
          name: z.string(),
          label: z.string(),
          type: z.enum(['text', 'number', 'url', 'textarea']),
          placeholder: z.string().optional(),
          required: z.boolean().optional(),
        })).optional(),
      }),
      execute: async ({ suggestedName, description, instructionPrompt, inputFields }) => ({
        __workflowOffer: true,
        suggestedName,
        description,
        instructionPrompt,
        inputFields: inputFields ?? [],
      }),
    }),
  }
  if (connectPlatform) {
    assistantOnlyTools.offer_save_browser_session = tool({
      description: 'Offer to save browser session after login.',
      inputSchema: z.object({
        platform: z.string(),
        sessionId: z.string(),
        platformLabel: z.string().optional(),
        platformUrl: z.string().optional(),
      }),
      execute: async ({ platform, sessionId, platformLabel, platformUrl }) => ({
        __saveSessionOffer: true,
        platform,
        sessionId,
        platformLabel: platformLabel ?? platform,
        platformUrl,
      }),
    })
  }
  let tools: Record<string, ReturnType<typeof tool>> = { ...catalogTools, ...assistantOnlyTools }
  if (desktopId) {
    tools = { ...tools, ...getWorkspaceTools(desktopId, userId, admin) }
  }

  const runStartedAt = new Date().toISOString()
  let runLogId: string | null = null
  if (!isGuest && assistantAgentId) {
    const lastContent = typeof (messages[messages.length - 1] as { content?: string })?.content === 'string'
      ? (messages[messages.length - 1] as { content: string }).content.slice(0, 200)
      : ''
    const { data: runLog } = await admin
      .from('execution_logs')
      .insert({
        agent_id: assistantAgentId,
        session_id: sessionId,
        lane: 'assistant',
        status: 'running',
        input: { message_count: messages.length, last_message_preview: lastContent },
        started_at: runStartedAt,
      })
      .select('id')
      .single()
    runLogId = runLog?.id ?? null
  }

  send({ type: 'start', agentName: 'Assistant', sessionId, runId: runLogId, timestamp: Date.now() })

  let finalStatus: 'completed' | 'error' | 'timeout' = 'completed'
  let errorMessage: string | null = null

  try {
    await runWithExecutionContext(
      { userId, browserMode: connectPlatform ? ('gemini' as const) : undefined },
      async () => {
        const result = streamText({
          model: google('gemini-3-flash-preview'),
          system: systemPrompt,
          messages: modelMessages,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          toolChoice: 'auto',
          stopWhen: stepCountIs(50),
          providerOptions: {
            google: {
              thinkingConfig: { thinkingBudget: -1, includeThoughts: true },
            },
          },
        })

        let finalText = ''
        let stepIndex = 0
        let lastFinishReason = ''
        let totalStepsUsed = 0
        let accumulatedUsage = normalizeUsage(undefined)
        let accumulatedReasoningText = ''
        type StoredStep = { id: string; type: string; message: string; toolData?: { name: string; state: string; input?: unknown; output?: unknown } }
        const storedSteps: StoredStep[] = []

        for await (const part of result.fullStream) {
          const p = part as Record<string, unknown>
          const kind = String(p.type ?? '')

          if (kind === 'reasoning' || kind === 'reasoning-delta') {
            const delta = String(p.textDelta ?? p.text ?? '')
            accumulatedReasoningText += delta
            await send({ type: 'reasoning', delta, timestamp: Date.now() })
          } else if (kind === 'reasoning-start') {
            await send({ type: 'reasoning', delta: '', timestamp: Date.now() })
          } else if (kind === 'text-delta') {
            const delta = String(p.textDelta ?? p.text ?? '')
            finalText += delta
            await send({ type: 'assistant', delta, timestamp: Date.now() })
          } else if (kind === 'tool-call') {
            const toolInput = p.input ?? p.args
            const toolName = String(p.toolName ?? 'tool')
            storedSteps.push({
              id: `tool-${stepIndex}-${toolName}`,
              type: 'tool',
              message: toolName,
              toolData: { name: toolName, state: 'running', input: toPlainObject(toolInput) as Record<string, unknown> },
            })
            await send({
              type: 'tool',
              tool: p.toolName,
              status: 'running',
              input: toolInput,
              stepIndex,
              timestamp: Date.now(),
            })
          } else if (kind === 'tool-result') {
            stepIndex++
            totalStepsUsed = stepIndex
            const toolName = String(p.toolName ?? 'tool')
            const lastTool = storedSteps.map((s) => ({ s })).reverse().find(({ s }) => s.type === 'tool' && s.toolData?.name === toolName)
            if (lastTool) {
              lastTool.s.toolData = {
                ...lastTool.s.toolData!,
                state: 'completed',
                output: toPlainObject(p.output ?? p.result) as Record<string, unknown>,
              }
            }
            await send({
              type: 'tool',
              tool: p.toolName,
              status: 'completed',
              input: p.input ?? p.args,
              output: p.output ?? p.result,
              stepIndex,
              timestamp: Date.now(),
            })
          } else if (kind === 'error') {
            await send({ type: 'error', error: String(p.error ?? 'Stream error'), timestamp: Date.now() })
          } else if (kind === 'finish') {
            lastFinishReason = String(p.finishReason ?? '')
            if (p.totalUsage != null) {
              accumulatedUsage = normalizeUsage(p.totalUsage as { inputTokens?: number; outputTokens?: number; totalTokens?: number })
            } else {
              accumulatedUsage = addUsage(accumulatedUsage, p.usage as { inputTokens?: number; outputTokens?: number } | undefined)
            }
            await send({
              type: 'finish',
              finishReason: p.finishReason,
              usage: p.usage ?? p.totalUsage,
              timestamp: Date.now(),
            })
          }
        }

        let usage = accumulatedUsage
        try {
          const totalUsage = await Promise.resolve(
            (result as { totalUsage?: Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> }).totalUsage
          )
          if (totalUsage && (totalUsage.totalTokens ?? ((totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0))) > 0) {
            usage = normalizeUsage(totalUsage)
          }
        } catch {
          // keep accumulatedUsage
        }

        let runError: string | null = null
        if (lastFinishReason === 'tool-calls' && !finalText.trim()) {
          runError = `Step limit reached after ${totalStepsUsed} tool calls (max 50).`
          await send({ type: 'error', error: runError, timestamp: Date.now() })
        } else {
          await send({
            type: 'complete',
            result: { output: { result: finalText } },
            timestamp: Date.now(),
          })
        }

        if (accumulatedReasoningText.trim()) {
          storedSteps.unshift({
            id: 'reasoning-0',
            type: 'reasoning',
            message: accumulatedReasoningText.trim(),
          })
        }

        const creditBalance = await creditsService.getBalance(userId)
        await send({
          type: 'credits_used',
          creditsUsed: 0,
          balanceAfter: creditBalance?.balance ?? 0,
          totalTokens: usage.totalTokens,
          timestamp: Date.now(),
        })

        const execStatus = runError ? 'error' : 'completed'
        if (runLogId) {
          await admin
            .from('execution_logs')
            .update({
              status: execStatus,
              output: {
                result: finalText,
                tool_calls_count: totalStepsUsed,
                steps: storedSteps,
              },
              prompt_tokens: usage.promptTokens,
              completion_tokens: usage.completionTokens,
              total_tokens: usage.totalTokens,
              credits_used: 0,
              error: runError,
              completed_at: new Date().toISOString(),
            })
            .eq('id', runLogId)
        }
        if (!isGuest && assistantAgentId && (finalText.trim() || (runLogId && storedSteps.length > 0))) {
          await admin.from('messages').insert({
            agent_id: assistantAgentId,
            session_id: sessionId,
            role: 'assistant',
            content: finalText.trim() || runError ?? 'Run stopped with no output.',
            message_type: 'text',
            metadata: runLogId ? { runId: runLogId } : {},
          })
        }
        if (runError) {
          finalStatus = 'error'
          errorMessage = runError
        }
      }
    )
  } catch (e) {
    console.error('[worker] run error:', e)
    const errMsg = e instanceof Error ? e.message : 'Assistant run failed'
    finalStatus = 'error'
    errorMessage = errMsg
    await send({ type: 'error', error: errMsg, timestamp: Date.now() })
    if (runLogId) {
      await admin
        .from('execution_logs')
        .update({ status: 'error', error: errMsg, completed_at: new Date().toISOString() })
        .eq('id', runLogId)
    }
  }

  await admin
    .from('assistant_run_jobs')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('run_id', run_id)
}

async function main() {
  const admin = createAdminClient()
  if (!admin) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('[worker] started, polling for jobs...')
  while (true) {
    try {
      const job = await claimNextJob(admin)
      if (job) {
        console.log('[worker] processing run_id=', job.run_id)
        await runOneJob(admin, job)
        console.log('[worker] done run_id=', job.run_id)
      }
    } catch (err) {
      console.error('[worker] poll/run error:', err)
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
}

main()
