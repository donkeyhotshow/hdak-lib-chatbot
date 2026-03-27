import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Бібліотека ХДАК · Чат-помічник',
  description:
    'Чат-помічник бібліотеки Харківської державної академії культури. ' +
    'Графік роботи, електронний каталог, запис, контакти.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  )
}
