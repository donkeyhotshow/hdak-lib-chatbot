'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Plus,
  Trash2,
  Library,
  History,
  Bookmark,
  FileText,
  Globe,
  Book,
  ExternalLink,
  MoreHorizontal,
  X
} from 'lucide-react'

// --- Константы данных ---
const NAV_ITEMS_DATA = [
  { id: 'history', icon: <History size={14} />, label: 'Історія пошуку' },
  { id: 'bookmarks', icon: <Bookmark size={14} />, label: 'Збережені праці' },
  { id: 'pubs', icon: <FileText size={14} />, label: 'Мої публікації' }
]

const EXTERNAL_BASES_DATA = [
  { icon: <Globe size={14} />, title: 'Scopus / WoS', link: 'https://lib-hdak.in.ua/helpful-links.html' },
  { icon: <Book size={14} />, title: 'Електронний каталог', link: 'https://library-service.com.ua:8443/khkhdak/' },
  { icon: <ExternalLink size={14} />, title: 'Веб-сайт ХДАК', link: 'https://lib-hdak.in.ua/' },
]

export function Sidebar({
  isOpen,
  onToggle,
  onClose,
}: {
  isOpen: boolean
  onToggle: () => void
  onClose?: () => void
}) {
  const { id: currentId } = useParams()
  const router = useRouter()
  const [conversations, setConversations] = useState<{id: number, title: string}[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAllChats, setShowAllChats] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setConversations(data); setLoaded(true) })
      .catch(() => { setLoaded(true) })
  }, [])

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteId(id)
  }

  const confirmDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (Number(currentId) === id) router.push('/')
      }
    } catch {}
    setDeleteId(null)
  }

  const displayedConversations = showAllChats ? conversations : conversations.slice(0, 3)

  return (
    <>
      {/* Mobile dark overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden block transition-opacity"
        />
      )}

      {/* Sidebar - PUSH EFFECT */}
      <aside className={`
        relative z-50 h-full bg-[#0D0D0D] border-r border-white/[0.04]
        transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col overflow-hidden shadow-2xl
        fixed md:relative
        ${isOpen ? 'w-[290px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full w-[290px]">
          <div className="p-8 border-b border-white/[0.04] flex items-center justify-between bg-black/20">
            <div 
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => { router.push('/'); if (onClose && window.innerWidth < 768) onClose() }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-[#D4A373] rounded-sm blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative w-10 h-10 border border-[#D4A373]/40 flex items-center justify-center rounded bg-[#141414]">
                  <Library size={18} className="text-[#D4A373]" />
                </div>
              </div>
              <div>
                <h1 className="text-[14px] font-serif font-black text-white uppercase tracking-[0.2em] leading-none">HDAK Core</h1>
                <p className="text-[8px] tracking-[0.5em] uppercase text-[#D4A373]/50 font-black mt-1.5">Elite Repository</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button 
              onClick={onClose} 
              className="md:hidden text-white/20 hover:text-[#D4A373] transition-all p-1"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-10 overflow-y-auto scrollbar-hide">
            <section>
              <div className="flex items-center gap-2 px-4 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]"></span>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">Архів Сесій</p>
              </div>
              <div className="space-y-1">
                {!loaded && (
                  <div className="px-4 py-2 space-y-3">
                    <div className="h-4 w-full bg-white/5 rounded-md animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                )}
                
                {loaded && displayedConversations.map(conv => {
                  const active = Number(currentId) === conv.id;
                  return (
                    <div key={conv.id} className="relative group">
                      <Link
                        href={`/chat/${conv.id}`}
                        onClick={() => { if (onClose && window.innerWidth < 768) onClose() }}
                        className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 rounded-md transition-all border-l-2 ${active ? 'bg-white/[0.06] border-[#D4A373]' : 'border-transparent hover:bg-white/[0.03] hover:border-[#D4A373]/50'}`}
                      >
                        <span className={`text-[13px] sm:text-xs font-medium tracking-tight truncate flex-1 ${active ? 'text-white' : 'text-white/40'} group-hover:text-white/90 transition-colors`}>
                          {conv.title}
                        </span>
                      </Link>
                      <button
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-[#D4A373]/50 hover:text-[#f87171] transition-all rounded-md"
                        title="Видалити"
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
                {loaded && conversations.length > 3 && !showAllChats && (
                  <button
                    onClick={() => setShowAllChats(true)}
                    className="flex items-center gap-2 px-4 py-2 mt-2 text-[10px] uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors w-full"
                  >
                    <MoreHorizontal size={12} /> Показати всі
                  </button>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 px-4 mb-5">
                <span className="w-1.5 h-1.5 rounded-full border border-[#D4A373]"></span>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">Зовнішні вузли</p>
              </div>
              <div className="space-y-1 mb-6">
                {EXTERNAL_BASES_DATA.map((res, i) => (
                  <a key={i} href={res.link} target="_blank" rel="noreferrer" className="flex items-center gap-4 px-4 py-3 rounded-md hover:bg-white/[0.03] cursor-pointer group transition-all border-l-2 border-transparent hover:border-white/10">
                    <div className="text-white/10 group-hover:text-[#D4A373] transition-all">{res.icon}</div>
                    <h4 className="text-[13px] font-medium text-white/30 group-hover:text-white/70 truncate tracking-tight">{res.title}</h4>
                  </a>
                ))}
              </div>
            </section>
          </nav>

          <div className="p-8 bg-black/40 border-t border-white/[0.04]">
            <button 
              onClick={() => { router.push('/'); if (onClose && window.innerWidth < 768) onClose() }}
              className="w-full py-3.5 bg-transparent border border-[#D4A373]/20 text-[#D4A373] rounded-sm text-[10px] font-black tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-[#D4A373] hover:text-[#000] transition-all uppercase active:scale-[0.98]"
            >
              <Plus size={14} />
              Новий протокол
            </button>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FBFAF9] p-8 rounded-xl w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#111111]/10">
            <h3 className="mb-2 text-lg font-bold text-[#111111]">Видалити діалог?</h3>
            <p className="mb-8 text-sm text-[#111111]/50 font-medium tracking-wide">Цю дію неможливо буде скасувати.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => confirmDelete(deleteId)}
                className="w-full py-3 bg-[#e85d5d] hover:bg-[#d64c4c] rounded-md text-[13px] font-bold text-white transition-colors"
              >
                Підтвердити видалення
              </button>
              <button 
                onClick={() => setDeleteId(null)}
                className="w-full py-3 bg-transparent border border-[#111111]/10 hover:border-[#111111]/30 rounded-md text-[13px] font-bold text-[#111111] transition-colors"
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
