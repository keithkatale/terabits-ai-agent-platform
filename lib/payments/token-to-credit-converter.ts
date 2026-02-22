/**
 * Token to Credit Converter
 * Converts LLM token usage to platform credits based on actual API pricing
 *
 * Formula:
 * 1. Calculate raw AI cost: (prompt_tokens × prompt_price) + (completion_tokens × completion_price)
 * 2. Apply platform markup: ai_cost × markup_multiplier
 * 3. Convert to credits: platform_cost ÷ credit_value_usd, rounded up with minimum
 *
 * Example (Gemini 3 Flash):
 *   - Prompt: 200 tokens × $0.0000005 = $0.0001
 *   - Completion: 300 tokens × $0.000003 = $0.0009
 *   - Total: $0.001 → 2.5x markup = $0.0025 → ÷ $0.003 per credit = 0.833 → round up to 1 credit
 */

import { createClient } from '@/lib/supabase/server'

interface TokenUsage {
  promptTokens: number
  completionTokens: number
}

interface CostCalculation {
  aiCostUsd: number
  platformCostUsd: number
  creditsConsumed: number
  creditsValue: string // Human-readable: "1 credit = $0.003"
}

interface TokenPricing {
  modelName: string
  modelFamily: string
  modelTier: string
  promptTokenPriceUsd: number
  completionTokenPriceUsd: number
  platformMarkupMultiplier: number
  creditValueUsd: number
  minimumCreditCost: number
}

export class TokenToCreditConverter {
  private static instance: TokenToCreditConverter
  private pricingCache: Map<string, TokenPricing> = new Map()
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes
  private lastCacheUpdate: number = 0

  private constructor() {}

  static getInstance(): TokenToCreditConverter {
    if (!TokenToCreditConverter.instance) {
      TokenToCreditConverter.instance = new TokenToCreditConverter()
    }
    return TokenToCreditConverter.instance
  }

  /**
   * Fetch pricing from database with caching
   */
  private async getPricingFromDb(modelName: string): Promise<TokenPricing | null> {
    // Check if cache needs refresh
    const now = Date.now()
    if (
      !this.pricingCache.has(modelName) ||
      now - this.lastCacheUpdate > this.cacheExpiry
    ) {
      try {
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('token_pricing')
          .select('*')
          .eq('model_name', modelName)
          .eq('is_active', true)
          .single()

        if (error || !data) {
          console.warn(`Pricing not found for model: ${modelName}`)
          return null
        }

        const pricing: TokenPricing = {
          modelName: data.model_name,
          modelFamily: data.model_family,
          modelTier: data.model_tier,
          promptTokenPriceUsd: parseFloat(data.prompt_token_price_usd),
          completionTokenPriceUsd: parseFloat(data.completion_token_price_usd),
          platformMarkupMultiplier: parseFloat(data.platform_markup_multiplier),
          creditValueUsd: parseFloat(data.credit_value_usd),
          minimumCreditCost: data.minimum_credit_cost,
        }

        this.pricingCache.set(modelName, pricing)
        this.lastCacheUpdate = now
        return pricing
      } catch (error) {
        console.error(`Error fetching pricing for ${modelName}:`, error)
        return null
      }
    }

    return this.pricingCache.get(modelName) || null
  }

  /**
   * Calculate credits from token usage
   * Falls back to default pricing if model pricing not found
   */
  async calculateCredits(
    modelName: string,
    usage: TokenUsage
  ): Promise<CostCalculation> {
    // Fetch pricing from database
    let pricing = await this.getPricingFromDb(modelName)

    // Fallback to defaults if not found
    if (!pricing) {
      console.warn(
        `Using default pricing for unknown model: ${modelName}. Add to token_pricing table.`
      )
      pricing = this.getDefaultPricing()
    }

    const { promptTokens, completionTokens } = usage

    // Step 1: Calculate raw AI provider cost
    const aiCostUsd =
      promptTokens * pricing.promptTokenPriceUsd +
      completionTokens * pricing.completionTokenPriceUsd

    // Step 2: Apply platform markup (covers infrastructure, support, profit)
    const platformCostUsd = aiCostUsd * pricing.platformMarkupMultiplier

    // Step 3: Convert to credits (round up with minimum)
    const creditsAsDecimal = platformCostUsd / pricing.creditValueUsd
    const creditsConsumed = Math.max(
      Math.ceil(creditsAsDecimal),
      pricing.minimumCreditCost
    )

    return {
      aiCostUsd: Math.round(aiCostUsd * 1000000) / 1000000, // Round to 6 decimals
      platformCostUsd: Math.round(platformCostUsd * 1000000) / 1000000,
      creditsConsumed,
      creditsValue: `1 credit = $${pricing.creditValueUsd.toFixed(4)}`,
    }
  }

  /**
   * Calculate batch credits for multiple requests
   */
  async calculateBatchCredits(
    requests: Array<{ modelName: string; usage: TokenUsage }>
  ): Promise<
    Array<
      CostCalculation & {
        modelName: string
      }
    >
  > {
    return Promise.all(
      requests.map(async (req) => ({
        modelName: req.modelName,
        ...(await this.calculateCredits(req.modelName, req.usage)),
      }))
    )
  }

