'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LandingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [inputTitle, setInputTitle] = useState('')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      start(q)
    }
  }, [searchParams])

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
    <>
      <section id="chat-window">
        <div className="chat-container">
          <div className="hero" id="hero">
            <div className="ornament"></div>
            <h2>Чим можу допомогти?<br /><i>Знайду книги, розповім про послуги…</i></h2>
            
            <div className="suggestions">
              {[
                { icon: "🕐", title: "Графік",      sub: "Розклад роботи залів",   query: "Графік роботи бібліотеки" },
                { icon: "🔍", title: "Каталог",     sub: "Пошук книг і видань",    query: "Електронний каталог" },
                { icon: "📋", title: "Записатися",  sub: "Отримати читацький квиток", query: "Як записатися до бібліотеки" },
                { icon: "🔬", title: "Наука",       sub: "Scopus, WoS, Springer",  query: "Наукові бази даних" },
                { icon: "📍", title: "Контакти",    sub: "Адреса, телефони",        query: "Контакти та адреса" },
                { icon: "📖", title: "Репозитарій", sub: "Підручники онлайн",       query: "Репозитарій ХДАК" },
                { icon: "🎭", title: "Виставки",    sub: "Віртуальні колекції",     query: "Віртуальні виставки" },
                { icon: "💳", title: "Єдина картка",sub: "Доступ до 20+ бібліотек",query: "Єдина картка читача" }
              ].map((card, i) => (
                <div key={i} className="suggest-card" onClick={() => start(card.query)}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
                  <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>{card.title}</strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="input-area-wrapper">
        <div className="input-container">
          <textarea 
            rows={1} 
            placeholder="Ваше звернення..." 
            value={inputTitle}
            onChange={e => {
              setInputTitle(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                start(inputTitle)
              }
            }}
            disabled={loading}
          />
          <button 
            className="send-btn" 
            onClick={() => start(inputTitle)}
            disabled={loading || !inputTitle.trim()}
          >
            {loading ? (
              <div className="dot" style={{ animation: 'pulse 1s infinite alternate' }} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageInner />
    </Suspense>
  )
}
