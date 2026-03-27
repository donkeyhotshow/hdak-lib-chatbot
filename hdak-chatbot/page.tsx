'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Menu, Clock, ClipboardList, Search, MapPin } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import ChatBubble from '@/components/ChatBubble'
import ChatInput from '@/components/ChatInput'
import { getQuickResponse } from '@/lib/hdak-data'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  chips?: string[]
  time?: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hdak_chat_history_v2'

const CARDS = [
  {
    Icon: Clock,
    title: 'Графік роботи',
    sub: 'Розклад усіх відділів',
    query: 'Графік роботи бібліотеки',
  },
  {
    Icon: ClipboardList,
    title: 'Записатися',
    sub: 'Отримати читацький квиток',
    query: 'Як записатися до бібліотеки',
  },
  {
    Icon: Search,
    title: 'Каталог',
    sub: 'Пошук книг і видань',
    query: 'Електронний каталог',
  },
  {
    Icon: MapPin,
    title: 'Контакти',
    sub: 'Адреса, телефони, email',
    query: 'Контакти та адреса',
  },
]

const HEADER_BOOK = (
  <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
    <path d="M10 2C10 2 7 1.2 3 2.5L2.5 12.5C6.5 11.2 9.5 12 10 12L10 2Z"
      fill="rgba(184,120,48,0.18)" stroke="rgba(184,120,48,0.55)" strokeWidth="0.65"/>
    <path d="M10 2C10 2 13 1.2 17 2.5L17.5 12.5C13.5 11.2 10.5 12 10 12L10 2Z"
      fill="rgba(184,120,48,0.12)" stroke="rgba(184,120,48,0.44)" strokeWidth="0.65"/>
    <line x1="10" y1="1.8" x2="10" y2="12" stroke="rgba(184,120,48,0.78)" strokeWidth="0.72"/>
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [view, setView]                 = useState<'landing' | 'chat'>('landing')
  const [messages, setMessages]         = useState<Message[]>([])
  const [loading, setLoading]           = useState(false)
  const [sessions, setSessions]         = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Restore history from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSessions(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // ── Persist on messages change ──
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === currentSessionId ? { ...s, messages } : s
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [messages, currentSessionId])

  // ── Scroll to bottom ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send message ──
  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    // Switch to chat view
    setView('chat')

    // Create session if needed
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = Date.now().toString()
      setCurrentSessionId(sessionId)
      const newSession: ChatSession = {
        id: sessionId,
        title: text.slice(0, 48),
        messages: [],
        createdAt: Date.now(),
      }
      setSessions(prev => {
        const updated = [newSession, ...prev]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return updated
      })
    }

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // ── Quick response ──
    const quick = getQuickResponse(text)
    if (quick) {
      await new Promise(r => setTimeout(r, 480))
      setMessages(prev => [...prev, {
        id: `b_${Date.now()}`,
        role: 'assistant',
        content: quick.text,
        chips: quick.chips,
        time: '< 1с',
      }])
      setLoading(false)
      return
    }

    // ── Real AI streaming ──
    try {
      const res = await fetch('/api/conversations/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream body')

      const botId = `b_${Date.now()}`
      setMessages(prev => [...prev, { id: botId, role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setMessages(prev =>
          prev.map(m => m.id === botId ? { ...m, content: full } : m)
        )
      }

      setMessages(prev =>
        prev.map(m => m.id === botId ? { ...m, content: full, time: '...' } : m)
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Невідома помилка'
      setMessages(prev => [...prev, {
        id: `b_${Date.now()}`,
        role: 'assistant',
        content: `Помилка зв'язку: ${msg}\n\nЗверніться напряму:\n📧 abon@xdak.ukr.education\n📱 +380 66 145 84 84`,
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, currentSessionId])

  // ── New chat ──
  function newChat() {
    setMessages([])
    setCurrentSessionId(null)
    setView('landing')
  }

  // ── Load session ──
  function loadSession(id: string) {
    const session = sessions.find(s => s.id === id)
    if (!session) return
    setCurrentSessionId(id)
    setMessages(session.messages)
    setView('chat')
  }

  // ── Sidebar history items ──
  const historyItems = sessions.map(s => ({ id: s.id, title: s.title }))

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={newChat}
        onQuery={q => { send(q) }}
        chatHistory={historyItems}
        currentChatId={currentSessionId ?? undefined}
        onSelectChat={loadSession}
      />

      {/* ── MAIN COLUMN ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minWidth: 0,
      }}>

        {/* ── HEADER ── */}
        <header style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '48px', padding: '0 16px',
          background: '#1a0d06',
          borderBottom: '1px solid #100702',
          boxShadow: '0 1px 0 rgba(184,120,48,0.10), 0 3px 16px rgba(0,0,0,0.22)',
        }}>

          {/* Burger */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Відкрити меню"
            style={{
              width: '32px', height: '32px', background: 'transparent',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', transition: 'background 0.12s', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Menu size={18} color="rgba(240,224,200,0.65)" />
          </button>

          {/* Brand */}
          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {HEADER_BOOK}
            <div>
              <div style={{
                fontFamily: 'var(--fs)', fontSize: '14px', fontStyle: 'italic',
                fontWeight: 500, color: 'rgba(240,222,195,0.85)', letterSpacing: '0.01em',
                lineHeight: 1.1,
              }}>
                Бібліотека ХДАК
              </div>
              <div style={{
                fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em',
                color: 'rgba(184,120,48,0.52)', textTransform: 'uppercase', marginTop: '1px',
              }}>
                ЧАТ-ПОМІЧНИК
              </div>
            </div>
          </div>

          <div style={{ width: '32px', flexShrink: 0 }} />
        </header>

        {/* ── LANDING ── */}
        {view === 'landing' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 16px 100px', overflowY: 'auto',
            animation: 'fadeUp 0.5s cubic-bezier(0.32,0,0.18,1) both',
          }}>

            {/* Gold line */}
            <div style={{
              width: '32px', height: '1px',
              background: 'rgba(184,120,48,0.35)', marginBottom: '22px',
            }} />

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--fs)',
              fontSize: 'clamp(22px, 5vw, 32px)',
              fontWeight: 400, color: 'var(--t0)',
              letterSpacing: '-0.02em', lineHeight: 1.1,
              textAlign: 'center', marginBottom: '5px',
            }}>
              Бібліотека ХДАК
            </h1>
            <p style={{
              fontFamily: 'var(--fs)',
              fontSize: 'clamp(17px, 4vw, 24px)',
              fontStyle: 'italic', fontWeight: 400,
              color: 'var(--gold)', opacity: 0.85,
              textAlign: 'center', marginBottom: '28px',
            }}>
              Чим можу допомогти?
            </p>

            {/* 4 Cards — 2×2 grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '7px',
              width: '100%', maxWidth: '460px',
              marginBottom: '20px',
            }}>
              {CARDS.map(({ Icon, title, sub, query }) => (
                <Card key={query} Icon={Icon} title={title} sub={sub} onClick={() => send(query)} />
              ))}
            </div>

            {/* Input */}
            <div style={{ width: '100%', maxWidth: '460px' }}>
              <ChatInput onSend={send} disabled={loading} />
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {view === 'chat' && (
          <>
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: '20px 16px 8px',
              display: 'flex', flexDirection: 'column',
              background: 'var(--bg)',
            }}>
              <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto' }}>

                {/* Date separator */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  fontSize: '9.5px', fontWeight: 500, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--t4)', marginBottom: '16px',
                }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
                  сьогодні
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--b0)' }} />
                </div>

                {messages.map(msg => (
                  <ChatBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    chips={msg.chips}
                    responseTime={msg.time}
                    onChipClick={send}
                  />
                ))}

                {/* Typing indicator */}
                {loading && <TypingIndicator />}

                <div ref={bottomRef} />
              </div>
            </div>

            <div style={{
              maxWidth: '680px', width: '100%',
              margin: '0 auto', alignSelf: 'stretch',
            }}>
              <ChatInput onSend={send} disabled={loading} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({
  Icon, title, sub, onClick,
}: {
  Icon: React.ElementType
  title: string
  sub: string
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '13px 14px',
        background: '#ffffff',
        border: `0.5px solid ${hov ? 'rgba(184,120,48,0.32)' : 'rgba(23,12,4,0.09)'}`,
        borderRadius: '11px', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.13s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? '0 3px 10px rgba(23,12,4,0.07)' : 'none',
        minHeight: '68px',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: '34px', height: '34px', flexShrink: 0,
        background: hov ? 'rgba(184,120,48,0.14)' : 'rgba(184,120,48,0.09)',
        borderRadius: '9px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.13s',
      }}>
        <Icon size={16} strokeWidth={1.4} color="#b87830" />
      </div>
      <div>
        <div style={{
          fontSize: '13px', fontWeight: 500,
          color: '#180c05', marginBottom: '3px',
        }}>
          {title}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 300, color: '#a07a54' }}>
          {sub}
        </div>
      </div>
    </button>
  )
}

