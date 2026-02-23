import { tool } from 'ai'
import { z } from 'zod'

export const slackMessage = tool({
  description:
    'Post a message to a Slack channel. Use either an incoming webhook URL or a bot token. Use this to send notifications, alerts, or reports to your team.',
  inputSchema: z.object({
    channel: z
      .string()
      .optional()
      .describe(
        'Slack channel ID (e.g. C01234ABCD) or name (e.g. #general). Required when using bot token; ignored when using webhook.',
      ),
    text: z.string().describe('The message text to post. Supports Slack markdown (e.g. *bold*, _italic_).'),
    username: z.string().optional().describe('Override the bot username (webhook only).'),
  }),
  execute: async ({ channel, text, username }) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    const botToken = process.env.SLACK_BOT_TOKEN

    if (webhookUrl && webhookUrl.startsWith('https://')) {
      try {
        const body: { text: string; username?: string } = { text }
        if (username) body.username = username

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        })

        if (!response.ok) {
          const resText = await response.text()
          return {
            success: false,
            error: `Slack webhook returned ${response.status}: ${resText.slice(0, 200)}`,
          }
        }
        return { success: true, message: 'Message posted to Slack via webhook.' }
      } catch (e) {
        return {
          success: false,
          error: `Failed to post to Slack: ${e instanceof Error ? e.message : 'Unknown error'}`,
        }
      }
    }

    if (!botToken) {
      return {
        success: false,
        error:
          'Slack is not configured. Set either SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN — contact the platform admin.',
      }
    }

    if (!channel) {
      return {
        success: false,
        error: 'When using SLACK_BOT_TOKEN, the "channel" parameter is required (channel ID or #name).',
      }
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel.replace(/^#/, ''),
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      const data = await response.json().catch(() => ({}))

      if (!data.ok) {
        return {
          success: false,
          error: data.error ?? `Slack API returned ${response.status}`,
        }
      }

      return { success: true, message: 'Message posted to Slack.', ts: data.ts }
    } catch (e) {
      return {
        success: false,
        error: `Failed to post to Slack: ${e instanceof Error ? e.message : 'Unknown error'}`,
      }
    }
  },
})
