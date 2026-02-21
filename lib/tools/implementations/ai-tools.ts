import { tool } from 'ai'
import { z } from 'zod'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export const aiExtract = tool({
  description:
    'Extract specific structured data from a piece of text using AI. Describe the schema you want (e.g. "extract company name, CEO name, and founding year") and receive the data as JSON.',
  inputSchema: z.object({
    text: z.string().describe('The source text to extract data from'),
    schema_description: z
      .string()
      .describe(
        'Plain-English description of the data fields to extract (e.g. "extract: company_name, ceo, founding_year, headquarters_city")'
      ),
  }),
  execute: async ({ text, schema_description }) => {
    const truncatedText = text.length > 8_000 ? text.slice(0, 8_000) + '\n[truncated]' : text

    try {
      const { text: result } = await generateText({
        model: google('gemini-2.0-flash'),
        prompt: `Extract the following data from the text below. Return ONLY a valid JSON object with no explanation or markdown.

Schema: ${schema_description}

Text:
${truncatedText}

Return only the JSON object.`,
        maxTokens: 1024,
      })

      // Try to parse the result as JSON
      const cleaned = result.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      try {
        const parsed = JSON.parse(cleaned)
        return { success: true, data: parsed }
      } catch {
        return { success: true, data: cleaned }
      }
    } catch (e) {
      return {
        error: `Extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        success: false,
      }
    }
  },
})

export const aiSummarize = tool({
  description:
    'Summarize a long piece of text into a concise version. Useful for condensing articles, reports, email threads, or any long content.',
  inputSchema: z.object({
    text: z.string().describe('The text to summarize'),
    max_words: z
      .number()
      .min(20)
      .max(500)
      .optional()
      .describe('Target length of the summary in words (default: 150)'),
    style: z
      .enum(['bullet_points', 'paragraph', 'tldr'])
      .optional()
      .describe('Summary style: bullet_points, paragraph, or tldr (default: paragraph)'),
  }),
  execute: async ({ text, max_words = 150, style = 'paragraph' }) => {
    const truncatedText = text.length > 12_000 ? text.slice(0, 12_000) + '\n[truncated]' : text

    const styleInstructions = {
      bullet_points: 'Write the summary as bullet points (• each point).',
      paragraph: 'Write the summary as a single coherent paragraph.',
      tldr: 'Write an extremely brief TL;DR in 1-2 sentences.',
    }

    try {
      const { text: summary } = await generateText({
        model: google('gemini-2.0-flash'),
        prompt: `Summarize the following text in approximately ${max_words} words. ${styleInstructions[style]}

Text:
${truncatedText}

Summary:`,
        maxTokens: 1024,
      })

      return {
        success: true,
        summary: summary.trim(),
        word_count: summary.trim().split(/\s+/).length,
        style,
      }
    } catch (e) {
      return {
        error: `Summarization failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        success: false,
      }
    }
  },
})
