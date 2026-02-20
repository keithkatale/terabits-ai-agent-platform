// OpenClaw Integration for Terabits
// This module bridges Terabits' visual workflow builder with OpenClaw's execution engine

export { translateWorkflowToOpenClaw } from './workflow-translator'
export { generateSkillsFromWorkflow } from './skill-generator'
export { generateSystemPrompt } from './system-prompt-generator'
export { executeAgent } from './openclaw-runner'
export { parseExecutionResult } from './result-parser'

export type {
  OpenClawConfig,
  SkillDefinition,
  ExecutionResult,
  ExecutionEvent,
} from './types'
