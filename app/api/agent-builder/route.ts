import { streamText, convertToModelMessages, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getBuilderSystemPrompt } from '@/lib/orchestrator/system-prompt'

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, agentId, agentPhase, agentName, agentCategory } = body

  const supabase = await createClient()

  const systemPrompt = getBuilderSystemPrompt(
    agentPhase || 'discovery',
    agentName || 'New AI Employee',
    agentCategory || 'general'
  )

  const result = streamText({
    model: google('gemini-3-flash-preview'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 4096,
    tools: {
      updateAgent: tool({
        description: 'Update the agent name, description, category, status, or conversation phase. Call this when transitioning between phases or when you learn enough to name/describe the agent.',
        inputSchema: z.object({
          name: z.string().nullable().describe('New name for the agent'),
          description: z.string().nullable().describe('Description of what this AI employee does'),
          category: z.string().nullable().describe('Category: customer_support, content_creation, data_analysis, task_automation, personal_assistant, research_agent, general'),
          conversation_phase: z.string().nullable().describe('Phase: discovery, planning, building, refining, testing, complete'),
          status: z.string().nullable().describe('Status: draft, building, ready, deployed'),
        }),
        execute: async ({ name, description, category, conversation_phase, status }) => {
          if (!agentId) return { success: false, error: 'No agent ID' }
          const updates: Record<string, string> = {}
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

      addWorkflowNodes: tool({
        description: 'Add workflow nodes to the visual canvas. Use this when building the agent workflow. Node types: trigger, skill, condition, output.',
        inputSchema: z.object({
          nodes: z.array(z.object({
            node_id: z.string(),
            node_type: z.enum(['trigger', 'skill', 'condition', 'output']),
            label: z.string(),
            position_x: z.number(),
            position_y: z.number(),
            data: z.record(z.unknown()).nullable(),
          })),
        }),
        execute: async ({ nodes }) => {
          if (!agentId) return { success: false, error: 'No agent ID' }

          // Clear existing nodes first
          await supabase.from('workflow_nodes').delete().eq('agent_id', agentId)

          const rows = nodes.map((n) => ({
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
        },
      }),

      addWorkflowEdges: tool({
        description: 'Add connections between workflow nodes. Use after adding nodes.',
        inputSchema: z.object({
          edges: z.array(z.object({
            edge_id: z.string(),
            source_node_id: z.string(),
            target_node_id: z.string(),
            label: z.string().nullable(),
            edge_type: z.string().nullable(),
          })),
        }),
        execute: async ({ edges }) => {
          if (!agentId) return { success: false, error: 'No agent ID' }

          await supabase.from('workflow_edges').delete().eq('agent_id', agentId)

          const rows = edges.map((e) => ({
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
        },
      }),

      addSkill: tool({
        description: 'Add a skill to the AI employee. Skills are specific capabilities like "answer FAQs", "write blog posts", etc.',
        inputSchema: z.object({
          name: z.string().describe('Skill name'),
          description: z.string().describe('What this skill does'),
          skill_type: z.string().describe('Type: text_generation, classification, summarization, extraction, research, automation, custom'),
          skill_content: z.string().nullable().describe('The prompt or instruction content for this skill'),
        }),
        execute: async ({ name, description, skill_type, skill_content }) => {
          if (!agentId) return { success: false, error: 'No agent ID' }

          const { error } = await supabase.from('agent_skills').insert({
            agent_id: agentId,
            name,
            description,
            skill_type,
            skill_content,
            is_active: true,
          })

          return error
            ? { success: false, error: error.message }
            : { success: true, skill: name }
        },
      }),

      saveSystemPrompt: tool({
        description: 'Save the final system prompt for the AI employee. This defines the personality and behavior of the deployed agent.',
        inputSchema: z.object({
          system_prompt: z.string().describe('The complete system prompt for the deployed agent'),
        }),
        execute: async ({ system_prompt }) => {
          if (!agentId) return { success: false, error: 'No agent ID' }

          const { error } = await supabase
            .from('agents')
            .update({ system_prompt, updated_at: new Date().toISOString() })
            .eq('id', agentId)

          return error
            ? { success: false, error: error.message }
            : { success: true }
        },
      }),

      checkPlatformCapabilities: tool({
        description: 'Check what the Terabits platform can and cannot do. Use this to verify if a requested capability is available before promising it to the user.',
        inputSchema: z.object({
          capability_name: z.string().describe('The capability to check'),
        }),
        execute: async ({ capability_name }) => {
          const { data } = await supabase
            .from('platform_capabilities')
            .select('*')
            .ilike('name', `%${capability_name}%`)

          if (!data || data.length === 0) {
            return {
              available: false,
              message: `"${capability_name}" is not currently available on Terabits. This capability is not on our roadmap yet.`,
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
        },
      }),
    },
    maxSteps: 8,
  })

  return result.toUIMessageStreamResponse()
}
