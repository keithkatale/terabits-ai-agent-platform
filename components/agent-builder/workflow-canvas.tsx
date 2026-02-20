'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from '@/components/agent-builder/nodes/trigger-node'
import { SkillNode } from '@/components/agent-builder/nodes/skill-node'
import { ConditionNode } from '@/components/agent-builder/nodes/condition-node'
import { OutputNode } from '@/components/agent-builder/nodes/output-node'
import { ExpandableNodePalette } from '@/components/agent-builder/expandable-node-palette'
import { NodeConfigPanel } from '@/components/agent-builder/node-config-panel'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { AgentSkill } from '@/lib/types'
import type { NodeTypeKey } from '@/lib/types/node-types'

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  skills: AgentSkill[]
  agentId: string
  onNodesChange: (nodes: Node[]) => void
  onEdgesChange: (edges: Edge[]) => void
}

// Map node type keys to React Flow node types
const NODE_TYPE_MAPPING: Record<string, string> = {
  // Triggers
  'button-trigger': 'trigger',
  'input-form': 'trigger',
  'schedule-trigger': 'trigger',
  'webhook-trigger': 'trigger',
  
  // Actions (all map to 'skill' for now)
  'web-search': 'skill',
  'web-scraper': 'skill',
  'apify-actor': 'skill',
  'visit-page': 'skill',
  'ai-text': 'skill',
  'ai-chat': 'skill',
  'ai-image': 'skill',
  'ai-vision': 'skill',
  'data-transform': 'skill',
  'data-filter': 'skill',
  'data-merge': 'skill',
  'data-sort': 'skill',
  'api-call': 'skill',
  'database-query': 'skill',
  'delay': 'skill',
  'loop': 'skill',
  
  // Conditions
  'if-else': 'condition',
  'switch': 'condition',
  'data-condition': 'condition',
  'time-condition': 'condition',
  'error-handler': 'condition',
  
  // Outputs
  'display-text': 'output',
  'display-table': 'output',
  'display-json': 'output',
  'display-chart': 'output',
  'display-image': 'output',
  'download-file': 'output',
  'download-csv': 'output',
  'download-pdf': 'output',
  'send-email': 'output',
  'send-webhook': 'output',
  'send-notification': 'output',
  'save-database': 'output',
  'save-file': 'output',
  'end-success': 'output',
  'end-error': 'output'
}

export function WorkflowCanvas({
  nodes: externalNodes,
  edges: externalEdges,
  skills,
  agentId,
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(externalNodes)
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(externalEdges)
  const [showPalette, setShowPalette] = useState(true)
  const [selectedNode, setSelectedNode] = useState<{ id: string; typeKey: NodeTypeKey; config?: any } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save workflow to database
  const saveWorkflow = useCallback(async (nodesToSave: Node[], edgesToSave: Edge[]) => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/agents/${agentId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodesToSave, edges: edgesToSave })
      })

      if (!response.ok) {
        console.error('Failed to save workflow')
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
    } finally {
      setIsSaving(false)
    }
  }, [agentId])

  // Debounced save - save 1 second after last change
  const debouncedSave = useCallback((nodesToSave: Node[], edgesToSave: Edge[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow(nodesToSave, edgesToSave)
    }, 1000)
  }, [saveWorkflow])

  // Save when nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      debouncedSave(nodes, edges)
    }
  }, [nodes, edges, debouncedSave])

  // Sync external updates
  useMemo(() => {
    if (JSON.stringify(externalNodes) !== JSON.stringify(nodes)) {
      setNodes(externalNodes)
    }
  }, [externalNodes, setNodes]) // eslint-disable-line react-hooks/exhaustive-deps

  useMemo(() => {
    if (JSON.stringify(externalEdges) !== JSON.stringify(edges)) {
      setEdges(externalEdges)
    }
  }, [externalEdges, setEdges]) // eslint-disable-line react-hooks/exhaustive-deps

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      skill: SkillNode,
      condition: ConditionNode,
      output: OutputNode,
    }),
    []
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds))
    },
    [setEdges]
  )

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChangeInternal(changes)
    },
    [onNodesChangeInternal]
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeInternal(changes)
    },
    [onEdgesChangeInternal]
  )

  // Sync to parent when nodes change
  useEffect(() => {
    onNodesChange(nodes)
  }, [nodes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to parent when edges change
  useEffect(() => {
    onEdgesChange(edges)
  }, [edges]) // eslint-disable-line react-hooks/exhaustive-deps

  // Add a new node to the canvas
  const addNode = useCallback(
    (nodeTypeKey: NodeTypeKey) => {
      const reactFlowType = NODE_TYPE_MAPPING[nodeTypeKey] || 'skill'
      
      const newNode: Node = {
        id: `${nodeTypeKey}-${Date.now()}`,
        type: reactFlowType,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        data: {
          label: nodeTypeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          nodeTypeKey,
          config: {},
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  // Handle node click to open config panel
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.data.nodeTypeKey) {
      setSelectedNode({
        id: node.id,
        typeKey: node.data.nodeTypeKey as NodeTypeKey,
        config: node.data.config
      })
    }
  }, [])

  // Save node configuration
  const handleSaveNodeConfig = useCallback((config: any) => {
    if (!selectedNode) return

    setNodes((nds) => {
      return nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              config
            }
          }
        }
        return node
      })
    })
  }, [selectedNode, setNodes])

  return (
    <div className="relative h-full w-full bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="bg-background" />
        <Controls className="bg-card border-border" />
        <MiniMap
          className="bg-card border-border"
          nodeStrokeWidth={2}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Expandable Node Palette - Left Side */}
      {showPalette && (
        <ExpandableNodePalette
          onAddNode={addNode}
          onClose={() => setShowPalette(false)}
        />
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute left-4 bottom-4 z-10 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Saving...
        </div>
      )}

      {/* Show Palette Button (when hidden) */}
      {!showPalette && (
        <button
          onClick={() => setShowPalette(true)}
          className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          Show Palette
        </button>
      )}

      {/* Skills sidebar - Right Side */}
      {skills.length > 0 && (
        <div className="absolute right-4 top-4 z-10 w-56 rounded-lg border border-border bg-card p-3 shadow-sm">
          <h4 className="mb-2 text-xs font-semibold text-foreground">Skills</h4>
          <div className="space-y-1.5">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${skill.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <span className="text-xs text-foreground">{skill.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Overlay (only when no nodes) */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <rect width="8" height="8" x="2" y="2" rx="1" />
                <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
                <rect width="8" height="8" x="2" y="14" rx="1" />
                <path d="M14 14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
                <path d="M10 6h4" />
                <path d="M10 18h4" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-foreground">Start Building Your Workflow</h3>
            <p className="max-w-xs text-xs text-muted-foreground mt-1">
              Click nodes from the palette to add them to your canvas, then connect them to create your workflow.
            </p>
          </div>
        </div>
      )}

      {/* Node Configuration Panel */}
      {selectedNode && (
        <NodeConfigPanel
          nodeId={selectedNode.id}
          nodeTypeKey={selectedNode.typeKey}
          currentConfig={selectedNode.config}
          onSave={handleSaveNodeConfig}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
