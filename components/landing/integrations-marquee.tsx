'use client'

import Image from 'next/image'

const INTEGRATION_ICONS = [
  { src: '/icons/sheets.png', name: 'Sheets' },
  { src: '/icons/google-docs.png', name: 'Google Docs' },
  { src: '/icons/google-calendar.png', name: 'Calendar' },
  { src: '/icons/google-drive.png', name: 'Drive' },
  { src: '/icons/gmail.png', name: 'Gmail' },
  { src: '/icons/excel.png', name: 'Excel' },
  { src: '/icons/slack.png', name: 'Slack' },
  { src: '/icons/discord.png', name: 'Discord' },
  { src: '/icons/whatsapp.png', name: 'WhatsApp' },
  { src: '/icons/instagram.png', name: 'Instagram' },
  { src: '/icons/reddit.png', name: 'Reddit' },
  { src: '/icons/chatgpt.png', name: 'ChatGPT' },
  { src: '/icons/postgre.png', name: 'PostgreSQL' },
  { src: '/icons/business.png', name: 'Business' },
]

function IconCard({ src, name }: { src: string; name: string }) {
  return (
    <div
      className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm sm:size-20"
      title={name}
    >
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className="h-8 w-8 object-contain sm:h-10 sm:w-10"
      />
    </div>
  )
}

export function IntegrationsMarquee() {
  return (
    <section className="border-t border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Integrations
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Bring AI to your existing tools
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
            Connect with the apps you already use. AI agents can read, write, and
            run tasks across your stack.
          </p>
        </div>

        <div className="relative mt-14 space-y-4 overflow-hidden md:space-y-6">
          {/* Top row: scrolls left */}
          <div className="[mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
            <div className="flex w-max animate-marquee">
              <div className="flex gap-4 pr-4 md:gap-6 md:pr-6">
                {INTEGRATION_ICONS.map((icon) => (
                  <IconCard key={icon.name} src={icon.src} name={icon.name} />
                ))}
              </div>
              <div className="flex gap-4 pr-4 md:gap-6 md:pr-6" aria-hidden>
                {INTEGRATION_ICONS.map((icon) => (
                  <IconCard key={`dup-${icon.name}`} src={icon.src} name={icon.name} />
                ))}
              </div>
            </div>
          </div>
          {/* Bottom row: scrolls right */}
          <div className="[mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
            <div className="flex w-max animate-marquee-reverse">
              <div className="flex gap-4 pr-4 md:gap-6 md:pr-6">
                {INTEGRATION_ICONS.map((icon) => (
                  <IconCard key={`rev-${icon.name}`} src={icon.src} name={icon.name} />
                ))}
              </div>
              <div className="flex gap-4 pr-4 md:gap-6 md:pr-6" aria-hidden>
                {INTEGRATION_ICONS.map((icon) => (
                  <IconCard key={`rev-dup-${icon.name}`} src={icon.src} name={icon.name} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
