# Agent Orchestration Examples

## Overview

This document outlines real-world agent orchestration patterns based on actual use cases. Each example shows how nodes connect, what configurations they need, and how data flows through the system.

---

## Example 1: YouTube Transcript Summarizer

### Use Case
User provides a YouTube URL → Agent scrapes transcript → AI summarizes → Returns clean summary

### Workflow Diagram
```
┌─────────────┐
│   INPUT     │ YouTube URL
│  (Trigger)  │ Type: URL Input
└──────┬──────┘
       │ {{input.url}}
       ▼
┌─────────────┐
│  APIFY API  │ YouTube Transcript Scraper
│ (Processing)│ Actor: youtube-transcript-scraper
└──────┬──────┘
       │ {{apify.transcript}}
       ▼
┌─────────────┐
│  AI NODE    │ Summarize & Extract Key Points
│ (Processing)│ Model: Gemini 3 Flash
└──────┬──────┘
       │ {{ai.summary}}
       ▼
┌─────────────┐
│   OUTPUT    │ Display Summary
│  (Display)  │ Type: Text Display
└─────────────┘
```

### Node Configurations

#### 1. Input Node (Trigger)
```typescript
{
  type: 'input',
  category: 'trigger',
  config: {
    fields: [
      {
        id: 'url',
        type: 'url',
        label: 'YouTube Video URL',
        placeholder: 'https://youtube.com/watch?v=...',
        helpText: 'Enter the full YouTube video URL',
        validation: {
          required: true,
          pattern: '^https?://(www\\.)?youtube\\.com/watch\\?v=.+',
          errorMessage: 'Please enter a valid YouTube URL'
        }
      }
    ],
    submitButtonText: 'Get Transcript & Summary'
  }
}
```

**Frontend Rendering**:
```tsx
<div className="space-y-4">
  <label>YouTube Video URL</label>
  <input 
    type="url"
    placeholder="https://youtube.com/watch?v=..."
    pattern="^https?://(www\.)?youtube\.com/watch\?v=.+"
    required
  />
  <p className="text-xs text-muted-foreground">
    Enter the full YouTube video URL
  </p>
  <button>Get Transcript & Summary</button>
</div>
```

#### 2. Apify API Node (Processing)
```typescript
{
  type: 'apify-actor',
  category: 'processing',
  config: {
    actorId: 'youtube-transcript-scraper',
    apiKey: '{{env.APIFY_API_KEY}}', // From environment
    input: {
      videoUrl: '{{input.url}}' // Reference to input node
    },
    outputMapping: {
      transcript: 'data.transcript',
      title: 'data.title',
      duration: 'data.duration'
    },
    timeout: 60000, // 60 seconds
    retries: 3
  }
}
```

**Backend Execution**:
```typescript
async function executeApifyNode(config, context) {
  const apifyClient = new ApifyClient({ token: config.apiKey })
  
  // Interpolate variables
  const input = interpolateVariables(config.input, context)
  
  // Run actor
  const run = await apifyClient.actor(config.actorId).call(input)
  
  // Wait for completion
  await run.waitForFinish()
  
  // Get results
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
  
  // Map output
  return mapOutput(items[0], config.outputMapping)
}
```

#### 3. AI Processing Node
```typescript
{
  type: 'ai-process',
  category: 'processing',
  config: {
    model: 'gemini-3-flash-preview',
    operation: 'custom',
    prompt: `Analyze this YouTube transcript and:
1. Extract the main key points
2. Summarize the video in 3-5 sentences
3. List any actionable insights

Transcript:
{{apify.transcript}}

Return the response in this format:
## Summary
[Your summary here]

## Key Points
- Point 1
- Point 2
- Point 3

## Actionable Insights
- Insight 1
- Insight 2`,
    temperature: 0.7,
    maxTokens: 1000,
    outputFormat: 'markdown'
  }
}
```

**Backend Execution**:
```typescript
async function executeAINode(config, context) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: config.model })
  
  // Interpolate prompt with context variables
  const prompt = interpolateVariables(config.prompt, context)
  
  // Generate response
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens
    }
  })
  
  return {
    summary: result.response.text(),
    model: config.model,
    tokensUsed: result.response.usageMetadata?.totalTokenCount
  }
}
```

#### 4. Output Node (Display)
```typescript
{
  type: 'text-display',
  category: 'output',
  config: {
    title: 'Video Summary',
    format: 'markdown',
    content: '{{ai.summary}}',
    showCopyButton: true,
    showDownloadButton: true
  }
}
```

