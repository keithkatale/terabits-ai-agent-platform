// Workflow execution API — same pattern as agents/[id]/execute but loads from workflows table.
// Uses execution_logs with workflow_id set (and agent_id from Personal Assistant for RLS).

import { streamText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getEnabledTools } from '@/lib/tools/catalog'
import { runWithExecutionContext } from '@/lib/execution-context'
import creditsService from '@/lib/payments/credits-service'
import { normalizeUsage, addUsage } from '@/lib/ai/usage'
import { getOrCreatePersonalAssistantAgent } from '@/lib/assistant-chat'
import { useTokenCredits } from '@/lib/payments/use-token-credits'

interface StoredLogEntry {
  kind: string
  summary: string
  ts: number
}

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()
function sse(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

function buildExecutionSystemPrompt(instructionPrompt: string): string {
  return `${instructionPrompt}

---

## Execution Behaviour

You are running as a live workflow. You have a maximum of 25 tool-call steps. Follow these rules:

1. **Use tools proactively.** When you need current information, use \`web_search\` then \`web_scrape\` to read full articles.
2. **Be transparent.** Narrate each step as you work so the user can follow your reasoning.
3. **Handle failures gracefully.** If a tool fails, explain the failure, try an alternative approach, and never silently skip required information.
4. **Write partial results early for large requests.** If the user asks for a large list (20+ items), write your compiled results to the output after every 5–8 searches.
5. **Never exhaust all steps on tool calls alone.** Reserve at least 2–3 steps for writing your final output.
6. **Do not loop or repeat.** Never repeat the same phrase, sentence, or action.
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
    if (['task', 'message', 'input', 'query', 'prompt', 'default'].includes(key)) return String(val)
  }
  return entries.map(([k, v]) => `**${k}**: ${v}`).join('\n')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const creditBalance = await creditsService.getBalance(user.id)
  if (!creditBalance || creditBalance.balance < 1) {
    return Response.json({ error: 'Insufficient credits', code: 'NO_CREDITS' }, { status: 402 })
  }

  let body: { input?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input = body.input && typeof body.input === 'object' ? body.input : {}

  const bySlug = id.startsWith('w_')
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('id, name, instruction_prompt, tool_config')
    .eq(bySlug ? 'slug' : 'id', id)
    .eq('user_id', user.id)
    .single()

  if (workflowError || !workflow) {
    return Response.json({ error: 'Workflow not found' }, { status: 404 })
  }

  if (!workflow.instruction_prompt) {
    return Response.json({ error: 'Workflow has no instructions' }, { status: 400 })
  }

  const tools = getEnabledTools((workflow.tool_config ?? {}) as Record<string, { enabled?: boolean }>)
  const systemPrompt = buildExecutionSystemPrompt(workflow.instruction_prompt)
  const userMessage = formatUserInput(input as Record<string, unknown>)

  const assistantAgentId = await getOrCreatePersonalAssistantAgent(user.id)
  const runStartedAt = new Date().toISOString()
  const sessionId = crypto.randomUUID()

  const { data: runLog } = await supabase
    .from('execution_logs')
    .insert({
      agent_id: assistantAgentId,
      workflow_id: workflow.id,
      session_id: sessionId,
      lane: 'workflow',
      status: 'running',
      input,
      started_at: runStartedAt,
    })
    .select('id')
    .single()

  const requestSignal = req.signal

  const stream = new ReadableStream({
    async start(controller) {
      await runWithExecutionContext({ userId: user.id }, async () => {
        const send = (data: object) => controller.enqueue(sse(data))

        send({ type: 'start', agentName: workflow.name, runId: runLog?.id, timestamp: Date.now() })

        let finalText = ''
        let stepIndex = 0
        let totalStepsUsed = 0
        const storedLogs: StoredLogEntry[] = []
        let accumulatedUsage = normalizeUsage(undefined)
        let aborted = false
        let runError: string | null = null
        let creditsUsed = 0

        try {
          const result = streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
            tools: Object.keys(tools).length > 0 ? tools : undefined,
            toolChoice: 'auto',
            stopWhen: stepCountIs(50),
            providerOptions: {
              google: {
                thinkingConfig: {
                  thinkingBudget: -1,
                  includeThoughts: true,
                },
              },
            },
          })

          for await (const part of result.fullStream) {
            if (requestSignal?.aborted) {
              aborted = true
              break
            }
            const p = part as Record<string, unknown>
            const kind = String(p.type ?? '')

            if (kind === 'reasoning') {
              send({ type: 'reasoning', delta: p.textDelta ?? p.text ?? '', timestamp: Date.now() })
            } else if (kind === 'text-delta') {
              const delta = String(p.textDelta ?? p.text ?? '')
              finalText += delta
              send({ type: 'assistant', delta, timestamp: Date.now() })
            } else if (kind === 'tool-call') {
              const toolInput = p.input ?? p.args
              storedLogs.push({
                kind: 'tool_start',
                summary: `${p.toolName}: ${JSON.stringify(toolInput).slice(0, 120)}`,
                ts: Date.now(),
              })
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
              storedLogs.push({
                kind: 'tool_end',
                summary: `${p.toolName} → ${JSON.stringify(p.output ?? p.result).slice(0, 120)}`,
                ts: Date.now(),
              })
              send({
                type: 'tool',
                tool: p.toolName,
                status: 'completed',
                input: p.input ?? p.args,
                output: p.output ?? p.result,
                stepIndex,
                timestamp: Date.now(),
              })
            } else if (kind === 'finish') {
              const usage = p.usage ?? p.totalUsage
              if (usage && typeof usage === 'object') {
                accumulatedUsage = addUsage(
                  accumulatedUsage,
                  usage as { inputTokens?: number; outputTokens?: number },
                )
              }
            }
          }

          const lastFinishReason = ''
          if (aborted) {
            runError = 'Run stopped by user.'
            send({ type: 'error', error: runError, timestamp: Date.now() })
          } else if (lastFinishReason === 'tool-calls' && !finalText.trim()) {
            runError = `Step limit reached after ${totalStepsUsed} tool calls (max 50).`
            send({ type: 'error', error: runError, timestamp: Date.now() })
          } else {
            send({
              type: 'complete',
              result: { output: { result: finalText } },
              timestamp: Date.now(),
            })
          }

          if (accumulatedUsage.promptTokens > 0 || accumulatedUsage.completionTokens > 0) {
            try {
              const creditResult = await useTokenCredits({
                modelName: 'gemini-2.5-flash',
                promptTokens: accumulatedUsage.promptTokens,
                completionTokens: accumulatedUsage.completionTokens,
                executionId: runLog?.id,
                userId: user.id,
                agentId: assistantAgentId,
              })
              creditsUsed = creditResult.creditsDeducted
              send({
                type: 'credits_used',
                creditsUsed,
                balanceAfter: creditResult.remainingBalance,
                totalTokens: accumulatedUsage.totalTokens,
                timestamp: Date.now(),
              })
            } catch (err) {
              console.error('Workflow credit deduction failed:', err)
            }
          }

          const finalStatus = aborted ? 'aborted' : runError ? 'error' : 'completed'
          if (runLog?.id) {
            await supabase
              .from('execution_logs')
              .update({
                status: finalStatus,
                output: {
                  result: finalText,
                  logs: storedLogs,
                  tool_calls_count: totalStepsUsed,
                },
                prompt_tokens: accumulatedUsage.promptTokens,
                completion_tokens: accumulatedUsage.completionTokens,
                total_tokens: accumulatedUsage.totalTokens,
                credits_used: creditsUsed,
                error: runError,
                completed_at: new Date().toISOString(),
              })
              .eq('id', runLog.id)
          }
        } catch (e) {
          console.error('Workflow execution error:', e)
          const errMsg = e instanceof Error ? e.message : 'Workflow execution failed'
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
      })
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
