// Robust agent builder API with proper streaming and tool execution
// Based on working web-app implementation

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { getBuilderSystemPrompt } from '@/lib/orchestrator/system-prompt'
import { z } from 'zod'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

// Tool definitions with Zod schemas
const builderTools = {
  present_plan: {
    description: 'Present a detailed plan to the user for approval. Use this after understanding what they need. The plan will be shown as a visual artifact that the user can approve or request changes to.',
    parameters: z.object({
      agentName: z.string().describe('Descriptive name for the agent (e.g., "Reddit AI Tools Tracker")'),
      category: z.string().describe('Category: customer_support, content_creation, data_analysis, task_automation, personal_assistant, research_agent, general'),
      description: z.string().describe('Brief description of what this agent does'),
      capabilities: z.array(z.string()).describe('List of 3-5 things the agent will do'),
      limitations: z.array(z.string()).describe('List of 2-3 things the agent cannot do (be honest)'),
      workflowSteps: z.array(z.object({
        type: z.enum(['trigger', 'action', 'condition', 'output']).describe('Type of workflow step'),
        label: z.string().describe('Short label for the step'),
        description: z.string().describe('What this step does'),
      })).describe('Workflow steps in order'),
      estimatedBuildTime: z.string().optional().describe('Estimated time to build (e.g., "2-3 minutes")'),
    }),
  },
  updateAgent: {
    description: 'Update the agent name, description, category, status, or conversation phase. Call this when transitioning between phases or when you learn enough to name/describe the agent.',
    parameters: z.object({
      name: z.string().nullable().describe('New name for the agent'),
      description: z.string().nullable().describe('Description of what this AI employee does'),
      category: z.string().nullable().describe('Category: customer_support, content_creation, data_analysis, task_automation, personal_assistant, research_agent, general'),
      conversation_phase: z.string().nullable().describe('Phase: discovery, planning, building, refining, testing, complete'),
      status: z.string().nullable().describe('Status: draft, building, ready, deployed'),
    }),
  },
  addWorkflowNodes: {
    description: 'Add workflow nodes to the visual canvas. Use this when building the agent workflow. Node types: trigger, skill, condition, output.',
    parameters: z.object({
      nodes: z.array(z.object({
        node_id: z.string(),
        node_type: z.enum(['trigger', 'skill', 'condition', 'output']),
        label: z.string(),
        position_x: z.number(),
        position_y: z.number(),
        data: z.record(z.unknown()).nullable(),
      })),
    }),
  },
  addWorkflowEdges: {
    description: 'Add connections between workflow nodes. Use after adding nodes.',
    parameters: z.object({
      edges: z.array(z.object({
        edge_id: z.string(),
        source_node_id: z.string(),
        target_node_id: z.string(),
        label: z.string().nullable(),
        edge_type: z.string().nullable(),
      })),
    }),
  },
  addSkill: {
    description: 'Add a skill to the AI employee. Skills are specific capabilities like "answer FAQs", "write blog posts", etc.',
    parameters: z.object({
      name: z.string().describe('Skill name'),
      description: z.string().describe('What this skill does'),
      skill_type: z.string().describe('Type: text_generation, classification, summarization, extraction, research, automation, custom'),
      skill_content: z.string().nullable().describe('The prompt or instruction content for this skill'),
    }),
  },
  saveSystemPrompt: {
    description: 'Save the final system prompt for the AI employee. This defines the personality and behavior of the deployed agent.',
    parameters: z.object({
      system_prompt: z.string().describe('The complete system prompt for the deployed agent'),
    }),
  },
  generateInstructions: {
    description: 'Generate and save execution instructions from the workflow. Call this after building the workflow to make the agent executable.',
    parameters: z.object({
      auto_generate: z.boolean().describe('Whether to auto-generate from workflow or use custom instructions'),
    }),
  },
  checkPlatformCapabilities: {
    description: 'Check what the Terabits platform can and cannot do. Use this to verify if a requested capability is available before promising it to the user.',
    parameters: z.object({
      capability_name: z.string().describe('The capability to check'),
    }),
  },
}