**Frontend Rendering**:
```tsx
<div className="space-y-4">
  <h3>Video Summary</h3>
  <div className="prose">
    <ReactMarkdown>{summary}</ReactMarkdown>
  </div>
  <div className="flex gap-2">
    <button onClick={copyToClipboard}>Copy</button>
    <button onClick={downloadAsText}>Download</button>
  </div>
</div>
```

---

## Example 2: Lead Scout (Roofing Businesses)

### Use Case
User enters keyword → AI generates search queries → Web scraper finds leads → AI cleans data → Display in table

### Workflow Diagram
```
┌─────────────┐
│   INPUT     │ Business Keyword
│  (Trigger)  │ Type: Text Input
└──────┬──────┘
       │ {{input.keyword}}
       ▼
┌─────────────┐
│  AI NODE 1  │ Generate Search Queries
│ (Processing)│ Model: Gemini 3 Flash
└──────┬──────┘
       │ {{ai1.queries}}
       ▼
┌─────────────┐
│ WEB SEARCH  │ Search Multiple Sources
│ (Processing)│ Type: Multi-source Search
└──────┬──────┘
       │ {{search.results}}
       ▼
┌─────────────┐
│  AI NODE 2  │ Clean & Structure Data
│ (Processing)│ Model: Gemini 3 Flash
└──────┬──────┘
       │ {{ai2.leads}}
       ▼
┌─────────────┐
│   OUTPUT    │ Display Lead Table
│  (Display)  │ Type: Table Display
└─────────────┘
```

### Node Configurations

#### 1. Input Node (Trigger)
```typescript
{
  type: 'input',
  category: 'trigger',
  config: {
    fields: [
      {
        id: 'keyword',
        type: 'text',
        label: 'Business Type',
        placeholder: 'roofing',
        helpText: 'Enter the type of business you want to find leads for',
        validation: {
          required: true,
          minLength: 2,
          errorMessage: 'Please enter at least 2 characters'
        }
      },
      {
        id: 'location',
        type: 'text',
        label: 'Location (Optional)',
        placeholder: 'New York, NY',
        helpText: 'Specify a location to narrow results'
      },
      {
        id: 'limit',
        type: 'number',
        label: 'Number of Leads',
        placeholder: '50',
        defaultValue: 50,
        validation: {
          required: true,
          min: 1,
          max: 500
        }
      }
    ],
    submitButtonText: 'Find Leads'
  }
}
```

