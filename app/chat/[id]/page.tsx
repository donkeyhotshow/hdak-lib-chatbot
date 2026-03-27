'use client'

import React, { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import ChatMessage from '@/components/ChatMessage'
import { Send, Loader2, Cpu } from 'lucide-react'

interface Message {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  createdAt?: string
}

function ChatPageInner() {
  const params = useParams()
  const id = params?.id
  const searchParams = useSearchParams()
  const router = useRouter()
  
  if (!id) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">Завантаження...</p>
        </div>
      </div>
    )
  }
  
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasInited = useRef(false)

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
    }
  }

  useEffect(() => {
    fetch(`/api/conversations/${id}/messages`)
      .then(res => {
        if (res.status === 404) {
          router.push('/?not_found=1')
          return null
        }
        if (!res.ok) throw new Error('Network error')
        return res.json()
      })
      .then(data => { 
        if (data && Array.isArray(data)) setMessages(data); 
        setLoaded(true) 
      })
      .catch(() => {
        setError('Не вдалося завантажити повідомлення')
        setLoaded(true)
      })
  }, [id, router])

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
    
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

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

      const contentType = res.headers.get('Content-Type') ?? ''
      const isPlainText = contentType.includes('text/plain') && !contentType.includes('text/event-stream')

      if (isPlainText) {
        const rawText = await res.text()
        const textToSimulate = rawText.split('[CHIPS:')[0].trim()

        setStreaming(true)
        setStreamContent('')

        let typed = ''
        for (const word of textToSimulate.split(' ')) {
          typed += (typed ? ' ' : '') + word
          setStreamContent(typed)
          await new Promise(r => setTimeout(r, 18))
        }

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: rawText,
          createdAt: new Date().toISOString()
        }])
        setStreamContent('')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Немає відповіді від сервера')

      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) {
          full += chunk
          setStreamContent(full)
        }
      }
      const lastChunk = decoder.decode()
      if (lastChunk) {
        full += lastChunk
        setStreamContent(full)
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
    <div className="flex flex-col h-full bg-[#fcfaf7]">
        {/* Верхня частина */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/[0.03]">
          <h1 className="font-serif text-2xl font-bold text-[#1a130f]">Чат з бібліотекою</h1>
        </div>
        
        {/* Повідомлення */}
        <div className="flex-1 overflow-y-auto space-y-6 px-8 py-8 pb-32">
          {messages.map((msg, idx) => (
            <ChatMessage 
              key={msg.id} 
              role={msg.role} 
              content={msg.content} 
              index={idx}
              isStreaming={streaming && idx === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          {streamContent && (
            <ChatMessage 
              key="streaming" 
              role="assistant" 
              content={streamContent}
              isStreaming={true}
            />
          )}
        </div>
        
        {/* Input внизу — фіксований */}
        <div className="border-t border-black/[0.03] p-6 bg-white/80 backdrop-blur-xl mt-auto">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-3 items-end">
              <textarea 
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (input.trim()) send(input)
                  }
                }}
                placeholder="Ваше питання..."
                className="flex-1 px-5 py-4 border border-black/[0.06] rounded-2xl resize-none outline-none text-[15px] font-medium placeholder:text-gray-300 focus:border-[#b87830]/40 focus:shadow-[0_4px_20px_rgba(184,120,48,0.1)] transition-all bg-white"
                disabled={streaming}
              />
              <button 
                disabled={!input.trim() || streaming}
                onClick={() => send(input)}
                className="w-14 h-14 bg-[#1a130f] rounded-2xl flex items-center justify-center text-[#b87830] font-medium disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
              >
                {streaming ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
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
