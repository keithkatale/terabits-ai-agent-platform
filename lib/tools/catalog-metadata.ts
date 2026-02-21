/**
 * Tool catalog metadata for UI display.
 * This file contains only the tool definitions and categories without tool implementations.
 * This avoids importing server-side code on the client.
 */

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
  icon: string
  category: ToolCategory
  status: ToolStatus
  envVars?: string[]
  defaultEnabled?: boolean
}

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
  },
  {
    name: 'web_scrape',
    label: 'Web Scraper',
    description: 'Fetch and extract readable text from any webpage URL.',
    icon: 'Globe',
    category: 'web',
    status: 'available',
    defaultEnabled: true,
  },
  {
    name: 'rss_reader',
    label: 'RSS / News Reader',
    description: 'Read and parse any RSS or Atom news feed. Great for monitoring news sources.',
    icon: 'Rss',
    category: 'web',
    status: 'available',
  },
  {
    name: 'url_monitor',
    label: 'URL Change Monitor',
    description: 'Monitor a URL and detect when its content changes. Useful for price tracking.',
    icon: 'Bell',
    category: 'web',
    status: 'coming_soon',
  },

  // ─── Actions ──────────────────────────────────────────────────────────────
  {
    name: 'http_request',
    label: 'HTTP Request',
    description: 'Make HTTP calls to any external REST API (GET, POST, PUT, DELETE).',
    icon: 'Webhook',
    category: 'actions',
    status: 'available',
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
  },
  {
    name: 'slack_message',
    label: 'Slack Message',
    description: 'Post messages to a Slack channel via a bot or incoming webhook.',
    icon: 'MessageSquare',
    category: 'communication',
    status: 'coming_soon',
    envVars: ['SLACK_BOT_TOKEN'],
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
    status: 'coming_soon',
    envVars: ['DISCORD_WEBHOOK_URL'],
  },

  // ─── AI Processing ────────────────────────────────────────────────────────
  {
    name: 'ai_image_generate',
    label: 'Generate Image',
    description: 'Generate images from text descriptions using Google Imagen 3. Supports 512x512, 768x768, and 1024x1024 resolutions.',
    icon: 'Image',
    category: 'ai_processing',
    status: 'available',
    defaultEnabled: true,
  },
  {
    name: 'ai_extract',
    label: 'Extract Data (AI)',
    description: 'Extract structured data fields from unstructured text using AI.',
    icon: 'Sparkles',
    category: 'ai_processing',
    status: 'available',
  },
  {
    name: 'ai_summarize',
    label: 'Summarize (AI)',
    description: 'Condense long text into a concise summary. Supports bullet points or paragraph style.',
    icon: 'AlignLeft',
    category: 'ai_processing',
    status: 'available',
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

/**
 * Get tools grouped by category (for UI display).
 */
export function getToolsByCategory(): Record<ToolCategory, ToolDefinition[]> {
  const grouped = {} as Record<ToolCategory, ToolDefinition[]>
  for (const cat of CATEGORY_ORDER) grouped[cat] = []
  for (const def of TOOL_CATALOG) grouped[def.category].push(def)
  return grouped
}
