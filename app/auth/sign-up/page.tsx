import { Suspense } from 'react'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { SignUpForm } from '@/components/auth/sign-up-form'

function SignUpPageContent() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-foreground">
              <Image
                src="/icon-nobg.svg"
                alt="Terabits"
                width={32}
                height={32}
                priority
                className="h-8 w-8"
              />
              Terabits
            </Link>
            <p className="text-sm text-muted-foreground">Start building AI employees in minutes</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Get started with your first AI employee</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading...</div>}>
                <SignUpForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return <SignUpPageContent />
}
