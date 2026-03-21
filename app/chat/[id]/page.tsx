'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'

interface Message {
  id: number | string
  role: 'user' | 'assistant'
  content: string
}

function ChatContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const didAutoSend = useRef(false)

  /* Load existing messages */
  useEffect(() => {
    fetch(`/api/conversations/${id}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [id])

  /* Auto-send initial query from landing page */
  useEffect(() => {
    if (!loaded || didAutoSend.current) return
    const q = searchParams.get('q')
    if (q) {
      didAutoSend.current = true
      send(q)
    }
  }, [loaded])

  /* Scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  async function send(text: string) {
    if (streaming) return
    setError(null)

    const userMsg: Message = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setStreamContent('')

    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Помилка ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Немає відповіді від сервера')

      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setStreamContent(full)
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: full,
      }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Невідома помилка')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setStreaming(false)
      setStreamContent('')
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[var(--color-paper)]">

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between h-[52px] px-5
                         bg-[var(--color-ink)] border-b border-black/20 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
              <path d="M11 2C11 2 7.5 1 3 2.5L2.5 14.5C7 13 10.5 14 11 14L11 2Z"
                fill="rgba(192,136,64,0.2)" stroke="rgba(192,136,64,0.6)" strokeWidth="0.7"/>
              <path d="M11 2C11 2 14.5 1 19 2.5L19.5 14.5C15 13 11.5 14 11 14L11 2Z"
                fill="rgba(192,136,64,0.14)" stroke="rgba(192,136,64,0.5)" strokeWidth="0.7"/>
              <line x1="11" y1="1.5" x2="11" y2="14" stroke="rgba(192,136,64,0.8)" strokeWidth="0.8"/>
            </svg>
            <span className="font-[var(--font-serif)] text-[15px] text-white/88 tracking-[0.01em]
                             group-hover:text-white transition-colors">
              Бібліотека ХДАК
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/"
            className="h-[26px] px-3 rounded-full border border-[rgba(192,136,64,0.25)]
                       text-[rgba(192,136,64,0.65)] text-[11.5px]
                       hover:border-[rgba(192,136,64,0.5)] hover:text-[rgba(220,168,90,0.9)]
                       transition-all duration-150 flex items-center gap-1">
            + Новий чат
          </Link>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[680px] mx-auto space-y-5">

          {/* Loading skeleton */}
          {!loaded && (
            <div className="flex flex-col gap-4">
              {[1,2,3].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <div className={`h-10 rounded-2xl animate-pulse bg-[var(--color-paper-3)]
                                  ${i % 2 === 0 ? 'w-48' : 'w-64'}`}/>
                </div>
              ))}
            </div>
          )}

          {/* Messages list */}
          {loaded && messages.map(msg => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content}/>
          ))}

          {/* Streaming response */}
          {streaming && streamContent && (
            <ChatMessage role="assistant" content={streamContent} isStreaming/>
          )}

          {/* Typing indicator (before first chunk) */}
          {streaming && !streamContent && (
            <div className="flex items-end gap-2">
              <div className="w-[24px] h-[24px] rounded-[5px] bg-[var(--color-ink)]
                              flex items-center justify-center flex-shrink-0">
                <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                  <path d="M6.5 1C6.5 1 4.2.5 2 1L1.5 8.8C3.8 8.3 6 8.8 6.5 8.8L6.5 1Z"
                    fill="rgba(192,136,64,0.22)" stroke="rgba(192,136,64,0.6)" strokeWidth="0.6"/>
                  <path d="M6.5 1C6.5 1 8.8.5 11 1L11.5 8.8C9.2 8.3 7 8.8 6.5 8.8L6.5 1Z"
                    fill="rgba(192,136,64,0.16)" stroke="rgba(192,136,64,0.48)" strokeWidth="0.6"/>
                  <line x1="6.5" y1="1" x2="6.5" y2="8.8" stroke="rgba(192,136,64,0.8)" strokeWidth="0.8"/>
                </svg>
              </div>
              <div className="bg-white border border-[rgba(26,14,6,0.08)]
                              rounded-[16px_16px_16px_3px] px-4 py-3 flex gap-1 items-center">
                {[0, 0.18, 0.36].map((delay, i) => (
                  <span key={i}
                    className="w-[4px] h-[4px] rounded-full bg-[var(--color-ink-4)]
                               animate-[typing_1.3s_ease-in-out_infinite]"
                    style={{ animationDelay: `${delay}s` }}/>
                ))}
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center justify-between gap-3 px-4 py-3
                            bg-[#FEF2F2] border border-[#FECACA] rounded-[10px]
                            text-[#991B1B] text-[13px]">
              <span>{error}</span>
              <button onClick={() => setError(null)}
                      className="text-[#991B1B]/60 hover:text-[#991B1B] text-[16px] leading-none">
                ×
              </button>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>
      </main>

      <ChatInput onSend={send} disabled={streaming}/>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center">Завантаження...</div>}>
      <ChatContent />
    </Suspense>
  )
}
