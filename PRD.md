Vision
Terabits is a conversation-first platform that lets anyone -- regardless of technical skill -- create fully functional AI employees through natural dialogue. Instead of one-shot prompt-to-agent generation, Terabits engages users in a real multi-turn conversation to deeply understand what they need, researches what's required, and only then builds the agent. If the platform cannot support a specific type of agent, it honestly tells the user.
The platform is inspired by OpenClaw's open-source architecture (skills-as-markdown, lane queues, heartbeat scheduling, progressive skill disclosure) but reimagined as a web SaaS where the AI orchestrator is the builder.
Core Principle: The user describes what kind of AI employee they need. The platform converses, asks clarifying questions, researches feasibility, and iteratively builds a working agent with a visual workflow -- all through chat. The user never touches code, APIs, or configuration files.

Technology Stack
LayerTechnologyFrameworkNext.js 16 (App Router)UIshadcn/ui + Tailwind CSS 4Workflow CanvasReact Flow (@xyflow/react)DatabaseSupabase (PostgreSQL + Auth + Realtime) -- connectedPrimary AIGoogle Gemini 2.5 Pro Preview (gemini-2.5-pro-preview via @ai-sdk/google)Future AIClaude (Anthropic) as primary orchestrator laterAI SDKVercel AI SDK (ai package)StateReact hooks + Supabase Realtime for live updates

Theme: Claude-Inspired Warm Earth Tones
The entire UI uses a warm, approachable color palette inspired by Claude.ai -- earthy browns, muted tans, warm grays, and soft wheat tones. This creates a friendly, non-intimidating feel perfect for non-technical users.
Color Palette
TokenLight ModeDark ModeUsage--background#F4F3EE (Pampas)#1C1917 (warm black)Page background--foreground#292524 (stone-900)#F4F3EE (Pampas)Primary text--card#FFFFFF#292524 (stone-900)Cards, panels--card-foreground#292524#E7E5E4 (stone-200)Card text--primary#C15F3C (Crail)#D4845E (lighter crail)Buttons, active states, brand accent--primary-foreground#FFFFFF#FFFFFFText on primary--secondary#E7E5E4 (stone-200)#44403C (stone-700)Secondary buttons, badges--secondary-foreground#57534E (stone-600)#D6D3D1 (stone-300)Secondary text--muted#D6D3D1 (stone-300)#57534E (stone-600)Muted backgrounds--muted-foreground#78716C (stone-500)#A8A29E (stone-400)Muted text--accent#C2B7A2 (Cloudy/wheat)#816E63 (warm brown)Hover states, highlights--accent-foreground#292524#F4F3EEText on accent--border#D6D3D1 (stone-300)#44403C (stone-700)Borders--ring#C15F3C (Crail)#D4845EFocus rings--sidebar-bg#EAE8E2 (warm off-white)#1C1917Sidebar background--destructive#DC2626 (red-600)#EF4444 (red-500)Error/delete actions
Typography

Headings: font-serif (warm, approachable)
Body: System sans-serif stack
Code/technical: Monospace (minimal usage -- this is a non-technical tool)

Design Principles

Warm and inviting, never cold or clinical
Rounded corners (12px radius on cards, 8px on buttons)
Soft shadows with warm tint
Generous whitespace
Friendly, conversational copy -- no jargon


The Conversational Building Experience (Key Differentiator)
This is the heart of Terabits. Instead of generating an agent from a single prompt, the platform engages in a real conversation:
How It Works


User starts with intent: "I need someone to handle my customer emails"


Platform asks discovery questions:

"What kind of emails do you typically receive?"
"How should urgent vs. normal emails be handled?"
"Do you want auto-responses or just drafts for your approval?"
"How many emails do you get per day roughly?"
"What tone should the responses have?"



Platform researches feasibility:

The AI uses web search (via tool calling) to understand the domain
Checks what integrations/capabilities are needed
Assesses if the request falls within platform capabilities



Capability honesty:

If something can't be built: "I'd love to help with that, but our platform currently doesn't support direct Gmail integration. Here's what I can build for you instead: [alternative]"
Clearly communicates what's possible vs. what's coming soon



Progressive building:

After understanding the full picture, the AI starts building
Shows progress on the React Flow canvas in real-time
"I'm setting up your email triage workflow. You'll see the nodes appearing on the right..."
Asks for confirmation at each major step



Iterative refinement:

User can say "Actually, I also want it to categorize emails by project"
AI updates the workflow, adds new skills, adjusts the logic
Canvas reflects changes live



Conversation Phases (Internal State Machine)
PhaseDescriptionAI BehaviordiscoveryUnderstanding what the user needsAsk 3-5 targeted questions, research feasibilityplanningConfirming the plan before buildingPresent a summary: "Here's what I'll build..."buildingActively creating the agentStream progress, update canvas, generate skillsrefiningUser is tweaking/adjustingHandle change requests, update workflowtestingUser is testing the agentSwitch to runtime mode, let user chat with agentdeployingAgent is ready to go liveConfigure deploy settings, generate URL

