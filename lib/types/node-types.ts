// Complete Node Type Definitions

// ============================================
// TRIGGER NODES (Start the workflow)
// ============================================

export const TRIGGER_TYPES = {
  'button-trigger': {
    label: 'Button Click',
    description: 'User clicks a button to start',
    icon: 'MousePointer',
    category: 'trigger',
    color: 'blue'
  },
  'input-form': {
    label: 'Input Form',
    description: 'Collect user inputs via form',
    icon: 'FormInput',
    category: 'trigger',
    color: 'blue'
  },
  'schedule-trigger': {
    label: 'Schedule',
    description: 'Run automatically on schedule',
    icon: 'Clock',
    category: 'trigger',
    color: 'blue'
  },
  'webhook-trigger': {
    label: 'Webhook',
    description: 'Trigger via external webhook',
    icon: 'Webhook',
    category: 'trigger',
    color: 'blue'
  }
} as const

// ============================================
// ACTION NODES (Process or transform data)
// ============================================

export const ACTION_TYPES = {
  // Web & Scraping
  'web-search': {
    label: 'Web Search',
    description: 'Search the web using Serper.dev',
    icon: 'Search',
    category: 'action',
    subcategory: 'web',
    color: 'purple'
  },
  'web-scraper': {
    label: 'Web Scraper',
    description: 'Scrape content from websites',
    icon: 'Globe',
    category: 'action',
    subcategory: 'web',
    color: 'purple'
  },
  'apify-actor': {
    label: 'Apify Actor',
    description: 'Run Apify scraping actors',
    icon: 'Bot',
    category: 'action',
    subcategory: 'web',
    color: 'purple'
  },
  'visit-page': {
    label: 'Visit Page',
    description: 'Navigate to a specific webpage',
    icon: 'ExternalLink',
    category: 'action',
    subcategory: 'web',
    color: 'purple'
  },
  
  // AI Processing
  'ai-text': {
    label: 'AI Text Processing',
    description: 'Process text with AI (summarize, extract, etc.)',
    icon: 'Brain',
    category: 'action',
    subcategory: 'ai',
    color: 'purple'
  },
  'ai-chat': {
    label: 'AI Chat',
    description: 'Have a conversation with AI',
    icon: 'MessageSquare',
    category: 'action',
    subcategory: 'ai',
    color: 'purple'
  },
  'ai-image': {
    label: 'AI Image Generation',
    description: 'Generate images with AI',
    icon: 'Image',
    category: 'action',
    subcategory: 'ai',
    color: 'purple'
  },
  'ai-vision': {
    label: 'AI Vision',
    description: 'Analyze images with AI',
    icon: 'Eye',
    category: 'action',
    subcategory: 'ai',
    color: 'purple'
  },
  
  // Data Operations
  'data-transform': {
    label: 'Transform Data',
    description: 'Map, filter, or transform data',
    icon: 'Shuffle',
    category: 'action',
    subcategory: 'data',
    color: 'purple'
  },
  'data-filter': {
    label: 'Filter Data',
    description: 'Filter data based on conditions',
    icon: 'Filter',
    category: 'action',
    subcategory: 'data',
    color: 'purple'
  },
  'data-merge': {
    label: 'Merge Data',
    description: 'Combine multiple data sources',
    icon: 'Merge',
    category: 'action',
    subcategory: 'data',
    color: 'purple'
  },
  'data-sort': {
    label: 'Sort Data',
    description: 'Sort data by field',
    icon: 'ArrowUpDown',
    category: 'action',
    subcategory: 'data',
    color: 'purple'
  },
  
  // API & Integration
  'api-call': {
    label: 'API Call',
    description: 'Make HTTP API requests',
    icon: 'Plug',
    category: 'action',
    subcategory: 'integration',
    color: 'purple'
  },
  'database-query': {
    label: 'Database Query',
    description: 'Query a database',
    icon: 'Database',
    category: 'action',
    subcategory: 'integration',
    color: 'purple'
  },
  
  // Utility
  'delay': {
    label: 'Delay',
    description: 'Wait for a specified time',
    icon: 'Timer',
    category: 'action',
    subcategory: 'utility',
    color: 'purple'
  },
  'loop': {
    label: 'Loop',
    description: 'Iterate over items',
    icon: 'Repeat',
    category: 'action',
    subcategory: 'utility',
    color: 'purple'
  }
} as const

