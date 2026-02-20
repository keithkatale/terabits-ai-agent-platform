'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/agent-builder/chat-panel'
import { AgentCanvas } from '@/components/agent-builder/agent-canvas'
import { AgentExecutionView } from '@/components/agent-builder/agent-execution-view'
import { PhaseIndicator } from '@/components/agent-builder/phase-indicator'
import { PanelRightOpen, ArrowLeft } from 'lucide-react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'
import { createClient } from '@/lib/supabase/client'
import type { Agent } from '@/lib/types'

interface AgentBuilderProps {
  agent: Agent
}

export function AgentBuilder({
  agent,
}: AgentBuilderProps) {
  const [currentAgent, setCurrentAgent] = useState(agent)
  const [isRunning, setIsRunning] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(true)

  // Load existing workflow from database on mount
  useEffect(() => {
    const loadWorkflow = async () => {
      const supabase = createClient()
      const [{ data: dbNodes }, { data: dbEdges }] = await Promise.all([
        supabase.from('workflow_nodes').select('*').eq('agent_id', agent.id).order('created_at', { ascending: true }),
        supabase.from('workflow_edges').select('*').eq('agent_id', agent.id).order('created_at', { ascending: true }),
      ])

      if (dbNodes && dbNodes.length > 0) {
        console.log('Loading nodes from database:', dbNodes)
        const flowNodes: Node[] = dbNodes.map((n) => ({
          id: n.node_id,
          type: n.node_type,
          position: { x: n.position_x, y: n.position_y },
          data: {
            ...n.data,
            // Ensure all required fields are present
            label: n.data?.label || n.label,
            description: n.data?.description || '',
            nodeType: n.data?.nodeType || 'action',
            config: n.data?.config || {},
          },
        }))
        console.log('Converted to flow nodes:', flowNodes)
        setNodes(flowNodes)
      }

      if (dbEdges && dbEdges.length > 0) {
        const flowEdges: Edge[] = dbEdges.map((e) => ({
          id: e.edge_id,
          source: e.source_node_id,
          target: e.target_node_id,
          label: e.label ?? undefined,
          type: e.edge_type ?? 'default',
          animated: true,
        }))
        setEdges(flowEdges)
      }

      setIsLoadingWorkflow(false)
    }

    loadWorkflow()
  }, [agent.id, setNodes, setEdges])

  // Reload workflow when phase changes to building or complete
  useEffect(() => {
    if (currentAgent.conversation_phase === 'building' || currentAgent.conversation_phase === 'complete') {
      const reloadWorkflow = async () => {
        const supabase = createClient()
        const [{ data: dbNodes }, { data: dbEdges }] = await Promise.all([
          supabase.from('workflow_nodes').select('*').eq('agent_id', agent.id).order('created_at', { ascending: true }),
          supabase.from('workflow_edges').select('*').eq('agent_id', agent.id).order('created_at', { ascending: true }),
        ])

        if (dbNodes && dbNodes.length > 0) {
          const flowNodes: Node[] = dbNodes.map((n) => ({
            id: n.node_id,
            type: n.node_type,
            position: { x: n.position_x, y: n.position_y },
            data: {
              ...n.data,
              // Ensure all required fields are present
              label: n.data?.label || n.label,
              description: n.data?.description || '',
              nodeType: n.data?.nodeType || 'action',
              config: n.data?.config || {},
            },
          }))
          setNodes(flowNodes)
        }

        if (dbEdges && dbEdges.length > 0) {
          const flowEdges: Edge[] = dbEdges.map((e) => ({
            id: e.edge_id,
            source: e.source_node_id,
            target: e.target_node_id,
            label: e.label ?? undefined,
            type: e.edge_type ?? 'default',
            animated: true,
          }))
          setEdges(flowEdges)
        }
      }

      // Small delay to let database writes complete
      const timer = setTimeout(reloadWorkflow, 500)
      return () => clearTimeout(timer)
    }
  }, [currentAgent.conversation_phase, agent.id, setNodes, setEdges])

  const handleAddNode = useCallback((node: Node) => {
    setNodes((nds) => [...nds, node])
  }, [setNodes])

  const handleAddEdge = useCallback((edge: Edge) => {
    setEdges((eds) => [...eds, edge])
  }, [setEdges])

  const handleUpdateNode = useCallback((id: string, updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    )
  }, [setNodes])

  const handleWorkflowUpdate = useCallback((data: {
    agentUpdate?: Partial<Agent>
  }) => {
    if (data.agentUpdate) {
      setCurrentAgent((prev) => ({ ...prev, ...data.agentUpdate }))
    }
  }, [])

  const handleStopAgent = () => {
    setIsRunning(false)
  }

  // Show canvas when building or complete phase
  const showCanvas = currentAgent.conversation_phase === 'building' || 
                     currentAgent.conversation_phase === 'complete'

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
          {/* Run Agent Button */}
          {!isRunning && currentAgent.conversation_phase === 'complete' && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsRunning(true)}
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              Run Agent
            </Button>
          )}
          
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {!isRunning ? (
          /* Building mode: Chat + Canvas */
          <>
            {/* Chat panel - 30% when canvas visible, 100% otherwise */}
            <div className={`flex flex-col border-r border-border ${showCanvas ? 'w-[30%]' : 'flex-1'}`}>
              <ChatPanel
                agent={currentAgent}
                onWorkflowUpdate={handleWorkflowUpdate}
                onAddNode={handleAddNode}
                onAddEdge={handleAddEdge}
                onUpdateNode={handleUpdateNode}
                isFullWidth={!showCanvas}
              />
            </div>

            {/* Canvas - 70% when building */}
            {showCanvas && !isLoadingWorkflow && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <AgentCanvas
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onAddEdge={handleAddEdge}
                />
              </div>
            )}
          </>
        ) : (
          /* Execution mode: Chat + Execution View */
          <>
            {/* Chat panel - 30% */}
            <div className="w-[30%] flex flex-col border-r border-border">
              <ChatPanel
                agent={currentAgent}
                onWorkflowUpdate={handleWorkflowUpdate}
                onAddNode={handleAddNode}
                onAddEdge={handleAddEdge}
                onUpdateNode={handleUpdateNode}
                isFullWidth={false}
              />
            </div>

            {/* Execution panel - 70% */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <AgentExecutionView
                agent={currentAgent}
                isRunning={isRunning}
                onStop={handleStopAgent}
                triggerConfig={undefined}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
