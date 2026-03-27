import React from 'react'
import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google'
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

const sans = Plus_Jakarta_Sans({
  subsets: ['latin', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700', '800'],
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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#1a130f] focus:text-[#f7f4ef] focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg">Перейти до основного вмісту</a>
        <SplashScreen />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
