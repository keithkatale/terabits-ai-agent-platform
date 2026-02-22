import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export const metadata = {
  title: 'Payment Cancelled - Terabits',
  description: 'Your payment was cancelled. You can try again anytime.',
}

export default function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md">
        {/* Cancel Icon */}
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-full bg-red-100">
            <X className="h-12 w-12 text-red-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-foreground mb-4">
          Payment Cancelled
        </h1>

        {/* Message */}
        <p className="text-center text-muted-foreground mb-2">
          Your payment was not completed.
        </p>
        <p className="text-center text-muted-foreground mb-8">
          No charges were made to your account. You can try purchasing credits again anytime.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/#pricing">
            <Button className="w-full" size="lg">
              Try Again
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full" size="lg">
              Return to Home
            </Button>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900">
            <strong>Need help?</strong>
            <br />
            If you encounter any issues or have questions, please contact our support team at
            support@terabits.ai
          </p>
        </div>
      </div>
    </div>
  )
}
