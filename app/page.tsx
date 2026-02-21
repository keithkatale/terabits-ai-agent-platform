import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { UseCases } from '@/components/landing/use-cases'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Minimal top bar -- like Claude's */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Terabits" width={32} height={32} className="h-8 w-8" />
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

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <UseCases />
      </main>

      <Footer />
    </div>
  )
}
