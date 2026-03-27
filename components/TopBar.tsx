'use client'

import React, { useState, useEffect } from 'react'
import { Menu, MoreHorizontal, Library } from 'lucide-react'

export function TopBar({ onToggle, sidebarOpen }: { onToggle: () => void; sidebarOpen?: boolean }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    
    // In our layout, scrolling happens either on window or the #chat-window container
    const mainArea = document.querySelector('main > div.flex-1')
    if (mainArea) {
      const scrollHandler = (e: any) => setScrolled(e.target.scrollTop > 10)
      mainArea.addEventListener('scroll', scrollHandler)
      return () => mainArea.removeEventListener('scroll', scrollHandler)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header role="banner" className="h-14 px-6 flex items-center justify-between border-b border-black/[0.03] bg-white/60 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggle} 
          className={`p-2 hover:bg-black/5 rounded-lg transition-all ${sidebarOpen ? 'md:opacity-0 md:-translate-x-4' : 'opacity-100 translate-x-0'}`}
          aria-label={sidebarOpen ? "Закрити бічну панель" : "Відкрити бічну панель"}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar-nav"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-3 py-1.5 px-3 bg-[#f3ece4]/40 rounded-full border border-[#e5dcd3]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#b87830] shadow-[0_0_8px_rgba(184,120,48,0.4)]" />
          <span className="text-[10px] font-black text-[#b87830] tracking-[0.15em] uppercase leading-none">AI Helper</span>
        </div>
      </div>
      
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
        <Library size={16} className="text-[#b87830] opacity-80" />
        <h1 className="font-serif font-bold text-[15px] tracking-tight text-[#1a130f]">Бібліотека ХДАК</h1>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          aria-label="Додаткові параметри"
          className="p-2.5 hover:bg-black/5 rounded-lg text-black/20 hover:text-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#b87830]/30">
           <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
