import type { Metadata, Viewport } from 'next'
import { DM_Sans, Crimson_Pro, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
})

const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Terabits - Build Your Next AI Employee',
  description: 'Build AI employees through natural conversation. No code, no APIs, no configuration. Just describe what you need and Terabits builds it for you.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#c15f3c',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${dmSans.variable} ${crimsonPro.variable}`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
