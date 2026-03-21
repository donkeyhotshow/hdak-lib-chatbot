import type { Metadata } from 'next'
import { EB_Garamond, Geist } from 'next/font/google'
import './globals.css'

const garamond = EB_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Бібліотека ХДАК',
  description: 'Чат-помічник бібліотеки Харківської державної академії культури',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${garamond.variable} ${geist.variable}`}>
      <body className="flex flex-col h-dvh overflow-hidden bg-[var(--color-paper)]">
        {children}
      </body>
    </html>
  )
}
