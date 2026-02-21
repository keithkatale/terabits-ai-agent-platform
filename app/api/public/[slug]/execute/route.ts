// Public agent execution API — no auth required.
// Looks up agent by deploy_slug where is_deployed = true.
// Identical streaming behaviour to /api/agents/[id]/execute but accessible publicly.

import { streamText, tool, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

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

// ── Tools ─────────────────────────────────────────────────────────────────────

const webSearch = tool({
  description:
    'Search the web for up-to-date information. Returns titles, URLs, and snippets.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    num: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Number of results to return (default 5)'),
  }),
  execute: async ({ query, num = 5 }) => {
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) {
      return {
        error: 'SERPER_API_KEY is not configured.',
        results: [],
      }
    }
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`Serper API returned ${res.status}`)
      const data = await res.json()
      return {
        query,
        results: ((data.organic as any[]) ?? []).map((r) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
        })),
        answerBox: data.answerBox ?? null,
        knowledgeGraph: data.knowledgeGraph ?? null,
      }
    } catch (e) {
      return {
        error: `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        results: [],
      }
    }
  },
})

const webScrape = tool({
  description:
    'Fetch and extract readable text from a webpage. Use after web_search to read full articles.',
  inputSchema: z.object({
    url: z.string().describe('The URL to fetch'),
  }),
  execute: async ({ url }) => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const html = await res.text()

      let text = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()

      if (text.length > 10_000) {
        text = text.slice(0, 10_000) + '\n\n[content truncated at 10,000 characters]'
      }

      return { url, content: text, length: text.length }
    } catch (e) {
      return {
        error: `Scrape failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        url,
        content: null,
      }
    }
  },
})

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

  // No auth check — this is a public endpoint for deployed agents.
  const supabase = await createClient()

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

  // Tools
  const toolConfig = (agent.tool_config ?? {}) as Record<string, { enabled?: boolean }>
  const searchEnabled = toolConfig['web_search']?.enabled !== false
  const scrapeEnabled =
    toolConfig['web_scrape']?.enabled !== false || toolConfig['read']?.enabled !== false

  const tools: Record<string, typeof webSearch | typeof webScrape> = {}
  if (searchEnabled) tools.web_search = webSearch
  if (scrapeEnabled) tools.web_scrape = webScrape

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

      send({ type: 'start', agentName: agent.name, runId: runLogId, timestamp: Date.now() })

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
        let lastUsage: { totalTokens?: number } | undefined
        const storedLogs: StoredLogEntry[] = []

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
            lastUsage = p.usage
            send({ type: 'finish', finishReason: p.finishReason, usage: p.usage, timestamp: Date.now() })
          }
        }

        let runError: string | null = null
        if (lastFinishReason === 'tool-calls' && !finalText.trim()) {
          runError = `Step limit reached after ${totalStepsUsed} tool calls. Try requesting fewer items or break the request into smaller batches.`
          storedLogs.push({ kind: 'error', summary: runError, ts: Date.now() })
          send({ type: 'error', error: runError, timestamp: Date.now() })
        } else {
          send({ type: 'complete', result: { output: { result: finalText } }, timestamp: Date.now() })
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
                tokens_used: lastUsage?.totalTokens ?? null,
              },
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
