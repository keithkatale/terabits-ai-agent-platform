import { Skeleton } from '@/components/ui/skeleton'

export default function WorkflowLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-4 py-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
