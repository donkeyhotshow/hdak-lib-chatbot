'use client'

import React, { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Menu, Library, Search, Globe, 
  ChevronRight, ChevronLeft, Plus, X, ArrowRight,
  Clock, FileText, Phone, BookOpen, ExternalLink, Sparkles, Link,
  SendHorizontal, MoreHorizontal, Loader2, Cpu, History, Scale, Send
} from 'lucide-react';

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
    console.log('Starting chat with:', t)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t.slice(0, MAX_TITLE_LENGTH) }),
      })
      console.log('Response status:', res.status)
      if (!res.ok) throw new Error('Failed to create conversation')
      const conv = await res.json()
      console.log('Created conversation:', conv)
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(t)}`)
    } catch (err) {
      console.error('Error creating conversation:', err)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-12 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in-95 duration-1000">
            <div className="w-16 h-[1px] bg-[#b87830]/40 mb-10" />
            <h2 className="font-serif text-[38px] font-bold mb-3 text-[#1a130f] tracking-tight text-center leading-tight">Ласкаво просимо</h2>
            <p className="font-serif italic text-[22px] text-[#b87830] mb-16 text-center">Вишуканий доступ до знань</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {[
                { label: 'Графік роботи', icon: Clock, query: 'Графік роботи бібліотеки' },
                { label: 'Як записатися', icon: FileText, query: 'Як записатися' },
                { label: 'Каталог книг', icon: Search, query: 'Електронний каталог' },
                { label: 'Контакти', icon: Phone, query: 'Контакти' }
              ].map((item, idx) => (
                <button 
                  key={idx}
                  disabled={loading}
                  onClick={() => start(item.query)}
                  className="flex items-center gap-4 p-5 bg-white border border-black/[0.04] rounded-2xl hover:border-[#b87830]/40 hover:shadow-2xl hover:shadow-[#b87830]/8 transition-all duration-300 group disabled:opacity-50"
                >
                  <item.icon size={20} className="text-[#b87830] group-hover:scale-110 transition-transform" />
                  <span className="text-[14px] font-semibold text-[#2a2520]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 bg-[#fcfaf7] border-t border-black/[0.03]">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center group">
            <div className="absolute inset-0 bg-[#b87830]/8 rounded-2xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 -z-10" />
            <input 
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputTitle.trim()) start(inputTitle);
              }}
              placeholder="Запитайте будь-що про ресурси бібліотеки..."
              className="w-full bg-white py-6 pl-8 pr-20 rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)] outline-none text-[16px] font-medium placeholder:text-gray-300 focus:border-[#b87830]/40 focus:shadow-[0_12px_40px_rgba(184,120,48,0.1)] transition-all duration-500"
              disabled={loading}
            />
            <button 
              disabled={!inputTitle.trim() || loading}
              onClick={() => start(inputTitle)}
              className="absolute right-4 w-12 h-12 rounded-xl bg-[#1a130f] text-[#b87830] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20 disabled:opacity-20 disabled:scale-100 group/btn"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin text-[#b87830]" />
              ) : (
                <Send size={20} strokeWidth={2.5} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-6 uppercase tracking-[4px] font-semibold opacity-30">Харківська державна академія культури</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageInner />
    </Suspense>
  )
}