function TypingIndicator() {
  const BOOK_SVG = (
    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
      <path d="M6 1C6 1 3.8.5 2 1L1.5 8C3.5 7.5 5.5 8 6 8L6 1Z"
        fill="rgba(184,120,48,.22)" stroke="rgba(184,120,48,.58)" strokeWidth=".6"/>
      <path d="M6 1C6 1 8.2.5 10 1L10.5 8C8.5 7.5 6.5 8 6 8L6 1Z"
        fill="rgba(184,120,48,.16)" stroke="rgba(184,120,48,.46)" strokeWidth=".6"/>
      <line x1="6" y1="1" x2="6" y2="8" stroke="rgba(184,120,48,.8)" strokeWidth=".75"/>
    </svg>
  )
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end',
      gap: '8px', marginBottom: '16px',
      animation: 'fadeUp 0.16s ease',
    }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '5px',
        background: '#1a0d06', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {BOOK_SVG}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '3.5px',
        padding: '10px 14px', background: '#ffffff',
        border: '0.5px solid var(--b0)',
        borderRadius: '14px 14px 14px 3px',
        boxShadow: '0 1px 3px rgba(23,12,4,0.04)',
      }}>
        {[0, 0.17, 0.34].map((delay, i) => (
          <div key={i} style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'var(--t4)',
            animation: `dot 1.3s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
