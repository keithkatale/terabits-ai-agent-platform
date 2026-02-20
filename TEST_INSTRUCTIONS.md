# Test Instructions - Step by Step

## Prerequisites

✅ AI SDK already installed in package.json
✅ API route replaced
✅ Chat panel replaced
✅ Execution view updated

## Step 1: Run Database Migrations

Open Supabase SQL Editor and run these migrations in order:

### Migration 1: Execution System
```sql
-- File: supabase/migrations/20240222_execution_system_clean.sql
-- Copy and paste the entire file content into Supabase SQL Editor
-- Click "Run"
```

### Migration 2: Messages Table
```sql
-- File: supabase/migrations/20240222_ensure_messages_table.sql
-- Copy and paste the entire file content into Supabase SQL Editor
-- Click "Run"
```

**Expected Result**: Both migrations should run without errors

## Step 2: Start Development Server

```bash
cd terabits-ai-agent-platform
npm run dev
```

**Expected Result**: Server starts on http://localhost:3000

## Step 3: Test Message Persistence

1. Go to http://localhost:3000/dashboard
2. Click "Create New Agent" or open existing agent
3. Send a message: "Hi, I want to create a lead finder"
4. Wait for AI response
5. **Refresh the page** (Cmd+R or Ctrl+R)
6. ✅ **PASS**: Your message and AI response should still be there
7. ❌ **FAIL**: If messages disappear, check browser console for errors

## Step 4: Test Workflow Building

1. Create a new agent or continue with existing
2. Send: "Create an agent that finds leads on Reddit about AI tools"
3. AI should present a plan artifact
4. Click "Approve & Build"
5. Watch the chat - you should see tool calls:
   - ✅ "Updating agent configuration"
   - ✅ "Building workflow nodes"
   - ✅ "Connecting workflow edges"
   - ✅ "Generating execution instructions"
6. Click "Visual Workflow" tab in top right
7. ✅ **PASS**: You should see nodes and connections on the canvas
8. ❌ **FAIL**: If canvas is empty, check:
   - Browser console for errors
   - Network tab - check `/api/agent-builder` response
   - Supabase - check `workflow_nodes` and `workflow_edges` tables

## Step 5: Test Execution with Dynamic Inputs

### If Trigger Node Has Config:

1. After building agent, click "Run Agent" button
2. View should split: Chat (left) + Execution (right)
3. Execution panel should show:
   - Custom input fields based on trigger config
   - Custom button label
4. Fill in the fields
5. Click the execute button
6. ✅ **PASS**: Should see real-time execution steps
7. ❌ **FAIL**: If generic input shows instead, trigger node config is missing

### If No Trigger Config:

1. Click "Run Agent"
2. Should see generic input: "Tell your agent what to do..."
3. Type: "Find 10 leads on Reddit about AI tools"
4. Click "Execute"
5. ✅ **PASS**: Should see execution steps
6. ❌ **FAIL**: Check browser console for errors

## Step 6: Verify Database

Open Supabase Table Editor:

### Check Messages Table
```sql
SELECT * FROM messages 
WHERE agent_id = 'YOUR_AGENT_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

✅ **PASS**: Should see your chat messages

### Check Workflow Nodes
```sql
SELECT * FROM workflow_nodes 
WHERE agent_id = 'YOUR_AGENT_ID';
```

✅ **PASS**: Should see nodes created by AI

### Check Workflow Edges
```sql
SELECT * FROM workflow_edges 
WHERE agent_id = 'YOUR_AGENT_ID';
```

✅ **PASS**: Should see edges connecting nodes

### Check Agent Instructions
```sql
SELECT instruction_prompt, tool_config 
FROM agents 
WHERE id = 'YOUR_AGENT_ID';
```

✅ **PASS**: `instruction_prompt` should have text, `tool_config` should have JSON

## Common Issues & Fixes

### Issue 1: "Cannot find module 'ai'"

**Fix**:
```bash
npm install ai @ai-sdk/google @ai-sdk/react
```

### Issue 2: Nodes not appearing on canvas

**Debug**:
1. Open browser console
2. Look for errors in Network tab
3. Check `/api/agent-builder` response
4. Look for `toolInvocations` in response
5. Check if `__canvasAction` is present

**Fix**: Tool must return `__canvasAction: 'addNodes'` with nodes array

### Issue 3: Messages not persisting

**Debug**:
1. Check Supabase - does `messages` table exist?
2. Check RLS policies - are they enabled?
3. Check browser console for 403 errors

**Fix**: Run migrations, check RLS policies

### Issue 4: Execution not working

**Debug**:
1. Check if `instruction_prompt` exists in agents table
2. Check if execution API endpoint exists
3. Check browser console for errors

**Fix**: AI must call `generateInstructions` tool after building

## Success Criteria

All of these should work:

- ✅ Messages persist across page refreshes
- ✅ Workflow nodes appear on canvas when AI builds them
- ✅ Workflow edges connect nodes properly
- ✅ Execution view shows trigger-based inputs (if configured)
- ✅ Execution view shows generic input (if no trigger)
- ✅ Real-time execution steps appear
- ✅ Multiple users can chat with same agent (isolated sessions)

## If Everything Fails

Rollback to old version:

```bash
# Restore old API
mv app/api/agent-builder/route.ts app/api/agent-builder/route-new.ts
mv app/api/agent-builder/route-old.ts app/api/agent-builder/route.ts

# Restore old chat panel
mv components/agent-builder/chat-panel.tsx components/agent-builder/chat-panel-new.tsx
mv components/agent-builder/chat-panel-old.tsx components/agent-builder/chat-panel.tsx

# Restart server
npm run dev
```

## Getting Help

If tests fail:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Check Supabase logs
4. Share error messages for debugging

## Next Steps After Testing

Once all tests pass:

1. Delete old backup files:
   - `app/api/agent-builder/route-old.ts`
   - `components/agent-builder/chat-panel-old.tsx`

2. Test with multiple agents
3. Test with multiple users
4. Add execution history view
5. Polish UI/UX
