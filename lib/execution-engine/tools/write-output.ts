// Write output tool - format and return results

import type { Tool, ExecutionContext } from '../types'

export const writeOutput: Tool = {
  name: 'write',
  description: 'Format and write output data. Use this to structure your final results.',
  
  schema: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        description: 'The data to output',
      },
      format: {
        type: 'string',
        enum: ['json', 'table', 'list', 'text'],
        description: 'Output format',
      },
      title: {
        type: 'string',
        description: 'Optional title for the output',
      },
    },
    required: ['data'],
  },

  async execute(input: unknown, context: ExecutionContext): Promise<unknown> {
    const params = input as {
      data: any
      format?: 'json' | 'table' | 'list' | 'text'
      title?: string
    }

    const format = params.format || 'json'

    return {
      data: params.data,
      format,
      title: params.title,
      timestamp: new Date().toISOString(),
      executionId: context.executionId,
    }
  },
}
