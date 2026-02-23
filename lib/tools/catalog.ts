// Central tool catalog for the Terabits AI platform.
// This is the single source of truth for all tools agents can use.
// Both execute APIs import getEnabledTools() from here.

import { tool } from 'ai'
import { z } from 'zod'
import { httpRequest } from './implementations/http-request'
import { sendEmail } from './implementations/send-email'
import { rssReader } from './implementations/rss-reader'
import { aiExtract, aiSummarize } from './implementations/ai-tools'
import { aiImageGenerate } from './implementations/ai-image-generate'
import { slackMessage } from './implementations/slack-message'
import { discordMessage } from './implementations/discord-message'
import { gmailSend } from './implementations/gmail-send'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToolStatus = 'available' | 'coming_soon'

export type ToolCategory =
  | 'web'
  | 'communication'
  | 'ai_processing'
  | 'data_connectors'
  | 'documents'
  | 'actions'

export interface ToolDefinition {
  name: string
  label: string
  description: string
  icon: string          // lucide-react icon name
  category: ToolCategory
  status: ToolStatus
  envVars?: string[]    // required env vars (shown as warning in UI)
  defaultEnabled?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool?: any            // Vercel AI SDK tool() object (only for status='available')
}

// ── Inline tools (web_search + web_scrape) ────────────────────────────────────
// Kept here so they're registered in the catalog like all other tools.

const webSearch = tool({
  description:
    'Search the web for up-to-date information. Returns titles, URLs, and snippets.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    num: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe('Number of results to return (default 5)'),
  }),
  execute: async ({ query, num = 5 }) => {
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) {
      return {
        error: 'SERPER_API_KEY is not configured. Add it to enable web search.',
        results: [],
      }
    }
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) throw new Error(`Serper API returned ${res.status}`)
      const data = await res.json()
      return {
        query,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results: ((data.organic as any[]) ?? []).map((r) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
        })),
        answerBox: data.answerBox ?? null,
        knowledgeGraph: data.knowledgeGraph ?? null,
      }
    } catch (e) {
      return {
        error: `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        results: [],
      }
    }
  },
})

const webScrape = tool({
  description:
    'Fetch and extract readable text from a webpage. Use after web_search to read full articles.',
  inputSchema: z.object({
    url: z.string().describe('The URL to fetch'),
  }),
  execute: async ({ url }) => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const html = await res.text()

      let text = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()

      if (text.length > 10_000) {
        text = text.slice(0, 10_000) + '\n\n[content truncated at 10,000 characters]'
      }

      return { url, content: text, length: text.length }
    } catch (e) {
      return {
        error: `Scrape failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        url,
        content: null,
      }
    }
  },
})

// ── Full Catalog ──────────────────────────────────────────────────────────────

