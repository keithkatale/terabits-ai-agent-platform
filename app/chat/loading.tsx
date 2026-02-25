import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 py-6 px-4">
      {/* Message area skeleton */}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex justify-end">
          <Skeleton className="h-12 max-w-md w-[75%] rounded-lg rounded-tr-sm" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-24 max-w-2xl w-[85%] rounded-lg rounded-tl-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 max-w-xs w-1/2 rounded-lg rounded-tr-sm" />
        </div>
      </div>
      {/* Input area skeleton */}
      <div className="shrink-0 space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