// ============================================
// CONDITION NODES (Branch based on logic)
// ============================================

export const CONDITION_TYPES = {
  'if-else': {
    label: 'If/Else',
    description: 'Branch based on condition',
    icon: 'GitBranch',
    category: 'condition',
    subcategory: 'logic',
    color: 'amber'
  },
  'switch': {
    label: 'Switch',
    description: 'Multiple condition branches',
    icon: 'GitMerge',
    category: 'condition',
    subcategory: 'logic',
    color: 'amber'
  },
  'data-condition': {
    label: 'Data Condition',
    description: 'Check data properties',
    icon: 'CheckCircle',
    category: 'condition',
    subcategory: 'data',
    color: 'amber'
  },
  'time-condition': {
    label: 'Time Condition',
    description: 'Branch based on time/date',
    icon: 'Clock',
    category: 'condition',
    subcategory: 'time',
    color: 'amber'
  },
  'error-handler': {
    label: 'Error Handler',
    description: 'Handle errors and exceptions',
    icon: 'AlertTriangle',
    category: 'condition',
    subcategory: 'error',
    color: 'amber'
  }
} as const

// ============================================
// OUTPUT NODES (Send results)
// ============================================

export const OUTPUT_TYPES = {
  // Display
  'display-text': {
    label: 'Display Text',
    description: 'Show text on screen',
    icon: 'Type',
    category: 'output',
    subcategory: 'display',
    color: 'green'
  },
  'display-table': {
    label: 'Display Table',
    description: 'Show data in a table',
    icon: 'Table',
    category: 'output',
    subcategory: 'display',
    color: 'green'
  },
  'display-json': {
    label: 'Display JSON',
    description: 'Show JSON data',
    icon: 'Code',
    category: 'output',
    subcategory: 'display',
    color: 'green'
  },
  'display-chart': {
    label: 'Display Chart',
    description: 'Show data as chart',
    icon: 'BarChart',
    category: 'output',
    subcategory: 'display',
    color: 'green'
  },
  'display-image': {
    label: 'Display Image',
    description: 'Show an image',
    icon: 'Image',
    category: 'output',
    subcategory: 'display',
    color: 'green'
  },
  
  // Download
  'download-file': {
    label: 'Download File',
    description: 'Download data as file',
    icon: 'Download',
    category: 'output',
    subcategory: 'download',
    color: 'green'
  },
  'download-csv': {
    label: 'Download CSV',
    description: 'Download as CSV file',
    icon: 'FileSpreadsheet',
    category: 'output',
    subcategory: 'download',
    color: 'green'
  },
  'download-pdf': {
    label: 'Download PDF',
    description: 'Download as PDF file',
    icon: 'FileText',
    category: 'output',
    subcategory: 'download',
    color: 'green'
  },
  
  // Send/Notify
  'send-email': {
    label: 'Send Email',
    description: 'Send results via email',
    icon: 'Mail',
    category: 'output',
    subcategory: 'send',
    color: 'green'
  },
  'send-webhook': {
    label: 'Send Webhook',
    description: 'Send to external webhook',
    icon: 'Send',
    category: 'output',
    subcategory: 'send',
    color: 'green'
  },
  'send-notification': {
    label: 'Send Notification',
    description: 'Send in-app notification',
    icon: 'Bell',
    category: 'output',
    subcategory: 'send',
    color: 'green'
  },
  
  // Storage
  'save-database': {
    label: 'Save to Database',
    description: 'Store in database',
    icon: 'Database',
    category: 'output',
    subcategory: 'storage',
    color: 'green'
  },
  'save-file': {
    label: 'Save to File',
    description: 'Save to file storage',
    icon: 'Save',
    category: 'output',
    subcategory: 'storage',
    color: 'green'
  },
  
  // End
  'end-success': {
    label: 'End (Success)',
    description: 'Complete workflow successfully',
    icon: 'CheckCircle',
    category: 'output',
    subcategory: 'end',
    color: 'green'
  },
  'end-error': {
    label: 'End (Error)',
    description: 'End with error message',
    icon: 'XCircle',
    category: 'output',
    subcategory: 'end',
    color: 'green'
  }
} as const

