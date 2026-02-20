import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32 lg:py-40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">AI employees that work out of the box</span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Hire your next
            <br />
            <span className="text-primary">AI employee</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Describe the role you need filled. Terabits will interview you, understand the job,
            and build an AI employee that works from day one. No code. No APIs. No setup.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="min-w-44">
                Start hiring
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="min-w-44">
                See how it works
              </Button>
            </a>
          </div>

          <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-primary/30" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/20" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/10" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">terabits - new employee</span>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-medium text-primary">T</span>
                  </div>
                  <div className="rounded-lg rounded-tl-none bg-muted px-4 py-2.5">
                    <p className="text-sm text-foreground">
                      {"Welcome! I'm here to help you build your next AI employee. What kind of role are you looking to fill?"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <div className="rounded-lg rounded-tr-none bg-primary px-4 py-2.5">
                    <p className="text-sm text-primary-foreground">
                      I need someone to handle all our customer support emails and route complex tickets to the right team.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-medium text-primary">T</span>
                  </div>
                  <div className="rounded-lg rounded-tl-none bg-muted px-4 py-2.5">
                    <p className="text-sm text-foreground">
                      {"Great choice! Let me understand your support workflow better. How many emails do you typically receive per day, and what are the main categories..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
