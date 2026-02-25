import { Skeleton } from '@/components/ui/skeleton'

export default function RootLoading() {
  return (
    <div className="flex h-svh flex-col bg-background">
      <div className="sticky top-0 z-40 shrink-0 border-b border-border bg-background px-4 md:px-6 pt-safe">
        <div className="flex h-12 md:h-10 items-center justify-between gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <main className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </main>
    </div>
  )
}
