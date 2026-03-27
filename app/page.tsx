'use client'

import React, { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { Send, Clock, BookOpen, User, Search, Plus, Sparkles, Phone, Scale, Database, Check, Copy, ExternalLink, ChevronRight, Library } from 'lucide-react'
import { LIBRARY } from '@/lib/constants'
import { useConversation } from '@/hooks/useConversation'

const STORAGE_KEY = 'hdak_lib_v12_messages'

const DATA = {
  SCHEDULE: {
    sections: [
      { label: "Абонемент / Бібліограф", time: "Пн–Пт: 9:00–16:45", note: "13:00–13:45", off: "Сб, Нд" },
      { label: "Читальна зала", time: "Пн–Пт: 9:00–16:45", note: "Сб: до 13:30", off: "Нд" },
      { label: "Е-зал (кімн. 18а)", time: "Пн–Пт: 9:00–16:45", note: "", off: "Сб, Нд" }
    ]
  },
  RESOURCES: {
    open: [
      { label: "Репозитарій", url: LIBRARY.links.repository },
      { label: "Springer", url: "https://link.springer.com" }
    ],
    corporate: [
      { label: "Scopus", url: "https://www.scopus.com" },
      { label: "Web of Science", url: "https://www.webofscience.com" },
      { label: "ScienceDirect", url: "https://www.sciencedirect.com" }
    ]
  },
  QUICK_MENU: [
    { id: 'catalog', title: 'Каталог', sub: 'Пошук видань', icon: Search, kw: 'каталог', url: LIBRARY.links.catalogSearch },
    { id: 'register', title: 'Запис', sub: 'Правила', icon: Plus, kw: 'записатися', url: LIBRARY.links.rules },
    { id: 'schedule', title: 'Графік', sub: 'Час роботи', icon: Clock, kw: 'графік' },
    { id: 'contacts', title: 'Зв\'язок', sub: 'Контакти', icon: Phone, kw: 'контакти' },
    { id: 'dstu', title: 'ДСТУ', sub: 'Стандарти', icon: Scale, kw: 'дсту' },
    { id: 'new', title: 'Новинки', sub: 'Надходження', icon: BookOpen, kw: 'новинки', url: LIBRARY.links.newAcquisitions }
  ]
}

const CompactResource = ({ items }: { items: { label: string; url: string }[] }) => (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {items.map((item, i) => (
      <a 
        key={i} 
        href={item.url} 
        target="_blank" 
        rel="noreferrer" 
        className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 hover:text-amber-900 rounded-lg text-[10px] font-semibold text-amber-800 transition-all border border-amber-200/50 hover:border-amber-300"
      >
        {item.label} <ExternalLink size={10} />
      </a>
    ))}
  </div>
)

const ChatMessage = ({ msg, onAction, onChipClick }: { msg: { id: number; text: string; sender: 'user' | 'bot'; chips?: { label: string; keyword: string }[]; timestamp?: number }; onAction: () => void; onChipClick: (kw: string) => void }) => {
  const isBot = msg.sender === 'bot'
  const isUser = msg.sender === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [msg.text])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
      <div className={`flex gap-3 max-w-[90%] lg:max-w-[70%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center border shadow-sm ${
          isUser 
            ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-white/20' 
            : 'bg-white border-amber-100'
        }`}>
           {isUser 
             ? <User size={16} className="text-white" /> 
             : <Sparkles size={16} className="text-amber-600" />
           }
        </div>
        
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : ''}`}>
          <div className={`px-4 py-3 rounded-2xl border text-[14px] leading-relaxed shadow-sm ${
            isUser 
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-tr-sm border-transparent' 
              : 'bg-white/95 backdrop-blur-sm text-gray-800 border-amber-100/50 rounded-tl-sm'
          }`}>
            {msg.text === 'SCHEDULE_DATA' ? (
              <div className="space-y-3 py-1">
                {DATA.SCHEDULE.sections.map((s, i) => (
                  <div key={i} className="border-l-2 border-amber-400 pl-3">
                    <p className="text-[9px] font-bold uppercase text-amber-600 tracking-wide leading-none mb-1.5">{s.label}</p>
                    <p className="font-semibold text-[12px] text-gray-800 leading-none">{s.time}</p>
                    {s.note && <p className="text-[10px] text-gray-500 mt-0.5">{s.note}</p>}
                  </div>
                ))}
              </div>
            ) : msg.text === 'RESOURCES_DATA' ? (
              <div className="space-y-3 py-1">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Корпоративні ресурси:</p>
                  <CompactResource items={DATA.RESOURCES.corporate} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Відкритий доступ:</p>
                  <CompactResource items={DATA.RESOURCES.open} />
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{msg.text}</p>
            )}
          </div>
          
          {isBot && msg.chips && msg.chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-0.5 mt-1">
              {msg.chips.slice(0, 3).map(chip => (
                <button 
                  key={chip.label} 
                  onClick={() => onChipClick(chip.keyword)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] font-semibold text-gray-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 px-1 text-[10px] font-medium text-gray-400">
            <span className="tracking-wide">{msg.timestamp ? formatTime(msg.timestamp) : formatTime(Date.now())}</span>
            {isBot && (
              <>
                <button onClick={handleCopy} className="hover:text-amber-600 transition-colors">
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

ChatMessage.displayName = 'ChatMessage'

export default function Home() {
  const { messages, sendMessage, isTyping, currentConversationId, createNewConversation, setCurrentConversationId } = useConversation()
  const [inputValue, setInputValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = useCallback(async (query?: string) => {
    const text = (typeof query === 'string' ? query : inputValue).trim()
    if (!text || isTyping || !currentConversationId) return

    // Add user message optimistically
    const newUserMsg = { id: Date.now(), text, sender: 'user' as const, timestamp: Date.now() }
    
    // Clear input
    setInputValue('')
    
    // Set typing state
    setIsTyping(true)
    
    // Send to API
    try {
      const response = await sendMessage(text)
      
      // Update state with AI response
      if (response) {
        // The response will be handled by the hook's state update
        setIsTyping(false)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsTyping(false)
    }
  }, [inputValue, isTyping, currentConversationId, sendMessage])

  const handleQuickMenu = useCallback((item: typeof DATA.QUICK_MENU[0]) => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
    startTransition(() => {
      handleSend(item.kw)
    })
  }, [handleSend])

  // Create new conversation on mount if none exists
  useEffect(() => {
    if (!currentConversationId) {
      createNewConversation()
    }
  }, [currentConversationId, createNewConversation])

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <div className="w-20 h-20 bg-white border border-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl relative group">
                 <Library size={40} className="text-amber-500 group-hover:scale-110 transition-transform duration-300" />
                 <div className="absolute -inset-2 bg-gradient-to-r from-amber-200 to-orange-200 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
              </div>
              <h1 className="font-serif text-3xl lg:text-4xl font-bold tracking-tight text-gray-800 mb-3">
                Чим можу допомогти?
              </h1>
              <p className="text-gray-500 font-medium text-[14px] max-w-md mx-auto leading-relaxed">
                Знайду книгу в каталозі, надам контакти або підкажу правила оформлення літератури
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-lg">
              {DATA.QUICK_MENU.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => handleQuickMenu(item)}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white/80 backdrop-blur-sm border border-amber-100/50 rounded-2xl hover:border-amber-300 hover:shadow-lg hover:bg-white transition-all group active:scale-[0.98] text-left"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <item.icon size={18} className="text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-gray-800">{item.title}</span>
                    <span className="text-[10px] text-gray-400">{item.sub}</span>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto pb-6">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                msg={msg} 
                onChipClick={handleSend} 
                onAction={() => {
                  // Note: In a real app, we might want to implement message deletion
                  // For now, we'll keep all messages in the conversation
                }} 
              />
            ))}
            {isTyping && (
              <div className="flex items-center gap-3 mb-4 ml-11">
                 <div className="flex gap-1">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                 </div>
                 <span className="text-[11px] font-medium text-gray-400">Обробляю...</span>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="px-4 pb-6 lg:px-8 pt-2 bg-gradient-to-t from-amber-50/50 to-transparent">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="relative group"
          >
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Запитайте про каталог, контакти чи послуги..."
              aria-label="Введіть запитання до бібліотечного асистента"
              autoComplete="off"
              className="w-full bg-white/90 backdrop-blur-sm border border-amber-200/50 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100/50 shadow-lg shadow-amber-100/30 text-[15px] font-medium transition-all placeholder:text-gray-400"
              style={{ fontSize: '16px' }}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isTyping || !currentConversationId}
              aria-label="Надіслати повідомлення"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl flex items-center justify-center hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          
          <div className="flex justify-center items-center mt-4">
             <div className="h-px w-12 bg-amber-200/50" />
             <span className="text-[10px] font-medium text-gray-400 mx-4 uppercase tracking-widest">
               Наукова бібліотека ХДАК
             </span>
             <div className="h-px w-12 bg-amber-200/50" />
           </div>
        </div>
      </div>
    </div>
  )
}