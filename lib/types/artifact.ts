// Artifact types for plan presentation

export type ArtifactType = 'plan' | 'workflow' | 'document'

export interface AgentPlanArtifact {
  id: string
  type: 'plan'
  title: string
  agentName: string
  category: string
  description: string
  capabilities: string[]
  limitations: string[]
  workflow: {
    steps: Array<{
      id: string
      type: 'trigger' | 'action' | 'condition' | 'output'
      label: string
      description: string
    }>
  }
  estimatedBuildTime?: string
  createdAt: string
}

export interface Artifact {
  id: string
  type: ArtifactType
  title: string
  content: string | AgentPlanArtifact
  createdAt: string
  updatedAt: string
}