Agent Use Case Categories ("AI Employee Roles")
Framed as hiring an AI employee, not building an agent:

Customer Support Rep - Handle inquiries, FAQ answers, ticket routing, escalation
Content Creator - Write social posts, blog drafts, marketing copy, newsletters
Data Analyst - Process data, generate reports, surface insights, create summaries
Operations Assistant - Automate workflows, process forms, send notifications, manage data entry
Personal Assistant - Manage calendar, triage emails, set reminders, daily briefings

Each has a pre-built template that the AI uses as a starting scaffold during the building conversation.
Capability Boundaries
The platform maintains an internal registry of what it can and cannot do. When a user requests something outside current capabilities, the AI:

Acknowledges the request respectfully
Explains what's not supported yet
Suggests what it can do that's close
Logs the request for future development


Architecture (Inspired by OpenClaw)
OpenClaw Patterns We Adopt


Skills-as-Markdown - Agent capabilities defined as markdown with YAML frontmatter. AI generates these during the building conversation. Users see friendly cards, never raw markdown.


Lane Queue - Per-session serial execution. Each agent session gets its own queue. Background/cron jobs run on separate lanes.


4-Layer Architecture for Web:

Gateway -> Next.js API routes (auth, routing, WebSocket)
Integration -> Channel adapters (web chat, API endpoint, future: Slack/Discord)
Execution -> Lane Queue manages task ordering per session
Intelligence -> Skills + Memory + Heartbeat scheduling



Heartbeat/Schedule Pattern - Recurring tasks as checklists, executed on cron intervals.


Progressive Skill Disclosure - Only skill names loaded upfront; full content injected when activated.


Human-Readable Memory - Stored as structured JSON, displayed as editable cards.


What We Do Differently

Conversation-first, not prompt-first - Multi-turn dialogue, not single-shot generation
Web research during building - AI searches the web to understand the user's domain
Capability honesty - Tells users what can't be done (yet)
"AI Employee" framing - Warm, human language throughout
No API keys for users - Platform manages all credentials
One-click deploy - Public URL or embeddable widget


Database Schema (Supabase)
-- User profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agents (AI Employees)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, building, active, paused, archived
  system_prompt TEXT,
  model TEXT DEFAULT 'gemini-2.5-pro-preview',
  settings JSONB DEFAULT '{}',
  deploy_slug TEXT UNIQUE,
  is_deployed BOOLEAN DEFAULT false,
  conversation_phase TEXT DEFAULT 'discovery', -- discovery, planning, building, refining, testing, deploying
  capabilities JSONB DEFAULT '[]', -- What this agent can do (for display)
  limitations JSONB DEFAULT '[]', -- What was requested but not supported
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Skills (capabilities) for each agent
CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  skill_content TEXT, -- Full markdown (OpenClaw SKILL.md style)
  skill_type TEXT DEFAULT 'custom',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow nodes (React Flow)
CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  label TEXT NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow edges (React Flow connections)
CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label TEXT,
  edge_type TEXT DEFAULT 'default',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages (builder conversation + runtime)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'builder', -- builder, runtime
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent memory (human-readable, editable)
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Schedules (Heartbeat pattern)
CREATE TABLE agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  task_list JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Execution logs
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  session_id UUID,
  lane TEXT DEFAULT 'main',
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Capability registry (what the platform can/cannot do)
CREATE TABLE platform_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  coming_soon BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
All tables have RLS policies scoping access to the authenticated user's own data.

Application Structure
app/
  layout.tsx                    -- Root layout, Supabase provider, theme (Claude-like)
  page.tsx                      -- Landing page
  globals.css                   -- Warm earth-tone theme variables
  
  (auth)/
    login/page.tsx
    signup/page.tsx
    callback/route.ts
  
  (dashboard)/
    layout.tsx                  -- Dashboard layout (sidebar + header)
    dashboard/page.tsx          -- Home: agent list, stats
    agents/
      page.tsx                  -- All agents list
      new/page.tsx              -- Start building (initial prompt + templates)
      [id]/
        page.tsx                -- Agent builder (chat + canvas split view)
        settings/page.tsx       -- Agent settings
        logs/page.tsx           -- Execution logs
        deploy/page.tsx         -- Deploy configuration
    templates/page.tsx          -- Template gallery ("Hire an AI Employee")
  
  (deployed)/
    agent/[slug]/page.tsx       -- Public agent chat interface
  
  api/
    auth/callback/route.ts
    agents/
      route.ts
      [id]/
        chat/route.ts           -- Builder conversation (multi-turn, tool calling)
        run/route.ts            -- Agent runtime execution
        workflow/route.ts       -- Save/load workflow
        skills/route.ts
        schedules/route.ts
        deploy/route.ts
        memory/route.ts

