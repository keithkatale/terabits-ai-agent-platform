/**
 * Tool labels for display in the UI.
 * This file is separate from catalog.ts to avoid importing server-side code on the client.
 */
export const TOOL_LABELS: Record<string, string> = {
  web_search: 'Web Search',
  web_scrape: 'Web Scraper',
  rss_reader: 'RSS / News Reader',
  http_request: 'HTTP Request',
  send_email: 'Send Email',
  gmail_send: 'Send via Gmail',
  ai_extract: 'Extract Data (AI)',
  ai_summarize: 'Summarize (AI)',
  ai_image_generate: 'Generate Image',
  slack_message: 'Slack Message',
  discord_message: 'Discord Message',
  browser_automation: 'Browser automation',
  list_workflows: 'List your workflows',
  offer_save_workflow: 'Offer to save workflow',
  offer_save_browser_session: 'Offer to save login',
}
