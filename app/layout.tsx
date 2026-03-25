import React from 'react'
import type { Metadata } from 'next'
import { Playfair_Display, Montserrat } from 'next/font/google'
import { SplashScreen } from '@/components/SplashScreen'
import './globals.css'
import { ClientLayout } from '@/components/ClientLayout'

const serif = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
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
    <html lang="uk" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SplashScreen />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
