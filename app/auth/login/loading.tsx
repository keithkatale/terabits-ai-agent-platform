import { Skeleton } from '@/components/ui/skeleton'

export default function AuthLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-3/4 rounded-md mx-auto" />
      </div>
    </div>
  )
}
