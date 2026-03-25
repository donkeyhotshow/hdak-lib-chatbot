'use client'

import React, { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ChatMessage, TypingIndicator } from '@/components/ChatMessage'

interface Message {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  createdAt?: string
}

function ChatPageInner() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasInited = useRef(false)

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
    }
  }

  useEffect(() => {
    fetch(`/api/conversations/${id}/messages`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [id])

  useEffect(() => {
    if (loaded && searchParams.get('q') && !hasInited.current) {
      const q = searchParams.get('q')
      if (q) { hasInited.current = true; send(q) }
    }
  }, [loaded, searchParams])

  useEffect(() => {
    scrollToBottom(streaming ? 'smooth' : 'auto')
  }, [messages, streamContent, streaming])

  async function send(text: string) {
    if (!text.trim() || streaming) return
    setError(null)
    const userMsg: Message = { id: Date.now(), role: 'user', content: text, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    
    // reset textarea height
    const ta = document.querySelector('textarea')
    if (ta) ta.style.height = 'auto'

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

      const contentType = res.headers.get('Content-Type')
      if (contentType && (contentType.includes('text/plain') || !contentType.includes('text/event-stream'))) {
        // Plain text response (likely automated reply) -> Simulate typing
        const text = await res.text()
        const textToSimulate = text.split('[CHIPS:')[0].trim()
        const chipsPart = text.includes('[CHIPS:') ? text.split('[CHIPS:')[1].split(']')[0] : ''
        const chips = chipsPart ? chipsPart.split(',').map(c => c.trim()) : []

        setStreaming(false)
        setStreamContent('')
        
        let currentTyped = ''
        const words = textToSimulate.split(' ')
        for (const word of words) {
          currentTyped += (currentTyped ? ' ' : '') + word
          setStreamContent(currentTyped)
          await new Promise(r => setTimeout(r, 20)) // Faster typing speed
        }
        
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          role: 'assistant', 
          content: textToSimulate,
          createdAt: new Date().toISOString()
        }])
        setStreamContent('')
        return
      }

      // Default Streaming behavior (AI)
      const decoder = new TextDecoder()
      let full = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const chunk = JSON.parse(line.slice(2))
              if (typeof chunk === 'string') { full += chunk; setStreamContent(full) }
            } catch {
              const plain = line.slice(2).replace(/^"|"$/g, '')
              if (plain) { full += plain; setStreamContent(full) }
            }
          } else if (!line.startsWith('d:') && !line.startsWith('e:') && !line.startsWith('f:') && line.trim()) {
            full += line; setStreamContent(full)
          }
        }
      }

      if (full) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: full, createdAt: new Date().toISOString() }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Невідома помилка')
    } finally {
      setStreaming(false)
      setStreamContent('')
    }
  }

  return (
    <>
      <section id="chat-window" ref={scrollRef}>
        <div className="chat-container">
          <div id="chat-content">
            {messages.length === 0 && loaded && !searchParams.get('q') && (
              <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '20vh', fontSize: 14 }}>
                Почніть діалог...
              </div>
            )}
            
            {messages.map(m => (
              <ChatMessage
                key={m.id}
                role={m.role as 'user' | 'assistant'}
                content={m.content}
                timestamp={m.createdAt}
                onChipClick={(chip) => send(chip)}
              />
            ))}
            
            {streaming && streamContent && (
              <ChatMessage role="assistant" content={streamContent} isStreaming={true} />
            )}
            
            {streaming && !streamContent && <TypingIndicator />}
            
            {error && (
              <div style={{ color: '#b87c32', textAlign: 'center', margin: '20px 0', fontSize: 13, background: 'rgba(184,124,50,0.1)', padding: 16, borderRadius: 16 }}>
                <strong>Помилка:</strong> {error}
                <br/>
                <button 
                  onClick={() => {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
                    if (lastUserMsg) send(lastUserMsg.content)
                  }} 
                  style={{ padding: '8px 16px', background: 'var(--white)', border: '1px solid var(--border-mocha)', borderRadius: 12, marginTop: 12, cursor: 'pointer' }}
                >
                  Спробувати ще
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="input-area-wrapper">
        <div className="input-container">
          <textarea 
            rows={1}
            placeholder="Ваше звернення..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            disabled={streaming}
            aria-label="Текст повідомлення"
          />
          <button 
            className="send-btn" 
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            aria-label="Надіслати"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}
