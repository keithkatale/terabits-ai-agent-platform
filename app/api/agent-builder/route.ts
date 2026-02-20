// New agent builder API using AI SDK properly
// Based on working industry-exploration-platform implementation

import { streamText, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getBuilderSystemPrompt } from '@/lib/orchestrator/system-prompt'

export const maxDuration = 120

// Server-side canvas state for agent feedback loop
const canvasState = {
  nodes: [] as Array<{ id: string; label: string; nodeType: string; x: number; y: number; description: string }>,
  edges: [] as Array<{ id: string; source: string; target: string; label?: string }>,
}

function resetCanvas() {
  canvasState.nodes = []
  canvasState.edges = []
}

function getCanvasSummary(): string {
  if (canvasState.nodes.length === 0) return "Canvas is empty. No nodes have been placed yet."
  const nodeList = canvasState.nodes.map(n =>
    `  - [${n.id}] "${n.label}" (${n.nodeType}) at (${n.x}, ${n.y})`
  ).join("\n")
  const edgeList = canvasState.edges.map(e =>
    `  - ${e.source} -> ${e.target}${e.label ? ` (${e.label})` : ""}`
  ).join("\n")
  return `Canvas has ${canvasState.nodes.length} nodes and ${canvasState.edges.length} edges.\n\nNodes:\n${nodeList}\n\nEdges:\n${edgeList || "  (none)"}`
}

let nodeCounter = 0

