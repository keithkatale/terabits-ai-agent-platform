// Agent Runtime: OpenClaw-inspired agent execution system for Terabits

// Core types
export * from './types'

// Agent execution
export { runAgentLoop, enqueueAgentRun, waitForAgentRun } from './agent-loop'

// Session management
export { SessionManager } from './session-manager'

// Lane queue
export { laneQueue } from './lane-queue'

// Tool system
export {
  loadAgentTools,
  getToolByName,
  getToolsByCategory,
  listToolNames,
  getToolMetadata,
} from './tools'

// Tool policy
export {
  loadToolPolicy,
  saveToolPolicy,
  filterToolsByPolicy,
  isToolAllowed,
  getToolsByCategory as getToolsByCategoryFromPolicy,
  validateToolCallCount,
  createDefaultToolPolicy,
  getToolUsageStats,
} from './tool-policy'

// Convenience function to initialize agent runtime
export async function initializeAgentRuntime(agentId: string) {
  const { loadToolPolicy, createDefaultToolPolicy } = await import('./tool-policy')
  const { loadAgentTools } = await import('./tools')

  // Ensure tool policy exists
  let policy = await loadToolPolicy(agentId)
  if (!policy) {
    await createDefaultToolPolicy(agentId, 'general')
    policy = await loadToolPolicy(agentId)
  }

  // Load tools
  const tools = await loadAgentTools(agentId)

  return {
    policy,
    tools,
    toolCount: tools.length,
  }
}
