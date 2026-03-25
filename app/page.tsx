'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Clock, Search, ClipboardList, FlaskConical,
  MapPin, BookOpen, Presentation, CreditCard
} from 'lucide-react'

const MAX_TITLE_LENGTH = 200;

const CARDS = [
  { Icon: Clock,         title: 'Графік',       sub: 'Розклад роботи',      query: 'Графік роботи бібліотеки' },
  { Icon: Search,        title: 'Каталог',      sub: 'Пошук видань',        query: 'Електронний каталог' },
  { Icon: ClipboardList, title: 'Записатися',   sub: 'Отримати квиток',     query: 'Як записатися до бібліотеки' },
  { Icon: FlaskConical,  title: 'Наука',        sub: 'Scopus, WoS',         query: 'Наукові бази даних' },
  { Icon: MapPin,        title: 'Контакти',     sub: 'Адреса, телефони',    query: 'Контакти та адреса' },
  { Icon: BookOpen,      title: 'Репозитарій',  sub: 'Підручники онлайн',   query: 'Репозитарій ХДАК' },
  { Icon: Presentation,  title: 'Виставки',     sub: 'Віртуальні колекції', query: 'Віртуальні виставки' },
  { Icon: CreditCard,    title: 'Єдина картка', sub: '20+ бібліотек',       query: 'Єдина картка читача' },
]


function LandingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [inputTitle, setInputTitle] = useState('')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) start(q)
  }, [searchParams])

  async function start(text: string) {
    const t = text.trim()
    if (!t || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t.slice(0, MAX_TITLE_LENGTH) }),
      })
      if (!res.ok) throw new Error()
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
            <div className="ornament" />
            <div style={{
              width: '32px',
              height: '1px',
              background: 'rgba(184,120,48,0.35)',
              margin: '0 auto 20px',
            }} />
            <h2 className="hero-title">
              <span className="hero-title-main">Бібліотека ХДАК</span><br />
              <span className="hero-title-sub">Чим можу допомогти?</span>
            </h2>

            {/* CARDS GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
              width: '100%',
              maxWidth: '480px',
              margin: '0 auto 20px',
            }}
            >
              {CARDS.map(({ Icon, title, sub, query }) => (
                <button
                  key={query}
                  disabled={loading}
                  onClick={() => start(query)}
                  className="home-card"
                >
                  <div style={{
                    width: '32px', height: '32px',
                    background: 'rgba(184,120,48,0.09)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} strokeWidth={1.5} color="#b87830" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#180c05', lineHeight: 1.2, marginBottom: '2px' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 300, color: '#a07a54', lineHeight: 1.2 }}>
                      {sub}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="input-area-wrapper">
        <div className="input-container">
          <textarea
            rows={1}
            placeholder="Запитайте про бібліотеку…"
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
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .home-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 13px;
          background: #ffffff;
          border: 0.5px solid rgba(24,12,5,0.09);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.13s ease;
          text-align: left;
          width: 100%;
          font-family: inherit;
        }
        .home-card:hover {
          border-color: rgba(184,120,48,0.35);
          background: #fdfbf8;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(24,12,5,0.06);
        }
        .hero-title-main { font-size: clamp(26px, 5vw, 42px); }
        .hero-title-sub { font-size: clamp(22px, 4vw, 36px); color: var(--gold); font-style: italic; }
        
        @media (max-width: 767px) {
          .hero-title-main { font-size: 22px; }
          .hero-title-sub { font-size: 20px; }
        }
      `}</style>
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