// Convert Zod schemas to Google Generative AI format
function convertToolsToGoogleFormat() {
  const functionDeclarations = Object.entries(builderTools).map(([name, toolDef]) => {
    const zodSchema = toolDef.parameters
    const properties: any = {}
    const required: string[] = []
    
    const shape = (zodSchema as any)._def.shape()
    for (const [key, value] of Object.entries(shape)) {
      const field = value as any
      const typeName = field._def.typeName
      
      if (typeName === 'ZodArray') {
        const itemType = field._def.type._def.typeName
        properties[key] = {
          type: SchemaType.ARRAY,
          description: field.description || '',
          items: {
            type: itemType === 'ZodObject' ? SchemaType.OBJECT : SchemaType.STRING,
          },
        }
      } else if (typeName === 'ZodNullable') {
        const innerType = field._def.innerType._def.typeName
        properties[key] = {
          type: innerType === 'ZodString' ? SchemaType.STRING : SchemaType.OBJECT,
          description: field.description || '',
          nullable: true,
        }
      } else {
        properties[key] = {
          type: typeName === 'ZodString' ? SchemaType.STRING : 
                typeName === 'ZodNumber' ? SchemaType.NUMBER :
                typeName === 'ZodBoolean' ? SchemaType.BOOLEAN :
                typeName === 'ZodEnum' ? SchemaType.STRING : SchemaType.STRING,
          description: field.description || '',
        }
        
        if (typeName === 'ZodEnum') {
          properties[key].enum = field._def.values
        }
      }
      
      if (!field.isOptional() && typeName !== 'ZodNullable') {
        required.push(key)
      }
    }
    
    return {
      name,
      description: toolDef.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties,
        required,
      },
    }
  })
  
  return { functionDeclarations }
}

