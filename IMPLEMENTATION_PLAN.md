# Complete Implementation Plan

## Phase 1: Expandable Node Palette ✅ IN PROGRESS

### Files to Create/Modify:
1. ✅ `lib/types/node-types.ts` - Complete node type definitions
2. 🔄 `components/agent-builder/expandable-node-palette.tsx` - New expandable palette
3. 🔄 `components/agent-builder/workflow-canvas.tsx` - Update to use new palette

### Node Categories:

#### TRIGGER (4 types)
- Button Click
- Input Form
- Schedule
- Webhook

#### ACTION (16 types across 5 subcategories)
**Web & Scraping:**
- Web Search (Serper.dev)
- Web Scraper
- Apify Actor
- Visit Page

**AI Processing:**
- AI Text Processing
- AI Chat
- AI Image Generation
- AI Vision

**Data Operations:**
- Transform Data
- Filter Data
- Merge Data
- Sort Data

**API & Integration:**
- API Call
- Database Query

**Utility:**
- Delay
- Loop

#### CONDITION (5 types across 4 subcategories)
**Logic:**
- If/Else
- Switch

**Data Checks:**
- Data Condition

**Time-based:**
- Time Condition

**Error Handling:**
- Error Handler

#### OUTPUT (13 types across 5 subcategories)
**Display:**
- Display Text
- Display Table
- Display JSON
- Display Chart
- Display Image

**Download:**
- Download File
- Download CSV
- Download PDF

**Send/Notify:**
- Send Email
- Send Webhook
- Send Notification

**Storage:**
- Save to Database
- Save to File

**End Workflow:**
- End (Success)
- End (Error)

---

## Phase 2: Node Configuration Panels

### Priority Nodes to Implement:

#### 1. Web Search Node (Serper.dev)
```typescript
{
  query: string // {{variable}} support
  type: 'search' | 'news' | 'images' | 'places'
  location?: string
  language?: string
  numResults: number
  apiKey: string // from env
}
```

#### 2. Apify Actor Node
```typescript
{
  actorId: string // e.g., 'apify/youtube-scraper'
  input: Record<string, any> // Actor-specific input
  apiKey: string // from env
  timeout: number
  memory: number
}
```

#### 3. AI Text Processing Node
```typescript
{
  model: 'gemini-3-flash-preview' | 'gpt-4' | 'claude-3'
  operation: 'summarize' | 'extract' | 'classify' | 'custom'
  prompt: string // {{variable}} support
  temperature: number
  maxTokens: number
}
```

#### 4. Web Scraper Node
```typescript
{
  url: string // {{variable}} support
  method: 'cheerio' | 'playwright'
  selectors: Array<{
    name: string
    selector: string
    type: 'text' | 'html' | 'attribute'
    attribute?: string
  }>
  waitFor?: string
  timeout: number
}
```

#### 5. Display Table Node
```typescript
{
  data: string // {{variable}} reference
  columns: Array<{
    key: string
    label: string
    format: 'text' | 'number' | 'date' | 'link'
  }>
  pagination: boolean
  pageSize: number
  sortable: boolean
  searchable: boolean
  downloadable: boolean
}
```

---

## Phase 3: Variable Interpolation Engine

### Implementation:
```typescript
// lib/execution/variable-interpolation.ts

interface ExecutionContext {
  [nodeId: string]: {
    [field: string]: any
  }
}

function interpolate(template: string, context: ExecutionContext): any {
  // Handle {{nodeId.field}} syntax
  // Handle {{nodeId.nested.field}} syntax
  // Handle {{nodeId.array[0]}} syntax
  // Handle conditional {{#if}}{{/if}}
  // Handle loops {{#each}}{{/each}}
}
```

### Examples:
```typescript
// Simple
"{{input.url}}" → "https://youtube.com/watch?v=123"

// Nested
"{{apify.data.transcript}}" → "Full transcript text..."

// Array
"{{search.results[0].title}}" → "First result title"

// Conditional
"{{#if input.location}}in {{input.location}}{{/if}}"

// Loop
"{{#each search.results}}{{this.title}}\n{{/each}}"
```

---

## Phase 4: Node Executors

### Executor Interface:
```typescript
interface NodeExecutor {
  type: string
  execute(config: any, context: ExecutionContext): Promise<ExecutionResult>
  validate(config: any): ValidationResult
}

interface ExecutionResult {
  success: boolean
  data?: any
  error?: string
  metadata?: {
    duration: number
    tokensUsed?: number
    apiCalls?: number
  }
}
```

### Executors to Implement:

#### 1. Web Search Executor (Serper.dev)
```typescript
// lib/execution/executors/web-search-executor.ts
import axios from 'axios'

async function executeWebSearch(config, context) {
  const query = interpolate(config.query, context)
  
  const response = await axios.post('https://google.serper.dev/search', {
    q: query,
    num: config.numResults || 10,
    gl: config.location,
    hl: config.language
  }, {
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    }
  })
  
  return {
    success: true,
    data: {
      results: response.data.organic,
      total: response.data.searchInformation?.totalResults
    }
  }
}
```

