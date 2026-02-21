import { tool } from 'ai'
import { z } from 'zod'

export const httpRequest = tool({
  description:
    'Make an HTTP request to any external API. Supports GET, POST, PUT, PATCH, DELETE. Use this to integrate with any service that has a REST API.',
  inputSchema: z.object({
    url: z.string().describe('The full URL to call (must start with https://)'),
    method: z
      .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      .optional()
      .describe('HTTP method (default: GET)'),
    headers: z
      .record(z.string())
      .optional()
      .describe('HTTP headers as key-value pairs (e.g. Authorization, Content-Type)'),
    body: z.string().optional().describe('Request body as a JSON string (for POST/PUT/PATCH)'),
    timeout_ms: z
      .number()
      .min(1000)
      .max(15000)
      .optional()
      .describe('Timeout in milliseconds (default: 10000, max: 15000)'),
  }),
  execute: async ({ url, method = 'GET', headers = {}, body, timeout_ms = 10_000 }) => {
    // Only allow https for security
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return { error: 'URL must start with https:// or http://', ok: false }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'TerabitsAI-Agent/1.0',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body ?? undefined,
        signal: AbortSignal.timeout(timeout_ms),
      })

      let responseBody: string
      const contentType = response.headers.get('content-type') ?? ''

      if (contentType.includes('application/json')) {
        try {
          const json = await response.json()
          responseBody = JSON.stringify(json)
        } catch {
          responseBody = await response.text()
        }
      } else {
        responseBody = await response.text()
      }

      // Truncate large responses
      if (responseBody.length > 20_000) {
        responseBody = responseBody.slice(0, 20_000) + '\n\n[response truncated at 20,000 characters]'
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      }
    } catch (e) {
      return {
        error: `HTTP request failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        ok: false,
      }
    }
  },
})
