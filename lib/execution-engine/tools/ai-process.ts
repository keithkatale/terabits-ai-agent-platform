// AI processing tool - use AI to process/analyze data

import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { Tool, ExecutionContext } from '../types'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

export const aiProcess: Tool = {
  name: 'ai_process',
  description: 'Process data with AI. Provide data and instructions for what to do with it.',
  
  schema: {
    type: 'object',
    properties: {
      data: {
        type: 'string',
        description: 'The data to process',
      },
      instruction: {
        type: 'string',
        description: 'What to do with the data (e.g., "extract emails", "summarize", "categorize")',
      },
      format: {
        type: 'string',
        enum: ['text', 'json', 'list'],
        description: 'Desired output format',
      },
    },
    required: ['data', 'instruction'],
  },

  async execute(input: unknown, context: ExecutionContext): Promise<unknown> {
    const params = input as {
      data: string
      instruction: string
      format?: 'text' | 'json' | 'list'
    }

    try {
      const prompt = `${params.instruction}

Data to process:
${params.data}

${params.format === 'json' ? 'Return the result as a JSON object.' : ''}
${params.format === 'list' ? 'Return the result as a bulleted list.' : ''}`

      const result = await generateText({
        model: google('gemini-2.0-flash-exp'),
        prompt,
        maxTokens: 4096,
        temperature: 0.3,
      })

      let processed = result.text

      // Try to parse JSON if requested
      if (params.format === 'json') {
        try {
          const jsonMatch = processed.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            processed = jsonMatch[1]
          }
          return JSON.parse(processed)
        } catch (e) {
          // Return as text if parsing fails
        }
      }

      return {
        result: processed,
        format: params.format || 'text',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
}
