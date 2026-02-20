# OpenClaw Integration Plan: Terabits + OpenClaw Hybrid Architecture

## Executive Summary

Instead of building a complex node execution engine from scratch, we leverage OpenClaw's battle-tested agentic runtime as the execution layer. Terabits becomes the **conversational builder** (Gemini-powered) that creates visual workflows, while OpenClaw becomes the **execution engine** that runs them.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TERABITS PLATFORM                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Builder Layer (Gemini Orchestrator)               │    │
│  │  - Conversational agent creation                   │    │
│  │  - Visual workflow design (React Flow)             │    │
│  │  - Plan artifacts & approval                       │    │
│  │  - Workflow persistence (Supabase)                 │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   │ Translates workflow to                  │
│                   │ OpenClaw configuration                  │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Runtime Layer (OpenClaw Integration)              │    │
│  │  - Spawns OpenClaw instances                       │    │
│  │  - Converts workflows → skills + system prompts    │    │
│  │  - Manages execution sessions                      │    │
│  │  - Streams results back to UI                      │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    OPENCLAW RUNTIME                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  runEmbeddedPiAgent()                              │    │
│  │  - Full agentic capabilities                       │    │
│  │  - Skills-as-markdown                              │    │
│  │  - Lane queue (serial execution)                   │    │
│  │  - Tool calling (bash, read, write, web, etc.)     │    │
│  │  - Memory system                                    │    │
│  │  - Sandbox support                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Phase 1: Builder (Terabits - Gemini)

1. **User describes need**: "I need an agent to scrape Reddit posts about AI tools"
2. **Gemini creates plan**: Visual workflow with nodes (trigger → scrape → filter → output)
3. **User approves**: Plan artifact shown, user clicks "Build"
4. **Workflow stored**: Nodes and edges saved to Supabase
5. **OpenClaw config generated**: Workflow translated to:
   - System prompt
   - Skills (markdown files)
   - Tool allowlist
   - Execution parameters

### Phase 2: Runtime (OpenClaw)

1. **User clicks "Run Agent"**
2. **Terabits spawns OpenClaw instance**:
   ```typescript
   const result = await runEmbeddedPiAgent({
     sessionId: `terabits:${agentId}:${sessionId}`,
     sessionKey: `agent:${agentId}:runtime`,
     message: userInput,
     systemPrompt: generatedSystemPrompt,
     workspaceDir: `~/.terabits/agents/${agentId}/workspace`,
     model: agent.model,
     tools: allowedTools,
     // ... other params
   })
   ```
3. **OpenClaw executes**:
   - Loads skills from workspace
   - Runs with full agentic capabilities
   - Uses lane queue for serial execution
   - Calls tools (bash, web scraping, etc.)
4. **Results streamed back**: Terabits UI shows execution progress and results

## Key Integration Points

### 1. Workflow → OpenClaw Translation

**Input**: Terabits workflow (nodes + edges from database)

```typescript
interface WorkflowNode {
  node_id: string
  node_type: 'trigger' | 'action' | 'condition' | 'output'
  label: string
  data: {
    config: {
      // Node-specific configuration
      url?: string
      prompt?: string
      outputFormat?: string
    }
  }
}
```

**Output**: OpenClaw configuration

```typescript
interface OpenClawConfig {
  systemPrompt: string          // Generated from workflow
  skills: SkillDefinition[]     // Converted from action nodes
  toolAllowlist: string[]       // Based on node types
  workspaceDir: string          // Per-agent workspace
  model: string                 // From agent settings
}
```

### 2. Node Type → Skill Mapping

| Terabits Node Type | OpenClaw Skill | Tools Required |
|-------------------|----------------|----------------|
| `web-search` | `web-search.md` | `bash`, `read`, `write` |
| `web-scraper` | `web-scraper.md` | `bash`, `read`, `write` |
| `ai-text` | `ai-process.md` | Built-in (model) |
| `data-transform` | `transform.md` | `bash`, `read`, `write` |
| `api-call` | `api-call.md` | `bash`, `read`, `write` |

