import { tool } from 'ai'
import { z } from 'zod'

/**
 * Browser automation tool (Director-style).
 * When ENABLE_BROWSER_AUTOMATION is set and Playwright (or Browserbase) is integrated,
 * this tool will navigate, take snapshots, click, and fill forms in a real browser.
 * For now it returns a clear message so the catalog can list it as coming_soon
 * and we can flip to available once Playwright/Browserbase is wired in.
 */
const stepSchema = z.object({
  action: z.enum(['navigate', 'snapshot', 'click', 'fill']),
  url: z.string().optional().describe('For navigate: the URL to open'),
  selector: z.string().optional().describe('For click/fill: CSS selector or accessible name'),
  value: z.string().optional().describe('For fill: the value to type'),
})

export const browserAutomation = tool({
  description:
    'Run a sequence of browser actions: navigate to a URL, take a snapshot of the page, click an element, or fill a form field. Use this for web tasks that require interaction (forms, logins, multi-step flows). Requires browser automation to be enabled.',
  inputSchema: z.object({
    steps: z
      .array(stepSchema)
      .min(1)
      .max(10)
      .describe(
        'Ordered list of actions. Example: [{ action: "navigate", url: "https://..." }, { action: "snapshot" }]',
      ),
  }),
  execute: async ({ steps }) => {
    const enabled = process.env.ENABLE_BROWSER_AUTOMATION === 'true'

    if (!enabled) {
      return {
        success: false,
        error:
          'Browser automation is not enabled. Set ENABLE_BROWSER_AUTOMATION=true and integrate Playwright or Browserbase to use this tool. Until then, use web_search and web_scrape for read-only web tasks.',
        stepsRequested: steps.length,
      }
    }

    // Future: integrate Playwright or Browserbase here.
    // Example flow: launch browser, run steps in sequence, return final snapshot or result.
    return {
      success: false,
      error:
        'Browser automation is enabled but not yet integrated. Add Playwright (or Browserbase + Stagehand) in this file to run navigate/snapshot/click/fill steps.',
      stepsRequested: steps.length,
    }
  },
})
