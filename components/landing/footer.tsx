import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.svg"
              alt="Terabits"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="font-semibold text-foreground">Terabits</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Get started
            </Link>
          </div>
          <p className="text-xs text-muted-foreground text-center md:text-right">
            Building the next generation of AI employees.
          </p>
        </div>
      </div>
    </footer>
  )
}
