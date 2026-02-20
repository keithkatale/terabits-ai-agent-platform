# Simplified Architecture - Focus on Execution

## Date: February 20, 2026

## Problem Statement

The canvas/visual workflow was causing issues:
- Chat history disappeared when canvas opened
- Nodes weren't properly configured
- Added unnecessary complexity
- Users just want agents that WORK

## Solution: Instruction-Based Agents

**Remove the visual workflow entirely. Focus on what matters: executable agents.**

---

## New Architecture

### 1. Chat-First Building
- User describes what they need in chat
- AI presents a plan (text artifact)
- User approves
- AI generates execution instructions
- Agent is ready to run

### 2. No Visual Canvas
- No workflow nodes
- No edges/connections
- No configuration panels
- Just pure instructions that the executor AI follows

### 3. Simple Execution
- User clicks "Run Agent"
- Provides inputs (if needed)
- Agent executes autonomously
- Results displayed in real-time

---

## Workflow

```
User: "Create an agent that searches Reddit for keyword mentions"
  ↓
AI: Presents plan with capabilities and limitations
  ↓
User: "I approve"
  ↓
AI: Calls generateInstructions() → Agent ready
  ↓
User: Clicks "Run Agent" → Provides keyword
  ↓
Agent: Executes search → Returns results
```

---

## What Was Removed

### From agent-builder.tsx:
- ❌ Canvas view toggle
- ❌ Workflow canvas component
- ❌ Node/edge state management
- ❌ showCanvas logic
- ✅ Simple: Chat (100%) or Chat (30%) + Execution (70%)

### From API route (agent-builder/route.ts):
- ❌ addWorkflowNodes tool
- ❌ addWorkflowEdges tool
- ❌ addSkill tool
- ❌ saveSystemPrompt tool
- ✅ Kept: present_plan, updateAgent, generateInstructions

### From system-prompt.ts:
- ❌ All workflow node format examples
- ❌ Node configuration requirements
- ❌ Canvas-related instructions
- ✅ Focus: Build instructions, not visual workflows

---

## What Remains

### 3 Core Tools:

1. **present_plan**
   - Shows user what the agent will do
   - Lists capabilities and limitations
   - Workflow steps (for understanding, not execution)

2. **updateAgent**
   - Updates agent metadata (name, phase, category)
   - Tracks conversation progress

3. **generateInstructions**
   - Creates execution instructions from the plan
   - Defines what the agent does when it runs
   - Stores in `instruction_prompt` field
   - Marks agent as ready (phase: complete)

---

## Building Flow

### Old (Complex):
1. User approves plan
2. AI calls updateAgent (phase: building)
3. AI calls addWorkflowNodes (creates visual nodes)
4. AI calls addWorkflowEdges (connects nodes)
5. AI calls generateInstructions (converts to instructions)
6. AI calls updateAgent (phase: complete)

### New (Simple):
1. User approves plan
2. AI calls updateAgent (phase: building)
3. AI calls generateInstructions (creates instructions)
4. AI calls updateAgent (phase: complete)
5. Done! Agent ready to run.

---

## Execution Model

### Agent Storage:
```sql
agents table:
  - id
  - name
  - description
  - category
  - conversation_phase (discovery → planning → building → complete)
  - instruction_prompt (THE CORE - what the agent does)
  - tool_config (which tools it can use)
  - execution_context (additional metadata)
```

### When User Runs Agent:
1. Load `instruction_prompt` from database
2. Load `tool_config` to enable appropriate tools
3. Get user inputs
4. Execute with AI runtime (agent-loop.ts)
5. Stream results back to user

---

## Benefits

### For Users:
- ✅ Chat history always visible
- ✅ No confusing visual workflows
- ✅ Agents just work
- ✅ Simple: Describe → Approve → Run

### For Development:
- ✅ Less code to maintain
- ✅ Fewer bugs (no canvas state issues)
- ✅ Faster building (no node creation)
- ✅ Focus on execution quality

### For AI:
- ✅ Clearer instructions (no canvas confusion)
- ✅ Faster responses (fewer tool calls)
- ✅ Better results (focus on instructions)

---

## Files Modified

### Simplified:
- `components/agent-builder/agent-builder.tsx` - Removed canvas, simplified layout
- `app/api/agent-builder/route.ts` - Removed 4 tools, kept 3 essential ones
- `lib/orchestrator/system-prompt.ts` - Removed all canvas/node instructions

### Unchanged:
- `components/agent-builder/chat-panel.tsx` - Still handles chat
- `components/agent-builder/agent-execution-view.tsx` - Still runs agents
- `lib/agent-runtime/agent-loop.ts` - Still executes instructions

---

## Testing Checklist

1. ✅ Create new agent
2. ✅ Describe what you need
3. ✅ AI presents plan
4. ✅ Approve plan
5. ✅ AI generates instructions (no canvas)
6. ✅ Agent marked as complete
7. ✅ Click "Run Agent"
8. ✅ Provide inputs
9. ✅ Agent executes
10. ✅ See results

---

## Next Steps

1. **Test the simplified flow**
   - Create an agent end-to-end
   - Verify no canvas appears
   - Verify chat history persists
   - Verify agent executes properly

2. **Enhance execution view**
   - Show execution progress
   - Display intermediate steps
   - Format results nicely

3. **Add scheduling** (future)
   - Run agents on schedule
   - Email results
   - Webhook notifications

---

## Summary

**We removed the complexity and focused on what matters: building agents that work.**

The platform is now:
- Simpler to use
- Easier to maintain
- More reliable
- Focused on execution

Agents are stored as instructions, not visual workflows. When you run an agent, it executes those instructions autonomously and returns results. That's it. That's all users need.
