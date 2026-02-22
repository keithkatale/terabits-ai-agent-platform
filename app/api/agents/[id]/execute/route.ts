// Agent execution API
// Direct streamText execution — no execution-engine dependency.
// Uses the agent's instruction_prompt as system prompt + tools from the catalog.

import { streamText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getEnabledTools } from '@/lib/tools/catalog'
import { useTokenCredits } from '@/lib/payments/use-token-credits'
import creditsService from '@/lib/payments/credits-service'

// Compact log entry stored alongside run output in the DB
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

function buildExecutionSystemPrompt(
  agentName: string,
  instructionPrompt: string,
): string {
  return `${instructionPrompt}

---

## Execution Behaviour

You are running as a live AI agent. You have a maximum of 25 tool-call steps. Follow these rules:

1. **Use tools proactively.** When you need current information, use \`web_search\` then \`web_scrape\` to read full articles.
2. **Be transparent.** Narrate each step as you work so the user can follow your reasoning.
3. **Handle failures gracefully.** If a tool fails, explain the failure, try an alternative approach, and never silently skip required information.
4. **Write partial results early for large requests.** If the user asks for a large list (20+ items), write your compiled results to the output after every 5–8 searches — do NOT wait until all data is gathered. This prevents silent failure if steps run out.
5. **Never exhaust all steps on tool calls alone.** Reserve at least 2–3 steps for writing your final output. If you have used 20+ steps and still have data to write, stop searching and write what you have.
6. **Self-review before finishing.** Before concluding, verify:
   - Did you actually complete what was requested based on the input?
   - Is your output grounded in real data, not assumptions?
   - Are there any gaps or errors in your response?
7. **End with a status line.** Your very last sentence must be one of:
   - ✅ Task completed successfully.
   - ⚠️ Partial completion — [specific reason/what's missing].
   - ❌ Task failed — [specific reason why it could not be completed].

Do NOT claim "✅ Task completed" if you encountered blocking errors or could not fulfill the core request.`
}

