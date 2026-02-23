import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const useCases = [
  {
    title: 'Customer Support',
    description: 'Auto-respond to queries, route tickets, manage FAQs, and escalate complex issues to your team.',
    tag: 'Available',
  },
  {
    title: 'Content Creator',
    description: 'Generate social media posts, blog drafts, newsletters, and marketing copy on a schedule you set.',
    tag: 'Available',
  },
  {
    title: 'Data Analyst',
    description: 'Ingest your data, run summaries, spot trends, and generate reports and visual insights automatically.',
    tag: 'Available',
  },
  {
    title: 'Task Automator',
    description: 'Automate repetitive workflows like form processing, notifications, data entry, and file organization.',
    tag: 'Available',
  },
  {
    title: 'Personal Assistant',
    description: 'Manage calendars, triage emails, set reminders, and prepare daily briefings tailored to you.',
    tag: 'Available',
  },
  {
    title: 'Researcher',
    description: 'Conduct web research, competitive analysis, track market trends, and compile findings into reports.',
    tag: 'Available',
  },
]

export function UseCases() {
  return (
    <section id="use-cases" className="border-t border-border bg-muted/30 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:items-start">
          {/* Left: sticky title — stays in place while the right column scrolls */}
          <div className="lg:sticky lg:top-28">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-4xl xl:text-5xl">
              AI employees for every role
            </h2>
            <p className="mt-4 max-w-md text-pretty text-lg text-muted-foreground">
              From customer support to data analysis, build the team you need.
            </p>
          </div>

          {/* Right: scrolling feature cards */}
          <div className="flex flex-col gap-5">
            {useCases.map((uc) => (
              <Card
                key={uc.title}
                className="group overflow-hidden border border-border/80 bg-card shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="mb-3 inline-flex w-fit rounded-full bg-primary/12 px-3 py-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {uc.tag}
                    </span>
                  </div>
                  <CardTitle className="text-xl tracking-tight text-foreground">
                    {uc.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {uc.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
