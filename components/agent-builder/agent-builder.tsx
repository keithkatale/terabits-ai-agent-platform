'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/agent-builder/chat-panel'
import { WorkflowCanvas } from '@/components/agent-builder/workflow-canvas'
import { PhaseIndicator } from '@/components/agent-builder/phase-indicator'
import { PanelRightOpen, PanelRightClose, ArrowLeft } from 'lucide-react'
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

// Phases where the canvas should be hidden -- conversation-only
const CHAT_ONLY_PHASES = ['discovery', 'planning']

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

  // Canvas is only shown when building has started (not during discovery/planning)
  const hasWorkflow = nodes.length > 0
  const isConversationPhase = CHAT_ONLY_PHASES.includes(currentAgent.conversation_phase)
  const [canvasManuallyToggled, setCanvasManuallyToggled] = useState(false)
  const [canvasForceHidden, setCanvasForceHidden] = useState(false)

  // Show canvas automatically when workflow appears or phase transitions to building+
  const showCanvas = canvasManuallyToggled
    ? !canvasForceHidden
    : (!isConversationPhase || hasWorkflow)

  // When phase transitions from conversation to building, auto-reveal canvas
  useEffect(() => {
    if (!isConversationPhase && !canvasManuallyToggled) {
      setCanvasForceHidden(false)
    }
  }, [isConversationPhase, canvasManuallyToggled])

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

  const toggleCanvas = () => {
    setCanvasManuallyToggled(true)
    setCanvasForceHidden((prev) => !prev)
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Minimal top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-sm font-medium text-foreground">{currentAgent.name}</span>
          </div>
          <PhaseIndicator phase={currentAgent.conversation_phase} />
        </div>
        <div className="flex items-center gap-2">
          {/* Only show canvas toggle when building has started or there are nodes */}
          {(!isConversationPhase || hasWorkflow) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={toggleCanvas}
            >
              {showCanvas ? (
                <>
                  <PanelRightClose className="h-3.5 w-3.5" />
                  Hide Canvas
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-3.5 w-3.5" />
                  Show Canvas
                </>
              )}
            </Button>
          )}
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content area -- adapts between full chat and split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className={`flex flex-col transition-all duration-300 ease-in-out ${
          showCanvas
            ? 'w-full md:w-1/2 lg:w-2/5 border-r border-border'
            : 'w-full'
        }`}>
          <ChatPanel
            agent={currentAgent}
            onWorkflowUpdate={handleWorkflowUpdate}
            isFullWidth={!showCanvas}
          />
        </div>

        {/* React Flow canvas -- only mounts when visible */}
        {showCanvas && (
          <div className="hidden flex-1 md:block">
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
