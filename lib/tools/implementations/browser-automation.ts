import { tool } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { getExecutionBrowserMode } from '@/lib/execution-context'

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
 *   2. Sending the screenshot + action intent to gemini-2.5-computer-use-preview-10-2025
 *   3. Parsing the action the model outputs (click x,y / type text / navigate url)
 *   4. Executing that action via the worker's /action endpoint
 *   5. Returning the result + new screenshot
 */

/** Map a URL to a platform ID that may have a saved browser session. */
function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('linkedin.com')) return 'linkedin'
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter'
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook'
    if (host.includes('reddit.com')) return 'reddit'
    if (host.includes('producthunt.com')) return 'producthunt'
    if (host.includes('github.com')) return 'github'
    if (host.includes('notion.so') || host.includes('notion.com')) return 'notion'
  } catch { /* ignore invalid URLs */ }
  return null
}

const stepSchema = z.object({
  action: z.enum(['navigate', 'snapshot', 'click', 'fill', 'screenshot', 'wait']),
  url: z.string().optional().describe('For navigate: the URL to open'),
  selector: z.string().optional().describe('For click/fill: CSS selector or accessible name. For wait: optional selector to wait for.'),
  value: z.string().optional().describe('For fill: the value to type'),
  intent: z.string().optional().describe('For gemini-computer-use fallback: describe in plain English what you want to do next (e.g. "click the Sign In button")'),
  waitUntil: z.enum(['domcontentloaded', 'load', 'networkidle']).optional().describe('For navigate: wait until load state (default: load). Use load so the AI sees a fully loaded page.'),
  timeout: z.number().optional().describe('For navigate: timeout in ms (default 60000). For wait+selector: use selectorTimeout.'),
  delay: z.number().optional().describe('For wait: wait this many milliseconds before continuing.'),
  selectorTimeout: z.number().optional().describe('For wait: when waiting for a selector, max ms to wait (default 15000).'),
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
  sessionId?: string | null,
): Promise<{ success: boolean; error?: string; screenshotBase64?: string | null; sessionId?: string; data?: unknown }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS)

  try {
    const body: { steps: z.infer<typeof stepSchema>[]; sessionId?: string } = { steps: [step] }
    if (sessionId) body.sessionId = sessionId

    const res = await fetch(`${workerUrl}/run`, {
      method: 'POST',
      headers: getWorkerHeaders(),
      body: JSON.stringify(body),
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
      sessionId?: string
      steps?: Array<{
        stepIndex: number
        action: string
        screenshotBase64?: string | null
        success?: boolean
        error?: string
      }>
    }

    if (!data.success && data.error) {
      return { success: false, error: data.error, sessionId: data.sessionId }
    }

    const stepResult = data.steps?.[0]
    return {
      success: stepResult?.success ?? true,
      error: stepResult?.error,
      screenshotBase64: stepResult?.screenshotBase64 ?? null,
      sessionId: data.sessionId,
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
 * or fall back to a snapshot action. Pass sessionId to reuse the same browser session.
 */
async function takeScreenshot(
  workerUrl: string,
  sessionId?: string | null,
): Promise<{ screenshotBase64: string | null; sessionId?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const body: { sessionId?: string } = {}
    if (sessionId) body.sessionId = sessionId
    const res = await fetch(`${workerUrl}/screenshot`, {
      method: 'POST',
      headers: getWorkerHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json() as { screenshotBase64?: string; sessionId?: string }
      return { screenshotBase64: data.screenshotBase64 ?? null, sessionId: data.sessionId }
    }
  } catch {
    // fall through — try snapshot action instead
  }

  const snapResult = await runPlaywrightStep(workerUrl, { action: 'snapshot' }, sessionId)
  return { screenshotBase64: snapResult.screenshotBase64 ?? null, sessionId: snapResult.sessionId }
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
      model: google('gemini-2.5-computer-use-preview-10-2025') as unknown as Parameters<typeof generateText>[0]['model'],
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

IMPORTANT — Describe what you see first:
- If the page shows an ERROR, BLOCK, or CAPTCHA (e.g. "You've been blocked by network security", "Access denied", "Verify you are human", Cloudflare challenge, cookie consent), use action "done" and in "reasoning" clearly describe what the page shows so the user can be informed. Example: {"action":"done","reasoning":"Page shows 'You've been blocked by network security'. The user cannot proceed until this is resolved (e.g. try different network, VPN, or file a ticket)."}
- If you see a login form and the goal is to sign in, use action "done" and say "Login form visible — credentials should be requested from the user."
- Otherwise choose one physical action.

Respond ONLY with a JSON object (no markdown, no code fence):
{"action":"click","x":123,"y":456,"reasoning":"..."}
OR {"action":"type","text":"hello","reasoning":"..."}
OR {"action":"navigate","url":"https://...","reasoning":"..."}
OR {"action":"done","reasoning":"describe exactly what the page shows and why no action is taken"}

Be precise with click coordinates. For error/block/captcha pages always use "done" with a clear description.`,
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
    'Perform exactly ONE browser action: navigate to a URL, take a snapshot/screenshot, click an element, fill a field, or wait for the page to load. Call this tool once per action. After each call you receive the result (screenshot, success/error) and a sessionId. For multi-step tasks, pass the sessionId from the previous result into the next call so the same browser session is reused (cookies and state persist). Use waitUntil: "load" on navigate so the page is fully loaded before the screenshot. You can use a "wait" action with delay (ms) and/or selector to wait for an element before continuing. Set ENABLE_BROWSER_AUTOMATION=true and BROWSER_WORKER_URL. Optional Gemini Computer Use fallback: set GEMINI_COMPUTER_USE_ENABLED=true.',
  inputSchema: z.object({
    step: stepSchema.describe(
      'Exactly one action. Examples: { action: "navigate", url: "https://example.com", waitUntil: "load" } or { action: "snapshot" } or { action: "click", selector: "button.submit" } or { action: "fill", selector: "#email", value: "user@example.com" } or { action: "wait", delay: 2000 } or { action: "wait", selector: "#content" }. For Gemini CU mode also set intent.',
    ),
    sessionId: z.string().optional().describe('Pass the sessionId from the previous browser_automation result to reuse the same browser session (recommended for multi-step flows).'),
  }),
  execute: async ({ step, sessionId }, { userId } = {} as { userId?: string }) => {
    const enabled = process.env.ENABLE_BROWSER_AUTOMATION === 'true'
    const workerUrl = process.env.BROWSER_WORKER_URL?.trim()?.replace(/\/$/, '')
    const geminiCuEnabled = process.env.GEMINI_COMPUTER_USE_ENABLED === 'true'
    const contextMode = getExecutionBrowserMode()
    const browserMode = (contextMode ?? process.env.BROWSER_MODE ?? 'auto') as 'playwright' | 'gemini' | 'auto'

    // ── Auto-restore a saved session when navigating to a known platform ──────
    // If no sessionId is provided and the step is a navigate action, check whether
    // the user has a saved browser session for that platform. If they do, restore
    // it so the agent starts already logged in.
    let resolvedSessionId: string | undefined = sessionId ?? undefined
    if (!resolvedSessionId && step.action === 'navigate' && step.url && userId) {
      const platform = detectPlatform(step.url)
      if (platform) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const restoreResp = await fetch(`${appUrl}/api/browser-sessions/${platform}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Pass the user's session cookie so the API auth works server-side
              'x-internal-user-id': userId,
            },
            body: JSON.stringify({ startUrl: step.url }),
          })
          if (restoreResp.ok) {
            const restored = await restoreResp.json() as { sessionId?: string }
            if (restored.sessionId) {
              resolvedSessionId = restored.sessionId
              // Skip navigate — the restore already opened the URL
              if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
                console.debug(`[browser-automation] Restored saved session for ${platform}: ${resolvedSessionId}`)
              }
              // Take an immediate snapshot to show the page state
              const snapshot = await runPlaywrightStep(workerUrl!, { action: 'snapshot' }, resolvedSessionId)
              return {
                success: true,
                mode: 'playwright',
                sessionId: resolvedSessionId,
                restoredSession: true,
                platform,
                note: `Restored your saved ${platform} session. You are already logged in.`,
                steps: [{ stepIndex: 0, action: 'snapshot', screenshotBase64: snapshot.screenshotBase64, success: true }],
              }
            }
          }
        } catch {
          // Silently fall through — proceed without a saved session
        }
      }
    }

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
      return await runGeminiComputerUse(workerUrl, step, '', resolvedSessionId)
    }

    // ── Mode: Playwright only or not configured ───────────────────────────────
    if (!enabled || !workerUrl) {
      if (geminiCuEnabled && workerUrl) {
        // User wants Gemini CU but forgot to set auto mode — use it
        return await runGeminiComputerUse(workerUrl, step, '', resolvedSessionId)
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
    const playwrightResult = await runPlaywrightStep(workerUrl, step, resolvedSessionId)

    if (playwrightResult.success) {
      return {
        success: true,
        mode: 'playwright',
        sessionId: playwrightResult.sessionId,
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
      return {
        success: false,
        error: playwrightResult.error,
        mode: 'playwright',
        sessionId: playwrightResult.sessionId,
      }
    }

    if (!geminiCuEnabled) {
      return {
        success: false,
        error: `Playwright worker failed: ${playwrightResult.error}. Set GEMINI_COMPUTER_USE_ENABLED=true to enable AI-powered fallback.`,
        mode: 'playwright-failed',
        sessionId: playwrightResult.sessionId,
      }
    }

    // Playwright failed — fall back to Gemini Computer Use (reuse session if any)
    console.info('[browser-automation] Playwright failed, falling back to Gemini Computer Use')
    return await runGeminiComputerUse(workerUrl, step, `Playwright failed (${playwrightResult.error}). `, playwrightResult.sessionId)
  },
})

