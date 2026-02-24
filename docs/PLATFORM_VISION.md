# Terabits platform vision

Terabits brings **OpenClaw-style agentic capabilities to the web**: AI that automates digital tasks via natural language and runs in the browser instead of only on your computer.

## Core idea

- **OpenClaw** runs locally and can perform actions on your computer.
- **Terabits** is the web version: the same kind of “AI employee” that does digital tasks (web search, headless browsing, scraping, etc.) but as a hosted platform.
- The **scope of what the AI can do** grows with the **tools** we add (web search, browser automation, email, APIs, etc.).

## Architecture: orchestrator + sub-agents

### Main agent (orchestrator)

- The **Assistant** on the dashboard is the main **orchestrator**.
- It performs actions and completes tasks for the user using **tools** (web search, browser automation, etc.).
- It can handle one-off tasks and, when it detects **repetitive** or **specialized** work, it can create or invoke **sub-agents**.

### Sub-agents

- **Sub-agents** (stored and shown as “Sub-agents” in the UI) are specialized, often single-purpose agents.
- Examples: lead generation, research, content drafts, data extraction.
- Each sub-agent has:
  - **System prompt / instructions** (what it does)
  - **Required inputs** (e.g. keyword, lead count, region)
  - **Tool configuration** (which tools it can use)
- They are stored as **apps within the platform**: reusable and invokable by the orchestrator or directly by the user.

### How the orchestrator uses sub-agents

1. **User gives enough info to run a sub-agent**  
   Example: “Find me 100 plumber leads in the United States.”  
   → The orchestrator **runs the lead-generation sub-agent** directly with those parameters (keyword, count, region).

2. **User asks for a task but doesn’t give enough info**  
   Example: “I need lead generation.”  
   → The orchestrator **invokes the lead-generation sub-agent** and **embeds it in the chat** with the **input fields** that sub-agent needs (e.g. niche, number of leads). The user fills them in and submits; then the sub-agent runs.

So: the main orchestrator can **execute** sub-agents when it has enough information, or **surface** them in the chat with input forms when it needs more from the user.

## UI layout

- **Left panel**: Conversations (Recent) and **Sub-agents** list. “New agent” and “Search agents” for creating or finding sub-agents.
- **Main content**: Chat with the Assistant (orchestrator). Tool calls and, in the future, embedded sub-agent forms (like tool components) appear in the chat.
- This matches a typical **dashboard / AI platform** layout: conversations and agents on the left, chat on the right.

## Implementation notes

- **Naming**: In the product we use **“Sub-agents”** (not “workflows”) for these specialized task agents. The orchestrator is the main “Assistant.”
- **Embedding sub-agents in chat**: When the orchestrator needs more input, it can “call” a sub-agent and the UI can render that sub-agent’s **input fields** inline in the chat (similar to how tool-call components are embedded). On submit, the platform runs that sub-agent and streams results back.
- **Creating sub-agents**: The orchestrator can create new sub-agents (e.g. via “create sub-agent” or builder flow); they are saved and appear in the Sub-agents list and can be invoked again with or without embedded forms.
