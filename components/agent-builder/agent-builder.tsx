'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/agent-builder/chat-panel'
import { WorkflowCanvas } from '@/components/agent-builder/workflow-canvas'
import { PhaseIndicator } from '@/components/agent-builder/phase-indicator'
import type { Agent, AgentSkill, WorkflowNode, WorkflowEdge } from '@/lib/types'
import type { Node, Edge } from '@xyflow/react'

interface AgentBuilderProps {
  agent: Agent
  initialNodes: WorkflowNode[]
  initialEdges: WorkflowEdge[]
  initialSkills: AgentSkill[]
}

function dbNodesToFlow(dbNodes: WorkflowNode[]): Node[] {
  return dbNodes.map((n) => ({
    id: n.node_id,
    type: n.node_type,
    position: { x: n.position_x, y: n.position_y },
    data: { label: n.label, ...n.data },
  }))
}

function dbEdgesToFlow(dbEdges: WorkflowEdge[]): Edge[] {
  return dbEdges.map((e) => ({
    id: e.edge_id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label ?? undefined,
    type: e.edge_type,
  }))
}

export function AgentBuilder({
  agent,
  initialNodes,
  initialEdges,
  initialSkills,
}: AgentBuilderProps) {
  const [currentAgent, setCurrentAgent] = useState(agent)
  const [nodes, setNodes] = useState<Node[]>(() => dbNodesToFlow(initialNodes))
  const [edges, setEdges] = useState<Edge[]>(() => dbEdgesToFlow(initialEdges))
  const [skills, setSkills] = useState<AgentSkill[]>(initialSkills)
  const [showCanvas, setShowCanvas] = useState(true)

  const handleWorkflowUpdate = useCallback((data: {
    nodes?: Node[]
    edges?: Edge[]
    skills?: AgentSkill[]
    agentUpdate?: Partial<Agent>
  }) => {
    if (data.nodes) setNodes(data.nodes)
    if (data.edges) setEdges(data.edges)
    if (data.skills) setSkills(data.skills)
    if (data.agentUpdate) {
      setCurrentAgent((prev) => ({ ...prev, ...data.agentUpdate }))
    }
  }, [])

  return (
    <div className="flex h-svh flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">T</span>
            </div>
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground">{currentAgent.name}</span>
          <PhaseIndicator phase={currentAgent.conversation_phase} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowCanvas(!showCanvas)}
          >
            {showCanvas ? 'Hide Canvas' : 'Show Canvas'}
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel (left) */}
        <div className={`flex flex-col border-r border-border ${showCanvas ? 'w-1/2 lg:w-2/5' : 'w-full'}`}>
          <ChatPanel
            agent={currentAgent}
            onWorkflowUpdate={handleWorkflowUpdate}
          />
        </div>

        {/* React Flow canvas (right) */}
        {showCanvas && (
          <div className="flex-1">
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              skills={skills}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
            />
          </div>
        )}
      </div>
    </div>
  )
}