components/
  ui/                           -- shadcn/ui components
  
  landing/
    hero.tsx                    -- "Hire Your Next AI Employee"
    features.tsx
    use-cases.tsx               -- Employee role gallery
    cta.tsx
  
  auth/
    login-form.tsx
    signup-form.tsx
  
  dashboard/
    sidebar.tsx
    header.tsx
    agent-card.tsx
    stats-overview.tsx
  
  agent-builder/
    builder-layout.tsx          -- Split view: chat left, canvas right
    chat-panel.tsx              -- Conversational builder interface
    chat-message.tsx            -- Message bubble (with phase indicators)
    chat-input.tsx              -- Input with suggestion chips
    phase-indicator.tsx         -- Shows current building phase
    capability-notice.tsx       -- "We can't do X yet, but here's what we can do"
    workflow-canvas.tsx         -- React Flow canvas
    node-palette.tsx            -- Draggable node palette
    custom-nodes/
      trigger-node.tsx
      action-node.tsx
      condition-node.tsx
      skill-node.tsx
      output-node.tsx
      schedule-node.tsx
    toolbar.tsx
  
  agent-runtime/
    runtime-chat.tsx
    memory-viewer.tsx
    execution-log.tsx
    schedule-manager.tsx
  
  deploy/
    deploy-panel.tsx
    embed-code.tsx
    public-chat.tsx

lib/
  supabase/
    client.ts
    server.ts
    middleware.ts
  
  ai/
    orchestrator.ts             -- Conversational builder AI (multi-turn)
    gemini.ts                   -- Gemini 2.5 Pro Preview setup
    capability-checker.ts       -- Check if a request is feasible
    prompts/
      builder-system.ts         -- Conversational builder system prompt
      agent-runtime.ts          -- Generated agent runtime prompt
      workflow-generator.ts
      skill-generator.ts
  
  agents/
    lane-queue.ts
    skill-manager.ts
    memory-manager.ts
    heartbeat.ts
    workflow-engine.ts
  
  types/
    agent.ts
    chat.ts
    workflow.ts
  
  utils.ts

hooks/
  use-agent.ts
  use-chat.ts
  use-workflow.ts
  use-realtime.ts

middleware.ts


Implementation Order
Phase 1: Foundation

Database migration - Create all tables + RLS + seed platform_capabilities
Theme setup - Update globals.css with Claude-inspired warm earth tones
Auth flow - Supabase auth (login, signup, middleware, protected routes)
Dashboard layout - Sidebar, header, agent list (warm theme applied)

Phase 2: The Building Conversation

Landing page - "Hire Your Next AI Employee" with warm, inviting design
New agent page - Initial prompt + template gallery (role-based: "What role do you need filled?")
Chat panel - Multi-turn conversational builder with Gemini 2.5 Pro Preview
Phase system - Discovery -> Planning -> Building -> Refining -> Testing -> Deploying
Capability checker - Assess feasibility, honest "can't do yet" responses

Phase 3: Visual Workflow

React Flow canvas - Custom nodes, full drag-and-drop builder
Node palette - Draggable node types sidebar
Chat-canvas sync - Bidirectional: AI builds workflow, user can edit canvas

Phase 4: Agent Intelligence

AI orchestrator - Gemini tool calling (create_skill, update_workflow, set_schedule, etc.)
Skills system - Markdown skills displayed as cards
Memory system - Editable memory cards
Lane queue - Per-session serial execution

Phase 5: Runtime & Deploy

Schedule manager - User-friendly cron builder
Agent runtime - Chat with the built agent
Deploy - Public URL + embed widget
Polish - Loading states, animations, responsive, error handling


Dependencies to Install
@supabase/supabase-js @supabase/ssr          # Supabase
ai @ai-sdk/google                              # AI SDK + Gemini
@xyflow/react                                  # React Flow


Key AI Orchestrator Behavior
Conversational Builder System Prompt (Core)
The Gemini-powered builder is instructed to:

Be warm and conversational -- like a friendly colleague helping hire a new team member
Ask 3-5 discovery questions before building anything
Use web search to understand the user's domain/industry if needed
Present a plan before building: "Here's what I'll build for your [role]. Sound good?"
Build progressively -- create the workflow step by step, explaining as it goes
Be honest about limitations -- "We can't do X yet, but here's a great alternative"
Never use technical jargon -- "workflow node" becomes "step", "API" becomes "connection"
Handle change requests gracefully -- "Sure, let me update that step for you"

Tools Available to the Builder AI
ToolDescriptionask_discovery_questionAsk user a targeted question about their needsresearch_feasibilityCheck if a capability is supportedpresent_planShow the user a summary of what will be builtcreate_skillGenerate a new skill for the agentupdate_workflowAdd/modify/remove workflow nodes and edgesset_scheduleCreate a heartbeat/cron scheduleupdate_agent_settingsChange model, behavior settingsadd_memoryStore a fact in agent memorymark_unsupportedLog a request that can't be fulfilled (yet)transition_phaseMove to the next conversation phase