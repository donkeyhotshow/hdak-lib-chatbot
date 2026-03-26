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
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-12 pb-48 pt-10 scrollbar-hide will-change-scroll">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-12">
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

      {/* Input Dock */}
      <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 bg-gradient-to-t from-[#FBFAF9] via-[#FBFAF9]/90 to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto w-full pointer-events-auto">
          <div className="relative flex flex-col bg-white border border-black/[0.05] rounded-lg shadow-2xl overflow-hidden focus-within:border-[#D4A373]/40 transition-all">
            <div className="flex items-center justify-between px-5 py-2 border-b border-black/[0.03] bg-[#FBFAF9]/50">
              <div className="flex items-center gap-2">
                 <Cpu size={12} className="text-[#D4A373]" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-black/30">Secure AI Gateway</span>
              </div>
            </div>
            
            <div className="flex items-center p-2.5">
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
                    send(input);
                  }
                }}
                placeholder="Введіть тему дослідження..."
                className="flex-1 bg-transparent px-5 py-3.5 text-[15px] focus:outline-none placeholder-[#111]/20 font-medium resize-none max-h-[160px]"
                disabled={streaming}
                aria-label="Ввід повідомлення"
              />
              <button 
                disabled={!input.trim() || streaming}
                onClick={() => send(input)}
                className="w-12 h-12 bg-[#111] text-[#D4A373] rounded-md flex items-center justify-center hover:bg-[#D4A373] hover:text-[#000] transition-all disabled:opacity-5 shadow-lg active:scale-95 shrink-0"
                aria-label="Надіслати"
              >
                {streaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
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
