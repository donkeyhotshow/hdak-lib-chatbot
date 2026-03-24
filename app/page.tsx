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
            <h2>Вітаємо Вас.<br />Який запит ми <i>розглянемо</i>?</h2>
            
            <div className="suggestions">
              <div className="suggest-card" onClick={() => setInputTitle('Де знаходиться бібліотека?')}>
                <small>Навігація</small>
                <span>Як дістатися до медіатеки?</span>
              </div>
              <div className="suggest-card" onClick={() => setInputTitle('Як стати читачем?')}>
                <small>Доступ</small>
                <span>Оформлення читацького квитка</span>
              </div>
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
