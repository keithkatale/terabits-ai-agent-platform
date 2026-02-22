// Public agent execution API — no auth required.
// Looks up agent by deploy_slug where is_deployed = true.
// Identical streaming behaviour to /api/agents/[id]/execute but accessible publicly.

import { streamText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { getEnabledTools } from '@/lib/tools/catalog'
import { useTokenCredits } from '@/lib/payments/use-token-credits'
import creditsService from '@/lib/payments/credits-service'
import { normalizeUsage, addUsage } from '@/lib/ai/usage'

interface StoredLogEntry {
  kind: string
  summary: string
  ts: number
}

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

// ── SSE helper ────────────────────────────────────────────────────────────────

const encoder = new TextEncoder()

function sse(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildExecutionSystemPrompt(instructionPrompt: string): string {
  return `${instructionPrompt}

---

## Execution Behaviour

You are running as a live AI agent. You have a maximum of 25 tool-call steps. Follow these rules:

1. **Use tools proactively.** When you need current information, use \`web_search\` then \`web_scrape\` to read full articles.
2. **Be transparent.** Narrate each step as you work so the user can follow your reasoning.
3. **Handle failures gracefully.** If a tool fails, explain the failure, try an alternative approach, and never silently skip required information.
4. **Write partial results early for large requests.** If the user asks for a large list (20+ items), write your compiled results to the output after every 5–8 searches — do NOT wait until all data is gathered. This prevents silent failure if steps run out.
5. **Never exhaust all steps on tool calls alone.** Reserve at least 2–3 steps for writing your final output. If you have used 20+ steps and still have data to write, stop searching and write what you have.
6. **Self-review before finishing.** Before concluding, verify the output is grounded in real data, not assumptions.
7. **End with a status line.** Your very last sentence must be one of:
   - ✅ Task completed successfully.
   - ⚠️ Partial completion — [specific reason/what's missing].
   - ❌ Task failed — [specific reason why it could not be completed].`
}

function formatUserInput(input: Record<string, unknown>): string {
  const entries = Object.entries(input).filter(([, v]) => v !== '' && v != null)
  if (entries.length === 0) return 'Please begin.'
  if (entries.length === 1) {
    const [key, val] = entries[0]
    if (['task', 'message', 'input', 'query', 'prompt'].includes(key)) return String(val)
  }
  return entries.map(([k, v]) => `**${k}**: ${v}`).join('\n')
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  // Public endpoint but with optional auth for credit deduction
  const supabase = await createClient()

  // Try to get authenticated user (optional — if owner, credits will be deducted)
  const { data: { user } } = await supabase.auth.getUser()
  let userCreditBalance: number | null = null
  if (user) {
    const balance = await creditsService.getBalance(user.id)
    userCreditBalance = balance?.balance ?? null
  }

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, instruction_prompt, tool_config')
    .eq('deploy_slug', slug)
    .eq('is_deployed', true)
    .single()

  if (agentError || !agent) {
    return Response.json({ error: 'Agent not found or not deployed' }, { status: 404 })
  }

  if (!agent.instruction_prompt) {
    return Response.json({ error: 'Agent has no instructions' }, { status: 400 })
  }

  // Parse body
  let body: { input?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { input } = body
  if (!input || typeof input !== 'object') {
    return Response.json({ error: 'input must be an object' }, { status: 400 })
  }

  // Load enabled tools from catalog based on agent's tool_config
  const tools = getEnabledTools((agent.tool_config ?? {}) as Record<string, { enabled?: boolean }>)

  const systemPrompt = buildExecutionSystemPrompt(agent.instruction_prompt)
  const userMessage = formatUserInput(input as Record<string, unknown>)

  // Persist run — use admin client to bypass RLS (no auth for public endpoint)
  const adminDb = createAdminClient()
  const runStartedAt = new Date().toISOString()
  const sessionId = crypto.randomUUID()
  let runLogId: string | null = null
  if (adminDb) {
    const { data: runLog } = await adminDb
      .from('execution_logs')
      .insert({
        agent_id: agent.id,
        session_id: sessionId,
        lane: 'public-execute',
        status: 'running',
        input: input,
        started_at: runStartedAt,
      })
      .select('id')
      .single()
    runLogId = runLog?.id ?? null
  }

  // Stream SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sse(data))

      send({ type: 'start', agentName: agent.name, runId: runLogId, creditBalance: userCreditBalance, timestamp: Date.now() })

      try {
        const result = streamText({
          model: google('gemini-3-flash-preview'),
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          toolChoice: 'auto',
          stopWhen: stepCountIs(25),
          providerOptions: {
            google: {
              thinkingConfig: {
                thinkingBudget: -1,
                includeThoughts: true,
              },
            },
          },
        })

        let finalText = ''
        let stepIndex = 0
        let lastFinishReason = ''
        let totalStepsUsed = 0
        const storedLogs: StoredLogEntry[] = []
        let accumulatedUsage = normalizeUsage(undefined)

        for await (const part of result.fullStream) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any
          const kind: string = p.type

          if (kind === 'reasoning') {
            send({ type: 'reasoning', delta: p.textDelta ?? p.text ?? '', timestamp: Date.now() })
          } else if (kind === 'text-delta') {
            const delta: string = p.textDelta ?? p.text ?? ''
            finalText += delta
            send({ type: 'assistant', delta, timestamp: Date.now() })
          } else if (kind === 'tool-call') {
            const toolInput = p.input ?? p.args
            storedLogs.push({ kind: 'tool_start', summary: `${p.toolName}: ${JSON.stringify(toolInput).slice(0, 120)}`, ts: Date.now() })
            send({ type: 'tool', tool: p.toolName, status: 'running', input: toolInput, stepIndex, timestamp: Date.now() })
          } else if (kind === 'tool-result') {
            stepIndex++
            totalStepsUsed = stepIndex
            storedLogs.push({ kind: 'tool_end', summary: `${p.toolName} → ${JSON.stringify(p.output ?? p.result).slice(0, 120)}`, ts: Date.now() })
            send({ type: 'tool', tool: p.toolName, status: 'completed', input: p.input ?? p.args, output: p.output ?? p.result, stepIndex, timestamp: Date.now() })
          } else if (kind === 'error') {
            const errMsg = String(p.error ?? 'Stream error')
            storedLogs.push({ kind: 'error', summary: errMsg, ts: Date.now() })
            send({ type: 'error', error: errMsg, timestamp: Date.now() })
          } else if (kind === 'finish') {
            lastFinishReason = p.finishReason ?? ''
            if (p.totalUsage != null) {
              accumulatedUsage = normalizeUsage(p.totalUsage)
            } else {
              accumulatedUsage = addUsage(accumulatedUsage, p.usage)
            }
            send({ type: 'finish', finishReason: p.finishReason, usage: p.usage ?? p.totalUsage, timestamp: Date.now() })
          }
        }

        let usage = accumulatedUsage
        try {
          const totalUsage = await Promise.resolve((result as { totalUsage?: PromiseLike<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> }).totalUsage)
          if (totalUsage && (totalUsage.totalTokens ?? (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0)) > 0) {
            usage = normalizeUsage(totalUsage)
          }
        } catch {
          // use accumulatedUsage
        }

        let runError: string | null = null
        if (lastFinishReason === 'tool-calls' && !finalText.trim()) {
          runError = `Step limit reached after ${totalStepsUsed} tool calls. Try requesting fewer items or break the request into smaller batches.`
          storedLogs.push({ kind: 'error', summary: runError, ts: Date.now() })
          send({ type: 'error', error: runError, timestamp: Date.now() })
        } else {
          send({ type: 'complete', result: { output: { result: finalText } }, timestamp: Date.now() })
        }

        // Deduct credits if user is authenticated and execution succeeded
        let creditsUsed = 0
        let balanceAfter = userCreditBalance ?? 0
        let aiCostUsd = 0
        let platformCostUsd = 0
        if (user && runLogId && !runError) {
          try {
            const creditResult = await useTokenCredits({
              modelName: 'gemini-3-flash-preview',
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              executionId: runLogId,
              userId: user.id,
              agentId: agent.id,
            })
            creditsUsed = creditResult.creditsDeducted
            balanceAfter = creditResult.remainingBalance
            aiCostUsd = creditResult.costBreakdown.aiCost
            platformCostUsd = creditResult.costBreakdown.platformCost
            send({
              type: 'credits_used',
              creditsUsed,
              balanceAfter,
              totalTokens: usage.totalTokens,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              aiCostUsd,
              platformCostUsd,
              timestamp: Date.now(),
            })
          } catch (err) {
            console.error('Credit deduction failed (non-fatal):', err)
          }
        }

        // Persist run result
        if (adminDb && runLogId) {
          await adminDb
            .from('execution_logs')
            .update({
              status: runError ? 'error' : 'completed',
              output: {
                result: finalText,
                logs: storedLogs,
                tool_calls_count: totalStepsUsed,
              },
              prompt_tokens: usage.promptTokens,
              completion_tokens: usage.completionTokens,
              total_tokens: usage.totalTokens,
              credits_used: creditsUsed,
              error: runError,
              completed_at: new Date().toISOString(),
            })
            .eq('id', runLogId)
        }
      } catch (e) {
        console.error('Public agent execution error:', e)
        const errMsg = e instanceof Error ? e.message : 'Agent execution failed'
        send({ type: 'error', error: errMsg, timestamp: Date.now() })
        if (adminDb && runLogId) {
          await adminDb
            .from('execution_logs')
            .update({ status: 'error', error: errMsg, completed_at: new Date().toISOString() })
            .eq('id', runLogId)
        }
      } finally {
        controller.close()
      }
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
