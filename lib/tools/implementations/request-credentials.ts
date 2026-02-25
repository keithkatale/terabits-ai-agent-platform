/**
 * request_credentials tool
 *
 * Called by the AI when it needs the user to supply login credentials for a
 * platform. The agent NEVER sees the actual values — it only specifies what
 * fields it needs (e.g. email + password for LinkedIn) and which browser
 * session to fill them into.
 *
 * Flow:
 *  1. AI sees a login form in a screenshot and calls this tool.
 *  2. The tool returns a { type: 'credential_request', ... } signal.
 *  3. The chat frontend intercepts that signal and renders a CredentialForm.
 *  4. User fills in their credentials (password is masked, never logged).
 *  5. Frontend calls /api/browser/session/:id/smart-fill with the values.
 *  6. Worker fills the form using Playwright locators and submits.
 *  7. Frontend resumes the AI with the post-submission screenshot.
 */

import { tool } from 'ai'
import { z } from 'zod'

export const requestCredentials = tool({
  description:
    'Ask the user to provide login credentials for a platform (e.g. LinkedIn, Gmail, GitHub). ' +
    'Call this when you see a login form in the browser and need the user to supply their username/email/password. ' +
    'The credentials are entered by the user in a secure masked form inside the chat and passed directly to the browser — you never see the values. ' +
    'Always call this instead of trying to guess or hardcode credentials.',
  inputSchema: z.object({
    platform: z.string().describe('Human-readable platform name, e.g. "LinkedIn"'),
    sessionId: z.string().describe('Browser session ID that has the login form open'),
    fields: z
      .array(
        z.object({
          name: z.string().describe('Internal field key, e.g. "email" or "password"'),
          label: z.string().describe('Human-readable label shown to the user, e.g. "Email or phone"'),
          type: z
            .enum(['text', 'email', 'password'])
            .default('text')
            .describe('Input type — use "password" so the value is masked'),
          placeholder: z.string().optional().describe('Hint text, e.g. "you@company.com"'),
          required: z.boolean().default(true),
          // Playwright locator hints so the worker knows which DOM element to fill
          locatorLabel: z.string().optional().describe('aria-label or visible label of the input field'),
          locatorPlaceholder: z.string().optional().describe('placeholder attribute of the input field'),
          locatorSelector: z.string().optional().describe('CSS selector for the input, e.g. "#username"'),
        })
      )
      .min(1)
      .describe('Fields to request from the user'),
    submitLabel: z
      .string()
      .optional()
      .describe('Text on the submit button, e.g. "Sign in". Used to click it after filling.'),
    submitSelector: z
      .string()
      .optional()
      .describe('CSS selector of the submit button as a fallback.'),
    note: z
      .string()
      .optional()
      .describe('Optional note shown to the user, e.g. "2FA may be required after login."'),
  }),
  execute: async ({ platform, sessionId, fields, submitLabel, submitSelector, note }) => {
    // This tool does not contact any external service. It returns a special
    // signal that the chat frontend picks up to show the CredentialForm.
    return {
      type: 'credential_request' as const,
      platform,
      sessionId,
      fields,
      submitLabel,
      submitSelector,
      note,
    }
  },
})
