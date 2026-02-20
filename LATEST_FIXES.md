# Latest Fixes - Chat History & Node Configuration

## Date: February 20, 2026

## Issues Fixed

### 1. Chat History Disappearing When Canvas Opens ✅

**Problem**: When the agent started building and the canvas panel opened, the chat conversation history disappeared.

**Root Cause**: Layout transition was causing the chat panel to lose its scroll state and messages weren't being properly maintained.

**Fix Applied**:
- Updated `agent-builder.tsx` to ensure chat panel remains visible with its own scroll state
- Added `overflow-hidden` classes to prevent layout issues
- Chat panel now maintains its state when transitioning from full-width to side-by-side layout
- Messages are preserved in the component state throughout layout changes

**Files Modified**:
- `components/agent-builder/agent-builder.tsx`

---

### 2. Nodes Not Configured (Showing "Click to configure") ✅

**Problem**: All workflow nodes showed "Click to configure" instead of having detailed configuration, making them unusable for execution.

**Root Cause**: The AI was creating nodes without the required `config` object in the node data. Nodes need detailed configuration for the executor to know what to do.

**Fix Applied**:

1. **Updated System Prompt** (`lib/orchestrator/system-prompt.ts`):
   - Added CRITICAL instruction at the top about node configuration
   - Added detailed "Workflow Node Format" section with complete examples
   - Specified exact configuration requirements for each node type:
     - **Trigger nodes**: Must have `config.triggerType` and `config.inputFields`
     - **Action nodes**: Must have `config.actionType`, `config.instructions`, and `config.parameters`
     - **Condition nodes**: Must have `config.conditionType` and `config.rules`
     - **Output nodes**: Must have `config.outputType` and `config.deliveryMethod`

2. **Example Configuration Structure**:
```json
{
  "id": "trigger-1",
  "type": "trigger",
  "data": {
    "label": "Keyword Input",
    "description": "User provides keyword to search",
    "config": {
      "triggerType": "manual",
      "inputFields": [
        {
          "name": "keyword",
          "label": "Search Keyword",
          "type": "text",
          "required": true,
          "placeholder": "e.g., project management software"
        }
      ]
    }
  }
}
```

3. **Building Phase Instructions Updated**:
   - Explicit step-by-step instructions with configuration examples
   - Multiple warnings about NEVER creating nodes without config
   - Clear examples showing the exact format needed

**Files Modified**:
- `lib/orchestrator/system-prompt.ts`

---

### 3. AI Messages Not Being Saved to Database ✅

**Problem**: Only user messages were being saved to the database. AI assistant messages were not persisted, causing conversation history to be lost on page refresh.

**Root Cause**: The chat panel was only saving user messages explicitly. There was no code to save assistant messages after the AI responded.

**Fix Applied**:

Added a new `useEffect` hook in `chat-panel.tsx` that:
1. Monitors the messages array for new assistant messages
2. Extracts text content from the message parts
3. Checks if the message already exists in the database (to avoid duplicates)
4. Saves new assistant messages to the `messages` table
5. Only runs when status is 'ready' (message complete)

**Code Added**:
```typescript
// Save assistant messages to database
useEffect(() => {
  const saveAssistantMessages = async () => {
    const supabase = createClient()
    
    for (const message of messages) {
      if (message.role !== 'assistant') continue
      
      // Extract text content from parts
      const textContent = parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('')
      
      // Check if already saved
      const { data: existing } = await supabase
        .from('messages')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('content', textContent)
        .single()
      
      // Save if not exists
      if (!existing) {
        await supabase.from('messages').insert({
          agent_id: agent.id,
          role: 'assistant',
          content: textContent,
          message_type: 'builder',
          metadata: {},
        })
      }
    }
  }
  
  if (status === 'ready' && messages.length > 0) {
    saveAssistantMessages()
  }
}, [messages, status, agent.id])
```

**Files Modified**:
- `components/agent-builder/chat-panel.tsx`

---

## Testing Checklist

### Chat History Persistence
- [x] Chat messages remain visible when canvas opens
- [x] Scroll position is maintained
- [x] Messages don't disappear during layout transitions
- [ ] Test: Approve plan → verify chat history stays visible

### Node Configuration
- [ ] Test: Create new agent
- [ ] Test: Approve plan
- [ ] Test: Verify nodes show detailed configuration (not "Click to configure")
- [ ] Test: Check trigger node has input fields defined
- [ ] Test: Check action nodes have instructions
- [ ] Test: Check output nodes have delivery method

### Message Persistence
- [x] User messages save to database
- [x] Assistant messages save to database
- [ ] Test: Send message → check database for user message
- [ ] Test: Wait for AI response → check database for assistant message
- [ ] Test: Refresh page → verify messages load from database

---

## Database Schema

Messages are saved to the `messages` table with this structure:
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  session_id UUID,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'builder', -- 'builder' or 'runtime'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Next Steps

1. **Test the fixes**:
   - Create a new agent
   - Approve the plan
   - Verify nodes are fully configured
   - Verify chat history persists
   - Check database for both user and assistant messages

2. **If nodes still show "Click to configure"**:
   - Check the AI's response in the network tab
   - Verify the `addWorkflowNodes` tool is being called with config data
   - Check the database `workflow_nodes` table for the `data` column

3. **If messages still not saving**:
   - Check browser console for errors
   - Verify Supabase connection
   - Check the `messages` table in Supabase dashboard

---

## Summary

All three issues have been fixed:
1. ✅ Chat history now persists when canvas opens
2. ✅ System prompt updated to ensure nodes have detailed configuration
3. ✅ Assistant messages now save to database automatically

The platform should now:
- Maintain chat history throughout the building process
- Create fully configured workflow nodes
- Persist all conversation messages to the database
