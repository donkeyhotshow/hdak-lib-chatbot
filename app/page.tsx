'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { BookLogo } from '@/components/BookLogo'
import { ChatInput } from '@/components/ChatInput'
import { Tabs } from '@/components/Tabs'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function start(text: string) {
    const t = text.trim()
    if (!t || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t.slice(0, 60) }),
      })
      if (!res.ok) throw new Error('Failed to create conversation')
      const conv = await res.json()
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(t)}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f7f4ef]">
      <Header />
      <Tabs />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-fade-up">
        <div className="flex flex-col items-center gap-6 mb-10 text-center w-full max-w-[420px]">
          <BookLogo size="lg" />
          <div className="space-y-3">
            <h1 className="font-serif text-[32px] sm:text-[40px] font-normal tracking-tight leading-[1.1] text-[#170c04]">
              Чим можу <br /><em className="italic text-[#382010] opacity-90">допомогти?</em>
            </h1>
            <p className="text-[14px] sm:text-[15px] font-light leading-relaxed text-[#9e7d5e] px-4">
              Ваш персональний гід по фондах та ресурсах бібліотеки ХДАК.
            </p>
          </div>
        </div>

        <div className="w-full max-w-[550px] px-2">
          <ChatInput onSend={start} disabled={loading} />
        </div>
      </main>
      
      {/* Bottom Status Bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#120804] text-[11px] text-[#f7f4ef]/35 tracking-[0.02em]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4e8a4e] flex-shrink-0" />
        вул. Бурсацький узвіз, 4, Харків · (057) 731-27-83 · +380 66 145 84 84
      </div>
    </div>
  )
}
