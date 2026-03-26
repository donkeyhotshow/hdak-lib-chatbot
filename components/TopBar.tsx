'use client'

import React, { useState, useEffect } from 'react'
import { Menu, MoreVertical } from 'lucide-react'

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
    <header className={`h-16 flex items-center justify-between px-8 lg:px-12 z-40 sticky top-0 transition-all duration-300 ${
      scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-black/5' : 'bg-transparent'
    }`}>
      <div className="flex items-center gap-6">
        {!sidebarOpen && (
          <button 
            onClick={onToggle} 
            className="p-2.5 text-[#111]/40 hover:text-[#D4A373] transition-all rounded-full hover:bg-black/5 outline-none"
            aria-label="Відкрити меню"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex flex-col">
          <h3 className="font-serif font-black text-[15px] text-[#111] uppercase tracking-[0.2em] leading-none">Academic Workspace</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[8px] font-black text-black/30 uppercase tracking-widest leading-none">System Online</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-black text-[#D4A373] tracking-widest uppercase leading-none">Premium Access</span>
          <span className="text-[8px] text-black/30 font-mono mt-1 leading-none uppercase tracking-tighter">USER_ID: 88241</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#111] border-2 border-[#D4A373]/30 flex items-center justify-center text-[14px] font-serif font-black text-[#D4A373] shadow-lg">A</div>
      </div>
    </header>
  )
}
