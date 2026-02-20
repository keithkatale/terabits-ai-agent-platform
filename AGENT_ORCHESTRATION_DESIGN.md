# Agent Orchestration Design

## Vision

Build a no-code agent platform where non-technical users can create agents with:
- **Frontend inputs** (forms, buttons, fields)
- **Backend processing** (hidden operations)
- **Frontend outputs** (results display)

## Layout Structure

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: Agent Name | Mode Toggle | Deploy                         │
├──────────┬─────────────────────────────────────┬────────────────────┤
│          │                                     │                    │
│  Chat    │         Canvas (Builder)            │   Agent Frontend   │
│  Panel   │         or                          │   (Runtime)        │
│  25%     │         Workflow Execution          │   25%              │
│          │         50%                         │                    │
│          │                                     │                    │
│  AI      │   ┌─────────┐                       │   ┌──────────────┐ │
│  Help    │   │ Input   │                       │   │ Input Form   │ │
│  &       │   │ Node    │                       │   │              │ │
│  Guide   │   └────┬────┘                       │   │ [URL Field]  │ │
│          │        │                            │   │              │ │
│          │        ▼                            │   │ [Run Button] │ │
│          │   ┌─────────┐                       │   └──────────────┘ │
│          │   │Process  │                       │                    │
│          │   │ Node    │                       │   ┌──────────────┐ │
│          │   └────┬────┘                       │   │ Output       │ │
│          │        │                            │   │              │ │
│          │        ▼                            │   │ [Results]    │ │
│          │   ┌─────────┐                       │   │              │ │
│          │   │ Output  │                       │   │ [Data Table] │ │
│          │   │ Node    │                       │   └──────────────┘ │
│          │   └─────────┘                       │                    │
└──────────┴─────────────────────────────────────┴────────────────────┘
```

## Node Types & Frontend Mapping

### 1. Input Nodes (Frontend-Facing)

#### Input Node Types
```typescript
type InputNodeType = 
  | 'text-input'      // Single line text
  | 'textarea-input'  // Multi-line text
  | 'url-input'       // URL with validation
  | 'number-input'    // Numeric input
  | 'date-input'      // Date picker
  | 'select-input'    // Dropdown
  | 'multi-select'    // Multiple selection
  | 'file-upload'     // File upload
  | 'button-trigger'  // Button click
```

#### Example: URL Scraper Input
```typescript
{
  id: 'input-1',
  type: 'url-input',
  data: {
    label: 'Website URL',
    placeholder: 'https://example.com',
    validation: {
      required: true,
      pattern: /^https?:\/\/.+/,
      errorMessage: 'Please enter a valid URL'
    },
    frontend: {
      component: 'URLInput',
      width: 'full',
      helpText: 'Enter the website you want to scrape'
    }
  }
}
```

#### Frontend Rendering
```tsx
<div className="space-y-4">
  <label>Website URL</label>
  <input 
    type="url" 
    placeholder="https://example.com"
    pattern="^https?://.+"
    required
  />
  <p className="text-xs text-muted-foreground">
    Enter the website you want to scrape
  </p>
</div>
```

### 2. Processing Nodes (Backend-Only)

#### Processing Node Types
```typescript
type ProcessingNodeType =
  | 'web-scraper'     // Scrape web content
  | 'api-call'        // HTTP request
  | 'data-transform'  // Transform data
  | 'ai-process'      // AI processing
  | 'filter'          // Filter data
  | 'map'             // Map/transform array
  | 'reduce'          // Reduce array
  | 'condition'       // If/else logic
  | 'loop'            // Iterate over data
  | 'delay'           // Wait/delay
```

#### Example: Web Scraper Node
```typescript
{
  id: 'process-1',
  type: 'web-scraper',
  data: {
    label: 'Scrape Content',
    config: {
      selector: 'article h2',
      extractType: 'text',
      multiple: true
    },
    inputs: {
      url: '{{input-1.value}}' // Reference to input node
    },
    outputs: {
      results: 'array<string>'
    }
  }
}
```

### 3. Output Nodes (Frontend-Facing)

#### Output Node Types
```typescript
type OutputNodeType =
  | 'text-display'    // Display text
  | 'table-display'   // Data table
  | 'json-display'    // JSON viewer
  | 'chart-display'   // Charts/graphs
  | 'list-display'    // List of items
  | 'card-display'    // Card grid
  | 'download-button' // Download results
  | 'copy-button'     // Copy to clipboard
