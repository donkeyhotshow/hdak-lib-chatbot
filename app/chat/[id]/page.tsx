'use client'

import React, { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { ChatMessage, TypingIndicator } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { Tabs } from '@/components/Tabs'

interface Message {
  id: number | string
  role: 'user' | 'assistant'
  content: string
}

function ChatPageInner() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [loaded, setLoaded] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInited = useRef(false)

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      })
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isBottom = scrollHeight - scrollTop - clientHeight < 60
      setShowScrollBtn(!isBottom)
    }
  }

  useEffect(() => {
    fetch(`/api/conversations/${id}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [id])

  useEffect(() => {
    if (loaded && searchParams.get('q') && !hasInited.current) {
      const q = searchParams.get('q')
      if (q) {
        hasInited.current = true
        send(q)
      }
    }
  }, [loaded, searchParams])

  useEffect(() => {
    scrollToBottom(streaming ? 'smooth' : 'auto')
  }, [messages, streamContent, streaming])

  async function send(text: string) {
    if (!text.trim() || streaming) return
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
        full += decoder.decode(value, { stream: true })
        setStreamContent(full)
      }

      if (full) {
        setMessages(prev => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', content: full },
        ])
      }
      setStreamContent('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Невідома помилка')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f7f4ef]">
      <Header showNewChat />
      <Tabs />
      
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <main 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-[24px_18px_12px] flex flex-col scrollbar-none"
        >
          {messages.length > 0 && (
            <div className="flex items-center gap-2 text-[9.5px] font-medium tracking-[0.09em] uppercase text-[#c4a882] mb-[18px] before:content-[''] before:flex-1 before:h-[0.5px] before:bg-[#170c04]/06 after:content-[''] after:flex-1 after:h-[0.5px] after:bg-[#170c04]/06">
              сьогодні
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} onChipClick={send} />
          ))}

          {streaming && (
            <>
              {streamContent ? (
                <ChatMessage role="assistant" content={streamContent} isStreaming onChipClick={send} />
              ) : (
                <TypingIndicator />
              )}
            </>
          )}

          {error && (
            <div className="flex items-center justify-between p-[7px_11px] mt-1 bg-[#8c2323]/04 border border-[#8c2323]/12 rounded-[9px] animate-fade-up">
              <div className="text-[12px] text-[#7a4040] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#7a4040] flex-shrink-0" />
                {error}
              </div>
              <button 
                onClick={() => {
                  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
                  if (lastUserMsg) send(lastUserMsg.content)
                }}
                className="h-[21px] px-[9px] bg-transparent border border-[#8c2323]/20 rounded-full text-[#7a4040] text-[10.5px] font-medium hover:bg-[#8c2323]/05 transition-all outline-none"
              >
                ↺ Повторити
              </button>
            </div>
          )}
        </main>

        <button
          onClick={() => scrollToBottom()}
          className={`absolute bottom-[90px] right-[18px] z-10 w-8 h-8 rounded-full bg-[#1c0f06] border border-[#b87c32]/20 text-[#f0e4c8]/75 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-opacity duration-200 outline-none
            ${showScrollBtn ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="Прокрутити вниз"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v12"/><path d="M3 9l4 4 4-4"/>
          </svg>
        </button>

        <div className="flex-shrink-0 px-[18px] py-[9px] pb-[max(9px,env(safe-area-inset-bottom))] bg-[#f7f4ef] border-t border-[#170c04]/06">
          <ChatInput onSend={send} disabled={streaming} />
        </div>
      </div>

       {/* Bottom Status Bar */}
       <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2 bg-[#120804] text-[10px] text-[#f7f4ef]/25 border-t border-black/20">
        <span className="w-1 h-1 rounded-full bg-[#4e8a4e]/50 flex-shrink-0" />
        вул. Бурсацький узвіз, 4, Харків · (057) 731-27-83 · +380 66 145 84 84
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}
