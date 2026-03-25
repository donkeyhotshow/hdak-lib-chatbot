'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Clock, Search, ClipboardList, FlaskConical,
  MapPin, BookOpen, Presentation, CreditCard, Loader2
} from 'lucide-react'

const MAX_TITLE_LENGTH = 200;

interface QuickReply {
  id: string
  title: string
  subtitle: string
  highlights: string[]
  query: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'schedule',
    title: 'Графік роботи',
    subtitle: 'Режим роботи читалень',
    highlights: ['Пн-Пт: 9:00–16:45', 'Сб: 9:00–13:30', 'Обід: 13:00–13:45'],
    query: 'Графік роботи бібліотеки',
    Icon: Clock,
  },
  {
    id: '如何',
    title: 'Як записатися',
    subtitle: 'Отримання читацького квитка',
    highlights: ['Паспорт + ІПН', 'Безкоштовно', 'Термін дії — 5 років'],
    query: 'Як записатися до бібліотеки',
    Icon: ClipboardList,
  },
  {
    id: 'catalog',
    title: 'Електронний каталог',
    subtitle: 'Пошук книг та видань',
    highlights: ['250 000+ видань', 'Онлайн пошук', 'Бронювання онлайн'],
    query: 'Електронний каталог',
    Icon: Search,
  },
  {
    id: 'contacts',
    title: 'Контакти',
    subtitle: 'Адреса та телефони',
    highlights: ['Бурсацький узвіз, 4', '(057) 731-27-83', 't.me/hdak_lib'],
    query: 'Контакти та адреса',
    Icon: MapPin,
  },
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
            <div className="cards-grid">
              {QUICK_REPLIES.map(({ id, title, query, Icon }, idx) => (
                <button
                  key={id}
                  disabled={loading}
                  onClick={() => start(query)}
                  className="quick-reply-pill"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="quick-reply-icon-small">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <span className="quick-reply-title-small">{title}</span>
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
              <Loader2 className="animate-spin" size={22} />
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
        .hero-title-main { font-size: clamp(26px, 5vw, 42px); }
        .hero-title-sub { font-size: clamp(22px, 4vw, 36px); color: var(--gold); font-style: italic; }

/* Quick Reply Pills Grid */
.cards-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto 32px;
}

.quick-reply-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px 10px 14px;
  background: white;
  border: 1px solid rgba(184, 120, 48, 0.15);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  animation: cardFadeIn 0.5s ease-out forwards;
  opacity: 0;
  box-shadow: 0 4px 12px rgba(24, 12, 5, 0.03);
}

.quick-reply-pill:hover {
  border-color: rgba(184, 120, 48, 0.4);
  background: #fdfcfb;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(184, 120, 48, 0.08);
}

.quick-reply-pill:active {
  transform: translateY(0);
}

.quick-reply-pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-reply-icon-small {
  color: #a07a54;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.25s;
}

.quick-reply-pill:hover .quick-reply-icon-small {
  color: #b87830;
  transform: scale(1.05);
}

.quick-reply-title-small {
  font-size: 14px;
  font-weight: 500;
  color: #2D1B13;
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

        @media (max-width: 767px) {
          .hero-title-main { font-size: 22px; }
          .hero-title-sub { font-size: 20px; }
          .cards-grid {
            gap: 10px;
            max-width: 100%;
          }
          .quick-reply-pill {
            padding: 8px 16px 8px 12px;
          }
          .quick-reply-title-small {
            font-size: 13px;
          }
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
