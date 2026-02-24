import Image from 'next/image'

interface Feature {
  icon: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: '/icons-points/wisker.png',
    title: 'Do things, not just chat',
    description: 'Ask it to search the web, send emails, look things up, or call APIs. It performs the task and reports back.',
  },
  {
    icon: '/icons-points/pages.png',
    title: 'Saved workflows',
    description: 'Turn repeat tasks into one-click workflows. Run them anytime or share with your team.',
  },
  {
    icon: '/icons-points/doc.png',
    title: 'Transparent steps',
    description: 'See what the assistant is doing: reasoning, tool calls, and results right in the chat.',
  },
  {
    icon: '/icons-points/hand.png',
    title: 'One assistant, many tools',
    description: 'Web search, Gmail, Slack, Discord, HTTP, images, and more. One place to delegate digital tasks.',
  },
]

export function FeaturesSection() {
  return (
    <section className="w-full bg-background py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1fr_1.2fr] items-start">
          {/* Left: Image */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-full max-w-md">
              <Image
                src="/images/person-on-computer.avif"
                alt="Person using AI assistant"
                width={500}
                height={600}
                className="rounded-3xl w-full h-auto"
                priority
              />
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex flex-col gap-10 justify-start">
            <div className="space-y-4">
              <h2 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Task-oriented, like a real assistant
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                Tell it what to do — book research, send that email, look something up. It uses the right tools, performs the action, and gives you a clear result.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
              {features.map((feature, idx) => (
                <div key={idx} className="flex gap-5">
                  {/* Icon */}
                  <div className="flex-shrink-0 pt-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                      <Image
                        src={feature.icon}
                        alt={feature.title}
                        width={28}
                        height={28}
                        className="h-7 w-7"
                      />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground leading-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
