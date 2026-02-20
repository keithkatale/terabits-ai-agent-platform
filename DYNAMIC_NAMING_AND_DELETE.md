# Dynamic Agent Naming & Delete Functionality

## Overview

Implemented intelligent agent naming that updates dynamically based on conversation context, and added delete functionality to the dashboard.

## Features Implemented

### 1. Dynamic Agent Naming ✅

**Problem Solved:**
- All agents were named "New AI Employee"
- Names didn't reflect what the agent actually does
- If user started with greeting, agent would be named based on that

**Solution:**
The AI now intelligently updates agent names throughout the conversation:

#### Initial Creation
- Agent starts with timestamp-based temporary name: `"New Agent (Feb 20, 3:45 PM)"`
- Prevents all agents from having the same name

#### Smart Name Updates
The AI updates the name based on understanding:

**Example 1: User starts with greeting**
```
User: "Hi there!"
AI: "Hello! What kind of tasks do you need help with?"
[Name stays: "New Agent (Feb 20, 3:45 PM)"]

User: "I want to track Reddit posts about AI tools"
AI: [Updates name to "Reddit AI Tools Tracker"]
```

**Example 2: User provides direct requirements**
```
User: "Create an agent that scrapes posts about project management"
AI: [Immediately updates name to "Project Management Post Scraper"]
```

**Example 3: Purpose changes during conversation**
```
User: "I want to track Reddit posts"
AI: [Updates name to "Reddit Post Tracker"]

User: "Actually, focus on LinkedIn posts about sales"
AI: [Updates name to "LinkedIn Sales Post Tracker"]
```

#### Naming Guidelines
The AI follows these rules:
- **Specific and descriptive**: Include domain/topic
- **Action-oriented**: Include the action (Tracker, Finder, Assistant, Analyzer, etc.)
- **Clear purpose**: Anyone should understand what it does

**Good Examples:**
- "Customer Email Assistant"
- "Reddit Lead Finder"
- "Daily Tech News Summarizer"
- "LinkedIn Post Analyzer"
- "Sales Report Generator"
- "Project Management Tool Finder"

**Bad Examples:**
- "New AI Employee" (too generic)
- "Agent" (no context)
- "Hello" (based on greeting)
- "My Agent" (not descriptive)

#### Update Frequency
Name updates whenever:
- User clarifies or changes the purpose
- AI understands the use case better
- Scope changes significantly
- More specific information emerges

### 2. Delete Functionality ✅

**Features:**
- Delete button appears on hover over agent cards
- Confirmation dialog before deletion
- Cascade deletion (removes all related data)
- Loading state during deletion
- Auto-refresh after deletion

**UI/UX:**
- Trash icon in top-right corner of agent card
- Only visible on hover (clean interface)
- Confirmation dialog with clear warning
- Shows agent name in confirmation
- Disabled state while deleting

**Security:**
- Ownership verification (users can only delete their own agents)
- Server-side validation
- Proper error handling

## Files Modified

### System Prompt
- `lib/orchestrator/system-prompt.ts`
  - Added "Dynamic Naming" rule
  - Added "Naming Strategy" section with detailed guidelines
  - Updated example flows to show name updates

### Agent Creation
- `app/agent/new/page.tsx`
  - Changed from "New AI Employee" to timestamp-based name
  - Format: "New Agent (Feb 20, 3:45 PM)"

### Dashboard
- `components/dashboard/agent-list.tsx`
  - Added delete button with hover effect
  - Added confirmation dialog
  - Added delete handler with API call
  - Added loading states

### API Routes
- `app/api/agents/[id]/route.ts` (NEW)
  - DELETE endpoint for agent deletion
  - PATCH endpoint for agent updates
  - Ownership verification
  - Error handling

## How It Works

### Name Update Flow

1. **User sends message**
2. **AI analyzes content**
3. **If requirements detected:**
   - AI calls `updateAgent` tool
   - Updates `name` field
   - Updates `category` if needed
   - Updates `conversation_phase` if needed
