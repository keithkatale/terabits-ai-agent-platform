# Complete Workflow Persistence Guide

## Database Migration

Run this SQL migration to add all necessary fields:

```bash
# Apply the migration
psql -h your-db-host -U your-user -d your-database -f supabase/migrations/20240221_enhance_workflow_storage.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/20240221_enhance_workflow_storage.sql`
3. Run the migration

## What Gets Saved

### Node Data (workflow_nodes table)
```typescript
{
  // Core identification
  agent_id: UUID
  node_id: string  // React Flow node ID
  node_type: string  // 'trigger', 'skill', 'condition', 'output'
  label: string
  
  // Position
  position_x: float
  position_y: float
  position_absolute_x: float  // For nested nodes
  position_absolute_y: float
  
  // Dimensions
  width: float
  height: float
  measured: {width: number, height: number}
  
  // Visual state
  z_index: integer
  selected: boolean
  dragging: boolean
  hidden: boolean
  expanded: boolean  // For parent nodes
  
  // Behavior flags
  draggable: boolean
  selectable: boolean
  connectable: boolean
  deletable: boolean
  
  // Hierarchy
  parent_node_id: string  // For grouped nodes
  extent: string  // 'parent' or custom
  
  // Styling
  style: JSONB  // Custom CSS
  class_name: string
  
  // Configuration (MOST IMPORTANT)
  data: JSONB {
    label: string
    nodeTypeKey: string  // 'input-form', 'web-search', etc.
    config: {
      // All node-specific configuration
      // For input-form:
      type: 'input'
      fields: [{
        id, type, label, placeholder,
        validation: {required, minLength, maxLength, pattern}
      }]
      submitButtonText: string
      
      // For web-search:
      query: string
      type: 'search' | 'news' | 'images'
      numResults: number
      
      // For apify-actor:
      actorId: string
      input: Record<string, any>
      timeout: number
      
      // etc...
    }
  }
  
  // Timestamps
  created_at: timestamptz
  updated_at: timestamptz
}
```

### Edge Data (workflow_edges table)
```typescript
{
  // Core identification
  agent_id: UUID
  edge_id: string
  source_node_id: string
  target_node_id: string
  
  // Connection points
  source_handle: string  // ID of source handle
  target_handle: string  // ID of target handle
  
  // Type and label
  edge_type: string  // 'default', 'smoothstep', 'step', 'straight'
  label: string
  
  // Label positioning
  label_x: float
  label_y: float
  label_style: JSONB
  label_bg_style: JSONB
  
  // Visual state
  z_index: integer
  selected: boolean
  hidden: boolean
  animated: boolean
  
  // Behavior flags
  selectable: boolean
  deletable: boolean
  
  // Styling
  style: JSONB  // {stroke, strokeWidth, etc}
  class_name: string
  
  // Markers (arrows)
  marker_start: JSONB  // {type, color, width, height}
  marker_end: JSONB
  
  // Path configuration
  path_options: JSONB  // {offset, borderRadius, etc}
  interaction_width: integer
  
  // Additional data
  data: JSONB
  
  // Timestamps
  created_at: timestamptz
  updated_at: timestamptz
}
```

## Fields Added by Migration

### workflow_nodes
- `width`, `height` - Node dimensions
- `z_index` - Layering order
- `selected`, `dragging` - Visual states
- `draggable`, `selectable`, `connectable`, `deletable` - Behavior flags
- `parent_node_id`, `extent` - Hierarchy/grouping
- `expanded` - Collapse state for parent nodes
- `position_absolute_x`, `position_absolute_y` - Absolute positioning
- `style` - Custom CSS styles (JSONB)
- `class_name` - CSS class
- `hidden` - Visibility flag
- `measured` - Measured dimensions (JSONB)
- `updated_at` - Last update timestamp

### workflow_edges
- `source_handle`, `target_handle` - Connection point IDs
- `animated` - Animation flag
- `hidden` - Visibility flag
- `deletable`, `selectable` - Behavior flags
- `selected` - Selection state
- `z_index` - Layering order
- `label_x`, `label_y` - Label position
- `label_bg_style`, `label_style` - Label styling (JSONB)
- `style` - Custom CSS styles (JSONB)
- `class_name` - CSS class
- `marker_start`, `marker_end` - Arrow markers (JSONB)
- `path_options` - Path configuration (JSONB)
- `interaction_width` - Click area width
- `updated_at` - Last update timestamp

## Why These Fields Matter

1. **Position fields** - Exact node placement on canvas
2. **Dimension fields** - Node size for proper rendering
3. **z_index** - Layering when nodes overlap
4. **Handle IDs** - Multiple connection points per node
5. **Style/class** - Custom visual appearance
6. **Behavior flags** - User interaction permissions
7. **Parent/extent** - Node grouping and nesting
8. **Measured** - Actual rendered dimensions
9. **Markers** - Arrow styles on connections
10. **Path options** - Edge curve and style

## Next Steps

1. Run the SQL migration
2. Update API to save all fields
3. Update API to load all fields
4. Test saving and loading workflows
5. Verify configurations persist correctly