  /**
   * Get total credits for a conversation with multiple turns
   */
  async calculateConversationCredits(
    modelName: string,
    turns: TokenUsage[]
  ): Promise<{
    totalTokens: number
    totalCredits: number
    breakdown: CostCalculation[]
  }> {
    const breakdown = await Promise.all(
      turns.map((usage) => this.calculateCredits(modelName, usage))
    )

    const totalTokens = turns.reduce(
      (sum, usage) => sum + usage.promptTokens + usage.completionTokens,
      0
    )

    const totalCredits = breakdown.reduce((sum, calc) => sum + calc.creditsConsumed, 0)

    return { totalTokens, totalCredits, breakdown }
  }

  /**
   * Get pricing for a model
   * Used for UI display and cost estimation
   */
  async getPricing(modelName: string): Promise<TokenPricing | null> {
    return this.getPricingFromDb(modelName)
  }

  /**
   * List all active model pricing
   */
  async listAllPricing(): Promise<TokenPricing[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('token_pricing')
        .select('*')
        .eq('is_active', true)
        .order('model_family', { ascending: true })

      if (error || !data) {
        return []
      }

      return data.map((row) => ({
        modelName: row.model_name,
        modelFamily: row.model_family,
        modelTier: row.model_tier,
        promptTokenPriceUsd: parseFloat(row.prompt_token_price_usd),
        completionTokenPriceUsd: parseFloat(row.completion_token_price_usd),
        platformMarkupMultiplier: parseFloat(row.platform_markup_multiplier),
        creditValueUsd: parseFloat(row.credit_value_usd),
        minimumCreditCost: row.minimum_credit_cost,
      }))
    } catch (error) {
      console.error('Error fetching all pricing:', error)
      return []
    }
  }

  /**
   * Estimate monthly cost for a given token usage pattern
   */
  async estimateMonthlyCost(
    modelName: string,
    estimatedDailyTokens: number,
    daysPerMonth: number = 30
  ): Promise<{
    estimatedMonthlyTokens: number
    estimatedMonthlyCost: number
    estimatedMonthlyCredits: number
    recommendedPlan: string
  }> {
    const estimatedMonthlyTokens = estimatedDailyTokens * daysPerMonth
    const avgUsage: TokenUsage = {
      promptTokens: estimatedMonthlyTokens * 0.4, // Assuming 40% prompt, 60% completion
      completionTokens: estimatedMonthlyTokens * 0.6,
    }

    const calculation = await this.calculateCredits(modelName, avgUsage)

    // Recommend plan based on monthly credits
    let recommendedPlan = 'Free'
    if (calculation.creditsConsumed > 500 && calculation.creditsConsumed <= 5000) {
      recommendedPlan = 'Small ($20 - 5K credits)'
    } else if (calculation.creditsConsumed > 5000 && calculation.creditsConsumed <= 8000) {
      recommendedPlan = 'Medium ($30 - 8K credits)'
    } else if (calculation.creditsConsumed > 8000 && calculation.creditsConsumed <= 11000) {
      recommendedPlan = 'Large ($40 - 11K credits)'
    } else if (calculation.creditsConsumed > 11000) {
      recommendedPlan = 'XL ($50 - 15K credits) or Enterprise'
    }

    return {
      estimatedMonthlyTokens,
      estimatedMonthlyCost: calculation.platformCostUsd,
      estimatedMonthlyCredits: calculation.creditsConsumed,
      recommendedPlan,
    }
  }

  /**
   * Clear cache (useful for testing or after pricing updates)
   */
  clearCache(): void {
    this.pricingCache.clear()
    this.lastCacheUpdate = 0
  }

  /**
   * Default pricing fallback (if model not in database)
   * Uses Claude Sonnet 4.6 as baseline
   */
  private getDefaultPricing(): TokenPricing {
    return {
      modelName: 'default',
      modelFamily: 'claude',
      modelTier: 'sonnet',
      promptTokenPriceUsd: 0.000003, // $3 per 1M
      completionTokenPriceUsd: 0.000015, // $15 per 1M
      platformMarkupMultiplier: 2.5,
      creditValueUsd: 0.003,
      minimumCreditCost: 1,
    }
  }
}

/**
 * Export singleton instance
 */
export const tokenConverter = TokenToCreditConverter.getInstance()

/**
 * Utility function for quick conversion (if you already have pricing)
 */
export function convertTokensToCredits(
  promptTokens: number,
  completionTokens: number,
  promptPrice: number = 0.000003,
  completionPrice: number = 0.000015,
  markup: number = 2.5,
  creditValue: number = 0.003
): number {
  const aiCost = promptTokens * promptPrice + completionTokens * completionPrice
  const platformCost = aiCost * markup
  return Math.max(Math.ceil(platformCost / creditValue), 1)
}
