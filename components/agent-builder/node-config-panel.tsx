'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { TriggerConfigPanel } from './trigger-config'
import { WebSearchConfig } from './node-configs/web-search-config'
import { ApifyActorConfig } from './node-configs/apify-actor-config'
import { AITextConfig } from './node-configs/ai-text-config'
import { WebScraperConfig } from './node-configs/web-scraper-config'
import { DisplayTableConfig } from './node-configs/display-table-config'
import type { NodeTypeKey } from '@/lib/types/node-types'

interface NodeConfigPanelProps {
  nodeId: string
  nodeTypeKey: NodeTypeKey
  currentConfig?: any
  onSave: (config: any) => void
  onClose: () => void
}

export function NodeConfigPanel({
  nodeId,
  nodeTypeKey,
  currentConfig,
  onSave,
  onClose
}: NodeConfigPanelProps) {
  const [config, setConfig] = useState(currentConfig || {})

  const handleSave = () => {
    onSave(config)
    onClose()
  }

  // Check if this is a trigger node
  const isTriggerNode = ['button-trigger', 'input-form', 'schedule-trigger', 'webhook-trigger'].includes(nodeTypeKey)

  // Render the appropriate config component based on node type
  const renderConfigComponent = () => {
    // Handle trigger nodes
    if (nodeTypeKey === 'button-trigger' || nodeTypeKey === 'input-form' || 
        nodeTypeKey === 'schedule-trigger' || nodeTypeKey === 'webhook-trigger') {
      return <TriggerConfigPanel config={config} nodeTypeKey={nodeTypeKey} onChange={setConfig} onClose={onClose} />
    }
    
    // Handle action nodes
    switch (nodeTypeKey) {
      case 'web-search':
        return <WebSearchConfig config={config} onChange={setConfig} />
      
      case 'apify-actor':
        return <ApifyActorConfig config={config} onChange={setConfig} />
      
      case 'ai-text':
        return <AITextConfig config={config} onChange={setConfig} />
      
      case 'web-scraper':
        return <WebScraperConfig config={config} onChange={setConfig} />
      
      case 'display-table':
        return <DisplayTableConfig config={config} onChange={setConfig} />
      
      default:
        return (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Configuration for {nodeTypeKey} is not yet implemented.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-border bg-card shadow-xl flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Configure Node</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {nodeTypeKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Trigger nodes handle their own footer */}
      {isTriggerNode ? (
        renderConfigComponent()
      ) : (
        <>
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {renderConfigComponent()}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
