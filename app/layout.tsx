import React from 'react'
import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'

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
  title: 'ХДАК · Бібліотека',
  description: 'Чат-помічник бібліотеки Харківської державної академії культури',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="flex flex-col items-center justify-center min-h-[100dvh] h-[100dvh] bg-[#120804] text-[#170c04] overflow-hidden antialiased">
        <div className="app bg-[#f7f4ef] w-full md:w-[95%] max-w-[750px] h-full flex flex-col relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border-x border-white/5 mx-auto">
          {/* subtle paper texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.035] z-[1]" 
               style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix type=\'saturate\' values=\'0\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\' /%3E%3C/svg%3E")' }} />
          
          <div className="relative z-[2] flex flex-col h-full w-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
