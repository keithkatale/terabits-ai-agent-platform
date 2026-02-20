# Manual Workflow Builder

## Overview

The agent builder now supports **manual workflow creation** with a visual drag-and-drop interface. Users can build agents by manually adding and connecting nodes on a React Flow canvas.

## Layout

### Split View (Always Available)
```
┌─────────────────────────────────────────────────────────┐
│  Header: Agent Name | Phase | Toggle Canvas | Dashboard │
├──────────────────┬──────────────────────────────────────┤
│                  │                                       │
│   Chat Panel     │      React Flow Canvas               │
│   (Left 40%)     │      (Right 60%)                     │
│                  │                                       │
│   - AI Chat      │   - Node Palette (left)              │
│   - Messages     │   - Workflow Canvas (center)         │
│   - Input        │   - Skills Panel (right)             │
│                  │   - Controls & Minimap               │
│                  │                                       │
└──────────────────┴──────────────────────────────────────┘
```

## Features

### 1. Node Palette (Left Side of Canvas)

A collapsible panel with 4 node types:

#### Trigger Node (Blue)
- **Icon:** ⚡ Zap
- **Purpose:** Start the workflow
- **Examples:** 
  - Schedule (daily, weekly, monthly)
  - Webhook
  - Manual trigger
  - Event listener

#### Action Node (Purple)
- **Icon:** 🧠 Brain
- **Purpose:** Process or transform data
- **Examples:**
  - Web search
  - API call
  - Data transformation
  - AI processing
  - Send email

#### Condition Node (Amber)
- **Icon:** 🔀 GitBranch
- **Purpose:** Branch based on logic
- **Examples:**
  - If/else logic
  - Filter data
  - Route based on conditions
  - Validate input

#### Output Node (Green)
- **Icon:** 📤 Send
- **Purpose:** Send results
- **Examples:**
  - Email notification
  - Webhook callback
  - Database save
  - API response

### 2. Canvas Interactions

#### Adding Nodes
1. Click any node type in the palette
2. Node appears at a random position on canvas
3. Drag to reposition

#### Connecting Nodes
1. Click and drag from a node's output handle
2. Drop on another node's input handle
3. Connection appears as animated smoothstep edge

#### Moving Nodes
- Click and drag any node to reposition
- Canvas auto-saves positions

#### Deleting
- Select node or edge
- Press Delete/Backspace key

#### Zooming & Panning
- Mouse wheel to zoom
- Click and drag canvas to pan
- Use controls in bottom-left corner

### 3. Canvas Controls

Located in bottom-left corner:
- **Zoom In** (+)
- **Zoom Out** (-)
- **Fit View** (⊡)
- **Lock/Unlock** (🔒)

### 4. Minimap

Located in bottom-right corner:
- Shows overview of entire workflow
- Click to navigate
- Drag to pan
- Zoom to focus

### 5. Skills Panel (Right Side)

Shows active skills for the agent:
- Green dot = Active
- Gray dot = Inactive
- Skill name

### 6. Chat Panel (Left Side)

Remains functional for:
- Asking questions
- Getting AI suggestions
- Describing requirements
- Testing workflows

## Workflow

### Manual Creation Flow

1. **Create Agent**
   - User creates new agent from dashboard
   - Split view opens with empty canvas

2. **Add Nodes**
   - Click "Trigger" to add start node
   - Click "Action" to add processing nodes
   - Click "Condition" for branching logic
   - Click "Output" to add end node

3. **Connect Nodes**
   - Drag from output handle to input handle
   - Create workflow logic flow

4. **Configure Nodes**
   - Click node to select
   - Edit properties in side panel (future)
   - Set parameters and options

5. **Test & Deploy**
   - Test workflow with sample data
   - Deploy when ready

### Example Workflow: Reddit Lead Scout

```
┌─────────────┐
│   Trigger   │ Daily at 9 AM
│  (Schedule) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Action    │ Search Reddit for keyword
│ (Web Search)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Condition  │ Filter relevant posts
│   (Filter)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Output    │ Send email with URLs
│   (Email)   │
└─────────────┘
```

## Node Types Details

