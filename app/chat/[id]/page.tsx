import { DesktopDetailTabs } from '@/components/desktop/desktop-detail-tabs'

export default async function ChatByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="flex h-full min-h-0 flex-col">
      <DesktopDetailTabs desktopId={id} />
    </div>
  )
}
