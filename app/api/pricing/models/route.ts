/**
 * GET /api/pricing/models
 * Returns all active AI model pricing and credit conversion rates
 * Used by UI to display costs and for cost estimation
 */

import { NextRequest, NextResponse } from 'next/server'
import { tokenConverter } from '@/lib/payments/token-to-credit-converter'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get all active pricing tiers
    const allPricing = await tokenConverter.listAllPricing()

    if (!allPricing || allPricing.length === 0) {
      return NextResponse.json(
        { error: 'No pricing data available' },
        { status: 503 }
      )
    }

    // Group by family and tier
    const grouped: Record<
      string,
      Record<
        string,
        {
          modelName: string
          promptPricePerMillionTokens: number
          completionPricePerMillionTokens: number
          averagePrice: number
          creditValue: number
          exampleCosts: Record<string, number>
        }
      >
    > = {}

    for (const pricing of allPricing) {
      const family = pricing.modelFamily.toUpperCase()
      const tier = pricing.modelTier.toUpperCase()

      if (!grouped[family]) {
        grouped[family] = {}
      }

      // Calculate example costs for different token counts
      const examples = {
        '100_tokens': await tokenConverter.calculateCredits(pricing.modelName, {
          promptTokens: 60,
          completionTokens: 40,
        }),
        '500_tokens': await tokenConverter.calculateCredits(pricing.modelName, {
          promptTokens: 300,
          completionTokens: 200,
        }),
        '1000_tokens': await tokenConverter.calculateCredits(pricing.modelName, {
          promptTokens: 600,
          completionTokens: 400,
        }),
        '5000_tokens': await tokenConverter.calculateCredits(pricing.modelName, {
          promptTokens: 3000,
          completionTokens: 2000,
        }),
      }

      grouped[family][tier] = {
        modelName: pricing.modelName,
        promptPricePerMillionTokens: pricing.promptTokenPriceUsd * 1_000_000,
        completionPricePerMillionTokens: pricing.completionTokenPriceUsd * 1_000_000,
        averagePrice:
          (pricing.promptTokenPriceUsd + pricing.completionTokenPriceUsd) / 2 * 1_000_000,
        creditValue: pricing.creditValueUsd,
        exampleCosts: {
          '100_tokens': examples['100_tokens'].creditsConsumed,
          '500_tokens': examples['500_tokens'].creditsConsumed,
          '1000_tokens': examples['1000_tokens'].creditsConsumed,
          '5000_tokens': examples['5000_tokens'].creditsConsumed,
        },
      }
    }

    // Also include credit package information
    const supabase = await createClient()
    const { data: packages } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_usd', { ascending: true })

    return NextResponse.json({
      models: grouped,
      creditPackages: packages || [],
      creditValueUsd: 0.003,
      platformMarkupMultiplier: 2.5,
      disclaimer:
        'Pricing updated quarterly. Contact support for enterprise bulk rates.',
    })
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing information' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pricing/estimate
 * Estimate cost for a hypothetical token usage
 */
export async function POST(request: NextRequest) {
  try {
    const { modelName, promptTokens, completionTokens } = await request.json()

    if (!modelName || promptTokens === undefined || completionTokens === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: modelName, promptTokens, completionTokens' },
        { status: 400 }
      )
    }

    const calculation = await tokenConverter.calculateCredits(modelName, {
      promptTokens,
      completionTokens,
    })

    return NextResponse.json({
      modelName,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      ...calculation,
    })
  } catch (error) {
    console.error('Error estimating cost:', error)
    return NextResponse.json(
      { error: 'Failed to estimate cost' },
      { status: 500 }
    )
  }
}
