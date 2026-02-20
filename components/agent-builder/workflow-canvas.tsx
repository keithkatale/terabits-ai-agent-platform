'use client'

import { useCallback, useMemo } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from '@/components/agent-builder/nodes/trigger-node'
import { SkillNode } from '@/components/agent-builder/nodes/skill-node'
import { ConditionNode } from '@/components/agent-builder/nodes/condition-node'
import { OutputNode } from '@/components/agent-builder/nodes/output-node'
import type { AgentSkill } from '@/lib/types'

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  skills: AgentSkill[]
  onNodesChange: (nodes: Node[]) => void
  onEdgesChange: (edges: Edge[]) => void
}

export function WorkflowCanvas({
  nodes: externalNodes,
  edges: externalEdges,
  skills,
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(externalNodes)
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(externalEdges)

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
      setEdges((eds) => {
        const newEdges = addEdge({ ...connection, type: 'smoothstep', animated: true }, eds)
        onEdgesChange(newEdges)
        return newEdges
      })
    },
    [setEdges, onEdgesChange]
  )

  const handleNodesChange: typeof onNodesChangeInternal = useCallback(
    (changes) => {
      onNodesChangeInternal(changes)
      // Debounced sync to parent
      setTimeout(() => {
        setNodes((currentNodes) => {
          onNodesChange(currentNodes)
          return currentNodes
        })
      }, 100)
    },
    [onNodesChangeInternal, setNodes, onNodesChange]
  )

  return (
    <div className="relative h-full w-full bg-muted/30">
      {nodes.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <rect width="8" height="8" x="2" y="2" rx="1" />
              <path d="M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
              <rect width="8" height="8" x="2" y="14" rx="1" />
              <path d="M14 14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2" />
              <path d="M10 6h4" />
              <path d="M10 18h4" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-foreground">Workflow Canvas</h3>
          <p className="max-w-xs text-xs text-muted-foreground">
            As you describe your AI employee in the chat, the workflow will appear here.
            You can also drag and rearrange nodes.
          </p>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChangeInternal}
          onConnect={onConnect}
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
      )}

      {/* Skills sidebar */}
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
    </div>
  )
}
