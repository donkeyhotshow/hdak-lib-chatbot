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
              {QUICK_REPLIES.map(({ id, title, subtitle, highlights, query, Icon }, idx) => (
                <button
                  key={id}
                  disabled={loading}
                  onClick={() => start(query)}
                  className="quick-reply-card"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="quick-reply-header">
                    <div className="quick-reply-icon">
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <div className="quick-reply-title-block">
                      <span className="quick-reply-title">{title}</span>
                      <span className="quick-reply-subtitle">{subtitle}</span>
                    </div>
                  </div>
                  <div className="quick-reply-highlights">
                    {highlights.map((hl, i) => (
                      <span key={i} className="highlight-tag">{hl}</span>
                    ))}
                  </div>
                  <div className="quick-reply-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
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

/* Quick Reply Cards - 4 columns grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto 32px;
}

.quick-reply-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: #ffffff;
  border: 0.5px solid rgba(24, 12, 5, 0.08);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  width: 100%;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}

.quick-reply-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(184, 120, 48, 0.05) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.quick-reply-card:hover::before {
  opacity: 1;
}

.quick-reply-card:hover {
  border-color: rgba(184, 120, 48, 0.3);
  background: #fefdfb;
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(24, 12, 5, 0.1);
}

.quick-reply-card:active {
  transform: translateY(0);
}

.quick-reply-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-reply-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.quick-reply-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(184, 120, 48, 0.15) 0%, rgba(184, 120, 48, 0.06) 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #b87830;
  transition: all 0.3s ease;
}

.quick-reply-card:hover .quick-reply-icon {
  background: linear-gradient(135deg, rgba(184, 120, 48, 0.22) 0%, rgba(184, 120, 48, 0.1) 100%);
  transform: scale(1.08);
}

.quick-reply-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-reply-title {
  font-size: 16px;
  font-weight: 600;
  color: #180c05;
  line-height: 1.3;
}

.quick-reply-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: #a07a54;
  line-height: 1.3;
}

.quick-reply-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.highlight-tag {
  display: inline-block;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(184, 120, 48, 0.1) 0%, rgba(184, 120, 48, 0.04) 100%);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #8a5a2a;
  transition: all 0.2s ease;
}

.quick-reply-card:hover .highlight-tag {
  background: linear-gradient(135deg, rgba(184, 120, 48, 0.15) 0%, rgba(184, 120, 48, 0.08) 100%);
}

.quick-reply-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(184, 120, 48, 0.3);
  transition: all 0.3s ease;
}

.quick-reply-card:hover .quick-reply-arrow {
  color: #b87830;
  transform: translateY(-50%) translateX(4px);
}

/* Card entrance animation */
.quick-reply-card {
  animation: cardFadeIn 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
        
        @media (max-width: 767px) {
          .hero-title-main { font-size: 22px; }
          .hero-title-sub { font-size: 20px; }
          .cards-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .quick-reply-card {
            padding: 16px;
          }
          .quick-reply-highlights {
            gap: 6px;
          }
          .highlight-tag {
            font-size: 11px;
            padding: 5px 10px;
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