// Tool definitions using AI SDK format
const builderTools = {
  present_plan: tool({
    description: 'Present a detailed plan to the user for approval. Use this after understanding what they need.',
    inputSchema: z.object({
      agentName: z.string().describe('Descriptive name for the agent'),
      category: z.string().describe('Category: customer_support, content_creation, data_analysis, task_automation, personal_assistant, research_agent, general'),
      description: z.string().describe('Brief description of what this agent does'),
      capabilities: z.array(z.string()).describe('List of 3-5 things the agent will do'),
      limitations: z.array(z.string()).describe('List of 2-3 things the agent cannot do'),
      workflowSteps: z.array(z.object({
        type: z.enum(['trigger', 'action', 'condition', 'output']),
        label: z.string(),
        description: z.string(),
      })),
      estimatedBuildTime: z.string().optional(),
    }),
    execute: async ({ agentName, category, description, capabilities, limitations, workflowSteps, estimatedBuildTime }) => {
      const planArtifact = {
        id: crypto.randomUUID(),
        type: 'plan' as const,
        title: 'Agent Plan',
        agentName,
        category,
        description,
        capabilities,
        limitations,
        workflow: {
          steps: workflowSteps.map((step, index) => ({
            id: `step-${index + 1}`,
            type: step.type,
            label: step.label,
            description: step.description,
          })),
        },
        estimatedBuildTime,
        createdAt: new Date().toISOString(),
      }
      
      return {
        __artifactAction: 'presentPlan' as const,
        artifact: planArtifact,
        message: '[PLAN_ARTIFACT]' + JSON.stringify(planArtifact) + '[/PLAN_ARTIFACT]',
      }
    },
  }),

  updateAgent: tool({
    description: 'Update the agent name, description, category, status, or conversation phase.',
    inputSchema: z.object({
      agentId: z.string(),
      name: z.string().nullable(),
      description: z.string().nullable(),
      category: z.string().nullable(),
      conversation_phase: z.string().nullable(),
      status: z.string().nullable(),
    }),
    execute: async ({ agentId, name, description, category, conversation_phase, status }) => {
      const supabase = await createClient()
      const updates: Record<string, any> = {}
      if (name) updates.name = name
      if (description) updates.description = description
      if (category) updates.category = category
      if (conversation_phase) updates.conversation_phase = conversation_phase
      if (status) updates.status = status
      updates.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', agentId)

      return error
        ? { success: false, error: error.message }
        : { success: true, updates }
    },
  }),

  generateInstructions: tool({
    description: 'Generate and save execution instructions from the plan. Call this after user approves to make the agent executable.',
    inputSchema: z.object({
      agentId: z.string(),
      auto_generate: z.boolean(),
    }),
    execute: async ({ agentId }) => {
      const supabase = await createClient()
      
      // Get agent data
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()

      if (!agent) {
        return { success: false, error: 'Agent not found' }
      }

      // Generate default instruction prompt based on agent description
      const instructionPrompt = `You are ${agent.name}, an AI agent designed to ${agent.description || 'assist the user'}.

Your capabilities:
${agent.description || 'General assistance'}

When the user provides inputs, follow these steps:
1. Understand the user's request and inputs
2. Execute the necessary actions to fulfill the request
3. Provide clear, actionable results
4. Format the output in a user-friendly way

Always be helpful, accurate, and efficient.`

      const toolConfig = {
        web_search: { enabled: true },
        ai_process: { enabled: true },
        read: { enabled: true },
        write: { enabled: false }
      }

      const executionContext = {
        agentType: agent.category || 'general',
        capabilities: agent.description || ''
      }

      // Save to database
      const { error } = await supabase
        .from('agents')
        .update({
          instruction_prompt: instructionPrompt,
          tool_config: toolConfig,
          execution_context: executionContext,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId)

      return error
        ? { success: false, error: error.message }
        : { 
            success: true, 
            message: 'Instructions generated successfully! Your agent is now ready to execute.',
            preview: instructionPrompt.substring(0, 200) + '...'
          }
    },
  }),

  addCanvasNode: tool({
    description: `Add a node to the agent workflow canvas. Types: "trigger" (blue), "action" (purple), "condition" (orange), "output" (green). Returns the node data to confirm it was added.`,
    inputSchema: z.object({
      agentId: z.string(),
      id: z.string().describe('Unique node ID'),
      label: z.string().describe('Short title (max 40 chars)'),
      description: z.string().describe('1-2 sentence description'),
      nodeType: z.enum(['trigger', 'action', 'condition', 'output']),
      positionX: z.number().describe('X position (0-2000)'),
      positionY: z.number().describe('Y position (0-1500)'),
      config: z.record(z.any()).nullable().describe('Node configuration object'),
    }),
    execute: async ({ agentId, id, label, description, nodeType, positionX, positionY, config }) => {
      nodeCounter++
      const nodeId = id || `node-${nodeCounter}`
      
      // Save to server-side state for inspectCanvas
      canvasState.nodes.push({ id: nodeId, label, nodeType, x: positionX, y: positionY, description })
      
      // Save to database for persistence
      const supabase = await createClient()
      await supabase.from('workflow_nodes').insert({
        agent_id: agentId,
        node_id: nodeId,
        node_type: 'agentNode',
        label,
        position_x: positionX,
        position_y: positionY,
        data: {
          label,
          description,
          nodeType,
          config: config || {},
        },
      })
      
      return {
        __canvasAction: 'addNode' as const,
        id: nodeId,
        type: 'agentNode',
        position: { x: positionX, y: positionY },
        data: {
          label,
          description,
          nodeType,
          config: config || {},
        },
      }
    },
  }),

  addCanvasEdge: tool({
    description: 'Connect two nodes on the agent workflow canvas.',
    inputSchema: z.object({
      agentId: z.string(),
      source: z.string().describe('Source node ID'),
      target: z.string().describe('Target node ID'),
      label: z.string().nullable().describe('Edge label'),
    }),
    execute: async ({ agentId, source, target, label }) => {
      const edgeId = `edge-${source}-${target}`
      
      // Save to server-side state for inspectCanvas
      canvasState.edges.push({ id: edgeId, source, target, label: label || undefined })
      
      // Save to database for persistence
      const supabase = await createClient()
      await supabase.from('workflow_edges').insert({
        agent_id: agentId,
        edge_id: edgeId,
        source_node_id: source,
        target_node_id: target,
        label: label || undefined,
        edge_type: 'default',
      })
      
      return {
        __canvasAction: 'addEdge' as const,
        id: edgeId,
        source,
        target,
        label: label || undefined,
        animated: true,
      }
    },
  }),

  updateCanvasNode: tool({
    description: 'Update an existing canvas node content or configuration.',
    inputSchema: z.object({
      agentId: z.string(),
      id: z.string(),
      label: z.string().nullable(),
      description: z.string().nullable(),
      config: z.record(z.any()).nullable(),
    }),
    execute: async ({ agentId, id, label, description, config }) => {
      // Update server-side state
      const existing = canvasState.nodes.find(n => n.id === id)
      if (existing) {
        if (label) existing.label = label
        if (description) existing.description = description
      }
      
      // Update database
      const supabase = await createClient()
      const updates: Record<string, any> = {}
      if (label) updates.label = label
      
      // Update data field with new values
      const { data: currentNode } = await supabase
        .from('workflow_nodes')
        .select('data')
        .eq('agent_id', agentId)
        .eq('node_id', id)
        .single()
      
      if (currentNode) {
        const updatedData = { ...currentNode.data }
        if (label) updatedData.label = label
        if (description) updatedData.description = description
        if (config) updatedData.config = config
        updates.data = updatedData
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('workflow_nodes')
          .update(updates)
          .eq('agent_id', agentId)
          .eq('node_id', id)
      }
      
      return {
        __canvasAction: 'updateNode' as const,
        id,
        updates: {
          ...(label && { label }),
          ...(description && { description }),
          ...(config && { config }),
        },
      }
    },
  }),

  inspectCanvas: tool({
    description: 'Inspect the current state of the canvas to verify nodes and edges were placed correctly. Use this after building the workflow to confirm it looks right.',
    inputSchema: z.object({}),
    execute: async () => {
      return {
        __canvasAction: 'inspect' as const,
        summary: getCanvasSummary(),
        nodeCount: canvasState.nodes.length,
        edgeCount: canvasState.edges.length,
        nodes: canvasState.nodes,
        edges: canvasState.edges,
      }
    },
  }),
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, agentId, agentPhase, agentName, agentCategory } = body

    if (!messages || !Array.isArray(messages) || !agentId) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages array and agentId required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Reset canvas state for new conversations
    if (messages.length <= 1) {
      resetCanvas()
    }

    // Convert UIMessage format to simple format for streamText
    // UIMessage has parts array, we need to extract text content
    const convertedMessages = messages.map((m: any) => {
      if (m.role === 'user') {
        // Extract text from parts array
        const textContent = m.parts
          ? m.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('')
          : m.content || ''
        
        return {
          role: 'user' as const,
          content: textContent,
        }
      } else if (m.role === 'assistant') {
        // Extract text from parts array
        const textContent = m.parts
          ? m.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('')
          : m.content || ''
        
        return {
          role: 'assistant' as const,
          content: textContent,
        }
      }
      
      return {
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
      }
    })

    // Check if user just approved the plan
    const lastUserMessage = convertedMessages.filter(m => m.role === 'user').pop()
    const isApproval = lastUserMessage?.content.toLowerCase().includes('approve') || 
                       lastUserMessage?.content.toLowerCase().includes('start building')
    
    // If user approved and we're in planning phase, update to building phase
    let currentPhase = agentPhase
    if (isApproval && agentPhase === 'planning') {
      currentPhase = 'building'
      // Update agent phase in database and clear old workflow
      const supabase = await createClient()
      await supabase
        .from('agents')
        .update({ conversation_phase: 'building' })
        .eq('id', agentId)
      
      // Clear old workflow nodes and edges before building new ones
      await supabase.from('workflow_nodes').delete().eq('agent_id', agentId)
      await supabase.from('workflow_edges').delete().eq('agent_id', agentId)
      
      // Reset server-side canvas state
      resetCanvas()
    }

    // Get system prompt with updated phase
    const systemPrompt = getBuilderSystemPrompt(
      currentPhase || 'discovery',
      agentName || 'New Agent',
      agentCategory || 'general'
    )

    // Inject agentId into all tool calls
    const toolsWithAgentId = Object.fromEntries(
      Object.entries(builderTools).map(([name, toolDef]) => [
        name,
        {
          ...toolDef,
          execute: async (args: any, options: any) => {
            if (toolDef.execute) {
              return toolDef.execute({ ...args, agentId }, options)
            }
            return {}
          },
        },
      ])
    )

    const result = streamText({
      model: google('gemini-3-flash-preview'),
      system: systemPrompt,
      messages: convertedMessages,
      tools: toolsWithAgentId,
      toolChoice: 'auto',
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
