import { tool } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

/**
 * Browser automation tool — one step per call for a strict observe–act–observe feedback loop.
 *
 * Primary mode: Playwright worker (set ENABLE_BROWSER_AUTOMATION=true + BROWSER_WORKER_URL)
 * Fallback mode: Gemini Computer Use model (set GEMINI_COMPUTER_USE_ENABLED=true)
 *
 * Mode selection (BROWSER_MODE env var):
 *   'playwright'  — always use Playwright worker, never fall back
 *   'gemini'      — always use Gemini Computer Use
 *   'auto'        — try Playwright first, fall back to Gemini CU on failure (default)
 *
 * Gemini Computer Use works by:
 *   1. Taking a screenshot via the worker's /screenshot endpoint
 *   2. Sending the screenshot + action intent to gemini-2.5-computer-use-preview
 *   3. Parsing the action the model outputs (click x,y / type text / navigate url)
 *   4. Executing that action via the worker's /action endpoint
 *   5. Returning the result + new screenshot
 */

const stepSchema = z.object({
  action: z.enum(['navigate', 'snapshot', 'click', 'fill', 'screenshot']),
  url: z.string().optional().describe('For navigate: the URL to open'),
  selector: z.string().optional().describe('For click/fill: CSS selector or accessible name'),
  value: z.string().optional().describe('For fill: the value to type'),
  intent: z.string().optional().describe('For gemini-computer-use fallback: describe in plain English what you want to do next (e.g. "click the Sign In button")'),
})

const WORKER_TIMEOUT_MS = 120_000

// ── Playwright worker helpers ─────────────────────────────────────────────────

function getWorkerHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const secret = process.env.BROWSER_WORKER_SECRET?.trim()
  if (secret) headers['Authorization'] = `Bearer ${secret}`
  return headers
}

