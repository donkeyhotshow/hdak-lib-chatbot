import React from 'react'
import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { SplashScreen } from '@/components/SplashScreen'
import './globals.css'
import { ClientLayout } from '@/components/ClientLayout'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--fs',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--fb',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Бібліотека ХДАК · Чат-помічник',
  description: 'Чат-помічник бібліотеки Харківської державної академії культури. Знайдіть книги, дізнайтесь про графік роботи та послуги.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📖</text></svg>',
  },
  openGraph: {
    title: 'Бібліотека ХДАК · Чат-помічник',
    description: 'Чат-помічник бібліотеки Харківської державної академії культури. Знайдіть книги, дізнайтесь про графік роботи та послуги.',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'Бібліотека ХДАК',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Бібліотека ХДАК · Чат-помічник',
    description: 'Чат-помічник бібліотеки Харківської державної академії культури. Знайдіть книги, дізнайтесь про графік роботи та послуги.',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <SplashScreen />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
