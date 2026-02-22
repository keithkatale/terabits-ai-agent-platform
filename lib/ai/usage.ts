/**
 * Normalize AI SDK usage to a consistent shape for credits and execution_logs.
 *
 * The Vercel AI SDK (LanguageModelUsage) uses:
 *   - inputTokens (not promptTokens)
 *   - outputTokens (not completionTokens)
 *   - totalTokens
 *
 * Multi-step runs: use result.totalUsage (aggregated), not the last 'finish' part's usage.
 */

export interface NormalizedUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * AI SDK LanguageModelUsage-like shape (from stream parts or result.usage / result.totalUsage).
 * SDK uses inputTokens/outputTokens; some code still uses promptTokens/completionTokens.
 */
export interface SdkUsageLike {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  /** Legacy / alternate names */
  promptTokens?: number
  completionTokens?: number
}

/**
 * Normalize usage from streamText result.usage / result.totalUsage or from a 'finish' stream part.
 * Prefers SDK names (inputTokens, outputTokens) then falls back to legacy names.
 */
export function normalizeUsage(usage: SdkUsageLike | undefined | null): NormalizedUsage {
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  }
  const promptTokens =
    usage.inputTokens ?? usage.promptTokens ?? 0
  const completionTokens =
    usage.outputTokens ?? usage.completionTokens ?? 0
  const totalTokens =
    (usage.totalTokens ?? (promptTokens + completionTokens)) || 0
  return {
    promptTokens,
    completionTokens,
    totalTokens: totalTokens > 0 ? totalTokens : promptTokens + completionTokens,
  }
}

/**
 * Accumulate usage across multiple steps (e.g. multiple 'finish' stream parts).
 * Use when you're not using result.totalUsage.
 */
export function addUsage(
  acc: NormalizedUsage,
  part: SdkUsageLike | undefined | null
): NormalizedUsage {
  const u = normalizeUsage(part)
  return {
    promptTokens: acc.promptTokens + u.promptTokens,
    completionTokens: acc.completionTokens + u.completionTokens,
    totalTokens: acc.totalTokens + u.totalTokens,
  }
}