async function runPlaywrightStep(
  workerUrl: string,
  step: z.infer<typeof stepSchema>,
): Promise<{ success: boolean; error?: string; screenshotBase64?: string | null; data?: unknown }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS)

  try {
    const res = await fetch(`${workerUrl}/run`, {
      method: 'POST',
      headers: getWorkerHeaders(),
      body: JSON.stringify({ steps: [step] }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Worker returned ${res.status}: ${text.slice(0, 300)}` }
    }

    const data = await res.json() as {
      success?: boolean
      error?: string
      steps?: Array<{
        stepIndex: number
        action: string
        screenshotBase64?: string | null
        success?: boolean
        error?: string
      }>
    }

    if (!data.success && data.error) {
      return { success: false, error: data.error }
    }

    const stepResult = data.steps?.[0]
    return {
      success: stepResult?.success ?? true,
      error: stepResult?.error,
      screenshotBase64: stepResult?.screenshotBase64 ?? null,
      data,
    }
  } catch (e) {
    clearTimeout(timeout)
    const isAbort = e instanceof Error && e.name === 'AbortError'
    return {
      success: false,
      error: isAbort
        ? 'Browser worker request timed out.'
        : `Browser worker request failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

// ── Gemini Computer Use helpers ───────────────────────────────────────────────

/**
 * Take a screenshot using the Playwright worker's /screenshot endpoint (if available),
 * or fall back to a snapshot action.
 */
async function takeScreenshot(workerUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const res = await fetch(`${workerUrl}/screenshot`, {
      method: 'POST',
      headers: getWorkerHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json() as { screenshotBase64?: string }
      return data.screenshotBase64 ?? null
    }
  } catch {
    // fall through — try snapshot action instead
  }

  // Fallback: run a snapshot step and extract the screenshot
  const snapResult = await runPlaywrightStep(workerUrl, { action: 'snapshot' })
  return snapResult.screenshotBase64 ?? null
}

/**
 * Execute a low-level browser action via the worker's /action endpoint.
 * This is used after Gemini Computer Use tells us what to do.
 */
async function executeRawAction(
  workerUrl: string,
  action: { type: string; x?: number; y?: number; text?: string; url?: string },
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS)
  try {
    const res = await fetch(`${workerUrl}/action`, {
      method: 'POST',
      headers: getWorkerHeaders(),
      body: JSON.stringify(action),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Action failed ${res.status}: ${text.slice(0, 300)}` }
    }
    return { success: true }
  } catch (e) {
    clearTimeout(timeout)
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Use Gemini Computer Use to decide what action to take based on the current screenshot.
 * Returns a structured action to execute.
 */
async function geminiComputerUseStep(
  screenshotBase64: string,
  intent: string,
): Promise<{ actionType: string; x?: number; y?: number; text?: string; url?: string; reasoning?: string } | null> {
  try {
    const result = await generateText({
      model: google('gemini-2.5-computer-use-preview') as unknown as Parameters<typeof generateText>[0]['model'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: screenshotBase64,
              mimeType: 'image/png',
            } as unknown as { type: 'text'; text: string },
            {
              type: 'text',
              text: `You are controlling a browser. Look at this screenshot and determine the SINGLE next action to accomplish this goal: "${intent}"

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{"action":"click","x":123,"y":456,"reasoning":"clicking the submit button"}
OR
{"action":"type","text":"hello world","reasoning":"typing the search query"}
OR
{"action":"navigate","url":"https://example.com","reasoning":"navigating to the target page"}
OR
{"action":"done","reasoning":"the task is complete, no more actions needed"}

Choose the most appropriate single action. Be precise with coordinates.`,
            },
          ],
        },
      ],
      maxOutputTokens: 200,
    })

    const text = result.text.trim()
    try {
      const parsed = JSON.parse(text) as { action: string; x?: number; y?: number; text?: string; url?: string; reasoning?: string }
      return {
        actionType: parsed.action,
        x: parsed.x,
        y: parsed.y,
        text: parsed.text,
        url: parsed.url,
        reasoning: parsed.reasoning,
      }
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]+\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { action: string; x?: number; y?: number; text?: string; url?: string; reasoning?: string }
        return {
          actionType: parsed.action,
          x: parsed.x,
          y: parsed.y,
          text: parsed.text,
          url: parsed.url,
          reasoning: parsed.reasoning,
        }
      }
    }
  } catch (e) {
    console.error('[browser-automation] Gemini Computer Use error:', e)
  }
  return null
}

// ── Main tool ─────────────────────────────────────────────────────────────────

export const browserAutomation = tool({
  description:
    'Perform exactly ONE browser action: navigate to a URL, take a snapshot/screenshot, click an element, or fill a field. Call this tool once per action. After each call you receive the result (screenshot, success/error). Describe what you see, then call again with the next single action. Never pass multiple actions in one call — work in a strict loop: observe result → decide next action → call this tool once → repeat. Set ENABLE_BROWSER_AUTOMATION=true and BROWSER_WORKER_URL. Optional Gemini Computer Use fallback: set GEMINI_COMPUTER_USE_ENABLED=true.',
  inputSchema: z.object({
    step: stepSchema.describe(
      'Exactly one action. Examples: { action: "navigate", url: "https://example.com" } or { action: "snapshot" } or { action: "click", selector: "button.submit" } or { action: "fill", selector: "#email", value: "user@example.com" }. For Gemini CU mode also set intent: "what you want to accomplish".',
    ),
  }),
  execute: async ({ step }) => {
    const enabled = process.env.ENABLE_BROWSER_AUTOMATION === 'true'
    const workerUrl = process.env.BROWSER_WORKER_URL?.trim()?.replace(/\/$/, '')
    const geminiCuEnabled = process.env.GEMINI_COMPUTER_USE_ENABLED === 'true'
    const browserMode = (process.env.BROWSER_MODE ?? 'auto') as 'playwright' | 'gemini' | 'auto'

    // ── Mode: Gemini Computer Use only ────────────────────────────────────────
    if (browserMode === 'gemini') {
      if (!geminiCuEnabled) {
        return {
          success: false,
          error: 'BROWSER_MODE=gemini but GEMINI_COMPUTER_USE_ENABLED is not set to true.',
          mode: 'gemini',
        }
      }
      if (!workerUrl) {
        return {
          success: false,
          error: 'BROWSER_WORKER_URL is required even in gemini mode (for screenshots). Deploy the browser worker first.',
          mode: 'gemini',
        }
      }
      return await runGeminiComputerUse(workerUrl, step)
    }

    // ── Mode: Playwright only or not configured ───────────────────────────────
    if (!enabled || !workerUrl) {
      if (geminiCuEnabled && workerUrl) {
        // User wants Gemini CU but forgot to set auto mode — use it
        return await runGeminiComputerUse(workerUrl, step)
      }
      return {
        success: false,
        error:
          'Browser automation is not enabled. Set ENABLE_BROWSER_AUTOMATION=true and BROWSER_WORKER_URL to your Playwright worker. ' +
          'Optional: set GEMINI_COMPUTER_USE_ENABLED=true for AI-powered fallback. ' +
          'Use web_search and web_scrape for read-only web tasks.',
        mode: 'unconfigured',
      }
    }

    // ── Mode: Playwright primary ──────────────────────────────────────────────
    const playwrightResult = await runPlaywrightStep(workerUrl, step)

    if (playwrightResult.success) {
      return {
        success: true,
        mode: 'playwright',
        steps: [
          {
            stepIndex: 0,
            action: step.action,
            screenshotBase64: playwrightResult.screenshotBase64 ?? null,
            success: true,
          },
        ],
      }
    }

    // ── Fallback: Gemini Computer Use ─────────────────────────────────────────
    if (browserMode === 'playwright') {
      // User explicitly said playwright-only — don't fall back
      return {
        success: false,
        error: playwrightResult.error,
        mode: 'playwright',
      }
    }

    if (!geminiCuEnabled) {
      // No fallback configured
      return {
        success: false,
        error: `Playwright worker failed: ${playwrightResult.error}. Set GEMINI_COMPUTER_USE_ENABLED=true to enable AI-powered fallback.`,
        mode: 'playwright-failed',
      }
    }

    // Playwright failed — fall back to Gemini Computer Use
    console.info('[browser-automation] Playwright failed, falling back to Gemini Computer Use')
    return await runGeminiComputerUse(workerUrl, step, `Playwright failed (${playwrightResult.error}). `)
  },
})

// ── Gemini Computer Use execution ─────────────────────────────────────────────

async function runGeminiComputerUse(
  workerUrl: string,
  step: z.infer<typeof stepSchema>,
  errorPrefix = '',
): Promise<object> {
  const intent = step.intent ?? `Perform action: ${step.action}${step.url ? ` on ${step.url}` : ''}${step.selector ? ` targeting ${step.selector}` : ''}`

  // Handle navigate directly (doesn't need a screenshot first)
  if (step.action === 'navigate' && step.url) {
    const navResult = await runPlaywrightStep(workerUrl, step)
    if (navResult.success) {
      const screenshot = await takeScreenshot(workerUrl)
      return {
        success: true,
        mode: 'gemini-computer-use',
        action: 'navigate',
        url: step.url,
        screenshotBase64: screenshot,
        note: `${errorPrefix}Navigated directly to URL.`,
      }
    }
  }

  // Take current screenshot
  const screenshot = await takeScreenshot(workerUrl)
  if (!screenshot) {
    return {
      success: false,
      mode: 'gemini-computer-use',
      error: `${errorPrefix}Could not take screenshot to use Gemini Computer Use. Worker may be unavailable.`,
    }
  }

  // Ask Gemini what to do
  const aiAction = await geminiComputerUseStep(screenshot, intent)
  if (!aiAction) {
    return {
      success: false,
      mode: 'gemini-computer-use',
      error: `${errorPrefix}Gemini Computer Use could not determine an action from the screenshot.`,
      screenshotBase64: screenshot,
    }
  }

  if (aiAction.actionType === 'done') {
    return {
      success: true,
      mode: 'gemini-computer-use',
      action: 'done',
      reasoning: aiAction.reasoning,
      screenshotBase64: screenshot,
      note: 'Gemini determined the task is already complete.',
    }
  }

  // Execute the AI-determined action
  const execResult = await executeRawAction(workerUrl, {
    type: aiAction.actionType,
    x: aiAction.x,
    y: aiAction.y,
    text: aiAction.text,
    url: aiAction.url,
  })

  if (!execResult.success) {
    return {
      success: false,
      mode: 'gemini-computer-use',
      error: `${errorPrefix}Gemini chose action "${aiAction.actionType}" (${aiAction.reasoning}) but execution failed: ${execResult.error}`,
      screenshotBase64: screenshot,
    }
  }

  // Take post-action screenshot
  const postScreenshot = await takeScreenshot(workerUrl)

  return {
    success: true,
    mode: 'gemini-computer-use',
    action: aiAction.actionType,
    reasoning: aiAction.reasoning,
    screenshotBase64: postScreenshot ?? screenshot,
    note: `${errorPrefix}Gemini Computer Use performed: ${aiAction.actionType} — ${aiAction.reasoning}`,
  }
}
