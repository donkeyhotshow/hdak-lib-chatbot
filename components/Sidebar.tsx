'use client'

import React, { useEffect, useState, useCallback } from 'react'
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
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles
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

  const handleDelete = useCallback((e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteId(id)
  }, [])

  const confirmDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (Number(currentId) === id) router.push('/')
      }
    } catch {}
    setDeleteId(null)
  }, [currentId, router])

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
          <div className="p-6 pb-8 border-b border-white/[0.03]">
            <div className="flex items-center justify-between mb-8">
              <div 
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => { router.push('/'); if (onClose && window.innerWidth < 768) onClose() }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#b87830] to-[#e8a85d] flex items-center justify-center shadow-lg shadow-[#b87830]/10">
                  <Library size={16} className="text-[#1a130f]" />
                </div>
                <div>
                  <h2 className="text-white font-serif text-[18px] font-bold leading-none tracking-tight">Бібліотека</h2>
                  <p className="text-[#b87830] text-[9px] font-black uppercase tracking-[2px] mt-1">ХДАК Intelligence</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="md:hidden text-white/20 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Система активна</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto scrollbar-hide">
            <section>
              <label className="text-[9px] font-black text-white/20 uppercase tracking-[3px] block mb-3 px-3">Архів сесій</label>
              <div className="space-y-2 pr-2">
                {!loaded && (
                  <div className="px-3 py-2 space-y-3">
                    <div className="h-4 w-full bg-white/5 rounded-md animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse"></div>
                  </div>
                )}
                {loaded && (conversations.length > 0 ? (
                    (showAllChats ? conversations : conversations.slice(0, 5)).map((conv) => {
                      const active = Number(currentId) === conv.id
                      return (
                        <div key={conv.id} className="group relative">
                          <Link
                            href={`/chat/${conv.id}`}
                            onClick={() => { if (onClose && window.innerWidth < 768) onClose() }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                              active 
                                ? 'bg-white/10 text-white shadow-lg shadow-black/20' 
                                : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            <span className="text-[13px] font-medium tracking-tight truncate flex-1 leading-tight">{conv.title}</span>
                            <ChevronRight size={12} className={`transition-all shrink-0 ${active ? 'text-[#b87830]' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(e, conv.id)}
                            className="absolute right-10 top-1/2 -translate-y-1/2 p-2 text-white/0 group-hover:text-white/20 hover:text-red-400/60 transition-all rounded-lg"
                            title="Видалити"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-4 py-8 text-center bg-white/[0.02] rounded-2xl border border-white/[0.03]">
                      <p className="text-[11px] text-white/20 font-medium uppercase tracking-widest">Немає сесій</p>
                    </div>
                  ))}
                {loaded && conversations.length > 5 && !showAllChats && (
                  <button
                    onClick={() => setShowAllChats(true)}
                    className="flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-[2px] text-white/20 hover:text-white/40 transition-colors w-full"
                  >
                    Більше протоколів...
                  </button>
                )}
              </div>
            </section>

            <section>
              <label className="text-[9px] font-black text-white/20 uppercase tracking-[3px] block mb-3 px-3">Зовнішні вузли</label>
              <div className="space-y-1">
                {EXTERNAL_BASES_DATA.map((res, i) => (
                  <a key={i} href={res.link} target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/20 group-hover:text-[#b87830] group-hover:bg-white/[0.05] transition-all">
                      {res.icon}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[13px] text-white/70 font-semibold group-hover:text-white transition-colors leading-none">{res.title}</span>
                      <span className="text-[9px] text-white/20 font-medium leading-none mt-1">Офіційний ресурс</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </nav>

          <div className="p-6 border-t border-white/[0.03]">
            <button 
              onClick={() => { router.push('/'); if (onClose && window.innerWidth < 768) onClose() }}
              className="w-full py-3.5 bg-white/[0.03] border border-white/5 rounded-xl text-white/50 text-[10px] font-black tracking-[2px] uppercase hover:bg-[#b87830] hover:text-[#1a130f] hover:border-[#b87830] transition-all flex items-center justify-center gap-2 group"
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform" />
              Новий сеанс
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
