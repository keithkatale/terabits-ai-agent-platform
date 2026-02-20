import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">T</span>
            </div>
            <span className="font-semibold text-foreground">Terabits</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="text-sm text-muted-foreground hover:text-foreground">
              Get started
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Terabits. Building the next generation of AI employees.
          </p>
        </div>
      </div>
    </footer>
  )
}
