# Canvas Persistence Implementation Complete

## Overview
Canvas workflow nodes and edges now persist to the database, surviving page refreshes and agent reopening.

## What Was Implemented

### 1. Database Persistence in Canvas Tools
**File**: `app/api/agent-builder/route.ts`

**addCanvasNode Tool**:
- Saves node to `workflow_nodes` table immediately after creation
- Stores: agent_id, node_id, node_type, label, position_x, position_y, data (with config)
- Server-side state tracking maintained for inspectCanvas

**addCanvasEdge Tool**:
- Saves edge to `workflow_edges` table immediately after creation
- Stores: agent_id, edge_id, source_node_id, target_node_id, label, edge_type
- Animated edges preserved in data

**updateCanvasNode Tool**:
- Updates existing nodes in database
- Merges new config with existing data
- Updates both label and data.config fields

**Workflow Clearing on Rebuild**:
- When user approves plan, old workflow is deleted
- Prevents duplicate nodes from previous builds
- Ensures clean slate for new workflow

### 2. Workflow Loading on Page Load
**File**: `components/agent-builder/agent-builder.tsx`

**Initial Load**:
- Fetches all workflow_nodes and workflow_edges for agent on mount
- Converts database format to ReactFlow format
- Sets nodes and edges state
- Shows loading state until workflow loaded

**Phase Change Reload**:
- Watches for phase changes to 'building' or 'complete'
- Reloads workflow from database when phase changes
- 500ms delay to allow database writes to complete
- Ensures canvas shows latest workflow after approval

### 3. Database Schema (Already Existed)
**Tables Used**:

```sql
workflow_nodes:
- id (UUID, primary key)
- agent_id (UUID, foreign key to agents)
- node_id (TEXT, ReactFlow node ID)
- node_type (TEXT, e.g., "agentNode")
- label (TEXT)
- position_x (FLOAT)
- position_y (FLOAT)
- data (JSONB, contains description, nodeType, config)
- created_at (TIMESTAMPTZ)

workflow_edges:
- id (UUID, primary key)
- agent_id (UUID, foreign key to agents)
- edge_id (TEXT, ReactFlow edge ID)
- source_node_id (TEXT)
- target_node_id (TEXT)
- label (TEXT, nullable)
- edge_type (TEXT, default "default")
- data (JSONB)
- created_at (TIMESTAMPTZ)
```

## How It Works

### Creating Workflow
1. User approves plan
2. AI calls addCanvasNode for each step
3. Tool saves to database AND returns canvas action
4. Chat panel processes canvas action
5. Node appears on canvas in real-time
6. Node is already in database

### Loading Workflow
1. User opens agent page
2. AgentBuilder component mounts
3. useEffect fetches workflow_nodes and workflow_edges
4. Converts to ReactFlow format
5. Sets nodes/edges state
6. Canvas renders with loaded workflow

### Refreshing Page
1. User refreshes browser
2. Page reloads, component remounts
3. useEffect runs again
4. Workflow loaded from database
5. Canvas shows same workflow as before

### Rebuilding Workflow
1. User approves new plan
2. API route detects approval
3. Deletes old workflow_nodes and workflow_edges
4. Resets server-side canvas state
5. AI builds new workflow
6. New nodes/edges saved to database
7. Canvas shows new workflow

## Data Flow

```
AI calls addCanvasNode
  ↓
Tool saves to database (workflow_nodes)
  ↓
Tool returns { __canvasAction: "addNode", ... }
  ↓
Chat panel processes action
  ↓
Calls onAddNode(node)
  ↓
AgentBuilder adds to nodes state
  ↓
Canvas renders node
  ↓
[User refreshes page]
  ↓
AgentBuilder loads from database
  ↓
Canvas renders same nodes
```

## Testing

### Test Persistence
1. Create new agent
2. Approve plan and watch workflow build
3. Refresh the page
4. Verify workflow still shows on canvas
5. Close agent and reopen from dashboard
6. Verify workflow persists

### Test Rebuild
1. Open existing agent with workflow
2. Request changes to plan
3. Approve new plan
4. Verify old workflow clears
5. Verify new workflow builds
6. Refresh page
7. Verify only new workflow shows

## Files Modified
- `app/api/agent-builder/route.ts` - Added database persistence to canvas tools
- `components/agent-builder/agent-builder.tsx` - Added workflow loading and reload logic

## Database Tables Used
- `workflow_nodes` - Stores canvas nodes
- `workflow_edges` - Stores canvas connections

## Key Features
✅ Nodes persist to database immediately when created
✅ Edges persist to database immediately when created
✅ Workflow loads from database on page mount
✅ Workflow reloads when phase changes
✅ Old workflow cleared when rebuilding
✅ Canvas state survives page refresh
✅ Canvas state survives agent close/reopen
✅ Real-time creation still works
✅ No duplicate nodes on rebuild

## Next Steps
- Add node editing UI to update configs
- Add workflow validation before marking complete
- Add workflow export/import
- Add workflow templates
- Add undo/redo for workflow changes