export const TOOL_CATALOG: ToolDefinition[] = [
  // ─── Web ──────────────────────────────────────────────────────────────────
  {
    name: 'web_search',
    label: 'Web Search',
    description: 'Search the web for current information using Google Search.',
    icon: 'Search',
    category: 'web',
    status: 'available',
    envVars: ['SERPER_API_KEY'],
    defaultEnabled: true,
    tool: webSearch,
  },
  {
    name: 'web_scrape',
    label: 'Web Scraper',
    description: 'Fetch and extract readable text from any webpage URL.',
    icon: 'Globe',
    category: 'web',
    status: 'available',
    defaultEnabled: true,
    tool: webScrape,
  },
  {
    name: 'rss_reader',
    label: 'RSS / News Reader',
    description: 'Read and parse any RSS or Atom news feed. Great for monitoring news sources.',
    icon: 'Rss',
    category: 'web',
    status: 'available',
    tool: rssReader,
  },
  {
    name: 'url_monitor',
    label: 'URL Change Monitor',
    description: 'Monitor a URL and detect when its content changes. Useful for price tracking.',
    icon: 'Bell',
    category: 'web',
    status: 'coming_soon',
  },
  {
    name: 'browser_automation',
    label: 'Browser automation',
    description:
      'Navigate the web, fill forms, and click elements in a real browser. Enables agents to complete web tasks that require login or interaction (e.g. get a receipt, create an order).',
    icon: 'Globe',
    category: 'web',
    status: 'coming_soon',
    envVars: ['ENABLE_BROWSER_AUTOMATION'],
  },

  // ─── Actions ──────────────────────────────────────────────────────────────
  {
    name: 'http_request',
    label: 'HTTP Request',
    description: 'Make HTTP calls to any external REST API (GET, POST, PUT, DELETE).',
    icon: 'Webhook',
    category: 'actions',
    status: 'available',
    tool: httpRequest,
  },

  // ─── Communication ────────────────────────────────────────────────────────
  {
    name: 'send_email',
    label: 'Send Email',
    description: 'Send emails to recipients. Results, reports, alerts — delivered to any inbox.',
    icon: 'Mail',
    category: 'communication',
    status: 'available',
    envVars: ['RESEND_API_KEY', 'EMAIL_FROM'],
    tool: sendEmail,
  },
  {
    name: 'slack_message',
    label: 'Slack Message',
    description: 'Post messages to a Slack channel via a bot or incoming webhook.',
    icon: 'MessageSquare',
    category: 'communication',
    status: 'available',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_WEBHOOK_URL'],
    tool: slackMessage,
  },
  {
    name: 'telegram_message',
    label: 'Telegram Message',
    description: 'Send messages to a Telegram chat via a Telegram bot.',
    icon: 'Send',
    category: 'communication',
    status: 'coming_soon',
    envVars: ['TELEGRAM_BOT_TOKEN'],
  },
  {
    name: 'sms_send',
    label: 'Send SMS',
    description: 'Send SMS text messages via Twilio to any phone number.',
    icon: 'MessageCircle',
    category: 'communication',
    status: 'coming_soon',
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_FROM'],
  },
  {
    name: 'discord_message',
    label: 'Discord Message',
    description: 'Post messages to a Discord channel via a webhook.',
    icon: 'Hash',
    category: 'communication',
    status: 'available',
    envVars: ['DISCORD_WEBHOOK_URL'],
    tool: discordMessage,
  },
  {
    name: 'gmail_send',
    label: 'Send via Gmail',
    description:
      "Send email through the user's connected Gmail account. Recipients see the email as from the user's Gmail. User must connect Gmail in account settings first.",
    icon: 'Mail',
    category: 'communication',
    status: 'available',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    tool: gmailSend,
  },

  // ─── AI Processing ────────────────────────────────────────────────────────
  {
    name: 'ai_image_generate',
    label: 'Generate Image',
    description: 'Generate images from text descriptions using Google Gemini 2.5 Flash. Supports 512x512, 768x768, and 1024x1024 resolutions.',
    icon: 'Image',
    category: 'ai_processing',
    status: 'available',
    defaultEnabled: true,
    tool: aiImageGenerate,
  },
  {
    name: 'ai_extract',
    label: 'Extract Data (AI)',
    description: 'Extract structured data fields from unstructured text using AI.',
    icon: 'Sparkles',
    category: 'ai_processing',
    status: 'available',
    tool: aiExtract,
  },
  {
    name: 'ai_summarize',
    label: 'Summarize (AI)',
    description: 'Condense long text into a concise summary. Supports bullet points or paragraph style.',
    icon: 'AlignLeft',
    category: 'ai_processing',
    status: 'available',
    tool: aiSummarize,
  },
  {
    name: 'ai_classify',
    label: 'Classify (AI)',
    description: 'Classify text into custom categories (e.g. sentiment, topic, urgency).',
    icon: 'Tag',
    category: 'ai_processing',
    status: 'coming_soon',
  },
  {
    name: 'ai_translate',
    label: 'Translate (AI)',
    description: 'Translate text between languages.',
    icon: 'Languages',
    category: 'ai_processing',
    status: 'coming_soon',
  },

  // ─── Data Connectors ──────────────────────────────────────────────────────
  {
    name: 'google_sheets_read',
    label: 'Google Sheets (read)',
    description: 'Read rows from a Google Sheets spreadsheet.',
    icon: 'Table',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['GOOGLE_SERVICE_ACCOUNT_KEY'],
  },
  {
    name: 'google_sheets_write',
    label: 'Google Sheets (write)',
    description: 'Append or update rows in a Google Sheets spreadsheet.',
    icon: 'Table2',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['GOOGLE_SERVICE_ACCOUNT_KEY'],
  },
  {
    name: 'airtable_read',
    label: 'Airtable (read)',
    description: 'Read records from an Airtable base.',
    icon: 'Database',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['AIRTABLE_API_KEY'],
  },
  {
    name: 'hubspot_contact',
    label: 'HubSpot (contacts)',
    description: 'Create or update contacts in HubSpot CRM.',
    icon: 'Users',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['HUBSPOT_API_KEY'],
  },
  {
    name: 'shopify_orders',
    label: 'Shopify (orders)',
    description: 'Read recent orders and product data from your Shopify store.',
    icon: 'ShoppingBag',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_SHOP_DOMAIN'],
  },
  {
    name: 'stripe_events',
    label: 'Stripe (events)',
    description: 'Read payment events, invoices, and subscription data from Stripe.',
    icon: 'CreditCard',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['STRIPE_SECRET_KEY'],
  },
  {
    name: 'google_calendar',
    label: 'Google Calendar',
    description: 'Read and create Google Calendar events.',
    icon: 'Calendar',
    category: 'data_connectors',
    status: 'coming_soon',
    envVars: ['GOOGLE_SERVICE_ACCOUNT_KEY'],
  },

  // ─── Documents ────────────────────────────────────────────────────────────
  {
    name: 'pdf_read',
    label: 'Read PDF',
    description: 'Extract text from an uploaded PDF file or a PDF accessible via URL.',
    icon: 'FileText',
    category: 'documents',
    status: 'coming_soon',
  },
  {
    name: 'google_drive_read',
    label: 'Google Drive (read)',
    description: 'Read files from Google Drive (Docs, Sheets, PDFs).',
    icon: 'HardDrive',
    category: 'documents',
    status: 'coming_soon',
    envVars: ['GOOGLE_SERVICE_ACCOUNT_KEY'],
  },
  {
    name: 'generate_pdf',
    label: 'Generate PDF',
    description: 'Create a formatted PDF report or document from text or HTML.',
    icon: 'FileOutput',
    category: 'documents',
    status: 'coming_soon',
  },
]

