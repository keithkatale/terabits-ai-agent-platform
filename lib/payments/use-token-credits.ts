/**
 * Integration hook for using token-to-credit conversion in agent execution
 * Call this in your agent-executor.ts to track and deduct credits
 */

import { tokenConverter } from './token-to-credit-converter'
import { creditsService } from './credits-service'

interface ExecutionTokenMetrics {
  modelName: string
  promptTokens: number
  completionTokens: number
  executionId: string
  userId: string
  agentId?: string
}

/**
 * Process token usage and deduct credits after execution
 *
 * Usage in agent-executor:
 * ```typescript
 * const result = await streamText({ ... })
 * await useTokenCredits({
 *   modelName: 'gemini-3-1-pro-preview',
 *   promptTokens: result.usage?.promptTokens || 0,
 *   completionTokens: result.usage?.completionTokens || 0,
 *   executionId: execution.id,
 *   userId: user.id,
 *   agentId: agentId,
 * })
 * ```
 */
export async function useTokenCredits(metrics: ExecutionTokenMetrics): Promise<{
  creditsDeducted: number
  remainingBalance: number
  costBreakdown: {
    aiCost: number
    platformCost: number
    creditsValue: string
  }
}> {
  const { modelName, promptTokens, completionTokens, executionId, userId, agentId } =
    metrics

  // Calculate credits based on token usage
  const costCalc = await tokenConverter.calculateCredits(modelName, {
    promptTokens,
    completionTokens,
  })

  const { aiCostUsd, platformCostUsd, creditsConsumed, creditsValue } = costCalc

  try {
    // Deduct credits from user balance
    const result = await creditsService.deductCredits(
      userId,
      creditsConsumed,
      `Agent execution: ${creditsConsumed} credits (${promptTokens + completionTokens} tokens @ ${modelName})`,
      agentId,
      executionId
    )

    if (!result.success) {
      throw new Error('Failed to deduct credits')
    }

    // Update execution record with token metrics
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    await supabase
      .from('agent_executions')
      .update({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        ai_cost_usd: aiCostUsd,
        platform_cost_usd: platformCostUsd,
        credits_consumed: creditsConsumed,
      })
      .eq('id', executionId)

    return {
      creditsDeducted: creditsConsumed,
      remainingBalance: result.balanceAfter,
      costBreakdown: {
        aiCost: aiCostUsd,
        platformCost: platformCostUsd,
        creditsValue,
      },
    }
  } catch (error) {
    console.error('Error processing token credits:', error)
    throw error
  }
}

/**
 * Check if user has enough credits before execution
 */
export async function checkCreditAvailability(
  userId: string,
  estimatedTokens: number,
  modelName: string = 'claude-sonnet-4-6' // default estimate model
): Promise<{
  hasEnoughCredits: boolean
  estimatedCost: number
  currentBalance: number
  shortfall?: number
}> {
  try {
    // Get current balance
    const balance = await creditsService.getBalance(userId)

    // Estimate cost
    const avgUsage = {
      promptTokens: estimatedTokens * 0.4,
      completionTokens: estimatedTokens * 0.6,
    }
    const costCalc = await tokenConverter.calculateCredits(modelName, avgUsage)

    const hasEnoughCredits = balance.balance >= costCalc.creditsConsumed
    const shortfall = hasEnoughCredits ? 0 : costCalc.creditsConsumed - balance.balance

    return {
      hasEnoughCredits,
      estimatedCost: costCalc.creditsConsumed,
      currentBalance: balance.balance,
      shortfall,
    }
  } catch (error) {
    console.error('Error checking credit availability:', error)
    throw error
  }
}

/**
 * Get pricing information for UI display
 */
export async function getPricingInfo(modelName: string) {
  const pricing = await tokenConverter.getPricing(modelName)

  if (!pricing) {
    return null
  }

  return {
    modelName: pricing.modelName,
    family: pricing.modelFamily,
    tier: pricing.modelTier,
    promptPricePerMillionTokens: pricing.promptTokenPriceUsd * 1_000_000,
    completionPricePerMillionTokens: pricing.completionTokenPriceUsd * 1_000_000,
    creditValue: pricing.creditValueUsd,
    exampleCosts: {
      '100 tokens': await tokenConverter.calculateCredits(modelName, {
        promptTokens: 60,
        completionTokens: 40,
      }),
      '500 tokens': await tokenConverter.calculateCredits(modelName, {
        promptTokens: 300,
        completionTokens: 200,
      }),
      '1000 tokens': await tokenConverter.calculateCredits(modelName, {
        promptTokens: 600,
        completionTokens: 400,
      }),
    },
  }
}
