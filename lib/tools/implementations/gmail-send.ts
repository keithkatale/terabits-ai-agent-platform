import { tool } from 'ai'
import { z } from 'zod'
import { getExecutionUserId } from '@/lib/execution-context'
import { createClient } from '@/lib/supabase/server'
import { sendEmailViaGmail } from '@/lib/integrations/gmail'

/**
 * Send email through the user's connected Gmail account.
 * Only works when the run is executed by an authenticated user who has connected Gmail in account settings.
 */
export const gmailSend = tool({
  description:
    "Send an email through the user's Gmail. The recipient will see the email as sent from the user's Gmail address. The user must have connected Gmail in account settings first. Use this when the user wants to send email from their own Gmail rather than a platform address.",
  inputSchema: z.object({
    to: z
      .union([z.string(), z.array(z.string())])
      .describe('Recipient email address or array of addresses'),
    subject: z.string().describe('Email subject line'),
    body: z.string().describe('Email body (plain text).'),
    fromName: z
      .string()
      .optional()
      .describe('Sender display name (e.g. "Terabits Agent"). The from address is the user\'s Gmail.'),
  }),
  execute: async ({ to, subject, body, fromName }) => {
    const userId = getExecutionUserId()
    if (!userId) {
      return {
        success: false,
        error:
          'You must be signed in to send email via Gmail. Connect Gmail in account settings, then run this agent while logged in.',
      }
    }

    const toAddresses = Array.isArray(to) ? to : [to]
    const supabase = await createClient()

    const result = await sendEmailViaGmail(supabase, userId, {
      to: toAddresses,
      subject,
      body,
      fromName,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }
    return {
      success: true,
      messageId: result.messageId,
      to: toAddresses,
      subject,
    }
  },
})
