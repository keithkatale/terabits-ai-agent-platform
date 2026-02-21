'use client'

interface Step {
  number: string
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Describe the role',
    description: 'Start a conversation with Terabits. Tell us what kind of AI agent you need -- customer support, content creation, data analysis, or anything else.',
  },
  {
    number: '02',
    title: 'We interview you',
    description: 'Terabits asks the right questions to deeply understand your needs. We explore your workflows, preferences, and edge cases through a natural conversation.',
  },
  {
    number: '03',
    title: 'Watch it take shape',
    description: 'See your AI agent\'s workflow being built in real-time on a visual canvas. Skills, decision trees, and automations appear as the conversation progresses.',
  },
  {
    number: '04',
    title: 'Test and deploy',
    description: 'Run test scenarios, refine behavior, and when ready, deploy your AI agent. It works out of the box -- no API keys, no configuration required.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="w-full bg-background py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            From conversation to employee
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Building an AI agent is as simple as having a conversation. No technical knowledge required.
          </p>
        </div>

        {/* Cards Container with Connecting Lines */}
        <div className="relative">
          {/* SVG Connecting Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ top: 0, left: 0 }}
            viewBox="0 0 1200 350"
            preserveAspectRatio="none"
          >
            {/* Line from card 1 to card 2 */}
            <line x1="22%" y1="140" x2="48%" y2="140" stroke="currentColor" strokeWidth="2" className="text-primary/20" />
            {/* Line from card 2 to card 3 */}
            <line x1="52%" y1="140" x2="78%" y2="140" stroke="currentColor" strokeWidth="2" className="text-primary/20" />
            {/* Line from card 3 to card 4 */}
            <line x1="82%" y1="140" x2="100%" y2="140" stroke="currentColor" strokeWidth="2" className="text-primary/20" />
          </svg>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((step, idx) => {
              // Alternate rotation angles for visual interest
              const rotations = ['-2deg', '2deg', '-1.5deg', '1.5deg']
              const rotation = rotations[idx % rotations.length]

              return (
                <div
                  key={idx}
                  style={{ transform: `rotate(${rotation})` }}
                  className="transition-transform hover:rotate-0 hover:shadow-lg"
                >
                  <div className="border border-border rounded-lg p-6 bg-white">
                    <div className="text-primary/60 text-lg font-semibold mb-3">
                      {step.number}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
