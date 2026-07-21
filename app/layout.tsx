import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { PostHogProvider } from './providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://zentrade.tech'),
  title: 'ZenTrade — Trading Journal & Discipline Coach',
  description: 'A trading journal for prop-firm & ICT/SMC day traders — reimagined as a daily discipline ritual, with a process score and an AI coach that knows your model.',
  openGraph: {
    title: 'ZenTrade — Trading Journal & Discipline Coach',
    description: 'A trading journal for prop-firm and ICT/SMC day traders, reimagined as a daily discipline ritual. Plan, log, and review every session.',
    url: 'https://zentrade.tech',
    siteName: 'ZenTrade',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZenTrade — Trading Journal & Discipline Coach',
    description: 'A trading journal reimagined as a daily discipline ritual.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
