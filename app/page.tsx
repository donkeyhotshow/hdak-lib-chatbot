'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  'Як записатися до бібліотеки?',
  'Електронний каталог',
  'Графік роботи',
  'Контакти та адреса',
]

export default function LandingPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function start(text: string) {
    if (!text.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 60) }),
      })
      const conv = await res.json()
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(text)}`)
    } catch {
      setLoading(false)
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      start(input)
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-paper)]">

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between h-[52px] px-5
                         bg-[var(--color-ink)] border-b border-black/20">
        <div className="flex items-center gap-3">
          {/* Book logo */}
          <svg width="22" height="17" viewBox="0 0 22 17" fill="none" aria-hidden="true">
            <path d="M11 2C11 2 7.5 1 3 2.5L2.5 14.5C7 13 10.5 14 11 14L11 2Z"
              fill="rgba(192,136,64,0.2)" stroke="rgba(192,136,64,0.6)" strokeWidth="0.7"/>
            <path d="M11 2C11 2 14.5 1 19 2.5L19.5 14.5C15 13 11.5 14 11 14L11 2Z"
              fill="rgba(192,136,64,0.14)" stroke="rgba(192,136,64,0.5)" strokeWidth="0.7"/>
            <line x1="11" y1="1.5" x2="11" y2="14" stroke="rgba(192,136,64,0.8)" strokeWidth="0.8"/>
          </svg>
          <span className="font-[var(--font-serif)] text-[15px] text-white/88 tracking-[0.01em]">
            Бібліотека ХДАК
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-[26px] px-3 rounded-full border border-[rgba(192,136,64,0.25)]
                             text-[rgba(192,136,64,0.65)] text-[11.5px]
                             hover:border-[rgba(192,136,64,0.5)] hover:text-[rgba(220,168,90,0.9)]
                             transition-all duration-150 bg-transparent">
            УКР
          </button>
        </div>
      </header>

      {/* Center area — logo + title + input */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-6">

        {/* Big book + title */}
        <div className="flex flex-col items-center gap-5 mb-8">
          <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
            <path d="M28 5C28 5 20 3.5 8 6.5L7 39C19 36 27 38 28 38L28 5Z"
              fill="rgba(58,32,16,0.07)" stroke="rgba(58,32,16,0.18)" strokeWidth="0.9"/>
            <path d="M28 5C28 5 36 3.5 48 6.5L49 39C37 36 29 38 28 38L28 5Z"
              fill="rgba(58,32,16,0.05)" stroke="rgba(58,32,16,0.14)" strokeWidth="0.9"/>
            <line x1="28" y1="4.5" x2="28" y2="38.5" stroke="rgba(58,32,16,0.3)" strokeWidth="1.3"/>
            <line x1="28" y1="4.5" x2="28" y2="38.5" stroke="rgba(192,136,64,0.45)" strokeWidth="0.6"/>
            <line x1="12" y1="14" x2="24" y2="13"   stroke="rgba(58,32,16,0.13)" strokeWidth="0.9"/>
            <line x1="12" y1="18" x2="24" y2="17"   stroke="rgba(58,32,16,0.13)" strokeWidth="0.9"/>
            <line x1="12" y1="22" x2="24" y2="21"   stroke="rgba(58,32,16,0.13)" strokeWidth="0.9"/>
            <line x1="12" y1="26" x2="24" y2="25"   stroke="rgba(58,32,16,0.09)" strokeWidth="0.9"/>
            <line x1="12" y1="30" x2="20" y2="29.5" stroke="rgba(58,32,16,0.09)" strokeWidth="0.9"/>
            <line x1="32" y1="13" x2="44" y2="14"   stroke="rgba(58,32,16,0.13)" strokeWidth="0.9"/>
            <line x1="32" y1="17" x2="44" y2="18"   stroke="rgba(58,32,16,0.13)" strokeWidth="0.9"/>
            <line x1="32" y1="21" x2="44" y2="22"   stroke="rgba(58,32,16,0.13)" strokeWidth="0.9"/>
            <line x1="32" y1="25" x2="44" y2="26"   stroke="rgba(58,32,16,0.09)" strokeWidth="0.9"/>
            <line x1="32" y1="29.5" x2="40" y2="30" stroke="rgba(58,32,16,0.09)" strokeWidth="0.9"/>
            <ellipse cx="28" cy="39.5" rx="19" ry="2.2" fill="rgba(58,32,16,0.06)"/>
          </svg>
          <div className="text-center">
            <h1 className="font-[var(--font-serif)] text-[26px] font-normal text-[var(--color-ink)]
                           tracking-[-0.02em] leading-[1.15] mb-2">
              Чим можу допомогти?
            </h1>
            <p className="text-[13.5px] text-[var(--color-ink-3)] font-light leading-[1.65] max-w-[280px]">
              Знайду книги в каталозі, розповім про послуги і ресурси бібліотеки ХДАК.
            </p>
          </div>
        </div>

        {/* Input box */}
        <div className="w-full max-w-[520px]">
          <div className="bg-white border border-[rgba(26,14,6,0.14)] rounded-[16px]
                          focus-within:border-[rgba(26,14,6,0.28)]
                          focus-within:shadow-[0_0_0_3px_rgba(26,14,6,0.04)]
                          transition-all duration-150">
            <textarea
              value={input}
              onChange={autoResize}
              onKeyDown={onKey}
              placeholder="Запитайте про бібліотеку…"
              rows={1}
              disabled={loading}
              className="block w-full bg-transparent border-none outline-none resize-none
                         text-[15px] font-light text-[var(--color-ink)] leading-[1.55]
                         placeholder:text-[var(--color-ink-4)]
                         px-4 pt-[13px] pb-0 min-h-[46px] max-h-[120px]
                         disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              {/* Suggestion chips */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 mr-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => start(s)}
                    disabled={loading}
                    className="flex-shrink-0 h-[23px] px-[9px] rounded-full
                               border border-[rgba(26,14,6,0.13)]
                               text-[11px] font-light text-[var(--color-ink-3)]
                               whitespace-nowrap transition-all duration-100
                               hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]
                               disabled:opacity-40 bg-transparent first:border-[rgba(192,136,64,0.38)]
                               first:text-[var(--color-gold)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Send button */}
              <button
                onClick={() => start(input)}
                disabled={!input.trim() || loading}
                className="w-[30px] h-[30px] flex-shrink-0 flex items-center justify-center
                           bg-[var(--color-ink)] rounded-[9px] text-white
                           hover:bg-[var(--color-ink-2)] active:scale-90
                           disabled:bg-[var(--color-paper-3)] disabled:text-[var(--color-ink-4)]
                           transition-all duration-100"
              >
                {loading ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"
                            strokeDasharray="14" strokeDashoffset="4"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"
                       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 7H1"/><path d="M8 2l5 5-5 5"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--color-ink-4)] text-center mt-[6px]
                        hidden sm:block">
            Enter — надіслати · Shift+Enter — новий рядок
          </p>
        </div>
      </main>
    </div>
  )
}
