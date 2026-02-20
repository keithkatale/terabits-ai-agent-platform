# Instruction-Based Agent Implementation

## Overview

This implementation transforms Terabits from a workflow execution platform to an instruction-based AI agent platform. Instead of executing workflows step-by-step, we spawn AI instances with instructions and let them work autonomously.

## What Changed

### Conceptual Shift

**Before**: Workflow execution (rigid, sequential)
```
Node 1 → Node 2 → Node 3 → Output
```

**After**: Instruction-based execution (flexible, agentic)
```
Instructions + Tools → AI Agent → Output
```

### Database Changes

New tables:
- `agent_executions` - Tracks each agent run
- `agent_tools` - Defines which tools an agent can use
- `agent_mcp_servers` - MCP server configurations
- `execution_logs` - Detailed execution logs

Enhanced `agents` table:
- `instruction_prompt` - Core instructions for the agent
- `tool_config` - Tool configurations
- `execution_context` - Default variables/context
- `mcp_servers` - MCP server configs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILDER LAYER                             │
│  - User describes what they want                            │
│  - Gemini creates visual workflow                           │
│  - Workflow → Instructions (system prompt)                  │
│  - Saved to database                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXECUTION LAYER                             │
│  - Load instructions from DB                                │
│  - Spawn isolated AI instance                               │
│  - Give AI access to tools                                  │
│  - Let AI work autonomously                                 │
│  - Stream results back                                      │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Building an Agent

User: "I want to find leads on Reddit"

Gemini creates:
1. Visual workflow (for user understanding)
2. Instruction prompt (for execution)
3. Tool configuration (what tools to enable)
4. Execution context (default variables)

Saved to database:
```json
{
  "name": "Reddit Lead Finder",
  "instruction_prompt": "You are a lead generation specialist...",
  "tool_config": {
    "web_scrape": { "enabled": true },
    "ai_process": { "enabled": true },
    "write": { "enabled": true }
  },
  "execution_context": {
    "target_subreddits": ["r/startups"],
    "output_format": "json"
  }
}
```

### 2. Executing an Agent

User clicks "Execute" with input:
```json
{
  "message": "Find AI tool companies",
  "max_results": 50
}
```

System:
1. Creates execution record in `agent_executions`
2. Loads agent config from database
3. Spawns AI instance with:
   - System prompt (instructions)
   - Tools (web_scrape, ai_process, write)
   - User input
4. AI works autonomously using tools
5. Results saved to execution record
6. UI displays output

### 3. Parallel Execution

Multiple users can run the same agent simultaneously:
```
Agent: "Reddit Lead Finder"
├─ Execution 1 (User A, Session: exec-123) → Isolated
├─ Execution 2 (User B, Session: exec-124) → Isolated
├─ Execution 3 (User A, Session: exec-125) → Isolated
└─ Execution 4 (User C, Session: exec-126) → Isolated
```

Each execution:
- Has unique session ID
- Isolated memory
- Can't interfere with others
- Runs in parallel

## Files Created

### Database
- `supabase/migrations/20240222_instruction_based_agents.sql`

### Execution Engine
- `lib/execution-engine/agent-executor.ts` - Core execution logic
- `lib/execution-engine/types.ts` - TypeScript types
- `lib/execution-engine/tool-registry.ts` - Tool registry
- `lib/execution-engine/workflow-to-instructions.ts` - Workflow → Instructions
- `lib/execution-engine/index.ts` - Exports

### Tools
- `lib/execution-engine/tools/web-scrape.ts` - Web scraping
- `lib/execution-engine/tools/ai-process.ts` - AI processing
- `lib/execution-engine/tools/read-data.ts` - Read data
- `lib/execution-engine/tools/write-output.ts` - Write output

### API
- `app/api/agents/[id]/execute/route.ts` - Execution endpoint

### UI
- `components/agent-builder/execution-panel.tsx` - Execution UI

## API Usage

### Execute Agent

```typescript
POST /api/agents/{agentId}/execute

Request:
{
  "input": {
    "message": "Find AI tool companies on Reddit",
    "max_results": 50
  },
  "stream": false  // Set to true for SSE streaming
}

Response:
{
  "executionId": "uuid",
  "sessionId": "exec-123",
  "status": "completed",
  "output": {
    "result": [...],
    "details": "..."
  },
  "toolCalls": [...],
  "tokensUsed": 1234,
  "executionTimeMs": 5678
}
```

### Get Execution Status

```typescript
GET /api/agents/{agentId}/execute?executionId={id}

Response:
{
  "execution": {
    "id": "uuid",
    "status": "completed",
    "output": {...},
    "started_at": "...",
    "completed_at": "...",
    ...
  }
}
```

