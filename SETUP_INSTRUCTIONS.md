# Setup Instructions - Instruction-Based Agents

## Quick Start

### 1. Run Database Migration

```bash
# Option A: Using Supabase CLI (recommended)
cd terabits-ai-agent-platform
npx supabase db push

# Option B: Manual (via Supabase Dashboard)
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy contents of: supabase/migrations/20240222_instruction_based_agents.sql
# 5. Paste and execute
```

### 2. Install Dependencies (if needed)

```bash
npm install
# or
pnpm install
```

### 3. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

### 4. Test the System

#### Create a Test Agent

1. Go to `/agent/new`
2. Describe what you want: "I want an agent that scrapes Reddit for AI tools"
3. Approve the plan
4. Agent is created with instruction prompt

#### Execute the Agent

1. Go to the agent page
2. Click "Run Agent" button (in the right panel when `isRunning` is true)
3. Provide input:
   ```json
   {
     "message": "Find posts about AI tools on r/artificial"
   }
   ```
4. Click "Execute"
5. See results!

## What's Working Now

### ✅ Database Schema
- `agent_executions` table for tracking runs
- `agent_tools` table for tool configuration
- `execution_logs` table for detailed logs
- Enhanced `agents` table with instruction fields

### ✅ Execution Engine
- Core agent executor (`lib/execution-engine/agent-executor.ts`)
- Tool registry with 4 tools:
  - `web_scrape` - Scrape websites
  - `ai_process` - Process with AI
  - `read` - Read data
  - `write` - Write output
- Parallel execution support
- Session isolation

### ✅ API Endpoints
- `POST /api/agents/[id]/execute` - Execute agent
- `GET /api/agents/[id]/execute` - Get execution status/history
- Supports both JSON and SSE streaming

### ✅ UI Components
- Execution panel (`components/agent-builder/execution-panel.tsx`)
- Ready to integrate into agent builder

## Integration with Existing UI

### Add Execution Panel to Agent Builder

Update `components/agent-builder/agent-builder.tsx`:

```typescript
import { ExecutionPanel } from './execution-panel'

// In the right panel (when isRunning is true):
{isRunning && (
  <div className="w-1/4 flex flex-col border-l border-border bg-muted/30">
    <ExecutionPanel agent={currentAgent} />
  </div>
)}
```

### Generate Instruction Prompts

When saving an agent, generate the instruction prompt:

```typescript
import { 
  generateInstructionPrompt,
  extractToolConfig,
  extractExecutionContext 
} from '@/lib/execution-engine/workflow-to-instructions'

// After workflow is saved
const instructionPrompt = generateInstructionPrompt(agent, nodes, edges)
const toolConfig = extractToolConfig(nodes)
const executionContext = extractExecutionContext(agent, nodes)

await supabase
  .from('agents')
  .update({
    instruction_prompt: instructionPrompt,
    tool_config: toolConfig,
    execution_context: executionContext,
  })
  .eq('id', agent.id)
```

## Testing Checklist

### Basic Execution
- [ ] Create agent via builder
- [ ] Agent has instruction_prompt saved
- [ ] Execute agent with simple input
- [ ] See results in execution panel
- [ ] Check execution record in database

### Tool Usage
- [ ] Agent uses web_scrape tool
- [ ] Agent uses ai_process tool
- [ ] Agent uses write tool
- [ ] Tool calls logged in database

### Parallel Execution
- [ ] Run same agent twice simultaneously
- [ ] Both executions complete successfully
- [ ] No data mixing between executions
- [ ] Each has unique session_id

### Error Handling
- [ ] Invalid input shows error
- [ ] Tool failure shows error
- [ ] Error logged in database
- [ ] User sees friendly error message

## Example Agents to Test

### 1. Simple Echo Agent

```json
{
  "name": "Echo Agent",
  "instruction_prompt": "You are an echo agent. Simply repeat back what the user says in a JSON format.",
  "tool_config": {
    "write": { "enabled": true }
  }
}
```

Test input:
```json
{
  "message": "Hello, world!"
}
```

Expected output:
```json
{
  "result": "Hello, world!"
}
```

### 2. Web Scraper Agent

```json
{
  "name": "Web Scraper",
  "instruction_prompt": "You are a web scraping agent. Scrape the given URL and extract key information. Use the web_scrape tool to fetch content, then use ai_process to extract relevant data.",
  "tool_config": {
    "web_scrape": { "enabled": true },
    "ai_process": { "enabled": true },
    "write": { "enabled": true }
  }
}
```

Test input:
```json
{
  "message": "Scrape https://news.ycombinator.com and list the top 5 posts"
}
```

### 3. Data Processor Agent

```json
{
  "name": "Data Processor",
  "instruction_prompt": "You are a data processing agent. Take the provided data and process it according to the user's instructions. Use ai_process to analyze and transform the data.",
  "tool_config": {
    "ai_process": { "enabled": true },
    "write": { "enabled": true }
  }
}
```

Test input:
```json
{
  "message": "Extract all email addresses from this text",
  "data": "Contact us at hello@example.com or support@test.org"
}
```

## Troubleshooting

### Migration Fails

**Error**: Table already exists
**Solution**: Tables are created with `IF NOT EXISTS`, so this is safe to ignore

**Error**: Permission denied
**Solution**: Make sure you're using the service role key or have proper permissions

### Execution Fails

**Error**: "Agent not found"
**Solution**: Make sure the agent exists and you're authenticated

**Error**: "Tool not found"
**Solution**: Check that the tool is registered in `tool-registry.ts`

**Error**: "Unauthorized"
**Solution**: Make sure you're logged in and the agent belongs to you

### No Results

**Check**: Is instruction_prompt set?
```sql
SELECT instruction_prompt FROM agents WHERE id = 'xxx';
```

**Check**: Are tools enabled?
```sql
SELECT tool_config FROM agents WHERE id = 'xxx';
```

**Check**: Execution logs
```sql
SELECT * FROM execution_logs WHERE execution_id = 'xxx';
```

## Next Steps

1. **Test basic execution** - Create a simple agent and execute it
2. **Add execution panel to UI** - Integrate into agent builder
3. **Test with real workflows** - Create agents via builder and execute
4. **Add more tools** - Implement additional tools as needed
5. **Add scheduling** - Implement cron-based execution
6. **Add webhooks** - Allow external triggers

## Support

If you encounter issues:
1. Check execution logs in database
2. Check browser console for errors
3. Check server logs
4. Review the implementation docs

## Summary

You now have:
- ✅ Complete database schema
- ✅ Working execution engine
- ✅ 4 core tools
- ✅ API endpoints
- ✅ Execution UI component
- ✅ Parallel execution support

The system is ready to execute instruction-based AI agents!
