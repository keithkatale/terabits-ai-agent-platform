import Image from 'next/image'

interface EmployeeRole {
  id: string
  title: string
  description: string
  image: string
  alt: string
}

const employeeRoles: EmployeeRole[] = [
  {
    id: 'research',
    title: 'Deep Research',
    description:
      'Multi-platform research agents that gather information from hundreds of sources simultaneously. Perfect for competitive analysis, market intelligence, and comprehensive due diligence.',
    image: '/images/landing-page/deep-research.png',
    alt: 'Deep research agent showing multi-source data gathering',
  },
  {
    id: 'multi-step',
    title: 'Multi-Step Workflows',
    description:
      'Build agents that execute complex, multi-step processes. From data collection to analysis to reporting, each step is tracked, logged, and optimized.',
    image: '/images/landing-page/logs.png',
    alt: 'Multi-step workflow with execution logs and tracking',
  },
  {
    id: 'reasoning',
    title: 'Deep Reasoning',
    description:
      'Deploy agents with advanced reasoning capabilities. They break down complex problems, explore multiple approaches, and provide well-reasoned solutions.',
    image: '/images/landing-page/reasoning.png',
    alt: 'Agent with advanced reasoning and step-by-step thinking',
  },
  {
    id: 'data',
    title: 'Data Handling & Sharing',
    description:
      'Agents that securely handle, process, and share data. Extract, transform, and organize information while maintaining full control and visibility.',
    image: '/images/landing-page/shared-table.png',
    alt: 'Data handling and collaborative sharing interface',
  },
  {
    id: 'tools',
    title: 'Multi-Tool Orchestration',
    description:
      'Agents that orchestrate multiple tools in harmony. Web search, APIs, databases, email, and more — all working together in a single workflow.',
    image: '/images/landing-page/tools.png',
    alt: 'Tool integration and multi-tool orchestration panel',
  },
  {
    id: 'security',
    title: 'Secure & Private',
    description:
      'All agents run with enterprise-grade security. Your data stays yours. No unauthorized access, no data leaks — complete privacy and control.',
    image: '/images/landing-page/privacy.png',
    alt: 'Privacy mode and security features',
  },
]

export function AIEmployeesSection() {
  return (
    <section id="ai-employees" className="w-full bg-background py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            AI Employees for Every Role
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you need deep research, complex workflows, or real-time intelligence, Terabits builds the AI employee for your role.
          </p>
        </div>

        {/* Role Cards */}
        <div className="space-y-20">
          {employeeRoles.map((role, index) => {
            const isEven = index % 2 === 0
            return (
              <div key={role.id} className="grid gap-8 lg:gap-12 lg:grid-cols-2 items-center">
                {/* Image */}
                <div className={`flex justify-center ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="relative w-full max-w-md border border-border rounded-lg overflow-hidden">
                    <Image
                      src={role.image}
                      alt={role.alt}
                      width={500}
                      height={400}
                      className="rounded-lg w-full h-auto"
                      priority={index < 2}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-6 justify-center ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="space-y-4">
                    <h3 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
                      {role.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                      {role.description}
                    </p>
                  </div>

                  {/* Quick Stats/Benefits - optional accent */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium text-primary">Fast Setup</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium text-primary">Production Ready</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
