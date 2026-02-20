# Message and Node Persistence Fix

## Issues Fixed

### 1. Chat Messages Not Loading
**Problem**: Messages were being saved to database but not loaded back when reopening the agent.

**Root Cause**: The `useChat` hook from AI SDK doesn't support `initialMessages` prop directly. Messages were being loaded but not set into the chat state.

**Solution**: 
- Use `setMessages` from `useChat` hook to programmatically set loaded messages
- Load messages only once using `messagesLoadedRef` to prevent loops
- Load messages when `status === 'ready'` and `messages.length === 0`
- Convert database messages to AI SDK `UIMessage` format with proper structure

**Code Changes** (`chat-panel.tsx`):
```typescript
const { messages, sendMessage, status, setMessages } = useChat({ transport })

useEffect(() => {
  if (messagesLoadedRef.current) return
  
  const loadMessages = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('message_type', 'builder')
      .order('created_at', { ascending: true })
      .limit(50)

    if (data && data.length > 0) {
      const uiMessages: UIMessage[] = data.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        parts: [
          {
            type: 'text' as const,
            text: msg.content,
          },
        ],
      }))
      setMessages(uiMessages)
      messagesLoadedRef.current = true
    }
  }
  
  if (messages.length === 0 && status === 'ready') {
    loadMessages()
  }
}, [agent.id, messages.length, status, setMessages])
```

### 2. Node Details Lost on Reload
**Problem**: Nodes were showing without description and config when page was refreshed. Only label was visible.

**Root Cause**: The `data` field from database was being used directly without ensuring all required fields were present. The node components expect specific fields in `data` object.

**Solution**:
- Spread the database `data` object first
- Then explicitly set required fields with fallbacks
- Ensure `label`, `description`, `nodeType`, and `config` are always present
- Use database `label` field as fallback if not in data

**Code Changes** (`agent-builder.tsx`):
```typescript
const flowNodes: Node[] = dbNodes.map((n) => ({
  id: n.node_id,
  type: n.node_type,
  position: { x: n.position_x, y: n.position_y },
  data: {
    ...n.data,
    // Ensure all required fields are present
    label: n.data?.label || n.label,
    description: n.data?.description || '',
    nodeType: n.data?.nodeType || 'action',
    config: n.data?.config || {},
  },
}))
```

## How It Works Now

### Message Flow
1. **Saving**:
   - User sends message → saved to database immediately
   - AI responds → assistant message saved when status becomes 'ready'
   - Both user and assistant messages persist

2. **Loading**:
   - Component mounts → checks if messages.length === 0
   - Fetches messages from database
   - Converts to UIMessage format
   - Calls setMessages() to populate chat
   - Sets messagesLoadedRef to prevent re-loading

3. **Result**:
   - Chat history appears when reopening agent
   - All previous messages visible
   - Can continue conversation from where left off

### Node Data Flow
1. **Saving**:
   - AI calls addCanvasNode with full data
   - Tool saves to workflow_nodes with complete data object:
     ```json
     {
       "label": "Search Reddit",
       "description": "Searches Reddit for keyword",
       "nodeType": "action",
       "config": {
         "actionType": "web_search",
         "query": "{{keyword}}"
       }
     }
     ```

2. **Loading**:
   - Component mounts → fetches workflow_nodes
   - Spreads database data object
   - Ensures all required fields present with fallbacks
   - Creates ReactFlow nodes with complete data

3. **Result**:
   - Nodes show full detail on reload
   - Description visible
   - Config displayed (first 3 fields)
   - Nodes look identical to when first created

## Testing

### Test Message Persistence
1. Create new agent
2. Have conversation with AI
3. Approve plan and build workflow
4. Close browser tab
5. Reopen agent from dashboard
6. ✅ Verify all messages appear
7. ✅ Verify can continue conversation

### Test Node Persistence
1. Create new agent
2. Build workflow with detailed nodes
3. Verify nodes show description and config
4. Refresh page
5. ✅ Verify nodes still show description
6. ✅ Verify nodes still show config
7. ✅ Verify nodes look identical

### Test Both Together
1. Create agent and build workflow
2. Close and reopen
3. ✅ Messages persist
4. ✅ Nodes persist with full detail
5. ✅ Can continue building

## Files Modified
- `components/agent-builder/chat-panel.tsx` - Fixed message loading with setMessages
- `components/agent-builder/agent-builder.tsx` - Fixed node data loading with proper field mapping

## Database Tables Used
- `messages` - Stores chat messages (user and assistant)
- `workflow_nodes` - Stores canvas nodes with full data
- `workflow_edges` - Stores canvas connections

## Key Improvements
✅ Chat messages load on agent reopen
✅ Node descriptions persist
✅ Node configs persist
✅ Nodes look identical after reload
✅ Can continue conversations
✅ No data loss on page refresh
✅ Proper data structure mapping
✅ Fallbacks for missing fields

## Debug Logging
Added console.log statements to verify:
- `console.log('Loading nodes from database:', dbNodes)` - Shows raw database data
- `console.log('Converted to flow nodes:', flowNodes)` - Shows converted ReactFlow format

These can be removed in production but are helpful for debugging persistence issues.
