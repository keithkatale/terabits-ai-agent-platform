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
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            AI employees for every role
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            From customer support to data analysis, build the team you need.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc) => (
            <Card key={uc.title} className="bg-card transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 inline-flex self-start rounded-full bg-primary/10 px-2.5 py-0.5">
                  <span className="text-xs font-medium text-primary">{uc.tag}</span>
                </div>
                <CardTitle className="text-lg">{uc.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {uc.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
