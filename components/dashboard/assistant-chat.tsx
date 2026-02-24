'use client'

import { useState, useRef, useEffect, Component, type ErrorInfo, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Tool } from '@/components/ai-elements/tool'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import {
  Sparkles,
  Brain,
  Wrench,
  Loader2,
  CheckCircle2,
  XCircle,
  Coins,
  Share2,
  BookmarkPlus,
  TrendingUp,
  BarChart2,
  Wallet,
  Settings,
  Mail,
  Send,
  Globe,
  Handshake,
  Users,
  MessageCircle,
  Star,
  MessageSquare,
  Link2,
  Calendar,
  Mic,
  Search,
  Eye,
  FileText,
  Target,
  Receipt,
  FolderOpen,
  CreditCard,
  RefreshCw,
  DollarSign,
  Gift,
  Package,
  Briefcase,
  ShoppingCart,
  Shield,
  Bell,
  Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOOL_LABELS } from '@/lib/tools/labels'

const ASSISTANT_SUGGESTIONS = [
  'Search the web for the latest news on AI agents',
  'Send an email to remind me about the meeting',
  'Summarise this article: [paste URL]',
  'Find 5 competitors for project management software',
]

/** Icon: image path (e.g. /icons/gmail.png) or Lucide component. */
type PresetIcon = string | LucideIcon
/** One preset item: click fills the input; user can edit and submit. Icons represent platforms/use case. */
type PresetItem = { title: string; description: string; prompt: string; icons: PresetIcon[] }
/** Tab of presets shown when chat is empty. */
type PresetTab = { id: string; label: string; icon: LucideIcon; items: PresetItem[] }

