-- Migration: Enhance workflow storage for complete node and edge persistence
-- Date: 2024-02-21
-- Description: Adds fields to store complete workflow state including configurations, positions, and connections

-- ============================================
-- WORKFLOW_NODES TABLE ENHANCEMENTS
-- ============================================

-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Add width and height for node dimensions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'width') THEN
    ALTER TABLE workflow_nodes ADD COLUMN width FLOAT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'height') THEN
    ALTER TABLE workflow_nodes ADD COLUMN height FLOAT;
  END IF;

  -- Add z-index for layering
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'z_index') THEN
    ALTER TABLE workflow_nodes ADD COLUMN z_index INTEGER DEFAULT 0;
  END IF;

  -- Add selected state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'selected') THEN
    ALTER TABLE workflow_nodes ADD COLUMN selected BOOLEAN DEFAULT false;
  END IF;

  -- Add dragging state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'dragging') THEN
    ALTER TABLE workflow_nodes ADD COLUMN dragging BOOLEAN DEFAULT false;
  END IF;

  -- Add draggable flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'draggable') THEN
    ALTER TABLE workflow_nodes ADD COLUMN draggable BOOLEAN DEFAULT true;
  END IF;

  -- Add selectable flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'selectable') THEN
    ALTER TABLE workflow_nodes ADD COLUMN selectable BOOLEAN DEFAULT true;
  END IF;

  -- Add connectable flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'connectable') THEN
    ALTER TABLE workflow_nodes ADD COLUMN connectable BOOLEAN DEFAULT true;
  END IF;

  -- Add deletable flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'deletable') THEN
    ALTER TABLE workflow_nodes ADD COLUMN deletable BOOLEAN DEFAULT true;
  END IF;

  -- Add parent node reference for grouping
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'parent_node_id') THEN
    ALTER TABLE workflow_nodes ADD COLUMN parent_node_id TEXT;
  END IF;

  -- Add extent for boundaries
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'extent') THEN
    ALTER TABLE workflow_nodes ADD COLUMN extent TEXT; -- 'parent' or custom
  END IF;

  -- Add expand/collapse state for parent nodes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'expanded') THEN
    ALTER TABLE workflow_nodes ADD COLUMN expanded BOOLEAN DEFAULT true;
  END IF;

  -- Add position absolute flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'position_absolute_x') THEN
    ALTER TABLE workflow_nodes ADD COLUMN position_absolute_x FLOAT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'position_absolute_y') THEN
    ALTER TABLE workflow_nodes ADD COLUMN position_absolute_y FLOAT;
  END IF;

  -- Add style overrides
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'style') THEN
    ALTER TABLE workflow_nodes ADD COLUMN style JSONB DEFAULT '{}';
  END IF;

  -- Add class name for custom styling
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'class_name') THEN
    ALTER TABLE workflow_nodes ADD COLUMN class_name TEXT;
  END IF;

  -- Add hidden flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'hidden') THEN
    ALTER TABLE workflow_nodes ADD COLUMN hidden BOOLEAN DEFAULT false;
  END IF;

  -- Add measured dimensions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'measured') THEN
    ALTER TABLE workflow_nodes ADD COLUMN measured JSONB; -- {width, height}
  END IF;

  -- Update updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_nodes' AND column_name = 'updated_at') THEN
    ALTER TABLE workflow_nodes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================
-- WORKFLOW_EDGES TABLE ENHANCEMENTS
-- ============================================

