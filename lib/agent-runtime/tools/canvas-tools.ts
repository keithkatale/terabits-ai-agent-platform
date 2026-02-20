// Canvas Tools: Workflow manipulation (Terabits-specific)

import type { AgentTool } from '../types'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * Update workflow tool
 */
export function createUpdateWorkflowTool(agentId: string): AgentTool {
  return {
    name: 'update_workflow',
    description: 'Update the visual workflow canvas. Add, modify, or remove nodes and edges.',
    inputSchema: z.object({
      nodes: z.array(z.object({
        nodeId: z.string(),
        nodeType: z.enum(['trigger', 'skill', 'condition', 'output']),
        label: z.string(),
        positionX: z.number(),
        positionY: z.number(),
        data: z.record(z.unknown()).optional(),
      })).optional(),
      edges: z.array(z.object({
        edgeId: z.string(),
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        label: z.string().optional(),
      })).optional(),
    }).parse,
    execute: async ({ nodes, edges }) => {
      const supabase = await createClient()

      try {
        // Update nodes if provided
        if (nodes && nodes.length > 0) {
          // Delete existing nodes
          await supabase
            .from('workflow_nodes')
            .delete()
            .eq('agent_id', agentId)

          // Insert new nodes
          const nodeRows = nodes.map((n) => ({
            agent_id: agentId,
            node_id: n.nodeId,
            node_type: n.nodeType,
            label: n.label,
            position_x: n.positionX,
            position_y: n.positionY,
            data: n.data ?? {},
          }))

          await supabase.from('workflow_nodes').insert(nodeRows)
        }

        // Update edges if provided
        if (edges && edges.length > 0) {
          // Delete existing edges
          await supabase
            .from('workflow_edges')
            .delete()
            .eq('agent_id', agentId)

          // Insert new edges
          const edgeRows = edges.map((e) => ({
            agent_id: agentId,
            edge_id: e.edgeId,
            source_node_id: e.sourceNodeId,
            target_node_id: e.targetNodeId,
            label: e.label ?? null,
            edge_type: 'smoothstep',
          }))

          await supabase.from('workflow_edges').insert(edgeRows)
        }

        return {
          success: true,
          message: 'Workflow updated successfully',
          nodesUpdated: nodes?.length ?? 0,
          edgesUpdated: edges?.length ?? 0,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
    metadata: {
      category: 'canvas',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Add workflow node tool
 */
export function createAddNodeTool(agentId: string): AgentTool {
  return {
    name: 'add_node',
    description: 'Add a single node to the workflow canvas.',
    inputSchema: z.object({
      nodeId: z.string(),
      nodeType: z.enum(['trigger', 'skill', 'condition', 'output']),
      label: z.string(),
      positionX: z.number(),
      positionY: z.number(),
      data: z.record(z.unknown()).optional(),
    }).parse,
    execute: async ({ nodeId, nodeType, label, positionX, positionY, data }) => {
      const supabase = await createClient()

      const { error } = await supabase.from('workflow_nodes').insert({
        agent_id: agentId,
        node_id: nodeId,
        node_type: nodeType,
        label,
        position_x: positionX,
        position_y: positionY,
        data: data ?? {},
      })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        message: 'Node added successfully',
        nodeId,
      }
    },
    metadata: {
      category: 'canvas',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

/**
 * Connect nodes tool
 */
export function createConnectNodesTool(agentId: string): AgentTool {
  return {
    name: 'connect_nodes',
    description: 'Connect two nodes with an edge.',
    inputSchema: z.object({
      edgeId: z.string(),
      sourceNodeId: z.string(),
      targetNodeId: z.string(),
      label: z.string().optional(),
    }).parse,
    execute: async ({ edgeId, sourceNodeId, targetNodeId, label }) => {
      const supabase = await createClient()

      const { error } = await supabase.from('workflow_edges').insert({
        agent_id: agentId,
        edge_id: edgeId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        label: label ?? null,
        edge_type: 'smoothstep',
      })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        message: 'Nodes connected successfully',
        edgeId,
      }
    },
    metadata: {
      category: 'canvas',
      ownerOnly: false,
      requiresApproval: false,
    },
  }
}

export function createCanvasTools(agentId: string): AgentTool[] {
  return [
    createUpdateWorkflowTool(agentId),
    createAddNodeTool(agentId),
    createConnectNodesTool(agentId),
  ]
}
