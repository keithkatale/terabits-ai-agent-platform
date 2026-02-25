// Unified Assistant Chat API — streams same SSE format as workflow execute so the UI shows tools in real time.
// User asks → assistant performs actions with tools → stream: reasoning, assistant text, tool (running/completed), complete.

import { streamText, stepCountIs, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getEnabledTools, getAssistantToolConfig } from '@/lib/tools/catalog'
import { runWithExecutionContext } from '@/lib/execution-context'
import creditsService from '@/lib/payments/credits-service'
import { tokenConverter } from '@/lib/payments/token-to-credit-converter'
import { normalizeUsage, addUsage } from '@/lib/ai/usage'
import { getOrCreatePersonalAssistantAgent } from '@/lib/assistant-chat'
import { generateChatTitle } from '@/lib/chat-title'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()
function sse(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

// Same execution prompt wrapper as agents/[id]/execute (previous-commit backend)
function buildExecutionSystemPrompt(agentName: string, instructionPrompt: string): string {
  return `${instructionPrompt}

---

## Execution Behaviour

You are running as a live AI agent. You have a maximum of 25 tool-call steps. Follow these rules:

1. **Use tools proactively.** When you need current information, use \`web_search\` then \`web_scrape\` to read full articles.
2. **Be transparent.** Narrate each step as you work so the user can follow your reasoning.
3. **Handle failures gracefully.** If a tool fails, explain the failure, try an alternative approach, and never silently skip required information.
4. **Write partial results early for large requests.** If the user asks for a large list (20+ items), write your compiled results to the output after every 5–8 searches — do NOT wait until all data is gathered. This prevents silent failure if steps run out.
5. **Never exhaust all steps on tool calls alone.** Reserve at least 2–3 steps for writing your final output. If you have used 20+ steps and still have data to write, stop searching and write what you have.
6. **Do not loop or repeat.** Never repeat the same phrase, sentence, or action. If you notice yourself saying or doing the same thing twice in a row, stop immediately and output your current results (or a brief status). Do not say "Wait, I'll do it" or similar more than once — take action or write output instead.
7. **Self-review before finishing.** Before concluding, verify:
   - Did you actually complete what was requested based on the input?
   - Is your output grounded in real data, not assumptions?
   - Are there any gaps or errors in your response?
8. **End with a status line.** Your very last sentence must be one of:
   - ✅ Task completed successfully.
   - ⚠️ Partial completion — [specific reason/what's missing].
   - ❌ Task failed — [specific reason why it could not be completed].

Do NOT claim "✅ Task completed" if you encountered blocking errors or could not fulfill the core request.`
}

const ASSISTANT_SYSTEM_PROMPT = `You are the user's AI assistant. Your job is to **perform tasks** they ask for, not just answer questions.

## Behaviour
- **Do the task first.** When the user asks you to do something (find leads, send an email, search the web, research a topic, etc.), use your tools to actually do it. Deliver the result (e.g. the list of leads, the summary, the email sent). You do NOT "build an agent" or "create a workflow" in conversation — you perform the work.
- **Never claim you built an agent** unless you have just called the \`offer_save_workflow\` tool. Do not say things like "I've built the X agent for you" or "Click Run Agent" when the user simply asked you to do a task. There is no "Run Agent" button in this chat; you are the agent. Complete the task and report the outcome.
- **Repeatable tasks: offer to save.** After you have completed a task that the user might want to run again (e.g. "find N plumber leads in region X"), you may call \`offer_save_workflow\` once. That shows the user a "Save this workflow?" option. If they save it, the platform creates a sub-agent with a form (e.g. region, number of leads) they can run later. Only call \`offer_save_workflow\` after you have already performed the task and delivered a result.
- **Check existing workflows first.** Before doing a task that sounds like a repeatable workflow (lead gen, research, summaries), use \`list_workflows\` to see if the user already has a workflow that does this. If one exists, you can say so and suggest they run it from the Workflows list, or do the task once as requested.
- **Be direct.** Find what they want, take action, then give clear feedback (success, partial success, or what went wrong).
- **Use tools proactively.** You have web search, web scrape, email (platform and Gmail), Slack, Discord, HTTP requests, image generation, extraction, summarisation, and more. Use them to accomplish the user's request.
- **One task per message.** Focus on the current request. If the user gives multiple tasks, handle the main one first or ask which to prioritise.
- **Transparent steps.** Briefly say what you're doing (e.g. "Searching for…", "Sending that email…") so the user can follow.
- **End with status.** Finish with a short outcome: what you did and the result (or why you couldn't complete it).

## Browser automation (one step at a time)
When using \`browser_automation\`, you must work in a strict **observe–act–observe** loop, like a human using a browser:
1. **One action per tool call.** Call \`browser_automation\` with exactly one \`step\` (e.g. navigate, snapshot, click, or fill). Never pass multiple steps in one call.
2. **Review the feedback.** After each call you receive the result (screenshot, success, or error). In your reply, briefly describe what you see (e.g. "The page is loading", "I see the Top Products section", "Cloudflare verification is showing — I'll wait", "The product is highlighted").
3. **Then perform the next action.** Only after you have the result, call \`browser_automation\` again with the next single step. This way you adapt to what the page actually shows (loading, verification, new content) instead of guessing.
4. **Thought then action.** It is good to state your observation and intent before each tool call (e.g. "The page has loaded. I'll click the top product to get details.") so the user sees your reasoning, then run the single corresponding action.

## Handling login forms
When you navigate to a platform and see a login form, **never try to fill it yourself**. Always call \`request_credentials\` instead:
1. Identify the fields visible in the screenshot (e.g. "Email or phone", "Password").
2. Call \`request_credentials\` with those field names, their locator hints (label text, placeholder, or CSS selector), and the \`sessionId\`.
3. The user will securely fill in their credentials — you will never see the values.
4. After the user submits, you will receive a screenshot showing the result. Continue from there (handle 2FA prompts, verify login success, etc.).
5. If login succeeds, you can continue with the task. If it fails (wrong password, CAPTCHA), describe what you see and ask the user.

## Limits
- You have a maximum of 25 tool-call steps per turn. For large or multi-part requests, do what you can and summarise; suggest breaking the rest into a follow-up if needed.
- Do not loop or repeat the same action. If something fails, say so and stop or try one alternative.
- If the user is not signed in and a tool needs them (e.g. Gmail), say they should sign in and connect Gmail in account settings.`

// Guest (unauthenticated) users: can chat but nothing is saved; AI is limited and prompts sign-up.
const GUEST_SYSTEM_PROMPT = `You are a trial AI assistant. The user is not signed in.

## Behaviour
- **Help with the request.** Use your tools (web search, web scrape, etc.) to do what they ask. Keep responses focused and useful.
- **Trial limitations.** You do NOT have access to: saving workflows, listing the user's workflows, Gmail/Slack/Discord (they require a connected account). If a tool fails due to auth, say briefly that the feature requires an account.
- **Always end with a sign-up prompt.** After your final answer, add exactly one short line on its own, for example:
  "Create a free account to save conversations, use more tools, and unlock full capabilities."
  Or: "Sign up to save this conversation and get access to email, workflows, and more."
- **Be helpful but concise.** Do the task, give the result, then the one-line prompt to create an account. Do not repeat the sign-up message multiple times in one reply.`

export async function POST(req: Request) {
  const user = await getCurrentUser()
  const supabase = await createClient()
  const isGuest = !user

  if (!isGuest && user) {
    const creditBalance = await creditsService.getBalance(user.id)
    if (!creditBalance || creditBalance.balance < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits', code: 'NO_CREDITS' }),
        { status: 402, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  let body: { messages?: unknown[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, sessionId: bodySessionId, connectPlatform } = body as {
    messages?: unknown[]
    sessionId?: string
    /** When set, use Gemini Computer Use for browser_automation and add offer_save_browser_session (connect-account flow). */
    connectPlatform?: string
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let modelMessages: { role: 'user' | 'assistant' | 'system'; content: unknown }[]
  try {
    modelMessages = await convertToModelMessages(messages)
  } catch {
    modelMessages = messages.map((m: { role: string; content?: string }) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : '',
    }))
  }

  const catalogTools = getEnabledTools(getAssistantToolConfig())
  const requestSignal = (req as Request & { signal?: AbortSignal }).signal

  let systemPrompt: string
  let tools: Record<string, ReturnType<typeof tool>>
  let assistantAgentId: string | null = null
  let creditBalance: { balance: number } | null = null

  if (isGuest) {
    systemPrompt = GUEST_SYSTEM_PROMPT
    tools = catalogTools
  } else {
    creditBalance = await creditsService.getBalance(user!.id)
    assistantAgentId = await getOrCreatePersonalAssistantAgent(supabase, user!.id)
    const { data: assistantAgent } = await supabase
      .from('agents')
      .select('name, instruction_prompt')
      .eq('id', assistantAgentId)
      .single()
    const basePrompt = ASSISTANT_SYSTEM_PROMPT + (connectPlatform
      ? `\n\n## Connect-account flow (current request)\nYou are helping the user connect their account for a platform. Use \`browser_automation\` in **one step at a time** (observe–act–observe). Open the platform login page, guide them through logging in or creating an account. When you see they are successfully logged in (e.g. dashboard, profile, or a clear "Welcome" state), call \`offer_save_browser_session\` with the current \`sessionId\` and platform so they can save the session for future use.`
      : '')
    systemPrompt = buildExecutionSystemPrompt(
      assistantAgent?.name ?? 'Assistant',
      basePrompt
    )
    const assistantOnlyTools: Record<string, ReturnType<typeof tool>> = {
      list_workflows: tool({
        description:
          'List the user\'s saved workflows. Use this to check if they already have a workflow that does a similar task (e.g. lead generation, research) before doing the task or offering to save a new workflow.',
        inputSchema: z.object({}).optional(),
        execute: async () => {
          const { data: rows } = await supabase
            .from('workflows')
            .select('id, slug, name, description')
            .eq('user_id', user!.id)
            .order('updated_at', { ascending: false })
            .limit(50)
          return { workflows: rows ?? [], count: (rows ?? []).length }
        },
      }),
      offer_save_workflow: tool({
        description:
          'Offer to save the task you just completed as a repeatable workflow. Call this ONLY after you have already performed the task and delivered a result. The user will see a "Save this workflow?" prompt; if they accept, a new workflow is created with a form they can use next time (e.g. region, number of leads).',
        inputSchema: z.object({
          suggestedName: z.string().describe('Short name for the workflow, e.g. "US Plumber Lead Gen"'),
          description: z.string().describe('One sentence: what this workflow does'),
          instructionPrompt: z
            .string()
            .describe(
              'Full system prompt for the saved agent: role, how to use the form inputs, what to do (search, scrape, compile), output format. 2-4 paragraphs.',
            ),
          inputFields: z
            .array(
              z.object({
                name: z.string().describe('Field key, e.g. "region" or "numberOfLeads"'),
                label: z.string().describe('Human-readable label, e.g. "Region or country"'),
                type: z.enum(['text', 'number', 'url', 'textarea']),
                placeholder: z.string().optional(),
                required: z.boolean().optional(),
              }),
            )
            .describe('Form fields the user will fill when running the workflow (e.g. region, number of leads)'),
        }),
        execute: async ({ suggestedName, description, instructionPrompt, inputFields }) => {
          return {
            __workflowOffer: true,
            suggestedName,
            description,
            instructionPrompt,
            inputFields: inputFields ?? [],
          }
        },
      }),
    }
    if (connectPlatform) {
      assistantOnlyTools.offer_save_browser_session = tool({
        description:
          'Call this when the user has successfully logged in or created an account in the browser and you have a live browser session. It shows them a "Save login for [platform]" option so the AI can reuse this session later. Pass the current sessionId from the last browser_automation result.',
        inputSchema: z.object({
          platform: z.string().describe('Platform id, e.g. reddit, linkedin, github'),
          sessionId: z.string().describe('The browser session ID from the last browser_automation result'),
          platformLabel: z.string().optional().describe('Human-readable name, e.g. Reddit'),
          platformUrl: z.string().optional().describe('Login URL for this platform'),
        }),
        execute: async ({ platform, sessionId, platformLabel, platformUrl }) => {
          return {
            __saveSessionOffer: true,
            platform,
            sessionId,
            platformLabel: platformLabel ?? platform,
            platformUrl,
          }
        },
      })
    }
    tools = { ...catalogTools, ...assistantOnlyTools }
  }

  const execContext = !isGuest && user
    ? { userId: user.id, browserMode: connectPlatform ? ('gemini' as const) : undefined }
    : { userId: null as string | null, browserMode: undefined }

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

      const sessionId = typeof bodySessionId === 'string' && bodySessionId ? bodySessionId : crypto.randomUUID()
      const agentId = assistantAgentId
      let runLogId: string | null = null

      const doInsertsAndRun = async () => {
        if (!isGuest && user && agentId) {
          const lastMsg = messages[messages.length - 1] as { role?: string; content?: string } | undefined
          const lastContent = typeof lastMsg?.content === 'string' ? lastMsg.content : ''
          const isFirstMessageInSession = messages.length === 1
          if (lastMsg?.role === 'user' && lastContent.trim()) {
            const { data: insertedMessage } = await supabase
              .from('messages')
              .insert({
                agent_id: agentId,
                session_id: sessionId,
                role: 'user',
                content: lastContent.trim(),
                message_type: 'text',
                metadata: {},
              })
              .select('id')
              .single()

            if (isFirstMessageInSession && insertedMessage?.id) {
              const messageId = insertedMessage.id
              generateChatTitle(lastContent.trim())
                .then(async (title) => {
                  const client = await createClient()
                  await client.from('messages').update({ metadata: { sessionTitle: title } }).eq('id', messageId)
                })
                .catch(() => {})
            }
          }

          const runStartedAt = new Date().toISOString()
          const { data: runLog } = await supabase
            .from('execution_logs')
            .insert({
              agent_id: agentId,
              session_id: sessionId,
              lane: 'assistant',
              status: 'running',
              input: { message_count: messages.length, last_message_preview: lastContent.slice(0, 200) },
              started_at: runStartedAt,
            })
            .select('id')
            .single()
          runLogId = runLog?.id ?? null
        }
        send({ type: 'start', agentName: 'Assistant', sessionId, runId: runLogId, timestamp: Date.now() })
        await runStream()
      }

      if (!isGuest && user && agentId) {
        await runWithExecutionContext(execContext, async () => {
          await doInsertsAndRun()
        })
      } else {
        await doInsertsAndRun()
      }

      async function runStream() {
        try {
          const result = streamText({
            model: google('gemini-3-flash-preview'),
            system: systemPrompt,
            messages: modelMessages,
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

          let finalText = ''
          let stepIndex = 0
          let lastFinishReason = ''
          let totalStepsUsed = 0
          let accumulatedUsage = normalizeUsage(undefined)
          let aborted = false
          let streamPartCount = 0
          let accumulatedReasoningText = ''
          type StoredStep = { id: string; type: string; message: string; toolData?: { name: string; state: string; input?: unknown; output?: unknown } }
          const storedSteps: StoredStep[] = []

          function toPlainObject (x: unknown): unknown {
            if (x == null) return undefined
            if (typeof x !== 'object') return x
            if (Array.isArray(x)) return x.map(toPlainObject)
            const o = x as Record<string, unknown>
            const out: Record<string, unknown> = {}
            for (const k of Object.keys(o)) out[k] = toPlainObject(o[k])
            return out
          }

          for await (const part of result.fullStream) {
            streamPartCount++
            if (requestSignal?.aborted) {
              aborted = true
              break
            }
            const p = part as Record<string, unknown>
            const kind = String(p.type ?? '')
            if (process.env.NODE_ENV === 'development' && streamPartCount <= 5) {
              console.debug('[chat/run] stream part', streamPartCount, kind)
            }

            // AI SDK sends reasoning-start and reasoning-delta (not just 'reasoning')
            if (kind === 'reasoning' || kind === 'reasoning-delta') {
              const delta = String(p.textDelta ?? p.text ?? '')
              accumulatedReasoningText += delta
              send({
                type: 'reasoning',
                delta,
                timestamp: Date.now(),
              })
            } else if (kind === 'reasoning-start') {
              send({ type: 'reasoning', delta: '', timestamp: Date.now() })
            } else if (kind === 'text-delta') {
              const delta = String(p.textDelta ?? p.text ?? '')
              finalText += delta
              send({ type: 'assistant', delta, timestamp: Date.now() })
            } else if (kind === 'tool-call') {
              const toolInput = p.input ?? p.args
              const toolName = String(p.toolName ?? 'tool')
              const stepId = `tool-${stepIndex}-${toolName}`
              storedSteps.push({
                id: stepId,
                type: 'tool',
                message: toolName,
                toolData: { name: toolName, state: 'running', input: toPlainObject(toolInput) as Record<string, unknown> },
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
              const toolName = String(p.toolName ?? 'tool')
              const lastTool = storedSteps.map((s, i) => ({ s, i })).reverse().find(({ s }) => s.type === 'tool' && s.toolData?.name === toolName)
              if (lastTool) {
                lastTool.s.toolData = {
                  ...lastTool.s.toolData!,
                  state: 'completed',
                  output: toPlainObject(p.output ?? p.result) as Record<string, unknown>,
                }
              } else {
                storedSteps.push({
                  id: `tool-${stepIndex}-${toolName}`,
                  type: 'tool',
                  message: toolName,
                  toolData: {
                    name: toolName,
                    state: 'completed',
                    input: toPlainObject(p.input ?? p.args) as Record<string, unknown>,
                    output: toPlainObject(p.output ?? p.result) as Record<string, unknown>,
                  },
                })
              }
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
              send({
                type: 'error',
                error: String(p.error ?? 'Stream error'),
                timestamp: Date.now(),
              })
            } else if (kind === 'finish') {
              lastFinishReason = String(p.finishReason ?? '')
              if (p.totalUsage != null) {
                accumulatedUsage = normalizeUsage(p.totalUsage as { inputTokens?: number; outputTokens?: number; totalTokens?: number })
              } else {
                accumulatedUsage = addUsage(accumulatedUsage, p.usage as { inputTokens?: number; outputTokens?: number } | undefined)
              }
              send({
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
          if (aborted) {
            runError = 'Run stopped by user.'
            send({ type: 'error', error: runError, timestamp: Date.now() })
          } else if (lastFinishReason === 'tool-calls' && !finalText.trim()) {
            runError = `Step limit reached after ${totalStepsUsed} tool calls (max 50). Try a smaller request or break it into follow-ups.`
            send({ type: 'error', error: runError, timestamp: Date.now() })
          } else {
            send({
              type: 'complete',
              result: { output: { result: finalText } },
              timestamp: Date.now(),
            })
          }

          let creditsUsed = 0
          let balanceAfter = creditBalance?.balance ?? 0
          if (!isGuest && user && creditBalance && (usage.promptTokens > 0 || usage.completionTokens > 0)) {
            try {
              const costCalc = await tokenConverter.calculateCredits('gemini-3-flash-preview', {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
              })
              const toDeduct = costCalc.creditsConsumed
              const result = await creditsService.deductCredits(
                user.id,
                toDeduct,
                `Assistant chat: ${toDeduct} credits (${usage.promptTokens + usage.completionTokens} tokens)`
              )
              creditsUsed = toDeduct
              balanceAfter = result.balanceAfter
              storedSteps.push({
                id: 'credits-0',
                type: 'credits',
                message: `${creditsUsed} credit(s) used — ${balanceAfter} remaining`,
              })
              send({
                type: 'credits_used',
                creditsUsed,
                balanceAfter,
                totalTokens: usage.totalTokens,
                timestamp: Date.now(),
              })
            } catch (err) {
              console.error('Assistant credit deduction failed (non-fatal):', err)
            }
          }

          // Prepend reasoning step so order is: reasoning, tools..., credits
          if (accumulatedReasoningText.trim()) {
            storedSteps.unshift({
              id: 'reasoning-0',
              type: 'reasoning',
              message: accumulatedReasoningText.trim(),
            })
          }

          const finalStatus = aborted ? 'aborted' : (runError ? 'error' : 'completed')
          if (runLogId) {
            await supabase
              .from('execution_logs')
              .update({
                status: finalStatus,
                output: {
                  result: finalText,
                  tool_calls_count: totalStepsUsed,
                  steps: storedSteps,
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
          if (!isGuest && agentId && (finalText.trim() || (runLogId && storedSteps.length > 0))) {
            await supabase.from('messages').insert({
              agent_id: agentId,
              session_id: sessionId,
              role: 'assistant',
              content: finalText.trim() || (runError ?? 'Run stopped with no output.'),
              message_type: 'text',
              metadata: runLogId ? { runId: runLogId } : {},
            })
          }
        } catch (e) {
          console.error('[chat/run] Assistant chat stream error:', e)
          if (e instanceof Error) console.error('[chat/run] stack:', e.stack)
          const errMsg = e instanceof Error ? e.message : 'Assistant failed'
          send({ type: 'error', error: errMsg, timestamp: Date.now() })
          if (runLogId) {
            await supabase
              .from('execution_logs')
              .update({
                status: 'error',
                error: errMsg,
                completed_at: new Date().toISOString(),
              })
              .eq('id', runLogId)
          }
        } finally {
          controller.close()
        }
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
