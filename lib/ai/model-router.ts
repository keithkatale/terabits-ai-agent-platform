/**
 * Model Router — Smart model selection with rate-limit fallback.
 *
 * Strategy:
 * - Tool-execution steps (searching, scraping, clicking): use lite/flash models (cheap, fast)
 * - Final synthesis (writing the answer): use pro/frontier models (smarter output)
 * - If a model hits a 429 rate limit, it's marked unavailable and the next model is tried.
 * - Fallback chain: gemini-2.5-flash-lite → gemini-2.5-flash → gemini-2.5-pro → gemini-3-flash-preview → gemini-3-pro-preview
 */

import { google } from '@ai-sdk/google'

// ── Model catalogue ────────────────────────────────────────────────────────────

type ModelTier = 'lite' | 'standard' | 'pro' | 'frontier-lite' | 'frontier-pro'

interface ModelConfig {
  /** Short ID used internally for tracking */
  id: string
  /** Exact model string passed to the Google AI SDK */
  googleId: string
  tier: ModelTier
  /**
   * Thinking budget to pass in providerOptions:
   *   0  = thinking off (cheap, fast — good for tool steps)
   *  -1  = dynamic / let model decide (good for synthesis)
   */
  thinkingBudget: number
  /** Relative cost index (1 = cheapest) — for logging only */
  costIndex: number
}

const MODELS: ModelConfig[] = [
  {
    id: 'flash-lite',
    googleId: 'gemini-2.5-flash-lite',
    tier: 'lite',
    thinkingBudget: 0,
    costIndex: 1,
  },
  {
    id: 'flash',
    googleId: 'gemini-2.5-flash',
    tier: 'standard',
    thinkingBudget: 0,
    costIndex: 4,
  },
  {
    id: 'pro',
    googleId: 'gemini-2.5-pro',
    tier: 'pro',
    thinkingBudget: -1,
    costIndex: 20,
  },
  {
    id: 'g3-flash',
    googleId: 'gemini-3-flash-preview',
    tier: 'frontier-lite',
    thinkingBudget: 0,
    costIndex: 6,
  },
  {
    id: 'g3-pro',
    googleId: 'gemini-3-pro-preview',
    tier: 'frontier-pro',
    thinkingBudget: -1,
    costIndex: 30,
  },
]

// ── Session-level rate limit tracking ─────────────────────────────────────────
// Per-execution tracking — passed in rather than global to avoid cross-request bleed.

export type RateLimitSet = Set<string>

export function createRateLimitSet(): RateLimitSet {
  return new Set()
}

export function markRateLimited(rateLimited: RateLimitSet, modelId: string): void {
  rateLimited.add(modelId)
  console.warn(`[model-router] ${modelId} marked rate-limited — will use fallback`)
}

// ── Model selection ────────────────────────────────────────────────────────────

export type StepType = 'tool' | 'synthesis'

/**
 * Select the best available model for a given step type.
 *
 * - 'tool'      → prefer lite/standard (cheap, fast, no thinking needed)
 * - 'synthesis' → prefer pro/frontier (smarter output, thinking enabled)
 *
 * Returns the first non-rate-limited model in priority order.
 * Falls back to the last model in the list if all else is rate-limited.
 */
export function selectModel(
  stepType: StepType,
  rateLimited: RateLimitSet,
): ModelConfig {
  const candidates =
    stepType === 'tool'
      ? MODELS.filter((m) => m.tier === 'lite' || m.tier === 'standard')
      : MODELS

  const available = candidates.filter((m) => !rateLimited.has(m.id))
  const chosen = available[0] ?? MODELS[MODELS.length - 1]

  console.info(
    `[model-router] step=${stepType} model=${chosen.googleId} cost=${chosen.costIndex}x`,
  )
  return chosen
}

// ── SDK model instance ─────────────────────────────────────────────────────────

/**
 * Build the Vercel AI SDK model instance from a ModelConfig.
 * Includes Google-specific provider options.
 */
export function buildModel(config: ModelConfig): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
  providerOptions: object
} {
  return {
    model: google(config.googleId),
    providerOptions: {
      google: {
        thinkingConfig:
          config.thinkingBudget === 0
            ? { thinkingBudget: 0 }
            : { thinkingBudget: -1, includeThoughts: true },
      },
    },
  }
}

// ── Rate-limit error detection ─────────────────────────────────────────────────

/**
 * Returns true if an error from the AI SDK looks like a 429 / quota error.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('429') ||
    msg.toLowerCase().includes('quota') ||
    msg.toLowerCase().includes('rate limit') ||
    msg.toLowerCase().includes('resource exhausted')
  )
}

// ── Re-export for callers ──────────────────────────────────────────────────────

export { MODELS }
export type { ModelConfig }