// ── Gemini Computer Use execution ─────────────────────────────────────────────

async function runGeminiComputerUse(
  workerUrl: string,
  step: z.infer<typeof stepSchema>,
  errorPrefix = '',
  sessionId?: string | null,
): Promise<object> {
  const intent = step.intent ?? `Perform action: ${step.action}${step.url ? ` on ${step.url}` : ''}${step.selector ? ` targeting ${step.selector}` : ''}`

  if (step.action === 'navigate' && step.url) {
    const navResult = await runPlaywrightStep(workerUrl, step, sessionId ?? undefined)
    if (navResult.success) {
      const { screenshotBase64, sessionId: sid } = await takeScreenshot(workerUrl, navResult.sessionId ?? sessionId)
      return {
        success: true,
        mode: 'gemini-computer-use',
        action: 'navigate',
        url: step.url,
        sessionId: sid ?? navResult.sessionId,
        screenshotBase64,
        note: `${errorPrefix}Navigated directly to URL.`,
      }
    }
  }

  const { screenshotBase64: screenshot, sessionId: sid } = await takeScreenshot(workerUrl, sessionId ?? undefined)
  if (!screenshot) {
    return {
      success: false,
      mode: 'gemini-computer-use',
      error: `${errorPrefix}Could not take screenshot to use Gemini Computer Use. Worker may be unavailable.`,
      sessionId: sid,
    }
  }
  sessionId = sid ?? sessionId

  // Ask Gemini what to do
  const aiAction = await geminiComputerUseStep(screenshot, intent)
  if (!aiAction) {
    return {
      success: false,
      mode: 'gemini-computer-use',
      error: `${errorPrefix}Gemini Computer Use could not determine an action from the screenshot.`,
      screenshotBase64: screenshot,
      sessionId,
    }
  }

  if (aiAction.actionType === 'done') {
    return {
      success: true,
      mode: 'gemini-computer-use',
      action: 'done',
      reasoning: aiAction.reasoning,
      screenshotBase64: screenshot,
      sessionId,
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
      sessionId,
    }
  }

  const { screenshotBase64: postScreenshot, sessionId: postSid } = await takeScreenshot(workerUrl, sessionId)

  return {
    success: true,
    mode: 'gemini-computer-use',
    action: aiAction.actionType,
    reasoning: aiAction.reasoning,
    sessionId: postSid ?? sessionId,
    screenshotBase64: postScreenshot ?? screenshot,
    note: `${errorPrefix}Gemini Computer Use performed: ${aiAction.actionType} — ${aiAction.reasoning}`,
  }
}
