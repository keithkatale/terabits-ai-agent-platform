# Plan Artifact Implementation

## Overview

Implemented a visual plan artifact system (like Claude's artifacts or v0's previews) that allows users to review and approve agent plans before building begins.

## Problem Solved

**Before:**
- AI would ask questions or present plan as plain text
- No clear approval/rejection mechanism
- User couldn't easily review the full plan
- No visual separation between conversation and plan

**After:**
- Plan appears as a beautiful visual artifact
- Clear "Approve & Build" and "Request Changes" buttons
- User can review capabilities, limitations, and workflow
- Clean separation between chat and plan review

## Features Implemented

### 1. Plan Artifact Component ✅

**Location:** `components/agent-builder/plan-artifact.tsx`

A beautiful card-based UI that displays:
- **Agent Overview**: Name and description
- **Capabilities**: What the agent will do (with checkmarks)
- **Workflow Steps**: Visual step-by-step process
- **Limitations**: Honest about what it can't do (with warning icons)
- **Estimated Build Time**: How long it will take
- **Action Buttons**: Approve or Request Changes

**Features:**
- Gradient background with primary color accent
- Icons for visual clarity
- Numbered workflow steps
- Feedback textarea for requesting changes
- Loading states during approval
- Responsive design

### 2. Present Plan Tool ✅

**Location:** `app/api/agent-builder/route.ts`

New tool for the AI to present plans:

```typescript
present_plan: {
  agentName: string
  category: string
  description: string
  capabilities: string[]
  limitations: string[]
  workflowSteps: Array<{
    type: 'trigger' | 'action' | 'condition' | 'output'
    label: string
    description: string
  }>
  estimatedBuildTime?: string
}
```

The tool returns a special marker that the chat panel detects:
```
[PLAN_ARTIFACT]{...json...}[/PLAN_ARTIFACT]
```

### 3. Chat Panel Integration ✅

**Location:** `components/agent-builder/chat-panel.tsx`

Enhanced to:
- Detect plan artifact markers in messages
- Extract and parse plan data
- Display PlanArtifact component
- Handle approval (sends "I approve" message)
- Handle rejection (sends feedback message)
- Clear plan when new message sent
- Hide present_plan tool calls (shown as artifact instead)

### 4. Updated System Prompt ✅

**Location:** `lib/orchestrator/system-prompt.ts`

AI now:
- Uses `present_plan` tool after understanding requirements
- Waits for explicit approval before building
- Updates plan if user requests changes
- Never starts building without approval

## User Flow

### Happy Path (Approval)

```
1. User: "Create an agent that tracks Reddit posts about AI"

2. AI: 
   - Updates name to "Reddit AI Post Tracker"
   - Calls present_plan tool
   - Plan artifact appears in chat

3. User: [Clicks "Approve & Build"]

4. AI:
   - Receives "I approve this plan. Please start building."
   - Updates phase to "building"
   - Starts creating workflow nodes and skills

5. Workflow appears on canvas
```

### Rejection Path (Request Changes)

```
1. User: "Create an agent that tracks Reddit posts"

2. AI: [Presents plan artifact]

3. User: [Clicks "Request Changes"]
   - Feedback textarea appears
   - User types: "Focus on LinkedIn instead of Reddit"
   - [Clicks "Submit Feedback"]

4. AI:
   - Receives feedback message
   - Updates understanding
   - Presents new plan with LinkedIn focus

5. User: [Approves updated plan]

6. AI: [Starts building]
```

## Plan Artifact Structure

```typescript
interface AgentPlanArtifact {
  id: string
  type: 'plan'
  title: string
  agentName: string
  category: string
  description: string
  capabilities: string[]        // 3-5 items
  limitations: string[]         // 2-3 items
  workflow: {
    steps: Array<{
      id: string
      type: 'trigger' | 'action' | 'condition' | 'output'
      label: string
      description: string
    }>
  }
  estimatedBuildTime?: string   // e.g., "2-3 minutes"
  createdAt: string
}
```

## Visual Design

