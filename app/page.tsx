'use client'

import React, { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  History, Search, FileText, Scale, ChevronRight, ShieldCheck, Send, Loader2, Cpu
} from 'lucide-react'

const MAX_TITLE_LENGTH = 200

const CHIPS_DATA = [
  { id: 'archive', icon: <History size={14} />, label: 'Архів запитів', query: 'Показати останні запити' },
  { id: 'repository', icon: <FileText size={14} />, label: 'Репозитарій', query: 'Як знайти статтю в репозитарії?' },
  { id: 'opac', icon: <Search size={14} />, label: 'OPAC Пошук', query: 'Електронний каталог бібліотеки' },
  { id: 'citation', icon: <Scale size={14} />, label: 'Цитування', query: 'Правила оформлення списку літератури' },
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
      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 pb-48 pt-10 scrollbar-hide">
        <div className="max-w-4xl mx-auto w-full">
          <div className="py-20 animate-in fade-in zoom-in-95 duration-1000 fill-mode-both">
            <div className="flex items-center gap-4 mb-4">
               <ShieldCheck size={24} className="text-[#D4A373]" />
               <h2 className="text-4xl lg:text-5xl font-serif text-[#111] font-black tracking-tight leading-tight uppercase">Цифрова бібліотека</h2>
            </div>
            <p className="text-[#111]/40 text-sm max-w-md font-medium leading-relaxed mb-12">
               Інтелектуальна система пошуку по фондах Харківської державної академії культури.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {CHIPS_DATA.map((chip) => (
                <button 
                  key={chip.id} 
                  disabled={loading}
                  onClick={() => start(chip.query)}
                  className="flex items-center justify-between px-6 py-5 bg-white border border-black/[0.03] rounded-lg hover:border-[#D4A373] hover:shadow-xl transition-all group active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-[#F8F5F2] text-[#D4A373]/80 group-hover:text-[#D4A373] transition-colors">
                      {chip.icon}
                    </div>
                    <span className="text-[12px] font-black text-[#111]/50 group-hover:text-[#111] tracking-[0.1em] uppercase">
                      {chip.label}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-[#D4A373] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>
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
                rows={1}
                value={inputTitle}
                onChange={e => {
                  setInputTitle(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    start(inputTitle);
                  }
                }}
                placeholder="Введіть тему дослідження..."
                className="flex-1 bg-transparent px-5 py-3.5 text-[15px] focus:outline-none placeholder-[#111]/20 font-medium resize-none max-h-[160px]"
                disabled={loading}
              />
              <button 
                disabled={!inputTitle.trim() || loading}
                onClick={() => start(inputTitle)}
                className="w-12 h-12 bg-[#111] text-[#D4A373] rounded-md flex items-center justify-center hover:bg-[#D4A373] hover:text-[#000] transition-all disabled:opacity-5 shadow-lg active:scale-95 shrink-0"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
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
