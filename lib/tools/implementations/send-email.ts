import { tool } from 'ai'
import { z } from 'zod'

export const sendEmail = tool({
  description:
    'Send an email to one or more recipients. Use this to deliver results, reports, alerts, or notifications via email.',
  inputSchema: z.object({
    to: z
      .union([z.string(), z.array(z.string())])
      .describe('Recipient email address or array of addresses'),
    subject: z.string().describe('Email subject line'),
    body: z
      .string()
      .describe('Email body in plain text or HTML. Markdown is accepted and will be rendered as HTML.'),
    from: z
      .string()
      .optional()
      .describe('Sender display name (e.g. "My Agent"). The from address is set by the platform.'),
  }),
  execute: async ({ to, subject, body, from: senderName }) => {
    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = process.env.EMAIL_FROM ?? 'agent@terabits.ai'

    if (!apiKey) {
      return {
        error:
          'Email sending is not configured. RESEND_API_KEY is missing — contact the platform admin.',
        success: false,
      }
    }

    const toAddresses = Array.isArray(to) ? to : [to]

    // Convert simple markdown/plain text to minimal HTML
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')

    const fromField = senderName ? `${senderName} <${fromAddress}>` : fromAddress

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromField,
          to: toAddresses,
          subject,
          html: `<p>${htmlBody}</p>`,
          text: body,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          error: `Email API returned ${response.status}: ${JSON.stringify(errorData)}`,
          success: false,
        }
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.id,
        to: toAddresses,
        subject,
      }
    } catch (e) {
      return {
        error: `Failed to send email: ${e instanceof Error ? e.message : 'Unknown error'}`,
        success: false,
      }
    }
  },
})
