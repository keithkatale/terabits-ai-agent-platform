import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Payment Successful - Terabits',
  description: 'Your credits have been added to your account.',
}

function SuccessContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-foreground mb-4">
          Payment Successful!
        </h1>

        {/* Message */}
        <p className="text-center text-muted-foreground mb-2">
          Your credits have been added to your account.
        </p>
        <p className="text-center text-muted-foreground mb-8">
          You can now deploy agents, share outputs, and enjoy unlimited agent runs.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/chat">
            <Button className="w-full" size="lg">
              Go to Dashboard
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full" size="lg">
              Return to Home
            </Button>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>What's next?</strong>
            <br />
            Visit your dashboard to create a new agent or deploy your existing agents. Your
            credits are ready to use!
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