#### 2. Apify Actor Executor
```typescript
// lib/execution/executors/apify-executor.ts
import { ApifyClient } from 'apify-client'

async function executeApifyActor(config, context) {
  const client = new ApifyClient({ token: process.env.APIFY_API_KEY })
  
  // Interpolate input
  const input = interpolateObject(config.input, context)
  
  // Run actor
  const run = await client.actor(config.actorId).call(input, {
    memory: config.memory || 256,
    timeout: config.timeout || 300
  })
  
  // Wait for completion
  await run.waitForFinish()
  
  // Get results
  const { items } = await client.dataset(run.defaultDatasetId).listItems()
  
  return {
    success: true,
    data: items[0] || items,
    metadata: {
      runId: run.id,
      duration: run.finishedAt - run.startedAt
    }
  }
}
```

#### 3. AI Text Executor
```typescript
// lib/execution/executors/ai-text-executor.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

async function executeAIText(config, context) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: config.model })
  
  // Interpolate prompt
  const prompt = interpolate(config.prompt, context)
  
  // Generate
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config.temperature || 0.7,
      maxOutputTokens: config.maxTokens || 1000
    }
  })
  
  return {
    success: true,
    data: {
      text: result.response.text(),
      model: config.model
    },
    metadata: {
      tokensUsed: result.response.usageMetadata?.totalTokenCount
    }
  }
}
```

#### 4. Web Scraper Executor (Cheerio)
```typescript
// lib/execution/executors/web-scraper-executor.ts
import axios from 'axios'
import * as cheerio from 'cheerio'

async function executeWebScraper(config, context) {
  const url = interpolate(config.url, context)
  
  // Fetch page
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0...'
    },
    timeout: config.timeout || 30000
  })
  
  // Parse with Cheerio
  const $ = cheerio.load(response.data)
  
  // Extract data
  const results = {}
  for (const selector of config.selectors) {
    const elements = $(selector.selector)
    
    if (selector.type === 'text') {
      results[selector.name] = elements.text().trim()
    } else if (selector.type === 'attribute') {
      results[selector.name] = elements.attr(selector.attribute)
    } else if (selector.type === 'html') {
      results[selector.name] = elements.html()
    }
  }
  
  return {
    success: true,
    data: results
  }
}
```

---

## Phase 5: Execution Engine

### Workflow Execution Service:
```typescript
// lib/execution/execution-engine.ts

interface WorkflowExecution {
  id: string
  agentId: string
  userId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  inputs: Record<string, any>
  context: ExecutionContext
  currentNodeId?: string
  startedAt: Date
  completedAt?: Date
  error?: string
}

class ExecutionEngine {
  async execute(agentId: string, inputs: Record<string, any>): Promise<string> {
    // 1. Load workflow (nodes + edges)
    // 2. Create execution record
    // 3. Initialize context with inputs
    // 4. Find start node (trigger)
    // 5. Execute nodes in order
    // 6. Handle branches (conditions)
    // 7. Update context after each node
    // 8. Return execution ID
  }
  
  async executeNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    // 1. Get executor for node type
    // 2. Validate node config
    // 3. Execute node
    // 4. Update context with result
    // 5. Return result
  }
  
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution> {
    // Get execution from database
  }
  
  streamExecution(executionId: string): EventSource {
    // Stream execution progress via SSE
  }
}
```

---

## Phase 6: API Endpoints

### Endpoints to Create:

#### 1. Execute Workflow
```typescript
// app/api/agents/[id]/execute/route.ts
POST /api/agents/[id]/execute
Body: { inputs: Record<string, any> }
Response: { executionId: string }
```

#### 2. Get Execution Status
```typescript
// app/api/agents/[id]/executions/[executionId]/route.ts
GET /api/agents/[id]/executions/[executionId]
Response: WorkflowExecution
```

#### 3. Stream Execution
```typescript
// app/api/agents/[id]/executions/[executionId]/stream/route.ts
GET /api/agents/[id]/executions/[executionId]/stream
Response: Server-Sent Events
```

#### 4. Save Node Configuration
```typescript
// app/api/agents/[id]/nodes/[nodeId]/route.ts
PUT /api/agents/[id]/nodes/[nodeId]
Body: { config: any }
Response: { success: boolean }
```

---

## Environment Variables Needed

```env
# Apify
APIFY_API_KEY=your_apify_key

# Serper.dev (Web Search)
SERPER_API_KEY=your_serper_key

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_key

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key

# Anthropic (optional)
ANTHROPIC_API_KEY=your_anthropic_key
```

---

## Database Schema Updates

```sql
-- Add node configuration
ALTER TABLE workflow_nodes ADD COLUMN node_type_key TEXT;
ALTER TABLE workflow_nodes ADD COLUMN config JSONB DEFAULT '{}';

-- Create executions table
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  inputs JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  current_node_id TEXT,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Create execution logs table
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Timeline

- **Phase 1**: Expandable Node Palette - 1 day
- **Phase 2**: Node Configuration Panels - 2 days
- **Phase 3**: Variable Interpolation - 1 day
- **Phase 4**: Node Executors - 3 days
- **Phase 5**: Execution Engine - 2 days
- **Phase 6**: API Endpoints - 1 day

**Total**: ~10 days for complete implementation

---

**Status:** Phase 1 In Progress
**Date:** February 20, 2026
