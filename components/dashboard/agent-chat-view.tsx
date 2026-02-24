'use client'

import { ChatPanel } from '@/components/agent-builder/chat-panel'
import type { Agent } from '@/lib/types'

export function AgentChatView({ agent }: { agent: Agent }) {
  return (
    <div className="flex h-full flex-col">
      <ChatPanel
        agent={agent}
        onAgentUpdate={() => {}}
        isFullWidth
      />
    </div>
  )
}