// Execute tool function
async function executeTool(toolName: string, args: any, agentId: string) {
  const supabase = await createClient()
  
  try {
    switch (toolName) {
      case 'present_plan': {
        const planArtifact = {
          id: crypto.randomUUID(),
          type: 'plan' as const,
          title: 'Agent Plan',
          agentName: args.agentName,
          category: args.category,
          description: args.description,
          capabilities: args.capabilities,
          limitations: args.limitations,
          workflow: {
            steps: args.workflowSteps.map((step: any, index: number) => ({
              id: `step-${index + 1}`,
              type: step.type,
              label: step.label,
              description: step.description,
            })),
          },
          estimatedBuildTime: args.estimatedBuildTime,
          createdAt: new Date().toISOString(),
        }
        
        return {
          success: true,
          artifact: planArtifact,
          message: '[PLAN_ARTIFACT]' + JSON.stringify(planArtifact) + '[/PLAN_ARTIFACT]',
        }
      }
      
      case 'updateAgent': {
        const updates: Record<string, any> = {}
        if (args.name) updates.name = args.name
        if (args.description) updates.description = args.description
        if (args.category) updates.category = args.category
        if (args.conversation_phase) updates.conversation_phase = args.conversation_phase
        if (args.status) updates.status = args.status
        updates.updated_at = new Date().toISOString()

        const { error } = await supabase
          .from('agents')
          .update(updates)
          .eq('id', agentId)

        return error
          ? { success: false, error: error.message }
          : { success: true, updates }
      }
      
      case 'addWorkflowNodes': {
        await supabase.from('workflow_nodes').delete().eq('agent_id', agentId)

        const rows = args.nodes.map((n: any) => ({
          agent_id: agentId,
          node_id: n.node_id,
          node_type: n.node_type,
          label: n.label,
          position_x: n.position_x,
          position_y: n.position_y,
          data: n.data ?? {},
        }))

        const { error } = await supabase.from('workflow_nodes').insert(rows)
        return error
          ? { success: false, error: error.message }
          : { success: true, count: rows.length }
      }
      
      case 'addWorkflowEdges': {
        await supabase.from('workflow_edges').delete().eq('agent_id', agentId)

        const rows = args.edges.map((e: any) => ({
          agent_id: agentId,
          edge_id: e.edge_id,
          source_node_id: e.source_node_id,
          target_node_id: e.target_node_id,
          label: e.label,
          edge_type: e.edge_type ?? 'smoothstep',
        }))

        const { error } = await supabase.from('workflow_edges').insert(rows)
        return error
          ? { success: false, error: error.message }
          : { success: true, count: rows.length }
      }
      
      case 'addSkill': {
        const { error } = await supabase.from('agent_skills').insert({
          agent_id: agentId,
          name: args.name,
          description: args.description,
          skill_type: args.skill_type,
          skill_content: args.skill_content,
          is_active: true,
        })

        return error
          ? { success: false, error: error.message }
          : { success: true, skill: args.name }
      }
      
      case 'saveSystemPrompt': {
        const { error } = await supabase
          .from('agents')
          .update({ system_prompt: args.system_prompt, updated_at: new Date().toISOString() })
          .eq('id', agentId)

        return error
          ? { success: false, error: error.message }
          : { success: true }
      }
      
      case 'generateInstructions': {
        // Get agent data
        const { data: agent } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single()

        if (!agent) {
          return { success: false, error: 'Agent not found' }
        }

        // Get workflow nodes and edges
        const [{ data: nodes }, { data: edges }] = await Promise.all([
          supabase.from('workflow_nodes').select('*').eq('agent_id', agentId),
          supabase.from('workflow_edges').select('*').eq('agent_id', agentId),
        ])

        // Generate instructions from workflow
        const { generateInstructionPrompt, extractToolConfig, extractExecutionContext } = await import('@/lib/execution-engine/workflow-to-instructions')
        
        const instructionPrompt = nodes && nodes.length > 0
          ? generateInstructionPrompt(agent, nodes, edges || [])
          : (await import('@/lib/execution-engine/workflow-to-instructions')).generateDefaultInstructionPrompt(agent)

        const toolConfig = nodes && nodes.length > 0
          ? extractToolConfig(nodes)
          : { web_scrape: { enabled: true }, ai_process: { enabled: true }, read: { enabled: true }, write: { enabled: true } }

        const executionContext = nodes && nodes.length > 0
          ? extractExecutionContext(agent, nodes)
          : {}

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
              message: 'Instructions generated and saved. Your agent is now ready to execute!',
              preview: instructionPrompt.substring(0, 200) + '...'
            }
      }
      
      case 'checkPlatformCapabilities': {
        const { data } = await supabase
          .from('platform_capabilities')
          .select('*')
          .ilike('name', `%${args.capability_name}%`)

        if (!data || data.length === 0) {
          return {
            available: false,
            message: `"${args.capability_name}" is not currently available on Terabits. This capability is not on our roadmap yet.`,
          }
        }

        const cap = data[0]
        if (cap.is_available) {
          return { available: true, capability: cap.name, description: cap.description }
        }
        return {
          available: false,
          coming_soon: cap.coming_soon,
          message: `"${cap.name}" is coming soon but not yet available.`,
        }
      }
      
      default:
        return { success: false, error: 'Unknown tool' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, agentId, agentPhase, agentName, agentCategory } = body

    if (!messages || !agentId) {
      return new Response('Invalid request', { status: 400 })
    }

    // Get system prompt
    const systemPrompt = getBuilderSystemPrompt(
      agentPhase || 'discovery',
      agentName || 'New Agent',
      agentCategory || 'general'
    )


    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [convertToolsToGoogleFormat()],
    })

    // Convert messages to Google format
    const history = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      }))

    const chat = model.startChat({
      history: history.slice(0, -1),
      systemInstruction: {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
    })

    const lastMessage = messages[messages.length - 1]
    const userMessage = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content)

    // Stream with multi-step execution
    let step = 0
    const maxSteps = 10
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessage = userMessage

          while (step < maxSteps) {
            step++

            // Send thinking indicator
            if (step === 1) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify('__THOUGHT__Analyzing your request...__END_THOUGHT__')}\n`))
            }

            const result = await chat.sendMessageStream(currentMessage)
            let functionCalls: any[] = []

            for await (const chunk of result.stream) {
              const candidate = chunk.candidates?.[0]
              if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                  if (part.text) {
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(part.text)}\n`))
                  }
                }
              }

              const calls = chunk.functionCalls?.()
              if (calls && calls.length > 0) {
                functionCalls.push(...calls)
              }
            }

            // Execute function calls
            if (functionCalls.length > 0) {
              const functionResponses = []

              for (const call of functionCalls) {
                try {
                  // Send tool call marker
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(`__TOOL_CALL__${call.name}__ARGS__${JSON.stringify(call.args)}__END_TOOL_CALL__`)}\n`))

                  // Execute tool
                  const toolResult = await executeTool(call.name, call.args, agentId)

                  // Special handling for present_plan - send the artifact directly to the client
                  if (call.name === 'present_plan' && toolResult.success && toolResult.artifact) {
                    const artifactMarker = `[PLAN_ARTIFACT]${JSON.stringify(toolResult.artifact)}[/PLAN_ARTIFACT]`
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(artifactMarker)}\n`))
                  }

                  // Send tool result marker
                  const resultPreview = toolResult.success
                    ? JSON.stringify(toolResult).substring(0, 300)
                    : (toolResult.error || 'No data')

                  controller.enqueue(encoder.encode(`0:${JSON.stringify(`__TOOL_RESULT__${call.name}__SUCCESS__${toolResult.success}__DATA__${resultPreview}__END_TOOL_RESULT__`)}\n`))

                  functionResponses.push({
                    name: call.name,
                    response: toolResult,
                  })
                } catch (toolError) {
                  console.error(`Error executing tool ${call.name}:`, toolError)
                  functionResponses.push({
                    name: call.name,
                    response: {
                      success: false,
                      error: toolError instanceof Error ? toolError.message : 'Unknown error',
                    },
                  })
                }
              }

              // Continue with function results
              currentMessage = JSON.stringify(functionResponses)
            } else {
              // No more function calls
              break
            }
          }

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(encoder.encode(`0:${JSON.stringify('⚠️ An error occurred. Please try again.')}\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
