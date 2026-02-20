'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Search, Globe, Bot, Brain, Shuffle, Plug } from 'lucide-react'

export function SkillNode({ data }: NodeProps) {
  const config = (data as any).config || {}
  const nodeTypeKey = (data as any).nodeTypeKey || ''
  
  // Determine icon and details based on action type
  const getActionDetails = () => {
    switch (nodeTypeKey) {
      case 'web-search':
        return {
          icon: Search,
          title: 'Web Search',
          details: config.query ? `Query: ${config.query.substring(0, 30)}${config.query.length > 30 ? '...' : ''}` : 'No query configured',
          subtitle: config.numResults ? `${config.numResults} results` : '',
          color: 'purple'
        }
      case 'web-scraper':
        const selectorCount = config.selectors?.length || 0
        return {
          icon: Globe,
          title: 'Web Scraper',
          details: config.url ? `URL: ${config.url.substring(0, 30)}${config.url.length > 30 ? '...' : ''}` : 'No URL configured',
          subtitle: selectorCount > 0 ? `${selectorCount} selector${selectorCount !== 1 ? 's' : ''}` : 'No selectors',
          color: 'purple'
        }
      case 'apify-actor':
        return {
          icon: Bot,
          title: 'Apify Actor',
          details: config.actorId || 'No actor selected',
          subtitle: config.timeout ? `Timeout: ${config.timeout}s` : '',
          color: 'purple'
        }
      case 'ai-text':
        return {
          icon: Brain,
          title: 'AI Text Processing',
          details: config.operation ? config.operation.charAt(0).toUpperCase() + config.operation.slice(1) : 'Custom',
          subtitle: config.model || 'gemini-3-flash-preview',
          color: 'purple'
        }
      case 'data-transform':
        return {
          icon: Shuffle,
          title: 'Transform Data',
          details: config.operation || 'Not configured',
          subtitle: '',
          color: 'purple'
        }
      case 'api-call':
        return {
          icon: Plug,
          title: 'API Call',
          details: config.url ? `${config.method || 'GET'} ${config.url.substring(0, 25)}${config.url.length > 25 ? '...' : ''}` : 'No URL configured',
          subtitle: '',
          color: 'purple'
        }
      default:
        return {
          icon: Brain,
          title: (data as any).label || 'Action',
          details: 'Click to configure',
          subtitle: '',
          color: 'purple'
        }
    }
  }

  const { icon: Icon, title, details, subtitle } = getActionDetails()

  return (
    <div className="rounded-lg border-2 border-purple-500 bg-card shadow-md hover:shadow-lg transition-shadow min-w-[200px] max-w-[280px]">
      {/* Connection handles on all 4 sides */}
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      
      {/* Header */}
      <div className="bg-purple-500/10 border-b border-purple-500/20 px-3 py-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/20">
          <Icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground">Action</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-3 py-2.5">
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">Configuration:</p>
          <p className="text-xs text-foreground break-words">{details}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          )}
          
          {/* Show prompt preview for AI nodes */}
          {nodeTypeKey === 'ai-text' && config.prompt && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Prompt:</p>
              <p className="text-[10px] text-foreground line-clamp-2">{config.prompt}</p>
            </div>
          )}
          
          {/* Show selectors for web scraper */}
          {nodeTypeKey === 'web-scraper' && config.selectors && config.selectors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border space-y-1">
              {config.selectors.slice(0, 2).map((sel: any, idx: number) => (
                <div key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-purple-500" />
                  <span className="truncate">{sel.name || `Selector ${idx + 1}`}</span>
                </div>
              ))}
              {config.selectors.length > 2 && (
                <p className="text-[10px] text-muted-foreground">+{config.selectors.length - 2} more</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