```

#### Example: Table Output
```typescript
{
  id: 'output-1',
  type: 'table-display',
  data: {
    label: 'Scraped Results',
    config: {
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'url', label: 'URL' }
      ],
      pagination: true,
      pageSize: 10
    },
    inputs: {
      data: '{{process-1.results}}' // Reference to processing node
    },
    frontend: {
      component: 'DataTable',
      showDownload: true,
      showCopy: true
    }
  }
}
```

#### Frontend Rendering
```tsx
<div className="space-y-4">
  <h3>Scraped Results</h3>
  <DataTable 
    columns={[
      { key: 'title', label: 'Title' },
      { key: 'url', label: 'URL' }
    ]}
    data={results}
    pagination
    pageSize={10}
  />
  <div className="flex gap-2">
    <Button>Download CSV</Button>
    <Button>Copy to Clipboard</Button>
  </div>
</div>
```

## Agent Execution Flow

### 1. Build Mode (Canvas)
User builds workflow by connecting nodes:
```
Input Node → Processing Node → Output Node
```

### 2. Runtime Mode (Agent Frontend)
User interacts with the agent:

```typescript
// Step 1: Render Input Nodes
<AgentFrontend>
  <InputForm>
    {inputNodes.map(node => (
      <InputField key={node.id} config={node.data} />
    ))}
    <Button onClick={runAgent}>Run Agent</Button>
  </InputForm>
</AgentFrontend>

// Step 2: Execute Processing Nodes (Backend)
async function runAgent(inputs) {
  const execution = await executeWorkflow({
    agentId,
    inputs,
    nodes: processingNodes
  })
  
  return execution.outputs
}

// Step 3: Render Output Nodes
<AgentFrontend>
  <OutputDisplay>
    {outputNodes.map(node => (
      <OutputComponent 
        key={node.id} 
        config={node.data}
        data={execution.outputs[node.id]}
      />
    ))}
  </OutputDisplay>
</AgentFrontend>
```

## Example: Reddit Scraper Agent

### Workflow Definition
```typescript
const workflow = {
  nodes: [
    // Input Node (Frontend)
    {
      id: 'input-1',
      type: 'text-input',
      data: {
        label: 'Keyword',
        placeholder: 'Enter keyword to search',
        validation: { required: true }
      }
    },
    
    // Processing Node (Backend)
    {
      id: 'process-1',
      type: 'web-scraper',
      data: {
        label: 'Search Reddit',
        config: {
          url: 'https://reddit.com/search?q={{input-1.value}}',
          selector: '.search-result',
          extract: ['title', 'url', 'score']
        }
      }
    },
    
    // Processing Node (Backend)
    {
      id: 'process-2',
      type: 'filter',
      data: {
        label: 'Filter by Score',
        config: {
          condition: 'score > 100'
        }
      }
    },
    
    // Output Node (Frontend)
    {
      id: 'output-1',
      type: 'table-display',
      data: {
        label: 'Results',
        config: {
          columns: [
            { key: 'title', label: 'Post Title' },
            { key: 'url', label: 'URL' },
            { key: 'score', label: 'Score' }
          ]
        }
      }
    }
  ],
  edges: [
    { source: 'input-1', target: 'process-1' },
    { source: 'process-1', target: 'process-2' },
    { source: 'process-2', target: 'output-1' }
  ]
}
```

### Frontend Rendering
```tsx
// Agent Frontend Panel (25% right side)
<div className="w-1/4 border-l">
  {/* Input Section */}
  <div className="p-4 border-b">
    <h3>Input</h3>
    <input 
      type="text"
      placeholder="Enter keyword to search"
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
    <button onClick={runAgent}>Search Reddit</button>
  </div>
  
  {/* Output Section */}
  <div className="p-4">
    <h3>Results</h3>
    {loading && <Spinner />}
    {results && (
      <DataTable 
        columns={[
          { key: 'title', label: 'Post Title' },
          { key: 'url', label: 'URL' },
          { key: 'score', label: 'Score' }
        ]}
        data={results}
      />
    )}
  </div>
