import Link from 'next/link'
import Image from 'next/image'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { UseCases } from '@/components/landing/use-cases'
import { IntegrationsMarquee } from '@/components/landing/integrations-marquee'
import { Footer } from '@/components/landing/footer'
import { AuthNavbar } from '@/components/landing/auth-navbar'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Minimal top bar -- like Claude's */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icon.svg" alt="Terabits" width={32} height={32} priority className="h-8 w-8" />
            <span className="text-lg font-semibold text-foreground">Terabits</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How it Works
            </a>
            <a href="#use-cases" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Use Cases
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="ghost" size="icon-sm" />
            <AuthNavbar />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <UseCases />
        <IntegrationsMarquee />
        <PricingSection />
      </main>

      <Footer />
    </div>
  )
}
