// Convert visual workflow to instruction prompt
// This bridges the builder (visual) with execution (instructions)

import type { Agent, WorkflowNode, WorkflowEdge } from '@/lib/types'

/**
 * Generate instruction prompt from workflow
 * The workflow is just a visual representation - we convert it to instructions
 */
export function generateInstructionPrompt(
  agent: Agent,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string {
  const triggerNodes = nodes.filter((n) => n.node_type === 'trigger')
  const actionNodes = nodes.filter((n) => n.node_type === 'action' || n.node_type === 'skill')
  const outputNodes = nodes.filter((n) => n.node_type === 'output')

  let prompt = `You are ${agent.name}, an AI agent designed to ${agent.description || 'help users accomplish their goals'}.

## Your Purpose
${agent.description || 'Help users by following the instructions below.'}

## How You Work
`

  // Add trigger information
  if (triggerNodes.length > 0) {
    prompt += `\nYou are activated when: ${triggerNodes.map((n) => n.label).join(', ')}\n`
  }

  // Add workflow steps
  if (actionNodes.length > 0) {
    prompt += `\n## Your Workflow\n`
    prompt += `Follow these steps to complete your task:\n\n`

    actionNodes.forEach((node, index) => {
      prompt += `${index + 1}. **${node.label}**\n`
      if (node.data?.config?.description) {
        prompt += `   ${node.data.config.description}\n`
      }
      if (node.data?.config?.instructions) {
        prompt += `   Instructions: ${node.data.config.instructions}\n`
      }
      prompt += `\n`
    })
  }

  // Add output format
  if (outputNodes.length > 0) {
    prompt += `\n## Output Format\n`
    outputNodes.forEach((node) => {
      prompt += `- ${node.label}`
      if (node.data?.config?.format) {
        prompt += ` (format: ${node.data.config.format})`
      }
      prompt += `\n`
    })
  }

  // Add general instructions
  prompt += `\n## General Guidelines\n`
  prompt += `- Always explain what you're doing at each step\n`
  prompt += `- Use the available tools to accomplish your tasks\n`
  prompt += `- If you encounter an error, explain it clearly and suggest alternatives\n`
  prompt += `- Return your final result as a structured JSON object\n`

  // Add capabilities
  if (agent.capabilities && Array.isArray(agent.capabilities) && agent.capabilities.length > 0) {
    prompt += `\n## Your Capabilities\n`
    agent.capabilities.forEach((cap: string) => {
      prompt += `- ${cap}\n`
    })
  }

  // Add limitations
  if (agent.limitations && Array.isArray(agent.limitations) && agent.limitations.length > 0) {
    prompt += `\n## Your Limitations\n`
    agent.limitations.forEach((lim: string) => {
      prompt += `- ${lim}\n`
    })
  }

  return prompt
}

/**
 * Extract tool configuration from workflow nodes
 */
export function extractToolConfig(nodes: WorkflowNode[]): Record<string, any> {
  const toolConfig: Record<string, any> = {}

  nodes.forEach((node) => {
    // Map node types to tools
    const toolMapping: Record<string, string> = {
      'web-search': 'web_scrape',
      'web-scraper': 'web_scrape',
      'ai-text': 'ai_process',
      'ai-chat': 'ai_process',
      'data-transform': 'ai_process',
      'api-call': 'read',
    }

    const toolName = toolMapping[node.node_type] || node.node_type

    if (toolName && !toolConfig[toolName]) {
      toolConfig[toolName] = {
        enabled: true,
        config: node.data?.config || {},
      }
    }
  })

  // Always enable write tool for output
  toolConfig['write'] = {
    enabled: true,
    config: {},
  }

  return toolConfig
}

/**
 * Extract execution context from workflow
 */
export function extractExecutionContext(
  agent: Agent,
  nodes: WorkflowNode[]
): Record<string, unknown> {
  const context: Record<string, unknown> = {}

  // Extract from agent settings
  if (agent.settings && typeof agent.settings === 'object') {
    Object.assign(context, agent.settings)
  }

  // Extract from node configurations
  nodes.forEach((node) => {
    if (node.data?.config) {
      const config = node.data.config
      // Add relevant config to context
      if (config.url) context.target_url = config.url
      if (config.keywords) context.keywords = config.keywords
      if (config.outputFormat) context.output_format = config.outputFormat
    }
  })

  return context
}

/**
 * Generate default instruction prompt if no workflow exists
 */
export function generateDefaultInstructionPrompt(agent: Agent): string {
  return `You are ${agent.name}, an AI agent designed to ${agent.description || 'help users accomplish their goals'}.

## Your Purpose
${agent.description || 'Help users by following their instructions and using available tools to complete tasks.'}

## How You Work
1. Listen carefully to the user's request
2. Break down the task into steps
3. Use available tools to accomplish each step
4. Provide clear, structured output

## General Guidelines
- Always explain what you're doing
- Use tools effectively to gather information and process data
- If you encounter an error, explain it and suggest alternatives
- Return results in a clear, structured format

## Output Format
Always return your final result as a JSON object with this structure:
\`\`\`json
{
  "result": "your main result here",
  "details": "additional details if needed",
  "steps_taken": ["step 1", "step 2", "..."]
}
\`\`\`
`
}