### 3. Skill Generation

For each action node, generate a skill markdown file:

```markdown
---
name: web-search
description: Search the web for information
tools: [bash, read, write]
---

# Web Search Skill

You can search the web using the following approach:

1. Use bash to call a web search API (Brave/Serper)
2. Parse the results
3. Return formatted data

## Example

When the user asks to search for "AI tools", execute:
\`\`\`bash
curl -X GET "https://api.search.brave.com/res/v1/web/search?q=AI+tools" \\
  -H "X-Subscription-Token: $BRAVE_API_KEY"
\`\`\`

Parse the JSON response and extract relevant information.
```

### 4. System Prompt Generation

Combine workflow intent with execution instructions:

```typescript
function generateSystemPrompt(agent: Agent, workflow: Workflow): string {
  return `You are ${agent.name}, an AI employee designed to ${agent.description}.

Your workflow:
${workflow.nodes.map((node, i) => `${i + 1}. ${node.label}: ${node.data.config.description || ''}`).join('\n')}

Execute this workflow step by step when the user provides input.

Available skills:
${workflow.nodes.filter(n => n.node_type === 'action').map(n => `- ${n.label}`).join('\n')}

Always explain what you're doing at each step.`
}
```

## Implementation Plan

### Week 1: Core Integration

#### Day 1-2: OpenClaw Setup
- [ ] Add OpenClaw as dependency to Terabits
- [ ] Create OpenClaw workspace structure: `~/.terabits/agents/{agentId}/workspace/`
- [ ] Test basic `runEmbeddedPiAgent()` call
- [ ] Verify OpenClaw can run in Terabits context

#### Day 3-4: Workflow Translation
- [ ] Create `lib/openclaw-integration/workflow-translator.ts`
- [ ] Implement node → skill conversion
- [ ] Implement system prompt generation
- [ ] Generate tool allowlist from workflow

#### Day 5: Runtime API
- [ ] Create `POST /api/agents/[id]/execute` endpoint
- [ ] Integrate `runEmbeddedPiAgent()`
- [ ] Stream results back to client
- [ ] Handle errors and timeouts

### Week 2: Skills & Tools

#### Day 1-2: Core Skills
- [ ] Create skill templates for common nodes:
  - `web-search.md`
  - `web-scraper.md`
  - `ai-process.md`
  - `data-transform.md`
  - `api-call.md`

#### Day 3-4: Tool Integration
- [ ] Configure OpenClaw tool policies
- [ ] Set up sandboxing for user agents
- [ ] Implement tool result parsing
- [ ] Map tool outputs to Terabits UI

#### Day 5: Testing
- [ ] End-to-end test: build → execute → results
- [ ] Test multiple agent types
- [ ] Test error handling
- [ ] Performance testing

### Week 3: UI & Polish

#### Day 1-2: Agent Frontend Panel
- [ ] Render input fields from trigger nodes
- [ ] Display execution progress
- [ ] Show tool calls in real-time
- [ ] Display results from output nodes

#### Day 3-4: Execution Logs
- [ ] Store execution history in database
- [ ] Build logs viewer UI
- [ ] Add execution replay
- [ ] Export results

#### Day 5: Deployment
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Iterate

## File Structure

```
terabits-ai-agent-platform/
├── lib/
│   └── openclaw-integration/
│       ├── index.ts                    # Main exports
│       ├── workflow-translator.ts      # Workflow → OpenClaw config
│       ├── skill-generator.ts          # Generate skill markdown
│       ├── system-prompt-generator.ts  # Generate system prompts
│       ├── openclaw-runner.ts          # Wrapper for runEmbeddedPiAgent
│       ├── result-parser.ts            # Parse OpenClaw results
│       └── types.ts                    # TypeScript types
│
├── app/api/agents/[id]/
│   └── execute/
│       └── route.ts                    # Runtime execution endpoint
│
└── ~/.terabits/agents/
    └── {agentId}/
        └── workspace/
            ├── AGENTS.md               # Agent identity
            ├── SOUL.md                 # Personality
            ├── TOOLS.md                # Tool instructions
            └── skills/
                ├── web-search/
                │   └── SKILL.md
                ├── web-scraper/
                │   └── SKILL.md
                └── ai-process/
                    └── SKILL.md
