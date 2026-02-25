import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for TeraBits AI',
}

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to home
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-foreground tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>

        <div className="mt-10 space-y-8 text-foreground prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              By accessing or using TeraBits AI (“Service”), you agree to be bound by these Terms of Service
              and our <Link href="/privacy" className="text-primary underline underline-offset-4">Privacy Policy</Link>.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              TeraBits AI provides an AI-powered platform that helps you automate tasks, manage workflows,
              and connect with third-party services (e.g. Gmail, Google, and other integrations). The Service
              may change over time; we will notify you of material changes where required.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Account and Eligibility</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              You must provide accurate information when creating an account. You are responsible for
              keeping your credentials secure. You must be at least 18 years old (or the age of majority
              in your jurisdiction) to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              You agree not to use the Service for any illegal purpose or in violation of these terms.
              You may not abuse the Service, attempt to gain unauthorized access to systems or data,
              or use it to harm others. We may suspend or terminate access for violations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Third-Party Services</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              The Service may integrate with third-party services (e.g. Google, Gmail). Your use of those
              services is subject to their respective terms and policies. We are not responsible for
              third-party services or their availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              The Service and its content (excluding user content) are owned by us or our licensors.
              You may not copy, modify, or distribute our materials without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Disclaimers</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              The Service is provided “as is.” We disclaim warranties to the extent permitted by law.
              We do not guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, we are not liable for indirect, incidental,
              special, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Changes</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We may update these terms from time to time. We will post the updated terms on this page
              and update the “Last updated” date. Continued use of the Service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, contact us at the support email listed in
              the OAuth consent screen or in your account settings.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/privacy"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