#### 2. AI Node 1 - Query Generation
```typescript
{
  type: 'ai-process',
  category: 'processing',
  config: {
    model: 'gemini-3-flash-preview',
    operation: 'custom',
    prompt: `You are a lead generation expert. Generate 5-7 highly effective search queries to find {{input.keyword}} businesses{{#if input.location}} in {{input.location}}{{/if}}.

The queries should:
1. Target business directories (Google Maps, Yelp, Yellow Pages)
2. Include variations of the business type
3. Focus on finding contact information
4. Be specific and actionable

Return ONLY a JSON array of search queries:
["query 1", "query 2", "query 3", ...]`,
    temperature: 0.8,
    maxTokens: 500,
    outputFormat: 'json',
    parseJSON: true
  }
}
```

#### 3. Web Search Node
```typescript
{
  type: 'web-search',
  category: 'processing',
  config: {
    queries: '{{ai1.queries}}', // Array of search queries
    sources: ['google', 'bing', 'duckduckgo'],
    resultsPerQuery: 10,
    extractFields: [
      'title',
      'url',
      'snippet',
      'domain'
    ],
    filters: {
      excludeDomains: ['facebook.com', 'linkedin.com', 'twitter.com'],
      requireContactInfo: true
    },
    timeout: 30000,
    concurrent: 3 // Run 3 queries at a time
  }
}
```

**Backend Execution**:
```typescript
async function executeWebSearchNode(config, context) {
  const queries = interpolateVariables(config.queries, context)
  const results = []
  
  // Execute searches concurrently
  const chunks = chunkArray(queries, config.concurrent)
  
  for (const chunk of chunks) {
    const promises = chunk.map(query => 
      searchWeb(query, config.sources, config.resultsPerQuery)
    )
    const chunkResults = await Promise.all(promises)
    results.push(...chunkResults.flat())
  }
  
  // Filter results
  const filtered = results.filter(result => {
    if (config.filters.excludeDomains?.some(d => result.domain.includes(d))) {
      return false
    }
    if (config.filters.requireContactInfo && !hasContactInfo(result)) {
      return false
    }
    return true
  })
  
  // Deduplicate by URL
  return deduplicateByKey(filtered, 'url')
}
```

#### 4. AI Node 2 - Data Cleaning
```typescript
{
  type: 'ai-process',
  category: 'processing',
  config: {
    model: 'gemini-3-flash-preview',
    operation: 'custom',
    prompt: `You are a data cleaning expert. Clean and structure this lead data.

Raw Data:
{{search.results}}

Extract and return ONLY valid leads in this JSON format:
[
  {
    "businessName": "Company Name",
    "phone": "+1-555-0123",
    "email": "contact@example.com",
    "website": "https://example.com",
    "address": "123 Main St, City, State",
    "source": "Google Maps"
  }
]

Rules:
1. Only include leads with at least a phone OR email
2. Format phone numbers consistently
3. Validate email addresses
4. Clean up business names (remove extra spaces, fix capitalization)
5. Remove duplicates
6. Limit to {{input.limit}} leads`,
    temperature: 0.3,
    maxTokens: 4000,
    outputFormat: 'json',
    parseJSON: true
  }
}
```

#### 5. Output Node - Table Display
```typescript
{
  type: 'table-display',
  category: 'output',
  config: {
    title: '{{input.keyword}} Leads',
    data: '{{ai2.leads}}',
    columns: [
      {
        key: 'businessName',
        label: 'Business Name',
        format: 'text',
        sortable: true
      },
      {
        key: 'phone',
        label: 'Phone',
        format: 'text',
        copyable: true
      },
      {
        key: 'email',
        label: 'Email',
        format: 'link',
        copyable: true
      },
      {
        key: 'website',
        label: 'Website',
        format: 'link'
      },
      {
        key: 'address',
        label: 'Address',
        format: 'text'
      }
    ],
    pagination: true,
    pageSize: 25,
    sortable: true,
    searchable: true,
    downloadable: true,
    downloadFormats: ['csv', 'json'],
    emptyMessage: 'No leads found. Try adjusting your search criteria.'
  }
}
```

**Frontend Rendering**:
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3>Roofing Leads</h3>
    <div className="flex gap-2">
      <input 
        type="search" 
        placeholder="Search leads..."
        onChange={handleSearch}
      />
      <button onClick={downloadCSV}>Download CSV</button>
      <button onClick={downloadJSON}>Download JSON</button>
    </div>
  </div>
  
  <DataTable
    columns={columns}
    data={leads}
    pagination
    pageSize={25}
    sortable
  />
  
  <div className="text-sm text-muted-foreground">
    Showing {leads.length} leads
  </div>
</div>
```

---

## Variable Interpolation System

### Syntax
```
{{nodeId.field}}
{{nodeId.nested.field}}
{{nodeId.array[0].field}}
```

### Examples
```typescript
// Input node
{{input.url}}
{{input.keyword}}
{{input.location}}

// Processing node
{{apify.transcript}}
{{ai1.queries}}
{{search.results}}
{{ai2.leads}}

// Conditional
{{#if input.location}}in {{input.location}}{{/if}}

// Loop
{{#each search.results}}
  - {{this.title}}
{{/each}}
```

### Implementation
```typescript
function interpolateVariables(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim())
    return value !== undefined ? String(value) : match
  })
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    // Handle array access: array[0]
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      return current?.[arrayMatch[1]]?.[parseInt(arrayMatch[2])]
    }
    return current?.[key]
  }, obj)
}
```

---

## Node Type Summary

### Trigger Nodes (Frontend)
- **Button**: Simple click to start
- **Input Form**: Collect user data
- **Schedule**: Automatic execution
- **Webhook**: External triggers

### Processing Nodes (Backend)
- **Apify Actor**: Run Apify scrapers
- **Web Search**: Multi-source search
- **Web Scraper**: Custom scraping
- **API Call**: HTTP requests
- **AI Process**: AI operations
- **Data Transform**: Map/filter/reduce
- **Condition**: If/else logic
- **Loop**: Iterate over data

### Output Nodes (Frontend)
- **Text Display**: Show text/markdown
- **Table Display**: Data tables
- **JSON Display**: JSON viewer
- **List Display**: Item lists
- **Chart Display**: Visualizations
- **Download Button**: Export data
- **Notification**: Send alerts

---

## Next Implementation Steps

1. **Fix React Error** ✅
2. **Create Node Configuration System**
   - Apify Actor node config
   - Web Search node config
   - AI Process node config
3. **Build Variable Interpolation**
4. **Implement Node Executors**
5. **Create Frontend Renderers**
6. **Build Execution Engine**

---

**Status:** Design Complete | Ready for Implementation
**Date:** February 20, 2026
