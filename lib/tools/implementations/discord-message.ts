import { tool } from 'ai'
import { z } from 'zod'

export const discordMessage = tool({
  description:
    'Post a message to a Discord channel via webhook. Use this to send notifications, alerts, or reports to a Discord server.',
  inputSchema: z.object({
    content: z.string().max(2000).describe('The message text to post (max 2000 characters)'),
    username: z.string().optional().describe('Override the webhook username for this message'),
  }),
  execute: async ({ content, username }) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL

    if (!webhookUrl) {
      return {
        success: false,
        error:
          'Discord is not configured. DISCORD_WEBHOOK_URL is missing — contact the platform admin.',
      }
    }

    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return {
        success: false,
        error: 'DISCORD_WEBHOOK_URL must be a valid Discord webhook URL.',
      }
    }

    try {
      const body: { content: string; username?: string } = { content }
      if (username) body.username = username

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        const text = await response.text()
        return {
          success: false,
          error: `Discord API returned ${response.status}: ${text.slice(0, 200)}`,
        }
      }

      return { success: true, message: 'Message posted to Discord.' }
    } catch (e) {
      return {
        success: false,
        error: `Failed to post to Discord: ${e instanceof Error ? e.message : 'Unknown error'}`,
      }
    }
  },
})