// ── Category metadata ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  web: 'Web & Research',
  communication: 'Communication & Messaging',
  ai_processing: 'AI Processing',
  data_connectors: 'Data Connectors',
  documents: 'Documents & Files',
  actions: 'Actions & Integrations',
}

export const CATEGORY_ORDER: ToolCategory[] = [
  'web',
  'actions',
  'communication',
  'ai_processing',
  'data_connectors',
  'documents',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Given an agent's tool_config, return only the enabled tools
 * as a Record<name, tool()> ready for streamText({ tools }).
 */
export function getEnabledTools(
  toolConfig: Record<string, { enabled?: boolean }>
): Record<string, ReturnType<typeof tool>> {
  const result: Record<string, ReturnType<typeof tool>> = {}

  for (const def of TOOL_CATALOG) {
    if (def.status !== 'available' || !def.tool) continue

    const config = toolConfig[def.name]

    // Default-enabled tools (web_search, web_scrape) are on unless explicitly disabled
    const isEnabled = def.defaultEnabled
      ? config?.enabled !== false
      : config?.enabled === true

    if (isEnabled) {
      result[def.name] = def.tool
    }
  }

  return result
}

/**
 * Get tools grouped by category (only available tools, for UI display).
 */
export function getToolsByCategory(): Record<ToolCategory, ToolDefinition[]> {
  const grouped = {} as Record<ToolCategory, ToolDefinition[]>
  for (const cat of CATEGORY_ORDER) grouped[cat] = []
  for (const def of TOOL_CATALOG) grouped[def.category].push(def)
  return grouped
}

/**
 * Human-readable label for a tool name (for execution logs).
 */
export const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  TOOL_CATALOG.map((t) => [t.name, t.label])
)
