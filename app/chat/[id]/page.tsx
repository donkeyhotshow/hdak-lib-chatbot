'use client'

import React, { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ChatMessage, TypingIndicator } from '@/components/ChatMessage'
import { Send, Loader2, Cpu } from 'lucide-react'

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
        if (!res.ok) throw new Error('Network error')
        return res.json()
      })
      .then(data => { 
        if (Array.isArray(data)) setMessages(data); 
        setLoaded(true) 
      })
      .catch((err) => {
        console.error('Failed to load messages:', err)
        setError('Не вдалося завантажити повідомлення')
        setLoaded(true)
      })
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
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 lg:px-16 pb-56 pt-12 scrollbar-hide will-change-scroll">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-14">
          {!loaded && (
            <div className="flex flex-col gap-8 w-full">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`h-32 rounded-lg animate-pulse ${i % 2 === 0 ? 'bg-black/[0.03] ml-auto w-2/3' : 'bg-white border border-black/5 mr-auto w-3/4'}`} />
              ))}
            </div>
          )}
          
          {loaded && messages.map((m, i) => (
            <ChatMessage
              key={m.id}
              index={i}
              role={m.role as 'user' | 'assistant'}
              content={m.content}
              timestamp={m.createdAt}
              onChipClick={(chip) => send(chip)}
            />
          ))}
          
          {streaming && streamContent && (
            <ChatMessage role="assistant" index={messages.length} content={streamContent} isStreaming={true} />
          )}
          
          {streaming && !streamContent && (
            <div className="mt-4 flex flex-col gap-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-4 text-[#D4A373]">
                 <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[#D4A373] rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-[#D4A373] rounded-full animate-bounce delay-150"></div>
                    <div className="w-1.5 h-1.5 bg-[#D4A373] rounded-full animate-bounce delay-300"></div>
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] italic opacity-80">Обробка запиту...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-[#b87c32] text-center my-8 text-[13px] bg-[#b87c32]/5 border border-[#b87c32]/10 p-6 rounded-lg mx-auto max-w-sm">
              <strong>Помилка:</strong> {error}
              <br/>
              <button 
                onClick={() => {
                  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
                  if (lastUserMsg) send(lastUserMsg.content)
                }} 
                className="px-6 py-2.5 bg-white border border-[#b87c32]/20 rounded-md mt-4 cursor-pointer hover:bg-black/5 transition-all font-black text-[11px] uppercase tracking-widest"
              >
                Спробувати ще
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 pb-12 bg-[#fcfaf7]/90 backdrop-blur-md sticky bottom-0 border-t border-black/[0.03]">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center group">
            <div className="absolute inset-0 bg-white/50 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 -z-10" />
            <textarea 
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto'
                  textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) send(input);
                }
              }}
              placeholder="Запитайте будь-що про ресурси бібліотеки..."
              className="w-full bg-white py-5 pl-8 pr-20 rounded-2xl border border-black/[0.05] shadow-[0_4px_24px_rgba(0,0,0,0.04)] outline-none text-[16px] font-medium placeholder:text-gray-300 focus:border-[#b87830]/40 focus:shadow-[0_8px_30px_rgba(184,120,48,0.1)] transition-all duration-500 resize-none overflow-hidden"
              disabled={streaming}
            />
            <button 
              disabled={!input.trim() || streaming}
              onClick={() => send(input)}
              className="absolute right-4 w-12 h-12 rounded-xl bg-[#1a130f] text-[#b87830] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20 disabled:opacity-20 disabled:scale-100 group/btn"
            >
              {streaming ? (
                <Loader2 size={20} className="animate-spin text-[#b87830]" />
              ) : (
                <Send size={20} strokeWidth={2.5} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-5 uppercase tracking-[3px] font-semibold opacity-25">Харківська державна академія культури</p>
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
