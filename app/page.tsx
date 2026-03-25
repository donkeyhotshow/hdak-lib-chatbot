'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Clock, Search, ClipboardList, FlaskConical,
  MapPin, BookOpen, Presentation, CreditCard
} from 'lucide-react'

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

const cardBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 10,
  padding: '14px 14px 12px',
  background: '#ffffff',
  border: '0.5px solid rgba(24,12,5,0.10)',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'all 0.13s',
  textAlign: 'left',
  width: '100%',
  fontFamily: 'inherit',
}

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
        body: JSON.stringify({ title: t.slice(0, 60) }),
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
            <h2>Бібліотека <i>ХДАК</i><br />Чим можу допомогти?</h2>

            {/* CARDS GRID */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              width: '100%',
              maxWidth: 520,
              margin: '0 auto 20px',
            }}
              className="cards-grid"
            >
              {CARDS.map(({ Icon, title, sub, query }) => (
                <button
                  key={query}
                  disabled={loading}
                  onClick={() => start(query)}
                  style={cardBase}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(24,12,5,0.22)'
                    el.style.transform = 'translateY(-1px)'
                    el.style.boxShadow = '0 3px 10px rgba(24,12,5,0.07)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(24,12,5,0.10)'
                    el.style.transform = 'none'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: 30, height: 30,
                    background: '#f6f3ee',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} strokeWidth={1.5} color="#3a2010" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#180c05', lineHeight: 1.2, marginBottom: 3 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 300, color: '#9a7a54', lineHeight: 1.3 }}>
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
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 599px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 600px) and (max-width: 800px) {
          .cards-grid { grid-template-columns: repeat(4, 1fr) !important; }
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
