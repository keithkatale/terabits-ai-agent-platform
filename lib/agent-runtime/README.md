# Terabits Agent Runtime

OpenClaw-inspired robust agent execution system for Terabits AI Agent Platform.

## Overview

This runtime system brings OpenClaw's battle-tested agentic capabilities to Terabits' web-based platform. It provides:

- **Lane Queue System**: Per-session serial execution to prevent race conditions
- **Session Management**: JSONL-style transcript persistence with auto-compaction
- **Tool System**: Comprehensive tool registry with fine-grained access control
- **Memory System**: Markdown-based memory with semantic search
- **Multi-Agent Coordination**: Session tools for agent-to-agent communication
- **Context Management**: Automatic compaction when approaching token limits

## Architecture

```
agent-runtime/
├── types.ts              # Core TypeScript types
├── agent-loop.ts         # Main execution engine
├── lane-queue.ts         # Per-session serialization
├── session-manager.ts    # Transcript persistence
├── tool-policy.ts        # Tool access control
├── tools/
│   ├── index.ts          # Tool registry
│   ├── filesystem-tools.ts
│   ├── web-tools.ts
│   ├── memory-tools.ts
│   ├── session-tools.ts
│   └── canvas-tools.ts
└── README.md
```

## Key Concepts

### 1. Lane Queue (Per-Session Serialization)

Prevents race conditions by serializing agent runs per session:

```typescript
import { laneQueue } from '@/lib/agent-runtime'

// Enqueue a run (returns immediately)
const { runId, acceptedAt } = await laneQueue.enqueue(
  sessionKey,
  () => runAgentLoop(config),
  { priority: 0 }
)

// Wait for completion
const result = await laneQueue.waitForRun(runId, 30000)
```

### 2. Session Management

JSONL-style transcript persistence with compaction:

```typescript
import { SessionManager } from '@/lib/agent-runtime'

// Get or create session
const session = await SessionManager.getOrCreate(agentId, sessionKey)

// Append message
await session.appendMessage({
  role: 'user',
  content: 'Hello!',
})

// Get history
const history = await session.getHistory({ limit: 50 })

// Compact when needed
await session.compact({
  keepRecentMessages: 10,
  targetTokenCount: 4000,
})
```

### 3. Tool System

Comprehensive tool registry with categories:

```typescript
import { loadAgentTools, filterToolsByPolicy } from '@/lib/agent-runtime'

// Load all tools
const tools = await loadAgentTools(agentId)

// Filter by policy
const allowedTools = filterToolsByPolicy(tools, {
  profile: 'coding',
  maxToolCallsPerTurn: 10,
})
```

**Available Tool Categories:**
- `filesystem`: read, write, edit, list_directory
- `web`: web_search, web_fetch
- `memory`: memory_search, memory_get, memory_store, memory_update
- `session`: sessions_list, sessions_history, sessions_send, sessions_spawn
- `canvas`: update_workflow, add_node, connect_nodes

### 4. Tool Policies

Fine-grained access control:

```typescript
import { loadToolPolicy, saveToolPolicy } from '@/lib/agent-runtime'

// Load policy
const policy = await loadToolPolicy(agentId)

// Update policy
await saveToolPolicy(agentId, {
  profile: 'coding',
  allowedTools: ['read', 'write', 'web_search'],
  deniedTools: ['exec', 'bash'],
  maxToolCallsPerTurn: 10,
})
```

**Tool Profiles:**
- `minimal`: read, web_search, web_fetch, memory_search, memory_get
- `coding`: filesystem + web + memory tools
- `messaging`: read, message, email, web, memory tools
- `full`: all tools

### 5. Agent Execution

Main execution loop with streaming:

```typescript
import { runAgentLoop, enqueueAgentRun } from '@/lib/agent-runtime'

// Direct execution (blocks until complete)
const result = await runAgentLoop({
  agentId,
  sessionId,
  sessionKey,
  message: 'User message',
  systemPrompt: 'You are a helpful assistant',
  model: 'gemini-2.0-flash-exp',
  tools: await loadAgentTools(agentId),
  maxTokens: 4096,
  temperature: 0.7,
  userId,
}, (event) => {
  // Stream events
  console.log(event.type, event)
})

// Queued execution (returns immediately)
const { runId } = await enqueueAgentRun(config, onStream)
const result = await waitForAgentRun(runId, 30000)
```

### 6. Memory System

