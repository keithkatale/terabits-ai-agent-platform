import { AssistantChat } from '@/components/dashboard/assistant-chat'

export default async function ChatByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AssistantChat />
    </div>
  )
}