DO $$ 
BEGIN
  -- Add source handle ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'source_handle') THEN
    ALTER TABLE workflow_edges ADD COLUMN source_handle TEXT;
  END IF;

  -- Add target handle ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'target_handle') THEN
    ALTER TABLE workflow_edges ADD COLUMN target_handle TEXT;
  END IF;

  -- Add animated flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'animated') THEN
    ALTER TABLE workflow_edges ADD COLUMN animated BOOLEAN DEFAULT false;
  END IF;

  -- Add hidden flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'hidden') THEN
    ALTER TABLE workflow_edges ADD COLUMN hidden BOOLEAN DEFAULT false;
  END IF;

  -- Add deletable flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'deletable') THEN
    ALTER TABLE workflow_edges ADD COLUMN deletable BOOLEAN DEFAULT true;
  END IF;

  -- Add selectable flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'selectable') THEN
    ALTER TABLE workflow_edges ADD COLUMN selectable BOOLEAN DEFAULT true;
  END IF;

  -- Add selected state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'selected') THEN
    ALTER TABLE workflow_edges ADD COLUMN selected BOOLEAN DEFAULT false;
  END IF;

  -- Add z-index
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'z_index') THEN
    ALTER TABLE workflow_edges ADD COLUMN z_index INTEGER DEFAULT 0;
  END IF;

  -- Add label position
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'label_x') THEN
    ALTER TABLE workflow_edges ADD COLUMN label_x FLOAT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'label_y') THEN
    ALTER TABLE workflow_edges ADD COLUMN label_y FLOAT;
  END IF;

  -- Add label background color
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'label_bg_style') THEN
    ALTER TABLE workflow_edges ADD COLUMN label_bg_style JSONB;
  END IF;

  -- Add label style
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'label_style') THEN
    ALTER TABLE workflow_edges ADD COLUMN label_style JSONB;
  END IF;

  -- Add style overrides
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'style') THEN
    ALTER TABLE workflow_edges ADD COLUMN style JSONB DEFAULT '{}';
  END IF;

  -- Add class name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'class_name') THEN
    ALTER TABLE workflow_edges ADD COLUMN class_name TEXT;
  END IF;

  -- Add marker start
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'marker_start') THEN
    ALTER TABLE workflow_edges ADD COLUMN marker_start JSONB;
  END IF;

  -- Add marker end
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'marker_end') THEN
    ALTER TABLE workflow_edges ADD COLUMN marker_end JSONB;
  END IF;

  -- Add path options
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'path_options') THEN
    ALTER TABLE workflow_edges ADD COLUMN path_options JSONB;
  END IF;

  -- Add interactionWidth
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'interaction_width') THEN
    ALTER TABLE workflow_edges ADD COLUMN interaction_width INTEGER DEFAULT 20;
  END IF;

  -- Update updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'workflow_edges' AND column_name = 'updated_at') THEN
    ALTER TABLE workflow_edges ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for workflow_nodes
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_agent_id ON workflow_nodes(agent_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_node_id ON workflow_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_parent ON workflow_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON workflow_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_updated ON workflow_nodes(updated_at DESC);

-- Indexes for workflow_edges
CREATE INDEX IF NOT EXISTS idx_workflow_edges_agent_id ON workflow_edges(agent_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_edge_id ON workflow_edges(edge_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source ON workflow_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_target ON workflow_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_updated ON workflow_edges(updated_at DESC);

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workflow_nodes
DROP TRIGGER IF EXISTS update_workflow_nodes_updated_at ON workflow_nodes;
CREATE TRIGGER update_workflow_nodes_updated_at
  BEFORE UPDATE ON workflow_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for workflow_edges
DROP TRIGGER IF EXISTS update_workflow_edges_updated_at ON workflow_edges;
CREATE TRIGGER update_workflow_edges_updated_at
  BEFORE UPDATE ON workflow_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN workflow_nodes.data IS 'JSONB field storing node configuration, including config object and nodeTypeKey';
COMMENT ON COLUMN workflow_nodes.style IS 'JSONB field for custom CSS styles applied to the node';
COMMENT ON COLUMN workflow_nodes.measured IS 'JSONB field storing measured dimensions {width, height}';
COMMENT ON COLUMN workflow_nodes.parent_node_id IS 'Reference to parent node for grouped/nested nodes';
COMMENT ON COLUMN workflow_nodes.z_index IS 'Z-index for node layering';

COMMENT ON COLUMN workflow_edges.data IS 'JSONB field storing edge-specific data';
COMMENT ON COLUMN workflow_edges.style IS 'JSONB field for custom CSS styles applied to the edge';
COMMENT ON COLUMN workflow_edges.source_handle IS 'ID of the source handle (for multiple connection points)';
COMMENT ON COLUMN workflow_edges.target_handle IS 'ID of the target handle (for multiple connection points)';
COMMENT ON COLUMN workflow_edges.marker_start IS 'JSONB field for start marker configuration';
COMMENT ON COLUMN workflow_edges.marker_end IS 'JSONB field for end marker configuration';
