import Image from 'next/image'

interface Feature {
  icon: string
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: '/icons-points/wisker.png',
    title: 'Build AI quickly',
    description: 'Describe what you need and Terabits builds it in minutes, not weeks. No coding required.',
  },
  {
    icon: '/icons-points/pages.png',
    title: 'Deploy instantly',
    description: 'Your AI agent is ready to work immediately. Share it, integrate it, or run it anytime.',
  },
  {
    icon: '/icons-points/doc.png',
    title: 'Manage with ease',
    description: 'Monitor performance, adjust instructions, and track execution logs all in one place.',
  },
  {
    icon: '/icons-points/hand.png',
    title: 'Scalable foundation',
    description: 'Start simple and grow. Add more agents, integrate APIs, and automate your entire workflow.',
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
                alt="Person building AI agents"
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
                Built for creators
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                Terabits makes building AI agents as easy as describing what you need. No technical barriers, no code to write. Just describe your vision and we handle the rest.
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
