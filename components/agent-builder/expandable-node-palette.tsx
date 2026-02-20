'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Zap,
  Brain,
  GitBranch,
  Send,
  Search,
  Globe,
  Bot,
  ExternalLink,
  MessageSquare,
  Image,
  Eye,
  Shuffle,
  Filter,
  Merge,
  ArrowUpDown,
  Plug,
  Database,
  Timer,
  Repeat,
  CheckCircle,
  GitMerge,
  Clock,
  AlertTriangle,
  Type,
  Table,
  Code,
  BarChart,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Bell,
  Save,
  XCircle,
  MousePointer,
  FormInput,
  Webhook
} from 'lucide-react'
import { ALL_NODE_TYPES, NODE_PALETTE_STRUCTURE, type NodeTypeKey } from '@/lib/types/node-types'

interface ExpandableNodePaletteProps {
  onAddNode: (nodeType: NodeTypeKey) => void
  onClose?: () => void
}

// Icon mapping
const ICON_MAP: Record<string, any> = {
  Zap,
  Brain,
  GitBranch,
  Send,
  Search,
  Globe,
  Bot,
  ExternalLink,
  MessageSquare,
  Image,
  Eye,
  Shuffle,
  Filter,
  Merge,
  ArrowUpDown,
  Plug,
  Database,
  Timer,
  Repeat,
  CheckCircle,
  GitMerge,
  Clock,
  AlertTriangle,
  Type,
  Table,
  Code,
  BarChart,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Bell,
  Save,
  XCircle,
  MousePointer,
  FormInput,
  Webhook
}

// Color mapping
const COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-500 bg-blue-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  amber: 'text-amber-500 bg-amber-500/10',
  green: 'text-green-500 bg-green-500/10'
}

export function ExpandableNodePalette({ onAddNode, onClose }: ExpandableNodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set())

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
        // Also collapse all subcategories
        setExpandedSubcategories(new Set())
      } else {
        next.add(category)
      }
      return next
    })
  }

  const toggleSubcategory = (subcategoryId: string) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev)
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId)
      } else {
        next.add(subcategoryId)
      }
      return next
    })
  }

  return (
    <div className="absolute left-4 top-4 z-10 w-72 rounded-lg border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Node Palette</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Click to add nodes to your workflow
        </p>
      </div>

      {/* Categories */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
        {NODE_PALETTE_STRUCTURE.map((category) => {
          const CategoryIcon = ICON_MAP[category.icon]
          const isExpanded = expandedCategories.has(category.category)
          const colorClass = COLOR_MAP[category.color]

          return (
            <div key={category.category} className="mb-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colorClass}`}>
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{category.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
                  {/* If category has subcategories */}
                  {'subcategories' in category && category.subcategories ? (
                    category.subcategories.map((subcategory) => {
                      const isSubExpanded = expandedSubcategories.has(`${category.category}-${subcategory.id}`)
                      
                      return (
                        <div key={subcategory.id}>
                          {/* Subcategory Header */}
                          <button
                            onClick={() => toggleSubcategory(`${category.category}-${subcategory.id}`)}
                            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                          >
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground">{subcategory.label}</p>
                            </div>
                            {isSubExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                          </button>

                          {/* Subcategory Nodes */}
                          {isSubExpanded && (
                            <div className="ml-2 mt-1 space-y-0.5">
                              {subcategory.types.map((typeKey) => {
                                const nodeType = ALL_NODE_TYPES[typeKey as NodeTypeKey]
                                if (!nodeType) return null
                                
                                const NodeIcon = ICON_MAP[nodeType.icon]
                                
                                return (
                                  <button
                                    key={typeKey}
                                    onClick={() => onAddNode(typeKey as NodeTypeKey)}
                                    className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent group"
                                  >
                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${colorClass}`}>
                                      <NodeIcon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-foreground">{nodeType.label}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{nodeType.description}</p>
                                    </div>
                                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    /* If category has direct types (no subcategories) */
                    'types' in category && category.types.map((typeKey) => {
                      const nodeType = ALL_NODE_TYPES[typeKey as NodeTypeKey]
                      if (!nodeType) return null
                      
                      const NodeIcon = ICON_MAP[nodeType.icon]
                      
                      return (
                        <button
                          key={typeKey}
                          onClick={() => onAddNode(typeKey as NodeTypeKey)}
                          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent group"
                        >
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${colorClass}`}>
                            <NodeIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{nodeType.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{nodeType.description}</p>
                          </div>
                          <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {onClose && (
        <div className="border-t border-border px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={onClose}
          >
            Hide Palette
          </Button>
        </div>
      )}
    </div>
  )
}