4. **Database updates**
5. **UI reflects new name immediately**

### Delete Flow

1. **User hovers over agent card**
2. **Delete button appears**
3. **User clicks delete**
4. **Confirmation dialog opens**
5. **User confirms**
6. **API call to `/api/agents/[id]`**
7. **Server verifies ownership**
8. **Database cascade delete:**
   - Agent record
   - Workflow nodes
   - Workflow edges
   - Agent skills
   - Messages
   - Memory entries
   - Schedules
   - Execution logs
9. **UI refreshes**
10. **Agent removed from list**

## Database Cascade

When an agent is deleted, these related records are automatically deleted (via foreign key CASCADE):

- `workflow_nodes` (agent_id)
- `workflow_edges` (agent_id)
- `agent_skills` (agent_id)
- `messages` (agent_id)
- `agent_memory` (agent_id)
- `agent_schedules` (agent_id)
- `execution_logs` (agent_id)
- `agent_sessions` (agent_id)
- `agent_tool_policies` (agent_id)

## Testing

### Test Dynamic Naming

**Test 1: Greeting First**
```
1. Create new agent
2. Initial name: "New Agent (Feb 20, 3:45 PM)"
3. Send: "Hi"
4. AI responds, name stays same
5. Send: "I want to track Reddit posts about AI"
6. AI updates name to "Reddit AI Post Tracker"
```

**Test 2: Direct Requirements**
```
1. Create new agent
2. Initial name: "New Agent (Feb 20, 3:45 PM)"
3. Send: "Create an agent that analyzes LinkedIn posts"
4. AI immediately updates name to "LinkedIn Post Analyzer"
```

**Test 3: Purpose Changes**
```
1. Create new agent
2. Send: "Track Reddit posts"
3. Name becomes: "Reddit Post Tracker"
4. Send: "Actually, focus on Twitter instead"
5. Name updates to: "Twitter Post Tracker"
```

### Test Delete Functionality

**Test 1: Basic Delete**
```
1. Go to dashboard
2. Hover over agent card
3. Delete button appears
4. Click delete
5. Confirmation dialog opens
6. Click "Delete"
7. Agent is removed
8. Dashboard refreshes
```

**Test 2: Cancel Delete**
```
1. Click delete button
2. Confirmation dialog opens
3. Click "Cancel"
4. Dialog closes
5. Agent remains
```

**Test 3: Multiple Agents**
```
1. Create 3 agents
2. Delete middle one
3. Other two remain
4. Create new agent
5. All agents have unique names
```

## Benefits

### Dynamic Naming
1. **Better Organization**: Users can quickly identify agents
2. **No Confusion**: Each agent has a unique, descriptive name
3. **Context Aware**: Names reflect actual purpose
4. **Automatic**: No manual naming required
5. **Adaptive**: Updates as understanding improves

### Delete Functionality
1. **Clean Dashboard**: Remove unwanted agents
2. **Safe**: Confirmation prevents accidents
3. **Complete**: Cascade deletion removes all data
4. **Fast**: Immediate UI update
5. **Secure**: Ownership verification

## Future Enhancements

### Naming
- [ ] Allow manual name editing
- [ ] Suggest alternative names
- [ ] Name validation (length, uniqueness)
- [ ] Name history/versioning

### Delete
- [ ] Soft delete (archive instead of permanent delete)
- [ ] Bulk delete (select multiple agents)
- [ ] Restore deleted agents (within 30 days)
- [ ] Export agent before deletion

## Summary

The system now intelligently names agents based on conversation context and allows users to delete unwanted agents. This solves the "all agents named the same" problem and provides essential dashboard management functionality.

Key improvements:
- ✅ Timestamp-based initial names
- ✅ Dynamic name updates during conversation
- ✅ Smart handling of greetings vs. requirements
- ✅ Delete with confirmation
- ✅ Cascade deletion of related data
- ✅ Ownership verification
- ✅ Clean UI/UX
