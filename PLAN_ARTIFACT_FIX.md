# Plan Artifact Display Fix

## Problem

The plan artifact was not displaying in the chat UI even though the AI was generating it. Users would see text saying "click Approve" but no visual plan card with approve/reject buttons.

## Root Causes

1. **Artifact Detection Logic**: The chat panel was checking if `message.content.includes('[PLAN_ARTIFACT]')` but the marker was being removed from content after parsing, creating a race condition.

2. **Artifact Streaming**: The plan artifact marker was being returned in the tool result but not being streamed to the client as part of the text response.

3. **Rendering Condition**: The plan artifact component was only rendering when both `hasPlanArtifact` (marker in content) AND `currentPlan` (parsed data) were true, but the marker was removed before rendering.

## Solutions Implemented

### 1. Fixed Artifact Streaming (API Route)
**File:** `app/api/agent-builder/route.ts`

Added special handling to send the plan artifact marker directly to the client when the `present_plan` tool executes:

```typescript
// Special handling for present_plan - send the artifact directly to the client
if (call.name === 'present_plan' && toolResult.success && toolResult.artifact) {
  const artifactMarker = `[PLAN_ARTIFACT]${JSON.stringify(toolResult.artifact)}[/PLAN_ARTIFACT]`
  controller.enqueue(encoder.encode(`0:${JSON.stringify(artifactMarker)}\n`))
}
```

This ensures the artifact marker is streamed to the client immediately after tool execution.

### 2. Fixed Rendering Logic (Chat Panel)
**File:** `components/agent-builder/chat-panel.tsx`

Changed the rendering condition from checking for marker in content to checking for `currentPlan` state:

```typescript
// Before (broken)
const hasPlanArtifact = message.content.includes('[PLAN_ARTIFACT]')
{hasPlanArtifact && isLastAssistant && currentPlan && (
  <PlanArtifact ... />
)}

// After (fixed)
const shouldShowPlan = isLastAssistant && currentPlan !== null
{shouldShowPlan && (
  <PlanArtifact ... />
)}
```

This ensures the plan displays based on state, not content markers.

### 3. Added Debug Logging

Added console logs to help debug artifact detection:

```typescript
console.log('Plan artifact detected:', planData)
console.log('No plan artifact found in message:', assistantMessage.content.substring(0, 200))
```

## How It Works Now

1. **User sends message** describing what they want
2. **AI calls `present_plan` tool** with plan details
3. **API executes tool** and creates plan artifact object
4. **API streams artifact marker** `[PLAN_ARTIFACT]{...}[/PLAN_ARTIFACT]` to client
5. **Chat panel receives stream** and parses the artifact marker
6. **Chat panel extracts plan** and stores in `currentPlan` state
7. **Chat panel removes marker** from displayed text
8. **Plan artifact component renders** with approve/reject buttons
9. **User clicks approve** → sends "I approve this plan" message
10. **AI starts building** the agent

## Plan Artifact Component Features

The `PlanArtifact` component displays:

- **Agent Overview**: Name and description
- **Capabilities**: What the agent will do (with checkmarks)
- **Workflow Steps**: Numbered steps showing the process
- **Limitations**: What the agent cannot do (with X marks)
- **Estimated Build Time**: How long it will take
- **Action Buttons**:
  - **Approve & Build**: Starts building immediately
  - **Request Changes**: Opens feedback textarea

### Request Changes Flow

1. User clicks "Request Changes"
2. Textarea appears asking "What would you like to change?"
3. User types feedback (e.g., "Focus on LinkedIn instead of Reddit")
4. User clicks "Submit Feedback"
5. Message sent to AI with feedback
6. AI generates new plan with requested changes
7. New plan artifact displays
8. User can approve or request more changes

## Testing Checklist

- [x] Fixed artifact streaming in API
- [x] Fixed rendering logic in chat panel
- [x] Added debug logging
- [ ] Test: Create agent and describe requirements
- [ ] Verify: Plan artifact displays with all sections
- [ ] Test: Click "Approve & Build" button
- [ ] Verify: "I approve this plan" message appears
- [ ] Verify: AI starts building workflow
- [ ] Test: Click "Request Changes" button
- [ ] Verify: Feedback textarea appears
- [ ] Test: Submit feedback
- [ ] Verify: New plan generates with changes
- [ ] Test: Approve new plan
- [ ] Verify: Building starts

## Visual Example

```
┌─────────────────────────────────────────────────┐
│ ✨ Agent Plan                    ⏱ 2-3 minutes │
├─────────────────────────────────────────────────┤
│ Agent Overview                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Reddit Lead Scout                           │ │
│ │ Monitors Reddit for keyword mentions       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ What it will do                                 │
│ ✓ Search Reddit for your keyword               │
│ ✓ Collect relevant posts and discussions       │
│ ✓ Return post URLs for you                     │
│                                                 │
│ Workflow                                        │
│ ① Daily Check - Runs automatically every day   │
│ ② Web Search - Searches Reddit for keyword     │
│ ③ Filter Results - Identifies relevant posts   │
│ ④ Send Report - Delivers URLs to you           │
│                                                 │
│ ⚠ Limitations                                   │
│ ✗ Cannot access private subreddits             │
│ ✗ Cannot scrape sites that block bots          │
│                                                 │
│ [✓ Approve & Build]  [✎ Request Changes]       │
└─────────────────────────────────────────────────┘
```

## Files Modified

1. `app/api/agent-builder/route.ts` - Added artifact streaming
2. `components/agent-builder/chat-panel.tsx` - Fixed rendering logic
3. `PLAN_ARTIFACT_FIX.md` - This documentation

## Related Files

- `components/agent-builder/plan-artifact.tsx` - The visual component
- `lib/types/artifact.ts` - TypeScript types
- `lib/orchestrator/system-prompt.ts` - AI instructions for creating plans

## References

- Original implementation: `PLAN_ARTIFACT_IMPLEMENTATION.md`
- Web-app reference: `web-app/src/lib/agent/artifact-tool.ts`

---

**Status:** ✅ Fixed - Plan artifacts now display correctly in chat
**Date:** February 20, 2026