### Get Recent Executions

```typescript
GET /api/agents/{agentId}/execute

Response:
{
  "executions": [
    {
      "id": "uuid",
      "status": "completed",
      "started_at": "...",
      ...
    },
    ...
  ]
}
```

## Tools Available

### 1. web_scrape
Scrape content from websites
```typescript
{
  "url": "https://reddit.com/r/startups",
  "selectors": [".post-title"],
  "waitFor": 1000
}
```

### 2. ai_process
Process data with AI
```typescript
{
  "data": "raw text data",
  "instruction": "extract company names and emails",
  "format": "json"
}
```

### 3. read
Read data from sources
```typescript
{
  "source": "https://api.example.com/data",
  "type": "url"
}
```

### 4. write
Format and write output
```typescript
{
  "data": {...},
  "format": "json",
  "title": "Results"
}
```

## Next Steps

### Immediate (Week 1)
1. ✅ Run database migration
2. ✅ Test basic execution
3. ⏳ Integrate execution panel into agent builder
4. ⏳ Add tool configuration UI
5. ⏳ Test parallel execution

### Short-term (Week 2)
1. Add more tools (API caller, data transformer)
2. Implement MCP server integration
3. Add execution history viewer
4. Improve error handling
5. Add execution replay

### Medium-term (Week 3-4)
1. Add scheduling (cron jobs)
2. Implement webhooks
3. Add execution analytics
4. Improve tool sandboxing
5. Add execution templates

## Migration Guide

### Running the Migration

```bash
# Connect to Supabase
cd terabits-ai-agent-platform

# Run migration
npx supabase db push

# Or manually in Supabase dashboard:
# Copy contents of supabase/migrations/20240222_instruction_based_agents.sql
# Paste into SQL Editor
# Execute
```

### Updating Existing Agents

Existing agents will continue to work. To enable execution:

1. Generate instruction prompt from workflow:
```typescript
import { generateInstructionPrompt } from '@/lib/execution-engine/workflow-to-instructions'

const prompt = generateInstructionPrompt(agent, nodes, edges)

await supabase
  .from('agents')
  .update({ instruction_prompt: prompt })
  .eq('id', agentId)
```

2. Configure tools:
```typescript
import { extractToolConfig } from '@/lib/execution-engine/workflow-to-instructions'

const toolConfig = extractToolConfig(nodes)

await supabase
  .from('agents')
  .update({ tool_config: toolConfig })
  .eq('id', agentId)
```

## Testing

### Test Basic Execution

```typescript
// Create a simple agent
const agent = {
  name: "Test Agent",
  description: "A test agent",
  instruction_prompt: "You are a helpful assistant. Answer the user's question.",
  tool_config: {
    write: { enabled: true }
  }
}

// Execute
const result = await fetch('/api/agents/{agentId}/execute', {
  method: 'POST',
  body: JSON.stringify({
    input: {
      message: "What is 2+2?"
    }
  })
})

// Should return: { output: { result: "4" }, ... }
```

### Test Tool Usage

```typescript
// Create agent with web scraping
const agent = {
  name: "Web Scraper",
  instruction_prompt: "Scrape the given URL and extract key information.",
  tool_config: {
    web_scrape: { enabled: true },
    ai_process: { enabled: true },
    write: { enabled: true }
  }
}

// Execute
const result = await fetch('/api/agents/{agentId}/execute', {
  method: 'POST',
  body: JSON.stringify({
    input: {
      message: "Scrape https://example.com and summarize the content"
    }
  })
})
```

## Troubleshooting

### Execution Fails

1. Check execution logs:
```sql
SELECT * FROM execution_logs WHERE execution_id = 'xxx';
```

2. Check agent configuration:
```sql
SELECT instruction_prompt, tool_config FROM agents WHERE id = 'xxx';
```

3. Verify tools are enabled:
```sql
SELECT * FROM agent_tools WHERE agent_id = 'xxx';
```

### Tools Not Working

1. Check tool registry:
```typescript
import { getAllToolNames } from '@/lib/execution-engine'
console.log(getAllToolNames())
```

2. Verify tool configuration:
```sql
SELECT tool_config FROM agents WHERE id = 'xxx';
```

3. Check tool execution logs:
```sql
SELECT * FROM execution_logs 
WHERE execution_id = 'xxx' 
AND log_type = 'tool_call';
```

## Summary

This implementation provides:
- ✅ Instruction-based agent execution
- ✅ Parallel execution with isolation
- ✅ Tool system with 4 core tools
- ✅ Execution tracking and logs
- ✅ API for execution and status
- ✅ Basic execution UI

The platform is now ready for users to create and execute AI agents!
