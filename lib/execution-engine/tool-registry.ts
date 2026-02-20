// Tool registry - defines all available tools for agents

import type { Tool } from './types'
import { webScrape } from './tools/web-scrape'
import { aiProcess } from './tools/ai-process'
import { writeOutput } from './tools/write-output'
import { readData } from './tools/read-data'

/**
 * Global tool registry
 * All tools available to agents are registered here
 */
export const toolRegistry = new Map<string, Tool>([
  ['web_scrape', webScrape],
  ['ai_process', aiProcess],
  ['write', writeOutput],
  ['read', readData],
])

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name)
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return Array.from(toolRegistry.keys())
}

/**
 * Register a new tool
 */
export function registerTool(tool: Tool): void {
  toolRegistry.set(tool.name, tool)
}
