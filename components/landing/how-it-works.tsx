const steps = [
  {
    number: '01',
    title: 'Describe the role',
    description:
      'Start a conversation with Terabits. Tell us what kind of AI employee you need -- customer support, content creation, data analysis, or anything else.',
  },
  {
    number: '02',
    title: 'We interview you',
    description:
      "Terabits asks the right questions to deeply understand your needs. We'll explore your workflows, preferences, and edge cases through a natural conversation.",
  },
  {
    number: '03',
    title: 'Watch it take shape',
    description:
      "See your AI employee's workflow being built in real-time on a visual canvas. Skills, decision trees, and automations appear as the conversation progresses.",
  },
  {
    number: '04',
    title: 'Test and deploy',
    description:
      'Run test scenarios, refine behavior, and when ready, deploy your AI employee. It works out of the box -- no API keys, no configuration required.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            From conversation to employee
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Building an AI employee is as simple as having a conversation.
            No technical knowledge required.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="group relative">
              <div className="mb-4">
                <span className="text-3xl font-bold text-primary/20">{step.number}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