</div>
```

## Node Configuration UI

### Input Node Configuration
```tsx
<NodeConfig>
  <Select label="Input Type">
    <option value="text">Text Input</option>
    <option value="url">URL Input</option>
    <option value="number">Number Input</option>
  </Select>
  
  <Input label="Label" placeholder="Field label" />
  <Input label="Placeholder" placeholder="Placeholder text" />
  <Checkbox label="Required" />
  
  {inputType === 'url' && (
    <Input label="URL Pattern" placeholder="https?://.*" />
  )}
</NodeConfig>
```

### Processing Node Configuration
```tsx
<NodeConfig>
  <Select label="Operation Type">
    <option value="web-scraper">Web Scraper</option>
    <option value="api-call">API Call</option>
    <option value="ai-process">AI Processing</option>
  </Select>
  
  {operationType === 'web-scraper' && (
    <>
      <Input label="URL" placeholder="{{input-1.value}}" />
      <Input label="CSS Selector" placeholder=".result" />
      <MultiSelect label="Extract Fields">
        <option value="text">Text</option>
        <option value="href">Links</option>
        <option value="src">Images</option>
      </MultiSelect>
    </>
  )}
</NodeConfig>
```

### Output Node Configuration
```tsx
<NodeConfig>
  <Select label="Display Type">
    <option value="table">Table</option>
    <option value="list">List</option>
    <option value="json">JSON</option>
  </Select>
  
  {displayType === 'table' && (
    <>
      <ColumnBuilder>
        <Column key="title" label="Title" />
        <Column key="url" label="URL" />
      </ColumnBuilder>
      <Checkbox label="Enable Pagination" />
      <Checkbox label="Enable Download" />
    </>
  )}
</NodeConfig>
```

## Database Schema Updates

### workflow_nodes (Enhanced)
```sql
ALTER TABLE workflow_nodes ADD COLUMN node_category TEXT; -- 'input', 'processing', 'output'
ALTER TABLE workflow_nodes ADD COLUMN frontend_config JSONB; -- Frontend rendering config
ALTER TABLE workflow_nodes ADD COLUMN validation_rules JSONB; -- Input validation
ALTER TABLE workflow_nodes ADD COLUMN processing_config JSONB; -- Backend processing config
```

### agent_executions (New)
```sql
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  inputs JSONB NOT NULL, -- User inputs
  outputs JSONB, -- Execution results
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);
```

## API Endpoints

### Execute Agent
```typescript
POST /api/agents/[id]/execute
{
  inputs: {
    'input-1': 'AI tools'
  }
}

Response: {
  executionId: 'uuid',
  status: 'running'
}
```

### Get Execution Status
```typescript
GET /api/agents/[id]/executions/[executionId]

Response: {
  id: 'uuid',
  status: 'completed',
  outputs: {
    'output-1': [
      { title: 'Post 1', url: '...', score: 150 },
      { title: 'Post 2', url: '...', score: 200 }
    ]
  },
  duration_ms: 2500
}
```

### Stream Execution (SSE)
```typescript
GET /api/agents/[id]/executions/[executionId]/stream

Events:
- status: { status: 'running', node: 'process-1' }
- progress: { node: 'process-1', progress: 50 }
- output: { node: 'output-1', data: [...] }
- complete: { status: 'completed', duration_ms: 2500 }
```

## Implementation Plan

### Phase 1: Node Categories & Configuration
1. Update node types to include category (input/processing/output)
2. Add configuration panels for each node type
3. Implement validation rules for input nodes
4. Create processing config for backend nodes
5. Design output display components

### Phase 2: Agent Frontend Panel
1. Create AgentFrontend component (25% right side)
2. Implement input form renderer
3. Implement output display renderer
4. Add loading states and error handling
5. Create execution controls (Run, Stop, Reset)

### Phase 3: Execution Engine
1. Create workflow execution service
2. Implement node-by-node execution
3. Add variable interpolation ({{node-id.field}})
4. Implement error handling and retries
5. Add execution logging and monitoring

### Phase 4: Processing Node Implementations
1. Web scraper node
2. API call node
3. Data transformation nodes
4. AI processing nodes
5. Condition and loop nodes

### Phase 5: Polish & Testing
1. Add execution history
2. Implement agent sharing/publishing
3. Add usage analytics
4. Performance optimization
5. User testing and feedback

## Next Steps

1. Update layout to 25% | 50% | 25%
2. Create node category system
3. Build AgentFrontend component
4. Implement basic input/output nodes
5. Create execution engine

---

**Status:** 📋 Design Complete - Ready for Implementation
**Date:** February 20, 2026
