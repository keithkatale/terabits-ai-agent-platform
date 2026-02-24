import { redirect } from 'next/navigation'

export default async function AgentIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/workflow/${id}`)
}
