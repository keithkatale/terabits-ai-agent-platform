"use client"

import { useCallback, useMemo, useEffect, useRef } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type NodeTypes,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { TriggerNode } from "./nodes/trigger-node"
import { ActionNode } from "./nodes/action-node"
import { ConditionNode } from "./nodes/condition-node"
import { OutputNode } from "./nodes/output-node"

function AgentNodeRouter(props: { data: Record<string, unknown>; [key: string]: unknown }) {
  const nodeType = props.data.nodeType as string
  switch (nodeType) {
    case "trigger":
      return <TriggerNode {...(props as any)} />
    case "action":
      return <ActionNode {...(props as any)} />
    case "condition":
      return <ConditionNode {...(props as any)} />
    case "output":
      return <OutputNode {...(props as any)} />
    default:
      return <ActionNode {...(props as any)} />
  }
}

const nodeTypes: NodeTypes = {
  agentNode: AgentNodeRouter,
}

interface AgentCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: ReturnType<typeof useNodesState>[2]
  onEdgesChange: ReturnType<typeof useEdgesState>[2]
  onAddEdge: (edge: Edge) => void
}

/** Inner component that has access to useReactFlow */
function CanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onAddEdge,
}: AgentCanvasProps) {
  const { fitView } = useReactFlow()
  const prevNodeCount = useRef(0)

  // Auto-fit whenever new nodes arrive
  useEffect(() => {
    if (nodes.length > 0 && nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = nodes.length
      // Small delay to let ReactFlow measure the new nodes
      const t = setTimeout(() => {
        fitView({ padding: 0.3, maxZoom: 1, duration: 400 })
      }, 200)
      return () => clearTimeout(t)
    }
  }, [nodes, fitView])

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        animated: true,
      }
      onAddEdge(newEdge)
    },
    [onAddEdge]
  )

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: "oklch(0.65 0.08 250)", strokeWidth: 1.5 },
    }),
    []
  )

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="oklch(0.82 0 0)"
        />
        <Controls
          className="!rounded-lg !border-border !bg-card !shadow-sm [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground [&>button]:hover:!bg-secondary"
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as Record<string, unknown>
            switch (data.nodeType) {
              case "trigger":
                return "oklch(0.48 0.18 250)"
              case "action":
                return "oklch(0.50 0.20 280)"
              case "condition":
                return "oklch(0.55 0.20 40)"
              case "output":
                return "oklch(0.50 0.16 155)"
              default:
                return "oklch(0.48 0.18 250)"
            }
          }}
          className="!rounded-lg !border-border !bg-card/90 !shadow-sm"
          maskColor="oklch(0.95 0 0 / 0.7)"
        />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-3 text-4xl text-muted-foreground/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mx-auto h-16 w-16"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <line x1="10" y1="6.5" x2="14" y2="6.5" />
                <line x1="6.5" y1="10" x2="6.5" y2="14" />
                <line x1="17.5" y1="10" x2="17.5" y2="14" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground/40">
              Your agent workflow will appear here
            </p>
            <p className="mt-1 text-xs text-muted-foreground/30">
              Approve the plan to start building
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/** Exported wrapper with ReactFlowProvider */
export function AgentCanvas(props: AgentCanvasProps) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  )
}
