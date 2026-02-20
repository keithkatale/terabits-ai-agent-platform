# New UX Architecture: Chat-First, Execution-Focused

## Overview

The platform has been redesigned to prioritize the user-friendly chat interface and execution view, with the visual workflow canvas moved to the background as a secondary view.

## Key Changes

### 1. View Toggle System

Users can now switch between two primary views:

- **Chat & Execute** (Default): The main interface where users build agents through conversation and watch them execute
- **Visual Workflow**: The canvas view showing the technical workflow diagram

Toggle is located in the top header bar.

### 2. Chat View (Primary)

**When NOT Running:**
- Full-width chat interface
- Users describe what they want
- AI builds the agent through conversation
- Plan artifacts appear for approval
- Workflow is built in the background

**When Running:**
- Split view: 50% chat, 50% execution
- Chat panel on left (for building/refining)
- Execution panel on right (shows agent working)

### 3. Execution View (User-Friendly)

The execution panel shows what the agent is doing in plain language:

**Step Types:**
- 🔵 **Thinking**: Agent is processing
- 🟡 **Action**: Agent is using a tool
- 🟢 **Result**: Task completed successfully
- 🔴 **Error**: Something went wrong

**Features:**
- Real-time streaming updates
- User-friendly messages (not developer logs)
- Timestamp for each step
- Input field to give agent new tasks
- Stop button to halt execution

**Example Messages:**
- "Starting: Find 10 leads on Reddit about AI tools"
- "Using tool: web_scrape"
- "Completed: web_scrape"
- "Task completed successfully!"

### 4. Canvas View (Secondary)

- Full-screen visual workflow editor
- Shows nodes and connections
- Technical view for advanced users
- Accessible via toggle

## Architecture Flow

### Building an Agent

1. User opens agent builder → **Chat view** (default)
2. User describes what they need
3. AI presents plan artifact for approval
4. User approves → AI builds workflow in background
5. AI automatically generates execution instructions
6. Agent is ready to run

### Running an Agent

1. User clicks "Run Agent" button
2. View splits: Chat (50%) + Execution (50%)
3. User enters task in execution panel
4. Agent executes with real-time updates
5. Results appear in user-friendly format

### Viewing Workflow

1. User clicks "Visual Workflow" toggle
2. Canvas view appears full-screen
3. Shows technical workflow diagram
4. User can edit nodes/connections
5. Click "Chat & Execute" to return

## Technical Implementation

### Components

**New:**
- `agent-execution-view.tsx` - User-friendly execution panel with streaming

**Modified:**
- `agent-builder.tsx` - View toggle system, split layout
- `chat-panel.tsx` - Existing chat interface (unchanged)
- `workflow-canvas.tsx` - Existing canvas (unchanged)

### API Changes

**Execution API** (`/api/agents/[id]/execute`):
- Supports streaming via Server-Sent Events
- Returns user-friendly event types
- Maps tool calls to plain language

**Builder API** (`/api/agent-builder`):
- New `generateInstructions` tool
- Auto-generates execution instructions from workflow
- Saves to `agents.instruction_prompt` column

### Database Schema

**New Columns in `agents` table:**
- `instruction_prompt` (TEXT) - The instructions the AI follows
- `tool_config` (JSONB) - Which tools are enabled
- `execution_context` (JSONB) - Additional context for execution
- `mcp_servers` (JSONB) - MCP server configurations

**New Tables:**
- `agent_executions` - Execution history
- `agent_tools` - Tool configurations per agent
- `agent_mcp_servers` - MCP server configs per agent

## Key Concepts

### Workflow vs Instructions

**Workflow (Visual):**
- What users see in canvas view
- Nodes and connections
- Visual representation
- For understanding and editing

**Instructions (Execution):**
- What the AI actually follows
- Generated from workflow
- Plain text prompt
- For autonomous execution

### The Instruction-Based Model

The platform doesn't execute workflows step-by-step like traditional automation tools. Instead:

1. Workflow is a visual way to configure the agent
2. When saved, workflow converts to instruction prompt
3. When executed, AI reads instructions and works autonomously
4. AI decides which tools to use and when
5. Multiple users can run same agent in parallel (isolated sessions)

This is inspired by OpenClaw's agentic architecture - the AI is given instructions and tools, then works autonomously rather than following a rigid workflow.

## User Experience Goals

### For Non-Technical Users

- **No jargon**: "Run Agent" not "Execute Workflow"
- **Plain language**: "Using tool: web_scrape" not "Invoking web_scrape function"
- **Visual feedback**: Icons and colors for different step types
- **Clear results**: Structured output, not raw JSON

### For Technical Users

- **Canvas view available**: Full workflow editing
- **Execution logs**: Detailed logs in database
- **Tool configuration**: Advanced settings per agent
- **MCP integration**: Custom tool servers

## Migration Path

### Existing Agents

Agents built before this update:
1. Have workflow nodes/edges in database
2. Need instructions generated
3. Run migration or auto-generate on first execution

### New Agents

Agents built after this update:
1. Builder AI automatically calls `generateInstructions`
2. Instructions saved during build process
3. Ready to execute immediately

## Next Steps

1. ✅ Database migration (`20240222_execution_system_clean.sql`)
2. ✅ UI components (execution view, toggle system)
3. ✅ API updates (streaming, instruction generation)
4. ⏳ Test end-to-end flow
5. ⏳ Add execution history view
6. ⏳ Add instruction editing UI (advanced users)
7. ⏳ Add MCP server configuration UI

## Files Changed

### New Files
- `components/agent-builder/agent-execution-view.tsx`
- `supabase/migrations/20240222_execution_system_clean.sql`
- `NEW_UX_ARCHITECTURE.md` (this file)

### Modified Files
- `components/agent-builder/agent-builder.tsx`
- `app/api/agent-builder/route.ts`
- `lib/orchestrator/system-prompt.ts`

### Existing (Unchanged)
- `components/agent-builder/chat-panel.tsx`
- `components/agent-builder/workflow-canvas.tsx`
- `lib/execution-engine/*` (all execution engine files)