### Colors & Styling
- **Border**: Primary color with 20% opacity
- **Background**: Gradient from background to primary/5%
- **Header**: Sparkles icon in primary color
- **Capabilities**: Green checkmarks
- **Limitations**: Amber warning icons
- **Workflow Steps**: Numbered circles with primary accent
- **Buttons**: Primary for approve, outline for changes

### Layout
- Card-based with clear sections
- Generous spacing between elements
- Icons for visual hierarchy
- Responsive padding and margins
- Hover effects on buttons

## Example Plan

```json
{
  "agentName": "Reddit AI Tools Tracker",
  "category": "research_agent",
  "description": "Monitors Reddit for discussions about AI tools and provides daily summaries",
  "capabilities": [
    "Search Reddit for AI tool mentions",
    "Collect and organize relevant posts",
    "Summarize key findings and trends",
    "Alert you to important discussions",
    "Generate daily digest reports"
  ],
  "limitations": [
    "Cannot access private subreddits",
    "Limited to public Reddit content",
    "Cannot interact with posts (read-only)"
  ],
  "workflowSteps": [
    {
      "type": "trigger",
      "label": "Daily Check",
      "description": "Runs automatically every day at 9 AM"
    },
    {
      "type": "action",
      "label": "Search Reddit",
      "description": "Searches for AI tool mentions across relevant subreddits"
    },
    {
      "type": "condition",
      "label": "Filter Quality",
      "description": "Identifies high-quality and relevant posts"
    },
    {
      "type": "action",
      "label": "Summarize",
      "description": "Creates a digest of key findings"
    },
    {
      "type": "output",
      "label": "Send Report",
      "description": "Delivers summary via email"
    }
  ],
  "estimatedBuildTime": "2-3 minutes"
}
```

## Files Created

1. `lib/types/artifact.ts` - TypeScript types
2. `components/agent-builder/plan-artifact.tsx` - Visual component
3. `PLAN_ARTIFACT_IMPLEMENTATION.md` - This documentation

## Files Modified

1. `app/api/agent-builder/route.ts` - Added present_plan tool
2. `components/agent-builder/chat-panel.tsx` - Artifact detection and display
3. `lib/orchestrator/system-prompt.ts` - Updated AI behavior

## Benefits

### For Users
1. **Clear Review**: See exactly what will be built
2. **Visual Clarity**: Beautiful, organized presentation
3. **Easy Approval**: One-click approve or request changes
4. **Honest Communication**: Limitations shown upfront
5. **Confidence**: Know what you're getting before building

### For AI
1. **Structured Output**: Clear format for presenting plans
2. **Explicit Approval**: No ambiguity about when to start building
3. **Feedback Loop**: Easy to iterate on plans
4. **Better UX**: Professional, polished presentation

## Testing Checklist

### Basic Flow
- [ ] Create new agent
- [ ] Send requirements
- [ ] Verify plan artifact appears
- [ ] Verify all sections populated
- [ ] Click "Approve & Build"
- [ ] Verify building starts

### Rejection Flow
- [ ] Present plan
- [ ] Click "Request Changes"
- [ ] Enter feedback
- [ ] Submit feedback
- [ ] Verify new plan appears
- [ ] Approve new plan

### Edge Cases
- [ ] User sends message while plan visible
- [ ] Plan disappears, new response appears
- [ ] Multiple plans in conversation
- [ ] Only latest plan is interactive
- [ ] Greeting doesn't trigger plan
- [ ] Plan only after real requirements

## Future Enhancements

- [ ] Edit plan inline (without feedback)
- [ ] Save plans for later review
- [ ] Compare multiple plan versions
- [ ] Export plan as PDF
- [ ] Share plan with team
- [ ] Plan templates for common use cases
- [ ] Estimated cost per month
- [ ] Preview workflow visualization

## Summary

The plan artifact system provides a professional, clear way for users to review and approve agent plans before building. It's inspired by Claude's artifacts and v0's previews, giving users confidence and control over what gets built.

Key improvements:
- ✅ Visual plan presentation
- ✅ Clear approval mechanism
- ✅ Feedback loop for changes
- ✅ Honest about limitations
- ✅ Professional UI/UX
- ✅ Structured workflow preview
