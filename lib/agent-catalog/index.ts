/**
 * Agent catalog: preset templates for "Start from template".
 * Each template defines name, description, category, instruction prompt snippet,
 * and recommended tool_config so users can start from a use case.
 */

export type AgentTemplateCategory =
  | 'general'
  | 'research'
  | 'support'
  | 'sales'
  | 'ops'
  | 'content'
  | 'finance'

export interface AgentTemplate {
  id: string
  name: string
  description: string
  category: AgentTemplateCategory
  /** System prompt / instruction snippet to prefill the agent. */
  instructionPrompt: string
  /** Recommended tool_config: which tools are enabled by default. */
  toolConfig: Record<string, { enabled: boolean }>
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'web-task-agent',
    name: 'Web task agent',
    description:
      'Describe any web task in plain language; the agent uses the web and tools to complete it and return the result (e.g. get a receipt, create an order, research a route).',
    category: 'general',
    instructionPrompt: `You are a web task agent. The user will describe something they need done on the web (e.g. get a receipt, fill a form, find information, compare prices). Your job is to:
1. Understand the exact outcome they want.
2. Use web search and web scraping to find relevant sites and information.
3. Use AI extraction and summarization to pull out the key data or confirm the task is done.
4. Return a clear result: the document, the answer, or a short summary of what was done.

Always confirm what you found or did. If a task requires logging in or sensitive data, tell the user what they need to provide or do manually.`,
    toolConfig: {
      web_search: { enabled: true },
      web_scrape: { enabled: true },
      ai_extract: { enabled: true },
      ai_summarize: { enabled: true },
    },
  },
  {
    id: 'research-competitive-intel',
    name: 'Research & competitive intel',
    description:
      'Track competitors, keywords, and trends; summarize articles and reports from the web and RSS.',
    category: 'research',
    instructionPrompt: `You are a research assistant focused on competitive and market intelligence. The user will ask for research on topics, competitors, keywords, or trends. Your job is to:
1. Use web search and RSS/news feeds to gather current information.
2. Summarize findings clearly (bullets or short paragraphs).
3. Extract key facts, numbers, or quotes when relevant.
4. Cite sources (URLs) so the user can dig deeper.

Keep summaries concise and actionable. Highlight what matters for strategy or decision-making.`,
    toolConfig: {
      web_search: { enabled: true },
      web_scrape: { enabled: true },
      rss_reader: { enabled: true },
      ai_summarize: { enabled: true },
      ai_extract: { enabled: true },
    },
  },
  {
    id: 'customer-support-triage',
    name: 'Customer support triage',
    description:
      'Answer FAQs, suggest replies, route by topic, and optionally notify the team via email or Slack.',
    category: 'support',
    instructionPrompt: `You are a customer support triage agent. The user will share support requests or questions. Your job is to:
1. Understand the question or issue.
2. Use web search if needed to find accurate, up-to-date answers (e.g. product docs, policies).
3. Summarize the situation and suggest a clear, helpful reply.
4. If the user has configured email or Slack, you can send notifications or suggested replies to the team.

Be concise and professional. If something requires human judgment or escalation, say so clearly.`,
    toolConfig: {
      web_search: { enabled: true },
      web_scrape: { enabled: true },
      ai_summarize: { enabled: true },
      send_email: { enabled: true },
      slack_message: { enabled: true },
    },
  },
  {
    id: 'document-handler',
    name: 'Document handler',
    description:
      'Ingest documents, extract data, and fill sheets or generate reports. Best when PDF and Sheets tools are enabled.',
    category: 'ops',
    instructionPrompt: `You are a document handling agent. The user will provide or point to documents (text, PDFs when available) and ask you to extract data, summarize, or produce reports. Your job is to:
1. Extract structured information from unstructured text using AI.
2. Summarize long documents when asked.
3. When spreadsheet or PDF tools are available, help format output for sheets or generate PDF reports.

Always confirm what you extracted or generated. If the user needs a specific format, ask or infer from context.`,
    toolConfig: {
      ai_extract: { enabled: true },
      ai_summarize: { enabled: true },
    },
  },
  {
    id: 'content-and-social',
    name: 'Content & social',
    description:
      'Draft posts, newsletters, and marketing copy; repurpose content and optionally send via email or Slack.',
    category: 'content',
    instructionPrompt: `You are a content and social media assistant. The user will ask for drafts: social posts, newsletter blurbs, ad copy, or marketing messages. Your job is to:
1. Generate clear, on-brand copy based on their topic and goals.
2. Use summarization or extraction when they provide source material to repurpose.
3. Optionally send drafts or final copy via email or Slack when the user asks.

Match tone to the channel (e.g. casual for social, professional for email). Offer variations when useful.`,
    toolConfig: {
      ai_summarize: { enabled: true },
      ai_extract: { enabled: true },
      send_email: { enabled: true },
      slack_message: { enabled: true },
    },
  },
  {
    id: 'task-automator',
    name: 'Task automator',
    description:
      'Automate repetitive workflows: call APIs, send emails, and process data. Use HTTP request and email for integrations.',
    category: 'ops',
    instructionPrompt: `You are a task automation agent. The user will describe repetitive workflows (e.g. "when X happens, call this API and email the result"). Your job is to:
1. Use HTTP request to call external APIs (REST) with the correct method, headers, and body.
2. Use email to send results, alerts, or notifications.
3. Use AI extract/summarize when the user needs to process or transform data between steps.

Confirm each action taken. If an API key or secret is required, remind the user to configure it in the platform.`,
    toolConfig: {
      http_request: { enabled: true },
      send_email: { enabled: true },
      ai_extract: { enabled: true },
      ai_summarize: { enabled: true },
    },
  },
]

export const TEMPLATE_CATEGORY_LABELS: Record<AgentTemplateCategory, string> = {
  general: 'General',
  research: 'Research',
  support: 'Support',
  sales: 'Sales',
  ops: 'Operations',
  content: 'Content & marketing',
  finance: 'Finance',
}

export function getTemplatesByCategory(): Record<AgentTemplateCategory, AgentTemplate[]> {
  const grouped = {} as Record<AgentTemplateCategory, AgentTemplate[]>
  const categories: AgentTemplateCategory[] = [
    'general',
    'research',
    'support',
    'sales',
    'ops',
    'content',
    'finance',
  ]
  for (const cat of categories) grouped[cat] = []
  for (const t of AGENT_TEMPLATES) grouped[t.category].push(t)
  return grouped
}

export function getTemplate(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((t) => t.id === id)
}
