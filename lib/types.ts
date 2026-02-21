export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  plan: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string
  status: 'draft' | 'building' | 'ready' | 'deployed' | 'paused'
  system_prompt: string | null
  model: string
  settings: Record<string, unknown>
  deploy_slug: string | null
  is_deployed: boolean
  conversation_phase: 'discovery' | 'planning' | 'building' | 'refining' | 'testing' | 'complete'
  capabilities: string[]
  limitations: string[]
  instruction_prompt?: string | null
  tool_config?: Record<string, unknown>
  execution_context?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentSkill {
  id: string
  agent_id: string
  name: string
  description: string | null
  skill_content: string | null
  skill_type: string
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkflowNode {
  id: string
  agent_id: string
  node_id: string
  node_type: string
  label: string
  position_x: number
  position_y: number
  data: Record<string, unknown>
  created_at: string
}

export interface WorkflowEdge {
  id: string
  agent_id: string
  edge_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
  edge_type: string
  data: Record<string, unknown>
  created_at: string
}

export interface Message {
  id: string
  agent_id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  message_type: 'builder' | 'runtime' | 'system'
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentMemory {
  id: string
  agent_id: string
  memory_type: string
  content: string
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgentSchedule {
  id: string
  agent_id: string
  name: string
  description: string | null
  cron_expression: string
  task_list: unknown[]
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

export interface ExecutionLog {
  id: string
  agent_id: string
  session_id: string | null
  lane: string
  status: string
  input: unknown
  output: unknown
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface GeneratedImage {
  id: string
  agent_id: string
  execution_log_id: string | null
  prompt: string
  resolution: string
  storage_path: string
  public_url: string
  file_size_kb: number | null
  mime_type: string
  created_at: string
  updated_at: string
}

export interface PlatformCapability {
  id: string
  name: string
  description: string | null
  category: string
  is_available: boolean
  coming_soon: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// Conversation phase metadata
export interface ConversationPhase {
  phase: Agent['conversation_phase']
  label: string
  description: string
  icon: string
}

export const CONVERSATION_PHASES: ConversationPhase[] = [
  { phase: 'discovery', label: 'Understanding', description: 'Learning what you need', icon: 'search' },
  { phase: 'planning', label: 'Planning', description: 'Designing your AI employee', icon: 'clipboard' },
  { phase: 'building', label: 'Building', description: 'Assembling skills and workflow', icon: 'hammer' },
  { phase: 'refining', label: 'Refining', description: 'Fine-tuning behavior', icon: 'settings' },
  { phase: 'testing', label: 'Testing', description: 'Running test scenarios', icon: 'play' },
  { phase: 'complete', label: 'Ready', description: 'Your AI employee is ready', icon: 'check' },
]

export const AGENT_CATEGORIES = [
  { value: 'customer_support', label: 'Customer Support', description: 'Handle customer queries and tickets' },
  { value: 'content_creation', label: 'Content Creator', description: 'Generate posts, blogs, and copy' },
  { value: 'data_analysis', label: 'Data Analyst', description: 'Analyze data and generate reports' },
  { value: 'task_automation', label: 'Task Automator', description: 'Automate repetitive workflows' },
  { value: 'personal_assistant', label: 'Personal Assistant', description: 'Manage calendar, emails, tasks' },
  { value: 'research_agent', label: 'Researcher', description: 'Web research and competitive analysis' },
  { value: 'general', label: 'General Purpose', description: 'Custom AI employee for any task' },
]