### Trigger Node
```typescript
{
  id: 'trigger-1',
  type: 'trigger',
  data: {
    label: 'Daily Check',
    schedule: 'daily',
    time: '09:00',
  }
}
```

### Action Node
```typescript
{
  id: 'skill-1',
  type: 'skill',
  data: {
    label: 'Web Search',
    skillType: 'research',
    parameters: {
      query: 'AI tools on Reddit',
      sources: ['reddit.com'],
    }
  }
}
```

### Condition Node
```typescript
{
  id: 'condition-1',
  type: 'condition',
  data: {
    label: 'Filter Results',
    logic: 'relevance > 0.7',
  }
}
```

### Output Node
```typescript
{
  id: 'output-1',
  type: 'output',
  data: {
    label: 'Send Email',
    outputType: 'email',
    recipient: 'user@example.com',
  }
}
```

## Canvas Features

### Auto-Save
- Node positions saved automatically
- Connections saved on creation
- Debounced to avoid excessive API calls

### Validation
- Prevents invalid connections
- Ensures workflow has start and end
- Validates node configurations

### Undo/Redo (Future)
- Ctrl+Z to undo
- Ctrl+Shift+Z to redo
- History of changes

### Copy/Paste (Future)
- Ctrl+C to copy selected nodes
- Ctrl+V to paste
- Duplicate workflows

## Integration with Chat

The chat panel remains active for:

### AI Assistance
- "How do I filter Reddit posts?"
- "What's the best way to schedule this?"
- "Can you suggest a workflow for lead generation?"

### Quick Actions
- "Add a web search node"
- "Connect these nodes"
- "Test this workflow"

### Explanations
- "What does this condition do?"
- "How does the trigger work?"
- "Explain this workflow"

## Database Schema

### workflow_nodes
```sql
CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL, -- trigger, skill, condition, output
  label TEXT NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workflow_edges
```sql
CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label TEXT,
  edge_type TEXT DEFAULT 'smoothstep',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Save Workflow
```typescript
POST /api/agents/[id]/workflow
{
  nodes: Node[],
  edges: Edge[]
}
```

### Load Workflow
```typescript
GET /api/agents/[id]/workflow
Response: {
  nodes: Node[],
  edges: Edge[]
}
```

### Validate Workflow
```typescript
POST /api/agents/[id]/workflow/validate
{
  nodes: Node[],
  edges: Edge[]
}
Response: {
  valid: boolean,
  errors: string[]
}
```

## Keyboard Shortcuts

- **Delete**: Remove selected node/edge
- **Ctrl+Z**: Undo (future)
- **Ctrl+Shift+Z**: Redo (future)
- **Ctrl+C**: Copy (future)
- **Ctrl+V**: Paste (future)
- **Space**: Pan mode
- **Ctrl+Scroll**: Zoom

## Mobile Support

- Canvas hidden on mobile (< 768px)
- Chat-only mode on small screens
- Responsive layout for tablets

## Future Enhancements

### Node Configuration Panel
- Click node to open side panel
- Edit properties and parameters
- Preview node output

### Node Templates
- Pre-built node configurations
- Common workflow patterns
- Drag from template library

### Workflow Templates
- Complete workflow examples
- Industry-specific templates
- One-click import

### Collaboration
- Real-time multi-user editing
- Comments on nodes
- Version history

### Testing
- Test individual nodes
- Run workflow with sample data
- Debug mode with step-through

### Analytics
- Workflow execution stats
- Node performance metrics
- Error tracking

## Files Modified

1. `components/agent-builder/workflow-canvas.tsx` - Added node palette and manual editing
2. `components/agent-builder/agent-builder.tsx` - Always show canvas, removed phase-based hiding
3. `MANUAL_WORKFLOW_BUILDER.md` - This documentation

## Related Files

- `components/agent-builder/nodes/trigger-node.tsx` - Trigger node component
- `components/agent-builder/nodes/skill-node.tsx` - Action node component
- `components/agent-builder/nodes/condition-node.tsx` - Condition node component
- `components/agent-builder/nodes/output-node.tsx` - Output node component

---

**Status:** ✅ Complete - Manual workflow builder ready
**Date:** February 20, 2026