// ── Input formatter ───────────────────────────────────────────────────────────

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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Auth
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check credits before execution
  const creditBalance = await creditsService.getBalance(user.id)
  if (!creditBalance || creditBalance.balance < 1) {
    return Response.json({ error: 'Insufficient credits', code: 'NO_CREDITS' }, { status: 402 })
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

  // Load agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('name, instruction_prompt, tool_config')
    .eq('id', id)
    .single()

  if (agentError || !agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.instruction_prompt) {
    return Response.json(
      { error: 'Agent has no instructions — build it first in the chat panel.' },
      { status: 400 },
    )
  }

  // Load enabled tools from the catalog based on agent's tool_config
  const tools = getEnabledTools((agent.tool_config ?? {}) as Record<string, { enabled?: boolean }>)

  const systemPrompt = buildExecutionSystemPrompt(agent.name, agent.instruction_prompt)
  const userMessage = formatUserInput(input as Record<string, unknown>)

  // Create an execution_log row before streaming so we have an ID to update later
  const runStartedAt = new Date().toISOString()
  const sessionId = crypto.randomUUID()
  const { data: runLog } = await supabase
    .from('execution_logs')
    .insert({
      agent_id: id,
      session_id: sessionId,
      lane: 'execute',
      status: 'running',
      input: input,
      started_at: runStartedAt,
    })
    .select('id')
    .single()

  // Stream SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sse(data))

      // Announce start — include the run ID so the client can reference it
      send({ type: 'start', agentName: agent.name, runId: runLog?.id, timestamp: Date.now() })

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
        let lastUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined
        const storedLogs: StoredLogEntry[] = []

        // Use `as any` to handle SDK v6 runtime field names that differ from typings
        // (textDelta vs text, input vs args, output vs result, reasoning part not in union)
        for await (const part of result.fullStream) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any
          const kind: string = p.type

          if (kind === 'reasoning') {
            send({
              type: 'reasoning',
              delta: p.textDelta ?? p.text ?? '',
              timestamp: Date.now(),
            })
          } else if (kind === 'text-delta') {
            const delta: string = p.textDelta ?? p.text ?? ''
            finalText += delta
            send({ type: 'assistant', delta, timestamp: Date.now() })
          } else if (kind === 'tool-call') {
            const toolInput = p.input ?? p.args
            storedLogs.push({ kind: 'tool_start', summary: `${p.toolName}: ${JSON.stringify(toolInput).slice(0, 120)}`, ts: Date.now() })
            send({
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
            storedLogs.push({ kind: 'tool_end', summary: `${p.toolName} → ${JSON.stringify(p.output ?? p.result).slice(0, 120)}`, ts: Date.now() })
            send({
              type: 'tool',
              tool: p.toolName,
              status: 'completed',
              input: p.input ?? p.args,
              output: p.output ?? p.result,
              stepIndex,
              timestamp: Date.now(),
            })
          } else if (kind === 'error') {
            const errMsg = String(p.error ?? 'Stream error')
            storedLogs.push({ kind: 'error', summary: errMsg, ts: Date.now() })
            send({
              type: 'error',
              error: errMsg,
              timestamp: Date.now(),
            })
          } else if (kind === 'finish') {
            lastFinishReason = p.finishReason ?? ''
            lastUsage = p.usage
            send({
              type: 'finish',
              finishReason: p.finishReason,
              usage: p.usage,
              timestamp: Date.now(),
            })
          }
        }

        // If the model ran out of steps while still calling tools and produced no text output,
        // surface a clear error instead of a blank result.
        let runError: string | null = null
        if (lastFinishReason === 'tool-calls' && !finalText.trim()) {
          runError = `Step limit reached after ${totalStepsUsed} tool calls. The agent spent all available steps gathering data and had no steps left to write output. Try requesting fewer items (e.g. "top 20" instead of a large number), or break the request into smaller batches.`
          storedLogs.push({ kind: 'error', summary: runError, ts: Date.now() })
          send({ type: 'error', error: runError, timestamp: Date.now() })
        } else {
          send({
            type: 'complete',
            result: { output: { result: finalText } },
            timestamp: Date.now(),
          })
        }

        // Deduct credits if execution succeeded
        let creditsUsed = 0
        let balanceAfter = creditBalance.balance
        if (runLog?.id && !runError) {
          try {
            const creditResult = await useTokenCredits({
              modelName: 'gemini-3-flash-preview',
              promptTokens: lastUsage?.promptTokens ?? 0,
              completionTokens: lastUsage?.completionTokens ?? 0,
              executionId: runLog.id,
              userId: user.id,
              agentId: id,
            })
            creditsUsed = creditResult.creditsDeducted
            balanceAfter = creditResult.remainingBalance
            send({
              type: 'credits_used',
              creditsUsed,
              balanceAfter,
              totalTokens: lastUsage?.totalTokens ?? 0,
              timestamp: Date.now()
            })
          } catch (err) {
            console.error('Credit deduction failed (non-fatal):', err)
          }
        }

        // Persist run to execution_logs
        if (runLog?.id) {
          await supabase
            .from('execution_logs')
            .update({
              status: runError ? 'error' : 'completed',
              output: {
                result: finalText,
                logs: storedLogs,
                tool_calls_count: totalStepsUsed,
              },
              prompt_tokens: lastUsage?.promptTokens ?? 0,
              completion_tokens: lastUsage?.completionTokens ?? 0,
              total_tokens: lastUsage?.totalTokens ?? 0,
              credits_used: creditsUsed,
              error: runError,
              completed_at: new Date().toISOString(),
            })
            .eq('id', runLog.id)
        }
      } catch (e) {
        console.error('Agent execution stream error:', e)
        const errMsg = e instanceof Error ? e.message : 'Agent execution failed'
        send({ type: 'error', error: errMsg, timestamp: Date.now() })
        if (runLog?.id) {
          await supabase
            .from('execution_logs')
            .update({ status: 'error', error: errMsg, completed_at: new Date().toISOString() })
            .eq('id', runLog.id)
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