// ============================================
// COMBINED NODE TYPES
// ============================================

export const ALL_NODE_TYPES = {
  ...TRIGGER_TYPES,
  ...ACTION_TYPES,
  ...CONDITION_TYPES,
  ...OUTPUT_TYPES
} as const

export type NodeTypeKey = keyof typeof ALL_NODE_TYPES

// ============================================
// NODE PALETTE STRUCTURE
// ============================================

export const NODE_PALETTE_STRUCTURE = [
  {
    category: 'trigger',
    label: 'Trigger',
    description: 'Start the workflow',
    icon: 'Zap',
    color: 'blue',
    types: Object.keys(TRIGGER_TYPES)
  },
  {
    category: 'action',
    label: 'Action',
    description: 'Process or transform data',
    icon: 'Brain',
    color: 'purple',
    subcategories: [
      {
        id: 'web',
        label: 'Web & Scraping',
        types: Object.entries(ACTION_TYPES)
          .filter(([_, v]) => v.subcategory === 'web')
          .map(([k]) => k)
      },
      {
        id: 'ai',
        label: 'AI Processing',
        types: Object.entries(ACTION_TYPES)
          .filter(([_, v]) => v.subcategory === 'ai')
          .map(([k]) => k)
      },
      {
        id: 'data',
        label: 'Data Operations',
        types: Object.entries(ACTION_TYPES)
          .filter(([_, v]) => v.subcategory === 'data')
          .map(([k]) => k)
      },
      {
        id: 'integration',
        label: 'API & Integration',
        types: Object.entries(ACTION_TYPES)
          .filter(([_, v]) => v.subcategory === 'integration')
          .map(([k]) => k)
      },
      {
        id: 'utility',
        label: 'Utility',
        types: Object.entries(ACTION_TYPES)
          .filter(([_, v]) => v.subcategory === 'utility')
          .map(([k]) => k)
      }
    ]
  },
  {
    category: 'condition',
    label: 'Condition',
    description: 'Branch based on logic',
    icon: 'GitBranch',
    color: 'amber',
    subcategories: [
      {
        id: 'logic',
        label: 'Logic',
        types: Object.entries(CONDITION_TYPES)
          .filter(([_, v]) => v.subcategory === 'logic')
          .map(([k]) => k)
      },
      {
        id: 'data',
        label: 'Data Checks',
        types: Object.entries(CONDITION_TYPES)
          .filter(([_, v]) => v.subcategory === 'data')
          .map(([k]) => k)
      },
      {
        id: 'time',
        label: 'Time-based',
        types: Object.entries(CONDITION_TYPES)
          .filter(([_, v]) => v.subcategory === 'time')
          .map(([k]) => k)
      },
      {
        id: 'error',
        label: 'Error Handling',
        types: Object.entries(CONDITION_TYPES)
          .filter(([_, v]) => v.subcategory === 'error')
          .map(([k]) => k)
      }
    ]
  },
  {
    category: 'output',
    label: 'Output',
    description: 'Send results',
    icon: 'Send',
    color: 'green',
    subcategories: [
      {
        id: 'display',
        label: 'Display',
        types: Object.entries(OUTPUT_TYPES)
          .filter(([_, v]) => v.subcategory === 'display')
          .map(([k]) => k)
      },
      {
        id: 'download',
        label: 'Download',
        types: Object.entries(OUTPUT_TYPES)
          .filter(([_, v]) => v.subcategory === 'download')
          .map(([k]) => k)
      },
      {
        id: 'send',
        label: 'Send/Notify',
        types: Object.entries(OUTPUT_TYPES)
          .filter(([_, v]) => v.subcategory === 'send')
          .map(([k]) => k)
      },
      {
        id: 'storage',
        label: 'Storage',
        types: Object.entries(OUTPUT_TYPES)
          .filter(([_, v]) => v.subcategory === 'storage')
          .map(([k]) => k)
      },
      {
        id: 'end',
        label: 'End Workflow',
        types: Object.entries(OUTPUT_TYPES)
          .filter(([_, v]) => v.subcategory === 'end')
          .map(([k]) => k)
      }
    ]
  }
] as const