const PRESET_TABS: PresetTab[] = [
  {
    id: 'business-growth',
    label: 'Growth',
    icon: TrendingUp,
    items: [
      { title: 'Cold Outreach Campaign Execution', description: 'From a target customer profile, the agent finds prospects on LinkedIn, Google, and directories, gathers contact info, personalizes from each website, and sends emails or LinkedIn messages on your behalf — end-to-end lead gen campaigns.', prompt: 'I want a cold outreach campaign workflow: given a target customer profile, search LinkedIn, Google, and industry directories to build a prospect list, find contact info, visit each prospect\'s website to personalize, and send emails or LinkedIn messages on my behalf. Run the full lead gen campaign for me.', icons: ['/icons/gmail.png', '/icons/linkedIn.png', '/icons/business.png'] },
      { title: 'Partnership & Collaboration Prospecting', description: 'You describe the kind of partner you want — complementary services, referral partners, co-marketing — and the agent browses directories, social, and communities to return a vetted list with contact details and fit notes.', prompt: 'I need partnership and collaboration prospecting: given a brief on the kind of partner I want (complementary services, referral partners, co-marketing), browse directories, social media, and industry communities to surface a vetted list with contact details and notes on why each is a fit.', icons: ['/icons/slack.png', '/icons/forms.png', '/icons/linkedIn.png'] },
      { title: 'Content Distribution', description: 'After you create a post, video, or update, the agent finds relevant threads in Reddit, Facebook Groups, LinkedIn, and forums and posts or comments with your content in a valuable, non-spammy way.', prompt: 'Set up content distribution: when I create a blog post, video, or product update, log into relevant communities (Reddit, Facebook Groups, LinkedIn, niche forums), find threads where the content is genuinely relevant, and post or comment with it in a way that adds value rather than spam.', icons: ['/icons/instagram.png', '/icons/x.png', '/icons/linkedIn.png'] },
      { title: 'Testimonial & Review Solicitation', description: 'The agent picks recent customers from your CRM or orders, sends personalized follow-ups asking for a Google review or testimonial with the direct link, and tracks who responded — so you do this consistently.', prompt: 'I want testimonial and review solicitation: identify recent customers from my CRM or order list, send personalized follow-up messages asking for a Google review or testimonial with the direct link, and track who responded so we do this consistently.', icons: ['/icons/whatsapp.png', '/icons/slack.png', '/icons/forms.png'] },
      { title: 'Affiliate & Referral Partner Recruitment', description: 'The agent finds bloggers, newsletter writers, and creators in your niche, checks their audience fit and engagement, and sends personalized outreach for affiliate or referral deals — turning BD into a repeatable process.', prompt: 'Help with affiliate and referral partner recruitment: search for bloggers, newsletter writers, and content creators in my niche, visit their sites to assess audience fit and engagement, and send personalized outreach proposing an affiliate or referral arrangement.', icons: ['/icons/affiliate.png', '/icons/gmail.png', Globe] },
      { title: 'Event & Speaking Opportunity Discovery', description: 'The agent scans conference sites, event listings, and podcast booking pages for places you could speak or be featured, and compiles a list with deadlines, audience sizes, and submission requirements.', prompt: 'I need event and speaking opportunity discovery: monitor conference websites, industry event listings, and podcast booking pages for opportunities where I could speak, present, or be featured. Compile a list with application deadlines, audience sizes, and submission requirements.', icons: ['/icons/google-calendar.png', '/icons/sheets.png', Globe] },
    ],
  },
  {
    id: 'insights-intelligence',
    label: 'Insights',
    icon: BarChart2,
    items: [
      { title: 'Brand Mention Monitoring', description: 'Regularly searches Google, Reddit, X, and forums for mentions of your business, your name, and products; categorizes positive/negative/neutral and delivers a weekly digest so you know what’s being said.', prompt: 'Set up brand mention monitoring: regularly search Google, Reddit, X, and niche forums for mentions of my business name, my name, and key products. Categorize each as positive, negative, or neutral and deliver a weekly digest.', icons: ['/icons/reddit.png', '/icons/x.png', '/icons/google.png'] },
      { title: 'Customer Sentiment Analysis from Reviews', description: 'Pulls recent reviews from Google, Trustpilot, App Store, etc., extracts recurring themes in praise and complaints, and produces a structured summary — product feedback analysis without a researcher.', prompt: 'I want customer sentiment analysis from reviews: visit Google Reviews, Trustpilot, App Store, or other review platforms where I’m listed, read recent reviews, extract recurring themes in praise and complaints, and produce a structured summary.', icons: ['/icons/trustpilot.png', '/icons/appstore.png', BarChart2] },
      { title: 'Industry Trend Briefing', description: 'Each week the agent visits key publications, Reddit, and YouTube in your industry, identifies the most discussed topics, and delivers a plain-English summary of emerging trends so you stay ahead without reading everything.', prompt: 'Set up an industry trend briefing: each week visit key publications, Reddit communities, and YouTube channels in my industry, identify what’s generating the most discussion and engagement, and deliver a plain-English summary of emerging trends.', icons: [TrendingUp, Newspaper, BarChart2] },
      { title: 'Competitor Intelligence Report', description: 'Visits a defined list of competitor sites, checks pricing, product pages, job postings, and recent content; compiles a monthly competitive landscape update so you see the market shifting in real time.', prompt: 'I need a competitor intelligence report: visit a defined list of competitor websites, check for changes to pricing, product pages, job postings (signaling direction), and recent blog or announcements. Compile a monthly competitive landscape update.', icons: [Eye, FileText, Globe] },
      { title: 'Audience Research from Communities', description: 'Browses forums, subreddits, Facebook Groups, and Quora where your audience hangs out, collects their questions, frustrations, and language, and turns that into a research brief — like surveys or interviews without the cost.', prompt: 'Help with audience research from communities: browse forums, subreddits, Facebook Groups, and Quora where my target customer hangs out, collect the questions they ask, frustrations they express, and language they use, and turn that into a research brief.', icons: ['/icons/quara.png', '/icons/reddit.png', '/icons/stackoverflow.png'] },
      { title: 'Performance Benchmarking', description: 'Searches for public benchmarks in your industry — email open rates, CAC, conversion rates — and builds a benchmarking document so you can compare your numbers to the norm and spot underperformance.', prompt: 'I want performance benchmarking: search for publicly available benchmarks in my industry (e.g. email open rates, CAC, conversion rates), visit industry reports and research, and put together a benchmarking document so I can compare my numbers to what’s normal.', icons: ['/icons/sheets.png', BarChart2, Target] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Wallet,
    items: [
      { title: 'Invoice Chasing', description: 'Monitors outstanding invoices, flags past-due ones, sends polite follow-ups (or uses the client portal), logs outreach, and escalates tone if a second or third nudge is needed — without you making awkward calls.', prompt: 'Set up invoice chasing: monitor outstanding invoices, identify ones past due, send politely worded follow-up emails or use the client payment portal, log outreach, and escalate tone if a second or third nudge is needed.', icons: [FileText, Mail, Send] },
      { title: 'Expense Categorization & Receipt Logging', description: 'Watches your inbox for receipts, extracts vendor, amount, and date, and logs them into a sheet or accounting tool under the right category — clean records all month instead of a year-end scramble.', prompt: 'I need expense categorization and receipt logging: monitor my email for receipts, extract vendor name, amount, and date from each, and log them into a Google Sheet or accounting tool under the correct expense category.', icons: [Receipt, FolderOpen, Mail] },
      { title: 'Bank & Subscription Audit', description: 'Reviews connected bank or statements, identifies recurring charges, checks unfamiliar subscriptions, and presents a cancel-or-keep list with potential monthly savings.', prompt: 'Help with a bank and subscription audit: review my connected bank dashboard or statement, identify recurring charges, visit websites of unfamiliar or potentially forgotten subscriptions to verify what they are, flag redundant or unused ones, and present a cancel-or-keep recommendation with potential savings.', icons: [CreditCard, RefreshCw, DollarSign] },
      { title: 'Competitor Pricing Intelligence', description: 'On a schedule, visits competitor sites and product pages, records current pricing and any promotions or changes, and delivers a comparison report so you can make informed pricing decisions.', prompt: 'I want competitor pricing intelligence: on a schedule visit competitor websites and product pages, record current pricing, note any promotions or changes since last visit, and deliver a comparison report for pricing decisions.', icons: [DollarSign, Eye, FileText] },
      { title: 'Grant & Funding Opportunity Search', description: 'Browses grant portals, startup databases, and local business support sites, finds opportunities you’re eligible for, and summarizes requirements and deadlines, organized by effort-to-reward.', prompt: 'Set up grant and funding opportunity search: browse government grant portals, startup funding databases, and local business support websites, find opportunities my business is eligible for, summarize requirements and deadlines, and organize by effort-to-reward ratio.', icons: [Gift, Search, FileText] },
      { title: 'Financial News Briefing', description: 'Each morning visits relevant financial news, searches for items affecting your industry — rates, supply chain, regulation — and delivers a concise briefing so you stay financially aware without broad reading.', prompt: 'I need a financial news briefing: every morning visit relevant financial news sites, search for anything affecting my industry (interest rates, supply chain, regulatory updates), and deliver a concise briefing.', icons: [Newspaper, TrendingUp, DollarSign] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Settings,
    items: [
      { title: 'Supplier & Vendor Research', description: 'You give a product or service need; the agent searches Google and directories, compares pricing and MOQs, reads reviews, and returns a structured shortlist with pros and cons — like a junior ops person in half a day.', prompt: 'Help with supplier and vendor research: given a product category or service need, search Google and supplier directories, visit vendor websites, compare pricing and minimum order quantities, read reviews, and return a structured shortlist with pros and cons.', icons: [Package, Search, Globe] },
      { title: 'Job Posting Distribution', description: 'When you have a role to fill, the agent posts to LinkedIn, Indeed, and niche boards using your description, and can monitor and organize applications by date and fit.', prompt: 'I want job posting distribution: when a role needs to be filled, log into LinkedIn, Indeed, and niche job boards, fill out posting forms with the description I provide, submit them, and optionally monitor and organize applications by date and fit.', icons: [Briefcase, Share2, Users] },
      { title: 'Tool & Software Procurement', description: 'Browses G2/Capterra, visits shortlisted product and pricing pages, checks integrations with your stack, and compiles a recommendation report — saving hours of tab-switching.', prompt: 'Set up tool and software procurement research: browse SaaS comparison sites (e.g. G2, Capterra), visit shortlisted product pages, read pricing, check integrations with my existing tools, and compile a recommendation report.', icons: ['/icons/captera.png', '/icons/g2.png', Wrench] },
      { title: 'Meeting Scheduling & Coordination', description: 'Given a list of people and a time window, the agent uses Calendly links or email to request meetings, tracks responses, and confirms or reschedules — handles the back-and-forth for you.', prompt: 'I need meeting scheduling and coordination: given a list of people to meet and a preferred window, visit their Calendly links or send scheduling emails, track responses, and confirm or reschedule as needed.', icons: ['/icons/google-calendar.png', Users, Mail] },
      { title: 'Contract & Document Filing', description: 'When a contract or document arrives by email, the agent extracts key info (parties, dates, payment terms), renames by your convention, and files it in the right Drive folder.', prompt: 'Help with contract and document filing: when a new contract or document arrives via email, open it, extract key information (parties, dates, payment terms), rename the file per my naming convention, and file it in the right Google Drive folder.', icons: ['/icons/google-docs.png', '/icons/gmail.png', FileText] },
      { title: 'Compliance & License Renewal Monitoring', description: 'Given a list of licenses, domains, or certifications with expiry dates, the agent checks renewal requirements periodically and alerts you with instructions and deadlines before anything lapses.', prompt: 'Set up compliance and license renewal monitoring: given a list of business licenses, domain renewals, or certifications with expiry dates, periodically check the relevant government or registrar sites for renewal requirements and alert me with instructions and deadlines before anything lapses.', icons: [Shield, Bell, FileText] },
    ],
  },
]

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: AssistantStep[]
  runId?: string
}

interface AssistantStep {
  id: string
  type: 'reasoning' | 'thinking' | 'tool' | 'result' | 'error' | 'credits'
  message: string
  timestamp: Date
  toolData?: {
    name: string
    state: 'pending' | 'running' | 'completed' | 'error'
    input?: Record<string, unknown>
    output?: Record<string, unknown>
  }
}

export interface WorkflowOffer {
  suggestedName: string
  description: string
  instructionPrompt: string
  inputFields: Array<{ name: string; label: string; type: string; placeholder?: string; required?: boolean }>
}

/** Catches render errors so the UI shows a message instead of blank/black. */
class ChatErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ChatErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm font-medium text-foreground">Something went wrong in the chat.</p>
          <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            Dismiss
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

const WORKING_STEP_TYPES: AssistantStep['type'][] = ['reasoning', 'thinking', 'tool', 'credits']

/** Ensure tool input/output are plain objects or undefined so Tool/render never throw on bad API data */
function normalizeToolPayload(payload: unknown): Record<string, unknown> | undefined {
  if (payload == null) return undefined
  if (typeof payload === 'object' && !Array.isArray(payload) && payload !== null) return payload as Record<string, unknown>
  if (typeof payload === 'string') return { result: payload }
  try {
    return { value: payload }
  } catch {
    return undefined
  }
}

function hasToolSteps(steps: AssistantStep[] = []): boolean {
  return steps.some((s) => s.type === 'tool')
}

function getWorkingSteps(steps: AssistantStep[] = []): AssistantStep[] {
  return steps.filter((s) => WORKING_STEP_TYPES.includes(s.type))
}

function getReasoningText(steps: AssistantStep[] = []): string {
  return steps
    .filter((s) => s.type === 'reasoning' || s.type === 'thinking')
    .map((s) => s.message)
    .filter(Boolean)
    .join('\n\n')
}

/** When we have reasoning in steps, strip that prefix from content so the final reply shows only the answer (reasoning stays in chain of thought). */
function getAnswerOnly(content: string, reasoningText: string): string {
  const r = reasoningText.trim()
  const c = content.trim()
  if (!r || !c) return c
  if (c === r) return ''
  if (c.startsWith(r)) return c.slice(r.length).trim()
  return c
}

function stepLabel(step: AssistantStep): string {
  if (step.type === 'reasoning') return 'Reasoning'
  if (step.type === 'thinking') return 'Thinking'
  if (step.type === 'tool' && step.toolData?.name)
    return TOOL_LABELS[step.toolData.name] ?? step.toolData.name
  if (step.type === 'credits') return 'Credits used'
  return step.message?.slice(0, 48) ?? step.type
}

function stepStatus(
  step: AssistantStep,
  isLast: boolean,
  isStreaming?: boolean
): 'complete' | 'active' | 'pending' {
  if (step.type === 'tool' && step.toolData) {
    const s = step.toolData.state
    if (s === 'running') return 'active'
    if (s === 'pending') return 'pending'
    return 'complete'
  }
  if (step.type === 'reasoning' || step.type === 'thinking')
    return isLast && isStreaming ? 'active' : 'complete'
  return 'complete'
}

/** Max height for chain-of-thought / reasoning scroll area so the chat doesn't grow endlessly */
const THOUGHT_WINDOW_MAX_H = 'min(20rem, 50vh)'

/**
 * Default: Reasoning (shimmer when streaming, dropdown with streamed text).
 * Chain of Thought only when there are actual tool steps (multi-step actions).
 */
function AssistantMessageContent({
  steps,
  content,
  isStreaming,
  defaultOpenChain,
}: {
  steps: AssistantStep[]
  content: string
  isStreaming: boolean
  defaultOpenChain: boolean
}) {
  const chainThoughtScrollRef = useRef<HTMLDivElement>(null)
  const reasoningScrollRef = useRef<HTMLDivElement>(null)
  const workingSteps = getWorkingSteps(steps)
  const nonWorkingSteps = steps.filter((s) => !WORKING_STEP_TYPES.includes(s.type))
  const showChainOfThought = hasToolSteps(steps)
  const reasoningText = getReasoningText(steps)
  const creditsStep = steps.find((s) => s.type === 'credits')
  const showReasoningBlock = !showChainOfThought && (isStreaming || reasoningText.length > 0)
  // When chain of thought is shown, keep reasoning only in the dropdown; final reply = answer only (no duplicate narrative)
  const displayContent = showChainOfThought && reasoningText.length > 0 ? getAnswerOnly(content, reasoningText) : content

  // Auto-scroll chain-of-thought window to bottom when steps or streaming content updates
  useEffect(() => {
    const el = chainThoughtScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [workingSteps.length, workingSteps[workingSteps.length - 1]?.message])

  // Auto-scroll standalone reasoning block when thinking content updates
  useEffect(() => {
    const el = reasoningScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [reasoningText])

  return (
    <>
      {/* Chain of Thought: only when agent is performing tool actions (long series of steps) */}
      {showChainOfThought && workingSteps.length > 0 && (
        <ChainOfThought defaultOpen={defaultOpenChain} className="w-full">
          <ChainOfThoughtHeader>Chain of Thought</ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            <div
              ref={chainThoughtScrollRef}
              className="space-y-3 overflow-y-auto overscroll-contain pr-1"
              style={{ maxHeight: THOUGHT_WINDOW_MAX_H }}
            >
              {workingSteps.map((step, i) => {
                const isLast = i === workingSteps.length - 1
                const status = stepStatus(step, isLast, isStreaming)
                const label = stepLabel(step)
                const icon = step.type === 'tool' ? Wrench : step.type === 'credits' ? Coins : Brain
                return (
                  <ChainOfThoughtStep
                    key={step.id}
                    icon={icon}
                    label={label}
                    status={status}
                  >
                    {step.type === 'reasoning' && (
                      <Reasoning className="w-full" isStreaming={isStreaming && isLast} defaultOpen={isStreaming && isLast}>
                        <ReasoningTrigger />
                        <ReasoningContent>{step.message}</ReasoningContent>
                      </Reasoning>
                    )}
                    {step.type === 'thinking' && (
                      <Reasoning className="w-full" isStreaming={isStreaming && isLast && !step.message} defaultOpen={isStreaming && isLast || !!step.message}>
                        <ReasoningTrigger />
                        <ReasoningContent>{step.message}</ReasoningContent>
                      </Reasoning>
                    )}
                    {step.type === 'tool' && step.toolData && (
                      <Tool
                        name={step.toolData.name}
                        state={step.toolData.state}
                        input={step.toolData.input}
                        output={step.toolData.output}
                        defaultOpen={step.toolData.state === 'completed' || step.toolData.state === 'error'}
                      />
                    )}
                    {step.type === 'credits' && (
                      <p className="text-xs text-muted-foreground">{step.message}</p>
                    )}
                  </ChainOfThoughtStep>
                )
              })}
            </div>
          </ChainOfThoughtContent>
        </ChainOfThought>
      )}

      {/* Loading state: agent is in action (chain of thought visible) but no final response yet */}
      {showChainOfThought && isStreaming && !content && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shimmer duration={1}>Working</Shimmer>
        </div>
      )}

      {/* Default: Reasoning per doc — auto-opens when streaming; scrollable window with max height */}
      {showReasoningBlock && (
        <Reasoning
          className="w-full"
          isStreaming={isStreaming && !content && reasoningText.length === 0}
          defaultOpen={isStreaming || reasoningText.length > 0}
        >
          <ReasoningTrigger />
          <div
            ref={reasoningScrollRef}
            className="overflow-y-auto overscroll-contain pr-1"
            style={{ maxHeight: THOUGHT_WINDOW_MAX_H }}
          >
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </div>
        </Reasoning>
      )}

      {/* Credits line when not inside Chain of Thought */}
      {!showChainOfThought && creditsStep && (
        <p className="text-xs text-muted-foreground">{creditsStep.message}</p>
      )}

      {nonWorkingSteps.map((step) => (
        <div key={step.id}>
          {step.type === 'error' && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive leading-relaxed">{step.message}</p>
            </div>
          )}
          {step.type === 'result' && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{step.message}</span>
            </div>
          )}
        </div>
      ))}
      {displayContent && <MessageResponse>{displayContent}</MessageResponse>}
    </>
  )
}

export function AssistantChat({ guest = false }: { guest?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [steps, setSteps] = useState<AssistantStep[]>([])
  const [currentAssistantText, setCurrentAssistantText] = useState('')
  const [finalOutput, setFinalOutput] = useState<unknown>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null)
  const [workflowOffer, setWorkflowOffer] = useState<WorkflowOffer | null>(null)
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [activePresetTab, setActivePresetTab] = useState(0)
  const [signInModalOpen, setSignInModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const initialQuerySent = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const stepsRef = useRef<AssistantStep[]>([])
  const finalTextRef = useRef('')
  const sessionIdRef = useRef<string | null>(null)
  const currentRunIdRef = useRef<string | null>(null)
  const [recentSessions, setRecentSessions] = useState<{ sessionId: string; preview: string; updatedAt: string }[]>([])
  const conversationScrollRef = useRef<HTMLDivElement>(null)

  // Load recent conversations list (for opening as chat) — skip when guest
  useEffect(() => {
    if (guest) return
    fetch('/api/chat/sessions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.sessions?.length) setRecentSessions(d.sessions)
      })
      .catch(() => {})
  }, [guest, messages.length])

  // Load persisted conversation when session is in URL — skip when guest
  useEffect(() => {
    if (guest) return
    const sid = searchParams.get('session')?.trim()
    if (!sid || isStreaming || messages.length > 0) return
    sessionIdRef.current = sid
    fetch(`/api/chat/session?sessionId=${encodeURIComponent(sid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.messages?.length) return
        setMessages(
          d.messages.map((m: { id: string; role: string; content: string; steps?: AssistantStep[] }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            steps: Array.isArray(m.steps)
              ? m.steps.map((s) => ({
                  id: s.id,
                  type: s.type as AssistantStep['type'],
                  message: s.message,
                  timestamp: s.timestamp instanceof Date ? s.timestamp : new Date(),
                  toolData: s.toolData,
                }))
              : [],
          }))
        )
      })
      .catch(() => {})
  }, [guest, searchParams, isStreaming, messages.length])

  // Scroll to end when a new message is added
  const prevMessagesLen = useRef(messages.length)
  useEffect(() => {
    if (messages.length > prevMessagesLen.current) {
      prevMessagesLen.current = messages.length
      requestAnimationFrame(() => {
        const el = conversationScrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
    prevMessagesLen.current = messages.length
  }, [messages.length])

  // Auto-scroll when a new chain-of-thought step appears during streaming (keep latest step in view)
  const prevStepsLen = useRef(steps.length)
  useEffect(() => {
    if (isStreaming && steps.length > prevStepsLen.current) {
      prevStepsLen.current = steps.length
      requestAnimationFrame(() => {
        const el = conversationScrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
    prevStepsLen.current = steps.length
  }, [isStreaming, steps.length])

  // Abort in-flight request when component unmounts so we don't setState after unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Initial query from hero ?q=
  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    if (q && messages.length === 0 && !isStreaming && !initialQuerySent.current) {
      initialQuerySent.current = true
      setInputValue(q)
      const u = new URL(window.location.href)
      u.searchParams.delete('q')
      window.history.replaceState({}, '', u.pathname + u.search)
      setTimeout(() => handleSubmit(q), 0)
    }
  }, [searchParams, messages.length, isStreaming])

  useEffect(() => {
    if (guest) return
    fetch('/api/user/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCreditBalance(d.balance?.balance ?? 0)
      })
      .catch(() => {})
  }, [guest])

  const handleSubmit = async (textOverride?: string) => {
    const text = (textOverride ?? inputValue).trim()
    if (!text || isStreaming) return

    setInputValue('')
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }])
    setSteps([])
    setCurrentAssistantText('')
    setFinalOutput(null)
    setCreditsUsed(null)
    setWorkflowOffer(null)
    setIsStreaming(true)
    stepsRef.current = []
    finalTextRef.current = ''

    const body = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ]

    const controller = new AbortController()
    abortControllerRef.current = controller
    const signal = controller.signal

    try {
      const response = await fetch('/api/chat/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: body, sessionId: sessionIdRef.current ?? undefined }),
        signal,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Request failed: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.debug('[chat/run] Stream started')
      }

      let buffer = ''
      let reasoningId = `reasoning-${Date.now()}`
      let assistantStepId = `assistant-${Date.now()}`

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && data.type) {
              console.debug('[chat/run] SSE', data.type, data.tool ? `tool=${data.tool}` : '', data.status ?? '')
            }

            if (data.type === 'start') {
              if (data.sessionId) sessionIdRef.current = data.sessionId
              if (!guest && data.sessionId) {
                const u = new URL(window.location.href)
                u.searchParams.set('session', data.sessionId)
                window.history.replaceState({}, '', u.pathname + u.search)
              }
              if (data.runId) currentRunIdRef.current = data.runId
            } else if (data.type === 'reasoning') {
              setSteps((prev) => {
                const current = prev.find((s) => s.id === reasoningId)
                const newMsg = (current?.message || '') + (data.delta || '')
                const next = [
                  ...prev.filter((s) => s.id !== reasoningId),
                  { id: reasoningId, type: 'reasoning' as const, message: newMsg, timestamp: new Date() },
                ]
                stepsRef.current = next
                return next
              })
            } else if (data.type === 'assistant') {
              const delta = data.delta || ''
              setCurrentAssistantText((t) => t + delta)
              finalTextRef.current += delta
              setSteps((prev) => {
                const current = prev.find((s) => s.id === assistantStepId)
                const newMsg = (current?.message || '') + delta
                const next = [
                  ...prev.filter((s) => s.id !== assistantStepId),
                  { id: assistantStepId, type: 'thinking' as const, message: newMsg, timestamp: new Date() },
                ]
                stepsRef.current = next
                return next
              })
            } else if (data.type === 'tool') {
              if (data.tool === 'offer_save_workflow' && data.status === 'completed' && data.output?.__workflowOffer) {
                const o = data.output as {
                  suggestedName?: string
                  description?: string
                  instructionPrompt?: string
                  inputFields?: WorkflowOffer['inputFields']
                }
                if (o.suggestedName && o.instructionPrompt) {
                  setWorkflowOffer({
                    suggestedName: o.suggestedName,
                    description: o.description ?? o.suggestedName,
                    instructionPrompt: o.instructionPrompt,
                    inputFields: Array.isArray(o.inputFields) ? o.inputFields : [],
                  })
                }
              }
              const toolLabel = String(TOOL_LABELS[data.tool] ?? data.tool ?? 'Tool')
              const state = data.status === 'completed' ? 'completed' : data.status === 'error' ? 'error' : 'running'
              const safeInput = normalizeToolPayload(data.input)
              const safeOutput = state === 'running' ? undefined : normalizeToolPayload(data.output)
              setSteps((prev) => {
                let next: AssistantStep[]
                if (state === 'running') {
                  const newStep: AssistantStep = {
                    id: `tool-${data.tool}-${Date.now()}`,
                    type: 'tool',
                    message: toolLabel,
                    timestamp: new Date(),
                    toolData: { name: toolLabel, state: 'running', input: safeInput, output: undefined },
                  }
                  next = [...prev, newStep]
                } else {
                  const runningIndex = prev.map((s, i) => ({ s, i })).reverse().find(({ s }) => s.type === 'tool' && s.toolData?.name === toolLabel && s.toolData?.state === 'running')
                  if (runningIndex != null) {
                    const updated: AssistantStep = {
                      ...prev[runningIndex.i],
                      toolData: {
                        name: toolLabel,
                        state: state as 'completed' | 'error',
                        input: safeInput,
                        output: safeOutput,
                      },
                    }
                    next = [...prev.slice(0, runningIndex.i), updated, ...prev.slice(runningIndex.i + 1)]
                  } else {
                    const newStep: AssistantStep = {
                      id: `tool-${data.tool}-${Date.now()}`,
                      type: 'tool',
                      message: toolLabel,
                      timestamp: new Date(),
                      toolData: { name: toolLabel, state: state as 'completed' | 'error', input: safeInput, output: safeOutput },
                    }
                    next = [...prev, newStep]
                  }
                }
                stepsRef.current = next
                return next
              })
              if (data.status === 'completed') {
                setCurrentAssistantText('')
                assistantStepId = `assistant-${Date.now()}`
              }
            } else if (data.type === 'complete') {
              const out = data.result?.output ?? data.result
              setFinalOutput(data.result)
              const resultText = (out && typeof out === 'object' && 'result' in out && out.result) ? String(out.result) : ''
              if (resultText) finalTextRef.current = resultText
            } else if (data.type === 'error') {
              const errStep: AssistantStep = {
                id: `error-${Date.now()}`,
                type: 'error',
                message: data.error || 'An error occurred',
                timestamp: new Date(),
              }
              setSteps((prev) => {
                const next = [...prev, errStep]
                stepsRef.current = next
                return next
              })
            } else if (data.type === 'credits_used') {
              setCreditsUsed(data.creditsUsed ?? 0)
              setCreditBalance(data.balanceAfter ?? null)
              const credStep: AssistantStep = {
                id: `credits-${Date.now()}`,
                type: 'credits',
                message: `${data.creditsUsed ?? 0} credit(s) used · ${data.balanceAfter ?? 0} remaining`,
                timestamp: new Date(),
              }
              setSteps((prev) => {
                const next = [...prev, credStep]
                stepsRef.current = next
                return next
              })
            }
          } catch (parseErr) {
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
              console.error('[chat/run] SSE parse error:', parseErr, 'line:', line?.slice(0, 120))
            }
          }
        }
      }

      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.debug('[chat/run] Stream complete, steps:', stepsRef.current.length)
      }
      const finalText = finalTextRef.current || (typeof finalOutput === 'object' && finalOutput && finalOutput !== null && 'result' in finalOutput ? String((finalOutput as { result?: string }).result ?? '') : '')
      const stepsToSave = [...stepsRef.current]
      const runIdToAttach = currentRunIdRef.current
      currentRunIdRef.current = null
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: finalText,
          steps: stepsToSave,
          runId: runIdToAttach ?? undefined,
        },
      ])
      setSteps([])
      stepsRef.current = []
      setCurrentAssistantText('')
      setFinalOutput(null)
      finalTextRef.current = ''
    } catch (err) {
      console.error('[chat/run] Stream or request error:', err)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      setSteps((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: 'error',
          message: isAbort ? 'Stopped.' : (err instanceof Error ? err.message : 'Something went wrong'),
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  return (
    <ChatErrorBoundary>
      <div className="relative flex h-full min-h-0 flex-col">
        <Conversation className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ConversationContent ref={conversationScrollRef} className="flex-1 overflow-y-auto min-h-0 bg-background">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex min-h-full min-w-0 flex-col items-center justify-start px-4 pt-[13vh] py-8">
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                What can I do for you?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                I can search the web, send emails, look things up, and run workflows. Describe a task or pick one below.
              </p>
              {guest && (
                <p className="mt-2 text-sm text-muted-foreground">
                  You’re in trial mode. Conversations aren’t saved.{' '}
                  <button
                    type="button"
                    onClick={() => setSignInModalOpen(true)}
                    className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                  >
                    Sign in
                  </button>
                  {' '}to save conversations and unlock full capabilities.
                </p>
              )}
              <div className="mt-8 w-full max-w-2xl">
                <PromptInput
                  onSubmit={(message) => {
                    const text = (message.text ?? '').trim()
                    if (text && !isStreaming) handleSubmit(text)
                  }}
                  className="w-full rounded-xl border border-border bg-card shadow-lg backdrop-blur-sm transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20"
                >
                  <PromptInputBody>
                    <PromptInputTextarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Describe a task or responsibility…"
                      disabled={isStreaming}
                      className="min-h-0 border-0 px-4 pt-4 pb-3 text-sm placeholder:text-muted-foreground/60"
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <span className="text-[11px] text-muted-foreground/40">
                        {guest ? (
                          <>
                            Trial ·{' '}
                            <button type="button" onClick={() => setSignInModalOpen(true)} className="text-primary underline underline-offset-1 hover:no-underline">
                              Sign in to save
                            </button>
                          </>
                        ) : creditBalance != null && creditsUsed != null ? `${creditsUsed} used · ${creditBalance} left` : creditBalance != null ? `${creditBalance} credits` : 'Assistant'}
                      </span>
                    </PromptInputTools>
                    <PromptInputSubmit
                      status={isStreaming ? 'streaming' : 'ready'}
                      disabled={!inputValue.trim()}
                    />
                  </PromptInputFooter>
                </PromptInput>
              </div>
              <div className="mt-6 w-full max-w-4xl">
                <div className="flex justify-center">
                  <div className="inline-flex gap-6 border-b border-border/60">
                    {PRESET_TABS.map((tab, i) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePresetTab(i)}
                        className={cn(
                          'pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
                          activePresetTab === i
                            ? 'text-foreground border-primary'
                            : 'text-muted-foreground border-transparent hover:text-foreground'
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {PRESET_TABS[activePresetTab].items.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setInputValue(item.prompt)}
                      className="flex min-h-[7rem] flex-col items-start gap-3 rounded-lg border border-border/80 bg-card/60 px-4 py-4 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-card"
                    >
                      <span className="text-sm font-medium leading-snug text-foreground">{item.title}</span>
                      <div className="flex flex-wrap gap-0.5">
                        {item.icons.map((icon, idx) => {
                          const isImg = typeof icon === 'string'
                          return (
                            <span
                              key={idx}
                              className="inline-flex size-6 items-center justify-center overflow-hidden rounded-md bg-muted/90 text-muted-foreground"
                              title={item.title}
                            >
                              {isImg ? (
                                <Image src={icon} alt="" width={14} height={14} className="size-3.5 object-contain" />
                              ) : (
                                (() => { const Icon = icon; return <Icon className="size-3.5" /> })()
                              )}
                            </span>
                          )
                        })}
                      </div>
                      <span className="text-xs leading-relaxed text-muted-foreground line-clamp-4">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl min-h-full py-6 px-4 space-y-6 bg-background">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  {msg.role === 'user' ? (
                    <Message from="user" key={msg.id}>
                      <MessageContent>
                        <MessageResponse>{msg.content}</MessageResponse>
                      </MessageContent>
                    </Message>
                  ) : (
                    <>
                      <Message from="assistant" key={msg.id}>
                        <MessageContent className="space-y-2.5">
                          <AssistantMessageContent
                            steps={msg.steps ?? []}
                            content={msg.content ?? ''}
                            isStreaming={false}
                            defaultOpenChain={false}
                          />
                        </MessageContent>
                      </Message>
                      {msg.runId && (
                        <MessageActions>
                          <MessageAction
                            label="Share result"
                            tooltip="Share result"
                            onClick={() => window.open(`/share/${msg.runId}`, '_blank')}
                          >
                            <Share2 className="size-3.5" />
                          </MessageAction>
                        </MessageActions>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Live run (streaming) */}
              {(isStreaming || (steps.length > 0 && messages[messages.length - 1]?.role === 'user')) && (
                <Message from="assistant">
                  <MessageContent className="space-y-2.5">
                    <AssistantMessageContent
                      steps={steps}
                      content={
                        currentAssistantText ||
                        (finalOutput != null && typeof finalOutput === 'object' && 'result' in finalOutput
                          ? String((finalOutput as { result?: string }).result ?? '')
                          : '')
                      }
                      isStreaming={isStreaming}
                      defaultOpenChain={isStreaming}
                    />
                  </MessageContent>
                </Message>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton scrollTargetRef={conversationScrollRef} className="absolute bottom-4 right-6" />
      </Conversation>

      <div className={cn('flex shrink-0 flex-col items-center gap-2 px-4 pb-4', messages.length === 0 && !isStreaming && 'hidden')}>
        {workflowOffer && (
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-lg p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <BookmarkPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Save this workflow?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Keep &quot;{workflowOffer.suggestedName}&quot; as a repeatable agent. You’ll get a form to run it anytime{workflowOffer.inputFields.length ? ` (${workflowOffer.inputFields.map((f) => f.label).join(', ')})` : ''}.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setWorkflowOffer(null)}
                disabled={workflowSaving}
              >
                Not now
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={workflowSaving}
                onClick={async () => {
                  if (!workflowOffer) return
                  setWorkflowSaving(true)
                  try {
                    const res = await fetch('/api/workflows/from-offer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        suggestedName: workflowOffer.suggestedName,
                        description: workflowOffer.description,
                        instructionPrompt: workflowOffer.instructionPrompt,
                        inputFields: workflowOffer.inputFields,
                      }),
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}))
                      throw new Error(err.error || 'Failed to save workflow')
                    }
                    const { workflow } = await res.json()
                    const slug = workflow?.slug ?? workflow?.id
                    if (slug) {
                      setWorkflowOffer(null)
                      window.location.href = `/workflow/${slug}`
                    }
                  } catch (e) {
                    console.error(e)
                    setWorkflowSaving(false)
                  }
                }}
              >
                {workflowSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        )}
        <PromptInput
          onSubmit={(message) => {
            const text = (message.text ?? '').trim()
            if (text && !isStreaming) handleSubmit(text)
          }}
          className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-lg backdrop-blur-sm transition-all focus-within:border-primary/30 focus-within:shadow-xl"
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me to do something…"
              disabled={isStreaming}
              className="min-h-0 border-0 px-4 pt-3.5 pb-3 text-sm placeholder:text-muted-foreground/60"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <span className="text-[11px] text-muted-foreground/40">
                {guest ? (
                  <>
                    Trial ·{' '}
                    <button type="button" onClick={() => setSignInModalOpen(true)} className="text-primary underline underline-offset-1 hover:no-underline">
                      Sign in to save
                    </button>
                  </>
                ) : creditBalance != null && creditsUsed != null ? `${creditsUsed} used · ${creditBalance} left` : creditBalance != null ? `${creditBalance} credits` : 'Assistant'}
              </span>
            </PromptInputTools>
            <PromptInputSubmit
              status={isStreaming ? 'streaming' : 'ready'}
              disabled={!inputValue.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>

      <Dialog open={signInModalOpen} onOpenChange={setSignInModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in for full capabilities</DialogTitle>
            <DialogDescription>
              Create an account to save conversations, use more tools (Gmail, Slack, workflows), and unlock full capabilities.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/sign-up">Create account</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ChatErrorBoundary>
  )
}