```

## API Design

### Execute Agent

```typescript
POST /api/agents/[id]/execute

Request:
{
  "input": {
    "url": "https://reddit.com/r/artificial",
    "keyword": "AI tools"
  },
  "sessionId": "session-123"
}

Response (SSE stream):
{
  "type": "lifecycle",
  "phase": "start"
}
{
  "type": "tool",
  "tool": "bash",
  "status": "running",
  "input": "curl https://reddit.com/..."
}
{
  "type": "assistant",
  "delta": "I'm searching Reddit for AI tools..."
}
{
  "type": "tool",
  "tool": "bash",
  "status": "completed",
  "output": "..."
}
{
  "type": "lifecycle",
  "phase": "end",
  "result": {
    "posts": [...]
  }
}
```

## Benefits

### 1. Immediate Execution Capability
- No need to build node executors from scratch
- OpenClaw's 2+ years of battle-testing
- Full agentic capabilities out of the box

### 2. Powerful Tool System
- 20+ built-in tools (bash, read, write, browser, etc.)
- Sandboxing support
- Tool policies and access control

### 3. Proven Patterns
- Lane queue (serial execution)
- Skills-as-markdown
- Memory system
- Session management

### 4. Flexibility
- Users get visual workflow builder (Terabits)
- Agents get full agentic capabilities (OpenClaw)
- Best of both worlds

## Challenges & Solutions

### Challenge 1: Dependency Management
**Problem**: OpenClaw is a large dependency
**Solution**: 
- Use OpenClaw as a peer dependency
- Only load when needed
- Consider microservice architecture if needed

### Challenge 2: Workspace Isolation
**Problem**: Multiple agents need isolated workspaces
**Solution**:
- Per-agent workspace: `~/.terabits/agents/{agentId}/workspace/`
- OpenClaw already supports custom workspace dirs
- Use `workspaceDir` parameter in `runEmbeddedPiAgent()`

### Challenge 3: Skill Generation
**Problem**: Converting visual nodes to markdown skills
**Solution**:
- Template-based generation
- Node config → skill parameters
- Store generated skills in agent workspace

### Challenge 4: Result Parsing
**Problem**: OpenClaw returns text, need structured data
**Solution**:
- Instruct agent to return JSON in final message
- Parse last assistant message for structured data
- Use tool results as fallback

## Success Metrics

1. **Time to First Execution**: < 1 week
2. **Agent Types Supported**: 5+ (web scraper, content creator, data analyst, etc.)
3. **Execution Success Rate**: > 90%
4. **Average Execution Time**: < 30 seconds
5. **User Satisfaction**: Agents actually work!

## Next Steps

1. **Proof of Concept** (2 days):
   - Install OpenClaw in Terabits
   - Create simple workflow (1 node)
   - Execute with OpenClaw
   - Display results

2. **Core Integration** (1 week):
   - Workflow translator
   - Skill generator
   - Runtime API
   - Basic UI

3. **Production Ready** (2 weeks):
   - Multiple node types
   - Error handling
   - Execution logs
   - Deployment

## Conclusion

This hybrid architecture gives us:
- **Fast time to market**: No need to build execution engine
- **Robust execution**: OpenClaw's proven runtime
- **Great UX**: Terabits' conversational builder
- **Flexibility**: Easy to extend with new node types

The key insight: **Terabits is the builder, OpenClaw is the runner**. Each does what it's best at.