Markdown-based memory with semantic search:

```typescript
// Memory tools are automatically available to agents
const memoryTools = createMemoryTools(agentId)

// Agents can use these tools:
// - memory_search: Search memories semantically
// - memory_get: Retrieve specific memory
// - memory_store: Store new memory
// - memory_update: Update existing memory
```

### 7. Multi-Agent Coordination

Session tools for agent-to-agent communication:

```typescript
// Session tools are automatically available
const sessionTools = createSessionTools(agentId)

// Agents can use these tools:
// - sessions_list: Discover other sessions
// - sessions_history: Read another session's transcript
// - sessions_send: Send message to another session
// - sessions_spawn: Spawn sub-agent for isolated task
```

## Database Schema

The runtime uses these tables (created by migration):

- `agent_sessions`: Session metadata and status
- `session_messages`: JSONL-style message log
- `tool_executions`: Detailed tool execution tracking
- `agent_memory_entries`: Vector-enabled memory storage
- `agent_tool_policies`: Fine-grained tool access control
- `agent_run_queue`: Lane queue tracking
- `subagent_spawns`: Sub-agent execution tracking
- `agent_context_snapshots`: Compaction history

## Usage in Terabits

### Builder Mode (Current)

Conversational agent creation with Gemini:

```typescript
// app/api/agent-builder/route.ts
// Uses Gemini with builder-specific tools
```

### Runtime Mode (New)

Full OpenClaw-style agent execution:

```typescript
// app/api/agent-runtime/route.ts
import { enqueueAgentRun, loadAgentTools } from '@/lib/agent-runtime'

export async function POST(req: Request) {
  const { agentId, message, sessionKey } = await req.json()
  
  // Load agent configuration
  const agent = await getAgent(agentId)
  const tools = await loadAgentTools(agentId)
  
  // Enqueue run
  const { runId } = await enqueueAgentRun({
    agentId,
    sessionId: generateSessionId(),
    sessionKey,
    message,
    systemPrompt: agent.system_prompt,
    model: agent.model,
    tools,
    userId: req.user.id,
  }, (event) => {
    // Stream events to client
    streamEvent(event)
  })
  
  return { runId }
}
```

## Streaming Events

The runtime emits these event types:

```typescript
interface StreamEvent {
  type: 'lifecycle' | 'assistant' | 'tool' | 'error'
  phase?: 'start' | 'end' | 'error'
  content?: string
  toolName?: string
  toolState?: 'pending' | 'running' | 'completed' | 'error'
  toolInput?: Record<string, unknown>
  toolOutput?: unknown
  error?: string
  metadata?: Record<string, unknown>
}
```

## Next Steps

### Immediate (Week 1-2)
- [x] Core agent runtime implementation
- [x] Lane queue system
- [x] Session management
- [x] Tool registry
- [x] Tool policy system
- [ ] API route for runtime execution
- [ ] Dual-mode chat interface

### Short-term (Week 3-4)
- [ ] Implement actual filesystem operations (sandboxed)
- [ ] Integrate real web search API (Brave/Serper)
- [ ] Vector search for memory (pgvector)
- [ ] Sub-agent spawning
- [ ] Agent-to-agent messaging

### Medium-term (Week 5-8)
- [ ] Runtime execution UI
- [ ] Memory viewer/editor
- [ ] Tool usage analytics
- [ ] Session browser
- [ ] Performance optimization

## OpenClaw Patterns Adopted

1. **Lane Queue**: Per-session serialization prevents races
2. **JSONL Transcripts**: Append-only message log
3. **Auto-Compaction**: Context window management
4. **Tool Policies**: Profile-based + explicit allow/deny
5. **Session Tools**: Multi-agent coordination
6. **Memory System**: Markdown-based with semantic search
7. **Progressive Disclosure**: Load tool content on-demand

## Differences from OpenClaw

1. **Web-First**: Cloud-based, not local
2. **Multi-Tenancy**: Proper user isolation
3. **Managed Infrastructure**: Platform handles credentials
4. **Visual Workflow**: Synced with React Flow canvas
5. **Conversational Builder**: Friendly agent creation mode

## Contributing

When adding new tools:

1. Create tool in appropriate file under `tools/`
2. Add to tool registry in `tools/index.ts`
3. Update tool categories in `types.ts`
4. Add tests
5. Update documentation

## License

Same as Terabits AI Agent Platform
