import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for TeraBits AI',
}

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="mt-10 space-y-8 text-foreground prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              TeraBits AI (“we,” “our,” or “us”) respects your privacy. This Privacy Policy describes
              how we collect, use, and protect your information when you use our Service. By using the
              Service, you agree to the practices described here. Our{' '}
              <Link href="/terms" className="text-primary underline underline-offset-4">Terms of Service</Link>{' '}
              also apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We collect information you provide (e.g. account details, email when you sign in with
              Google or email/password) and information generated when you use the Service (e.g. chat
              history, workflow runs, usage data). When you connect third-party services (e.g. Gmail),
              we store the tokens necessary to perform actions on your behalf; we do not store your
              passwords for those services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We use your information to provide, operate, and improve the Service; to authenticate
              you; to fulfill requests you make (e.g. sending email via Gmail); to communicate with
              you; and to comply with legal obligations. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Google & Gmail</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              If you connect your Gmail account, we request only the permissions needed for the
              features we offer (e.g. sending email on your behalf). We use Google OAuth; your
              credentials are not stored by us. Token data is stored securely and used only to
              perform actions you authorize. Google’s use of information is governed by{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Google’s Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Retention & Security</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We retain your data as long as your account is active or as needed to provide the
              Service and comply with law. We use industry-standard measures to protect your data;
              no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Sharing and Disclosure</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We may share information with service providers that help us operate the Service
              (e.g. hosting, analytics), under strict confidentiality. We may disclose information
              if required by law or to protect our rights, safety, or property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Your Rights</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Depending on your location, you may have rights to access, correct, delete, or port your
              data, or to object to or restrict certain processing. You can manage your account and
              connected integrations (e.g. disconnect Gmail) from the app. Contact us for other
              requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Children</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              The Service is not intended for users under 18. We do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Changes</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will post the updated policy
              here and update the “Last updated” date. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Contact</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              For privacy-related questions or requests, contact us at the support or developer
              contact email shown in the OAuth consent screen or in your account settings.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/terms"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
